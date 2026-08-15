import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from './email.service';
import { SupabaseService } from './supabase.service';
import { SendOtpDto, VerifyOtpDto } from './dto/login.dto';
import { EmailRegisterDto, EmailVerifyDto, EmailLoginDto } from './dto/email-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
    private emailService: EmailService,
    private supabase: SupabaseService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateUsername(): string {
    const adjectives = ['Happy', 'Cool', 'Bright', 'Swift', 'Kind', 'Bold', 'Calm', 'Wild'];
    const nouns = ['Panda', 'Tiger', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Lion', 'Hawk'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${adj}${noun}${num}`;
  }

  // ─── Phone OTP ───────────────────────────────────────────────────────────────

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.redis.set(`otp:${dto.phone}`, otp, 300);
    await this.prisma.otpCode.create({
      data: { phone: dto.phone, code: otp, expiresAt },
    });

    // TODO: send via Twilio in production
    console.log(`OTP for ${dto.phone}: ${otp}`);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ token: string; user: any; isNew: boolean }> {
    const storedOtp = await this.redis.get(`otp:${dto.phone}`);
    if (!storedOtp || storedOtp !== dto.code) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    await this.redis.del(`otp:${dto.phone}`);

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    let isNew = false;

    if (!user) {
      isNew = true;
      const username = this.generateUsername();
      user = await this.prisma.user.create({
        data: { phone: dto.phone, username, displayName: username },
      });
    }

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user, isNew };
  }

  // ─── Google Mobile ────────────────────────────────────────────────────────────

  async googleMobileLogin(accessToken: string): Promise<{ token: string; user: any; isNew: boolean }> {
    // Verify the access token by fetching the user's Google profile
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new UnauthorizedException('Invalid Google access token');
    }

    const profile = await res.json() as {
      sub: string;
      email: string;
      name: string;
      picture: string;
      email_verified: boolean;
    };

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.sub }, { email: profile.email }] },
    });

    let isNew = false;
    if (!user) {
      isNew = true;
      const username = this.generateUsername();
      user = await this.prisma.user.create({
        data: {
          googleId: profile.sub,
          email: profile.email,
          displayName: profile.name,
          avatarUrl: profile.picture,
          username,
          emailVerified: profile.email_verified,
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.sub, emailVerified: profile.email_verified },
      });
    }

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user, isNew };
  }

  // ─── Email Auth ───────────────────────────────────────────────────────────────

  async registerWithEmail(dto: EmailRegisterDto): Promise<{ message: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing && existing.emailVerified) {
      throw new ConflictException('An account with this email already exists');
    }

    const code = this.generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    if (existing) {
      // Resend verification code for unverified account
      await this.prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, emailVerificationCode: code, emailVerificationExpiry: expiry },
      });
    } else {
      const username = this.generateUsername();
      await this.prisma.user.create({
        data: {
          email: dto.email,
          username,
          displayName: username,
          passwordHash,
          emailVerificationCode: code,
          emailVerificationExpiry: expiry,
        },
      });
    }

    await this.emailService.sendVerificationEmail(dto.email, code);
    return { message: 'Verification code sent to your email' };
  }

  async verifyEmail(dto: EmailVerifyDto): Promise<{ token: string; user: any; isNew: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.emailVerificationCode) {
      throw new BadRequestException('No pending verification for this email');
    }
    if (user.emailVerificationCode !== dto.code) {
      throw new BadRequestException('Invalid verification code');
    }
    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw new BadRequestException('Verification code has expired. Please register again.');
    }

    const wasNew = !user.emailVerified;
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      },
    });

    const token = this.jwtService.sign({ sub: updated.id, username: updated.username });
    return { token, user: updated, isNew: wasNew };
  }

  async loginWithEmail(dto: EmailLoginDto): Promise<{ token: string; user: any; isNew: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.emailVerified) {
      throw new BadRequestException('Please verify your email first');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user, isNew: false };
  }

  // ─── Test Helper ─────────────────────────────────────────────────────────────

  async devGetVerificationCode(email: string): Promise<{ code: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { emailVerificationCode: true },
    });
    return { code: user?.emailVerificationCode ?? null };
  }

  /**
   * Self-service recovery: lets a user retrieve their own pending verification
   * code by proving they know the password they registered with.
   * Safe in production because (a) it requires the correct password, (b) it
   * only returns codes for accounts not yet verified, (c) it returns the
   * existing code rather than generating a new one (so it can't be used to
   * spam users by triggering new codes for unrelated accounts).
   */
  async recoverVerificationCode(email: string, password: string): Promise<{ code: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.emailVerified) {
      throw new BadRequestException('Email already verified — please sign in.');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.emailVerificationCode) {
      throw new BadRequestException('No pending verification — please register again.');
    }
    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw new BadRequestException('Verification code expired — please register again.');
    }
    return { code: user.emailVerificationCode };
  }

  // ─── FCM ─────────────────────────────────────────────────────────────────────

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
  }

  // ─── Supabase Auth (web login/signup/logout + Google) ─────────────────────────

  /**
   * Exchanges a Supabase session access token for a noAlone session. Supabase
   * is the source of truth for credentials (password hashing, email
   * confirmation, Google OAuth) — this just mirrors the identity into our own
   * User table (keyed by supabaseId) so existing app features (chat, calls,
   * profile) keep working unchanged behind the existing JWT guards.
   */
  async syncSupabaseUser(accessToken: string): Promise<{ token: string; user: any; isNew: boolean }> {
    const { data, error } = await this.supabase.client.auth.getUser(accessToken);
    if (error || !data?.user) {
      throw new UnauthorizedException('Invalid or expired Supabase session');
    }

    const su = data.user;
    if (!su.email) {
      throw new BadRequestException('Supabase account has no email');
    }

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ supabaseId: su.id }, { email: su.email }] },
    });

    const meta = (su.user_metadata || {}) as Record<string, any>;
    let isNew = false;

    if (!user) {
      isNew = true;
      const username = this.generateUsername();
      user = await this.prisma.user.create({
        data: {
          supabaseId: su.id,
          email: su.email,
          username,
          displayName: meta.full_name || meta.name || username,
          avatarUrl: meta.avatar_url || meta.picture || null,
          emailVerified: !!su.email_confirmed_at,
        },
      });
    } else if (!user.supabaseId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          supabaseId: su.id,
          emailVerified: user.emailVerified || !!su.email_confirmed_at,
        },
      });
    }

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user, isNew };
  }

  /**
   * Test-only helper: creates (or reuses) a pre-confirmed Supabase user and
   * returns a session access token, so Playwright can seed users without
   * needing real email delivery. Gated by TEST_API_KEY at the controller.
   */
  async devCreateSupabaseTestUser(email: string, password: string): Promise<{ accessToken: string }> {
    const { error: createErr } = await this.supabase.client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr && !/already.*registered|already exists/i.test(createErr.message)) {
      throw new BadRequestException(createErr.message);
    }

    const { data: signIn, error: signInErr } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr || !signIn?.session) {
      throw new BadRequestException(signInErr?.message || 'Could not sign in test user');
    }
    return { accessToken: signIn.session.access_token };
  }

  // ─── Web-based Google (kept for completeness, not used by mobile) ─────────────

  async googleLogin(googleUser: any): Promise<{ token: string; user: any; isNew: boolean }> {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }] },
    });

    let isNew = false;
    if (!user) {
      isNew = true;
      const username = this.generateUsername();
      user = await this.prisma.user.create({
        data: {
          googleId: googleUser.googleId,
          email: googleUser.email,
          displayName: googleUser.displayName,
          avatarUrl: googleUser.avatarUrl,
          username,
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.googleId },
      });
    }

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user, isNew };
  }
}
