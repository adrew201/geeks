import { Link } from "react-router";
import { BrandLogo } from "./BrandLogo.tsx";
import { FOOTER_COLUMNS } from "./nav-config.ts";

// 01D .site-footer: page bg, top border, 48px 48px 24px; grid 2fr + 4×1fr, gap 32;
// column titles 12px/700 uppercase; links 13px muted; copyright 11px muted.

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-10 border-t border-border bg-page px-4 pt-12 pb-6 lg:px-12">
      <div className="grid grid-cols-2 gap-8 lg:grid-cols-[2fr_repeat(4,1fr)]">
        <div className="col-span-2 lg:col-span-1">
          <BrandLogo className="mb-3" />
          <p className="max-w-[280px] text-12 text-fg-muted">
            Turning Casual Gamers into Professionals through evidence-based talent discovery.
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="mb-4 text-12 font-bold uppercase tracking-[0.5px] text-fg">{column.title}</h2>
            <ul className="flex flex-col gap-2.5 text-13">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-fg-muted transition-colors duration-200 hover:text-fg">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-border pt-5 text-center text-11 text-fg-muted">
        © 2026 Play2Pro Platform. All rights reserved.
      </p>
    </footer>
  );
}
