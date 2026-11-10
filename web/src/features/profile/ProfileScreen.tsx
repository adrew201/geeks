import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Eye, EyeOff, SearchX, Share2, ShieldAlert } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES, gamerProfilePath } from "../../components/layout/nav-config.ts";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { EmptyState } from "../../components/ui/EmptyState.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { useToast } from "../../components/ui/use-toast.ts";
import { cn } from "../../lib/cn.ts";
import { useSession } from "../../lib/session.ts";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query.ts";
import { PROFILE_VISIBILITY, type AiSkillSummary, type GamerProfile } from "../../types/api.ts";
import { AiSummaryReview } from "./AiSummaryReview.tsx";
import { DonateSlot } from "./DonateSlot.tsx";
import { EvidenceSection } from "./EvidenceClips.tsx";
import { MobileOwnerIdentity, MobileViewerIdentity, OwnerIdentityCard, ProfileHeaderCard } from "./IdentityCards.tsx";
import { DesktopMetrics, MobileMetrics } from "./MetricCards.tsx";
import { MobilePassportCard, PassportCard, StrengthsCard, TrustBar } from "./PassportCards.tsx";
import { IncompleteNotice } from "./ProfileParts.tsx";
import { ProfileSkeleton } from "./ProfileSkeleton.tsx";
import {
  VIEWER_ACCESS,
  buildMetrics,
  missingPassportFields,
  trustLevelsOnPage,
  visibleSummary,
  type ViewerKind,
} from "./profile-model.ts";
import { useGamerProfile, type GamerProfileController } from "./use-gamer-profile.ts";
import { VisibilityToggle } from "./VisibilityToggle.tsx";

// The Gamer profile: one page for /gamers/:id and /passport (docs/ui-audit.md §9).
//   Owner         → page 06 (06D desktop, 06M mobile): AI summary review, visibility, share.
//   Everyone else → page 12 (12D desktop, 12M mobile), gated by VIEWER_ACCESS.
// Desktop and mobile are separate designs; useMediaQuery renders one tree, not both.
//
// Hidden everywhere because the contract has no field or endpoint (list for the report):
// skill sub-scores and bars, achievements (06D/06M/12D), Twitch/Steam links, profile views,
// community vote counts, last active, verified-ID check, clip durations and dates, and
// "Save Gamer" (12D button, 12M bookmark, state E "Saved Candidate").
// Removed (decision 3): every unlock/VOD element; "Unlock History" lived in the 12D nav,
// which AppSidebar already replaces with nav-config.

export interface ProfileScreenProps {
  gamerId: string;
  /** Rendered from /passport: the signed-in gamer's own profile. */
  ownRoute?: boolean;
}

export function ProfileScreen({ gamerId, ownRoute = false }: ProfileScreenProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const controller = useGamerProfile(gamerId);
  const [previewing, setPreviewing] = useState(false);
  const { profileStatus, profile, viewer } = controller;

  if (profileStatus === "loading") {
    return (
      <StateFrame desktop={isDesktop} ownRoute={ownRoute}>
        <ProfileSkeleton desktop={isDesktop} owner={ownRoute} />
      </StateFrame>
    );
  }

  if (profileStatus === "not-found") {
    return (
      <StateFrame desktop={isDesktop} ownRoute={ownRoute}>
        <NotFound ownRoute={ownRoute} />
      </StateFrame>
    );
  }

  if (profileStatus === "restricted") {
    return (
      <StateFrame desktop={isDesktop} ownRoute={ownRoute}>
        <RestrictedPanel />
      </StateFrame>
    );
  }

  if (profileStatus === "failed" || !profile || !viewer) {
    return (
      <StateFrame desktop={isDesktop} ownRoute={ownRoute}>
        <Card>
          <StatusPanel
            tone="danger"
            title="We couldn't load this profile"
            description={controller.profileError ?? undefined}
            actions={
              <Button variant="secondary" size="sm" onClick={controller.reload}>
                Try again
              </Button>
            }
          />
        </Card>
      </StateFrame>
    );
  }

  if (viewer === "owner" && !previewing) {
    const props = { controller, profile, onPreview: () => setPreviewing(true) };
    return isDesktop ? <DesktopOwnerProfile {...props} /> : <MobileOwnerProfile {...props} />;
  }

  // The owner's "Preview Public Profile" (06D) renders exactly what a signed-out visitor gets.
  const preview = viewer === "owner" ? () => setPreviewing(false) : null;
  const kind: ViewerKind = preview ? "public" : viewer;

  if (preview && profile.visibility === PROFILE_VISIBILITY.PRIVATE) {
    return (
      <StateFrame desktop={isDesktop} ownRoute={ownRoute}>
        <PreviewBanner onExit={preview} />
        <RestrictedPanel />
      </StateFrame>
    );
  }

  const props = { controller, profile, kind, onExitPreview: preview };
  return isDesktop ? <DesktopViewerProfile {...props} /> : <MobileViewerProfile {...props} />;
}

/* ------------------------------ page 12: viewers ------------------------------ */

