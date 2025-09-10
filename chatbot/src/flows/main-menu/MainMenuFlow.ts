/**
 * 🏠 MainMenuFlow - Menú Principal Post-Captura
 * 
 * Flujo que se activa después de la captura inicial completa.
 * Mantiene el engagement y dirige hacia conversión.
 * 
 * Características:
 * - Menú contextual basado en datos capturados
 * - Tracking de intereses para asesor
 * - Push inteligente hacia conversión
 * - Mantiene sesión activa
 * 
 * @author UNIACC ChatBot Team
 * @version 2.0 - FlowContext Enhanced
 */

import { 
  FlowContext, 
  FlowResult, 
  StepResult, 
  FlowType,
  ContactPreferenceType
} from '../core/FlowContext'
import { FlowContextManager } from '../core/FlowContextManager'
import { ValidationService } from '../../services/validation-service'
import { MessageFormatterService } from '../../services/message-formatter'
import { ProspectServiceV2 } from '../../services/prospect-service-v2'
import { FACULTADES_UNIACC, getFacultadById, BECAS_UNIACC } from '../../data/programas-uniacc'
import { RESPUESTAS } from '../../data/respuestas-predefinidas'

// 🏠 Enum de pasos para MainMenu
export enum MainMenuStep {
  WELCOME = 'main-menu-welcome',
  MENU_DISPLAY = 'menu-display',
  OPTION_PROCESSING = 'option-processing',
  INTEREST_CAPTURE = 'interest-capture',
  FACULTY_SELECTION = 'faculty-selection',
  CAREER_SELECTION = 'career-selection', 
  CAREER_DETAIL = 'career-detail',
  CAREER_HANDOFF = 'career-handoff',
  HANDOFF_DECISION = 'handoff-decision'
}

// 📊 Opciones del menú principal
export enum MenuOption {
  CAREERS = 'careers',
  ADMISSION = 'admission', 
  ADVISOR = 'advisor',
  CAMPUS = 'campus',
  FINANCING = 'financing',
  OTHER = 'other'
}

export class MainMenuFlow {
  
  constructor(
    private readonly contextManager: FlowContextManager,
    private readonly validationService: ValidationService,
    private readonly messageFormatter: MessageFormatterService,
    private readonly prospectService: ProspectServiceV2
  ) {
    console.log('🏠 [MAIN-MENU-FLOW] Inicializado')
  }

  /**
   * 🎯 Procesar mensaje en el MainMenu
   */
  async processMessage(userId: string, message: string): Promise<FlowResult> {
    try {
      console.log(`🏠 [${userId}] Procesando en MainMenu: "${message}"`)

      // 1. 🔍 Obtener o crear context para MainMenu
      let context = await this.contextManager.getContext(userId)
      
      if (!context || context.currentFlow !== FlowType.MAIN_MENU) {
        context = await this.createMainMenuContext(userId, message)
      }

      // 2. 🎯 Procesar según el paso actual
      const stepResult = await this.processCurrentStep(context, message)

      // 3. 📊 Actualizar context con resultado del paso
      if (stepResult.success && stepResult.nextStep) {
        context.currentStep = stepResult.nextStep
        context.lastMessage = message
        context.metrics.stepsCompleted++
        
        if (stepResult.data) {
          // Agregar intereses capturados
          if (!context.capturedData.intereses) {
            context.capturedData.intereses = []
          }
          context.capturedData.intereses.push(stepResult.data)
        }
      }

      // 4. 💾 Guardar context actualizado
      await this.contextManager.saveContext(context)

      // 5. 📊 Determinar si necesita handoff o continúa
      const flowResult: FlowResult = {
        success: stepResult.success,
        message: stepResult.message,
        completed: stepResult.completed || false,
        context: context,
        metrics: context.metrics,
        nextFlow: stepResult.nextFlow
      }

      console.log(`🏠 [${userId}] ===== MAINMENU FLOW RESULT =====`)
      console.log(`✅ [${userId}] Success: ${flowResult.success}`)
      console.log(`🔚 [${userId}] Completed: ${flowResult.completed}`)
      console.log(`🎯 [${userId}] NextFlow: ${flowResult.nextFlow}`)
      console.log(`📝 [${userId}] Current Step: ${context.currentStep}`)
      console.log(`🏠 [${userId}] ===== RETORNANDO AL CHATSERVICE =====`)

      console.log(`🏠 [${userId}] Resultado MainMenu:`, {
        step: context.currentStep,
        success: stepResult.success,
        nextFlow: stepResult.nextFlow
      })

      return flowResult

    } catch (error) {
      console.error(`❌ [${userId}] Error en MainMenuFlow:`, error)
      return this.createErrorFlowResult(userId, error)
    }
  }

