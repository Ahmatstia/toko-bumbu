// frontend/src/pages/admin/Pos.tsx
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { usePos } from "../../hooks/usePos";
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  BanknotesIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  PrinterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { formatPrice } from "../../utils/format";

const Pos: React.FC = () => {
  const {
    // Data
    categories,
    products,
    cart,
    selectedCategory,
    searchTerm,
    isLoading,

    // Infinite scroll
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,

    // Totals
    subtotal,
    tax,
    total,
    itemCount,

    // Modal states
    showPaymentModal,
    showReceiptModal,
    lastTransaction,
    isProcessing,

    // ========== STATE BARU ==========
    orderType,
    customerName,
    customerPhone,
    setOrderType,
    setCustomerName,
    setCustomerPhone,

    // Actions
    setSelectedCategory,
    setSearchTerm,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setShowPaymentModal,
    setShowReceiptModal,
    handlePayment,
    handlePrintReceipt,
  } = usePos();

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">(
    "CASH",
  );
  const [cashAmount, setCashAmount] = useState<number>(total);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // State untuk buka/tutup keranjang
  const [cartOpen, setCartOpen] = useState(false);
  const prevCartLength = useRef(cart.length);

  // Observer untuk infinite scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const lastProductRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  // Auto buka keranjang saat produk ditambahkan
  useEffect(() => {
    if (cart.length > prevCartLength.current) {
      setCartOpen(true);
    }
    prevCartLength.current = cart.length;
  }, [cart.length]);

  // Update cash amount when total changes
  useEffect(() => {
    setCashAmount(total - discount);
  }, [total, discount]);

  const finalTotal = total - discount;
  const change = Math.max(0, cashAmount - finalTotal);
  const isPaymentValid =
    paymentMethod === "CASH" ? cashAmount >= finalTotal : true;

  // Filter produk berdasarkan kategori
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!selectedCategory) return products;
    return products.filter((p) => p.categoryId === selectedCategory);
  }, [products, selectedCategory]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-0 lg:gap-4 relative">
      {/* Left Side - Products */}
      <div
        className={`flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${
          cartOpen ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-white flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">POS Kasir</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Total Produk: {products.length}
            </p>
          </div>
          {/* Tombol buka keranjang (Desktop) */}
          {!cartOpen && (
            <button
              onClick={() => setCartOpen(true)}
              className="hidden lg:flex items-center gap-2 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              <ShoppingCartIcon className="h-4 w-4" />
              Keranjang ({itemCount})
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search & Categories */}
        <div className="p-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Categories Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all text-xs font-medium flex-shrink-0 ${
                !selectedCategory
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Semua ({products.length})
            </button>
            {categories?.map((cat) => {
              const countInCategory = products.filter(
                (p) => p.categoryId === cat.id,
              ).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all text-xs font-medium flex-shrink-0 ${
                    selectedCategory === cat.id
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat.name} ({countInCategory})
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-sm text-gray-500">
                Tidak ada produk ditemukan
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
              {filteredProducts.map((product, index) => {
                if (filteredProducts.length === index + 1) {
                  return (
                    <div
                      ref={lastProductRef}
                      key={product.id}
                      className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-primary-500 hover:shadow-sm transition-all relative"
                    >
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {product.stock > 0 && (
                          <span className="absolute top-1 right-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full z-10">
                            {product.stock}
                          </span>
                        )}
                        {product.stock === 0 && (
                          <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full z-10">
                            0
                          </span>
                        )}
                        <div className="aspect-square bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center p-1">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-xl">🛒</span>
                          )}
                        </div>
                        <div className="p-1.5 text-left">
                          <h3 className="font-medium text-gray-800 text-[10px] leading-tight line-clamp-2 min-h-[2rem]">
                            {product.name}
                          </h3>
                          <p className="text-primary-600 font-bold text-[10px] mt-0.5">
                            {formatPrice(product.price)}
                          </p>
                          <p className="text-[8px] text-gray-500 mt-0.5">
                            {product.unit}
                          </p>
                          <p
                            className={`text-[8px] mt-0.5 ${
                              product.stock > 0
                                ? "text-green-600"
                                : "text-red-500"
                            }`}
                          >
                            Stok: {product.stock}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={product.id}
                      className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-primary-500 hover:shadow-sm transition-all relative"
                    >
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {product.stock > 0 && (
                          <span className="absolute top-1 right-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full z-10">
                            {product.stock}
                          </span>
                        )}
                        {product.stock === 0 && (
                          <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full z-10">
                            0
                          </span>
                        )}
                        <div className="aspect-square bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center p-1">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-xl">🛒</span>
                          )}
                        </div>
                        <div className="p-1.5 text-left">
                          <h3 className="font-medium text-gray-800 text-[10px] leading-tight line-clamp-2 min-h-[2rem]">
                            {product.name}
                          </h3>
                          <p className="text-primary-600 font-bold text-[10px] mt-0.5">
                            {formatPrice(product.price)}
                          </p>
                          <p className="text-[8px] text-gray-500 mt-0.5">
                            {product.unit}
                          </p>
                          <p
                            className={`text-[8px] mt-0.5 ${
                              product.stock > 0
                                ? "text-green-600"
                                : "text-red-500"
                            }`}
                          >
                            Stok: {product.stock}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                }
              })}
            </div>
          )}

          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!hasNextPage && filteredProducts.length > 0 && (
            <p className="text-center text-xs text-gray-400 py-2">
              Semua produk telah dimuat ({filteredProducts.length} produk)
            </p>
          )}
        </div>
      </div>

      {/* Right Side - Cart */}
      <div
        className={`bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden transition-all duration-300 ${
          cartOpen
            ? "fixed inset-0 z-30 lg:static lg:w-80 w-full"
            : "hidden lg:block lg:w-0 lg:opacity-0 lg:invisible"
        }`}
      >
        {cartOpen && (
          <>
            {/* Cart Header */}
            <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-white">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-1.5 text-sm">
                  <ShoppingCartIcon className="h-4 w-4" />
                  Keranjang ({itemCount})
                </h2>
                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                    >
                      Kosongkan
                    </button>
                  )}
                  <button
                    onClick={() => setCartOpen(false)}
                    className="lg:flex hidden text-gray-500 hover:text-gray-700"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="lg:hidden text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ========== ORDER TYPE SELECTOR ========== */}
            <div className="p-3 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-800">
                  Tipe Pesanan
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType("OFFLINE")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    orderType === "OFFLINE"
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-300"
                  }`}
                >
                  🏬 Kasir (Langsung)
                </button>
                <button
                  onClick={() => setOrderType("ONLINE")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    orderType === "ONLINE"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-300"
                  }`}
                >
                  📱 Online (Via WA)
                </button>
              </div>

              {/* Form untuk ONLINE order */}
              {orderType === "ONLINE" && (
                <div className="mt-3 space-y-2 border-t border-blue-200 pt-3">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama customer *"
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="No WhatsApp *"
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[9px] text-blue-600">
                    * WA akan otomatis terkirim ke customer
                  </p>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div
              className="flex-1 overflow-y-auto p-3 space-y-2"
              style={{ maxHeight: "calc(100vh - 350px)" }}
            >
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCartIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500 font-medium">
                    Keranjang kosong
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Silakan pilih produk
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-2 bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-white rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">🛒</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 text-xs truncate">
                        {item.name}
                      </h4>
                      <p className="text-primary-600 font-bold text-[10px]">
                        {formatPrice(item.price)}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center border border-gray-300 rounded bg-white">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            className="p-0.5 hover:bg-gray-100 rounded-l transition-colors"
                          >
                            <MinusIcon className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-[10px] font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.maxStock}
                            className="p-0.5 hover:bg-gray-100 rounded-r transition-colors disabled:opacity-50"
                          >
                            <PlusIcon className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-600 hover:text-red-700 p-0.5"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-800 text-[10px]">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Summary - STICKY */}
            {cart.length > 0 && (
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 shadow-lg">
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">PPN 11%</span>
                    <span className="font-semibold">{formatPrice(tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-primary-600">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* Info status untuk ONLINE order */}
                {orderType === "ONLINE" && (
                  <div className="mb-2 p-2 bg-blue-50 rounded-lg text-[10px] text-blue-700">
                    ⏳ Status: PENDING (menunggu pembayaran customer)
                  </div>
                )}

                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full bg-primary-600 text-white py-4 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-base shadow-md"
                >
                  {orderType === "ONLINE"
                    ? "Buat Pesanan Online"
                    : "Bayar Sekarang"}{" "}
                  ({formatPrice(total)})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Cart Toggle */}
      {!cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 bg-primary-600 text-white p-3 rounded-full shadow-lg z-20"
        >
          <ShoppingCartIcon className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {orderType === "ONLINE"
                    ? "Buat Pesanan Online"
                    : "Pembayaran"}
                </h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Belanja</span>
                  <span className="font-bold">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Diskon</span>
                  <div className="flex items-center gap-1">
                    <span>Rp</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) =>
                        setDiscount(
                          Math.max(0, Math.min(Number(e.target.value), total)),
                        )
                      }
                      className="w-20 text-right border border-gray-300 rounded px-2 py-1 text-sm"
                      min="0"
                      max={total}
                      step="1000"
                    />
                  </div>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
                  <span>Total Bayar</span>
                  <span className="text-primary-600">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Payment Method - Hanya untuk OFFLINE */}
              {orderType === "OFFLINE" && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaymentMethod("CASH")}
                        className={`flex items-center justify-center gap-1 p-3 border-2 rounded-xl transition-all text-sm ${
                          paymentMethod === "CASH"
                            ? "border-primary-600 bg-primary-50 text-primary-600"
                            : "border-gray-200 hover:border-primary-300"
                        }`}
                      >
                        <BanknotesIcon className="h-4 w-4" />
                        Tunai
                      </button>
                      <button
                        onClick={() => setPaymentMethod("TRANSFER")}
                        className={`flex items-center justify-center gap-1 p-3 border-2 rounded-xl transition-all text-sm ${
                          paymentMethod === "TRANSFER"
                            ? "border-primary-600 bg-primary-50 text-primary-600"
                            : "border-gray-200 hover:border-primary-300"
                        }`}
                      >
                        <CreditCardIcon className="h-4 w-4" />
                        Transfer
                      </button>
                    </div>
                  </div>

                  {/* Cash Input */}
                  {paymentMethod === "CASH" && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jumlah Uang
                      </label>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        min={finalTotal}
                        step="1000"
                      />
                      {change > 0 && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs text-gray-600">Kembalian</p>
                          <p className="text-base font-bold text-green-600">
                            {formatPrice(change)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Customer Info - Untuk ONLINE sudah diisi di cart */}
              {orderType === "OFFLINE" && (
                <div className="mb-4 space-y-3">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="Nama customer (opsional)"
                  />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="No HP (opsional)"
                  />
                </div>
              )}

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm mb-4"
                placeholder="Catatan (opsional)"
              />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={() =>
                    handlePayment({
                      method: paymentMethod,
                      cashAmount,
                      discount,
                      notes,
                    })
                  }
                  disabled={
                    !isPaymentValid ||
                    isProcessing ||
                    (orderType === "ONLINE" &&
                      (!customerName || !customerPhone))
                  }
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Proses...
                    </span>
                  ) : orderType === "ONLINE" ? (
                    "Buat Pesanan"
                  ) : (
                    "Proses Pembayaran"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full">
            <div className="p-5">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <PrinterIcon className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Transaksi Berhasil!
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Invoice:{" "}
                  <span className="font-mono font-bold">
                    {lastTransaction.invoiceNumber}
                  </span>
                </p>
              </div>

              {/* Receipt Content */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 font-mono text-xs">
                <div className="text-center mb-3">
                  <p className="font-bold text-sm">BUMBU KU</p>
                  <p className="text-[10px] text-gray-500">Toko Bumbu Dapur</p>
                </div>

                <div className="border-t border-dashed border-gray-300 my-2"></div>

                <div className="space-y-1.5">
                  {lastTransaction.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="truncate max-w-[180px]">
                        {item.product.name} x{item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-gray-300 my-2"></div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(lastTransaction.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PPN 11%</span>
                    <span>{formatPrice(lastTransaction.tax)}</span>
                  </div>
                  {lastTransaction.discount > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Diskon</span>
                      <span>-{formatPrice(lastTransaction.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatPrice(lastTransaction.total)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 my-2"></div>

                <div className="text-center text-[10px] text-gray-500 mt-3">
                  <p>Terima kasih telah berbelanja</p>
                  <p>
                    {new Date(lastTransaction.createdAt).toLocaleString(
                      "id-ID",
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm flex items-center justify-center gap-1"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Cetak
                </button>
                <button
                  onClick={() => {
                    setShowReceiptModal(false);
                    setPaymentMethod("CASH");
                    setCashAmount(0);
                    setDiscount(0);
                    setNotes("");
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-sm"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pos;
