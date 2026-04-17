# VPKontroll – Prosjektkontekst for Claude Code

## Hva er dette?

VPKontroll er et **field service management system** skreddersydd for **varmepumpebransjen i Norge**. Målgruppen er små selskaper med 3–5 ansatte som i dag bruker Excel, papir eller generiske systemer som er alt for tunge og dyre.

Systemet er en **multi-tenant SaaS-plattform** med følgende kjernemoduler:
- **CRM-light** – kunder, kontakter, anleggssteder, anlegg (HVAC-utstyr)
- **Salg / Deals** – salgspipeline fra lead → tilbud → vunnet
- **Serviceavtaler** – intervaller 6/12/24 mnd, automatisk generering av servicebesøk
- **Ressursplanlegger** – ukekalender, tildeling av jobber til teknikere
- **Montørvisning (mobil)** – teknikernes visning av sine oppdrag
- **Postkontoret** – Gmail/Outlook-integrasjon for innboks og saker
- **Garantisaker** – registrering og oppfølging
- **Master Admin** – plattformkontroll for alle tenants

---

## Teknisk stack

| Del | Teknologi |
|-----|-----------|
| Frontend | React 18 + TypeScript |
| Byggverktøy | Vite |
| Styling | Tailwind CSS |
| Komponenter | shadcn/ui |
| Backend/DB | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Routing | React Router v6 |
| Data fetching | TanStack Query (React Query) |
| Skjema | React Hook Form |
| Datoer | date-fns med norsk locale (nb) |
| Ikoner | lucide-react |
| Kart/adresse | Kartverket adressesøk |
| Kalender | FullCalendar |
| PDF | Egne pdf-generatorer i src/lib/ |
| Realtime | Supabase Realtime (postgres_changes) |

---

## Designsystem

### Farger (CSS-variabler i src/index.css)
- Primary: `hsl(246 65% 55%)` – lilla/indigo
- Accent: `hsl(24 95% 53%)` – oransje
- Bakgrunn: `hsl(0 0% 98%)`
- CRM-farger: `--crm-lead`, `--crm-qualified`, `--crm-quote`, `--crm-visit`, `--crm-negotiation`, `--crm-won`, `--crm-lost`

### Fonter
- Body: **Inter**
- Headings: **Lexend**

### Designprinsipper (VIKTIG)
- Systemet skal føles som et **moderne SaaS-produkt i 2026** – ikke generisk AI-generert design
- Bruk **listevisning** fremfor kortgrid for dataintensive sider
- Vis **statistikk og status inline** – brukeren skal ikke klikke seg inn for å se grunnleggende info
- **Fargekodet status** overalt – badges, prikker, bakgrunner
- **Informasjonstetthet** – mer info synlig per rad/kort enn standard shadcn-komponenter
- Unngå tomme sider – vis alltid nyttig kontekst og hurtighandlinger
- Responsivt – fungerer på mobil for montører

### Komponentmønster
```tsx
// Listevisning med border-bottom mellom rader (ikke kort-grid)
<div className="rounded-xl border border-border overflow-hidden bg-card">
  <div className="px-5 py-2.5 border-b border-border bg-muted/30">
    // Header med antall
  </div>
  {items.map(item => <Row key={item.id} ... />)}
</div>

// Status-badge med farge
<span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", typeStyle.bg, typeStyle.text)}>
  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", typeStyle.dot)} />
  {label}
</span>

// Filter-pills
<button className={cn(
  "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
  active ? "bg-primary text-primary-foreground border-primary" 
         : "bg-card text-muted-foreground border-border hover:border-primary/40"
)}>

// Stat-kort
<div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
    <Icon className="h-4 w-4 text-primary" />
  </div>
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold text-sm">{value}</p>
  </div>
</div>
```

---

## Mappestruktur

```
src/
  pages/
    tenant/          ← Alle tenant-sider (CRM, jobber, ressursplan osv.)
    admin/           ← Master Admin-sider
  components/
    ui/              ← shadcn/ui basistkomponenter
    crud/            ← Dialog/Sheet-komponenter for opprett/rediger
    crm/             ← CRM-spesifikke komponenter
    resource/        ← Ressursplanlegger-komponenter
    service/         ← Servicebesøk/rapport-komponenter
    postkontoret/    ← E-post/innboks-komponenter
    dashboard/       ← Dashboard-widgets
  hooks/             ← Custom React hooks (useCompanyDetail, useAuth osv.)
  lib/               ← Hjelpefunksjoner, labels, PDF-generering
  integrations/
    supabase/        ← Supabase client + genererte typer
```

---

## Databasetabeller (Supabase)

### CRM
- `crm_companies` – kunder (med customer_type: private/business/housing)
- `crm_contacts` – kontaktpersoner koblet til companies
- `crm_deals` – salgsmuligheter med stage-pipeline
- `customer_sites` – anleggssteder tilknyttet en company
- `hvac_assets` – varmepumper/anlegg på et site

