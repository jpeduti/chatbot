/**
 * 🎯 FlowContext - Estado Unificado para Flujos Conversacionales
 * 
 * Este es el "estado compartido" que pasa entre todos los pasos de un flujo.
 * Contiene TODA la información necesaria para el ProspectCapture.
 * 
 * @author UNIACC ChatBot Team
 * @version 2.0 - Repository Enhanced
 */

// 📊 Datos del Prospecto (Progressive Capture)
export interface CapturedProspectData {
  // 👤 Información Personal
  nombre?: string                 // "Juan Pablo Silva"
  email?: string                  // "jp@gmail.com"
  telefono?: string               // "56999888777"
  telefono_detectado?: string     // Auto-detectado desde WhatsApp
  telefono_confirmado?: boolean   // Usuario confirmó teléfono
  
  // 📍 Información Demográfica  
  edad?: number                   // 25
  region?: string                 // "Metropolitana"
  ciudad?: string                 // "Santiago"
  
  // 🎓 Información Académica
  carrera_interes?: string        // "Ingeniería Comercial"
  facultad_interes?: string       // "Facultad de Economía y Negocios"
  campus_preferido?: string       // "Sede Santiago Centro"
  nivel_interes?: string          // "alto" | "medio" | "bajo"
  
  // 📞 Preferencias de Contacto
  preferencia_contacto?: ContactPreferenceType
  medio_contacto_preferido?: 'whatsapp' | 'email' | 'telefono' | 'presencial'
  
  // 🏠 MainMenu específicos
  intereses?: any[]                   // Array de intereses capturados en menú
  menu_interactions?: number          // Número de interacciones con menú
  last_menu_option?: string           // Última opción seleccionada
}

// 🔧 Tipos de Preferencias de Contacto
export type ContactPreferenceType = 
  | 'normal'                    // Acepta todos los medios
  | 'sin_telefono_explicito'    // Rechazó dar teléfono
  | 'solo_whatsapp'             // Solo contacto por WhatsApp
  | 'solo_email'                // Solo contacto por email
  | 'horario_restringido'       // Solo en horarios específicos

// ⚙️ Preferencias del Usuario
export interface UserPreferences {
  // 📱 Contacto
  skipPhone: boolean              // Usuario rechazó teléfono
  allowMarketing: boolean         // Acepta marketing
  communicationStyle: 'formal' | 'casual' | 'professional'
  
  // 🌐 Localización
  language: 'es' | 'en'           // Idioma preferido
  timezone: string                // "America/Santiago"
  
  // 🎯 Interacción
  responseSpeed: 'fast' | 'normal' | 'slow'
  detailLevel: 'brief' | 'detailed' | 'comprehensive'
  channel: 'whatsapp' | 'chat-demo' | 'api' // Canal de comunicación
}

// 📈 Metadata de Sesión
export interface SessionMetadata {
  // ⏰ Tiempos
  startTime: Date                 // Inicio de conversación
  stepStartTime: Date             // Inicio del paso actual
  lastActivity: Date              // Última actividad
  
  // 📊 Progreso
  totalSteps: number              // Pasos completados
  expectedSteps: number           // Pasos esperados en flujo
  attemptsCurrentStep: number     // Intentos en paso actual
  maxAttemptsPerStep: number      // Máximo intentos permitidos
  
  // 🔄 Estado
  isReturningUser: boolean        // Usuario existente
  previousSessions: number        // Sesiones anteriores
  completionPercentage: number    // % completado (0-100)
  
  // 📱 Origen
  source: 'whatsapp' | 'chat-demo' | 'web' | 'api'
  platform: 'mobile' | 'desktop' | 'tablet'
  userAgent?: string              // Info del navegador/app
  intent?: string                 // Intención detectada
}

// ⏱️ Configuración de Timeouts
export interface TimeoutConfig {
  warningTime: number             // Tiempo para warning (ms)
  sessionTime: number             // Tiempo para timeout (ms)
  lastActivity: Date              // Última actividad
  warningShown: boolean           // Ya se mostró warning
  extendedTime?: number           // Tiempo extendido si usuario responde
}

