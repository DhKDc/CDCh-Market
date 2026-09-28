"use client";
import { usePathname } from "next/navigation";
import { Store, Newspaper } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Mercado", icon: Store },
  { href: "/novedades", label: "Novedades", icon: Newspaper },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-6xl mx-auto grid grid-cols-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${
                active ? "text-brand-text" : "text-muted"
              }`}
            >
              <Icon size={22} />
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
