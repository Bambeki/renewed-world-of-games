import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import { jwtAccessSeconds } from '../config/production';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'development-secret',
        signOptions: { expiresIn: jwtAccessSeconds(process.env.JWT_ACCESS_EXPIRES_IN) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthRateLimitGuard],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
