import { useState } from "react";
import { useNavigate } from "react-router";
import { HandHeart } from "lucide-react";
import { ROUTES, donatePath } from "../../components/layout/nav-config.ts";
import { Button } from "../../components/ui/Button.tsx";
import { useSession } from "../../lib/session.ts";
import type { GamerProfile } from "../../types/api.ts";
import type { ReturnToState } from "../auth/redirect.ts";
import { DonationModal } from "./DonationModal.tsx";

// Donate straight from a list row (Leaderboard "Top Gamers Matrix"), without opening the
// Gamer ID first. Same checkout as the profile's DonateButton: DonationModal → POST /donations
// → PayPal → /pay/return. The row has no eligibility flag, so a recipient who can't receive
// donations yet is handled by the API's 403 inside the modal.
// Signed out: log in, then land on the gamer's profile with the donate modal open.

export interface QuickDonateGamer {
  /** The gamer's user id (leaderboard `gamerId`); POST /donations accepts it. */
  gamerId: string;
  gamerTag: string;
  game?: string | null;
  region?: string | null;
  radScore?: number;
}

/** Enough of a GamerProfile for DonationModal. */
function toProfile(gamer: QuickDonateGamer): GamerProfile {
  return {
    id: gamer.gamerId,
    userId: gamer.gamerId,
    gamerTags: [gamer.gamerTag],
    platforms: [],
    games: gamer.game ? [gamer.game] : [],
    region: gamer.region ?? null,
    aiSummary: null,
    radScore: gamer.radScore ?? 0,
  };
}

export function QuickDonateButton({ gamer, compact = false }: { gamer: QuickDonateGamer; compact?: boolean }) {
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function sendToLogin() {
    const [pathname, search] = donatePath(gamer.gamerId).split("?");
    const state: ReturnToState = { from: { pathname, search: `?${search}`, hash: "" } };
    navigate(ROUTES.login, { state });
  }

  return (
    <>
      <Button
        variant="paypal"
        size={compact ? "icon" : "sm"}
        className={compact ? "size-8" : undefined}
        onClick={() => (session ? setOpen(true) : sendToLogin())}
        aria-label={`Donate to ${gamer.gamerTag}`}
      >
        <HandHeart className="size-3.5" aria-hidden="true" />
        {!compact && "Donate"}
      </Button>
      {open && <DonationModal open onClose={() => setOpen(false)} gamer={toProfile(gamer)} onUnauthenticated={sendToLogin} />}
    </>
  );
}
