import Link from "next/link";
import logo from "@/public/logo.png";
import Image from "next/image";

const discoveryCallUrl = "https://cal.com/safoan/30min";

function HeaderPixelCorner({ side }: { side: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute top-0 z-20 h-auto w-36 text-[#FFFB2A] md:w-52 ${
        side === "left" ? "left-0" : "right-0 scale-x-[-1]"
      }`}
      fill="none"
      viewBox="0 0 180 126"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M45 84H0V126H45V84Z" fill="currentColor" />
      <path d="M90 42H45V84H90V42Z" fill="currentColor" />
      <path d="M135 0H90V42H135V0Z" fill="currentColor" />
      <path d="M180 42H135V84H180V42Z" fill="currentColor" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="relative z-30 overflow-visible">
      <HeaderPixelCorner side="left" />
      <HeaderPixelCorner side="right" />

      <div className="relative z-30 mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 md:px-6">
        <Link href="/">
          <Image
            src={logo}
            alt="Weppo"
            width={180}
            height={120}
            className=""
          />
        </Link>

        <nav className="hidden items-center gap-8 text-md  font-light text-muted-foreground md:flex">
          <Link href="/#problem" className="hover:text-foreground">
            Problem
          </Link>
          <Link href="/#symptoms" className="hover:text-foreground">
            Symptoms
          </Link>
          <Link href="/#workflow" className="hover:text-foreground">
            Workflow
          </Link>
          <Link href="/#use-cases" className="hover:text-foreground">
            Use cases
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href={discoveryCallUrl}
            className="rounded-full bg-secondary px-4 py-2 text-lg font-light text-[#FFFB2A] hover:opacity-70 md:text-lg"
            rel="noreferrer"
            target="_blank"
          >
            Book a call
          </Link>
        </div>
      </div>
    </header>
  );
}
