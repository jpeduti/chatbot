# 🔄 FLUJOS PARA USUARIOS RECURRENTES - UNIACC CHATBOT

> **Documento de análisis y diseño de flujos conversacionales para usuarios que regresan**
> 
> Fecha: Diciembre 2024  
> Estado: 🔍 En análisis y discusión

---

## 📋 ÍNDICE

1. [Flujo 1: Usuario Solo con Teléfono](#flujo-1-usuario-solo-con-teléfono)
2. [Flujo 2: Usuario con Nombre (Sin Historial)](#flujo-2-usuario-con-nombre-sin-historial)
3. [Flujo 3: Usuario con Historial de Interés](#flujo-3-usuario-con-historial-de-interés)
4. [Flujo 4: Usuario que ya Pidió Asesor](#flujo-4-usuario-que-ya-pidió-asesor)
5. [Flujo 5: Usuario VIP (Datos Completos + Alta Actividad)](#flujo-5-usuario-vip-datos-completos--alta-actividad)
6. [Flujos por Tiempo Transcurrido](#flujos-por-tiempo-transcurrido)
7. [Manejo de Rechazos de Datos Personales](#manejo-de-rechazos-de-datos-personales)
8. [Captura Progresiva Inteligente](#captura-progresiva-inteligente)
9. [Patrones y Principios](#patrones-y-principios)

---

## 📱 FLUJO 1: USUARIO SOLO CON TELÉFONO

### Contexto
- ✅ Teléfono confirmado
- ❌ Sin nombre
- ❌ Sin historial de intereses
- ❌ Sin datos adicionales

### Conversación

```
🤖 RECONOCIMIENTO:
"¡Hola! Te reconozco 👋 Me alegra verte de nuevo"

🤖 OPCIONES DE PERSONALIZACIÓN:
"Para brindarte una mejor experiencia, ¿qué prefieres?

1️⃣ 👤 Dar mi nombre (experiencia personalizada)
2️⃣ 🔒 Seguir sin nombre (mantener privacidad)"

👤 Usuario elige "1"

🤖 SOLICITUD DE NOMBRE:
"¡Perfecto! 😊 ¿Cómo te llamas?"

👤 Usuario responde: "Juan"

🤖 CONFIRMACIÓN + MENÚ:
"¡Excelente Juan! 🌟 Ahora puedo ayudarte mejor.
¿En qué puedo ayudarte hoy?

1️⃣ Conocer nuestras carreras
2️⃣ Información de admisión 2025
3️⃣ Aranceles y financiamiento  
4️⃣ Hablar con asesor
5️⃣ Otra consulta"

👤 Usuario elige opción...
```

### 🔄 Si Usuario Elige Opción 2 (Sin Nombre)

```
👤 Usuario elige "2"

🤖 FLUJO ANÓNIMO:
"¡Perfecto! 👍 Respeto tu privacidad.
¿En qué puedo ayudarte hoy?

1️⃣ Conocer nuestras carreras
2️⃣ Información de admisión 2025
3️⃣ Aranceles y financiamiento
4️⃣ Hablar con asesor
5️⃣ 👤 Darme nombre después (opcional)
6️⃣ Otra consulta"

👤 Usuario elige opción...
```

#### 🔄 Si Usuario Elige Opción 5 (Cambio de Opinion)

```
👤 Usuario elige "5"

🤖 BIENVENIDA AL CAMBIO:
"¡Perfecto! 😊 Me alegra que quieras una experiencia más personalizada.
¿Cómo te llamas?"

👤 Usuario responde: "Juan"

🤖 CONFIRMACIÓN + MENÚ PERSONALIZADO:
"¡Excelente Juan! 🌟 Ahora puedo ayudarte mejor.
¿En qué puedo ayudarte hoy?

1️⃣ Conocer nuestras carreras
2️⃣ Información de admisión 2025
3️⃣ Aranceles y financiamiento  
4️⃣ Hablar con asesor
5️⃣ Otra consulta"

👤 Usuario elige opción...
```

### 🔄 **FLUJO COMPLETO ESTRUCTURADO**

#### **RAMA A: Si Usuario Elige Opción 1 (Dar Nombre)**

```
👤 Usuario elige "1"

🤖 SOLICITUD DE NOMBRE:
"¡Perfecto! 😊 Por favor escribe tu nombre:"

👤 Usuario escribe: "Juan"  ← ✅ ÚNICA excepción de texto libre

🤖 CONFIRMACIÓN + MENÚ PERSONALIZADO:
"¡Excelente Juan! 🌟 Ahora puedo ayudarte mejor.
¿En qué puedo ayudarte hoy?

1️⃣ Conocer nuestras carreras
2️⃣ Información de admisión 2025
3️⃣ Aranceles y financiamiento  
4️⃣ Hablar con asesor
5️⃣ Otra consulta"

👤 Usuario elige una opción (1-5)
```

#### **RAMA B: Si Usuario Elige Opción 2 (Sin Nombre)**

```
👤 Usuario elige "2"

🤖 FLUJO ANÓNIMO:
"¡Perfecto! 👍 Respeto tu privacidad.
¿En qué puedo ayudarte hoy?

1️⃣ Conocer nuestras carreras
2️⃣ Información de admisión 2025
3️⃣ Aranceles y financiamiento
4️⃣ Hablar con asesor
5️⃣ 👤 Darme nombre después (opcional)
6️⃣ Otra consulta"

👤 Usuario elige una opción (1-6)
```

#### **RAMA B.1: Si Elige Opción 5 (Cambio de Opinión)**

```
👤 Usuario elige "5"

🤖 BIENVENIDA AL CAMBIO:
"¡Perfecto! 😊 Me alegra que quieras una experiencia más personalizada.
Por favor escribe tu nombre:"

👤 Usuario escribe: "Juan"  ← ✅ ÚNICA excepción de texto libre

🤖 CONFIRMACIÓN + MENÚ PERSONALIZADO:
"¡Excelente Juan! 🌟 Ahora puedo ayudarte mejor.
¿En qué puedo ayudarte hoy?

1️⃣ Conocer nuestras carreras
2️⃣ Información de admisión 2025
3️⃣ Aranceles y financiamiento  
4️⃣ Hablar con asesor
5️⃣ Otra consulta"

👤 Usuario elige una opción (1-5)
```

---

## 👤 FLUJO 2: USUARIO CON NOMBRE (SIN HISTORIAL)

### Contexto
- ✅ Teléfono confirmado
- ✅ Nombre disponible
- ❌ Sin historial de intereses específicos
- ⚠️ Posibles datos adicionales básicos (edad, email, región)

### Conversación Principal

```
🤖 RECONOCIMIENTO PERSONALIZADO:
"¡Hola Juan! 😊 Me alegra verte de nuevo"

🤖 MENÚ CONTEXTUAL:
"¿En qué puedo ayudarte hoy?

1️⃣ 🎓 Conocer nuestras carreras
2️⃣ 📋 Información de admisión 2025
3️⃣ 💰 Aranceles y financiamiento
4️⃣ 👨‍🎓 Hablar con asesor
5️⃣ ⭐ Completar mi perfil (beneficios exclusivos)
6️⃣ 💬 Otra consulta"

👤 Usuario elige una opción (1-6)
```

### 🔄 **FLUJO ESPECÍFICO PARA OPCIÓN 5 (Completar Perfil)**

```
👤 Usuario elige "5"

🤖 EXPLICACIÓN DE BENEFICIOS:
"¡Excelente Juan! 🌟 Completar tu perfil te da acceso a:

💡 BENEFICIOS EXCLUSIVOS:
- Información personalizada por edad/región
- Recomendaciones de carreras según tu perfil
- Invitaciones a eventos exclusivos
- Calculadora de aranceles personalizada

¿Qué información te gustaría agregar?

1️⃣ 📧 Mi email (info detallada)
2️⃣ 📅 Mi edad (recomendaciones precisas)
3️⃣ 🗺️ Mi región (beneficios locales)
4️⃣ ⭐ Todo lo anterior (experiencia completa)
5️⃣ 🔙 Mejor después, ir al menú principal"

👤 Usuario elige una opción (1-5)
```

### 📧 **SUB-FLUJO: Captura de Email (Opción 1)**

```
👤 Usuario elige "1"

🤖 SOLICITUD DE EMAIL:
"¡Perfecto Juan! 📧 Por favor escribe tu email:
(Ejemplo: juan@gmail.com)"

👤 Usuario escribe: "juan@gmail.com"  ← ✅ Excepción de texto libre

🤖 CONFIRMACIÓN + SIGUIENTE:
"¡Excelente! ✅ Email guardado: juan@gmail.com

¿Te gustaría agregar más información para personalizar mejor tu experiencia?

1️⃣ 📅 Agregar mi edad
2️⃣ 🗺️ Agregar mi región  
3️⃣ ✅ Continuar con esta información
4️⃣ 🔙 Ir al menú principal"

👤 Usuario elige una opción (1-4)
```

### 📅 **SUB-FLUJO: Captura de Edad (Opción 2)**

```
👤 Usuario elige "2"

🤖 SOLICITUD DE EDAD:
"¡Perfecto Juan! 📅 Para recomendaciones más precisas:

1️⃣ 🎓 17-19 años (recién egresado)
2️⃣ 👨‍💼 20-25 años (primer título)
3️⃣ 💼 26-35 años (especialización)
4️⃣ 👨‍💻 36+ años (cambio profesional)
5️⃣ ❌ Prefiero no especificar"

👤 Usuario elige una opción (1-5)

🤖 CONFIRMACIÓN + SIGUIENTE:
"¡Perfecto! ✅ Información guardada.

¿Te gustaría agregar más datos?

1️⃣ 📧 Agregar mi email
2️⃣ 🗺️ Agregar mi región
3️⃣ ✅ Continuar con esta información  
4️⃣ 🔙 Ir al menú principal"

👤 Usuario elige una opción (1-4)
```

### 🗺️ **SUB-FLUJO: Captura de Región (Opción 3)**

```
👤 Usuario elige "3"

🤖 SOLICITUD DE REGIÓN:
"¡Perfecto Juan! 🗺️ Para beneficios regionales específicos:

1️⃣ 🏙️ Región Metropolitana
2️⃣ 🌊 Valparaíso
3️⃣ 🍷 O'Higgins
4️⃣ 🏔️ Maule
5️⃣ 🌲 Biobío
6️⃣ 🗺️ Otra región
7️⃣ ❌ Prefiero no especificar"

👤 Usuario elige una opción (1-7)

🤖 CONFIRMACIÓN + SIGUIENTE:
"¡Excelente! ✅ Región guardada.

¿Te gustaría completar más información?

1️⃣ 📧 Agregar mi email
2️⃣ 📅 Agregar mi edad
3️⃣ ✅ Continuar con esta información
4️⃣ 🔙 Ir al menú principal"

👤 Usuario elige una opción (1-4)
```

### ⭐ **SUB-FLUJO: Todo lo Anterior (Opción 4)**

```
👤 Usuario elige "4"

🤖 CAPTURA COMPLETA PASO A PASO:
"¡Excelente Juan! 🌟 Completemos tu perfil paso a paso.

Empezemos con tu email:
Por favor escríbelo:"

👤 Usuario escribe: "juan@gmail.com"  ← ✅ Excepción de texto libre

🤖 SIGUIENTE PASO - EDAD:
"¡Perfecto! ✅ Ahora tu rango de edad:

1️⃣ 🎓 17-19 años (recién egresado)
2️⃣ 👨‍💼 20-25 años (primer título)
3️⃣ 💼 26-35 años (especialización)
4️⃣ 👨‍💻 36+ años (cambio profesional)"

👤 Usuario elige una opción (1-4)

🤖 ÚLTIMO PASO - REGIÓN:
"¡Excelente! ✅ Finalmente tu región:

1️⃣ 🏙️ Región Metropolitana
2️⃣ 🌊 Valparaíso
3️⃣ 🍷 O'Higgins
4️⃣ 🏔️ Maule
5️⃣ 🌲 Biobío
6️⃣ 🗺️ Otra región"

👤 Usuario elige una opción (1-6)

🤖 CONFIRMACIÓN FINAL:
"¡Fantástico Juan! 🎉 Tu perfil está completo.
Ahora tendrás acceso a información personalizada y beneficios exclusivos.

¿En qué puedo ayudarte ahora?

1️⃣ 🎓 Ver carreras recomendadas para tu perfil
2️⃣ 💰 Calcular aranceles personalizados
3️⃣ 📋 Info de admisión para tu edad
4️⃣ 👨‍🎓 Hablar con asesor especializado
5️⃣ 💬 Otra consulta"

👤 Usuario elige una opción (1-5)
```

### Notas de Implementación
- **Usar nombre** en todos los mensajes posteriores
- **Captura progresiva** con beneficios claros en cada paso
- **Tono más cercano** y personal que Flujo 1
- **Múltiples caminos** para completar información
- **Siempre opciones de escape** sin presión

---

## 🎓 FLUJO 3: USUARIO CON HISTORIAL DE INTERÉS

### Contexto
- ✅ Teléfono confirmado
- ✅ Nombre disponible
- ✅ Historial de consultas específicas
- ✅ Carrera/área de interés identificada (ej: Comunicación Audiovisual, Arquitectura, Psicología)

### 📅 **VERSIÓN A: Si < 24 Horas (Ejemplo: Comunicación Audiovisual)**

```
🤖 RECONOCIMIENTO + MEMORIA:
"¡Hola Juan! 😊 Te reconozco"

🤖 CONTEXTO RECIENTE:
"Veo que ayer estuviste preguntando sobre Comunicación Audiovisual 📺

¿Qué te gustaría hacer hoy?

🔄 CONTINUAR TU CONSULTA:
1️⃣ 📚 Seguir con info de Comunicación Audiovisual
2️⃣ 💰 Ver aranceles de esta carrera
3️⃣ 📋 Proceso de admisión específico
4️⃣ 👨‍🎓 Hablar con asesor especializado

🆕 EXPLORAR MÁS:
5️⃣ 📺 Ver otras carreras de Comunicaciones
6️⃣ 🎓 Explorar carreras de otras facultades
7️⃣ 💬 Algo completamente diferente"

👤 Usuario elige una opción (1-7)
```

### 📅 **VERSIÓN B: Si 1-7 Días (Ejemplo: Arquitectura)**

```
🤖 RECONOCIMIENTO + MEMORIA:
"¡Hola Juan! 😊 Te reconozco"

🤖 CONTEXTO INTERMEDIO:
"Recuerdo que te interesó Arquitectura 🏗️

¿Cómo continuamos tu búsqueda?

🎯 PROFUNDIZAR EN TU INTERÉS:
1️⃣ 📈 Actualizaciones de Arquitectura
2️⃣ 💼 Campo laboral y oportunidades
3️⃣ 🏠 Comparar con Diseño de Interiores
4️⃣ 👨‍🎓 Agendar asesoría especializada

🔄 EXPLORAR OPCIONES:
5️⃣ 📋 Información de admisión 2025
6️⃣ 💰 Aranceles y financiamiento
7️⃣ 🆕 Algo completamente diferente"

👤 Usuario elige una opción (1-7)
```

### 📅 **VERSIÓN C: Si > 7 Días (Ejemplo: Psicología)**

```
🤖 RECONOCIMIENTO + MEMORIA:
"¡Hola Juan! 😊 Te reconozco"

🤖 CONTEXTO LEJANO:
"Hace un tiempo conversamos sobre Psicología ⚖️

¿Qué te interesa hacer ahora?

🔄 RETOMAR TU INTERÉS:
1️⃣ 📰 Novedades en Psicología
2️⃣ 🆕 Actualizaciones desde tu última visita
3️⃣ 💼 Nuevas oportunidades laborales
4️⃣ 👨‍🎓 Contactar asesor especializado

🌟 EXPLORAR NUEVAS OPCIONES:
5️⃣ ⚖️ Ver Derecho (misma facultad)
6️⃣ 🔍 Explorar otras facultades
7️⃣ 🆕 Algo completamente diferente"

👤 Usuario elige una opción (1-7)
```

### 🔄 **SUB-FLUJO: Explorar Otras Comunicaciones (Opción 5)**

```
👤 Usuario elige "5" (Otras comunicaciones)

🤖 OPCIONES DE COMUNICACIONES:
"¡Excelente Juan! 📺 Ya que te interesa Comunicación Audiovisual, 
estas otras carreras de comunicaciones podrían gustarte:

1️⃣ 📰 Periodismo (presencial/semipresencial)
2️⃣ 🎨 Publicidad (creatividad y estrategia)
3️⃣ 📊 Comparar las 3 carreras de comunicaciones
4️⃣ 💰 Ver aranceles de comunicaciones
5️⃣ 🎬 Más info de Comunicación Audiovisual
6️⃣ 🔙 Volver al menú anterior"

👤 Usuario elige una opción (1-6)
```

### 🎭 **SUB-FLUJO: Explorar Otras Facultades (Opción 6)**

```
👤 Usuario elige "6" (Otras facultades)

🤖 OPCIONES DE FACULTADES:
"¡Perfecto Juan! 🌟 Exploremos otras áreas de UNIACC:

1️⃣ 🎭 Facultad de Artes (teatro, danza, música, artes visuales)
2️⃣ 🏗️ Arquitectura y Diseño (arquitectura, interiores)
3️⃣ ⚖️ Ciencias Jurídicas (derecho, psicología)
4️⃣ 💼 Negocios y Tecnología (comercial, auditor)
5️⃣ 📊 Comparar todas las facultades
6️⃣ 🔙 Volver a [Comunicación Audiovisual]"

👤 Usuario elige una opción (1-6)
```

### 🚪 **SUB-FLUJO: Algo Completamente Diferente (Opción 7)**

```
👤 Usuario elige "7" (Algo completamente diferente)

🤖 CAMBIO COMPLETO:
"¡Entendido Juan! 🔄 Dejemos [Comunicación Audiovisual] por ahora.

¿Qué área completamente diferente te gustaría explorar?

1️⃣ 🎭 Artes (creatividad y expresión)
2️⃣ 🏗️ Arquitectura (diseño y construcción)  
3️⃣ ⚖️ Derecho o Psicología (humanidades)
4️⃣ 💼 Negocios (administración y finanzas)
5️⃣ 🤷‍♂️ No estoy seguro, sorpréndeme
6️⃣ 📋 Información general de UNIACC
7️⃣ 👨‍🎓 Hablar con orientador vocacional"

👤 Usuario elige una opción (1-7)
```

### 🎯 **SUB-FLUJO: Sorpréndeme (Opción 5)**

```
👤 Usuario elige "5" (Sorpréndeme)

🤖 RECOMENDACIÓN INTELIGENTE:
"¡Me encanta la aventura Juan! 🎲 Basándome en tu perfil, 
te recomiendo explorar:

💡 RECOMENDACIÓN DEL DÍA:
🎬 Comunicación Audiovisual - Pioneros en Chile desde 1981
¿Sabías que es nuestra carrera destacada?

¿Te interesa conocer más?

1️⃣ ✅ Sí, cuéntame más de esta carrera
2️⃣ 🎲 Dame otra recomendación sorpresa
3️⃣ 🎯 Test vocacional rápido (5 preguntas)
4️⃣ 💰 Ver la carrera más económica
5️⃣ ⭐ Ver la carrera más popular
6️⃣ 🔙 Volver al menú anterior"

👤 Usuario elige una opción (1-6)
```

### Notas de Implementación
- **Usar carreras reales** de UNIACC en todos los ejemplos
- **Mencionar carrera específica** del historial con emoji de facultad
- **Opciones 1-4** son contextuales al interés previo
- **Opciones 5-7** permiten explorar nuevo territorio  
- **Asesor especializado** según la facultad de interés
- **Sub-flujos detallados** para cada opción principal

---

## 🎯 FLUJO 4: USUARIO QUE YA PIDIÓ ASESOR

### Contexto
- ✅ Teléfono confirmado
- ✅ Nombre disponible
- ✅ Solicitud de asesor previa
- ⚠️ Estado de contacto incierto

### Conversación

```
🤖 RECONOCIMIENTO + SEGUIMIENTO:
"¡Hola Juan! 😊 Te reconozco"

🤖 STATUS CHECK CON OPCIONES:
"Veo que solicitaste hablar con un asesor sobre Ingeniería Civil.
¿Cuál es tu situación actual?

1️⃣ ✅ Ya me contactaron (todo bien)
2️⃣ ⏳ Aún no me contactan
3️⃣ 🔄 Quiero actualizar mi solicitud  
4️⃣ ❌ Cancelar solicitud
5️⃣ 💬 Otra consulta diferente"
```

### Ramificaciones por Opción

#### ✅ Si Usuario Elige Opción 1 (Ya Lo Contactaron)
```
👤 Usuario elige "1"

🤖 FLUJO NORMAL:
"¡Excelente! 🎉 Me alegra que hayan podido ayudarte.
¿En qué más puedo ayudarte hoy?

1️⃣ Conocer otras carreras
2️⃣ Información de admisión 2025
3️⃣ Aranceles y financiamiento
4️⃣ Solicitar otro asesor (diferente tema)
5️⃣ Otra consulta"
```

#### ⏳ Si Usuario Elige Opción 2 (No Lo Han Contactado)
```
👤 Usuario elige "2"

🤖 FLUJO DE SEGUIMIENTO:
"Entiendo tu preocupación. Voy a verificar el estado de tu solicitud.
Mientras tanto, ¿qué prefieres hacer?

🔔 SOBRE TU SOLICITUD:
1️⃣ 📞 Actualizar teléfono de contacto
2️⃣ 📧 Actualizar email de contacto  
3️⃣ ⚡ Marcar como urgente
4️⃣ 🕐 Cambiar horario preferido

📋 MIENTRAS ESPERAS:
5️⃣ 📚 Info actualizada de Ingeniería Civil
6️⃣ 🔍 Ver carreras similares
7️⃣ 💰 Calcular aranceles
8️⃣ 💬 Otra consulta"
```

#### 🔄 Si Usuario Elige Opción 3 (Actualizar Solicitud)
```
👤 Usuario elige "3"

🤖 FLUJO DE ACTUALIZACIÓN:
"¡Por supuesto! 😊 ¿Qué aspecto quieres actualizar?

1️⃣ 🎓 Cambiar carrera de interés
2️⃣ 📞 Actualizar datos de contacto
3️⃣ ⚡ Cambiar urgencia de consulta
4️⃣ 📋 Modificar tipo de información
5️⃣ 🕐 Cambiar horario de contacto
6️⃣ 🔙 Volver al menú anterior"
```

#### ❌ Si Usuario Elige Opción 4 (Cancelar)
```
👤 Usuario elige "4"

🤖 CONFIRMACIÓN DE CANCELACIÓN:
"Entiendo. ¿Estás seguro de cancelar tu solicitud de asesor?

1️⃣ ✅ Sí, cancelar definitivamente
2️⃣ ⏸️ Solo pausar por ahora
3️⃣ 🔄 Mejor quiero actualizarla
4️⃣ 🔙 No, mantener como está"
```

---

## ⭐ FLUJO 5: USUARIO VIP (DATOS COMPLETOS + ALTA ACTIVIDAD)

### Contexto
- ✅ Perfil completo (nombre, email, teléfono, edad, región)
- ✅ Múltiples interacciones previas
- ✅ Alta actividad/engagement
- ✅ Historial rico de consultas

### Conversación

```
🤖 RECONOCIMIENTO VIP:
"¡Hola Juan! 🌟 Siempre es un gusto ayudarte"

🤖 CONTEXTO INTELIGENTE:
"Veo que has estado muy activo explorando nuestras opciones.
Has consultado sobre Ingeniería Civil, aranceles y becas."

🤖 SUGERENCIA PROACTIVA:
"💡 ¿Te parece que es momento de dar el siguiente paso?
Puedo conectarte directamente con un asesor especializado o
si prefieres, seguir explorando por tu cuenta."

🤖 MENÚ PREMIUM:
"¿Qué prefieres hacer hoy?

🚀 ACELERAR PROCESO:
1️⃣ Hablar con asesor ahora (prioritario)
2️⃣ Agendar reunión personalizada
3️⃣ Revisar mi expediente completo

🔍 EXPLORAR MÁS:
4️⃣ Comparar con otras ingenierías
5️⃣ Simular financiamiento personalizado
6️⃣ Tour virtual del campus

📋 INFORMACIÓN:
7️⃣ Novedades desde tu última visita
8️⃣ Algo completamente diferente"

👤 Usuario elige opción...
```

### Características del Flujo VIP
- **Reconocimiento especial** con emoji 🌟
- **Resumen de actividad** previa
- **Sugerencia proactiva** de avance
- **Opciones premium** (prioritario, personalizado, completo)
- **Información actualizada** desde última visita

---

## 🕐 FLUJOS POR TIEMPO TRANSCURRIDO

### ⚡ Menos de 1 Hora
```
"¡Hola Juan! 👋 Qué rápido volviste 😄
¿Olvidaste preguntar algo o quieres continuar donde lo dejamos?"
```

### 🌅 Mismo Día
```
"¡Hola Juan! 😊 Te veo muy interesado en UNIACC hoy.
¿En qué más puedo ayudarte?"
```

### 🌙 Horario Fuera de Atención
```
"¡Hola Juan! 😊 Te reconozco. 
Aunque es tarde, puedo ayudarte con información básica.
Para consultas específicas, ¿prefieres que un asesor te contacte mañana?

1️⃣ Información general (disponible 24/7)
2️⃣ Agendar llamada para mañana
3️⃣ Enviar información por WhatsApp
4️⃣ Hablar con asesor ahora (si disponible)"
```

### 📅 Después de Fin de Semana
```
"¡Hola Juan! 😊 ¡Buen inicio de semana!
¿Tuviste tiempo de pensar en lo que conversamos el viernes?"
```

### 🗓️ Después de Semanas/Meses
```
"¡Hola Juan! 😊 ¡Cuánto tiempo! Me alegra verte de nuevo.
¿Sigues interesado en estudiar en UNIACC o hay algo nuevo que explorar?"
```

---

## 🚫 MANEJO DE RECHAZOS DE DATOS PERSONALES

### ⚠️ **IMPORTANTE: SOLO OPCIONES ESTRUCTURADAS**
**El usuario NUNCA debe escribir respuestas libres. TODO debe ser por opciones numeradas.**

### Estrategia: "Opciones de Privacidad Claras"

#### ✅ Enfoque Correcto (Con Opciones)
```
🤖 RECONOCIMIENTO:
"¡Hola! Te reconozco 👋 Me alegra verte de nuevo"

🤖 OPCIONES DE PERSONALIZACIÓN:
"Para brindarte una mejor experiencia, ¿qué prefieres?

1️⃣ 👤 Dar mi nombre (experiencia personalizada)
2️⃣ 🔒 Seguir sin nombre (mantener privacidad)"
```

#### ❌ Enfoque Incorrecto (Texto Libre)
```
❌ "¿Podrías decirme tu nombre?"
❌ "¿Cómo prefieres que te trate?"
❌ "¿Cambias de opinión sobre dar tu nombre?"
```

### Principios para Respeto de Privacidad

1. **Opciones Explícitas** - Siempre 2+ opciones claras
2. **Sin Presión** - Opciones de privacidad igual de válidas
3. **No Insistir** - Una vez rechazado, no volver a preguntar 
4. **Funcionalidad Completa** - Todo disponible sin datos personales
5. **Cambio Opcional** - Permitir cambio solo si usuario lo solicita

### 🔄 Flujo de Captura Diferida (Solo si Solicita Asesor)

```
🤖 Usuario anónimo solicita asesor

🤖: "Para conectarte con un asesor necesito un nombre de referencia.
¿Qué prefieres?

1️⃣ 👤 Dar mi nombre real
2️⃣ 🎭 Usar un nombre ficticio
3️⃣ 📞 Que me contacten solo por teléfono
4️⃣ 🔙 Mejor continúo explorando solo"
```

**Principio Fundamental:** Opciones claras respetan más la privacidad que preguntas abiertas

---

## 📈 CAPTURA PROGRESIVA INTELIGENTE

### Durante la Conversación (Natural)

#### Contexto: Usuario Pregunta sobre Carrera Específica
```
🤖 Usuario selecciona información sobre Ingeniería Civil

🤖: "¡Excelente elección! Ingeniería Civil tiene mucha demanda.
¿Te gustaría recibir información detallada?

1️⃣ 📧 Enviar malla curricular por email
2️⃣ 📱 Ver información aquí mismo
3️⃣ 📞 Que me contacte un asesor
4️⃣ 🔙 Volver al menú anterior"

💡 MOMENTO NATURAL: Opciones claras de profundización
```

#### Contexto: Usuario Pregunta sobre Aranceles
```
🤖 Usuario selecciona información de costos

🤖: "Te ayudo con información de aranceles personalizados.
¿De qué región eres?

1️⃣ 🏙️ Región Metropolitana
2️⃣ 🌊 Valparaíso
3️⃣ 🍷 O'Higgins  
4️⃣ 🏔️ Maule
5️⃣ 🌲 Biobío
6️⃣ 🗺️ Otra región
7️⃣ ❌ Prefiero información general"

💡 RAZÓN PRÁCTICA: Beneficios específicos por región
```

#### Contexto: Usuario Muestra Alto Interés
```
🤖 Usuario hace múltiples consultas sobre una carrera

🤖: "Veo que tienes mucho interés en esta carrera! 😊
¿En qué modalidad te interesa estudiar?

1️⃣ 🏢 Presencial (campus completo)
2️⃣ 💻 Online (100% virtual)
3️⃣ 🔀 Híbrida (presencial + online)
4️⃣ 🕐 Vespertina (horario trabajo)
5️⃣ ❓ No estoy seguro/a"

💡 SEGMENTACIÓN: Información específica por modalidad
```

### Al Solicitar Asesor

```
🤖: "¡Perfecto! Te conecto con un asesor especializado.
Solo necesito un nombre (puede ser cualquiera) para que 
el asesor sepa cómo dirigirse a ti. ¿Cómo te gustaría que te llame?"

💡 RAZÓN PRÁCTICA: Para el asesor, no para base de datos
```

### Al Final de la Conversación (Soft Close)

```
🤖: "¡Genial! ¿Te fue útil la información? 😊

Si quieres que recordemos esta conversación para la próxima vez,
puedo guardar un nombre (cualquiera que elijas). 
¿Te parece útil o prefieres empezar siempre desde cero?"

💡 BENEFICIO CLARO: Mejor experiencia futura
```

### Captura de Email con Valor

```
🤖: "¡Perfecto Juan! Para enviarte información personalizada:

💡 Beneficios de compartir tu email:
- Guías de carreras personalizadas
- Invitaciones a eventos exclusivos  
- Información de becas y descuentos

¿Qué prefieres?

1️⃣ ✅ Compartir mi email ahora
2️⃣ 📱 Solo recibir info por WhatsApp
3️⃣ ❌ Continuar sin email por ahora
4️⃣ 🤔 Contarme más beneficios primero"
```

#### Si Usuario Elige Opción 1 (Compartir Email)
```
👤 Usuario elige "1"

🤖: "¡Excelente! 😊 Por favor escribe tu email:
(Ejemplo: nombre@gmail.com)"

👤 Usuario escribe: "juan@gmail.com"

🤖: "¡Perfecto! ✅ Email guardado: juan@gmail.com
Recibirás información valiosa muy pronto.

[Continúa con menú normal]"
```

#### Si Usuario Elige Opción 4 (Más Info)
```
👤 Usuario elige "4"

🤖: "Con gusto te explico más beneficios:

📚 CONTENIDO EXCLUSIVO:
- Mallas curriculares actualizadas
- Guías de postulación paso a paso
- Casos de éxito de egresados

🎯 OPORTUNIDADES:
- Charlas magistrales gratuitas
- Talleres de orientación vocacional
- Descuentos early bird en matrículas

⏰ TIMING PERFECTO:
- Recordatorios de fechas importantes
- Noticias de nuevas carreras
- Info de becas antes que se agoten

¿Te convencen estos beneficios?

1️⃣ ✅ Sí, comparto mi email
2️⃣ 📱 Solo WhatsApp está bien
3️⃣ 🤔 Lo pensaré para después"
```

---

## 📊 PATRONES Y PRINCIPIOS

### 🎯 Principios Fundamentales

1. **🔢 SOLO OPCIONES ESTRUCTURADAS**
   - ✅ Usuario SIEMPRE elige números (1, 2, 3...)
   - ❌ NUNCA texto libre (excepto datos específicos: nombre, email)
   - ✅ Máximo 8 opciones por menú para usabilidad

2. **👋 Reconocimiento Inmediato**
   - Usar "Te reconozco" en lugar de "Bienvenido de nuevo"
   - Tono cálido y personal desde el primer mensaje

3. **⏰ Contexto Temporal Inteligente**
   - Mensajes diferentes según tiempo transcurrido
   - Referencias específicas a interacciones previas

4. **🧠 Memoria de Interacciones**
   - Mencionar carreras/temas consultados anteriormente
   - Recordar preferencias y decisiones previas

5. **🎯 Menús Adaptativos**
   - Opciones contextuales basadas en historial
   - Priorizar intereses demostrados previamente

6. **🚀 Sugerencias Proactivas**
   - Proponer siguiente paso lógico en el journey
   - Identificar momentos de alta intención

7. **📊 Captura Progresiva No Invasiva**
   - Solicitar datos solo cuando aportan valor inmediato
   - Siempre dar opción de rechazar sin consecuencias
   - TODO por opciones numeradas

8. **🚪 Opciones de Escape**
   - Siempre incluir "Otra consulta" o "Volver atrás"
   - Permitir cambio de tema en cualquier momento

9. **🔒 Respeto Total a la Privacidad**
   - Opciones de privacidad igual de válidas que personalización
   - No insistir después de rechazo inicial

### 🔄 Flujo de Decisión para Reconocimiento

```
Usuario regresa → 
  ¿Tiene nombre? →
    SÍ → ¿Tiene historial de interés? →
      SÍ → ¿Ya pidió asesor? →
        SÍ → Flujo 4 (Seguimiento Asesor)
        NO → ¿Es usuario VIP? →
          SÍ → Flujo 5 (VIP)
          NO → Flujo 3 (Con Historial)
      NO → Flujo 2 (Solo Nombre)
    NO → Flujo 1 (Solo Teléfono)
```

### 📈 Métricas de Éxito por Flujo

| Flujo | Métrica Principal | Target |
|-------|------------------|--------|
| Flujo 1 | Captura de nombre | 60% |
| Flujo 2 | Engagement con menú | 80% |
| Flujo 3 | Continuidad de interés | 70% |
| Flujo 4 | Resolución de solicitud | 90% |
| Flujo 5 | Conversión a asesor | 85% |

### 🎭 Personalidad del Bot por Contexto

- **Primera vez (Flujo 1)**: Amigable pero respetuoso
- **Con nombre (Flujo 2)**: Más cercano y personal
- **Con historial (Flujo 3)**: Conocedor y útil
- **Seguimiento (Flujo 4)**: Responsable y proactivo
- **VIP (Flujo 5)**: Exclusivo y prioritario

---

## 📝 NOTAS PARA IMPLEMENTACIÓN

### Campos de Base de Datos Necesarios

```sql
-- prospecto_actual
last_interaction_date TIMESTAMP
interaction_count INTEGER
vip_status BOOLEAN
advisor_request_status VARCHAR(50)
engagement_score INTEGER

-- prospecto_historial
interaction_type VARCHAR(50)
career_interest VARCHAR(100)
flow_completed BOOLEAN
```

### Estados de Usuario

- `new_phone`: Solo teléfono confirmado
- `has_name`: Nombre + teléfono
- `has_history`: Historial de consultas
- `advisor_requested`: Solicitó asesor
- `vip_user`: Alta actividad + datos completos

### Configuración de Timeouts por Flujo

- **Flujo 1**: 30 segundos (está decidiendo si dar nombre)
- **Flujo 2-3**: 60 segundos (navegando opciones)
- **Flujo 4**: 45 segundos (puede estar verificando email/teléfono)
- **Flujo 5**: 90 segundos (decisiones más complejas)

---

## ✅ CHECKLIST DE REVISIÓN

- [ ] ¿Los mensajes suenan naturales y no robóticos?
- [ ] ¿Cada flujo tiene un propósito claro?
- [ ] ¿Se respeta la privacidad del usuario en todo momento?
- [ ] ¿Hay opciones de escape en cada menú?
- [ ] ¿Los beneficios de compartir datos son claros?
- [ ] ¿La captura progresiva se siente natural?
- [ ] ¿Los diferentes tipos de usuario tienen experiencias diferenciadas?
- [ ] ¿El tono es consistente con la marca UNIACC?

---

## 💬 DISCUSIÓN Y FEEDBACK

> **Para revisar y discutir:**
> 
> 1. ¿Qué flujos se sienten más naturales?
> 2. ¿Algún mensaje específico suena forzado?
> 3. ¿Falta algún escenario importante?
> 4. ¿La captura progresiva es demasiado agresiva o muy suave?
> 5. ¿Los tiempos de timeout son apropiados?
> 6. ¿Qué ajustes harías para UNIACC específicamente?

---

*Documento creado para análisis y refinamiento antes de implementación*
