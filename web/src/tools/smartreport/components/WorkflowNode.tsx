export type WorkflowNodeType =
  | 'planning'
  | 'writing'
  | 'evaluating'
  | 'selecting_history'
  | 'collecting_info'
  | 'saving'

export type WorkflowNodeStatus = 'pending' | 'running' | 'completed' | 'error'

export interface WorkflowNodeData {
  id: string
  type: WorkflowNodeType
  title: string
  model?: string
  details?: Record<string, any>
  status: WorkflowNodeStatus
  timestamp?: number
  error?: string
}