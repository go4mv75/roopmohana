import { PageHero } from "@/components/store/page-hero";
import { EnquiryForm } from "@/components/store/enquiry-form";
import { WhatsAppIcon } from "@/components/store/brand-icons";
import { store } from "@/lib/config";

export const metadata = {
  title: "Custom silver jewellery",
  description: "Name pendants, bridal payal, personalised rings — designed with you and handcrafted in 925 sterling silver.",
};

const STEPS = [
  ["Share your idea", "Send a sketch, a photo or just a description — WhatsApp, email, or the form below."],
  ["Design together", "Our designers suggest refinements and send you a final design with a clear quotation."],
  ["Approve", "Nothing is made until you approve the design and price."],
  ["Handcrafted", "Our artisans craft your piece in premium 925 sterling silver."],
  ["Delivered", "Quality-checked and delivered to your door, anywhere in India."],
];

const IDEAS = ["Name & initial pendants", "Bridal payal & bichiya", "Couple & promise rings", "Kids’ and baby jewellery", "Gifts for occasions", "Heirloom recreations"];

export default function CustomisePage() {
  return (
    <>
      <PageHero eyebrow="Made for you" title="Customise a piece" description="If you can imagine it, our artisans can craft it in pure 925 silver." />
      <section className="container-x pt-20 grid lg:grid-cols-2 gap-16">
        <div>
          <p className="eyebrow">How it works</p>
          <ol className="mt-8 space-y-8">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-6">
                <span className="display text-4xl text-sindoor/40 w-10 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="display text-2xl">{t}</p>
                  <p className="text-muted mt-1 leading-relaxed">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12">
            <p className="eyebrow mb-4">Popular requests</p>
            <div className="flex flex-wrap gap-2">
              {IDEAS.map((i) => (
                <span key={i} className="px-4 py-2 border border-line text-sm">{i}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="card p-6 sm:p-10 bg-ivory/40 h-fit">
          <h2 className="display text-3xl mb-2">Tell us about your piece</h2>
          <p className="text-sm text-muted mb-8">
            Prefer to chat?{" "}
            <a href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent("Hi Roop Mohana, I'd like a custom piece made.")}`} className="inline-flex items-center gap-1 underline text-ink">
              <WhatsAppIcon size={14} /> WhatsApp us your design
            </a>
          </p>
          <EnquiryForm kind="customization" />
        </div>
      </section>
    </>
  );
}
