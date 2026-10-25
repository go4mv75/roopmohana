# RoopMohana — verified source notes

Retrieved 24 October 2026 from the business’s public website. Facts below reproduce the business's own representations, not independent certification. The current platform is WordPress / WooCommerce, evidenced by its public WooCommerce Store API.

## Brand
- Focus: 925 sterling silver jewellery, Indian craftsmanship, tradition with contemporary aesthetics, everyday wear and celebrations.
- Name: Roopa (mother) + Mohan (father), also linked to Shri Radha’s beauty/devotion and Shri Krishna as Mohana. Peacock symbolizes grace, prosperity and protection.
- Founder shown publicly: Monica Verma.
- Avoid importing homepage testimonials: one visibly contains an unfinished instruction about generating customer images.
- Homepage mentions 925 certificate then says no paper certificate; dedicated authenticity page states hallmark certification where applicable. Do not promise every piece has a certificate/HUID without owner confirmation.
- Source: https://roopmohana.com/about-us/
- Source: https://roopmohana.com/hallmark-authenticity/
- Source: https://roopmohana.com/

## Contact
- Email: info@roopmohana.com
- Phone: +91 86999 64258
- Location: Mohali-PB (no street address publicly specified on contact page).
- Support Monday–Saturday 10 AM–7 PM; Sunday/public holidays closed. Target response 24–48 working hours.
- Source: https://roopmohana.com/contact-us/

## Shipping
- Processing 1–3 business days after order confirmation; weekend/holiday orders processed next working day.
- Standard delivery 3–7 business days across India, dependent on location/courier availability.
- Free India shipping on prepaid orders ABOVE ₹1,000. The source does not specify a shipping fee for orders at/below that amount or any COD policy.
- Tracking shared via SMS/email once shipped.
- Source: https://roopmohana.com/shipping-policy/

## Returns, exchanges, refunds
- Return/exchange request within 7 days of delivery. Unused/unworn pristine condition, original packaging, invoice and tags; any certificate if provided.
- Non-returnable: customised/engraved/made-to-order jewellery, earrings, sale/clearance/promotional purchases, used/damaged/tampered items after delivery.
- Exchanges subject to availability; higher-value difference payable, lower-value difference store credit.
- Refunds to original payment method, 5–10 business days after approval/quality inspection.
- Return shipping free for damaged/defective/incorrect products, otherwise customer paid.
- Cancellation within 24 hours of placement or before dispatch, whichever first.
- Damaged/defective/incorrect delivery must be reported within 48 hours with images/video; verified cases replacement/full refund at no extra charge. Contact with order ID and reason; approval generally within 48 hours.
- Source: https://roopmohana.com/refund_returns/

## Catalog provenance and limits
- 40 latest products via https://roopmohana.com/wp-json/wc/store/v1/products?per_page=40
- `catalog.json` contains integer paise prices, category metadata, source URLs, cleaned descriptions, up to three images per product and source stock booleans.
- Public API does not expose quantity. `stockQuantity` intentionally null. Set real stock before taking orders; do not convert availability into an invented number.
- `compareAtPrice` is original regular price; show strikethrough only when greater than current price.
- Downloaded images are existing public product photography, not newly generated representations.
- Source copy in HTML may include awkward phrasing and some descriptions need editorial cleanup; commercial prices/SKUs retained exactly.
- Existing homepage advertises ROOP05 (5% first order); migration should only enable after owner verifies intended promotion mechanics.

## Complete catalog import
- `catalog-full.json` contains all 62 publicly accessible products as reported by WooCommerce headers `x-wp-total: 62` and `x-wp-totalpages: 1` with `per_page=100`. API endpoint: https://roopmohana.com/wp-json/wc/store/v1/products?per_page=100&page=1
- Raw response: `products-page-1.json`; response headers: `products-page-1.headers`.
- Original `catalog.json` and original image names remain unchanged. The full catalog adds 22 products and 66 image files, for 185 product images total.
- All 62 API products are `simple`, have `has_options: false`, empty `variations`, and empty `attributes`. `product-options.json` records zero option flags. No variable-product migration needed based on public API. Size words may exist in descriptions but are not machine-readable options.
- Nine populated categories: Silver Anklets (Payal), Silver Earrings, Silver Kada, Silver Mangalsutra, Silver Necklace, Silver Pendant, Silver Rings, Silver Toe Ring, Women Silver Bracelet.
- Product 1223, Graceful 925 Sterling Silver Polished Anklets, is explicitly out of stock. Other 61 are marked in stock by the source, but quantities remain unknown. New application should seed actual inventory quantities as zero until owner confirms counts.
