import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('stocks')
@Unique(['productId', 'batchCode'])
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ name: 'batch_code', nullable: true, type: 'varchar' }) // nullable explicit
  batchCode: string | null;

  @Column({ name: 'expiry_date', nullable: true, type: 'datetime' }) // nullable explicit
  expiryDate: Date | null;

  @Column({
    name: 'purchase_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  purchasePrice: number | null;

  @Column({
    name: 'selling_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  sellingPrice: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
