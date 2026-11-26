import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-neutral-900 text-white border border-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 disabled:border-neutral-400",
  secondary:
    "bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-100 disabled:text-neutral-400",
  ghost:
    "bg-transparent text-neutral-900 border border-transparent hover:bg-neutral-100 disabled:text-neutral-400",
};

const baseClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 cursor-pointer disabled:cursor-not-allowed";

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
