const axios = require('axios');

// Konfigurasi
const API_URL = 'http://localhost:3001';
let categories = {}; // Akan diisi dari API

// Fungsi untuk delay (biar ga overload server)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Ambil semua categories yang sudah ada
async function getCategories() {
  try {
    const response = await axios.get(`${API_URL}/categories`);
    response.data.forEach((cat) => {
      categories[cat.name] = cat.id;
    });
    console.log('✅ Categories loaded:', Object.keys(categories).length);
  } catch (error) {
    console.error('❌ Gagal ambil categories:', error.message);
    process.exit(1);
  }
}

// 2. Import produk satu per satu
async function importProducts() {
  const products = require('./data-produk.json');

  console.log(`🚀 Mulai import ${products.length} produk...`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    // Cek apakah category ada
    if (!categories[p.category]) {
      console.log(
        `❌ [${i + 1}/${products.length}] Category "${p.category}" tidak ditemukan untuk ${p.name}`,
      );
      failed++;
      continue;
    }

    try {
      const response = await axios.post(`${API_URL}/products`, {
        name: p.name,
        categoryId: categories[p.category],
        unit: p.unit,
        minStock: 5,
      });

      console.log(
        `✅ [${i + 1}/${products.length}] ${p.name} -> SKU: ${response.data.sku}`,
      );
      success++;

      // Delay 100ms biar ga overload
      await delay(100);
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log(`⚠️ [${i + 1}/${products.length}] ${p.name} sudah ada`);
        success++; // Tetap hitung sukses kalo sudah ada
      } else {
        console.log(
          `❌ [${i + 1}/${products.length}] ${p.name} gagal:`,
          error.response?.data?.message || error.message,
        );
        failed++;
      }
    }
  }

  console.log('\n📊 HASIL IMPORT:');
  console.log(`✅ Sukses: ${success}`);
  console.log(`❌ Gagal: ${failed}`);
  console.log(`📦 Total: ${products.length}`);
}

// 3. Jalankan semua
async function main() {
  console.log('🔍 Mengambil data categories...');
  await getCategories();

  console.log('\n📦 Mulai import produk...');
  await importProducts();

  console.log('\n🎉 Selesai!');
}

// Eksekusi
main();
