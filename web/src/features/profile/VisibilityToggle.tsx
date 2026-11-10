import { Globe, Lock } from "lucide-react";
import { Button } from "../../components/ui/Button.tsx";
import { PROFILE_VISIBILITY, type ProfileVisibility } from "../../types/api.ts";

// 06D #vis-btn (ghost button in the identity card). Shows the current visibility.
// Prototype bug fixed (docs/ui-audit.md §4): 06D started as "Public" with a lock icon and
// only swapped icons after the first click. Here Public always shows the globe and Private
// always shows the lock.
// Desktop only: 06M drops the toggle (docs/ui-audit.md §7).

export interface VisibilityToggleProps {
  visibility: ProfileVisibility;
  onChange: (next: ProfileVisibility) => void;
  loading: boolean;
}

export function VisibilityToggle({ visibility, onChange, loading }: VisibilityToggleProps) {
  const isPublic = visibility === PROFILE_VISIBILITY.PUBLIC;
  const next = isPublic ? PROFILE_VISIBILITY.PRIVATE : PROFILE_VISIBILITY.PUBLIC;
  const Icon = isPublic ? Globe : Lock;
  return (
    <Button
      variant="ghost"
      loading={loading}
      onClick={() => onChange(next)}
      aria-label={`Profile visibility: ${isPublic ? "public" : "private"}. Make ${isPublic ? "private" : "public"}.`}
      title={isPublic ? "Anyone can view your profile. Click to make it private." : "Only you can view your profile. Click to make it public."}
    >
      {!loading && <Icon className="size-3.5" aria-hidden="true" />}
      {isPublic ? "Public" : "Private"}
    </Button>
  );
}
