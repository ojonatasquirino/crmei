import { useId } from "react";

const PATH = "M380 222L503 291L503 338L462 360L462 313L503 291M380 268L462 313M380 268L290 313L290 436M380 268L380 313L462 360M380 313L336 338L336 410L380 436M248 291L290 313M248 291L380 222M248 291L248 458L380 530L503 460L503 410L462 388L380 436M290 436L380 480L503 410M380 480L380 530M290 436L336 410M248 458L290 436";

/** Marca CRMEI: C isométrico em traço verde-claro sobre degradê verde (claro → escuro). */
export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="200 200 352 352" aria-hidden="true" className="shrink-0 rounded-lg">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3F8A55" />
          <stop offset="1" stopColor="#0E2A1E" />
        </linearGradient>
      </defs>
      <rect x="200" y="200" width="352" height="352" fill={`url(#${id})`} />
      <path d={PATH} fill="none" stroke="#CBEBAA" strokeWidth="14" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export const Logo = () => (
  <div className="flex items-center gap-2.5 font-bold">
    <LogoMark />
    <span>CRMEI</span>
  </div>
);
