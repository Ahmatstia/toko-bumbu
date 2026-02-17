import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

// Types
interface Product {
  id: string;
  name: string;
  price?: number;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
  };
  unit: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

interface Stock {
  id: string;
  quantity: number;
  sellingPrice: number;
}

interface ProductWithPrice extends Product {
  displayPrice: number;
  stockQuantity: number;
}

const Home: React.FC = () => {
  // Fetch categories
  const { 
    data: categoriesData, 
    isLoading: categoriesLoading,
    error: categoriesError 
  } = useQuery<Category[]>({
    queryKey: ['home-categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
  });

  // Fetch products
  const { 
    data: productsData, 
    isLoading: productsLoading,
    error: productsError 
  } = useQuery({
    queryKey: ['home-products'],
    queryFn: async () => {
      const response = await api.get('/products?limit=8');
      return response.data.data || [];
    },
  });

  // Fetch stock for products
  const [productsWithPrice, setProductsWithPrice] = React.useState<ProductWithPrice[]>([]);

  React.useEffect(() => {
    const fetchStockForProducts = async () => {
      if (!productsData || productsData.length === 0) return;

      const products = productsData;
      const productsWithStock: ProductWithPrice[] = [];

      for (const product of products) {
        try {
          const stockResponse = await api.get(`/inventory/stock?productId=${product.id}`);
          const stockData = stockResponse.data;
          
          const totalStock = stockData.stocks?.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0) || 0;
          const price = stockData.stocks?.[0]?.sellingPrice || 0;

          productsWithStock.push({
            ...product,
            displayPrice: Number(price),
            stockQuantity: totalStock
          });
        } catch (error) {
          console.error(`Error fetching stock for ${product.name}:`, error);
          productsWithStock.push({
            ...product,
            displayPrice: 0,
            stockQuantity: 0
          });
        }
      }

      setProductsWithPrice(productsWithStock);
    };

    fetchStockForProducts();
  }, [productsData]);

  const categories: Category[] = categoriesData || [];
  const products: ProductWithPrice[] = productsWithPrice;

  // Format price
  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'Rp 0';
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  // Loading state
  if (categoriesLoading || productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (categoriesError || productsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg">
          <div className="text-red-500 text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Gagal Memuat Data</h2>
          <p className="text-gray-600 mb-6">
            Maaf, terjadi kesalahan saat memuat data. Silakan coba lagi.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors font-semibold"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-50 via-primary-100 to-primary-50 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Bumbu Dapur Lengkap untuk{' '}
              <span className="text-primary-600">Masakan Lezat</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
              Belanja bumbu dapur, rempah-rempah, dan perlengkapan masak dengan harga terjangkau.
              Langsung dari toko kami ke dapur Anda. Dijamin segar dan berkualitas!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/products"
                className="bg-primary-600 text-white px-8 py-4 rounded-xl hover:bg-primary-700 transition-all transform hover:scale-105 text-center font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                Belanja Sekarang
              </Link>
              <Link
                to="/products"
                className="bg-white text-gray-700 px-8 py-4 rounded-xl hover:bg-gray-50 transition-all transform hover:scale-105 text-center font-semibold text-lg border-2 border-gray-200"
              >
                Lihat Katalog
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Kategori Populer
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Temukan berbagai kebutuhan dapur Anda dalam kategori-kategori berikut
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <p className="text-gray-500">Belum ada kategori tersedia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${encodeURIComponent(category.name)}`}
                className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-200 transition-colors">
                    <span className="text-2xl">
                      {category.name === 'Bahan Kue' && '🍰'}
                      {category.name === 'Rempah-rempah' && '🌶️'}
                      {category.name === 'Bumbu Instan' && '🧂'}
                      {category.name === 'Kemasan' && '📦'}
                      {category.name === 'Cup/Gelas' && '🥤'}
                      {category.name === 'Mika' && '🥡'}
                      {category.name === 'Plastik' && '🛍️'}
                      {category.name === 'Gula' && '🍬'}
                      {category.name === 'Kecap' && '🍯'}
                      {category.name === 'Saus' && '🥫'}
                      {category.name === 'Sendok' && '🥄'}
                      {!['Bahan Kue', 'Rempah-rempah', 'Bumbu Instan', 'Kemasan', 'Cup/Gelas', 'Mika', 'Plastik', 'Gula', 'Kecap', 'Saus', 'Sendok'].includes(category.name) && '🛒'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {category.description || 'Koleksi lengkap'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link
            to="/products"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-semibold"
          >
            Lihat Semua Kategori
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Produk Terbaru
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Pilihan produk terbaik untuk kebutuhan dapur Anda
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <p className="text-gray-500">Belum ada produk tersedia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="relative h-48 bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML += '<div class="text-center"><span class="text-5xl mb-2 block">🛒</span><span class="text-sm text-gray-400">No Image</span></div>';
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <span className="text-5xl mb-2 block">🛒</span>
                      <span className="text-sm text-gray-400">No Image</span>
                    </div>
                  )}
                  {product.category && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-semibold text-primary-600 px-3 py-1 rounded-full shadow-sm">
                      {product.category.name}
                    </span>
                  )}
                  {product.stockQuantity === 0 && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                      Stok Habis
                    </span>
                  )}
                </div>
                
                <div className="p-5">
                  <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 min-h-[3rem] group-hover:text-primary-600 transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <span className="text-2xl font-bold text-primary-600">
                        {formatPrice(product.displayPrice)}
                      </span>
                      <p className="text-xs text-gray-500">{product.unit}</p>
                    </div>
                    {product.stockQuantity > 0 && (
                      <div className="bg-primary-600 text-white p-2 rounded-xl group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link
            to="/products"
            className="inline-flex items-center bg-primary-600 text-white px-8 py-4 rounded-xl hover:bg-primary-700 transition-all transform hover:scale-105 font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            Lihat Semua Produk
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16 rounded-3xl">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl mb-2">Produk Berkualitas</h3>
              <p className="text-gray-600">Bahan baku segar dan berkualitas untuk masakan terbaik</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl mb-2">Pengiriman Cepat</h3>
              <p className="text-gray-600">Pesanan diproses dan dikirim dengan cepat</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl mb-2">Harga Terjangkau</h3>
              <p className="text-gray-600">Harga bersaing untuk setiap produk</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-primary-600 rounded-3xl overflow-hidden">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Siap Memasak Hidangan Lezat?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Dapatkan semua kebutuhan bumbu dapur Anda di BumbuKu
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-block bg-white text-primary-600 px-8 py-4 rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105 font-semibold text-lg shadow-lg"
            >
              Daftar Sekarang
            </Link>
            <Link
              to="/products"
              className="inline-block bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white hover:text-primary-600 transition-all transform hover:scale-105 font-semibold text-lg"
            >
              Lihat Produk
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;