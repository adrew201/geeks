import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { ButtonLink } from "../ui/Button.tsx";
import { BrandLogo } from "./BrandLogo.tsx";
import { PUBLIC_NAV, ROUTES } from "./nav-config.ts";

// 01D .nav-header: sticky, 16px 48px, bg/90 + 12px blur, links 13px/600 secondary.
// 01M: "Get Started" + hamburger; overlay with 16px/700 links and a Log In button.

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const menuId = useId();
  const [lastLocation, setLastLocation] = useState(location);

  // Close the mobile menu whenever the route or hash changes.
  if (lastLocation !== location) {
    setLastLocation(location);
    if (menuOpen) setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-[12px]">
      <div className="flex items-center justify-between gap-4 px-4 py-3.5 lg:px-12 lg:py-4">
        <BrandLogo size="md" />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {PUBLIC_NAV.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="text-13 font-semibold text-fg-secondary transition-colors duration-200 hover:text-fg"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Responsive display classes live on wrappers, never on ButtonLink: its base class
            sets inline-flex and cn() has no tailwind-merge, so `hidden` on the button itself
            loses and every variant renders (the 390px overflow bug). */}
        <div className="hidden items-center gap-3 lg:flex">
          <ButtonLink to={ROUTES.login} variant="ghost">
            Log In
          </ButtonLink>
          <ButtonLink to={ROUTES.signup}>Get Started</ButtonLink>
        </div>

        {/* 01M: one "Get Started" + hamburger; Log In lives in the overlay. */}
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <ButtonLink to={ROUTES.signup} size="sm">
            Get Started
          </ButtonLink>
          <button
            type="button"
            className="flex cursor-pointer p-1 text-fg-muted hover:text-fg"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id={menuId}
          className="absolute inset-x-0 top-full flex h-[calc(100dvh-100%)] flex-col gap-4 border-t border-border bg-header p-6 lg:hidden"
        >
          <nav aria-label="Main mobile">
            <ul className="flex flex-col gap-4">
              {PUBLIC_NAV.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-16 font-bold text-fg" onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ButtonLink to={ROUTES.login} variant="secondary" fullWidth>
            Log In
          </ButtonLink>
        </div>
      )}
    </header>
  );
}
