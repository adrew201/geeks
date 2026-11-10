import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CalendarClock, Crosshair, Plus, RefreshCw } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES, bountyPath } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { EmptyState } from "../../components/ui/EmptyState.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { gameName } from "../../config/games.ts";
import { formatMoney } from "../../lib/format-money.ts";
import { useSession } from "../../lib/session.ts";
import { ROLE, type Bounty } from "../../types/api.ts";
import { isAbort } from "../payments/api.ts";
import { fetchBounties } from "./api.ts";
import { BOUNTY_STATUS_BADGE, BOUNTY_TYPE_LABEL, formatDeadline } from "./bounty-status.ts";

// /bounties: open bounties (GET /api/v1/bounties, README §14 "any user"). No bounty design
// exists (decision 4), so this is composed from the 11D/11M card grid, badges, skeletons,
// the 08D empty state and the StatusPanel error. Sponsors get "Create bounty".
// No search or filters: the endpoint takes no parameters.

type ListState = { key: number; bounties: Bounty[] | null; error: string | null };

export default function BountiesPage() {
  const session = useSession();
  const isSponsor = session?.role === ROLE.SPONSOR;
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<ListState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchBounties(controller.signal).then(
      (bounties) => setState({ key: reload, bounties, error: null }),
      (error: unknown) => {
        if (isAbort(error)) return;
        setState({ key: reload, bounties: null, error: error instanceof Error ? error.message : "Something went wrong." });
      },
    );
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    document.title = "Bounties · Play2Pro";
  }, []);

  const createLink = (
    <ButtonLink to={ROUTES.bountyNew} size="sm">
      <Plus className="size-3.5" aria-hidden="true" />
      Create bounty
    </ButtonLink>
  );

  let body;
  if (!state || state.key !== reload) {
    body = (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <Card key={index}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        ))}
      </div>
    );
  } else if (state.error || !state.bounties) {
    body = (
      <Card>
        <StatusPanel
          tone="danger"
          title="Couldn't load bounties"
          description={state.error}
          actions={
            <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
          }
        />
      </Card>
    );
  } else if (state.bounties.length === 0) {
    body = (
      <EmptyState
        icon={<Crosshair />}
        title="No open bounties right now"
        description={
          isSponsor
            ? "Post a challenge for gamers. PayPal holds the reward until you confirm a winner."
            : "Sponsors post challenges with real rewards. Check back soon."
        }
        action={isSponsor ? createLink : undefined}
      />
    );
  } else {
    body = (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {state.bounties.map((bounty) => (
          <li key={bounty.id}>
            <BountyCard bounty={bounty} mine={bounty.creatorId === session?.userId} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <PageHeader
        title="Bounties"
        description={
          isSponsor
            ? "Post a challenge, hold the reward with PayPal, and pick the winner yourself."
            : "Complete a sponsor's challenge, submit your clip, and win the reward."
        }
        actions={isSponsor ? createLink : undefined}
      />
      <PageContainer>{body}</PageContainer>
    </>
  );
}

function BountyCard({ bounty, mine }: { bounty: Bounty; mine: boolean }) {
  const status = BOUNTY_STATUS_BADGE[bounty.status];
  return (
    <Link
      to={bountyPath(bounty.id)}
      className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-card transition-all duration-200 hover:border-border-light hover:bg-surface-hover focus-visible:shadow-focus focus-visible:outline-none"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={status.tone} size="sm">
          {status.label}
        </Badge>
        <Badge tone="blue" size="sm">
          {BOUNTY_TYPE_LABEL[bounty.type]}
        </Badge>
        {mine && (
          <Badge tone="violet" size="sm">
            Yours
          </Badge>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-15 font-bold">{bounty.title}</p>
        {bounty.task !== bounty.title && <p className="mt-1 line-clamp-2 text-12 text-fg-muted">{bounty.task}</p>}
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0 text-11 text-fg-muted">
          {bounty.game && <p className="truncate">{gameName(bounty.game)}</p>}
          <p className="flex items-center gap-1">
            <CalendarClock className="size-3 shrink-0" aria-hidden="true" />
            Ends {formatDeadline(bounty.deadline)}
          </p>
        </div>
        <span className="font-display text-20 font-bold text-success">{formatMoney(bounty.reward)}</span>
      </div>
    </Link>
  );
}
