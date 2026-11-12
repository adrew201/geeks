import { NavLink } from "react-router";
import { cn } from "../../lib/cn.ts";
import type { NavItem } from "./nav-config.ts";

// Mobile tabs, minimalist: no border, a blurred page-colour bar, icon over a 10px label,
// muted, active = full-strength text.

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-[8px] lg:hidden"
    >
      <ul className="flex h-16 items-center justify-around px-2">
        {items.map(({ label, to, icon: Icon }) => (
          <li key={to} className="flex flex-1 justify-center">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-[3px] px-2 py-1 text-10 font-medium transition-colors duration-200",
                  isActive ? "text-fg" : "text-fg-muted hover:text-fg-secondary",
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
