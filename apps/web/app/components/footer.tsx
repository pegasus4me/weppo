import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-y border-border/25 bg-white">
      <div className="mx-auto w-full max-w-[1440px] border-x border-border/25">
        <div className="flex flex-col gap-8 px-5 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:px-12">
          <div>
            <Link href="/" aria-label="Weppo home" className="inline-flex">
              <Image
                src="/weppo-logo-v4.png"
                alt="Weppo"
                width={1263}
                height={360}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-text-secondary">
              Your B2B Agentic tech support teammate.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex items-center gap-6 text-sm text-text-secondary"
          >
            <a
              href="https://cal.com/safoan/30min"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Book a discovery call
            </a>
            <a
              href="https://cal.com/safoan/30min"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4"
            >
              Request access
            </a>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/25 px-5 py-4 text-xs text-text-tertiary sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>© 2026 Weppo</span>
          <span>AI teammate for engineering teams.</span>
        </div>
      </div>
    </footer>
  );
}
