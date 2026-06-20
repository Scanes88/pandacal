"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: [
    { href: "/coaches", label: "Coaches" },
    { href: "/clients", label: "All clients" },
    { href: "/library", label: "Exercise library" },
  ],
  coach: [{ href: "/clients", label: "Clients" }],
  client: [
    { href: "/training", label: "Training" },
    { href: "/progress", label: "Progress" },
  ],
};

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-token px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-ink text-white"
                : "text-ink-soft hover:bg-surface-raised hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
