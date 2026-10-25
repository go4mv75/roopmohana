import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "./brand-icons";
import { store } from "@/lib/config";
import { Logo } from "./logo";
import { NewsletterForm } from "./newsletter-form";

const policies = [
  ["Shipping policy", "/policies/shipping"],
  ["Returns & exchanges", "/policies/returns"],
  ["Hallmark & authenticity", "/policies/hallmark"],
  ["Privacy policy", "/policies/privacy"],
  ["Terms & conditions", "/policies/terms"],
] as const;

export function Footer({ categories }: { categories: { slug: string; name: string; count: number }[] }) {
  return (
    <footer className="bg-ink text-paper/80 mt-24">
      <div className="container-x py-16 grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-6 max-w-sm">
          <Logo light />
          <p className="text-sm leading-relaxed text-paper/60">
            Handcrafted 925 sterling silver jewellery, ethically made in India and quality-checked by hand before it leaves us.
          </p>
          <div>
            <p className="eyebrow text-paper/50 mb-3">Letters from the workshop</p>
            <NewsletterForm />
          </div>
        </div>
        <FooterCol title="Shop">
          <FooterLink href="/shop">All jewellery</FooterLink>
          {categories
            .filter((c) => c.count > 0)
            .slice(0, 7)
            .map((c) => (
              <FooterLink key={c.slug} href={`/collections/${c.slug}`}>
                {c.name}
              </FooterLink>
            ))}
        </FooterCol>
        <FooterCol title="Help">
          <FooterLink href="/account/orders">Track your order</FooterLink>
          <FooterLink href="/customise">Customisation</FooterLink>
          <FooterLink href="/contact">Contact us</FooterLink>
          <FooterLink href="/about">Our story</FooterLink>
          {policies.map(([label, href]) => (
            <FooterLink key={href} href={href}>
              {label}
            </FooterLink>
          ))}
        </FooterCol>
        <FooterCol title="Reach us">
          <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-paper">
            <Phone size={14} /> {store.phone}
          </a>
          <a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-paper">
            <WhatsAppIcon size={14} /> WhatsApp us
          </a>
          <a href={`mailto:${store.email}`} className="flex items-center gap-2 hover:text-paper">
            <Mail size={14} /> {store.email}
          </a>
          <div className="flex gap-3 pt-2">
            <a href={store.instagram} target="_blank" rel="noopener" aria-label="Instagram" className="w-9 h-9 grid place-items-center border border-paper/20 hover:border-paper hover:text-paper">
              <InstagramIcon size={16} />
            </a>
            <a href={store.facebook} target="_blank" rel="noopener" aria-label="Facebook" className="w-9 h-9 grid place-items-center border border-paper/20 hover:border-paper hover:text-paper">
              <FacebookIcon size={16} />
            </a>
          </div>
        </FooterCol>
      </div>
      <div className="border-t border-paper/10">
        <div className="container-x py-6 flex flex-col sm:flex-row gap-3 justify-between text-xs text-paper/45">
          <p>© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
          <p>925 Sterling Silver · Handcrafted in India · Secure payments via Razorpay &amp; UPI</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-paper/50 mb-5">{title}</p>
      <div className="flex flex-col gap-3 text-sm">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:text-paper w-fit link-underline">
      {children}
    </Link>
  );
}
