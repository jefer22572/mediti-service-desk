/* MediTI Service Desk – catálogos, matriz de prioridad, SLA y datos de demostración */
// ===== Catálogos y generador de datos de demostración =====
const PRIO = { P1: { resp: 15, res: 240, label: 'Crítica' }, P2: { resp: 30, res: 480, label: 'Alta' }, P3: { resp: 120, res: 1440, label: 'Media' }, P4: { resp: 240, res: 4320, label: 'Baja' } };
const MATRIZ = [['P1', 'P2', 'P3'], ['P2', 'P3', 'P4'], ['P3', 'P4', 'P4']]; // [impacto-1][urgencia-1]
const prioridadDe = (imp, urg, clinico) => clinico ? 'P1' : MATRIZ[imp - 1][urg - 1];
const SEDES = ['Lima – Hospital Central', 'Lima – Clínica San Isidro', 'Huancayo – Clínica VidaSalud', 'Arequipa – Clínica VidaSalud', 'Trujillo – Clínica VidaSalud', 'Cusco – Clínica VidaSalud', 'Piura – Clínica VidaSalud'];
const AREAS = ['Emergencia', 'UCI', 'Sala de Operaciones', 'Farmacia', 'Admisión', 'Hospitalización', 'Laboratorio', 'Consulta externa', 'Administración'];
const CANALES = ['Teléfono', 'Portal web', 'Correo', 'WhatsApp', 'Monitoreo (Zabbix)'];
const CATEGORIAS = ['Aplicaciones clínicas', 'Base de datos', 'Red y comunicaciones', 'Infraestructura', 'Colaboración (M365)', 'Puesto de trabajo', 'Seguridad'];
const GRUPOS_N2 = ['TI-Aplicaciones', 'TI-Base de datos', 'TI-Redes', 'TI-Infraestructura', 'TI-Sistemas M365', 'TI-Soporte de campo', 'TI-Seguridad'];
const PROVEEDORES = ['Operador de enlaces de datos', 'Partner Oracle', 'Partner Microsoft 365', 'Dell ProSupport', 'HP Care Pack', 'Proveedor de desarrollo'];
const GRUPO_POR_CAT = { 'Aplicaciones clínicas': 'TI-Aplicaciones', 'Base de datos': 'TI-Base de datos', 'Red y comunicaciones': 'TI-Redes', 'Infraestructura': 'TI-Infraestructura', 'Colaboración (M365)': 'TI-Sistemas M365', 'Puesto de trabajo': 'TI-Soporte de campo', 'Seguridad': 'TI-Seguridad' };
const ROLES = ['Médico de guardia', 'Enfermera jefe', 'Técnico de farmacia', 'Asistente de admisión', 'Jefe de laboratorio', 'Analista administrativo', 'Tecnólogo médico', 'Coordinadora de hospitalización'];

