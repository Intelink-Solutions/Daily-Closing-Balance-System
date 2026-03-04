const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatInr(value: number): string {
  return inrFormatter.format(value);
}

export function formatSignedInr(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatInr(Math.abs(value))}`;
}
