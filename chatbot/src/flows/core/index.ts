/**
 * 🎯 Flow Core - Exportaciones Centralizadas
 * 
 * Centraliza todas las exportaciones del sistema de FlowContext
 * para facilitar imports en otros módulos.
 * 
 * @author UNIACC ChatBot Team
 * @version 2.0 - Repository Enhanced
 */

// 🎯 Interfaces y Types Principales
export {
  FlowContext,
  CapturedProspectData,
  UserPreferences,
  SessionMetadata,
  TimeoutConfig,
  ValidationError,
  FlowMetrics,
  FlowType,
  ProspectCaptureStep,
  StepResult,
  FlowResult,
  FlowContextConfig,
  FlowContextSnapshot,
  ContactPreferenceType
} from './FlowContext'

// 🏭 Builder Pattern
export { FlowContextBuilder } from './FlowContextBuilder'

// 📊 Context Manager
export { FlowContextManager } from './FlowContextManager'

// 🎯 Re-export default FlowContext para compatibilidad
export { default as FlowContextDefault } from './FlowContext'

// 🎯 Constantes Útiles
export const FLOW_CONSTANTS = {
  // ⏱️ Timeouts por defecto
  DEFAULT_WARNING_TIMEOUT: 10000,
  DEFAULT_SESSION_TIMEOUT: 20000,
  DEFAULT_EXTENDED_TIMEOUT: 30000,
  
  // 📊 Límites
  MAX_ATTEMPTS_PER_STEP: 3,
  MAX_VALIDATION_ERRORS: 10,
  MAX_SESSION_DURATION: 3600000, // 1 hora
  
  // 💾 Caché
  CONTEXT_CACHE_TTL: 1800, // 30 minutos
  CONTEXT_CLEANUP_INTERVAL: 300000, // 5 minutos
  
  // 📱 Fuentes soportadas
  SUPPORTED_SOURCES: ['whatsapp', 'chat-demo', 'web', 'api'],
  SUPPORTED_PLATFORMS: ['mobile', 'desktop', 'tablet']
}