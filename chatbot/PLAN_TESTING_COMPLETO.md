# 🧪 PLAN DE TESTING COMPLETO - CHATBOT UNIACC V2

## 📋 **CONFIGURACIÓN INICIAL**

### **⚡ Setup Previo:**
```powershell
# 1. Iniciar servidor backend
cd C:\Users\juan.silva\WebstormProjects\chatboot-uniacc\chatbot
npm run dev

# 2. Verificar servicios activos:
# ✅ Backend API: http://localhost:3001
# ✅ Vue Chat Demo: http://localhost:3001/vue-chat/
# ✅ Dashboard: http://localhost:3000 (opcional)

# 3. Limpiar base de datos (opcional):
# DELETE FROM prospecto_actual WHERE whatsapp = '56999888777';
# DELETE FROM prospecto_historial WHERE whatsapp = '56999888777';
```

### **📱 Interfaz de Testing:**
- **URL Principal:** http://localhost:3001/vue-chat/
- **Número de prueba:** `56999888777`
- **Logs en tiempo real:** Terminal donde ejecutaste `npm run dev`

---

## 🔥 **PRUEBAS CRÍTICAS - ADMISSION FLOW**

### **🧪 PRUEBA 1: Flujo SÍ (Asesor) - MÁXIMA PRIORIDAD**

**🎯 Objetivo:** Verificar terminación correcta con "asesor" y logs completos

**📝 Secuencia de Inputs:** *(CORREGIDA - 04 Ene 2025)*
```
1. "Hola" (ProspectCapture completo: nombre, email, edad, región)
2. "2" (Proceso de admisión 2025) → Activa AdmissionFlow
3. "3" (Becas disponibles) → DENTRO del AdmissionFlow  
4. "1" (Beca Talento)
5. "1" (SÍ, quiero que me contacten)
```

**🔧 FIX APLICADO:** ChatServiceV2 ahora reconoce `isInAdmissionFlow` correctamente.

**🔧 FIX APLICADO (04 Ene 2025):** Corregido problema de timeout warnings después de flujo completado. 
- **Backend:** Cuando un flujo termina con `completed: true`, NO se muestran warnings de timeout pendientes.
- **Frontend:** Detecta automáticamente cuando la sesión termina y cancela timeouts del navegador.

**✅ Logs Críticos Esperados:**
```bash
📝 [ADMISSION-FLOW] ===== PROCESANDO MENSAJE =====
👤 [56999888777] Input: "1"
🤝 [56999888777] ===== DECISIÓN DE CONTACTO CRÍTICA =====
✅ [56999888777] DECISIÓN: SÍ - Usuario quiere contacto de asesor
🔥 [56999888777] Generando tipo: beca_talento_asesor
💾 [56999888777] ===== DATOS PARA BASE DE DATOS =====
📊 [56999888777] Datos para prospecto_actual: {tipo_consulta: "beca_talento_asesor"}
🔥 [56999888777] LEAD CALIENTE - Prioridad ALTA en dashboard
✅ [56999888777] ===== GUARDADO EXITOSO =====
🏁 [56999888777] FLUJO TERMINADO - Session cleanup requerido
```

**🔍 Verificaciones en BD:**
```sql
SELECT tipo_consulta_actual, nivel_interes FROM prospecto_actual WHERE whatsapp='56999888777';
-- Resultado esperado: tipo_consulta_actual="beca_talento_asesor", nivel_interes="alto"
```

**💬 Mensaje Final Esperado:**
```
🎯 ¡Perfecto! Un especialista en becas de UNIACC te contactará en las próximas 24 horas para ayudarte con la Beca Talento.

✅ Tus datos están seguros con nosotros.

💬 Para nuevas consultas, escribe "hola" y estaremos aquí para ayudarte.
```

**🚨 Red Flags (Detener si aparece):**
- Timeouts no cancelados después del flujo
- `tipo_consulta_actual` incorrecto en BD
- Logs de guardado faltantes
- Session no termina limpiamente

---

### **🧪 PRUEBA 2: Flujo NO (Sin Asesor)**

**🎯 Objetivo:** Verificar terminación con "sin_asesor"

