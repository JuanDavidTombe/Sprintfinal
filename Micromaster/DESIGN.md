# MicroMaster — Design System & Craft Guidelines (DESIGN.md)

> **Mode:** `Operate` (B2B Industrial Food Manufacturing & Cold-Chain Logistics ERP)  
> **Philosophy:** Industrial High-Density Craft · Zero Visual Slop · Physics-based Micro-interactions.  
> **Guiding Rule:** Tools must feel instant, tactile, and precise. Every gram, peso ($ COP), and batch date matters.

---

## 1. Visual Hierarchy & Mode Philosophy

MicroMaster is a mission-critical tool used in **industrial plants, cold-storage warehouses, and delivery trucks**.
* **Mode:** `Operate` — Scanability, density, high contrast, and tactile feedback outrank marketing flair.
* **Anti-Pattern Bans:**
  - ❌ No generic AI purple/cyan glowing gradients.
  - ❌ No floating, oversized, low-density cards that force endless scrolling.
  - ❌ No free-text inputs for operational relational data (providers, ASN items, customer routes).
  - ❌ No unformatted raw numbers: currency is strictly Colombian Pesos (`formatCOP`), weights always include units (`kg`, `L`), and batch codes are in uppercase mono font.

---

## 2. Color Tokens & Semantic Meaning

| Token | Hex / Class | Semantic Usage |
| :--- | :--- | :--- |
| **Deep Industrial Navy** | `#0F2133` (`bg-slate-900`) | Navigation, primary headers, high-contrast action bars. |
| **Industrial Slate** | `#1A2D44` (`bg-slate-800`) | Secondary surfaces, modals, table headers. |
| **Cream Canvas** | `#F5F4EE` (`bg-cream`) | Main app background, subtle card containers. |
| **Pure Surface** | `#FFFFFF` | Primary data cards, form fields, active modal bodies. |
| **Electric Lime** | `#CCFF00` / `#C1EF28` | Primary CTA, verified states, valid FEFO batches, active route progress. |
| **Terracotta Alert** | `#F09163` / `#E07A45` | Warnings, batches expiring within 7 days, moderate deviations. |
| **Critical Rose** | `#E11D48` (`rose-600`) | Expired FEFO batches, temperature > 4°C deviations, loss mermas. |
| **Forest Emerald** | `#10B981` (`emerald-600`) | 100% ASN conformity, settled bank reconciliations. |

---

## 3. Typography & Numerical Rules

1. **Brand & UI Font:** `Plus Jakarta Sans`, `Inter`, `sans-serif`.
   - Weights: `400` (Regular body), `600` (Semi-bold labels), `700`-`800` (Headers & CTAs).
2. **Data & Telemetry Font:** `font-mono` (Consolas / Menlo / Monospace).
   - **Must be used for:**
     - Batch codes (`LOT-OC2026001-1-20261105`)
     - Physical weighings (`150.25 kg`, Gross: `152.75 kg`, Tare: `2.50 kg`)
     - Temperatures (`3.2 °C`)
     - Financial COP amounts (`$ 1.250.000 COP`)

---

## 4. Micro-interactions & Motion Layer (Emil Kowalski Principles)

1. **Button Presses:**
   - Active state must compress: `active:scale-[0.98] transition-transform duration-100 ease-out`.
   - Never use sluggish `transition: all 500ms`. Specify exact properties: `transition: transform 150ms ease-out, background-color 150ms ease-out`.
2. **Accordion / Master-Detail Expansions:**
   - Instant response with clean chevron rotation: `transition-transform duration-200 ease-out`.
   - Detail rows must have a subtle contrast background (`bg-slate-50/80`) to anchor child elements.
3. **Modals & Overlays:**
   - Enter animation: from `scale(0.98)` + `opacity-0` to `scale(1)` + `opacity-100` in `150ms ease-out`.
   - Backdrop: `bg-slate-900/60 backdrop-blur-xs`.
4. **Interactive Cards:**
   - Hover state: `hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 ease-out`.

---

## 5. Component Patterns for Logistics & Kitchen

* **Bandeja de Consolidación (Orders):** Master selection checkbox, bulk actions float on selection, immediate dispatch to picking.
* **Recepción por Excepción (Muelle ASN):** Always shows expected vs received, auto-calculates difference, variable weight automatically subtracts tare.
* **Control Crítico Sanitario:** Temperature displays visual alert when $> 4^\circ\text{C}$ on cold items, enforces technical justification note.
* **FEFO Accordions:** Problematic / expiring batches always bubble to the top of the detail table.
