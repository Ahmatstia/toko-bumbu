// frontend/src/pages/admin/Pos.tsx
import React, {
  useState,
  useEffect,
  useRef,
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
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { formatPrice } from "../../utils/format";

const Pos: React.FC = () => {
  const {
    categories,
    products,
    cart,
    selectedCategory,
    searchTerm,
    isLoading,

    // Web Orders
    webOrders,
    refetchWebOrders,
    activeTab,
    setActiveTab,

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

    // Form management
    orderType,
    customerName,
    customerPhone,
    setOrderType,
    setCustomerName,
    setCustomerPhone,
    confirmWebOrder,
    isConfirmingWebOrder,
  } = usePos();

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS">(
    "CASH",
  );
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [notes, setNotes] = useState("");

  // Barcode Scanner & Shortcuts Logic
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Keyboard Shortcuts
      if (e.key === "F9") {
        e.preventDefault();
        setShowPaymentModal(true);
      }
      if (e.key === "F2") {
        e.preventDefault();
        setActiveTab((prev) => (prev === "CASHIER" ? "WEB_ORDERS" : "CASHIER"));
      }
      if (e.key === "F3") {
        e.preventDefault();
        const searchInput = document.getElementById("pos-search") as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }

      // 2. Barcode Scanning Logic
      const currentTime = Date.now();
      if (currentTime - lastKeyTime.current > 100) {
        barcodeBuffer.current = ""; // Reset buffer if slow typing (not a scanner)
      }
      lastKeyTime.current = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.current.length > 2) {
          const sku = barcodeBuffer.current;
          const product = products.find((p) => p.sku === sku || p.barcode === sku);
          if (product) {
            addToCart(product);
            barcodeBuffer.current = "";
          }
        }
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, addToCart, setShowPaymentModal, setActiveTab]);


  // Update cash amount default when total changes
  useEffect(() => {
    const finalVal = discountType === "PERCENT" ? total * (1 - discount / 100) : total - discount;
    setCashAmount(Math.max(0, finalVal));
  }, [total, discount, discountType]);

  const calculatedDiscount = discountType === "PERCENT" ? total * (discount / 100) : discount;
  const finalTotal = Math.max(0, total - calculatedDiscount);
  const change = Math.max(0, cashAmount - finalTotal);
  const isPaymentValid = paymentMethod === "CASH" ? cashAmount >= finalTotal : true;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100 overflow-hidden print:bg-white print:h-auto">
      {/* Tab Navigation */}
      <div className="bg-white border-b px-6 flex items-center justify-between h-14 shrink-0">
        <div className="flex gap-4 h-full">
          <button
            onClick={() => setActiveTab("CASHIER")}
            className={`px-4 h-full font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "CASHIER"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <BanknotesIcon className="h-5 w-5" />
            Kasir (F2)
          </button>
          <button
            onClick={() => setActiveTab("WEB_ORDERS")}
            className={`px-4 h-full font-bold flex items-center gap-2 border-b-2 transition-colors relative ${
              activeTab === "WEB_ORDERS"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <ShoppingCartIcon className="h-5 w-5" />
            Pesanan Web
            {webOrders.length > 0 && (
              <span className="absolute top-2 right-0 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center font-bold">
                  {webOrders.length}
                </span>
              </span>
            )}
          </button>
        </div>
        
        <div className="text-sm font-medium text-gray-500">
          Shortcut: <span className="bg-gray-100 px-1.5 py-0.5 rounded border">F2</span> Tab | <span className="bg-gray-100 px-1.5 py-0.5 rounded border">F3</span> Search | <span className="bg-gray-100 px-1.5 py-0.5 rounded border">F9</span> Bayar
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Interface */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeTab === "CASHIER" ? (
            <>
              {/* Category & Search Ribbons */}
              <div className="bg-white p-4 flex flex-col gap-4 border-b">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setSelectedCategory("")}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === ""
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Semua
                  </button>
                  {categories?.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                        selectedCategory === cat.id
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="pos-search"
                    type="text"
                    placeholder="Cari Produk atau Scan Barcode... (F3)"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Product Grid */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={product.stockQuantity === 0}
                      className="group flex flex-col bg-white rounded-2xl p-2 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all text-left relative overflow-hidden disabled:opacity-50"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden mb-2 relative">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                            No Img
                          </div>
                        )}
                        {product.stockQuantity < 10 && product.stockQuantity > 0 && (
                          <span className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            Tersisa {product.stockQuantity}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium mb-0.5 uppercase tracking-wide">
                          {product.category?.name}
                        </p>
                        <h3 className="font-bold text-gray-900 leading-tight mb-2 min-h-[2.5rem] line-clamp-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between mt-auto">
                          <p className="text-primary-600 font-black text-sm">
                            {formatPrice(product.price)}
                          </p>
                          <div className="bg-gray-100 p-1.5 rounded-lg group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            <PlusIcon className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                      
                      {product.stockQuantity === 0 && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="bg-red-500 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg">Habis</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Web Orders View */
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    Pesanan Pending Web Order
                    <span className="bg-primary-100 text-primary-700 px-3 py-0.5 rounded-full text-sm font-bold">
                      {webOrders.length}
                    </span>
                  </h1>
                  <button 
                    onClick={() => refetchWebOrders()}
                    className="text-primary-600 hover:text-primary-700 text-sm font-bold flex items-center gap-1"
                  >
                    Refresh List
                  </button>
                </div>

                <div className="grid gap-4">
                  {webOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                      <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">Tidak ada pesanan web yang pending</p>
                    </div>
                  ) : (
                    webOrders.map((order) => (
                      <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-primary-300 transition-colors">
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                          <div>
                            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded uppercase font-black mb-1 inline-block">Menunggu Konfirmasi</span>
                            <h3 className="text-lg font-bold text-gray-900 font-mono">#{order.invoiceNumber}</h3>
                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('id-ID')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500 font-medium">Total Tagihan</p>
                            <p className="text-xl font-black text-primary-600">{formatPrice(order.total)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 rounded-2xl p-4">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Customer</p>
                            <p className="font-bold text-gray-800">{order.customerName}</p>
                            <p className="text-sm text-gray-600">{order.customerPhone}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Item</p>
                            <p className="font-bold text-gray-800">{order.items?.length || 0} Macam Produk</p>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button 
                            className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center gap-2"
                          >
                            Tampilkan Detail
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Konfirmasi pembayaran untuk pesanan #${order.invoiceNumber}?`)) {
                                confirmWebOrder(order.id);
                              }
                            }}
                            disabled={isConfirmingWebOrder}
                            className="bg-primary-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg shadow-primary-200 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {isConfirmingWebOrder ? (
                               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                               <PlusIcon className="h-5 w-5" />
                            )}
                            Selesaikan di Kasir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Cart Sidebar (Desktop Only) */}
        <div className="hidden lg:flex w-96 bg-white border-l flex-col shadow-2xl relative">
          {/* Cart Header */}
          <div className="p-6 border-b shrink-0 bg-primary-50/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                Keranjang Belanja
                <span className="bg-primary-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  {itemCount}
                </span>
              </h2>
              <button
                onClick={clearCart}
                className="text-red-500 hover:text-red-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                title="Kosongkan Keranjang"
              >
                <TrashIcon className="h-4 w-4" />
                Clear
              </button>
            </div>
            
            {/* Quick Order Type Toggle */}
            <div className="bg-gray-100 p-1.5 rounded-xl flex gap-1">
              <button 
                onClick={() => setOrderType("OFFLINE")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${orderType === 'OFFLINE' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
              >
                DIRECT SALE
              </button>
              <button 
                onClick={() => setOrderType("ONLINE")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${orderType === 'ONLINE' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
              >
                WEB/WA ORDER
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <ShoppingCartIcon className="h-16 w-16 mb-2" />
                <p className="font-bold text-sm">Belum ada item</p>
                <p className="text-xs">Scan barcode untuk menambah</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="flex gap-3 group animate-in slide-in-from-right-2 duration-200">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-50 text-gray-300 flex items-center justify-center text-[10px]">No Img</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate pr-4">{item.name}</h4>
                    <p className="text-primary-600 font-bold text-xs mb-2">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                        className="w-10 text-center font-black text-sm bg-transparent"
                      />
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="self-start opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary */}
          <div className="p-6 bg-white border-t shrink-0">
            <div className="space-y-2.5 mb-6">
              <div className="flex justify-between text-sm text-gray-600 font-medium">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 font-medium">
                <span>PPN 11%</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(total)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-primary-200 hover:bg-primary-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex justify-center items-center gap-3 group"
            >
              {orderType === 'ONLINE' ? 'BUAT PESANAN WEB' : 'BAYAR SEKARANG'}
              <ChevronRightIcon className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-black">Shortcut Pembayaran: F9</p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Pembayaran</h2>
                  <p className="text-gray-500 font-medium">Total Tagihan: {formatPrice(total)}</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Order Info for Online */}
              {orderType === "ONLINE" && (
                <div className="mb-8 space-y-4 bg-primary-50 p-6 rounded-3xl border border-primary-100">
                  <h3 className="font-black text-primary-700 text-sm uppercase tracking-wider">📦 Informasi Customer (WEB ORDER)</h3>
                  <div>
                    <label className="block text-[10px] font-black text-primary-600 uppercase mb-1">Nama Customer</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-white border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none font-bold"
                      placeholder="Contoh: Ibu Ani"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-primary-600 uppercase mb-1">WhatsApp Customer</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-white border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none font-bold"
                      placeholder="Contoh: 08123456789"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Modern Discount UI */}
                <div>
                  <label className="block text-sm font-black text-gray-700 uppercase tracking-wide mb-3">DISKON KHUSUS</label>
                  <div className="flex gap-2">
                    <div className="flex bg-gray-100 p-1 rounded-xl w-32 shrink-0">
                      <button 
                        onClick={() => setDiscountType("FIXED")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${discountType === 'FIXED' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                      >
                        Rp
                      </button>
                      <button 
                        onClick={() => setDiscountType("PERCENT")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${discountType === 'PERCENT' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                      >
                        %
                      </button>
                    </div>
                    <input
                      type="number"
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none text-right font-black"
                      placeholder="Potongan..."
                      value={discount || ""}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Method Selector */}
                <div>
                  <label className="block text-sm font-black text-gray-700 uppercase tracking-wide mb-3">METODE PEMBAYARAN</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setPaymentMethod("CASH")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        paymentMethod === "CASH"
                          ? "border-primary-600 bg-primary-50 text-primary-600 shadow-lg shadow-primary-50"
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                      }`}
                    >
                      <BanknotesIcon className="h-7 w-7" />
                      <span className="font-bold text-xs uppercase">Tunai</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod("TRANSFER")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        paymentMethod === "TRANSFER"
                          ? "border-primary-600 bg-primary-50 text-primary-600 shadow-lg shadow-primary-50"
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                      }`}
                    >
                      <CreditCardIcon className="h-7 w-7" />
                      <span className="font-bold text-xs uppercase">Transfer</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod("QRIS")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        paymentMethod === "QRIS"
                          ? "border-primary-600 bg-primary-50 text-primary-600 shadow-lg shadow-primary-50"
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                      }`}
                    >
                      <div className="w-7 h-7 bg-primary-600 rounded flex items-center justify-center text-white font-black text-[10px]">QR</div>
                      <span className="font-bold text-xs uppercase">QRIS</span>
                    </button>
                  </div>
                </div>

                {/* Cash Input */}
                {paymentMethod === "CASH" && (
                  <div className="bg-gray-900 rounded-[28px] p-6 text-white shadow-xl animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Diterima (Tunai)</label>
                      <div className="flex gap-2">
                        {[50000, 100000].map(val => (
                          <button 
                            key={val}
                            onClick={() => setCashAmount(val)}
                            className="bg-gray-800 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-gray-700 transition-colors"
                          >
                            + {val/1000}k
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-primary-500">Rp</span>
                      <input
                        type="number"
                        className="w-full bg-transparent text-4xl font-black focus:outline-none placeholder-gray-700"
                        placeholder="0"
                        value={cashAmount || ""}
                        onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                        autoFocus
                      />
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between items-center">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">KEMBALIAN</span>
                      <span className="text-2xl font-black text-green-400">
                        {formatPrice(change)}
                      </span>
                    </div>
                  </div>
                )}
                
                {paymentMethod === "QRIS" && (
                  <div className="bg-white rounded-3xl p-6 border-2 border-primary-100 flex flex-col items-center justify-center animate-in zoom-in-95">
                    <div className="w-48 h-48 bg-gray-100 rounded-2xl mb-4 flex items-center justify-center border border-dashed border-primary-300">
                       <span className="text-gray-400 font-bold text-xs">DYNAMIC QRIS LOADED</span>
                    </div>
                    <p className="text-center text-sm font-bold text-gray-700">Tunjukkan QRIS kepada Customer</p>
                    <p className="text-center text-xs text-primary-600 mt-1 font-medium">Lakukan konfirmasi bayar di HP/Dashboard Admin</p>
                  </div>
                )}
              </div>

              <div className="mt-10 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase tracking-widest text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={() => handlePayment({
                    method: paymentMethod,
                    cashAmount: cashAmount,
                    discount: calculatedDiscount,
                    notes: notes
                  })}
                  disabled={!isPaymentValid || isProcessing || (orderType === "ONLINE" && (!customerName || !customerPhone))}
                  className="flex-[2] bg-primary-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-primary-100 hover:bg-primary-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : orderType === "ONLINE" ? (
                    "Buat Pesanan"
                  ) : (
                    "Selesaikan"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastTransaction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] max-w-sm w-full shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PrinterIcon className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  Transaksi Berhasil!
                </h2>
                <div className="mt-2 inline-block px-3 py-1 bg-gray-100 rounded-full font-mono text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  #{lastTransaction.invoiceNumber}
                </div>
              </div>

              {/* Professional Receipt Preview */}
              <div className="bg-gray-50 rounded-3xl p-6 mb-8 font-mono text-xs border border-gray-100 shadow-inner max-h-[40vh] overflow-y-auto">
                <div className="text-center mb-4">
                  <p className="font-black text-base tracking-tighter">BUMBU KU</p>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase">Surabaya, Jawa Timur</p>
                  <p className="text-[10px] text-gray-400">0812-3456-789</p>
                </div>

                <div className="border-t border-dashed border-gray-300 my-4"></div>

                <div className="space-y-3">
                  {lastTransaction.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 leading-tight">{item.product.name}</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">{item.quantity} x {formatPrice(item.price)}</p>
                      </div>
                      <span className="font-black text-gray-900 shrink-0">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-gray-300 my-4"></div>

                <div className="space-y-2">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatPrice(lastTransaction.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>PPN 11%</span>
                    <span>{formatPrice(lastTransaction.tax)}</span>
                  </div>
                  {lastTransaction.discount > 0 && (
                    <div className="flex justify-between text-orange-600 font-bold italic">
                      <span>Diskon</span>
                      <span>-{formatPrice(lastTransaction.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-lg pt-3 border-t border-gray-200">
                    <span>TOTAL</span>
                    <span className="text-primary-600">{formatPrice(lastTransaction.total)}</span>
                  </div>
                  
                  {lastTransaction.paymentMethod === 'CASH' && (
                    <div className="flex justify-between text-gray-400 pt-2 font-black">
                      <span className="uppercase text-[9px] tracking-widest">Bayar ({formatPrice(lastTransaction.paymentAmount)})</span>
                      <span>Kembali {formatPrice(lastTransaction.paymentAmount - lastTransaction.total)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-300 my-4"></div>

                <div className="text-center text-[10px] text-gray-400 mt-4 italic">
                  <p>Terima kasih telah berbelanja!</p>
                  <p className="mt-2 non-italic font-bold">
                    {new Date(lastTransaction.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 bg-white border-2 border-primary-600 text-primary-600 py-4 rounded-2xl hover:bg-primary-50 transition-all font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <PrinterIcon className="h-5 w-5" />
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
                  className="flex-1 bg-primary-600 text-white py-4 rounded-2xl hover:shadow-lg shadow-primary-200 transition-all font-black text-sm uppercase tracking-widest"
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