**📝 Secuencia de Inputs:**
```
1. "Hola" (ProspectCapture completo)
2. "2" (Admisión y becas)
3. "4" (Requisitos PAES/académicos)
4. "2" (Tengo estudios universitarios)
5. "2" (NO, solo quería información)
```

**✅ Logs Críticos Esperados:**
```bash
📋 [56999888777] DECISIÓN: NO - Usuario solo quería información
📊 [56999888777] Generando tipo: transferencia_universitaria_sin_asesor
📋 [56999888777] LEAD INFORMATIVO - Prioridad MEDIA, follow-up posterior
```

**🔍 Verificación BD:**
```sql
-- Resultado esperado: tipo_consulta_actual="transferencia_universitaria_sin_asesor", nivel_interes="medio"
```

**💬 Mensaje Final:**
```
✅ Perfecto, tu información sobre transferencia universitaria está guardada.

📚 Si necesitas más detalles en el futuro, no dudes en contactarnos.

💬 Para nuevas consultas, escribe "hola" y estaremos aquí para ayudarte.
```

---

### **🧪 PRUEBA 3: Timeout en Decisión - CRÍTICO**

**🎯 Objetivo:** Verificar manejo de timeout durante decisión SÍ/NO

**📝 Secuencia de Inputs:**
```
1. "Hola" (ProspectCapture completo)
2. "2" (Admisión y becas)
3. "1" (Fechas importantes) 
4. "1" (Ver más fechas del calendario)
5. [NO RESPONDER - ESPERAR 20 SEGUNDOS EXACTOS]
```

**✅ Logs Críticos Esperados:**
```bash
⏰ [56999888777] ===== TIMEOUT EN DECISIÓN DE CONTACTO =====
📋 [56999888777] Contexto de timeout: {detailType: "admision_calendario"}
💾 [56999888777] Guardando timeout con tipo: admision_calendario_timeout
⏰ [56999888777] LEAD TIMEOUT - Prioridad BAJA, requiere nurturing
```

**🔍 Verificación BD:**
```sql
-- Resultado esperado: tipo_consulta_actual="admision_calendario_timeout", nivel_interes="bajo"
```

**💬 Mensaje Timeout:**
```
⏰ Tiempo de espera agotado. No te preocupes, tus datos están resguardados.

📞 Si quieres continuar, simplemente escribe "hola" y podremos ayudarte.

✅ UNIACC está aquí cuando estés listo.
```

---

### **🧪 PRUEBA 4: Navegación Entre Secciones**

**📝 Secuencia de Inputs:**
```
1. "Hola" (ProspectCapture completo)
2. "2" (Admisión y becas)
3. "5" (Contactar admisiones)
4. "2" (Prefiero que me llamen)
5. "1" (SÍ, quiero contacto)
```

**✅ Verificación:**
```sql
-- Resultado: tipo_consulta_actual="callback_admision_asesor"
```

---

## 🏠 **PRUEBAS MAIN MENU FLOW**

### **🧪 PRUEBA 5: Exploración de Carreras**

**📝 Secuencia de Inputs:**
```
1. "Hola" (usuario nuevo - ProspectCapture completo)
2. "1" (Conocer nuestras carreras)
3. "1" (Artes)
4. "1" (Teatro y Comunicación Escénica)
5. "4" (Hablar con un asesor)
```

**✅ Logs Esperados:**
```bash
🏠 [56999888777] MainMenuFlow procesando opción: 1
🎓 [56999888777] Navegando a carreras → facultad Artes
👥 [56999888777] Solicitud asesor desde carrera específica
```

**✅ Verificación BD:**
```sql
-- Resultado: tipo_consulta_actual="solicitud_asesor"
-- facultad_interes="ARTES"
-- carrera_interes="Teatro y Comunicación Escénica"
```

---

### **🧪 PRUEBA 6: Volver al Menú Principal**

**📝 Secuencia de Inputs:**
```
1. Continuar desde PRUEBA 5 hasta carrera detail
2. "3" (Volver al menú principal)
```

**✅ Verificación:**
- El menú completo debe mostrarse, NO solo "Regresando..."
- Logs de transición correctos

---

## 🔄 **PRUEBAS RETURNING USER FLOW**

### **🧪 PRUEBA 7: Usuario con Solo Teléfono**

