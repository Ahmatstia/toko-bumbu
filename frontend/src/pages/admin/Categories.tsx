// frontend/src/pages/admin/Categories.tsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  description: string | null;
  productCount?: number;
  createdAt: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CategoriesResponse {
  data: Category[];
  meta: Meta;
}

const Categories: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );

  // Pagination states - SEMENTARA PAKAI PAGINATION BIASA
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset ke halaman 1 saat search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ========== FETCH CATEGORIES DENGAN DEPENDENCY YANG JELAS ==========
  const { data, isLoading, isFetching, refetch, error } =
    useQuery<CategoriesResponse>({
      queryKey: ["admin-categories", debouncedSearch, currentPage],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append("search", debouncedSearch);
        params.append("page", currentPage.toString());
        params.append("limit", limit.toString());
        params.append("sortBy", "createdAt");
        params.append("sortOrder", "desc");

        console.log("Fetching with params:", params.toString());
        console.log("Current page:", currentPage);
        console.log("Search:", debouncedSearch);

        const response = await api.get(`/categories?${params.toString()}`);
        console.log("Response data:", response.data);
        return response.data;
      },
      // Pastikan query jalan
      enabled: true,
      // Refetch on mount
      refetchOnMount: true,
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Stale time 0 agar selalu fetch ulang
      staleTime: 0,
    });

  // Log data untuk debugging
  useEffect(() => {
    console.log("Query data:", data);
    console.log("Is Loading:", isLoading);
    console.log("Is Fetching:", isFetching);
    console.log("Error:", error);
  }, [data, isLoading, isFetching, error]);

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await api.post("/categories", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate query untuk refetch
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setShowModal(false);
      resetForm();
      toast.success("Kategori berhasil ditambahkan");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambah kategori");
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; description?: string };
    }) => {
      const response = await api.patch(`/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setShowModal(false);
      resetForm();
      toast.success("Kategori berhasil diupdate");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengupdate kategori");
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setShowDeleteModal(false);
      setDeletingCategory(null);
      toast.success("Kategori berhasil dihapus");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus kategori");
    },
  });

  // Form handlers
  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingCategory(null);
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || "",
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nama kategori harus diisi");
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        description: formData.description || undefined,
      });
    }
  };

  const handleDelete = (category: Category) => {
    setDeletingCategory(category);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deletingCategory) {
      deleteMutation.mutate(deletingCategory.id);
    }
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600 text-center">
          <p className="text-lg font-semibold">Error loading data</p>
          <p className="text-sm">
            {(error as any)?.message || "Terjadi kesalahan"}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const categories = data?.data || [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Manajemen Kategori
          </h1>
          <p className="text-gray-600 mt-1">Kelola kategori produk</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Tambah Kategori
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kategori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Results Info */}
      <div className="flex justify-between items-center px-4">
        <p className="text-sm text-gray-600">
          Menampilkan {categories.length} dari {meta?.total || 0} kategori
          {searchTerm && ` (pencarian: "${searchTerm}")`}
        </p>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <XMarkIcon className="h-4 w-4" />
            Hapus Filter
          </button>
        )}
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Nama Kategori
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Deskripsi
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Jumlah Produk
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Tanggal Dibuat
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    {searchTerm
                      ? "Tidak ada kategori yang sesuai pencarian"
                      : "Belum ada kategori"}
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-4 px-6 font-medium">{category.name}</td>
                    <td className="py-4 px-6 text-gray-600">
                      {category.description || "-"}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 bg-primary-100 text-primary-600 rounded-full text-xs">
                        {category.productCount || 0} produk
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {new Date(category.createdAt).toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(category)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="text-red-600 hover:text-red-700"
                          title="Hapus"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 py-4 border-t border-gray-200">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || isFetching}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            <span className="px-4 py-1">
              Halaman {currentPage} dari {totalPages}
            </span>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || isFetching}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {isFetching && (
          <div className="flex justify-center py-4 border-t border-gray-200">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
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

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Kategori <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Contoh: Bumbu Instan"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deskripsi (Opsional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Deskripsi kategori..."
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
                      : "Simpan"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Hapus Kategori
              </h3>
              <p className="text-gray-600 mb-6">
                Apakah Anda yakin ingin menghapus kategori{" "}
                <span className="font-semibold">{deletingCategory.name}</span>?
                <br />
                <span className="text-sm text-red-500">
                  Kategori yang memiliki produk tidak dapat dihapus.
                </span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingCategory(null);
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

export default Categories;
