import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
        notes: notes || `Adjustment stok`,
      };

      let response;
      if (adjustmentType === "add") {
        response = await api.post("/inventory/stock/in", {
          ...payload,
          type: "IN",
        });
      } else {
        response = await api.post("/inventory/stock/out", {
          ...payload,
          type: "OUT",
        });
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(
        `Stok berhasil ${adjustmentType === "add" ? "ditambah" : "dikurangi"}`,
      );
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Adjust error:", error.response?.data);
      toast.error(error.response?.data?.message || "Gagal adjust stok");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }

    if (adjustmentType === "remove" && quantity > stock.quantity) {
      toast.error(`Stok tersedia hanya ${stock.quantity}`);
      return;
    }

    adjustMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">Adjust Stok</h2>
          <p className="text-gray-600 mb-6">
            {stock.product.name} ({stock.product.sku})
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Stok saat ini:{" "}
            <span className="font-semibold">
              {stock.quantity} {stock.product.unit}
            </span>
            {stock.batchCode && <> | Batch: {stock.batchCode}</>}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipe Adjustment
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="add"
                    checked={adjustmentType === "add"}
                    onChange={(e) => setAdjustmentType("add")}
                    className="mr-2"
                  />
                  <span>Tambah Stok</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="remove"
                    checked={adjustmentType === "remove"}
                    onChange={(e) => setAdjustmentType("remove")}
                    className="mr-2"
                  />
                  <span>Kurangi Stok</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jumlah
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
                max={adjustmentType === "remove" ? stock.quantity : undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Koreksi stok, barang rusak, dll"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={adjustMutation.isPending}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {adjustMutation.isPending ? "Memproses..." : "Simpan"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdjustStockModal;
