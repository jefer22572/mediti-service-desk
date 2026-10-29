# MediTI Service Desk

Sistema web de **gestión de incidentes (Service Desk)** basado en **ITIL 4**, desarrollado para el caso práctico *MediTI – Grupo Hospitalario VidaSalud* del curso **PCBD-626 Gestión de Servicios y Gobernabilidad de TI** (SENATI, CFP Huancayo).

MediTI atiende el Nivel 1 del soporte TI 24/7 para hospitales y clínicas en Lima y provincias. El sistema registra, prioriza, escala y da seguimiento a los incidentes, y mide la efectividad del servicio con un dashboard de KPIs en tiempo real.

![Dashboard](docs/img/02-dashboard.png)

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Inicio de sesión** | Acceso con usuario y contraseña. Las credenciales se validan con hash SHA-256 (no en texto plano), la sesión expira tras 30 min de inactividad y se bloquea el acceso 60 s después de 5 intentos fallidos. |
| **Dashboard** | 8 KPIs calculados en vivo con semáforo frente a su meta: tickets abiertos, P1 activos, cumplimiento de SLA de respuesta y resolución, MTTA y MTTR de P1, resolución en primer contacto (FCR) y satisfacción (CSAT). Gráficos de tickets por día y prioridad, MTTR frente a la meta, nivel de resolución y categorías. |
| **Registro de incidentes** | Se completa **solo con clics** (listas desplegables): solicitante, sede, área, categoría, incidente del catálogo, CI, alcance y tiempo. La descripción se genera sola. La prioridad se calcula automáticamente con la matriz **impacto × urgencia**. La regla clínica convierte en **P1** todo incidente que detenga la atención de pacientes (Emergencia, UCI, Sala de Operaciones, Farmacia). |
| **Cola de tickets** | Búsqueda y filtros por estado, prioridad, nivel y sede. Barra de SLA que cambia de verde a ámbar y rojo según el tiempo consumido. |
| **Detalle del ticket** | Ciclo de vida completo: asignar, en curso, en espera, escalar a **N2** (TI VidaSalud) o **N3** (proveedores), declarar **incidente mayor**, resolver, cerrar con encuesta o reabrir. Historial con fecha, hora, nivel y usuario. |
| **Soporte 24/7** | Detecta el horario: fuera de oficina el Nivel 2 se atiende por **guardia on-call**. Avisa cuando un ticket supera el tiempo máximo en Nivel 1. |
| **Monitoreo** | Botón que simula una alerta de **Zabbix** y crea el ticket automáticamente. |
| **Matriz y escalamiento** | Referencia de la matriz de prioridad, SLA y los tres niveles de soporte. |

## Acceso

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin` | Administrador del Service Desk |

> Credenciales de demostración para fines académicos. En un entorno real se reemplazarían por autenticación del lado del servidor (Active Directory / Entra ID con MFA).

## Acuerdos de nivel de servicio (SLA)

| Prioridad | Respuesta | Resolución | Escalar N1 → N2 |
|---|---|---|---|
| P1 – Crítica | 15 min | 4 h | Inmediato |
| P2 – Alta | 30 min | 8 h | 15 min |
| P3 – Media | 2 h | 24 h | 30 min |
| P4 – Baja | 4 h | 72 h | 1 h |

## Esquema de escalamiento

```mermaid
flowchart LR
  U[Usuarios VidaSalud] --> N1[N1 · Service Desk MediTI 24/7]
  N1 -->|No resuelto / por tiempo| N2[N2 · TI VidaSalud<br/>oficina + guardia on-call]
  N2 -->|Especialista o fabricante| N3[N3 · Proveedores<br/>Enlaces · Oracle · Microsoft · Dell/HP · Desarrollo]
  N3 --> N2 --> N1 --> C[Cierre + encuesta CSAT]
```

## Ejecución local

No requiere instalación ni servidor: es HTML, CSS y JavaScript puro.

1. Descargue o clone el repositorio:
   ```bash
   git clone https://github.com/<su-usuario>/mediti-service-desk.git
   ```
2. Abra `index.html` en el navegador (doble clic), o levante un servidor local:
   ```bash
   python -m http.server 8000
   ```
   y visite `http://localhost:8000`.
3. Ingrese con `admin / admin` y pulse **Cargar datos de demostración** para ver el dashboard con 34 tickets de ejemplo.

Los tickets se guardan en el `localStorage` del navegador.

## Publicar con GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En *Source* elija **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. Guarde. En uno o dos minutos el sistema estará en `https://<su-usuario>.github.io/mediti-service-desk/`.

## Estructura

```
mediti-service-desk/
├── index.html          Interfaz: login, dashboard, tickets, registro y matriz
├── css/styles.css      Estilos (tema claro y oscuro, adaptable a móvil)
├── js/catalogos.js     Matriz de prioridad, SLA, catálogos y datos de demostración
├── js/app.js           Lógica: tickets, escalamiento, KPIs, gráficos y autenticación
└── docs/img/           Capturas de pantalla
```

## Capturas

| Inicio de sesión | Cola de tickets |
|---|---|
| ![Login](docs/img/01-login.png) | ![Tickets](docs/img/03-tickets.png) |
| **Detalle y escalamiento** | **Registro con prioridad automática** |
| ![Detalle](docs/img/04-detalle.png) | ![Registro](docs/img/05-registro.png) |

## Tecnologías y marco de referencia

- HTML5, CSS3 y JavaScript (sin frameworks ni dependencias).
- Gráficos SVG generados por código.
- Web Crypto API (SHA-256) para la validación de credenciales.
- Prácticas ITIL 4: Service Desk, Gestión de Incidentes, Gestión de Niveles de Servicio, Gestión de Proveedores, Monitoreo y Gestión de Eventos.

## Autor

**Jeferson Mantari Huaman** – Ingeniería de Ciberseguridad, SENATI CFP Huancayo
Curso PCBD-626 · Instructor: Jhon Zapata Torres · 2026

## Licencia

Distribuido bajo licencia MIT. Ver [LICENSE](LICENSE).
