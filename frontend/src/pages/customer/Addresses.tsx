import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";

const Addresses: React.FC = () => {
  const { data: addresses, isLoading } = useQuery({
    queryKey: ["customer-addresses"],
    queryFn: async () => {
      const response = await api.get("/customer/addresses");
      return response.data;
    },
  });

  if (isLoading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Alamat Saya</h1>
      {!addresses?.length ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-600 mb-4">Belum ada alamat tersimpan</p>
          <button className="btn-primary">Tambah Alamat Baru</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {addresses.map((addr: any) => (
            <div key={addr.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-lg">{addr.label}</h3>
                    {addr.isDefault && (
                      <span className="bg-primary-100 text-primary-600 text-xs px-2 py-1 rounded">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-1">{addr.recipientName}</p>
                  <p className="text-gray-600 mb-1">{addr.recipientPhone}</p>
                  <p className="text-gray-600">{addr.address}</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {addr.city}, {addr.province} {addr.postalCode}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="text-primary-600 hover:text-primary-800">
                    Edit
                  </button>
                  {!addr.isDefault && (
                    <button className="text-red-600 hover:text-red-800">
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Addresses;
