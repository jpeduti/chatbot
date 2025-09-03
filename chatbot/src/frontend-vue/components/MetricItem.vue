<template>
  <div class="flex items-center justify-between py-1">
    <div class="flex items-center space-x-2">
      <span class="text-sm">{{ icon }}</span>
      <span class="text-xs text-gray-600">{{ label }}</span>
    </div>
    <span 
      :class="[
        'text-sm font-semibold',
        getColorClass(color)
      ]"
    >
      {{ value }}
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string
  value: string
  icon: string
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'gray'
})

const getColorClass = (color: string): string => {
  switch (color) {
    case 'green':
      return 'text-green-600'
    case 'yellow':
      return 'text-yellow-600'
    case 'red':
      return 'text-red-600'
    case 'blue':
      return 'text-blue-600'
    default:
      return 'text-gray-600'
  }
}
</script>