  /**
   * 🏗️ Crear context para MainMenu
   */
  private async createMainMenuContext(userId: string, message: string): Promise<FlowContext> {
    console.log(`🏠 [${userId}] Creando context para MainMenu`)

    // 🔍 Detectar fuente
    const source = this.detectSource(userId)

    // 💾 Obtener datos del prospecto desde la base de datos
    let prospectoData = null
    try {
      const prospectoResult = await this.prospectService.reconocerProspecto(userId)
      if (prospectoResult.success && prospectoResult.data) {
        const prospecto = prospectoResult.data
        // 🎯 Mapeo explícito y seguro de ProspectoData -> CapturedProspectData
        prospectoData = {
          // 👤 Información Personal
          nombre: prospecto.nombre || undefined,                                    // string -> string | undefined
          email: prospecto.email || undefined,                                      // string | null -> string | undefined
          telefono: prospecto.telefono || undefined,                                // string | null -> string | undefined
          telefono_confirmado: prospecto.telefono_confirmado || false,              // boolean | undefined -> boolean
          
          // 📍 Información Demográfica
          edad: prospecto.edad || undefined,                                        // number | undefined -> number | undefined
          region: prospecto.region || undefined,                                    // string | undefined -> string | undefined
          
          // 🎓 Información Académica
          carrera_interes: prospecto.carrera_interes || undefined,                  // string | undefined -> string | undefined
          facultad_interes: prospecto.facultad_interes || undefined,                // string | undefined -> string | undefined
          nivel_interes: prospecto.nivel_interes || undefined,                      // string | undefined -> string | undefined
          
          // 📞 Preferencias de Contacto (cast explícito)
          preferencia_contacto: (prospecto.preferencia_contacto as ContactPreferenceType) || undefined
        }
        console.log(`🏠 [${userId}] Datos del prospecto cargados: ${prospecto.nombre}`)
      }
    } catch (error) {
      console.warn(`⚠️ [${userId}] Error cargando datos del prospecto:`, error)
    }

    const context: FlowContext = {
      userId,
      sessionId: `mainmenu_${Date.now()}`,
      currentFlow: FlowType.MAIN_MENU,
      currentStep: MainMenuStep.WELCOME,
      capturedData: {
        // ✅ Usar datos del prospecto si existen
        ...(prospectoData || {}),
        // Agregar campos específicos de MainMenu
        intereses: [], // Array de intereses capturados
        menu_interactions: 0,
        last_menu_option: undefined
      },
      preferences: {
        skipPhone: false,
        allowMarketing: true,
        communicationStyle: 'professional',
        language: 'es',
        timezone: 'America/Santiago',
        responseSpeed: 'normal',
        detailLevel: 'detailed',
        channel: source
      },
      sessionMetadata: {
        startTime: new Date(),
        stepStartTime: new Date(),
        lastActivity: new Date(),
        totalSteps: 0,
        expectedSteps: 3, // welcome → menu → choice
        attemptsCurrentStep: 0,
        maxAttemptsPerStep: 3,
        isReturningUser: true, // MainMenu implica que ya completó captura
        previousSessions: 1,
        completionPercentage: 100, // Ya completó captura inicial
        source,
        platform: 'desktop',
        intent: 'post_capture_engagement'
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
        warningTime: 480000,   // 8 minutos warning (más tiempo en menú)
        sessionTime: 600000,   // 10 minutos total
        lastActivity: new Date(),
        warningShown: false
      },
      
      // 🔄 Estado Interno
      isActive: true,
      needsSave: true,
      version: '2.0',
      
      // 🗃️ Datos Adicionales
      metadata: {
        flowType: 'main-menu',
        priority: 'medium',
        engagement_stage: 'post_capture'
      }
    }

    return context
  }

  /**
   * 🎯 Procesar paso actual del flujo
   */
  private async processCurrentStep(context: FlowContext, message: string): Promise<StepResult> {
    const currentStep = context.currentStep as MainMenuStep

    switch (currentStep) {
      case MainMenuStep.WELCOME:
        return await this.processWelcome(context, message)
      
      case MainMenuStep.MENU_DISPLAY:
        return await this.processMenuDisplay(context, message)
      
      case MainMenuStep.OPTION_PROCESSING:
        return await this.processOptionSelection(context, message)
      
      case MainMenuStep.INTEREST_CAPTURE:
        return await this.processInterestCapture(context, message)
      
      case MainMenuStep.HANDOFF_DECISION:
        return await this.processHandoffDecision(context, message)
      
      case MainMenuStep.FACULTY_SELECTION:
        return await this.processFacultySelection(context, message)
      
      case MainMenuStep.CAREER_SELECTION:
        return await this.processCareerSelection(context, message)
      
      case MainMenuStep.CAREER_DETAIL:
        return await this.processCareerDetail(context, message)
      
      case MainMenuStep.CAREER_HANDOFF:
        return await this.processCareerHandoff(context, message)
      
      default:
        console.warn(`⚠️ [${context.userId}] Paso desconocido en MainMenu: ${currentStep}`)
        return {
          success: false,
          message: '❌ Error interno en menú principal',
          nextStep: MainMenuStep.WELCOME,
          completed: false
        }
    }
  }

  /**
   * 👋 Procesar bienvenida personalizada
   */
  private async processWelcome(context: FlowContext, message: string): Promise<StepResult> {
    console.log(`🏠 [${context.userId}] Procesando welcome`)

    // Obtener nombre si existe de sesión anterior
    const userName = context.capturedData.nombre || 'Usuario'

    return {
      success: true,
      message: this.formatWelcomeMessage(userName),
      nextStep: MainMenuStep.MENU_DISPLAY,
      completed: false
    }
  }

