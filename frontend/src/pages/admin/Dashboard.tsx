import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CubeIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../../services/api";

// ========== INTERFACES ==========
interface DashboardStats {
  todaySales: {
    total: number;
    count: number;
    average: number;
  };
  weeklySales: {
    date: string;
    total: number;
  }[];
  monthlySales: {
    week: string;
    total: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    sold: number;
    revenue: number;
    image: string | null;
  }[];
  lowStock: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    product: {
      name: string;
      minStock: number;
      unit: string;
    };
  }[];
  expiringSoon: {
    id: string;
    batchCode: string;
    quantity: number;
    expiryDate: string;
    product: {
      name: string;
    };
  }[];
  recentTransactions: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    total: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
  }[];
  paymentMethods: {
    method: string;
    count: number;
    total: number;
  }[];
  summary: {
    totalProducts: number;
    totalCustomers: number;
    totalTransactions: number;
    totalSales: number;
    totalRevenue: number;
    pendingTransactions: number;
  };
}

// ========== COLOR CONSTANTS ==========
const COLORS = [
  "#0ea5e9", // Sky 500
  "#10b981", // Emerald 500
  "#f59e0b", // Amber 500
  "#8b5cf6", // Violet 500
  "#ef4444", // Red 500
  "#f97316", // Orange 500
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  PROCESSING: "bg-sky-50 text-sky-700 border-sky-100",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-100",
};

