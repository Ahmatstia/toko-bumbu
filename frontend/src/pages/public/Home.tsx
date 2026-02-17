import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

const Home: React.FC = () => {
  const { data: products, isLoading } = useQuery(
    "featured-products",
    async () => {
      const response = await api.get("/products?limit=8");
      return response.data.data;
    },
  );

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-12 mb-12">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Bumbu Dapur Lengkap untuk Masakan Lezat
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Belanja bumbu dapur, rempah-rempah, dan perlengkapan masak dengan
            harga terjangkau. Langsung dari toko kami ke dapur Anda.
          </p>
          <div className="flex space-x-4">
            <Link to="/products" className="btn-primary text-lg px-8 py-3">
              Belanja Sekarang
            </Link>
            <Link to="/products" className="btn-secondary text-lg px-8 py-3">
              Lihat Katalog
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Kategori Populer</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Bahan Kue", "Rempah-rempah", "Bumbu Instan", "Kemasan"].map(
            (cat) => (
              <Link
                key={cat}
                to={`/products?category=${cat}`}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <h3 className="font-semibold text-lg">{cat}</h3>
              </Link>
            ),
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <h2 className="text-3xl font-bold mb-6">Produk Terbaru</h2>
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {products?.map((product: any) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400">No Image</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                  <p className="text-primary-600 font-bold">
                    Rp {product.price?.toLocaleString() || "0"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
