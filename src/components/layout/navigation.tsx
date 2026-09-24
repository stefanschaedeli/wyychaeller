"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { APP_TITLE } from "@/domain/constants";

const NAVIGATION_LINKS = [
  { href: "/", label: "Keller" },
  { href: "/soon", label: "Bald" },
  { href: "/pairing", label: "Essen" },
  { href: "/more", label: "Mehr" },
] as const;

function isActivePath(currentPath: string, href: string): boolean {
  return href === "/" ? currentPath === "/" : currentPath.startsWith(href);
}

function NavigationLink({ href, label }: { href: string; label: string }) {
  const isActive = isActivePath(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-11 items-center justify-center px-3 font-sans text-xs uppercase tracking-[0.1em] md:justify-start ${
        isActive ? "text-bordeaux font-semibold" : "text-ink-muted"
      }`}
    >
      {label}
    </Link>
  );
}

/** Bottom bar on phones, sidebar from the md breakpoint. The capture control sits in the middle. */
export function Navigation({ captureControl }: { captureControl: ReactNode }) {
  const [cellarLink, soonLink, pairingLink, moreLink] = NAVIGATION_LINKS;
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-ink bg-paper pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-52 md:flex-col md:items-stretch md:justify-start md:gap-1 md:border-r md:border-t-0 md:p-6"
    >
      <p className="hidden text-2xl italic md:mb-6 md:block">{APP_TITLE}</p>
      <NavigationLink {...cellarLink} />
      <NavigationLink {...soonLink} />
      <div className="md:order-last md:mt-6 md:flex md:justify-center">{captureControl}</div>
      <NavigationLink {...pairingLink} />
      <NavigationLink {...moreLink} />
    </nav>
  );
}
