/**
 * 🔄 Flow Types
 * Tipos para manejo de flujos de conversación
 */

export interface FlowResult {
  response: string
  nextFlow?: string
  nextStep?: string
  completed?: boolean
  shouldSave?: boolean
  data?: any
}

export interface ValidationResult {
  isValid: boolean
  message?: string
  sanitizedValue?: any
}

export interface MessageContext {
  userId: string
  message: string
  currentFlow: string | null
  currentStep: string | null
  userState: any
}

export interface FlowHandler {
  canHandle(flow: string): boolean
  process(context: MessageContext): Promise<FlowResult>
}

export interface CaptureStep {
  name: string
  field: string
  validator?: (value: any) => ValidationResult
  nextStep?: string
  message: string
}
