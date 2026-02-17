import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CustomerLocalGuard extends AuthGuard('customer-local') {}
