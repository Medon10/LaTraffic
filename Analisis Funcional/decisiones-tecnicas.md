# Decisiones Técnicas

Este documento registra decisiones técnicas o de diseño que no encajan directamente en otros documentos de análisis funcional (como el DER, Arquitectura o Historias de Usuario).

## 2026-09-16: Generación de fechas por defecto en MikroORM
**Contexto**: Al insertar nuevas entidades (Usuario, Pasaje, CuponUso) que tienen campos de fecha por defecto (`fechaRegistro`, `fechaReserva`, `fechaUso`), MikroORM y el driver de PostgreSQL daban error si no se enviaba el valor explícitamente desde el código, a pesar de tener configurado `.default('now()')`. El ORM no estaba resolviendo correctamente la inyección de la función SQL nativa en el statement de inserción.

**Decisión**: 
Se cambió la estrategia de definición de estos campos en los schemas de MikroORM. En lugar de usar solo `.default('now()')`, se implementó `.onCreate(() => new Date()).defaultRaw('now()')`. 
Esto asegura que:
1. A nivel de aplicación, MikroORM inyecta la fecha actual automáticamente mediante JavaScript/TypeScript justo antes de insertar el registro en la base de datos (gracias a `onCreate`).
2. A nivel de esquema de base de datos, la columna sigue teniendo el constraint `DEFAULT now()` (gracias a `defaultRaw`), manteniendo la consistencia si se insertaran datos por fuera de la aplicación.
3. Se solucionan los errores de inserción sin tener que mandar manualmente `new Date()` desde todos los servicios. En el caso del registro de usuario, se debió enviar explícitamente `fechaRegistro: new Date()` en el auth service para mantener coherencia en este flujo específico.
