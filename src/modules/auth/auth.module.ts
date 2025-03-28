// auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './auth.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // puedes registrar opciones si necesitas firmar tokens aquí
  ],
  providers: [JwtStrategy],
  exports: [],
})
export class AuthModule {}
