import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCartIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useCartStore } from "../../store/cartStore";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:3001";

// Helper: buat URL gambar lengkap
const getImageUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
};

// Types
interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  images?: ProductImage[];
  category: {
    id: string;
    name: string;
    description: string | null;
  };
  unit: string;
  sku: string;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Stock {
  id: string;
  quantity: number;
  batchCode: string | null;
  expiryDate: string | null;
  sellingPrice: number;
  purchasePrice: number;
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const addToCart = useCartStore((state) => state.addItem);

  // Fetch product details
  const {
    data: product,
    isLoading: productLoading,
    error: productError,
  } = useQuery<Product>({
    queryKey: ["product", id],
    queryFn: async () => {
      const response = await api.get(`/products/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Fetch product stock
  const {
    data: stockData,
    isLoading: stockLoading,
  } = useQuery({
    queryKey: ["product-stock", id],
    queryFn: async () => {
      try {
        const response = await api.get(`/inventory/stock?productId=${id}`);
        return response.data;
      } catch (error) {
        console.error("Error fetching stock:", error);
        return { stocks: [], totalStock: 0 };
      }
    },
    enabled: !!id,
  });

  const stocks: Stock[] = stockData?.stocks || [];
  const totalStock = stocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const availableStock = totalStock;

  // Ambil harga dari stock pertama
  const productPrice = stocks.length > 0 ? Number(stocks[0].sellingPrice) : 0;

  // Kumpulkan semua gambar dari images[] atau fallback ke imageUrl
  const allImages: string[] = React.useMemo(() => {
    if (product?.images && product.images.length > 0) {
      return [...product.images]
        .sort((a, b) => {
          if (a.isPrimary) return -1;
          if (b.isPrimary) return 1;
          return a.sortOrder - b.sortOrder;
        })
        .map((img) => getImageUrl(img.imageUrl)!)
        .filter(Boolean);
    }
    if (product?.imageUrl) {
      const url = getImageUrl(product.imageUrl);
      return url ? [url] : [];
    }
    return [];
  }, [product]);

  // Set gambar aktif saat product dimuat
  useEffect(() => {
    if (allImages.length > 0 && !selectedImage) {
      setSelectedImage(allImages[0]);
    }
  }, [allImages, selectedImage]);

  // Format harga
  const formatPrice = (price: number) => {
    if (!price || price === 0) return "Rp 0";
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  // Handle quantity change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= availableStock) {
      setQuantity(value);
    }
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!product) return;

    if (availableStock === 0) {
      toast.error("Stok habis", { icon: "😕" });
      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      price: productPrice,
      quantity: quantity,
      imageUrl: allImages[0] || undefined,
    });

    toast.success(
      <div>
        <p className="font-semibold">Berhasil ditambahkan!</p>
        <p className="text-sm">
          {quantity} x {product.name}
        </p>
      </div>,
      {
        icon: "🛒",
        duration: 3000,
      },
    );
  };

  // Handle buy now
  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/cart");
  };

  // Debug
  useEffect(() => {
    if (product) {
      console.log("Product:", product);
      console.log("Images:", product.images);
    }
  }, [product]);

  // Loading state
  if (productLoading || stockLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat detail produk...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (productError || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Produk Tidak Ditemukan
          </h2>
          <p className="text-gray-600 mb-6">
            Maaf, produk yang Anda cari tidak ditemukan atau telah dihapus.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors font-semibold"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Kembali ke Produk
          </Link>
        </div>
      </div>
    );
  }

  const activeImage = selectedImage || allImages[0] || null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-primary-600 mb-6 transition-colors group"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        Kembali
      </button>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 lg:p-8">
          {/* Left Column - Images */}
          <div>
            {/* Main Image */}
            <div className="aspect-square bg-gradient-to-br from-primary-50 to-gray-100 rounded-2xl overflow-hidden mb-4 flex items-center justify-center">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              ) : (
                <div className="text-center">
                  <span className="text-8xl mb-4 block">🛒</span>
                  <span className="text-gray-400">No Image Available</span>
                </div>
              )}
            </div>

            {/* Thumbnail Images - tampil jika ada lebih dari 0 gambar */}
            {allImages.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {allImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      activeImage === imgUrl
                        ? "border-primary-600 shadow-md"
                        : "border-transparent hover:border-primary-300"
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.parentElement!.style.display = "none";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Badge jumlah foto */}
            {allImages.length > 1 && (
              <p className="text-xs text-gray-400 mt-2">
                {allImages.length} foto tersedia
              </p>
            )}
          </div>

          {/* Right Column - Details */}
          <div>
            {/* Category */}
            <div className="mb-4">
              <Link
                to={`/products?category=${product.category.id}`}
                className="inline-block bg-primary-50 text-primary-600 px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-100 transition-colors"
              >
                {product.category.name}
              </Link>
            </div>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>

            {/* SKU */}
            <p className="text-sm text-gray-500 mb-4">SKU: {product.sku}</p>

            {/* Price */}
            <div className="mb-6">
              <span className="text-4xl font-bold text-primary-600">
                {formatPrice(productPrice)}
              </span>
              <span className="text-gray-500 ml-2">/{product.unit}</span>
            </div>

            {/* Stock Status */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">
                  Ketersediaan Stok:
                </span>
                {availableStock > 0 ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircleIcon className="h-5 w-5 mr-1" />
                    Tersedia ({availableStock} {product.unit})
                  </span>
                ) : (
                  <span className="flex items-center text-red-600">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
                    Stok Habis
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Deskripsi:</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block font-semibold text-gray-700 mb-2">
                Jumlah:
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={availableStock}
                    value={quantity}
                    onChange={handleQuantityChange}
                    className="w-20 text-center py-2 border-x border-gray-300 focus:outline-none"
                  />
                  <button
                    onClick={() =>
                      setQuantity((q) => Math.min(availableStock, q + 1))
                    }
                    disabled={quantity >= availableStock}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
                <span className="text-gray-500">
                  {availableStock > 0
                    ? `Tersedia: ${availableStock} ${product.unit}`
                    : "Stok habis"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleAddToCart}
                disabled={availableStock === 0}
                className="flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-4 rounded-xl hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCartIcon className="h-5 w-5" />
                Keranjang
              </button>
              <button
                onClick={handleBuyNow}
                disabled={availableStock === 0}
                className="bg-green-600 text-white px-6 py-4 rounded-xl hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Beli Langsung
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-semibold text-gray-800 mb-1">Kategori</p>
                <Link
                  to={`/products?category=${product.category.id}`}
                  className="text-primary-600 hover:underline"
                >
                  {product.category.name}
                </Link>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-semibold text-gray-800 mb-1">Satuan</p>
                <p className="text-gray-600">{product.unit}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-semibold text-gray-800 mb-1">
                  Min. Pembelian
                </p>
                <p className="text-gray-600">1 {product.unit}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-semibold text-gray-800 mb-1">Stok Minimum</p>
                <p className="text-gray-600">
                  {product.minStock} {product.unit}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProductDetail;
