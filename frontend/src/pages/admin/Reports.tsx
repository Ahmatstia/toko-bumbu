// frontend/src/pages/admin/Reports.tsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import api from "../../services/api";
import { formatPrice } from "../../utils/format";
import toast from "react-hot-toast";

interface DailySale {
  date: string;
  total: number;
  count: number;
}

interface MonthlySale {
  month: string;
  total: number;
  count: number;
}

interface TopProduct {
  id: string;
  name: string;
  sold: number;
  revenue: number;
  image?: string;
}

interface PaymentMethod {
  method: string;
  count: number;
  total: number;
}

interface Summary {
  totalSales: number;
  totalTransactions: number;
  averageTransaction: number;
  totalCustomers: number;
}

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "daily" | "monthly" | "products" | "payment"
  >("daily");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Fetch daily sales
  const { data: dailySales, isLoading: dailyLoading } = useQuery<DailySale[]>({
    queryKey: ["reports-daily", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", dateRange.startDate);
      params.append("endDate", dateRange.endDate);

      const response = await api.get(
        `/transactions/daily?${params.toString()}`,
      );
      return response.data;
    },
    enabled: activeTab === "daily",
  });

  // Fetch monthly sales
  const { data: monthlySales, isLoading: monthlyLoading } = useQuery<
    MonthlySale[]
  >({
    queryKey: ["reports-monthly", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", dateRange.startDate);
      params.append("endDate", dateRange.endDate);

      const response = await api.get(
        `/transactions/monthly?${params.toString()}`,
      );
      return response.data;
    },
    enabled: activeTab === "monthly",
  });

  // Fetch top products
  const { data: topProducts, isLoading: productsLoading } = useQuery<
    TopProduct[]
  >({
    queryKey: ["reports-top-products", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", dateRange.startDate);
      params.append("endDate", dateRange.endDate);
      params.append("limit", "10");

      const response = await api.get(
        `/products/top-selling?${params.toString()}`,
      );
      return response.data;
    },
    enabled: activeTab === "products",
  });

  // Fetch payment methods
  const { data: paymentMethods, isLoading: paymentLoading } = useQuery<
    PaymentMethod[]
  >({
    queryKey: ["reports-payment", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", dateRange.startDate);
      params.append("endDate", dateRange.endDate);

      const response = await api.get(
        `/transactions/payment-methods?${params.toString()}`,
      );
      return response.data;
    },
    enabled: activeTab === "payment",
  });

  // Fetch summary
  const { data: summary } = useQuery<Summary>({
    queryKey: ["reports-summary", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", dateRange.startDate);
      params.append("endDate", dateRange.endDate);

      const response = await api.get(`/admin/summary?${params.toString()}`);
      return response.data;
    },
  });

  // Handle export
  const handleExport = (format: "excel" | "pdf") => {
    toast.success(`Fitur export ${format.toUpperCase()} akan segera tersedia`);
    // TODO: Implement export
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isLoading =
    (activeTab === "daily" && dailyLoading) ||
    (activeTab === "monthly" && monthlyLoading) ||
    (activeTab === "products" && productsLoading) ||
    (activeTab === "payment" && paymentLoading);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-600 mt-1">
            Analisis penjualan dan performa toko
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("excel")}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            PDF
          </button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-4">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-gray-500">s/d</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Penjualan</p>
                <p className="text-2xl font-bold text-primary-600">
                  {formatPrice(summary.totalSales)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transaksi</p>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.totalTransactions}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rata-rata Transaksi</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(summary.averageTransaction)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Customer</p>
                <p className="text-2xl font-bold text-purple-600">
                  {summary.totalCustomers}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCardIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("daily")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "daily"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Penjualan Harian
            </button>
            <button
              onClick={() => setActiveTab("monthly")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "monthly"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Penjualan Bulanan
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "products"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Produk Terlaris
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "payment"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Metode Pembayaran
            </button>
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Daily Sales Chart */}
              {activeTab === "daily" && dailySales && (
                <div className="space-y-6">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailySales}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => formatDate(date)}
                        />
                        <YAxis tickFormatter={(value) => formatPrice(value)} />
                        <Tooltip
                          // ========== PERBAIKAN: Handle undefined value ==========
                          formatter={(value: number | undefined) => {
                            if (value === undefined)
                              return ["Rp 0", "Penjualan"];
                            return [formatPrice(value), "Penjualan"];
                          }}
                          labelFormatter={(label) =>
                            formatDate(label as string)
                          }
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#10B981"
                          name="Penjualan"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Daily Sales Table */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">
                      Detail Harian
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                              Tanggal
                            </th>
                            <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                              Jumlah Transaksi
                            </th>
                            <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                              Total Penjualan
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailySales.map((sale, index) => (
                            <tr
                              key={index}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-4 px-6">
                                {formatDate(sale.date)}
                              </td>
                              <td className="py-4 px-6">{sale.count || 0}</td>
                              <td className="py-4 px-6 font-semibold text-primary-600">
                                {formatPrice(sale.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Sales Chart */}
              {activeTab === "monthly" && monthlySales && (
                <div className="space-y-6">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlySales}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => formatPrice(value)} />
                        <Tooltip
                          // ========== PERBAIKAN: Handle undefined value ==========
                          formatter={(value: number | undefined) => {
                            if (value === undefined)
                              return ["Rp 0", "Penjualan"];
                            return [formatPrice(value), "Penjualan"];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="total" fill="#10B981" name="Penjualan" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top Products */}
              {activeTab === "products" && topProducts && (
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-xl font-bold text-primary-600">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">
                          {product.name}
                        </h3>
                        <div className="flex gap-4 mt-1 text-sm">
                          <span className="text-gray-600">
                            Terjual:{" "}
                            <span className="font-semibold">
                              {product.sold}
                            </span>
                          </span>
                          <span className="text-gray-600">
                            Revenue:{" "}
                            <span className="font-semibold text-primary-600">
                              {formatPrice(product.revenue)}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-600"
                          style={{
                            width: `${(product.sold / (topProducts[0]?.sold || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Methods */}
              {activeTab === "payment" && paymentMethods && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethods}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          // ========== PERBAIKAN: Safe check untuk percent ==========
                          label={({ method, percent }) => {
                            const percentage = percent
                              ? (percent * 100).toFixed(0)
                              : "0";
                            return `${method} (${percentage}%)`;
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {paymentMethods.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Table */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Detail Metode Pembayaran
                    </h3>
                    <div className="space-y-3">
                      {paymentMethods.map((method, index) => (
                        <div
                          key={method.method}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="font-medium">
                              {method.method === "CASH" ? "Tunai" : "Transfer"}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {method.count} transaksi
                            </p>
                            <p className="text-sm text-primary-600">
                              {formatPrice(method.total)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
