import type { CreditPack, Plan } from '../types'

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
    features: [
      { label: 'Up to 3 active projects', included: true },
      { label: '600 generation credits/month (~4 full shoots)', included: true },
      { label: 'Final deliverables for 1 project', included: true },
      { label: '50 content generations/month', included: true },
      { label: '150 media regenerations/month', included: true },
      { label: '5 revisions per asset', included: true },
      { label: 'Full workflow pipeline', included: true },
      { label: 'Research & Ideation AI', included: true },
      { label: 'Script & Shoot Planning', included: true },
      { label: 'Image & Video Generation', included: true },
      { label: 'Priority support', included: false },
      { label: 'Custom workflow design', included: false },
      { label: 'Dedicated GPU instance', included: false },
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
      { label: 'Up to 15 active projects', included: true },
      { label: '3,000 generation credits/month (~20 full shoots)', included: true },
      { label: 'Final deliverables for every project', included: true },
      { label: '250 content generations/month', included: true },
      { label: '750 media regenerations/month', included: true },
      { label: '20 revisions per asset', included: true },
      { label: 'Full workflow pipeline', included: true },
      { label: 'Research & Ideation AI', included: true },
      { label: 'Script & Shoot Planning', included: true },
      { label: 'Image & Video Generation', included: true },
      { label: 'Priority support', included: true },
      { label: 'Custom workflow design', included: false },
      { label: 'Dedicated GPU instance', included: false },
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
      { label: 'Unlimited active projects', included: true },
      { label: '12,000 generation credits/month, top up any time', included: true },
      { label: 'Final deliverables for every project', included: true },
      { label: 'Unlimited content generations', included: true },
      { label: 'Unlimited media regenerations', included: true },
      { label: 'Unlimited revisions', included: true },
      { label: 'Full workflow pipeline', included: true },
      { label: 'Research & Ideation AI', included: true },
      { label: 'Script & Shoot Planning', included: true },
      { label: 'Image & Video Generation', included: true },
      { label: 'Priority support', included: true },
      { label: 'Custom workflow design', included: true },
      { label: 'Dedicated GPU instance', included: true },
    ],
  },
]

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
