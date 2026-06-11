import { Controller, Post, Body, Get, UseGuards, Req, Res, Patch, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto } from './dto/login.dto';
import { EmailRegisterDto, EmailVerifyDto, EmailLoginDto, GoogleMobileDto } from './dto/email-auth.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

class UpdateFcmDto {
  @IsString()
  fcmToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ─── Phone OTP ───────────────────────────────────────────────────────────────

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to phone number' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and login/register' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // ─── Google Mobile ────────────────────────────────────────────────────────────

  @Post('google-mobile')
  @ApiOperation({ summary: 'Google Sign-In from mobile (access token)' })
  googleMobileLogin(@Body() dto: GoogleMobileDto) {
    return this.authService.googleMobileLogin(dto.accessToken);
  }

  // ─── Email Auth ───────────────────────────────────────────────────────────────

  @Post('email/register')
  @ApiOperation({ summary: 'Register with email + password, triggers verification email' })
  emailRegister(@Body() dto: EmailRegisterDto) {
    return this.authService.registerWithEmail(dto);
  }

  @Post('email/verify')
  @ApiOperation({ summary: 'Verify email with 6-digit code' })
  emailVerify(@Body() dto: EmailVerifyDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('email/login')
  @ApiOperation({ summary: 'Login with email + password' })
  emailLogin(@Body() dto: EmailLoginDto) {
    return this.authService.loginWithEmail(dto);
  }

  // ─── Test Helper (only active when TEST_API_KEY env var is set) ─────────────

  @Post('test/verification-code')
  @ApiOperation({ summary: 'Get stored verification code for a user (test-only)' })
  async testGetVerificationCode(@Body() body: { email: string; testKey: string }) {
    const testKey = process.env.TEST_API_KEY;
    if (!testKey || body.testKey !== testKey) throw new ForbiddenException();
    return this.authService.devGetVerificationCode(body.email);
  }

  // ─── Web OAuth (not used by mobile) ──────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth web redirect (not for mobile)' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleAuthRedirect(@Req() req: any, @Res() res: any) {
    this.authService.googleLogin(req.user).then(({ token }) => {
      res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
    });
  }

  // ─── FCM ─────────────────────────────────────────────────────────────────────

  @Patch('fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update FCM push token' })
  updateFcmToken(@Req() req: any, @Body() dto: UpdateFcmDto) {
    return this.authService.updateFcmToken(req.user.id, dto.fcmToken);
  }
}
