/**
 * 🏭 FlowContextBuilder - Builder Pattern para Crear FlowContext
 * 
 * Utiliza el patrón Builder para crear instancias de FlowContext de manera
 * fluida y configurable. Maneja valores por defecto y validaciones.
 * 
 * @author UNIACC ChatBot Team  
 * @version 2.0 - Repository Enhanced
 */

import { 
  FlowContext, 
  FlowContextConfig,
  FlowType,
  ProspectCaptureStep,
  CapturedProspectData,
  UserPreferences,
  SessionMetadata,
  TimeoutConfig,
  FlowMetrics,
  ValidationError
} from './FlowContext'

export class FlowContextBuilder {
  private context: Partial<FlowContext> = {}

  constructor(userId: string) {
    this.context.userId = userId
    this.context.sessionId = this.generateSessionId()
    this.context.version = '2.0'
    this.context.isActive = true
    this.context.needsSave = false
    this.context.validationErrors = []
    this.context.metadata = {}
  }

  // 🎯 Configurar Flujo
  withFlow(flow: FlowType, initialStep?: string): FlowContextBuilder {
    this.context.currentFlow = flow
    this.context.currentStep = initialStep || this.getDefaultInitialStep(flow)
    return this
  }

  // 📊 Configurar Datos Existentes
  withExistingData(data: Partial<CapturedProspectData>): FlowContextBuilder {
    this.context.capturedData = {
      ...this.getDefaultCapturedData(),
      ...data
    }
    return this
  }

  // ⚙️ Configurar Preferencias
  withPreferences(preferences: Partial<UserPreferences>): FlowContextBuilder {
    this.context.preferences = {
      ...this.getDefaultPreferences(),
      ...preferences
    }
    return this
  }

  // 📈 Configurar Metadata de Sesión
  withSessionMetadata(metadata: Partial<SessionMetadata>): FlowContextBuilder {
    this.context.sessionMetadata = {
      ...this.getDefaultSessionMetadata(),
      ...metadata
    }
    return this
  }

  // ⏱️ Configurar Timeouts
  withTimeoutConfig(timeoutConfig: Partial<TimeoutConfig>): FlowContextBuilder {
    this.context.timeout = {
      ...this.getDefaultTimeoutConfig(),
      ...timeoutConfig
    }
    return this
  }

  // 📱 Configurar Origen/Fuente
  withSource(source: SessionMetadata['source'], platform?: SessionMetadata['platform']): FlowContextBuilder {
    if (!this.context.sessionMetadata) {
      this.context.sessionMetadata = this.getDefaultSessionMetadata()
    }
    this.context.sessionMetadata.source = source
    if (platform) {
      this.context.sessionMetadata.platform = platform
    }
    return this
  }

  // 👤 Configurar como Usuario Recurrente
  asReturningUser(previousSessions: number = 1): FlowContextBuilder {
    if (!this.context.sessionMetadata) {
      this.context.sessionMetadata = this.getDefaultSessionMetadata()
    }
    this.context.sessionMetadata.isReturningUser = true
    this.context.sessionMetadata.previousSessions = previousSessions
    return this
  }

  // 📱 Auto-detectar Teléfono (para WhatsApp)
  withPhoneDetection(phoneNumber: string): FlowContextBuilder {
    if (!this.context.capturedData) {
      this.context.capturedData = this.getDefaultCapturedData()
    }
    this.context.capturedData.telefono_detectado = phoneNumber
    this.context.capturedData.telefono = phoneNumber
    return this
  }

  // 🔧 Configuración Rápida desde Config
  fromConfig(config: FlowContextConfig): FlowContextBuilder {
    return this
      .withFlow(config.flow, config.step)
      .withSource(config.source || 'chat-demo')
      .withExistingData(config.existingData || {})
      .withPreferences(config.preferences || {})
      .withTimeoutConfig(config.timeoutConfig || {})
  }

  // 🏗️ CONSTRUIR FlowContext Final
  build(): FlowContext {
    // ✅ Validar datos requeridos
    this.validateRequiredFields()
    
    // 🔧 Aplicar valores por defecto
    this.applyDefaults()
    
    // 📊 Calcular métricas iniciales
    this.initializeMetrics()
    
    // 🎯 Determinar siguiente paso
    this.determineNextStep()

    return this.context as FlowContext
  }

  // 🔍 MÉTODOS PRIVADOS - Validación
  private validateRequiredFields(): void {
    if (!this.context.userId) {
      throw new Error('❌ UserId es requerido para FlowContext')
    }
    if (!this.context.currentFlow) {
      throw new Error('❌ CurrentFlow es requerido para FlowContext')
    }
    if (!this.context.currentStep) {
      throw new Error('❌ CurrentStep es requerido para FlowContext')
    }
  }

  // 🎯 Aplicar Valores por Defecto
  private applyDefaults(): void {
    this.context.capturedData = this.context.capturedData || this.getDefaultCapturedData()
    this.context.preferences = this.context.preferences || this.getDefaultPreferences()
    this.context.sessionMetadata = this.context.sessionMetadata || this.getDefaultSessionMetadata()
    this.context.timeout = this.context.timeout || this.getDefaultTimeoutConfig()
    this.context.metrics = this.context.metrics || this.getDefaultMetrics()
    this.context.validationErrors = this.context.validationErrors || []
    this.context.metadata = this.context.metadata || {}
  }

  // 📊 Inicializar Métricas
  private initializeMetrics(): void {
    if (!this.context.metrics) {
      this.context.metrics = this.getDefaultMetrics()
    }
  }