const PLANTILLAS = [
  { t: 'HIS no carga historias clínicas (ORA-00257)', c: 'Base de datos', ci: 'SRV-ORA-PRD01 / HISPRD', i: 1, u: 1, cl: true, p: 'Partner Oracle', sol: 'FRA llena por archivelogs. Respaldo RMAN de archivelogs, depuración y ampliación temporal de DB_RECOVERY_FILE_DEST_SIZE.' },
  { t: 'Sede sin enlace de datos principal', c: 'Red y comunicaciones', ci: 'ENL-WAN-SEDE', i: 1, u: 1, cl: true, p: 'Operador de enlaces de datos', sol: 'Corte de fibra del operador. Conmutación a enlace de respaldo 4G/LTE y reparación del tramo por el NOC.' },
  { t: 'Lentitud en módulo de Farmacia del HIS', c: 'Aplicaciones clínicas', ci: 'APP-HIS-FARMACIA', i: 2, u: 1, p: 'Partner Oracle', sol: 'Consulta sin índice tras actualización. Se creó índice y se recolectaron estadísticas.' },
  { t: 'Error al guardar receta en sistema interno', c: 'Aplicaciones clínicas', ci: 'APP-RECETAS', i: 2, u: 1, p: 'Proveedor de desarrollo', sol: 'Defecto introducido en la versión 3.4.1. Reversa a la versión 3.4.0 y hotfix programado.' },
  { t: 'Teams no conecta en teleconsulta', c: 'Colaboración (M365)', ci: 'M365-TEAMS', i: 2, u: 1, p: 'Partner Microsoft 365', sol: 'Incidente global de Microsoft (Service Health). Se usó teleconsulta por enlace alterno hasta el restablecimiento.' },
  { t: 'Servidor PACS con disco degradado', c: 'Infraestructura', ci: 'SRV-PACS-01 (Dell R740)', i: 1, u: 2, p: 'Dell ProSupport', sol: 'Reemplazo de disco en caliente por Dell ProSupport y reconstrucción del RAID 6.' },
  { t: 'Alerta Zabbix: CPU al 95 % en SRV-APP-02', c: 'Infraestructura', ci: 'SRV-APP-02 (HP DL380)', i: 2, u: 2, p: 'HP Care Pack', sol: 'Proceso de reportes en bucle. Se reinició el servicio y se programó el reporte fuera de horario.' },
  { t: 'Impresora de pulseras de Admisión no imprime', c: 'Puesto de trabajo', ci: 'IMP-ZEBRA-ADM', i: 2, u: 2, sol: 'Cabezal sucio y driver desactualizado. Limpieza y reinstalación del driver con el artículo KB-0045.' },
  { t: 'Wi-Fi intermitente en Hospitalización', c: 'Red y comunicaciones', ci: 'AP-HOSP-P3', i: 2, u: 2, sol: 'Access point con firmware antiguo. Actualización y reinicio controlado.' },
  { t: 'Correo sospechoso de phishing reportado', c: 'Seguridad', ci: 'M365-EXCHANGE', i: 2, u: 2, sol: 'Correo bloqueado y eliminado de todos los buzones. Usuario sin clics. Se reforzó la regla antiphishing.' },
  { t: 'Cuenta de usuario bloqueada en HIS', c: 'Seguridad', ci: 'AD-USUARIOS', i: 3, u: 1, sol: 'Desbloqueo de cuenta tras validar identidad con el procedimiento KB-0012.' },
  { t: 'Outlook no sincroniza el correo', c: 'Colaboración (M365)', ci: 'M365-EXCHANGE', i: 3, u: 2, sol: 'Perfil de Outlook dañado. Se recreó el perfil.' },
  { t: 'Restablecer contraseña de sistema administrativo', c: 'Seguridad', ci: 'APP-ERP', i: 3, u: 2, sol: 'Contraseña restablecida desde el portal de autoservicio con guía del analista.' },
  { t: 'Solicitud de instalación de visor DICOM', c: 'Puesto de trabajo', ci: 'PC-CONSULTA', i: 3, u: 3, sol: 'Software instalado de forma remota desde el catálogo aprobado.' },
  { t: 'Sin acceso a sitio SharePoint de Calidad', c: 'Colaboración (M365)', ci: 'M365-SHAREPOINT', i: 2, u: 3, sol: 'Permisos asignados al grupo correcto previa aprobación del jefe de área.' },
  { t: 'Lector de código de barras de Laboratorio no responde', c: 'Puesto de trabajo', ci: 'LECT-LAB-02', i: 3, u: 1, sol: 'Cable USB dañado. Reemplazo por soporte de campo.' },
];


