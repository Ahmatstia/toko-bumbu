// frontend/src/pages/admin/Products.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // ========== STATE UNTUK MULTIPLE IMAGES ==========
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

  // Fetch initial products
  const fetchProducts = async (pageNum: number, reset: boolean = false) => {
    try {
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", "20");
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (searchTerm) params.append("search", searchTerm);

      if (!showInactive) {
        params.append("isActive", "true");
      }

      const response = await api.get(`/products?${params.toString()}`);

      // Fetch stock untuk setiap produk
      const products = response.data.data;
      const productsWithStock = await Promise.all(
        products.map(async (product: any) => {
          try {
            const stockResponse = await api.get(
              `/inventory/stock?productId=${product.id}`,
            );
            const stocks = stockResponse.data.stocks || [];
            const totalStock = stocks.reduce(
              (sum: number, s: any) => sum + (s.quantity || 0),
              0,
            );

            let price = product.price;
            if (stocks.length > 0 && stocks[0].sellingPrice) {
              price = stocks[0].sellingPrice;
            }

            return {
              ...product,
              price: Number(price) || 0,
              stockQuantity: totalStock,
            };
          } catch {
            return {
              ...product,
              price: Number(product.price) || 0,
              stockQuantity: 0,
            };
          }
        }),
      );

      return {
        data: productsWithStock,
        meta: response.data.meta,
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      return null;
    }
  };

  // Load initial products
  const loadInitialProducts = useCallback(async () => {
    setPage(1);
    setIsLoadingMore(true);
    const result = await fetchProducts(1);
    if (result) {
      setAllProducts(result.data);
      setHasMore(result.meta.page < result.meta.totalPages);
      setTotalProducts(result.meta.total);
    }
    setIsLoadingMore(false);
  }, [selectedCategory, searchTerm, showInactive]);

  // Load more products
  const loadMoreProducts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    const result = await fetchProducts(nextPage);

    if (result) {
      setAllProducts((prev) => [...prev, ...result.data]);
      setPage(nextPage);
      setHasMore(result.meta.page < result.meta.totalPages);
    }

    setIsLoadingMore(false);
  }, [
    isLoadingMore,
    hasMore,
    page,
    selectedCategory,
    searchTerm,
    showInactive,
  ]);

  // Effect untuk memuat ulang saat filter berubah
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadInitialProducts();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedCategory, searchTerm, showInactive, loadInitialProducts]);

  // Intersection Observer untuk infinite scroll
  const lastProductRef = useCallback(
    (node: HTMLTableRowElement) => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreProducts();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore, loadMoreProducts],
  );

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
      loadInitialProducts();
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
      loadInitialProducts();
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
      loadInitialProducts();
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
      loadInitialProducts();
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
  const getPrimaryImageUrl = (product: Product) => {
    if (!product.images || product.images.length === 0) {
      return null;
    }
    const primary = product.images.find((img) => img.isPrimary);
    return primary ? primary.imageUrl : product.images[0].imageUrl;
  };

  if (allProducts.length === 0 && isLoadingMore) {
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
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Produk</h1>
          <p className="text-gray-600 mt-1">Kelola produk toko Anda</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Tambah Produk
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
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Semua Kategori</option>
            {Array.isArray(categories) &&
              categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
          </select>

          {/* Show Inactive Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Tampilkan produk non-aktif
            </span>
          </label>

          {/* Reset Filters */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("");
                setShowInactive(false);
              }}
              className="text-gray-600 hover:text-primary-600 flex items-center gap-2"
            >
              <FunnelIcon className="h-5 w-5" />
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Gambar
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  SKU
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Nama Produk
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Kategori
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Harga
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Stok
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Min Stok
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Unit
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {allProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">
                    Tidak ada produk
                  </td>
                </tr>
              ) : (
                allProducts.map((product, index) => {
                  const isLastItem = index === allProducts.length - 1;
                  const primaryImage = getPrimaryImageUrl(product);

                  return (
                    <tr
                      key={product.id}
                      ref={isLastItem ? lastProductRef : null}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-6">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                          {primaryImage ? (
                            <img
                              src={
                                primaryImage.startsWith("http")
                                  ? primaryImage
                                  : `http://localhost:3001${primaryImage}`
                              }
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <PhotoIcon className="h-6 w-6" />
                            </div>
                          )}
                          {product.images && product.images.length > 1 && (
                            <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                              {product.images.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-sm">
                        {product.sku}
                      </td>
                      <td className="py-4 px-6 font-medium">{product.name}</td>
                      <td className="py-4 px-6">{product.category.name}</td>
                      <td className="py-4 px-6 font-semibold">
                        {formatPrice(product.price)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            product.stockQuantity === 0
                              ? "bg-red-100 text-red-600"
                              : product.stockQuantity < product.minStock
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-green-100 text-green-600"
                          }`}
                        >
                          {product.stockQuantity}
                        </span>
                      </td>
                      <td className="py-4 px-6">{product.minStock}</td>
                      <td className="py-4 px-6">{product.unit}</td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            product.isActive
                              ? "bg-green-100 text-green-600 hover:bg-green-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {product.isActive ? "Aktif" : "Non-aktif"}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(product.id, product.name)
                            }
                            className="text-red-600 hover:text-red-700"
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

        {/* Loading Indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Info Total */}
        <div className="px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Menampilkan {allProducts.length} dari {totalProducts} produk
            {!hasMore &&
              allProducts.length > 0 &&
              " (Semua produk telah ditampilkan)"}
          </p>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-8">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ========== MULTIPLE IMAGE UPLOAD ========== */}
                <div>
                  <MultiImageUpload
                    existingImages={editingProduct?.images || []}
                    onImagesChange={handleImagesChange}
                    maxImages={10}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nama Produk */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Produk <span className="text-red-500">*</span>
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

                  {/* Kategori */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kategori <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    >
                      <option value="">Pilih Kategori</option>
                      {Array.isArray(categories) &&
                        categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Harga */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Harga Jual <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      min="0"
                      step="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Stok Awal - hanya untuk produk baru */}
                  {!editingProduct && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stok Awal <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="initialStock"
                        value={formData.initialStock}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Jumlah stok awal untuk produk baru
                      </p>
                    </div>
                  )}

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Satuan <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Kg">Kg</option>
                      <option value="Pack">Pack</option>
                      <option value="Dus">Dus</option>
                      <option value="Botol">Botol</option>
                      <option value="Liter">Liter</option>
                    </select>
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU (Opsional)
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Auto-generate jika kosong"
                    />
                  </div>

                  {/* Min Stok */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Stok
                    </label>
                    <input
                      type="number"
                      name="minStock"
                      value={formData.minStock}
                      onChange={handleChange}
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* Deskripsi - Full width */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deskripsi (Opsional)
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Menyimpan..."
                      : editingProduct
                        ? "Update Produk"
                        : "Simpan Produk"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
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