  /**
   * 📋 Mostrar menú principal
   */
  private async processMenuDisplay(context: FlowContext, message: string): Promise<StepResult> {
    console.log(`🏠 [${context.userId}] En menu display, mensaje: "${message}"`)

    // 🎯 Si el mensaje es una opción numérica (1-6), procesarla directamente
    const option = message.trim()
    if (['1', '2', '3', '4', '5', '6'].includes(option)) {
      console.log(`🏠 [${context.userId}] Procesando opción: ${option}`)
      return await this.processOptionSelection(context, message)
    }

    // 📋 Si no es una opción válida, mostrar menú
    console.log(`🏠 [${context.userId}] Mostrando menú principal`)
    return {
      success: true,
      message: this.formatMainMenu(context),
      nextStep: MainMenuStep.OPTION_PROCESSING,
      completed: false
    }
  }

  /**
   * ⚡ Procesar selección de opción
   */
  private async processOptionSelection(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()
    
    // Incrementar interacciones con menú
    context.capturedData.menu_interactions = (context.capturedData.menu_interactions || 0) + 1

    switch (option) {
      case '1':
        return await this.handleCareersInterest(context)
      case '2':
        return await this.handleAdmissionInterest(context)
      case '3':
        return await this.handleFinancingInterest(context)
      case '4':
        return await this.handleCampusInterest(context)
      case '5':
        return await this.handleAdvisorRequest(context)
      case '6':
        return await this.handleDirectCareerChoice(context)
      default:
        return this.handleInvalidOption(context)
    }
  }

  /**
   * 📚 Manejar interés en carreras
   */
  private async handleCareersInterest(context: FlowContext): Promise<StepResult> {
    await this.trackInterest(context, 'careers', 'Información de carreras')

    // 🎯 Generar lista de facultades dinámicamente
    const facultadesList = Object.values(FACULTADES_UNIACC)
      .map((facultad, index) => `${index + 1}️⃣ ${facultad.emoji} **${facultad.nombre}**`)
      .join('\n')

    return {
      success: true,
      message: `📚 **¡Excelente elección!**

Te ayudo con información de nuestras carreras por facultad:

${facultadesList}

💡 **Selecciona el número de la facultad que te interesa**`,
      nextStep: MainMenuStep.FACULTY_SELECTION,
      completed: false,
      data: { interest_type: 'careers', timestamp: new Date() }
    }
  }

  /**
   * 📝 Manejar interés en admisión - Redireccionar a AdmissionFlow
   */
  private async handleAdmissionInterest(context: FlowContext): Promise<StepResult> {
    await this.trackInterest(context, 'admission', 'Proceso de admisión')

    console.log(`📝 [${context.userId}] Redirigiendo a AdmissionFlow`)

    return {
      success: true,
      message: `📝 **Información de Admisión UNIACC 2025**

¡Perfecto! Te voy a conectar con nuestro sistema especializado de admisiones...`,
      nextStep: MainMenuStep.MENU_DISPLAY,
      completed: true, // ← Completa MainMenu
      nextFlow: 'admission', // ← Redirige a AdmissionFlow
      data: { interest_type: 'admission', timestamp: new Date() }
    }
  }

  /**
   * 🚀 Manejar elección directa de carrera
   */
  private async handleDirectCareerChoice(context: FlowContext): Promise<StepResult> {
    await this.trackInterest(context, 'direct_career_choice', 'Usuario ya sabe qué carrera quiere')
    
    return {
      success: true,
      message: `🚀 **¡Excelente decisión!**

Ya sabes qué quieres estudiar. Te conectaré directamente con un asesor académico especializado para:

✅ **Confirmar tu carrera de interés**
✅ **Proceso de matrícula express** 
✅ **Verificar cupos disponibles**
✅ **Aplicar becas y descuentos**
✅ **Coordinar inicio de clases**

🎯 **Un asesor se contactará contigo en los próximos 15 minutos**

📱 ¿Confirmas tu número de teléfono: ${context.capturedData.telefono}?`,
      nextStep: MainMenuStep.HANDOFF_DECISION,
      completed: false,
      nextFlow: 'advisor-request'
    }
  }

  /**
   * 🎓 Manejar solicitud de asesor (handoff directo)
   */
  private async handleAdvisorRequest(context: FlowContext): Promise<StepResult> {
    await this.trackInterest(context, 'advisor', 'Solicitud de asesor académico')

    // 💾 Guardar prospecto con tipo_consulta correcto
    try {
      await this.prospectService.guardarProspecto(context.userId, {
        whatsapp: context.userId,
        nombre: context.capturedData.nombre || 'Usuario',
        email: context.capturedData.email || null,
        telefono: context.capturedData.telefono || null,
        carrera_interes: context.capturedData.carrera_interes || 'Sin especificar',
        facultad_interes: context.capturedData.facultad_interes || '',
        nivel_interes: 'alto',
        tipo_consulta: 'solicitud_asesor', // ✅ ESTE ES EL VALOR CORRECTO
        source: context.sessionMetadata.source || 'chat-demo',
        datos_adicionales: {
          flujo_origen: 'main_menu_advisor_request',
          timestamp: new Date()
        }
      })
      console.log(`🎓 [${context.userId}] Solicitud de asesor guardada con tipo_consulta='solicitud_asesor'`)
    } catch (error) {
      console.error(`❌ [${context.userId}] Error guardando solicitud de asesor:`, error)
    }

    // 🔄 Finalizar sesión y preparar para nuevo contacto
    context.isActive = false
    context.needsSave = true

    const advisorResponse = {
      success: true,
      message: `🎓 **¡Perfecto!** En 24 horas te contactarán.

📞 **Un asesor especializado se comunicará contigo.**

📱 Te llamaremos al número: **${context.capturedData.telefono}**

💡 **Presiona "Hola" para volver a consultar**

¡Gracias por elegir UNIACC! 🎓✨`,
      nextStep: MainMenuStep.HANDOFF_DECISION,
      completed: true, // ✅ Marcar como completado para cerrar sesión
      nextFlow: undefined, // No hay siguiente flujo, sesión terminada
      data: { interest_type: 'advisor', timestamp: new Date(), priority: 'high', session_closed: true }
    }

    console.log(`🎓 [${context.userId}] ===== ADVISOR REQUEST RESPONSE =====`)
    console.log(`✅ [${context.userId}] Completed: ${advisorResponse.completed}`)
    console.log(`🔚 [${context.userId}] NextFlow: ${advisorResponse.nextFlow}`)
    console.log(`📊 [${context.userId}] Data:`, advisorResponse.data)
    console.log(`🎓 [${context.userId}] ===== RETORNANDO RESPUESTA FINAL =====`)

    return advisorResponse
  }

