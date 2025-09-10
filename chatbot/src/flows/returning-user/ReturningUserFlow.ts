/**
 * 🔄 ReturningUserFlow - Flujo 1: Usuario Solo con Teléfono
 * 
 * Maneja usuarios recurrentes que solo tienen teléfono confirmado.
 * Implementa opciones de privacidad y captura progresiva de nombre.
 * 
 * @author UNIACC ChatBot Team
 * @version 1.0 - MVP Implementation
 */

import { FlowContext, FlowResult, FlowType, CapturedProspectData, StepResult } from '../core/FlowContext'
import { FlowContextManager } from '../core/FlowContextManager'
import { FlowContextBuilder } from '../core/FlowContextBuilder'
import { ValidationService } from '../../services/validation-service'
import { MessageFormatterService } from '../../services/message-formatter'
import { ProspectServiceV2 } from '../../services/prospect-service-v2'

export enum ReturningUserStep {
  PRIVACY_CHOICE = 'privacy_choice',
  NAME_CAPTURE = 'name_capture', 
  MENU_DISPLAY = 'menu_display'
}

export interface ReturningUserData {
  telefono: string
  nombre?: string
  privacy_choice?: 'personalized' | 'anonymous'
  menu_type?: 'personalized' | 'anonymous'
}

export class ReturningUserFlow {

  constructor(
    private readonly contextManager: FlowContextManager,
    private readonly validationService: ValidationService,
    private readonly messageFormatter: MessageFormatterService,
    private readonly prospectService: ProspectServiceV2
  ) {
    console.log('🔄 [RETURNING-USER-FLOW] Inicializado')
  }

