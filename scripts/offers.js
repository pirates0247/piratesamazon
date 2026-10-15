export const availableOffers = [
  // Keep in sync with the offers shown in payment.html
  { code: 'SAVE10', type: 'percent', value: 10, appliesTo: ['UPI'], minAmount: 0 },
  { code: 'HDFC5', type: 'percent', value: 5, appliesTo: ['Card'], minAmount: 0 },
  { code: 'PAYTM50', type: 'fixed', value: 50, appliesTo: ['Wallet'], minAmount: 0 }
];

export function normalizeOfferCode(code) {
  return (code || '').toString().trim().toUpperCase();
}

export function getOfferByCode(code) {
  const normalized = normalizeOfferCode(code);
  return availableOffers.find((o) => o.code === normalized) || null;
}

export function computeDiscount({ offer, methodType, subtotal }) {
  // subtotal: items + shipping + tax already excluded? we will apply on total before discount.
  if (!offer) return { discount: 0, appliedCode: null };

  if (offer.minAmount && subtotal < offer.minAmount) {
    return { discount: 0, appliedCode: null };
  }

  if (offer.appliesTo && offer.appliesTo.length && !offer.appliesTo.includes(methodType)) {
    return { discount: 0, appliedCode: null };
  }

  let discount = 0;
  if (offer.type === 'percent') {
    discount = subtotal * (offer.value / 100);
  } else if (offer.type === 'fixed') {
    discount = offer.value;
  }

  // Cap discount at subtotal
  discount = Math.max(0, Math.min(discount, subtotal));

  return { discount, appliedCode: offer.code };
}

