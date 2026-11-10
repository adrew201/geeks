import { useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Button } from "../../components/ui/Button.tsx";
import { Field, Input, PasswordInput } from "../../components/ui/Field.tsx";
import { setToken } from "../../lib/session.ts";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query.ts";
import { login } from "./api.ts";
import { AuthCardBody, AuthHeading, AuthSwitchLink, AuthTabs, FormAlert } from "./AuthParts.tsx";
import { postLoginPath } from "./redirect.ts";
import { useFocusFirstInvalid } from "./use-focus-first-invalid.ts";
import { hasErrors, validateEmail, validateLoginPassword, type FieldErrors } from "./validation.ts";

// Page 02 login (02D state D). 02M has no login design; on mobile the same primitives
// render without the tabs, with a text link to signup instead.
//
// Hidden: "Forgot password?" (states E/F; no reset endpoint in README §14) and
// "Remember this device for 30 days" (no API support; the token lifetime is set server-side).

type LoginField = "email" | "password";

export default function LoginPage() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useFocusFirstInvalid(formRef, attempt);

  function clearError(field: LoginField) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const nextErrors: FieldErrors<LoginField> = {
      email: validateEmail(email) ?? undefined,
      password: validateLoginPassword(password) ?? undefined,
    };
    setServerError(null);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      setAttempt((count) => count + 1);
      return;
    }

    setSubmitting(true);
    try {
      const token = await login({ email: email.trim(), password });
      const session = setToken(token);
      if (!session) throw new Error("This account type can't use the Play2Pro web app.");
      navigate(postLoginPath(session.role, location.state), { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setSubmitting(false);
      setPassword("");
      setAttempt((count) => count + 1);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {isDesktop && <AuthTabs />}
      <AuthHeading title="Welcome Back" subtitle="Log in to continue your Play2Pro journey." />

      {serverError && <FormAlert title="Log in failed" message={serverError} />}

      <AuthCardBody>
        <Field label="Email Address" error={errors.email} required>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="your@email.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError("email");
            }}
          />
        </Field>
        <Field label="Password" error={errors.password} required>
          <PasswordInput
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearError("password");
            }}
          />
        </Field>
      </AuthCardBody>

      <Button type="submit" fullWidth loading={submitting}>
        {submitting ? "Logging In..." : "Log In"}
      </Button>

      {!isDesktop && <AuthSwitchLink prompt="New to Play2Pro?" to={ROUTES.signup} label="Create an account" />}
    </form>
  );
}
