import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Crosshair, ShieldCheck } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { Field, Input, Select, Textarea } from "../../components/ui/Field.tsx";
import { GAMES, GAME_SLUGS, type GameSlug } from "../../config/games.ts";
import { formatMoney } from "../../lib/format-money.ts";
import { BOUNTY_TYPE, PAYMENT_PURPOSE, type BountyType, type Cents } from "../../types/api.ts";
import type { ReturnToState } from "../auth/redirect.ts";
import { AmountPicker } from "../payments/AmountPicker.tsx";
import { PaymentModal } from "../payments/PaymentModal.tsx";
import { createBounty } from "./api.ts";
import { BOUNTY_TYPE_LABEL, REWARD_DEFAULT, REWARD_MAX, REWARD_MIN, REWARD_PRESETS, formatDeadline } from "./bounty-status.ts";

// /bounties/new (SPONSOR only, routes.tsx). README §15.3: POST /bounties creates a PayPal order
// with intent AUTHORIZE; the sponsor approves on PayPal and comes back to /pay/return, which
// shows "funds held" only once the backend confirms the authorization. Nothing is captured
// until the sponsor confirms a winner.
// Form controls follow 07D (inputs, select, textarea); the reward reuses the Step 5 AmountPicker
// and the checkout reuses PaymentModal + PayPalApproval. No deadline cap here: the API decides
// and its message is shown in the modal.

interface Draft {
  title: string;
  task: string;
  game: GameSlug;
  type: BountyType;
  /** datetime-local value, viewer's time zone. */
  deadline: string;
}

type Errors = Partial<Record<"title" | "task" | "deadline" | "reward", string>>;

export default function NewBountyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState<Draft>({
    title: "",
    task: "",
    game: GAME_SLUGS[0]!,
    type: BOUNTY_TYPE.CHALLENGE,
    deadline: "",
  });
  const [reward, setReward] = useState<Cents | null>(REWARD_DEFAULT);
  const [errors, setErrors] = useState<Errors>({});
  const [funding, setFunding] = useState<{ deadlineIso: string } | null>(null);

  useEffect(() => {
    document.title = "Create bounty · Play2Pro";
  }, []);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function review(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!draft.title.trim()) next.title = "Give the bounty a short title.";
    if (!draft.task.trim()) next.task = "Describe what the clip must show.";
    if (reward === null) next.reward = "Choose a reward.";
    const deadline = new Date(draft.deadline);
    if (!draft.deadline || Number.isNaN(deadline.getTime())) next.deadline = "Pick a deadline.";
    else if (deadline.getTime() <= Date.now()) next.deadline = "The deadline must be in the future.";
    setErrors(next);
    if (Object.keys(next).length === 0) setFunding({ deadlineIso: deadline.toISOString() });
  }

  function sendToLogin() {
    const state: ReturnToState = { from: { pathname: location.pathname, search: location.search, hash: location.hash } };
    navigate(ROUTES.login, { state });
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <ButtonLink to={ROUTES.bounties} variant="ghost" size="sm" className="-ml-3 mb-1">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Bounties
          </ButtonLink>
        }
        title="Create bounty"
        description="Set a challenge, fund the reward with PayPal, and pick the winner yourself."
      />
      <PageContainer>
        <Card as="section" className="mx-auto w-full max-w-[640px]">
          <h2 className="flex items-center gap-2 text-16 font-bold">
            <Crosshair className="size-[18px] text-primary" aria-hidden="true" />
            Bounty details
          </h2>
          <form noValidate onSubmit={review} className="flex flex-col gap-4">
            <Field label="Title" required error={errors.title}>
              <Input
                value={draft.title}
                maxLength={80}
                placeholder="e.g. 1v3 clutch in ranked"
                onChange={(event) => update("title", event.target.value)}
              />
            </Field>
            <Field label="What the clip must show" required error={errors.task}>
              <Textarea
                value={draft.task}
                maxLength={500}
                placeholder="Win a 1v3 clutch round in Valorant ranked. Full round, no cuts."
                onChange={(event) => update("task", event.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Game" required>
                <Select value={draft.game} onChange={(event) => update("game", event.target.value as GameSlug)}>
                  {GAME_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {GAMES[slug].name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Type" required>
                <Select value={draft.type} onChange={(event) => update("type", event.target.value as BountyType)}>
                  {Object.values(BOUNTY_TYPE).map((type) => (
                    <option key={type} value={type}>
                      {BOUNTY_TYPE_LABEL[type]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Deadline" required error={errors.deadline} hint="Entries close at this time. Unclaimed rewards are released.">
              <Input
                type="datetime-local"
                value={draft.deadline}
                onChange={(event) => update("deadline", event.target.value)}
              />
            </Field>
            <AmountPicker
              presets={REWARD_PRESETS}
              min={REWARD_MIN}
              max={REWARD_MAX}
              value={reward}
              onChange={(value) => {
                setReward(value);
                setErrors((current) => ({ ...current, reward: undefined }));
              }}
              label="Reward"
            />
            {errors.reward && <p className="text-11 text-danger">{errors.reward}</p>}
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Button type="submit" variant="paypal" size="lg" fullWidth>
                Review and fund with PayPal
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-11 text-fg-muted">
                <ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />
                PayPal holds the reward. You're only charged when you confirm a winner.
              </p>
            </div>
          </form>
        </Card>
      </PageContainer>

      {funding && reward !== null && (
        <PaymentModal
          open
          onClose={() => setFunding(null)}
          icon={<Crosshair className="size-5 text-primary" aria-hidden="true" />}
          title="Fund your bounty"
          description="Approve on PayPal to hold the reward. The bounty opens once PayPal confirms."
          lines={[{ label: "Bounty reward (held)", amount: reward }]}
          canSubmit
          createOrder={(signal) =>
            createBounty(
              {
                type: draft.type,
                title: draft.title.trim(),
                task: draft.task.trim(),
                game: draft.game,
                reward,
                deadline: funding.deadlineIso,
              },
              signal,
            )
          }
          checkout={{
            purpose: PAYMENT_PURPOSE.BOUNTY,
            recipientName: draft.title.trim(),
            returnPath: ROUTES.bounties,
            returnLabel: "Back to Bounties",
            retryPath: ROUTES.bountyNew,
          }}
          onUnauthenticated={sendToLogin}
          ineligibleTitle="Verified adult account needed"
          ineligibleMessage="Creating a bounty needs a verified adult PayPal account. Link one, then try again."
        >
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-inset p-4">
            <p className="text-14 font-bold">{draft.title.trim()}</p>
            <p className="text-11 text-fg-muted">
              {BOUNTY_TYPE_LABEL[draft.type]} • {GAMES[draft.game].name} • Ends {formatDeadline(funding.deadlineIso)}
            </p>
          </div>
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-12 text-fg-muted">
            PayPal holds {formatMoney(reward)}. It's captured only when you confirm a winner. If nobody wins by the
            deadline, the hold is released and you aren't charged.
          </p>
        </PaymentModal>
      )}
    </>
  );
}
