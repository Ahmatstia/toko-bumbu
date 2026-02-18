import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { authService } from "../../services/auth.service";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface HistoryItem {
  id: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "EXPIRED" | "RETURN";
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  notes: string | null;
  createdAt: string;
  user?: {
    name: string;
  };
}

interface Props {
  productId: string;
  productName: string;
  onClose: () => void;
}

const StockHistoryModal: React.FC<Props> = ({
  productId,
  productName,
  onClose,
}) => {
  const {
    data: history,
    isLoading,
    error,
  } = useQuery<HistoryItem[]>({
    queryKey: ["stock-history", productId],
    queryFn: async () => {
      // Cek apakah user sudah login sebagai admin
      const isAuthenticated = authService.isAuthenticated();
      const role = authService.getUserRole();

      console.log("Fetching history for product:", productId);
      console.log("Auth status:", { isAuthenticated, role });

      try {
        const response = await api.get(
          `/inventory/history?productId=${productId}&limit=50`,
        );
        return response.data.data;
      } catch (err: any) {
        console.error("Error fetching history:", err.response?.data || err);
        throw err;
      }
    },
    retry: 1, // Coba ulang sekali jika gagal
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "IN":
        return { label: "Barang Masuk", color: "bg-green-100 text-green-600" };
      case "OUT":
        return { label: "Barang Keluar", color: "bg-blue-100 text-blue-600" };
      case "ADJUSTMENT":
        return { label: "Penyesuaian", color: "bg-yellow-100 text-yellow-600" };
      case "EXPIRED":
        return { label: "Expired", color: "bg-red-100 text-red-600" };
      case "RETURN":
        return { label: "Retur", color: "bg-purple-100 text-purple-600" };
      default:
        return { label: type, color: "bg-gray-100 text-gray-600" };
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full p-6">
          <div className="flex justify-center items-center py-12">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Memuat history stok...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const errorMessage =
      (error as any).response?.data?.message || error.message;
    const isUnauthorized = (error as any).response?.status === 401;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full p-6">
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isUnauthorized ? "Akses Ditolak" : "Gagal Memuat Data"}
            </h3>
            <p className="text-gray-600 mb-4">
              {isUnauthorized
                ? "Anda harus login sebagai admin untuk melihat history stok."
                : errorMessage || "Terjadi kesalahan saat memuat history stok."}
            </p>
            <button
              onClick={onClose}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">History Stok</h2>
              <p className="text-gray-600 mt-1">{productName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((item) => {
                const type = getTypeLabel(item.type);
                return (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${type.color}`}
                      >
                        {type.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-2">
                      <div>
                        <p className="text-sm text-gray-500">Stok Sebelum</p>
                        <p className="font-semibold">{item.stockBefore}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Perubahan</p>
                        <p
                          className={`font-semibold ${item.quantity > 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {item.quantity > 0
                            ? `+${item.quantity}`
                            : item.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Stok Sesudah</p>
                        <p className="font-semibold">{item.stockAfter}</p>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Catatan:</span>{" "}
                        {item.notes}
                      </p>
                    )}

                    {item.user && (
                      <p className="text-xs text-gray-400 mt-2">
                        Oleh: {item.user.name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Belum ada history stok</p>
              <p className="text-sm text-gray-400 mt-2">
                History akan muncul saat ada pergerakan stok
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockHistoryModal;
