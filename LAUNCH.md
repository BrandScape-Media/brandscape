# LAUNCH.md — taking Brandscape public

Written 2026-07-26. Everything with a number in it was checked against a live
source on that date; where a number is an estimate it says so.

---

## 1. What we are actually selling

Not another AI video generator. That market is crowded, cheap, and it is not
the one we can win.

| Product | Entry | Top public tier | What it does |
|---|---|---|---|
| Pencil | $14/mo | $55/mo | scores ad creative before launch |
| Creatify | $19–39/mo | $597/mo (agency) | script → UGC-style video |
| HeyGen | ~$29/mo | ~$220/mo | avatars and lipsync |
| AdCreative | $39/mo | $249/mo | banner/UGC generation |
| Arcads | $110/mo (10 videos) | $410/mo | actor-style UGC ads |
| **Brandscape** | **$99/mo** | **$1,999/mo** | **the seven stages around the render** |

Every one of those is a **point tool**: you bring a script, it returns a clip.
Brandscape runs Discovery → Research → Ideation → Scripts → Shoot Plan → Raws →
Deliverables. The render is the last mile, not the product.

**This is the whole positioning, and it has to be in every sentence we write.**
The moment we describe ourselves as "AI video for agencies" we are a $299
product in a $19 category and we lose. When we describe ourselves as "the
part of the job that happens before anyone opens a video tool", the comparison
isn't Creatify, it's a junior strategist's salary.

**One-liner:** *Brandscape runs your agency's content pipeline end to end —
research, concepts, scripts, shoot plans and finished creatives. You supervise;
the AI produces.*

**The proof line:** a full six-script campaign — 16 images, 12 voiceovers, 13
clips — goes from brand brief to client-ready library in one pass.

### What we must not claim

- Never mention ComfyUI or Runpod. It is "our own generation pipeline" and
  "dedicated GPU infrastructure".
- Do not promise a trial on anything but Starter. Solo, Professional and
  Enterprise bill on day one and the site says so — keep it that way.
- Do not imply unlimited anything. Every tier is metered and the meters are
  visible in-product.

---

## 2. Who we are selling to

**ICP:** independent and small-to-mid agencies running **3–15 client campaigns
a month**, 2–20 people, who already sell content retainers and are bottlenecked
on the *thinking* — research, angles, scripts — not on rendering.

Why that band: below 3 campaigns the $99 tier is the ceiling and the pipeline
is overkill. Above ~15 the agency has in-house strategists and buys point tools
instead.

**Buying trigger:** they have just taken on a client they don't have the
capacity to service, and the alternative to Brandscape is hiring.

**Who is not the ICP:** solo content creators (they want Creatify at $19),
brands doing their own marketing (they want an agency, not agency software),
and enterprises with procurement (long cycle, we have no compliance story).

---

## 3. What to expect — real numbers

Sourced from launch benchmark data, 2026. **A solo founder with no existing
audience should expect single digits of paying customers in month one.**

| Scenario | Launch-day visitors | Signups | Paying, month 1 |
|---|---|---|---|
| Product Hunt, outside top 10 | <500 | <20 | 0–2 |
| Product Hunt, top 10 | 1,000–3,000 | 30–100 | 2–6 |
| Product Hunt, top 3 | 5,000–15,000 | 100–400 | 5–15 |
| Direct outreach only, no launch event | ~0 | 10–30 | 2–5 |

The dominant variable across comparable launches was **the audience the
founder already had**, not the platform or the rank. Seven-day signup counts
spread 6.3× between founders launching similar products.

**Target for month one: 5 paying customers.** At a blended ~$400 that is
~$2,000 MRR, which covers the GPU and the tooling with room over. Treat 2 as
survivable and 10 as a strong result. Do not read a slow first week as failure;
read a week with zero *conversations* as failure.

**Instrumentation is already in place.** PostHog fires `agency_created` and
`checkout_started`; pageviews are tracked per route. Set `VITE_POSTHOG_KEY` in
the GitHub Actions secrets or none of this records anything.

---

## 4. Channels, in the order they will actually work