// ========== MAIN COMPONENT ==========
const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");
  const [greeting, setGreeting] = useState("");

  // Greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) setGreeting("Selamat Pagi");
    else if (hour < 15) setGreeting("Selamat Siang");
    else if (hour < 19) setGreeting("Selamat Sore");
    else setGreeting("Selamat Malam");
  }, []);

  const {
    data: stats,
    isLoading,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const response = await api.get("/admin/dashboard-stats");
      return response.data;
    },
    refetchInterval: 60000,
  });

  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return date;
    }
  };

  const formatShortDate = (date: string) => {
    try {
      const d = new Date(date);
      return `${d.getDate()} ${d.toLocaleDateString("id-ID", { month: "short" })}`;
    } catch {
      return date;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 animate-pulse font-medium">Menyeimbangkan data...</p>
        </div>
      </div>
    );
  }

  const salesData = (timeRange === "week" ? stats?.weeklySales : stats?.monthlySales) || [];
  const paymentData = stats?.paymentMethods || [];



  return (
    <div className="space-y-10 pb-16 px-4 md:px-8 max-w-[1600px] mx-auto">
      {/* ========== MINIMALIST HERO HEADER ========== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            {greeting}, Owner <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium max-w-2xl">
            Pantau performa bisnis bumbu Anda secara real-time dari satu dashboard terpadu.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setTimeRange("week")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                timeRange === "week"
                  ? "bg-white text-sky-600 shadow-md shadow-sky-100"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              7 HARI
            </button>
            <button
              onClick={() => setTimeRange("month")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                timeRange === "month"
                  ? "bg-white text-sky-600 shadow-md shadow-sky-100"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              BULANAN
            </button>
          </div>
          
          <button
            onClick={() => refetch()}
            className="p-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl shadow-sm transition-all active:scale-95 group"
            title="Refresh Data"
          >
            <ArrowPathIcon className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* ========== SMART STATS CARDS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Card 1: Omzet Hari Ini */}
        <div className="relative group bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 hover:border-sky-200 hover:shadow-2xl hover:shadow-sky-500/5 transition-all duration-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.15em] mb-2">Penjualan Hari Ini</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                {formatPrice(stats?.todaySales.total)}
              </h3>
            </div>
            <div className="bg-sky-50 text-sky-600 rounded-2xl p-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <CurrencyDollarIcon className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="bg-sky-500 text-white text-[11px] px-2.5 py-1 rounded-lg font-black shadow-lg shadow-sky-200">
              {stats?.todaySales.count || 0} TRX
            </span>
            <p className="text-xs text-slate-500 font-bold">
              Avg: <span className="text-slate-900">{formatPrice(stats?.todaySales.average)}</span>
            </p>
          </div>
        </div>

        {/* Card 2: Katalog Produk */}
        <div className="relative group bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.15em] mb-2">Katalog Produk</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                {stats?.summary.totalProducts || 0}
              </h3>
            </div>
            <div className="bg-indigo-50 text-indigo-600 rounded-2xl p-4 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
              <CubeIcon className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className={`text-[11px] px-2.5 py-1 rounded-lg font-black ${stats?.lowStock?.length ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-900 text-white shadow-lg shadow-slate-200'}`}>
              {stats?.lowStock?.length || 0} STOK KRITIS
            </span>
            <p className="text-xs text-slate-500 font-bold tracking-tight">Monitoring Inventaris</p>
          </div>
        </div>

        {/* Card 3: New Entities (Customers) */}
        <div className="relative group bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.15em] mb-2">Total Pelanggan</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                {stats?.summary.totalCustomers || 0}
              </h3>
            </div>
            <div className="bg-emerald-50 text-emerald-600 rounded-2xl p-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <UserGroupIcon className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="bg-emerald-500 text-white text-[11px] px-2.5 py-1 rounded-lg font-black shadow-lg shadow-emerald-200">
              LOYAL GROUP
            </span>
            <p className="text-xs text-slate-500 font-bold">Database Aktif</p>
          </div>
        </div>

        {/* Card 4: Total Revenue (VALIDATED) */}
        <div className="relative group bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 hover:border-violet-200 hover:shadow-2xl hover:shadow-violet-500/5 transition-all duration-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.15em] mb-2">Total Omzet</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                {formatPrice(Number(stats?.summary.totalSales))}
              </h3>
            </div>
            <div className="bg-violet-50 text-violet-600 rounded-2xl p-4 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
              <ArrowTrendingUpIcon className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="bg-violet-500 text-white text-[11px] px-2.5 py-1 rounded-lg font-black shadow-lg shadow-violet-200">
              VALIDATED DATA
            </span>
            <p className="text-xs text-slate-500 font-bold">Berdasarkan Filter</p>
          </div>
        </div>
      </div>

      {/* ========== ANALYTICS RADAR ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 group">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Performa Penjualan</h2>
              <p className="text-sm text-slate-400 font-medium mt-1">Struktur pemasukan periode {timeRange === 'week' ? '7 Hari' : '1 Bulan'} terakhir</p>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey={timeRange === "week" ? "date" : "week"}
                  tickFormatter={(value: any) => formatShortDate(String(value))}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }}
                  dy={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }}
                  tickFormatter={(value: any) => value >= 1000000 ? `${(value/1000000).toFixed(1)}jt` : `${value/1000}rb`}
                />
                <Tooltip
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                  contentStyle={{
                    borderRadius: "20px",
                    border: "none",
                    boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.15)",
                    padding: "16px",
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(8px)",
                  }}
                  itemStyle={{ fontWeight: "900", color: "#0ea5e9", textTransform: "uppercase", fontSize: "12px" }}
                  labelStyle={{ fontWeight: "900", marginBottom: "8px", color: "#0f172a", fontSize: "14px" }}
                  formatter={(value: any) => [formatPrice(Number(value))]}
                  labelFormatter={(label: any) => `Periode: ${formatDate(label).split(',')[0]}`}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#0ea5e9"
                  strokeWidth={5}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Logic Chart */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment Channel</h2>
            <p className="text-sm text-slate-400 font-medium mt-1">Preferensi pelanggan</p>
          </div>
          {paymentData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={100}
                      paddingAngle={10}
                      dataKey="count"
                      stroke="none"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full mt-10 grid grid-cols-1 gap-3">
                {paymentData.map((item, index) => (
                  <div key={item.method} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/50">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-4 h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm font-black text-slate-600 uppercase tracking-tighter">
                        {item.method}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{item.count} TRX</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20">
              <p className="text-slate-300 font-black italic">No Payment Data</p>
            </div>
          )}
        </div>
      </div>

      {/* ========== OPERATIONAL GRID ========== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Top Products Refined */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 overflow-hidden">
          <div className="p-10 pb-6 flex justify-between items-baseline">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Best Sellers 🌟</h2>
              <p className="text-sm text-slate-400 font-medium">Top 5 produk berdasarkan volume</p>
            </div>
            <Link to="/admin/products" className="text-sky-600 text-xs font-black uppercase tracking-widest hover:underline">
              View All
            </Link>
          </div>
          <div className="px-10 pb-10 space-y-3">
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              stats.topProducts.map((product, index) => (
                <div key={product.id} className="group flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100/50 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                      index === 0 ? 'bg-amber-100 text-amber-600' : 
                      index === 1 ? 'bg-slate-200 text-slate-600' :
                      index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 text-lg tracking-tight group-hover:text-sky-600 transition-colors uppercase">{product.name}</p>
                      <p className="text-xs font-black text-slate-400 mt-0.5 tracking-widest">{product.sold} UNITS SOLD</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">{formatPrice(Number(product.revenue))}</p>
                    <div className="h-1.5 w-32 bg-slate-200 rounded-full mt-2 overflow-hidden ml-auto">
                      <div className="h-full bg-sky-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (product.sold / (stats.topProducts?.[0]?.sold || 1)) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center">
                <p className="text-slate-300 font-black italic">Belum ada data produk</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Ledger Placeholder or Status */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 p-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sinyal Logistik 🏗️</h2>
          <p className="text-sm text-slate-400 font-medium mt-1">Status stok & kadaluarsa batch</p>
          <div className="mt-8 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Stok Menipis</span>
                <span className="text-xs font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full">{stats?.lowStock?.length || 0} Item</span>
              </div>
              <div className="space-y-2">
                {stats?.lowStock?.slice(0, 2).map(item => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">{item.name}</span>
                    <span className="text-xs font-black text-rose-600">{item.quantity} Unit</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Akan Kadaluarsa</span>
                <span className="text-xs font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-full">{stats?.expiringSoon?.length || 0} Batch</span>
              </div>
              <div className="space-y-2">
                {stats?.expiringSoon?.slice(0, 2).map(item => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">{item.product?.name}</span>
                    <span className="text-xs font-black text-amber-600">{new Date(item.expiryDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Link to="/admin/inventory" className="mt-8 block py-4 bg-slate-900 text-white rounded-2xl text-center text-xs font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
            KONTROL LOGISTIK PENUH
          </Link>
        </div>
      </div>

      {/* ========== RECENT TRANSACTIONS TABLE (PREMIUM LEDGER) ========== */}
      <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 overflow-hidden group">
        <div className="p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Financial Ledger</h2>
            <p className="text-sm text-slate-400 font-medium mt-1">Status arus kas waktu nyata (Live Update)</p>
          </div>
          <Link to="/admin/transactions" className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95">
            Full Transaction History
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-100/50">
                <th className="text-left py-6 px-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Invoice No</th>
                <th className="text-left py-6 px-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Entitas Customer</th>
                <th className="text-left py-6 px-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="text-right py-6 px-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Nilai Transaksi</th>
                <th className="text-center py-6 px-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Metode</th>
                <th className="text-center py-6 px-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="text-center py-6 px-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                stats.recentTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-7 px-10">
                      <span className="font-mono text-xs font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100/50">
                        {trx.invoiceNumber}
                      </span>
                    </td>
                    <td className="py-7 px-10 font-extrabold text-slate-800 text-sm tracking-tight">{trx.customerName}</td>
                    <td className="py-7 px-10 text-xs font-bold text-slate-500 uppercase tracking-tighter">{formatDate(trx.createdAt)}</td>
                    <td className="py-7 px-10 text-right font-black text-slate-900 text-base">{formatPrice(Number(trx.total))}</td>
                    <td className="py-7 px-10 text-center">
                      <span className="text-[10px] font-black text-slate-500 border border-slate-200 px-4 py-1.5 rounded-full bg-white shadow-sm">
                        {trx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-7 px-10 text-center">
                      <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${STATUS_COLORS[trx.status] || "bg-slate-50 text-slate-400 border-slate-100"}`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="py-7 px-10 text-center">
                      <Link
                        to={`/admin/transactions`}
                        className="inline-flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:border-sky-500 hover:text-sky-500 rounded-xl transition-all shadow-sm"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-24">
                    <p className="text-slate-300 font-black italic text-lg">Hening... Belum ada transaksi masuk.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== PREMIUM QUICK ACTIONS ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        <Link
          to="/admin/pos"
          className="group relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-slate-200 hover:-translate-y-2 transition-all duration-500"
        >
          <div className="relative z-10">
            <ShoppingCartIcon className="h-12 w-12 mb-6 text-emerald-400 group-hover:scale-110 transition-transform duration-500" />
            <p className="font-black text-xl tracking-tight uppercase">Kasir Pintar</p>
            <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">POS System</p>
          </div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
        </Link>

        <Link
          to="/admin/products"
          className="group relative overflow-hidden bg-white border border-slate-100 rounded-[2rem] p-8 text-slate-900 shadow-xl shadow-slate-100 hover:-translate-y-2 transition-all duration-500"
        >
          <div className="relative z-10">
            <PlusIcon className="h-12 w-12 mb-6 text-sky-500 group-hover:scale-110 transition-transform duration-500" />
            <p className="font-black text-xl tracking-tight uppercase">Kelola Produk</p>
            <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">Katalog & Stok</p>
          </div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl"></div>
        </Link>

        <Link
          to="/admin/inventory"
          className="group relative overflow-hidden bg-white border border-slate-100 rounded-[2rem] p-8 text-slate-900 shadow-xl shadow-slate-100 hover:-translate-y-2 transition-all duration-500"
        >
          <div className="relative z-10">
            <CubeIcon className="h-12 w-12 mb-6 text-indigo-500 group-hover:scale-110 transition-transform duration-500" />
            <p className="font-black text-xl tracking-tight uppercase">Inventory</p>
            <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">Batch & Gudang</p>
          </div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        </Link>

        <Link
          to="/admin/reports"
          className="group relative overflow-hidden bg-white border border-slate-100 rounded-[2rem] p-8 text-slate-900 shadow-xl shadow-slate-100 hover:-translate-y-2 transition-all duration-500"
        >
          <div className="relative z-10">
            <DocumentTextIcon className="h-12 w-12 mb-6 text-amber-500 group-hover:scale-110 transition-transform duration-500" />
            <p className="font-black text-xl tracking-tight uppercase">Analitik</p>
            <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">Laporan Bisnis</p>
          </div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
