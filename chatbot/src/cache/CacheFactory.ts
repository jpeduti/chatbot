/**
 * 🏭 Cache Factory
 * Factory para crear diferentes tipos de cache managers
 */

import { ICacheManager } from './interfaces/ICacheManager'
import { MemoryCacheManager } from './MemoryCacheManager'
import { RedisCacheManager } from './RedisCacheManager'
import { MultiLayerCacheManager } from './MultiLayerCacheManager'

export type CacheType = 'memory' | 'redis' | 'multilayer'

export interface CacheConfig {
  type: CacheType
  memory?: {
    maxSize?: number
    defaultTTL?: number
  }
  redis?: {
    host?: string
    port?: number
    password?: string
    db?: number
    keyPrefix?: string
  }
  multilayer?: {
    l1MaxSize?: number
    l1TTL?: number
    l2Config?: any
  }
}

export class CacheFactory {
  private static instances = new Map<string, ICacheManager>()

  /**
   * 🏗️ Crear cache manager según configuración
   */
  static async create(config: CacheConfig, instanceName = 'default'): Promise<ICacheManager> {
    // 🔄 Reutilizar instancia existente
    if (this.instances.has(instanceName)) {
      const existing = this.instances.get(instanceName)!
      console.log(`♻️ [CACHE-FACTORY] Reutilizando instancia: ${instanceName}`)
      return existing
    }

    let manager: ICacheManager

    switch (config.type) {
      case 'memory':
        manager = new MemoryCacheManager(
          config.memory?.maxSize,
          config.memory?.defaultTTL
        )
        break

      case 'redis':
        manager = new RedisCacheManager(config.redis || {})
        if (manager.connect) {
          await manager.connect()
        }
        break

      case 'multilayer':
        manager = new MultiLayerCacheManager(config.multilayer || {})
        break

      default:
        throw new Error(`Tipo de cache no soportado: ${config.type}`)
    }

    // 💾 Guardar instancia
    this.instances.set(instanceName, manager)
    
    console.log(`🏭 [CACHE-FACTORY] Creado: ${config.type} (${instanceName})`)
    return manager
  }

  /**
   * 📋 Obtener instancia existente
   */
  static getInstance(instanceName = 'default'): ICacheManager | null {
    return this.instances.get(instanceName) || null
  }

  /**
   * 🧹 Cerrar y limpiar todas las instancias
   */
  static async cleanup(): Promise<void> {
    console.log(`🧹 [CACHE-FACTORY] Cerrando ${this.instances.size} instancias`)
    
    Array.from(this.instances.entries()).forEach(async ([name, manager]) => {
      try {
        if (manager.disconnect) {
          await manager.disconnect()
        }
        console.log(`✅ [CACHE-FACTORY] Cerrado: ${name}`)
      } catch (error) {
        console.error(`❌ [CACHE-FACTORY] Error cerrando ${name}:`, error)
      }
    })

    this.instances.clear()
  }

  /**
   * 📊 Obtener estadísticas de todas las instancias
   */
  static async getAllStats(): Promise<Map<string, any>> {
    const allStats = new Map()

    Array.from(this.instances.entries()).forEach(async ([name, manager]) => {
      try {
        const stats = await manager.getStats()
        allStats.set(name, {
          type: manager.constructor.name,
          connected: manager.isConnected(),
          ...stats
        })
      } catch (error) {
        allStats.set(name, {
          type: manager.constructor.name,
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    return allStats
  }

  /**
   * 🎯 Configuraciones predefinidas
   */
  static getPresetConfig(preset: 'development' | 'production' | 'testing'): CacheConfig {
    switch (preset) {
      case 'development':
        return {
          type: 'memory',
          memory: {
            maxSize: 1000,
            defaultTTL: 5 * 60 * 1000 // 5 minutos
          }
        }

      case 'production':
        return {
          type: 'multilayer',
          multilayer: {
            l1MaxSize: 5000,
            l1TTL: 2 * 60 * 1000, // 2 minutos L1
            l2Config: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
              password: process.env.REDIS_PASSWORD,
              keyPrefix: 'uniacc:chatbot:'
            }
          }
        }

      case 'testing':
        return {
          type: 'memory',
          memory: {
            maxSize: 100,
            defaultTTL: 10 * 1000 // 10 segundos
          }
        }

      default:
        throw new Error(`Preset no reconocido: ${preset}`)
    }
  }
}

// 🔄 Cleanup automático en shutdown
process.on('SIGINT', () => CacheFactory.cleanup())
process.on('SIGTERM', () => CacheFactory.cleanup())
