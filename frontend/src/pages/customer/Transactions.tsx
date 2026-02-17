import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const Transactions: React.FC = () => {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["customer-transactions"],
    queryFn: async () => {
      const response = await api.get("/transactions/customer/history");
      return response.data;
    },
  });

  if (isLoading) return <div className="text-center py-12">Loading...</div>;

  if (!transactions?.length) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold mb-4">Riwayat Transaksi</h1>
        <p className="text-gray-600 mb-6">Belum ada transaksi</p>
        <Link to="/products" className="btn-primary">
          Mulai Belanja
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Riwayat Transaksi</h1>
      <div className="space-y-4">
        {transactions.map((trx: any) => (
          <div key={trx.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">{trx.invoiceNumber}</h3>
                <p className="text-sm text-gray-500">
                  {format(new Date(trx.createdAt), "dd MMMM yyyy, HH:mm", {
                    locale: id,
                  })}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  trx.status === "COMPLETED"
                    ? "bg-green-100 text-green-600"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                {trx.status}
              </span>
            </div>

            <div className="border-t pt-4">
              {trx.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm mb-2"
                >
                  <span>
                    {item.product.name} x {item.quantity}
                  </span>
                  <span>
                    Rp {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary-600">
                Rp {parseFloat(trx.total).toLocaleString()}
              </span>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>Pembayaran: {trx.paymentMethod}</p>
              <p>
                Kembalian: Rp {parseFloat(trx.changeAmount).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Transactions;
