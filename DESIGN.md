# HEIRLOCK Design System

> Dark luxury Family Office OS. Inspired by Stripe's financial clarity and editorial restraint,
> adapted for HEIRLOCK's ink canvas and antique-gold accent (continuity / heirloom).

## Brand Identity
- **Personality**: Precise, hereditary, on-chain, quiet power
- **Voice**: Technical but human. Direct. No fluff. No vendor name-dropping.
- **Primary mark**: Heraldic lock (keyhole) in antique gold on near-black
- **Wordmark**: HEIRLOCK in display tracking `0.14em`

## Color System
- **Background**: `#0B0A08` / oklch(0.145 0.012 260)
- **Surface 0/1/2**: stepped ink neutrals
- **Accent 1 (gold)**: oklch(0.78 0.14 82) ≈ `#C9A46A`
- **Accent 2 (ember)**: oklch(0.68 0.16 40)
- **Text**: near-white ivory
- **Muted**: cool ink mute
- **Border**: white @ 8%
- **Success**: soft emerald
- One accent family only. No purple. No NVIDIA/vendor colors.

## Typography
- **Display**: Cormorant Garamond (heritage Family Office justification)
- **Body**: Inter Tight
- **Mono**: JetBrains Mono (addresses, status, chain IDs)
- Hero headline: max 2 lines, tracking tight, weight 600
- Subtext: ≤ 20 words in hero

## Layout
- Landing: asymmetric split (copy left, atmospheric visual right)
- Dashboard: 240px sidebar, sticky topbar, max-w-6xl content
- Cards only for interactive containers; prefer hairlines + surface steps
- Radius scale: 8px base (buttons/inputs), 12px panels
- Eyebrows: max 1 per 3 sections

## AI Surface Rules
- Public model label: **Sonnet 5** (hardcoded in UI)
- Never show NVIDIA, provider cascade, or vendor marketing copy
- Status line may show circuit health only

## Motion
- Ease: cubic-bezier(0.22, 1, 0.36, 1)
- Hero image fade-in only; no scroll cues; respect prefers-reduced-motion

## Do
- Blend hero imagery into black with masks
- Tabular nums for balances
- Real ecosystem names (SoSoValue, SSI, SoDEX, ValueChain)

## Don't
- Em-dashes in visible copy
- Vendor AI branding
- Equal 3-card feature grids as default
- Purple/AI-glow aesthetics
- Fake screenshots built from divs
