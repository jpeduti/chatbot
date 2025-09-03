/**
 * 📦 ProspectCapture - Exportaciones Centralizadas
 * 
 * Centraliza todas las exportaciones del sistema ProspectCapture
 * para facilitar imports en otros módulos.
 * 
 * @author UNIACC ChatBot Team
 * @version 2.0 - FlowContext Enhanced
 */

// 🎪 Flow Principal
export { ProspectCaptureFlow } from './ProspectCaptureFlow'

// 📱 Steps individuales
export { PhoneDetectionStep } from './PhoneDetectionStep'

// 🎯 Re-exports from core para facilidad
export {
  FlowContext,
  FlowContextBuilder,
  FlowContextManager,
  ProspectCaptureStep,
  StepResult,
  FlowResult
} from '../core'
