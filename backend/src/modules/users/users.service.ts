// backend/src/modules/users/users.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Cek username ATAU email sudah ada
    const query = this.usersRepository.createQueryBuilder('user');

    query.where('user.username = :username', { username: createUserDto.username });

    // Jika email diisi, cek juga email
    if (createUserDto.email) {
      query.orWhere('user.email = :email', { email: createUserDto.email });
    }

    const existingUser = await query.getOne();

    if (existingUser) {
      if (existingUser.username === createUserDto.username) {
        throw new ConflictException('Username already exists');
      }
      if (createUserDto.email && existingUser.email === createUserDto.email) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);

    // Hapus password dari response
    const { password: _pw, ...result } = savedUser;
    void _pw;
    return result;
  }

  async findAll(
    search?: string,
    role?: UserRole,
    isActive?: boolean,
    page: number = 1,
    limit: number = 20,
  ) {
    const query = this.usersRepository.createQueryBuilder('user');

    if (search) {
      // ========== TAMBAHKAN EMAIL DI PENCARIAN ==========
      query.where(
        'user.name LIKE :search OR user.username LIKE :search OR user.email LIKE :search',
        { search: `%${search}%` },
      );
    }

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive });
    }

    const [data, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Hapus password dari setiap user
    const dataWithoutPassword = data.map((user) => {
      const { password: _pw, ...result } = user;
      void _pw;
      return result;
    });

    return {
      data: dataWithoutPassword,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password: _pw, ...result } = user;
    void _pw;
    return result;
  }

  async findByUsername(username: string) {
    return this.usersRepository.findOne({
      where: { username },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Jika update email, cek apakah email sudah dipakai user lain
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // Jika update password
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    const savedUser = await this.usersRepository.save(user);

    const { password: _pw, ...result } = savedUser;
    void _pw;
    return result;
  }

  async remove(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.remove(user);
    return { message: 'User deleted successfully' };
  }
}
