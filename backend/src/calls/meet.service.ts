import { Injectable, Logger, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const ENCRYPTION_KEY = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || 'noalone-default-key-32chars!!!!!!';
const IV_LENGTH = 16;
const EXPIRY_MINUTES = parseInt(process.env.MEET_LINK_EXPIRY_MINUTES || '55', 10);

/** AES-256-CBC encrypt/decrypt for token storage at rest */
function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '!').slice(0, 32));
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '!').slice(0, 32));
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString('utf8');
}

export interface MeetLinkResult {
  meetLink: string;
  meetCode: string;
  expiresAt: Date;
}

@Injectable()
export class MeetService {
  private readonly logger = new Logger(MeetService.name);

  constructor(private prisma: PrismaService) {}

  /** Store Google Calendar OAuth tokens (encrypted) for a user */
  async storeTokens(userId: string, accessToken: string, refreshToken: string, expiryMs: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: encrypt(accessToken),
        googleRefreshToken: encrypt(refreshToken),
        googleTokenExpiry: new Date(Date.now() + expiryMs),
        isGoogleAuthorized: true,
      },
    });
  }

  /** Get decrypted access token, refreshing if needed */
  private async getValidAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
        isGoogleAuthorized: true,
      },
    });

    if (!user?.isGoogleAuthorized || !user.googleAccessToken || !user.googleRefreshToken) {
      throw new UnauthorizedException('Google Calendar not authorized. Please authorize calls first.');
    }

    const isExpired = !user.googleTokenExpiry || user.googleTokenExpiry < new Date(Date.now() + 60_000);

    if (!isExpired) {
      return decrypt(user.googleAccessToken);
    }

    // Refresh the access token
    const refreshToken = decrypt(user.googleRefreshToken);
    const refreshed = await this.refreshAccessToken(refreshToken);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: encrypt(refreshed.access_token),
        googleTokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000),
      },
    });

    return refreshed.access_token;
  }

  /** Refresh the Google access token using the stored refresh token */
  private async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.json() as any;
      this.logger.error('Token refresh failed', err);
      throw new UnauthorizedException('Google authorization expired. Please re-authorize calls.');
    }

    return res.json() as Promise<{ access_token: string; expires_in: number }>;
  }

  /**
   * Create a Google Meet link via the Calendar API (Option B).
   * Creates a 1-hour Calendar event and returns the Meet URI.
   */
  async createMeetLink(organizerUserId: string): Promise<MeetLinkResult> {
    let accessToken: string;
    try {
      accessToken = await this.getValidAccessToken(organizerUserId);
    } catch (e) {
      throw e;
    }

    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    const eventBody = {
      summary: 'noAlone Call',
      start: { dateTime: now.toISOString(), timeZone: 'UTC' },
      end: { dateTime: end.toISOString(), timeZone: 'UTC' },
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      },
    );

    if (!res.ok) {
      const err = await res.json() as any;
      this.logger.error('Failed to create Calendar event', err);
      if (res.status === 401) {
        // Mark as unauthorized so user re-authorizes
        await this.prisma.user.update({
          where: { id: organizerUserId },
          data: { isGoogleAuthorized: false },
        });
        throw new UnauthorizedException('Google authorization expired. Please re-authorize calls.');
      }
      throw new ServiceUnavailableException('Could not generate Meet link. Try again.');
    }

    const event = await res.json() as any;
    const entryPoints: any[] = event?.conferenceData?.entryPoints || [];
    const videoEntry = entryPoints.find((e: any) => e.entryPointType === 'video');
    const meetLink = videoEntry?.uri || event?.conferenceData?.conferenceId;

    if (!meetLink) {
      throw new ServiceUnavailableException('Meet link not found in Calendar response.');
    }

    const meetCode = event?.conferenceData?.conferenceId || meetLink.split('/').pop() || '';
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

    return { meetLink, meetCode, expiresAt };
  }

  /** Exchange an authorization code (from mobile OAuth) for tokens */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.json() as any;
      this.logger.error('Code exchange failed', err);
      throw new UnauthorizedException('Failed to authorize Google access. Please try again.');
    }

    const data = await res.json() as any;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /** Check if user has valid Google Calendar authorization */
  async isUserAuthorized(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isGoogleAuthorized: true, googleRefreshToken: true },
    });
    return !!(user?.isGoogleAuthorized && user.googleRefreshToken);
  }

  /** Revoke Google Calendar authorization for a user */
  async revokeAuthorization(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        isGoogleAuthorized: false,
      },
    });
  }
}
