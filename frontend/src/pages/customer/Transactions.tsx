import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  CalendarIcon, 
  MagnifyingGlassIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface TransactionItem {
  id: string;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  quantity: number;
  price: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  items: TransactionItem[];
}

const Transactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch transactions
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['customer-transactions'],
    queryFn: async () => {
      const response = await api.get('/transactions/customer/history');
      return response.data;
    },
  });

  // Format price
  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  // Format date
  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy • HH:mm', { locale: id });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-600';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-600';
      case 'CANCELLED':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Filter transactions
  const filteredTransactions = transactions?.filter((trx) => {
    const matchesSearch = trx.invoiceNumber
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || trx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Riwayat Transaksi
      </h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">Semua Status</option>
              <option value="COMPLETED">Selesai</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {!filteredTransactions || filteredTransactions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <div className="text-6xl mb-4">🧾</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Belum Ada Transaksi
          </h3>
          <p className="text-gray-600 mb-6">
            Yuk, mulai belanja di BumbuKu
          </p>
          <Link
            to="/products"
            className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors font-semibold"
          >
            Belanja Sekarang
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Transaction Header */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === transaction.id ? null : transaction.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🧾</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {transaction.invoiceNumber}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <CalendarIcon className="h-4 w-4" />
                        {formatDate(transaction.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                    <span className="font-bold text-primary-600">
                      {formatPrice(transaction.total)}
                    </span>
                    <ChevronDownIcon
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        expandedId === transaction.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === transaction.id && (
                <div className="border-t border-gray-100 p-6">
                  {/* Items List */}
                  <div className="space-y-3 mb-4">
                    {transaction.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {item.product.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-xl">🛒</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {item.product.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} x {formatPrice(item.price)}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-800">
                          {formatPrice(item.subtotal)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">
                        {formatPrice(transaction.total)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Metode Pembayaran</span>
                      <span className="font-medium">{transaction.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2">
                      <span>Total</span>
                      <span className="text-primary-600">
                        {formatPrice(transaction.total)}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4">
                    <Link
                      to={`/order-success/${transaction.invoiceNumber}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-semibold"
                    >
                      Lihat Detail Invoice →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Transactions;