import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const UPIQRCode = ({
  upiId,
  amount,
  merchantName = 'FA POS Store',
  transactionNote = 'Payment for Purchase',
  onCancel
}) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const generateQRCode = async () => {
      if (!upiId) {
        setError('UPI ID is required');
        return;
      }

      try {
        // Format UPI URL according to UPI specifications
        // Format: upi://pay?pa=UPI_ID&pn=MERCHANT_NAME&am=AMOUNT&cu=CURRENCY&tn=TRANSACTION_NOTE
        const upiUrl = new URL('upi://pay');
        upiUrl.searchParams.append('pa', upiId); // Payee Address (UPI ID)
        upiUrl.searchParams.append('pn', merchantName); // Payee Name
        upiUrl.searchParams.append('am', amount.toString()); // Amount
        upiUrl.searchParams.append('cu', 'INR'); // Currency
        upiUrl.searchParams.append('tn', transactionNote); // Transaction Note

        const qrDataUrl = await QRCode.toDataURL(upiUrl.toString(), {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M' // Medium error correction
        });

        setQrDataUrl(qrDataUrl);
        setError('');
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        setError('Failed to generate QR code');
      }
    };

    generateQRCode();
  }, [upiId, amount, merchantName, transactionNote]);

  const handlePrint = () => {
    if (!qrDataUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>UPI Payment QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .qr-container {
              border: 2px solid #000;
              padding: 20px;
              max-width: 350px;
              margin: 0 auto;
            }
            .qr-code {
              margin: 20px 0;
            }
            .qr-code img {
              max-width: 100%;
              height: auto;
            }
            .details {
              font-size: 14px;
              margin: 10px 0;
            }
            .amount {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            .upi-id {
              font-size: 16px;
              font-weight: bold;
              color: #059669;
              word-break: break-all;
            }
            @media print {
              body { padding: 0; }
              .qr-container { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>UPI Payment</h2>
            <div class="amount">₹${amount}</div>
            <div class="qr-code">
              <img src="${qrDataUrl}" alt="UPI QR Code" />
            </div>
            <div class="details">
              <p>Scan this QR code with any UPI app</p>
              <p><strong>UPI ID:</strong> <span class="upi-id">${upiId}</span></p>
              <p><strong>Merchant:</strong> ${merchantName}</p>
              <p><strong>Note:</strong> ${transactionNote}</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for images to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-red-600">
        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Scan to Pay
      </h3>

      {qrDataUrl ? (
        <div className="relative">
          <div className="bg-white p-3 rounded-lg shadow-lg border-2 border-gray-200">
            <img
              src={qrDataUrl}
              alt="UPI Payment QR Code"
              className="w-64 h-64 object-contain"
            />
          </div>

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-64 h-64 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      <div className="text-center space-y-2 max-w-xs">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          ₹{amount}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pay to <span className="font-semibold text-green-600">{upiId}</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Use any UPI app: GPay, PhonePe, Paytm, etc.
        </p>
      </div>

      <div className="flex gap-2 w-full">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel Payment
          </button>
        )}

        <button
          onClick={handlePrint}
          disabled={!qrDataUrl}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print QR
        </button>
      </div>
    </div>
  );
};

export default UPIQRCode;