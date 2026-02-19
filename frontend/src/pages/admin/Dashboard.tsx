import React, { useState } from "react";
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
    stock: number;
    minStock: number;
    unit: string;
  }[];
  expiringSoon: {
    id: string;
    name: string;
    batchCode: string;
    stock: number;
    expiryDate: string;
    daysLeft: number;
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
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#FF6B6B",
];
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-600 border-green-200",
  PENDING: "bg-yellow-100 text-yellow-600 border-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-600 border-blue-200",
  CANCELLED: "bg-red-100 text-red-600 border-red-200",
};

// ========== MAIN COMPONENT ==========
const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");
  const [showNotifications, setShowNotifications] = useState(false);

  // ========== FETCH DATA - PINDAHKAN KE ATAS ==========
  const {
    data: stats,
    isLoading,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard", timeRange],
    queryFn: async () => {
      try {
        // Ambil semua data
        const [
          todaySalesRes,
          weeklySalesRes,
          monthlySalesRes,
          topProductsRes,
          recentTransactionsRes,
          paymentMethodsRes,
          summaryRes,
        ] = await Promise.all([
          api
            .get("/transactions/today")
            .catch(() => ({ data: { total: 0, count: 0, average: 0 } })),
          api.get("/transactions/weekly").catch(() => ({ data: [] })),
          api.get("/transactions/monthly").catch(() => ({ data: [] })),
          api.get("/products/top?limit=5").catch(() => ({ data: [] })),
          api
            .get("/transactions?limit=7")
            .catch(() => ({ data: { data: [] } })),
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
        ]);

        // LOGGING untuk melihat data yang masuk
        console.log("📊 TODAY SALES:", todaySalesRes.data);
        console.log("📊 WEEKLY SALES:", weeklySalesRes.data);
        console.log("📊 MONTHLY SALES:", monthlySalesRes.data);
        console.log("📊 TOP PRODUCTS:", topProductsRes.data);
        console.log("📊 PAYMENT METHODS:", paymentMethodsRes.data);
        console.log("📊 SUMMARY:", summaryRes.data);

        return {
          todaySales: todaySalesRes.data,
          weeklySales: weeklySalesRes.data,
          monthlySales: monthlySalesRes.data,
          topProducts: topProductsRes.data,
          lowStock: [],
          expiringSoon: [],
          recentTransactions: recentTransactionsRes.data.data || [],
          paymentMethods: paymentMethodsRes.data,
          summary: summaryRes.data,
        };
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return {
          todaySales: { total: 0, count: 0, average: 0 },
          weeklySales: [],
          monthlySales: [],
          topProducts: [],
          lowStock: [],
          expiringSoon: [],
          recentTransactions: [],
          paymentMethods: [],
          summary: {
            totalProducts: 0,
            totalCustomers: 0,
            totalTransactions: 0,
            totalRevenue: 0,
            pendingTransactions: 0,
          },
        };
      }
    },
    refetchInterval: 30000,
  });

  // ========== EFFECT UNTUK DEBUG - PINDAHKAN KE SINI (SETELAH useQuery) ==========
  React.useEffect(() => {
    if (stats) {
      console.log("🔥 FINAL STATS:", stats);
      console.log("🔥 todaySales:", stats.todaySales);
      console.log("🔥 weeklySales:", stats.weeklySales);
      console.log("🔥 monthlySales:", stats.monthlySales);
      console.log("🔥 topProducts:", stats.topProducts);
      console.log("🔥 paymentMethods:", stats.paymentMethods);
      console.log("🔥 summary:", stats.summary);
    }
  }, [stats]);

  // ========== FORMATTERS ==========
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

  // ========== LOADING STATE ==========
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  // ========== CHART DATA ==========
  const salesData =
    (timeRange === "week" ? stats?.weeklySales : stats?.monthlySales) || [];
  const paymentData = stats?.paymentMethods || [];

  // ========== NOTIFICATIONS ==========
  const notifications = [
    ...(stats?.lowStock?.map((item) => ({
      type: "warning",
      title: "Stok Menipis",
      message: `${item.name} tersisa ${item.stock} ${item.unit} (min ${item.minStock})`,
      time: "Sekarang",
      link: `/admin/inventory?product=${item.id}`,
    })) || []),
    ...(stats?.expiringSoon?.map((item) => ({
      type: "expiring",
      title: "Akan Expired",
      message: `${item.name} (${item.batchCode}) akan expired dalam ${item.daysLeft} hari`,
      time: `${item.daysLeft} hari lagi`,
      link: `/admin/inventory?batch=${item.batchCode}`,
    })) || []),
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Selamat datang kembali! Berikut ringkasan toko Anda.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow relative"
            >
              <BellIcon className="h-6 w-6 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Notifikasi</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif, idx) => (
                      <Link
                        key={idx}
                        to={notif.link}
                        className="block p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                        onClick={() => setShowNotifications(false)}
                      >
                        <p className="font-medium text-gray-800">
                          {notif.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {notif.time}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      Tidak ada notifikasi
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <ArrowPathIcon className="h-6 w-6 text-gray-600" />
          </button>

          {/* Time Range Selector */}
          <div className="flex bg-white rounded-xl shadow-sm p-1">
            <button
              onClick={() => setTimeRange("week")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === "week"
                  ? "bg-primary-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Minggu
            </button>
            <button
              onClick={() => setTimeRange("month")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === "month"
                  ? "bg-primary-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Bulan
            </button>
          </div>
        </div>
      </div>

      {/* ========== STATS CARDS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Penjualan Hari Ini */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm">Penjualan Hari Ini</p>
              <p className="text-3xl font-bold mt-2">
                {formatPrice(stats?.todaySales.total)}
              </p>
              <p className="text-green-100 text-sm mt-1">
                {stats?.todaySales.count || 0} transaksi
              </p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <CurrencyDollarIcon className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-400">
            <p className="text-sm text-green-100">
              Rata-rata {formatPrice(stats?.todaySales.average)}/transaksi
            </p>
          </div>
        </div>

        {/* Card 2: Total Produk */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm">Total Produk</p>
              <p className="text-3xl font-bold mt-2">
                {stats?.summary.totalProducts || 0}
              </p>
              <p className="text-blue-100 text-sm mt-1">Aktif</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <CubeIcon className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-400">
            <p className="text-sm text-blue-100">
              {stats?.lowStock?.length || 0} stok menipis
            </p>
          </div>
        </div>

        {/* Card 3: Total Customer */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm">Total Customer</p>
              <p className="text-3xl font-bold mt-2">
                {stats?.summary.totalCustomers || 0}
              </p>
              <p className="text-purple-100 text-sm mt-1">Terdaftar</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <UserGroupIcon className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-purple-400">
            <p className="text-sm text-purple-100">
              {stats?.summary.totalTransactions || 0} transaksi
            </p>
          </div>
        </div>

        {/* Card 4: Total Revenue */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-100 text-sm">Total Pendapatan</p>
              <p className="text-3xl font-bold mt-2">
                {formatPrice(Number(stats?.summary.totalRevenue))}
              </p>
              <p className="text-orange-100 text-sm mt-1">Semua waktu</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <ArrowTrendingUpIcon className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-orange-400">
            <p className="text-sm text-orange-100">
              {stats?.summary.pendingTransactions || 0} pending verifikasi
            </p>
          </div>
        </div>
      </div>

      {/* ========== CHARTS SECTION ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Penjualan */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Tren Penjualan</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {timeRange === "week" ? "7 Hari Terakhir" : "30 Hari Terakhir"}
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey={timeRange === "week" ? "date" : "week"}
                tickFormatter={(value: any) => formatShortDate(String(value))}
                stroke="#888"
              />
              <YAxis
                stroke="#888"
                tickFormatter={(value: any) => formatPrice(Number(value))}
              />
              <Tooltip
                formatter={(value: any) => [
                  formatPrice(Number(value)),
                  "Total",
                ]}
                labelFormatter={(label: any) => `Tanggal: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#f97316"
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Metode Pembayaran */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Metode Pembayaran
          </h2>
          {paymentData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {paymentData.map((item, index) => (
                  <div
                    key={item.method}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                      <span className="text-sm text-gray-600">
                        {item.method}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">{item.count}x</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400">
              Belum ada data
            </div>
          )}
        </div>
      </div>

      {/* ========== TOP PRODUCTS & LOW STOCK ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Produk Terlaris</h2>
            <Link
              to="/admin/products"
              className="text-primary-600 hover:text-primary-700 text-sm"
            >
              Lihat Semua
            </Link>
          </div>
          {stats?.topProducts && stats.topProducts.length > 0 ? (
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      {product.sold} terjual
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-600">
                      {formatPrice(Number(product.revenue))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Belum ada data produk terlaris
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Stok Menipis</h2>
            <Link
              to="/admin/inventory"
              className="text-primary-600 hover:text-primary-700 text-sm"
            >
              Kelola Stok
            </Link>
          </div>
          {stats?.lowStock && stats.lowStock.length > 0 ? (
            <div className="space-y-4">
              {stats.lowStock.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-yellow-600">
                      {item.stock} {item.unit}
                    </p>
                    <p className="text-xs text-gray-400">
                      Min: {item.minStock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Semua stok aman
            </div>
          )}
        </div>
      </div>

      {/* ========== RECENT TRANSACTIONS ========== */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Transaksi Terbaru</h2>
          <Link
            to="/admin/transactions"
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            Lihat Semua
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Invoice
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Customer
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Tanggal
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Total
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Metode
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentTransactions &&
              stats.recentTransactions.length > 0 ? (
                stats.recentTransactions.map((trx) => (
                  <tr
                    key={trx.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-mono text-sm">
                      {trx.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">{trx.customerName}</td>
                    <td className="py-3 px-4 text-sm">
                      {formatDate(trx.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {formatPrice(Number(trx.total))}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {trx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[trx.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {trx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/admin/transactions/${trx.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
                      >
                        <EyeIcon className="h-4 w-4" />
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Belum ada transaksi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== QUICK ACTIONS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/admin/pos"
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white hover:shadow-lg transition-shadow"
        >
          <ShoppingCartIcon className="h-8 w-8 mb-2" />
          <p className="font-semibold">Buka Kasir</p>
          <p className="text-sm text-green-100">Transaksi baru</p>
        </Link>

        <Link
          to="/admin/products/new"
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white hover:shadow-lg transition-shadow"
        >
          <PlusIcon className="h-8 w-8 mb-2" />
          <p className="font-semibold">Tambah Produk</p>
          <p className="text-sm text-blue-100">Produk baru</p>
        </Link>

        <Link
          to="/admin/inventory"
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white hover:shadow-lg transition-shadow"
        >
          <CubeIcon className="h-8 w-8 mb-2" />
          <p className="font-semibold">Update Stok</p>
          <p className="text-sm text-purple-100">Tambah stok</p>
        </Link>

        <Link
          to="/admin/reports"
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white hover:shadow-lg transition-shadow"
        >
          <DocumentTextIcon className="h-8 w-8 mb-2" />
          <p className="font-semibold">Laporan</p>
          <p className="text-sm text-orange-100">Export data</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
