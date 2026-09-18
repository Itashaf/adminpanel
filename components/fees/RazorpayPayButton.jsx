'use client';

import { useState } from 'react';
import Script from 'next/script';
import { FiCreditCard } from 'react-icons/fi';
import Button from '@/components/Button';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/lib/api';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Razorpay Standard Checkout: create-order (server) → open the Checkout
// modal (client) → verify-signature (server). The client never sees or sets
// the amount — it comes back from create-order, which read it from the
// StudentFee row itself (the *remaining due*, not the full totalAmount — a
// PARTIAL fee with some already collected manually only owes the rest).
export default function RazorpayPayButton({ fee, studentName, contact, email, onSuccess, onError }) {
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const remainingDue = fee.payableAmount - fee.paidAmount;

  const handlePay = async () => {
    if (!isScriptReady || typeof window.Razorpay === 'undefined') {
      onError?.('Payment gateway is still loading — try again in a moment.');
      return;
    }

    setIsProcessing(true);
    try {
      const order = await createRazorpayOrder(fee.id);

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'SchoolApp 360',
        description: `${fee.term} Fee Payment`,
        prefill: { name: studentName, contact: contact || '', email: email || '' },
        theme: { color: '#4338CA' },
        // Puts the UPI block first in the checkout screen (most parents pay
        // this way) without removing cards/netbanking/wallet — a preference,
        // not a restriction to UPI only.
        config: {
          display: {
            blocks: {
              upi: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: { show_default_blocks: true },
          },
        },
        modal: {
          // User closed the checkout modal without paying — not an error,
          // just stop showing the "processing" state.
          ondismiss: () => setIsProcessing(false),
        },
        handler: async (response) => {
          try {
            const result = await verifyRazorpayPayment({
              studentFeeId: fee.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onSuccess?.(result.studentFee, `Payment of ${formatCurrency(remainingDue)} received via Razorpay.`);
          } catch (err) {
            onError?.(err.message);
          } finally {
            setIsProcessing(false);
          }
        },
      });

      // Fires for a declined card, insufficient funds, etc. — Razorpay never
      // calls `handler` in this case, so this is the only place a failed
      // (as opposed to abandoned) payment gets reported back to the user.
      razorpay.on('payment.failed', (response) => {
        setIsProcessing(false);
        onError?.(response.error?.description || 'Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (err) {
      setIsProcessing(false);
      onError?.(err.message);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setIsScriptReady(true)} />
      <Button
        label={isProcessing ? 'Processing...' : `Pay ${formatCurrency(remainingDue)} Online`}
        variant="secondary"
        icon={<FiCreditCard className="w-4 h-4" />}
        onClick={handlePay}
        disabled={isProcessing || !isScriptReady}
        fullWidth
      />
    </>
  );
}
