"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Gem, FolderTree, TicketPercent, Users, MessageSquare, Store, Landmark } from "lucide-react";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/bank-sms", label: "Bank SMS", icon: Landmark },
  { href: "/admin/products", label: "Products", icon: Gem },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex lg:flex-col gap-1 p-3 overflow-x-auto scrollbar-none">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${
              active ? "bg-paper/10 text-paper" : "hover:bg-paper/5 hover:text-paper"
            }`}
          >
            <Icon size={17} strokeWidth={1.6} />
            {label}
          </Link>
        );
      })}
      <Link href="/" className="lg:hidden flex items-center gap-3 px-3 py-2.5 text-sm whitespace-nowrap hover:text-paper">
        <Store size={17} strokeWidth={1.6} /> Store
      </Link>
    </nav>
  );
}
