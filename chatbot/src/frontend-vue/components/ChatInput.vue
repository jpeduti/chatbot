<template>
  <div class="bg-white border-t border-gray-200 p-4">
    <div class="flex items-end space-x-3">
      
      <!-- Input de Teléfono -->
      <div class="flex-shrink-0">
        <label class="block text-xs font-medium text-gray-700 mb-1">
          📱 Teléfono
        </label>
        <input
          v-model="localUserId"
          @blur="updateUserId"
          type="text"
          placeholder="56999888777"
          class="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-uniacc-blue focus:border-transparent"
          :disabled="isSending"
        />
      </div>

      <!-- Área de Input Principal -->
      <div class="flex-1">
        <div class="relative">
          <!-- Input de Mensaje -->
          <textarea
            ref="messageInput"
            v-model="messageText"
            @keydown="handleKeydown"
            @input="adjustHeight"
            placeholder="Escribe tu mensaje aquí..."
            rows="1"
            class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:ring-2 focus:ring-uniacc-blue focus:border-transparent text-sm"
            :disabled="isSending || !isConnected"
            :maxlength="1000"
          />

          <!-- Contador de Caracteres -->
          <div 
            v-if="messageText.length > 800"
            class="absolute bottom-1 left-2 text-xs"
            :class="messageText.length > 950 ? 'text-red-500' : 'text-gray-400'"
          >
            {{ messageText.length }}/1000
          </div>

          <!-- Botón de Enviar -->
          <button
            @click="handleSend"
            :disabled="!canSend"
            :class="[
              'absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
              canSend 
                ? 'bg-uniacc-blue text-white hover:bg-opacity-80 hover:scale-105 shadow-md' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            ]"
          >
            <svg 
              v-if="!isSending" 
              class="w-4 h-4" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
            
            <!-- Loading Spinner -->
            <div 
              v-else
              class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
          </button>
        </div>

        <!-- Quick Actions -->
        <div class="flex items-center justify-between mt-2">
          <!-- Botones de Test Rápido -->
          <div class="flex space-x-2">
            <button
              v-for="quickTest in quickTests"
              :key="quickTest.text"
              @click="sendQuickTest(quickTest.message)"
              :disabled="isSending"
              class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              {{ quickTest.emoji }} {{ quickTest.text }}
            </button>
          </div>

          <!-- Estado de Conexión -->
          <div class="flex items-center space-x-2 text-xs">
            <div 
              :class="[
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              ]"
            />
            <span :class="isConnected ? 'text-green-600' : 'text-red-600'">
              {{ isConnected ? 'Conectado' : 'Desconectado' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

interface Props {
  isSending: boolean
  isConnected: boolean
  userId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'send-message': [message: string]
  'update-user-id': [userId: string]
}>()

// Estado local
const messageText = ref('')
const localUserId = ref(props.userId)
const messageInput = ref<HTMLTextAreaElement>()

// Tests rápidos predefinidos
const quickTests = [
  { emoji: '👋', text: 'Hola', message: 'Hola' },
  { emoji: '🎓', text: 'Carreras', message: 'Quiero estudiar ingeniería' },
  { emoji: '💰', text: 'Becas', message: 'Necesito información sobre becas' }
]

// Computed
const canSend = computed(() => 
  messageText.value.trim().length > 0 && 
  !props.isSending && 
  props.isConnected &&
  localUserId.value.trim().length > 0
)

// Métodos
const handleSend = () => {
  if (canSend.value) {
    const message = messageText.value.trim()
    messageText.value = ''
    adjustHeight()
    emit('send-message', message)
    focusInput()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

const adjustHeight = async () => {
  await nextTick()
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
    const scrollHeight = messageInput.value.scrollHeight
    const maxHeight = 120 // Máximo 5 líneas aprox
    messageInput.value.style.height = Math.min(scrollHeight, maxHeight) + 'px'
  }
}

const updateUserId = () => {
  if (localUserId.value !== props.userId) {
    emit('update-user-id', localUserId.value)
  }
}

const sendQuickTest = (message: string) => {
  if (!props.isSending && props.isConnected) {
    emit('send-message', message)
  }
}

const focusInput = async () => {
  await nextTick()
  messageInput.value?.focus()
}

// Watch para sincronizar userId
watch(() => props.userId, (newUserId) => {
  localUserId.value = newUserId
})

// Auto-focus al montar
watch(messageInput, (element) => {
  if (element) {
    element.focus()
  }
})
</script>
