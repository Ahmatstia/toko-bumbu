import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CubeIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  BellIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
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
  const [showNotifications, setShowNotifications] = useState(false);
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
    queryKey: ["admin-dashboard", timeRange],
    queryFn: async () => {
      const [
        todaySalesRes,
        weeklySalesRes,
        monthlySalesRes,
        topProductsRes,
        recentTransactionsRes,
        paymentMethodsRes,
        summaryRes,
        lowStockRes,
        expiringSoonRes,
      ] = await Promise.all([
        api.get("/transactions/today").catch(() => ({ data: { total: 0, count: 0, average: 0 } })),
        api.get("/transactions/weekly").catch(() => ({ data: [] })),
        api.get("/transactions/monthly").catch(() => ({ data: [] })),
        api.get("/products/top?limit=5").catch(() => ({ data: [] })),
        api.get("/transactions?limit=7").catch(() => ({ data: { data: [] } })),
        api.get("/transactions/payment-methods").catch(() => ({ data: [] })),
        api.get("/admin/summary").catch(() => ({
          data: {
            totalProducts: 0,
            totalCustomers: 0,
            totalTransactions: 0,
            totalRevenue: 0,
            pendingTransactions: 0,
          },
        })),
        api.get("/inventory/stock/low").catch(() => ({ data: [] })),
        api.get("/inventory/stock/expiring").catch(() => ({ data: [] })),
      ]);

      return {
        todaySales: todaySalesRes.data,
        weeklySales: weeklySalesRes.data,
        monthlySales: monthlySalesRes.data,
        topProducts: topProductsRes.data,
        lowStock: lowStockRes.data,
        expiringSoon: expiringSoonRes.data,
        recentTransactions: recentTransactionsRes.data.data || [],
        paymentMethods: paymentMethodsRes.data,
        summary: summaryRes.data,
      };
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

  const notifications = [
    ...(stats?.lowStock?.map((item) => ({
      type: "warning",
      title: "Stok Menipis",
      message: `${item.name || item.product?.name} tersisa ${item.quantity} ${item.product?.unit} (min ${item.product?.minStock})`,
      time: "Segera Restock",
      link: `/admin/inventory`,
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />,
    })) || []),
    ...(stats?.expiringSoon?.map((item) => {
      const days = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      return {
        type: "expiring",
        title: "Akan Kadaluarsa",
        message: `${item.product?.name} (${item.batchCode}) kadaluarsa dalam ${days} hari`,
        time: `${days} hari lagi`,
        link: `/admin/inventory`,
        icon: <ClockIcon className="h-5 w-5 text-rose-500" />,
      };
    }) || []),
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* ========== HERO HEADER ========== */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-sky-100">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {greeting}, Owner! 👋
            </h1>
            <p className="text-sky-100 mt-2 text-lg font-medium opacity-90">
              Berikut adalah laporan terbaru untuk toko bumbu Anda hari ini.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all relative border border-white/20"
              >
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-indigo-700 animate-bounce">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Notifikasi Logistik</h3>
                    <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-full uppercase">
                      {notifications.length} Info
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif, idx) => (
                        <Link
                          key={idx}
                          to={notif.link}
                          className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                          onClick={() => setShowNotifications(false)}
                        >
                          <div className="mt-1">{notif.icon}</div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm leading-tight">{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                            <p className="text-[10px] text-sky-600 font-bold mt-2 flex items-center gap-1 uppercase tracking-wider">
                              <ArrowTrendingUpIcon className="h-3 w-3" />
                              {notif.time}
                            </p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <CubeIcon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm italic">Logistik terpantau aman terkendali</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => refetch()}
              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all border border-white/20 active:scale-95"
            >
              <ArrowPathIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-sky-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* ========== MAIN STATS GRID ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Omzet Hari Ini */}
        <div className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Penjualan Hari Ini</p>
              <h3 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">
                {formatPrice(stats?.todaySales.total)}
              </h3>
            </div>
            <div className="bg-emerald-50 text-emerald-600 rounded-2xl p-3 group-hover:scale-110 transition-transform">
              <CurrencyDollarIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-black">
              {stats?.todaySales.count || 0} TRX
            </span>
            <p className="text-xs text-gray-400 font-medium whitespace-nowrap">
              Avg: {formatPrice(stats?.todaySales.average)}
            </p>
          </div>
        </div>

        {/* Card 2: Katalog Produk */}
        <div className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Katalog Produk</p>
              <h3 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">
                {stats?.summary.totalProducts || 0}
              </h3>
            </div>
            <div className="bg-sky-50 text-sky-600 rounded-2xl p-3 group-hover:scale-110 transition-transform">
              <CubeIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${stats?.lowStock?.length ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
              {stats?.lowStock?.length || 0} Stok Limit
            </span>
            <p className="text-xs text-gray-400 font-medium">Monitoring aktif</p>
          </div>
        </div>

        {/* Card 3: Pelanggan Setia */}
        <div className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Total Pelanggan</p>
              <h3 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">
                {stats?.summary.totalCustomers || 0}
              </h3>
            </div>
            <div className="bg-indigo-50 text-indigo-600 rounded-2xl p-3 group-hover:scale-110 transition-transform">
              <UserGroupIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-black">
              TRUSTED BRAND
            </span>
            <p className="text-xs text-gray-400 font-medium">Customer database</p>
          </div>
        </div>

        {/* Card 4: Total Omzet */}
        <div className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Total Revenue</p>
              <h3 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">
                {formatPrice(Number(stats?.summary.totalRevenue))}
              </h3>
            </div>
            <div className="bg-amber-50 text-amber-600 rounded-2xl p-3 group-hover:scale-110 transition-transform">
              <ArrowTrendingUpIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-black">
              LIFETIME EARNINGS
            </span>
            <p className="text-xs text-gray-400 font-medium">Success transactions</p>
          </div>
        </div>
      </div>

      {/* ========== CHARTS SECTION ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Grafik Penjualan */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Tren Performa Penjualan</h2>
              <p className="text-sm text-gray-400 font-medium mt-1">Struktur pemasukan periode terkini</p>
            </div>
            <div className="flex bg-gray-100/80 p-1 rounded-2xl ring-1 ring-gray-200/50">
              <button
                onClick={() => setTimeRange("week")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  timeRange === "week"
                    ? "bg-white text-sky-600 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                7 HARI
              </button>
              <button
                onClick={() => setTimeRange("month")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  timeRange === "month"
                    ? "bg-white text-sky-600 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                BULANAN
              </button>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey={timeRange === "week" ? "date" : "week"}
                  tickFormatter={(value: any) => formatShortDate(String(value))}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(value: any) => `Rp ${value/1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                    padding: "12px",
                  }}
                  itemStyle={{ fontWeight: "800", color: "#0ea5e9" }}
                  labelStyle={{ fontWeight: "800", marginBottom: "4px", color: "#1e293b" }}
                  formatter={(value: any) => [formatPrice(Number(value)), "Omzet"]}
                  labelFormatter={(label: any) => `Periode: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#0ea5e9"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Metode Pembayaran */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="mb-8">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Payment Mix</h2>
            <p className="text-sm text-gray-400 font-medium mt-1">Daftar preferensi berbayar</p>
          </div>
          {paymentData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      fill="#8884d8"
                      paddingAngle={8}
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
                        padding: "10px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full mt-6 space-y-3">
                {paymentData.map((item, index) => (
                  <div key={item.method} className="flex justify-between items-center bg-gray-50/50 p-2 px-3 rounded-xl border border-gray-100/50">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full ring-4 ring-white"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-xs font-extrabold text-gray-600 uppercase tracking-tighter">
                        {item.method}
                      </span>
                    </div>
                    <span className="text-xs font-black text-gray-900">{item.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-gray-200" />
              </div>
              <p className="text-gray-400 text-sm italic font-medium">Data pembayaran nihil</p>
            </div>
          )}
        </div>
      </div>

      {/* ========== LISTS SECTION (REDESIGNED) ========== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight text-glow">Produk Juara 🏆</h2>
              <p className="text-sm text-gray-400 font-medium">Berdasarkan volume penjualan</p>
            </div>
            <Link to="/admin/products" className="text-sky-600 hover:text-sky-700 text-xs font-black bg-sky-50 px-4 py-2 rounded-xl transition-all">
              FULL LIST
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              stats.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-sky-50/30 rounded-2xl transition-all group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ring-1 ring-inset ${
                    index === 0 ? 'bg-amber-100 text-amber-700 ring-amber-200/50' : 
                    index === 1 ? 'bg-slate-100 text-slate-700 ring-slate-200/50' :
                    index === 2 ? 'bg-orange-100 text-orange-700 ring-orange-200/50' : 'bg-gray-50 text-gray-500 ring-gray-100'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate group-hover:text-sky-700 transition-colors">{product.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                      STOCK FLOW: {product.sold} UNITS
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">{formatPrice(Number(product.revenue))}</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <div className="w-8 h-1 bg-sky-100 rounded-full overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(100, (product.sold / (stats.topProducts?.[0]?.sold || 1)) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-300 font-bold italic">Belum ada pemenang produk</p>
              </div>
            )}
          </div>
        </div>

        {/* Critical Logistics (Stock & Expiry) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-8 pb-4">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Sinyal Logistik 🏗️</h2>
            <p className="text-sm text-gray-400 font-medium">Segera ambil tindakan pencegahan</p>
          </div>
          
          <div className="flex-1 p-6 pt-2 space-y-6">
            {/* Limit Stock Sub-section */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-rose-500" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Stok Menipis</h3>
                <span className="ml-auto text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full ring-1 ring-rose-100">
                  {stats?.lowStock?.length || 0} ITEMS
                </span>
              </div>
              <div className="space-y-2">
                {stats?.lowStock && stats.lowStock.length > 0 ? (
                  stats.lowStock.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{item.name || item.product?.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">SKU: {item.sku || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-rose-600">{item.quantity} {item.product?.unit}</p>
                        <p className="text-[10px] text-gray-400 font-bold">LMT: {item.product?.minStock}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-xs font-bold text-emerald-700">✅ Semua stok aman terjaga</p>
                  </div>
                )}
              </div>
            </div>

             {/* Expiry Sub-section */}
             <div>
              <div className="flex items-center gap-2 mb-4 px-2">
                <ClockIcon className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Akan Kadaluarsa</h3>
                <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-100">
                  {stats?.expiringSoon?.length || 0} BATCHES
                </span>
              </div>
              <div className="space-y-2">
                {stats?.expiringSoon && stats.expiringSoon.length > 0 ? (
                  stats.expiringSoon.slice(0, 3).map((item) => {
                    const days = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    return (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{item.product?.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">BATCH: {item.batchCode}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${days <= 7 ? 'text-rose-600' : 'text-amber-600'}`}>
                            {days} HARI LAGI
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">{new Date(item.expiryDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-xs font-bold text-emerald-700">✅ Tidak ada produk kritis kadaluarsa</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Link to="/admin/inventory" className="m-6 mt-0 p-4 bg-gray-900 text-white rounded-2xl text-center text-xs font-black hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
            KONTROL LOGISTIK PENUH
          </Link>
        </div>
      </div>

      {/* ========== RECENT TRANSACTIONS TABLE (PREMIUM) ========== */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Ledger Transaksi</h2>
            <p className="text-sm text-gray-400 font-medium mt-1">Status arus kas waktu nyata</p>
          </div>
          <Link to="/admin/transactions" className="bg-white hover:bg-gray-50 ring-1 ring-gray-200 px-6 py-3 rounded-2xl text-xs font-black text-gray-700 transition-all shadow-sm">
            ARSIP TRANSAKSI
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-y border-gray-100">
                <th className="text-left py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice</th>
                <th className="text-left py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Entitas</th>
                <th className="text-left py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                <th className="text-right py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nilai Bersih</th>
                <th className="text-center py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Metode</th>
                <th className="text-center py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="text-center py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                stats.recentTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-sky-50/30 transition-colors group">
                    <td className="py-5 px-8">
                      <span className="font-mono text-xs font-black text-sky-600 bg-sky-50 px-2 py-1 rounded-lg ring-1 ring-sky-100/50">
                        {trx.invoiceNumber}
                      </span>
                    </td>
                    <td className="py-5 px-8 font-bold text-gray-800 text-sm">{trx.customerName}</td>
                    <td className="py-5 px-8 text-xs font-bold text-gray-500">{formatDate(trx.createdAt)}</td>
                    <td className="py-5 px-8 text-right font-black text-gray-900">{formatPrice(Number(trx.total))}</td>
                    <td className="py-5 px-8 text-center">
                      <span className="text-[10px] font-black text-gray-500 border border-gray-200 px-3 py-1 rounded-full bg-white">
                        {trx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black border ${STATUS_COLORS[trx.status] || "bg-gray-50 text-gray-400 border-gray-100"}`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-center">
                      <Link
                        to={`/admin/transactions`}
                        className="inline-flex items-center justify-center p-2 bg-gray-100 text-gray-400 hover:bg-sky-600 hover:text-white rounded-xl transition-all"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <DocumentTextIcon className="h-12 w-12 text-gray-100 mb-4" />
                      <p className="text-gray-300 font-bold italic">Belum ada aktivitas finansial</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== ACTION RADAR (QUICK ACTIONS) ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Link
          to="/admin/pos"
          className="group relative overflow-hidden bg-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-100/50 hover:-translate-y-2 transition-all duration-300"
        >
          <div className="relative z-10">
            <ShoppingCartIcon className="h-10 w-10 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
            <p className="font-black text-lg tracking-tight">KASIR POS</p>
            <p className="text-emerald-100 text-xs font-bold opacity-80 mt-1 uppercase tracking-widest">Buka Transaksi</p>
          </div>
          <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-bl-full translate-x-4 -translate-y-4"></div>
        </Link>

        <Link
          to="/admin/products"
          className="group relative overflow-hidden bg-sky-600 rounded-3xl p-6 text-white shadow-lg shadow-sky-100/50 hover:-translate-y-2 transition-all duration-300"
        >
          <div className="relative z-10">
            <PlusIcon className="h-10 w-10 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
            <p className="font-black text-lg tracking-tight">PRODUK</p>
            <p className="text-sky-100 text-xs font-bold opacity-80 mt-1 uppercase tracking-widest">Kelola Barang</p>
          </div>
          <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-bl-full translate-x-4 -translate-y-4"></div>
        </Link>

        <Link
          to="/admin/inventory"
          className="group relative overflow-hidden bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-100/50 hover:-translate-y-2 transition-all duration-300"
        >
          <div className="relative z-10">
            <CubeIcon className="h-10 w-10 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
            <p className="font-black text-lg tracking-tight">INVENTORY</p>
            <p className="text-indigo-100 text-xs font-bold opacity-80 mt-1 uppercase tracking-widest">Update Suplai</p>
          </div>
          <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-bl-full translate-x-4 -translate-y-4"></div>
        </Link>

        <Link
          to="/admin/reports"
          className="group relative overflow-hidden bg-amber-600 rounded-3xl p-6 text-white shadow-lg shadow-amber-100/50 hover:-translate-y-2 transition-all duration-300"
        >
          <div className="relative z-10">
            <DocumentTextIcon className="h-10 w-10 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
            <p className="font-black text-lg tracking-tight">LAPORAN</p>
            <p className="text-amber-100 text-xs font-bold opacity-80 mt-1 uppercase tracking-widest">Analisis Toko</p>
          </div>
          <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-bl-full translate-x-4 -translate-y-4"></div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
