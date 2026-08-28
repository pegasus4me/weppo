"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "./theme-toggle";

const discoveryCallUrl = "https://cal.com/safoan/30min";

export function Header() {
  const pathname = usePathname();
  const { isPending } = authClient.useSession();
  const isDashboard = pathname.startsWith("/dashboard");
  const isLanding = pathname === "/";

  if (isDashboard) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/25 bg-card/75 backdrop-blur-3xl">
      {isLanding ? (
        <div className="border-b border-border/25 bg-[#faec1b]">
          <div className="mx-auto flex h-10 w-full max-w-[1440px] items-center justify-center gap-2 border-x border-dashed border-black/10 px-5 text-sm text-[#5d5d5d] sm:px-8 lg:px-12">
            <span className="font-medium text-[#292929]">New</span>
            <span>Weppo is opening private beta.</span>
            <a
              href={discoveryCallUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#292929] underline decoration-black/40 underline-offset-4 hover:decoration-black"
            >
              Request access
            </a>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between border-x border-dashed border-border/25 px-5 sm:px-8 lg:px-12">
        <Link
          href={isDashboard ? "/dashboard" : "/"}
          aria-label="Weppo home"
          className="inline-flex items-center gap-2"
        >
          <Image
            src="/weppo-mark.png"
            alt=""
            width={325}
            height={295}
            priority
            className="h-8 w-auto"
          />
          <span className="text-2xl font-medium tracking-[-0.04em] text-foreground">weppo</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        {isPending ? (
          <div className="h-10 w-[94px]" aria-hidden="true" />
        ) : (
          <a
            href={discoveryCallUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors duration-200 hover:bg-secondary-foreground"
          >
            Book a discovery call
          </a>
        )}
        </div>
      </div>
    </header>
  );
}
