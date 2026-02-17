import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer, (customer) => customer.addresses)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ length: 100 })
  label: string; // Misal: "Rumah", "Kantor"

  @Column({ name: 'recipient_name', length: 100 })
  recipientName: string;

  @Column({ name: 'recipient_phone', length: 20 })
  recipientPhone: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ length: 100, nullable: true })
  province: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 50, nullable: true })
  district: string;

  @Column({ length: 10, nullable: true })
  postalCode: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
