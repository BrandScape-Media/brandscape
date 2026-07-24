import type { WorkflowStage } from '../types'

// Pipeline v2: Strategy is folded into Ideation. `editing` is un-shelved as
// the final "Deliverables" stage (client-ready creatives + uploads). The DB
// still accepts the old stage names on historical rows — this list is what
// the product shows.
export const workflowStages: {
  stage: WorkflowStage
  label: string
  icon: string
  description: string
}[] = [
  {
    stage: 'discovery',
    label: 'Discovery',
    icon: 'discovery',
    description: 'Client info, brand kit, product details, and campaign brief.',
  },
  {
    stage: 'research',
    label: 'Research',
    icon: 'research',
    description: 'AI analyzes keywords, trends, competitors, and audience sentiment.',
  },
  {
    stage: 'ideation',
    label: 'Ideation',
    icon: 'ideation',
    description: 'Concepts, hooks, and storylines wrapped in a brand-aligned creative strategy.',
  },
  {
    stage: 'scripts',
    label: 'Scripts',
    icon: 'scripts',
    description: 'AI writes short-form and long-form video scripts.',
  },
  {
    stage: 'shootplan',
    label: 'Shoot Plan',
    icon: 'shootplan',
    description: 'Scene-by-scene breakdown with A-roll and B-roll planning.',
  },
  {
    stage: 'shooting',
    label: 'Raws',
    icon: 'shooting',
    description: 'AI-generated raw images and video clips, ready to download.',
  },
  {
    stage: 'editing',
    label: 'Deliverables',
    icon: 'editing',
    description: 'Final client-ready ad creatives, banners, and edited videos.',
  },
]
