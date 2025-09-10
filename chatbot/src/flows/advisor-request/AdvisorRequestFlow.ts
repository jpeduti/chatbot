/**
 * 🎓 AdvisorRequestFlow - Flujo de Solicitud de Asesor
 * 
 * Flujo optimizado para conversiones rápidas cuando el usuario
 * solicita hablar con un asesor académico.
 * 
 * Características:
 * - Captura mínima: teléfono + nombre + carrera opcional
 * - Alta prioridad: tipo_consulta = "solicitud_asesor"
 * - Handoff inmediato a ejecutivos
 * 
 * @author UNIACC ChatBot Team
 * @version 2.0 - FlowContext Enhanced
 */

import { 
  FlowContext, 
  FlowResult, 
  StepResult, 
  FlowType
} from '../core/FlowContext'
import { FlowContextManager } from '../core/FlowContextManager'
import { ValidationService } from '../../services/validation-service'
import { MessageFormatterService } from '../../services/message-formatter'
import { ProspectServiceV2 } from '../../services/prospect-service-v2'

// 🎯 Enum de pasos para AdvisorRequest
export enum AdvisorRequestStep {
  DETECTION = 'advisor-detection',
  QUICK_CAPTURE = 'quick-capture', 
  CAREER_INTEREST = 'career-interest',
  HANDOFF = 'advisor-handoff'
}

export class AdvisorRequestFlow {
  
  constructor(
    private readonly contextManager: FlowContextManager,
    private readonly validationService: ValidationService,
    private readonly messageFormatter: MessageFormatterService,
    private readonly prospectService: ProspectServiceV2
  ) {
    console.log('🎓 [ADVISOR-REQUEST-FLOW] Inicializado')
  }

  /**
   * 🎯 Procesar mensaje en el flujo AdvisorRequest
   */
  async processMessage(userId: string, message: string): Promise<FlowResult> {
    try {
      console.log(`🎓 [${userId}] Procesando solicitud de asesor: "${message}"`)

      // 1. 🔍 Obtener o crear context para AdvisorRequest
      let context = await this.contextManager.getContext(userId)
      
      if (!context || context.currentFlow !== FlowType.ADVISOR_REQUEST) {
        context = await this.createAdvisorRequestContext(userId, message)
      }

      // 2. 🎯 Procesar según el paso actual
      const stepResult = await this.processCurrentStep(context, message)

      // 3. 📊 Actualizar context con resultado del paso
      if (stepResult.success && stepResult.nextStep) {
        context.currentStep = stepResult.nextStep
        context.lastMessage = message
        context.metrics.stepsCompleted++
        
        if (stepResult.data) {
          Object.assign(context.capturedData, stepResult.data)
        }
      }

      // 4. 💾 Guardar context actualizado
      await this.contextManager.saveContext(context)

      // 5. 📊 Verificar si el flujo está completo
      const isFlowComplete = this.isFlowComplete(context)
      
      const flowResult: FlowResult = {
        success: stepResult.success,
        message: stepResult.message,
        completed: isFlowComplete,
        context: context,
        metrics: context.metrics,
        nextFlow: isFlowComplete ? 'main-menu' : undefined
      }

      console.log(`🎓 [${userId}] Resultado del flujo:`, {
        step: context.currentStep,
        success: stepResult.success,
        completed: isFlowComplete
      })

      return flowResult

    } catch (error) {
      console.error(`❌ [${userId}] Error en AdvisorRequestFlow:`, error)
      return this.createErrorFlowResult(userId, error)
    }
  }

