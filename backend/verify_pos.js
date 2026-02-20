
const axios = require('axios');

async function test() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:3001/auth/login', {
      username: 'kasir1',
      password: 'cashier123'
    });
    const token = loginRes.data.access_token;
    console.log('Token acquired:', token.substring(0, 10) + '...');

    console.log('Testing /products/pos/all...');
    const productsRes = await axios.get('http://localhost:3001/products/pos/all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Products found:', productsRes.data.length);
    if (productsRes.data.length > 0) {
      console.log('Sample Product:', JSON.stringify({
        name: productsRes.data[0].name,
        stockQuantity: productsRes.data[0].stockQuantity,
        price: productsRes.data[0].price
      }, null, 2));
    }

    console.log('Testing /transactions (Web Orders)...');
    const ordersRes = await axios.get('http://localhost:3001/transactions?status=PENDING&orderType=ONLINE', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Pending Web Orders:', ordersRes.data.items.length);

    console.log('✅ BACKEND VERIFICATION COMPLETE');
  } catch (error) {
    console.error('❌ VERIFICATION FAILED:', error.response?.data || error.message);
  }
}

test();
