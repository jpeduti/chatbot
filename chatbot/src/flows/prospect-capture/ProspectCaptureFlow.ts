/**
 * 🎪 ProspectCaptureFlow - Orquestador Principal del Flujo de Captura
 * 
 * Gestiona el flujo completo de captura de prospectos usando FlowContext.
 * Coordina todos los pasos y mantiene el estado unificado.
 * 
 * @author UNIACC ChatBot Team
 * @version 2.0 - FlowContext Enhanced
 */

import { 
  FlowContext, 
  FlowResult, 
  StepResult, 
  ProspectCaptureStep,
  FlowType
} from '../core/FlowContext'
import { FlowContextManager } from '../core/FlowContextManager'
import { PhoneDetectionStep } from './PhoneDetectionStep'
import { ValidationService } from '../../services/validation-service'
import { MessageFormatterService } from '../../services/message-formatter'
import { ProspectServiceV2 } from '../../services/prospect-service-v2'

export class ProspectCaptureFlow {
  private readonly phoneDetectionStep: PhoneDetectionStep

  constructor(
    private readonly contextManager: FlowContextManager,
    private readonly validationService: ValidationService,
    private readonly messageFormatter: MessageFormatterService,
    private readonly prospectService: ProspectServiceV2
  ) {
    // 🏗️ Inicializar steps
    this.phoneDetectionStep = new PhoneDetectionStep(validationService, messageFormatter)
    
    console.log('🎪 [PROSPECT-CAPTURE-FLOW] Inicializado con FlowContext')
  }

  /**
   * 🎯 Procesar mensaje en el flujo de ProspectCapture
   */
  async processMessage(userId: string, message: string): Promise<FlowResult> {
    try {
      console.log(`🎪 [${userId}] Procesando mensaje: "${message}"`)

      // 1. 🔍 Obtener o crear FlowContext
      let context = await this.contextManager.getContext(userId)
      
      if (!context) {
        console.log(`🎪 [${userId}] Creando nuevo context para ProspectCapture`)
        context = await this.createNewContext(userId)
      }

      // 2. 🎯 Procesar según el paso actual
      const stepResult = await this.processCurrentStep(context, message)

      // 3. 📊 Actualizar métricas
      await this.updateMetrics(context, stepResult)

      // 4. 💾 Guardar progreso si hay datos
      if (stepResult.data) {
        await this.saveProgressiveStep(context, stepResult.data)
      }

      // 5. 🔄 Actualizar context con resultado
      if (stepResult.context) {
        Object.assign(context, stepResult.context)
      }

      // 6. ➡️ Avanzar paso si se completó
      if (stepResult.completed && stepResult.nextStep) {
        await this.contextManager.advanceToNextStep(userId, stepResult.data)
        context = await this.contextManager.getContext(userId) // Refrescar context
      }

      // 7. 💾 Guardar context actualizado
      if (context) {
        await this.contextManager.saveContext(context)
      }

      // 8. 🎯 Verificar si el flujo está completo
      const isFlowComplete = this.isFlowComplete(context!)
      
      const flowResult: FlowResult = {
        success: stepResult.success,
        message: stepResult.message,
        completed: isFlowComplete,
        context: context!,
        metrics: context!.metrics,
        nextFlow: isFlowComplete ? 'main-menu' : undefined
      }

      console.log(`🎪 [${userId}] Resultado del flujo:`, {
        step: context?.currentStep,
        success: stepResult.success,
        completed: isFlowComplete
      })

      return flowResult

    } catch (error) {
      console.error(`❌ [${userId}] Error en ProspectCaptureFlow:`, error)
      return this.createErrorFlowResult(userId, error)
    }
  }

  /**
   * 🏗️ Crear nuevo FlowContext
   */
  private async createNewContext(userId: string): Promise<FlowContext> {
    // Importar FlowContextBuilder aquí para evitar dependencias circulares
    const { FlowContextBuilder } = await import('../core/FlowContextBuilder')
    
    // 🎯 Detectar fuente basada en userId
    const source = this.detectSource(userId)
    
    const context = new FlowContextBuilder(userId)
      .withFlow(FlowType.PROSPECT_CAPTURE, ProspectCaptureStep.PHONE_DETECTION)
      .withSource(source)
      .build()

    await this.contextManager.saveContext(context)
    console.log(`🎪 [${userId}] Nuevo context creado para ${source}`)
    
    return context
  }

