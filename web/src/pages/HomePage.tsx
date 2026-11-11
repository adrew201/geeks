import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import {
  Award,
  CircleCheck,
  CloudUpload,
  Compass,
  Cpu,
  Gamepad2,
  HandCoins,
  Search,
  ShieldCheck,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { homeRouteFor, ROUTES } from "../components/layout/nav-config.ts";
import { Avatar } from "../components/ui/Avatar.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { ButtonLink } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";
import type { Tone } from "../components/ui/tone-styles.ts";
import { TrustBadge } from "../components/ui/TrustBadge.tsx";
import { RAD_SCORE_LABEL } from "../config/labels.ts";
import { cn } from "../lib/cn.ts";
import { useMediaQuery } from "../lib/use-media-query.ts";
import { useSession } from "../lib/session.ts";

// Landing page (01D). Sections and anchors match PUBLIC_NAV / footer links in nav-config.ts:
// #how-it-works, #for-gamers, #for-coaches, #for-sponsors, #passport.
// Copy follows 01D except the out-of-scope parts (docs/ui-audit.md §10): no VOD/unlock lines,
// no storyboard frame 05, and "Ranking Score" is the Rad Score (decision 5).
// Motion (01D:707 and :911 placeholders): the hero pipeline and the storyboard step through
// their stages on one timer; with prefers-reduced-motion they stay still, all stages shown.

const STEP_MS = 1800;

const PIPELINE: { label: string; title: string; icon: LucideIcon; tone: Tone }[] = [
  { label: "01. Evidence", title: "Gameplay clips", icon: Video, tone: "blue" },
  { label: "02. Passport", title: "AI insights", icon: Award, tone: "violet" },
  { label: "03. Discovery", title: "Coach match", icon: Compass, tone: "green" },
];

const STORYBOARD: { title: string; icon: LucideIcon }[] = [
  { title: "Clip submitted", icon: Video },
  { title: "Evidence extracted", icon: Cpu },
  { title: "Passport built", icon: Award },
  { title: "Coach discovers", icon: Search },
];

const VALUES: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "Gamer ID", text: "A structured profile of your gaming ability", icon: Award },
  { title: "AI-assessed insights", text: "Evidence-based gameplay analysis", icon: Cpu },
  { title: "Community feedback", text: "Peer votes and ranking signals", icon: Users },
  { title: "Talent discovery", text: "A direct line to coaches and sponsors", icon: Compass },
];

const STEPS = [
  { title: "Create your Gamer ID", text: "Build your profile and pick the competitive games you play." },
  { title: "Showcase gameplay", text: "Submit unedited clips as evidence of how you play." },
  { title: "Build your passport", text: "AI insights, community votes and your Rad Score come together." },
  { title: "Get discovered", text: "Coaches and sponsors review your evidence and reach out." },
];

const GAMER_FEATURES: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "Showcase your skills", text: "Submit clips and keep your best evidence in one place.", icon: CloudUpload },
  { title: "Build your reputation", text: `Earn community votes and grow your ${RAD_SCORE_LABEL}.`, icon: ShieldCheck },
  { title: "Earn from your play", text: "Receive donations and win sponsor bounties, paid out with PayPal.", icon: HandCoins },
];

const AUDIENCES: { id: string; badge: string; tone: Tone; title: string; points: string[]; cta: string }[] = [
  {
    id: "for-coaches",
    badge: "For coaches",
    tone: "blue",
    title: "Scout and evaluate candidates",
    points: [
      "Search gamers by game, region and Rad Score",
      "Read AI skill summaries backed by real clips",
      "Get AI-suggested matches for your roster",
    ],
    cta: "Discover players",
  },
  {
    id: "for-sponsors",
    badge: "For sponsors",
    tone: "violet",
    title: "Back rising esports talent",
    points: [
      "Spot competitive talent early",
      "See community engagement and ranking signals",
      "Fund bounties that reward real gameplay",
    ],
    cta: "Explore talent",
  },
];

/** Index of the highlighted stage, or null when motion is reduced (everything shown at once). */
function useStep(count: number): number | null {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setStep((current) => (current + 1) % count), STEP_MS);
    return () => clearInterval(timer);
  }, [count, reduced]);
  return reduced ? null : step;
}

/** React Router doesn't scroll to #hash links; do it here so the header and footer links work. */
function useHashScroll() {
  const { hash, key } = useLocation();
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, key]);
}

