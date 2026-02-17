import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const OrderSuccess: React.FC = () => {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-6">
          <CheckCircleIcon className="h-24 w-24 text-green-500 mx-auto" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Pesanan Berhasil!
        </h1>
        
        <p className="text-lg text-gray-600 mb-2">
          Terima kasih telah berbelanja di BumbuKu
        </p>
        
        <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-6 my-8">
          <p className="text-sm text-gray-600 mb-2">Nomor Invoice</p>
          <p className="text-2xl font-bold text-primary-600 font-mono">
            {invoiceNumber}
          </p>
        </div>
        
        <p className="text-gray-600 mb-8">
          Pesanan Anda akan segera diproses. Silakan siapkan pembayaran sesuai metode yang dipilih.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/products"
            className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors font-semibold"
          >
            Belanja Lagi
          </Link>
          <Link
            to="/"
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
          >
            Kembali ke Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;