  /**
   * 📍 Manejar interés en campus
   */
  private async handleCampusInterest(context: FlowContext): Promise<StepResult> {
    await this.trackInterest(context, 'campus', 'Información de campus y modalidades')

    return {
      success: true,
      message: `📍 **Campus y Modalidades UNIACC**

🏢 **Campus disponibles:**
• Santiago Centro
• Providencia  
• Las Condes

💻 **Modalidades:**
• Presencial
• Online
• Híbrida (presencial + online)

🕐 **Horarios:**
• Diurno: 8:00 - 18:00
• Vespertino: 19:00 - 22:30
• Sábados: 8:00 - 14:00

🎯 **¿Te interesa conocer más detalles?**

1️⃣ Ubicaciones y transporte
2️⃣ Modalidad online  
3️⃣ Hablar con asesor
4️⃣ Volver al menú`,
      nextStep: MainMenuStep.INTEREST_CAPTURE,
      completed: false,
      data: { interest_type: 'campus', timestamp: new Date() }
    }
  }

  /**
   * 💰 Manejar interés en financiamiento
   */
  private async handleFinancingInterest(context: FlowContext): Promise<StepResult> {
    await this.trackInterest(context, 'financing', 'Aranceles y financiamiento')

    return {
      success: true,
      message: `💰 **Aranceles y Financiamiento**

💳 **Opciones de pago:**
• Contado (descuento 15%)
• Cuotas sin interés
• Financiamiento bancario
• Becas institucionales

🎓 **Rango de aranceles 2025:**
• Negocios y Tecnología: $11.5M - $12M
• Ciencias Jurídicas: $13.5M - $14M  
• Comunicaciones: $13.5M - $14.5M
• Artes: $15.5M - $16M
• Arquitectura: $14.8M - $16.5M

💡 **¿Sabías que el 70% de nuestros estudiantes accede a algún tipo de beca?**

🎯 **¿Te ayudo con algo específico?**

1️⃣ Calcular mi beca
2️⃣ Opciones de financiamiento
3️⃣ Hablar con asesor financiero  
4️⃣ Volver al menú`,
      nextStep: MainMenuStep.HANDOFF_DECISION,
      completed: false,
      data: { interest_type: 'financing', timestamp: new Date() }
    }
  }

  /**
   * ❌ Manejar opción inválida
   */
  private handleInvalidOption(context: FlowContext): StepResult {
    return {
      success: false,
      message: `❌ **Opción no válida**

Por favor, elige una opción del **1 al 5**:

${this.formatMainMenu(context)}`,
      nextStep: MainMenuStep.OPTION_PROCESSING,
      completed: false
    }
  }

  /**
   * 🎯 Procesar captura de interés específico
   */
  private async processInterestCapture(context: FlowContext, message: string): Promise<StepResult> {
    // Este método maneja sub-opciones específicas
    const lastInterest = context.capturedData.intereses?.[context.capturedData.intereses.length - 1]
    
    if (lastInterest?.interest_type === 'careers') {
      return await this.handleCareerSpecific(context, message)
    }
    
    if (lastInterest?.interest_type === 'campus') {
      return await this.handleCampusSpecific(context, message)
    }

    // Por defecto, volver al menú
    return {
      success: true,
      message: this.formatMainMenu(context),
      nextStep: MainMenuStep.OPTION_PROCESSING,
      completed: false
    }
  }

