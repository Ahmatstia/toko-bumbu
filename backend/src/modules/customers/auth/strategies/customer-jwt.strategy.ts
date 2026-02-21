import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';

interface CustomerJwtPayload {
  sub: string;
  email: string;
  type: string;
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {
    const secret = configService.get<string>('CUSTOMER_JWT_SECRET');

    if (!secret) {
      throw new Error('CUSTOMER_JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: CustomerJwtPayload) {
    if (payload.type !== 'customer') {
      throw new UnauthorizedException('Invalid token type');
    }

    const customer = await this.customerRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!customer) {
      throw new UnauthorizedException('Customer not found or inactive');
    }

    const { password: _pw, ...result } = customer;
    void _pw;
    return result;
  }
}
