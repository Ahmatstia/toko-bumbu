import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum UserRole {
  OWNER = 'OWNER', // Abang kamu (full akses)
  MANAGER = 'MANAGER', // Kepercayaan (kelola produk, stok, laporan)
  CASHIER = 'CASHIER', // Kasir (input transaksi, cetak nota)
  STAFF = 'STAFF', // Staff gudang (urus stok)
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string; // Untuk login, misal: "abang", "kasir1"

  @Column()
  password: string; // Hash password

  @Column({ length: 100 })
  name: string; // Nama lengkap

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STAFF,
  })
  role: UserRole;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
