"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "solid" | "ghost";
type ButtonSize = "md" | "lg";

type BaseProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type LinkButtonProps = BaseProps & {
  href: string;
  rel?: string;
  target?: string;
};

type ActionButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

export type ButtonProps = LinkButtonProps | ActionButtonProps;

const baseClassName =
  "ui-button inline-flex items-center justify-center rounded-full border font-medium tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary,#c7baff)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface,#f4f4f4)] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50";

const variantClassNames: Record<ButtonVariant, string> = {
  solid:
    "border-red-500 bg-[color:var(--color-primary,#c7baff)] text-[color:var(--color-text,#262626)] shadow-[0_14px_30px_rgba(38,38,38,0.14)] hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--color-primary,#c7baff)_88%,white)] hover:shadow-[0_18px_38px_rgba(38,38,38,0.18)] active:translate-y-0 active:shadow-[0_8px_20px_rgba(38,38,38,0.14)]",
  ghost:
    "border-[color:color-mix(in_srgb,var(--color-text,#262626)_16%,transparent)] bg-[color:var(--color-surface,#f4f4f4)] text-[color:var(--color-text,#262626)] hover:-translate-y-0.5 hover:border-[color:var(--color-primary,#c7baff)] hover:bg-white hover:shadow-[0_12px_30px_rgba(38,38,38,0.08)] active:translate-y-0 active:bg-[color:color-mix(in_srgb,var(--color-surface,#f4f4f4)_92%,black)]",
};

const sizeClassNames: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-13 px-6 text-base",
};

function isLinkButton(props: ButtonProps): props is LinkButtonProps {
  return typeof (props as LinkButtonProps).href === "string";
}

function composeClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  return [baseClassName, variantClassNames[variant], sizeClassNames[size], className]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: ButtonProps) {
  if (isLinkButton(props)) {
    const {
      children,
      className,
      href,
      rel,
      target,
      variant = "solid",
      size = "md",
    } = props;
    const composedClassName = composeClassName(variant, size, className);
    const composedRel =
      target === "_blank"
        ? [rel, "noreferrer", "noopener"].filter(Boolean).join(" ")
        : rel;

    return (
      <a
        className={composedClassName}
        data-size={size}
        data-variant={variant}
        href={href}
        rel={composedRel}
        target={target}
      >
        {children}
      </a>
    );
  }

  const {
    children,
    className,
    type = "button",
    variant = "solid",
    size = "md",
    ...buttonProps
  } = props;
  const composedClassName = composeClassName(variant, size, className);

  return (
    <button
      className={composedClassName}
      data-size={size}
      data-variant={variant}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
