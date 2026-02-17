import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import toast from 'react-hot-toast';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profilePicture: string | null;
  totalPoints: number;
  totalTransactions: number;
  totalSpent: number;
  createdAt: string;
}

const Profile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
  });
  
  const queryClient = useQueryClient();
  const user = authService.getCurrentUser();

  // Fetch profile
  const { data: profile, isLoading } = useQuery<CustomerProfile>({
    queryKey: ['customer-profile'],
    queryFn: async () => {
      const response = await api.get('/customer/auth/profile');
      return response.data;
    },
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const response = await api.patch('/customer/profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-profile'] });
      setIsEditing(false);
      toast.success('Profile berhasil diperbarui');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui profile');
    },
  });

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Format price
  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  // Handle edit
  const handleEdit = () => {
    setEditForm({
      name: profile?.name || '',
      phone: profile?.phone || '',
    });
    setIsEditing(true);
  };

  // Handle cancel
  const handleCancel = () => {
    setIsEditing(false);
  };

  // Handle save
  const handleSave = () => {
    if (!editForm.name.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }
    updateMutation.mutate(editForm);
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile Saya</h1>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PencilIcon className="h-5 w-5" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-600"></div>
        
        {/* Profile Content */}
        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex justify-center -mt-16 mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
              {profile?.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-gray-400">
                  {profile?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Edit Mode */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. Handphone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <CheckIcon className="h-5 w-5" />
                  Simpan
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                  Batal
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
                {profile?.name}
              </h2>
              <p className="text-center text-gray-500 mb-6">{profile?.email}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-primary-600">
                    {profile?.totalTransactions || 0}
                  </p>
                  <p className="text-sm text-gray-600">Transaksi</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-primary-600">
                    {profile?.totalPoints || 0}
                  </p>
                  <p className="text-sm text-gray-600">Poin</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-primary-600">
                    {formatPrice(profile?.totalSpent || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Total Belanja</p>
                </div>
              </div>

              {/* Info List */}
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium">{profile?.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">No. Handphone</span>
                  <span className="font-medium">{profile?.phone || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Member Sejak</span>
                  <span className="font-medium">
                    {profile?.createdAt ? formatDate(profile.createdAt) : '-'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;