  /**
   * 📚 Manejar carrera específica
   */
  private async handleCareerSpecific(context: FlowContext, message: string): Promise<StepResult> {
    const area = message.trim()
    
    // Mapeo de opciones a facultades reales de UNIACC
    const facultadesByOption: Record<string, string> = {
      '1': 'artes',
      '2': 'comunicaciones', 
      '3': 'arquitectura_diseno',
      '4': 'ciencias_juridicas',
      '5': 'negocios_tecnologia'
    }
    
    const facultadId = facultadesByOption[area]
    const facultad = facultadId ? getFacultadById(facultadId) : null
    
    if (facultad && facultad.carreras.length > 0) {
      await this.trackInterest(context, 'specific_career_area', `Facultad: ${facultad.nombre}`)
      
      // Formatear carreras con información real
      const carrerasInfo = facultad.carreras.map((carrera, index) => {
        const destacado = carrera.destacado ? ' 🏆' : ''
        const modalidad = carrera.modalidad.includes('/') ? 
          ` (${carrera.modalidad})` : 
          ` (${carrera.modalidad})`
        return `${index + 1}️⃣ **${carrera.nombre}**${destacado}${modalidad}`
      }).join('\n')
      
      return {
        success: true,
        message: `${facultad.emoji} **${facultad.nombre}**

${carrerasInfo}

💡 **¿Te interesa información detallada de alguna carrera?**

🎓 **O hablar con un asesor académico especializado**

1️⃣ Información detallada de carrera
2️⃣ Hablar con asesor especializado
3️⃣ Volver al menú principal`,
        nextStep: MainMenuStep.HANDOFF_DECISION,
        completed: false,
        data: { 
          career_area: area, 
          facultad: facultad.nombre,
          carreras_shown: facultad.carreras.map(c => c.nombre)
        }
      }
    }

    // Si es texto libre (nombre de carrera)
    await this.trackInterest(context, 'specific_career', message)
    
    return {
      success: true,
      message: `🔍 **"${message}"** - ¡Excelente elección!

Para brindarte información precisa y actualizada sobre esta carrera:

🎓 **Te recomiendo hablar con un asesor académico especializado**

✅ Información completa del programa
✅ Campo laboral y oportunidades  
✅ Malla curricular detallada
✅ Prácticas profesionales

1️⃣ Contactar asesor especializado
2️⃣ Información general
3️⃣ Volver al menú`,
      nextStep: MainMenuStep.HANDOFF_DECISION,
      completed: false,
      data: { specific_career: message }
    }
  }

  /**
   * 📍 Manejar campus específico  
   */
  private async handleCampusSpecific(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()

    switch (option) {
      case '1':
        return {
          success: true,
          message: `📍 **Ubicaciones y Transporte**

🏢 **Santiago Centro:**
• Dirección: Av. Salvador 1200
• Metro: República (L1)
• Buses: Multiple líneas

🏢 **Providencia:**  
• Dirección: Av. Providencia 1234
• Metro: Los Leones (L1)
• Estacionamiento disponible

🏢 **Las Condes:**
• Dirección: Av. Apoquindo 3000  
• Metro: El Golf (L1)
• Mall cercano

🎯 **¿Te gustaría agendar una visita?**

1️⃣ Agendar visita guiada
2️⃣ Más información
3️⃣ Volver al menú`,
          nextStep: MainMenuStep.HANDOFF_DECISION,
          completed: false
        }

      case '2':
        return {
          success: true,
          message: `💻 **Modalidad Online UNIACC**

🌐 **Plataforma de vanguardia:**
• Clases en vivo interactivas
• Grabaciones disponibles 24/7
• Campus virtual intuitivo
• Soporte técnico permanente

👨‍🏫 **Metodología:**
• Profesores especializados en educación online
• Clases participativas y dinámicas
• Evaluaciones online y presenciales
• Trabajo colaborativo virtual

🎓 **Mismo título que modalidad presencial**

1️⃣ Demo de plataforma
2️⃣ Hablar con asesor online
3️⃣ Volver al menú`,
          nextStep: MainMenuStep.HANDOFF_DECISION,
          completed: false
        }

      case '3':
        return {
          success: true,
          message: `🎓 **¡Perfecto!** Te conectamos con un asesor.`,
          nextStep: MainMenuStep.HANDOFF_DECISION,
          completed: true,
          nextFlow: 'advisor-request'
        }

      default:
        return {
          success: true,
          message: this.formatMainMenu(context),
          nextStep: MainMenuStep.OPTION_PROCESSING,
          completed: false
        }
    }
  }

  /**
   * 🤝 Procesar decisión de handoff
   */
  private async processHandoffDecision(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()

    if (option === '1' || option.toLowerCase().includes('asesor') || option.toLowerCase().includes('contactar')) {
      // Guardar todos los intereses capturados
      await this.saveFinalInterests(context)
      
      return {
        success: true,
        message: `🎓 **¡Excelente!** 

Hemos registrado tus intereses y un asesor académico especializado te contactará pronto.

📋 **Resumen de tu consulta:**
${this.formatInterestSummary(context)}

⏰ **Tiempo estimado: 2 horas**

¡Gracias por tu interés en UNIACC! 🎉`,
        nextStep: MainMenuStep.HANDOFF_DECISION,
        completed: true,
        nextFlow: 'advisor-request'
      }
    }

    // Continuar en el menú
    return {
      success: true,
      message: this.formatMainMenu(context),
      nextStep: MainMenuStep.OPTION_PROCESSING,
      completed: false
    }
  }

  // 🎨 MÉTODOS DE FORMATEO

