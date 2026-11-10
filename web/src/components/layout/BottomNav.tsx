import { NavLink } from "react-router";
import { cn } from "../../lib/cn.ts";
import type { NavItem } from "./nav-config.ts";

// 05M .mobile-bottom-nav: 64px, header bg, top border; .nav-tab: icon over 10px/600 label,
// muted, active = primary.

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-header pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex h-16 items-center justify-around px-2">
        {items.map(({ label, to, icon: Icon }) => (
          <li key={to} className="flex flex-1 justify-center">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-[3px] px-2 py-1 text-10 font-semibold transition-colors duration-200",
                  isActive ? "text-primary" : "text-fg-muted hover:text-fg-secondary",
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
