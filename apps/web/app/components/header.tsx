"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const isDashboard = pathname.startsWith("/dashboard");
  const isLanding = pathname === "/";

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();

    if (!error) {
      router.replace("/");
      router.refresh();
    }
  };

  if (isDashboard) {
    return null;
  }

  return (
    <header className="relative z-20 w-full border-b border-border/25 bg-white/75 backdrop-blur-3xl">
      {isLanding ? (
        <div className="border-b border-border/25 bg-[#faec1b]">
          <div className="mx-auto flex h-10 w-full max-w-[1440px] items-center justify-center gap-2 border-x border-border/25 px-5 text-sm text-text-secondary sm:px-8 lg:px-12">
            <span className="font-medium text-foreground">New</span>
            <span>Weppo is opening private beta.</span>
            <Link
              href="/sign-up"
              className="font-medium text-foreground underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground"
            >
              Request access
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between border-x border-border/25 px-5 sm:px-8 lg:px-12">
        <Link
          href={isDashboard ? "/dashboard" : "/"}
          aria-label="Weppo home"
          className="inline-flex items-center"
        >
          <Image
            src="/weppo-logo-v4.png"
            alt="Weppo"
            width={1263}
            height={360}
            priority
            className="h-10 w-auto"
          />
        </Link>

        {isPending ? (
          <div className="h-10 w-[94px]" aria-hidden="true" />
        ) : session ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors duration-200 hover:bg-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Log out
          </button>
        ) : (
          <Link
            href="/sign-up"
            className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors duration-200 hover:bg-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Get started
          </Link>
        )}
      </div>
    </header>
  );
}
