<template>
  <div :class="['flex', message.sender === 'user' ? 'justify-end' : 'justify-start']">
    <div :class="['max-w-xs sm:max-w-md lg:max-w-lg', message.sender === 'user' ? 'order-2' : 'order-1']">
      
      <!-- Avatar (solo para bot) -->
      <div v-if="message.sender === 'bot'" class="flex items-end space-x-2 mb-1">
        <div class="w-8 h-8 bg-uniacc-blue rounded-full flex items-center justify-center flex-shrink-0">
          <span class="text-white text-sm">🤖</span>
        </div>
        <span class="text-xs text-gray-500">UNIACC Bot</span>
      </div>

      <!-- Burbuja del Mensaje -->
      <div 
        :class="[
          'rounded-2xl px-4 py-3 shadow-sm relative break-words',
          getBubbleClasses(message.sender),
          'bounce-in'
        ]"
      >
        <!-- Contenido del Mensaje -->
        <div class="text-sm leading-relaxed" v-html="formatMessageContent(message.content)"></div>

        <!-- Metadata del Mensaje -->
        <div v-if="message.metadata" class="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 border-opacity-50">
          <div class="flex items-center space-x-2 text-xs">
            <!-- Timestamp -->
            <span class="text-gray-500">
              {{ formatTime(message.timestamp) }}
            </span>
            
            <!-- Version Badge -->
            <span 
              v-if="message.metadata.version"
              :class="[
                'px-2 py-1 rounded-full text-xs font-medium',
                getVersionBadgeClasses(message.metadata.version)
              ]"
            >
              {{ message.metadata.version.toUpperCase() }}
            </span>
          </div>

          <!-- Response Time -->
          <span 
            v-if="message.metadata.responseTime" 
            class="text-xs font-medium text-green-600"
          >
            {{ message.metadata.responseTime }}ms
          </span>
        </div>
      </div>

      <!-- Quick Replies -->
      <div 
        v-if="message.quickReplies && message.quickReplies.length > 0" 
        class="mt-4 space-y-2"
      >
        <div class="flex flex-col gap-2">
          <button
            v-for="reply in message.quickReplies"
            :key="reply.id"
            @click="$emit('quick-reply', reply)"
            class="bg-white border-2 border-uniacc-blue text-uniacc-blue px-4 py-3 rounded-lg text-sm font-medium hover:bg-uniacc-blue hover:text-white transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-left flex items-center space-x-2"
          >
            <span class="inline-flex items-center justify-center w-6 h-6 bg-uniacc-blue text-white text-xs font-bold rounded-full">
              {{ reply.value }}
            </span>
            <span>{{ reply.text }}</span>
          </button>
        </div>
      </div>

      <!-- Timestamp para usuario -->
      <div v-if="message.sender === 'user'" class="text-right mt-1">
        <span class="text-xs text-gray-500">
          {{ formatTime(message.timestamp) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage, QuickReply } from '../types/chat'

interface Props {
  message: ChatMessage
}

defineProps<Props>()

defineEmits<{
  'quick-reply': [reply: QuickReply]
}>()

const getBubbleClasses = (sender: string): string => {
  switch (sender) {
    case 'user':
      return 'bg-chat-bubble-user text-gray-800 ml-8'
    case 'bot':
      return 'bg-chat-bubble-bot text-gray-800 mr-8 border border-gray-200'
    case 'system':
      return 'bg-blue-50 text-blue-800 border border-blue-200 mx-4'
    default:
      return 'bg-gray-100 text-gray-800 mx-4'
  }
}

const getVersionBadgeClasses = (version: string): string => {
  switch (version.toLowerCase()) {
    case 'v1':
      return 'bg-gray-200 text-gray-700'
    case 'v2':
      return 'bg-blue-200 text-blue-700'
    case 'welcome':
      return 'bg-green-200 text-green-700'
    case 'system':
      return 'bg-blue-200 text-blue-700'
    case 'error':
      return 'bg-red-200 text-red-700'
    default:
      return 'bg-gray-200 text-gray-700'
  }
}

const formatTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString('es-CL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const formatMessageContent = (content: string): string => {
  // Convertir saltos de línea a <br>
  let formatted = content.replace(/\n/g, '<br>')
  
  // Convertir texto en **negrita**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Convertir texto en *cursiva*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // Convertir emojis de opciones a formato más visual
  formatted = formatted.replace(/(\d+)️⃣/g, '<span class="inline-flex items-center justify-center w-6 h-6 bg-uniacc-blue text-white text-xs font-bold rounded-full mr-1">$1</span>')
  
  return formatted
}
</script>
