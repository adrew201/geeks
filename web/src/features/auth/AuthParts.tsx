import { useId, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { CircleAlert, CircleX } from "lucide-react";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { cn } from "../../lib/cn.ts";

// Shared pieces of the 02 auth card. Animation notes from 02D (docs/ui-audit.md §5a):
//   - `@keyframes spin` (02D:856) on the loader-2 icon at 1s linear (02D:830): the
//     "Creating Your Account..." panel, via <Spinner speed="normal">.
//   - Tabs, role cards and inputs transition `all 0.2s ease`.
// Nothing else in 02 animates.

/** 02D .auth-tabs: Sign Up / Log In switch. Each tab is a route, so links, not buttons. */
export function AuthTabs() {
  return (
    <nav aria-label="Account" className="flex gap-1 rounded-md border border-border bg-inset p-1">
      {[
        { to: ROUTES.signup, label: "Sign Up" },
        { to: ROUTES.login, label: "Log In" },
      ].map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          replace
          className={({ isActive }) =>
            cn(
              "flex-1 rounded-sm p-2 text-center text-13 font-bold transition-all duration-200 ease-[ease]",
              isActive ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg-secondary",
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/** 02D card heading: 22px/800 display title, 12px muted subtitle. */
export function AuthHeading({ title, subtitle, as: Tag = "h1" }: { title: string; subtitle: string; as?: "h1" | "h2" }) {
  return (
    <div>
      <Tag className="font-display text-22 font-bold">{title}</Tag>
      <p className="mt-1 text-12 text-fg-muted">{subtitle}</p>
    </div>
  );
}

/** 02D .alert-banner.error: danger tint, danger-soft text, icon + bold title + detail. */
export function FormAlert({ title, message }: { title: string; message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-md border border-danger/35 bg-danger/14 px-3.5 py-3 text-12 leading-[1.4] text-danger-soft"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p className="mt-0.5 text-11">{message}</p>
      </div>
    </div>
  );
}

/** Mobile-only link between signup and login (02M has no tabs). */
export function AuthSwitchLink({ prompt, to, label }: { prompt: string; to: string; label: string }) {
  return (
    <p className="text-center text-12 text-fg-muted">
      {prompt}{" "}
      <Link to={to} replace className="font-semibold text-primary hover:underline">
        {label}
      </Link>
    </p>
  );
}

/** 02D terms checkbox (11px secondary, links in primary) with an error line. */
export function TermsCheckbox({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mt-1 flex items-start gap-2 text-11 text-fg-secondary">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-primary"
        />
        <label htmlFor={id}>
          I agree to the{" "}
          <Link to={ROUTES.terms} className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to={ROUTES.privacy} className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </label>
      </div>
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-11 text-danger">
          <CircleX className="size-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthCardBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3.5">{children}</div>;
}
