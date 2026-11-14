const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (cents: number) => fmt.format(cents / 100);
export const formatSigned = (cents: number) => (cents > 0 ? "+" : cents < 0 ? "−" : "") + fmt.format(Math.abs(cents) / 100);
export const formatCompact = (cents: number) => {
  const v = cents / 100;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
};
/** "1.234,56" | "1234,5" | "12" -> centavos. Retorna null se inválido. */
export function parseBRL(input: string): number | null {
  const s = input.replace(/[R$\s.]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}