  /**
   * 🎯 Procesar paso actual según FlowContext
   */
  private async processCurrentStep(context: FlowContext, message: string): Promise<StepResult> {
    const currentStep = context.currentStep

    switch (currentStep) {
      case ProspectCaptureStep.PHONE_DETECTION:
        return await this.phoneDetectionStep.process(context, message)
      
      case ProspectCaptureStep.PHONE_CONFIRMATION:
        return await this.processPhoneConfirmation(context, message)
      
      case ProspectCaptureStep.PHONE_MANUAL:
        return await this.processPhoneManual(context, message)
      
      case ProspectCaptureStep.NAME_CAPTURE:
        return await this.processNameCapture(context, message)
      
      case ProspectCaptureStep.EMAIL_CAPTURE:
        return await this.processEmailCapture(context, message)
      
      case ProspectCaptureStep.AGE_CAPTURE:
        return await this.processAgeCapture(context, message)
      
      case ProspectCaptureStep.REGION_CAPTURE:
        return await this.processRegionCapture(context, message)
      
      case ProspectCaptureStep.COMPLETION:
        return await this.processCompletion(context, message)
      
      default:
        console.warn(`⚠️ [${context.userId}] Paso desconocido: ${currentStep}`)
        return {
          success: false,
          message: '❌ Error interno: paso desconocido',
          nextStep: ProspectCaptureStep.PHONE_DETECTION,
          completed: false
        }
    }
  }

  /**
   * 📱 Procesar confirmación de teléfono (temporal - será refactorizado a step)
   */
  private async processPhoneConfirmation(context: FlowContext, message: string): Promise<StepResult> {
    const input = message.trim()
    
    if (input === '1') {
      // ✅ Confirmar teléfono detectado
      context.capturedData.telefono_confirmado = true
      
      return {
        success: true,
        message: `✅ **Teléfono confirmado:** +${context.capturedData.telefono}\n\n👤 ¿Cuál es tu **nombre completo**?`,
        nextStep: ProspectCaptureStep.NAME_CAPTURE,
        completed: true,
        data: { telefono_confirmado: true }
      }
    } else if (input === '2') {
      // 📝 Solicitar teléfono manual
      return {
        success: true,
        message: '📱 Perfecto, ingresa tu **número de teléfono** correcto:',
        nextStep: ProspectCaptureStep.PHONE_MANUAL,
        completed: true
      }
    } else {
      // ❌ Opción inválida
      return {
        success: false,
        message: '❌ Opción inválida. Por favor selecciona:\n\n1️⃣ Sí, confirmar número\n2️⃣ Dar otro número',
        nextStep: ProspectCaptureStep.PHONE_CONFIRMATION,
        completed: false
      }
    }
  }

