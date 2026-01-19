export function formatMoneyFromCents(priceCents: number) {
  const v = priceCents / 100;
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "$";
}
