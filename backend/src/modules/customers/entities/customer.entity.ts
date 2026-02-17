import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CustomerAddress } from './customer-address.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'phone', length: 20, nullable: true })
  phone: string;

  @Column({ name: 'profile_picture', nullable: true })
  profilePicture: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'verification_token', nullable: true })
  verificationToken: string;

  @Column({ name: 'reset_password_token', nullable: true })
  resetPasswordToken: string;

  @Column({ name: 'reset_password_expires', nullable: true })
  resetPasswordExpires: Date;

  @Column({ name: 'total_points', default: 0 })
  totalPoints: number;

  @Column({ name: 'total_transactions', default: 0 })
  totalTransactions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSpent: number;

  @Column({ name: 'last_login', nullable: true })
  lastLogin: Date;

  @OneToMany(() => CustomerAddress, (address) => address.customer, {
    cascade: true,
  })
  addresses: CustomerAddress[];

  @OneToMany(() => Transaction, (transaction) => transaction.customer) // <-- PASTIKAN INI ADA
  transactions: Transaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
