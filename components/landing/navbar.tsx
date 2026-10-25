"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Community", href: "#community" },
  { label: "Reviews", href: "#reviews" },
  { label: "Analytics", href: "#analytics" },
];

/** Sticky top bar: gradient logo, section links, Get Started / Login. */
export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/90 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-md">
      <div className="relative mx-auto flex h-14 w-full items-center justify-between px-4 sm:h-[72px] sm:px-8 lg:px-12">
        <Link href="/" className="p-1 sm:p-2">
          <span className="text-gradient-brand text-xl font-semibold leading-none sm:text-heading">
            EntertainVerse
          </span>
        </Link>

        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-white transition-colors hover:text-brand-pink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "md" }),
              "hidden w-[100px] sm:inline-flex sm:w-[110px]",
            )}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: "gradient", size: "md" }),
              "w-[100px] sm:w-[110px]",
            )}
          >
            Get Started
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="cursor-pointer rounded-lg p-2 text-white transition-colors hover:bg-white/10 md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-white/10 px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm text-white transition-colors hover:bg-white/10 hover:text-brand-pink"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-white transition-colors hover:bg-white/10 hover:text-brand-pink"
              >
                Login
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
