/**
 * 🎯 Prospect Service V2 - Repository Pattern
 * Nueva versión del servicio usando Prisma Repository Layer
 */

import { ProspectoData, ProgressiveStep, ProspectResult, SessionResult } from '../domain/types/prospect'
import { UserState } from '../domain/types/user-state'
import { IProspectoActualRepository, IProspectoHistorialRepository, CreateProspectoData } from '../repositories/interfaces/IProspectoRepository'

export class ProspectServiceV2 {
  private prospectoActualRepo: IProspectoActualRepository
  private prospectoHistorialRepo: IProspectoHistorialRepository

  constructor(
    prospectoActualRepo: IProspectoActualRepository,
    prospectoHistorialRepo: IProspectoHistorialRepository
  ) {
    this.prospectoActualRepo = prospectoActualRepo
    this.prospectoHistorialRepo = prospectoHistorialRepo
    console.log('🎯 [PROSPECT-SERVICE-V2] Inicializado con Repository Pattern')
  }

  /**
   * 📝 Progressive Capture: Guardar cada paso individual usando Repository
   */
  async saveProgressiveStep(
    userId: string, 
    campo: string, 
    valor: any, 
    estado: UserState
  ): Promise<ProspectResult> {
    try {
      const datos = estado.datos_prospecto || {}
      
      // 🏷️ Determinar tipo de consulta específico por paso
      const tipoConsultaPaso = this.determineTipoConsultaPorPaso(campo, datos)
      
      // 📊 Obtener número de sesión actual
      const sesionNumero = await this.prospectoHistorialRepo.getLatestSessionNumber(userId)
      
      // 💾 Guardar paso en historial usando Repository
      await this.prospectoHistorialRepo.saveProgressiveStep({
        whatsapp: userId,
        sesion_numero: sesionNumero,
        tipo_consulta: tipoConsultaPaso,
        nombre: datos.nombre || 'Usuario',
        email: datos.email,
        telefono: datos.telefono || undefined,
        edad: datos.edad,
        region: datos.region,
        // carrera_interes y facultad_interes se manejan en metadata
        metadata: {
          campo_capturado: campo,
          valor_anterior: (datos as any)[campo],
          valor_nuevo: valor,
          timestamp: new Date().toISOString(),
          paso_progressive_capture: this.getProgressiveStep(campo)
        }
      })

      console.log(`📝 [PROGRESSIVE-V2] Paso guardado: ${campo} = ${valor} para ${userId}`)
      
      return {
        success: true,
        message: `Progressive capture: ${campo} guardado`,
        data: { 
          whatsapp: userId,
          nombre: datos.nombre || 'Usuario',
          ...datos, 
          [campo]: valor, 
          source: 'progressive_capture' 
        } as ProspectoData
      }
    } catch (error) {
      console.error(`❌ [PROGRESSIVE-V2] Error guardando paso ${campo}:`, error)
      return {
        success: false,
        message: `Error en progressive capture: ${campo}`,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * 🔍 Obtener datos completos de un prospecto existente
   */
  async obtenerProspecto(whatsapp: string): Promise<ProspectoData | null> {
    try {
      console.log(`🔍 [PROSPECT-V2] Obteniendo datos completos de prospecto: ${whatsapp}`)
      
      // 🔍 Buscar en prospectos actuales
      const prospectoExistente = await this.prospectoActualRepo.findByWhatsapp(whatsapp)
      
      if (prospectoExistente) {
        console.log(`✅ [PROSPECT-V2] Prospecto encontrado: ${prospectoExistente.nombre}`)
        return this.mapPrismaToProspectoData(prospectoExistente)
      }

      console.log(`❌ [PROSPECT-V2] Prospecto no encontrado: ${whatsapp}`)
      return null
    } catch (error) {
      console.error(`❌ [PROSPECT-V2] Error obteniendo prospecto ${whatsapp}:`, error)
      return null
    }
  }

  /**
   * 🔄 Mapear datos de Prisma a ProspectoData
   */
  private mapPrismaToProspectoData(prismaData: any): ProspectoData {
    return {
      whatsapp: prismaData.whatsapp,
      nombre: prismaData.nombre || 'Usuario',
      email: prismaData.email || null,
      telefono: prismaData.telefono || null,
      edad: prismaData.edad || undefined,
      region: prismaData.region || undefined,
      carrera_interes: prismaData.carrera_interes || 'Sin especificar',
      facultad_interes: prismaData.facultad_interes || '',
      nivel_interes: prismaData.nivel_interes || 'medio',
      tipo_consulta: prismaData.tipo_consulta_actual || 'general',
      source: prismaData.source || 'chatbot',
      flujo_actual: prismaData.flujo_actual || 'completado',
      telefono_confirmado: prismaData.telefono_confirmado || false,
      preferencia_contacto: prismaData.preferencia_contacto || 'normal',
      datos_adicionales: {
        primera_interaccion: prismaData.primera_interaccion,
        ultima_interaccion: prismaData.ultima_interaccion,
        total_sesiones: prismaData.total_sesiones,
        ejecutivo_asignado: prismaData.ejecutivos?.[0]?.nombre || null
      }
    }
  }

  /**
   * 👤 Reconocimiento de prospecto usando Repository
   */
  async reconocerProspecto(whatsapp: string): Promise<ProspectResult> {
    try {
      console.log(`🔍 [PROSPECT-V2] Buscando prospecto: ${whatsapp}`)
      
      // 🔍 Buscar en prospectos actuales
      const prospectoExistente = await this.prospectoActualRepo.findByWhatsapp(whatsapp)
      
      if (prospectoExistente) {
        // 📈 Actualizar última interacción
        await this.prospectoActualRepo.updateLastInteraction(whatsapp)
        
        console.log(`✅ [PROSPECT-V2] Prospecto reconocido: ${prospectoExistente.nombre}`)
        return {
          success: true,
          message: 'Prospecto reconocido',
          data: this.mapPrismaToProspectoData(prospectoExistente),
          isReturning: true,
          sessionCount: prospectoExistente.total_sesiones || 1
        }
      }

      // 🔍 Buscar en historial si no está en actuales
      const historial = await this.prospectoHistorialRepo.findByWhatsapp(whatsapp)
      
      if (historial.length > 0) {
        const ultimoRegistro = historial[0] // Más reciente
        
        console.log(`🔄 [PROSPECT-V2] Encontrado en historial: ${ultimoRegistro.nombre}`)
        return {
          success: true,
          message: 'Prospecto encontrado en historial',
          data: this.mapHistorialToProspectoData(ultimoRegistro),
          isReturning: true,
          sessionCount: historial.length,
          fromHistory: true
        }
      }

      console.log(`🆕 [PROSPECT-V2] Nuevo prospecto: ${whatsapp}`)
      return {
        success: true,
        message: 'Nuevo prospecto',
        data: null,
        isReturning: false,
        sessionCount: 0
      }
    } catch (error) {
      console.error(`❌ [PROSPECT-V2] Error reconociendo prospecto ${whatsapp}:`, error)
      return {
        success: false,
        message: 'Error en reconocimiento',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * 💾 Guardar prospecto completo usando Repository
   */
  async guardarProspecto(userId: string, datos: ProspectoData): Promise<ProspectResult> {
    try {
      console.log(`💾 [PROSPECT-V2] Guardando prospecto: ${datos.nombre} (${userId})`)
      
      // 🔍 Verificar si ya existe
      const existente = await this.prospectoActualRepo.findByWhatsapp(userId)
      
      if (existente) {
        // 🔄 Actualizar existente
        console.log(`🔍 [SERVICE-V2] Datos originales para actualización:`, JSON.stringify(datos, null, 2))
        const datosActualizacion = this.mapProspectoDataToUpdate(datos)
        const prospecto = await this.prospectoActualRepo.update(userId, datosActualizacion)
        
        if (prospecto) {
          console.log(`✅ [PROSPECT-V2] Prospecto actualizado: ${prospecto.nombre}`)
          return {
            success: true,
            message: 'Prospecto actualizado exitosamente',
            data: this.mapPrismaToProspectoData(prospecto)
          }
        }
      } else {
        // 🆕 Crear nuevo
        const datosCreacion: CreateProspectoData = {
          whatsapp: userId,
          nombre: datos.nombre,
          email: datos.email || null,
          telefono: datos.telefono || null,
          edad: datos.edad || null,
          region: datos.region || null,
          carrera_interes: datos.carrera_interes || 'Sin especificar',
          facultad_interes: datos.facultad_interes || '',
          nivel_interes: datos.nivel_interes || 'medio',
          tipo_consulta: datos.tipo_consulta || 'consulta_general',
          telefono_confirmado: datos.telefono_confirmado || true,
          preferencia_contacto: datos.preferencia_contacto || 'normal',
          metadata: {
            fuente_captura: 'chatbot_uniacc',
            timestamp_creacion: new Date().toISOString()
          }
        }
        
        console.log(`🔍 [SERVICE-V2] Creando prospecto con datos:`, JSON.stringify(datosCreacion, null, 2))
        
        const prospecto = await this.prospectoActualRepo.create(datosCreacion as any)
        
        console.log(`✅ [PROSPECT-V2] Nuevo prospecto creado: ${prospecto.nombre}`)
        return {
          success: true,
          message: 'Prospecto creado exitosamente',
          data: this.mapPrismaToProspectoData(prospecto)
        }
      }
      
      throw new Error('No se pudo guardar el prospecto')
    } catch (error) {
      console.error(`❌ [PROSPECT-V2] Error guardando prospecto ${userId}:`, error)
      return {
        success: false,
        message: 'Error guardando prospecto',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * 💾 Guardar datos por timeout usando Repository V2
   */
  async saveTimeoutSession(userId: string, capturedData: any): Promise<ProspectResult> {
    try {
      console.log(`💾 [PROSPECT-V2] Guardando datos por timeout para ${userId}`)
      
      // 🔍 Verificar si existe prospecto actual
      const existingProspect = await this.prospectoActualRepo.findByWhatsapp(userId)
      
      if (existingProspect) {
        // 📝 Actualizar existente con tipo de consulta de timeout
        const updateData = {
          tipo_consulta_actual: 'abandono_por_timeout',
          nivel_interes: 'bajo',
          ultima_interaccion: new Date()
        }
        
        const updated = await this.prospectoActualRepo.update(userId, updateData)
        console.log(`✅ [PROSPECT-V2] Prospecto actualizado por timeout: ${existingProspect.nombre}`)
        
        return {
          success: true,
          message: 'Datos guardados por timeout (actualización)',
          data: this.mapPrismaToProspectoData(updated!)
        }
      } else {
        // 🆕 Crear nuevo prospecto con datos mínimos capturados
        const timeoutData: ProspectoData = {
          whatsapp: userId,
          nombre: capturedData.nombre || 'Usuario (timeout)',
          email: capturedData.email || null,
          telefono: capturedData.telefono || userId,
          telefono_confirmado: capturedData.telefono_confirmado || false,
          tipo_consulta: 'abandono_por_timeout',
          nivel_interes: 'bajo',
          source: 'timeout_save'
        }
        
        const result = await this.guardarProspecto(userId, timeoutData)
        console.log(`✅ [PROSPECT-V2] Nuevo prospecto creado por timeout`)
        
        return result
      }
    } catch (error) {
      console.error(`❌ [PROSPECT-V2] Error guardando datos por timeout ${userId}:`, error)
      return {
        success: false,
        message: 'Error guardando datos por timeout',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * 📊 Finalizar sesión usando Repository
   */
  async finalizarSesion(userId: string, razon: string = 'completada'): Promise<SessionResult> {
    try {
      // 🔍 Obtener sesión actual del historial
      const historial = await this.prospectoHistorialRepo.findByWhatsapp(userId)
      
      if (historial.length > 0) {
        const sesionActual = historial[0] // Más reciente
        
        // 🔄 Finalizar sesión
        await this.prospectoHistorialRepo.updateSessionEnd(sesionActual.id, razon)
        
        // 📈 Incrementar contador de sesiones en prospecto actual
        await this.prospectoActualRepo.incrementSessionCount(userId)
      }

      console.log(`🏁 [PROSPECT-V2] Sesión finalizada para ${userId}: ${razon}`)
      return {
        success: true,
        message: 'Sesión finalizada exitosamente',
        razon
      }
    } catch (error) {
      console.error(`❌ [PROSPECT-V2] Error finalizando sesión ${userId}:`, error)
      return {
        success: false,
        message: 'Error finalizando sesión',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * 📊 Obtener métricas usando Repository
   */
  async obtenerMetricas(): Promise<{
    prospectos_totales: number
    prospectos_nuevos: number
    prospectos_activos: number
    prospectos_prioritarios: number
    sesiones_hoy: number
    tasa_abandono: number
  }> {
    try {
      // 📊 Estadísticas de prospectos actuales
      const stats = await this.prospectoActualRepo.getProspectStats()
      
      // 📈 Análisis de abandono
      const abandonmentAnalysis = await this.prospectoHistorialRepo.getAbandonmentAnalysis()
      const totalAbandonment = abandonmentAnalysis.reduce((sum, item) => sum + item.abandonos, 0)
      const tasaAbandono = stats.total > 0 ? (totalAbandonment / stats.total) * 100 : 0

      // 📅 Sesiones de hoy
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const sesionesHoy = await this.prospectoHistorialRepo.count({
        sesion_inicio: {
          gte: today,
          lt: tomorrow
        }
      })

      return {
        prospectos_totales: stats.total,
        prospectos_nuevos: stats.nuevos,
        prospectos_activos: stats.activos,
        prospectos_prioritarios: stats.prioritarios,
        sesiones_hoy: sesionesHoy,
        tasa_abandono: Math.round(tasaAbandono * 100) / 100
      }
    } catch (error) {
      console.error(`❌ [PROSPECT-V2] Error obteniendo métricas:`, error)
      return {
        prospectos_totales: 0,
        prospectos_nuevos: 0,
        prospectos_activos: 0,
        prospectos_prioritarios: 0,
        sesiones_hoy: 0,
        tasa_abandono: 0
      }
    }
  }

  // 🛠️ MÉTODOS AUXILIARES PRIVADOS

  private determineTipoConsultaPorPaso(campo: string, datos: any): string {
    const pasos = {
      'nombre': 'progressive_capture_nombre',
      'email': 'progressive_capture_email',
      'telefono': 'progressive_capture_telefono',
      'edad': 'progressive_capture_edad',
      'region': 'progressive_capture_region',
      'carrera_interes': 'progressive_capture_carrera',
      'nivel_interes': 'progressive_capture_interes'
    }
    
    return pasos[campo as keyof typeof pasos] || 'progressive_capture_general'
  }

  private getProgressiveStep(campo: string): string {
    const steps = {
      'nombre': '1_nombre',
      'email': '2_email', 
      'telefono': '3_telefono',
      'edad': '4_edad',
      'region': '5_region',
      'carrera_interes': '6_carrera',
      'nivel_interes': '7_interes'
    }
    
    return steps[campo as keyof typeof steps] || 'otro'
  }


  private mapHistorialToProspectoData(historial: any): ProspectoData {
    return {
      whatsapp: historial.whatsapp,
      nombre: historial.nombre,
      email: historial.email,
      telefono: historial.telefono,
      edad: historial.edad,
      region: historial.region,
      carrera_interes: historial.carrera_interes,
      nivel_interes: historial.nivel_interes,
      tipo_consulta: historial.tipo_consulta,
      telefono_confirmado: historial.telefono_confirmado,
      preferencia_contacto: historial.preferencia_contacto,
      source: 'historial_uniacc'
    }
  }

  private mapProspectoDataToUpdate(datos: ProspectoData): any {
    const mapped = {
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono,
      edad: datos.edad,
      region: datos.region,
      carrera_interes: datos.carrera_interes,
      facultad_interes: datos.facultad_interes,
      nivel_interes: datos.nivel_interes,
      tipo_consulta_actual: datos.tipo_consulta,
      telefono_confirmado: datos.telefono_confirmado,
      preferencia_contacto: datos.preferencia_contacto,
      ultima_interaccion: new Date()
    }
    
    console.log(`🔍 [SERVICE-V2] mapProspectoDataToUpdate resultado:`, JSON.stringify(mapped, null, 2))
    return mapped
  }
}
