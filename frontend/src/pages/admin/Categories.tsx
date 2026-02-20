import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  Squares2X2Icon,
  XCircleIcon,

  ChevronLeftIcon,
  ChevronRightIcon,
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

  // Pagination states
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

  // Fetch categories
  const { data, isLoading, isFetching, refetch } =
    useQuery<CategoriesResponse>({
      queryKey: ["admin-categories", debouncedSearch, currentPage],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append("search", debouncedSearch);
        params.append("page", currentPage.toString());
        params.append("limit", limit.toString());
        params.append("sortBy", "createdAt");
        params.append("sortOrder", "desc");

        const response = await api.get(`/categories?${params.toString()}`);
        return response.data;
      },
    });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await api.post("/categories", data);
      return response.data;
    },
    onSuccess: () => {
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

  const closeModal = () => {
    setShowModal(false);
    resetForm();
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

  const categories = data?.data || [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages || 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary-500/20 backdrop-blur-md p-2 rounded-xl border border-primary-500/30">
                <TagIcon className="h-6 w-6 text-primary-400" />
              </div>
              <span className="text-primary-400 font-bold uppercase tracking-widest text-xs">Categories Management</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">Kategori Produk</h1>
            <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
              <Squares2X2Icon className="h-4 w-4" />
              Atur dan klasifikasikan produk toko Anda
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Kategori</p>
              <p className="text-2xl font-black">{meta?.total || 0}</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="group bg-primary-500 hover:bg-primary-400 text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-primary-500/20 hover:shadow-primary-500/40 hover:-translate-y-1 flex items-center gap-3"
            >
              <PlusIcon className="h-6 w-6 transition-transform group-hover:rotate-90" />
              Tambah Kategori
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Modern Search Section */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white p-6 relative z-20 -mt-12 mx-4">
        <div className="max-w-md relative group">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            placeholder="Cari kategori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-medium text-slate-700"
          />
        </div>
      </div>

      {/* Categories Table Container */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-5 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Kategori</th>
                <th className="py-5 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Deskripsi</th>
                <th className="py-5 px-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Statistik</th>
                <th className="py-5 px-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Dibuat Pada</th>
                <th className="py-5 px-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && !data ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Kategori...</p>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <TagIcon className="h-10 w-10 text-slate-300" />
                    </div>
                    <p className="text-slate-900 font-black text-lg">Tidak Ada Kategori</p>
                    <p className="text-slate-400 font-medium">Tambah kategori baru untuk memulai</p>
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="group hover:bg-slate-50/80 transition-all duration-300"
                  >
                    <td className="py-6 px-8 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-primary-500 shadow-inner group-hover:scale-110 transition-transform">
                          <TagIcon className="h-6 w-6" />
                        </div>
                        <p className="font-black text-slate-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight text-sm">
                          {category.name}
                        </p>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <p className="text-slate-500 font-medium text-xs line-clamp-1 max-w-xs">{category.description || "-"}</p>
                    </td>
                    <td className="py-6 px-8 text-center">
                      <span className="bg-primary-50 text-primary-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                        {category.productCount || 0} Produk
                      </span>
                    </td>
                    <td className="py-6 px-8 text-center text-xs text-slate-400 font-bold">
                      {new Date(category.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-6 px-8 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(category)}
                          className="h-10 w-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center hover:bg-sky-600 hover:text-white transition-all shadow-sm"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"
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

        {/* Footer & Pagination */}
        <div className="bg-slate-50 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-100">
          <div className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="text-primary-600 font-black">{categories.length}</span>
            dari {meta?.total || 0} Total Kategori
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || isFetching}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-md"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => goToPage(i + 1)}
                  className={`w-9 h-9 rounded-xl font-black text-xs transition-all ${
                    currentPage === i + 1
                      ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                      : "bg-white text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || isFetching}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-md"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Premium Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-white flex flex-col">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-primary-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20">
                  {editingCategory ? <PencilIcon className="h-8 w-8" /> : <PlusIcon className="h-8 w-8" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{editingCategory ? "Edit Kategori" : "Kategori Baru"}</h2>
                  <p className="text-slate-400 font-medium text-sm">Lengkapi detail kategori produk</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="h-10 w-10 text-slate-400 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all"
              >
                <XCircleIcon className="h-8 w-8" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
                    Nama Kategori <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                    placeholder="Contoh: Bumbu Rendang"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                    placeholder="Jelaskan secara singkat mengenai kategori ini..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-100 transition-all"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-[2] bg-primary-600 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-primary-500/20 hover:bg-primary-500 hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? "MENYIMPAN..." : "SIMPAN KATEGORI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Delete Confirmation */}
      {showDeleteModal && deletingCategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 border border-white relative overflow-hidden">
            <div className="relative z-10 text-center">
              <div className="h-20 w-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-rose-50/50">
                <TrashIcon className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Hapus Kategori?</h3>
              <p className="text-slate-500 font-medium mb-8 px-4">
                Apakah Anda yakin ingin menghapus kategori <span className="font-black text-slate-900">"{deletingCategory.name}"</span>?
                {deletingCategory.productCount && deletingCategory.productCount > 0 && (
                   <span className="block mt-4 text-xs bg-rose-50 text-rose-600 p-3 rounded-xl border border-rose-100">
                     <span className="block font-black uppercase tracking-widest mb-1 text-[10px]">Peringatan</span>
                     Kategori ini memiliki {deletingCategory.productCount} produk dan tidak dapat dihapus sebelum produknya dipindahkan.
                   </span>
                )}
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-all"
                >
                  BATAL
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending || (deletingCategory.productCount ? deletingCategory.productCount > 0 : false)}
                  className="flex-[1.5] bg-rose-600 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-rose-500/20 hover:bg-rose-500 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {deleteMutation.isPending ? "MENGHAPUS..." : "YA, HAPUS"}
                </button>
              </div>
            </div>
            
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-rose-50 rounded-full opacity-50"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
