import { DataSource } from 'typeorm';
import { User, UserRole } from '../modules/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

export async function seedUsers(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  // Cek apakah sudah ada user
  const count = await userRepository.count();
  if (count > 0) {
    console.log('✅ Users already seeded');
    return;
  }

  // Buat password hash
  const ownerPassword = await bcrypt.hash('owner123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  // Buat users
  const users = [
    {
      username: 'owner',
      password: ownerPassword,
      name: 'Abang Owner',
      role: UserRole.OWNER,
      phone: '081234567890',
    },
    {
      username: 'manager',
      password: managerPassword,
      name: 'Manager Toko',
      role: UserRole.MANAGER,
      phone: '081234567891',
    },
    {
      username: 'kasir1',
      password: cashierPassword,
      name: 'Kasir Satu',
      role: UserRole.CASHIER,
      phone: '081234567892',
    },
    {
      username: 'kasir2',
      password: cashierPassword,
      name: 'Kasir Dua',
      role: UserRole.CASHIER,
      phone: '081234567893',
    },
    {
      username: 'gudang',
      password: staffPassword,
      name: 'Staff Gudang',
      role: UserRole.STAFF,
      phone: '081234567894',
    },
  ];

  await userRepository.save(users);
  console.log('✅ Users seeded successfully');
}
