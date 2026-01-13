export function formatMoneyFromCents(priceCents: number) {
  const v = Math.round(priceCents / 100);
  return v.toLocaleString("vi-VN") + "$";
}
