// frontend/src/pages/public/Products.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useCartStore } from "../../store/cartStore";
import toast from "react-hot-toast";

// Types
interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
  };
  unit: string;
  minStock: number;
}

interface ProductWithPrice extends Product {
  displayPrice: number;
  stockQuantity: number;
}

interface Category {
  id: string;
  name: string;
}

interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Format price dengan safe check
const formatPrice = (price: any): string => {
  if (price === undefined || price === null) return "Rp 0";

  let numericPrice: number;
  if (typeof price === "string") {
    numericPrice = parseFloat(price);
  } else if (typeof price === "number") {
    numericPrice = price;
  } else {
    return "Rp 0";
  }

  if (isNaN(numericPrice) || numericPrice === 0) return "Rp 0";

  return `Rp ${numericPrice.toLocaleString("id-ID")}`;
};

const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "",
  );
  const [allProducts, setAllProducts] = useState<ProductWithPrice[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const observer = useRef<IntersectionObserver | null>(null);

  const lastProductRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreProducts();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore],
  );

  const addToCart = useCartStore((state) => state.addItem);

  // ========== PERBAIKAN: FETCH CATEGORIES DENGAN SAFE CHECK ==========
  const { data: categories, isLoading: categoriesLoading } = useQuery<
    Category[]
  >({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get("/categories");
      // Pastikan response.data adalah array
      const data = response.data;

      // Jika data adalah array, return langsung
      if (Array.isArray(data)) {
        return data;
      }

      // Jika data adalah object dengan properti data (pagination)
      if (data && Array.isArray(data.data)) {
        return data.data;
      }

      // Fallback: return array kosong
      console.warn("Categories response is not an array:", data);
      return [];
    },
  });

  const fetchStockForProducts = async (
    products: Product[],
  ): Promise<ProductWithPrice[]> => {
    return Promise.all(
      products.map(async (product) => {
        try {
          const stockResponse = await api.get(
            `/inventory/stock?productId=${product.id}`,
          );
          const stockData = stockResponse.data;

          // Hanya hitung stok dari batch yang belum expired
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const validStocks = (stockData.stocks || []).filter((s: any) => {
            if (!s.expiryDate) return true; // batch tanpa kadaluarsa = valid
            return new Date(s.expiryDate) >= today; // batch belum kadaluarsa
          });

          const totalStock = validStocks.reduce(
            (sum: number, s: any) => sum + (s.quantity || 0),
            0,
          ) || 0;
          const price = validStocks[0]?.sellingPrice || stockData.stocks?.[0]?.sellingPrice || 0;

          return {
            ...product,
            displayPrice: Number(price),
            stockQuantity: totalStock,
          };
        } catch (error) {
          console.error(`Error fetching stock for ${product.name}:`, error);
          return {
            ...product,
            displayPrice: 0,
            stockQuantity: 0,
          };
        }
      }),
    );
  };

  // Fetch initial products
  const {
    data: initialData,
    isLoading: initialLoading,
    refetch,
  } = useQuery<ProductsResponse>({
    queryKey: ["public-products", 1, selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("limit", "12");

      if (selectedCategory) {
        params.append("categoryId", selectedCategory);
      }

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await api.get(`/products/public?${params.toString()}`);
      return response.data;
    },
  });

  // Load initial products
  useEffect(() => {
    const loadInitial = async () => {
      if (!initialData?.data) return;

      const productsWithStock = await fetchStockForProducts(initialData.data);
      setAllProducts(productsWithStock);
      setPage(1);
      setHasMore(initialData.meta.page < initialData.meta.totalPages);
      setTotalProducts(initialData.meta.total);
    };

    loadInitial();
  }, [initialData]);

  // Load more products (infinite scroll)
  const loadMoreProducts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const params = new URLSearchParams();
      params.append("page", nextPage.toString());
      params.append("limit", "12");

      if (selectedCategory) {
        params.append("categoryId", selectedCategory);
      }

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await api.get(`/products/public?${params.toString()}`);
      const newProducts = response.data.data;

      if (
        newProducts.length === 0 ||
        nextPage >= response.data.meta.totalPages
      ) {
        setHasMore(false);
      }

      const productsWithStock = await fetchStockForProducts(newProducts);
      setAllProducts((prev) => [...prev, ...productsWithStock]);
      setPage(nextPage);
    } catch (error) {
      console.error("Error loading more products:", error);
      toast.error("Gagal memuat produk");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page, selectedCategory, searchTerm]);

  // Update URL when filters change (dengan debounce untuk search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (selectedCategory) params.set("category", selectedCategory);
      setSearchParams(params);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, setSearchParams]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
    setAllProducts([]);
    setPage(1);
    setHasMore(true);
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setAllProducts([]);
    setPage(1);
    setHasMore(true);
    refetch();
  };

  // Handle add to cart
  const handleAddToCart = (product: ProductWithPrice) => {
    if (product.stockQuantity === 0) {
      toast.error("Stok habis", { icon: "😕" });
      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      price: product.displayPrice,
      quantity: 1,
      imageUrl: product.imageUrl || undefined,
    });

    toast.success(`${product.name} ditambahkan ke keranjang`, {
      icon: "🛒",
    });
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setAllProducts([]);
    setPage(1);
    setHasMore(true);
    refetch();
  };

  // Loading state
  if (categoriesLoading || (initialLoading && allProducts.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat produk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Semua Produk
        </h1>
        <p className="text-gray-600">Temukan berbagai kebutuhan dapur Anda</p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Search Bar */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-primary-700 transition-colors"
              >
                Cari
              </button>
            </form>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">Semua Kategori</option>
              {/* ========== PERBAIKAN: PASTIKAN categories ADALAH ARRAY ========== */}
              {Array.isArray(categories) &&
                categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-center justify-end">
            {(searchTerm || selectedCategory) && (
              <button
                onClick={clearFilters}
                className="text-gray-600 hover:text-primary-600 flex items-center gap-2 transition-colors"
              >
                <FunnelIcon className="h-5 w-5" />
                <span>Hapus Filter</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          Menampilkan {allProducts.length} dari {totalProducts} produk
        </p>
      </div>

      {/* Products Grid */}
      {allProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Tidak ada produk
          </h3>
          <p className="text-gray-600 mb-6">
            Produk dengan kriteria yang Anda cari tidak ditemukan.
          </p>
          <button
            onClick={clearFilters}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors font-semibold"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allProducts.map((product, index) => {
              if (allProducts.length === index + 1) {
                return (
                  <div
                    ref={lastProductRef}
                    key={product.id}
                    className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <Link to={`/products/${product.id}`}>
                      <div className="relative h-48 bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={
                              product.imageUrl.startsWith("http")
                                ? product.imageUrl
                                : `http://localhost:3001${product.imageUrl}`
                            }
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.parentElement!.innerHTML +=
                                '<div class="text-center"><span class="text-5xl mb-2 block">🛒</span><span class="text-sm text-gray-400">No Image</span></div>';
                            }}
                          />
                        ) : (
                          <div className="text-center">
                            <span className="text-5xl mb-2 block">🛒</span>
                            <span className="text-sm text-gray-400">
                              No Image
                            </span>
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
                        <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-600 px-3 py-1 rounded-full shadow-sm">
                          {product.unit}
                        </span>
                      </div>
                    </Link>

                    <div className="p-5">
                      <Link to={`/products/${product.id}`}>
                        <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 min-h-[3rem] hover:text-primary-600 transition-colors">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <span className="text-2xl font-bold text-primary-600">
                            {formatPrice(product.displayPrice)}
                          </span>
                          {product.stockQuantity > 0 &&
                            product.stockQuantity < 10 && (
                              <p className="text-xs text-orange-500 mt-1">
                                Sisa {product.stockQuantity}
                              </p>
                            )}
                        </div>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stockQuantity === 0}
                          className={`p-3 rounded-xl transition-all transform hover:scale-110 ${
                            product.stockQuantity === 0
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-primary-600 text-white hover:bg-primary-700"
                          }`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <Link to={`/products/${product.id}`}>
                      <div className="relative h-48 bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={
                              product.imageUrl.startsWith("http")
                                ? product.imageUrl
                                : `http://localhost:3001${product.imageUrl}`
                            }
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.parentElement!.innerHTML +=
                                '<div class="text-center"><span class="text-5xl mb-2 block">🛒</span><span class="text-sm text-gray-400">No Image</span></div>';
                            }}
                          />
                        ) : (
                          <div className="text-center">
                            <span className="text-5xl mb-2 block">🛒</span>
                            <span className="text-sm text-gray-400">
                              No Image
                            </span>
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
                        <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-600 px-3 py-1 rounded-full shadow-sm">
                          {product.unit}
                        </span>
                      </div>
                    </Link>

                    <div className="p-5">
                      <Link to={`/products/${product.id}`}>
                        <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 min-h-[3rem] hover:text-primary-600 transition-colors">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <span className="text-2xl font-bold text-primary-600">
                            {formatPrice(product.displayPrice)}
                          </span>
                          {product.stockQuantity > 0 &&
                            product.stockQuantity < 10 && (
                              <p className="text-xs text-orange-500 mt-1">
                                Sisa {product.stockQuantity}
                              </p>
                            )}
                        </div>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stockQuantity === 0}
                          className={`p-3 rounded-xl transition-all transform hover:scale-110 ${
                            product.stockQuantity === 0
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-primary-600 text-white hover:bg-primary-700"
                          }`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>

          {isLoadingMore && (
            <div className="flex justify-center mt-8">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!hasMore && allProducts.length > 0 && (
            <p className="text-center text-gray-500 mt-8">
              Tidak ada produk lagi
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default Products;
