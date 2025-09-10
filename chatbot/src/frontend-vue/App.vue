<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-4">
    <div class="max-w-6xl mx-auto h-screen flex bg-white rounded-2xl shadow-2xl overflow-hidden">
      
      <!-- Panel de Control Lateral -->
      <div class="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        <ChatControlPanel 
          :metrics="metrics"
          :current-version="metrics.activeVersion"
          @switch-version="switchVersion"
          @clear-chat="clearChat"
          @send-quick-test="sendMessage"
        />
      </div>

      <!-- Área Principal del Chat -->
      <div class="flex-1 flex flex-col">
        
        <!-- Header del Chat -->
        <ChatHeader 
          :is-connected="chatState.isConnected"
          :current-version="metrics.activeVersion"
          :user-id="chatState.currentUserId"
          :session-active="chatState.sessionActive"
          :timeout-warning="chatState.timeoutWarning"
          :remaining-time="chatState.remainingTime"
        />

        <!-- Área de Mensajes -->
        <div class="flex-1 relative">
          <ChatMessageArea 
            :messages="messages"
            :is-typing="chatState.isTyping"
            :has-error="chatState.hasError"
            :error-message="chatState.errorMessage"
            @quick-reply="handleQuickReply"
            class="h-full"
          />
        </div>

        <!-- Input de Mensaje -->
        <ChatInput 
          :is-sending="chatState.isSending"
          :is-connected="chatState.isConnected"
          :user-id="chatState.currentUserId"
          @send-message="sendMessage"
          @update-user-id="updateUserId"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useChat } from './composables/useChat'
import ChatControlPanel from './components/ChatControlPanel.vue'
import ChatHeader from './components/ChatHeader.vue'
import ChatMessageArea from './components/ChatMessageArea.vue'
import ChatInput from './components/ChatInput.vue'

// Usar composable del chat
const {
  messages,
  metrics,
  chatState,
  sendMessage,
  clearChat,
  switchVersion,
  handleQuickReply,
  initializeChat
} = useChat()

// Métodos adicionales
const updateUserId = (newUserId: string) => {
  chatState.currentUserId = newUserId
}

// Inicializar al montar
onMounted(() => {
  initializeChat()
  console.log('🚀 [VUE-CHAT] Aplicación Vue montada exitosamente')
})
</script>

<style>
/* Estilos globales personalizados */
body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* Animaciones personalizadas */
.bounce-in {
  animation: bounceIn 0.5s ease-out;
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}

.pulse-dot {
  animation: pulseDot 1.4s infinite ease-in-out;
}

/* Scrollbar personalizado */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

/* Responsividad */
@media (max-width: 768px) {
  .max-w-6xl {
    max-width: 100%;
    margin: 0;
    height: 100vh;
    border-radius: 0;
  }
  
  .w-80 {
    width: 100%;
    position: absolute;
    z-index: 10;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .w-80.open {
    transform: translateX(0);
  }
}
</style>
