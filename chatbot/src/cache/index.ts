/**
 * 💾 Cache System Index
 * Exporta todo el sistema de caché
 */

// 🔧 Interfaces
export * from './interfaces/ICacheManager'

// 🏭 Factory
export * from './CacheFactory'

// 🧠 Implementaciones
export * from './MemoryCacheManager'
export * from './RedisCacheManager'
export * from './MultiLayerCacheManager'

// 🎯 Quick Setup Functions
import { CacheFactory, CacheConfig } from './CacheFactory'
import { ICacheManager } from './interfaces/ICacheManager'

/**
 * 🚀 Setup rápido para desarrollo
 */
export async function createDevelopmentCache(): Promise<ICacheManager> {
  const config = CacheFactory.getPresetConfig('development')
  return await CacheFactory.create(config, 'development')
}

/**
 * 🏭 Setup rápido para producción
 */
export async function createProductionCache(): Promise<ICacheManager> {
  const config = CacheFactory.getPresetConfig('production')
  return await CacheFactory.create(config, 'production')
}

/**
 * 🧪 Setup rápido para testing
 */
export async function createTestingCache(): Promise<ICacheManager> {
  const config = CacheFactory.getPresetConfig('testing')
  return await CacheFactory.create(config, 'testing')
}

/**
 * 📊 Obtener métricas de todas las instancias
 */
export async function getAllCacheMetrics(): Promise<Map<string, any>> {
  return await CacheFactory.getAllStats()
}

/**
 * 🧹 Limpiar todas las instancias de caché
 */
export async function cleanupAllCaches(): Promise<void> {
  return await CacheFactory.cleanup()
}
