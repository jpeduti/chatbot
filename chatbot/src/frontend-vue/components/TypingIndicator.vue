<template>
  <div class="flex items-end space-x-2 mb-1">
    <!-- Avatar del Bot -->
    <div class="w-8 h-8 bg-uniacc-blue rounded-full flex items-center justify-center flex-shrink-0">
      <span class="text-white text-sm">🤖</span>
    </div>
    
    <!-- Burbuja de Typing -->
    <div class="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200 bounce-in">
      <div class="flex items-center space-x-1">
        <!-- Dots animados -->
        <div class="flex space-x-1">
          <div 
            v-for="i in 3" 
            :key="i"
            :class="[
              'w-2 h-2 bg-gray-400 rounded-full',
              'pulse-dot'
            ]"
            :style="{ animationDelay: `${(i - 1) * 0.16}s` }"
          />
        </div>
        
        <!-- Texto de typing -->
        <span class="text-xs text-gray-500 ml-2">
          Escribiendo...
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Este componente es puramente visual, no necesita props ni emits
</script>

<style scoped>
@keyframes pulseDot {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.pulse-dot {
  animation: pulseDot 1.4s infinite ease-in-out;
}
</style>
