import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CubeIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";

interface DashboardStats {
  totalTransactions: number;
  totalSales: number;
  totalProducts: number;
  totalCustomers: number;
  pendingTransactions: number;
  todaySales: {
    totalTransactions: number;
    totalSales: number;
  };
}

interface RecentTransaction {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      // Gabungan dari beberapa endpoint
      const [todaySales, products, customers, transactions] = await Promise.all(
        [
          api.get("/transactions/today"),
          api.get("/products?limit=1"),
          api.get("/customers/stats"), // <-- GUNAKAN ENDPOINT INI
          api.get("/transactions?status=PENDING&limit=1"),
        ],
      );

      return {
        totalTransactions: todaySales.data.totalTransactions || 0,
        totalSales: todaySales.data.totalSales || 0,
        totalProducts: products.data.meta?.total || 0,
        totalCustomers: customers.data.totalCustomers || 0, // <-- AMBIL DARI RESPON
        pendingTransactions: transactions.data.meta?.total || 0,
        todaySales: {
          totalTransactions: todaySales.data.totalTransactions || 0,
          totalSales: todaySales.data.totalSales || 0,
        },
      };
    },
  });

  // Fetch recent transactions
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery<
    RecentTransaction[]
  >({
    queryKey: ["admin-recent-transactions"],
    queryFn: async () => {
      const response = await api.get("/transactions?limit=5");
      return response.data.data;
    },
  });

  // Format price
  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
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

  const statsCards = [
    {
      title: "Penjualan Hari Ini",
      value: stats ? formatPrice(stats.todaySales.totalSales) : "Rp 0",
      icon: CurrencyDollarIcon,
      color: "bg-green-500",
      link: "/admin/reports?period=today",
    },
    {
      title: "Transaksi Hari Ini",
      value: stats?.todaySales.totalTransactions || 0,
      icon: ShoppingCartIcon,
      color: "bg-blue-500",
      link: "/admin/transactions?period=today",
    },
    {
      title: "Total Produk",
      value: stats?.totalProducts || 0,
      icon: CubeIcon,
      color: "bg-purple-500",
      link: "/admin/products",
    },
    {
      title: "Total Customer",
      value: stats?.totalCustomers || 0,
      icon: UserGroupIcon,
      color: "bg-orange-500",
      link: "/admin/customers",
    },
  ];

  if (statsLoading || transactionsLoading) {
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Selamat datang di dashboard admin BumbuKu
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <Link
            key={index}
            to={card.link}
            className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div
                className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}
              >
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pending Transactions Alert */}
      {stats && stats.pendingTransactions > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">
                Ada {stats.pendingTransactions} transaksi menunggu verifikasi
              </p>
              <p className="text-sm text-yellow-600">
                Segera verifikasi pembayaran dari customer
              </p>
            </div>
            <Link
              to="/admin/transactions?status=PENDING"
              className="ml-auto bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Lihat
            </Link>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Transaksi Terbaru</h2>
          <Link
            to="/admin/transactions"
            className="text-primary-600 hover:text-primary-700 text-sm font-semibold"
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
              {recentTransactions && recentTransactions.length > 0 ? (
                recentTransactions.map((trx) => (
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
                      {formatPrice(trx.total)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {trx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(trx.status)}`}
                      >
                        {trx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/admin/transactions/${trx.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/admin/pos"
          className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <ShoppingCartIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Buka Kasir</h3>
            <p className="text-sm text-gray-500">Input transaksi baru</p>
          </div>
        </Link>

        <Link
          to="/admin/products/new"
          className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <CubeIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Tambah Produk</h3>
            <p className="text-sm text-gray-500">Produk baru ke toko</p>
          </div>
        </Link>

        <Link
          to="/admin/inventory"
          className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Update Stok</h3>
            <p className="text-sm text-gray-500">Tambah stok produk</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
