import Link from "next/link";
import logo from "@/public/logo.png";
import Image from "next/image";

const discoveryCallUrl = "https://cal.com/safoan/30min";

export function Header() {
  return (
    <header className="mt-5">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 md:px-6">
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
