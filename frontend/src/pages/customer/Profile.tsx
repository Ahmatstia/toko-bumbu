import React from "react";
import { useQuery } from "@tanstack/react-query";
import { authService } from "../../services/auth.service";
import api from "../../services/api";

const Profile: React.FC = () => {
  const user = authService.getCurrentUser();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: async () => {
      const response = await api.get("/customer/auth/profile");
      return response.data;
    },
  });

  if (isLoading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Profile Customer</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Nama
            </label>
            <p className="text-lg font-semibold">
              {profile?.name || user?.name}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Email
            </label>
            <p className="text-lg">{profile?.email || user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">
              No. HP
            </label>
            <p className="text-lg">{profile?.phone || user?.phone || "-"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Total Transaksi
              </label>
              <p className="text-2xl font-bold text-primary-600">
                {profile?.totalTransactions || 0}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Total Belanja
              </label>
              <p className="text-2xl font-bold text-primary-600">
                Rp {(profile?.totalSpent || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
