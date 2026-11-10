import { Link } from "react-router";
import { cn } from "../../lib/cn.ts";

// .brand-logo: gradient square "P2P" (display font, 800→700); 32px/radius 8 on desktop,
// 26–28px/radius 6 on mobile. .brand-name: display font 700, 18px (15px mobile).
const SIZES = {
  sm: { mark: "size-7 rounded-sm text-11", name: "text-15", gap: "gap-2" },
  md: { mark: "size-8 rounded-8 text-13", name: "text-18", gap: "gap-3" },
} as const;

export interface BrandLogoProps {
  size?: keyof typeof SIZES;
  showName?: boolean;
  to?: string;
  className?: string;
}

export function BrandLogo({ size = "md", showName = true, to = "/", className }: BrandLogoProps) {
  const s = SIZES[size];
  return (
    <Link to={to} className={cn("inline-flex items-center", s.gap, className)} aria-label="Play2Pro home">
      <span
        aria-hidden="true"
        className={cn("flex items-center justify-center bg-brand-gradient font-display font-bold text-white", s.mark)}
      >
        P2P
      </span>
      {showName && <span className={cn("font-display font-bold text-fg", s.name)}>Play2Pro</span>}
    </Link>
  );
}
