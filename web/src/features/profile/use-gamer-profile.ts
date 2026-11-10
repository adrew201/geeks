import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../components/ui/use-toast.ts";
import { ApiError } from "../../lib/api-client.ts";
import { useSession } from "../../lib/session.ts";
import {
  AI_SUMMARY_STATUS,
  PROFILE_VISIBILITY,
  type GamerDashboard,
  type GamerProfile,
  type ProfileVisibility,
  type UpdateGamerProfileRequest,
} from "../../types/api.ts";
import {
  classifyLoadError,
  errorMessage,
  fetchGamerDashboard,
  fetchGamerProfile,
  isAbort,
  updateGamerProfile,
  type LoadFailure,
} from "./api.ts";
import { VIEWER_ACCESS, viewerKindFor, type ViewerKind } from "./profile-model.ts";

// The page 12 state toolbar as real states:
//   A Complete Profile    → profile "ready", dashboard "ready"
//   B Incomplete Passport → derived: missingPassportFields(profile) is not empty
//   C No AI Assessment    → derived: visibleSummary(profile, viewer) is null
//   D No Exclusive Footage→ replaced by "no evidence clips": dashboard.clips is empty
//   E Saved Candidate     → not built: no save field or endpoint in the contract
//   F Loading             → profile "loading" (skeletons). 12D's broken F button is not copied.
//   G Restricted Access   → profile "restricted" (GET /gamers/:id answered 403)
// plus "not-found" (404) and "error" (anything else, with retry).
//
// Requests are keyed, so a state is "loading" until the result for its exact key lands and
// no state is set synchronously inside an effect.

export type ProfileStatus = "loading" | "ready" | LoadFailure;
export type DashboardStatus = "none" | "loading" | "ready" | "error";
export type OwnerAction = "visibility" | "accept" | "reject" | "edit";

interface ProfileResult {
  key: string;
  profile: GamerProfile | null;
  failure: LoadFailure | null;
  message: string | null;
}

interface DashboardResult {
  key: string;
  dashboard: GamerDashboard | null;
  message: string | null;
}

export function useGamerProfile(gamerId: string) {
  const session = useSession();
  const toast = useToast();
  const [reloadCount, setReloadCount] = useState(0);
  const [dashboardReloadCount, setDashboardReloadCount] = useState(0);
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null);
  const [dashboardResult, setDashboardResult] = useState<DashboardResult | null>(null);
  const [pendingAction, setPendingAction] = useState<OwnerAction | null>(null);

  // A private profile answers differently per viewer, so the viewer is part of the key.
  const profileKey = `${gamerId}|${session?.userId ?? ""}|${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();
    fetchGamerProfile(gamerId, controller.signal).then(
      (profile) => setProfileResult({ key: profileKey, profile, failure: null, message: null }),
      (error: unknown) => {
        if (isAbort(error)) return;
        setProfileResult({
          key: profileKey,
          profile: null,
          failure: classifyLoadError(error),
          message: errorMessage(error),
        });
      },
    );
    return () => controller.abort();
  }, [gamerId, profileKey]);

  const profileStatus: ProfileStatus =
    profileResult?.key !== profileKey ? "loading" : (profileResult.failure ?? "ready");
  const profile = profileStatus === "ready" ? (profileResult?.profile ?? null) : null;

  const viewer: ViewerKind | null = profile ? viewerKindFor(session, profile) : null;
  const access = viewer ? VIEWER_ACCESS[viewer] : null;
  // The dashboard is keyed on the profile id the API returned (it may differ from the URL
  // id on /passport, which loads by userId).
  const profileId = profile?.id ?? null;
  const dashboardKey =
    profileId && access?.dashboard ? `${profileId}|${viewer}|${profileKey}|${dashboardReloadCount}` : null;

  useEffect(() => {
    if (!dashboardKey || !profileId) return;
    const controller = new AbortController();
    fetchGamerDashboard(profileId, controller.signal).then(
      (dashboard) => setDashboardResult({ key: dashboardKey, dashboard, message: null }),
      (error: unknown) => {
        if (isAbort(error)) return;
        // The API is the authority on access: a 401/403 here just means "no dashboard".
        const refused = error instanceof ApiError && (error.status === 401 || error.status === 403);
        setDashboardResult({ key: dashboardKey, dashboard: null, message: refused ? null : errorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [dashboardKey, profileId]);

  let dashboardStatus: DashboardStatus = "none";
  if (dashboardKey) {
    if (dashboardResult?.key !== dashboardKey) dashboardStatus = "loading";
    else if (dashboardResult.message) dashboardStatus = "error";
    else if (dashboardResult.dashboard) dashboardStatus = "ready";
  }
  const dashboard = dashboardStatus === "ready" ? (dashboardResult?.dashboard ?? null) : null;

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const reloadDashboard = useCallback(() => setDashboardReloadCount((count) => count + 1), []);

  /* ------------------------------ owner actions ------------------------------ */

  const runUpdate = useCallback(
    async (action: OwnerAction, body: UpdateGamerProfileRequest, success: string): Promise<boolean> => {
      if (!profile) return false;
      setPendingAction(action);
      try {
        const updated = await updateGamerProfile(profile.id, body);
        setProfileResult((current) => (current ? { ...current, profile: updated } : current));
        toast.show(success, { tone: "success" });
        return true;
      } catch (error) {
        toast.show(errorMessage(error), { tone: "error" });
        return false;
      } finally {
        setPendingAction(null);
      }
    },
    [profile, toast],
  );

  const actions = useMemo(
    () => ({
      setVisibility: (visibility: ProfileVisibility) =>
        runUpdate(
          "visibility",
          { visibility },
          visibility === PROFILE_VISIBILITY.PRIVATE ? "Your profile is now private." : "Your profile is now public.",
        ),
      acceptSummary: () =>
        runUpdate(
          "accept",
          { aiSummaryStatus: AI_SUMMARY_STATUS.ACCEPTED },
          "AI summary accepted and added to your public passport.",
        ),
      rejectSummary: () => runUpdate("reject", { aiSummary: null }, "AI summary removed from your passport."),
      editSummary: (summary: string) =>
        profile?.aiSummary
          ? runUpdate(
              "edit",
              // Saving your own wording also accepts it.
              { aiSummary: { ...profile.aiSummary, summary }, aiSummaryStatus: AI_SUMMARY_STATUS.ACCEPTED },
              "AI summary updated.",
            )
          : Promise.resolve(false),
    }),
    [profile, runUpdate],
  );

  return {
    profileStatus,
    profileError: profileStatus === "failed" ? (profileResult?.message ?? null) : null,
    profile,
    viewer,
    access,
    dashboardStatus,
    dashboardError: dashboardStatus === "error" ? (dashboardResult?.message ?? null) : null,
    dashboard,
    reload,
    reloadDashboard,
    pendingAction,
    actions,
  };
}

export type GamerProfileController = ReturnType<typeof useGamerProfile>;
