import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusIcon,
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import toast from "react-hot-toast";
import AddStockModal from "../../components/inventory/AddStockModal";
import AdjustStockModal from "../../components/inventory/AdjustStockModal";
import StockHistoryModal from "../../components/inventory/StockHistoryModal";

interface StockItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    minStock: number;
  };
  quantity: number;
  batchCode: string | null;
  expiryDate: string | null;
  purchasePrice: number;
  sellingPrice: number;
  isActive: boolean;
}

const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showExpiring, setShowExpiring] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch all stock
  const {
    data: stockData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["inventory", debouncedSearch, showLowStock, showExpiring],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);

      const response = await api.get(`/inventory/stock?${params.toString()}`);
      let stocks = response.data.stocks || [];

      // Filter low stock (client-side)
      if (showLowStock) {
        stocks = stocks.filter(
          (s: StockItem) => s.quantity > 0 && s.quantity <= s.product.minStock,
        );
      }

      // Filter expiring (client-side)
      if (showExpiring) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        stocks = stocks.filter((s: StockItem) => {
          if (!s.expiryDate) return false;
          const expiry = new Date(s.expiryDate);
          return expiry <= thirtyDaysFromNow && s.quantity > 0;
        });
      }

      return stocks;
    },
  });

  // Manual check expired mutation
  const checkExpiredMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/inventory/check-expired");
      return response.data;
    },
    onSuccess: (data) => {
      // Refetch data setelah proses expired selesai
      refetch();
      toast.success(`${data.processed} stok expired telah diproses`);
    },
    onError: (error: any) => {
      console.error("Check expired error:", error);
      toast.error(
        error.response?.data?.message || "Gagal memproses stok expired",
      );
    },
  });

  // Handle check expired dengan konfirmasi
  const handleCheckExpired = () => {
    if (window.confirm("Yakin ingin memeriksa dan memproses stok expired?")) {
      checkExpiredMutation.mutate();
    }
  };

  // Format price
  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID");
  };

  // Get stock status
  const getStockStatus = (stock: StockItem) => {
    if (stock.quantity === 0) {
      return { label: "Habis", color: "bg-red-100 text-red-600" };
    }
    if (stock.quantity <= stock.product.minStock) {
      return { label: "Menipis", color: "bg-yellow-100 text-yellow-600" };
    }
    return { label: "Tersedia", color: "bg-green-100 text-green-600" };
  };

  // Check expiry status
  const getExpiryStatus = (date: string | null, quantity: number) => {
    if (!date) return null;
    if (quantity === 0) return null;

    const today = new Date();
    const expiry = new Date(date);
    const daysLeft = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysLeft < 0) {
      return { label: "EXPIRED", color: "bg-red-100 text-red-600" };
    }
    if (daysLeft <= 30) {
      return {
        label: `${daysLeft} hari`,
        color: "bg-yellow-100 text-yellow-600",
      };
    }
    return null;
  };

  // Hitung stok aman
  const countSafeStock = (stocks: StockItem[]) => {
    return stocks.filter((s: StockItem) => s.quantity > s.product.minStock)
      .length;
  };

  // Hitung stok menipis
  const countLowStock = (stocks: StockItem[]) => {
    return stocks.filter(
      (s: StockItem) => s.quantity > 0 && s.quantity <= s.product.minStock,
    ).length;
  };

  // Hitung akan expired
  const countExpiringSoon = (stocks: StockItem[]) => {
    return stocks.filter((s: StockItem) => {
      if (!s.expiryDate || s.quantity === 0) return false;
      const daysLeft = Math.ceil(
        (new Date(s.expiryDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return daysLeft <= 30 && daysLeft > 0;
    }).length;
  };

  // Hitung expired
  const countExpired = (stocks: StockItem[]) => {
    return stocks.filter((s: StockItem) => {
      if (!s.expiryDate || s.quantity === 0) return false;
      const daysLeft = Math.ceil(
        (new Date(s.expiryDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return daysLeft < 0;
    }).length;
  };

  const stocks = stockData || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Stok</h1>
          <p className="text-gray-600 mt-1">Kelola stok barang dan batch</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCheckExpired}
            disabled={checkExpiredMutation.isPending}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <ClockIcon className="h-5 w-5" />
            {checkExpiredMutation.isPending ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Memproses...
              </>
            ) : (
              "Cek Expired"
            )}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Tambah Stok
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filter Low Stock */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Stok menipis</span>
          </label>

          {/* Filter Expiring */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showExpiring}
              onChange={(e) => setShowExpiring(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Akan expired (30 hari)
            </span>
          </label>

          {/* Reset */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setDebouncedSearch("");
                setShowLowStock(false);
                setShowExpiring(false);
              }}
              className="text-gray-600 hover:text-primary-600 flex items-center gap-2"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Warning Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">
                {countSafeStock(stocks)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-green-800">Stok Aman</p>
              <p className="text-sm text-green-600">Normal</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-bold">
                {countLowStock(stocks)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-yellow-800">Stok Menipis</p>
              <p className="text-sm text-yellow-600">Perlu restock</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-800">Akan Expired</p>
              <p className="text-sm text-orange-600">
                {countExpiringSoon(stocks)} produk
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Stok Expired</p>
              <p className="text-sm text-red-600">
                {countExpired(stocks)} produk
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Produk
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Batch
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Stok
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Status Stok
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Harga Beli
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Harga Jual
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Expiry Date
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Status Expiry
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    Tidak ada data stok
                  </td>
                </tr>
              ) : (
                stocks.map((stock: StockItem) => {
                  const stockStatus = getStockStatus(stock);
                  const expiryStatus = getExpiryStatus(
                    stock.expiryDate,
                    stock.quantity,
                  );

                  return (
                    <tr
                      key={stock.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium">{stock.product.name}</p>
                          <p className="text-sm text-gray-500">
                            {stock.product.sku}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-sm">
                        {stock.batchCode || "-"}
                      </td>
                      <td className="py-4 px-6 font-semibold">
                        {stock.quantity} {stock.product.unit}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded text-xs ${stockStatus.color}`}
                        >
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {formatPrice(stock.purchasePrice)}
                      </td>
                      <td className="py-4 px-6">
                        {formatPrice(stock.sellingPrice)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={
                            stock.quantity === 0 ? "text-gray-400" : ""
                          }
                        >
                          {formatDate(stock.expiryDate)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {expiryStatus && (
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${expiryStatus.color}`}
                          >
                            {expiryStatus.label}
                          </span>
                        )}
                        {!expiryStatus &&
                          stock.expiryDate &&
                          stock.quantity > 0 && (
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-600">
                              Aman
                            </span>
                          )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(stock);
                              setShowAdjustModal(true);
                            }}
                            disabled={stock.quantity === 0}
                            className={`text-blue-600 hover:text-blue-700 ${stock.quantity === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                            title="Adjust Stok"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduct(stock);
                              setShowHistoryModal(true);
                            }}
                            className="text-gray-600 hover:text-gray-700"
                            title="History"
                          >
                            <DocumentTextIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddStockModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            refetch();
            setShowAddModal(false);
          }}
        />
      )}

      {showAdjustModal && selectedProduct && (
        <AdjustStockModal
          stock={selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            setShowAdjustModal(false);
          }}
          onSuccess={() => {
            refetch();
            setSelectedProduct(null);
            setShowAdjustModal(false);
          }}
        />
      )}

      {showHistoryModal && selectedProduct && (
        <StockHistoryModal
          productId={selectedProduct.productId}
          productName={selectedProduct.product.name}
          onClose={() => {
            setSelectedProduct(null);
            setShowHistoryModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Inventory;