  /**
   * 🏗️ Crear context para AdvisorRequest
   */
  private async createAdvisorRequestContext(userId: string, message: string): Promise<FlowContext> {
    console.log(`🎓 [${userId}] Creando context para AdvisorRequest`)

    // 🔍 Detectar fuente y teléfono
    const source = this.detectSource(userId)
    const telefono = source === 'whatsapp' ? userId : undefined

    const context: FlowContext = {
      userId,
      sessionId: `advisor_${Date.now()}`,
      currentFlow: FlowType.ADVISOR_REQUEST,
      currentStep: AdvisorRequestStep.DETECTION,
      capturedData: {
        telefono,
        telefono_confirmado: source === 'whatsapp', // Auto-confirmar en WhatsApp
        preferencia_contacto: 'normal'
      },
      preferences: {
        skipPhone: false,
        allowMarketing: true,
        communicationStyle: 'professional',
        language: 'es',
        timezone: 'America/Santiago',
        responseSpeed: 'fast',
        detailLevel: 'brief',
        channel: source
      },
      sessionMetadata: {
        startTime: new Date(),
        stepStartTime: new Date(),
        lastActivity: new Date(),
        totalSteps: 0,
        expectedSteps: 4,
        attemptsCurrentStep: 0,
        maxAttemptsPerStep: 3,
        isReturningUser: false,
        previousSessions: 0,
        completionPercentage: 0,
        source,
        platform: 'desktop',
        intent: 'advisor_request'
      },
      metrics: {
        messagesExchanged: 0,
        avgResponseTime: 0,
        errorsCount: 0,
        stepDurations: {},
        conversionEvents: [],
        stepsCompleted: 0
      },
      validationErrors: [],
      lastMessage: message,
      timeout: {
        warningTime: 240000,   // 4 minutos warning
        sessionTime: 300000,   // 5 minutos para asesor
        lastActivity: new Date(),
        warningShown: false
      },
      
      // 🔄 Estado Interno
      isActive: true,
      needsSave: true,
      version: '2.0',
      
      // 🗃️ Datos Adicionales
      metadata: {
        flowType: 'advisor-request',
        priority: 'high'
      }
    }

    return context
  }

  /**
   * 🎯 Procesar paso actual del flujo
   */
  private async processCurrentStep(context: FlowContext, message: string): Promise<StepResult> {
    const currentStep = context.currentStep as AdvisorRequestStep

    switch (currentStep) {
      case AdvisorRequestStep.DETECTION:
        return await this.processDetection(context, message)
      
      case AdvisorRequestStep.QUICK_CAPTURE:
        return await this.processQuickCapture(context, message)
      
      case AdvisorRequestStep.CAREER_INTEREST:
        return await this.processCareerInterest(context, message)
      
      case AdvisorRequestStep.HANDOFF:
        return await this.processHandoff(context, message)
      
      default:
        console.warn(`⚠️ [${context.userId}] Paso desconocido en AdvisorRequest: ${currentStep}`)
        return {
          success: false,
          message: '❌ Error interno en solicitud de asesor',
          nextStep: AdvisorRequestStep.DETECTION,
          completed: false
        }
    }
  }

  /**
   * 🎯 Procesar detección de solicitud de asesor
   */
  private async processDetection(context: FlowContext, message: string): Promise<StepResult> {
    console.log(`🎓 [${context.userId}] Procesando detección de asesor`)

    // Si ya tiene teléfono confirmado (WhatsApp), ir directo a quick capture
    if (context.capturedData.telefono_confirmado && context.capturedData.telefono) {
      return {
        success: true,
        message: this.formatWelcomeMessage(context),
        nextStep: AdvisorRequestStep.QUICK_CAPTURE,
        completed: false
      }
    }

    // Si no tiene teléfono, pedirlo
    return {
      success: true,
      message: this.formatPhoneRequestMessage(),
      nextStep: AdvisorRequestStep.QUICK_CAPTURE,
      completed: false
    }
  }

