import type { WorkflowStage } from '../types'

// Pipeline v2: Strategy is folded into Ideation; Editing is shelved
// until the automated-edit milestone. The DB still accepts the old
// stage names on historical rows — this list is what the product shows.
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
]
