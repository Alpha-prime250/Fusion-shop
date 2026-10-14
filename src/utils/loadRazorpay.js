/**
 * Dynamically loads the Razorpay Checkout script (only once) and resolves
 * once window.Razorpay is available.
 */
export function loadRazorpayScript() {
  return new Promise(resolve => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