  /**
   * 📝 Procesar captura rápida (nombre)
   */
  private async processQuickCapture(context: FlowContext, message: string): Promise<StepResult> {
    console.log(`🎓 [${context.userId}] Procesando captura rápida`)

    // Si aún no tiene teléfono confirmado, procesarlo primero
    if (!context.capturedData.telefono_confirmado) {
      const phoneValidation = this.validationService.validatePhone(message.trim())
      
      if (!phoneValidation.isValid) {
        return {
          success: false,
          message: `❌ ${phoneValidation.message || 'Teléfono inválido'}\n\n📱 Por favor, ingresa tu **número de teléfono** para que un asesor pueda contactarte:`,
          nextStep: AdvisorRequestStep.QUICK_CAPTURE,
          completed: false
        }
      }

      const phoneFormatted = phoneValidation.sanitizedValue || message.trim()
      context.capturedData.telefono = phoneFormatted
      context.capturedData.telefono_confirmado = true

      return {
        success: true,
        message: `✅ **Teléfono registrado:** ${phoneFormatted}\n\n👤 ¿Cuál es tu **nombre completo**?`,
        nextStep: AdvisorRequestStep.QUICK_CAPTURE,
        completed: false,
        data: { 
          telefono: phoneFormatted,
          telefono_confirmado: true 
        }
      }
    }

    // Si ya tiene teléfono, capturar nombre
    if (!context.capturedData.nombre) {
      const nombre = message.trim()
      
      if (nombre.length < 2) {
        return {
          success: false,
          message: '❌ El nombre debe tener al menos 2 caracteres.\n\n👤 ¿Cuál es tu **nombre completo**?',
          nextStep: AdvisorRequestStep.QUICK_CAPTURE,
          completed: false
        }
      }

      context.capturedData.nombre = nombre

      // 💾 Guardar progreso
      await this.saveProgressiveStep(context, {
        campo_capturado: 'advisor-quick-capture',
        valor_nuevo: { nombre, telefono: context.capturedData.telefono }
      })

      return {
        success: true,
        message: `✅ **Nombre:** ${nombre}\n\n📚 ¿Qué carrera te interesa? (opcional - puedes escribir "continuar" para omitir)`,
        nextStep: AdvisorRequestStep.CAREER_INTEREST,
        completed: false,
        data: { nombre }
      }
    }

    // Si ya tiene todo, avanzar
    return {
      success: true,
      message: '🎯 Continuemos...',
      nextStep: AdvisorRequestStep.CAREER_INTEREST,
      completed: false
    }
  }

  /**
   * 📚 Procesar carrera de interés (opcional)
   */
  private async processCareerInterest(context: FlowContext, message: string): Promise<StepResult> {
    const input = message.trim().toLowerCase()

    // Permitir omitir la carrera
    if (input === 'continuar' || input === 'omitir' || input === 'skip') {
      context.capturedData.carrera_interes = 'Sin especificar'
    } else {
      context.capturedData.carrera_interes = message.trim()
    }

    // 💾 Guardar progreso y crear asesor request inmediatamente
    await this.saveAdvisorRequest(context)

    return {
      success: true,
      message: this.formatHandoffMessage(context),
      nextStep: AdvisorRequestStep.HANDOFF,
      completed: true,
      data: { carrera_interes: context.capturedData.carrera_interes }
    }
  }

  /**
   * 🎯 Procesar handoff final
   */
  private async processHandoff(context: FlowContext, message: string): Promise<StepResult> {
    // Este paso es solo informativo, el flujo ya está completo
    return {
      success: true,
      message: '🎯 Tu solicitud ya fue procesada. ¿Hay algo más en que pueda ayudarte?',
      nextStep: AdvisorRequestStep.HANDOFF,
      completed: true
    }
  }

  /**
   * 💾 Guardar paso progresivo
   */
  private async saveProgressiveStep(context: FlowContext, stepData: any): Promise<void> {
    try {
      const userState = this.convertContextToUserState(context)
      
      await this.prospectService.saveProgressiveStep(
        context.userId,
        stepData.campo_capturado,
        stepData.valor_nuevo,
        userState
      )
      
      console.log(`📝 [ADVISOR-PROGRESSIVE] Paso guardado: ${stepData.campo_capturado} para ${context.userId}`)
    } catch (error) {
      console.error(`❌ [${context.userId}] Error guardando paso advisor:`, error)
    }
  }

  /**
   * 💾 Guardar solicitud de asesor final
   */
  private async saveAdvisorRequest(context: FlowContext): Promise<void> {
    try {
      const prospectData = {
        whatsapp: context.userId,
        nombre: context.capturedData.nombre || 'Usuario',
        email: null, // Email no requerido para asesor
        telefono: context.capturedData.telefono || null,
        edad: undefined,
        region: undefined,
        carrera_interes: context.capturedData.carrera_interes || 'Sin especificar',
        nivel_interes: 'alto', // Siempre alto para solicitud de asesor
        tipo_consulta: 'solicitud_asesor',
        telefono_confirmado: context.capturedData.telefono_confirmado || false,
        preferencia_contacto: 'urgente', // Prioridad alta
        source: context.sessionMetadata.source
      }

      // 💾 Guardar en prospecto_actual
      await this.prospectService.guardarProspecto(context.userId, prospectData)
      console.log(`🎓 [${context.userId}] Solicitud de asesor guardada en prospecto_actual`)
      
      // 📝 Guardar paso final en historial
      const userState = this.convertContextToUserState(context)
      await this.prospectService.saveProgressiveStep(
        context.userId,
        'advisor-request-completed',
        { 
          tipo_consulta: 'solicitud_asesor',
          nivel_interes: 'alto',
          preferencia_contacto: 'urgente',
          flujo_completado: true 
        },
        userState
      )
      console.log(`📝 [${context.userId}] Solicitud de asesor completion guardada en historial`)
      
    } catch (error) {
      console.error(`❌ [${context.userId}] Error guardando solicitud de asesor:`, error)
    }
  }

