/**
 * 📱 PhoneDetectionStep - Auto-detección de Teléfono
 * 
 * Primer paso del ProspectCapture que auto-detecta el teléfono desde WhatsApp
 * o solicita el número si viene desde otras fuentes.
 * 
 * @author UNIACC ChatBot Team
 * @version 2.0 - FlowContext Enhanced
 */

import { 
  FlowContext, 
  StepResult, 
  ValidationError,
  ProspectCaptureStep 
} from '../core/FlowContext'
import { ValidationService } from '../../services/validation-service'
import { MessageFormatterService } from '../../services/message-formatter'

export class PhoneDetectionStep {
  constructor(
    private readonly validationService: ValidationService,
    private readonly messageFormatter: MessageFormatterService
  ) {
    console.log('📱 [PHONE-DETECTION-STEP] Inicializado')
  }

  /**
   * 🎯 Procesar detección automática de teléfono
   */
  async process(context: FlowContext, userInput?: string): Promise<StepResult> {
    try {
      console.log(`📱 [${context.userId}] Procesando detección de teléfono`)

      // 1. 🔍 Auto-detectar desde WhatsApp
      if (context.sessionMetadata.source === 'whatsapp') {
        return await this.processWhatsAppDetection(context)
      }

      // 2. 🖥️ Solicitar teléfono desde otras fuentes
      if (context.sessionMetadata.source === 'chat-demo') {
        return await this.processChatDemoInput(context, userInput)
      }

      // 3. 🌐 Otras fuentes (web, api)
      return await this.processGenericInput(context, userInput)

    } catch (error) {
      console.error(`❌ [${context.userId}] Error en PhoneDetectionStep:`, error)
      return this.createErrorResult(context, 'Error interno en detección de teléfono')
    }
  }

  /**
   * 📱 Procesar detección automática desde WhatsApp
   */
  private async processWhatsAppDetection(context: FlowContext): Promise<StepResult> {
    const phoneNumber = context.userId

    // ✅ Validar formato de teléfono
    const validation = this.validationService.validatePhone(phoneNumber)
    if (!validation.isValid) {
      return this.createErrorResult(context, 'Número de WhatsApp inválido')
    }

    // 📊 Actualizar context con teléfono detectado
    context.capturedData.telefono_detectado = phoneNumber
    context.capturedData.telefono = phoneNumber
    context.capturedData.telefono_confirmado = false // Necesita confirmación
    context.capturedData.medio_contacto_preferido = 'whatsapp'

    // 📈 Registrar evento
    context.metrics.conversionEvents.push('phone_auto_detected')

    // ➡️ Avanzar al siguiente paso
    // 🔍 Detectar fuente para formateo apropiado
    const isFromChatDemo = context.sessionMetadata.source === 'chat-demo'
    const message = isFromChatDemo 
      ? this.formatChatDemoDetectionMessage(phoneNumber)
      : this.formatWhatsAppDetectionMessage(phoneNumber)
    
    return {
      success: true,
      message,
      nextStep: ProspectCaptureStep.PHONE_CONFIRMATION,
      completed: true,
      data: {
        telefono_detectado: phoneNumber,
        telefono: phoneNumber,
        detection_method: 'whatsapp_auto'
      },
      context: {
        currentStep: ProspectCaptureStep.PHONE_CONFIRMATION,
        previousStep: ProspectCaptureStep.PHONE_DETECTION,
        capturedData: context.capturedData
      }
    }
  }

