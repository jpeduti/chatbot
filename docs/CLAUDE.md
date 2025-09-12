# CLAUDE.md - GUÍA PARA DESARROLLADORES

Este archivo proporciona guía para Claude Code (claude.ai/code) cuando trabaja con el código en este repositorio.

## 🎯 Visión General del Proyecto

UNIACC ChatBot es un sistema de integración con WhatsApp Business API para la Universidad de Artes, Ciencias y Comunicaciones (UNIACC). El sistema ha sido **radicalmente simplificado** a una arquitectura ultra-limpia que mantiene 100% de la funcionalidad original.

## 🚀 Arquitectura Simplificada

```
chatboot-uniacc/
├── chatbot/          # 🎯 Backend Simplificado (Puerto 3001)
│   ├── src/flows/    # UniaccFlow - Flujo único inteligente
│   ├── src/services/ # 4 servicios esenciales
│   ├── src/repositories/ # Patrón Repository
│   └── src/index-simplified.ts # Entry point principal
├── dashboard/        # Dashboard (mantenido)
└── docs/            # Documentación actualizada
```

**Tecnologías Core Simplificadas:**
- Backend: Node.js + TypeScript + Express + Supabase
- Flujo: UniaccFlow único (vs 6 flujos complejos)
- Servicios: 4 servicios esenciales (vs 12 servicios)
- Testing: Interfaz web integrada en `/test`

## 🚀 Comandos Esenciales Simplificados

### **🎯 Setup de Desarrollo**
```bash
# Desarrollo principal (RECOMENDADO)
cd chatbot
npm run simplified:dev

# Testing en navegador
# Abrir: http://localhost:3001/test
```

### **🔧 Comandos de Desarrollo**
```bash
# Desarrollo con hot reload
cd chatbot && npm run simplified:dev

# Desarrollo con watch
cd chatbot && npm run simplified:dev:watch

# Build para producción
cd chatbot && npm run simplified:build

# Ejecutar en producción
cd chatbot && npm run simplified:start
```

### **🧪 Testing y Validación**
```bash
# Testing manual en interfaz web
# 1. npm run simplified:dev
# 2. Abrir http://localhost:3001/test
# 3. Probar flujo completo:
#    - "hola" → confirmar teléfono → completar datos → explorar carreras → solicitar asesor

# Verificar tipos TypeScript
cd chatbot && npx tsc --noEmit

# Health check
curl http://localhost:3001/health
```

### **🗄️ Base de Datos**
```bash
# Conectar a Supabase
# URL: https://vtwdmyezyvhprwonengu.supabase.co
# Usar Supabase Dashboard para gestión visual

# Verificar conexión desde código
cd chatbot && npm run simplified:dev
# Revisar logs de conexión en consola
```

## 🌐 URLs de Desarrollo Clave

- **🎯 Testing Principal**: http://localhost:3001/test (Interfaz web de testing)
- **🔗 API Chat**: http://localhost:3001/chat (Endpoint principal)
- **🏥 Health Check**: http://localhost:3001/health (Estado del sistema)
- **📊 Dashboard**: http://localhost:3000 (Dashboard mantenido)

## 🏗️ Patrones de Arquitectura Simplificada

### **UniaccFlow System (Nuevo)**
El sistema usa **1 flujo único inteligente** que maneja toda la lógica:
- **🎯 UniaccFlow** - Flujo único que procesa todos los pasos
- **👤 Reconocimiento Automático** - Detecta usuarios recurrentes
- **📱 Auto-Detección** - Extrae teléfono desde WhatsApp
- **🎓 Exploración de Carreras** - 5 facultades, 13 carreras
- **🎯 Solicitud de Asesor** - Flujo prioritario

### **Repository Pattern Simplificado**
- **PrismaProspectoRepository** - Operaciones CRUD básicas
- **PrismaProspectoHistorialRepository** - Historial de prospectos
- **RepositoryFactory** - Factory de dependencias simplificado
- **Sin caché complejo** - Acceso directo a Supabase

### **💾 Preservación de Datos Simplificada**
El sistema preserva todos los datos del usuario usando:
```typescript
// SimpleState - Estado directo sin complejidad
interface SimpleState {
  step: string          // Paso actual
  needsData?: string[]  // Datos pendientes
  capturedData?: any    // Datos capturados
}

// FlujoResponse - Respuesta estándar
interface FlowResponse {
  message: string        // Mensaje al usuario
  completed: boolean     // ¿Flujo completado?
  nextStep?: string      // Siguiente paso
  data?: any            // Datos adicionales
}
```

