import Image from "next/image";
import Link from "next/link";

const discoveryCallUrl = "https://cal.com/safoan/30min";

export function Header() {
  return (
    <header className="relative z-20 w-full border-b border-[#9e9e9e]/25 bg-white/80 backdrop-blur-3xl">
      {/* Top Banner with animated gradient */}
      <div className="border-b border-[#9e9e9e]/25 animate-banner-flow">
        <div className="mx-auto flex h-10 w-full max-w-[1440px] items-center justify-center gap-2 border-x border-[#9e9e9e]/25 px-5 text-sm text-[#5d5d5d] sm:px-8 lg:px-12">
          <span className="font-medium text-[#292929]">New</span>
          <span>Weppo is opening private beta.</span>
          <a
            href={discoveryCallUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#292929] underline decoration-[#292929]/40 underline-offset-4 hover:decoration-[#292929]"
          >
            Request access
          </a>
        </div>
      </div>

      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between border-x border-[#9e9e9e]/25 px-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Weppo home" className="inline-flex items-center">
          <Image
            src="/weppo-logo-v4.png"
            alt="Weppo"
            width={1263}
            height={360}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <div className="flex items-center gap-4">
          <a
            href={discoveryCallUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#292929] px-5 text-sm font-medium text-white transition-opacity hover:opacity-85"
          >
            Book a call
          </a>
        </div>
      </div>
    </header>
  );
}
