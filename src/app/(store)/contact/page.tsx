import { Mail, Phone, Clock } from "lucide-react";
import { PageHero } from "@/components/store/page-hero";
import { EnquiryForm } from "@/components/store/enquiry-form";
import { WhatsAppIcon } from "@/components/store/brand-icons";
import { store } from "@/lib/config";

export const metadata = { title: "Contact us", description: `Reach ${store.name} by phone, WhatsApp or email.` };

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="We’re here to help" title="Contact us" />
      <section className="container-x pt-16 grid lg:grid-cols-[1fr_1.3fr] gap-16 max-w-6xl">
        <div className="space-y-8">
          <Item icon={<Phone size={18} />} title="Call us">
            <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="hover:text-sindoor">{store.phone}</a>
          </Item>
          <Item icon={<WhatsAppIcon size={18} />} title="WhatsApp">
            <a href={`https://wa.me/${store.whatsapp}`} className="hover:text-sindoor">Chat with us</a>
          </Item>
          <Item icon={<Mail size={18} />} title="Email">
            <a href={`mailto:${store.email}`} className="hover:text-sindoor">{store.email}</a>
          </Item>
          <Item icon={<Clock size={18} />} title="Hours">Monday – Saturday, 10am – 7pm IST</Item>
          {store.address && <Item icon={<span>⌂</span>} title="Studio">{store.address}</Item>}
        </div>
        <div className="card p-6 sm:p-10">
          <h2 className="display text-3xl mb-8">Send us a message</h2>
          <EnquiryForm kind="contact" />
        </div>
      </section>
    </>
  );
}

function Item({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <span className="w-11 h-11 rounded-full border border-line grid place-items-center text-sindoor shrink-0">{icon}</span>
      <div>
        <p className="eyebrow">{title}</p>
        <p className="mt-1 text-[17px]">{children}</p>
      </div>
    </div>
  );
}
