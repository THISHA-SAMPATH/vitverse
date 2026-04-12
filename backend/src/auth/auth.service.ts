import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt = require('bcryptjs');
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './auth.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  // In production, store OTPs in Redis with TTL
  private otpStore = new Map<string, { otp: string; expiresAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    if (dto.regNumber) {
      const existingReg = await this.prisma.user.findUnique({ where: { regNumber: dto.regNumber } });
      if (existingReg) throw new ConflictException('Registration number already used');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        campus: dto.campus,
        regNumber: dto.regNumber,
        department: dto.department,
        role: this.determineRole(dto.email),
        isVerified: false,
      },
      select: { id: true, email: true, name: true, campus: true, role: true },
    });

    // Send OTP (in prod: send email)
    const otp = await this.generateAndSendOtp(user.email);

    return {
      message: 'Registration successful. Verify your email with the OTP to activate your account.',
      userId: user.id,
      devOtp: this.config.get('NODE_ENV') !== 'production' ? otp : undefined,
    };
  }

  async login(dto: LoginDto, ip?: string, device?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) throw new UnauthorizedException('Please verify your email first');

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Track device session
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        device,
        ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Update last active
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        campus: user.campus,
        role: user.role,
        avatar: user.avatar,
        points: user.points,
      },
    };
  }

  async verifyOtp(email: string, otp: string) {
    const stored = this.otpStore.get(email);
    if (!stored) throw new BadRequestException('OTP not found or expired');
    if (new Date() > stored.expiresAt) throw new BadRequestException('OTP expired');
    if (stored.otp !== otp) throw new BadRequestException('Invalid OTP');

    this.otpStore.delete(email);

    await this.prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    return { message: 'Email verified successfully' };
  }

  async refreshTokens(refreshToken: string) {
    const session = await this.prisma.session.findUnique({ where: { token: refreshToken } });
    if (!session || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Rotate refresh token
    await this.prisma.session.update({
      where: { id: session.id },
      data: { token: tokens.refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({ where: { token: refreshToken } });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If email exists, reset link has been sent.' }; // Prevent enumeration

    // In prod: send password reset email
    await this.generateAndSendOtp(email);
    return { message: 'Password reset OTP sent to your email.' };
  }

  private async generateTokens(userId: string, email: string, role: Role) {
    const accessPayload = { sub: userId, email, role, jti: randomUUID() };
    const refreshPayload = { sub: userId, email, role, jti: randomUUID(), type: 'refresh' };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.get('jwt.secret'),
        expiresIn: this.config.get('jwt.expiresIn'),
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.get('jwt.secret') + '_refresh',
        expiresIn: this.config.get('jwt.refreshExpiresIn'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async generateAndSendOtp(email: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpStore.set(email, { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    // TODO: Send via nodemailer
    console.log(`OTP for ${email}: ${otp}`); // Remove in production
    return otp;
  }

  private determineRole(email: string): Role {
    if (!email.includes('@vit.ac.in') && !email.includes('@vitap.ac.in') && !email.includes('@vitbhopal.ac.in')) {
      return Role.EXTERNAL;
    }
    return Role.STUDENT;
  }
}
