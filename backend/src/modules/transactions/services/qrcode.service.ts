import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QRCodeService {
  /**
   * Generate QR Code sebagai Data URL (base64)
   * @param data Data yang akan diencode (bisa string atau object)
   * @returns Promise<string> Data URL QR Code
   */
  async generateQRCode(data: any): Promise<string> {
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
  async generatePaymentQRCode(transaction: any): Promise<string> {
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
  async generateQRCodeBuffer(data: any): Promise<Buffer> {
    const text = typeof data === 'string' ? data : JSON.stringify(data);

    const buffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });

    return buffer;
  }
}
