import { useEffect, useState } from 'react';
import useUIStore from '../../stores/uiStore';
import useSettingsStore from '../../stores/settingsStore';

const PaymentStatusChecker = ({
  saleId,
  amount,
  onPaymentReceived,
  onTimeout,
  timeoutSeconds = 300 // 5 minutes default timeout
}) => {
  const showAlert = useUIStore((state) => state.showAlert);
  const settings = useSettingsStore((state) => state.settings);
  const currency = settings?.currency ?? settings?.currencySymbol ?? 'Rs.';
  const [status, setStatus] = useState('waiting'); // waiting, checking, received, timeout, error
  const [timeRemaining, setTimeRemaining] = useState(timeoutSeconds);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 60; // Maximum check attempts

  // Format time remaining as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (status === 'received' || status === 'timeout' || status === 'error') {
      return;
    }

    const checkInterval = 5000; // Check every 5 seconds
    const timerInterval = 1000; // Update timer every second

    let checkTimer;
    let timerTimer;

    // Timer countdown
    timerTimer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setStatus('timeout');
          if (onTimeout) {
            onTimeout();
          }
          showAlert('warning', 'Payment timeout. Please verify if payment was completed.');
          return 0;
        }
        return prev - 1;
      });
    }, timerInterval);

    // Payment status checker
    checkTimer = setInterval(async () => {
      if (attempts >= maxAttempts) {
        setStatus('timeout');
        if (onTimeout) {
          onTimeout();
        }
        return;
      }

      try {
        setStatus('checking');
        setAttempts(prev => prev + 1);

        // Check payment status - this would need to be implemented in your backend
        const response = await fetch(`/api/v1/sales/${saleId}/payment-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to check payment status');
        }

        const data = await response.json();

        if (data.status === 'completed') {
          setStatus('received');
          if (onPaymentReceived) {
            onPaymentReceived(data);
          }
          showAlert('success', `Payment of ${currency}${amount} received successfully!`);
        } else if (data.status === 'failed') {
          setStatus('error');
          showAlert('error', 'Payment failed. Please try again.');
        } else {
          setStatus('waiting'); // Still waiting for payment
        }
      } catch (error) {
        console.error('Payment status check failed:', error);
        setStatus('waiting'); // Continue waiting on error
      }
    }, checkInterval);

    return () => {
      clearInterval(checkTimer);
      clearInterval(timerTimer);
    };
  }, [status, attempts, saleId, amount, onPaymentReceived, onTimeout, showAlert, maxAttempts, timeoutSeconds]);

  const getStatusColor = () => {
    switch (status) {
      case 'waiting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'checking':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'received':
        return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'timeout':
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'waiting':
        return (
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'checking':
        return (
          <svg className="animate-pulse h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'received':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'timeout':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'waiting':
        return 'Waiting for payment...';
      case 'checking':
        return 'Checking payment status...';
      case 'received':
        return 'Payment received!';
      case 'timeout':
        return 'Payment timeout';
      case 'error':
        return 'Payment error';
      default:
        return 'Checking status...';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <p className="font-medium">{getStatusText()}</p>
            <p className="text-sm opacity-75">
              Amount: {currency}{amount} | Attempts: {attempts}/{maxAttempts}
            </p>
          </div>
        </div>

        {status !== 'received' && (
          <div className="text-right">
            <p className="text-sm font-medium">Time Remaining</p>
            <p className="text-2xl font-bold">{formatTime(timeRemaining)}</p>
          </div>
        )}
      </div>

      {status === 'received' && (
        <div className="mt-4 text-center">
          <p className="text-sm">
            Transaction completed successfully. Invoice has been generated.
          </p>
        </div>
      )}

      {(status === 'timeout' || status === 'error') && (
        <div className="mt-4 text-center">
          <p className="text-sm">
            Please verify if the payment was completed in your UPI app.
            If paid, contact support for assistance.
          </p>
        </div>
      )}

      {status === 'waiting' || status === 'checking' ? (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${((timeoutSeconds - timeRemaining) / timeoutSeconds) * 100}%`
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PaymentStatusChecker;