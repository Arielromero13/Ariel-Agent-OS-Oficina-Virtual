---
name: Atelier Engineering Studio
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6c7a77'
  outline-variant: '#bbcac6'
  surface-tint: '#006b5f'
  primary: '#006b5f'
  on-primary: '#ffffff'
  primary-container: '#14b8a6'
  on-primary-container: '#00423b'
  inverse-primary: '#4fdbc8'
  secondary: '#665d4b'
  on-secondary: '#ffffff'
  secondary-container: '#eee1c9'
  on-secondary-container: '#6c6351'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#16bb83'
  on-tertiary-container: '#00442c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#71f8e4'
  primary-fixed-dim: '#4fdbc8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005048'
  secondary-fixed: '#eee1c9'
  secondary-fixed-dim: '#d1c5ae'
  on-secondary-fixed: '#211b0c'
  on-secondary-fixed-variant: '#4e4635'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Manrope
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-xs:
    fontFamily: Manrope
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system models an architectural and engineering studio management interface through the lens of a luminous, daytime isometric sim. The atmosphere is warm, serene, and grounded—channeling sunlit floorboards, indoor ficus plants, draughtsman tables, and coastal daylight rather than sterile developer consoles or cybernetic dashboards.

### Design Principles
- **Daylight Clarity**: Interfaces prioritize high-key daylight luminance. Dark modes, pitch-black canvases, and terminal green-on-black metaphors are strictly forbidden.
- **Architectural Tactility**: Surfaces emulate matte draft paper, sun-bleached birch, and frosted architectural tracing vellum.
- **Human Warmth**: Engineering workflows (sprints, calculations, approvals) are framed as deliberate, collaborative studio craft rather than robotic ticket queues.
- **Cozy Sim Aesthetics**: Information is dense yet airy, inviting patient oversight, tactile interaction, and spatial serenity.

## Colors

The palette balances clinical engineering precision with natural timber tones, coastal water accents, and tropical studio foliage.

### Color Tokens & Roles
- **Primary (`#14B8A6`)**: Coastal turquoise. Applied to primary active states, selected isometric tools, confirmed plan checkpoints, and focal action triggers.
- **Secondary (`#D8CCB5`)**: Sunlit Scandinavian birch/timber. Used for workbench cards, tactile structural dividers, floor-zone backdrops, and secondary badge containers.
- **Tertiary (`#10B981`)**: Studio botanical green. Identifies healthy calculations, active team members present on the floor, and successful load tests.
- **Surface Canvas (`#F8FAFC`)**: Luminous warm off-white, evocative of direct morning sunlight on plastered studio masonry.
- **Surface Container (`#F1F5F9` / `#FFFFFF`)**: Translucent paper whites layered with subtle diffuse warm gray.
- **Review Alert (`#F59E0B`)**: Warm director amber. Signifies blueprint revisions awaiting principal sign-off or structural consultations.
- **Impediment Alert (`#EF4444`)**: Terracotta coral. Denotes critical site blocks, load failures, or material shortages without jarring neon sirens.
- **Neutral Foreground (`#1E293B`, `#475569`, `#64748B`)**: Warm slate values providing accessible contrast without cold, artificial pure black.

## Typography

Typography relies entirely on the geometric balance and humanist clarity of Manrope.

### Typographic Rhythm
- Headlines feature tight tracking and weighted geometry, reflecting technical blueprint legends and clean signage.
- Body sizes retain generous line heights (1.5x to 1.6x) to ensure smooth reading during prolonged architectural project reviews.
- Monospaced fonts, pseudo-code brackets, and cybernetic jargon are completely excluded. Numbers and engineering specs use tabular lining figures native to Manrope.
- Micro-labels (`label-xs`, `label-md`) use uppercase tracking for department tags, room demarcations, and drafting stamps.

## Layout & Spacing

Layouts follow an open studio desk arrangement: central isometric viewports surrounded by floating, docked inspect-panels that behave like physical tracing papers.

### Studio Grid
- **Desktop (12 Columns)**: 12-column layout with 20px (`1.25rem`) gutters and 32px (`2rem`) outer boundaries. Studio viewports occupy flexible central spans (8–9 cols), while management consoles occupy fixed dock regions (3–4 cols).
- **Tablet (8 Columns)**: Fluid 8-column grid with 16px (`1rem`) gutters. Side consoles convert to slide-over sliding drawing boards.
- **Mobile (4 Columns)**: 4-column layout with 12px (`0.75rem`) gutters and 16px (`1rem`) edge margins. Inspection sheets snap to bottom sheets.

