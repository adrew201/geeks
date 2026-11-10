import type { ComponentProps } from "react";
import { Link, type LinkProps } from "react-router";
import { cn } from "../../lib/cn.ts";
import { buttonClasses, type ButtonStyleProps } from "./button-styles.ts";
import { Spinner } from "./Spinner.tsx";

export interface ButtonProps extends ComponentProps<"button">, ButtonStyleProps {
  /** Shows a spinner and disables the button. */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses({ variant, size, fullWidth }), className)}
      {...rest}
    >
      {loading && <Spinner size={16} label={null} />}
      {children}
    </button>
  );
}

export type ButtonLinkProps = LinkProps & ButtonStyleProps;

/** A router link styled as a button. */
export function ButtonLink({ variant, size, fullWidth, className, ...rest }: ButtonLinkProps) {
  return <Link className={cn(buttonClasses({ variant, size, fullWidth }), className)} {...rest} />;
}
