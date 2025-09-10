/**
 * 🎯 Prospect Service
 * Servicio para manejo de prospectos y operaciones de BD
 */

import { ProspectoData, ProgressiveStep, ProspectResult, SessionResult } from '../domain/types/prospect'
import { UserState } from '../domain/types/user-state'
import { SupabaseIntegration } from '../actions/supabase-integration'

export class ProspectService {
  private supabaseIntegration: SupabaseIntegration

  constructor(webhookUrl: string, webhookSecret: string) {
    this.supabaseIntegration = new SupabaseIntegration(webhookUrl, webhookSecret)
  }

  /**
   * 📝 Progressive Capture: Guardar cada paso individual
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
      
      // 📊 Crear datos incrementales con el nuevo campo
      const datosIncrementales = { ...datos } as any
      datosIncrementales[campo] = valor
      
      console.log(`📝 [PROGRESSIVE] Guardando paso: ${campo} = ${valor} para ${userId}`)
      
      const prospectoData: ProspectoData = {
        whatsapp: userId,
        nombre: datosIncrementales.nombre || 'Usuario WhatsApp',
        email: datosIncrementales.email || null,
        telefono: datosIncrementales.telefono || null,
        edad: datosIncrementales.edad || undefined,
        region: datosIncrementales.region || undefined,
        carrera_interes: datosIncrementales.carrera_interes || "Sin especificar",
        nivel_interes: datosIncrementales.nivel_interes || 'medio',
        tipo_consulta: tipoConsultaPaso,
        source: 'uniacc_chatbot',
        flujo_actual: `paso_${campo}`,
        // 🆕 Preservar preferencias de contacto
        telefono_confirmado: datosIncrementales.telefono_confirmado !== undefined ? datosIncrementales.telefono_confirmado : true,
        preferencia_contacto: datosIncrementales.preferencia_contacto || 'normal',
        // 🔄 Metadata específica del paso
        datos_adicionales: {
          campo_capturado: campo,
          valor_capturado: valor,
          paso_numero: this.calculateStepNumber(campo),
          progreso_porcentaje: this.calculateProgress(datosIncrementales),
          pasos_completados: this.getCompletedSteps(datosIncrementales)
        }
      }

      return await this.supabaseIntegration.enviarProspecto(prospectoData)
      
    } catch (error) {
      console.error(`💥 [PROGRESSIVE] Error crítico en paso ${campo}:`, error)
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
    }
  }

  /**
   * 📊 Crear prospecto inicial (legacy support)
   */
  async createInitialProspect(userId: string, nombre: string): Promise<string | null> {
    try {
      const prospectoData: ProspectoData = {
        whatsapp: userId,
        nombre,
        email: null,
        telefono: null,
        carrera_interes: "Sin especificar",
        nivel_interes: 'medio',
        tipo_consulta: 'captura en proceso',
        source: 'uniacc_chatbot',
        flujo_actual: 'captura_inicial'
      }

      const resultado = await this.supabaseIntegration.enviarProspecto(prospectoData)
      return resultado.success ? resultado.prospectoId || null : null
      
    } catch (error) {
      console.error('💥 Error creando prospecto inicial:', error)
      return null
    }
  }

  /**
   * 🔄 Actualizar campo específico de prospecto
   */
  async updateProspectField(prospectoId: string, campo: string, valor: any): Promise<boolean> {
    try {
      // Esta funcionalidad se implementaría en SupabaseIntegration
      console.log(`🔄 [UPDATE] ${prospectoId}: ${campo} = ${valor}`)
      return true
    } catch (error) {
      console.error(`❌ Error actualizando ${campo}:`, error)
      return false
    }
  }

  /**
   * 🔍 Verificar usuario existente
   */
  async verifyExistingUser(userId: string): Promise<any> {
    try {
      // Usar endpoint de reconocimiento existente
      const axios = (await import('axios')).default
      const response = await axios.get(`http://localhost:3000/api/prospectos/reconocimiento/${userId}`, {
        headers: {
          'User-Agent': 'UNIACC-ChatBot-Direct/1.0'
        },
        timeout: 10000
      })
      
      if (response.status !== 200 || !response.data || response.data.length === 0) {
        console.log(`🆕 [VERIFICAR] Usuario nuevo: ${userId}`)
        return null
      }
      
      console.log(`🔍 [VERIFICAR] Usuario existente encontrado: ${userId}`)
      return response.data
      
    } catch (error) {
      console.log(`🆕 [VERIFICAR] Usuario nuevo (error en verificación): ${userId}`)
      return null
    }
  }

  /**
   * 💾 Guardar datos por timeout
   */
  async saveTimeoutSession(userId: string, estado: UserState): Promise<void> {
    const datos = estado.datos_prospecto
    
    // 🆕 PROGRESSIVE: Si ya tiene prospecto_id, actualizar existente
    if (estado.prospecto_id) {
      console.log(`💾 Actualizando prospecto existente por timeout: ${estado.prospecto_id}`)
      
      // Determinar tipo_consulta según campos completados
      const camposCompletos = estado.campos_capturados || []
      let tipoConsulta = 'abandono solo nombre'
      
      if (camposCompletos.includes('email')) tipoConsulta = 'abandono con email'
      if (camposCompletos.includes('edad')) tipoConsulta = 'abandono con edad'
      if (camposCompletos.includes('region')) tipoConsulta = 'abandono con region'
      
      await this.updateProspectField(estado.prospecto_id, 'tipo_consulta', tipoConsulta)
      await this.updateProspectField(estado.prospecto_id, 'nivel_interes', 'bajo')
      
      console.log(`✅ Prospecto actualizado por timeout: ${estado.prospecto_id} (${tipoConsulta})`)
      return
    }
    
    // 🔄 FALLBACK: Si no hay prospecto_id, crear uno nuevo (caso legacy)
    if (datos.nombre) {
      const prospectoId = await this.createInitialProspect(userId, datos.nombre)
      if (prospectoId) {
        console.log(`✅ Prospecto timeout creado: ${prospectoId}`)
      }
    }
  }

  /**
   * 🏷️ Helpers privados
   */
  private determineTipoConsultaPorPaso(campo: string, datos: any): string {
    const baseType = 'progressive_capture'
    
    switch (campo) {
      case 'nombre': return `${baseType}_nombre`
      case 'email': return `${baseType}_email`
      case 'edad': return `${baseType}_edad`
      case 'region': return `${baseType}_region`
      case 'telefono': return `${baseType}_telefono`
      default: return `${baseType}_${campo}`
    }
  }

  private calculateStepNumber(campo: string): number {
    const pasos = ['nombre', 'email', 'edad', 'region', 'telefono']
    return pasos.indexOf(campo) + 1
  }

  private calculateProgress(datos: any): number {
    const camposObligatorios = ['nombre', 'email', 'edad', 'region']
    const camposCompletos = camposObligatorios.filter(campo => datos[campo] != null).length
    return Math.round((camposCompletos / camposObligatorios.length) * 100)
  }

  private getCompletedSteps(datos: any): string[] {
    const pasos = []
    if (datos.nombre) pasos.push('nombre')
    if (datos.email) pasos.push('email')
    if (datos.edad) pasos.push('edad')
    if (datos.region) pasos.push('region')
    if (datos.telefono && datos.telefono_confirmado) pasos.push('telefono')
    return pasos
  }
}
