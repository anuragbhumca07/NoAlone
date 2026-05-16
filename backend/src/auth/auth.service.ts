import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SendOtpDto, VerifyOtpDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
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

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Redis (5 min TTL)
    await this.redis.set(`otp:${dto.phone}`, otp, 300);

    // Also store in DB for audit
    await this.prisma.otpCode.create({
      data: { phone: dto.phone, code: otp, expiresAt },
    });

    // TODO: Send via Twilio in production
    // For dev, log the OTP
    console.log(`OTP for ${dto.phone}: ${otp}`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ token: string; user: any; isNew: boolean }> {
    const storedOtp = await this.redis.get(`otp:${dto.phone}`);

    if (!storedOtp || storedOtp !== dto.code) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Delete OTP
    await this.redis.del(`otp:${dto.phone}`);

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    let isNew = false;

    if (!user) {
      isNew = true;
      const username = this.generateUsername();
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          username,
          displayName: username,
        },
      });
    }

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user, isNew };
  }

  async googleLogin(googleUser: any): Promise<{ token: string; user: any; isNew: boolean }> {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
      },
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

  async guestLogin(): Promise<{ token: string; user: any; isNew: boolean }> {
    const username = this.generateUsername();
    const user = await this.prisma.user.create({
      data: {
        username,
        displayName: username,
      },
    });
    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user, isNew: true };
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }
}
