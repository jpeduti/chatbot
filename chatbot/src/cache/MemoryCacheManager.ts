/**
 * 🧠 Memory Cache Manager
 * Implementación de caché en memoria con LRU y TTL
 */

import { ICacheManager, CacheOptions, CacheStats } from './interfaces/ICacheManager'

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
  tags: string[]
  namespace: string
  size: number // Estimación del tamaño en bytes
}

export class MemoryCacheManager implements ICacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private tagIndex = new Map<string, Set<string>>() // tag -> set of keys
  private accessOrder = new Map<string, number>() // key -> access timestamp para LRU
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    memory: 0,
    keys: 0,
    hitRate: 0
  }

  private readonly maxSize: number
  private readonly defaultTTL: number
  private accessCounter = 0

  constructor(maxSize = 10000, defaultTTL = 5 * 60 * 1000) { // 5 minutos por defecto
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
    
    // 🧹 Limpiar caché expirado cada 5 minutos
    setInterval(() => this.clearExpired(), 5 * 60 * 1000)
    
    console.log(`🧠 [MEMORY-CACHE] Inicializado: max=${maxSize} items, TTL=${defaultTTL}ms`)
  }

  // 🔧 OPERACIONES BÁSICAS

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // ⏰ Verificar expiración
    if (this.isExpired(entry)) {
      await this.delete(key)
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // 📈 Actualizar LRU
    this.accessOrder.set(key, ++this.accessCounter)
    this.stats.hits++
    this.updateHitRate()

    console.log(`💾 [CACHE-HIT] ${key}`)
    return entry.value
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const ttl = options.ttl || this.defaultTTL
      const tags = options.tags || []
      const namespace = options.namespace || 'default'
      
      // 📏 Estimar tamaño
      const size = this.estimateSize(value)
      
      // 🧹 Limpiar espacio si es necesario
      await this.ensureSpace()
      
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl,
        tags,
        namespace,
        size
      }

      // 💾 Guardar entrada
      this.cache.set(key, entry)
      this.accessOrder.set(key, ++this.accessCounter)
      
      // 🏷️ Actualizar índice de tags
      tags.forEach(tag => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set())
        }
        this.tagIndex.get(tag)!.add(key)
      })

      // 📊 Actualizar estadísticas
      this.stats.sets++
      this.stats.keys = this.cache.size
      this.stats.memory += size

      console.log(`💾 [CACHE-SET] ${key} (${size} bytes, TTL: ${ttl}ms)`)
      return true

    } catch (error) {
      console.error(`❌ [CACHE-SET] Error setting ${key}:`, error)
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    // 🗑️ Remover de cache principal
    this.cache.delete(key)
    this.accessOrder.delete(key)

    // 🏷️ Remover de índices de tags
    entry.tags.forEach(tag => {
      const tagSet = this.tagIndex.get(tag)
      if (tagSet) {
        tagSet.delete(key)
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag)
        }
      }
    })

    // 📊 Actualizar estadísticas
    this.stats.deletes++
    this.stats.keys = this.cache.size
    this.stats.memory -= entry.size

    console.log(`🗑️ [CACHE-DELETE] ${key}`)
    return true
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    // ⏰ Verificar expiración
    if (this.isExpired(entry)) {
      await this.delete(key)
      return false
    }

    return true
  }

  // 🏷️ OPERACIONES CON TAGS

  async setWithTags<T>(key: string, value: T, tags: string[], options: CacheOptions = {}): Promise<boolean> {
    return this.set(key, value, { ...options, tags })
  }

  async invalidateByTag(tag: string): Promise<number> {
    const keys = this.tagIndex.get(tag)
    
    if (!keys) {
      return 0
    }

    let invalidated = 0
    for (const key of Array.from(keys)) {
      if (await this.delete(key)) {
        invalidated++
      }
    }

    console.log(`🏷️ [CACHE-INVALIDATE-TAG] ${tag}: ${invalidated} keys`)
    return invalidated
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0
    
    for (const tag of tags) {
      totalInvalidated += await this.invalidateByTag(tag)
    }

    return totalInvalidated
  }

  // 🧹 OPERACIONES DE LIMPIEZA

  async clear(): Promise<boolean> {
    const oldSize = this.cache.size
    this.cache.clear()
    this.tagIndex.clear()
    this.accessOrder.clear()
    
    this.stats.keys = 0
    this.stats.memory = 0

    console.log(`🧹 [CACHE-CLEAR] ${oldSize} keys cleared`)
    return true
  }

  async clearNamespace(namespace: string): Promise<number> {
    let cleared = 0
    
    Array.from(this.cache.entries()).forEach(async ([key, entry]) => {
      if (entry.namespace === namespace) {
        await this.delete(key)
        cleared++
      }
    })

    console.log(`🧹 [CACHE-CLEAR-NS] ${namespace}: ${cleared} keys`)
    return cleared
  }

  async clearExpired(): Promise<number> {
    let cleared = 0
    const now = Date.now()
    
    Array.from(this.cache.entries()).forEach(async ([key, entry]) => {
      if (this.isExpired(entry, now)) {
        await this.delete(key)
        cleared++
      }
    })

    if (cleared > 0) {
      console.log(`⏰ [CACHE-CLEAR-EXPIRED] ${cleared} keys`)
    }
    
    return cleared
  }

  // 📊 MÉTRICAS Y ESTADÍSTICAS

  async getStats(): Promise<CacheStats> {
    return { ...this.stats }
  }

  async getKeys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys())
    
    if (!pattern) {
      return keys
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return keys.filter(key => regex.test(key))
  }

  async getSize(): Promise<number> {
    return this.cache.size
  }

  // 🔄 OPERACIONES MASIVAS

  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>()
    
    for (const key of keys) {
      const value = await this.get<T>(key)
      if (value !== null) {
        result.set(key, value)
      }
    }

    return result
  }

  async mset<T>(entries: Map<string, T>, options: CacheOptions = {}): Promise<boolean> {
    let allSuccess = true
    
    Array.from(entries.entries()).forEach(async ([key, value]) => {
      const success = await this.set(key, value, options)
      if (!success) {
        allSuccess = false
      }
    })

    return allSuccess
  }

  async mdelete(keys: string[]): Promise<number> {
    let deleted = 0
    
    for (const key of keys) {
      if (await this.delete(key)) {
        deleted++
      }
    }

    return deleted
  }

  // ⚡ OPERACIONES ATÓMICAS

  async increment(key: string, amount = 1): Promise<number> {
    const current = await this.get<number>(key) || 0
    const newValue = current + amount
    await this.set(key, newValue)
    return newValue
  }

  async decrement(key: string, amount = 1): Promise<number> {
    return this.increment(key, -amount)
  }

  // 🔄 CACHE-ASIDE PATTERN

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // 🔍 Intentar obtener del cache
    let value = await this.get<T>(key)
    
    if (value !== null) {
      return value
    }

    // 🏭 Ejecutar factory function
    console.log(`🏭 [CACHE-MISS-FACTORY] ${key}`)
    value = await factory()
    
    // 💾 Guardar en cache
    await this.set(key, value, options)
    
    return value
  }

  // 🔌 LIFECYCLE

  isConnected(): boolean {
    return true // Memory cache siempre está "conectado"
  }

  // 🛠️ MÉTODOS PRIVADOS

  private isExpired(entry: CacheEntry<any>, now = Date.now()): boolean {
    return now - entry.timestamp > entry.ttl
  }

  private estimateSize(value: any): number {
    try {
      const str = JSON.stringify(value)
      return str.length * 2 // Estimación: 2 bytes por carácter UTF-16
    } catch {
      return 100 // Fallback para objetos no serializables
    }
  }

  private async ensureSpace(): Promise<void> {
    if (this.cache.size < this.maxSize) {
      return
    }

    // 🧹 Limpiar expirados primero
    const expiredCleared = await this.clearExpired()
    
    if (this.cache.size < this.maxSize) {
      return
    }

    // 🔄 LRU eviction - remover los menos usados recientemente
    const sortedByAccess = Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => a - b)
    
    const toRemove = Math.ceil(this.maxSize * 0.1) // Remover 10%
    
    for (let i = 0; i < toRemove && i < sortedByAccess.length; i++) {
      await this.delete(sortedByAccess[i][0])
    }

    console.log(`🔄 [CACHE-LRU] Removed ${toRemove} items (expired: ${expiredCleared})`)
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
  }
}