**📋 Prerequisito:** Ejecutar PRUEBA 3 (timeout) primero para crear usuario con nombre técnico

**📝 Input:**
```
1. "Hola" (después del timeout)
```

**✅ Logs Esperados:**
```bash
🔄 [56999888777] Returning user detectado con solo teléfono
🔄 [56999888777] Nombre técnico detectado: "Usuario (timeout)"
🔄 [56999888777] Redirigiendo a PRIVACY_CHOICE
```

**✅ Verificación:**
- Debe mostrar opciones de privacidad
- NO debe usar nombre técnico en saludo

---

### **🧪 PRUEBA 8: Usuario con Nombre Real**

**📋 Prerequisito:** Usuario con nombre real en BD

**📝 Input:**
```
1. "Hola"
```

**✅ Logs Esperados:**
```bash
🔄 [56999888777] Returning user con nombre real: "Juan"
🔄 [56999888777] Saludo personalizado directo al MainMenu
```

**✅ Verificación:**
- Saludo: "¡Hola Juan! Me alegra verte de nuevo"
- Transición directa a MainMenu

---

## 🎓 **PRUEBAS ADVISOR REQUEST FLOW**

### **🧪 PRUEBA 9: Solicitud Directa de Asesor - CRÍTICA**

**📝 Input desde MainMenu:**
```
1. "5" (Hablar con asesor académico)
```

**✅ Logs Esperados:**
```bash
🎓 [56999888777] AdvisorRequestFlow activado
👥 [56999888777] Solicitud directa de asesor
💾 [56999888777] Actualizando: tipo_consulta="solicitud_asesor"
🛑 [56999888777] Cancelando timeouts programados
```

**🚨 Verificaciones CRÍTICAS:**
```sql
-- tipo_consulta_actual="solicitud_asesor" (NO "solicitud_asesor_asesor")
-- nivel_interes="alto"
-- Timeouts cancelados
-- Session completada limpiamente
```

---

## 📱 **PRUEBAS PROSPECT CAPTURE FLOW**

### **🧪 PRUEBA 10: Captura Completa Usuario Nuevo**

**📝 Secuencia de Inputs:**
```
1. "Hola" (usuario completamente nuevo)
2. "1" (Sí, teléfono correcto)
3. "Juan Pablo" (nombre)
4. "juan@test.cl" (email)
5. "25" (edad)
6. "1" (Región Metropolitana)
```

**✅ Logs Esperados:**
```bash
📱 [56999888777] PhoneDetectionStep: teléfono detectado
👤 [56999888777] Nombre capturado y validado
📧 [56999888777] Email validado RFC
🔢 [56999888777] Edad validada (16-80)
🏠 [56999888777] Transición automática a MainMenuFlow
```

**✅ Verificación:**
- Todas las tablas pobladas correctamente
- Transición fluida a MainMenu

---

## ⏰ **PRUEBAS TIMEOUT MANAGEMENT - CRÍTICAS**

### **🧪 PRUEBA 11: Timeout en Diferentes Pasos**

**Test A: Timeout en ProspectCapture**
```bash
1. "Hola" → "1" → [NO RESPONDER 20s]
# Verificar: tipo_consulta_actual="abandono_por_timeout"
```

**Test B: Timeout en MainMenu**
```bash
1. [Después de captura completa] → [NO RESPONDER 20s]
# Verificar: NO interfiere con sesión
```

**Test C: Timeout en AdmissionFlow (PRUEBA 3)**

---

### **🧪 PRUEBA 12: Recuperación Post-Timeout**

**📝 Después de cualquier timeout:**
```
1. "Hola" (nuevo saludo)
```

**🚨 Verificación CRÍTICA:**
- NO debe mostrar mensaje de timeout duplicado
- ReturningUserFlow debe activarse correctamente
- Experiencia limpia sin confusión

---

## 📊 **PRUEBAS DASHBOARD INTEGRATION**

### **🧪 PRUEBA 13: Verificación Dashboard**

**📋 Después de ejecutar PRUEBAS 1-3:**
```
1. Ir a: http://localhost:3000
2. Ver sección Prospectos
```