interface ViewerProps {
  controller: GamerProfileController;
  profile: GamerProfile;
  kind: ViewerKind;
  /** Set while the owner previews their public profile. */
  onExitPreview: (() => void) | null;
}

function viewerModel({ controller, profile, kind }: ViewerProps) {
  const access = VIEWER_ACCESS[kind];
  const dashboard = access.dashboard ? controller.dashboard : null;
  const summary = visibleSummary(profile, kind);
  const clips = access.clips ? (dashboard?.clips ?? null) : null;
  return {
    access,
    summary,
    clips,
    metrics: buildMetrics(profile, dashboard),
    missing: missingPassportFields(profile),
    trustLevels: trustLevelsOnPage(profile, summary, clips),
    hasStrengths: hasStrengths(summary),
    // Owners never donate to themselves; the slot is for every other viewer.
    showDonate: kind !== "owner" && controller.viewer !== "owner",
  };
}

/** 12D, top to bottom. */
function DesktopViewerProfile(props: ViewerProps) {
  const { controller, profile, kind, onExitPreview } = props;
  const model = viewerModel(props);
  return (
    <PageContainer>
      {onExitPreview ? (
        <PreviewBanner onExit={onExitPreview} />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <BackButton kind={kind} />
          {model.showDonate && <DonateSlot gamerId={profile.id} layout="desktop" />}
        </div>
      )}
      <ProfileHeaderCard profile={profile} />
      <DesktopMetrics metrics={model.metrics} />
      <div className={cn("grid gap-6", model.hasStrengths ? "grid-cols-[1.2fr_1fr]" : "grid-cols-1")}>
        <PassportCard summary={model.summary} missing={model.missing} />
        {model.summary && model.hasStrengths && <StrengthsCard summary={model.summary} />}
      </div>
      <TrustBar levels={model.trustLevels} />
      {model.access.clips && (
        <EvidenceSection
          variant="viewer"
          status={controller.dashboardStatus}
          error={controller.dashboardError}
          clips={model.clips}
          onRetry={controller.reloadDashboard}
        />
      )}
    </PageContainer>
  );
}

/**
 * 12M: identity, two metrics, passport summary. 12M has no clips; coaches get the 06M
 * carousel here so the evidence they're allowed to see isn't desktop-only.
 */
function MobileViewerProfile(props: ViewerProps) {
  const { controller, profile, onExitPreview } = props;
  const model = viewerModel(props);
  return (
    <>
      <PageHeader title="Gamer Profile" />
      <PageContainer>
        <div className="flex flex-col gap-3">
          {onExitPreview && <PreviewBanner onExit={onExitPreview} />}
          <MobileViewerIdentity
            profile={profile}
            action={model.showDonate && <DonateSlot gamerId={profile.id} layout="mobile" />}
          />
          <MobileMetrics metrics={model.metrics} />
          <MobilePassportCard summary={model.summary} missing={model.missing} />
          {model.access.clips && (
            <EvidenceSection
              variant="carousel"
              status={controller.dashboardStatus}
              error={controller.dashboardError}
              clips={model.clips}
              onRetry={controller.reloadDashboard}
            />
          )}
        </div>
      </PageContainer>
    </>
  );
}

/* ------------------------------ page 06: owner ------------------------------ */

interface OwnerProps {
  controller: GamerProfileController;
  profile: GamerProfile;
  onPreview: () => void;
}

function useOwnerModel({ controller, profile }: OwnerProps) {
  return {
    clips: controller.dashboard?.clips ?? null,
    missing: missingPassportFields(profile),
    hasStrengths: hasStrengths(profile.aiSummary),
    share: useSharePassport(profile),
    review: {
      profile,
      pendingAction: controller.pendingAction,
      onAccept: controller.actions.acceptSummary,
      onReject: controller.actions.rejectSummary,
      onEdit: controller.actions.editSummary,
    },
  };
}

/** 06D: header actions, identity card with visibility toggle, AI review, evidence. */
function DesktopOwnerProfile(props: OwnerProps) {
  const { controller, profile, onPreview } = props;
  const model = useOwnerModel(props);
  return (
    <>
      <PageHeader
        title="My Skills Passport"
        description="Your gaming identity, skills and evidence in one unified professional platform."
        actions={
          <>
            <Button variant="secondary" onClick={onPreview}>
              <Eye className="size-3.5" aria-hidden="true" />
              Preview Public Profile
            </Button>
            <Button onClick={model.share}>
              <Share2 className="size-3.5" aria-hidden="true" />
              Share Passport
            </Button>
          </>
        }
      />
      <PageContainer>
        <OwnerIdentityCard
          profile={profile}
          visibilityControl={
            profile.visibility && (
              <VisibilityToggle
                visibility={profile.visibility}
                onChange={controller.actions.setVisibility}
                loading={controller.pendingAction === "visibility"}
              />
            )
          }
        />
        {model.missing.length > 0 && <IncompleteNotice missing={model.missing} owner />}
        <div className={cn("grid items-stretch gap-6", model.hasStrengths ? "grid-cols-2" : "grid-cols-1")}>
          {profile.aiSummary && model.hasStrengths && <StrengthsCard summary={profile.aiSummary} />}
          <AiSummaryReview {...model.review} layout="desktop" />
        </div>
        <EvidenceSection
          variant="owner"
          status={controller.dashboardStatus}
          error={controller.dashboardError}
          clips={model.clips}
          onRetry={controller.reloadDashboard}
        />
      </PageContainer>
    </>
  );
}

