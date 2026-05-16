import { Controller, Post, Body, Get, UseGuards, Req, Res, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto } from './dto/login.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IsString } from 'class-validator';

class UpdateFcmDto {
  @IsString()
  fcmToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth login' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleAuthRedirect(@Req() req: any, @Res() res: any) {
    this.authService.googleLogin(req.user).then(({ token }) => {
      res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
    });
  }

  @Post('guest-login')
  @ApiOperation({ summary: 'Skip phone verification — login as guest' })
  guestLogin() {
    return this.authService.guestLogin();
  }

  @Patch('fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update FCM push token' })
  updateFcmToken(@Req() req: any, @Body() dto: UpdateFcmDto) {
    return this.authService.updateFcmToken(req.user.id, dto.fcmToken);
  }
}
