// frontend/src/components/inventory/AddStockModal.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  XMarkIcon, 
  ArchiveBoxIcon, 
  CircleStackIcon, 
  CurrencyDollarIcon, 
  CalendarDaysIcon,
  DocumentTextIcon,
  TagIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const AddStockModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    productId: "",
    quantity: 1,
    batchCode: "",
    expiryDate: "",
    purchasePrice: 0,
    sellingPrice: 0,
    notes: "",
  });

  const queryClient = useQueryClient();

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["products-dropdown"],
    queryFn: async () => {
      const response = await api.get("/products/all/dropdown");
      return response.data;
    },
  });

  // Add stock mutation
  const addStockMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        productId: data.productId,
        quantity: data.quantity,
        batchCode: data.batchCode || undefined,
        expiryDate: data.expiryDate || undefined,
        purchasePrice: data.purchasePrice || 0,
        sellingPrice: data.sellingPrice || 0,
        notes: data.notes || "Tambah stok manual",
        type: "IN",
      };

      const response = await api.post("/inventory/stock/in", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Stok berhasil ditambahkan ke gudang");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambahkan stok");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId) {
      toast.error("Silakan pilih produk terlebih dahulu");
      return;
    }
    if (formData.quantity <= 0) {
      toast.error("Jumlah stok harus lebih dari 0");
      return;
    }
    if (formData.sellingPrice <= 0) {
      toast.error("Harga jual harus diisi");
      return;
    }

    addStockMutation.mutate(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === "quantity" ||
        name === "purchasePrice" ||
        name === "sellingPrice"
          ? parseFloat(value) || 0
          : value,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-primary-500 p-2.5 rounded-2xl shadow-lg shadow-primary-500/20 text-white">
              <PlusIcon className="h-6 w-6 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tambah Stok Baru</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Inventory Transaction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 rounded-2xl transition-all shadow-sm hover:shadow-md"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <form id="add-stock-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Product Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary-600 mb-2">
                <ArchiveBoxIcon className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-[0.15em]">Informasi Produk</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Pilih Produk <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group">
                    <TagIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    <select
                      name="productId"
                      value={formData.productId}
                      onChange={handleChange}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-bold text-slate-700 appearance-none shadow-inner group-hover:bg-white"
                      required
                      disabled={productsLoading}
                    >
                      <option value="">{productsLoading ? "Memuat..." : "Cari & Pilih Produk"}</option>
                      {products?.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku} - {product.unit})
                        </option>
                      ))}
                    </select>
                    <ChevronRightIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none rotate-90" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Jumlah Stok <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group text-center">
                    <CircleStackIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      min="1"
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-black text-slate-700 shadow-inner group-hover:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Kode Batch
                  </label>
                  <div className="relative group text-center">
                    <DocumentTextIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    <input
                      type="text"
                      name="batchCode"
                      value={formData.batchCode}
                      onChange={handleChange}
                      placeholder="BATCH-XXX"
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300 shadow-inner group-hover:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Pricing & Expiry */}
            <div className="space-y-4 pt-4 border-t border-slate-50">
               <div className="flex items-center gap-2 text-primary-600 mb-2">
                <CurrencyDollarIcon className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-[0.15em]">Harga & Masa Berlaku</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Harga Beli
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm group-focus-within:text-primary-500 transition-colors">Rp</span>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      min="0"
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-black text-slate-700 shadow-inner group-hover:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Harga Jual <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group text-center">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm group-focus-within:text-primary-500 transition-colors">Rp</span>
                    <input
                      type="number"
                      name="sellingPrice"
                      value={formData.sellingPrice}
                      onChange={handleChange}
                      min="0"
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-black text-slate-700 shadow-inner group-hover:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Tanggal Kadaluarsa
                  </label>
                  <div className="relative group text-center">
                    <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-bold text-slate-700 shadow-inner group-hover:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Notes */}
            <div className="space-y-4 pt-4 border-t border-slate-50">
               <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Catatan Tambahan
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Misal: Stok sisa pengiriman supplier A..."
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-medium text-slate-700 placeholder:text-slate-300 shadow-inner group-hover:bg-white"
                  />
                </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-400 font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all hover:bg-slate-50 hover:text-slate-600 active:scale-[0.98]"
          >
            Batal
          </button>
          <button
            form="add-stock-form"
            type="submit"
            disabled={addStockMutation.isPending}
            className="flex-[2] px-6 py-4 bg-primary-600 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all hover:bg-primary-500 hover:-translate-y-1 active:scale-[0.98] shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none inline-flex items-center justify-center gap-3"
          >
            {addStockMutation.isPending ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin stroke-[3]" />
                Menyimpan...
              </>
            ) : (
              <>
                Simpan & Update Stok
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// UI Components
const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export default AddStockModal;
