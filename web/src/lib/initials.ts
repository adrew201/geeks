/** "ShadowViper" → "SV", "Coach Marcus" → "CM", "nova" → "NO". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s_-]+/).filter(Boolean);
  const first = parts[0] ?? "";
  if (parts.length === 1) {
    const caps = first.match(/[A-Z]/g);
    return (caps && caps.length >= 2 ? caps.slice(0, 2).join("") : first.slice(0, 2)).toUpperCase();
  }
  return `${first[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}
