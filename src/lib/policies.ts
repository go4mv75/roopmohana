import { store } from "./config";

/**
 * Policy copy, carried over from the previous roopmohana.com policies.
 * Each section is [heading, paragraphs[]]. Edit freely — these render as-is.
 */
export type Policy = { title: string; intro: string; sections: [string, string[]][] };

const contact = `${store.email} or ${store.phone}`;

export const POLICIES: Record<string, Policy> = {
  shipping: {
    title: "Shipping policy",
    intro: "We deliver across India with trusted courier partners, packed securely and gift-ready.",
    sections: [
      ["Processing time", ["Orders are processed within 1–3 business days of confirmation. Orders placed on weekends or public holidays are processed on the next working day."]],
      ["Delivery time", ["Standard delivery takes 3–7 business days depending on your location and courier availability."]],
      ["Shipping charges", ["Shipping is free on prepaid orders above ₹1,000. A flat shipping fee applies to smaller orders and to cash-on-delivery orders, shown at checkout before you pay."]],
      ["Tracking", ["As soon as your order ships you'll receive the courier name and tracking number by email, and it appears on your order page."]],
      ["Delays", ["Weather, logistics disruptions or regulatory restrictions can occasionally delay delivery. We'll keep you informed and help however we can."]],
      ["Damaged or tampered packages", [`If the outer packaging looks tampered with, please refuse the delivery or record an unboxing video, and contact us right away at ${contact}.`]],
    ],
  },
  returns: {
    title: "Returns, exchanges & refunds",
    intro: "We want you to love every piece. If something isn’t right, here’s how we make it right.",
    sections: [
      ["Return window", ["Returns and exchanges are accepted within 7 days of delivery."]],
      ["Conditions", ["The piece must be unused, unworn and undamaged, returned in its original packaging with the invoice, tags and any certificate provided."]],
      ["Not eligible", ["Customised, engraved or made-to-order jewellery", "Earrings (for hygiene reasons)", "Items bought on sale, clearance or promotion", "Items used, damaged or altered after delivery"]],
      ["Exchanges", ["Exchanges are subject to stock. If the new piece costs more you pay the difference; if it costs less, the balance is issued as store credit."]],
      ["Refunds", ["Refunds go back to the original payment method after the piece passes our quality inspection, within 5–10 business days of approval. Bank timelines may vary."]],
      ["Damaged, defective or incorrect items", ["Report within 48 hours of delivery with photos or an unboxing video. Once verified, we’ll send a replacement or a full refund at no extra cost, and return shipping is on us."]],
      ["Return shipping", ["Free for damaged, defective or incorrect items. For other returns, return shipping is paid by the customer."]],
      ["Cancellations", ["Orders can be cancelled within 24 hours of placing them or before dispatch, whichever comes first."]],
      ["How to start", [`Contact us within 7 days of delivery at ${contact} with your order number, the reason, and photos or video. We respond within 48 hours with next steps.`]],
    ],
  },
  hallmark: {
    title: "Hallmark & authenticity",
    intro: "Every Roop Mohana piece is crafted in 925 sterling silver — 92.5% pure silver, alloyed for strength.",
    sections: [
      ["Purity", ["Our jewellery is made from high-quality 925 sterling silver and carries hallmark certification where applicable."]],
      ["Quality checks", ["Every piece is inspected by hand before dispatch for finish, stone setting and clasp security."]],
      ["Plating", ["Rose-gold and gold-tone finishes are decorative plating over silver. Plating can soften with wear and is not covered by warranty."]],
      ["Natural tarnish", ["Silver naturally reacts with air and moisture. Tarnish is not a defect — a silver polishing cloth restores the shine."]],
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "We collect only what we need to deliver your order and look after you.",
    sections: [
      ["What we collect", ["Your name, email, phone number and delivery address; your order history; and basic technical data needed to keep the site secure."]],
      ["Payments", ["Card, UPI and bank details are entered on our payment partners’ secure pages (Razorpay, PhonePe). We never see or store your card or UPI PIN."]],
      ["How we use it", ["To process and deliver orders, send order updates, respond to enquiries and — only if you subscribe — send occasional emails about new collections."]],
      ["Sharing", ["We share delivery details with courier partners and payment details with payment gateways, only as needed. We never sell your data."]],
      ["Your choices", [`You can update your details from your account, unsubscribe from emails at any time, or ask us to delete your account by writing to ${store.email}.`]],
      ["Cookies", ["We use essential cookies to keep you signed in and remember your bag. Your bag and wishlist are stored in your browser."]],
    ],
  },
  terms: {
    title: "Terms & conditions",
    intro: `These terms apply to purchases on this website, operated by ${store.name}.`,
    sections: [
      ["Products", ["We take care to show our jewellery accurately. Handcrafted pieces can vary slightly in colour, finish and weight; screens may display colours differently."]],
      ["Pricing", ["Prices are in Indian Rupees and include applicable taxes. We may correct pricing errors and will contact you before shipping if an error affects your order."]],
      ["Orders", ["An order is confirmed once payment is received (or, for cash on delivery, once we accept it). We may cancel and fully refund orders we cannot fulfil."]],
      ["Discount codes", ["Codes are subject to their stated conditions, one code per order, and cannot be exchanged for cash."]],
      ["Liability", ["To the extent permitted by law, our liability is limited to the value of the product purchased."]],
      ["Governing law", ["These terms are governed by the laws of India."]],
    ],
  },
};