  private formatWelcomeMessage(userName: string): string {
    const nombre = userName && userName !== 'Usuario' ? userName : 'Usuario'
    return `🎉 **¡Hola ${nombre}!** 

✅ Tu información ya está registrada en UNIACC.

🎯 **¿En qué más puedo ayudarte hoy?**

1️⃣ **Conocer nuestras carreras**
2️⃣ **Proceso de admisión 2025**  
3️⃣ **Costos y becas**
4️⃣ **Modalidades de estudio**
5️⃣ **Hablar con un asesor**
6️⃣ **🚀 Ya sé qué carrera quiero**

Escribe el número de tu opción 📝`
  }

  private formatMainMenu(context: FlowContext): string {
    return `🏠 **Menú Principal UNIACC**

¿Qué te interesa conocer?

1️⃣ 📚 **Carreras y programas**
2️⃣ 📝 **Admisión y becas**  
3️⃣ 🎓 **Hablar con asesor académico**
4️⃣ 📍 **Campus y modalidades**
5️⃣ 💰 **Aranceles y financiamiento**

💡 **Escribe el número de tu opción**`
  }

  private formatInterestSummary(context: FlowContext): string {
    const interests = context.capturedData.intereses || []
    return interests
      .map(interest => `• ${interest.description || interest.interest_type}`)
      .join('\n') || '• Información general'
  }

  // 🛠️ MÉTODOS UTILITARIOS

  private async trackInterest(context: FlowContext, type: string, description: string): Promise<void> {
    try {
      const interestData = {
        interest_type: type,
        description,
        timestamp: new Date(),
        session_id: context.sessionId
      }

      // Guardar en progressive tracking
      const userState = this.convertContextToUserState(context)
      await this.prospectService.saveProgressiveStep(
        context.userId,
        'interest-tracking',
        interestData,
        userState
      )

      console.log(`📊 [${context.userId}] Interés registrado: ${type} - ${description}`)
    } catch (error) {
      console.error(`❌ [${context.userId}] Error tracking interest:`, error)
    }
  }

  private async saveFinalInterests(context: FlowContext): Promise<void> {
    try {
      const interestSummary = {
        total_interests: context.capturedData.intereses?.length || 0,
        menu_interactions: context.capturedData.menu_interactions || 0,
        interests_detail: context.capturedData.intereses,
        engagement_score: this.calculateEngagementScore(context)
      }

      // Actualizar prospecto con intereses (PRESERVANDO facultad y carrera)
      await this.prospectService.guardarProspecto(context.userId, {
        whatsapp: context.userId,
        nombre: context.capturedData.nombre || 'Usuario',
        email: context.capturedData.email || null,
        telefono: context.capturedData.telefono || null,
        facultad_interes: context.capturedData.facultad_interes || undefined,
        carrera_interes: context.capturedData.carrera_interes || undefined,
        source: context.sessionMetadata.source || 'unknown',
        nivel_interes: 'alto', // MainMenu engagement = alto interés
        tipo_consulta: 'post_capture_engagement',
        datos_adicionales: interestSummary
      })

      console.log(`📊 [${context.userId}] Intereses finales guardados`)
    } catch (error) {
      console.error(`❌ [${context.userId}] Error guardando intereses finales:`, error)
    }
  }

  private calculateEngagementScore(context: FlowContext): number {
    const interests = context.capturedData.intereses?.length || 0
    const interactions = context.capturedData.menu_interactions || 0
    
    // Score básico: 40 + (20 * intereses) + (10 * interacciones)
    return Math.min(100, 40 + (interests * 20) + (interactions * 10))
  }

