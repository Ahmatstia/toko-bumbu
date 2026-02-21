import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  PlusIcon,
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,

  ChevronDownIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  Bars3BottomLeftIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import toast from "react-hot-toast";
import AddStockModal from "../../components/inventory/AddStockModal";
import AdjustStockModal from "../../components/inventory/AdjustStockModal";
import StockHistoryModal from "../../components/inventory/StockHistoryModal";

interface StockItem {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string; unit: string; minStock: number };
  quantity: number;
  batchCode: string | null;
  expiryDate: string | null;
  purchasePrice: number;
  sellingPrice: number;
  isActive: boolean;
}

interface GroupedStockItem {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string; unit: string; minStock: number };
  totalQuantity: number;
  batches: StockItem[];
  minSellingPrice: number;
  maxSellingPrice: number;
  minPurchasePrice: number;
  maxPurchasePrice: number;
  earliestExpiryDate: string | null;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const isExpired = (dateStr: string | null) => {
  if (!dateStr) return false;
  return new Date(dateStr) < today;
};

const isExpiringSoon = (dateStr: string | null, days = 30) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  return d >= today && d <= threshold;
};

const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "low" | "expiring">("all");
  const [viewMode, setViewMode] = useState<"grouped" | "batch">("grouped");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ["inventory", debouncedSearch, statusFilter, viewMode],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter === "low") params.append("lowStock", "true");
      if (statusFilter === "expiring") params.append("expiringSoon", "true");
      if (viewMode === "grouped") params.append("grouped", "true");
      const response = await api.get(`/inventory/stock?${params.toString()}`);
      return response.data;
    },
  });

  const checkExpiredMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/inventory/check-expired");
      return response.data;
    },
    onSuccess: (data) => {
      refetch();
      toast.success(`${data.processed} stok expired telah diproses`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal memproses stok expired");
    },
  });

  const formatPrice = (price: number) => `Rp ${price?.toLocaleString("id-ID") ?? 0}`;
  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const getExpiryBadge = (dateStr: string | null) => {
    if (!dateStr) return null;
    if (isExpired(dateStr))
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">⚠ Expired</span>;
    if (isExpiringSoon(dateStr))
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">⏱ Segera Expired</span>;
    return null;
  };

  const getStockBadge = (qty: number, minStock: number) => {
    if (qty === 0) return <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">Habis</span>;
    if (qty <= minStock) return <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Menipis</span>;
    return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Tersedia</span>;
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const stocks = inventoryData?.stocks || [];
  const stats = inventoryData?.stats || { safe: 0, low: 0, expired: 0, expiring: 0, out: 0 };

  const statCards = [
    { label: "Lancar", value: stats.safe, color: "text-emerald-600", dot: "bg-emerald-400" },
    { label: "Menipis", value: stats.low, color: "text-amber-600", dot: "bg-amber-400" },
    { label: "Segera Expired", value: stats.expiring, color: "text-orange-600", dot: "bg-orange-400" },
    { label: "Sudah Expired", value: stats.expired, color: "text-red-600", dot: "bg-red-400" },
    { label: "Stok Habis", value: stats.out, color: "text-slate-500", dot: "bg-slate-300" },
  ];

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Stok</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pantau stok, batch, dan masa kadaluarsa produk.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (window.confirm("Proses semua stok expired secara otomatis?")) checkExpiredMutation.mutate();
            }}
            disabled={checkExpiredMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <ClockIcon className={`h-4 w-4 ${checkExpiredMutation.isPending ? "animate-spin" : ""}`} />
            Proses Expired
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
          >
            <PlusIcon className="h-4 w-4" />
            Tambah Stok
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari produk, SKU, atau batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
          />
        </div>

        {/* View toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
          {([["grouped", <Squares2X2Icon className="h-4 w-4" />, "Produk"], ["batch", <Bars3BottomLeftIcon className="h-4 w-4" />, "Batch"]] as const).map(([mode, icon, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === mode ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
          {([["all", "Semua"], ["low", "Menipis"], ["expiring", "Akan Expired"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setStatusFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${statusFilter === id ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setSearchTerm(""); setStatusFilter("all"); setViewMode("grouped"); }}
          className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          title="Reset filter"
        >
          <ArrowPathIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-3 px-5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Produk</th>
                <th className="py-3 px-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stok Valid</th>
                <th className="py-3 px-5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Harga Jual</th>
                <th className="py-3 px-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Terdekat Expired</th>
                <th className="py-3 px-5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && !inventoryData ? (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : stocks.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-slate-400">Tidak ada data stok ditemukan.</td></tr>
              ) : stocks.map((item: any) => {
                if (viewMode === "grouped") {
                  const g = item as GroupedStockItem;
                  const isOpen = expandedRows.has(g.id);
                  const hasExpiredBatch = g.batches.some(b => isExpired(b.expiryDate));
                  return (
                    <React.Fragment key={g.id}>
                      <tr
                        className={`cursor-pointer hover:bg-slate-50 transition-colors ${isOpen ? "bg-slate-50/60" : ""} ${hasExpiredBatch ? "border-l-2 border-red-300" : ""}`}
                        onClick={() => toggleRow(g.id)}
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{g.product?.unit}</div>
                            <div>
                              <p className="font-semibold text-slate-900 leading-snug">{g.product?.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400">{g.product?.sku}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{g.batches.length} batch</span>
                                {hasExpiredBatch && <span className="text-[10px] text-red-500 font-bold">Ada batch expired!</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <p className="font-bold text-slate-900">{g.totalQuantity} <span className="text-[10px] font-normal text-slate-400">{g.product?.unit}</span></p>
                          <div className="mt-1">{getStockBadge(g.totalQuantity, g.product?.minStock || 0)}</div>
                        </td>
                        <td className="py-4 px-5 text-slate-700 font-medium">
                          {g.minSellingPrice === g.maxSellingPrice
                            ? formatPrice(g.maxSellingPrice)
                            : `${formatPrice(g.minSellingPrice)} – ${formatPrice(g.maxSellingPrice)}`}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <p className="text-slate-700 font-medium">{formatDate(g.earliestExpiryDate)}</p>
                          <div className="mt-1">{getExpiryBadge(g.earliestExpiryDate)}</div>
                        </td>
                        <td className="py-4 px-5 text-right">
                          {isOpen
                            ? <ChevronDownIcon className="h-4 w-4 text-primary-500 ml-auto" />
                            : <ChevronRightIcon className="h-4 w-4 text-slate-300 ml-auto" />}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={5} className="px-8 py-3">
                            <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                  <tr>
                                    <th className="py-2.5 px-4 text-left font-bold text-slate-400 uppercase tracking-wider">Batch Code</th>
                                    <th className="py-2.5 px-4 text-center font-bold text-slate-400 uppercase tracking-wider">Qty</th>
                                    <th className="py-2.5 px-4 text-center font-bold text-slate-400 uppercase tracking-wider">Tgl Expired</th>
                                    <th className="py-2.5 px-4 text-center font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="py-2.5 px-4 text-right font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {g.batches.map((batch) => {
                                    const expired = isExpired(batch.expiryDate);
                                    return (
                                      <tr key={batch.id} className={`${expired ? "bg-red-50/40" : "hover:bg-slate-50"} transition-colors`}>
                                        <td className={`py-2.5 px-4 font-mono font-bold ${expired ? "text-red-500" : "text-primary-600"}`}>{batch.batchCode || "—"}</td>
                                        <td className={`py-2.5 px-4 text-center font-bold ${expired ? "text-red-500 line-through" : "text-slate-800"}`}>{batch.quantity}</td>
                                        <td className={`py-2.5 px-4 text-center ${expired ? "text-red-500 font-semibold" : "text-slate-600"}`}>{formatDate(batch.expiryDate)}</td>
                                        <td className="py-2.5 px-4 text-center">
                                          {expired
                                            ? <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">⚠ Expired</span>
                                            : isExpiringSoon(batch.expiryDate)
                                              ? <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">⏱ Segera</span>
                                              : batch.expiryDate
                                                ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">✓ OK</span>
                                                : <span className="text-[10px] text-slate-400">Tanpa Exp</span>}
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                          <div className="flex justify-end gap-1.5">
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(batch); setShowAdjustModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><ArrowPathIcon className="h-3.5 w-3.5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(batch); setShowHistoryModal(true); }} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"><DocumentTextIcon className="h-3.5 w-3.5" /></button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                } else {
                  const stock = item as StockItem;
                  const expired = isExpired(stock.expiryDate);
                  return (
                    <tr key={stock.id} className={`hover:bg-slate-50 transition-colors ${expired ? "border-l-2 border-red-300" : ""}`}>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{stock.product?.unit}</div>
                          <div>
                            <p className="font-semibold text-slate-900">{stock.product?.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">Batch: {stock.batchCode || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`font-bold ${expired ? "text-red-500 line-through" : "text-slate-900"}`}>{stock.quantity}</span>
                        <div className="mt-1">{getStockBadge(stock.quantity, stock.product?.minStock || 0)}</div>
                      </td>
                      <td className="py-4 px-5 font-medium text-slate-700">{formatPrice(stock.sellingPrice)}</td>
                      <td className="py-4 px-5 text-center">
                        <p className={`font-medium ${expired ? "text-red-500" : "text-slate-700"}`}>{formatDate(stock.expiryDate)}</p>
                        <div className="mt-1">{getExpiryBadge(stock.expiryDate)}</div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => { setSelectedProduct(stock); setShowAdjustModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><ArrowPathIcon className="h-4 w-4" /></button>
                          <button onClick={() => { setSelectedProduct(stock); setShowHistoryModal(true); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"><DocumentTextIcon className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[11px] text-slate-400 font-medium">
            Menampilkan <span className="text-slate-700 font-bold">{stocks.length}</span> {viewMode === "grouped" ? "produk" : "batch"}
          </p>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && <AddStockModal onClose={() => setShowAddModal(false)} onSuccess={() => { refetch(); setShowAddModal(false); }} />}
      {showAdjustModal && selectedProduct && <AdjustStockModal stock={selectedProduct} onClose={() => { setSelectedProduct(null); setShowAdjustModal(false); }} onSuccess={() => { refetch(); setSelectedProduct(null); setShowAdjustModal(false); }} />}
      {showHistoryModal && selectedProduct && <StockHistoryModal productId={selectedProduct.productId} productName={selectedProduct.product?.name ?? "Produk"} onClose={() => { setSelectedProduct(null); setShowHistoryModal(false); }} />}
    </div>
  );
};

export default Inventory;
