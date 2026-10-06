import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../users/user.service.js';
import { User } from '../users/user.entity.js';
import { LoginDto, RegisterUserDto } from './auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private users: UserService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterUserDto) {
    const email = dto.email.toLowerCase();
    if (await this.users.findByEmail(email))
      throw new ConflictException('Email already registered');
    const user = await this.users.create({
      name: dto.name,
      email,
      password: await bcrypt.hash(dto.password, 10),
    });
    return this.sign(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(
      dto.email.toLowerCase(),
    );
    // same message for both cases so attackers can't discover which emails exist
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.sign(user);
  }

  private sign(user: User) {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
