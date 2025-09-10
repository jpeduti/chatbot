# 🎯 Sistema MQL (Marketing Qualified Leads) para UNIACC

## 📋 **¿Qué son los MQL?**

**MQL = Marketing Qualified Lead** es un prospecto que ha sido calificado por el equipo de Marketing como **listo para pasar a Ventas** basado en criterios específicos de engagement y perfil.

### **Proceso de Calificación de Leads:**

```
🔍 Lead → 📈 MQL → 🎯 SQL → 💰 Cliente
```

1. **🔍 Lead (Prospecto Inicial)**: Persona que mostró interés básico
2. **📈 MQL (Marketing Qualified Lead)**: Ha mostrado engagement significativo  
3. **🎯 SQL (Sales Qualified Lead)**: Listo para conversación de ventas
4. **💰 Cliente**: Se matriculó/compró

---

## 🧠 **ARQUITECTURA DE LEAD SCORING MQL UNIACC**

### **1. 📊 Modelo de Scoring Multidimensional**

```typescript
interface MQLScoringModel {
  // 🎯 DATOS DEMOGRÁFICOS (0-25 pts)
  demographic: {
    edad: number        // 17-25: +10, 26-35: +8, 36+: +3
    region: number      // RM/Valpo: +10, Otras: +5
    completitud: number // Datos completos: +5
  }
  
  // 🔥 ENGAGEMENT BEHAVIORAL (0-35 pts)  
  behavioral: {
    tiempoEnChat: number      // >5min: +10, >3min: +7, >1min: +3
    mensajesEnviados: number  // >10: +8, >5: +5, >2: +2
    exploracionCarreras: number // >3 facultades: +10, >1: +5
    preguntasCostos: number   // Preguntó costos: +7
    solicitudAsesor: number   // Pidió asesor: +10
  }
  
  // 🎓 INTENT SCORING (0-25 pts)
  intent: {
    carreraEspecifica: number  // Exploró carrera específica: +15
    procesoBusqueda: number    // Comparó carreras: +10  
    urgencia: number          // Mencionó "este año", "pronto": +10
    presupuesto: number       // Preguntó financiamiento: +5
  }
  
  // ⏰ TIMING RELEVANCE (0-15 pts)
  timing: {
    periodoAdmision: number   // En período: +10, Pre-período: +5
    horarioContacto: number   // Horario comercial: +3
    diaContacto: number       // Lun-Vie: +2, Sab-Dom: +1
  }
}
```

### **2. 🎯 Clasificación MQL UNIACC:**

```typescript
enum MQLStatus {
  COLD = 'cold',        // 0-30 pts: Poco interés
  WARM = 'warm',        // 31-50 pts: Interés moderado  
  HOT = 'hot',          // 51-70 pts: Alto interés
  MQL = 'mql',          // 71-85 pts: Marketing Qualified
  SQL = 'sql'           // 86+ pts: Sales Qualified (asesor inmediato)
}
```

### **3. 📊 Criterios Específicos UNIACC:**

```
✅ Datos completos: nombre + email + teléfono + edad + región
✅ Engagement: exploró carreras O pidió info de admisión  
✅ Perfil: edad universitaria (17-35 años)
✅ Ubicación: regiones con cobertura UNIACC
✅ Comportamiento: tiempo en chat > 3 minutos
```

---

## 🏗️ **IMPLEMENTACIÓN TÉCNICA**

### **1. 📈 Servicio de Lead Scoring**

```typescript
// chatbot/src/services/LeadScoringService.ts
export class LeadScoringService {
  
  async calculateMQLScore(userId: string): Promise<MQLScore> {
    const userData = await this.getUserData(userId)
    const behavioral = await this.getBehavioralData(userId)
    const interactions = await this.getInteractionHistory(userId)
    
    const score = {
      demographic: this.calculateDemographicScore(userData),
      behavioral: this.calculateBehavioralScore(behavioral),
      intent: this.calculateIntentScore(interactions),
      timing: this.calculateTimingScore(interactions)
    }
    
    const totalScore = Object.values(score).reduce((a, b) => a + b, 0)
    const mqlStatus = this.determineMQLStatus(totalScore)
    
    // 💾 Guardar score en BD
    await this.saveMQLScore(userId, { ...score, totalScore, mqlStatus })
    
    return { ...score, totalScore, mqlStatus }
  }
  
  private calculateBehavioralScore(data: BehavioralData): number {
    let score = 0
    
    // Tiempo en chat
    if (data.tiempoTotal > 300) score += 10      // >5min
    else if (data.tiempoTotal > 180) score += 7  // >3min
    else if (data.tiempoTotal > 60) score += 3   // >1min
    
    // Mensajes enviados
    if (data.mensajesEnviados > 10) score += 8
    else if (data.mensajesEnviados > 5) score += 5
    else if (data.mensajesEnviados > 2) score += 2
    
    // Exploración de carreras
    if (data.facultadesExploradas > 3) score += 10
    else if (data.facultadesExploradas > 1) score += 5
    
    return Math.min(score, 35) // Max 35 pts
  }
  
  private determineMQLStatus(totalScore: number): MQLStatus {
    if (totalScore >= 86) return MQLStatus.SQL
    if (totalScore >= 71) return MQLStatus.MQL
    if (totalScore >= 51) return MQLStatus.HOT
    if (totalScore >= 31) return MQLStatus.WARM
    return MQLStatus.COLD
  }
}
```

### **2. 🎯 Integración en Tiempo Real**

