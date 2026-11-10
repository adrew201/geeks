import type { ReactNode } from "react";
import { Gamepad2, Globe, Monitor } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { TrustBadge } from "../../components/ui/TrustBadge.tsx";
import { RAD_SCORE_LABEL } from "../../config/labels.ts";
import type { GamerProfile } from "../../types/api.ts";
import { MetaPill, OwnerAvatar, VisibilityBadge } from "./ProfileParts.tsx";
import { displayName, formatNumber, identityLine, profileTrust } from "./profile-model.ts";

// Identity blocks. Hidden (no contract field): 12D "LAST ACTIVE", the verified check next to
// the name (12D) and 06D "VERIFIED ID" badge, 06D "Connected via Twitch & Steam", and the
// 06D role pill ("Entry Fragger / IGL"; roles appear with the AI summary instead).

const NAME_ID = "profile-name";

/* ------------------------------ 12D: viewer header ------------------------------ */

/** 12D SECTION B .profile-header-card. */
export function ProfileHeaderCard({ profile }: { profile: GamerProfile }) {
  const name = displayName(profile);
  const { selfReported } = profileTrust(profile);
  const meta: Array<[string, string]> = [["ID", profile.id]];
  if (profile.games.length) meta.push(["Game", profile.games.join(", ")]);
  if (profile.region) meta.push(["Region", profile.region]);
  if (profile.platforms.length) meta.push(["Platform", profile.platforms.join(", ")]);

  return (
    <section
      aria-labelledby={NAME_ID}
      className="flex items-center justify-between gap-6 rounded-xl border border-border bg-surface bg-glow-ai px-8 py-7 shadow-card"
    >
      <div className="flex min-w-0 items-center gap-5">
        <Avatar name={name} size="xl" shape="tile" />
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <Badge tone="violet">Gamer profile</Badge>
            {profile.visibility && <VisibilityBadge visibility={profile.visibility} />}
          </div>
          <h1 id={NAME_ID} className="mt-1 truncate text-24 font-extrabold">
            {name}
          </h1>
          <ul className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-12 text-fg-secondary">
            {meta.map(([label, value], index) => (
              <li key={label} className="flex items-center gap-2.5">
                {index > 0 && (
                  <span className="text-fg-muted" aria-hidden="true">
                    •
                  </span>
                )}
                <span>
                  {label}: <strong>{value}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {selfReported && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-11 font-semibold text-fg-muted uppercase">Profile details</span>
          <TrustBadge level="self-reported" />
        </div>
      )}
    </section>
  );
}

/* ------------------------------ 06D: owner identity ------------------------------ */

/** 06D SECTION B .identity-card. `visibilityControl` is the 06D toggle (owner only). */
export function OwnerIdentityCard({
  profile,
  visibilityControl,
}: {
  profile: GamerProfile;
  visibilityControl?: ReactNode;
}) {
  const name = displayName(profile);
  const { selfReported, community } = profileTrust(profile);
  return (
    <section
      aria-labelledby={NAME_ID}
      className="flex items-center justify-between gap-6 overflow-hidden rounded-lg border border-border bg-linear-135 from-surface to-inset p-6 shadow-card"
    >
      <div className="flex min-w-0 items-center gap-6">
        <OwnerAvatar name={name} size="desktop" />
        <div className="min-w-0">
          <h2 id={NAME_ID} className="truncate text-24 font-extrabold">
            {name}
          </h2>
          <p className="mb-2.5 text-14 font-medium text-fg-muted">Gamer ID: {profile.id}</p>
          <div className="flex flex-wrap items-center gap-3">
            {profile.games.map((game) => (
              <MetaPill key={game} icon={<Gamepad2 aria-hidden="true" />}>
                {game}
              </MetaPill>
            ))}
            {profile.region && <MetaPill icon={<Globe aria-hidden="true" />}>{profile.region}</MetaPill>}
            {profile.platforms.map((platform) => (
              <MetaPill key={platform} icon={<Monitor aria-hidden="true" />}>
                {platform}
              </MetaPill>
            ))}
            {selfReported && <TrustBadge level="self-reported" size="sm" />}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <div className={visibilityControl ? "border-r border-border pr-6 text-right" : "text-right"}>
          <p className="font-display text-36 leading-none font-bold text-primary">{formatNumber(profile.radScore)}</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-11 tracking-[0.5px] text-fg-muted uppercase">
            {RAD_SCORE_LABEL}
            {community && <TrustBadge level="community" size="sm" />}
          </p>
        </div>
        {visibilityControl}
      </div>
    </section>
  );
}

/* ------------------------------ 12M: viewer identity ------------------------------ */

/** 12M identity card. `action` is where 12M had its unlock button (now the donate slot). */
export function MobileViewerIdentity({ profile, action }: { profile: GamerProfile; action?: ReactNode }) {
  const name = displayName(profile);
  const line = identityLine(profile);
  return (
    <section
      aria-labelledby={NAME_ID}
      className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface bg-glow-ai p-3"
    >
      <div className="flex items-center gap-3">
        <Avatar name={name} size="md" shape="tile" />
        <div className="min-w-0">
          <h1 id={NAME_ID} className="truncate text-15 font-extrabold text-white">
            {name}
          </h1>
          {line && <p className="text-10 text-fg-muted">{line}</p>}
        </div>
        {profile.visibility && (
          <div className="ml-auto">
            <VisibilityBadge visibility={profile.visibility} />
          </div>
        )}
      </div>
      {action}
    </section>
  );
}

/* ------------------------------ 06M: owner identity ------------------------------ */

/** 06M GAMER IDENTITY CARD with the .score-row. */
export function MobileOwnerIdentity({ profile }: { profile: GamerProfile }) {
  const name = displayName(profile);
  const { community } = profileTrust(profile);
  const chips = [...profile.games, ...(profile.region ? [profile.region] : [])];
  return (
    <section aria-labelledby={NAME_ID} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <OwnerAvatar name={name} size="mobile" />
        <div className="min-w-0">
          <h2 id={NAME_ID} className="truncate text-16 font-extrabold">
            {name}
          </h2>
          <p className="text-11 text-fg-muted">Gamer ID: {profile.id}</p>
          {chips.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <MetaPill key={chip} size="sm">
                  {chip}
                </MetaPill>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between rounded-md border border-border bg-inset px-3.5 py-2.5">
        <div>
          <p className="text-10 text-fg-muted uppercase">{RAD_SCORE_LABEL}</p>
          <p className="font-display text-22 font-bold text-primary">{formatNumber(profile.radScore)}</p>
        </div>
        {community && <TrustBadge level="community" />}
      </div>
    </section>
  );
}
