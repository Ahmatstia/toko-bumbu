import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  PlusIcon,
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CircleStackIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArchiveBoxIcon,
  QueueListIcon,
  Bars3BottomLeftIcon,
  Squares2X2Icon,
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

interface GroupedStockItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    minStock: number;
  };
  totalQuantity: number;
  batches: StockItem[];
  minSellingPrice: number;
  maxSellingPrice: number;
  minPurchasePrice: number;
  maxPurchasePrice: number;
  earliestExpiryDate: string | null;
}

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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch stock data
  const {
    data: inventoryData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
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

  // Manual check expired mutation
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

  const handleCheckExpired = () => {
    if (window.confirm("Yakin ingin memeriksa dan memproses stok expired secara otomatis?")) {
      checkExpiredMutation.mutate();
    }
  };

  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;
  const formatDate = (date: string | null) => date ? new Date(date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-";

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { label: "Habis", color: "bg-rose-50 text-rose-600 border-rose-100", icon: <XCircleIcon className="h-4 w-4" /> };
    if (quantity <= minStock) return { label: "Menipis", color: "bg-amber-50 text-amber-600 border-amber-100", icon: <ExclamationTriangleIcon className="h-4 w-4" /> };
    return { label: "Tersedia", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: <CheckCircleIcon className="h-4 w-4" /> };
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const stocks = inventoryData?.stocks || [];
  const backendStats = inventoryData?.stats || { safe: 0, low: 0, expiring: 0, out: 0 };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-primary-500/20 backdrop-blur-md p-2.5 rounded-2xl border border-primary-500/30">
                <CircleStackIcon className="h-7 w-7 text-primary-400" />
              </div>
              <span className="text-primary-400 font-bold uppercase tracking-[0.2em] text-xs">Inventory Intelligence</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight mb-3">Manajemen Stok</h1>
            <p className="text-slate-400 font-medium flex items-center gap-2 text-lg">
              <QueueListIcon className="h-5 w-5" />
              Pantau kesediaan dan mutasi produk Anda dalam skalaBatch
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleCheckExpired}
              disabled={checkExpiredMutation.isPending}
              className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-2xl font-bold transition-all hover:bg-white/10 flex items-center gap-3"
            >
              <ClockIcon className={`h-5 w-5 ${checkExpiredMutation.isPending ? 'animate-spin' : ''}`} />
              Cek Expired
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="group bg-primary-500 hover:bg-primary-400 text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-primary-500/20 hover:shadow-primary-500/40 hover:-translate-y-1 flex items-center gap-3"
            >
              <PlusIcon className="h-6 w-6 transition-transform group-hover:rotate-90" />
              Tambah Stok
            </button>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Analytics Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 -mt-16 mx-6 relative z-20">
        {[
          { label: "Stok Lancar", value: backendStats.safe, color: "text-emerald-600", bg: "bg-emerald-50", icon: <CheckCircleIcon /> },
          { label: "Stok Menipis", value: backendStats.low, color: "text-amber-600", bg: "bg-amber-50", icon: <ExclamationTriangleIcon /> },
          { label: "Segera Expired", value: backendStats.expiring, color: "text-rose-600", bg: "bg-rose-50", icon: <ClockIcon /> },
          { label: "Stok Habis", value: backendStats.out, color: "text-slate-600", bg: "bg-slate-100", icon: <XCircleIcon /> },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 flex items-center gap-5 transition-transform hover:scale-[1.02]">
            <div className={`h-14 w-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center p-3 shadow-inner`}>
              {React.cloneElement(stat.icon as React.ReactElement<any>, { className: "h-full w-full" })}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white p-8 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
          <div className="w-full lg:max-w-md relative group">
            <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari berdasarkan Nama, SKU, atau Batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
            />
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] gap-1 shrink-0">
             <button
               onClick={() => setViewMode("grouped")}
               className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                 viewMode === "grouped" ? "bg-white text-primary-600 shadow-md" : "text-slate-400"
               }`}
             >
               <Squares2X2Icon className="h-4 w-4" />
               Grouped
             </button>
             <button
               onClick={() => setViewMode("batch")}
               className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                 viewMode === "batch" ? "bg-white text-primary-600 shadow-md" : "text-slate-400"
               }`}
             >
               <Bars3BottomLeftIcon className="h-4 w-4" />
               Batch View
             </button>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] gap-1 self-stretch lg:self-center overflow-x-auto">
            {[
              { id: "all", label: "Semua" },
              { id: "low", label: "Menipis" },
              { id: "expiring", label: "Expiring" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-white text-primary-600 shadow-md"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setSearchTerm(""); setStatusFilter("all"); setViewMode("grouped"); }}
            className="p-4 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all border border-slate-100"
          >
            <ArrowPathIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Inventory Table Container */}
      <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-6 px-10 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Produk</th>
                <th className="py-6 px-8 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Stok Saat Ini</th>
                <th className="py-6 px-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Harga</th>
                <th className="py-6 px-8 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Masa Berlaku</th>
                <th className="py-6 px-10 text-right text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && !inventoryData ? (
                <tr><td colSpan={5} className="py-20 text-center"><div className="animate-pulse text-slate-400 font-bold">Memuat data...</div></td></tr>
              ) : stocks.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400">Gudang Kosong</td></tr>
              ) : (
                stocks.map((item: any) => {
                  if (viewMode === "grouped") {
                    const group = item as GroupedStockItem;
                    const status = getStockStatus(group.totalQuantity, group.product?.minStock || 0);
                    const isExpanded = expandedRows.has(group.id);

                    return (
                      <React.Fragment key={group.id}>
                        <tr className={`group hover:bg-slate-50 cursor-pointer transition-all ${isExpanded ? 'bg-slate-50/50' : ''}`} onClick={() => toggleRow(group.id)}>
                          <td className="py-6 px-10">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                <span className="text-[10px] font-black">{group.product?.unit}</span>
                              </div>
                              <div>
                                <p className="font-black text-slate-900 leading-none mb-1 uppercase">{group.product?.name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 font-bold">{group.product?.sku}</span>
                                  <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-md font-black uppercase">{group.batches.length} Batch</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-6 px-8 text-center">
                            <p className="text-xl font-black text-slate-900">{group.totalQuantity} <span className="text-[10px] text-slate-400 uppercase">{group.product?.unit}</span></p>
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${status.color}`}>
                              {status.label}
                            </div>
                          </td>
                          <td className="py-6 px-8">
                            <div className="text-[10px] font-bold text-slate-500 space-y-0.5">
                              <p>Jual: <span className="text-slate-900 font-black">{group.minSellingPrice === group.maxSellingPrice ? formatPrice(group.maxSellingPrice) : `${formatPrice(group.minSellingPrice)} - ${formatPrice(group.maxSellingPrice)}`}</span></p>
                              <p>Beli: <span className="text-slate-400">{group.minPurchasePrice === group.maxPurchasePrice ? formatPrice(group.maxPurchasePrice) : `${formatPrice(group.minPurchasePrice)} - ${formatPrice(group.maxPurchasePrice)}`}</span></p>
                            </div>
                          </td>
                          <td className="py-6 px-8 text-center">
                            <p className="font-black text-slate-700 text-sm">{formatDate(group.earliestExpiryDate)}</p>
                            {group.earliestExpiryDate && (
                              <p className="text-[9px] text-rose-500 font-bold uppercase mt-1">Stok Tercepat Expired</p>
                            )}
                          </td>
                          <td className="py-6 px-10 text-right">
                             <div className="flex justify-end">
                               {isExpanded ? <ChevronDownIcon className="h-5 w-5 text-primary-500" /> : <ChevronRightIcon className="h-5 w-5 text-slate-300" />}
                             </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={5} className="p-0">
                               <div className="border-x-4 border-primary-500/20 mx-10 my-4 bg-white rounded-3xl overflow-hidden shadow-inner border border-slate-100">
                                 <table className="w-full text-xs">
                                   <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
                                     <tr>
                                       <th className="py-3 px-6 text-left font-black uppercase tracking-widest">Batch Code</th>
                                       <th className="py-3 px-6 text-center font-black uppercase tracking-widest">Quantity</th>
                                       <th className="py-3 px-6 text-center font-black uppercase tracking-widest">Expiry</th>
                                       <th className="py-3 px-6 text-right font-black uppercase tracking-widest">Aksi</th>
                                     </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-50">
                                     {group.batches.map(batch => (
                                       <tr key={batch.id} className="hover:bg-primary-50/30 transition-colors">
                                         <td className="py-3 px-6 font-bold text-primary-600 uppercase tracking-tighter">{batch.batchCode || 'No Batch'}</td>
                                         <td className="py-3 px-6 text-center font-black">{batch.quantity}</td>
                                         <td className="py-3 px-6 text-center">{formatDate(batch.expiryDate)}</td>
                                         <td className="py-3 px-6 text-right">
                                           <div className="flex justify-end gap-2">
                                             <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(batch); setShowAdjustModal(true); }} className="p-2 hover:bg-sky-100 text-sky-600 rounded-xl transition-all"><ArrowPathIcon className="h-4 w-4" /></button>
                                             <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(batch); setShowHistoryModal(true); }} className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"><DocumentTextIcon className="h-4 w-4" /></button>
                                           </div>
                                         </td>
                                       </tr>
                                     ))}
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
                    const status = getStockStatus(stock.quantity, stock.product?.minStock || 0);
                    return (
                      <tr key={stock.id} className="group hover:bg-slate-50">
                        <td className="py-6 px-10">
                           <div className="flex items-center gap-4">
                             <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">{stock.product?.unit}</div>
                             <div>
                               <p className="font-black text-slate-900 leading-none mb-1 uppercase">{stock.product?.name}</p>
                               <span className="text-[10px] text-primary-500 font-bold uppercase italic">Batch: {stock.batchCode || '-'}</span>
                             </div>
                           </div>
                        </td>
                        <td className="py-6 px-8 text-center font-black text-slate-900">{stock.quantity}</td>
                        <td className="py-6 px-8 font-black text-slate-700">{formatPrice(stock.sellingPrice)}</td>
                        <td className="py-6 px-8 text-center">{formatDate(stock.expiryDate)}</td>
                        <td className="py-6 px-10 text-right">
                           <div className="flex justify-end gap-2">
                             <button onClick={() => { setSelectedProduct(stock); setShowAdjustModal(true); }} className="h-10 w-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center hover:bg-sky-600 hover:text-white transition-all"><ArrowPathIcon className="h-5 w-5" /></button>
                             <button onClick={() => { setSelectedProduct(stock); setShowHistoryModal(true); }} className="h-10 w-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"><DocumentTextIcon className="h-5 w-5" /></button>
                           </div>
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 px-10 py-6 border-t border-slate-100">
           <div className="text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-3">
              <span className="h-2 w-2 bg-primary-500 rounded-full animate-pulse"></span>
              Menampilkan <span className="text-primary-600 font-black">{stocks.length}</span> Entri {viewMode === "grouped" ? "Produk" : "Batch"}
           </div>
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
