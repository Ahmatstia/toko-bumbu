import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  HomeIcon, 
  BuildingOfficeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Address {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault: boolean;
  notes?: string;
}

interface AddressFormData {
  label: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault: boolean;
  notes?: string;
}

const Addresses: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    label: '',
    recipientName: '',
    recipientPhone: '',
    address: '',
    province: '',
    city: '',
    district: '',
    postalCode: '',
    isDefault: false,
    notes: '',
  });

  const queryClient = useQueryClient();

  // Fetch addresses
  const { data: addresses, isLoading } = useQuery<Address[]>({
    queryKey: ['customer-addresses'],
    queryFn: async () => {
      const response = await api.get('/customer/addresses');
      return response.data;
    },
  });

  // Create address mutation
  const createMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const response = await api.post('/customer/addresses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      closeModal();
      toast.success('Alamat berhasil ditambahkan');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menambahkan alamat');
    },
  });

  // Update address mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddressFormData }) => {
      const response = await api.patch(`/customer/addresses/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      closeModal();
      toast.success('Alamat berhasil diperbarui');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui alamat');
    },
  });

  // Delete address mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/customer/addresses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success('Alamat berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus alamat');
    },
  });

  // Set default address mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/customer/addresses/${id}/default`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success('Alamat utama berhasil diubah');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal mengubah alamat utama');
    },
  });

  // Open modal for create
  const handleAddNew = () => {
    setEditingAddress(null);
    setFormData({
      label: '',
      recipientName: '',
      recipientPhone: '',
      address: '',
      province: '',
      city: '',
      district: '',
      postalCode: '',
      isDefault: false,
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      address: address.address,
      province: address.province || '',
      city: address.city || '',
      district: address.district || '',
      postalCode: address.postalCode || '',
      isDefault: address.isDefault,
      notes: address.notes || '',
    });
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi
    if (!formData.label.trim()) {
      toast.error('Label harus diisi');
      return;
    }
    if (!formData.recipientName.trim()) {
      toast.error('Nama penerima harus diisi');
      return;
    }
    if (!formData.recipientPhone.trim()) {
      toast.error('No HP penerima harus diisi');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('Alamat harus diisi');
      return;
    }

    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Handle delete
  const handleDelete = (id: string, label: string) => {
    if (window.confirm(`Yakin ingin menghapus alamat "${label}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Handle set default
  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Alamat Saya</h1>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Tambah Alamat
        </button>
      </div>

      {/* Address List */}
      {!addresses || addresses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <div className="text-6xl mb-4">📍</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Belum Ada Alamat
          </h3>
          <p className="text-gray-600 mb-6">
            Tambahkan alamat untuk mempermudah proses checkout
          </p>
          <button
            onClick={handleAddNew}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors font-semibold"
          >
            Tambah Alamat Baru
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Label and Default Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    {address.label === 'Rumah' ? (
                      <HomeIcon className="h-5 w-5 text-primary-600" />
                    ) : (
                      <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
                    )}
                    <h3 className="font-semibold text-lg">{address.label}</h3>
                    {address.isDefault && (
                      <span className="bg-primary-100 text-primary-600 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircleIcon className="h-3 w-3" />
                        Utama
                      </span>
                    )}
                  </div>

                  {/* Address Details */}
                  <div className="space-y-2 text-gray-600">
                    <p className="font-medium text-gray-800">{address.recipientName}</p>
                    <p>{address.recipientPhone}</p>
                    <p>{address.address}</p>
                    <p>
                      {[
                        address.district,
                        address.city,
                        address.province,
                        address.postalCode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {address.notes && (
                      <p className="text-sm text-gray-500 mt-2">Catatan: {address.notes}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                      title="Jadikan utama"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(address)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  {!address.isDefault && (
                    <button
                      onClick={() => handleDelete(address.id, address.label)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Hapus"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingAddress ? 'Edit Alamat' : 'Tambah Alamat Baru'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="label"
                    value={formData.label}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Pilih label</option>
                    <option value="Rumah">Rumah</option>
                    <option value="Kantor">Kantor</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                {/* Recipient Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Penerima <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="recipientName"
                    value={formData.recipientName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Recipient Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No HP Penerima <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="recipientPhone"
                    value={formData.recipientPhone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat Lengkap <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Province */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provinsi
                  </label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kota/Kabupaten
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kecamatan
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kode Pos
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Contoh: dekat masjid, samping rumah makan"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Set as Default */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isDefault"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                    Jadikan alamat utama
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Menyimpan...'
                      : editingAddress
                      ? 'Update'
                      : 'Simpan'}
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

export default Addresses;