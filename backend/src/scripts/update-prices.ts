import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Product } from '../modules/products/entities/product.entity';
import { Stock } from '../modules/inventory/entities/stock.entity';
import { Category } from '../modules/categories/entities/category.entity'; // <-- TAMBAHKAN INI

config();

async function updatePrices() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [Product, Stock, Category], // <-- TAMBAHKAN CATEGORY
  });

  await dataSource.initialize();
  console.log('📦 Database connected');

  const productRepo = dataSource.getRepository(Product);
  const stockRepo = dataSource.getRepository(Stock);
  const categoryRepo = dataSource.getRepository(Category);

  // Ambil semua kategori untuk mapping harga
  const categories = await categoryRepo.find();
  console.log(`📊 Found ${categories.length} categories`);

  // Buat mapping harga berdasarkan kategori
  const priceMap: { [key: string]: number } = {};

  // Set harga default per kategori (bisa disesuaikan)
  categories.forEach((cat) => {
    if (cat.name.toLowerCase().includes('kue')) {
      priceMap[cat.id] = 7500;
    } else if (cat.name.toLowerCase().includes('rempah')) {
      priceMap[cat.id] = 5000;
    } else if (cat.name.toLowerCase().includes('plastik')) {
      priceMap[cat.id] = 2000;
    } else if (cat.name.toLowerCase().includes('kantong')) {
      priceMap[cat.id] = 1500;
    } else if (cat.name.toLowerCase().includes('cup') || cat.name.toLowerCase().includes('gelas')) {
      priceMap[cat.id] = 2500;
    } else if (cat.name.toLowerCase().includes('mika')) {
      priceMap[cat.id] = 3000;
    } else if (cat.name.toLowerCase().includes('thinwall')) {
      priceMap[cat.id] = 4000;
    } else if (cat.name.toLowerCase().includes('nasi')) {
      priceMap[cat.id] = 3500;
    } else if (cat.name.toLowerCase().includes('sendok')) {
      priceMap[cat.id] = 500;
    } else if (cat.name.toLowerCase().includes('gula')) {
      priceMap[cat.id] = 12000;
    } else if (cat.name.toLowerCase().includes('kecap')) {
      priceMap[cat.id] = 8000;
    } else if (cat.name.toLowerCase().includes('saus')) {
      priceMap[cat.id] = 7000;
    } else if (cat.name.toLowerCase().includes('instan')) {
      priceMap[cat.id] = 3000;
    } else {
      priceMap[cat.id] = 5000; // default
    }
  });

  console.log('💰 Price mapping created');

  // 1. Ambil semua produk
  const products = await productRepo.find({
    relations: ['category'], // <-- LOAD RELASI CATEGORY
  });
  console.log(`📊 Found ${products.length} products`);

  let addedCount = 0;
  let skippedCount = 0;

  // 2. Tambah stok untuk setiap produk
  for (const product of products) {
    // Cek apakah produk sudah punya stok
    const existingStocks = await stockRepo.find({
      where: { productId: product.id },
    });

    if (existingStocks.length === 0) {
      // Dapatkan harga berdasarkan kategori
      const sellingPrice = priceMap[product.categoryId] || 5000;

      // Buat stok baru
      const stock = new Stock();
      stock.productId = product.id;
      stock.quantity = 50 + Math.floor(Math.random() * 100); // Stok 50-150
      stock.batchCode = `BATCH-INITIAL-${Date.now()}`;
      stock.purchasePrice = sellingPrice * 0.7; // Harga beli 70% dari harga jual
      stock.sellingPrice = sellingPrice;
      stock.isActive = true;

      await stockRepo.save(stock);
      console.log(
        `✅ Added stock for ${product.name} (${product.category?.name || 'Unknown'}): ${stock.quantity} units @ Rp ${sellingPrice}`,
      );
      addedCount++;
    } else {
      console.log(`⏭️ ${product.name} already has ${existingStocks.length} stock entries`);
      skippedCount++;
    }

    // Delay kecil biar ga overload
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Added: ${addedCount} products`);
  console.log(`⏭️ Skipped: ${skippedCount} products`);
  console.log(`📦 Total: ${products.length} products`);

  await dataSource.destroy();
  console.log('✨ Done!');
}

updatePrices().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
