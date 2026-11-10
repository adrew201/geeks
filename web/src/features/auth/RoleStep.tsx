import type { FormEvent } from "react";
import { Briefcase, Gamepad2, GraduationCap, type LucideIcon } from "lucide-react";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import type { Tone } from "../../components/ui/tone-styles.ts";
import { ROLE_LABELS } from "../../config/labels.ts";
import { cn } from "../../lib/cn.ts";
import { ROLE, type Role } from "../../types/api.ts";
import { AuthHeading, AuthSwitchLink, AuthTabs } from "./AuthParts.tsx";

// State A: Role Selection. Desktop = 02D .role-card list (radio dot, badge, description).
// Mobile = 02M .role-card-m list (name, short description, coloured icon on the right).
// Both are real radio inputs, so arrow keys and screen readers work.

interface RoleOption {
  role: Role;
  badge: string;
  tone: Tone;
  description: string;
  mobileDescription: string;
  icon: LucideIcon;
  iconClass: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: ROLE.GAMER,
    badge: "I play games",
    tone: "blue",
    description: "Showcase your gameplay, build your Skills Passport and get discovered.",
    mobileDescription: "Build profile & Skills Passport",
    icon: Gamepad2,
    iconClass: "text-primary",
  },
  {
    role: ROLE.COACH,
    badge: "I discover talent",
    tone: "violet",
    description: "Discover players, review gameplay evidence and recruit team talent.",
    mobileDescription: "Scout gameplay & talent",
    icon: GraduationCap,
    iconClass: "text-ai",
  },
  {
    role: ROLE.SPONSOR,
    badge: "I support talent",
    tone: "slate",
    description: "Explore emerging gaming talent and evaluate sponsorship opportunities.",
    mobileDescription: "Discover partnerships",
    icon: Briefcase,
    iconClass: "text-fg-secondary",
  },
];

const FOCUS_RING = "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary";

export interface RoleStepProps {
  variant: "desktop" | "mobile";
  value: Role;
  onChange: (role: Role) => void;
  onContinue: () => void;
}

export function RoleStep({ variant, value, onChange, onContinue }: RoleStepProps) {
  const desktop = variant === "desktop";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onContinue();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {desktop && <AuthTabs />}
      {desktop ? (
        <AuthHeading title="Create Your Account" subtitle="Select how you plan to use Play2Pro." />
      ) : (
        <div>
          <h1 className="font-display text-18 font-bold">Join Play2Pro</h1>
          <p className="text-11 text-fg-muted">Select your account role to proceed:</p>
        </div>
      )}

      <fieldset>
        <legend className="sr-only">Account role</legend>
        <div className={cn("flex flex-col", desktop ? "gap-3" : "gap-2")}>
          {ROLE_OPTIONS.map((option) => {
            const selected = value === option.role;
            const radio = (
              <input
                type="radio"
                name="role"
                value={option.role}
                checked={selected}
                onChange={() => onChange(option.role)}
                className="sr-only"
              />
            );
            return desktop ? (
              <label
                key={option.role}
                className={cn(
                  "flex cursor-pointer items-start gap-3.5 rounded-md border-[1.5px] bg-inset p-4 transition-all duration-200 ease-[ease]",
                  FOCUS_RING,
                  selected ? "border-primary bg-glow-primary" : "border-border hover:border-border-light hover:bg-surface",
                )}
              >
                {radio}
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2",
                    selected ? "border-primary bg-primary" : "border-border-light",
                  )}
                >
                  {selected && <span className="size-1.5 rounded-full bg-white" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-14 font-bold">{ROLE_LABELS[option.role]}</span>
                    <Badge tone={option.tone}>{option.badge}</Badge>
                  </span>
                  <span className="mt-1 text-11 text-fg-muted">{option.description}</span>
                </span>
              </label>
            ) : (
              <label
                key={option.role}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 transition-all duration-200 ease-[ease]",
                  FOCUS_RING,
                  selected ? "border-primary bg-primary/14" : "border-border bg-inset",
                )}
              >
                {radio}
                <span>
                  <span className="block text-13 font-bold">{ROLE_LABELS[option.role]}</span>
                  <span className="block text-10 text-fg-muted">{option.mobileDescription}</span>
                </span>
                <option.icon aria-hidden="true" className={cn("size-[18px] shrink-0", option.iconClass)} />
              </label>
            );
          })}
        </div>
      </fieldset>

      <Button type="submit" fullWidth>
        {desktop ? "Continue to Registration" : "Continue"}
      </Button>

      {!desktop && <AuthSwitchLink prompt="Already have an account?" to={ROUTES.login} label="Log in" />}
    </form>
  );
}
