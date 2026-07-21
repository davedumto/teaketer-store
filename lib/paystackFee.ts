const PERCENTAGE_RATE = 0.015; // 1.5%
const FLAT_FEE_KOBO = 10_000; // ₦100
const FLAT_FEE_WAIVER_THRESHOLD_KOBO = 250_000; // ₦2,500 — flat fee waived under this amount
const FEE_CAP_KOBO = 200_000; // ₦2,000 — local card fee cap

/**
 * Estimates Paystack's processing fee for a local-card charge, per their
 * published Nigeria pricing: 1.5% + ₦100, with the ₦100 waived on amounts
 * under ₦2,500, capped at ₦2,000. This is an estimate charged to the buyer
 * upfront — the actual fee Paystack deducts can differ slightly by payment
 * channel (card vs. transfer vs. USSD), which isn't known until checkout.
 */
export function calculatePaystackFee(amountKobo: number): number {
  if (amountKobo <= 0) return 0;

  const percentageFee = amountKobo * PERCENTAGE_RATE;
  const flatFee = amountKobo < FLAT_FEE_WAIVER_THRESHOLD_KOBO ? 0 : FLAT_FEE_KOBO;
  const fee = Math.round(percentageFee + flatFee);

  return Math.min(fee, FEE_CAP_KOBO);
}
