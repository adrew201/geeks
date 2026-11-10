import { NavLink } from "react-router";
import { LogOut } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Avatar } from "../ui/Avatar.tsx";
import { Button } from "../ui/Button.tsx";
import { BrandLogo } from "./BrandLogo.tsx";
import type { NavItem } from "./nav-config.ts";

// 09D .sidebar: 240px, header bg, right border, 24px 16px, brand block with bottom border,
// nav items 10px 14px / 13px / 600 / radius-md; active = primary tint + primary text + border.
// .user-profile-summary pinned to the bottom, with Log out under it (not in the prototypes).

export interface SidebarUser {
  name: string;
  subtitle?: string;
}

export interface AppSidebarProps {
  items: NavItem[];
  user?: SidebarUser;
  onLogout?: () => void;
}

export function AppSidebar({ items, user, onLogout }: AppSidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between border-r border-border bg-header px-4 py-6 lg:flex">
      <div>
        <div className="border-b border-border px-3 pb-6">
          <BrandLogo />
        </div>
        <nav aria-label="Primary" className="mt-6">
          <ul className="flex flex-col gap-1">
            {items.map(({ label, to, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md border px-3.5 py-2.5 text-13 font-semibold transition-all duration-200 ease-[ease]",
                      isActive
                        ? "border-primary/35 bg-primary/14 text-primary"
                        : "border-transparent text-fg-secondary hover:bg-surface hover:text-fg",
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {(user || onLogout) && (
        <div className="flex flex-col gap-2">
          {user && (
            <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3.5">
              <Avatar name={user.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-13 font-bold">{user.name}</p>
                {user.subtitle && <p className="truncate text-11 text-fg-muted">{user.subtitle}</p>}
              </div>
            </div>
          )}
          {onLogout && (
            <Button variant="ghost" fullWidth onClick={onLogout}>
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
