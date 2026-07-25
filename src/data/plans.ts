import type { CreditPack, Plan, PlanTier } from '../types'

/**
 * No subscription — before the trial starts, and after one lapses. Read-only
 * rather than punitive: existing projects and media stay visible and
 * downloadable, only new paid work is blocked. Nothing is ever deleted.
 *
 * Deliberately NOT in `plans` below: that array is what the pricing page
 * renders, and this isn't something you can buy. Mirrors PLAN_LIMITS.free in
 * the server's plans.js.
 */
export const freePlan: Plan = {
  tier: 'free',
  name: 'No plan',
  priceMonthly: 0,
  priceYearly: 0,
  description: 'Your work is safe and readable. Subscribe to start generating again.',
  revisionsIncluded: 0,
  projectsIncluded: 1,
  generationsPerMonth: 0,
  regenerationsPerMonth: 0,
  creditsPerMonth: 0,
  deliverableProjects: 0,
  storageGb: 1,
  prioritySupport: false,
  customWorkflows: false,
  features: [
    { label: 'View and download everything you already made', included: true },
    { label: 'AI content generation', included: false },
    { label: 'Image & video generation', included: false },
    { label: 'Final deliverables', included: false },
  ],
}

export const plans: Plan[] = [
  {
    tier: 'starter',
    name: 'Starter',
    priceMonthly: 299,
    priceYearly: 2906,
    description: 'For agencies just getting started with AI-powered content.',
    revisionsIncluded: 5,
    projectsIncluded: 3,
    generationsPerMonth: 50,
    regenerationsPerMonth: 150,
    creditsPerMonth: 600,
    deliverableProjects: 1,
    storageGb: 25,
    prioritySupport: false,
    customWorkflows: false,
    // Only what DIFFERS between tiers. Everything shared (the seven-stage
    // pipeline, the cast library, the client library) is listed once on the
    // pricing page instead of repeated identically on all three cards.
    features: [
      { label: 'Final deliverables for 1 project', included: true },
      { label: '5 AI revisions per stage', included: true },
      { label: '25 GB asset storage', included: true },
      { label: 'Priority support', included: false },
      { label: 'Custom workflow design', included: false },
      { label: 'Dedicated GPU capacity', included: false },
    ],
  },
  {
    tier: 'professional',
    name: 'Professional',
    priceMonthly: 799,
    priceYearly: 7776,
    description: 'For growing agencies that need scale and flexibility.',
    revisionsIncluded: 20,
    projectsIncluded: 15,
    generationsPerMonth: 250,
    regenerationsPerMonth: 750,
    creditsPerMonth: 3000,
    deliverableProjects: 15,
    storageGb: 200,
    prioritySupport: true,
    customWorkflows: false,
    isRecommended: true,
    features: [
      { label: 'Final deliverables for every project', included: true },
      { label: '20 AI revisions per stage', included: true },
      { label: '200 GB asset storage', included: true },
      { label: 'Priority support', included: true },
      { label: 'Custom workflow design', included: false },
      { label: 'Dedicated GPU capacity', included: false },
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 1999,
    priceYearly: 19430,
    description: 'For high-volume agencies with custom requirements.',
    revisionsIncluded: 999,
    projectsIncluded: 999,
    generationsPerMonth: 999999,
    regenerationsPerMonth: 999999,
    creditsPerMonth: 12000,
    deliverableProjects: 999999,
    storageGb: 2000,
    prioritySupport: true,
    customWorkflows: true,
    features: [
      { label: 'Final deliverables for every project', included: true },
      { label: 'Unlimited AI revisions', included: true },
      { label: '2 TB asset storage', included: true },
      { label: 'Priority support', included: true },
      { label: 'Custom workflow design', included: true },
      { label: 'Dedicated GPU capacity', included: true },
    ],
  },
]

/**
 * What every plan includes. Listed once under the cards rather than repeated
 * identically on all three — this is the pipeline that justifies the price
 * against per-video tools, so it needs to be read, not skimmed past.
 */
export const sharedPipeline = [
  { stage: 'Discovery', blurb: 'Brand, product and audience captured once, reused everywhere.' },
  { stage: 'Research', blurb: 'Live web research on the market, competitors and angles.' },
  { stage: 'Ideation', blurb: 'Campaign concepts built from the research, not from a blank page.' },
  { stage: 'Scripts', blurb: 'Shot-ready scripts with hooks and voiceover lines, signed off by you.' },
  { stage: 'Shoot Plan', blurb: 'Casting, scenes and shot list assembled from the approved scripts.' },
  { stage: 'Raws', blurb: 'Images, voiceovers and video generated and regenerated per asset.' },
  { stage: 'Deliverables', blurb: 'Finished creatives in a client-ready library with comments.' },
]

/** Included on every tier — the reason the pipeline holds together. */
export const sharedFeatures = [
  'Unlimited clients and brand kits',
  'Cast library — each influencer has one locked voice',
  'Client-facing asset library with comments and share links',
  'Your product photography used in every generation',
]

/**
 * Resolve a tier to its plan. Use this instead of `plans.find(...) ?? plans[0]`
 * — that idiom silently hands a `free` agency Starter's client-side allowances,
 * which the server then refuses.
 */
export function planFor(tier: PlanTier | undefined | null): Plan {
  if (tier === 'free') return freePlan
  return plans.find((p) => p.tier === tier) ?? freePlan
}

/**
 * Top-up credit packs. Mirrors CREDIT_PACKS in the server's plans.js — the
 * live values come from /v1/usage; this copy is the demo-mode/offline
 * fallback and the pricing-page source.
 */
export const creditPacks: CreditPack[] = [
  { id: 'small', credits: 250, priceUsd: 49 },
  { id: 'medium', credits: 600, priceUsd: 99 },
  { id: 'large', credits: 1500, priceUsd: 199 },
]

/**
 * What one rendered asset costs in credits (server-side CREDIT_WEIGHTS).
 * Shown so agencies can predict spend before hitting Generate.
 */
export const creditWeights = {
  image: 1,
  voiceover: 2,
  broll: 6,
  talkinghead: 10,
} as const

/** Rough cost of taking one project through a full shoot. */
export const creditsPerProjectShoot = 150
