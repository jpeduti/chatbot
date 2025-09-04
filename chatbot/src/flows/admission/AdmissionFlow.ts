/**
 * 📝 AdmissionFlow
 * 
 * Flujo completo de información de admisión UNIACC 2025
 * - Fechas importantes
 * - Proceso de postulación  
 * - Becas disponibles
 * - Requisitos PAES/académicos
 * - Contacto con admisiones
 * 
 * ESTRATEGIA: 85% de opciones terminan con "Un asesor te contactará"
 */

import { FlowContext, FlowResult, StepResult } from '../core/FlowContext'
import { FlowContextManager } from '../core/FlowContextManager'
import { ProspectServiceV2 } from '../../services/prospect-service-v2'

export enum AdmissionStep {
  MENU_DISPLAY = 'menu-display',
  DATES_INFO = 'dates-info',
  PROCESS_INFO = 'process-info', 
  SCHOLARSHIPS_INFO = 'scholarships-info',
  REQUIREMENTS_INFO = 'requirements-info',
  CONTACT_INFO = 'contact-info',
  DETAIL_DISPLAY = 'detail-display',
  CONTACT_DECISION = 'contact-decision'
}

export class AdmissionFlow {
  private prospectService: ProspectServiceV2
  private contextManager: FlowContextManager

  constructor(
    contextManager: FlowContextManager,
    prospectService: ProspectServiceV2
  ) {
    this.contextManager = contextManager
    this.prospectService = prospectService
    console.log('📝 [ADMISSION-FLOW] Inicializado')
  }

  /**
   * ⏰ Manejar timeout en paso de decisión de contacto
   */
  async handleContactDecisionTimeout(userId: string): Promise<FlowResult> {
    const timeoutStartTime = Date.now()
    
    console.log(`\n⏰ [${userId}] ===== TIMEOUT EN DECISIÓN DE CONTACTO =====`)
    console.log(`🕒 [${userId}] Timestamp timeout: ${new Date().toISOString()}`)
    console.log(`📍 [${userId}] Paso donde ocurrió: CONTACT_DECISION`)
    
    try {
      // Obtener contexto actual
      let context = await this.contextManager.getContext(userId)
      
      if (!context || context.currentFlow !== 'admission') {
        context = await this.createAdmissionContext(userId, "")
      }
      const detailType = context.capturedData.last_detail_type || 'admision_general'
      const detailTitle = context.capturedData.last_detail_title || 'admisiones'
      
      console.log(`📋 [${userId}] Contexto de timeout:`, {
        detailType: detailType,
        detailTitle: detailTitle,
        lastActivity: context.sessionMetadata?.lastActivity || 'N/A'
      })
      
      // Guardar con tipo _timeout
      console.log(`💾 [${userId}] Guardando timeout con tipo: ${detailType}_timeout`)
      await this.saveUserData(context, `${detailType}_timeout`)

      const timeoutMessage = `⏰ **Tiempo de espera agotado**

📋 Hemos guardado tu consulta sobre **${detailTitle}**.

💾 Tus datos están **resguardados** para futuras referencias.

🔄 **Para nuevas consultas, escribe "hola" y comenzaremos una nueva conversación.**`

      const timeoutContext: FlowContext = {
        ...context,
        currentStep: 'timeout',
        isActive: false
      }

      const timeoutProcessTime = Date.now() - timeoutStartTime
      
      console.log(`✅ [${userId}] ===== TIMEOUT PROCESADO EXITOSAMENTE =====`)
      console.log(`⚡ [${userId}] Tiempo procesamiento timeout: ${timeoutProcessTime}ms`)
      console.log(`🏁 [${userId}] Sesión terminada por timeout - Usuario puede reiniciar con "hola"`)
      console.log(`⏰ [${userId}] ===== FIN TIMEOUT =====\n`)

      return {
        success: true,
        message: timeoutMessage,
        completed: true,
        context: timeoutContext,
        metrics: context.metrics,
        nextFlow: undefined
      }

    } catch (error) {
      const errorTime = Date.now() - timeoutStartTime
      console.error(`💥 [${userId}] ===== ERROR EN TIMEOUT =====`)
      console.error(`❌ [${userId}] Error después de ${errorTime}ms:`, error)
      console.error(`🔍 [${userId}] Error stack:`, error instanceof Error ? error.stack : 'No stack')
      console.error(`⏰ [${userId}] ===== FIN ERROR TIMEOUT =====\n`)
      return this.createErrorFlowResult(userId, error)
    }
  }

