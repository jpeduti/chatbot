/**
 * 📋 Prisma Prospecto Historial Repository
 * Repository para el historial de sesiones y Progressive Capture
 */

import { PrismaClient, prospecto_historial, Prisma } from '../generated/prisma'
import { IProspectoHistorialRepository } from './interfaces/IProspectoRepository'

export class PrismaProspectoHistorialRepository implements IProspectoHistorialRepository {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    console.log('📋 [REPO] PrismaProspectoHistorialRepository inicializado')
  }

  // 🎯 CORE CRUD OPERATIONS

  async findById(id: string): Promise<prospecto_historial | null> {
    try {
      return await this.prisma.prospecto_historial.findUnique({
        where: { id }
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando historial ${id}:`, error)
      return null
    }
  }

  async findMany(filters?: Prisma.prospecto_historialWhereInput): Promise<prospecto_historial[]> {
    try {
      return await this.prisma.prospecto_historial.findMany({
        where: filters,
        orderBy: { sesion_inicio: 'desc' },
        take: 100
      })
    } catch (error) {
      console.error(`❌ [REPO] Error en findMany historial:`, error)
      return []
    }
  }

  async create(data: Omit<prospecto_historial, 'id' | 'created_at' | 'updated_at'>): Promise<prospecto_historial> {
    try {
      const historial = await this.prisma.prospecto_historial.create({
        data: {
          whatsapp: data.whatsapp,
          sesion_numero: data.sesion_numero,
          tipo_consulta: data.tipo_consulta,
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          edad: data.edad,
          region: data.region,
          carrera_interes: data.carrera_interes,
          facultad_interes: data.facultad_interes,
          nivel_interes: data.nivel_interes,
          sesion_inicio: data.sesion_inicio || new Date(),
          sesion_fin: data.sesion_fin,
          // duracion_sesion: data.duracion_sesion, // Removed - not supported
          mensajes_intercambiados: data.mensajes_intercambiados,
          flujo_completado: data.flujo_completado,
          razon_finalizacion: data.razon_finalizacion,
          paso_abandono: data.paso_abandono,
          datos_capturados: data.datos_capturados || {},
          fuente: data.fuente,
          metadata: data.metadata || {},
          telefono_confirmado: data.telefono_confirmado,
          preferencia_contacto: data.preferencia_contacto
        }
      })

      console.log(`✅ [REPO] Historial creado: ${historial.whatsapp} - Sesión ${historial.sesion_numero}`)
      return historial
    } catch (error) {
      console.error(`❌ [REPO] Error creando historial:`, error)
      throw error
    }
  }

  async update(id: string, data: Partial<prospecto_historial>): Promise<prospecto_historial | null> {
    try {
      const historial = await this.prisma.prospecto_historial.update({
        where: { id },
        data: data as any // Type assertion for Prisma compatibility
      })

      console.log(`✅ [REPO] Historial actualizado: ${id}`)
      return historial
    } catch (error) {
      console.error(`❌ [REPO] Error actualizando historial ${id}:`, error)
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.prospecto_historial.delete({
        where: { id }
      })

      console.log(`✅ [REPO] Historial eliminado: ${id}`)
      return true
    } catch (error) {
      console.error(`❌ [REPO] Error eliminando historial ${id}:`, error)
      return false
    }
  }

  async count(filters?: Prisma.prospecto_historialWhereInput): Promise<number> {
    try {
      return await this.prisma.prospecto_historial.count({
        where: filters
      })
    } catch (error) {
      console.error(`❌ [REPO] Error contando historial:`, error)
      return 0
    }
  }

  // 🎯 MÉTODOS ESPECÍFICOS

  async findByWhatsapp(whatsapp: string): Promise<prospecto_historial[]> {
    try {
      return await this.prisma.prospecto_historial.findMany({
        where: { whatsapp },
        orderBy: { sesion_numero: 'desc' }
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando historial de ${whatsapp}:`, error)
      return []
    }
  }

  async findByProspectoId(prospectoId: string): Promise<prospecto_historial[]> {
    try {
      // Note: This assumes there's a prospecto_id field or we need to join
      return await this.prisma.prospecto_historial.findMany({
        where: { 
          whatsapp: prospectoId // Assuming prospecto_id is whatsapp for now
        },
        orderBy: { sesion_numero: 'desc' }
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando historial por prospecto ${prospectoId}:`, error)
      return []
    }
  }

  async findRecentSessions(limit = 20): Promise<prospecto_historial[]> {
    try {
      return await this.prisma.prospecto_historial.findMany({
        orderBy: { sesion_inicio: 'desc' },
        take: limit
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando sesiones recientes:`, error)
      return []
    }
  }

  async getSessionsByPeriod(start: Date, end: Date): Promise<prospecto_historial[]> {
    try {
      return await this.prisma.prospecto_historial.findMany({
        where: {
          sesion_inicio: {
            gte: start,
            lte: end
          }
        },
        orderBy: { sesion_inicio: 'desc' }
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando sesiones por período:`, error)
      return []
    }
  }

  async getConversionFunnel(): Promise<{
    step: string
    count: number
    percentage: number
  }[]> {
    try {
      // Implementar análisis de funnel de conversión
      const totalSessions = await this.count()
      
      const steps = [
        'progressive_capture_nombre',
        'progressive_capture_email', 
        'progressive_capture_edad',
        'progressive_capture_region',
        'captura_completa'
      ]

      const funnel = []
      for (const step of steps) {
        const count = await this.count({
          tipo_consulta: step
        })
        const percentage = totalSessions > 0 ? (count / totalSessions) * 100 : 0
        funnel.push({ step, count, percentage })
      }

      return funnel
    } catch (error) {
      console.error(`❌ [REPO] Error calculando funnel de conversión:`, error)
      return []
    }
  }

  async saveProgressiveStep(data: {
    whatsapp: string
    sesion_numero: number
    tipo_consulta: string
    nombre: string
    email?: string
    telefono?: string
    edad?: number
    region?: string
    metadata?: any
  }): Promise<prospecto_historial> {
    try {
      const historial = await this.prisma.prospecto_historial.create({
        data: {
          whatsapp: data.whatsapp,
          sesion_numero: data.sesion_numero,
          tipo_consulta: data.tipo_consulta,
          nombre: data.nombre,
          email: data.email || null,
          telefono: data.telefono || null,
          edad: data.edad || null,
          region: data.region || null,
          carrera_interes: 'Sin especificar',
          facultad_interes: '',
          nivel_interes: 'medio',
          sesion_inicio: new Date(),
          sesion_fin: null,
          mensajes_intercambiados: 1,
          flujo_completado: false,
          razon_finalizacion: null,
          paso_abandono: null,
          datos_capturados: data.metadata || {},
          fuente: 'uniacc_chatbot',
          metadata: data.metadata || {},
          telefono_confirmado: true,
          preferencia_contacto: 'normal'
          // evolucion_interes se omite porque es columna generada (calculada automáticamente)
        }
      })

      console.log(`📝 [PROGRESSIVE] Paso guardado: ${data.tipo_consulta} para ${data.whatsapp}`)
      return historial
    } catch (error) {
      console.error(`❌ [REPO] Error guardando paso progresivo:`, error)
      throw error
    }
  }

  async getAbandonmentAnalysis(): Promise<{
    paso: string
    abandonos: number
    rate: number
  }[]> {
    try {
      const abandonmentSteps = [
        'abandono_inicial',
        'abandono_nombre',
        'abandono_email', 
        'abandono_edad',
        'abandono_region'
      ]

      const totalSessions = await this.count()
      const analysis = []

      for (const step of abandonmentSteps) {
        const abandonos = await this.count({
          tipo_consulta: step
        })
        const rate = totalSessions > 0 ? (abandonos / totalSessions) * 100 : 0
        analysis.push({ paso: step, abandonos, rate })
      }

      return analysis
    } catch (error) {
      console.error(`❌ [REPO] Error analizando abandonos:`, error)
      return []
    }
  }

  // 🎯 MÉTODOS AUXILIARES

  async getLatestSessionNumber(whatsapp: string): Promise<number> {
    try {
      const latest = await this.prisma.prospecto_historial.findFirst({
        where: { whatsapp },
        orderBy: { sesion_numero: 'desc' },
        select: { sesion_numero: true }
      })

      return latest ? latest.sesion_numero + 1 : 1
    } catch (error) {
      console.error(`❌ [REPO] Error obteniendo número de sesión:`, error)
      return 1
    }
  }

  async updateSessionEnd(id: string, razonFinalizacion?: string): Promise<void> {
    try {
      await this.update(id, {
        sesion_fin: new Date(),
        razon_finalizacion: razonFinalizacion || 'completada',
        flujo_completado: true
      })
    } catch (error) {
      console.error(`❌ [REPO] Error finalizando sesión ${id}:`, error)
    }
  }
}