## 📁 Archivos y Servicios Críticos

### **Backend Core Simplificado (chatbot/)**
- `src/flows/UniaccFlow.ts` - 🎯 **Flujo único inteligente**
- `src/services/UniaccChatService.ts` - 🎯 **Orquestador principal**
- `src/services/ProspectServiceV2.ts` - Lógica de negocio
- `src/services/ValidationService.ts` - Validaciones
- `src/services/MessageFormatterService.ts` - Formateo de mensajes
- `src/index-simplified.ts` - 🎯 **Entry point principal**
- `public/test.html` - 🎯 **Interfaz de testing**

### **Repository Pattern**
- `src/repositories/PrismaProspectoRepository.ts` - CRUD prospectos
- `src/repositories/PrismaProspectoHistorialRepository.ts` - Historial
- `src/repositories/RepositoryFactory.ts` - Factory de repositorios

### **Base de Datos Supabase**
- **Tablas principales**: `prospectos`, `conversaciones`, `mensajes`, `ejecutivos`
- **Funciones RPC**: `upsert_prospecto_por_whatsapp()`, `get_usuario_recurrente()`
- **URL**: https://vtwdmyezyvhprwonengu.supabase.co

## 🔄 Workflow de Desarrollo Simplificado

### **Antes de Hacer Cambios**
1. Ejecutar: `cd chatbot && npm run simplified:dev`
2. Abrir: http://localhost:3001/test
3. Probar flujo actual para entender comportamiento
4. Revisar logs en consola del terminal

### **Archivos Dinámicos (Actualizados Durante Desarrollo)**
- **Logs de consola** - Terminal donde se ejecuta `npm run simplified:dev`
- **Interfaz de testing** - http://localhost:3001/test
- **Base de datos** - Supabase Dashboard en tiempo real

### **🎯 Convenciones de Código Simplificadas**
- **TypeScript**: Requerido, evitar tipos `any`
- **Métodos**: camelCase (`handleGreeting`, `processMessage`)
- **Variables**: camelCase (`userName`, `capturedData`)
- **Estados**: snake_case (`user_step`, `needs_data`)
- **Base de datos**: snake_case (`created_at`, `tipo_consulta`)
- **API Routes**: kebab-case (`/api/conversaciones`)

## 🎓 Lógica de Negocio UNIACC

### **Facultades UNIACC**
- **A) 🎭 Artes**: Teatro, Danza, Música, Artes Visuales
- **B) 📺 Comunicaciones**: Audiovisual, Periodismo, Publicidad  
- **C) 🏗️ Arquitectura y Diseño**: Arquitectura, Diseño de Interiores
- **D) ⚖️ Ciencias Jurídicas**: Derecho, Psicología
- **E) 💼 Negocios y Tecnología**: Ing. Comercial, Contador Auditor

### **Tipos de Consulta Simplificados**
El sistema maneja consultas siguiendo el flujo único:
- **👤 Usuario Nuevo** - Captura completa de datos
- **🔄 Usuario Recurrente** - Menú contextual personalizado
- **🎓 Exploración de Carreras** - Por facultad y carrera específica
- **📋 Proceso de Admisión** - Información 2025
- **💰 Costos y Becas** - Información financiera
- **🎯 Solicitud de Asesor** - Prioridad URGENTE

## ⚡ Objetivos de Performance Simplificados

- **🚀 Tiempo de Respuesta API**: < 1000ms
- **💾 Tiempo de Query Supabase**: < 500ms  
- **🤖 Procesamiento Chatbot**: < 200ms
- **📊 Conversión de Leads**: 35%+ datos completos
- **✅ Calidad de Datos**: 95%+ datos válidos guardados

## 🧪 Framework de Testing Simplificado

El proyecto incluye testing manual integrado:
- **💾 Zero Data Loss** - Validación de captura progresiva
- **🔄 Anti-Duplicados** - Prevención de prospectos duplicados
- **👤 Usuarios Recurrentes** - Validación del sistema de reconocimiento
- **⚡ Performance** - Métricas de tiempo de respuesta
- **🎯 Flujo Completo** - Testing end-to-end manual

**Testing Manual:**
1. Ejecutar: `npm run simplified:dev`
2. Abrir: http://localhost:3001/test
3. Probar flujo completo: "hola" → datos → carreras → asesor
4. Verificar persistencia en Supabase Dashboard