Ranked for a cold start. This ordering is deliberate and inverts what most
launch advice says.

### 4.1 Direct outreach — start here, start before launch day

Highest conversion, lowest volume, and the only channel that works with zero
audience. Fifty well-chosen agencies beats five thousand strangers.

**Build the list** from agencies already publishing UGC-style work: Instagram
and TikTok creative credits, Clutch/Sortlist listings, agencies whose clients
run paid social. Aim for 100 names with a real human's name attached.

**The message is short and specific to them.** No feature list.

> Subject: the research half of your content work
>
> Hi {name} — saw {specific piece of their work, named}. Nice hook on that one.
>
> I've built something for agencies at your size: it runs the pipeline *before*
> the render — brand discovery, live market research, concepts, scripts, shoot
> plans — and then generates the creatives from the shoot plan it wrote. The
> point is the seven stages, not the video model.
>
> Would a 15-minute look be useful? I'll run one of your live clients through
> it first so you're looking at your own brand, not a demo.
>
> — Raul

**The offer that converts: run their brand through it before the call.** It
costs ~150 credits (~$6 of compute) and it turns a pitch into a review of their
own work. Nothing else in this document has that conversion rate.

### 4.2 Communities where agency owners actually are

Contribute for two weeks before mentioning the product. Ranked by density of
ICP: r/agency, r/marketing, r/PPC, Indie Hackers, agency-owner Slack and
Discord groups, LinkedIn (the single best organic channel for this ICP).

The post that works is not "I built a thing". It is **the teardown**: take a
real campaign, show the seven stages of output, and be specific about what the
AI got wrong and where a human had to intervene. Credibility comes from naming
the failure modes.

### 4.3 Build-in-public thread

LinkedIn and X, 2–3 posts a week, started **now** and running through launch.
This is the only thing on the list that fixes the "no audience" problem, and it
is slow — which is exactly why it has to start before it is needed. Content:
the pricing decisions in `PRICING.md`, the Stripe webhook trap, the credit
economics. Real engineering detail, not milestones.

### 4.4 Product Hunt — last, not first

Launch it when there is an audience to launch *to*. The data is unambiguous
that rank follows audience rather than producing it. A PH launch with 200
engaged followers behind it outperforms a cold one by an order of magnitude.

**Prerequisites before booking a date:** 5+ paying customers who will comment,
a 60-second demo video, the OG card verified in a real unfurl, and analytics
recording. Aim for ~8 weeks after the first paying customer.

### 4.5 SEO — real, but not for this quarter

**Structural blocker:** the site is a client-rendered SPA on GitHub Pages.
Every route except `/` returns HTTP 404 (verified: `/pricing` → 404) before the
`404.html` redirect runs, so `/pricing` cannot be indexed and is deliberately
absent from `sitemap.xml`. Link unfurlers don't run JavaScript either, so every
shared URL previews as the homepage card.

Fixing it means prerendering at build time, or moving to a host that serves the
SPA fallback with a 200 (Cloudflare Pages, Netlify). Worth doing before
investing in content, pointless to write blog posts before it.

---

## 5. The six weeks

| Week | Do | Done when |
|---|---|---|
| **−2** | Build the 100-agency list. Start the build-in-public thread. Record the 60-second demo. | List exists with named humans; 4 posts published |
| **−1** | Go live on Stripe (§6). Runpod pod up, one real render timed. Password reset tested on a real inbox. | `/health` shows `stripe_live_mode: true`; a real card has been charged and refunded |
| **1** | Outreach batch 1 (25 agencies), each with their brand pre-run. Two community teardowns. | 25 sent, ≥5 replies |
| **2** | Batch 2 (25). First demo calls. Fix whatever the calls surface — they will surface something. | ≥3 calls held |
| **3** | Batch 3 (50). First paying customers. Ask every one of them the same question: what nearly stopped you? | ≥2 paying |
| **4–6** | Compound what worked. Only now consider Product Hunt. | 5 paying; PH prerequisites met |

---

## 6. Launch-day checklist

Nothing here is optional, and most of it is not code.

