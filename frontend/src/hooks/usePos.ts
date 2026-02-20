// frontend/src/hooks/usePos.ts
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stockId?: string;
  maxStock: number;
  imageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
  categoryId: string;
  category: { id: string; name: string };
  unit: string;
}

export interface Category {
  id: string;
  name: string;
}

export const usePos = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  
  // Tab/Mode state
  const [activeTab, setActiveTab] = useState<"CASHIER" | "WEB_ORDERS">("CASHIER");

  // ========== STATE BARU UNTUK ORDER TYPE ==========
  const [orderType, setOrderType] = useState<"ONLINE" | "OFFLINE">("OFFLINE");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ========== PERBAIKAN: FETCH CATEGORIES DENGAN SAFE CHECK ==========
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["pos-categories"],
    queryFn: async () => {
      const response = await api.get("/categories");
      const data = response.data;

      // Handle response yang bisa berupa array langsung
      if (Array.isArray(data)) {
        return data;
      }

      // Handle response dengan pagination { data: [...], meta: ... }
      if (data && Array.isArray(data.data)) {
        return data.data;
      }

      // Fallback: return array kosong
      console.warn("Categories response is not an array:", data);
      return [];
    },
  });

  // ========== OPTIMIZED FETCH: ALL PRODUCTS FOR POS ==========
  const {
    data: products = [],
    isLoading,
    refetch,
  } = useQuery<Product[]>({
    queryKey: ["pos-products-all"],
    queryFn: async () => {
      const response = await api.get("/products/pos/all");
      return response.data;
    },
  });

  // ========== FETCH PENDING WEB ORDERS ==========
  const { data: webOrders = [], refetch: refetchWebOrders } = useQuery<any[]>({
    queryKey: ["pos-web-orders"],
    queryFn: async () => {
      const response = await api.get("/transactions?status=PENDING&orderType=ONLINE");
      // Handle response structure (check if it's .data or .data.data)
      return response.data.data || response.data || [];
    },
    enabled: activeTab === "WEB_ORDERS",
    refetchInterval: 30000, // Auto refresh every 30s
  });

  // ========== FILTERING LOGIC (LOCAL) ==========
  const filteredProducts = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchLower) ||
      p.sku.toLowerCase().includes(searchLower) ||
      p.barcode?.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  // Calculate totals
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subtotal * 0.11; // 11% PPN
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Add to cart
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);

      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          toast.error("Stok tidak cukup");
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          maxStock: product.stockQuantity,
          imageUrl: product.imageUrl,
        },
      ];
    });

    toast.success(`${product.name} ditambahkan`, {
      icon: "🛒",
      duration: 1500,
    });
  }, []);

  // Update quantity
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.maxStock) }
          : item,
      ),
    );
  }, []);

  // Remove from cart
  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
    toast.success("Item dihapus", { icon: "🗑️" });
  }, []);

  // Clear cart
  const clearCart = useCallback(() => {
    if (cart.length === 0) return;
    if (window.confirm("Yakin ingin mengosongkan keranjang?")) {
      setCart([]);
      toast.success("Keranjang dikosongkan");
    }
  }, [cart]);

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      // Validasi untuk ONLINE order
      if (orderType === "ONLINE") {
        if (!customerName.trim()) {
          throw new Error("Nama customer harus diisi untuk pesanan online");
        }
        if (!customerPhone.trim()) {
          throw new Error(
            "No WhatsApp customer harus diisi untuk pesanan online",
          );
        }
      }

      const transactionData = {
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod: paymentData.method,
        paymentAmount:
          paymentData.method === "CASH" ? paymentData.cashAmount : total,
        discount: paymentData.discount || 0,
        notes: paymentData.notes || "",
        isGuest: true,
        customerName: orderType === "ONLINE" ? customerName : "Kasir",
        customerPhone: orderType === "ONLINE" ? customerPhone : "-",
        orderType: orderType, // ONLINE atau OFFLINE
      };

      const response = await api.post("/transactions", transactionData);
      return response.data;
    },
    onSuccess: (data) => {
      setLastTransaction(data);
      setCart([]);
      setShowPaymentModal(false);

      if (orderType === "ONLINE") {
        // Kirim WA ke customer untuk minta bayar
        const waMessage = `Halo *${customerName}*,\n\nTerima kasih telah berbelanja di BumbuKu.\n\n*INVOICE:* ${data.invoiceNumber}\n*TOTAL:* Rp ${data.total.toLocaleString("id-ID")}\n\nSilakan lakukan pembayaran via transfer ke:\nBank BCA: 1234567890 a/n BumbuKu\n\nSetelah transfer, konfirmasi dengan membalas chat ini.`;

        const phone = customerPhone.startsWith("0")
          ? "62" + customerPhone.substring(1)
          : customerPhone;

        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;
        window.open(waUrl, "_blank");

        toast.success("Pesanan online dibuat! WA terkirim ke customer");

        // Reset form online
        setCustomerName("");
        setCustomerPhone("");
        setOrderType("OFFLINE");
      } else {
        setShowReceiptModal(true);
        toast.success("Transaksi berhasil!");
      }

      refetch(); // Refresh produk
    },
    onError: (error: any) => {
      console.error("Transaction error:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Gagal memproses transaksi",
      );
    },
  });

  // Handle payment
  const handlePayment = (paymentData: any) => {
    if (cart.length === 0) {
      toast.error("Keranjang belanja kosong");
      return;
    }
    createTransactionMutation.mutate(paymentData);
  };

  // Handle print receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // Confirm web order
  const confirmWebOrderMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await api.post(`/transactions/${transactionId}/confirm`);
      return response.data;
    },
    onSuccess: (data) => {
      setLastTransaction(data);
      setShowReceiptModal(true);
      toast.success("Pesanan web berhasil diselesaikan!");
      refetchWebOrders();
      refetch(); // Refresh stock
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengkonfirmasi pesanan");
    },
  });

  return {
    // Data
    categories,
    products: filteredProducts,
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
    isProcessing: createTransactionMutation.isPending,

    // Actions
    setSelectedCategory,
    setSearchTerm,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setCart, // Added
    setShowPaymentModal,
    setShowReceiptModal,
    handlePayment,
    handlePrintReceipt,
    confirmWebOrder: confirmWebOrderMutation.mutate,
    isConfirmingWebOrder: confirmWebOrderMutation.isPending,
    
    // Form management
    orderType,
    customerName,
    customerPhone,
    setOrderType,
    setCustomerName,
    setCustomerPhone,
  };
};
