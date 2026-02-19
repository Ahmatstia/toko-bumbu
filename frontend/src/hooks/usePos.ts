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
  price: number;
  stock: number;
  imageUrl?: string;
  categoryId: string;
  categoryName: string;
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

  // Fetch categories
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["pos-categories"],
    queryFn: async () => {
      const response = await api.get("/categories");
      return response.data;
    },
  });

  // INFINITE QUERY untuk produk
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["pos-products", selectedCategory, debouncedSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (debouncedSearch) params.append("search", debouncedSearch);
      params.append("page", pageParam.toString());
      params.append("limit", "20");

      const response = await api.get(`/products/public?${params.toString()}`);
      const productsData = response.data.data || [];
      const meta = response.data.meta;

      // Fetch stock untuk setiap produk di halaman ini
      const productsWithStock = await Promise.all(
        productsData.map(async (product: any) => {
          try {
            const stockRes = await api.get(
              `/inventory/stock?productId=${product.id}`,
            );
            const stocks = stockRes.data.stocks || [];
            const totalStock = stocks.reduce(
              (sum: number, s: any) => sum + (s.quantity || 0),
              0,
            );
            const price = stocks[0]?.sellingPrice || 0;

            return {
              ...product,
              price: Number(price),
              stock: totalStock,
              categoryName: product.category?.name || "",
            };
          } catch (error) {
            console.error(`Error fetching stock for ${product.name}:`, error);
            return {
              ...product,
              price: 0,
              stock: 0,
              categoryName: product.category?.name || "",
            };
          }
        }),
      );

      // Hanya tampilkan produk dengan stok > 0 (untuk kasir)
      const inStock = productsWithStock.filter((p: any) => p.stock > 0);

      return {
        products: inStock,
        meta,
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.meta?.page < lastPage.meta?.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Gabungkan semua produk dari semua halaman
  const allProducts = data?.pages.flatMap((page) => page.products) || [];

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
        if (existing.quantity >= product.stock) {
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
          maxStock: product.stock,
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

  return {
    // Data
    categories,
    products: allProducts,
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
    isProcessing: createTransactionMutation.isPending,

    // ========== STATE & ACTIONS BARU ==========
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
  };
};
