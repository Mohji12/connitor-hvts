export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color: string };
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export function loadRazorpay(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay is only available in the browser.'));
  }
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay.'));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  await loadRazorpay();
  if (!window.Razorpay) {
    throw new Error('Could not load Razorpay.');
  }
  const checkout = new window.Razorpay(options);
  checkout.open();
}
