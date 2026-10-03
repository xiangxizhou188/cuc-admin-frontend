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
