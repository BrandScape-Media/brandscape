import type { WorkflowStage } from '../types'

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
    description: 'Upload client info, brand guidelines, and project requirements.',
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
    description: 'AI generates concepts, storylines, and A/B testing angles.',
  },
  {
    stage: 'strategy',
    label: 'Strategy',
    icon: 'strategy',
    description: 'Brand-aligned creative brief with KPIs and conversion mapping.',
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
    description: 'Scene-by-scene breakdown with A-roll and B-roll prompts.',
  },
  {
    stage: 'shooting',
    label: 'Shooting',
    icon: 'shooting',
    description: 'AI generates images and video clips via ComfyUI on GPU.',
  },
  {
    stage: 'editing',
    label: 'Editing',
    icon: 'editing',
    description: 'Automated assembly with music, voiceover, and effects.',
  },
]
