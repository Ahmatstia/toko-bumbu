// frontend/src/components/inventory/AdjustStockModal.tsx
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  XMarkIcon, 
  ArrowPathIcon,
  DocumentTextIcon,
  CircleStackIcon,
  BarsArrowUpIcon,
  BarsArrowDownIcon
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import toast from "react-hot-toast";

interface StockItem {
  id: string;
  productId: string;
  product: {
    name: string;
    sku: string;
    unit: string;
  };
  quantity: number;
  batchCode: string | null;
}

interface Props {
  stock: StockItem;
  onClose: () => void;
  onSuccess: () => void;
}

const AdjustStockModal: React.FC<Props> = ({ stock, onClose, onSuccess }) => {
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const queryClient = useQueryClient();

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        productId: stock.productId,
        quantity: quantity,
        batchCode: stock.batchCode || undefined,
        notes: notes || `Adjustment stok via Admin Dashboard`,
      };

      if (adjustmentType === "add") {
        return api.post("/inventory/stock/in", { ...payload, type: "IN" });
      } else {
        return api.post("/inventory/stock/out", { ...payload, type: "OUT" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(`Stok berhasil ${adjustmentType === "add" ? "ditambah" : "dikurangi"}`);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal melakukan penyesuaian stok");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error("Jumlah penyesuaian harus lebih dari 0");
      return;
    }
    if (adjustmentType === "remove" && quantity > stock.quantity) {
      toast.error(`Stok tersedia hanya ${stock.quantity}, tidak bisa mengurangi lebih dari itu`);
      return;
    }
    adjustMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        {/* Modal Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-sky-500 p-2.5 rounded-2xl shadow-lg shadow-sky-500/20 text-white">
              <ArrowPathIcon className="h-6 w-6 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Adjust Stok</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Penyesuaian Manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 rounded-2xl transition-all shadow-sm hover:shadow-md"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
           {/* Product Info Card */}
            <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Target Produk</p>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{stock.product?.name ?? "Produk"}</h3>
              <div className="flex items-center gap-3 mt-3">
                 <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-600 tracking-tighter shadow-sm">{stock.product?.sku ?? "-"}</span>
                 <div className="h-1 w-1 bg-slate-200 rounded-full"></div>
                 <p className="text-xs font-bold text-slate-500 tracking-tight">
                    Stok: <span className="text-primary-600">{stock.quantity} {stock.product?.unit ?? "-"}</span>
                 </p>
              </div>
           </div>

           {/* Adjustment Type Switcher */}
           <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipe Penyesuaian</label>
              <div className="grid grid-cols-2 gap-4">
                 <button
                    type="button"
                    onClick={() => setAdjustmentType("add")}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${
                      adjustmentType === "add" 
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600 shadow-md" 
                      : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                    }`}
                 >
                    <BarsArrowUpIcon className="h-5 w-5" />
                    Tambah
                 </button>
                 <button
                    type="button"
                    onClick={() => setAdjustmentType("remove")}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${
                      adjustmentType === "remove" 
                      ? "border-rose-500 bg-rose-50 text-rose-600 shadow-md" 
                      : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                    }`}
                 >
                    <BarsArrowDownIcon className="h-5 w-5" />
                    Kurangi
                 </button>
              </div>
           </div>

           {/* Quantity & Notes */}
           <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Jumlah Perubahan</label>
                <div className="relative group">
                  <CircleStackIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-black text-xl text-slate-700 shadow-inner group-hover:bg-white"
                      required
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase tracking-widest text-[10px]">{stock.product?.unit ?? "-"}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Alasan / Catatan</label>
                <div className="relative group">
                   <DocumentTextIcon className="absolute left-4 top-4 h-6 w-6 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Koreksi stok fisik, barang rusak di gudang..."
                      rows={2}
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-medium text-slate-700 placeholder:text-slate-300 shadow-inner group-hover:bg-white"
                    />
                </div>
              </div>
           </div>

           {/* Submit */}
           <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={adjustMutation.isPending}
                className={`flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] ${
                  adjustmentType === "add" 
                  ? "bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-500" 
                  : "bg-rose-600 text-white shadow-rose-500/20 hover:bg-rose-500"
                } disabled:opacity-50`}
              >
                {adjustMutation.isPending ? (
                   <span className="animate-pulse">Memproses...</span>
                ) : (
                  <>
                    Konfirmasi {adjustmentType === "add" ? "Penambahan" : "Pengurangan"}
                  </>
                )}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustStockModal;
