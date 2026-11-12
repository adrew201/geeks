import {
  createContext,
  useContext,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { ChevronDown, CircleAlert, Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn.ts";

// Label: 07D .form-label / 02D .input-label (12px, secondary, space-between for an aside).
// Control: 07D .input-control (inset bg, border, radius-md, 10px 14px, 13px,
//   focus = primary border + 3px focus ring, valid = success border, invalid = danger border).
// Error: 02D .input-error-msg (11px danger with icon).

interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps {
  label: ReactNode;
  /** Right side of the label row, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, labelAside, hint, error, required, id, className, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id: controlId, describedBy, invalid: Boolean(error) }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={controlId} className="text-12 font-semibold text-fg-secondary">
            {label}
            {required && (
              <span className="text-danger" aria-hidden="true">
                {" "}
                *
              </span>
            )}
          </label>
          {labelAside}
        </div>
        {children}
        {error && (
          <p id={errorId} className="flex items-center gap-1 text-11 text-danger">
            <CircleAlert aria-hidden="true" className="size-3 shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-11 text-fg-muted">
            {hint}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldProps(props: { id?: string; invalid?: boolean; "aria-describedby"?: string }) {
  const field = useContext(FieldContext);
  const invalid = props.invalid ?? field?.invalid ?? false;
  return {
    id: props.id ?? field?.id,
    invalid,
    describedBy: props["aria-describedby"] ?? field?.describedBy,
  };
}

const CONTROL =
  "w-full rounded-md border bg-transparent px-3.5 py-2.5 font-sans text-13 text-fg outline-none transition-all duration-200 ease-[ease] focus:border-primary focus:shadow-focus disabled:cursor-not-allowed disabled:opacity-60";

function controlState(invalid: boolean, valid: boolean | undefined) {
  if (invalid) return "border-danger bg-danger/4";
  if (valid) return "border-success";
  return "border-border";
}

export interface InputProps extends ComponentProps<"input"> {
  invalid?: boolean;
  valid?: boolean;
  /** Element rendered inside the right edge (icon button, unit). */
  trailing?: ReactNode;
  /** Element rendered inside the left edge (search icon). */
  leading?: ReactNode;
}

export function Input({ invalid: invalidProp, valid, trailing, leading, className, ...rest }: InputProps) {
  const { id, invalid, describedBy } = useFieldProps({ ...rest, invalid: invalidProp });
  const input = (
    <input
      {...rest}
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(CONTROL, controlState(invalid, valid), leading && "pl-10", trailing && "pr-11", className)}
    />
  );
  if (!trailing && !leading) return input;
  return (
    <div className="relative flex items-center">
      {leading && (
        <span className="pointer-events-none absolute left-3.5 flex text-fg-muted [&>svg]:size-4">{leading}</span>
      )}
      {input}
      {trailing && <span className="absolute right-3 flex">{trailing}</span>}
    </div>
  );
}

/** Password input with a working visibility toggle (the 02D eye button was a no-op). */
export function PasswordInput(props: Omit<InputProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="flex cursor-pointer text-fg-muted transition-colors duration-200 hover:text-fg"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      }
    />
  );
}

export interface TextareaProps extends ComponentProps<"textarea"> {
  invalid?: boolean;
}

export function Textarea({ invalid: invalidProp, className, ...rest }: TextareaProps) {
  const { id, invalid, describedBy } = useFieldProps({ ...rest, invalid: invalidProp });
  return (
    <textarea
      {...rest}
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(CONTROL, "min-h-20 resize-y", controlState(invalid, false), className)}
    />
  );
}

export interface SelectProps extends ComponentProps<"select"> {
  invalid?: boolean;
}

/** Native select with an icon chevron (fixes the broken 07D data-URI chevron). */
export function Select({ invalid: invalidProp, className, children, ...rest }: SelectProps) {
  const { id, invalid, describedBy } = useFieldProps({ ...rest, invalid: invalidProp });
  return (
    <div className="relative flex items-center">
      <select
        {...rest}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(CONTROL, "cursor-pointer appearance-none pr-10", controlState(invalid, false), className)}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 size-4 text-fg-secondary" />
    </div>
  );
}