**Payments**
- [ ] `STRIPE_SECRET_KEY` swapped to `sk_live_…` in Railway
- [ ] Mission Control → **Provision in Stripe** re-run (the live catalogue is
      separate; rows are scoped by `livemode`) — creates 8 subscription prices
      and 3 packs
- [ ] Live webhook endpoint added, subscribed to `checkout.session.completed`,
      `customer.subscription.created/updated/deleted`, **`invoice.payment_failed`**
      and **`invoice.paid`**
- [ ] That endpoint's own `whsec_` pasted into Railway. Live and test secrets
      are both 38 chars and look identical — see the runbook in `PRICING.md`
- [ ] `/health` shows `stripe_live_mode: true` AND `stripe_webhook_configured: true`
- [ ] Stripe Dashboard → Billing → retries set to **cancel** or **mark unpaid**
      at the end of dunning, never "leave past_due"
- [ ] One real card purchase of the smallest pack, confirmed granted, then refunded

**Auth**
- [ ] Resend wired as Supabase custom SMTP, domain verified (SPF + DKIM)
- [ ] `https://brandscape.media/auth/reset` added to the Supabase Auth redirect allowlist
- [ ] Password reset completed end to end on a real address, spam folder checked
- [ ] Leaked-password protection enabled (Supabase Auth → Passwords) — currently
      off, and it is one toggle

**Infrastructure**
- [ ] Runpod network volume `brandscape-models` (150 GB, EU-RO-1)
- [ ] ComfyUI pod on an A40, `COMFY_URL` pointed at it, `/health` still true
- [ ] One real render end to end, **timed**, so the $0.04/credit calibration can
      be checked against a real GPU bill
- [ ] Decide the idle-cost posture: an always-on A40 is ~$321/mo secure /
      ~$255/mo community, and **one Starter customer at $299 does not cover it**

**Launch surface**
- [ ] `VITE_POSTHOG_KEY` set in GitHub Actions secrets
- [ ] OG card verified in a real unfurl (post the URL into Slack and LinkedIn)
- [ ] `robots.txt` and `sitemap.xml` live; sitemap submitted to Google Search Console
- [ ] Footer social links point somewhere real, or are removed — they are
      currently `href="#"` in `HomePage.tsx`
- [ ] A support address that a human reads, on the site

---

## 7. Pricing levers, in the order to pull them

Do not discount Starter. Discounting the anchor teaches the market the price
isn't real, and the margin is not the problem — reach is.

1. **Annual.** Already built, 19% off, permanent. Push it in every demo call —
   it is the single biggest cash-flow lever available and costs nothing.
2. **Solo at $99.** The new entry rung. Watch whether it cannibalises Starter
   or grows the top of the funnel. If Solo → Starter upgrades are healthy it is
   working; if everyone parks on Solo forever, tighten its project limit before
   touching its price.
3. **Founding-customer offer.** Use the `promotions` table with a real Stripe
   coupon: 30% off for 12 months for the first 10 agencies, expiring. Stripe
   owns the maths, `promotions` owns the copy — see `PRICING.md`.
4. **Last resort:** a cheaper rung below Solo. Only if trial starts are strong
   and conversion is weak, which would mean the price is the objection.

If trial starts are weak, the problem is reach or positioning, not price, and
none of these levers help.

---

## 8. What will go wrong

- **A render fails while a prospect is watching.** Have a finished example
  library ready to fall back to, and never demo a live render on the first call.
- **Someone signs up on a Sunday and the GPU is down.** Decide now whether the
  pod is always-on. It is the difference between a refund and a customer.
- **The first invoice fails silently.** It no longer does — the webhook records
  it and both the billing page and top bar show it — but check the first few by
  hand anyway.
- **Somebody asks for SOC 2 or a DPA.** Say no honestly and move on; they are
  not the ICP yet.
- **The trial gets farmed.** One trial per agency is enforced by
  `agencies.has_trialed`, on the entry tier only. A 7-day trial straddling the
  1st of a month hands over two monthly allowances instead of one — known,
  measured at roughly $5.50 expected cost per trial, deliberately not fixed.