  /**
   * 📞 Procesar teléfono manual
   */
  private async processPhoneManual(context: FlowContext, message: string): Promise<StepResult> {
    const cleanPhone = this.cleanPhoneNumber(message.trim())
    const validation = this.validationService.validatePhone(cleanPhone)

    if (!validation.isValid) {
      // ❌ Error de validación
      context.sessionMetadata.attemptsCurrentStep++
      
      if (context.sessionMetadata.attemptsCurrentStep >= context.sessionMetadata.maxAttemptsPerStep) {
        return {
          success: false,
          message: '🚨 **Máximo de intentos alcanzado**\n\n¿Te gustaría que un asesor te contacte directamente?\n\n1️⃣ Sí, solicitar contacto de asesor\n2️⃣ Intentar nuevamente',
          nextStep: 'advisor-request',
          completed: false
        }
      }

      return {
        success: false,
        message: `❌ ${validation.message}\n\n📱 Formato válido: 912345678\n💡 Te quedan **${3 - context.sessionMetadata.attemptsCurrentStep} intentos**`,
        nextStep: ProspectCaptureStep.PHONE_MANUAL,
        completed: false
      }
    }

    // ✅ Teléfono válido - actualizar context
    context.capturedData.telefono = cleanPhone
    context.capturedData.telefono_confirmado = true

    return {
      success: true,
      message: `✅ **Teléfono confirmado:** +${cleanPhone}\n\n👤 ¿Cuál es tu **nombre completo**?`,
      nextStep: ProspectCaptureStep.NAME_CAPTURE,
      completed: true,
      data: { 
        telefono: cleanPhone,
        telefono_confirmado: true 
      }
    }
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
   * 👤 Procesar captura de nombre (temporal - será refactorizado a step)
   */
  private async processNameCapture(context: FlowContext, message: string): Promise<StepResult> {
    const nombre = message.trim()
    
    if (nombre.length < 2) {
      return {
        success: false,
        message: '❌ El nombre debe tener al menos 2 caracteres.\n\n👤 ¿Cuál es tu **nombre completo**?',
        nextStep: ProspectCaptureStep.NAME_CAPTURE,
        completed: false
      }
    }

    context.capturedData.nombre = nombre

    return {
      success: true,
      message: `✅ Nombre: ${nombre}\n\n📧 ¿Cuál es tu **email**?`,
      nextStep: ProspectCaptureStep.EMAIL_CAPTURE,
      completed: true,
      data: { nombre }
    }
  }

  /**
   * 📧 Procesar captura de email (temporal)
   */
  private async processEmailCapture(context: FlowContext, message: string): Promise<StepResult> {
    const email = message.trim().toLowerCase()
    const validation = this.validationService.validateEmail(email)
    
    if (!validation.isValid) {
      return {
        success: false,
        message: `❌ ${validation.message}\n\n📧 ¿Cuál es tu **email**?`,
        nextStep: ProspectCaptureStep.EMAIL_CAPTURE,
        completed: false
      }
    }

    context.capturedData.email = email

    return {
      success: true,
      message: `✅ Email: ${email}\n\n🎂 ¿Cuántos **años** tienes?`,
      nextStep: ProspectCaptureStep.AGE_CAPTURE,
      completed: true,
      data: { email }
    }
  }

  /**
   * 🎂 Procesar captura de edad (temporal)
   */
  private async processAgeCapture(context: FlowContext, message: string): Promise<StepResult> {
    const edad = parseInt(message.trim())
    
    if (isNaN(edad) || edad < 16 || edad > 80) {
      return {
        success: false,
        message: '❌ Por favor ingresa una edad válida (16-80 años).\n\n🎂 ¿Cuántos **años** tienes?',
        nextStep: ProspectCaptureStep.AGE_CAPTURE,
        completed: false
      }
    }

    context.capturedData.edad = edad

    // 📱 Decidir siguiente paso según preferencias de teléfono
    if (context.preferences.skipPhone) {
      return {
        success: true,
        message: `✅ Edad: ${edad} años\n\n📍 ¿En qué **región** vives?\n\n1️⃣ Metropolitana\n2️⃣ Valparaíso\n3️⃣ Otra región`,
        nextStep: ProspectCaptureStep.REGION_CAPTURE,
        completed: true,
        data: { edad }
      }
    } else {
      return {
        success: true,
        message: `✅ Edad: ${edad} años\n\n📍 ¿En qué **región** vives?\n\n1️⃣ Metropolitana\n2️⃣ Valparaíso\n3️⃣ Otra región`,
        nextStep: ProspectCaptureStep.REGION_CAPTURE,
        completed: true,
        data: { edad }
      }
    }
  }

  /**
   * 📍 Procesar captura de región (temporal)
   */
  private async processRegionCapture(context: FlowContext, message: string): Promise<StepResult> {
    const opcion = message.trim()
    let region: string
    
    switch (opcion) {
      case '1':
        region = 'Metropolitana'
        break
      case '2':
        region = 'Valparaíso'
        break
      case '3':
        region = 'Otra'
        break
      default:
        return {
          success: false,
          message: `❌ Opción inválida.

📍 ¿En qué **región** vives?

1️⃣ Metropolitana
2️⃣ Valparaíso
3️⃣ Otra región`,
          nextStep: ProspectCaptureStep.REGION_CAPTURE,
          completed: false
        }
    }

    context.capturedData.region = region

    // 💾 Ejecutar finalización directamente al completar la captura
    await this.saveFinalProspect(context)

    return {
      success: true,
      message: `✅ Región: ${region}

🎯 ¡Perfecto! Hemos registrado tu información.

💾 Tu información ha sido guardada exitosamente. ¡Gracias por tu interés en UNIACC!`,
      nextStep: ProspectCaptureStep.COMPLETION,
      completed: true,
      data: { region }
    }
  }

  /**
   * 🎯 Procesar finalización del flujo
   */
  private async processCompletion(context: FlowContext, message: string): Promise<StepResult> {
    // 💾 Guardar prospecto completo
    await this.saveFinalProspect(context)

    const completionMessage = this.formatCompletionMessage(context)

    return {
      success: true,
      message: completionMessage,
      nextStep: 'main-menu',
      completed: true,
      data: { flujo_completado: true }
    }
  }

  /**
   * 💾 Guardar paso progresivo
   */
  private async saveProgressiveStep(context: FlowContext, stepData: any): Promise<void> {
    try {
      // 🔄 Convertir FlowContext a UserState para compatibilidad
      const userState = this.convertContextToUserState(context)
      
      await this.prospectService.saveProgressiveStep(
        context.userId,
        context.currentStep,
        stepData,
        userState
      )
    } catch (error) {
      console.error(`❌ [${context.userId}] Error guardando paso progresivo:`, error)
    }
  }

  /**
   * 💾 Guardar prospecto final completo en prospecto_actual
   */
  private async saveFinalProspect(context: FlowContext): Promise<void> {
    try {
      const prospectData = {
        whatsapp: context.userId,
        nombre: context.capturedData.nombre || 'Usuario',
        email: context.capturedData.email || null,
        telefono: context.capturedData.telefono || null,
        edad: context.capturedData.edad || undefined,
        region: context.capturedData.region || undefined,
        telefono_confirmado: context.capturedData.telefono_confirmado || false,
        preferencia_contacto: context.capturedData.preferencia_contacto || 'normal',
        source: context.sessionMetadata.source,
        carrera_interes: context.capturedData.carrera_interes || 'Sin especificar',
        nivel_interes: context.capturedData.nivel_interes || 'alto',
        tipo_consulta: 'captura_inicial'
      }

      // 💾 Guardar en prospecto_actual usando el repository
      await this.prospectService.guardarProspecto(context.userId, prospectData)
      console.log(`💾 [${context.userId}] Prospecto final guardado en prospecto_actual`)
      
      // 📝 También guardar paso final en historial
      const userState = this.convertContextToUserState(context)
      await this.prospectService.saveProgressiveStep(
        context.userId,
        'completion',
        { flujo_completado: true, razon_finalizacion: 'completed' },
        userState
      )
      console.log(`📝 [${context.userId}] Paso completion guardado en historial`)
      
    } catch (error) {
      console.error(`❌ [${context.userId}] Error guardando prospecto final:`, error)
    }
  }

  /**
   * 📊 Actualizar métricas
   */
  private async updateMetrics(context: FlowContext, stepResult: StepResult): Promise<void> {
    context.metrics.messagesExchanged++
    
    if (!stepResult.success) {
      context.metrics.errorsCount++
    }

    await this.contextManager.updateMetrics(context.userId, context.metrics)
  }

  /**
   * 🔍 Detectar fuente del mensaje
   */
  private detectSource(userId: string): 'whatsapp' | 'chat-demo' | 'web' {
    // 📱 WhatsApp: números que empiezan con 56 y tienen 11+ dígitos
    if (userId.startsWith('56') && userId.length >= 11 && /^\d+$/.test(userId)) {
      return 'whatsapp'
    }
    
    // 🖥️ Chat Demo: puede ser números simulados o IDs alfanuméricos
    return 'chat-demo'
  }

  /**
   * ✅ Verificar si el flujo está completo
   */
  private isFlowComplete(context: FlowContext): boolean {
    return context.currentStep === 'main-menu' || 
           (context.currentStep === ProspectCaptureStep.COMPLETION && 
            !!context.capturedData.nombre && 
            !!context.capturedData.email)
  }

  /**
   * 🎨 Formatear mensaje de finalización
   */
  private formatCompletionMessage(context: FlowContext): string {
    const { nombre, email, telefono, edad, region, preferencia_contacto } = context.capturedData
    
    let message = `🎉 **¡Registro Completo!**\n\n📋 **Resumen de tu información:**\n`
    message += `👤 **Nombre:** ${nombre}\n`
    message += `📧 **Email:** ${email}\n`
    
    if (telefono && preferencia_contacto !== 'sin_telefono_explicito') {
      message += `📱 **Teléfono:** +${telefono}\n`
    }
    
    message += `🎂 **Edad:** ${edad} años\n`
    message += `📍 **Región:** ${region}\n\n`
    
    message += `🎓 **¿Qué te gustaría saber sobre UNIACC?**

1️⃣ Información de carreras
2️⃣ Hablar con un asesor
3️⃣ Campus y sedes
4️⃣ Proceso de admisión

`
    message += `*ChatBot UNIACC* 🤖`

    return message
  }

  /**
   * 🔄 Convertir FlowContext a UserState para compatibilidad
   */
  private convertContextToUserState(context: FlowContext): any {
    return {
      flujo_actual: context.currentFlow,
      paso_actual: context.currentStep,
      datos_prospecto: {
        nombre: context.capturedData.nombre,
        email: context.capturedData.email,
        telefono: context.capturedData.telefono,
        telefono_detectado: context.capturedData.telefono_detectado,
        telefono_confirmado: context.capturedData.telefono_confirmado,
        preferencia_contacto: context.capturedData.preferencia_contacto,
        whatsapp: context.userId,
        edad: context.capturedData.edad,
        region: context.capturedData.region,
        carrera_interes: context.capturedData.carrera_interes,
        nivel_interes: context.capturedData.nivel_interes,
        campus_preferido: context.capturedData.campus_preferido
      },
      intentos_captura: context.sessionMetadata.attemptsCurrentStep,
      session_timeout_id: null,
      warning_timeout_id: null
    }
  }

  /**
   * ❌ Crear resultado de error
   */
  private createErrorFlowResult(userId: string, error: any): FlowResult {
    return {
      success: false,
      message: '❌ Error interno. Por favor intenta nuevamente.',
      completed: false,
      context: {} as FlowContext, // Context mínimo
      metrics: {
        messagesExchanged: 0,
        avgResponseTime: 0,
        errorsCount: 1,
        stepDurations: {},
        conversionEvents: ['error_occurred'],
        stepsCompleted: 0
      }
    }
  }
}

export default ProspectCaptureFlow
