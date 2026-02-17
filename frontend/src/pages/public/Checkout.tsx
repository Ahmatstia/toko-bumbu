import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useCartStore } from '../../store/cartStore';
import { authService } from '../../services/auth.service';
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
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, clearCart, getTotal } = useCartStore();
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();
  const isCustomer = authService.isCustomer();

  const [isGuest, setIsGuest] = useState(!isAuthenticated);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state untuk guest
  const [guestForm, setGuestForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  // Fetch addresses untuk customer yang login
  const { data: addresses, isLoading: addressesLoading } = useQuery<Address[]>({
    queryKey: ['customer-addresses'],
    queryFn: async () => {
      const response = await api.get('/customer/addresses');
      return response.data;
    },
    enabled: isAuthenticated && isCustomer,
  });

  // Set default address
  useEffect(() => {
    if (addresses && addresses.length > 0) {
      const defaultAddr = addresses.find(addr => addr.isDefault);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr.id);
      } else {
        setSelectedAddress(addresses[0].id);
      }
    }
  }, [addresses]);

  // Format price
  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  // Handle guest form change
  const handleGuestFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setGuestForm({
      ...guestForm,
      [e.target.name]: e.target.value,
    });
  };

  // Validate guest form
  const validateGuestForm = () => {
    if (!guestForm.name.trim()) {
      toast.error('Nama harus diisi');
      return false;
    }
    if (!guestForm.phone.trim()) {
      toast.error('No HP harus diisi');
      return false;
    }
    if (!guestForm.address.trim()) {
      toast.error('Alamat harus diisi');
      return false;
    }
    return true;
  };

  // Handle place order
  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error('Keranjang belanja kosong');
      navigate('/products');
      return;
    }

    // Validasi untuk guest
    if (isGuest && !validateGuestForm()) {
      return;
    }

    // Validasi untuk customer
    if (!isGuest && !selectedAddress) {
      toast.error('Pilih alamat pengiriman');
      return;
    }

    setIsProcessing(true);

    try {
      // Siapkan data transaksi
      const transactionData: any = {
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod: paymentMethod,
        paymentAmount: getTotal() + 5000, // Total + ongkir
        discount: 0,
      };

      // Tambah data customer
      if (isGuest) {
        transactionData.isGuest = true;
        transactionData.customerName = guestForm.name;
        transactionData.customerPhone = guestForm.phone;
        transactionData.notes = guestForm.address;
      } else {
        transactionData.isGuest = false;
        transactionData.customerId = user?.id;
        transactionData.customerName = user?.name;
        transactionData.customerPhone = user?.phone;
        
        // Ambil alamat yang dipilih
        const selectedAddr = addresses?.find(addr => addr.id === selectedAddress);
        if (selectedAddr) {
          transactionData.notes = `${selectedAddr.address}, ${selectedAddr.city}, ${selectedAddr.province} ${selectedAddr.postalCode}`;
        }
      }

      // Pilih endpoint berdasarkan tipe user
      const endpoint = isGuest ? '/transactions' : '/transactions/customer';
      
      const response = await api.post(endpoint, transactionData);
      
      // Clear cart
      clearCart();

      // Tampilkan success
      toast.success('Pesanan berhasil dibuat!');
      
      // Redirect ke invoice / success page
      navigate(`/order-success/${response.data.invoiceNumber}`);

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Gagal memproses pesanan');
    } finally {
      setIsProcessing(false);
    }
  };

  // Hitung total
  const subtotal = getTotal();
  const shippingCost = 5000;
  const total = subtotal + shippingCost;

  // Kalau cart kosong, redirect
  if (items.length === 0) {
    navigate('/products');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/cart"
          className="flex items-center text-gray-600 hover:text-primary-600 mb-4 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Kembali ke Keranjang
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Login Type Selector */}
          {!isAuthenticated && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Checkout sebagai
              </h2>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsGuest(true)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                    isGuest
                      ? 'border-primary-600 bg-primary-50 text-primary-600'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <span className="font-semibold">Tamu (Guest)</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Cepat, tanpa registrasi
                  </p>
                </button>
                <button
                  onClick={() => navigate('/customer/login')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                    !isGuest && !isAuthenticated
                      ? 'border-primary-600 bg-primary-50 text-primary-600'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <span className="font-semibold">Customer</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Login untuk riwayat belanja
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Guest Form */}
          {isGuest && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Data Diri
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={guestForm.name}
                    onChange={handleGuestFormChange}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No HP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={guestForm.phone}
                    onChange={handleGuestFormChange}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={guestForm.email}
                    onChange={handleGuestFormChange}
                    placeholder="Contoh: budi@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat Lengkap <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={guestForm.address}
                    onChange={handleGuestFormChange}
                    rows={4}
                    placeholder="Contoh: Jl. Merdeka No. 123, RT 01 RW 02, Kel. Gambir, Kec. Gambir, Jakarta Pusat"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Address Selection untuk Customer */}
          {isAuthenticated && isCustomer && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Alamat Pengiriman
                </h2>
                <Link
                  to="/customer/addresses"
                  className="text-primary-600 hover:text-primary-700 text-sm font-semibold"
                >
                  + Tambah Alamat
                </Link>
              </div>

              {addressesLoading ? (
                <div className="text-center py-8">Memuat alamat...</div>
              ) : addresses && addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedAddress === addr.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-start">
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddress === addr.id}
                          onChange={(e) => setSelectedAddress(e.target.value)}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{addr.label}</span>
                            {addr.isDefault && (
                              <span className="bg-primary-100 text-primary-600 text-xs px-2 py-1 rounded">
                                Utama
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {addr.recipientName} | {addr.recipientPhone}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {addr.address}
                          </p>
                          <p className="text-sm text-gray-500">
                            {addr.city}, {addr.province} {addr.postalCode}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Belum ada alamat tersimpan</p>
                  <Link
                    to="/customer/addresses"
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Tambah Alamat Sekarang
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Metode Pembayaran
            </h2>
            <div className="space-y-3">
              {[
                { id: 'CASH', label: 'Tunai', icon: '💵' },
                { id: 'QRIS', label: 'QRIS', icon: '📱' },
                { id: 'TRANSFER', label: 'Transfer Bank', icon: '🏦' },
              ].map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentMethod === method.id
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-2xl mr-3">{method.icon}</span>
                  <span className="font-semibold">{method.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Ringkasan Pesanan
            </h2>

            {/* Order Items */}
            <div className="max-h-64 overflow-y-auto mb-4 space-y-3">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.name} x {item.quantity}
                  </span>
                  <span className="font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Ongkos Kirim</span>
                <span className="font-semibold">{formatPrice(shippingCost)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isProcessing}
              className="w-full bg-primary-600 text-white py-4 rounded-xl hover:bg-primary-700 transition-colors font-semibold text-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Memproses...
                </span>
              ) : (
                'Buat Pesanan'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Dengan membuat pesanan, Anda menyetujui Syarat & Ketentuan yang berlaku
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;