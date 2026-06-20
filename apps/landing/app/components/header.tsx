import Link from "next/link";
import logo from "@/public/logo.png";
import Image from "next/image";

export function Header() {
  return (
    <header className="mt-5">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 md:px-6">
        <nav className="hidden items-center gap-8 text-lg font-medium md:flex">
          <Link href="/#problem" className="hover:opacity-70">
            Problem
          </Link>
          <Link href="/#outcome" className="hover:opacity-70">
            Outcome
          </Link>
          <Link href="/#apply" className="hover:opacity-70">
            Apply
          </Link>
        </nav>

        <Link
          href="/"
          className="absolute left-1/2 block -translate-x-1/2"
        >
          <Image
            src={logo}
            alt="Narrativee"
            width={90}
            height={90}
            className="h-auto w-full"
          />
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/#apply"
            className="rounded-full bg-secondary text-lg  px-4 py-2 text-black hover:opacity-70"
          >
            Apply for pilot
          </Link>
        </div>
      </div>
    </header>
  );
}
