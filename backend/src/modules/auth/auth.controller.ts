import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SkipPlatformTerms } from '../../common/decorators/skip-platform-terms.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  @ResponseMessage('Verification code sent')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({
    status: 201,
    description: 'Account created — verification code sent by email/WhatsApp',
  })
  register(
    @Body() dto: RegisterDto,
    @CurrentTenant('id') tenantId: string | undefined,
  ) {
    return this.authService.register(dto, tenantId);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  @ResponseMessage('Account verified')
  @ApiOperation({ summary: 'Verify signup OTP and receive auth tokens' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 5, ttl: 60_000 } })
  @ResponseMessage('Verification code resent')
  @ApiOperation({ summary: 'Resend the signup verification code' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 5, ttl: 60_000 } })
  @ResponseMessage('Login successful')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 5, ttl: 60_000 } })
  @ResponseMessage('If that email is registered, a reset link has been sent')
  @ApiOperation({ summary: 'Request a password reset link by email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 5, ttl: 60_000 } })
  @ResponseMessage('Password reset successful')
  @ApiOperation({ summary: 'Reset password using a reset token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tokens refreshed')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBearerAuth('access-token')
  refresh(@CurrentUser('userId') userId: string) {
    return this.authService.refreshTokens(userId);
  }

  @Get('me')
  @SkipPlatformTerms()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Profile retrieved')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
