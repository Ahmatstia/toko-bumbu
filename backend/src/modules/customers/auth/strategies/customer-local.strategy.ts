import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CustomerAuthService } from '../customer-auth.service';

@Injectable()
export class CustomerLocalStrategy extends PassportStrategy(
  Strategy,
  'customer-local',
) {
  constructor(private customerAuthService: CustomerAuthService) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const customer = await this.customerAuthService.validateCustomer(
      email,
      password,
    );
    if (!customer) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return customer;
  }
}
