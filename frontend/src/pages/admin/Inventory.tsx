import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusIcon,
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
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
  const [showLowStock, setShowLowStock] = useState(false);
  const [showExpiring, setShowExpiring] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch all stock
  const { data: stockData, isLoading } = useQuery({
    queryKey: ["inventory", searchTerm, showLowStock, showExpiring],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);

      const response = await api.get(`/inventory/stock?${params.toString()}`);
      let stocks = response.data.stocks || [];

      // Filter low stock
      if (showLowStock) {
        stocks = stocks.filter(
          (s: StockItem) => s.quantity > 0 && s.quantity <= s.product.minStock,
        );
      }

      // Filter expiring (30 hari)
      if (showExpiring) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        stocks = stocks.filter((s: StockItem) => {
          if (!s.expiryDate) return false;
          const expiry = new Date(s.expiryDate);
          return expiry <= thirtyDaysFromNow;
        });
      }

      return stocks;
    },
  });

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
  const getExpiryStatus = (date: string | null) => {
    if (!date) return null;

    const today = new Date();
    const expiry = new Date(date);
    const daysLeft = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysLeft < 0) {
      return { label: "Expired", color: "bg-red-100 text-red-600" };
    }
    if (daysLeft <= 30) {
      return {
        label: `${daysLeft} hari`,
        color: "bg-yellow-100 text-yellow-600",
      };
    }
    return null;
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
                  Status
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
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Tidak ada data stok
                  </td>
                </tr>
              ) : (
                stocks.map((stock: StockItem) => {
                  const status = getStockStatus(stock);
                  const expiryStatus = getExpiryStatus(stock.expiryDate);

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
                          className={`px-2 py-1 rounded text-xs ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {formatPrice(stock.purchasePrice)}
                      </td>
                      <td className="py-4 px-6">
                        {formatPrice(stock.sellingPrice)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span>{formatDate(stock.expiryDate)}</span>
                          {expiryStatus && (
                            <span
                              className={`px-2 py-1 rounded text-xs ${expiryStatus.color}`}
                            >
                              {expiryStatus.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(stock);
                              setShowAdjustModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
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
                            <ClockIcon className="h-5 w-5" />
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

      {/* Warning Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">Stok Menipis</p>
              <p className="text-sm text-yellow-600">
                {
                  stocks.filter(
                    (s: StockItem) =>
                      s.quantity > 0 && s.quantity <= s.product.minStock,
                  ).length
                }{" "}
                produk
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-800">Akan Expired</p>
              <p className="text-sm text-orange-600">
                {
                  stocks.filter((s: StockItem) => {
                    if (!s.expiryDate) return false;
                    const daysLeft = Math.ceil(
                      (new Date(s.expiryDate).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                    return daysLeft <= 30 && daysLeft > 0;
                  }).length
                }{" "}
                produk
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Stok Habis</p>
              <p className="text-sm text-red-600">
                {stocks.filter((s: StockItem) => s.quantity === 0).length}{" "}
                produk
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddStockModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
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
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
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
