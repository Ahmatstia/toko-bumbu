// frontend/src/pages/admin/Staff.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  UserIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { authService } from "../../services/auth.service";
import toast from "react-hot-toast";

interface Staff {
  id: string;
  username: string;
  email?: string;
  name: string;
  phone: string;
  role: "OWNER" | "MANAGER" | "CASHIER" | "STAFF";
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface StaffFormData {
  username: string;
  email?: string;
  name: string;
  phone: string;
  role: "OWNER" | "MANAGER" | "CASHIER" | "STAFF";
  password?: string;
  confirmPassword?: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface StaffResponse {
  data: Staff[];
  meta: Meta;
}

// Role badges dengan warna
const roleBadges = {
  OWNER: { bg: "bg-purple-100", text: "text-purple-600", label: "OWNER" },
  MANAGER: { bg: "bg-blue-100", text: "text-blue-600", label: "MANAGER" },
  CASHIER: { bg: "bg-green-100", text: "text-green-600", label: "KASIR" },
  STAFF: { bg: "bg-gray-100", text: "text-gray-600", label: "STAFF" },
};

const Staff: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<boolean | "">("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>({
    username: "",
    email: "",
    name: "",
    phone: "",
    role: "STAFF",
    password: "",
    confirmPassword: "",
  });

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  // Infinite scroll states
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalData, setTotalData] = useState(0);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastStaffRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreStaff();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore],
  );

  const queryClient = useQueryClient();

  // Get current user
  const currentUser = authService.getCurrentUser() || {};
  console.log("Current user:", currentUser);
  console.log("User role:", currentUser?.role);

  const isOwner = currentUser?.role === "OWNER";
  console.log("Is owner?", isOwner);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when filters change
  useEffect(() => {
    setAllStaff([]);
    setPage(1);
    setHasMore(true);
  }, [roleFilter, statusFilter, debouncedSearch]);

  // Fetch staff dengan page di queryKey
  const {
    data,
    isLoading: initialLoading,
    refetch,
  } = useQuery<StaffResponse>({
    queryKey: ["admin-staff", debouncedSearch, roleFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter !== "") params.append("isActive", String(statusFilter));
      params.append("page", page.toString());
      params.append("limit", "20");

      console.log(`Fetching staff page ${page}...`);
      const response = await api.get(`/users?${params.toString()}`);
      return response.data;
    },
  });

  // Handle data changes dengan append
  useEffect(() => {
    if (data) {
      if (page === 1) {
        setAllStaff(data.data || []);
        console.log("Page 1 staff:", data.data?.length);
      } else {
        setAllStaff((prev) => [...prev, ...(data.data || [])]);
        console.log(
          "Appending page",
          page,
          "total now:",
          allStaff.length + (data.data?.length || 0),
        );
      }
      setTotalData(data.meta?.total || 0);
      setHasMore(page < data.meta?.totalPages);
    }
  }, [data, page]);

  // Load more staff (infinite scroll)
  const loadMoreStaff = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    console.log("Loading more... Next page:", page + 1);
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, [isLoadingMore, hasMore, page]);

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const response = await api.post("/users", {
        username: data.username,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        password: data.password,
      });
      return response.data;
    },
    onSuccess: () => {
      setPage(1);
      setAllStaff([]);
      setHasMore(true);
      refetch();
      setShowModal(false);
      resetForm();
      toast.success("Staff berhasil ditambahkan");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambah staff");
    },
  });

  // Update staff mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<StaffFormData>;
    }) => {
      const response = await api.patch(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      setPage(1);
      setAllStaff([]);
      setHasMore(true);
      refetch();
      setShowModal(false);
      resetForm();
      toast.success("Staff berhasil diupdate");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengupdate staff");
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.patch(`/users/${id}`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      setPage(1);
      setAllStaff([]);
      setHasMore(true);
      refetch();
      toast.success("Status staff berhasil diubah");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengubah status");
    },
  });

  // Delete staff mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      setPage(1);
      setAllStaff([]);
      setHasMore(true);
      refetch();
      setShowDeleteModal(false);
      setDeletingStaff(null);
      toast.success("Staff berhasil dihapus");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus staff");
    },
  });

  // Form handlers
  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      name: "",
      phone: "",
      role: "STAFF",
      password: "",
      confirmPassword: "",
    });
    setEditingStaff(null);
  };

  const handleOpenModal = (staff?: Staff) => {
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        username: staff.username,
        email: staff.email || "",
        name: staff.name,
        phone: staff.phone || "",
        role: staff.role,
        password: "",
        confirmPassword: "",
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi
    if (!formData.username.trim()) {
      toast.error("Username harus diisi");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Nama harus diisi");
      return;
    }

    // Validasi email jika diisi
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      toast.error("Format email tidak valid");
      return;
    }

    // Untuk create, password wajib
    if (!editingStaff) {
      if (!formData.password) {
        toast.error("Password harus diisi");
        return;
      }
      if (formData.password.length < 6) {
        toast.error("Password minimal 6 karakter");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Password dan konfirmasi password tidak sama");
        return;
      }
    } else {
      // Untuk edit, password opsional
      if (formData.password) {
        if (formData.password.length < 6) {
          toast.error("Password minimal 6 karakter");
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error("Password dan konfirmasi password tidak sama");
          return;
        }
      }
    }

    if (editingStaff) {
      // Hanya kirim field yang diubah
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate({ id: editingStaff.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleToggleActive = (staff: Staff) => {
    const newStatus = !staff.isActive;
    const action = newStatus ? "mengaktifkan" : "menonaktifkan";
    if (window.confirm(`Yakin ingin ${action} staff "${staff.name}"?`)) {
      toggleActiveMutation.mutate({ id: staff.id, isActive: newStatus });
    }
  };

  const handleDelete = (staff: Staff) => {
    if (staff.id === currentUser?.id) {
      toast.error("Tidak dapat menghapus akun sendiri");
      return;
    }
    setDeletingStaff(staff);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deletingStaff) {
      deleteMutation.mutate(deletingStaff.id);
    }
  };

  const isLoading = initialLoading && page === 1 && allStaff.length === 0;

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl p-8">
        <LockClosedIcon className="h-16 w-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Akses Dibatasi
        </h2>
        <p className="text-gray-600 text-center">
          Hanya user dengan role OWNER yang dapat mengakses halaman ini.
        </p>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Staff</h1>
          <p className="text-gray-600 mt-1">Kelola user dan staff toko</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Tambah Staff
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama/username/email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Semua Role</option>
            <option value="OWNER">OWNER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="CASHIER">KASIR</option>
            <option value="STAFF">STAFF</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter === "" ? "" : String(statusFilter)}
            onChange={(e) => {
              const val = e.target.value;
              setStatusFilter(val === "" ? "" : val === "true");
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Non-aktif</option>
          </select>

          {/* Reset Filters */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setRoleFilter("");
                setStatusFilter("");
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
          Menampilkan {allStaff.length} dari {totalData} staff
        </p>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  User
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Email
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Kontak
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Role
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Bergabung
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {allStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Tidak ada staff
                  </td>
                </tr>
              ) : (
                allStaff.map((staff, index) => {
                  const isLastItem = index === allStaff.length - 1;
                  const roleStyle = roleBadges[staff.role];

                  return (
                    <tr
                      key={staff.id}
                      ref={isLastItem ? (lastStaffRef as any) : null}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-sm text-gray-500">
                              @{staff.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm">{staff.email || "-"}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm">{staff.phone || "-"}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${roleStyle.bg} ${roleStyle.text}`}
                        >
                          {roleStyle.label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleActive(staff)}
                          disabled={staff.id === currentUser?.id}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            staff.isActive
                              ? "bg-green-100 text-green-600 hover:bg-green-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {staff.isActive ? "Aktif" : "Non-aktif"}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {new Date(staff.createdAt).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(staff)}
                            disabled={!isOwner}
                            className="text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(staff)}
                            disabled={!isOwner || staff.id === currentUser?.id}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Hapus"
                          >
                            <TrashIcon className="h-5 w-5" />
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

        {/* Loading indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-4 border-t border-gray-200">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* End of data message */}
        {!hasMore && allStaff.length > 0 && allStaff.length >= totalData && (
          <div className="text-center py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Semua data telah dimuat ({totalData} staff)
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {editingStaff ? "Edit Staff" : "Tambah Staff Baru"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={!!editingStaff}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email{" "}
                      <span className="text-gray-400 text-xs">(opsional)</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="staff@bumbuku.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Email asli untuk notifikasi dan reset password
                    </p>
                  </div>

                  {/* Nama Lengkap */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* No HP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      No HP (Opsional)
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="08123456789"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    >
                      <option value="STAFF">STAFF</option>
                      <option value="CASHIER">KASIR</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="OWNER">OWNER</option>
                    </select>
                  </div>

                  {/* Password - untuk create wajib, untuk edit opsional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password{" "}
                      {!editingStaff && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder={
                        editingStaff
                          ? "Kosongkan jika tidak diubah"
                          : "Minimal 6 karakter"
                      }
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Konfirmasi Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Menyimpan..."
                      : editingStaff
                        ? "Update"
                        : "Simpan"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Hapus Staff
              </h3>
              <p className="text-gray-600 mb-6">
                Apakah Anda yakin ingin menghapus staff{" "}
                <span className="font-semibold">{deletingStaff.name}</span>?
                <br />
                <span className="text-sm text-red-500">
                  Tindakan ini tidak dapat dibatalkan.
                </span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingStaff(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
