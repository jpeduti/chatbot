<template>
  <div class="bg-uniacc-blue text-white px-6 py-4 flex items-center justify-between shadow-lg">
    <!-- Info del Bot -->
    <div class="flex items-center space-x-3">
      <!-- Avatar del Bot -->
      <div class="relative">
        <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center">
          <span class="text-2xl">🤖</span>
        </div>
        <!-- Indicador de Conexión -->
        <div 
          :class="[
            'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          ]"
        />
      </div>

      <!-- Información -->
      <div>
        <h2 class="text-lg font-semibold">UNIACC Assistant</h2>
        <p class="text-sm text-green-200">
          {{ isConnected ? '🟢 En línea' : '🔴 Desconectado' }} • {{ currentVersion.toUpperCase() }}
          <span v-if="timeoutWarning" class="ml-2 text-yellow-300 animate-pulse">
            ⚠️ Expira en {{ remainingTime }}s
          </span>
          <span v-if="!sessionActive" class="ml-2 text-red-300">
            ⏰ Sesión expirada
          </span>
        </p>
      </div>
    </div>

    <!-- Acciones del Header -->
    <div class="flex items-center space-x-3">
      <!-- Badge de Versión -->
      <div class="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
        {{ currentVersion === 'v2' ? '📊 Repository' : '🔧 Legacy' }}
      </div>

      <!-- User ID -->
      <div class="hidden md:block text-sm text-green-200">
        📱 {{ formatUserId(userId) }}
      </div>

      <!-- Botón de Configuración -->
      <button 
        @click="$emit('toggle-settings')"
        class="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
        title="Configuraciones"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isConnected: boolean
  currentVersion: 'v1' | 'v2'
  userId: string
  sessionActive?: boolean
  timeoutWarning?: boolean
  remainingTime?: number
}

defineProps<Props>()

defineEmits<{
  'toggle-settings': []
}>()

const formatUserId = (userId: string): string => {
  if (userId.length > 10) {
    return userId.substring(0, 3) + '***' + userId.substring(userId.length - 4)
  }
  return userId
}
</script>
