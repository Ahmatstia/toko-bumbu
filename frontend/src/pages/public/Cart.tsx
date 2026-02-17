import React from "react";
import { Link } from "react-router-dom";
import { useCartStore } from "../../store/cartStore";

const Cart: React.FC = () => {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Keranjang Belanja</h2>
        <p className="text-gray-600 mb-6">Keranjang belanja Anda kosong</p>
        <Link to="/products" className="btn-primary">
          Mulai Belanja
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Keranjang Belanja</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {items.map((item) => (
            <div
              key={item.productId}
              className="bg-white rounded-lg shadow p-4 mb-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-primary-600 font-bold">
                    Rp {item.price.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.productId, parseInt(e.target.value))
                    }
                    className="w-20 px-2 py-1 border rounded"
                  />
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6 h-fit">
          <h3 className="text-xl font-bold mb-4">Ringkasan Belanja</h3>
          <div className="flex justify-between mb-2">
            <span>Total</span>
            <span className="font-bold">Rp {getTotal().toLocaleString()}</span>
          </div>
          <Link to="/checkout" className="btn-primary w-full text-center mt-4">
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
