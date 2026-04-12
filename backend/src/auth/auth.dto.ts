import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Campus, Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'Rahul Kumar' })
  @IsString()
  name: string;

  @ApiProperty({ example: '22BCE1234@vit.ac.in' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: Campus })
  @IsOptional()
  @IsEnum(Campus)
  campus?: Campus;

  @ApiPropertyOptional({ example: '22BCE1234' })
  @IsOptional()
  @IsString()
  regNumber?: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsOptional()
  @IsString()
  department?: string;
}

export class LoginDto {
  @ApiProperty({ example: '22BCE1234@vit.ac.in' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: '22BCE1234@vit.ac.in' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  otp: string;
}
