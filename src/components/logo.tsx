/** Marca CRMEI: "C" isométrico em linha. Usa currentColor para o traço. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="236 210 280 332" className={className} fill="none" stroke="currentColor" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M380 222 L248 292 L248 458 L380 530 L503 460 L503 410 L462 388 L380 435 L335 410 L335 340 L380 316 L462 360 L503 340 L503 292 Z" />
      <path d="M248 292 L290 316 L290 435 L380 483 L503 413" />
      <path d="M290 316 L380 268 L462 312 L503 292" />
      <path d="M462 312 L462 360" />
      <path d="M380 268 L380 316" />
      <path d="M290 316 L335 340" />
      <path d="M290 435 L335 410" />
      <path d="M380 435 L380 530" />
    </svg>
  );
}

export const Logo = ({ inverted = false }: { inverted?: boolean }) => (
  <div className="flex items-center gap-2.5 font-bold">
    <span className={`grid size-8 place-items-center rounded-lg ${inverted ? "bg-white/10 text-[#CDEFB0]" : "bg-[#13301F] text-[#CDEFB0]"}`}><LogoMark className="size-6" /></span>
    <span className={inverted ? "text-white" : undefined}>CRMEI</span>
  </div>
);