  // 🎨 MÉTODOS DE FORMATEO DE MENSAJES

  private formatWelcomeMessage(context: FlowContext): string {
    return `🎓 **¡Perfecto!** Te conectaremos con un asesor académico.

📱 Usaremos tu número: **${context.capturedData.telefono}**

👤 ¿Cuál es tu **nombre completo**?`
  }

  private formatPhoneRequestMessage(): string {
    return `🎓 **¡Excelente!** Te conectaremos con un asesor académico.

📱 Para que pueda contactarte, necesito tu **número de teléfono**:`
  }

  private formatHandoffMessage(context: FlowContext): string {
    const carrera = context.capturedData.carrera_interes === 'Sin especificar' 
      ? '' 
      : `
📚 **Carrera de interés:** ${context.capturedData.carrera_interes}`

    return `🎯 **¡Solicitud registrada exitosamente!**

📋 **Resumen:**
👤 **Nombre:** ${context.capturedData.nombre}
📱 **Teléfono:** ${context.capturedData.telefono}${carrera}

⏰ **Un asesor académico te contactará en las próximas 2 horas.**

🎓 Mientras tanto, ¿hay algo específico sobre UNIACC que te gustaría saber?`
  }

  // 🛠️ MÉTODOS UTILITARIOS

  private detectSource(userId: string): 'whatsapp' | 'chat-demo' | 'api' {
    if (userId.startsWith('56') && userId.length >= 11) return 'whatsapp'
    if (userId.includes('demo') || userId.includes('test')) return 'chat-demo'
    return 'api'
  }

  private isFlowComplete(context: FlowContext): boolean {
    return context.currentStep === AdvisorRequestStep.HANDOFF &&
           !!context.capturedData.nombre &&
           !!context.capturedData.telefono &&
           !!context.capturedData.telefono_confirmado
  }

  private convertContextToUserState(context: FlowContext): any {
    return {
      userId: context.userId,
      datos_prospecto: context.capturedData,
      flujo_actual: context.currentFlow,
      paso_actual: context.currentStep,
      timestamp: new Date().toISOString()
    }
  }

  private createErrorFlowResult(userId: string, error: any): FlowResult {
    // Context mínimo para errores sin async
    const errorContext: FlowContext = {
      userId,
      sessionId: `${userId}-${Date.now()}`,
      currentFlow: FlowType.ADVISOR_REQUEST,
      currentStep: AdvisorRequestStep.DETECTION,
      capturedData: {},
      lastMessage: '',
      isActive: false,
      needsSave: false,
      version: '2.0.0',
      timeout: { 
        sessionTime: 1200000, 
        warningTime: 60000,
        lastActivity: new Date(),
        warningShown: false
      },
      
      sessionMetadata: {
        startTime: new Date(),
        source: 'chat-demo',
        stepStartTime: new Date(),
        lastActivity: new Date(),
        totalSteps: 0,
        expectedSteps: 4,
        attemptsCurrentStep: 0,
        maxAttemptsPerStep: 3,
        isReturningUser: false,
        previousSessions: 0,
        completionPercentage: 0,
        platform: 'desktop'
      },
      
      preferences: {
        language: 'es',
        skipPhone: false,
        allowMarketing: true,
        communicationStyle: 'formal',
        timezone: 'America/Santiago',
        responseSpeed: 'normal',
        detailLevel: 'detailed',
        channel: 'chat-demo'
      },
      
      metrics: {
        messagesExchanged: 0,
        avgResponseTime: 0,
        errorsCount: 1,
        stepDurations: {},
        conversionEvents: ['error_occurred'],
        stepsCompleted: 0
      },
      
      validationErrors: [],
      metadata: {}
    }
    
    return {
      success: false,
      message: '❌ Ocurrió un error procesando tu solicitud de asesor. Por favor, intenta nuevamente.',
      completed: false,
      context: errorContext,
      metrics: errorContext.metrics,
      nextFlow: undefined
    }
  }
}
