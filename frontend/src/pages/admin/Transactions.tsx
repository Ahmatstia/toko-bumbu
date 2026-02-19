import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import toast from "react-hot-toast";

interface Transaction {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  paymentMethod: "CASH" | "TRANSFER";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
}

const Transactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showWAModal, setShowWAModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [waMessage, setWaMessage] = useState("");

  const queryClient = useQueryClient();

  // Fetch transactions
  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-transactions",
      statusFilter,
      methodFilter,
      dateFilter,
      searchTerm,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (methodFilter) params.append("paymentMethod", methodFilter);
      if (dateFilter) params.append("startDate", dateFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await api.get(`/transactions?${params.toString()}`);
      return response.data;
    },
  });

  // Update status mutation (hanya untuk PROCESSING)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.patch(`/transactions/${id}/status`, {
        status,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      setShowDetailModal(false);
      toast.success("Status transaksi berhasil diupdate");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal update status");
    },
  });

  // Confirm payment mutation (POST /transactions/:id/confirm)
  const confirmPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/transactions/${id}/confirm`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      setShowDetailModal(false);
      toast.success("Pembayaran dikonfirmasi, stok telah berkurang");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Gagal konfirmasi pembayaran",
      );
    },
  });

  // Cancel transaction mutation (POST /transactions/:id/cancel)
  const cancelTransactionMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post(`/transactions/${id}/cancel`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      setShowDetailModal(false);
      setShowCancelModal(false);
      setCancelReason("");
      toast.success("Transaksi dibatalkan");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Gagal membatalkan transaksi",
      );
    },
  });

  // Handle view detail
  const handleViewDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  // Handle WhatsApp
  const handleWhatsApp = (transaction: Transaction) => {
    const message = `Halo *${transaction.customerName}*,

Kami dari BumbuKu menerima pesanan Anda dengan invoice *${transaction.invoiceNumber}*.

Status pesanan: *${transaction.status}*
Total: Rp ${transaction.total.toLocaleString("id-ID")}

Silakan konfirmasi pembayaran Anda dengan membalas chat ini.`;

    setSelectedTransaction(transaction);
    setWaMessage(message);
    setShowWAModal(true);
  };

  // Send WhatsApp
  const sendWhatsApp = () => {
    if (!selectedTransaction?.customerPhone) {
      toast.error("No HP customer tidak tersedia");
      return;
    }

    const phone = selectedTransaction.customerPhone.startsWith("0")
      ? "62" + selectedTransaction.customerPhone.substring(1)
      : selectedTransaction.customerPhone;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, "_blank");
    setShowWAModal(false);
  };

  // Handle update status (hanya untuk PROCESSING)
  const handleUpdateStatus = (status: string) => {
    if (selectedTransaction) {
      updateStatusMutation.mutate({ id: selectedTransaction.id, status });
    }
  };

  // Format price
  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-600";
      case "PROCESSING":
        return "bg-blue-100 text-blue-600";
      case "PENDING":
        return "bg-yellow-100 text-yellow-600";
      case "CANCELLED":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const transactions = data?.data || [];
  const meta = data?.meta;

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Manajemen Transaksi
        </h1>
        <p className="text-gray-600 mt-1">
          Kelola dan verifikasi transaksi pelanggan
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari invoice/nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Semua Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Semua Metode</option>
            <option value="CASH">Tunai</option>
            <option value="TRANSFER">Transfer/QRIS</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Invoice
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Customer
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Tanggal
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Total
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Metode
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Tidak ada transaksi
                  </td>
                </tr>
              ) : (
                transactions.map((trx: Transaction) => (
                  <tr
                    key={trx.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-4 px-6 font-mono text-sm">
                      {trx.invoiceNumber}
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium">{trx.customerName}</p>
                        <p className="text-sm text-gray-500">
                          {trx.customerPhone}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {formatDate(trx.createdAt)}
                    </td>
                    <td className="py-4 px-6 font-semibold">
                      {formatPrice(trx.total)}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          trx.paymentMethod === "CASH"
                            ? "bg-green-100 text-green-600"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {trx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(trx.status)}`}
                      >
                        {trx.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetail(trx)}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => handleWhatsApp(trx)}
                          className="text-green-600 hover:text-green-700 text-sm"
                        >
                          WA
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Menampilkan {meta.page} dari {meta.totalPages} halaman
            </p>
            <div className="flex gap-2">
              <button
                disabled={meta.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={meta.page === meta.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Detail Transaksi</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Invoice</p>
                    <p className="font-mono font-semibold">
                      {selectedTransaction.invoiceNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tanggal</p>
                    <p>{formatDate(selectedTransaction.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-semibold">
                    {selectedTransaction.customerName}
                  </p>
                  <p className="text-sm">{selectedTransaction.customerPhone}</p>
                </div>

                {selectedTransaction.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Catatan</p>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">
                      {selectedTransaction.notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Metode Pembayaran</p>
                    <p>{selectedTransaction.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedTransaction.status)}`}
                    >
                      {selectedTransaction.status}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {formatPrice(selectedTransaction.total)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="font-semibold mb-3">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {/* Tombol Proses (PENDING → PROCESSING) - OPSIONAL */}
                    {selectedTransaction.paymentMethod === "TRANSFER" && (
                      <button
                        onClick={() => handleUpdateStatus("PROCESSING")}
                        disabled={
                          selectedTransaction.status !== "PENDING" ||
                          updateStatusMutation.isPending
                        }
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <ClockIcon className="h-5 w-5" />
                        Proses
                      </button>
                    )}

                    {/* Tombol Konfirmasi Pembayaran (PENDING atau PROCESSING → COMPLETED) */}
                    <button
                      onClick={() =>
                        confirmPaymentMutation.mutate(selectedTransaction.id)
                      }
                      disabled={
                        (selectedTransaction.status !== "PENDING" &&
                          selectedTransaction.status !== "PROCESSING") ||
                        confirmPaymentMutation.isPending
                      }
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {confirmPaymentMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="animate-spin h-5 w-5"
                            viewBox="0 0 24 24"
                          >
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
                        </span>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-5 w-5" />
                          Konfirmasi Pembayaran
                        </>
                      )}
                    </button>

                    {/* Tombol Batalkan */}
                    <button
                      onClick={() => {
                        setCancelReason("");
                        setShowCancelModal(true);
                      }}
                      disabled={
                        selectedTransaction.status === "COMPLETED" ||
                        selectedTransaction.status === "CANCELLED" ||
                        cancelTransactionMutation.isPending
                      }
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircleIcon className="h-5 w-5" />
                      Batalkan
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWAModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Kirim Pesan WhatsApp</h2>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Ke: {selectedTransaction.customerName} (
                  {selectedTransaction.customerPhone})
                </p>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={sendWhatsApp}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Kirim via WhatsApp
                </button>
                <button
                  onClick={() => setShowWAModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Batalkan Transaksi
              </h3>
              <p className="text-gray-600 mb-4">
                Masukkan alasan pembatalan untuk transaksi{" "}
                {selectedTransaction.invoiceNumber}
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Alasan pembatalan..."
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    if (!cancelReason.trim()) {
                      toast.error("Alasan pembatalan harus diisi");
                      return;
                    }
                    cancelTransactionMutation.mutate({
                      id: selectedTransaction.id,
                      reason: cancelReason,
                    });
                  }}
                  disabled={cancelTransactionMutation.isPending}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
                >
                  {cancelTransactionMutation.isPending
                    ? "Memproses..."
                    : "Ya, Batalkan"}
                </button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