  /**
   * 🖥️ Procesar entrada desde Chat Demo
   */
  private async processChatDemoInput(context: FlowContext, userInput?: string): Promise<StepResult> {
    // 🎯 Primera vez - mostrar saludo y detectar teléfono desde userId
    if (!userInput) {
      const phoneNumber = context.userId
      
      // 📱 Si el userId parece un teléfono, auto-detectar
      if (this.looksLikePhoneNumber(phoneNumber)) {
        const message = this.formatChatDemoDetectionMessage(phoneNumber)
        
        // 📊 Actualizar context con teléfono detectado
        context.capturedData.telefono_detectado = phoneNumber
        context.capturedData.telefono = phoneNumber
        context.capturedData.telefono_confirmado = false
        
        return {
          success: true,
          message,
          nextStep: ProspectCaptureStep.PHONE_CONFIRMATION,
          completed: true,
          data: {
            telefono_detectado: phoneNumber,
            telefono: phoneNumber,
            detection_method: 'chat_demo_auto'
          },
          context: {
            currentStep: ProspectCaptureStep.PHONE_CONFIRMATION,
            previousStep: ProspectCaptureStep.PHONE_DETECTION,
            capturedData: context.capturedData
          }
        }
      } else {
        // 🎯 Si no parece teléfono, solicitar manual
        const message = this.formatPhoneRequestMessage()
        return {
          success: true,
          message,
          nextStep: ProspectCaptureStep.PHONE_DETECTION,
          completed: false
        }
      }
    }

    // ✅ Validar teléfono ingresado
    const cleanPhone = this.cleanPhoneNumber(userInput)
    const validation = this.validationService.validatePhone(cleanPhone)

    if (!validation.isValid) {
      // ❌ Error de validación
      const error: ValidationError = {
        field: 'telefono',
        message: validation.message || 'Formato de teléfono inválido',
        code: 'INVALID_PHONE_FORMAT',
        timestamp: new Date(),
        attempt: context.sessionMetadata.attemptsCurrentStep + 1
      }

      context.validationErrors.push(error)
      context.sessionMetadata.attemptsCurrentStep++

      // 🚨 Verificar límite de intentos
      if (context.sessionMetadata.attemptsCurrentStep >= context.sessionMetadata.maxAttemptsPerStep) {
        return this.createMaxAttemptsResult(context)
      }

      const message = this.formatPhoneErrorMessage(validation.message || 'Formato inválido', context.sessionMetadata.attemptsCurrentStep)
      return {
        success: false,
        message,
        nextStep: ProspectCaptureStep.PHONE_DETECTION,
        completed: false,
        errors: [error]
      }
    }

    // ✅ Teléfono válido
    context.capturedData.telefono = cleanPhone
    context.capturedData.telefono_confirmado = true // Chat demo considera confirmado
    context.capturedData.medio_contacto_preferido = 'telefono'

    // 📈 Registrar evento
    context.metrics.conversionEvents.push('phone_manual_entered')

    const message = this.formatPhoneSuccessMessage(cleanPhone)

    return {
      success: true,
      message,
      nextStep: ProspectCaptureStep.NAME_CAPTURE, // Saltar confirmación
      completed: true,
      data: {
        telefono: cleanPhone,
        telefono_confirmado: true,
        detection_method: 'chat_demo_manual'
      },
      context: {
        currentStep: ProspectCaptureStep.NAME_CAPTURE,
        previousStep: ProspectCaptureStep.PHONE_DETECTION,
        capturedData: context.capturedData
      }
    }
  }

  /**
   * 🌐 Procesar entrada genérica (web, api)
   */
  private async processGenericInput(context: FlowContext, userInput?: string): Promise<StepResult> {
    // Similar a chat-demo pero con validaciones más estrictas
    return await this.processChatDemoInput(context, userInput)
  }

