import type { ReactNode } from "react";
import { Globe, Lock } from "lucide-react";
import { Badge } from "../../components/ui/Badge.tsx";
import { cn } from "../../lib/cn.ts";
import { initialsOf } from "../../lib/initials.ts";
import { PROFILE_VISIBILITY, type ProfileVisibility } from "../../types/api.ts";
import { joinList } from "./profile-model.ts";

// Small pieces shared by the 06 and 12 layouts.

/** 06D .section-header h3 (16px/700, icon + title) with an optional badge on the right. */
export function SectionHeader({
  id,
  icon,
  title,
  subtitle,
  aside,
  size = "md",
}: {
  id?: string;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  /** md = desktop 16px; sm = 06M .section-title 14px; xs = 12M 12px. */
  size?: "md" | "sm" | "xs";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2
          id={id}
          className={cn(
            "flex items-center gap-2 font-bold [&>svg]:shrink-0",
            size === "md" ? "text-16 [&>svg]:size-[18px]" : size === "sm" ? "text-14 [&>svg]:size-3.5" : "text-12",
          )}
        >
          {icon}
          {title}
        </h2>
        {subtitle && <p className="text-12 text-fg-muted">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

/** 06D .meta-item (desktop) and 06M .tag-chip (mobile). */
export function MetaPill({
  icon,
  size = "md",
  children,
}: {
  icon?: ReactNode;
  size?: "md" | "sm";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-white/6 bg-white/4 text-fg-secondary [&>svg]:size-3",
        size === "md" ? "rounded-sm px-2.5 py-1 text-12" : "rounded-xs px-2 py-0.5 text-11",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** 12D header PUBLIC badge (globe). Private uses the lock, so the icon always matches the state. */
export function VisibilityBadge({ visibility }: { visibility: ProfileVisibility }) {
  const isPublic = visibility === PROFILE_VISIBILITY.PUBLIC;
  return (
    <Badge
      tone={isPublic ? "green" : "amber"}
      icon={isPublic ? <Globe className="size-2.5" aria-hidden="true" /> : <Lock className="size-2.5" aria-hidden="true" />}
    >
      {isPublic ? "Public" : "Private"}
    </Badge>
  );
}

/** 06D .profile-avatar (90px, radius 18) and 06M .avatar-mobile (56px, radius 14): border-light tiles. */
export function OwnerAvatar({ name, size }: { name: string; size: "desktop" | "mobile" }) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center border-2 border-border-light bg-thumb-gradient font-display font-bold text-primary",
        size === "desktop" ? "size-[90px] rounded-[18px] text-32" : "size-14 rounded-[14px] text-20",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

/** 12D state B "Incomplete Skills Passport" (amber), as a notice instead of replacing the summary. */
export function IncompleteNotice({
  missing,
  owner,
  compact = false,
}: {
  missing: string[];
  owner: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-md border border-warning/35 bg-warning/14", compact ? "p-2.5" : "p-4")}>
      <p className={cn("font-bold text-warning", compact ? "text-11" : "text-13")}>Incomplete Gamer ID</p>
      <p className={cn("mt-1 text-fg-secondary", compact ? "text-10" : "text-12")}>
        {owner
          ? `Your Gamer ID is missing your ${joinList(missing)}.`
          : "This gamer is still building their Gamer ID."}
      </p>
    </div>
  );
}
