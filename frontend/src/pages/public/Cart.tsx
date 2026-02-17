import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../../store/cartStore';
import toast from 'react-hot-toast';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Format price dengan safe check yang lebih ketat
  const formatPrice = (price: any): string => {
    // Jika undefined atau null
    if (price === undefined || price === null) return 'Rp 0';
    
    // Konversi ke number
    let numericPrice: number;
    if (typeof price === 'string') {
      numericPrice = parseFloat(price);
    } else if (typeof price === 'number') {
      numericPrice = price;
    } else {
      return 'Rp 0';
    }
    
    // Cek apakah valid number
    if (isNaN(numericPrice) || numericPrice === 0) return 'Rp 0';
    
    return `Rp ${numericPrice.toLocaleString('id-ID')}`;
  };

  // Handle quantity change
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(productId, newQuantity);
  };

  // Handle remove item
  const handleRemoveItem = (productId: string, productName: string) => {
    removeItem(productId);
    toast.success(`${productName} dihapus dari keranjang`, {
      icon: '🗑️',
    });
  };

  // Handle clear cart
  const handleClearCart = () => {
    if (window.confirm('Yakin ingin mengosongkan keranjang?')) {
      clearCart();
      toast.success('Keranjang dikosongkan');
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    // Validasi semua item punya price
    const invalidItems = items.filter(item => !item.price || item.price <= 0);
    if (invalidItems.length > 0) {
      toast.error('Ada produk dengan harga tidak valid. Silakan hapus dan tambahkan lagi.');
      return;
    }
    
    setIsCheckingOut(true);
    navigate('/checkout');
  };

  // Hitung subtotal dengan safe check
  const subtotal = items.reduce((sum, item) => {
    const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0;
    return sum + (price * item.quantity);
  }, 0);
  
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const shippingCost = subtotal > 0 ? 5000 : 0;
  const total = subtotal + shippingCost;

  // Debug: lihat items di console
  useEffect(() => {
    console.log('Cart items:', items.map(item => ({
      name: item.name,
      price: item.price,
      priceType: typeof item.price,
      quantity: item.quantity
    })));
  }, [items]);

  // Loading state
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-8xl mb-6">🛒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Keranjang Belanja Kosong
          </h1>
          <p className="text-gray-600 mb-8">
            Yuk, mulai belanja kebutuhan dapur Anda di BumbuKu
          </p>
          <Link
            to="/products"
            className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors font-semibold"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Lanjut Belanja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Keranjang Belanja ({itemCount} item)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items - Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            // Safe check untuk price
            const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0;
            const itemSubtotal = price * item.quantity;
            
            return (
              <div
                key={item.productId}
                className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow"
              >
                {/* Product Image */}
                <Link
                  to={`/products/${item.productId}`}
                  className="w-24 h-24 bg-gradient-to-br from-primary-50 to-gray-100 rounded-xl flex items-center justify-center flex-shrink-0"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <span className="text-3xl">🛒</span>
                  )}
                </Link>

                {/* Product Details */}
                <div className="flex-1">
                  <div className="flex justify-between">
                    <Link
                      to={`/products/${item.productId}`}
                      className="font-semibold text-gray-800 hover:text-primary-600 transition-colors"
                    >
                      {item.name}
                    </Link>
                    <button
                      onClick={() => handleRemoveItem(item.productId, item.name)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Hapus"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="text-primary-600 font-bold mt-1">
                    {formatPrice(price)}
                  </p>

                  {/* Quantity Control */}
                  <div className="flex items-center mt-3">
                    <label className="text-sm text-gray-600 mr-3">Jumlah:</label>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="w-12 text-center py-1 border-x border-gray-300">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Subtotal</p>
                  <p className="font-bold text-gray-800">
                    {formatPrice(itemSubtotal)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Clear Cart Button */}
          <div className="flex justify-end">
            <button
              onClick={handleClearCart}
              className="text-gray-500 hover:text-red-500 text-sm flex items-center transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Kosongkan Keranjang
            </button>
          </div>
        </div>

        {/* Summary - Right Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Ringkasan Belanja
            </h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({itemCount} item)</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Ongkos Kirim</span>
                <span className="font-semibold">{formatPrice(shippingCost)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-primary-600">{formatPrice(total)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  *Belum termasuk biaya pengiriman
                </p>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full bg-primary-600 text-white py-4 rounded-xl hover:bg-primary-700 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingOut ? 'Memproses...' : 'Checkout'}
            </button>

            {/* Continue Shopping */}
            <Link
              to="/products"
              className="block text-center text-primary-600 hover:text-primary-700 mt-4 text-sm"
            >
              Lanjut Belanja
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;