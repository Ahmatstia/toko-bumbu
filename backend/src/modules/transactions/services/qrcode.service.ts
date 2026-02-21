import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode') as {
  toDataURL: (text: string, options?: Record<string, unknown>) => Promise<string>;
  toBuffer: (text: string, options?: Record<string, unknown>) => Promise<Buffer>;
};

interface TransactionQRData {
  invoiceNumber: string;
  total: number;
  paymentCode: string;
  paymentMethod: string;
}

@Injectable()
export class QRCodeService {
  /**
   * Generate QR Code sebagai Data URL (base64)
   * @param data Data yang akan diencode (bisa string atau object)
   * @returns Promise<string> Data URL QR Code
   */
  async generateQRCode(data: unknown): Promise<string> {
    try {
      // Konversi data ke string JSON jika object
      const text = typeof data === 'string' ? data : JSON.stringify(data);

      // Generate QR Code sebagai Data URL
      const qrCodeDataURL = await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'H', // High error correction
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR Code:', error);
      throw new Error('Gagal generate QR Code');
    }
  }

  /**
   * Generate QR Code untuk pembayaran
   * @param transaction Data transaksi
   * @returns Promise<string> Data URL QR Code
   */
  async generatePaymentQRCode(transaction: TransactionQRData): Promise<string> {
    // Data yang akan diencode dalam QR Code
    const paymentData = {
      type: 'PAYMENT',
      invoice: transaction.invoiceNumber,
      amount: transaction.total,
      code: transaction.paymentCode,
      method: transaction.paymentMethod,
      merchant: 'BUMBUKU',
      timestamp: new Date().toISOString(),
    };

    return this.generateQRCode(paymentData);
  }

  /**
   * Generate QR Code dalam format file (untuk download)
   * @param data Data yang akan diencode
   * @returns Promise<Buffer> Buffer QR Code
   */
  async generateQRCodeBuffer(data: unknown): Promise<Buffer> {
    const text = typeof data === 'string' ? data : JSON.stringify(data);

    const buffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });

    return buffer;
  }
}
