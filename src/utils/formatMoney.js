export function formatMoney(amount) {
  const value = Number(amount) || 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MWK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}