**✅ Verificaciones Visuales:**
- Prospectos con "_asesor" tienen baliza roja 🚨
- Texto "Solicitud asesor" en rojo y negrita
- Ordenamiento por prioridad visible
- Filtros funcionando

**✅ Queries de Verificación:**
```sql
SELECT tipo_consulta_actual, COUNT(*) as cantidad 
FROM prospecto_actual 
WHERE tipo_consulta_actual LIKE '%beca_talento%' 
GROUP BY tipo_consulta_actual;

-- Resultado esperado:
-- beca_talento_asesor    | 1 (rojo, prioridad alta)
-- beca_talento_sin_asesor| 1 (normal, prioridad media)  
-- beca_talento_timeout   | 1 (gris, prioridad baja)
```

---

## 🎯 **PRUEBAS PERFORMANCE & ERROR**

### **🧪 PRUEBA 14: Performance Benchmarks**

**📋 Ejecutar cualquier flujo completo y verificar logs:**

**✅ Tiempos Esperados:**
```bash
# Context recuperado: < 20ms
# Paso procesado: < 50ms
# Guardado BD: < 100ms  
# Tiempo total: < 200ms
# Transición flows: < 300ms
```

---

### **🧪 PRUEBA 15: Error Handling**

**Test A: Opción inválida**
```bash
1. En cualquier menú: "999"
# Verificar: Error handling sin crash
```

**Test B: Input vacío**
```bash
1. En cualquier paso: "" (vacío)
# Verificar: Manejo graceful
```

**Test C: Caracteres especiales**
```bash
1. En nombre: "Juan@#$%"
# Verificar: Validación correcta
```

---

## 📋 **ORDEN DE EJECUCIÓN RECOMENDADO**

### **🔥 PRUEBAS OBLIGATORIAS (Ejecutar en orden):**
1. **PRUEBA 10** - Prospect Capture (base para otras)
2. **PRUEBA 1** - Admission SÍ (**MÁS CRÍTICA**)
3. **PRUEBA 2** - Admission NO (**CRÍTICA**)
4. **PRUEBA 3** - Timeout (**CRÍTICA**)
5. **PRUEBA 9** - Advisor directo (**CRÍTICA**)
6. **PRUEBA 13** - Dashboard (**VERIFICACIÓN**)

### **⚡ PRUEBAS OPCIONALES (Si hay tiempo):**
- PRUEBA 4, 5, 6, 7, 8, 11, 12, 14, 15

---

## 🚨 **RED FLAGS - DETENER TESTING**

**🛑 Detener inmediatamente si:**
- Logs críticos no aparecen
- BD no se actualiza correctamente
- Timeouts duplicados
- Session no termina limpiamente
- Dashboard no muestra prioridades
- Performance > 500ms por operación

---

## 🚀 **COMANDOS DE VERIFICACIÓN RÁPIDA**

```sql
-- Ver todos los tipos únicos generados:
SELECT DISTINCT tipo_consulta_actual FROM prospecto_actual ORDER BY tipo_consulta_actual;

-- Ver últimas 10 interacciones:
SELECT whatsapp, tipo_consulta_actual, nivel_interes, ultima_interaccion 
FROM prospecto_actual 
ORDER BY ultima_interaccion DESC LIMIT 10;

-- Ver historial detallado:
SELECT whatsapp, paso, timestamp 
FROM prospecto_historial 
ORDER BY timestamp DESC LIMIT 10;

-- Verificar prospectos con asesor:
SELECT COUNT(*) as total_asesor 
FROM prospecto_actual 
WHERE tipo_consulta_actual LIKE '%_asesor';
```

---

## 📱 **FORMATO DE REPORTE DE TESTING**

### **Para cada prueba completada, reportar:**
```markdown
## ✅ PRUEBA X COMPLETADA

**Estado:** ✅ ÉXITO / ❌ FALLO
**BD Verificada:** ✅ CORRECTO / ❌ INCORRECTO  
**Logs Completos:** ✅ SÍ / ❌ NO
**Performance:** XXms (✅ < 300ms / ❌ > 300ms)
**Red Flags:** Ninguno / [Detalle]

**Observaciones:**
[Cualquier comportamiento inesperado]
```

---

**🎯 ¿Listo para empezar con PRUEBA 10 (base) seguida de PRUEBA 1 (crítica)?**
