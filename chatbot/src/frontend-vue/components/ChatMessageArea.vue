<template>
  <div class="h-full flex flex-col bg-uniacc-light bg-opacity-30 relative">
    <!-- Área de Mensajes -->
    <div 
      ref="messagesContainer"
      class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4"
      style="background-color: #f5f5f5; background-image: radial-gradient(circle, #e0e0e0 1px, transparent 1px); background-size: 20px 20px; max-height: calc(100vh - 200px); min-height: 400px;"
    >
      <!-- Mensaje de Estado Vacío -->
      <div 
        v-if="messages.length === 0" 
        class="flex items-center justify-center h-full text-gray-500"
      >
        <div class="text-center">
          <div class="text-6xl mb-4">💬</div>
          <p class="text-lg font-medium">¡Bienvenido al Chat UNIACC!</p>
          <p class="text-sm">Escribe un mensaje para comenzar la conversación</p>
        </div>
      </div>

      <!-- Lista de Mensajes -->
      <div v-for="message in messages" :key="message.id" class="slide-in">
        <ChatMessageComponent 
          :message="message"
          @quick-reply="$emit('quick-reply', $event)"
        />
      </div>

      <!-- Indicador de Typing -->
      <div v-if="isTyping" class="flex justify-start slide-in">
        <div class="max-w-xs">
          <TypingIndicator />
        </div>
      </div>

      <!-- Mensaje de Error -->
      <div 
        v-if="hasError && errorMessage" 
        class="flex justify-center slide-in"
      >
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-md">
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm font-medium">{{ errorMessage }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll to Bottom Button -->
    <Transition name="scale">
      <button
        v-if="showScrollButton"
        @click="scrollToBottom"
        class="absolute bottom-4 right-4 bg-uniacc-blue text-white p-3 rounded-full shadow-lg hover:bg-opacity-80 transition-all duration-200 z-10"
        title="Ir al último mensaje"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 112 0v11.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import type { ChatMessage, QuickReply } from '../types/chat'
import ChatMessageComponent from './ChatMessage.vue'
import TypingIndicator from './TypingIndicator.vue'

interface Props {
  messages: ChatMessage[]
  isTyping: boolean
  hasError: boolean
  errorMessage?: string
}

const props = defineProps<Props>()

defineEmits<{
  'quick-reply': [reply: QuickReply]
}>()

const messagesContainer = ref<HTMLElement>()
const showScrollButton = ref(false)

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const checkScrollPosition = () => {
  if (messagesContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    showScrollButton.value = !isNearBottom && props.messages.length > 0
  }
}

// Auto scroll cuando hay nuevos mensajes
watch(() => props.messages.length, () => {
  scrollToBottom()
})

// Auto scroll cuando está typing
watch(() => props.isTyping, () => {
  if (props.isTyping) {
    scrollToBottom()
  }
})

onMounted(() => {
  if (messagesContainer.value) {
    messagesContainer.value.addEventListener('scroll', checkScrollPosition)
  }
  scrollToBottom()
})

onUnmounted(() => {
  if (messagesContainer.value) {
    messagesContainer.value.removeEventListener('scroll', checkScrollPosition)
  }
})
</script>

<style scoped>
.scale-enter-active, .scale-leave-active {
  transition: all 0.3s ease;
}

.scale-enter-from, .scale-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
