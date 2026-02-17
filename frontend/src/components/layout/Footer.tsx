import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">BumbuKu</h3>
            <p className="text-gray-300">
              Toko bumbu dapur lengkap untuk kebutuhan masak Anda.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-white">
                  Home
                </a>
              </li>
              <li>
                <a href="/products" className="text-gray-300 hover:text-white">
                  Produk
                </a>
              </li>
              <li>
                <a href="/cart" className="text-gray-300 hover:text-white">
                  Keranjang
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Kontak</h4>
            <ul className="space-y-2 text-gray-300">
              <li>Jl. Contoh No. 123</li>
              <li>Telp: 0812-3456-7890</li>
              <li>Email: info@bumbuku.com</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Jam Operasional</h4>
            <ul className="space-y-2 text-gray-300">
              <li>Senin - Jumat: 08:00 - 20:00</li>
              <li>Sabtu: 08:00 - 18:00</li>
              <li>Minggu: 09:00 - 15:00</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
          <p>&copy; 2026 BumbuKu. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
