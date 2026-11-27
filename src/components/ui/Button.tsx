import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent border border-accent hover:bg-accent-hover hover:border-accent-hover disabled:opacity-50",
  secondary:
    "bg-card text-ink border border-line hover:bg-card-hover hover:border-line-strong disabled:text-ink-subtle",
  ghost:
    "bg-transparent text-ink border border-transparent hover:bg-card-hover disabled:text-ink-subtle",
};

const baseClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  fullWidth = false,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? "w-full" : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

export interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: ReactNode;
}

export function LinkButton({
  href,
  variant = "secondary",
  fullWidth = false,
  children,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? "w-full" : ""}`}
    >
      {children}
    </Link>
  );
}
