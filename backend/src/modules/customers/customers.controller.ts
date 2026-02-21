import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomerJwtGuard } from './auth/guards/customer-jwt.guard';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface CustomerRequest extends Request {
  user: {
    id: string;
  };
}

@Controller('customer')
@UseGuards(CustomerJwtGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // Pindahkan update profile ke sini
  @Patch('profile')
  async updateProfile(@Request() req: CustomerRequest, @Body() updateDto: UpdateProfileDto) {
    return this.customersService.updateProfile(req.user.id, updateDto);
  }

  @Get('transactions')
  async getTransactions(@Request() req: CustomerRequest) {
    return this.customersService.getTransactions(req.user.id);
  }

  // Address endpoints
  @Post('addresses')
  async addAddress(@Request() req: CustomerRequest, @Body() createAddressDto: CreateAddressDto) {
    return this.customersService.addAddress(req.user.id, createAddressDto);
  }

  @Get('addresses')
  async getAddresses(@Request() req: CustomerRequest) {
    return this.customersService.getAddresses(req.user.id);
  }

  @Patch('addresses/:addressId')
  async updateAddress(
    @Request() req: CustomerRequest,
    @Param('addressId') addressId: string,
    @Body() updateDto: Partial<CreateAddressDto>,
  ) {
    return this.customersService.updateAddress(req.user.id, addressId, updateDto);
  }

  @Delete('addresses/:addressId')
  async deleteAddress(@Request() req: CustomerRequest, @Param('addressId') addressId: string) {
    return this.customersService.deleteAddress(req.user.id, addressId);
  }

  @Post('addresses/:addressId/default')
  async setDefaultAddress(@Request() req: CustomerRequest, @Param('addressId') addressId: string) {
    return this.customersService.setDefaultAddress(req.user.id, addressId);
  }
}