export default function HomePage() {
  const session = useSession();
  const home = session ? homeRouteFor(session.role) : null;
  const pipelineStep = useStep(PIPELINE.length);
  const storyStep = useStep(STORYBOARD.length);
  useHashScroll();

  useEffect(() => {
    document.title = "Play2Pro · Turning casual gamers into professionals";
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-14 lg:px-12 lg:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,color-mix(in_srgb,var(--color-ai)_12%,transparent),transparent_60%)]"
        />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <p className="flex items-center gap-1.5 text-11 font-bold uppercase tracking-[1px] text-primary">
              <Zap className="size-3.5" aria-hidden="true" />
              The next generation of gaming talent
            </p>
            <h1 className="font-display text-36 leading-[1.1] font-bold tracking-[-1px] lg:text-46">
              Your gaming skills deserve more than just views.
            </h1>
            <p className="max-w-[520px] text-15 leading-relaxed text-fg-secondary">
              Turn your gameplay into a professional profile. Show your skills, get discovered by coaches and sponsors,
              and earn through donations and bounties.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {home ? (
                <ButtonLink to={home} size="lg">
                  Go to my home
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to={ROUTES.signup} size="lg">
                    <Gamepad2 className="size-4" aria-hidden="true" />
                    I'm a gamer
                  </ButtonLink>
                  <ButtonLink to={ROUTES.signup} size="lg" variant="secondary">
                    <Search className="size-4" aria-hidden="true" />
                    I'm looking for talent
                  </ButtonLink>
                </>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-12 text-fg-muted">
              <CircleCheck className="size-3.5 text-success" aria-hidden="true" />
              Build your profile. Prove your potential. Get discovered.
            </p>
          </div>

          <Card large className="gap-5" aria-label="How Play2Pro works: evidence, passport, discovery">
            <p className="text-12 font-semibold text-fg-secondary">From clip to coach</p>
            <ol className="grid grid-cols-3 gap-3">
              {PIPELINE.map((stage, index) => {
                const active = pipelineStep === null || pipelineStep === index;
                const Icon = stage.icon;
                return (
                  <li
                    key={stage.label}
                    className={cn(
                      "flex flex-col items-center gap-2.5 rounded-lg border bg-inset p-3 text-center transition-all duration-500",
                      active ? "border-border-light opacity-100" : "border-border opacity-45",
                    )}
                  >
                    <Badge tone={stage.tone} size="sm">
                      {stage.label}
                    </Badge>
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-full border border-border bg-surface transition-transform duration-500",
                        active && pipelineStep !== null && "scale-110",
                      )}
                    >
                      <Icon className="size-5 text-fg" aria-hidden="true" />
                    </span>
                    <span className="text-12 font-semibold">{stage.title}</span>
                  </li>
                );
              })}
            </ol>
            <div className="h-1 overflow-hidden rounded-full bg-inset" aria-hidden="true">
              <div
                className="h-full rounded-full bg-brand-gradient transition-[width] duration-700"
                style={{ width: `${(((pipelineStep ?? PIPELINE.length - 1) + 1) / PIPELINE.length) * 100}%` }}
              />
            </div>
          </Card>
        </div>
      </section>

      {/* Value strip */}
      <section aria-label="What Play2Pro offers" className="border-y border-border bg-header px-4 py-6 lg:px-12">
        <ul className="mx-auto grid max-w-[1200px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ title, text, icon: Icon }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/14 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-11 font-bold uppercase tracking-[0.5px]">{title}</p>
                <p className="text-12 text-fg-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <Section id="how-it-works" title="From gameplay to opportunity" subtitle="Your gaming journey shouldn't end when the match does.">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full gap-3 transition-colors duration-200 hover:border-border-light">
                <span className="font-display text-28 font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="text-15 font-bold">{step.title}</h3>
                <p className="text-13 text-fg-muted">{step.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      {/* For gamers */}
      <Section id="for-gamers">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-4">
            <Badge tone="blue">For gamers</Badge>
            <h2 className="font-display text-28 font-bold lg:text-32">Your talent. Your profile. Your opportunity.</h2>
            <p className="text-14 text-fg-secondary">
              Stop letting your best gameplay disappear into your camera roll. Build a profile that brings your gaming
              journey, achievements and evidence together.
            </p>
            <ButtonLink to={home ?? ROUTES.signup} size="lg">
              {home ? "Go to my home" : "Create your Gamer ID"}
            </ButtonLink>
          </div>
          <ul className="flex flex-col gap-3">
            {GAMER_FEATURES.map(({ title, text, icon: Icon }) => (
              <li key={title}>
                <Card variant="inset" padding="sm" className="flex-row items-center gap-4">
                  <Icon className="size-6 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-14 font-bold">{title}</p>
                    <p className="text-12 text-fg-muted">{text}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* For coaches and sponsors */}
      <Section
        title="Find talent beyond the leaderboard"
        subtitle="Discover gamers through gameplay evidence, Gamer IDs and community engagement, not follower counts."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {AUDIENCES.map((audience) => (
            <Card key={audience.id} id={audience.id} as="article" className="scroll-mt-24 justify-between gap-6">
              <div className="flex flex-col items-start gap-3">
                <Badge tone={audience.tone}>{audience.badge}</Badge>
                <h3 className="text-18 font-bold">{audience.title}</h3>
                <ul className="flex flex-col gap-2.5">
                  {audience.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-13 text-fg-secondary">
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <ButtonLink to={home ?? ROUTES.signup} variant="secondary" className="self-start">
                {audience.cta}
              </ButtonLink>
            </Card>
          ))}
        </div>
      </Section>

      {/* Passport preview */}
      <Section
        id="passport"
        title="More than a profile. A Gamer ID."
        subtitle="Give your gaming ability a structured identity, backed by gameplay evidence and clearly labelled insights."
      >
        <Card large className="mx-auto w-full max-w-[760px] gap-5" aria-label="Example Gamer ID">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar name="ShadowViper" size="lg" />
              <div>
                <p className="flex flex-wrap items-center gap-2 text-16 font-bold">
                  ShadowViper <Badge tone="slate" size="sm">Example</Badge>
                </p>
                <p className="text-12 text-fg-muted">Valorant • Kenya • PC</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-10 font-bold uppercase tracking-[0.5px] text-fg-muted">{RAD_SCORE_LABEL}</p>
              <p className="font-display text-28 font-bold text-success">9,420</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <TrustBadge level="self-reported" />
            <TrustBadge level="community" />
            <TrustBadge level="ai" />
            <TrustBadge level="verified" />
          </div>
          <blockquote className="rounded-lg border border-ai/35 bg-ai/14 p-4">
            <p className="mb-1 text-10 font-bold uppercase tracking-[0.5px] text-ai">AI-assessed observation</p>
            <p className="text-13 text-fg-secondary">
              "Shows promising tactical decision-making and consistent engagement in competitive Valorant, based on
              submitted clips."
            </p>
          </blockquote>
        </Card>
      </Section>

      {/* Storyboard (01D section H, minus frame 05) */}
      <Section title="See the potential behind every player" subtitle="One clip is all it takes to start.">
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {STORYBOARD.map(({ title, icon: Icon }, index) => {
            const active = storyStep === null || storyStep === index;
            return (
              <li
                key={title}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-lg border bg-inset p-5 text-center transition-all duration-500",
                  active ? "border-ai/35 opacity-100" : "border-border opacity-50",
                )}
              >
                <Badge tone={active ? "violet" : "slate"} size="sm">
                  {String(index + 1).padStart(2, "0")}
                </Badge>
                <Icon className={cn("size-7 transition-colors duration-500", active ? "text-ai" : "text-fg-muted")} aria-hidden="true" />
                <span className="text-13 font-semibold">{title}</span>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* Final CTA */}
      <section className="px-4 pb-16 lg:px-12">
        <Card large className="mx-auto max-w-[1000px] items-center gap-5 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent_70%)] px-6 py-12 text-center">
          <h2 className="font-display text-28 font-bold lg:text-32">Your next opportunity starts with one profile.</h2>
          <p className="max-w-[560px] text-14 text-fg-secondary">
            Whether you're building your gaming career or discovering the next generation of talent, Play2Pro gives you a
            place to start.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {home ? (
              <ButtonLink to={home} size="lg">
                Go to my home
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to={ROUTES.signup} size="lg">
                  Join as a gamer
                </ButtonLink>
                <ButtonLink to={ROUTES.signup} size="lg" variant="secondary">
                  Join as a coach or sponsor
                </ButtonLink>
              </>
            )}
          </div>
        </Card>
      </section>
    </>
  );
}

function Section({ id, title, subtitle, children }: { id?: string; title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 px-4 py-14 lg:px-12 lg:py-16">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        {title && (
          <div className="mx-auto flex max-w-[640px] flex-col gap-2 text-center">
            <h2 className="font-display text-28 font-bold lg:text-32">{title}</h2>
            {subtitle && <p className="text-14 text-fg-muted">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
