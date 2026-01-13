export function starText(avg: number) {
  const a = Math.max(0, Math.min(5, avg || 0));
  const full = Math.floor(a);
  const half = a - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(empty);
}