### Operasjon
- `jobs` – jobber (installasjon, service, reparasjon osv.)
- `service_agreements` – serviceavtaler med intervall og next_visit_due
- `service_visits` – enkeltbesøk generert fra en avtale
- `warranty_cases` – garantisaker
- `documents` – opplastede dokumenter koblet til jobber

### Plattform
- `tenants` – selskaper som bruker systemet
- `tenant_modules` – hvilke moduler en tenant har aktivert
- `subscription_plans` – tilgjengelige planer
- `tenant_subscriptions` – aktive abonnementer

### Tilgangsstyring
- `tenant_roles` – roller per tenant
- `tenant_role_permissions` – tillatelser per rolle
- `tenant_user_roles` – kobling bruker ↔ rolle
- `technicians` – teknikere med user_id-kobling

---

## Viktige hooks

```typescript
useAuth()          // tenantId, user, isMasterAdmin, isTenantAdmin, signOut
useCanDo()         // canDo("companies.create") – tilgangssjekk
useTenantModules() // hasModule("crm") – modulsjekk
useCompanyDetail() // Alle data for én kunde (company, contacts, sites, assets, deals, jobs, agreements...)
usePermissions()   // hasPermission("module.crm")
```

---

## Labels og konstanter

Alle norske labels og statuskoder ligger i:
- `src/lib/domain-labels.ts` – jobber, anlegg, avtaler, sites, garantier
- `src/lib/crm-labels.ts` – deal-stages, pipeline, formatCurrency
- `src/lib/case-labels.ts` – postkontoret/saker

Eksempel:
```typescript
import { CUSTOMER_TYPE_LABELS, JOB_STATUS_COLORS, formatDate } from "@/lib/domain-labels"
import { DEAL_STAGE_LABELS, formatCurrency } from "@/lib/crm-labels"
```

---

## Tilgangsstyring

Bruk alltid `useCanDo()` for å skjule/vise knapper:
```tsx
const { canDo } = useCanDo()
{canDo("companies.create") && <Button onClick={openNew}>Ny kunde</Button>}
```

Vanlige permissions: `companies.create/edit/delete`, `deals.create`, `jobs.create`, `agreements.create`, `assets.create`, `sites.create`, `warranties.create`

---

## Nåværende status og prioriteringer

### Fungerer bra ✅
- CRM (kunder, kontakter, deals, anlegg)
- Ressursplanlegger (ukekalender, jobbkobling)
- Jobber og sjekklister
- Postkontoret (Gmail-sync)
- Tilgangsstyring (roller, moduler, RLS)
- Kartverket adressesøk
- Google Kalender-sync
- Master Admin cockpit

### Trenger forbedring / under arbeid 🔧
- **CRM UI/UX** – skal løftes til moderne 2026-standard (hovedprioritet nå)
  - Kundeliste: listevisning med inline stats (deals, jobber, avtaler per kunde)
  - Kundekort: stat-kort øverst, aktivitetslogg i sidebar, hurtighandlinger
  - Aktivitetslogg: logg samtaler, notater, møter, e-post på kundekort
- **service-generate** – auto-generering av servicebesøk fungerer ikke i praksis (0 produserte besøk)
- **Montørvisning** – 4 av 5 teknikere mangler user_id-kobling
- **Trial-expire** – cron-jobb ikke observert mot faktisk utløpt tenant ennå
- **Microsoft 365** – ikke pilotverifisert (Google er primær)

---

## Kodestil og konvensjoner

- **Norsk UI** – all tekst i grensesnittet er på norsk
- **TypeScript** – alltid typede props og state
- **Supabase-kall** direkte i komponenter eller egne hooks – ikke i separate service-filer
- **Toast-meldinger** via `sonner` (`toast.success(...)`, `toast.error(...)`)
- **Feilhåndtering** – sjekk alltid for RLS-feil: `msg.includes("row-level security")`
- **Soft delete** – bruk alltid `.is("deleted_at", null)` i queries på relevante tabeller
- **Datoformat** – bruk `formatDate()` fra domain-labels eller `format(date, "d. MMM yyyy", { locale: nb })`
- **Valuta** – bruk `formatCurrency()` fra crm-labels (norsk format, NOK)

---

## Miljøvariabler

Se `.env` i prosjektroten for Supabase URL og anon key. Disse er allerede satt opp.

---

## Når du er usikker

1. Les eksisterende lignende sider i `src/pages/tenant/` for å matche mønstre
2. Sjekk `src/lib/domain-labels.ts` for norske labels før du skriver nye
3. Bruk eksisterende shadcn/ui-komponenter fra `src/components/ui/`
4. Følg designprinsippene over – modern, informasjonstett, fargekodet
