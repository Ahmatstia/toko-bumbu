// frontend/src/pages/admin/Customers.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { formatPrice } from "../../utils/format";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalTransactions: number;
  totalSpent: number;
  createdAt: string;
  isActive: boolean;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CustomersResponse {
  data: Customer[];
  meta: Meta;
}

const Customers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Infinite scroll states
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalData, setTotalData] = useState(0);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastCustomerRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreCustomers();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore],
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ========== PERBAIKAN: Reset pagination when filters change ==========
  useEffect(() => {
    setAllCustomers([]);
    setPage(1);
    setHasMore(true);
  }, [debouncedSearch, dateFilter]);

  // ========== PERBAIKAN: Fetch customers dengan page di queryKey ==========
  const {
    data,
    isLoading: initialLoading,
    refetch,
  } = useQuery<CustomersResponse>({
    queryKey: ["admin-customers", debouncedSearch, dateFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (dateFilter) params.append("startDate", dateFilter);
      params.append("page", page.toString());
      params.append("limit", "20");

      console.log(`Fetching customers page ${page}...`);
      const response = await api.get(`/customers?${params.toString()}`);
      return response.data;
    },
  });

  // ========== PERBAIKAN: Handle data changes dengan append ==========
  useEffect(() => {
    if (data) {
      if (page === 1) {
        setAllCustomers(data.data || []);
        console.log("Page 1 customers:", data.data?.length);
      } else {
        setAllCustomers((prev) => [...prev, ...(data.data || [])]);
        console.log(
          "Appending page",
          page,
          "total now:",
          allCustomers.length + (data.data?.length || 0),
        );
      }
      setTotalData(data.meta?.total || 0);
      setHasMore(page < data.meta?.totalPages);
    }
  }, [data, page]);

  // Load more customers
  const loadMoreCustomers = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    console.log("Loading more... Next page:", page + 1);
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, [isLoadingMore, hasMore, page]);

  const isLoading = initialLoading && page === 1 && allCustomers.length === 0;

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Manajemen Customer
          </h1>
          <p className="text-gray-600 mt-1">Kelola data pelanggan</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={async () => {
              try {
                const res = await api.post("/transactions/sync-all-stats");
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const toast = (await import("react-hot-toast")).default;
                toast.success(`Berhasil sinkronisasi ${res.data.success} customer!`);
                refetch();
              } catch (err) {
                console.error(err);
                const toast = (await import("react-hot-toast")).default;
                toast.error("Gagal sinkronisasi statistik");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-all shadow-sm"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-500" />
            Sync Data Historis
          </button>
          {/* Total Data Badge */}
          {totalData > 0 && (
            <div className="bg-primary-50 border-2 border-primary-200 rounded-xl px-4 py-2">
              <p className="text-sm text-gray-600">Total Customer</p>
              <p className="text-2xl font-bold text-primary-600">{totalData}</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama/email/phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Filter tanggal daftar"
          />

          {/* Reset Filters */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setDateFilter("");
              }}
              className="text-gray-600 hover:text-primary-600 flex items-center gap-2"
            >
              <FunnelIcon className="h-5 w-5" />
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex justify-between items-center px-4">
        <p className="text-sm text-gray-600">
          Menampilkan {allCustomers.length} dari {totalData} customer
        </p>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Customer
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Kontak
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Transaksi
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Total Belanja
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Bergabung
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {allCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Tidak ada customer
                  </td>
                </tr>
              ) : (
                allCustomers.map((customer, index) => {
                  const isLastItem = index === allCustomers.length - 1;

                  return (
                    <tr
                      key={customer.id}
                      ref={isLastItem ? (lastCustomerRef as any) : null}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-gray-500">
                              {customer.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm">{customer.phone || "-"}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                          {customer.totalTransactions} transaksi
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-semibold">
                          {formatPrice(customer.totalSpent)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {new Date(customer.createdAt).toLocaleDateString(
                          "id-ID",
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            customer.isActive
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {customer.isActive ? "Aktif" : "Non-aktif"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Loading indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-4 border-t border-gray-200">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* End of data message */}
        {!hasMore &&
          allCustomers.length > 0 &&
          allCustomers.length >= totalData && (
            <div className="text-center py-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Semua data telah dimuat ({totalData} customer)
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default Customers;