  /**
   * 🎯 Procesar mensaje en el ReturningUserFlow
   */
  async processMessage(userId: string, message: string): Promise<FlowResult> {
    try {
      console.log(`\n🔄 [RETURNING-USER-FLOW] ===== INICIO PROCESAMIENTO =====`)
      console.log(`📱 [${userId}] Input: "${message}"`)
      console.log(`⏰ [${userId}] Timestamp: ${new Date().toISOString()}`)

      // 1. 🔍 Obtener o crear context para ReturningUser
      console.log(`🔍 [${userId}] Obteniendo FlowContext...`)
      let context = await this.contextManager.getContext(userId)
      
      if (!context || context.currentFlow !== FlowType.RETURNING_USER) {
        console.log(`🏗️ [${userId}] Context no existe o es de otro flujo, creando nuevo...`)
        console.log(`📊 [${userId}] Context actual:`, {
          exists: !!context,
          currentFlow: context?.currentFlow,
          expected: FlowType.RETURNING_USER
        })
        context = await this.createReturningUserContext(userId, message)
      } else {
        console.log(`✅ [${userId}] Context existente encontrado`)
        console.log(`📊 [${userId}] Estado del context:`, {
          currentStep: context.currentStep,
          isActive: context.isActive,
          capturedData: context.capturedData,
          metadata: context.metadata
        })
      }

      // 2. 🎯 Procesar según el paso actual
      console.log(`\n🎯 [${userId}] Procesando paso: ${context.currentStep}`)
      const stepResult = await this.processCurrentStep(context, message)
      
      console.log(`📤 [${userId}] Resultado del paso:`, {
        success: stepResult.success,
        completed: stepResult.completed,
        nextStep: stepResult.nextStep,
        nextFlow: stepResult.nextFlow,
        hasData: !!stepResult.data,
        messageLength: stepResult.message?.length || 0
      })

      // 3. 📊 Actualizar context con resultado del paso
      if (stepResult.success && stepResult.nextStep) {
        console.log(`🔄 [${userId}] Actualizando context...`)
        const oldStep = context.currentStep
        context.currentStep = stepResult.nextStep
        context.lastMessage = message
        context.metrics.stepsCompleted++
        
        console.log(`📈 [${userId}] Transición: ${oldStep} → ${stepResult.nextStep}`)
        console.log(`📊 [${userId}] Métricas actualizadas:`, {
          stepsCompleted: context.metrics.stepsCompleted,
          avgResponseTime: context.metrics.avgResponseTime
        })
        
        if (stepResult.data) {
          // Actualizar datos capturados
          console.log(`💾 [${userId}] Guardando datos del paso:`, stepResult.data)
          Object.assign(context.capturedData, stepResult.data)
          console.log(`📊 [${userId}] Datos capturados totales:`, context.capturedData)
        }
      }

      // 4. 💾 Guardar context actualizado
      console.log(`\n💾 [${userId}] Guardando context actualizado...`)
      try {
        await this.contextManager.saveContext(context)
        console.log(`✅ [${userId}] Context guardado exitosamente`)
      } catch (saveError) {
        console.error(`❌ [${userId}] Error guardando context:`, saveError)
        // Continuar el flujo aunque falle el guardado
      }

      // 5. 📊 Determinar si el flujo está completo
      const flowResult: FlowResult = {
        success: stepResult.success,
        message: stepResult.message,
        completed: stepResult.completed || false,
        context: context,
        metrics: context.metrics,
        nextFlow: stepResult.nextFlow
      }

      console.log(`\n🎉 [${userId}] ===== RESULTADO FINAL =====`)
      console.log(`📊 [${userId}] FlowResult:`, {
        success: flowResult.success,
        completed: flowResult.completed,
        nextFlow: flowResult.nextFlow,
        currentStep: context.currentStep,
        isActive: context.isActive,
        messagePreview: flowResult.message?.substring(0, 100) + '...'
      })
      console.log(`🔄 [RETURNING-USER-FLOW] ===== FIN PROCESAMIENTO =====\n`)

      return flowResult

    } catch (error) {
      console.error(`\n💥 [${userId}] ERROR CRÍTICO EN RETURNING-USER-FLOW:`)
      console.error(`📋 [${userId}] Detalles del error:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      console.error(`📊 [${userId}] Estado en momento del error:`, {
        message: message,
        timestamp: new Date().toISOString()
      })
      console.error(`🔄 [RETURNING-USER-FLOW] ===== ERROR PROCESAMIENTO =====\n`)
      
      return this.createErrorFlowResult(userId, error)
    }
  }

  /**
   * 🏗️ Crear context para ReturningUser
   */
  private async createReturningUserContext(userId: string, message: string): Promise<FlowContext> {
    console.log(`\n🏗️ [${userId}] ===== CREANDO CONTEXT =====`)
    console.log(`📱 [${userId}] UserId: ${userId}`)
    console.log(`💬 [${userId}] Mensaje inicial: "${message}"`)

    // 🔍 Reconocer prospecto existente
    console.log(`🔍 [${userId}] ===== CONSULTANDO BASE DE DATOS =====`)
    console.log(`📞 [${userId}] Buscando prospecto con teléfono: "${userId}"`)
    console.log(`⏰ [${userId}] Timestamp consulta: ${new Date().toISOString()}`)
    
    let prospectResult
    try {
      prospectResult = await this.prospectService.reconocerProspecto(userId)
      console.log(`✅ [${userId}] Consulta BD exitosa`)
    } catch (dbError) {
      console.error(`💥 [${userId}] ERROR EN CONSULTA BD:`)
      console.error(`📋 [${userId}] Detalles del error:`, {
        name: dbError instanceof Error ? dbError.name : 'Unknown',
        message: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined
      })
      throw dbError
    }
    
    console.log(`📊 [${userId}] ===== RESPUESTA COMPLETA BD =====`)
    console.log(`🔍 [${userId}] Resultado reconocimiento COMPLETO:`, {
      isReturning: prospectResult.isReturning,
      success: prospectResult.success,
      sessionCount: prospectResult.sessionCount,
      fromHistory: prospectResult.fromHistory,
      hasData: !!prospectResult.data,
      rawResult: prospectResult // Log completo del resultado
    })
    
    if (prospectResult.data) {
      console.log(`📋 [${userId}] ===== DATOS COMPLETOS DEL PROSPECTO =====`)
      console.log(`👤 [${userId}] Datos del prospecto COMPLETOS:`, prospectResult.data)
      console.log(`📊 [${userId}] Análisis de campos:`, {
        nombre: prospectResult.data.nombre || '[SIN NOMBRE]',
        email: prospectResult.data.email || '[SIN EMAIL]',
        telefono: prospectResult.data.telefono || '[SIN TELEFONO]',
        source: prospectResult.data.source || '[SIN SOURCE]',
        created_at: '[BD_FIELD]',
        updated_at: '[BD_FIELD]'
      })
    } else {
      console.log(`⚠️ [${userId}] ===== NO HAY DATOS EN BD =====`)
      console.log(`📊 [${userId}] prospectResult.data es: ${prospectResult.data}`)
    }
    console.log(`🔍 [${userId}] ===== FIN CONSULTA BD =====`)
    
    if (!prospectResult.isReturning) {
      console.warn(`⚠️ [${userId}] ADVERTENCIA: ReturningUserFlow llamado para usuario no recurrente`)
      console.warn(`🤔 [${userId}] Esto podría indicar un problema en la detección`)
    }

    // 🏗️ Construir FlowContext
    console.log(`🏗️ [${userId}] Construyendo FlowContext...`)
    const capturedData = {
      telefono: userId,
      nombre: prospectResult.data?.nombre || undefined,
      email: prospectResult.data?.email || undefined
    }
    
    console.log(`📊 [${userId}] Datos para FlowContext:`, capturedData)
    
    const context = FlowContextBuilder
      .forReturningUser(userId, FlowType.RETURNING_USER, capturedData)
      .withSource('chat-demo', 'desktop') // TODO: Detectar source real
      .build()

    // 🎯 Configurar paso inicial basado en datos existentes
    console.log(`🎯 [${userId}] Determinando paso inicial...`)
    
    if (prospectResult.data?.nombre) {
      // 🔍 VERIFICAR SI ES NOMBRE TÉCNICO O REAL
      const isRealName = this.isRealUserName(prospectResult.data.nombre)
      console.log(`🔍 [${userId}] Análisis del nombre: "${prospectResult.data.nombre}"`)
      console.log(`📊 [${userId}] Es nombre real: ${isRealName}`)
      
      if (isRealName) {
        // ✅ Nombre real, ir directo al menú personalizado
        console.log(`👤 [${userId}] Usuario tiene nombre REAL: "${prospectResult.data.nombre}"`)
        console.log(`🎯 [${userId}] Configurando para ir directo a MENU_DISPLAY`)
        
        context.currentStep = ReturningUserStep.MENU_DISPLAY
        context.capturedData.privacy_choice = 'personalized'
        context.capturedData.menu_type = 'personalized'
        
        console.log(`✅ [${userId}] Configurado para menú personalizado`)
      } else {
        // ❌ Nombre técnico, tratar como SIN NOMBRE
        console.log(`🔧 [${userId}] Nombre técnico detectado: "${prospectResult.data.nombre}"`)
        console.log(`🎯 [${userId}] Tratando como usuario SIN NOMBRE → PRIVACY_CHOICE`)
        
        // Limpiar el nombre técnico del context
        context.capturedData.nombre = undefined
        context.currentStep = ReturningUserStep.PRIVACY_CHOICE
        
        console.log(`✅ [${userId}] Configurado para opciones de privacidad (nombre técnico limpiado)`)
      }
    } else {
      // Solo teléfono, mostrar opciones de privacidad
      console.log(`📱 [${userId}] Usuario solo tiene teléfono`)
      console.log(`🎯 [${userId}] Configurando para PRIVACY_CHOICE`)
      
      context.currentStep = ReturningUserStep.PRIVACY_CHOICE
      
      console.log(`✅ [${userId}] Configurado para opciones de privacidad`)
    }

    console.log(`\n📊 [${userId}] Context creado exitosamente:`)
    console.log(`🎯 [${userId}] Paso inicial: ${context.currentStep}`)
    console.log(`📋 [${userId}] Flow: ${context.currentFlow}`)
    console.log(`🆔 [${userId}] SessionId: ${context.sessionId}`)
    console.log(`📊 [${userId}] IsActive: ${context.isActive}`)
    console.log(`🏗️ [${userId}] ===== CONTEXT CREADO =====\n`)
    
    return context
  }

  /**
   * 🎯 Procesar paso actual
   */
  private async processCurrentStep(context: FlowContext, message: string): Promise<StepResult> {
    switch (context.currentStep as ReturningUserStep) {
      case ReturningUserStep.PRIVACY_CHOICE:
        return this.processPrivacyChoice(context, message)
        
      case ReturningUserStep.NAME_CAPTURE:
        return this.processNameCapture(context, message)
        
      case ReturningUserStep.MENU_DISPLAY:
        return this.processMenuDisplay(context, message)
        
      default:
        console.warn(`⚠️ [${context.userId}] Paso desconocido: ${context.currentStep}`)
        return this.createErrorStepResult('Paso no reconocido')
    }
  }

  /**
   * 🔒 Procesar elección de privacidad (Paso 1 - MEJORADO)
   */
  private async processPrivacyChoice(context: FlowContext, message: string): Promise<StepResult> {
    console.log(`\n🔒 [${context.userId}] ===== PROCESANDO PRIVACIDAD =====`)
    console.log(`📱 [${context.userId}] Input: "${message}"`)
    console.log(`📊 [${context.userId}] Metadata actual:`, context.metadata)

    // 🎯 LÓGICA CLARA: Procesar opción directamente
    const choice = message.trim()
    console.log(`🎯 [${context.userId}] Opción procesada: "${choice}"`)
    
    if (choice === '1') {
      // ✅ Opción 1: Dar nombre (experiencia personalizada)
      console.log(`👤 [${context.userId}] ✅ Usuario eligió experiencia personalizada`)
      console.log(`🔄 [${context.userId}] Próximo paso: NAME_CAPTURE`)
      
      return {
        success: true,
        message: "¡Perfecto! 😊 Por favor escribe tu nombre:",
        completed: false,
        nextStep: ReturningUserStep.NAME_CAPTURE,
        data: { privacy_choice: 'personalized' }
      }
      
    } else if (choice === '2') {
      // ✅ Opción 2: Seguir sin nombre (mantener privacidad)
      console.log(`🔒 [${context.userId}] ✅ Usuario eligió privacidad`)
      console.log(`🎯 [${context.userId}] Flujo completo - ir a MAIN_MENU`)
      
      const anonymousMessage = this.formatAnonymousMenuMessage()
      console.log(`📤 [${context.userId}] Mensaje anónimo generado (${anonymousMessage.length} chars)`)
      
      return {
        success: true,
        message: anonymousMessage,
        completed: true, // Flujo completo para usuario anónimo
        nextStep: undefined,
        nextFlow: 'main-menu',
        data: { privacy_choice: 'anonymous', menu_type: 'anonymous' }
      }
      
    } else {
      // ❌ Opción inválida O primera vez en el paso
      const isFirstTime = !context.metadata.privacy_shown
      const isGreeting = this.isGreetingMessage(message)
      
      console.log(`🔍 [${context.userId}] Analizando entrada no válida:`, {
        choice: choice,
        isFirstTime: isFirstTime,
        isGreeting: isGreeting,
        privacyShown: context.metadata.privacy_shown
      })
      
      if (isFirstTime || isGreeting) {
        // 🎬 Primera vez o saludo: mostrar opciones
        context.metadata.privacy_shown = true
        console.log(`🎬 [${context.userId}] ✅ Mostrando opciones de privacidad`)
        console.log(`📋 [${context.userId}] Razón: ${isFirstTime ? 'Primera vez' : 'Saludo detectado'}`)
        
        const privacyMessage = this.formatPrivacyOptionsMessage()
        console.log(`📤 [${context.userId}] Mensaje privacidad generado (${privacyMessage.length} chars)`)
        
        return {
          success: true,
          message: privacyMessage,
          completed: false,
          nextStep: ReturningUserStep.PRIVACY_CHOICE
        }
      } else {
        // ❌ Opción inválida después de mostrar opciones
        console.log(`❌ [${context.userId}] Opción inválida después de mostrar opciones`)
        console.log(`🔄 [${context.userId}] Mostrando error + opciones nuevamente`)
        
        return {
          success: true,
          message: `❌ Opción no válida. Por favor elige una opción:

${this.formatPrivacyOptionsMessage()}`,
          completed: false,
          nextStep: ReturningUserStep.PRIVACY_CHOICE
        }
      }
    }
  }

  /**
   * 👤 Procesar captura de nombre (Paso 2)
   */
  private async processNameCapture(context: FlowContext, message: string): Promise<StepResult> {
    console.log(`\n👤 [${context.userId}] ===== PROCESANDO CAPTURA NOMBRE =====`)
    console.log(`📱 [${context.userId}] Input crudo: "${message}"`)

    // Validar nombre
    const nombre = message.trim()
    console.log(`✂️ [${context.userId}] Nombre procesado: "${nombre}"`)
    console.log(`📏 [${context.userId}] Longitud: ${nombre.length} caracteres`)
    
    if (!nombre || nombre.length < 2) {
      console.log(`❌ [${context.userId}] Nombre demasiado corto (${nombre.length} chars)`)
      return {
        success: true,
        message: "❌ Por favor ingresa un nombre válido (mínimo 2 caracteres):",
        completed: false,
        nextStep: ReturningUserStep.NAME_CAPTURE
      }
    }

    if (nombre.length > 50) {
      console.log(`❌ [${context.userId}] Nombre demasiado largo (${nombre.length} chars)`)
      return {
        success: true,
        message: "❌ El nombre es demasiado largo (máximo 50 caracteres):",
        completed: false,
        nextStep: ReturningUserStep.NAME_CAPTURE
      }
    }

    console.log(`✅ [${context.userId}] Nombre válido: "${nombre}"`)

    // 💾 Guardar nombre en la base de datos
    console.log(`\n💾 [${context.userId}] ===== GUARDANDO EN BASE DE DATOS =====`)
    console.log(`📱 [${context.userId}] Operación: Guardar nombre de usuario`)
    console.log(`⏰ [${context.userId}] Timestamp operación: ${new Date().toISOString()}`)
    
    try {
      const dataToSave = {
        nombre: nombre,
        telefono: context.userId,
        whatsapp: context.userId, // Requerido por ProspectoData
        email: '', // Requerido por ProspectoData  
        source: 'chat-demo'
      }
      
      console.log(`📊 [${context.userId}] ===== DATOS COMPLETOS A GUARDAR =====`)
      console.log(`📋 [${context.userId}] Payload completo:`, dataToSave)
      console.log(`🔍 [${context.userId}] Validación campos:`, {
        nombre: `"${dataToSave.nombre}" (${dataToSave.nombre.length} chars)`,
        telefono: `"${dataToSave.telefono}"`,
        whatsapp: `"${dataToSave.whatsapp}"`,
        email: `"${dataToSave.email}" ${dataToSave.email ? '✅' : '⚠️ VACÍO'}`,
        source: `"${dataToSave.source}"`
      })
      
      console.log(`🚀 [${context.userId}] Ejecutando guardarProspecto()...`)
      const saveResult = await this.prospectService.guardarProspecto(context.userId, dataToSave)
      
      console.log(`📊 [${context.userId}] ===== RESPUESTA COMPLETA BD =====`)
      console.log(`✅ [${context.userId}] Resultado guardarProspecto COMPLETO:`, saveResult)
      console.log(`📋 [${context.userId}] Análisis respuesta:`, {
        success: saveResult?.success || 'NO DEFINIDO',
        data: saveResult?.data || 'NO HAY DATA',
        hasData: !!(saveResult?.data),
        hasSuccess: !!(saveResult?.success),
        resultType: typeof saveResult
      })
      
      if (saveResult?.data) {
        console.log(`📊 [${context.userId}] Datos guardados en BD:`, saveResult.data)
        console.log(`📊 [${context.userId}] Campos guardados:`, Object.keys(saveResult.data))
        console.log(`📅 [${context.userId}] Resultado guardado exitosamente`)
      }
      
      console.log(`✅ [${context.userId}] ===== GUARDADO EXITOSO =====`)
      console.log(`👤 [${context.userId}] Prospecto actualizado: ${context.userId} -> "${nombre}"`)
      
    } catch (error) {
      console.error(`\n💥 [${context.userId}] ===== ERROR CRÍTICO EN BD =====`)
      console.error(`❌ [${context.userId}] Operación: guardarProspecto falló`)
      console.error(`📋 [${context.userId}] Detalles completos del error:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 10) : undefined, // Primeras 10 líneas del stack
        timestamp: new Date().toISOString()
      })
      
