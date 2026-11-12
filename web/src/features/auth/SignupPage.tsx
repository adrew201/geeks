import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { homeRouteFor } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Field, Input, PasswordInput } from "../../components/ui/Field.tsx";
import { Spinner } from "../../components/ui/Spinner.tsx";
import { ROLE_LABELS } from "../../config/labels.ts";
import { ApiError } from "../../lib/api-client.ts";
import { setToken } from "../../lib/session.ts";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query.ts";
import { ROLE, type Role } from "../../types/api.ts";
import { EMAIL_TAKEN_STATUS, signup } from "./api.ts";
import { AuthCardBody, AuthHeading, FormAlert, TermsCheckbox } from "./AuthParts.tsx";
import { RoleStep } from "./RoleStep.tsx";
import { useFocusFirstInvalid } from "./use-focus-first-invalid.ts";
import {
  DATE_OF_BIRTH_HINT,
  PASSWORD_RULE,
  TERMS_REQUIRED,
  hasErrors,
  validateDateOfBirth,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
  type FieldErrors,
} from "./validation.ts";

// Page 02 signup. The 02D toolbar states as real states:
//   A Role Selection → step "role"
//   B Reg Form       → step "details"
//   G Form Errors    → step "details" with `serverError` (banner) and/or field errors
//   H Loading        → step "submitting"
//   C Reg Success    → step "success"
// (D Login is LoginPage; E Forgot Password / F Reset Sent are hidden: no endpoint.)
//
// 02D "Full Name" is the API's required `displayName`. Date of birth is required: 13+ to join,
// and gamers 18+ by it may receive donations (the API checks both again).

type Step = "role" | "details" | "submitting" | "success";
type SignupField = "displayName" | "email" | "dateOfBirth" | "password" | "terms";

export default function SignupPage() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role>(ROLE.GAMER);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<SignupField>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [account, setAccount] = useState<{ email: string; role: Role } | null>(null);

  useFocusFirstInvalid(formRef, attempt);

  function clearError(field: SignupField) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldErrors<SignupField> = {
      displayName: validateDisplayName(displayName) ?? undefined,
      email: validateEmail(email) ?? undefined,
      dateOfBirth: validateDateOfBirth(dateOfBirth) ?? undefined,
      password: validateNewPassword(password) ?? undefined,
      terms: terms ? undefined : TERMS_REQUIRED,
    };
    setServerError(null);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      setAttempt((count) => count + 1);
      return;
    }

    const cleanEmail = email.trim();
    setStep("submitting");
    try {
      const token = await signup(cleanEmail, password, role, displayName.trim(), dateOfBirth);
      const session = setToken(token);
      if (!session) {
        throw new Error("Your account was created, but we couldn't start a session. Please log in.");
      }
      setPassword("");
      setAccount({ email: cleanEmail, role: session.role });
      setStep("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setServerError(message);
      if (error instanceof ApiError && error.status === EMAIL_TAKEN_STATUS) setErrors({ email: message });
      setStep("details");
      setAttempt((count) => count + 1);
    }
  }

  if (step === "role") {
    return (
      <RoleStep
        variant={isDesktop ? "desktop" : "mobile"}
        value={role}
        onChange={setRole}
        onContinue={() => setStep("details")}
      />
    );
  }

  if (step === "submitting") {
    // 02D state H. loader-2 spinning at 1s linear (02D:830, keyframes 02D:856).
    return (
      <div role="status" className="flex flex-col items-center justify-center gap-5 py-10 text-center">
        <Spinner size={40} speed="normal" label={null} className="text-primary" />
        <div>
          <h1 className="text-16 font-bold">Creating Your Account...</h1>
          <p className="mt-1 text-12 text-fg-muted">Preparing your Play2Pro profile credentials.</p>
        </div>
      </div>
    );
  }

  if (step === "success" && account) {
    // 02D state C. Copy adjusted: onboarding (03/04) isn't built, so "Continue to Setup"
    // goes to the role's home via homeRouteFor().
    return (
      <div className="flex flex-col items-center gap-4 py-3 text-center">
        <div
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full border border-success/35 bg-success/14 text-success"
        >
          <Check className="size-7" />
        </div>
        <div>
          <h1 className="font-display text-24 font-bold">Your Account Is Ready</h1>
          <p className="mt-1 text-12 text-fg-muted">
            Welcome to Play2Pro. You&apos;re signed in as a {ROLE_LABELS[account.role].toLowerCase()}.
          </p>
        </div>
        <div className="w-full rounded-md border border-border bg-inset p-3 text-left text-12">
          <p className="font-bold text-fg">Account Summary</p>
          <p className="mt-0.5 break-all text-fg-muted">Email: {account.email}</p>
          <p className="text-fg-muted">
            Role: <strong className="text-primary uppercase">{ROLE_LABELS[account.role]}</strong>
          </p>
        </div>
        <Button fullWidth onClick={() => navigate(homeRouteFor(account.role), { replace: true })}>
          Continue
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  // 02D state B (and G when errors are present).
  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => setStep("role")}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back
        </Button>
        <Badge tone="blue">Role: {ROLE_LABELS[role]}</Badge>
      </div>

      <AuthHeading title="Account Details" subtitle="Enter your basic information to get started." />

      {serverError && <FormAlert title="Account creation failed" message={serverError} />}

      <AuthCardBody>
        <Field label="Full Name" error={errors.displayName} required>
          <Input
            name="name"
            autoComplete="name"
            placeholder="Alex Mwangi"
            maxLength={60}
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              clearError("displayName");
            }}
          />
        </Field>
        <Field label="Email Address" error={errors.email} required>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="alex@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError("email");
            }}
          />
        </Field>
        <Field
          label="Date of Birth"
          hint={role === ROLE.GAMER ? DATE_OF_BIRTH_HINT : undefined}
          error={errors.dateOfBirth}
          required
        >
          <Input
            type="date"
            name="bday"
            autoComplete="bday"
            max={new Date().toISOString().slice(0, 10)}
            value={dateOfBirth}
            onChange={(event) => {
              setDateOfBirth(event.target.value);
              clearError("dateOfBirth");
            }}
          />
        </Field>
        <Field label="Password" hint={PASSWORD_RULE} error={errors.password} required>
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearError("password");
            }}
          />
        </Field>
        <TermsCheckbox
          checked={terms}
          onChange={(checked) => {
            setTerms(checked);
            clearError("terms");
          }}
          error={errors.terms}
        />
      </AuthCardBody>

      <Button type="submit" fullWidth>
        Create Account
      </Button>
    </form>
  );
}
