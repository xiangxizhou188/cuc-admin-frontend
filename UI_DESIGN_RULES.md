# CUC Supply Admin UI Design Rules

## Typography

CUC Supply Admin is an operational tool. Inventory, catalog, status, and account
information must remain comfortably readable at 100% browser zoom.

| Role | Token | Size | Typical use |
| --- | --- | ---: | --- |
| Label | `--type-label` | 11px | Uppercase eyebrows, table headings, compact field labels |
| Caption | `--type-caption` | 12px | Status, metadata, timestamps, helper copy |
| Body | `--type-body` | 14px | Descriptions, table cells, navigation, form values |
| Control | `--type-control` | 14px | Buttons, inputs, selects, tabs |
| Section title | `--type-section-title` | 18px | Panel and card headings |

Essential information must not render below 11px. Text at 11px must be short,
high-contrast, and non-paragraph content. Paragraphs and operational data use
12px or larger; primary reading and interactive text use 14px.

## Readability

- Body and supporting copy use a minimum line height of 1.5.
- Form inputs and primary buttons are at least 50px high on authentication pages.
- Uppercase labels use restrained letter spacing and never carry long sentences.
- Muted text may be lower contrast, but it must not also be undersized.
- Tables prioritize scanability: 11px headers, 12px metadata, and 14px primary values.

## Responsive behavior

Font tokens remain stable across desktop and mobile. Responsive rules may
change layout, spacing, or visible density, but must not reduce essential text
below the documented minimum.

## Iconography

- Interface icons use the official Phosphor Icons React package.
- Use the `regular` weight by default and `fill` only for the active primary navigation item.
- Primary navigation icons are 19–20px; button icons are 17–18px; compact status icons are 13–16px.
- Icons must describe the adjacent action or label. Do not use decorative Unicode symbols as controls.
- Icon-only buttons require an accessible Chinese `aria-label` and a visible hover/focus state.
- Icons inherit the surrounding semantic color; do not introduce arbitrary per-icon colors.

## Chinese interface

- Administrative UI copy uses Simplified Chinese (`zh-CN`).
- Product names, SKUs, brands, URLs, and source catalog data remain unchanged.
- Chinese text uses Geist with PingFang SC and Microsoft YaHei fallbacks.
- Avoid excessive letter spacing on Chinese labels; spacing is reserved for short brand marks.

## Visual direction: Stripe-style administrative UI

All administrative pages use the same Stripe-inspired visual language, including
operations, products, imports, categories, brands, inventory, customers,
membership, orders, homepage content, audit logs, settings, drawers and dialogs.

- Use white content surfaces, a light neutral sidebar, thin neutral borders and
  restrained shadows. Avoid decorative gradients and colored card edge strips.
- Use purple `#635bff` for primary actions, selected navigation and links.
  Semantic colors remain distinct: green for success, amber for attention,
  red for failures, destructive actions and pending-order navigation counts.
- Panels use an 8px radius; controls use 6px. Use 20–24px panel padding and
  12–16px gaps. Avoid oversized empty toolbars.
- Page titles use 28px/600 on desktop and 24px on mobile. Section titles use
  18px/600. Body and primary table data use 14px; metadata uses 12px. Use
  restrained 400–600 weights and tabular numerals for amounts and counts.
- Use Geist where provided, then system sans-serif with PingFang SC and
  Microsoft YaHei fallbacks. Preserve readable line heights and native zoom.
- Use Phosphor icons with consistent sizing; icons inherit semantic text colors.
  Do not use text symbols in place of action icons.
- Filters sit above data in a compact wrapping toolbar. Pagination sits below
  the table, with the count on the left and navigation on the right.
- Table headers use a subtle neutral background, sentence-style labels and
  light separators. Primary data and secondary metadata occupy separate lines.
  Monetary columns align right and show currency consistently.
- Render payment states as compact semantic badges. Fulfillment controls and
  filters show Chinese labels while preserving the API's underlying values.
- Forms and dialogs share the same borders, focus ring, type scale and button
  hierarchy. Keep destructive confirmations explicit. Never change payment or
  inventory behavior as part of visual cleanup.
- Show useful loading, empty and error states. Retain keyboard focus indicators,
  dialog focus management, horizontal table scrolling and mobile form wrapping.
- Pending-order counts use a red/white rounded badge, hide at zero and cap the
  displayed label at `99+`; the accessible label retains the exact count.
