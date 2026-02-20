// frontend/src/pages/admin/Transactions.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import toast from "react-hot-toast";

interface TransactionItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: {
    name: string;
    unit: string;
  };
}

interface Transaction {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: "CASH" | "TRANSFER";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  notes: string | null;
  createdAt: string;
  orderType: "ONLINE" | "OFFLINE";
  items: TransactionItem[];
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TransactionsResponse {
  data: Transaction[];
  meta: Meta;
}

const Transactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("");

  // Infinite scroll states
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalData, setTotalData] = useState(0);

  const observer = useRef<IntersectionObserver | null>(null);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showWAModal, setShowWAModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [waMessage, setWaMessage] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when filters change
  useEffect(() => {
    setAllTransactions([]);
    setPage(1);
    setHasMore(true);
  }, [
    statusFilter,
    methodFilter,
    dateFilter,
    debouncedSearch,
    orderTypeFilter,
  ]);

  // Fetch transactions with current page
  const {
    data,
    isLoading: initialLoading,
    refetch,
  } = useQuery<TransactionsResponse>({
    queryKey: [
      "admin-transactions",
      statusFilter,
      methodFilter,
      dateFilter,
      debouncedSearch,
      orderTypeFilter,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (methodFilter) params.append("paymentMethod", methodFilter);
      if (dateFilter) params.append("startDate", dateFilter);
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (orderTypeFilter) params.append("orderType", orderTypeFilter);
      params.append("page", page.toString());
      params.append("limit", "20");

      const response = await api.get(`/transactions?${params.toString()}`);
      return response.data;
    },
  });

  // Handle data changes
  useEffect(() => {
    if (data) {
      if (page === 1) {
        setAllTransactions(data.data || []);
      } else {
        setAllTransactions((prev) => {
          const newData = [...prev, ...(data.data || [])];
          return newData;
        });
      }

      setTotalData(data.meta?.total || 0);
      setHasMore(page < data.meta?.totalPages);
    }
  }, [data, page]);

  // Load more transactions (infinite scroll)
  const loadMoreTransactions = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, [isLoadingMore, hasMore]);

  const lastTransactionRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreTransactions();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore, loadMoreTransactions],
  );

  // Reset to page 1 when refetch is called
  const handleRefetch = useCallback(() => {
    setPage(1);
    setAllTransactions([]);
    setHasMore(true);
    refetch();
  }, [refetch]);

  // Confirm payment mutation (POST /transactions/:id/confirm)
  const confirmPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/transactions/${id}/confirm`);
      return response.data;
    },
    onSuccess: () => {
      handleRefetch();
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
      handleRefetch();
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

  // Handle filter change
  const handleStatusFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setStatusFilter(e.target.value);
  };

  const handleMethodFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setMethodFilter(e.target.value);
  };

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value);
  };

  // Handle search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("");
    setMethodFilter("");
    setDateFilter("");
    setOrderTypeFilter("");
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

  const isLoading =
    initialLoading && page === 1 && allTransactions.length === 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight">Manajemen Transaksi</h1>
            <p className="text-slate-300 mt-2 text-lg">Kelola dan verifikasi transaksi pelanggan dengan presisi</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 min-w-[140px] text-center">
              <p className="text-xs font-semibold text-primary-300 uppercase tracking-wider">Total Data</p>
              <p className="text-3xl font-black mt-1">{totalData.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 min-w-[140px] text-center">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Berhasil</p>
              <p className="text-3xl font-black mt-1">
                {allTransactions.filter(t => t.status === "COMPLETED").length}+
              </p>
            </div>
          </div>
        </div>
        
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Modern Filter Section */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white p-6 relative z-20 -mt-12 mx-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari invoice/pelanggan..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
            />
          </div>

          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl appearance-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">🕒 Pending</option>
              <option value="PROCESSING">⚙️ Processing</option>
              <option value="COMPLETED">✅ Completed</option>
              <option value="CANCELLED">❌ Cancelled</option>
              <option value="EXPIRED">⌛ Expired</option>
            </select>
          </div>

          <select
            value={methodFilter}
            onChange={handleMethodFilterChange}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl appearance-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
          >
            <option value="">Semua Metode</option>
            <option value="CASH">💵 Tunai</option>
            <option value="TRANSFER">💳 Transfer/QRIS</option>
          </select>

          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl appearance-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
          >
            <option value="">Semua Tipe</option>
            <option value="OFFLINE">🏬 Kasir</option>
            <option value="ONLINE">📱 Online</option>
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={handleDateFilterChange}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
            />
            {(statusFilter || methodFilter || dateFilter || searchTerm || orderTypeFilter) && (
              <button
                onClick={handleClearFilters}
                className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors"
                title="Hapus Filter"
              >
                <ArrowPathIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table Container */}
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden mx-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-5 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Invoice & Pelanggan</th>
                <th className="py-5 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Waktu</th>
                <th className="py-5 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Nominal</th>
                <th className="py-5 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Metode & Tipe</th>
                <th className="py-5 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Status</th>
                <th className="py-5 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allTransactions.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <ShoppingCartIcon className="h-16 w-16 mb-4 opacity-20" />
                      <p className="text-xl font-medium">Belum ada transaksi ditemukan</p>
                      <p className="text-sm mt-1">Coba sesuaikan filter atau pencarian Anda</p>
                    </div>
                  </td>
                </tr>
              ) : (
                allTransactions.map((trx, index) => {
                  const isLast = allTransactions.length === index + 1;
                  return (
                    <tr 
                      key={trx.id} 
                      ref={isLast ? (lastTransactionRef as any) : null}
                      className="group hover:bg-primary-50/30 transition-all duration-300"
                    >
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-bold ${
                            trx.orderType === "ONLINE" ? "bg-violet-100 text-violet-600" : "bg-orange-100 text-orange-600"
                          }`}>
                            {trx.orderType === "ONLINE" ? "📱" : "🏬"}
                          </div>
                          <div>
                            <p className="font-mono text-sm font-bold text-slate-900">{trx.invoiceNumber}</p>
                            <p className="text-sm font-semibold text-slate-600">{trx.customerName}</p>
                            <p className="text-xs text-slate-400">{trx.customerPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{new Date(trx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                          <span className="text-xs text-slate-400">{new Date(trx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right whitespace-nowrap">
                        <p className="text-lg font-black text-slate-900">{formatPrice(trx.total)}</p>
                        {trx.discount > 0 && <p className="text-[10px] text-rose-500 font-bold">Disc: -{formatPrice(trx.discount)}</p>}
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            trx.paymentMethod === "CASH" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {trx.paymentMethod}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium italic">
                            {trx.orderType === "ONLINE" ? "Via Website" : "Kasir Langsung"}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold leading-none ring-1 ring-inset ${
                          trx.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" :
                          trx.status === "PENDING" ? "bg-amber-50 text-amber-700 ring-amber-600/20" :
                          trx.status === "PROCESSING" ? "bg-sky-50 text-sky-700 ring-sky-600/20" :
                          "bg-rose-50 text-rose-700 ring-rose-600/20"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                            trx.status === "COMPLETED" ? "bg-emerald-500" :
                            trx.status === "PENDING" ? "bg-amber-500" :
                            trx.status === "PROCESSING" ? "bg-sky-500" : "bg-rose-500"
                          }`} />
                          {trx.status}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewDetail(trx)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-primary-600 hover:text-white transition-all shadow-sm"
                            title="Detail Transaksi"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleWhatsApp(trx)}
                            className="p-2 bg-slate-100 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Kirim Struk WhatsApp"
                          >
                            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.434h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
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

        {/* Infinite Scroll Support */}
        {isLoadingMore && (
          <div className="py-8 flex justify-center">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:-.3s]" />
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:-.5s]" />
            </div>
          </div>
        )}

        {!hasMore && allTransactions.length > 0 && (
          <div className="py-8 text-center bg-slate-50/30">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">— Akhir Dari Data —</p>
          </div>
        )}
      </div>

      {/* Detail Modal Overhaul (Invoice Style) */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-8 text-white relative">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">Bumbuku Official</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedTransaction.status === "COMPLETED" ? "bg-emerald-400 text-emerald-900" : "bg-amber-400 text-amber-900"
                    }`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black">{selectedTransaction.invoiceNumber}</h2>
                  <p className="text-primary-100 font-medium">Dipesan pada {formatDate(selectedTransaction.createdAt)}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-2xl transition-all">
                  <XCircleIcon className="h-8 w-8 text-white/50 hover:text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Customer & Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Informasi Pelanggan</h3>
                  <p className="text-xl font-black text-slate-900">{selectedTransaction.customerName}</p>
                  <p className="text-slate-600 font-medium">{selectedTransaction.customerPhone}</p>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Tipe Pesanan</span>
                    <span className="font-bold text-slate-700">{selectedTransaction.orderType === "ONLINE" ? "📱 Online" : "🏬 Kasir Langsung"}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Pembayaran</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Metode</span>
                      <span className="font-bold text-slate-900 text-lg uppercase">{selectedTransaction.paymentMethod}</span>
                    </div>
                    {selectedTransaction.notes && (
                      <div className="pt-4 border-t border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Catatan</span>
                        <p className="text-sm text-slate-600 italic">"{selectedTransaction.notes}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table - BUG FIX: Displaying Actual Items */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Daftar Produk</h3>
                <div className="bg-white border-2 border-slate-50 rounded-[2rem] overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
                        <th className="py-4 px-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                        <th className="py-4 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga</th>
                        <th className="py-4 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedTransaction.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-4 px-6">
                            <p className="font-black text-slate-900 text-sm">{item.product?.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">SKU-{item.productId.substring(0, 8)}</p>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-black">{item.quantity}</span>
                          </td>
                          <td className="py-4 px-6 text-right text-sm font-semibold text-slate-600">{formatPrice(item.price)}</td>
                          <td className="py-4 px-6 text-right text-sm font-black text-slate-900">{formatPrice(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/50">
                      <tr>
                        <td colSpan={3} className="py-4 px-6 text-right text-xs font-bold text-slate-500">Subtotal</td>
                        <td className="py-4 px-6 text-right text-sm font-black text-slate-900">{formatPrice(selectedTransaction.subtotal)}</td>
                      </tr>
                      {selectedTransaction.discount > 0 && (
                        <tr>
                          <td colSpan={3} className="py-2 px-6 text-right text-xs font-bold text-rose-500">Diskon</td>
                          <td className="py-2 px-6 text-right text-sm font-black text-rose-600">-{formatPrice(selectedTransaction.discount)}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={3} className="py-6 px-6 text-right text-lg font-black text-slate-900 underline decoration-primary-500/30 decoration-4">Total Akhir</td>
                        <td className="py-6 px-6 text-right text-2xl font-black text-primary-600">{formatPrice(selectedTransaction.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Advanced Controls */}
              <div className="pt-8 border-t border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex flex-wrap gap-3">
                    {/* Status Logic Handling */}
                    {(selectedTransaction.status === "PENDING" || selectedTransaction.status === "PROCESSING") && (
                      <>
                        <button
                          onClick={() => confirmPaymentMutation.mutate(selectedTransaction.id)}
                          disabled={confirmPaymentMutation.isPending}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 group disabled:opacity-50"
                        >
                          <CheckCircleIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                          {confirmPaymentMutation.isPending ? "Mengkonfirmasi..." : "Konfirmasi & Kurangi Stok"}
                        </button>

                        <button
                          onClick={() => {
                            setCancelReason("");
                            setShowCancelModal(true);
                          }}
                          className="px-6 py-3 bg-white text-rose-600 border-2 border-rose-100 rounded-2xl font-black text-sm hover:bg-rose-50 transition-all flex items-center gap-2"
                        >
                          <XCircleIcon className="h-5 w-5" />
                          Batalkan Pesanan
                        </button>
                      </>
                    )}
                  </div>
                  
                  <div className="flex gap-4">
                    <button onClick={() => handleWhatsApp(selectedTransaction)} className="text-emerald-500 font-bold text-sm hover:underline">Kirim Struk WA</button>
                    <div className="h-4 w-[2px] bg-slate-100" />
                    <button className="text-slate-400 font-bold text-sm hover:underline">Cetak PDF</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern WhatsApp Modal */}
      {showWAModal && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in zoom-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-[#25D366] p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                   <svg className="h-10 w-10 text-[#25D366] fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.434h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black">Kirim Struk Digital</h3>
                  <p className="opacity-90 font-medium">WhatsApp Customer Care</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase mb-1">Kepada Pelanggan</p>
                <p className="font-bold text-slate-900">{selectedTransaction.customerName} ({selectedTransaction.customerPhone})</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase ml-1">Detail Pesan</p>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={6}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-[#25D366]/10 focus:border-[#25D366] transition-all outline-none resize-none font-medium text-slate-700"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={sendWhatsApp}
                  className="flex-1 bg-[#25D366] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#1da851] transition-all shadow-xl shadow-[#25D366]/20 flex items-center justify-center gap-2"
                >
                  Buka WhatsApp
                </button>
                <button
                  onClick={() => setShowWAModal(false)}
                  className="px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all font-semibold"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Cancel Modal */}
      {showCancelModal && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-rose-100">
            <div className="bg-rose-50 p-8 text-center">
              <div className="h-20 w-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <XCircleIcon className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Batalkan Pesanan?</h3>
              <p className="text-slate-500 font-medium mt-2">Tindakan ini tidak dapat dibatalkan untuk invoice <span className="text-rose-600 font-bold">{selectedTransaction.invoiceNumber}</span></p>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase ml-1">Alasan Pembatalan <span className="text-rose-500">*</span></p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none resize-none"
                  placeholder="Contoh: Stok tidak cukup atau pelanggan berubah pikiran..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (!cancelReason.trim()) {
                      toast.error("Alasan pembatalan wajib diisi");
                      return;
                    }
                    cancelTransactionMutation.mutate({
                      id: selectedTransaction.id,
                      reason: cancelReason,
                    });
                  }}
                  disabled={cancelTransactionMutation.isPending}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-black hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 active:scale-95 disabled:opacity-50"
                >
                  {cancelTransactionMutation.isPending ? "Membatalkan..." : "Ya, Batalkan"}
                </button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                  }}
                  className="px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all font-semibold"
                >
                  Keluar
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