/** 06M: share icon, identity + score row, AI review (Accept/Reject), clip carousel. */
function MobileOwnerProfile(props: OwnerProps) {
  const { controller, profile } = props;
  const model = useOwnerModel(props);
  return (
    <>
      <PageHeader
        title="Skills Passport"
        actions={
          <Button variant="secondary" size="icon" aria-label="Share passport" onClick={model.share}>
            <Share2 className="size-3.5" aria-hidden="true" />
          </Button>
        }
      />
      <PageContainer>
        <div className="flex flex-col gap-3">
          <MobileOwnerIdentity profile={profile} />
          {model.missing.length > 0 && <IncompleteNotice missing={model.missing} owner compact />}
          <AiSummaryReview {...model.review} layout="mobile" />
          <EvidenceSection
            variant="carousel"
            status={controller.dashboardStatus}
            error={controller.dashboardError}
            clips={model.clips}
            onRetry={controller.reloadDashboard}
          />
        </div>
      </PageContainer>
    </>
  );
}

/* ------------------------------ shared pieces ------------------------------ */

function hasStrengths(summary: AiSkillSummary | null): boolean {
  return Boolean(summary && (summary.strengths.length > 0 || summary.roles.length > 0));
}

/** 06D "Share Passport" / 06M share icon: copies the public /gamers/:id link. */
function useSharePassport(profile: GamerProfile) {
  const toast = useToast();
  return async () => {
    const url = new URL(gamerProfilePath(profile.id), window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      toast.show(
        profile.visibility === PROFILE_VISIBILITY.PRIVATE
          ? "Link copied. Your profile is private, so others will see a restricted page."
          : "Passport link copied.",
        { tone: "success" },
      );
    } catch {
      toast.show(`Couldn't copy the link. Your passport is at ${url}`, { tone: "error" });
    }
  };
}

/** Wraps loading/error states: desktop viewers have no page header (12D); everyone else does. */
function StateFrame({ desktop, ownRoute, children }: { desktop: boolean; ownRoute: boolean; children: ReactNode }) {
  const title = ownRoute ? (desktop ? "My Skills Passport" : "Skills Passport") : "Gamer Profile";
  return (
    <>
      {(ownRoute || !desktop) && <PageHeader title={title} />}
      <PageContainer>{children}</PageContainer>
    </>
  );
}

/** 12D "Back to Discovery" for coaches and sponsors; a plain Back when there's history. */
function BackButton({ kind }: { kind: ViewerKind }) {
  const navigate = useNavigate();
  const icon = <ArrowLeft className="size-3.5" aria-hidden="true" />;
  if (kind === "coach" || kind === "sponsor") {
    return (
      <ButtonLink to={ROUTES.discover} variant="ghost" size="sm">
        {icon}
        Back to Discovery
      </ButtonLink>
    );
  }
  const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (historyIndex === 0) return <span />;
  return (
    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
      {icon}
      Back
    </Button>
  );
}

function PreviewBanner({ onExit }: { onExit: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/35 bg-primary/14 px-4 py-3 text-13"
    >
      <span className="flex items-center gap-2">
        <Eye className="size-4 text-primary" aria-hidden="true" />
        You're previewing your profile as a signed-out visitor sees it.
      </span>
      <Button variant="secondary" size="sm" onClick={onExit}>
        <EyeOff className="size-3.5" aria-hidden="true" />
        Exit preview
      </Button>
    </div>
  );
}

/** 12D state G "Restricted Gamer Profile". */
function RestrictedPanel() {
  const session = useSession();
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-12 text-center lg:p-20">
      <ShieldAlert className="mx-auto mb-3 size-12 text-warning" aria-hidden="true" />
      <h2 className="text-20 font-extrabold">Restricted Gamer Profile</h2>
      <p className="mx-auto mt-1.5 max-w-[400px] text-13 text-fg-muted">
        This gamer has set their profile visibility to private.
      </p>
      {!session && (
        <div className="mt-5">
          <ButtonLink to={ROUTES.login} variant="secondary" size="sm">
            Log in if this is your profile
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function NotFound({ ownRoute }: { ownRoute: boolean }) {
  const session = useSession();
  if (ownRoute) {
    return (
      <EmptyState
        icon={<SearchX />}
        title="Your Skills Passport isn't set up yet"
        description="We couldn't find a Gamer ID for your account."
        action={<ButtonLink to={ROUTES.arena}>Go to the Arena</ButtonLink>}
      />
    );
  }
  return (
    <EmptyState
      icon={<SearchX />}
      title="Gamer not found"
      description="This Gamer ID doesn't exist or has been removed."
      action={
        session ? (
          <ButtonLink to={ROUTES.leaderboard}>Back to Leaderboard</ButtonLink>
        ) : (
          <ButtonLink to={ROUTES.home}>Back to home</ButtonLink>
        )
      }
    />
  );
}
