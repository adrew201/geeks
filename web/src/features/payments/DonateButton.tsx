import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { HandHeart } from "lucide-react";
import { DONATE_PARAM, ROUTES } from "../../components/layout/nav-config.ts";
import { Button } from "../../components/ui/Button.tsx";
import { useSession } from "../../lib/session.ts";
import type { GamerProfile } from "../../types/api.ts";
import type { ReturnToState } from "../auth/redirect.ts";
import { DonationModal } from "./DonationModal.tsx";

// The donate entry point on a Gamer ID, for every viewer except the owner (ProfileScreen
// decides that). Sits where 12D's header "Unlock Exclusive Footage" button and 12M's
// full-width unlock button were (both removed, decision 3).
// - Signed out: go to /login, then come back here with the modal open (?donate=1).
// - Any gamer can receive donations: there is no age or verification gate.

export interface DonateButtonProps {
  profile: GamerProfile;
  /** desktop = 12D header action row; mobile = 12M full-width button in the identity card. */
  layout: "desktop" | "mobile";
}

export function DonateButton({ profile, layout }: DonateButtonProps) {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get(DONATE_PARAM) === "1";
  const [open, setOpen] = useState(() => requested && Boolean(session));
  const mobile = layout === "mobile";

  // ?donate=1 is a one-shot request: drop it so refresh/back don't reopen the modal.
  useEffect(() => {
    if (!requested) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(DONATE_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [requested, setSearchParams]);

  function start() {
    if (!session) {
      sendToLogin();
      return;
    }
    setOpen(true);
  }

  function sendToLogin() {
    const search = new URLSearchParams(location.search);
    search.set(DONATE_PARAM, "1");
    const state: ReturnToState = {
      from: { pathname: location.pathname, search: `?${search.toString()}`, hash: location.hash },
    };
    navigate(ROUTES.login, { state });
  }

  return (
    <>
      <Button variant="paypal" onClick={start} fullWidth={mobile} size={mobile ? "lg" : "md"}>
        <HandHeart className="size-4" aria-hidden="true" />
        Donate
      </Button>
      {open && (
        <DonationModal open onClose={() => setOpen(false)} gamer={profile} onUnauthenticated={sendToLogin} />
      )}
    </>
  );
}
