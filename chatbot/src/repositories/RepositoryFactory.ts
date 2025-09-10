/**
 * 🏭 Repository Factory
 * Factory para crear y gestionar repositorios con Prisma
 */

import { PrismaClient } from '../generated/prisma'
import { PrismaProspectoActualRepository } from './PrismaProspectoRepository'
import { PrismaProspectoHistorialRepository } from './PrismaProspectoHistorialRepository'
import { IProspectoActualRepository, IProspectoHistorialRepository } from './interfaces/IProspectoRepository'

export class RepositoryFactory {
  private static instance: RepositoryFactory
  private prisma: PrismaClient
  private repositories: Map<string, any> = new Map()

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'], // Reducir logging
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
    
    // Handle cleanup on process exit
    process.on('SIGINT', () => this.cleanup())
    process.on('SIGTERM', () => this.cleanup())
    
    console.log('🏭 [REPO-FACTORY] Inicializado con Prisma Client')
  }

  public static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory()
    }
    return RepositoryFactory.instance
  }

  // 🎯 Getters para repositorios específicos

  public getProspectoActualRepository(): IProspectoActualRepository {
    return this.getOrCreate('prospecto_actual', () => new PrismaProspectoActualRepository(this.prisma))
  }

  public getProspectoHistorialRepository(): IProspectoHistorialRepository {
    return this.getOrCreate('prospecto_historial', () => new PrismaProspectoHistorialRepository(this.prisma))
  }

  // 🔧 Acceso directo al cliente Prisma (para casos especiales)
  public getPrismaClient(): PrismaClient {
    return this.prisma
  }

  // 🏗️ Generic repository creator
  private getOrCreate<T>(key: string, factory: () => T): T {
    if (!this.repositories.has(key)) {
      this.repositories.set(key, factory())
      console.log(`✅ [REPO-FACTORY] Creado: ${key}Repository`)
    }
    return this.repositories.get(key)
  }

  // 🎯 Health check para conexión de BD
  public async healthCheck(): Promise<{
    database: boolean
    latency?: number
    error?: string
  }> {
    try {
      const start = Date.now()
      await this.prisma.$queryRaw`SELECT 1`
      const latency = Date.now() - start

      console.log(`✅ [REPO-FACTORY] Health check OK - ${latency}ms`)
      return { database: true, latency }
    } catch (error) {
      console.error(`❌ [REPO-FACTORY] Health check failed:`, error)
      return { 
        database: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // 📊 Obtener estadísticas de conexión
  public async getConnectionStats(): Promise<{
    activeConnections?: number
    totalQueries?: number
    averageQueryTime?: number
  }> {
    try {
      // Note: Prisma doesn't expose connection pool stats directly
      // This is a placeholder for potential metrics
      return {
        activeConnections: 1, // Prisma manages this internally
        totalQueries: 0,
        averageQueryTime: 0
      }
    } catch (error) {
      console.error(`❌ [REPO-FACTORY] Error obteniendo stats:`, error)
      return {}
    }
  }

  // 🧹 Cache cleanup para todos los repositorios
  public clearAllCaches(): void {
    try {
      // Clear prospect cache if available
      const prospectoRepo = this.repositories.get('prospecto_actual') as PrismaProspectoActualRepository
      if (prospectoRepo && typeof prospectoRepo.clearExpiredCache === 'function') {
        prospectoRepo.clearExpiredCache()
      }

      console.log(`🧹 [REPO-FACTORY] Caches limpiados`)
    } catch (error) {
      console.error(`❌ [REPO-FACTORY] Error limpiando caches:`, error)
    }
  }

  // 🔄 Método para realizar transacciones
  public async transaction<T>(
    fn: (prisma: any) => Promise<T>
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        return await fn(tx)
      })
    } catch (error) {
      console.error(`❌ [REPO-FACTORY] Error en transacción:`, error)
      throw error
    }
  }

  // 🔄 Batch operations
  public async batchExecute(operations: (() => Promise<any>)[]): Promise<any[]> {
    try {
      return await Promise.all(operations.map(op => op()))
    } catch (error) {
      console.error(`❌ [REPO-FACTORY] Error en operaciones batch:`, error)
      throw error
    }
  }

  // 🎯 Métricas útiles para WhatsApp
  public async getWhatsAppMetrics(): Promise<{
    activeUsers24h: number
    totalProspects: number
    completedCaptures: number
    abandonmentRate: number
  }> {
    try {
      const prospectoRepo = this.getProspectoActualRepository()
      const historialRepo = this.getProspectoHistorialRepository()

      const [stats, abandonmentAnalysis] = await Promise.all([
        prospectoRepo.getProspectStats(),
        historialRepo.getAbandonmentAnalysis()
      ])

      const totalAbandonment = abandonmentAnalysis.reduce((sum, item) => sum + item.abandonos, 0)
      const abandonmentRate = stats.total > 0 ? (totalAbandonment / stats.total) * 100 : 0

      return {
        activeUsers24h: stats.activos,
        totalProspects: stats.total,
        completedCaptures: stats.total - totalAbandonment,
        abandonmentRate
      }
    } catch (error) {
      console.error(`❌ [REPO-FACTORY] Error obteniendo métricas WhatsApp:`, error)
      return {
        activeUsers24h: 0,
        totalProspects: 0,
        completedCaptures: 0,
        abandonmentRate: 0
      }
    }
  }

  // 🧹 Cleanup
  private async cleanup(): Promise<void> {
    try {
      console.log('🧹 [REPO-FACTORY] Cerrando conexiones...')
      await this.prisma.$disconnect()
      console.log('✅ [REPO-FACTORY] Conexiones cerradas')
    } catch (error) {
      console.error(`❌ [REPO-FACTORY] Error en cleanup:`, error)
    }
  }
}

// 🌍 Export singleton instance
export const repositoryFactory = RepositoryFactory.getInstance()
