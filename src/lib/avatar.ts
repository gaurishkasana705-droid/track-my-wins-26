export function initials(name?: string | null, email?: string | null): string {
  const src = (name || email || "?").trim();
  if (!src) return "?";
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || src[0].toUpperCase();
}