### Spacing Principles
- Spacing tokens strictly organize internal component breathing room.
- Avoid cluttered micro-gaps. Card padding standardizes on `space-lg` (24px) for desktop workstations and `space-md` (16px) for compact inspection trays.

## Elevation & Depth

Depth is established through translucent vellum layering and warm, sunlit ambient shadowing rather than opaque dark drop shadows.

### Atmospheric Levels
- **Floor Level (Canvas 0)**: Warm base tint (`#F8FAFC` to `#F1F5F9`) with textured timber zones (`#E2D9C8`). Zero elevation.
- **Drafting Level 1 (Resting Cards & Desks)**: Background `rgba(255, 255, 255, 0.90)` backed by `backdrop-filter: blur(12px)`. Outlined by a crisp perimeter border `rgba(226, 232, 240, 0.85)`. Shadow: `0 4px 16px -2px rgba(100, 116, 139, 0.06), 0 2px 6px -1px rgba(100, 116, 139, 0.04)`.
- **Workbench Level 2 (Floating Inspect Trays & Dropdowns)**: Background `rgba(255, 255, 255, 0.96)`. Border `rgba(203, 184, 157, 0.45)`. Shadow: `0 12px 28px -4px rgba(100, 116, 139, 0.08), 0 4px 10px -2px rgba(100, 116, 139, 0.05)`.
- **Director Focus Level 3 (Modals, Overlays & Approvals)**: Background `#FFFFFF`. Border `rgba(20, 184, 166, 0.25)`. Tinted shadow: `0 20px 40px -8px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(20, 184, 166, 0.08)`.

## Shapes

With a roundedness factor of `2`, the system reinforces an organic, hand-crafted studio feel without appearing like inflated plastic toys.

### Curvature Rules
- Base structural elements (standard buttons, text inputs, status chips, table rows) carry an 8px (`0.5rem`) corner radius.
- Standard project cards, drafting sheets, and studio panels use `rounded-lg` (16px / `1rem`).
- Modals, large room overlays, and master floorplan frames use `rounded-xl` (24px / `1.5rem`).
- Avatars, plant status dots, and round tool selectors use full circles (`rounded-full`).

## Components

### Buttons
- **Primary**: Solid turquoise (`#14B8A6`) fill with `#FFFFFF` text. Micro-transition on hover to `#0D9488` with a soft teal glow `box-shadow: 0 4px 12px rgba(20, 184, 166, 0.28)`.
- **Secondary (Timber Craft)**: Background `#E2D9C8` at 60% opacity with `#475569` text and a subtle warm border (`#D8CCB5`).
- **Tertiary / Ghost**: Transparent fill, hover turns `rgba(241, 245, 249, 0.8)`.

### Cards & Panels
- Constructed using `rgba(255, 255, 255, 0.90)` fill with `backdrop-filter: blur(10px)`.
- 1px border using `rgba(226, 232, 240, 0.80)`.
- Internal sections are separated by light warm timber hairline dividers (`rgba(203, 184, 157, 0.25)`).

### Status Badges & Chips
- **Director Review**: Pill shape with `#FEF3C7` background, `#D97706` text, and a `#F59E0B` micro indicator dot.
- **Site Impediment**: Light coral wash `#FEE2E2` with `#DC2626` text.
- **Operational / Normal**: Soft mint wash `#D1FAE5` with `#059669` text.

### Form Inputs
- Matte white background (`#FFFFFF`) with 1.5px border `rgba(203, 213, 225, 0.8)`.
- Focused state transitions border to `#14B8A6` with an outer ring `0 0 0 3px rgba(20, 184, 166, 0.15)`.

### Checkboxes & Radios
- Rounded squircle check boxes (6px radius) and circular radios.
- Unchecked: White surface with `#CBD5E1` border.
- Checked: `#14B8A6` fill with crisp white geometric check mark/pip.

### Lists & Floor Queues
- Row items use alternating breathable padding (`12px 16px`) with soft hover states (`rgba(241, 245, 249, 0.6)`).
- Separators use hairline wood grain tints rather than stark monochrome lines.

### Specialized Studio Components
- **Architectural Room Pill**: Displays workstation density, plant health score, and ambient noise rating.
- **Milestone Stamp**: Circular emblem with amber or turquoise outline, indicating signed off blueprints.