```typescript
// chatbot/src/flows/core/FlowContext.ts
export class FlowContext {
  async updateMQLScore(action: UserAction): Promise<void> {
    const scoringService = new LeadScoringService()
    
    // Actualizar score en cada acción
    await scoringService.recordAction(this.userId, action)
    const newScore = await scoringService.calculateMQLScore(this.userId)
    
    // 🚨 TRIGGER AUTOMÁTICO si alcanza MQL
    if (newScore.mqlStatus === 'mql' || newScore.mqlStatus === 'sql') {
      await this.triggerMQLNotification(newScore)
    }
  }
  
  private async triggerMQLNotification(score: MQLScore): Promise<void> {
    // 📧 Notificar a asesores
    await this.notificationService.notifyMQL(this.userId, score)
    
    // 🎯 Auto-asignar a asesor especializado
    if (score.mqlStatus === 'sql') {
      await this.autoAssignToAdvisor(this.userId, score)
    }
  }
}
```

### **3. 📊 Base de Datos**

```sql
-- Nueva tabla para MQL Scoring
CREATE TABLE mql_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id UUID REFERENCES prospecto_actual(id),
  whatsapp VARCHAR(20) NOT NULL,
  
  -- Scores por categoría
  demographic_score INTEGER DEFAULT 0,
  behavioral_score INTEGER DEFAULT 0,
  intent_score INTEGER DEFAULT 0,
  timing_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  
  -- Status MQL
  mql_status VARCHAR(10) DEFAULT 'cold',
  mql_achieved_at TIMESTAMP,
  
  -- Metadatos
  scored_at TIMESTAMP DEFAULT NOW(),
  last_interaction TIMESTAMP DEFAULT NOW(),
  
  -- Índices para búsqueda rápida
  INDEX idx_mql_status (mql_status),
  INDEX idx_total_score (total_score DESC),
  INDEX idx_whatsapp (whatsapp)
);

-- Tabla para tracking de acciones
CREATE TABLE user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp VARCHAR(20) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  session_id UUID,
  
  INDEX idx_whatsapp_actions (whatsapp, timestamp DESC)
);
```

### **4. 🎭 Dashboard MQL Analytics**

```vue
<!-- dashboard/src/views/MQLDashboard.vue -->
<template>
  <div class="mql-dashboard">
    <!-- 📊 Métricas en tiempo real -->
    <div class="metrics-grid">
      <MetricCard title="MQLs Hoy" :value="mqlToday" color="green" />
      <MetricCard title="SQLs Hoy" :value="sqlToday" color="blue" />
      <MetricCard title="Conversion Rate" :value="conversionRate" color="purple" />
      <MetricCard title="Score Promedio" :value="avgScore" color="orange" />
    </div>
    
    <!-- 🎯 Lista de MQLs -->
    <MQLTable 
      :leads="mqlLeads" 
      @assign-advisor="assignAdvisor"
      @view-details="viewLeadDetails" 
    />
    
    <!-- 📈 Gráficos de scoring -->
    <ScoreDistributionChart :data="scoreDistribution" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMQLService } from '@/composables/useMQLService'

const { 
  mqlLeads, 
  mqlToday, 
  sqlToday, 
  conversionRate, 
  avgScore,
  scoreDistribution,
  loadMQLData,
  assignAdvisor,
  viewLeadDetails
} = useMQLService()

onMounted(() => {
  loadMQLData()
})
</script>
```

---

## 🚀 **PLAN DE IMPLEMENTACIÓN**

### **FASE 1: Core Scoring (1 semana)**
- ✅ LeadScoringService básico
- ✅ Tablas de BD para scores
- ✅ Integración con FlowContext
- ✅ Scoring en tiempo real

### **FASE 2: Analytics Dashboard (1 semana)**  
- ✅ Vista MQL en dashboard
- ✅ Métricas en tiempo real
- ✅ Alertas automáticas
- ✅ Asignación de asesores

### **FASE 3: AI Enhancement (2 semanas)**
- ✅ Machine Learning para scoring
- ✅ Predictive scoring
- ✅ A/B testing de criterios
- ✅ Auto-optimización

---

## 💡 **BENEFICIOS ESPERADOS**

- **📈 +40% conversión** con mejor calificación
- **⚡ -60% tiempo asesor** en leads fríos  
- **🎯 +25% calidad leads** entregados a ventas
- **📊 100% trazabilidad** del customer journey

---

## 🎯 **MÉTRICAS DE ÉXITO**

### **KPIs Principales:**
1. **MQL Conversion Rate**: % de leads que se convierten en MQL
2. **MQL to SQL Rate**: % de MQLs que pasan a ventas
3. **SQL to Customer Rate**: % de SQLs que se matriculan
4. **Time to MQL**: Tiempo promedio para alcanzar MQL
5. **Score Distribution**: Distribución de scores por categoría

### **Reportes Automáticos:**
- 📊 Reporte diario de MQLs generados
- 📈 Dashboard en tiempo real de scoring
- 🎯 Alertas automáticas para SQLs
- 📋 Análisis semanal de tendencias

---

## 🔮 **EVOLUCIÓN FUTURA**

### **Fase Avanzada: AI-Powered Scoring**
1. **Machine Learning**: Modelo predictivo basado en datos históricos
2. **Behavioral Prediction**: Predicción de abandono y conversión
3. **Dynamic Scoring**: Ajuste automático de criterios según performance
4. **Sentiment Analysis**: Análisis de sentimiento en conversaciones
5. **Personalized Nurturing**: Flujos personalizados según score MQL

### **Integración Ecosystem:**
- 🔗 CRM Integration (Salesforce, HubSpot)
- 📧 Email Marketing automation
- 📱 SMS/WhatsApp nurturing sequences
- 🎯 Retargeting automático
- 📊 Business Intelligence avanzado

---

**Autor**: Juan Pablo Silva  
**Fecha**: Septiembre 2025  
**Proyecto**: UNIACC ChatBot v2.0  
**Status**: Diseño Completo - Listo para Implementación
