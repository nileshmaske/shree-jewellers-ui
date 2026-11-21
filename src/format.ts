const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function formatINR(value: number) {
  return inr.format(value);
}
