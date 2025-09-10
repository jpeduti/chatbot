/**
 * 🚀 Cached Prospecto Repository
 * Repository mejorado con sistema de caché avanzado
 */

import { PrismaClient, prospecto_actual, Prisma } from '../generated/prisma'
import { 
  IProspectoActualRepository,
  CreateProspectoData,
  UpdateProspectoData 
} from './interfaces/IProspectoRepository'
import { IPaginatedResult, IPaginationOptions } from './interfaces/IBaseRepository'
import { ICacheManager } from '../cache/interfaces/ICacheManager'

export class CachedProspectoRepository implements IProspectoActualRepository {
  private prisma: PrismaClient
  private cache: ICacheManager

  // 🔧 Configuración de caché
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutos
  private readonly CACHE_NAMESPACE = 'prospecto'
  private readonly CACHE_TAGS = {
    PROSPECTO: 'prospecto',
    WHATSAPP: 'whatsapp',
    EMAIL: 'email',
    TELEFONO: 'telefono',
    REGION: 'region',
    CARRERA: 'carrera',
    STATS: 'stats'
  }

  constructor(prisma: PrismaClient, cache: ICacheManager) {
    this.prisma = prisma
    this.cache = cache
    console.log('🚀 [CACHED-REPO] Inicializado con cache avanzado')
  }

  // 🎯 CORE CRUD OPERATIONS CON CACHE

  async findById(whatsapp: string): Promise<prospecto_actual | null> {
    return this.findByWhatsapp(whatsapp)
  }

