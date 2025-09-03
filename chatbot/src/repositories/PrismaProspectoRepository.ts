/**
 * 🗄️ Prisma Prospecto Repository
 * Implementación del Repository Pattern con Prisma Client
 */

import { PrismaClient, prospecto_actual, prospecto_historial, Prisma } from '../generated/prisma'
import { 
  IProspectoActualRepository, 
  IProspectoHistorialRepository,
  CreateProspectoData,
  UpdateProspectoData 
} from './interfaces/IProspectoRepository'
import { IPaginatedResult, IPaginationOptions } from './interfaces/IBaseRepository'

export class PrismaProspectoActualRepository implements IProspectoActualRepository {
  private prisma: PrismaClient
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutos

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    console.log('🗄️ [REPO] PrismaProspectoActualRepository inicializado')
  }

  // 🎯 CORE CRUD OPERATIONS

  async findById(whatsapp: string): Promise<prospecto_actual | null> {
    return this.findByWhatsapp(whatsapp)
  }

  async findByWhatsapp(whatsapp: string): Promise<prospecto_actual | null> {
    console.log(`\n🔍 [REPO-DETAILED] ===== BÚSQUEDA DETALLADA =====`)
    console.log(`📱 [REPO-DETAILED] Buscando whatsapp: "${whatsapp}"`)
    console.log(`⏰ [REPO-DETAILED] Timestamp consulta: ${new Date().toISOString()}`)
    console.log(`🏭 [REPO-DETAILED] Instancia Prisma: ${!!this.prisma}`)
    
    // 💾 CACHE CON LOGS DETALLADOS
    const cacheKey = `prospecto:${whatsapp}`
    console.log(`🔑 [REPO-DETAILED] CacheKey: "${cacheKey}"`)
    console.log(`📊 [REPO-DETAILED] Cache size actual: ${this.cache.size}`)
    console.log(`⏱️ [REPO-DETAILED] Cache TTL: ${this.CACHE_TTL}ms`)
    
    const cached = this.cache.get(cacheKey)
    console.log(`💾 [REPO-DETAILED] Cache entry exists: ${!!cached}`)
    
    if (cached) {
      const age = Date.now() - cached.timestamp
      const isValid = age < this.CACHE_TTL
      console.log(`💾 [REPO-DETAILED] Cache entry details:`, {
        timestamp: new Date(cached.timestamp).toISOString(),
        age: `${age}ms`,
        isValid: isValid,
        TTL: `${this.CACHE_TTL}ms`,
        hasData: !!cached.data,
        dataPreview: cached.data ? `${cached.data.whatsapp} - ${cached.data.nombre}` : 'null'
      })
      
      if (isValid) {
        console.log(`✅ [REPO-DETAILED] CACHE HIT - Retornando datos del cache`)
        console.log(`💾 [CACHE] Hit para prospecto ${whatsapp}`)
        return cached.data
      } else {
        console.log(`⏰ [REPO-DETAILED] CACHE EXPIRED - Eliminando entrada expirada`)
        this.cache.delete(cacheKey)
      }
    } else {
      console.log(`❌ [REPO-DETAILED] CACHE MISS - No hay entrada en cache`)
    }

    try {
      console.log(`🚀 [REPO-DETAILED] Ejecutando query Prisma...`)
      console.log(`📋 [REPO-DETAILED] Query: findUnique({ where: { whatsapp: "${whatsapp}" } })`)
      
      const prospecto = await this.prisma.prospecto_actual.findUnique({
        where: { whatsapp },
        include: {
          ejecutivos: true // Include assigned executive info
        }
      })

      console.log(`📊 [REPO-DETAILED] ===== RESULTADO QUERY PRISMA =====`)
      console.log(`✅ [REPO-DETAILED] Query ejecutada exitosamente`)
      console.log(`📋 [REPO-DETAILED] Resultado encontrado: ${!!prospecto}`)
      
      if (prospecto) {
        console.log(`👤 [REPO-DETAILED] Datos del prospecto encontrado:`)
        console.log(`   - whatsapp: "${prospecto.whatsapp}"`)
        console.log(`   - nombre: "${prospecto.nombre}"`)
        console.log(`   - email: "${prospecto.email || '[SIN EMAIL]'}"`)
        console.log(`   - telefono: "${prospecto.telefono || '[SIN TELEFONO]'}"`)
        console.log(`   - created_at: ${prospecto.primera_interaccion}`)
        console.log(`   - updated_at: ${prospecto.ultima_interaccion}`)
        console.log(`   - total_sesiones: ${prospecto.total_sesiones}`)
        
        // 💾 CACHE UPDATE CON LOGS DETALLADOS
        const cacheEntry = { data: prospecto, timestamp: Date.now() }
        console.log(`💾 [REPO-DETAILED] Guardando en cache:`, {
          cacheKey: cacheKey,
          timestamp: new Date(cacheEntry.timestamp).toISOString(),
          dataPreview: `${prospecto.whatsapp} - ${prospecto.nombre}`
        })
        
        this.cache.set(cacheKey, cacheEntry)
        console.log(`✅ [REPO-DETAILED] CACHE UPDATED - Entrada guardada exitosamente`)
        console.log(`📊 [REPO-DETAILED] Nuevo cache size: ${this.cache.size}`)
      } else {
        console.log(`❌ [REPO-DETAILED] No se encontró prospecto en BD`)
        console.log(`🔍 [REPO-DETAILED] Verificación: el registro NO existe en prospecto_actual`)
        console.log(`💾 [REPO-DETAILED] No guardando en cache (resultado null)`)
      }

      console.log(`🔍 [REPO-DETAILED] ===== FIN BÚSQUEDA DETALLADA =====\n`)
      console.log(`🔍 [REPO] Prospecto encontrado: ${whatsapp} - ${prospecto?.nombre || 'No encontrado'}`)
      return prospecto
    } catch (error) {
      console.error(`\n💥 [REPO-DETAILED] ===== ERROR EN QUERY =====`)
      console.error(`❌ [REPO-DETAILED] Error ejecutando query Prisma:`)
      console.error(`📋 [REPO-DETAILED] Error detalles:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
      })
      console.error(`💥 [REPO-DETAILED] ===== FIN ERROR =====\n`)
      console.error(`❌ [REPO] Error buscando prospecto ${whatsapp}:`, error)
      return null
    }
  }

  async findByEmail(email: string): Promise<prospecto_actual | null> {
    try {
      return await this.prisma.prospecto_actual.findFirst({
        where: { email }
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando por email ${email}:`, error)
      return null
    }
  }

  async findByTelefono(telefono: string): Promise<prospecto_actual | null> {
    try {
      return await this.prisma.prospecto_actual.findFirst({
        where: { telefono }
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando por teléfono:`, error)
      return null
    }
  }

  async findMany(filters?: Prisma.prospecto_actualWhereInput): Promise<prospecto_actual[]> {
    try {
      return await this.prisma.prospecto_actual.findMany({
        where: filters,
        orderBy: { ultima_interaccion: 'desc' },
        take: 100 // Limit for performance
      })
    } catch (error) {
      console.error(`❌ [REPO] Error en findMany:`, error)
      return []
    }
  }

  async create(data: CreateProspectoData): Promise<prospecto_actual> {
    try {
      console.log(`🔍 [REPO-CREATE] Datos recibidos para crear:`, JSON.stringify(data, null, 2))
      
      const insertData = {
        whatsapp: data.whatsapp,
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        edad: data.edad,
        region: data.region,
        carrera_interes: data.carrera_interes || 'Sin especificar',
        facultad_interes: data.facultad_interes || '',
        nivel_interes: data.nivel_interes || 'medio',
        tipo_consulta_actual: data.tipo_consulta || 'consulta_general',
        telefono_confirmado: data.telefono_confirmado ?? true,
        preferencia_contacto: data.preferencia_contacto || 'normal',
        metadata: data.metadata || {},
        primera_interaccion: new Date(),
        ultima_interaccion: new Date(),
        total_sesiones: 1
      }
      
      console.log(`📝 [REPO-CREATE] Datos enviados a Prisma:`, JSON.stringify(insertData, null, 2))
      
      const prospecto = await this.prisma.prospecto_actual.create({
        data: insertData
      })
      
      console.log(`✅ [REPO-CREATE] Prospecto creado en BD:`, JSON.stringify({
        whatsapp: prospecto.whatsapp,
        nombre: prospecto.nombre,
        carrera_interes: prospecto.carrera_interes,
        facultad_interes: prospecto.facultad_interes,
        nivel_interes: prospecto.nivel_interes
      }, null, 2))

      // Clear cache
      this.invalidateCache(data.whatsapp)
      
      console.log(`✅ [REPO] Prospecto creado: ${prospecto.whatsapp} - ${prospecto.nombre}`)
      return prospecto
    } catch (error) {
      console.error(`❌ [REPO] Error creando prospecto:`, error)
      throw error
    }
  }

  async update(whatsapp: string, data: UpdateProspectoData): Promise<prospecto_actual | null> {
    try {
      console.log(`🔍 [REPO-UPDATE] Datos recibidos para actualizar ${whatsapp}:`, JSON.stringify(data, null, 2))
      
      const updateData = {
        ...data,
        updated_at: new Date()
      }
      
      console.log(`📝 [REPO-UPDATE] Datos enviados a Prisma:`, JSON.stringify(updateData, null, 2))
      
      const prospecto = await this.prisma.prospecto_actual.update({
        where: { whatsapp },
        data: updateData
      })
      
      console.log(`✅ [REPO-UPDATE] Prospecto actualizado en BD:`, JSON.stringify({
        whatsapp: prospecto.whatsapp,
        nombre: prospecto.nombre,
        carrera_interes: prospecto.carrera_interes,
        facultad_interes: prospecto.facultad_interes,
        nivel_interes: prospecto.nivel_interes
      }, null, 2))

      // Clear cache
      this.invalidateCache(whatsapp)
      
      console.log(`✅ [REPO] Prospecto actualizado: ${whatsapp}`)
      return prospecto
    } catch (error) {
      console.error(`❌ [REPO] Error actualizando prospecto ${whatsapp}:`, error)
      return null
    }
  }

  async delete(whatsapp: string): Promise<boolean> {
    try {
      await this.prisma.prospecto_actual.delete({
        where: { whatsapp }
      })

      // Clear cache
      this.invalidateCache(whatsapp)
      
      console.log(`✅ [REPO] Prospecto eliminado: ${whatsapp}`)
      return true
    } catch (error) {
      console.error(`❌ [REPO] Error eliminando prospecto ${whatsapp}:`, error)
      return false
    }
  }

  async count(filters?: Prisma.prospecto_actualWhereInput): Promise<number> {
    try {
      return await this.prisma.prospecto_actual.count({
        where: filters
      })
    } catch (error) {
      console.error(`❌ [REPO] Error contando prospectos:`, error)
      return 0
    }
  }

  // 🎯 MÉTODOS ESPECÍFICOS

  async findActiveProspects(limit = 50): Promise<prospecto_actual[]> {
    try {
      return await this.prisma.prospecto_actual.findMany({
        where: {
          ultima_interaccion: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { ultima_interaccion: 'desc' },
        take: limit
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando prospectos activos:`, error)
      return []
    }
  }

  async findPriorityProspects(): Promise<prospecto_actual[]> {
    try {
      return await this.prisma.prospecto_actual.findMany({
        where: { es_prioritario: true },
        orderBy: { ultima_interaccion: 'desc' },
        take: 20
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando prospectos prioritarios:`, error)
      return []
    }
  }

  async findByCarrera(carrera: string): Promise<prospecto_actual[]> {
    try {
      return await this.prisma.prospecto_actual.findMany({
        where: { carrera_interes: carrera },
        orderBy: { ultima_interaccion: 'desc' }
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando por carrera ${carrera}:`, error)
      return []
    }
  }

  async findByRegion(region: string): Promise<prospecto_actual[]> {
    try {
      return await this.prisma.prospecto_actual.findMany({
        where: { region },
        orderBy: { ultima_interaccion: 'desc' }
      })
    } catch (error) {
      console.error(`❌ [REPO] Error buscando por región ${region}:`, error)
      return []
    }
  }

  async updateLastInteraction(whatsapp: string): Promise<void> {
    try {
      await this.prisma.prospecto_actual.update({
        where: { whatsapp },
        data: { ultima_interaccion: new Date() }
      })

      this.invalidateCache(whatsapp)
    } catch (error) {
      console.error(`❌ [REPO] Error actualizando última interacción ${whatsapp}:`, error)
    }
  }

  async incrementSessionCount(whatsapp: string): Promise<void> {
    try {
      await this.prisma.prospecto_actual.update({
        where: { whatsapp },
        data: { 
          total_sesiones: { increment: 1 },
          ultima_interaccion: new Date()
        }
      })

      this.invalidateCache(whatsapp)
    } catch (error) {
      console.error(`❌ [REPO] Error incrementando sesiones ${whatsapp}:`, error)
    }
  }

  async assignToExecutive(whatsapp: string, executiveId: string): Promise<void> {
    try {
      await this.prisma.prospecto_actual.update({
        where: { whatsapp },
        data: { 
          assigned_to: executiveId,
          ejecutivo_asignado_at: new Date()
        }
      })

      this.invalidateCache(whatsapp)
      console.log(`👥 [REPO] Prospecto ${whatsapp} asignado a ejecutivo ${executiveId}`)
    } catch (error) {
      console.error(`❌ [REPO] Error asignando ejecutivo:`, error)
    }
  }

  async getProspectStats(): Promise<{
    total: number
    nuevos: number
    activos: number
    prioritarios: number
  }> {
    try {
      const [total, nuevos, activos, prioritarios] = await Promise.all([
        this.prisma.prospecto_actual.count(),
        this.prisma.prospecto_actual.count({ where: { estado: 'nuevo' } }),
        this.prisma.prospecto_actual.count({
          where: {
            ultima_interaccion: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        this.prisma.prospecto_actual.count({ where: { es_prioritario: true } })
      ])

      return { total, nuevos, activos, prioritarios }
    } catch (error) {
      console.error(`❌ [REPO] Error obteniendo estadísticas:`, error)
      return { total: 0, nuevos: 0, activos: 0, prioritarios: 0 }
    }
  }

  async findPaginated(
    filters: Prisma.prospecto_actualWhereInput,
    options: IPaginationOptions
  ): Promise<IPaginatedResult<prospecto_actual>> {
    try {
      const page = options.page || 1
      const limit = options.limit || 20
      const skip = (page - 1) * limit

      const [data, total] = await Promise.all([
        this.prisma.prospecto_actual.findMany({
          where: filters,
          skip,
          take: limit,
          orderBy: {
            [options.orderBy || 'ultima_interaccion']: options.orderDirection || 'desc'
          }
        }),
        this.prisma.prospecto_actual.count({ where: filters })
      ])

      return {
        data,
        total,
        page,
        limit,
        hasMore: total > page * limit
      }
    } catch (error) {
      console.error(`❌ [REPO] Error en búsqueda paginada:`, error)
      return { data: [], total: 0, page: 1, limit: 20, hasMore: false }
    }
  }

  // 🧹 Cache management
  private invalidateCache(whatsapp: string): void {
    const cacheKey = `prospecto:${whatsapp}`
    console.log(`\n🧹 [CACHE-INVALIDATE] ===== LIMPIANDO CACHE =====`)
    console.log(`📱 [CACHE-INVALIDATE] WhatsApp: "${whatsapp}"`)
    console.log(`🔑 [CACHE-INVALIDATE] CacheKey: "${cacheKey}"`)
    console.log(`📊 [CACHE-INVALIDATE] Cache size antes: ${this.cache.size}`)
    console.log(`💾 [CACHE-INVALIDATE] Entrada existe antes: ${this.cache.has(cacheKey)}`)
    
    const deleted = this.cache.delete(cacheKey)
    
    console.log(`🗑️ [CACHE-INVALIDATE] Eliminación exitosa: ${deleted}`)
    console.log(`📊 [CACHE-INVALIDATE] Cache size después: ${this.cache.size}`)
    console.log(`🧹 [CACHE-INVALIDATE] ===== CACHE LIMPIADO =====\n`)
  }

  // 🧹 Clear expired cache entries
  public clearExpiredCache(): void {
    const now = Date.now()
    Array.from(this.cache.entries()).forEach(([key, value]) => {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key)
      }
    })
  }
}
