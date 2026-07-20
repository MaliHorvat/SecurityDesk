import Link from "next/link";
import { cn } from "@securitydesk/ui";

const LINKS = [
  { href: "/inventory", label: "Pregled" },
  { href: "/inventory/items", label: "Artikli" },
  { href: "/inventory/locations", label: "Lokacije" },
  { href: "/inventory/stock", label: "Zaloga" },
  { href: "/inventory/movements", label: "Premiki" },
  { href: "/inventory/reservations", label: "Rezervacije" },
  { href: "/inventory/purchase-orders", label: "Naročilnice" },
  { href: "/inventory/rma", label: "RMA" },
  { href: "/inventory/stocktakes", label: "Inventura" },
  { href: "/inventory/reports", label: "Poročila" },
] as const;

export function InventoryNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-1 border-b pb-2">
      {LINKS.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
