// frontend/src/pages/admin/Products.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PhotoIcon,
  ClockIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import MultiImageUpload from "../../components/features/products/MultiImageUpload";

interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  price: number;
  unit: string;
  category: {
    id: string;
    name: string;
  };
  stockQuantity: number;
  minStock: number;
  isActive: boolean;
  images?: ProductImage[];
}

interface Category {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  description?: string;
  categoryId: string;
  unit: string;
  sku?: string;
  minStock: number;
  price: number;
  initialStock?: number;
}

interface ImageFile {
  id: string;
  file?: File;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

// Format price dengan safe check
const formatPrice = (price: any) => {
  if (price === undefined || price === null) return "Rp 0";

  let numericPrice: number;
  if (typeof price === "string") {
    numericPrice = parseFloat(price);
  } else if (typeof price === "number") {
    numericPrice = price;
  } else {
    return "Rp 0";
  }

  if (isNaN(numericPrice) || numericPrice === 0) return "Rp 0";

  return `Rp ${numericPrice.toLocaleString("id-ID")}`;
};

const Products: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadedImages, setUploadedImages] = useState<ImageFile[]>([]);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    categoryId: "",
    unit: "Pcs",
    sku: "",
    minStock: 5,
    price: 0,
    initialStock: 0,
  });

  const observer = useRef<IntersectionObserver | null>(null);
  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch categories dengan safe check
  const { data: categories, isLoading: categoriesLoading } = useQuery<
    Category[]
  >({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get("/categories");
      const data = response.data;

      if (Array.isArray(data)) {
        return data;
      }

      if (data && Array.isArray(data.data)) {
        return data.data;
      }

      console.warn("Categories response is not an array:", data);
      return [];
    },
  });

  // Fetch products with infinite query
  const {
    data: productPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useInfiniteQuery({
    queryKey: ["admin-products", selectedCategory, debouncedSearch, showInactive],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append("page", pageParam.toString());
      params.append("limit", "20");
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (!showInactive) params.append("isActive", "true");

      const response = await api.get(`/products?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const allProducts = productPages?.pages.flatMap((page) => page.data) || [];
  const totalProducts = productPages?.pages[0]?.meta.total || 0;

  // Intersection Observer for infinite scroll
  const lastProductRef = useCallback(
    (node: HTMLTableRowElement) => {
      if (isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  const handleRefetch = useCallback(() => {
    refetchProducts();
  }, [refetchProducts]);

  // Handler untuk multiple images
  const handleImagesChange = (images: ImageFile[]) => {
    setUploadedImages(images);
  };

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      handleRefetch();
      closeModal();
      toast.success("Produk berhasil ditambahkan");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambahkan produk");
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      formData,
    }: {
      id: string;
      formData: FormData;
    }) => {
      const response = await api.patch(`/products/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      handleRefetch();
      closeModal();
      toast.success("Produk berhasil diupdate");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengupdate produk");
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/products/${id}`);
      return response.data;
    },
    onSuccess: () => {
      handleRefetch();
      toast.success("Produk berhasil dihapus");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus produk");
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.patch(`/products/${id}`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      handleRefetch();
      toast.success("Status produk berhasil diubah");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Gagal mengubah status produk",
      );
    },
  });

  // Open modal for create
  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      categoryId: categories && categories.length > 0 ? categories[0].id : "",
      unit: "Pcs",
      sku: "",
      minStock: 5,
      price: 0,
      initialStock: 0,
    });
    setUploadedImages([]);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: (product as any).description || "",
      categoryId: product.category.id,
      unit: product.unit,
      sku: product.sku,
      minStock: product.minStock,
      price: product.price,
      initialStock: 0,
    });

    // Konversi existing images ke format ImageFile
    if (product.images && product.images.length > 0) {
      const existingImages = product.images.map((img) => ({
        id: img.id,
        url: img.imageUrl,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      }));
      setUploadedImages(existingImages);
    } else {
      setUploadedImages([]);
    }

    setIsModalOpen(true);
  };

  // Handle delete
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus produk "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Handle toggle active
  const handleToggleActive = (product: Product) => {
    const newStatus = !product.isActive;
    const action = newStatus ? "mengaktifkan" : "menonaktifkan";
    if (window.confirm(`Yakin ingin ${action} produk "${product.name}"?`)) {
      toggleActiveMutation.mutate({ id: product.id, isActive: newStatus });
    }
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setUploadedImages([]);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nama produk harus diisi");
      return;
    }
    if (!formData.categoryId) {
      toast.error("Kategori harus dipilih");
      return;
    }
    if (formData.price <= 0) {
      toast.error("Harga harus lebih dari 0");
      return;
    }
    if (
      !editingProduct &&
      (!formData.initialStock || formData.initialStock <= 0)
    ) {
      toast.error("Stok awal harus diisi");
      return;
    }

    const formDataObj = new FormData();
    formDataObj.append("name", formData.name);
    formDataObj.append("description", formData.description || "");
    formDataObj.append("categoryId", formData.categoryId);
    formDataObj.append("unit", formData.unit);
    formDataObj.append("sku", formData.sku || "");
    formDataObj.append("minStock", formData.minStock.toString());
    formDataObj.append("price", formData.price.toString());

    if (!editingProduct) {
      formDataObj.append(
        "initialStock",
        formData.initialStock?.toString() || "0",
      );
    }

    // Upload multiple images
    uploadedImages.forEach((image) => {
      if (image.file) {
        formDataObj.append("images", image.file);
      }
    });

    // Jika edit dan ada gambar existing, kirim data order
    if (editingProduct && uploadedImages.length > 0) {
      const imageOrders = uploadedImages.map((img) => ({
        id: img.id.startsWith("new-") ? null : img.id,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      }));
      formDataObj.append("imageOrders", JSON.stringify(imageOrders));
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, formData: formDataObj });
    } else {
      createMutation.mutate(formDataObj);
    }
  };

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === "price" || name === "minStock" || name === "initialStock"
          ? parseFloat(value) || 0
          : value,
    });
  };

  // Dapatkan URL gambar utama
  const getPrimaryImageUrl = useCallback((product: Product) => {
    if (!product.images || product.images.length === 0) {
      return null;
    }
    const primary = product.images.find((img) => img.isPrimary);
    const imageUrl = primary ? primary.imageUrl : product.images[0].imageUrl;

    return imageUrl.startsWith("http")
      ? imageUrl
      : `http://localhost:3001${imageUrl}`;
  }, []);

  if (allProducts.length === 0 && productsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary-500/20 backdrop-blur-md p-2 rounded-xl border border-primary-500/30">
                <ArchiveBoxIcon className="h-6 w-6 text-primary-400" />
              </div>
              <span className="text-primary-400 font-bold uppercase tracking-widest text-xs">Produk Management</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">Katalog Produk</h1>
            <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
              <Squares2X2Icon className="h-4 w-4" />
              Kelola stok, harga, dan varian produk toko Anda
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Produk</p>
              <p className="text-2xl font-black">{totalProducts}</p>
            </div>
            <button
              onClick={handleAddNew}
              className="group bg-primary-500 hover:bg-primary-400 text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-primary-500/20 hover:shadow-primary-500/40 hover:-translate-y-1 flex items-center gap-3"
            >
              <PlusIcon className="h-6 w-6 transition-transform group-hover:rotate-90" />
              Tambah Produk
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Modern Filter Section */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white p-6 relative z-20 -mt-12 mx-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Search Bar */}
          <div className="md:col-span-4 relative group">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari SKU atau nama produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-medium text-slate-700"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3 relative">
            <FunnelIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none appearance-none font-medium text-slate-700 cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              {Array.isArray(categories) &&
                categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Status filter toggle */}
          <div className="md:col-span-3 flex items-center justify-center">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all border-2 ${
                showInactive
                  ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                  : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
              }`}
            >
              <ShieldCheckIcon className="h-5 w-5" />
              {showInactive ? "Tampilkan Semua" : "Hanya Aktif"}
            </button>
          </div>

          {/* Reset button */}
          <div className="md:col-span-2">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("");
                setShowInactive(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-4 text-slate-400 hover:text-rose-500 font-bold transition-colors group"
            >
              <ArrowPathIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Products Display */}
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden mx-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-5 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="py-5 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Produk</th>
                <th className="py-5 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Kategori</th>
                <th className="py-5 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Harga</th>
                <th className="py-5 px-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Stok</th>
                <th className="py-5 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {productsLoading && allProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Produk...</p>
                    </div>
                  </td>
                </tr>
              ) : allProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <ArchiveBoxIcon className="h-10 w-10 text-slate-300" />
                    </div>
                    <p className="text-slate-900 font-black text-lg">Tidak Ada Produk</p>
                    <p className="text-slate-400 font-medium">Coba ubah filter atau tambah produk baru</p>
                  </td>
                </tr>
              ) : (
                allProducts.map((product, index) => {
                  const isLastItem = index === allProducts.length - 1;
                  const primaryImage = getPrimaryImageUrl(product);
                  const isLowStock = product.stockQuantity <= product.minStock;
                  const isOutOfStock = product.stockQuantity <= 0;

                  return (
                    <tr
                      key={product.id}
                      ref={isLastItem ? lastProductRef : null}
                      className="group hover:bg-slate-50/80 transition-all duration-300"
                    >
                      <td className="py-6 px-6">
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${
                            product.isActive
                              ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${product.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></div>
                          {product.isActive ? "Aktif" : "Menon-aktif"}
                        </button>
                      </td>
                      <td className="py-6 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-50 shadow-sm group-hover:scale-105 transition-transform">
                            {primaryImage ? (
                              <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-slate-300">
                                <PhotoIcon className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight">
                              {product.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded uppercase">{product.sku}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">/ {product.unit}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider">{product.category.name}</span>
                      </td>
                      <td className="py-6 px-6 text-right">
                        <p className="font-black text-slate-900">{formatPrice(product.price)}</p>
                      </td>
                      <td className="py-6 px-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`px-4 py-1.5 rounded-2xl text-xs font-black shadow-sm ${
                            isOutOfStock
                              ? "bg-rose-500 text-white shadow-rose-200"
                              : isLowStock
                                ? "bg-amber-500 text-white shadow-amber-200"
                                : "bg-emerald-500 text-white shadow-emerald-200"
                          }`}>
                            {product.stockQuantity}
                          </span>
                          {isLowStock && !isOutOfStock && (
                            <span className="text-[10px] text-amber-600 font-black uppercase tracking-tighter mt-1">Stok Menipis</span>
                          )}
                          {isOutOfStock && (
                            <span className="text-[10px] text-rose-600 font-black uppercase tracking-tighter mt-1">Habis</span>
                          )}
                        </div>
                      </td>
                      <td className="py-6 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="h-10 w-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center hover:bg-sky-600 hover:text-white transition-all shadow-sm"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"
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

        {/* Load More Indicator */}
        {(isFetchingNextPage || hasNextPage) && (
          <div className="p-8 flex justify-center bg-slate-50/30">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Memuat lainnya...</span>
              </div>
            ) : (
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Scroll untuk memuat lebih banyak</p>
            )}
          </div>
        )}

        <div className="bg-slate-50 px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 font-bold text-xs">
          <p className="uppercase tracking-widest flex items-center gap-2">
            <span className="text-primary-600 font-black">{allProducts.length}</span>
            dari {totalProducts} Total Produk
          </p>
          {!hasNextPage && allProducts.length > 0 && (
            <span className="bg-primary-100 text-primary-600 px-4 py-1.5 rounded-full uppercase tracking-tighter">Semua produk telah ditampilkan</span>
          )}
        </div>
      </div>

      {/* Modern Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white flex flex-col">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-primary-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20">
                  {editingProduct ? <PencilIcon className="h-8 w-8" /> : <PlusIcon className="h-8 w-8" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{editingProduct ? "Edit Produk" : "Tambah Produk Baru"}</h2>
                  <p className="text-slate-400 font-medium text-sm">Lengkapi detail produk di bawah ini</p>
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
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Image Upload Selection */}
                <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100">
                   <div className="flex items-center gap-2 mb-4 px-2">
                      <PhotoIcon className="h-5 w-5 text-primary-500" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Galeri Foto Produk</h3>
                   </div>
                  <MultiImageUpload
                    existingImages={editingProduct?.images || []}
                    onImagesChange={handleImagesChange}
                    maxImages={10}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Basic Info Group */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4 px-2 border-l-4 border-primary-500">
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Informasi Dasar</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nama Produk <span className="text-rose-500 font-bold">*</span></label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-medium text-slate-700"
                        placeholder="Contoh: Bumbu Rendang Spesial"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Kategori <span className="text-rose-500 font-bold">*</span></label>
                        <select
                          name="categoryId"
                          value={formData.categoryId}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-medium text-slate-700 appearance-none cursor-pointer"
                          required
                        >
                          <option value="">Pilih Kategori</option>
                          {categories?.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Satuan <span className="text-rose-500 font-bold">*</span></label>
                        <select
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-medium text-slate-700 appearance-none cursor-pointer"
                        >
                          <option value="Pcs">Pcs</option>
                          <option value="Kg">Kg</option>
                          <option value="Pack">Pack</option>
                          <option value="Dus">Dus</option>
                          <option value="Botol">Botol</option>
                          <option value="Liter">Liter</option>
                        </select>
                      </div>
                    </div>

                     <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Deskripsi Produk</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-medium text-slate-700 resize-none"
                          placeholder="Jelaskan detail produk, bahan, atau cara simpan..."
                        />
                      </div>
                  </div>

                  {/* Inventory & Pricing Group */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4 px-2 border-l-4 border-amber-500">
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Inventaris & Harga</h3>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Harga Jual (Rp) <span className="text-rose-500 font-bold">*</span></label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-black text-xl text-primary-600"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* SKU */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Kode SKU</label>
                        <input
                          type="text"
                          name="sku"
                          value={formData.sku}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-mono text-sm"
                          placeholder="Auto-generate"
                        />
                      </div>

                      {/* Initial Stock - NEW ONLY */}
                      {!editingProduct && (
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 text-primary-600 underline">Stok Awal <span className="text-rose-500 font-bold">*</span></label>
                          <input
                            type="number"
                            name="initialStock"
                            value={formData.initialStock}
                            onChange={handleChange}
                            className="w-full px-5 py-4 bg-primary-50 border-2 border-primary-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-black text-primary-600 text-lg"
                            required
                          />
                        </div>
                      )}
                      
                      {/* Min Stock */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Minimum Stok</label>
                        <input
                          type="number"
                          name="minStock"
                          value={formData.minStock}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-bold"
                        />
                         <p className="text-[10px] text-slate-400 italic">Peringatan saat stok di bawah angka ini</p>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                        <div className="flex gap-3">
                           <ClockIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
                           <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                             Harap pastikan data stok dan harga sudah benar. Perubahan stok di masa depan dilakukan melalui modul <strong>Inventory / Stock Opname</strong>.
                           </p>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer (Always visible) */}
                <div className="flex gap-4 pt-8 border-t border-slate-50 sticky bottom-0 bg-white">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-[2] bg-primary-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                         <ShieldCheckIcon className="h-6 w-6" />
                         {editingProduct ? "Update Produk" : "Simpan Produk"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