  async findByWhatsapp(whatsapp: string): Promise<prospecto_actual | null> {
    const cacheKey = this.getCacheKey('whatsapp', whatsapp)

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] findByWhatsapp: ${whatsapp}`)
        return await this.prisma.prospecto_actual.findUnique({
          where: { whatsapp },
          include: {
            ejecutivos: true
          }
        })
      },
      {
        ttl: this.CACHE_TTL,
        tags: [this.CACHE_TAGS.PROSPECTO, this.CACHE_TAGS.WHATSAPP],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  async findByEmail(email: string): Promise<prospecto_actual | null> {
    const cacheKey = this.getCacheKey('email', email)

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] findByEmail: ${email}`)
        return await this.prisma.prospecto_actual.findFirst({
          where: { email }
        })
      },
      {
        ttl: this.CACHE_TTL,
        tags: [this.CACHE_TAGS.PROSPECTO, this.CACHE_TAGS.EMAIL],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  async findByTelefono(telefono: string): Promise<prospecto_actual | null> {
    const cacheKey = this.getCacheKey('telefono', telefono)

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] findByTelefono: ${telefono}`)
        return await this.prisma.prospecto_actual.findFirst({
          where: { telefono }
        })
      },
      {
        ttl: this.CACHE_TTL,
        tags: [this.CACHE_TAGS.PROSPECTO, this.CACHE_TAGS.TELEFONO],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  async findMany(filters?: Prisma.prospecto_actualWhereInput): Promise<prospecto_actual[]> {
    const cacheKey = this.getCacheKey('findMany', JSON.stringify(filters || {}))

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] findMany con filtros`)
        return await this.prisma.prospecto_actual.findMany({
          where: filters,
          orderBy: { ultima_interaccion: 'desc' },
          take: 100
        })
      },
      {
        ttl: this.CACHE_TTL / 2, // Menor TTL para consultas complejas
        tags: [this.CACHE_TAGS.PROSPECTO],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  async create(data: CreateProspectoData): Promise<prospecto_actual> {
    try {
      console.log(`🔥 [DB-CREATE] Creando prospecto: ${data.whatsapp}`)
      
      const prospecto = await this.prisma.prospecto_actual.create({
        data: {
          whatsapp: data.whatsapp,
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          edad: data.edad,
          region: data.region,
          carrera_interes: data.carrera_interes || 'Sin especificar',
          nivel_interes: data.nivel_interes || 'medio',
          tipo_consulta_actual: data.tipo_consulta || 'consulta_general',
          telefono_confirmado: data.telefono_confirmado ?? true,
          preferencia_contacto: data.preferencia_contacto || 'normal',
          metadata: data.metadata || {},
          primera_interaccion: new Date(),
          ultima_interaccion: new Date(),
          total_sesiones: 1
        }
      })

      // 🗑️ Invalidar cachés relacionados
      await this.invalidateProspectoCache(data.whatsapp, data.email, data.telefono, data.region, data.carrera_interes)
      
      console.log(`✅ [CACHED-REPO] Prospecto creado: ${prospecto.whatsapp}`)
      return prospecto
    } catch (error) {
      console.error(`❌ [CACHED-REPO] Error creando prospecto:`, error)
      throw error
    }
  }

  async update(whatsapp: string, data: UpdateProspectoData): Promise<prospecto_actual | null> {
    try {
      console.log(`🔥 [DB-UPDATE] Actualizando prospecto: ${whatsapp}`)
      
      const prospecto = await this.prisma.prospecto_actual.update({
        where: { whatsapp },
        data: {
          ...data,
          updated_at: new Date()
        }
      })

      // 🗑️ Invalidar cachés relacionados
      await this.invalidateProspectoCache(whatsapp, data.email, data.telefono, data.region, data.carrera_interes)
      
      console.log(`✅ [CACHED-REPO] Prospecto actualizado: ${whatsapp}`)
      return prospecto
    } catch (error) {
      console.error(`❌ [CACHED-REPO] Error actualizando prospecto ${whatsapp}:`, error)
      return null
    }
  }

  async delete(whatsapp: string): Promise<boolean> {
    try {
      console.log(`🔥 [DB-DELETE] Eliminando prospecto: ${whatsapp}`)
      
      await this.prisma.prospecto_actual.delete({
        where: { whatsapp }
      })

      // 🗑️ Invalidar todos los cachés de este prospecto
      await this.invalidateProspectoCache(whatsapp)
      
      console.log(`✅ [CACHED-REPO] Prospecto eliminado: ${whatsapp}`)
      return true
    } catch (error) {
      console.error(`❌ [CACHED-REPO] Error eliminando prospecto ${whatsapp}:`, error)
      return false
    }
  }

  async count(filters?: Prisma.prospecto_actualWhereInput): Promise<number> {
    const cacheKey = this.getCacheKey('count', JSON.stringify(filters || {}))

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] count con filtros`)
        return await this.prisma.prospecto_actual.count({
          where: filters
        })
      },
      {
        ttl: this.CACHE_TTL / 4, // TTL más corto para counts
        tags: [this.CACHE_TAGS.STATS],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  // 🎯 MÉTODOS ESPECÍFICOS CON CACHE

  async findActiveProspects(limit = 50): Promise<prospecto_actual[]> {
    const cacheKey = this.getCacheKey('activeProspects', limit.toString())

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] findActiveProspects: ${limit}`)
        return await this.prisma.prospecto_actual.findMany({
          where: {
            ultima_interaccion: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { ultima_interaccion: 'desc' },
          take: limit
        })
      },
      {
        ttl: this.CACHE_TTL / 2,
        tags: [this.CACHE_TAGS.PROSPECTO, this.CACHE_TAGS.STATS],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  async findPriorityProspects(): Promise<prospecto_actual[]> {
    const cacheKey = this.getCacheKey('priorityProspects')

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] findPriorityProspects`)
        return await this.prisma.prospecto_actual.findMany({
          where: { es_prioritario: true },
          orderBy: { ultima_interaccion: 'desc' },
          take: 20
        })
      },
      {
        ttl: this.CACHE_TTL / 2,
        tags: [this.CACHE_TAGS.PROSPECTO, this.CACHE_TAGS.STATS],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  async findByCarrera(carrera: string): Promise<prospecto_actual[]> {
    const cacheKey = this.getCacheKey('carrera', carrera)

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] findByCarrera: ${carrera}`)
        return await this.prisma.prospecto_actual.findMany({
          where: { carrera_interes: carrera },
          orderBy: { ultima_interaccion: 'desc' }
        })
      },
      {
        ttl: this.CACHE_TTL,
        tags: [this.CACHE_TAGS.PROSPECTO, this.CACHE_TAGS.CARRERA],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  async findByRegion(region: string): Promise<prospecto_actual[]> {
    const cacheKey = this.getCacheKey('region', region)

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] findByRegion: ${region}`)
        return await this.prisma.prospecto_actual.findMany({
          where: { region },
          orderBy: { ultima_interaccion: 'desc' }
        })
      },
      {
        ttl: this.CACHE_TTL,
        tags: [this.CACHE_TAGS.PROSPECTO, this.CACHE_TAGS.REGION],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  async updateLastInteraction(whatsapp: string): Promise<void> {
    try {
      await this.prisma.prospecto_actual.update({
        where: { whatsapp },
        data: { ultima_interaccion: new Date() }
      })

      // 🗑️ Invalidar cache específico
      await this.cache.delete(this.getCacheKey('whatsapp', whatsapp))
      
      console.log(`⏰ [CACHED-REPO] Última interacción actualizada: ${whatsapp}`)
    } catch (error) {
      console.error(`❌ [CACHED-REPO] Error actualizando última interacción:`, error)
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

      // 🗑️ Invalidar cache específico
      await this.cache.delete(this.getCacheKey('whatsapp', whatsapp))
      
      console.log(`📈 [CACHED-REPO] Sesiones incrementadas: ${whatsapp}`)
    } catch (error) {
      console.error(`❌ [CACHED-REPO] Error incrementando sesiones:`, error)
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

      // 🗑️ Invalidar cache específico
      await this.cache.delete(this.getCacheKey('whatsapp', whatsapp))
      
      console.log(`👥 [CACHED-REPO] Prospecto asignado: ${whatsapp} -> ${executiveId}`)
    } catch (error) {
      console.error(`❌ [CACHED-REPO] Error asignando ejecutivo:`, error)
    }
  }

  async getProspectStats(): Promise<{
    total: number
    nuevos: number
    activos: number
    prioritarios: number
  }> {
    const cacheKey = this.getCacheKey('stats')

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] getProspectStats`)
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
      },
      {
        ttl: this.CACHE_TTL / 4, // Stats se actualizan más frecuentemente
        tags: [this.CACHE_TAGS.STATS],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  async findPaginated(
    filters: Prisma.prospecto_actualWhereInput,
    options: IPaginationOptions
  ): Promise<IPaginatedResult<prospecto_actual>> {
    const cacheKey = this.getCacheKey('paginated', JSON.stringify({ filters, options }))

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`🔍 [DB-QUERY] findPaginated`)
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
      },
      {
        ttl: this.CACHE_TTL / 2,
        tags: [this.CACHE_TAGS.PROSPECTO],
        namespace: this.CACHE_NAMESPACE
      }
    )
  }

  // 🧹 MÉTODOS DE CACHE MANAGEMENT

  public async clearExpiredCache(): Promise<number> {
    return await this.cache.clearExpired()
  }

  public async clearProspectoCache(): Promise<number> {
    return await this.cache.clearNamespace(this.CACHE_NAMESPACE)
  }

  public async invalidateStatsCache(): Promise<number> {
    return await this.cache.invalidateByTag(this.CACHE_TAGS.STATS)
  }

  public async getCacheStats(): Promise<any> {
    return await this.cache.getStats()
  }

  // 🛠️ HELPER METHODS

  private getCacheKey(...parts: string[]): string {
    return `${this.CACHE_NAMESPACE}:${parts.join(':')}`
  }

  private async invalidateProspectoCache(
    whatsapp: string,
    email?: string | null,
    telefono?: string | null,
    region?: string | null,
    carrera?: string | null
  ): Promise<void> {
    // 🗑️ Keys específicos a invalidar
    const keysToInvalidate = [
      this.getCacheKey('whatsapp', whatsapp)
    ]

    if (email) keysToInvalidate.push(this.getCacheKey('email', email))
    if (telefono) keysToInvalidate.push(this.getCacheKey('telefono', telefono))

    // 🗑️ Invalidar keys específicos
    await this.cache.mdelete(keysToInvalidate)

    // 🏷️ Invalidar por tags (consultas relacionadas)
    await this.cache.invalidateByTags([
      this.CACHE_TAGS.PROSPECTO,
      this.CACHE_TAGS.STATS
    ])

    if (region) await this.cache.invalidateByTag(this.CACHE_TAGS.REGION)
    if (carrera) await this.cache.invalidateByTag(this.CACHE_TAGS.CARRERA)

    console.log(`🗑️ [CACHE-INVALIDATE] Prospecto: ${whatsapp}`)
  }
}