      if (error instanceof Error && error.message) {
        console.error(`📝 [${context.userId}] Mensaje de error: "${error.message}"`)
      }
      
      console.warn(`⚠️ [${context.userId}] CONTINUANDO FLUJO A PESAR DEL ERROR`)
      console.warn(`🔄 [${context.userId}] El usuario seguirá con el proceso normal`)
      console.error(`💾 [${context.userId}] ===== FIN ERROR BD =====\n`)
      // Continuar el flujo aunque falle el guardado
    }

    // ✅ Nombre capturado exitosamente
    console.log(`🎉 [${context.userId}] Generando mensaje personalizado...`)
    const personalizedMessage = this.formatPersonalizedMenuMessage(nombre)
    console.log(`📤 [${context.userId}] Mensaje personalizado generado (${personalizedMessage.length} chars)`)
    console.log(`🎯 [${context.userId}] Flujo completo - ir a MAIN_MENU`)
    
    const resultData = { 
      nombre: nombre,
      privacy_choice: 'personalized',
      menu_type: 'personalized'
    }
    console.log(`📊 [${context.userId}] Datos del resultado:`, resultData)

    return {
      success: true,
      message: personalizedMessage,
      completed: true, // Flujo completo
      nextStep: undefined,
      nextFlow: 'main-menu',
      data: resultData
    }
  }

  /**
   * 📋 Procesar display de menú (Paso 3 - para usuarios que ya tienen nombre)
   */
  private async processMenuDisplay(context: FlowContext, message: string): Promise<StepResult> {
    console.log(`\n📋 [${context.userId}] ===== PROCESANDO MENU DISPLAY =====`)
    console.log(`📱 [${context.userId}] Input: "${message}"`)
    console.log(`👤 [${context.userId}] Usuario ya tiene nombre, mostrando menú directo`)

    const nombre = context.capturedData.nombre || 'Usuario'
    console.log(`🏷️ [${context.userId}] Nombre a usar: "${nombre}"`)
    console.log(`📊 [${context.userId}] Datos capturados disponibles:`, context.capturedData)
    
    console.log(`🎉 [${context.userId}] Generando menú personalizado...`)
    const personalizedMessage = this.formatPersonalizedMenuMessage(nombre)
    console.log(`📤 [${context.userId}] Menú personalizado generado (${personalizedMessage.length} chars)`)
    console.log(`🎯 [${context.userId}] Flujo completo - ir a MAIN_MENU`)
    
    return {
      success: true,
      message: personalizedMessage,
      completed: true, // Flujo completo, ir a MainMenu
      nextStep: undefined,
      nextFlow: 'main-menu'
    }
  }

  /**
   * 🎨 Formatear mensaje de opciones de privacidad
   */
  private formatPrivacyOptionsMessage(): string {
    return `¡Hola! Te reconozco 👋 Me alegra verte de nuevo

Para brindarte una mejor experiencia, ¿qué prefieres?

1️⃣ 👤 Dar mi nombre (experiencia personalizada)
2️⃣ 🔒 Seguir sin nombre (mantener privacidad)`
  }

  /**
   * 🎨 Formatear menú personalizado
   */
  private formatPersonalizedMenuMessage(nombre: string): string {
    return `¡Excelente ${nombre}! 🌟 Ahora puedo ayudarte mejor.
¿En qué puedo ayudarte hoy?

1️⃣ 🎓 Conocer nuestras carreras
2️⃣ 📋 Información de admisión 2025
3️⃣ 💰 Aranceles y financiamiento  
4️⃣ 👨‍🎓 Hablar con asesor
5️⃣ 💬 Otra consulta`
  }

  /**
   * 🎨 Formatear menú anónimo
   */
  private formatAnonymousMenuMessage(): string {
    return `¡Perfecto! 👍 Respeto tu privacidad.
¿En qué puedo ayudarte hoy?

1️⃣ 🎓 Conocer nuestras carreras
2️⃣ 📋 Información de admisión 2025
3️⃣ 💰 Aranceles y financiamiento
4️⃣ 👨‍🎓 Hablar con asesor
5️⃣ 👤 Darme nombre después (opcional)
6️⃣ 💬 Otra consulta`
  }

  /**
   * ❌ Crear resultado de error para el flujo
   */
  private createErrorFlowResult(userId: string, error: any): FlowResult {
    console.error(`💥 [${userId}] Error crítico en ReturningUserFlow:`, error)
    
    const errorContext = FlowContextBuilder
      .forReturningUser(userId, FlowType.RETURNING_USER, {})
      .withSource('chat-demo', 'desktop')
      .build()

    return {
      success: false,
      message: "❌ Ocurrió un error inesperado. Por favor intenta nuevamente escribiendo 'Hola'.",
      completed: false,
      context: errorContext,
      metrics: {
        avgResponseTime: 0,
        errorsCount: 1,
        stepsCompleted: 0,
        stepDurations: {},
        conversionEvents: [],
        messagesExchanged: 0
      }
    }
  }

  /**
   * ❌ Crear resultado de error para step
   */
  private createErrorStepResult(message: string): StepResult {
    return {
      success: false,
      message: `❌ ${message}`,
      completed: false
    }
  }

  /**
   * 🔍 Detectar si un nombre es real o técnico/generado por el sistema
   */
  private isRealUserName(nombre: string): boolean {
    if (!nombre || nombre.trim().length === 0) {
      return false
    }

    const nombreLower = nombre.toLowerCase().trim()
    
    // 🚫 Nombres técnicos comunes que el sistema genera
    const nombresTecnicos = [
      'usuario (timeout)',
      'usuario(timeout)',
      'usuario timeout',
      'usuario',
      'user (timeout)',
      'user timeout',
      'user',
      'prospecto',
      'cliente',
      'lead',
      'sin nombre',
      'undefined',
      'null',
      'no definido'
    ]
    
    // 🔍 Verificar si coincide con algún nombre técnico
    if (nombresTecnicos.includes(nombreLower)) {
      console.log(`🚫 [NOMBRE-TECNICO] "${nombre}" es un nombre técnico`)
      return false
    }
    
    // 🔍 Verificar patrones técnicos (contiene paréntesis, números raros, etc.)
    const patronesTecnicos = [
      /\(timeout\)/i,           // (timeout)
      /\(.*\)/,                 // cualquier cosa entre paréntesis
      /usuario\s*\d+/i,         // usuario123, usuario 123
      /user\s*\d+/i,            // user123, user 123
      /^[a-z]+\d+$/i,          // patron123
      /^temp_/i,               // temp_algo
      /^test_/i,               // test_algo
      /^demo_/i                // demo_algo
    ]
    
    for (const patron of patronesTecnicos) {
      if (patron.test(nombre)) {
        console.log(`🚫 [PATRON-TECNICO] "${nombre}" coincide con patrón técnico: ${patron}`)
        return false
      }
    }
    
    // 🔍 Verificar longitud mínima para nombres reales
    if (nombre.trim().length < 2) {
      console.log(`🚫 [LONGITUD] "${nombre}" es demasiado corto para ser nombre real`)
      return false
    }
    
    // ✅ Si pasa todas las verificaciones, es un nombre real
    console.log(`✅ [NOMBRE-REAL] "${nombre}" parece ser un nombre real`)
    return true
  }

  /**
   * 🎯 Verificar si el mensaje es un saludo inicial (usando lógica de clase mundial)
   */
  private isGreetingMessage(message: string): boolean {
    const cleanMessage = message.toLowerCase().trim()
    
    // 🌍 Saludos básicos más comunes (versión simplificada para ReturningUserFlow)
    const basicGreetings = [
      'hola', 'hello', 'hi', 'buenas', 'buenos días', 'buenas tardes', 
      'buenas noches', 'hey', 'empezar', 'iniciar', 'start', 'ayuda', 'help'
    ]
    
    // Coincidencia exacta o inicio de frase
    return basicGreetings.some(greeting => 
      cleanMessage === greeting || 
      cleanMessage.startsWith(greeting + ' ') ||
      cleanMessage.startsWith(greeting + ',') ||
      cleanMessage.startsWith(greeting + '!')
    )
  }
}
