"use client";

import Image from "next/image";
import { useState } from "react";

type CompanyLogoProps = {
  company: string;
  domain: string;
  initials: string;
};

export function CompanyLogo({ company, domain, initials }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-medium text-text-secondary">
        {initials}
      </span>
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/20 bg-card">
      <Image
        src={`/api/company-logo?domain=${encodeURIComponent(domain)}`}
        alt={`${company} logo`}
        width={24}
        height={24}
        unoptimized
        onError={() => setFailed(true)}
        className="size-6 object-contain"
      />
    </span>
  );
}