// ❌ Errores de Validación
export interface ValidationError {
  field: string                   // Campo con error
  message: string                 // Mensaje descriptivo
  code: string                    // Código de error
  timestamp: Date                 // Cuándo ocurrió
  attempt: number                 // Número de intento
}

// 📊 Métricas en Tiempo Real
export interface FlowMetrics {
  messagesExchanged: number       // Mensajes intercambiados
  avgResponseTime: number         // Tiempo promedio respuesta (ms)
  errorsCount: number             // Errores de validación
  stepDurations: Record<string, number> // Duración por paso (ms)
  conversionEvents: string[]      // Eventos de conversión
  stepsCompleted: number          // Pasos completados
}

// 🎯 INTERFAZ PRINCIPAL: FlowContext
export interface FlowContext {
  // 👤 Identidad
  userId: string                  // "56999888777" 
  sessionId: string               // "session_2025_001"
  
  // 🎯 Estado del Flujo
  currentFlow: string             // "prospect-capture"
  currentStep: string             // "email-capture"
  nextStep?: string               // "age-capture"
  previousStep?: string           // "name-capture"
  
  // 📊 Datos Capturados (Progresivo)
  capturedData: CapturedProspectData
  
  // ⚙️ Preferencias
  preferences: UserPreferences
  
  // 📈 Metadata de Sesión
  sessionMetadata: SessionMetadata
  
  // ⏱️ Timeouts
  timeout: TimeoutConfig
  
  // ❌ Validación
  validationErrors: ValidationError[]
  lastMessage?: string            // Último mensaje del usuario
  
  // 📊 Métricas
  metrics: FlowMetrics
  
  // 🔄 Estado Interno
  isActive: boolean               // Contexto activo
  needsSave: boolean              // Requiere guardado
  version: string                 // Versión del contexto
  
  // 🗃️ Datos Adicionales (flexibilidad)
  metadata: Record<string, any>   // Datos extra específicos del flujo
}

// 🎪 Tipos de Flujos Soportados
export enum FlowType {
  PROSPECT_CAPTURE = 'prospect-capture',
  ADVISOR_REQUEST = 'advisor-request', 
  CAREER_INFO = 'career-info',
  CAMPUS_INFO = 'campus-info',
  ENROLLMENT_PROCESS = 'enrollment-process',
  COMPLAINT_HANDLING = 'complaint-handling',
  MAIN_MENU = 'main-menu'
}

// 📋 Tipos de Pasos en ProspectCapture
export enum ProspectCaptureStep {
  PHONE_DETECTION = 'phone-detection',
  PHONE_CONFIRMATION = 'phone-confirmation', 
  PHONE_MANUAL = 'phone-manual',
  NAME_CAPTURE = 'name-capture',
  EMAIL_CAPTURE = 'email-capture',
  AGE_CAPTURE = 'age-capture',
  REGION_CAPTURE = 'region-capture',
  CAREER_INTEREST = 'career-interest',
  COMPLETION = 'completion'
}

// 🎯 Resultado de Procesamiento de Paso
export interface StepResult {
  success: boolean
  message: string
  nextStep?: string
  completed: boolean
  data?: any
  errors?: ValidationError[]
  context?: Partial<FlowContext>
  nextFlow?: string  // Para handoffs entre flujos
}

// 🔄 Resultado de Flujo Completo
export interface FlowResult {
  success: boolean
  message: string
  completed: boolean
  context: FlowContext
  metrics: FlowMetrics
  nextFlow?: string
}

// 🏗️ Configuración para Construir FlowContext
export interface FlowContextConfig {
  userId: string
  flow: FlowType
  step?: string
  source?: SessionMetadata['source']
  existingData?: Partial<CapturedProspectData>
  preferences?: Partial<UserPreferences>
  timeoutConfig?: Partial<TimeoutConfig>
}

// 📤 Interfaz para Exportar/Importar Context
export interface FlowContextSnapshot {
  context: FlowContext
  timestamp: Date
  version: string
  checksum: string
}

export default FlowContext
