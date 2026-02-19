// frontend/src/utils/format.ts
export const formatPrice = (price: number): string => {
  if (!price && price !== 0) return "Rp 0";
  return `Rp ${Math.round(price).toLocaleString("id-ID")}`;
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return "-";
  if (phone.startsWith("0")) {
    return "62" + phone.substring(1);
  }
  return phone;
};
