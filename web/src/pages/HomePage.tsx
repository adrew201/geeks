import { useEffect } from "react";
import { useLocation } from "react-router";
import { homeRouteFor, ROUTES } from "../components/layout/nav-config.ts";
import { ButtonLink } from "../components/ui/Button.tsx";
import { RAD_SCORE_LABEL } from "../config/labels.ts";
import { useSession } from "../lib/session.ts";

// Landing page, minimalist: one large title, one line, two buttons, then short sections with
// lots of space. Anchors match PUBLIC_NAV / footer links in nav-config.ts:
// #how-it-works, #for-gamers, #for-coaches, #for-sponsors, #passport.
// No VOD/unlock lines (docs/ui-audit.md §10); "Ranking Score" is the Rad Score (decision 5).

const STEPS = [
  { title: "Create your Gamer ID", text: "Your profile and the games you play." },
  { title: "Show your gameplay", text: "Submit unedited clips as evidence." },
  { title: "Build your passport", text: `AI insights, votes and your ${RAD_SCORE_LABEL}.` },
  { title: "Get discovered", text: "Coaches and sponsors reach out." },
];

const GAMER_POINTS = [
  "Submit clips and keep your best evidence in one place",
  `Earn community votes and grow your ${RAD_SCORE_LABEL}`,
  "Receive donations and win sponsor bounties, paid with PayPal",
];

const AUDIENCES = [
  {
    id: "for-coaches",
    label: "For coaches",
    title: "Scout with evidence",
    points: ["Search by game, region and Rad Score", "Read AI skill summaries backed by clips", "Get suggested matches"],
  },
  {
    id: "for-sponsors",
    label: "For sponsors",
    title: "Back rising talent",
    points: ["Spot talent early", "See engagement and ranking signals", "Fund bounties for real gameplay"],
  },
];

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
  useHashScroll();

  useEffect(() => {
    document.title = "Play2Pro · Turning casual gamers into professionals";
  }, []);

  return (
    <>
      <section className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 pt-20 pb-24 text-center lg:pt-32 lg:pb-36">
        <h1 className="font-display text-40 leading-[1.05] font-bold tracking-[-1.5px] lg:text-[72px]">
          Your skills deserve more than views.
        </h1>
        <p className="max-w-md text-16 text-fg-secondary">
          A professional profile for your gameplay. Get discovered, earn from donations and bounties.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {home ? (
            <ButtonLink to={home} size="lg">
              Go to my home
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to={ROUTES.signup} size="lg">
                I&apos;m a gamer
              </ButtonLink>
              <ButtonLink to={ROUTES.signup} size="lg" variant="secondary">
                I&apos;m looking for talent
              </ButtonLink>
            </>
          )}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16 lg:py-24">
        <h2 className="mb-12 text-center font-display text-28 font-bold lg:text-32">How it works</h2>
        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2">
              <span className="text-12 font-medium tracking-[1px] text-fg-muted">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="text-16 font-medium">{step.title}</h3>
              <p className="text-14 text-fg-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="for-gamers" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 text-center lg:py-24">
        <h2 className="font-display text-28 font-bold lg:text-32">For gamers</h2>
        <ul className="mt-8 flex flex-col gap-3 text-15 text-fg-secondary">
          {GAMER_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <div className="mt-10 flex justify-center">
          <ButtonLink to={home ?? ROUTES.signup} size="lg">
            {home ? "Go to my home" : "Create your Gamer ID"}
          </ButtonLink>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-2">
        {AUDIENCES.map((audience) => (
          <section key={audience.id} id={audience.id} className="scroll-mt-20 rounded-xl bg-surface p-8">
            <p className="text-11 font-medium uppercase tracking-[1px] text-fg-muted">{audience.label}</p>
            <h2 className="mt-2 font-display text-24 font-bold">{audience.title}</h2>
            <ul className="mt-6 flex flex-col gap-2 text-14 text-fg-secondary">
              {audience.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section id="passport" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 text-center lg:py-24">
        <h2 className="font-display text-28 font-bold lg:text-32">Your Gamer ID</h2>
        <p className="mx-auto mt-4 max-w-md text-15 text-fg-secondary">
          One structured profile of your ability: clips, AI insights, community votes and your {RAD_SCORE_LABEL}.
        </p>
      </section>

      <section className="px-4 pt-8 pb-24 text-center">
        <h2 className="font-display text-28 font-bold lg:text-32">Start with one profile.</h2>
        <div className="mt-8 flex justify-center">
          <ButtonLink to={home ?? ROUTES.signup} size="lg">
            {home ? "Go to my home" : "Get started"}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
