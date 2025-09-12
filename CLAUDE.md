# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UNIACC ChatBot is a WhatsApp Business API integration system for Universidad de Artes, Ciencias y Comunicaciones (UNIACC). The system captures student prospects through conversational flows and provides university information.

## Architecture

```
chatboot-uniacc/
├── chatbot/          # Node.js + TypeScript backend (Port 3001)
│   ├── src/services/ # ChatServiceV2 with Repository Pattern
│   ├── src/flows/    # 6 conversational flows with FlowContext
│   ├── src/cache/    # Multi-layer caching system
│   └── prisma/       # Database schema and ORM
├── dashboard/        # Vue.js 3 frontend + API (Ports 3000/3002)
└── .claude/          # Development tools and context scripts
```

**Core Technologies:**
- Backend: Node.js + TypeScript + Express + Prisma ORM
- Frontend: Vue.js 3 + Vite + TailwindCSS
- Database: Supabase (PostgreSQL)
- Cache: Multi-layer (L1 Memory + L2 Redis Ready)

## Essential Commands

### Development Setup
```bash
# Initial setup - ALWAYS run first
npm run init                    # or node .claude/claude-init.js

# Start all services (recommended)
cd dashboard && npm run dev:full

# Or start services separately
cd chatbot && npm run dev       # Backend (port 3001)
cd dashboard && npm run dev     # Frontend (port 3000)
cd dashboard && npm run dev:api # API server (port 3002)
```

### Testing and Validation
```bash
# Health checks
npm run check-services          # Verify all services running
npm run debug-logs             # View recent logs from both services

# Testing framework
npm run test-progressive-capture    # Full capture flow
npm run test-abandono-email        # Abandonment scenarios
npm run test-returning-user         # User recognition
npm run test-all-scenarios         # Complete test suite
```

### Database and Cache
```bash
# Database operations
cd chatbot && npx prisma generate    # Generate Prisma client
cd chatbot && npx prisma db push     # Push schema changes
cd chatbot && npx prisma studio      # Database GUI

# Build and deployment
npm run build                   # Build all projects
npm run build:chatbot          # Build backend only
npm run build:dashboard        # Build frontend only
```

## Key Development URLs

- **Chat Testing Interface**: http://localhost:3001/chat (Primary debugging tool)
- **Vue.js Chat Demo**: http://localhost:3000/chat-demo (Integrated in dashboard)
- **Main Dashboard**: http://localhost:3000
- **Backend Health**: http://localhost:3001/health
- **API Health**: http://localhost:3002/health
- **Bot Statistics**: http://localhost:3001/stats

## Architecture Patterns

### FlowContext System
The system uses 6 conversational flows managed by FlowContextManager:
1. **ProspectCaptureFlow** - Initial data capture with progressive saving
2. **ReturningUserFlow** - Recognition and personalized experience
3. **MainMenuFlow** - Central navigation hub
4. **AdmissionFlow** - Binary pattern with 48 consultation types
5. **AdvisorRequestFlow** - Immediate advisor requests
6. **CareerExplorationFlow** - Faculty and career information

### Repository Pattern with Caching
- **PrismaProspectoRepository** - Basic CRUD operations
- **CachedProspectoRepository** - Automatic caching layer
- **RepositoryFactory** - Dependency injection factory
- **Cache hit rate target**: 85%+ for frequent queries

### Data Preservation
The system preserves all user data between flows using:
```typescript
const dataToSave = {
  // Preserve original data
  nombre: prospectoOriginal?.nombre || context.capturedData.nombre,
  email: prospectoOriginal?.email || context.capturedData.email,
  // Add flow-specific data
  tipo_consulta: tipoConsulta,
  nivel_interes: nivelInteres
}
```

## Critical Files and Services

### Backend Core (chatbot/)
- `src/services/chat-service-v2.ts` - Main orchestrator with Repository Pattern
- `src/services/prospect-service-v2.ts` - Business logic with Progressive Capture
- `src/flows/core/FlowContextManager.ts` - Context management
- `src/repositories/CachedProspectoRepository.ts` - Cached data access
- `src/cache/MultiLayerCacheManager.ts` - L1 + L2 caching

### Frontend Core (dashboard/)
- `src/composables/useChat.ts` - Real-time chat logic
- `server.js` - API server with Progressive Capture mapping
- `src/types/prospecto.ts` - Updated schema types

### Database Schema
- **Main tables**: `prospectos`, `conversaciones`, `mensajes`, `ejecutivos`
- **RPC functions**: `upsert_prospecto_por_whatsapp()`, `get_usuario_recurrente()`
- **Views**: 4 analytical views for reporting

## Development Workflow

### Before Making Changes
1. Run `npm run init` for current context
2. Check services with `npm run check-services`
3. Review logs with `npm run debug-logs`
4. Test changes at http://localhost:3001/chat

### Dynamic Files (Updated During Development)
- `.claude/log_chatbot.txt` - Backend logs
- `.claude/log_dashboard_api.txt` - Frontend/API logs  
- `.claude/supabase_config_actual.sql` - Current database schema

### Code Conventions
- **TypeScript**: Required throughout, no `any` types
- **Components**: PascalCase (`ChatInterface.vue`)
- **Functions**: camelCase (`upsertProspecto`)
- **Database**: snake_case (`created_at`, `tipo_consulta`)
- **API Routes**: kebab-case (`/api/conversaciones`)

## Business Logic

### UNIACC Faculties
- **A) Artes**: Teatro, Danza, Música, Artes Visuales
- **B) Comunicaciones**: Audiovisual, Periodismo, Publicidad  
- **C) Arquitectura y Diseño**: Arquitectura, Diseño de Interiores
- **D) Ciencias Jurídicas**: Derecho, Psicología
- **E) Negocios y Tecnología**: Ing. Comercial, Contador Auditor

### Consultation Types
The system handles 48 consultation types following the pattern:
- `{category}_{asesor|sin_asesor|timeout}`
- Categories: beca_talento, admision_requisitos, contacto_admisiones, etc.

## Performance Targets

- **API Response Time**: < 2000ms
- **Supabase Query Time**: < 1000ms  
- **Chatbot Processing**: < 500ms
- **Cache Hit Rate**: 85%+
- **Lead Conversion**: 35%+ complete basic data
- **Data Quality**: 95%+ valid data saved

## Testing Framework

The project includes comprehensive automated testing:
- **Progressive Capture**: Zero data loss validation
- **Timeout Management**: Automatic saving on timeouts
- **Anti-Duplicates**: Prevention of duplicate prospects
- **Returning Users**: Recognition system validation
- **Performance**: Response time and processing metrics

Use `npm run test-all-scenarios` for complete validation or individual test commands for specific scenarios.