// ===== Catálogo de incidentes para el registro por clics =====
// i = impacto sugerido, u = urgencia sugerida, cl = regla clínica (P1)
const CATALOGO = {
  'Aplicaciones clínicas': {
    ci: ['APP-HIS (Historia clínica)', 'APP-HIS-FARMACIA', 'APP-HIS-ADMISION', 'APP-RECETAS', 'APP-LABORATORIO (LIS)', 'APP-CITAS'],
    inc: [
      { t: 'HIS no carga historias clínicas', i: 1, u: 1, cl: true, d: 'El sistema de historia clínica no abre ni permite consultar pacientes.' },
      { t: 'HIS no permite registrar atenciones', i: 1, u: 1, cl: true, d: 'Al guardar la atención el sistema muestra error y no registra.' },
      { t: 'Lentitud en módulo de Farmacia del HIS', i: 2, u: 1, d: 'El módulo de Farmacia tarda más de un minuto en responder.' },
      { t: 'Error al guardar receta en sistema interno', i: 2, u: 1, d: 'El sistema de recetas muestra error al guardar la prescripción.' },
      { t: 'Sistema de laboratorio no envía resultados', i: 2, u: 1, d: 'Los resultados de laboratorio no llegan a la historia clínica.' },
      { t: 'Error al programar citas', i: 3, u: 2, d: 'El módulo de citas no muestra horarios disponibles.' },
    ]
  },
  'Base de datos': {
    ci: ['SRV-ORA-PRD01 / HISPRD', 'SRV-ORA-PRD02 / LISPRD', 'SRV-ORA-STB01 (réplica Data Guard)'],
    inc: [
      { t: 'Base de datos Oracle no acepta conexiones', i: 1, u: 1, cl: true, d: 'Las aplicaciones muestran error de conexión a la base de datos.' },
      { t: 'Error ORA-00257 (archivado detenido)', i: 1, u: 1, cl: true, d: 'La base de datos se detuvo por falta de espacio en el área de archivado.' },
      { t: 'Bloqueos en tablas del HIS', i: 2, u: 1, d: 'Sesiones bloqueadas que ralentizan el sistema.' },
      { t: 'Tablespace cerca del límite', i: 1, u: 2, d: 'El monitoreo indica que el tablespace supera el 90 %.' },
      { t: 'Falla del respaldo RMAN nocturno', i: 2, u: 2, d: 'El job de respaldo nocturno terminó con error.' },
    ]
  },
  'Red y comunicaciones': {
    ci: ['ENL-WAN-SEDE (enlace principal)', 'ENL-4G-RESPALDO', 'SW-CORE-01', 'AP-WIFI-HOSPITALIZACION', 'FW-PERIMETRAL'],
    inc: [
      { t: 'Sede sin enlace de datos', i: 1, u: 1, cl: true, d: 'La sede perdió conexión con los sistemas centrales.' },
      { t: 'Lentitud general de la red', i: 2, u: 2, d: 'Todos los sistemas responden lento en la sede.' },
      { t: 'Wi-Fi intermitente', i: 2, u: 2, d: 'La red inalámbrica se desconecta constantemente.' },
      { t: 'Switch de piso sin servicio', i: 2, u: 1, d: 'Un piso completo quedó sin red cableada.' },
      { t: 'Sin acceso a internet', i: 2, u: 2, d: 'Los equipos tienen red interna pero no internet.' },
    ]
  },
  'Infraestructura': {
    ci: ['SRV-APP-01 (Dell R750)', 'SRV-APP-02 (HP DL380)', 'SRV-PACS-01 (Dell R740)', 'CLUSTER-VMWARE', 'STORAGE-SAN-01', 'UPS-DATACENTER'],
    inc: [
      { t: 'Servidor de aplicaciones caído', i: 1, u: 1, cl: true, d: 'El servidor no responde y las aplicaciones están fuera de servicio.' },
      { t: 'Disco degradado en servidor', i: 1, u: 2, d: 'El RAID reporta un disco con falla.' },
      { t: 'CPU o memoria al límite', i: 2, u: 2, d: 'El monitoreo reporta uso de CPU o memoria mayor al 95 %.' },
      { t: 'Fuente de poder con falla', i: 2, u: 2, d: 'Una de las fuentes redundantes del servidor está en falla.' },
      { t: 'Almacenamiento casi lleno', i: 2, u: 2, d: 'El almacenamiento supera el 90 % de ocupación.' },
    ]
  },
  'Colaboración (M365)': {
    ci: ['M365-EXCHANGE (correo)', 'M365-TEAMS', 'M365-SHAREPOINT', 'M365-ONEDRIVE'],
    inc: [
      { t: 'Correo caído en la sede', i: 2, u: 1, d: 'Ningún usuario de la sede puede enviar ni recibir correos.' },
      { t: 'Teams no conecta en teleconsulta', i: 2, u: 1, d: 'Las teleconsultas no pueden iniciarse por Teams.' },
      { t: 'Outlook no sincroniza', i: 3, u: 2, d: 'El correo no se actualiza en Outlook.' },
      { t: 'Sin acceso a SharePoint', i: 2, u: 3, d: 'El usuario no puede abrir un sitio de SharePoint.' },
      { t: 'OneDrive no sincroniza archivos', i: 3, u: 3, d: 'Los archivos no se sincronizan con la nube.' },
    ]
  },
  'Puesto de trabajo': {
    ci: ['PC-CONSULTORIO', 'PC-ADMISION', 'IMP-ZEBRA-PULSERAS', 'IMP-LASER-ADM', 'LECTOR-CODIGO-BARRAS', 'MONITOR'],
    inc: [
      { t: 'Computadora no enciende', i: 3, u: 1, d: 'El equipo no enciende o se reinicia solo.' },
      { t: 'Impresora de pulseras no imprime', i: 2, u: 1, d: 'No se pueden imprimir pulseras de identificación de pacientes.' },
      { t: 'Impresora no imprime', i: 3, u: 2, d: 'Los documentos quedan en cola y no se imprimen.' },
      { t: 'Lector de código de barras no responde', i: 3, u: 1, d: 'El lector no registra los códigos.' },
      { t: 'Solicitud de instalación de software', i: 3, u: 3, d: 'Se requiere instalar un programa del catálogo aprobado.' },
    ]
  },
  'Seguridad': {
    ci: ['AD-USUARIOS', 'M365-EXCHANGE (correo)', 'EDR-ANTIVIRUS', 'FW-PERIMETRAL', 'VPN-ACCESO-REMOTO'],
    inc: [
      { t: 'Sospecha de ransomware', i: 1, u: 1, cl: true, d: 'Archivos cifrados o mensaje de rescate en pantalla.' },
      { t: 'Cuenta de usuario bloqueada', i: 3, u: 1, d: 'El usuario no puede ingresar por bloqueo de cuenta.' },
      { t: 'Correo sospechoso de phishing', i: 2, u: 2, d: 'Se recibió un correo sospechoso que solicita credenciales.' },
      { t: 'Alerta de malware del antivirus', i: 2, u: 1, d: 'El antivirus detectó una amenaza en el equipo.' },
      { t: 'Restablecer contraseña', i: 3, u: 2, d: 'El usuario olvidó su contraseña.' },
      { t: 'VPN no conecta', i: 3, u: 2, d: 'El acceso remoto por VPN falla al conectar.' },
    ]
  },
};
const SINTOMAS = ['Afecta a un solo usuario', 'Afecta a todo el área', 'Afecta a toda la sede', 'Afecta a varias sedes', 'Ocurre de forma intermitente', 'Muestra un mensaje de error'];
const DESDE = ['Hace menos de 15 minutos', 'Hace aproximadamente 1 hora', 'Desde el inicio del turno', 'Desde ayer'];
const SOLUCIONES = ['Reinicio del servicio o aplicación', 'Reinicio del equipo del usuario', 'Restablecimiento de credenciales', 'Reconfiguración del equipo o perfil', 'Reemplazo de hardware', 'Conmutación a enlace o servidor de respaldo', 'Liberación de espacio y depuración', 'Reversa (rollback) de cambio reciente', 'Aplicación de artículo de la base de conocimiento', 'Solución aplicada por el proveedor'];
const NOTAS = ['Se contactó al usuario para validar la falla', 'Se aplicó el artículo de la base de conocimiento', 'Se coordinó por puente de crisis con N2 y N3', 'En espera de respuesta del proveedor', 'Se activó la contingencia clínica en la sede', 'Se informó el avance a la dirección médica', 'Se programó visita de soporte de campo', 'El usuario confirma que la falla persiste'];

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function genDemo(now) {
  const r = mulberry(626);
  const pick = a => a[Math.floor(r() * a.length)];
  const MIN = 60000;
  const out = [];
  let n = 4790;
  const N = 34;
  for (let k = 0; k < N; k++) {
    const pl = k === N - 1 ? PLANTILLAS[0] : pick(PLANTILLAS);
    const abierto = k >= N - 7;
    const created = abierto ? now - Math.floor(r() * 300 + 8) * MIN : now - Math.floor((r() * 13.5 + 0.6) * 24 * 60) * MIN;
    const prio = prioridadDe(pl.i, pl.u, pl.cl && r() > 0.3);
    const S = PRIO[prio];
    const sede = (k === N - 1) ? 'Huancayo – Clínica VidaSalud' : pick(SEDES);
    const area = pl.cl ? pick(['Emergencia', 'UCI', 'Farmacia', 'Admisión']) : pick(AREAS);
    const zabbix = pl.c === 'Infraestructura' || (pl.c === 'Red y comunicaciones' && r() > 0.5) || (pl.c === 'Base de datos' && r() > 0.4);
    const t = {
      id: 'INC-2026-00' + (++n), n, titulo: pl.t, descripcion: 'Reportado desde ' + area + '. ' + (pl.cl ? 'Afecta la atención de pacientes.' : 'Sin impacto clínico directo.'),
      solicitante: zabbix ? 'Monitoreo automático' : pick(ROLES), sede, area, canal: zabbix ? 'Monitoreo (Zabbix)' : pick(['Teléfono', 'Teléfono', 'Portal web', 'Correo', 'WhatsApp']),
      categoria: pl.c, ci: pl.ci, impacto: pl.i, urgencia: pl.u, clinico: !!pl.cl, prioridad: prio, nivel: 'N1', grupo: '', proveedor: '',
      estado: 'Nuevo', creado: created, asignado: null, resuelto: null, cerrado: null, csat: null, reabierto: 0, fcr: false, mayor: false, demo: true, solucion: '', log: []
    };
    const L = (dt, nivel, autor, texto) => t.log.push({ t: created + dt * MIN, nivel, autor, texto });
    L(0, 'N1', 'Service Desk MediTI', 'Ticket registrado vía ' + t.canal + '. Prioridad ' + prio + ' (impacto ' + pl.i + ', urgencia ' + pl.u + ').');
    const late = r() < 0.12;
    const respMin = Math.max(1, Math.round(late ? S.resp * (1.1 + r()) : S.resp * (0.15 + r() * 0.7)));
    // Decidir nivel de resolución
    let nivelFinal = 'N1';
    const x = r();
    if (prio === 'P1') nivelFinal = 'N3'; else if (prio === 'P2') nivelFinal = x < 0.5 ? 'N2' : 'N3'; else nivelFinal = x < 0.68 ? 'N1' : (x < 0.92 || !pl.p ? 'N2' : 'N3');
    if (abierto) {
      const elapsed = (now - created) / MIN;
      if (elapsed < respMin) { out.push(t); continue; }
      t.asignado = created + respMin * MIN; t.estado = 'En curso';
      L(respMin, 'N1', 'Analista N1', 'Ticket asignado y en diagnóstico. Se revisa la base de conocimiento.');
      if (nivelFinal !== 'N1' && elapsed > respMin + 10) {
        t.nivel = 'N2'; t.grupo = GRUPO_POR_CAT[pl.c]; t.estado = 'Escalado';
        L(respMin + 8, 'N2', 'Analista N1', 'Escalado a ' + t.grupo + ': no resoluble con la base de conocimiento.');
        if (nivelFinal === 'N3' && pl.p && elapsed > respMin + 40) {
          t.nivel = 'N3'; t.proveedor = pl.p;
          L(respMin + 35, 'N3', t.grupo, 'Escalado al proveedor ' + pl.p + ' según contrato de soporte.');
        }
      }
      if (prio === 'P1') { t.mayor = true; L(respMin + 2, 'N1', 'Gestor de Incidentes Mayores', 'Incidente Mayor declarado. Puente de crisis abierto y contingencia clínica activada.'); }
      out.push(t); continue;
    }
    // Cerrados
    t.asignado = created + respMin * MIN;
    L(respMin, 'N1', 'Analista N1', 'Ticket asignado y en diagnóstico.');
    const lateRes = r() < (prio === 'P1' ? 0.08 : 0.14);
    const resMin = Math.round(lateRes ? S.res * (1.05 + r() * 0.6) : S.res * (nivelFinal === 'N1' ? 0.05 + r() * 0.2 : 0.2 + r() * 0.65));
    if (prio === 'P1') { t.mayor = true; L(respMin + 3, 'N1', 'Gestor de Incidentes Mayores', 'Incidente Mayor declarado. Notificación a N2 on-call, Jefe TI y dirección médica.'); }
    if (nivelFinal !== 'N1') {
      t.grupo = GRUPO_POR_CAT[pl.c]; t.nivel = 'N2';
      L(respMin + 6, 'N2', 'Analista N1', 'Escalado a ' + t.grupo + '.');
      if (nivelFinal === 'N3' && pl.p) { t.nivel = 'N3'; t.proveedor = pl.p; L(Math.round(resMin * 0.35), 'N3', t.grupo, 'Escalado al proveedor ' + pl.p + '.'); }
    } else t.fcr = r() < 0.85;
    t.solucion = pl.sol;
    t.resuelto = created + resMin * MIN;
    L(resMin, t.nivel, t.nivel === 'N3' ? t.proveedor : (t.nivel === 'N2' ? t.grupo : 'Analista N1'), 'Resuelto: ' + pl.sol);
    if (r() < 0.06) { t.reabierto = 1; L(resMin + 30, 'N1', 'Service Desk MediTI', 'Usuario indica que la falla persiste. Ticket reabierto.'); L(resMin + 70, t.nivel, 'Analista', 'Solución verificada nuevamente con el usuario.'); }
    t.cerrado = t.resuelto + Math.round(30 + r() * 600) * MIN;
    t.csat = lateRes ? (r() < 0.5 ? 3 : 4) : (r() < 0.75 ? 5 : 4);
    if (r() < 0.05) t.csat = 2;
    t.estado = 'Cerrado';
    L((t.cerrado - created) / MIN, 'N1', 'Service Desk MediTI', 'Usuario confirmó la solución. Encuesta: ' + t.csat + '/5. Ticket cerrado.');
    out.push(t);
  }
  return out;
}
