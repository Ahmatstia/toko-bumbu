import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TransactionItem } from './transaction-item.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Reservation } from './reservation.entity';

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
}

export enum TransactionStatus {
  PENDING = 'PENDING', // Menunggu pembayaran (stok di-HOLD)
  PROCESSING = 'PROCESSING', // Sedang diproses (stok masih HOLD)
  COMPLETED = 'COMPLETED', // Selesai (stok berkurang)
  CANCELLED = 'CANCELLED', // Dibatalkan (stok kembali)
  EXPIRED = 'EXPIRED', // Kadaluarsa (stok kembali)
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @Column({ name: 'user_id', nullable: true, type: 'varchar', length: 36 })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'customer_id', nullable: true, type: 'varchar', length: 36 })
  customerId: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'customer_name', nullable: true, type: 'varchar', length: 100 })
  customerName: string;

  @Column({ name: 'customer_phone', nullable: true, type: 'varchar', length: 20 })
  customerPhone: string;

  @Column({ name: 'is_guest', default: true, type: 'boolean' })
  isGuest: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @Column({ name: 'payment_amount', type: 'decimal', precision: 10, scale: 2 })
  paymentAmount: number;

  @Column({ name: 'change_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  changeAmount: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'expires_at', nullable: true, type: 'datetime' })
  expiresAt: Date | null; // Batas waktu pembayaran (24 jam)

  @OneToMany(() => TransactionItem, (item) => item.transaction, { cascade: true })
  items: TransactionItem[];

  @OneToMany(() => Reservation, (reservation) => reservation.transaction)
  reservations: Reservation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
