import { Outlet } from "react-router";
import { Award, Compass, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../components/layout/BrandLogo.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { RAD_SCORE_LABEL } from "../config/labels.ts";

// 02D: 45% brand panel (header bg + primary corner glow, 48px padding) and 55% auth panel
// with a 460px card (surface, radius-xl, 32px, shadow-card). Mobile shows only the card.

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Build Your Gaming Identity",
    text: "Consolidate all competitive titles under one Gamer ID.",
  },
  {
    icon: Award,
    title: "Skills Passport & Telemetry",
    text: "Evidence-based performance metrics and community signals.",
  },
  {
    icon: Compass,
    title: "Talent Discovery Platform",
    text: "Direct connection with esports coaches and brand sponsors.",
  },
];

export default function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[45fr_55fr]">
      <aside className="hidden flex-col justify-between border-r border-border bg-header bg-glow-primary p-12 lg:flex">
        <div>
          <BrandLogo className="mb-12" />
          <h1 className="text-gradient-hero mb-4 font-display text-34 font-bold">
            Your Gameplay Has Potential. Let&apos;s Unlock It.
          </h1>
          <p className="max-w-[440px] text-15 leading-[1.6] text-fg-secondary">
            Create your digital identity, showcase verified gameplay skills, and connect with scouting
            opportunities in competitive gaming.
          </p>
          <ul className="mt-7 flex flex-col gap-4">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/14 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-14 font-bold">{title}</p>
                  <p className="text-12 text-fg-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Static Skills Passport preview (02D) */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-8 bg-brand-gradient font-display text-12 font-bold text-white"
          >
            SV
          </span>
          <div>
            <p className="flex items-center gap-2 text-13 font-bold">
              ShadowViper
              <Badge tone="blue" size="sm">
                Verified
              </Badge>
            </p>
            <p className="text-11 text-fg-muted">Valorant • {RAD_SCORE_LABEL}: 9,420</p>
          </div>
        </div>
      </aside>

      <div className="flex flex-col bg-bg">
        <header className="flex items-center border-b border-border bg-header px-5 py-4 lg:hidden">
          <BrandLogo size="sm" />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-8 lg:p-12">
          <div className="flex w-full max-w-[460px] flex-col gap-6 rounded-xl border border-border bg-surface p-6 shadow-card sm:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
