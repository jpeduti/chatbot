<template>
  <div class="h-full p-4 space-y-6 overflow-y-auto custom-scrollbar">
    
    <!-- Header del Panel -->
    <div class="text-center">
      <h3 class="text-lg font-bold text-gray-800">🎯 Control Panel</h3>
      <p class="text-sm text-gray-600">UNIACC Chat Demo v3.0</p>
    </div>

    <!-- Selector de Versión -->
    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-gray-700">🚀 Versión del Sistema</h4>
      <div class="flex space-x-2">
        <button
          v-for="version in ['v1', 'v2']"
          :key="version"
          @click="$emit('switch-version', version)"
          :class="[
            'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200',
            currentVersion === version
              ? 'bg-uniacc-blue text-white shadow-md'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          ]"
        >
          {{ version.toUpperCase() }}
          <span v-if="version === 'v1'" class="block text-xs opacity-75">Legacy</span>
          <span v-if="version === 'v2'" class="block text-xs opacity-75">Repository</span>
        </button>
      </div>
    </div>

    <!-- Información del Sistema -->
    <div class="bg-blue-50 rounded-lg p-3 space-y-2">
      <h4 class="text-sm font-semibold text-blue-800">🏗️ Arquitectura</h4>
      <div class="text-xs text-blue-700 space-y-1">
        <div><strong>Framework:</strong> Vue 3 + TypeScript</div>
        <div><strong>Styling:</strong> Tailwind CSS</div>
        <div><strong>Estado:</strong> Composition API</div>
        <div><strong>Backend:</strong> {{ currentVersion === 'v2' ? 'Repository Pattern' : 'Legacy Service' }}</div>
      </div>
    </div>

    <!-- Métricas en Tiempo Real -->
    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-gray-700">📊 Métricas</h4>
      <div class="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
        
        <MetricItem 
          label="Mensajes"
          :value="metrics.messageCount.toString()"
          icon="💬"
        />
        
        <MetricItem 
          label="Cache Hit"
          :value="`${metrics.cacheHitRate.toFixed(1)}%`"
          icon="⚡"
          :color="metrics.cacheHitRate > 50 ? 'green' : 'yellow'"
        />
        
        <MetricItem 
          label="Tiempo Promedio"
          :value="`${metrics.avgResponseTime.toFixed(0)}ms`"
          icon="⏱️"
          :color="metrics.avgResponseTime < 1000 ? 'green' : metrics.avgResponseTime < 2000 ? 'yellow' : 'red'"
        />
        
        <MetricItem 
          label="Errores"
          :value="metrics.errorCount.toString()"
          icon="🚨"
          :color="metrics.errorCount === 0 ? 'green' : 'red'"
        />
        
        <MetricItem 
          label="Duración"
          :value="formatDuration(metrics.conversationDuration)"
          icon="⏰"
        />
      </div>
    </div>

    <!-- Acciones Rápidas -->
    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-gray-700">🛠️ Acciones</h4>
      <div class="space-y-2">
        
        <button
          @click="$emit('clear-chat')"
          class="w-full py-2 px-3 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          🗑️ Limpiar Chat
        </button>
        
        <button
          @click="clearCache"
          class="w-full py-2 px-3 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          🧹 Limpiar Cache
        </button>
        
        <button
          @click="exportChat"
          class="w-full py-2 px-3 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          📄 Exportar Chat
        </button>
      </div>
    </div>

    <!-- Tests Rápidos -->
    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-gray-700">🧪 Tests Rápidos</h4>
      <div class="space-y-2">
        
        <button
          v-for="test in quickTests"
          :key="test.message"
          @click="$emit('send-quick-test', test.message)"
          class="w-full py-2 px-3 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm rounded-lg transition-colors text-left"
        >
          {{ test.emoji }} {{ test.label }}
        </button>
      </div>
    </div>

    <!-- Estado de Conectividad -->
    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-gray-700">🌐 Estado</h4>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Servidor</span>
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <span class="text-sm font-medium text-green-600">Conectado</span>
          </div>
        </div>
        
        <div class="flex items-center justify-between mt-2">
          <span class="text-sm text-gray-600">API</span>
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <span class="text-sm font-medium text-green-600">Activo</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { ChatMetrics } from '../types/chat'
import MetricItem from './MetricItem.vue'

interface Props {
  metrics: ChatMetrics
  currentVersion: 'v1' | 'v2'
}

defineProps<Props>()

defineEmits<{
  'switch-version': [version: 'v1' | 'v2']
  'clear-chat': []
  'send-quick-test': [message: string]
}>()

const quickTests = [
  { emoji: '👋', label: 'Test Saludo', message: 'hola' },
  { emoji: '🎓', label: 'Test Carrera', message: 'quiero estudiar ingeniería' },
  { emoji: '💰', label: 'Test Becas', message: 'necesito información sobre becas' },
  { emoji: '📞', label: 'Test Asesor', message: 'quiero hablar con un asesor' },
  { emoji: '📍', label: 'Test Campus', message: 'información de campus' }
]

const clearCache = async () => {
  try {
    const response = await fetch('/chat/cache/clear', { method: 'POST' })
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Cache limpiado exitosamente')
    } else {
      console.error('❌ Error limpiando cache')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

const exportChat = () => {
  // Implementar exportación de chat
  console.log('📄 Exportando chat...')
  // TODO: Implementar exportación a JSON/PDF
}

const formatDuration = (duration: number): string => {
  if (duration < 60000) { // Menos de 1 minuto
    return `${Math.floor(duration / 1000)}s`
  } else if (duration < 3600000) { // Menos de 1 hora
    return `${Math.floor(duration / 60000)}m`
  } else {
    return `${Math.floor(duration / 3600000)}h`
  }
}
</script>