  /**
   * 🎯 Procesar mensaje en AdmissionFlow
   */
  async processMessage(userId: string, message: string): Promise<FlowResult> {
    const startTime = Date.now()
    
    try {
      console.log(`\n📝 [ADMISSION-FLOW] ===== PROCESANDO MENSAJE =====`)
      console.log(`👤 [${userId}] Input: "${message}"`)
      console.log(`⏰ [${userId}] Timestamp: ${new Date().toISOString()}`)
      console.log(`⚡ [${userId}] Iniciando procesamiento...`)

      // 🔍 Obtener contexto del FlowContextManager
      const contextStartTime = Date.now()
      let context = await this.contextManager.getContext(userId)
      
      if (!context || context.currentFlow !== 'admission') {
        context = await this.createAdmissionContext(userId, message)
      }
      
      const contextTime = Date.now() - contextStartTime
      
      console.log(`💾 [${userId}] Context recuperado en ${contextTime}ms`)
      console.log(`📊 [${userId}] Context actual:`, {
        currentStep: context.currentStep,
        isActive: context.isActive,
        currentFlow: context.currentFlow,
        lastDetailType: context.capturedData.last_detail_type || 'ninguno'
      })

      // Procesar según el paso actual
      let stepResult: StepResult
      const currentStep = context.currentStep as AdmissionStep
      
      console.log(`🔄 [${userId}] Procesando paso: ${currentStep}`)
      const stepStartTime = Date.now()
      
      switch (currentStep) {
        case AdmissionStep.MENU_DISPLAY:
          stepResult = await this.processMenuDisplay(context, message)
          break
          
        case AdmissionStep.DATES_INFO:
          stepResult = await this.processDatesInfo(context, message)
          break
          
        case AdmissionStep.PROCESS_INFO:
          stepResult = await this.processProcessInfo(context, message)
          break
          
        case AdmissionStep.SCHOLARSHIPS_INFO:
          stepResult = await this.processScholarshipsInfo(context, message)
          break
          
        case AdmissionStep.REQUIREMENTS_INFO:
          stepResult = await this.processRequirementsInfo(context, message)
          break
          
        case AdmissionStep.CONTACT_INFO:
          stepResult = await this.processContactInfo(context, message)
          break
          
        case AdmissionStep.DETAIL_DISPLAY:
          stepResult = await this.processDetailDisplay(context, message)
          break
          
        case AdmissionStep.CONTACT_DECISION:
          stepResult = await this.processContactDecision(context, message)
          break
          
        default:
          console.warn(`⚠️ [${userId}] Paso no reconocido: ${context.currentStep}`)
          stepResult = await this.processMenuDisplay(context, message)
      }
      
      const stepTime = Date.now() - stepStartTime
      console.log(`⚡ [${userId}] Paso ${currentStep} procesado en ${stepTime}ms`)
      
      // Log de transición si hay cambio de paso
      if (stepResult.nextStep && stepResult.nextStep !== currentStep) {
        console.log(`🔄 [${userId}] Transición: ${currentStep} → ${stepResult.nextStep}`)
      }

      // 📊 Actualizar context con resultado del paso
      if (stepResult.success && stepResult.nextStep) {
        context.currentStep = stepResult.nextStep
        context.lastMessage = message
        context.metrics.stepsCompleted++
        
        if (stepResult.data) {
          Object.assign(context.capturedData, stepResult.data)
        }
      }

      // 💾 Guardar context actualizado
      await this.contextManager.saveContext(context)

      // Construir resultado del flujo
      const flowResult: FlowResult = {
        success: stepResult.success,
        message: stepResult.message,
        completed: stepResult.completed || false,
        context: context,
        metrics: context.metrics,
        nextFlow: stepResult.nextFlow
      }

      const totalTime = Date.now() - startTime
      
      console.log(`✅ [${userId}] ===== ADMISSION FLOW COMPLETADO =====`)
      console.log(`🎯 [${userId}] Resultado:`, {
        success: flowResult.success,
        completed: flowResult.completed,
        nextFlow: flowResult.nextFlow,
        currentStep: context.currentStep,
        finalStep: stepResult.nextStep
      })
      console.log(`⚡ [${userId}] Tiempo total de procesamiento: ${totalTime}ms`)
      
      // Log específico según resultado
      if (flowResult.completed) {
        console.log(`🏁 [${userId}] FLUJO TERMINADO - Session cleanup requerido`)
      } else {
        console.log(`▶️ [${userId}] FLUJO CONTINÚA - Esperando siguiente input`)
      }
      console.log(`📝 [ADMISSION-FLOW] ===== FIN PROCESAMIENTO =====\n`)

      return flowResult

    } catch (error) {
      const errorTime = Date.now() - startTime
      console.error(`💥 [${userId}] ===== ERROR EN ADMISSION FLOW =====`)
      console.error(`❌ [${userId}] Error después de ${errorTime}ms:`, error)
      console.error(`🔍 [${userId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack available')
      console.error(`📝 [ADMISSION-FLOW] ===== FIN ERROR =====\n`)
      return this.createErrorFlowResult(userId, error)
    }
  }

  /**
   * 🏠 Mostrar menú principal de admisión
   */
  private async processMenuDisplay(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()
    console.log(`📝 [${context.userId}] Procesando opción de menú: "${option}"`)
    
    // Si es el primer mensaje "menu", mostrar el menú
    if (message === 'menu') {
      console.log(`📝 [${context.userId}] Mostrando menú principal de admisión`)
      const menuMessage = this.formatAdmissionMenu(context)
      
      return {
        success: true,
        message: menuMessage,
        completed: false,
        nextStep: AdmissionStep.MENU_DISPLAY
      }
    }
    
    // Procesar opciones del menú
    switch (option) {
      case '1':
        console.log(`📅 [${context.userId}] Opción 1 - Fechas importantes`)
        // Ejecutar inmediatamente processDatesInfo para generar el mensaje
        return await this.processDatesInfo(context, message)
        
      case '2':
        console.log(`📋 [${context.userId}] Opción 2 - Proceso de postulación`)
        // Ejecutar inmediatamente processProcessInfo para generar el mensaje
        return await this.processProcessInfo(context, message)
        
      case '3':
        console.log(`🎓 [${context.userId}] Opción 3 - Becas disponibles`)
        // Ejecutar inmediatamente processScholarshipsInfo para generar el mensaje
        return await this.processScholarshipsInfo(context, message)
        
      case '4':
        console.log(`📊 [${context.userId}] Opción 4 - Requisitos PAES`)
        // Ejecutar inmediatamente processRequirementsInfo para generar el mensaje
        return await this.processRequirementsInfo(context, message)
        
      case '5':
        console.log(`📞 [${context.userId}] Opción 5 - Contactar admisiones`)
        // Ejecutar inmediatamente processContactInfo para generar el mensaje
        return await this.processContactInfo(context, message)
        
      case '6':
        console.log(`🏠 [${context.userId}] Opción 6 - Volver al menú principal`)
        return {
          success: true,
          message: '🏠 Regresando al menú principal...',
          completed: true,
          nextFlow: 'main-menu'
        }
        
      default:
        console.log(`❌ [${context.userId}] Opción no válida: "${option}"`)
        const menuMessage = this.formatAdmissionMenu(context)
        return {
          success: true,
          message: `❌ Opción no válida. Por favor elige una opción del 1 al 6.\n\n${menuMessage}`,
          completed: false,
          nextStep: AdmissionStep.MENU_DISPLAY
        }
    }
  }

  /**
   * 📅 Procesar información de fechas
   */
  private async processDatesInfo(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()
    console.log(`📅 [${context.userId}] Procesando fechas, opción: ${option}`)

    // Si es la primera vez que se accede a fechas, mostrar el menú
    if (option === '1' || option === 'menu') {
      console.log(`📅 [${context.userId}] Mostrando menú de fechas importantes`)
      return {
        success: true,
        message: this.formatDatesMenu(),
        completed: false,
        nextStep: AdmissionStep.DATES_INFO
      }
    }

    switch (option) {
      case '1':
        // Ver más fechas del calendario → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'admision_calendario',
          'CALENDARIO ACADÉMICO PERSONALIZADO',
          [
            'Calendario académico completo 2025',
            'Fechas específicas para tu carrera de interés', 
            'Plazos de matrícula y documentación',
            'Cronograma de becas y financiamiento'
          ]
        )
        
      case '2':
        // Proceso de postulación
        context.currentStep = AdmissionStep.PROCESS_INFO
        return {
          success: true,
          message: this.formatProcessMenu(),
          completed: false,
          nextStep: AdmissionStep.PROCESS_INFO
        }
        
      case '3':
        // Información de becas
        context.currentStep = AdmissionStep.SCHOLARSHIPS_INFO
        return {
          success: true,
          message: this.formatScholarshipsMenu(),
          completed: false,
          nextStep: AdmissionStep.SCHOLARSHIPS_INFO
        }
        
      case '4':
        // Volver al menú admisión
        context.currentStep = AdmissionStep.MENU_DISPLAY
        return {
          success: true,
          message: this.formatAdmissionMenu(context),
          completed: false,
          nextStep: AdmissionStep.MENU_DISPLAY
        }
        
      default:
        return {
          success: false,
          message: `❌ Opción no válida. Por favor elige una opción del 1 al 4.\n\n${this.formatDatesMenu()}`,
          completed: false,
          nextStep: AdmissionStep.DATES_INFO
        }
    }
  }

  /**
   * 📋 Procesar información del proceso
   */
  private async processProcessInfo(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()
    console.log(`📋 [${context.userId}] Procesando proceso, opción: ${option}`)

    // Si es la primera vez que se accede a proceso, mostrar el menú
    if (option === '2' || option === 'menu') {
      console.log(`📋 [${context.userId}] Mostrando menú de proceso de postulación`)
      return {
        success: true,
        message: this.formatProcessMenu(),
        completed: false,
        nextStep: AdmissionStep.PROCESS_INFO
      }
    }

    switch (option) {
      case '1':
        // Ver requisitos detallados → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'admision_requisitos', 
          'EVALUACIÓN PERSONALIZADA DE REQUISITOS',
          [
            'Evaluar tu situación académica específica',
            'Confirmar documentos necesarios para tu caso',
            'Revisar alternativas si no cumples algún requisito',
            'Guiarte paso a paso en el proceso'
          ]
        )
        
      case '2':
        // Lista de documentos → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'admision_documentos',
          'ASISTENCIA PERSONALIZADA CON DOCUMENTOS', 
          [
            'Revisar checklist completo de documentos',
            'Ayudarte con documentos específicos faltantes',
            'Validar documentos internacionales (si aplica)',
            'Acelerar tu proceso de postulación'
          ]
        )
        
      case '3':
        // Hablar con admisiones → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'admision_general',
          'CONTACTO CON ADMISIONES',
          [
            'Proceso de postulación detallado',
            'Documentación específica', 
            'Plazos y fechas importantes',
            'Becas aplicables a tu situación'
          ]
        )
        
      case '4':
        // Volver al proceso
        return {
          success: true,
          message: this.formatProcessMenu(),
          completed: false,
          nextStep: AdmissionStep.PROCESS_INFO
        }
        
      default:
        return {
          success: false,
          message: `❌ Opción no válida. Por favor elige una opción del 1 al 4.\n\n${this.formatProcessMenu()}`,
          completed: false,
          nextStep: AdmissionStep.PROCESS_INFO
        }
    }
  }

  /**
   * 🎓 Procesar información de becas
   */
  private async processScholarshipsInfo(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()
    console.log(`🎓 [${context.userId}] Procesando becas, opción: ${option}`)

    // Si es la primera vez que se accede a becas, mostrar el menú
    if (option === '3' || option === 'menu') {
      console.log(`🎓 [${context.userId}] Mostrando menú de becas disponibles`)
      return {
        success: true,
        message: this.formatScholarshipsMenu(),
        completed: false,
        nextStep: AdmissionStep.SCHOLARSHIPS_INFO
      }
    }

    switch (option) {
      case '1':
        // Beca Talento → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'beca_talento',
          'EVALUACIÓN BECA TALENTO PERSONALIZADA',
          [
            'Evaluar tu perfil para Beca Talento (hasta 50%)',
            'Ayudarte con la carta de motivación',
            'Prepararte para la entrevista',
            'Revisar documentación necesaria'
          ]
        )
        
      case '2':
        // Beca Mérito → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'beca_merito',
          'EVALUACIÓN BECA MÉRITO ACADÉMICO',
          [
            'Verificar si calificas para Beca Mérito (25%)',
            'Revisar tu ranking de enseñanza media',
            'Documentación requerida específica',
            'Combinar con otras becas disponibles'
          ]
        )
        
      case '3':
        // Beca Regional → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'beca_regional',
          'EVALUACIÓN BECA APOYO REGIONAL',
          [
            'Confirmar si calificas para Beca Regional (20%)',
            'Documentación de residencia necesaria', 
            'Combinar con otras becas UNIACC',
            'Calcular tu descuento total'
          ]
        )
        
      case '4':
        // Todas las opciones → Navegación interna
        return {
          success: true,
          message: this.formatAllScholarshipsDetail(),
          completed: false,
          nextStep: AdmissionStep.SCHOLARSHIPS_INFO
        }
        
      case '5':
        // Hablar con financiamiento → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'financiamiento_especialista',
          'CONTACTO CON FINANCIAMIENTO',
          [
            'Evaluación de becas aplicables',
            'Opciones de financiamiento personalizadas',
            'Simulación de cuotas y pagos',
            'Documentación requerida para becas'
          ]
        )
        
      default:
        return {
          success: false,
          message: `❌ Opción no válida. Por favor elige una opción del 1 al 5.\n\n${this.formatScholarshipsMenu()}`,
          completed: false,
          nextStep: AdmissionStep.SCHOLARSHIPS_INFO
        }
    }
  }

  /**
   * 📊 Procesar información de requisitos
   */
  private async processRequirementsInfo(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()
    console.log(`📊 [${context.userId}] Procesando requisitos, opción: ${option}`)

    switch (option) {
      case '1':
        // Egresé de 4° medio → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'evaluacion_paes',
          'EVALUACIÓN ACADÉMICA EGRESADOS 4° MEDIO', 
          [
            'Revisar tu puntaje PAES específico',
            'Alternativas si no cumples el mínimo (485 pts)',
            'Preparación para nueva rendición PAES',
            'Orientación sobre carreras compatibles'
          ]
        )
        
      case '2':
        // Estudios universitarios → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'transferencia_universitaria',
          'EVALUACIÓN DE TRANSFERENCIA UNIVERSITARIA',
          [
            'Evaluar tu rendimiento académico (70% requerido)',
            'Revisar homologación de ramos',
            'Calcular semestres de convalidación', 
            'Acelerar tu proceso de admisión'
          ]
        )
        
      case '3':
        // Estudiante internacional → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'admision_internacional',
          'ADMISIÓN ESTUDIANTES INTERNACIONALES',
          [
            'Guiarte en validación de títulos en Chile',
            'Requisitos de certificación de español',
            'Documentación apostillada necesaria',
            'Proceso acelerado para extranjeros'
          ]
        )
        
      case '4':
        // No estoy seguro → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'orientacion_academica',
          'ORIENTACIÓN ACADÉMICA PERSONALIZADA',
          [
            'Evaluar tu situación educativa actual',
            'Determinar el mejor camino de admisión',
            'Revisar opciones disponibles para tu perfil',
            'Plan paso a paso personalizado'
          ]
        )
        
      case '5':
        // Hablar con admisiones → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'consulta_academica',
          'CONSULTA ACADÉMICA',
          [
            'Proceso de admisión completo',
            'Carreras disponibles y modalidades',
            'Becas y financiamiento',
            'Fechas y plazos importantes'
          ]
        )
        
      default:
        return {
          success: false,
          message: `❌ Opción no válida. Por favor elige una opción del 1 al 5.\n\n${this.formatRequirementsMenu()}`,
          completed: false,
          nextStep: AdmissionStep.REQUIREMENTS_INFO
        }
    }
  }

  /**
   * 📞 Procesar información de contacto
   */
  private async processContactInfo(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()
    console.log(`📞 [${context.userId}] Procesando contacto, opción: ${option}`)

    switch (option) {
      case '1':
        // Quiero que me contacten → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'contacto_admisiones',
          'SOLICITUD DE CONTACTO - ADMISIONES',
          [
            'Proceso de admisión completo',
            'Carreras disponibles y modalidades',
            'Becas y financiamiento',
            'Fechas y plazos importantes',
            'Documentación requerida'
          ]
        )
        
      case '2':
        // Callback telefónico → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'callback_admision',
          'LLAMADA PROGRAMADA',
          [
            'Recibirás llamada de UNIACC Admisiones',
            'Consulta personalizada por teléfono',
            'Resolución inmediata de dudas',
            'Seguimiento post-llamada'
          ]
        )
        
      case '3':
        // Chat online → Información + ASESOR eventual
        // Chat online → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'chat_online_admision',
          'CHAT ONLINE UNIACC',
          [
            'Página web: uniacc.cl',
            'Chat disponible esquina inferior derecha',
            'Horario: Lunes a viernes 9:00-18:00',
            'Respuesta inmediata para consultas básicas'
          ]
        )
        
      case '4':
        // Email → Información + ASESOR eventual
        // Email → DETALLE + PREGUNTA
        return this.createContactQuestionTransition(
          context,
          'email_admision',
          'CONSULTA POR EMAIL',
          [
            'Email: admision@uniacc.edu.cl',
            'Tiempo respuesta: 24-48 horas',
            'Incluye: Nombre completo, teléfono, carrera de interés',
            'Consulta específica detallada'
          ]
        )
        
      case '5':
        // Volver al menú principal
        return {
          success: true,
          message: "🏠 Regresando al menú principal...",
          completed: true,
          nextFlow: 'main-menu'
        }
        
      default:
        return {
          success: false,
          message: `❌ Opción no válida. Por favor elige una opción del 1 al 5.\n\n${this.formatContactMenu()}`,
          completed: false,
          nextStep: AdmissionStep.CONTACT_INFO
        }
    }
  }

  /**
   * 📋 Procesar mostrado de detalle (nuevo paso intermedio)
   */
  private async processDetailDisplay(context: FlowContext, message: string): Promise<StepResult> {
    // Este paso generalmente redirige directamente a CONTACT_DECISION
    // Pero podría usarse para manejar navegación adicional si es necesario
    console.log(`📋 [${context.userId}] Procesando detail display`)
    
    return {
      success: true,
      message: "Redirigiendo a decisión de contacto...",
      completed: false,
      nextStep: AdmissionStep.CONTACT_DECISION
    }
  }

  /**
   * 🤝 Procesar decisión de contacto (SÍ/NO/Timeout)
   */
  private async processContactDecision(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()
    const detailType = context.capturedData.last_detail_type || 'admision_general'
    
    console.log(`\n🤝 [${context.userId}] ===== DECISIÓN DE CONTACTO CRÍTICA =====`)
    console.log(`👤 [${context.userId}] Input del usuario: "${option}"`)
    console.log(`📋 [${context.userId}] Contexto de consulta: ${detailType}`)
    console.log(`🏷️ [${context.userId}] Título consulta: ${context.capturedData.last_detail_title || 'N/A'}`)

    switch (option) {
      case '1':
        // SÍ - Quiere contacto de asesor
        console.log(`✅ [${context.userId}] DECISIÓN: SÍ - Usuario quiere contacto de asesor`)
        console.log(`🔥 [${context.userId}] Generando tipo: ${detailType}_asesor`)
        return await this.createAdvisorRequestFromDecision(context, `${detailType}_asesor`)
        
      case '2':
        // NO - Solo quería información
        console.log(`📋 [${context.userId}] DECISIÓN: NO - Usuario solo quería información`)
        console.log(`📊 [${context.userId}] Generando tipo: ${detailType}_sin_asesor`)
        return await this.createNoContactResponse(context, `${detailType}_sin_asesor`)
        
      default:
        console.log(`❌ [${context.userId}] DECISIÓN: INVÁLIDA - Opción "${option}" no reconocida`)
        console.log(`⚠️ [${context.userId}] Opciones válidas: '1' (SÍ) o '2' (NO)`)
        return {
          success: false,
          message: `❌ Opción no válida. Por favor elige:\n\n1️⃣ **Sí, quiero que me contacten**\n2️⃣ **No, solo quería información**`,
          completed: false,
          nextStep: AdmissionStep.CONTACT_DECISION
        }
    }
  }

  /**
   * 👥 Crear solicitud de asesor desde decisión SÍ
   */
  private async createAdvisorRequestFromDecision(context: FlowContext, tipoConsulta: string): Promise<StepResult> {
    console.log(`👥 [${context.userId}] Usuario eligió SÍ - Creando solicitud asesor: ${tipoConsulta}`)

    try {
      // Guardar datos en BD con tipo _asesor
      await this.saveUserData(context, tipoConsulta)

      const message = `🎯 **¡Perfecto!**

📞 Un especialista en admisiones UNIACC te contactará **en las próximas 24 horas** para ayudarte con:

✅ ${context.capturedData.last_detail_title || 'Información especializada'}

💾 Tus datos han sido guardados exitosamente.

🔄 **Para nuevas consultas, escribe "hola" y comenzaremos una nueva conversación.**`

      return {
        success: true,
        message: message,
        completed: true, // ← TERMINA EL FLUJO
        nextFlow: undefined // ← TERMINA SESIÓN COMPLETAMENTE
      }

    } catch (error) {
      console.error(`💥 [${context.userId}] Error creando solicitud asesor:`, error)
      return {
        success: false,
        message: "❌ Error procesando solicitud. Por favor intenta nuevamente.",
        completed: false,
        nextStep: AdmissionStep.CONTACT_DECISION
      }
    }
  }

  /**
   * 📝 Crear respuesta para usuario que NO quiere contacto
   */
  private async createNoContactResponse(context: FlowContext, tipoConsulta: string): Promise<StepResult> {
    console.log(`📝 [${context.userId}] Usuario eligió NO - Guardando sin contacto: ${tipoConsulta}`)

    try {
      // Guardar datos en BD con tipo _sin_asesor
      await this.saveUserData(context, tipoConsulta)

      const message = `✅ **Información guardada**

📋 Hemos guardado tu consulta sobre **${context.capturedData.last_detail_title || 'admisiones'}**.

💾 Tus datos están **resguardados** para futuras referencias.

🔄 **Para nuevas consultas, escribe "hola" y comenzaremos una nueva conversación.**`

      return {
        success: true,
        message: message,
        completed: true, // ← TERMINA EL FLUJO
        nextFlow: undefined // ← TERMINA SESIÓN COMPLETAMENTE
      }

    } catch (error) {
      console.error(`💥 [${context.userId}] Error guardando respuesta no-contacto:`, error)
      return {
        success: false,
        message: "❌ Error guardando información. Por favor intenta nuevamente.",
        completed: false,
        nextStep: AdmissionStep.CONTACT_DECISION
      }
    }
  }

  /**
   * 🔄 Helper para crear transición a pregunta de contacto
   */
  private createContactQuestionTransition(
    context: FlowContext,
    detailType: string,
    title: string,
    services: string[]
  ): StepResult {
    // Guardar datos en contexto para usar en decisión
    context.capturedData.last_detail_type = detailType
    context.capturedData.last_detail_title = title
    context.capturedData.last_detail_services = services
    
    return {
      success: true,
      message: this.formatDetailWithContactQuestion(title, services),
      completed: false,
      nextStep: AdmissionStep.CONTACT_DECISION
    }
  }

  /**
   * 💾 Guardar datos del usuario en BD
   */
  private async saveUserData(context: FlowContext, tipoConsulta: string): Promise<void> {
    const nivelInteres = tipoConsulta.includes('_asesor') ? "alto" : 
                        tipoConsulta.includes('_timeout') ? "bajo" : "medio"
    
    const dataToSave = {
      whatsapp: context.userId,
      nombre: context.capturedData.nombre || "Prospecto",
      email: context.capturedData.email || "",
      telefono: context.capturedData.telefono || context.userId,
      source: "chat-demo",
      tipo_consulta: tipoConsulta,
      nivel_interes: nivelInteres,
      ultima_interaccion: new Date().toISOString()
    }

    console.log(`💾 [${context.userId}] ===== DATOS PARA BASE DE DATOS =====`)
    console.log(`📊 [${context.userId}] Datos para prospecto_actual:`, {
      whatsapp: dataToSave.whatsapp,
      tipo_consulta: dataToSave.tipo_consulta,
      nivel_interes: dataToSave.nivel_interes,
      ultima_interaccion: dataToSave.ultima_interaccion,
      detalle_consulta: context.capturedData.last_detail_title || 'N/A'
    })
    
    console.log(`📋 [${context.userId}] Datos para prospecto_historial:`, {
      paso: 'admission-contact-decision',
      flujo_origen: 'AdmissionFlow',
      datos_capturados: {
        detail_type: context.capturedData.last_detail_type,
        detail_title: context.capturedData.last_detail_title,
        user_decision: tipoConsulta.includes('_asesor') ? 'SI_contacto' : 
                      tipoConsulta.includes('_timeout') ? 'TIMEOUT' : 'NO_contacto'
      },
      timestamp: dataToSave.ultima_interaccion
    })

    try {
      const result = await this.prospectService.guardarProspecto(context.userId, dataToSave)
      
      console.log(`✅ [${context.userId}] ===== GUARDADO EXITOSO =====`)
      console.log(`🎯 [${context.userId}] Verificado en prospecto_actual: tipo_consulta=${tipoConsulta}`)
      console.log(`📈 [${context.userId}] Nivel de interés asignado: ${nivelInteres}`)
      console.log(`⏰ [${context.userId}] Timestamp guardado: ${dataToSave.ultima_interaccion}`)
      
      // Log específico según tipo de terminación
      if (tipoConsulta.includes('_asesor')) {
        console.log(`🔥 [${context.userId}] LEAD CALIENTE - Prioridad ALTA en dashboard`)
      } else if (tipoConsulta.includes('_timeout')) {
        console.log(`⏰ [${context.userId}] LEAD TIMEOUT - Prioridad BAJA, requiere nurturing`)
      } else {
        console.log(`📋 [${context.userId}] LEAD INFORMATIVO - Prioridad MEDIA, follow-up posterior`)
      }
      
    } catch (error) {
      console.error(`💥 [${context.userId}] ===== ERROR EN GUARDADO =====`)
      console.error(`❌ [${context.userId}] Error en prospecto_actual:`, error)
      console.error(`📊 [${context.userId}] Datos que fallaron:`, dataToSave)
      throw error
    }

    // Tracking de intereses con logs detallados
    if (!context.capturedData.intereses) {
      context.capturedData.intereses = []
    }
    context.capturedData.intereses.push('admision', tipoConsulta)
    
    console.log(`🏷️ [${context.userId}] Intereses actualizados:`, context.capturedData.intereses)
    console.log(`💾 [${context.userId}] ===== FIN GUARDADO BD =====\n`)
  }

  /**
   * 👥 Crear solicitud de asesor especializado
   */
  private async createAdvisorRequest(
    context: FlowContext, 
    tipoConsulta: string,
    titulo: string,
    servicios: string[],
    preferencia?: string
  ): Promise<StepResult> {
    console.log(`👥 [${context.userId}] Creando solicitud de asesor: ${tipoConsulta}`)

    try {
      // Actualizar datos en BD
      const dataToSave = {
        whatsapp: context.userId,
        nombre: context.capturedData.nombre || "Prospecto",
        email: context.capturedData.email || "",
        telefono: context.capturedData.telefono || context.userId,
        source: "chat-demo",
        tipo_consulta: tipoConsulta,
        nivel_interes: "alto",
        ultima_interaccion: new Date().toISOString(),
        ...(preferencia && { preferencia_contacto: preferencia })
      }

      await this.prospectService.guardarProspecto(context.userId, dataToSave)
      console.log(`✅ [${context.userId}] Datos guardados para solicitud de asesor`)

      // Tracking de intereses
      if (!context.capturedData.intereses) {
        context.capturedData.intereses = []
      }
      context.capturedData.intereses.push('admision', tipoConsulta)

      const message = this.formatAdvisorRequestMessage(titulo, servicios)

      return {
        success: true,
        message: message,
        completed: true, // ← TERMINA EL FLUJO
        nextFlow: undefined
      }

    } catch (error) {
      console.error(`💥 [${context.userId}] Error creando solicitud asesor:`, error)
      return {
        success: false,
        message: "❌ Error procesando solicitud. Por favor intenta nuevamente.",
        completed: false,
        nextStep: context.currentStep as AdmissionStep
      }
    }
  }

  // ==================== FORMATO DE MENSAJES ====================

  /**
   * 🏠 Menú principal de admisión
   */
  private formatAdmissionMenu(context: FlowContext): string {
    const userName = context.capturedData.nombre || "estudiante"
    
    return `📝 **INFORMACIÓN DE ADMISIÓN UNIACC 2025**

¡Hola ${userName}! 👋 Aquí tienes toda la información sobre admisión:

📅 **1. Fechas importantes 2025**
📋 **2. Proceso de postulación**  
🎓 **3. Becas disponibles**
📊 **4. Requisitos PAES/académicos**
📞 **5. Contactar admisiones**
🏠 **6. Volver al menú principal**

¿Qué información necesitas?`
  }

  /**
   * 📅 Menú de fechas importantes
   */
  private formatDatesMenu(): string {
    return `📅 **FECHAS IMPORTANTES 2025**

🎓 **Inicio de clases:** 10 de marzo
📝 **Inscripción de asignaturas:** 25-28 febrero  
👋 **Bienvenida estudiantes:** 6-7 marzo
⏰ **Última fecha Beca Talento:** 6 enero

¿Qué te interesa saber?
1. Ver más fechas del calendario
2. Proceso de postulación
3. Información de becas
4. Volver al menú admisión`
  }

  /**
   * 📋 Menú del proceso de postulación
   */
  private formatProcessMenu(): string {
    return `📋 **PROCESO DE POSTULACIÓN**

Sigue estos 6 pasos simples:

1️⃣ **Selecciona tu carrera** de interés
2️⃣ **Revisa requisitos** específicos  
3️⃣ **Prepara documentos** necesarios
4️⃣ **Postula online** en uniacc.cl
5️⃣ **Espera confirmación** de admisión
6️⃣ **Completa matrícula** y pago

¿Necesitas ayuda con algún paso?
1. Ver requisitos detallados
2. Lista de documentos
3. Hablar con admisiones
4. Volver al menú`
  }

  /**
   * 🎓 Menú de becas
   */
  private formatScholarshipsMenu(): string {
    return `🎓 **BECAS DISPONIBLES 2025**

🏆 **Beca Talento UNIACC**
   • Hasta 50% descuento
   • Por habilidades en tu área
   • ⏰ Hasta 6 enero 2025

📚 **Beca Mérito Académico** 
   • 25% descuento
   • Top 10% de promoción

🌍 **Beca Apoyo Regional**
   • 20% descuento  
   • Para estudiantes de regiones

💪 **Beca Apoyo UNIACC**
   • Hasta 40% descuento
   • Según programa elegido

¿Qué beca te interesa?
1. Más detalles Beca Talento
2. Requisitos Mérito Académico  
3. Info Beca Regional
4. Todas las opciones
5. Hablar con financiamiento`
  }

  /**
   * 🎓 Detalle de todas las becas
   */
  private formatAllScholarshipsDetail(): string {
    return `🎓 **TODAS LAS BECAS UNIACC 2025**

🏆 **BECA TALENTO (Hasta 50%)**
   • Habilidades y motivación área
   • Carta de motivación + entrevista
   • Hasta 6 enero 2025

📚 **BECA MÉRITO ACADÉMICO (25%)**
   • Top 10% promoción enseñanza media
   • Certificado de ranking
   • Todo el año

🌍 **BECA APOYO REGIONAL (20%)**
   • Estudiantes fuera RM
   • Certificado residencia
   • Permanente

💪 **BECA APOYO UNIACC (Hasta 40%)**
   • Variable por programa
   • Según periodo admisión
   • Consultar por carrera

🔄 **¿Qué quieres hacer ahora?**
1. Evaluar mi perfil para becas
2. Combinar varias becas
3. Simular descuentos
4. Hablar con financiamiento
5. Volver al menú admisión`
  }

  /**
   * 📊 Menú de requisitos
   */
  private formatRequirementsMenu(): string {
    return `📊 **REQUISITOS DE ADMISIÓN**

👨‍🎓 **PRIMER AÑO:**
   • PAES: ≥485 puntos promedio
   • Certificado notas enseñanza media
   • Licencia de enseñanza media

🎓 **CON ESTUDIOS UNIVERSITARIOS:**
   • 70% aprobación últimos 2 semestres
   • Certificado de notas universitarias
   • Concentración de notas

🌍 **ESTUDIANTES INTERNACIONALES:**
   • Títulos validados en Chile
   • Certificación de español (si aplica)

¿Cuál es tu situación?
1. Egresé de 4° medio
2. Tengo estudios universitarios
3. Soy estudiante internacional  
4. No estoy seguro
5. Hablar con admisiones`
  }

  /**
   * 📞 Menú de contacto
   */
  private formatContactMenu(): string {
    return `📞 **CONTACTO ADMISIONES**

📱 **Teléfono:** +56 2 2770 1700
📧 **Email:** admision@uniacc.edu.cl  
🕘 **Horario:** Lunes a viernes 9:00-18:00
📍 **Campus:** Av. Salvador 1200, Providencia
💬 **Chat online:** uniacc.cl

🎯 **¿Cómo prefieres contactarnos?**

1. ✅ Quiero que me contacten
2. 📱 Prefiero que me llamen
3. 💬 Usar chat online de UNIACC
4. 📧 Enviar consulta por email
5. 🏠 Volver al menú principal`
  }

  /**
   * 📋 Formatear detalle con pregunta de contacto
   */
  private formatDetailWithContactQuestion(titulo: string, servicios: string[]): string {
    const serviciosList = servicios.map(s => `✅ ${s}`).join('\n')
    
    return `📝 **${titulo}**
    
Un especialista puede ayudarte con:

${serviciosList}

🤝 **¿Te gustaría que un asesor te contacte para esto?**

1️⃣ **Sí, quiero que me contacten**
2️⃣ **No, solo quería información**`
  }

  /**
   * 👥 Mensaje de solicitud de asesor
   */
  private formatAdvisorRequestMessage(titulo: string, servicios: string[]): string {
    const serviciosList = servicios.map(s => `✅ ${s}`).join('\n')
    
    return `📝 **${titulo}**
    
🎯 Un especialista en admisiones te contactará en las próximas 24 horas para:

${serviciosList}

💾 Tus datos han sido guardados exitosamente.

🔄 Para continuar, escribe "hola" para comenzar una nueva conversación.`
  }

  // ==================== UTILIDADES ====================

  /**
   * 🏗️ Crear contexto para AdmissionFlow
   */
  private async createAdmissionContext(userId: string, message: string): Promise<FlowContext> {
    console.log(`📝 [${userId}] Creando context para AdmissionFlow`)
    
    const now = new Date()
    const context: FlowContext = {
      userId,
      sessionId: `admission_${Date.now()}`,
      currentFlow: 'admission',
      currentStep: AdmissionStep.MENU_DISPLAY,
      isActive: true,
      capturedData: {
        intereses: []
      },
      preferences: {
        skipPhone: false,
        allowMarketing: true,
        communicationStyle: 'professional',
        language: 'es',
        timezone: 'America/Santiago',
        responseSpeed: 'normal',
        detailLevel: 'detailed',
        channel: 'chat-demo'
      },
      sessionMetadata: {
        startTime: now,
        stepStartTime: now,
        lastActivity: now,
        totalSteps: 1,
        expectedSteps: 6,
        attemptsCurrentStep: 1,
        maxAttemptsPerStep: 3,
        isReturningUser: false,
        previousSessions: 0,
        completionPercentage: 17,
        source: 'chat-demo',
        platform: 'desktop',
        userAgent: 'ChatBot',
        intent: 'admission'
      },
      timeout: {
        warningTime: 10000,
        sessionTime: 20000,
        lastActivity: now,
        warningShown: false
      },
      validationErrors: [],
      metrics: {
        messagesExchanged: 1,
        avgResponseTime: 0,
        errorsCount: 0,
        stepDurations: {},
        conversionEvents: [],
        stepsCompleted: 1
      },
      needsSave: true,
      version: '1.0.0',
      metadata: {
        createdAt: now.toISOString(),
        flowType: 'admission',
        stepHistory: [AdmissionStep.MENU_DISPLAY]
      }
    }
    
    // Guardar context usando FlowContextManager
    await this.contextManager.saveContext(context)
    console.log(`📝 [${userId}] Context AdmissionFlow creado y guardado`)
    
    return context
  }

  /**
   * ❌ Crear resultado de error
   */
  private createErrorFlowResult(userId: string, error: any): FlowResult {
    const now = new Date()
    const errorContext: FlowContext = {
      userId,
      sessionId: `error_${Date.now()}`,
      currentFlow: 'admission',
      currentStep: 'error',
      isActive: false,
      capturedData: { intereses: [] },
      preferences: {
        skipPhone: false,
        allowMarketing: true,
        communicationStyle: 'professional',
        language: 'es',
        timezone: 'America/Santiago',
        responseSpeed: 'normal',
        detailLevel: 'detailed',
        channel: 'chat-demo'
      },
      sessionMetadata: {
        startTime: now,
        stepStartTime: now,
        lastActivity: now,
        totalSteps: 1,
        expectedSteps: 1,
        attemptsCurrentStep: 1,
        maxAttemptsPerStep: 3,
        isReturningUser: false,
        previousSessions: 0,
        completionPercentage: 0,
        source: 'chat-demo',
        platform: 'desktop',
        userAgent: 'ChatBot',
        intent: 'error'
      },
      timeout: {
        warningTime: 10000,
        sessionTime: 20000,
        lastActivity: now,
        warningShown: false
      },
      validationErrors: [{
        field: 'general',
        message: error instanceof Error ? error.message : String(error),
        code: 'ADMISSION_FLOW_ERROR',
        timestamp: now,
        attempt: 1
      }],
      metrics: {
        messagesExchanged: 1,
        avgResponseTime: 0,
        errorsCount: 1,
        stepDurations: {},
        conversionEvents: [],
        stepsCompleted: 0
      },
      needsSave: false,
      version: '1.0.0',
      metadata: {
        createdAt: now.toISOString(),
        flowType: 'admission',
        stepHistory: ['error'],
        errorDetails: error instanceof Error ? error.message : String(error)
      }
    }

    return {
      success: false,
      message: "❌ Ha ocurrido un error. Por favor intenta nuevamente o contacta a admisiones directamente.",
      completed: false,
      context: errorContext,
      metrics: errorContext.metrics,
      nextFlow: 'main-menu'
    }
  }
}
