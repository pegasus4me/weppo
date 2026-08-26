"use client";

import posthog from "posthog-js";

type DiscoveryCallLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export function DiscoveryCallLink({
  href,
  className,
  children,
}: DiscoveryCallLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={() => {
        posthog.capture("discovery_call_clicked");
      }}
    >
      {children}
    </a>
  );
}