  private detectSource(userId: string): 'whatsapp' | 'chat-demo' | 'api' {
    if (userId.startsWith('56') && userId.length >= 11) return 'whatsapp'
    if (userId.includes('demo') || userId.includes('test')) return 'chat-demo'
    return 'api'
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
      currentFlow: FlowType.MAIN_MENU,
      currentStep: MainMenuStep.MENU_DISPLAY,
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
      message: '❌ Ocurrió un error en el menú principal. Por favor, intenta nuevamente.',
      completed: false,
      context: errorContext,
      metrics: errorContext.metrics,
      nextFlow: undefined
    }
  }

  // 🎯 ========== NUEVOS MÉTODOS PARA FLUJO DE CARRERAS ==========

  /**
   * 🏛️ Procesar selección de facultad
   */
  private async processFacultySelection(context: FlowContext, message: string): Promise<StepResult> {
    const selectedNumber = parseInt(message.trim())
    const facultades = Object.values(FACULTADES_UNIACC)
    
    if (isNaN(selectedNumber) || selectedNumber < 1 || selectedNumber > facultades.length) {
      return {
        success: false,
        message: `❌ Por favor, selecciona un número válido del 1 al ${facultades.length}`,
        nextStep: MainMenuStep.FACULTY_SELECTION,
        completed: false
      }
    }

    const selectedFacultad = facultades[selectedNumber - 1]
    
    // 💾 Guardar facultad seleccionada en context (nombre real para BD)
    context.capturedData.facultad_interes = selectedFacultad.nombre

    // 🎯 Generar lista de carreras de la facultad
    const carrerasList = selectedFacultad.carreras
      .map((carrera, index) => `${index + 1}️⃣ **${carrera.nombre}**\n   📅 ${carrera.duracion} • ${carrera.modalidad}`)
      .join('\n\n')

    // 📝 Guardar paso de selección de facultad en historial
    try {
      const userState = this.convertContextToUserState(context)
      await this.prospectService.saveProgressiveStep(
        context.userId,
        'faculty-selection',
        { 
          facultad_interes: selectedFacultad.nombre,
          facultad_id: selectedFacultad.id,
          timestamp: new Date()
        },
        userState
      )
      console.log(`📝 [${context.userId}] Facultad seleccionada guardada: ${selectedFacultad.nombre}`)

      // 💾 GUARDAR INMEDIATAMENTE EN PROSPECTO_ACTUAL
      await this.prospectService.guardarProspecto(context.userId, {
        whatsapp: context.userId,
        nombre: context.capturedData.nombre || 'Usuario',
        email: context.capturedData.email || null,
        telefono: context.capturedData.telefono || null,
        facultad_interes: selectedFacultad.nombre,
        source: context.sessionMetadata.source || 'chat-demo'
      })
      console.log(`💾 [${context.userId}] Facultad guardada en prospecto_actual: ${selectedFacultad.nombre}`)
    } catch (error) {
      console.error(`❌ [${context.userId}] Error guardando selección de facultad:`, error)
    }

    return {
      success: true,
      message: `${selectedFacultad.emoji} **${selectedFacultad.nombre}**

Estas son nuestras carreras disponibles:

${carrerasList}

💡 **Selecciona el número de la carrera que te interesa para ver más detalles**`,
      nextStep: MainMenuStep.CAREER_SELECTION,
      completed: false,
      data: { facultad_selected: selectedFacultad.id, timestamp: new Date() }
    }
  }

  /**
   * 🎓 Procesar selección de carrera
   */
  private async processCareerSelection(context: FlowContext, message: string): Promise<StepResult> {
    const selectedNumber = parseInt(message.trim())
    const facultadNombre = context.capturedData.facultad_interes
    
    if (!facultadNombre) {
      return {
        success: false,
        message: '❌ Error: No se encontró la facultad seleccionada. Volvamos al inicio.',
        nextStep: MainMenuStep.FACULTY_SELECTION,
        completed: false
      }
    }

    // 🔍 Buscar facultad por nombre
    const facultad = Object.values(FACULTADES_UNIACC).find(f => f.nombre === facultadNombre)
    if (!facultad) {
      return {
        success: false,
        message: '❌ Error: Facultad no válida. Volvamos al inicio.',
        nextStep: MainMenuStep.FACULTY_SELECTION,
        completed: false
      }
    }

    if (isNaN(selectedNumber) || selectedNumber < 1 || selectedNumber > facultad.carreras.length) {
      return {
        success: false,
        message: `❌ Por favor, selecciona un número válido del 1 al ${facultad.carreras.length}`,
        nextStep: MainMenuStep.CAREER_SELECTION,
        completed: false
      }
    }

    const selectedCarrera = facultad.carreras[selectedNumber - 1]
    
    // 💾 Guardar carrera seleccionada en context (nombre real para BD)
    context.capturedData.carrera_interes = selectedCarrera.nombre

    // 💰 Formatear costo
    const costoFormatted = new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      minimumFractionDigits: 0 
    }).format(selectedCarrera.costo_aprox)

    // 📋 Formatear requisitos especiales
    const requisitosText = selectedCarrera.requisitos_especiales 
      ? `\n📋 **Requisitos especiales:**\n${selectedCarrera.requisitos_especiales.map(req => `   • ${req}`).join('\n')}`
      : ''

    // 📝 Guardar paso de selección de carrera en historial
    try {
      const userState = this.convertContextToUserState(context)
      await this.prospectService.saveProgressiveStep(
        context.userId,
        'career-selection',
        { 
          carrera_interes: selectedCarrera.nombre,
          facultad_interes: facultad.nombre,
          carrera_id: selectedCarrera.id,
          facultad_id: facultad.id,
          timestamp: new Date()
        },
        userState
      )
      console.log(`📝 [${context.userId}] Carrera seleccionada guardada: ${selectedCarrera.nombre}`)

      // 💾 GUARDAR INMEDIATAMENTE EN PROSPECTO_ACTUAL (AMBOS CAMPOS)
      await this.prospectService.guardarProspecto(context.userId, {
        whatsapp: context.userId,
        nombre: context.capturedData.nombre || 'Usuario',
        email: context.capturedData.email || null,
        telefono: context.capturedData.telefono || null,
        facultad_interes: facultad.nombre,
        carrera_interes: selectedCarrera.nombre,
        source: context.sessionMetadata.source || 'chat-demo'
      })
      console.log(`💾 [${context.userId}] Carrera Y Facultad guardadas en prospecto_actual: ${selectedCarrera.nombre} | ${facultad.nombre}`)
    } catch (error) {
      console.error(`❌ [${context.userId}] Error guardando selección de carrera:`, error)
    }

    return {
      success: true,
      message: `🎓 **${selectedCarrera.nombre}**

📖 **Descripción:**
${selectedCarrera.descripcion}

⏱️ **Duración:** ${selectedCarrera.duracion}
🏛️ **Modalidad:** ${selectedCarrera.modalidad}
💰 **Arancel aproximado:** ${costoFormatted}${requisitosText}

🎯 **¿Te interesa esta carrera?**

1️⃣ 🎓 **Sí, quiero hablar con un asesor**
2️⃣ 🔍 **Ver otras carreras de ${facultad.nombre}**
3️⃣ 🏠 **Volver al menú principal**

💡 **Selecciona una opción:**`,
      nextStep: MainMenuStep.CAREER_DETAIL,
      completed: false,
      data: { carrera_selected: selectedCarrera.id, timestamp: new Date() }
    }
  }

  /**
   * 📋 Procesar acciones desde detalle de carrera
   */
  private async processCareerDetail(context: FlowContext, message: string): Promise<StepResult> {
    const option = message.trim()
    
    switch (option) {
      case '1':
        // 🎓 Solicitar asesor específico para la carrera
        return await this.processCareerHandoff(context, message)
      
      case '2':
        // 🔍 Volver a selección de carreras de la misma facultad
        const facultadNombre = context.capturedData.facultad_interes
        if (!facultadNombre) {
          return {
            success: false,
            message: '❌ Error: No se encontró la facultad. Volvamos al inicio.',
            nextStep: MainMenuStep.FACULTY_SELECTION,
            completed: false
          }
        }

        const facultad = Object.values(FACULTADES_UNIACC).find(f => f.nombre === facultadNombre)
        if (!facultad) {
          return {
            success: false,
            message: '❌ Error: Facultad no válida. Volvamos al inicio.',
            nextStep: MainMenuStep.FACULTY_SELECTION,
            completed: false
          }
        }

        // 🎯 Regenerar lista de carreras de la facultad
        const carrerasList = facultad.carreras
          .map((carrera, index) => `${index + 1}️⃣ **${carrera.nombre}**\n   📅 ${carrera.duracion} • ${carrera.modalidad}`)
          .join('\n\n')

        return {
          success: true,
          message: `🔍 **Perfecto! Te muestro otras carreras de esta facultad:**

${facultad.emoji} **${facultad.nombre}**

${carrerasList}

💡 **Selecciona el número de la carrera que te interesa para ver más detalles**`,
          nextStep: MainMenuStep.CAREER_SELECTION,
          completed: false
        }
      
      case '3':
        // 🏠 Volver al menú principal
        return {
          success: true,
          message: `🏠 **Regresando al menú principal...**\n\n${this.formatMainMenu(context)}`,
          nextStep: MainMenuStep.OPTION_PROCESSING,
          completed: false
        }
      
      default:
        return {
          success: false,
          message: '❌ Por favor, selecciona una opción válida (1, 2 o 3)',
          nextStep: MainMenuStep.CAREER_DETAIL,
          completed: false
        }
    }
  }

  /**
   * 🎓 Procesar handoff específico de carrera al asesor
   */
  private async processCareerHandoff(context: FlowContext, message: string): Promise<StepResult> {
    const userName = context.capturedData.nombre || 'Usuario'
    const carreraNombre = context.capturedData.carrera_interes
    const facultadNombre = context.capturedData.facultad_interes
    
    if (!carreraNombre || !facultadNombre) {
      return {
        success: false,
        message: '❌ Error: No se encontraron los datos de la carrera. Volvamos al inicio.',
        nextStep: MainMenuStep.FACULTY_SELECTION,
        completed: false
      }
    }

    // 🔍 Buscar facultad y carrera por nombre
    const facultad = Object.values(FACULTADES_UNIACC).find(f => f.nombre === facultadNombre)
    const carrera = facultad?.carreras.find(c => c.nombre === carreraNombre)
    
    if (!carrera || !facultad) {
      return {
        success: false,
        message: '❌ Error: Carrera no encontrada. Volvamos al inicio.',
        nextStep: MainMenuStep.FACULTY_SELECTION,
        completed: false
      }
    }

    // 📊 Registrar interés específico en la carrera
    await this.trackInterest(context, 'career_advisor_request', `Solicitud de asesor para ${carrera.nombre}`)
    
    // 💾 Guardar prospecto con interés específico
    try {
      await this.prospectService.guardarProspecto(context.userId, {
        whatsapp: context.userId,
        nombre: userName,
        email: context.capturedData.email || null,
        telefono: context.capturedData.telefono || null,
        carrera_interes: carrera.nombre,
        facultad_interes: facultad.nombre,
        nivel_interes: 'alto',
        tipo_consulta: 'solicitud_asesor',
        source: context.sessionMetadata.source || 'chat-demo',
        datos_adicionales: {
          carrera_especifica: carrera.id,
          facultad_especifica: facultad.id,
          flujo_origen: 'career_detail_handoff',
          timestamp: new Date()
        }
      })
    } catch (error) {
      console.error(`❌ [${context.userId}] Error guardando prospecto para handoff de carrera:`, error)
    }

    // 🔚 Marcar contexto para finalización
    context.isActive = false
    context.needsSave = true

    return {
      success: true,
      message: `🎓 **¡Perfecto, ${userName}!** 

En las próximas 24 horas un asesor académico especializado en **${carrera.nombre}** se contactará contigo al número **${context.userId}**.

💡 **¿Quieres hacer otra consulta?** Simplemente escribe **"Hola"** para empezar una nueva conversación.

¡Gracias por tu interés en UNIACC! 🎯`,
      completed: true,
      nextFlow: undefined, // Esto indica que la sesión debe cerrarse
      data: { 
        handoff_type: 'career_specific',
        carrera: carrera.nombre,
        facultad: facultad.nombre,
        timestamp: new Date()
      }
    }
  }
}
