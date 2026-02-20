// frontend/src/components/inventory/StockHistoryModal.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  XMarkIcon,
  ShoppingBagIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowLeftEndOnRectangleIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  RectangleStackIcon
} from "@heroicons/react/24/outline";
import api from "../../services/api";

interface HistoryItem {
  id: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "EXPIRED" | "RETURN";
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  notes: string | null;
  createdAt: string;
  user?: {
    name: string;
  };
}

interface Props {
  productId: string;
  productName: string;
  onClose: () => void;
}

const StockHistoryModal: React.FC<Props> = ({
  productId,
  productName,
  onClose,
}) => {
  const {
    data: history,
    isLoading,
    error,
  } = useQuery<HistoryItem[]>({
    queryKey: ["stock-history", productId],
    queryFn: async () => {
      const response = await api.get(
        `/inventory/history?productId=${productId}&limit=50`,
      );
      return response.data.data;
    },
    retry: 1,
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "IN":
        return { label: "Stok Masuk", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: <ArrowLeftEndOnRectangleIcon className="h-5 w-5" /> };
      case "OUT":
        return { label: "Stok Keluar", color: "text-blue-600 bg-blue-50 border-blue-100", icon: <ArrowRightStartOnRectangleIcon className="h-5 w-5" /> };
      case "ADJUSTMENT":
        return { label: "Penyesuaian", color: "text-amber-600 bg-amber-50 border-amber-100", icon: <AdjustmentsHorizontalIcon className="h-5 w-5" /> };
      case "EXPIRED":
        return { label: "Kadaluarsa", color: "text-rose-600 bg-rose-50 border-rose-100", icon: <TrashIcon className="h-5 w-5" /> };
      case "RETURN":
        return { label: "Retur", color: "text-purple-600 bg-purple-50 border-purple-100", icon: <ArrowUturnLeftIcon className="h-5 w-5" /> };
      default:
        return { label: type, color: "text-slate-600 bg-slate-50 border-slate-100", icon: <RectangleStackIcon className="h-5 w-5" /> };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] max-w-4xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2.5 rounded-2xl shadow-lg text-white">
              <ShoppingBagIcon className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Log Mutasi Produk</h2>
              <p className="text-xs text-primary-600 font-black uppercase tracking-widest mt-0.5">{productName}</p>
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
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Menyusun Timeline...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100 mx-4">
              <ExclamationTriangleIcon className="h-16 w-16 text-rose-500 mx-auto mb-6 opacity-20" />
              <h3 className="text-xl font-black text-slate-900 mb-2">Gagal Memuat Mutasi</h3>
              <p className="text-slate-400 font-medium mb-8 max-w-xs mx-auto">
                {(error as any).response?.data?.message || "Terjadi kesalahan sistem saat mencoba mengambil data history."}
              </p>
              <button
                onClick={onClose}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all hover:bg-slate-800"
              >
                Tutup Jendela
              </button>
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-6 relative before:absolute before:left-[1.65rem] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">
              {history.map((item, idx) => {
                const style = getTypeStyle(item.type);
                return (
                  <div
                    key={item.id}
                    className="relative pl-14 animate-in slide-in-from-left duration-500"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Timeline Node */}
                    <div className={`absolute left-0 top-1 w-14 h-14 rounded-3xl border-4 border-white shadow-md flex items-center justify-center z-10 transition-transform hover:scale-110 ${style.color}`}>
                       {style.icon}
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group">
                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                          <div>
                             <span className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest leading-none ${style.color}`}>
                                {style.label}
                             </span>
                             <h4 className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-2">
                                <ClockIcon className="h-3 w-3" />
                                {formatDate(item.createdAt)}
                             </h4>
                          </div>
                          <div className="flex bg-slate-50 p-2 rounded-2xl gap-6">
                             <div className="text-center px-4 border-r border-slate-200">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Sebelum</p>
                                <p className="font-black text-slate-600">{item.stockBefore}</p>
                             </div>
                             <div className="text-center px-4 border-r border-slate-200">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Mutasi</p>
                                <p className={`font-black ${item.quantity > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                   {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                                </p>
                             </div>
                             <div className="text-center px-4">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Sisa Stok</p>
                                <p className="font-black text-slate-900">{item.stockAfter}</p>
                             </div>
                          </div>
                       </div>

                       {item.notes && (
                         <div className="bg-slate-50 rounded-2xl p-4 mb-4 border-l-4 border-slate-200">
                            <p className="text-sm font-medium text-slate-600 italic">"{item.notes}"</p>
                         </div>
                       )}

                       {item.user && (
                         <div className="flex items-center gap-2 text-slate-400 group-hover:text-primary-600 transition-colors">
                            <UserCircleIcon className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Oleh: {item.user.name}</span>
                         </div>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                  <RectangleStackIcon className="h-10 w-10" />
               </div>
               <h3 className="text-xl font-black text-slate-900 mb-2">Kosong Melompong</h3>
               <p className="text-slate-400 font-medium max-w-xs mx-auto">Produk ini belum memiliki riwayat pergerakan stok sama sekali.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-8 border-t border-slate-50 bg-white items-center flex justify-between">
           <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
             Records: <span className="text-slate-900">{history?.length || 0}</span> Entries
           </div>
           <button
             onClick={onClose}
             className="px-10 py-4 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all hover:bg-slate-800 hover:-translate-y-1 active:scale-95 shadow-xl shadow-slate-900/10"
           >
             Selesai
           </button>
        </div>
      </div>
    </div>
  );
};

// Simple Icon Components for fallback or consistent style
const ClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default StockHistoryModal;