  /**
   * 🧹 Limpiar formato de teléfono
   */
  private cleanPhoneNumber(phone: string): string {
    // Remover espacios, guiones, paréntesis
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
    
    // Agregar código país si no existe
    if (!cleaned.startsWith('+') && !cleaned.startsWith('56')) {
      cleaned = '56' + cleaned
    }
    
    // Remover + si existe
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1)
    }

    return cleaned
  }

  /**
   * 🎨 Formatear mensajes
   */
  private formatWhatsAppDetectionMessage(phoneNumber: string): string {
    return `¡Hola! 👋 
📱 Detectamos que escribes desde +${phoneNumber}

¿Confirmamos este número como tu contacto preferido?

1️⃣ Sí, usar +${phoneNumber}
2️⃣ Prefiero dar otro número

🔒 Tus datos están seguros con nosotros`
  }

  private formatChatDemoDetectionMessage(phoneNumber: string): string {
    return `¡Hola! 👋

el chat📱 Detectamos que escribes desde +${phoneNumber}

¿Confirmamos este número como tu contacto preferido?

1️⃣ Sí, usar +${phoneNumber}
2️⃣ Prefiero dar otro número

🔒 Tus datos están seguros con nosotros`
  }

  private formatPhoneRequestMessage(): string {
    return `🎓 ¡Bienvenido a UNIACC!

📱 ¿Cuál es tu **número de teléfono**?

💡 Ejemplo: 912345678`
  }

  private formatPhoneErrorMessage(error: string, attempt: number): string {
    const remaining = 3 - attempt
    return `❌ ${error}

📱 Formato válido: 912345678
💡 Te quedan **${remaining} intentos**`
  }

  private formatPhoneSuccessMessage(phone: string): string {
    return `✅ **Teléfono confirmado:** +${phone}

🎓 Perfecto, continuemos...

👤 ¿Cuál es tu **nombre completo**?

*ChatBot UNIACC* 🤖`
  }

  /**
   * ❌ Resultados de error
   */
  private createErrorResult(context: FlowContext, message: string): StepResult {
    return {
      success: false,
      message: `❌ ${message}\n\nPor favor intenta nuevamente o contacta soporte.`,
      nextStep: ProspectCaptureStep.PHONE_DETECTION,
      completed: false,
      errors: [{
        field: 'phone_detection',
        message,
        code: 'INTERNAL_ERROR',
        timestamp: new Date(),
        attempt: 1
      }]
    }
  }

  private createMaxAttemptsResult(context: FlowContext): StepResult {
    return {
      success: false,
      message: `🚨 **Máximo de intentos alcanzado**

¿Te gustaría que un **asesor** te contacte directamente?

1️⃣ Sí, solicitar contacto de asesor
2️⃣ Intentar nuevamente
3️⃣ Continuar sin teléfono

*ChatBot UNIACC* 🤖`,
      nextStep: 'advisor-request', // Flujo especial
      completed: false
    }
  }

  /**
   * 🔍 Validar si puede procesar este paso
   */
  canProcess(context: FlowContext): boolean {
    return context.currentStep === ProspectCaptureStep.PHONE_DETECTION
  }

  /**
   * 🔍 Verificar si el string parece un número de teléfono
   */
  private looksLikePhoneNumber(input: string): boolean {
    // Remover caracteres no numéricos
    const cleaned = input.replace(/\D/g, '')
    
    // Verificar que tenga entre 8 y 15 dígitos (rango típico de teléfonos)
    if (cleaned.length < 8 || cleaned.length > 15) {
      return false
    }
    
    // Verificar que empiece con códigos válidos para Chile
    return cleaned.startsWith('56') || 
           cleaned.startsWith('9') || 
           cleaned.startsWith('2') || 
           cleaned.startsWith('3') || 
           cleaned.startsWith('4') ||
           cleaned.startsWith('5') ||
           cleaned.startsWith('6') ||
           cleaned.startsWith('7') ||
           cleaned.startsWith('8')
  }

  /**
   * 📊 Obtener métricas del paso
   */
  getStepMetrics(context: FlowContext) {
    return {
      step: ProspectCaptureStep.PHONE_DETECTION,
      attempts: context.sessionMetadata.attemptsCurrentStep,
      errors: context.validationErrors.filter(e => e.field === 'telefono').length,
      detectionMethod: context.capturedData.telefono_detectado ? 'auto' : 'manual',
      source: context.sessionMetadata.source
    }
  }
}

export default PhoneDetectionStep
