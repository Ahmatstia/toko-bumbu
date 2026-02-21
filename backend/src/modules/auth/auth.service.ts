import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface ValidatedUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<ValidatedUser | null> {
    const user = await this.userRepository.findOne({
      where: { username, isActive: true },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _pw, ...result } = user;
      void _pw;
      return result as ValidatedUser;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto, creatorRole: UserRole) {
    // Validasi: hanya OWNER dan MANAGER yang bisa bikin user baru
    if (creatorRole !== UserRole.OWNER && creatorRole !== UserRole.MANAGER) {
      throw new UnauthorizedException('Anda tidak punya akses untuk membuat user baru');
    }

    // Cek username sudah ada
    const existingUser = await this.userRepository.findOne({
      where: { username: registerDto.username },
    });

    if (existingUser) {
      throw new UnauthorizedException('Username sudah digunakan');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Buat user baru
    const user = this.userRepository.create({
      username: registerDto.username,
      password: hashedPassword,
      name: registerDto.name,
      role: registerDto.role || UserRole.STAFF,
      phone: registerDto.phone,
    });

    await this.userRepository.save(user);

    const { password: _pw, ...result } = user;
    void _pw;
    return result;
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const { password: _pw, ...result } = user;
    void _pw;
    return result;
  }
}
