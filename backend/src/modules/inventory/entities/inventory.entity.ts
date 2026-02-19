import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

export enum InventoryType {
  IN = 'IN',
  OUT = 'OUT',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
  EXPIRED = 'EXPIRED',
  RETURN = 'RETURN',
}

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    type: 'enum',
    enum: InventoryType,
    default: InventoryType.IN,
  })
  type: InventoryType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'stock_before', type: 'int', default: 0 })
  stockBefore: number;

  @Column({ name: 'stock_after', type: 'int', default: 0 })
  stockAfter: number;

  @Column({ name: 'purchase_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  purchasePrice: number | null;

  @Column({ name: 'selling_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  sellingPrice: number | null;

  @Column({ name: 'batch_code', nullable: true, type: 'varchar', length: 100 })
  batchCode: string | null;

  @Column({ name: 'expiry_date', nullable: true, type: 'datetime' })
  expiryDate: Date | null;

  @Column({ name: 'user_id', nullable: true, type: 'varchar', length: 36 })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'reference_id', nullable: true, type: 'varchar', length: 255 }) // <-- TAMBAHKAN TYPE
  referenceId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
