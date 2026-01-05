export type StepMeta = { label: string; value: string }
export type StepPreview = { title?: string; content?: string; source?: string }

export type ProcessStep = {
  key: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'error'
  meta?: StepMeta[]
  list?: StepMeta[]
  preview?: StepPreview[]
  note?: string
}

export type ProcessSection = {
  sectionIndex: number
  title: string
  status: 'pending' | 'running' | 'completed' | 'error'
  steps: ProcessStep[]
}