  // 🎯 Determinar Siguiente Paso
  private determineNextStep(): void {
    if (!this.context.nextStep && this.context.currentFlow && this.context.currentStep) {
      this.context.nextStep = this.getNextStepForFlow(
        this.context.currentFlow as FlowType, 
        this.context.currentStep
      )
    }
  }

  // 🎪 MÉTODOS DE UTILIDAD - Valores por Defecto

  private getDefaultCapturedData(): CapturedProspectData {
    return {
      telefono_confirmado: false,
      preferencia_contacto: 'normal',
      medio_contacto_preferido: 'whatsapp'
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      skipPhone: false,
      allowMarketing: true,
      communicationStyle: 'casual',
      language: 'es',
      timezone: 'America/Santiago',
      responseSpeed: 'normal',
      detailLevel: 'detailed',
      channel: 'chat-demo'
    }
  }

  private getDefaultSessionMetadata(): SessionMetadata {
    const now = new Date()
    return {
      startTime: now,
      stepStartTime: now,
      lastActivity: now,
      totalSteps: 0,
      expectedSteps: this.getExpectedStepsForFlow(this.context.currentFlow as FlowType),
      attemptsCurrentStep: 0,
      maxAttemptsPerStep: 3,
      isReturningUser: false,
      previousSessions: 0,
      completionPercentage: 0,
      source: 'chat-demo',
      platform: 'desktop'
    }
  }

  private getDefaultTimeoutConfig(): TimeoutConfig {
    return {
      warningTime: parseInt(process.env.WARNING_TIMEOUT || '10000'),
      sessionTime: parseInt(process.env.SESSION_TIMEOUT || '20000'), 
      lastActivity: new Date(),
      warningShown: false
    }
  }

  private getDefaultMetrics(): FlowMetrics {
    return {
      messagesExchanged: 0,
      avgResponseTime: 0,
      errorsCount: 0,
      stepDurations: {},
      conversionEvents: [],
      stepsCompleted: 0
    }
  }

  // 🎪 Lógica de Flujos - Pasos Iniciales
  private getDefaultInitialStep(flow: FlowType): string {
    switch (flow) {
      case FlowType.PROSPECT_CAPTURE:
        return ProspectCaptureStep.PHONE_DETECTION
      case FlowType.ADVISOR_REQUEST:
        return 'advisor-validation'
      case FlowType.CAREER_INFO:
        return 'career-selection'
      default:
        return 'initial'
    }
  }

  // 📊 Pasos Esperados por Flujo
  private getExpectedStepsForFlow(flow: FlowType): number {
    switch (flow) {
      case FlowType.PROSPECT_CAPTURE:
        return 7  // phone, phone-confirm, name, email, age, region, completion
      case FlowType.ADVISOR_REQUEST:
        return 3  // validation, schedule, confirmation
      case FlowType.CAREER_INFO:
        return 5  // selection, details, requirements, comparison, decision
      default:
        return 1
    }
  }

  // 🎯 Siguiente Paso en el Flujo
  private getNextStepForFlow(flow: FlowType, currentStep: string): string | undefined {
    if (flow === FlowType.PROSPECT_CAPTURE) {
      return this.getNextProspectCaptureStep(currentStep)
    }
    return undefined
  }

  // 📱 Lógica Específica ProspectCapture
  private getNextProspectCaptureStep(currentStep: string): string | undefined {
    const stepOrder = [
      ProspectCaptureStep.PHONE_DETECTION,
      ProspectCaptureStep.PHONE_CONFIRMATION,
      ProspectCaptureStep.NAME_CAPTURE,
      ProspectCaptureStep.EMAIL_CAPTURE,
      ProspectCaptureStep.AGE_CAPTURE,
      ProspectCaptureStep.REGION_CAPTURE,
      ProspectCaptureStep.COMPLETION
    ]

    const currentIndex = stepOrder.indexOf(currentStep as ProspectCaptureStep)
    return currentIndex >= 0 && currentIndex < stepOrder.length - 1 
      ? stepOrder[currentIndex + 1] 
      : undefined
  }

  // 🆔 Generar Session ID único
  private generateSessionId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `session_${timestamp}_${random}`
  }

  // 🏭 MÉTODOS ESTÁTICOS - Builders Especializados

  /**
   * 🎯 Builder para ProspectCapture desde WhatsApp
   */
  static forWhatsAppProspectCapture(userId: string): FlowContextBuilder {
    return new FlowContextBuilder(userId)
      .withFlow(FlowType.PROSPECT_CAPTURE)
      .withSource('whatsapp', 'mobile')
      .withPhoneDetection(userId)
  }

  /**
   * 🖥️ Builder para ProspectCapture desde Chat Demo
   */
  static forChatDemoProspectCapture(userId: string): FlowContextBuilder {
    return new FlowContextBuilder(userId)
      .withFlow(FlowType.PROSPECT_CAPTURE)
      .withSource('chat-demo', 'desktop')
  }

  /**
   * 🔄 Builder para Usuario Recurrente
   */
  static forReturningUser(userId: string, flow: FlowType, existingData: Partial<CapturedProspectData>): FlowContextBuilder {
    return new FlowContextBuilder(userId)
      .withFlow(flow)
      .withExistingData(existingData)
      .asReturningUser()
  }

  /**
   * 📞 Builder para Solicitud de Asesor
   */
  static forAdvisorRequest(userId: string): FlowContextBuilder {
    return new FlowContextBuilder(userId)
      .withFlow(FlowType.ADVISOR_REQUEST)
      .withSource('whatsapp')
  }
}

export default FlowContextBuilder
