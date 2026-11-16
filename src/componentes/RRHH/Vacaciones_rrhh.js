
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; // 🚀 Agrega esta importación
import { API_BASE_URL } from '../../config';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';


// src/componentes/RRHH/Horas_rendimiento.js
import { exportarPDF, exportarExcel,exportarPDFbono } from './Reportes';

const Vacaciones = () => {
     const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("userData");
        const parsed = savedUser ? JSON.parse(savedUser) : { id: null, nombre: 'Usuario', idperfil: null, departamento: '', id_empresa: '' };
      return {
            ...parsed,
            // Convertimos "5,12" en ["5", "12"] y "VENTAS,RRHH" en ["VENTAS", "RRHH"]
            empresasAutorizadas: parsed.id_empresa ? String(parsed.id_empresa).split(',').map(s => s.trim()) : [],
            deptosAutorizados: parsed.departamento ? String(parsed.departamento).split(',').map(s => s.trim()) : []
        };
    });
    
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(false);

// Estados para el nuevo Modal de Solicitudes de Permiso
const [showModalPermisos, setShowModalPermisos] = useState(false);
const [loadingModalPermisos, setLoadingModalPermisos] = useState(false);
const [solicitudesPermisos, setSolicitudesPermisos] = useState([]);
const [empleadoPermisoSeleccionado, setEmpleadoPermisoSeleccionado] = useState(null);
const [observacionesRechazo, setObservacionesRechazo] = useState({});


const [modalPdfOpen, setModalPdfOpen] = useState(false);
const [pdfUrlSeleccionado, setPdfUrlSeleccionado] = useState('');
// Agrega estos estados junto a tus otros useState locales de la pantalla
const [showModalTS, setShowModalTS] = useState(false);
const [solicitudesTS, setSolicitudesTS] = useState([]);



// Función para cargar los permisos de un empleado específico de la API
const cargarSolicitudesPermisos = async (idEmpleado) => {
  try {
    // Apunta de forma exacta al endpoint que provees en tu backend pasándole el ID correcto
    const url = `/api/RRHH/Solicitudes_permiso?EmpleadoID=${idEmpleado}`;
    const res = await fetchWithFallback(url);
    const data = res || [];
    setSolicitudesPermisos(data);
  } catch (error) {
    console.error("❌ Error cargando solicitudes de permiso:", error);
    setSolicitudesPermisos([]);
    toast.error("No se pudieron obtener los permisos del empleado.");
  }
};


const handleEstadoTSChange = async (idSolicitud, nuevoEstadoId, observacion = null) => {
  try {
    const estadoNumerico = parseInt(nuevoEstadoId, 10);
    const key = `ts-${idSolicitud}`;
    const textoRechazo = observacion !== null ? observacion : (observacionesRechazo[key] || '');

    if (estadoNumerico === 3 && !textoRechazo.trim()) {
      setSolicitudesTS((prev) =>
        prev.map((p) => (p.SolicitudID === idSolicitud ? { ...p, EstadoID: 3 } : p))
      );
      toast.info("Ingresa el motivo del rechazo y presiona Guardar.");
      return;
    }

    await fetchWithFallback('/api/RRHH/actualizar_estado_permiso', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SolicitudID: idSolicitud,
        EstadoID: estadoNumerico,
        observacion_rechazo: estadoNumerico === 3 ? textoRechazo.trim() : null,
      }),
    });

    setSolicitudesTS((prev) =>
      prev.map((p) =>
        p.SolicitudID === idSolicitud
          ? { ...p, EstadoID: estadoNumerico, observacion_rechazo: estadoNumerico === 3 ? textoRechazo.trim() : null }
          : p
      )
    );

    toast.success("Estado del caso TS actualizado correctamente.");
    await fetchDatos();
  } catch (error) {
    console.error("❌ Error al actualizar el estado en TS:", error);
    toast.error("No se pudo actualizar el estado en el servidor.");
  }
};



// Manejador para abrir el modal desde el click de la nueva burbuja naranja

// ==========================================
// 1. MANEJADOR PARA BURBUJA DE PERMISOS (OP)
// ==========================================
const handleOpenModalPermisos = async (item) => { 
  const idEmpleado = item.idemp; 
  if (!idEmpleado) { 
    alert("No se encontró el ID del empleado (idemp) en este registro."); 
    return; 
  } 
  setEmpleadoPermisoSeleccionado(item); 
  setShowModalPermisos(true); 
  setLoadingModalPermisos(true); 
  // Apunta a tu endpoint ordinario pasándole el EmpleadoID
  await cargarSolicitudesPermisos(idEmpleado); 
  setLoadingModalPermisos(false); 
};

// ==========================================
// 2. NUEVO MANEJADOR PARA BURBUJA DE TS
// ==========================================
// Estados que debes tener declarados: 
// const [showModalTS, setShowModalTS] = useState(false);
// const [solicitudesTS, setSolicitudesTS] = useState([]);
const handleOpenModalTS = async (item) => {
  const idEmpleado = item.idemp;
  if (!idEmpleado) {
    alert("No se encontró el ID del empleado (idemp) en este registro.");
    return;
  }
  setEmpleadoPermisoSeleccionado(item); 
  setShowModalTS(true);
  setLoadingModalPermisos(true); 
  
  try {
    const url = `/api/RRHH/Solicitudes_permiso_TS?EmpleadoID=${idEmpleado}`;
    const res = await fetchWithFallback(url);
    
    // 🚀 Extracción segura: Maneja si la API devuelve un objeto o un array directo
    const dataFinal = res?.data || res || [];
    setSolicitudesTS(dataFinal);
  } catch (error) {
    console.error("❌ Error cargando solicitudes de Trabajo Social:", error);
    setSolicitudesTS([]);
    toast.error("No se pudieron obtener los casos de Trabajo Social.");
  } finally {
    setLoadingModalPermisos(false);
  }
};


// Asegúrate de limpiar los estados al cerrar
const handleCloseModalTS = () => {
  setShowModalTS(false);
  setSolicitudesTS([]);
};

// Manejador para cerrar el modal de permisos limpando los estados temporales
const handleCloseModalPermisos = () => {
  setShowModalPermisos(false);
  setEmpleadoPermisoSeleccionado(null);
  setSolicitudesPermisos([]);
  
  // Limpieza de seguridad para el visor de documentos
  setModalPdfOpen(false);
  setPdfUrlSeleccionado('');
};


const [showModal, setShowModal] = useState(false);
const [selectedEmpId, setSelectedEmpId] = useState(null);
const [solicitudesVacaciones, setSolicitudesVacaciones] = useState([]);
const [loadingModal, setLoadingModal] = useState(false);

// Función para cargar los datos
const cargarSolicitudes = async (idEmpleado) => {
  try {
    const url = `/api/RRHH/consulta_vacaciones_solicitada?idemp=${idEmpleado}`;
    const res = await fetchWithFallback(url);
    // Si tu fetchWithFallback no procesa el json por dentro, recuerda usar: const data = await res.json();
    const data = res || [];
    setSolicitudesVacaciones(data);
  } catch (error) {
    console.error("❌ Error cargando vacaciones:", error);
    setSolicitudesVacaciones([]);
  }
};

const handleOpenModal = async (item) => {
  const idEmpleado = item.idemp; 
  if (!idEmpleado) {
    alert("No se encontró el ID del empleado (idemp) in este registro.");
    return;
  }
  setSelectedEmpId(idEmpleado);
  setShowModal(true);
  setLoadingModal(true);
  await cargarSolicitudes(idEmpleado);
  setLoadingModal(false);
};

// Nueva función para enviar la edición del estado a la API
const handleEstadoChange = async (idSolicitud, nuevoEstado, observacion = null) => {
  try {
    const key = `vac-${idSolicitud}`;
    const textoRechazo = observacion !== null ? observacion : (observacionesRechazo[key] || '');
    const esRechazo = String(nuevoEstado) === '3' || String(nuevoEstado).toUpperCase() === 'RECHAZADO';

    if (esRechazo && !textoRechazo.trim()) {
      setSolicitudesVacaciones((prev) =>
        prev.map((v) => ((v.id ?? v.SolicitudID) === idSolicitud ? { ...v, estado: nuevoEstado, EstadoID: nuevoEstado } : v))
      );
      toast.info("Ingresa el motivo del rechazo y presiona Guardar.");
      return;
    }

    const url = '/api/RRHH/actualizar_estado_vacacion';
    await fetchWithFallback(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: idSolicitud,
        estado: nuevoEstado,
        observacion_rechazo: esRechazo ? textoRechazo.trim() : null,
      }),
    });

    toast.success("Estado de vacaciones actualizado correctamente.");
    await cargarSolicitudes(selectedEmpId);
    await fetchDatos();
  } catch (error) {
    console.error("❌ Error al actualizar el estado de vacaciones:", error);
    toast.error("No se pudo actualizar el estado en el servidor.");
  }
};


const handleCloseModal = () => {
  setShowModal(false);
  setSelectedEmpId(null);
  setSolicitudesVacaciones([]);
};


    // Estados para el Modal de Detalle de Vacaciones
const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
const [detalleVacaciones, setDetalleVacaciones] = useState([]);


const handleEstadoPermisoChange = async (idSolicitud, nuevoEstadoId, observacion = null) => {
  try {
    const estadoNumerico = parseInt(nuevoEstadoId, 10);
    const key = `perm-${idSolicitud}`;
    const textoRechazo = observacion !== null ? observacion : (observacionesRechazo[key] || '');

    if (estadoNumerico === 3 && !textoRechazo.trim()) {
      setSolicitudesPermisos((prev) =>
        prev.map((p) => (p.SolicitudID === idSolicitud ? { ...p, EstadoID: 3 } : p))
      );
      toast.info("Ingresa el motivo del rechazo y presiona Guardar.");
      return;
    }

    await fetchWithFallback('/api/RRHH/actualizar_estado_permiso', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SolicitudID: idSolicitud,
        EstadoID: estadoNumerico,
        observacion_rechazo: estadoNumerico === 3 ? textoRechazo.trim() : null,
      }),
    });

    setSolicitudesPermisos((prev) =>
      prev.map((p) =>
        p.SolicitudID === idSolicitud
          ? { ...p, EstadoID: estadoNumerico, observacion_rechazo: estadoNumerico === 3 ? textoRechazo.trim() : null }
          : p
      )
    );

    toast.success("Estado del permiso actualizado correctamente.");
    if (empleadoPermisoSeleccionado) {
      await cargarSolicitudesPermisos(empleadoPermisoSeleccionado.idemp);
    }
    await fetchDatos();
  } catch (error) {
    console.error("❌ Error al actualizar el estado del permiso:", error);
    toast.error("No se pudo actualizar el estado en el servidor.");
  }
};




const abrirDetalleEmpleado = async (item) => {
  setEmpleadoSeleccionado(item);
  setModalDetalleAbierto(true);
  setLoadingModal(true);
  setDetalleVacaciones([]);

  try {
    // Llamamos a tu endpoint pasando el año del filtro de pantalla
    const url = `/api/RRHH/dias_dartis_vacaciones_detalle?anio=${anio}`;
    const res = await fetchWithFallback(url);
    const universoDetalle = res?.data || res || [];
    
    // FILTRADO EN FRONTEND: Extraemos solo las filas del empleado cliqueado
    const filtradoEmpleado = universoDetalle.filter(
      d => String(d.idemp) === String(item.idemp)
    );

    setDetalleVacaciones(filtradoEmpleado);
  } catch (error) {
    console.error("Error cargando el desglose de vacaciones:", error);
    toast.error("No se pudo obtener el desglose detallado.");
  } finally {
    setLoadingModal(false);
  }
};

const [anio, setAnio] = useState(new Date().getFullYear());

const [camposGuardados, setCamposGuardados] = useState({}); 

// Estado para controlar la visibilidad de las columnas de Tags
const [mostrarTags, setMostrarTags] = useState(true);

// Agrega esto junto a tus otros useState locales
const [menuReportesAbierto, setMenuReportesAbierto] = useState(false);
// Nuevo estado para controlar si los campos especiales están desbloqueados

// Busca la primera empresa autorizada dentro de tu lista de objetos
const listaEmpresasFija = [
    { id: "5", nombre: "EXPOFLOR CIA. LTDA." },
    { id: "4", nombre: "AMAZINGROSES CIA LTDA" },
    { id: "10", nombre: "CAJA DE AHORROS BELLA FLOR" },
    { id: "3", nombre: "HIDDENGARDEN CIA LTDA" },
    { id: "12", nombre: "OASISFLOWER SAS" },
    { id: "13", nombre: "OASISORGANICS SAS" }
];

// Localiza y reemplaza el estado de empresa en tu código:
const [empresa, setEmpresa] = useState(() => { 
  const autorizada = listaEmpresasFija.find(opt => user.empresasAutorizadas.includes(opt.id)); 
  // Si tiene múltiples empresas o ninguna fija estricta, permitimos iniciar en vacío (Todas)
  return user.empresasAutorizadas.length > 1 ? '' : (autorizada ? autorizada.id : '');
});
    
// Localiza y reemplaza el estado de departamento en tu código:
const [departamento, setDepartamento] = useState(() => { 
  // Si tiene múltiples departamentos autorizados, permitimos iniciar en vacío (Todos)
  return user.deptosAutorizados.length > 1 ? '' : (user.deptosAutorizados[0] || ''); 
});

    const [listaDepartamentos, setListaDepartamentos] = useState([]);
    const [busquedaLocal, setBusquedaLocal] = useState('');   
     const [busquedaLocal1, setBusquedaLocal1] = useState('');  
     const [busquedaLocal2, setBusquedaLocal2] = useState('');

    const [listaEmpleados, setListaEmpleados] = useState([]);
    const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState('');
    const [periodoCierre, setPeriodoCierre] = useState(null);


  const estaBloqueado = (fecha) => {
    return periodoCierre?.some(p => 
        p.estado === 'CERRADO' && 
        fecha >= p.fecha_desde && 
        fecha <= p.fecha_hasta
    );
};


// Resetear tabla cuando cambien los filtros principales 
useEffect(() => {

 setDatos([]); // Limpia la tabla 
}, [empresa, departamento, anio]); // 👈 Ahora también reacciona al cambio de año


 useEffect(() => {
    fetchWithFallback('/api/DARTIS/area_dartis')
        .then(res => {
            // Si res es un objeto de Axios, los datos están en res.data
            // y el código de estado en res.status
            if (res.data) {
                setListaDepartamentos(res.data);
            } else {
                // Si es el fetch nativo pero modificado, intenta manejarlo como objeto
                setListaDepartamentos(res);
            }
        })
        .catch(err => {
            // Aquí capturas si la red falló o el servidor tiró error
            console.error("Error cargando departamentos:", err);
        });
}, []);

const fetchDatos = async () => { 
  setLoading(true); 
  const anioActual = anio; 

  const endpointComedor = `/api/RRHH/informacion_vacaciones?año=${anioActual}&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`; 
  const endpointDiasVacaciones = `/api/RRHH/dias_dartis_vacaciones?anio=${anioActual}`; 
  const endpointConteoPermisos = `/api/RRHH/conteo_solicitudes_permiso`; 
  const endpointConteoTS = `/api/RRHH/conteo_solicitudes_permiso_TS`; // 🚀 Nueva API separada

  try { 
    // 1. Llamamos a las CUATRO promesas en paralelo para mantener el rendimiento al máximo
    const [resComedor, resDias, resPermisos, resTS] = await Promise.all([ 
      fetchWithFallback(endpointComedor), 
      fetchWithFallback(endpointDiasVacaciones), 
      fetchWithFallback(endpointConteoPermisos),
      fetchWithFallback(endpointConteoTS) // <-- Agregamos la cuarta respuesta
    ]); 

    // 2. Extracción segura de la información recibida de cada endpoint
    const datosComedor = resComedor?.data || resComedor || []; 
    const datosDias = resDias?.data || resDias || []; 
    const datosPermisos = resPermisos?.data || resPermisos || []; 
    const datosTS = resTS?.data || resTS || []; // <-- Nueva data de Trabajo Social

    // 3. Cruzamos la información en el mapa de registros
    const datosCruzados = datosComedor.map(registroComedor => { 
      const registroDias = datosDias.find(d => String(d.idemp) === String(registroComedor.idemp)); 
      const diasVacacionesTomadas = registroDias ? registroDias.total_dias : 0; 

      // 🔍 Cruce 1: Permisos Ordinarios (OP)
      const registroPermiso = datosPermisos.find(p => String(p.EmpleadoID) === String(registroComedor.idemp)); 
      const totalPermisosAsignados = registroPermiso ? Number(registroPermiso.total_permisos) : 0; 

      // 🔍 Cruce 2: Casos de Trabajo Social (TS) totalmente independiente
      // Nota: Como en tu consulta SQL de TS aliaste la columna como "total_permisos", lo leemos de ahí
      const registroTS = datosTS.find(t => String(t.EmpleadoID) === String(registroComedor.idemp)); 
      const totalTSAsignados = registroTS ? Number(registroTS.total_permisos) : 0; 

      const empleadoDartis = listaEmpleados.find(e => String(e.codemp) === String(registroComedor.idemp)); 

      return { 
        ...registroComedor, 
        dias_tomados_api: diasVacacionesTomadas, 
        total_permisos: totalPermisosAsignados, 
        total_ts: totalTSAsignados, // Enlazado con total independencia para tu burbuja
        nombres: registroComedor.nombres || empleadoDartis?.nombre || 'Sin Nombre', 
        cedula: registroComedor.cedula || empleadoDartis?.identificacion || '', 
      }; 
    }); 

    setDatos(datosCruzados); 
  } catch (error) { 
    console.error("Error en fetchDatos al cruzar asistencia, vacaciones, permisos y TS:", error); 
    setDatos([]); 
  } finally { 
    setLoading(false); 
  } 
};


const handleUpdate = async (id, campo, valor, debeNotificar = false, registroFresco = null) => { 
  // 1. Localizamos el registro en el estado local de React
  const itemActual = registroFresco || datos.find(d => d.id === id); 
 
  if (!itemActual) { 
    console.warn(`No se encontró el registro con ID ${id} para actualizar el campo ${campo}`); 
    return; 
  } 

  // RESTRICCIÓN: Periodo cerrado (si manejas la función estaBloqueado)
  if (typeof estaBloqueado === 'function' && estaBloqueado(itemActual.fecha_dia)) { 
    if (debeNotificar) toast.warning("Este registro pertenece a un periodo CERRADO y no puede ser modificado."); 
    return; 
  } 
 
  // 2. Sanitizamos el valor: si es numérico lo convertimos, si está vacío guardamos 0
  let valorSanitizado = valor;
  const mesesCampos = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  if (mesesCampos.includes(campo)) {
    if (valor === '' || valor === null || valor === undefined) {
      valorSanitizado = 0; 
    } else {
      valorSanitizado = parseFloat(valor);
      if (isNaN(valorSanitizado)) valorSanitizado = 0;
    }
  }

  // 3. Construimos el cuerpo unificado exclusivamente con los 12 meses
  const bodyActualizado = { 
    enero: campo === 'enero' ? valorSanitizado : (parseFloat(itemActual.enero) || 0),
    febrero: campo === 'febrero' ? valorSanitizado : (parseFloat(itemActual.febrero) || 0),
    marzo: campo === 'marzo' ? valorSanitizado : (parseFloat(itemActual.marzo) || 0),
    abril: campo === 'abril' ? valorSanitizado : (parseFloat(itemActual.abril) || 0),
    mayo: campo === 'mayo' ? valorSanitizado : (parseFloat(itemActual.mayo) || 0),
    junio: campo === 'junio' ? valorSanitizado : (parseFloat(itemActual.junio) || 0),
    julio: campo === 'julio' ? valorSanitizado : (parseFloat(itemActual.julio) || 0),
    agosto: campo === 'agosto' ? valorSanitizado : (parseFloat(itemActual.agosto) || 0),
    septiembre: campo === 'septiembre' ? valorSanitizado : (parseFloat(itemActual.septiembre) || 0),
    octubre: campo === 'octubre' ? valorSanitizado : (parseFloat(itemActual.octubre) || 0),
    noviembre: campo === 'noviembre' ? valorSanitizado : (parseFloat(itemActual.noviembre) || 0),
    diciembre: campo === 'diciembre' ? valorSanitizado : (parseFloat(itemActual.diciembre) || 0)
    // 🧹 Se removió el envío de usuario_modif
  }; 
 
  try { 
    // Apuntamos al endpoint PUT local que solo actualiza meses
    await fetchWithFallback(`/api/RRHH/actualizar_mes_vacaciones/${id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(bodyActualizado) 
    }); 
 
    // Sincronizamos el estado de React localmente de forma inmediata para conservar la fluidez
    setDatos(prev => prev.map(d => (d.id === id ? { ...d, ...bodyActualizado } : d))); 
 
    if (debeNotificar) { 
      const key = `${id}-${campo}`; 
      setCamposGuardados(prev => ({ ...prev, [key]: true })); 
      setTimeout(() => { 
        setCamposGuardados(prev => ({ ...prev, [key]: false })); 
      }, 1000); 
      toast.success("Días de vacaciones actualizados correctamente.");
    } 
  } catch (error) { 
    console.error("Error en handleUpdate:", error); 
    toast.error("Error al guardar el cambio en la celda.");
  } 
};

const handleCopiarTodo = async () => { 
  try { 
    setLoading(true); 

    // API 1: Obtener el universo completo de personal activo desde Dartis (Sin Filtros)
    const urlAzure = `/api/RRHH/emp_asis_dartis_vacaciones`; 
    const resAzure = await fetchWithFallback(urlAzure); 
    const empleadosObtenidos = resAzure.data || resAzure; 

    // Validar si la API devolvió registros antes de proceder
    if (!empleadosObtenidos || empleadosObtenidos.length === 0) {
      toast.info("ℹ️ No se encontraron empleados activos para copiar.");
      return;
    }

    // Armamos el payload globalizado solo con el año y el usuario
    const payload = { 
      empleados: empleadosObtenidos, 
      año: parseInt(anio), 
      usuario_trans: user.id
    }; 

    // API 2: Registrar de forma masiva absolutamente toda la nómina en la base local
    await fetchWithFallback('/api/RRHH/registrar_transacciones_vacaciones', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    }); 
 
    toast.success(`🚀 Se copiaron ${empleadosObtenidos.length} registros globales con éxito.`); 

    // Refrescar la tabla visual de la pantalla
    fetchDatos(); 

  } catch (error) { 
    console.error("Error en handleCopiarTodo:", error); 
    if (error.status === 409 || error.response?.status === 409) { 
      toast.error(`⚠️ Ya existen registros consolidados en el sistema para el periodo ${anio}.`); 
    } else { 
      toast.error("❌ Error al procesar la copia masiva de registros."); 
    } 
  } finally { 
    setLoading(false); 
  } 
};



const datosFiltrados = datos.filter(item => { 
  const termino = busquedaLocal.toLowerCase().trim(); 
  const terminoJefe = busquedaLocal1.toLowerCase().trim(); 
  const terminoGerencia = busquedaLocal2.toLowerCase().trim(); 
  
  // FILTRO 1: General (Nombre, Cédula o Departamento)
  const cumpleBusquedaGeneral = termino === '' || (
    item.nombres?.toLowerCase().includes(termino) || 
    item.cedula?.toString().includes(termino) || 
    item.departamento?.toLowerCase().includes(termino)
  );

  // FILTRO 2: Jefatura (Independiente)
  const cumpleJefatura = terminoJefe === '' || (
    item.jefedirecto?.toLowerCase().includes(terminoJefe)
  );

  // FILTRO 3: Gerencia (Independiente - Evalúa ambas variaciones de mayúsculas del backend)
  const cumpleGerencia = terminoGerencia === '' || (
    item.gerencia?.toLowerCase().includes(terminoGerencia) ||
    item.Gerencia?.toLowerCase().includes(terminoGerencia)
  );

  // Se deben cumplir las tres condiciones de forma independiente
  return cumpleBusquedaGeneral && cumpleJefatura && cumpleGerencia;
}); 


// ====================================================================
// === RECALCULO SOLICITADO: EL 100% DE LA BASEMacro ES EL TOTAL 78 ===
// ====================================================================
const totalesGlobales = (() => {
  let totalApi100Ausentismos = 0;
  let totalPlanificadoMesesMacro = 0;

  datosFiltrados.forEach(item => {
    totalApi100Ausentismos += parseFloat(item.dias_tomados_api) || 0;
    
    totalPlanificadoMesesMacro += (
      (parseFloat(item.enero) || 0) + (parseFloat(item.febrero) || 0) +
      (parseFloat(item.marzo) || 0) + (parseFloat(item.abril) || 0) +
      (parseFloat(item.mayo) || 0) + (parseFloat(item.junio) || 0) +
      (parseFloat(item.julio) || 0) + (parseFloat(item.agosto) || 0) +
      (parseFloat(item.septiembre) || 0) + (parseFloat(item.octubre) || 0) +
      (parseFloat(item.noviembre) || 0) + (parseFloat(item.diciembre) || 0)
    );
  });

  // NUEVA REGLA MATEMÁTICA: El 100% base pasa a ser la sumatoria de meses (ej: 78.0 d)
  let porcentajeAvance = 0;
  if (totalPlanificadoMesesMacro > 0) {
    // Dividimos la API (58) para la pantalla (78) para obtener el 74%
    porcentajeAvance = (totalApi100Ausentismos * 100) / totalPlanificadoMesesMacro;
  }

  const diferenciaPorCubrir = Math.abs(totalPlanificadoMesesMacro - totalApi100Ausentismos);

  return {
    metaTotal: totalApi100Ausentismos,         // Los 58.0 d
    planificado: totalPlanificadoMesesMacro,   // Los 78.0 d (Actúa como tu 100%)
    pendiente: diferenciaPorCubrir,            // Los 20.0 d
    porcentaje: porcentajeAvance              // Retornará 74.36% para el centro de la dona
  };
})();






// ... Aquí continúa tu "const datosAgrupados = datosFiltrados.reduce(...);"

// La tabla se dibuja basándose en el resultado ya filtrado
const datosAgrupados = datosFiltrados.reduce((grupos, item) => { 
  const puesto = item.puestotrabajo || 'SIN PUESTO ASIGNADO'; 
  if (!grupos[puesto]) { 
    grupos[puesto] = []; 
  } 
  grupos[puesto].push(item); 
  return grupos; 
}, {});



   // 🌟 ASEGÚRATE DE QUE ESTÉ JUSTO AQUÍ, ABAJO DE DONDE SE CALCULA datosFiltrados
    const columnasTags = datosFiltrados && datosFiltrados.length > 0 
        ? Object.keys(datosFiltrados[0]).filter(key => key.startsWith('cantidad_tags_'))
        : [];

  return (  
  
                    <div style={styles.pageBackground}>
                        <div style={styles.container}>
                            {/* HEADER: Identidad y Resumen */}
      {/* UN SOLO DIV PRINCIPAL - TODO EN UNA SOLA FILA HORIZONTAL SIN CORTES */}
<div style={{ 
  ...styles.card, 
  marginTop: '15px', 
  backgroundColor: '#fff',
  borderLeft: '4px solid #6f42c1', 
  boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)', 
  borderRadius: '0.375rem', 
  padding: '0.60rem 0.90rem' 
}}> 


  {/* d-flex flex-nowrap obliga a todos los objetos a quedarse estrictamente en la misma línea */}
  <div className="d-flex align-items-end justify-content-between flex-nowrap gap-1.5 w-100"> 

      {/* === NUEVO: FILTRO DE AÑO === */}
  <div className="flex-shrink-0" style={{ minWidth: '80px', maxWidth: '100px' }}> 
  <div className="form-group mb-0"> 
    <label className="small fw-bolder mb-1 text-uppercase text-muted" style={{ fontSize: '8.5px' }}> 
      📅 PERIODO
    </label> 
    <select 
      className="form-select shadow-sm border-secondary-subtle" 
      value={anio} 
      onChange={(e) => setAnio(e.target.value)} // Removemos el parseInt para que acepte cadenas vacías
      style={{ height: '34px', fontSize: '0.78rem', paddingRight: '9px', paddingLeft: '1px' }} 
    > 
      <option value="">Todos</option> {/* 👈 NUEVA OPCIÓN VACÍA */}
      <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
      <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
      <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
    </select> 
  </div> 
  
   

</div>
  {/* SEPARADOR VISUAL DELGADO */}
    <div className="border-end border-secondary-subtle align-self-stretch my-1" style={{ width: '10px' }}></div>
 {/* 6. CONTADOR DE REGISTROS */}
    <div className="flex-shrink-0"> 
      <div className="form-group mb-0"> 
        <label className="small fw-bolder mb-1 text-uppercase text-muted" style={{ fontSize: '8.5px' }}> 
          📋 Regs
        </label> 
        <div className="bg-light rounded border border-secondary-subtle d-flex align-items-center justify-content-center fw-bold text-dark" style={{ height: '34px', minWidth: '40px', fontSize: '0.82rem' }}> 
          {datos.length} 
        </div> 
      </div> 
    </div> 
  
    {/* SEPARADOR VISUAL DELGADO */}
    <div className="border-end border-secondary-subtle align-self-stretch my-1" style={{ width: '10px' }}></div>
    {/* 5. BOTÓN CONSULTAR */} 
    <div className="flex-shrink-0">
      <button 
        onClick={fetchDatos} 
        className="btn shadow-sm fw-bold text-white d-inline-flex align-items-center justify-content-center" 
        disabled={loading} 
        style={{ height: '34px', padding: '0 10px', fontSize: '0.78rem', backgroundColor: '#92b91c', borderColor: '#92b91c' }} 
      > 
        {loading ? "..." : "🔭 Consultar"} 
      </button> 
    </div>


    {/* SEPARADOR VISUAL DELGADO */}
    <div className="border-end border-secondary-subtle align-self-stretch my-1" style={{ width: '10px' }}></div>

 {/* 3. FILTRO EMPRESA */} 
<div style={{ ...styles.inputGroup, flex: '1 1 140px', margin: 0 }}> 
  <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>🏢 Empresa:</label> 
  <select 
    style={{ ...styles.input, width: '80%', height: '30px', fontSize: '11px', padding: '2px 4px' }} 
    value={empresa} 
    onChange={(e) => setEmpresa(e.target.value)} 
  > 
    {/* Oculta "Todas las empresas" si el usuario está limitado a una sola empresa */}
    {(user.empresasAutorizadas.length === 0 || user.empresasAutorizadas.length > 1) && (
      <option value="">Todas las empresas</option>
    )}
    
    {[ 
      { id: "5", nombre: "EXPOFLOR CIA. LTDA." }, 
      { id: "4", nombre: "AMAZINGROSES CIA LTDA" }, 
      { id: "10", nombre: "CAJA DE AHORROS BELLA FLOR" }, 
      { id: "3", nombre: "HIDDENGARDEN CIA LTDA" }, 
      { id: "12", nombre: "OASISFLOWER SAS" }, 
      { id: "13", nombre: "OASISORGANICS SAS" } 
    ] 
    .filter(opt => user.empresasAutorizadas.length === 0 || user.empresasAutorizadas.includes(opt.id)) 
    .map(opt => ( 
      <option key={opt.id} value={opt.id}>{opt.nombre}</option> 
    ))} 
  </select> 
</div>
  {/* SEPARADOR VISUAL DELGADO */}
    <div className="border-end border-secondary-subtle align-self-stretch my-1" style={{ width: '10px' }}></div>
{/* 4. FILTRO DEPARTAMENTO */} 
<div style={{ ...styles.inputGroup, flex: '1 1 130px', margin: 0 }}> 
  <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>📂 Depto:</label> 
  <select 
    style={{ ...styles.input, width: '80%', height: '30px', fontSize: '11px', padding: '2px 4px' }} 
    value={departamento} 
    onChange={(e) => setDepartamento(e.target.value)} 
  > 
    {/* Oculta "Todos los departamentos" si el usuario está limitado a un solo departamento */}
    {(user.deptosAutorizados.length === 0 || user.deptosAutorizados.length > 1) && (
      <option value="">Todos los departamentos</option>
    )}
    
    {listaDepartamentos 
    .filter(dep => { 
      const nombreDep = dep.nombre || dep.departamento; 
      return user.deptosAutorizados.length === 0 || user.deptosAutorizados.includes(nombreDep); 
    }) 
    .map((dep, index) => {
      const valorDep = dep.nombre || dep.departamento;
      return ( 
        <option key={index} value={valorDep}> 
          {valorDep} 
        </option> 
      );
    })} 
  </select> 
</div>
  {/* SEPARADOR VISUAL DELGADO */}
    <div className="border-end border-secondary-subtle align-self-stretch my-1" style={{ width: '10px' }}></div>
 {/* 8. BÚSQUEDA DIRECTA LOCAL */}
    <div className="flex-grow-1" style={{ minWidth: '110px', maxWidth: '200px' }}> 
      <div className="form-group mb-0"> 
        <label className="small fw-bolder mb-1 text-uppercase text-muted" style={{ fontSize: '8.5px' }}> 
          🔍 Buscar por Gerencia
        </label> 
        <div className="position-relative"> 
          <input 
            type="text" 
            className="form-control shadow-sm border-secondary-subtle" 
            placeholder="Gerencia...." 
            value={busquedaLocal2} 
            onChange={(e) => setBusquedaLocal2(e.target.value)} 
            style={{ paddingRight: '20px', height: '34px', fontSize: '0.78rem', paddingLeft: '6px' }} 
          /> 
          {busquedaLocal2 && ( 
            <button 
              type="button" 
              onClick={() => setBusquedaLocal2('')} 
              className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted px-1 py-0" 
              style={{ zIndex: 5, fontSize: '0.7rem' }} 
            > 
              ✕
            </button> 
          )} 
        </div> 
      </div> 
    </div> 
    
  {/* SEPARADOR VISUAL DELGADO */}
    <div className="border-end border-secondary-subtle align-self-stretch my-1" style={{ width: '10px' }}></div>
        {/* 8. BÚSQUEDA DIRECTA LOCAL */}
    <div className="flex-grow-1" style={{ minWidth: '110px', maxWidth: '200px' }}> 
      <div className="form-group mb-0"> 
        <label className="small fw-bolder mb-1 text-uppercase text-muted" style={{ fontSize: '8.5px' }}> 
          🔍 Buscar por Jefatura
        </label> 
        <div className="position-relative"> 
          <input 
            type="text" 
            className="form-control shadow-sm border-secondary-subtle" 
            placeholder="Jefe inmediato...." 
            value={busquedaLocal1} 
            onChange={(e) => setBusquedaLocal1(e.target.value)} 
            style={{ paddingRight: '20px', height: '34px', fontSize: '0.78rem', paddingLeft: '6px' }} 
          /> 
          {busquedaLocal1 && ( 
            <button 
              type="button" 
              onClick={() => setBusquedaLocal1('')} 
              className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted px-1 py-0" 
              style={{ zIndex: 5, fontSize: '0.7rem' }} 
            > 
              ✕
            </button> 
          )} 
        </div> 
      </div> 
    </div> 
  {/* SEPARADOR VISUAL DELGADO */}
    <div className="border-end border-secondary-subtle align-self-stretch my-1" style={{ width: '10px' }}></div>
     {/* 7. BÚSQUEDA DIRECTA LOCAL */}
    <div className="flex-grow-1" style={{ minWidth: '110px', maxWidth: '200px' }}> 
      <div className="form-group mb-0"> 
        <label className="small fw-bolder mb-1 text-uppercase text-muted" style={{ fontSize: '8.5px' }}> 
          🔍 Buscar
        </label> 
        <div className="position-relative"> 
          <input 
            type="text" 
            className="form-control shadow-sm border-secondary-subtle" 
            placeholder="Nombre, cédula..." 
            value={busquedaLocal} 
            onChange={(e) => setBusquedaLocal(e.target.value)} 
            style={{ paddingRight: '20px', height: '34px', fontSize: '0.78rem', paddingLeft: '6px' }} 
          /> 
          {busquedaLocal && ( 
            <button 
              type="button" 
              onClick={() => setBusquedaLocal('')} 
              className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted px-1 py-0" 
              style={{ zIndex: 5, fontSize: '0.7rem' }} 
            > 
              ✕
            </button> 
          )} 
        </div> 
      </div> 
    </div> 
  {/* SEPARADOR VISUAL DELGADO */}
    <div className="border-end border-secondary-subtle align-self-stretch my-1" style={{ width: '10px' }}></div>
    {/* BLOQUE DE ACCIONES MASIVAS */}
    <div className="d-flex align-items-end flex-shrink-0 gap-1"> 
      
      {/* 8. BOTÓN INGRESAR HORAS */}
      <button 
        type="button" 
        onClick={handleCopiarTodo} 
        disabled={loading} 
        className="btn btn-success shadow-sm fw-bold d-inline-flex align-items-center justify-content-center gap-1" 
        style={{ height: '34px', padding: '0 8px', fontSize: '0.78rem', backgroundColor: '#92b91c', borderColor: '#92b91c' }} 
        title={`Ingresar horas (})`}
      > 
       <span>📥</span> {loading ? "Cargando..." :  `Registrar (${anio})`} 

      </button> 
  {/* SEPARADOR VISUAL DELGADO */}
    <div className="border-end border-secondary-subtle align-self-stretch my-1" style={{ width: '10px' }}></div>
      {/* 9. DROPDOWN EXPORTAR REPORTES */}
      <div className="dropdown d-inline-block"> 
        <button 
          className="btn dropdown-toggle shadow-sm fw-bold d-inline-flex align-items-center justify-content-center gap-1" 
          type="button" 
          onClick={() => setMenuReportesAbierto(!menuReportesAbierto)} 
          style={{ height: '34px', padding: '0 8px', fontSize: '0.78rem', color: '#555C28', backgroundColor: '#b3c254', borderColor: '#555C28' }} 
          disabled={loading || datos.length === 0} 
        > 
          📊 Reportes
        </button> 
        
        <ul className={`dropdown-menu dropdown-menu-end shadow ${menuReportesAbierto ? 'show' : ''}`} style={{ position: 'absolute', inset: '0px 0px auto auto', margin: '0px', transform: 'translate(0px, 36px)', fontSize: '0.8rem', zIndex: 1050 }}> 
          <li> 
           
          </li> 
          <li> 
            
          </li> 
          <li> 
            
          </li> 
        </ul> 
      </div> 

 

    </div> 

  </div> 
</div>
             {/* ========================================================================= */}
      {/* === GRÁFICO DE PASTEL GLOBAL ADAPTADO (ARCO VISUAL CORREGIDO) === */}
      {/* ========================================================================= */}
      {totalesGlobales.metaTotal > 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '25px 35px',
          marginBottom: '25px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03)',
          borderLeft: '6px solid #22c55e',
          display: 'flex',
          alignItems: 'center',
          gap: '50px',
          maxWidth: '650px',
          margin: '20px auto'
        }}>
          {/* Gráfico de Pastel en SVG Nativo ampliado a 160px */}
          <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
            <svg width="160" height="160" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)', borderRadius: '50%' }}>
              {/* Fondo completo de lo pendiente (Rojo suave) */}
              <circle r="16" cx="16" cy="16" fill="#fee2e2" />
              
              {/* EDITADO: Forzamos que el arco visual no supere 100 para evitar que el círculo se deforme al sobregiros (ej: 134%) */}
              <circle r="16" cx="16" cy="16" fill="transparent"
                stroke="#22c55e"
                strokeWidth="32"
                strokeDasharray={`${Math.min(100, totalesGlobales.porcentaje)} 100`} 
              />
            </svg>
            
            {/* Círculo blanco central y texto del porcentaje macro */}
            <div style={{
              position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
              backgroundColor: '#ffffff', width: '85px', height: '85px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '850', fontSize: '18px', color: '#1e293b', boxShadow: '0 4px 6px rgba(0,0,0,0.08)'
            }}>
              {totalesGlobales.porcentaje.toFixed(0)}%
            </div>
          </div>

          {/* Datos y Leyenda Estadística Ampliada */}
          <div style={{ flex: 1 }}>
            <h6 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              RESUMEN DE AVANCE GLOBAL ({anio || new Date().getFullYear()})
            </h6>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              
              {/* 1. Días Ausentismo Real (DARTIS - 100%) */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#64748b' }} />
                  Días Ausentismo Real (DARTIS - 100%):
                </span>
                <strong style={{ color: '#1e293b', marginLeft: 'auto', fontSize: '14px' }}>
                  {totalesGlobales.metaTotal.toFixed(1)} d
                </strong>
              </div>

              {/* 2. Diferencia por Cubrir / Excedente */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    backgroundColor: totalesGlobales.planificado > totalesGlobales.metaTotal ? '#f97316' : '#fca5a5' 
                  }} />
                  Diferencia por Cubrir:
                </span>
                <strong style={{ 
                  color: totalesGlobales.planificado > totalesGlobales.metaTotal ? '#c2410c' : '#b91c1c', 
                  marginLeft: 'auto', 
                  fontSize: '14px' 
                }}>
                  {totalesGlobales.pendiente.toFixed(1)} d
                </strong>
              </div>

              <hr style={{ margin: '10px 0', border: '0', borderTop: '1px solid #e2e8f0' }} />

              {/* 3. Total Planificado en Pantalla */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                <span style={{ color: '#475569', fontWeight: 'normal' }}>Total Planificado en Pantalla:</span>
                <span style={{ color: '#15803d', marginLeft: 'auto' }}>
                  {totalesGlobales.planificado.toFixed(1)} d
                </span>
              </div>

              {/* 4. Total por Cumplir en Pantalla */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '14px', marginTop: '4px' }}>
                <span style={{ color: '#475569', fontWeight: 'normal' }}>Total por Cumplir en Pantalla:</span>
                <span style={{ 
                  color: totalesGlobales.planificado >= totalesGlobales.metaTotal ? '#16a34a' : '#dc2626', 
                  marginLeft: 'auto' 
                }}>
                  {Math.max(0, totalesGlobales.metaTotal - totalesGlobales.planificado).toFixed(1)} d
                </span>
              </div>
              
            </div>
          </div>
        </div>
      )}




      
             {/* Tabla */}

             
                <div style={styles.tableCard}>
                    <table style={styles.table} >
<thead>
  {/* FILA UNIFICADA DE ENCABEZADO */}
  <tr style={styles.tableHeader}>

    {/* 1. COLUMNAS FIJAS / STICKY (Izquierda) */}
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thStickyBoth, left: 0, width: '110px', minWidth: '110px' }} className="borde-grupo-inicio">
      EMPRESA/AREA
    </th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '80px', minWidth: '80px' }} className="borde-grupo-inicio">
      NOMBRES
    </th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }} className="borde-grupo-inicio">
      GERENCIA/JEFATURA
    </th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '120px', minWidth: '120px' }} className="borde-grupo-inicio">
      (ID ROL - Periodo)
    </th>

    {/* 2. SECCIÓN DE SALDOS */}
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '120px', minWidth: '120px' }} className="borde-grupo-inicio">
      SALDO VACACIONES (ÚLTIMO ROL)
    </th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '90px', minWidth: '90px' }} className="borde-grupo-inicio">
      # DÍAS PROYECTADO POR MES
    </th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '70px', minWidth: '70px' }} className="borde-grupo-inicio">
      PRIORIDAD
    </th>

    {/* ========================================================= */}
    {/* === 3. ENCABEZADOS JUNTOS: DÍAS API Y SU % DE AVANCE === */}
    {/* ========================================================= */}
   

     <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, backgroundColor: '#f0f0f0ff', color: '#1e293b', textAlign: 'center', width: '90px', minWidth: '90px' }} className="borde-grupo-fin">
     #DIAS ASENTISMO VACACIONES DARTIS 
    </th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, backgroundColor: '#f0f0f0ff', color: '#1e293b', textAlign: 'center', width: '90px', minWidth: '90px' }} className="borde-grupo-fin">
      % AVANCE
    </th>

    {/* 4. MESES DE PLANIFICACIÓN (ENRO a DCMB) */}
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' , backgroundColor: '#fdfbd5ff'}} className="borde-grupo-inicio">ENRO</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px', backgroundColor: '#fdfbd5ff' }} className="borde-grupo-inicio">FBRO</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' , backgroundColor: '#fdfbd5ff'}} className="borde-grupo-inicio">MRZO</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px', backgroundColor: '#fdfbd5ff' }} className="borde-grupo-inicio">ABRL</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px', backgroundColor: '#fdfbd5ff' }} className="borde-grupo-inicio">MAYO</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' , backgroundColor: '#fdfbd5ff'}} className="borde-grupo-inicio">JNIO</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' , backgroundColor: '#fdfbd5ff'}} className="borde-grupo-inicio">JLIO</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' , backgroundColor: '#fdfbd5ff'}} className="borde-grupo-inicio">AGST</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' , backgroundColor: '#fdfbd5ff'}} className="borde-grupo-inicio">SPTB</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' , backgroundColor: '#fdfbd5ff'}} className="borde-grupo-inicio">OCTB</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px', backgroundColor: '#fdfbd5ff' }} className="borde-grupo-inicio">NVMB</th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' , backgroundColor: '#fdfbd5ff'}} className="borde-grupo-inicio">DCMB</th>

    {/* 5. SECCIÓN DE TOTALES Y SALDOS FINALES */}
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, backgroundColor: '#f0f0f0ff', color: '#003503ff', textAlign: 'center', width: '100px', minWidth: '100px' }} className="borde-grupo-fin">
      DIAS PROYECTADOS
    </th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, backgroundColor: '#f0f0f0ff', color: '#1e293b', textAlign: 'center', width: '100px', minWidth: '100px' }} className="borde-grupo-fin">
      TOTAL PLANIFICADO
    </th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, backgroundColor: '#f0f0f0ff', color: '#003503ff', textAlign: 'center', width: '100px', minWidth: '100px' }} className="borde-grupo-fin">
      DIAS DE VACACIONES SALDO AL TERMINAR
    </th>
    <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, backgroundColor: '#f0f0f0ff', color: '#003503ff', textAlign: 'center', width: '100px', minWidth: '100px' }} className="borde-grupo-fin">
      SALDO PENDIENTE A DICIEMBRE
    </th>

      <th style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, backgroundColor: '#f0f0f0ff', color: '#003503ff', textAlign: 'center', width: '100px', minWidth: '100px' }} className="borde-grupo-fin">
     VACACIONES PENDIENTES A LA FECHA
     </th>


  </tr>
</thead>

<tbody>
  {Object.keys(datosAgrupados).length > 0 ? (
    Object.keys(datosAgrupados).map((puestoNombre) => (
      <React.Fragment key={puestoNombre}>
        {/* Regla CSS inyectada para efectos dinámicos visuales */}
        <style>{`
          .celda-hover { transition: background-color 0.2s ease; cursor: pointer; }
          .celda-hover:hover, .celda-hover:hover td { background-color: #eaf2f8 !important; }
          .celda-hover:hover input, .celda-hover:hover select { background-color: transparent !important; }
        `}</style>

        {/* MAPEO DE LOS REGISTROS DEL GRUPO ESPECÍFICO */}
        {datosAgrupados[puestoNombre].map((item, index) => (
          <tr key={item.id || index} className="celda-hover" style={styles.tableRow}>
            
            {/* 1. COLUMNA EMPRESA / ID DEPARTAMENTO */}
 {/* 1. COLUMNA EMPRESA / ID DEPARTAMENTO CON DETENCIÓN DE PROPAGACIÓN */}
<td style={{ ...styles.td, ...styles.tdSticky, left: 0, width: '110px', minWidth: '110px', borderRight: '1px solid #dee2e6' }}>
  <div style={styles.dep}>
    <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#253a00' }}>
      {item.empresa} | {item.actividad} | { 
        item.total_solicitudes > 0 ? (
          <span 
            className="badge rounded-pill bg-danger text-white ms-1 animate__animated animate__pulse animate__infinite" 
            style={{ fontSize: '10px', padding: '3px 6px', cursor: 'pointer' }} 
            onClick={(e) => {
              e.stopPropagation(); /* 🚀 Detiene el disparo de la fila */
              handleOpenModal(item);
            }} 
            title="Ver solicitud de VACACIONES"
          >
            VC {item.total_solicitudes}
          </span>
        ) : item.total_solicitudes < 0 ? (
          <span 
            className="badge rounded-pill bg-info text-dark ms-1" 
            style={{ fontSize: '10px', padding: '3px 6px', cursor: 'pointer', backgroundColor: '#0dcaf0' }} 
            onClick={(e) => {
              e.stopPropagation(); /* 🚀 Aísla el evento */
              handleOpenModal(item);
            }} 
            title="Ver solicitud de PERMISOS" 
          >
           {item.total_solicitudes}
          </span>
        ) : (
          item.total_solicitudes
        )
      }

            {/* 🟢 BURBUJA DE PERMISOS ORDINARIOS (OP) */}
              {item.total_permisos > 0 && (
                <span 
                  className="badge rounded-pill text-dark ms-1" 
                  style={{ fontSize: '10px', padding: '3px 6px', cursor: 'pointer', backgroundColor: '#ffc107', fontWeight: 'bold' }}
                  onClick={(e) => {
                    e.stopPropagation(); /* 🚀 Evita conflictos de modales encimados */
                    handleOpenModalPermisos(item);
                  }}
                  title="Ver solicitudes de permisos" 
                >
                  OP ({item.total_permisos})
                </span>
              )}

              {/* 🔵 BURBUJA DE TRABAJO SOCIAL (TS) CORREGIDA */}
              {item.total_ts > 0 && (
                <span 
                  className="badge rounded-pill text-white ms-1 animate__animated animate__fadeIn" 
                  style={{ fontSize: '10px', padding: '3px 6px', cursor: 'pointer', backgroundColor: '#0284c7', fontWeight: 'bold', border: '1px solid #0284c7' }}
                  onClick={(e) => {
                    e.stopPropagation(); /* 🚀 Ejecución 100% aislada y segura */
                    handleOpenModalTS(item);
                  }}
                  title="Ver casos de Trabajo Social (TS)" 
                >
                  TS ({item.total_ts})
                </span>
              )}
              
              <br/>
              <small className="text-muted">IdTrn: ({item.id}) - {item.departamento}</small>
            </span>
          </div>
        </td>





            {/* 2. COLUMNA EMPLEADO / ÁREA */}
            <td style={{ ...styles.td, ...styles.tdSticky, left: 0, width: '110px', minWidth: '110px', borderRight: '1px solid #dee2e6' }}>
              <div style={styles.empContainer}>
                <div style={{ ...styles.empName, fontWeight: '600', color: '#253a00ff', fontSize: '12px' }}>
                  {item.nombres}
                </div>
                <div style={{ fontSize: '11px', color: '#545454ff', marginTop: '2px' }}>
                  Cédula: {item.cedula} | idEmp: {item.idemp} | Fech.ING: {item.fecha_ingreso ? item.fecha_ingreso.split('T') : ''}
                </div>
              </div>
            </td>

            {/* 3. COLUMNA GERENCIA / JEFE DIRECTO */}
            <td style={{ ...styles.td, ...styles.tdSticky, left: 0, width: '110px', minWidth: '110px', borderRight: '1px solid #dee2e6' }}>
              <div style={styles.empContainer}>
                <div style={{ fontWeight: '600', color: '#06325dff', fontSize: '11px' }}>
                  Gerencia: {item.Gerencia || item.gerencia}
                </div>
                <div style={{ fontSize: '11px', color: '#545454ff', marginTop: '2px' }}>
                  Jefe: {item.jefedirecto}
                </div>
              </div>
            </td>

            {/* 4. COLUMNA ID ROL - PERIODO */}
            <td style={{ ...styles.td, ...styles.tdSticky, left: 0, width: '110px', minWidth: '110px', borderRight: '1px solid #dee2e6' }}>
              <div style={styles.empContainer}>
                <div style={{ fontWeight: '600', color: '#06325dff', fontSize: '11px' }}>
                  IdRol: {item.idrol}
                </div>
                <div style={{ fontSize: '11px', color: '#545454ff', marginTop: '2px' }}>
                  Periodo Rl: {item.periodo_rol}
                </div>
              </div>
            </td>
            {/* 5. SALDO VACACIONES PENDIENTES */}
            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
              <span style={{
                display: 'inline-block', minWidth: '35px', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                backgroundColor: (item.dias_vacaciones_pendientes ?? 0) >= 15 ? '#fee2e2' : '#f3f4f6',
                color: (item.dias_vacaciones_pendientes ?? 0) >= 15 ? '#dc2626' : (item.dias_vacaciones_pendientes ?? 0) > 0 ? '#d97706' : '#6b7280',
                border: '1px solid', borderColor: (item.dias_vacaciones_pendientes ?? 0) >= 15 ? '#fca5a5' : '#e5e7eb',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}>
                {item.dias_vacaciones_pendientes ?? 0}
              </span>
            </td>

            {/* 6. SALDO VACACIONES GANADAS */}
            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
              <span style={{
                display: 'inline-block', minWidth: '35px', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                backgroundColor: '#f3f4f6', color: (item.dias_vacaciones_ganadas ?? 0) > 0 ? '#0369a1' : '#6b7280',
                border: '1px solid', borderColor: (item.dias_vacaciones_ganadas ?? 0) > 0 ? '#bae6fd' : '#f3f4f6',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}>
                {item.dias_vacaciones_ganadas ?? 0}
              </span>
            </td>

            {/* 7. PRIORIDAD */}
            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px' }}>
              {(() => {
                const esPrioritario = item.priorizar === 'SI' || item.Priorizar === 'SI' || (item.dias_vacaciones_pendientes ?? 0) >= 15;
                return (
                  <span style={{
                    display: 'inline-block', minWidth: '50px', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                    letterSpacing: '0.5px', textAlign: 'center', backgroundColor: esPrioritario ? '#dc2626' : '#f3f4f6',
                    color: esPrioritario ? '#ffffff' : '#6b7280', border: '1px solid', borderColor: esPrioritario ? '#b91c1c' : '#e5e7eb',
                    boxShadow: esPrioritario ? '0 2px 4px rgba(220, 38, 38, 0.25)' : 'none'
                  }}>
                    {esPrioritario ? 'SI' : 'NO'}
                  </span>
                );
              })()}
            </td>

            {/* 8. COLUMNA: DÍAS TOMADOS DESDE TU API */}
            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
              <span style={{
                display: 'inline-block', minWidth: '35px', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
              }}>
                {item.dias_tomados_api ?? 0} 
              </span>
            </td>
{/* === 9. % DE AVANCE CORREGIDO: API COMPARADO VS TOTAL PLANIFICADO MESES (70%) === */}
{(() => {
  // 1. Calculamos el total planificado sumando los meses (Este valor actuará como tu 100% base)
  const totalPlanificadoMeses = Number(
    (parseFloat(item.enero) || 0) + (parseFloat(item.febrero) || 0) + (parseFloat(item.marzo) || 0) +
    (parseFloat(item.abril) || 0) + (parseFloat(item.mayo) || 0) + (parseFloat(item.junio) || 0) +
    (parseFloat(item.julio) || 0) + (parseFloat(item.agosto) || 0) + (parseFloat(item.septiembre) || 0) +
    (parseFloat(item.octubre) || 0) + (parseFloat(item.noviembre) || 0) + (parseFloat(item.diciembre) || 0)
  );

  // 2. Tu valor real a comparar contra la planificación es el dato traído de la API (ej: 7)
  const diasAusentismoApi = parseFloat(item.dias_tomados_api) || 0;
  
  let porcentajeAvance = 0;
  
  // CORRECCIÓN MATEMÁTICA: Si el usuario ya planificó meses (ej: 10), evaluamos qué % representa la API (ej: 7)
  if (totalPlanificadoMeses > 0) {
    porcentajeAvance = (diasAusentismoApi * 100) / totalPlanificadoMeses;
  } else if (diasAusentismoApi > 0 && totalPlanificadoMeses === 0) {
    porcentajeAvance = 0; // Si hay días en la API pero no ha planificado nada en el front, arranca en 0%
  }

  // Límite visual de seguridad entre 0 y 100 para evitar desbordamientos del contenedor gráfico
  const porcentajeVisualBarra = Math.min(100, Math.max(0, porcentajeAvance));

  return (
    <td 
      style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}
      onClick={() => abrirDetalleEmpleado(item)} 
    >
      {/* Contenedor principal de la barra (Representa el Fondo Rojo de lo Pendiente) */}
      <div style={{
        width: '85px',
        height: '18px',
        backgroundColor: '#fee2e2', // Fondo rojo suave para lo pendiente
        borderRadius: '10px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #fca5a5',
        margin: '0 auto',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
        cursor: 'pointer'
      }}>
        
        {/* Relleno dinámico (Representa el Frente Verde de lo Avanzado) */}
        <div style={{
          width: `${porcentajeVisualBarra}%`,
          height: '100%',
          backgroundColor: '#22c55e', // Verde brillante para lo avanzado
          transition: 'width 0.4s ease-in-out', 
          borderRadius: porcentajeVisualBarra === 100 ? '10px' : '10px 0 0 10px'
        }} />

        {/* Texto del porcentaje superpuesto en el centro absoluto de la barra */}
        <span style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '10px',
          fontWeight: 'bold',
          color: porcentajeVisualBarra > 50 ? '#ffffff' : '#1e293b', 
          textShadow: porcentajeVisualBarra > 50 ? '0px 1px 2px rgba(0,0,0,0.3)' : 'none',
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}>
          {porcentajeAvance.toFixed(0)}%
        </span>

      </div>
    </td>
  );
})()}

{/* 10. ENTRADAS INPUTS DE LOS 12 MESES PLANIFICADOS CON ARRASTRE DE SALDO GANADO */}
{(() => {
  // Inicializamos el saldo con el valor que viene estrictamente de la columna ÚLTIMO ROL
  let saldoArrastrado = parseFloat(item.dias_vacaciones_pendientes) || 0;
  
  const mesesOrdenados = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  return mesesOrdenados.map((mes) => {
    // 1. Cada mes que pasa, el empleado gana nativamente 1.25 días más
    const derechoMesActual = 1.25;
    
    // El cupo máximo disponible para ESTE mes en particular es lo que traía acumulado + el derecho del mes
    const maxPermitidoEsteMes = Number(saldoArrastrado + derechoMesActual);
    
    // Le restamos lo que el usuario digitó en este input para saber cuánto saldo le hereda al siguiente mes
    const valorDigitado = parseFloat(item[mes]) || 0;
    saldoArrastrado = maxPermitidoEsteMes - valorDigitado;

    // REGLA DE BLOQUEO: Si el cupo máximo para este mes es 0 o menor, se congela.
    // Excepto si la celda ya tiene un número guardado (para permitirle al usuario borrar o bajar el valor).
    const estaBloqueado = maxPermitidoEsteMes <= 0 && !(valorDigitado > 0);

    return (
      <td key={mes} style={{ ...styles.td, verticalAlign: 'middle', padding: '5px 4px', textAlign: 'center' }}>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={item[mes] ?? ""}
          disabled={estaBloqueado} // 👈 SE BLOQUEA EN VIVO SI EL SALDO ACUMULADO + 1.25 LLEGA A 0
          onFocus={(e) => { 
            e.target.dataset.valorInicial = e.target.value; 
            e.target.setCustomValidity(""); 
          }}
          onChange={(e) => {
            let val = e.target.value.replace(',', '');
            const inputRef = e.target;
            inputRef.setCustomValidity("");

            if (val === "") {
              setDatos(prev => prev.map(d => d.id === item.id ? { ...d, [mes]: val } : d));
              return;
            }

            if (!isNaN(val) || val.endsWith('.')) {
              if (val.includes('.') && val.split('.').length > 2) return;
              
              const numeroIngresado = parseFloat(val) || 0;

              // VALIDACIÓN CRÍTICA: No puede ingresar más días de su saldo acumulado hasta este mes
              if (numeroIngresado > maxPermitidoEsteMes) {
                inputRef.setCustomValidity(`Saldo insuficiente. En ${mes.toUpperCase()} tu límite máximo acumulado con los +1.25 ganados es de ${maxPermitidoEsteMes.toFixed(2)} días.`);
                inputRef.reportValidity();
                return;
              }
              setDatos(prev => prev.map(d => d.id === item.id ? { ...d, [mes]: val } : d));
            }
          }}
          onBlur={(e) => {
            const valorInicial = e.target.dataset.valorInicial;
            let valorActual = e.target.value.replace(',', '');

            if (valorActual.endsWith('.')) {
              valorActual = valorActual.slice(0, -1);
              setDatos(prev => prev.map(d => d.id === item.id ? { ...d, [mes]: valorActual } : d));
            }
            e.target.setCustomValidity("");

            if (valorInicial === valorActual) return;

            if (valorActual === "" || isNaN(parseFloat(valorActual))) {
              handleUpdate(item.id, mes, 0, true);
            } else {
              handleUpdate(item.id, mes, parseFloat(valorActual), true);
            }
          }}
          style={{
            width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #c9c9c9',
            // Color gris si el mes quedó bloqueado por haberse gastado todo el saldo en los meses anteriores
            backgroundColor: estaBloqueado ? '#f1f5f9' : (parseFloat(item[mes]) > 0 ? '#dcf52f' : '#ffffff'),
            borderColor: parseFloat(item[mes]) > 0 ? '#ffffff' : '#c9c9c9',
            fontSize: '12px', 
            color: estaBloqueado ? '#94a3b8' : '#333333',
            textAlign: 'center', outline: 'none',
            height: '26px', boxSizing: 'border-box', 
            cursor: estaBloqueado ? 'not-allowed' : 'text'
          }}
        />
      </td>
    );
  });
})()}


            {/* 11. DIAS PROYECTADOS */}
            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
              <span style={{
                display: 'inline-block', minWidth: '35px', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                backgroundColor: '#f3f4f6', color: '#0369a1', border: '1px solid #f3f4f6', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}>
                {Number((item.dias_vacaciones_ganadas ?? 0) * 12).toFixed(2)}
              </span>
            </td>

            {/* 12. TOTAL PLANIFICADO ACUMULADO */}
            {(() => {
              const totalPlanificado = Number(
                (parseFloat(item.enero) || 0) + (parseFloat(item.febrero) || 0) + (parseFloat(item.marzo) || 0) +
                (parseFloat(item.abril) || 0) + (parseFloat(item.mayo) || 0) + (parseFloat(item.junio) || 0) +
                (parseFloat(item.julio) || 0) + (parseFloat(item.agosto) || 0) + (parseFloat(item.septiembre) || 0) +
                (parseFloat(item.octubre) || 0) + (parseFloat(item.noviembre) || 0) + (parseFloat(item.diciembre) || 0)
              );
              return (
                <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
                  <span style={{
                    display: 'inline-block', minWidth: '45px', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                    backgroundColor: totalPlanificado > 0 ? '#e0f2fe' : '#f3f4f6',
                    color: totalPlanificado > 0 ? '#0369a1' : '#6b7280',
                    border: '1px solid', borderColor: totalPlanificado > 0 ? '#bae6fd' : '#e5e7eb'
                  }}>
                    {totalPlanificado.toFixed(1)}
                  </span>
                </td>
              );
            })()}

            {/* 13. DIAS DE VACACIONES SALDO AL TERMINAR AÑO */}
            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
              <span style={{
                display: 'inline-block', minWidth: '35px', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                backgroundColor: '#f3f4f6', color: '#0369a1', border: '1px solid #f3f4f6', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}>
                {Number(((item.dias_vacaciones_ganadas ?? 0) * 12) + (item.dias_vacaciones_pendientes ?? 0)).toFixed(2)}
              </span>
            </td>
            {/* 14. SALDO PENDIENTE A DICIEMBRE */}
            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
              {(() => {
                const saldoFinal = Number(
                  ((item.dias_vacaciones_ganadas ?? 0) * 12) + (item.dias_vacaciones_pendientes ?? 0) -
                  (item.enero ?? 0) - (item.febrero ?? 0) - (item.marzo ?? 0) - (item.abril ?? 0) -
                  (item.mayo ?? 0) - (item.junio ?? 0) - (item.julio ?? 0) - (item.agosto ?? 0) -
                  (item.septiembre ?? 0) - (item.octubre ?? 0) - (item.noviembre ?? 0) - (item.diciembre ?? 0)
                );

                // Definición dinámica de estilos según el saldo
                let bgColor = '#f3f4f6';   // Gris por defecto (<= 0)
                let textColor = '#6b7280';
                let borderColor = '#e5e7eb';

                if (saldoFinal >= 15) {
                  bgColor = '#fee2e2';     // Rojo claro
                  textColor = '#b91c1c';   // Rojo oscuro
                  borderColor = '#fca5a5'; // Borde rojo sutil
                } else if (saldoFinal > 0) {
                  bgColor = '#e0f2fe';     // Azul original
                  textColor = '#0369a1';
                  borderColor = '#bae6fd';
                }

                return (
                  <span style={{
                    display: 'inline-block', 
                    minWidth: '35px', 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    backgroundColor: bgColor,
                    color: textColor,
                    border: '1px solid', 
                    borderColor: borderColor,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    {saldoFinal.toFixed(2)}
                  </span>
                );
              })()}
            </td>

 {/* 15. VACACIONES PENDIENTES A LA FECHA */}
            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
              <span style={{
                display: 'inline-block', minWidth: '35px', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                backgroundColor: '#f3f4f6', color: '#0369a1', border: '1px solid #f3f4f6', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}>
                {Number((item.dias_vacaciones_pendientes_alafecha ?? 0)).toFixed(2)}
              </span>
            </td>

          </tr>
        ))}
      </React.Fragment>
    ))
  ) : (
    <tr>
      <td colSpan={22 + (mostrarTags ? columnasTags.length : 0)} className="text-center p-4 text-muted fw-semibold">
        No se encontraron registros coincidentes con los filtros seleccionados.
      </td>
    </tr>
  )}
</tbody>


{/* ========================================================= */}
{/* === MODAL FLOTANTE: DESGLOSE DE FECHAS DE VACACIONES === */}
{/* ========================================================= */}
{/* Modal Vista Profesional — Control de Vacaciones */}

{modalDetalleAbierto && (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)'
  }}>
    <div style={{
      backgroundColor: '#ffffff', width: '90%', maxWidth: '550px', borderRadius: '14px',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      overflow: 'hidden', border: '1px solid #e2e8f0'
    }}>
      {/* Cabecera del Modal */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
            Historial de Vacaciones Tomadas
          </h5>
          <small style={{ color: '#64748b', fontWeight: '500' }}>
            {empleadoSeleccionado?.nombres}
          </small>
        </div>
        <button 
          onClick={() => setModalDetalleAbierto(false)}
          style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#94a3b8', fontWeight: 'bold' }}
        >
          &times;
        </button>
      </div>

      {/* Cuerpo del Modal */}
      <div style={{ padding: '20px', maxHeight: '350px', overflowY: 'auto' }}>
        {loadingModal ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>
            Cargando periodos desde Azure...
          </div>
        ) : detalleVacaciones.length > 0 ? (
          <table className="table table-sm table-striped table-bordered" style={{ fontSize: '12px', margin: 0 }}>
            <thead className="table-light">
              <tr>
                <th style={{ textAlign: 'center' }}>Desde</th>
                <th style={{ textAlign: 'center' }}>Hasta</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Total Días</th>
              </tr>
            </thead>
            <tbody>
              {detalleVacaciones.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center', fontWeight: '500' }}>
                    {row.fechaDesde ? new Date(row.fechaDesde).toISOString().split('T')[0] : ''}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: '500' }}>
                    {row.fechaHasta ? new Date(row.fechaHasta).toISOString().split('T')[0] : ''}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#0369a1', backgroundColor: '#f0f9ff' }}>
                    {row.total_dias}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '25px', color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>
            ⚠️ No se encontraron periodos de vacaciones tomadas registrados para este año.
          </div>
        )}
      </div>

      {/* Pie del Modal */}
      <div style={{
        padding: '12px 20px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc',
        display: 'flex', justifyContent: 'flex-end'
      }}>
        <button 
          className="btn btn-secondary btn-sm fw-bold"
          onClick={() => setModalDetalleAbierto(false)}
          style={{ fontSize: '12px', padding: '6px 16px', borderRadius: '6px' }}
        >
          Cerrar Detalle
        </button>
      </div>
    </div>
  </div>
)}


{/* ======================================================================== */}
{/* MODAL DE CASOS Y SOLICITUDES DE TRABAJO SOCIAL (TS)                       */}
{/* ======================================================================== */}
{showModalTS && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1060, 
    padding: '20px',
    backdropFilter: 'blur(4px)'
  }}>
    <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ width: '100%', maxWidth: '1100px', margin: 0 }}>
      <div className="modal-content shadow-lg border-0" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '14px', overflow: 'hidden' }}>
        
        {/* ENCABEZADO CORPORATIVO TS */}
        <div className="modal-header text-white py-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '2px solid #b8d44b', backgroundColor: '#1e293b' }}>
          <h5 className="modal-title fw-bold d-flex align-items-center gap-2" style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem' }}>
            <span style={{ color: '#cae855' }}>🩺</span> Casos de Trabajo Social (TS) — <span style={{ color: '#cae855', fontWeight: '700' }}>{empleadoPermisoSeleccionado?.nombres}</span>
          </h5>
          <button type="button" className="btn-close" style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', cursor: 'pointer', color: '#ffffff', opacity: '0.8' }} onClick={handleCloseModalTS}>×</button>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="modal-body p-4" style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f8fafc' }}>
          {loadingModalPermisos ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#b8d44b' }} role="status"></div>
              <p className="mt-2 fw-semibold text-muted">Cargando registros de Trabajo Social...</p>
            </div>
          ) : solicitudesTS.length === 0 ? (
            <div className="text-center py-5 bg-white rounded-3 border" style={{ border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '44px' }}>📁</span>
              <p className="mt-2 text-muted fw-bold" style={{ fontSize: '14px' }}>El empleado no registra casos de Trabajo Social activos.</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {solicitudesTS.map((permiso) => (
                <div key={permiso.SolicitudID} className="card shadow-sm overflow-hidden bg-white" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#ffffff' }}>
                  
                  {/* Fila superior de la tarjeta */}
                  <div className="card-header bg-white p-3" style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <span className="badge fs-6 px-3 py-2 text-uppercase mb-1 d-inline-block text-white" style={{ backgroundColor: '#0284c7', padding: '5px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>
                        {permiso.TipoPermiso}
                      </span>
                      <div className="text-muted small" style={{ fontSize: '12px', marginTop: '6px', color: '#64748b' }}>
                        <strong>Registrado el:</strong> {permiso.FechaSolicitud} <span style={{ color: '#cbd5e1' }}>|</span> <strong>ID Caso:</strong> {permiso.SolicitudID}
                      </div>
                    </div>


 <div className="d-flex align-items-center gap-2 p-1 px-2 rounded" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <label className="small fw-bold text-uppercase mb-0" style={{ fontSize: '10px', margin: 0, color: '#64748b', letterSpacing: '0.5px' }}>Estado:</label>
                          <select
                            className="form-select form-select-sm fw-bold"
                            style={{
                              width: '140px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontWeight: '700',
                              fontSize: '12px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: permiso.EstadoID === 1 ? '#0284c7' : permiso.EstadoID === 2 ? '#16a34a' : '#dc2626'
                            }}
                            value={permiso.EstadoID ?? ""}
                            onChange={(e) => handleEstadoTSChange(permiso.SolicitudID, e.target.value)}
                          >
                            <option value="1">SOLICITADO</option>
                            <option value="2">APROBADO</option>
                            <option value="3">RECHAZADO</option>
                          </select>

</div>
{Number(permiso.EstadoID) === 3 && (
  <div className="p-3 bg-danger-subtle border-bottom border-danger-subtle">
    <label className="form-label fw-bold text-danger small mb-1">⚠️ Observación de Rechazo:</label>
    <div className="d-flex gap-2">
      <input
        type="text"
        className="form-control form-control-sm border-danger"
        placeholder="Motivo del rechazo..."
        value={observacionesRechazo[`ts-${permiso.SolicitudID}`] ?? permiso.observacion_rechazo ?? ''}
        onChange={(e) =>
          setObservacionesRechazo((prev) => ({ ...prev, [`ts-${permiso.SolicitudID}`]: e.target.value }))
        }
      />
      <button
        type="button"
        className="btn btn-sm btn-danger fw-bold text-nowrap"
        onClick={() =>
          handleEstadoTSChange(
            permiso.SolicitudID,
            3,
            observacionesRechazo[`ts-${permiso.SolicitudID}`] ?? permiso.observacion_rechazo ?? ''
          )
        }
      >
        Guardar
      </button>
    </div>
  </div>
)}



                
                  </div>

                  {/* Detalles internos */}
                  <div className="card-body p-3 small text-dark" style={{ padding: '20px', color: '#334155' }}>
                    <div className="row g-3" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                      
                      <div className="col-12 col-md-6" style={{ flex: '1 1 340px', borderRight: '1px solid #f1f5f9', paddingRight: '20px' }}>
                        <h6 className="fw-bold text-uppercase border-bottom pb-1" style={{ fontSize: '11px', letterSpacing: '0.7px', margin: '0 0 12px 0', borderBottom: '2px solid #cae855', paddingBottom: '6px', color: '#475569' }}>
                          📋 Información Médica / Social
                        </h6>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
                          <li style={{ marginBottom: '8px' }}><strong>Vigencia Desde:</strong> {permiso.FechaInicio}</li>
                          <li style={{ marginBottom: '8px' }}><strong>Vigencia Hasta:</strong> {permiso.FechaFin}</li>
                          <li style={{ marginTop: '12px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #b8d44b', border: '1px solid #e2e8f0' }}>
                            <strong>Diagnóstico o Motivo del Caso:</strong>
                            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4' }}>{permiso.Motivo || 'Sin detalles registrados.'}</p>
                          </li>
                        </ul>
                      </div>

                      <div className="col-12 col-md-6" style={{ flex: '1 1 340px' }}>
                        <h6 className="fw-bold text-uppercase border-bottom pb-1" style={{ fontSize: '11px', letterSpacing: '0.7px', margin: '0 0 12px 0', borderBottom: '2px solid #cae855', paddingBottom: '6px', color: '#475569' }}>
                          📌 Seguimiento Administrativo
                        </h6>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          <strong>Observaciones de RRHH / TS:</strong>
                          <p style={{ marginTop: '6px', color: '#475569' }}>{permiso.ComentariosAdmin || 'Sin seguimientos anotados todavía.'}</p>
                        </div>
                      </div>

                      {/* Fila de Adjunto */}
                      <div className="col-12" style={{ width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                        {permiso.url_archivo ? (
                          <button 
                            type="button"
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #b8d44b', color: '#1e293b', backgroundColor: '#cae855', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
                            onClick={() => {
                              let urlFinal = permiso.url_archivo.trim();
                              if (!urlFinal.startsWith('http://') && !urlFinal.startsWith('https://')) {
                                const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
                                const ruta = urlFinal.startsWith('/') ? urlFinal : `/${urlFinal}`;
                                urlFinal = `${base}${ruta}`;
                              }
                              setPdfUrlSeleccionado(urlFinal);
                              setModalPdfOpen(true);
                            }}
                          >
                            👁️ Ver Informe / Evidencia TS
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>🚫 Sin documentos de respaldo adjuntos</span>
                        )}
                      </div>

                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="modal-footer py-2" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
          <button type="button" style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', backgroundColor: '#475569', color: '#ffffff', border: 'none' }} onClick={handleCloseModalTS}>
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  </div>
)}


{showModalPermisos && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.4)', /* Fondo oscuro sutil */
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1050,
    padding: '20px',
    backdropFilter: 'blur(4px)'
  }}>
    <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ width: '100%', maxWidth: '1100px', margin: 0 }}>
      <div className="modal-content shadow-lg border-0" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>

        {/* ENCABEZADO PREMIUM */}
        <div className="modal-header text-white py-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '2px solid #b8d44b', backgroundColor: '#1e293b' }}>
          <h5 className="modal-title fw-bold d-flex align-items-center gap-2" style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', letterSpacing: '0.3px' }}>
            <span style={{ color: '#cae855' }}>📅</span> Historial de Solicitudes de Permiso ({solicitudesPermisos.length}) — <span style={{ color: '#cae855', fontWeight: '700' }}>{empleadoPermisoSeleccionado?.nombres}</span>
          </h5>
          <button
            type="button"
            className="btn-close"
            style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', cursor: 'pointer', color: '#ffffff', opacity: '0.8', transition: '0.2s' }}
            onClick={handleCloseModalPermisos}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.8'}
          >
            ×
          </button>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="modal-body p-4 bg-light" style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f8fafc' }}>
          {loadingModalPermisos ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" style={{ color: '#b8d44b' }} role="status"></div>
              <p className="mt-2 fw-semibold text-muted" style={{ fontSize: '14px' }}>Cargando historial de permisos...</p>
            </div>
          ) : solicitudesPermisos.length === 0 ? (
            <div className="text-center py-5 bg-white rounded-3 border" style={{ border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '44px' }}>📂</span>
              <p className="mt-2 text-muted fw-bold" style={{ fontSize: '14px' }}>El empleado no registra solicitudes de permiso en el sistema.</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {solicitudesPermisos.map((permiso) => (

                <div key={permiso.SolicitudID} className="card shadow-sm overflow-hidden bg-white" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>

                  {/* Fila superior de la Tarjeta */}
                  <div className="card-header bg-white p-3" style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <span className="badge fs-6 px-3 py-2 text-uppercase mb-1 d-inline-block" style={{ backgroundColor: '#e9ff8f', color: '#3d4a0a', padding: '5px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '12px', border: '1px solid #e9ff8f' }}>
                        {permiso.TipoPermiso}
                      </span>
                      <div className="text-muted small" style={{ fontSize: '12px', marginTop: '6px', color: '#64748b' }}>
                        <strong>Solicitado el:</strong> {permiso.FechaSolicitud} <span style={{ color: '#cbd5e1' }}>|</span> <strong>ID Transacción:</strong> {permiso.SolicitudID}
                      </div>
                    </div>

                    {/* Selector de Estado Corporativo */}
                    <div className="d-flex align-items-center gap-2 p-1 px-2 rounded" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <label className="small fw-bold text-uppercase mb-0" style={{ fontSize: '10px', margin: 0, color: '#64748b', letterSpacing: '0.5px' }}>Estado:</label>
                      <select
                        className="form-select form-select-sm fw-bold"
                        style={{
                          width: '140px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '12px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: permiso.EstadoID === 1 ? '#0284c7' : permiso.EstadoID === 2 ? '#16a34a' : '#dc2626'
                        }}
                        value={permiso.EstadoID ?? ""}
                        onChange={(e) => handleEstadoPermisoChange(permiso.SolicitudID, e.target.value)}
                      >
                        <option value="1">SOLICITADO</option>
                        <option value="2">APROBADO</option>
                        <option value="3">RECHAZADO</option>
                      </select>
                    </div>

    {Number(permiso.EstadoID) === 3 && (
  <div className="p-3 bg-danger-subtle border-bottom border-danger-subtle">
    <label className="form-label fw-bold text-danger small mb-1">⚠️ Observación de Rechazo:</label>
    <div className="d-flex gap-2">
      <input
        type="text"
        className="form-control form-control-sm border-danger"
        placeholder="Motivo del rechazo..."
        value={
          observacionesRechazo[`perm-${permiso.SolicitudID}`] ??
          permiso.observacion_rechazo ??
          permiso.Observacion_Rechazo ??
          ''
        }
        onChange={(e) =>
          setObservacionesRechazo((prev) => ({
            ...prev,
            [`perm-${permiso.SolicitudID}`]: e.target.value,
          }))
        }
      />
      <button
        type="button"
        className="btn btn-sm btn-danger fw-bold text-nowrap"
        onClick={() =>
          handleEstadoPermisoChange(
            permiso.SolicitudID,
            3,
            observacionesRechazo[`perm-${permiso.SolicitudID}`] ??
              permiso.observacion_rechazo ??
              permiso.Observacion_Rechazo ??
              ''
          )
        }
      >
        Guardar
      </button>
    </div>
  </div>
)}



                  </div>

                  {/* Cuerpo interno de la Tarjeta */}
                  <div className="card-body p-3 small text-dark" style={{ padding: '20px', color: '#334155' }}>
                    <div className="row g-3" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>

                      {/* SECCIÓN 1: DETALLES DE LA AUSENCIA */}
                      <div className="col-12 col-md-6" style={{ flex: '1 1 340px', borderRight: window.innerWidth > 768 ? '1px solid #f1f5f9' : 'none', paddingRight: '20px' }}>
                        <h6 className="fw-bold text-uppercase border-bottom pb-1" style={{ fontSize: '11px', letterSpacing: '0.7px', margin: '0 0 12px 0', borderBottom: '2px solid #cae855', paddingBottom: '6px', color: '#475569', fontWeight: '700' }}>
                          📌 Detalles del Permiso
                        </h6>
                        <ul className="list-unstyled mb-0 d-flex flex-column" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          <li style={{ marginBottom: '8px', fontSize: '13px' }}><strong>Modalidad:</strong> <span className="badge text-capitalize" style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', border: '1px solid #e2e8f0' }}>{permiso.ModalidadPermiso || 'N/A'}</span></li>
                          <li style={{ marginBottom: '8px', fontSize: '13px' }}><strong>Fecha Inicio:</strong> <span className="fw-semibold">{permiso.FechaInicio}</span></li>
                          <li style={{ marginBottom: '8px', fontSize: '13px' }}><strong>Fecha Fin:</strong> <span className="fw-semibold">{permiso.FechaFin}</span></li>
                          {permiso.PermisoHoraDesde && (
                            <li style={{ marginBottom: '8px', fontSize: '13px' }}><strong>Horario Ausencia:</strong> <span style={{ color: '#df4d4d', fontWeight: '700', backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>⏰ {permiso.PermisoHoraDesde} hasta {permiso.PermisoHoraHasta}</span></li>
                          )}
                          <li className="mt-2 p-2 rounded" style={{ marginTop: '12px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #b8d44b', border: '1px solid #e2e8f0', borderLeftWidth: '4px' }}>
                            <strong style={{ color: '#475569', fontSize: '12px' }}>Motivo / Justificación:</strong>
                            <p className="mb-0 text-muted italic mt-1" style={{ margin: '6px 0 0 0', color: '#64748b', fontStyle: 'italic', fontSize: '12.5px', lineHeight: '1.4' }}>{permiso.Motivo || 'Sin descripción.'}</p>
                          </li>


                        </ul>
                      </div>
                      {/* SECCIÓN 2: PLAN DE RECUPERACIÓN */}
                      <div className="col-12 col-md-6" style={{ flex: '1 1 340px' }}>
                        <h6 className="fw-bold text-uppercase border-bottom pb-1" style={{ fontSize: '11px', letterSpacing: '0.7px', margin: '0 0 12px 0', borderBottom: '2px solid #cae855', paddingBottom: '6px', color: '#475569', fontWeight: '700' }}>
                          🔄 Compensación / Recuperación
                        </h6>
                        <ul className="list-unstyled mb-0 d-flex flex-column" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          <li style={{ marginBottom: '8px', fontSize: '13px' }}><strong>Método:</strong> <span className="fw-semibold" style={{ color: '#0284c7', fontWeight: '600' }}>{permiso.MetodoRecuperacion || 'No aplica / No parametrizado'}</span></li>
                          {permiso.RecuperacionFechaDesde && (
                            <>
                              <li style={{ marginBottom: '8px', fontSize: '13px' }}><strong>Vigencia:</strong> Desde {permiso.RecuperacionFechaDesde} hasta {permiso.RecuperacionFechaHasta}</li>
                              <li style={{ marginBottom: '8px', fontSize: '13px' }}><strong>Horas asignadas:</strong> <span style={{ color: '#16a34a', fontWeight: '700', backgroundColor: '#f0fdf4', padding: '2px 6px', borderRadius: '4px' }}>⏰ {permiso.RecuperacionHoraDesde} - {permiso.RecuperacionHoraHasta}</span></li>
                            </>
                          )}
                          {permiso.RecuperacionObservacion && (
                            <li className="mt-2 p-2 rounded text-muted" style={{ marginTop: '12px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', color: '#64748b', border: '1px solid #e2e8f0' }}>
                              <strong style={{ color: '#475569', fontSize: '12px' }}>Notas Recuperación:</strong> {permiso.RecuperacionObservacion}
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* SECCIÓN 3: ADMINISTRACIÓN Y ADJUNTOS */}
                      <div className="col-12 border-top pt-3 mt-2" style={{ width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                        <div className="flex-grow-1" style={{ maxWidth: '70%', fontSize: '13px' }}>
                          <strong style={{ color: '#475569' }}>Comentarios de RRHH:</strong>
                          <span className="text-muted block-style ms-1" style={{ color: '#64748b', marginLeft: '6px' }}>
                            {permiso.ComentariosAdmin || 'Sin comentarios de revisión todavía.'}
                          </span>
                        </div>

                        <div className="flex-shrink-0">
                          {permiso.url_archivo ? (
                            <button
                              type="button"
                              className="btn btn-sm d-inline-flex align-items-center gap-2 fw-bold"
                              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #b8d44b', color: '#1e293b', backgroundColor: '#cae855', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
                              onClick={() => {
                                let urlFinal = permiso.url_archivo.trim();
                                if (!urlFinal.startsWith('http://') && !urlFinal.startsWith('https://')) {
                                  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
                                  const ruta = urlFinal.startsWith('/') ? urlFinal : `/${urlFinal}`;
                                  urlFinal = `${base}${ruta}`;
                                }
                                setPdfUrlSeleccionado(urlFinal);
                                setModalPdfOpen(true);
                              }}
                            >
                              📄 Ver Justificante en Sistema
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>📎 Sin justificativo adjunto</span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="modal-footer py-2" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
          <button type="button" className="btn fw-bold text-white" style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', backgroundColor: '#475569', border: 'none' }} onClick={handleCloseModalPermisos}>
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* ======================================================================== */}
{/* 2. MODAL FLOTANTE COMPLETAMENTE CENTRADO PARA VISUALIZAR EL PDF           */}

{modalPdfOpen && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.4)', /* Fondo oscuro limpio independiente */
    display: 'flex',
    justifyContent: 'center', 
    alignItems: 'center',     
    zIndex: 99999, /* Forzamos que quede al frente de todo */            
    padding: '20px',
    backdropFilter: 'none', /* Desactivamos herencia de difuminados */
    WebkitBackdropFilter: 'none'
  }}>
    <div style={{
      backgroundColor: '#ffffff',
      width: '90%',
      maxWidth: '950px',
      height: '85vh',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
      overflow: 'hidden',
      opacity: 1, /* Forzamos opacidad total de la tarjeta */
      filter: 'none' /* Cancelamos efectos heredados */
    }}>
      {/* Cabecera del Modal de PDF */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '15px 20px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc'
      }}>
        <h4 style={{ margin: 0, color: '#1e293b', fontWeight: '600', fontSize: '1rem' }}>
          📄 SIORET - Visualizador de Justificante Médico / Legal
        </h4>
        <button 
          type="button"
          onClick={() => {
            setModalPdfOpen(false);
            setPdfUrlSeleccionado('');
          }}
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '12px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
        >
          Cerrar ×
        </button>
      </div>

      {/* Cuerpo del Modal de PDF */}
      <div style={{ flex: 1, backgroundColor: '#475569', padding: '10px', filter: 'none' }}>
        <iframe 
          src={pdfUrlSeleccionado.includes('sharepoint.com') && !pdfUrlSeleccionado.includes('action=embedview')
            ? `${pdfUrlSeleccionado}&action=embedview` 
            : pdfUrlSeleccionado
          } 
          title="Visor Justificante PDF"
          width="100%" 
          height="100%" 
          style={{ 
            border: 'none', 
            borderRadius: '6px',  
            backgroundColor: '#ffffff',
            opacity: 1,
            filter: 'none'
          }}
          allow="autoplay"
        />
      </div>
    </div>
  </div>
)}
 
 {/* =================================================== */}
    {/* 2. MODAL DEL PDF (DEBE ESTAR TOTALMENTE AFUERA)     */}
    {/* =================================================== */}
    {modalPdfOpen && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        justifyContent: 'center', 
        alignItems: 'center',     
        zIndex: 9999, /* 🔥 Clave: Debe ser mayor a 1060 */
        backdropFilter: 'blur(3px)' 
      }}>
        {/* ... Contenido de tu visor de PDF con el iframe ... */}
      </div>
    )}

{showModal && (
  <div className="modal show d-block animate__animated animate__fadeIn animate__faster" tabIndex="-1" style={{ backgroundColor: 'rgba(23, 23, 27, 0.45)', zIndex: 1050, backdropFilter: 'blur(4px)' }}>
    <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '950px' }}>
      <div className="modal-content border-0 shadow-lg rounded-3">
        
        {/* Encabezado del Modal */}
        <div className="modal-header bg-light border-bottom px-4 py-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px' }}>
              <i className="bi bi-calendar-check" style={{ fontSize: '18px' }}>📅</i>
            </div>
            <div>
              <h5 className="modal-title m-0 fw-bold text-dark" style={{ fontSize: '16px', letterSpacing: '-0.3px' }}>
                Historial de Solicitudes de Vacaciones
              </h5>
              <small className="text-muted fw-semibold">
                Colaborador ID: <span className="badge bg-dark-subtle text-dark-emphasis px-2 rounded-pill">#{selectedEmpId || 'N/A'}</span>
              </small>
            </div>
          </div>
          <button type="button" className="btn-close shadow-none" onClick={handleCloseModal} aria-label="Close" style={{ fontSize: '13px' }}></button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="modal-body p-4" style={{ maxHeight: '65vh', overflowY: 'auto', backgroundColor: '#fdfdfd' }}>
          
          {loadingModal ? (
            <div className="text-center py-5">
              <div className="spinner-border text-danger" role="status" style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3px' }}></div>
              <p className="text-muted fw-medium mt-3" style={{ fontSize: '13px' }}>Sincronizando información con el servidor...</p>
            </div>
          ) : solicitudesVacaciones && solicitudesVacaciones.length > 0 ? (
            <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
              <div className="table-responsive">
                <table className="table table-hover table-striped mb-0 align-middle" style={{ fontSize: '12px' }}>
                  <thead style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                    <tr>
                      <th className="py-3" >ID</th>
                      <th className="py-3">Fecha Desde</th>
                      <th className="py-3">Fecha Hasta</th>
                      <th className="py-3 text-center">Nº Días</th>
                      <th className="py-3">Período</th>
                      <th className="py-3" style={{ minWidth: '180px' }}>Observación</th>
                      <th className="py-3 px-3 text-center" style={{ width: '170px' }}>Gestión de Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                 
     {solicitudesVacaciones.map((solicitud) => {
  // Configuración limpia y profesional del punto de color
  let dotColor = '#ffc107'; // 1 = Pendiente
  if (Number(solicitud.estado) === 2) dotColor = '#198754'; // 2 = Aprobado
  if (Number(solicitud.estado) === 3) dotColor = '#dc3545'; // 3 = Rechazado
  if (Number(solicitud.estado) === 4) dotColor = '#6c757d'; // 4 = Anulado

  return (
    <tr key={solicitud.id} className="align-middle">
      <td className="text-center fw-bold text-secondary px-3">{solicitud.id}</td>
      <td className="fw-semibold text-dark">
        {solicitud.fecha_desde ? new Date(solicitud.fecha_desde).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
      </td>
      <td className="fw-semibold text-dark">
        {solicitud.fecha_hasta ? new Date(solicitud.fecha_hasta).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
      </td>
      <td className="text-center">
        <span className="badge bg-light text-dark fw-bold border border-secondary-subtle px-2 py-1.5 rounded" style={{ fontSize: '11px' }}>
          {solicitud.num_dias ? parseFloat(solicitud.num_dias).toFixed(2) : '0.00'} días
        </span>
      </td>
      <td>
        <div className="fw-medium text-dark">{solicitud.nombre_mes || '—'}</div>
        <small className="text-muted text-uppercase" style={{ fontSize: '10px' }}>Año: {solicitud.num_año}</small>
      </td>
      <td>
        <div 
          className="text-secondary fw-normal" 
          style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11.5px' }} 
          title={solicitud.observacion}
        >
          {solicitud.observacion || <em className="text-muted opacity-50">Sin observaciones de registro</em>}
        </div>
      </td>
      <td className="px-3 text-center">
        {/* Selector Minimalista con Indicador de Color Lateral */}
        <div className="d-flex align-items-center position-relative">
          <span 
            className="position-absolute" 
            style={{ 
              left: '12px', 
              width: '8px', 
              height: '8px', 
              backgroundColor: dotColor, 
              borderRadius: '50%',
              boxShadow: `0 0 6px ${dotColor}`
            }}
          ></span>
          <select 
            className="form-select form-select-sm fw-bold border-secondary-subtle text-dark"
            style={{ 
              fontSize: '11.5px', 
              paddingLeft: '28px', 
              height: '32px',
              borderRadius: '6px',
              boxShadow: 'none',
              cursor: 'pointer',
              backgroundColor: '#ffffff'
            }}
            value={solicitud.estado || 1}
            onChange={(e) => handleEstadoChange(solicitud.id, e.target.value)}
          >
            <option value="1">⏳ Pendiente</option>
            <option value="2">✅ Aprobado</option>
            <option value="3">❌ Rechazado</option>
            <option value="4">🚫 Anulado</option>
          </select>
        </div>

        {/* CAJA DE OBSERVACIÓN DE RECHAZO (Visible solo cuando estado === 3) */}
        {Number(solicitud.estado) === 3 && (
          <div className="mt-2 p-2 bg-danger-subtle rounded border border-danger-subtle text-start" style={{ minWidth: '230px' }}>
            <label className="form-label fw-bold text-danger mb-1" style={{ fontSize: '10.5px' }}>
              ⚠️ Motivo de rechazo:
            </label>
            <div className="d-flex gap-1">
              <input
                type="text"
                className="form-control form-control-sm border-danger"
                style={{ fontSize: '11px' }}
                placeholder="Escribe el motivo..."
                value={observacionesRechazo[`vac-${solicitud.id}`] ?? solicitud.observacion_rechazo ?? ''}
                onChange={(e) =>
                  setObservacionesRechazo((prev) => ({
                    ...prev,
                    [`vac-${solicitud.id}`]: e.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="btn btn-sm btn-danger fw-bold px-2"
                style={{ fontSize: '11px' }}
                onClick={() =>
                  handleEstadoChange(
                    solicitud.id,
                    3,
                    observacionesRechazo[`vac-${solicitud.id}`] ?? solicitud.observacion_rechazo ?? ''
                  )
                }
              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
})}



                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-5 border rounded-3 bg-white shadow-sm">
              <span style={{ fontSize: '40px' }}>📁</span>
              <h6 className="text-dark fw-bold mt-3 mb-1">Sin historial disponible</h6>
              <p className="text-muted px-4" style={{ fontSize: '12px', maxWidth: '380px', margin: '0 auto' }}>
                Este colaborador actualmente no cuenta con solicitudes registradas en la base de datos de gestión humana.
              </p>
            </div>
          )}

        </div>

        {/* Pie del Modal */}
        <div className="modal-footer bg-light border-top px-4 py-2.5">
          <button type="button" className="btn btn-outline-secondary fw-semibold border-secondary-subtle px-4 py-1.5" onClick={handleCloseModal} style={{ fontSize: '12px', borderRadius: '6px' }}>
            Finalizar Revisión
          </button>
        </div>

      </div>
    </div>
  </div>
)}



                    </table>
                </div>
            </div>
                   
        </div>
    );
};




const estilosCompactos = {
  td: {
    textAlign: 'center', 
    verticalAlign: 'middle',
    padding: '4px',           // Espaciado mínimo para que la fila no sea alta
    position: 'relative'      // Permite posicionar el badge de forma óptima
  },
  inputTime: {
    width: '50px',            // Ancho justo y exacto para el formato HH:MM
    height: '28px',           // Altura reducida y compacta
    fontSize: '13px',         // Letra ligeramente más pequeña y legible
    textAlign: 'center',      // Centrado absoluto del texto
    backgroundColor: '#ccff67ff', 
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '0',             // Elimina rellenos que agrandan el campo
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer'
  },
  badgeOk: {
    color: '#ccff67ff',
    fontSize: '11px',
    fontWeight: 'bold',
    display: 'block',
    marginTop: '2px'
  }
};

const styles = {
  // ... tus otros estilos anteriores
  selectInput: {
    width: '100%',
    padding: '3px 2px',
    borderRadius: '4px',
    border: '1px solid #f8faf5ff',
    backgroundColor: '#c3ff6fff',
    fontSize: '13px'
  },

  pageBackground: { 
    backgroundColor: '#f8fafc', 
    minHeight: '10vh', 
    padding: '0rem 0rem' 
  },
  
  container: {
    width: '100%',
    maxWidth: '2030px',    /* Subimos un poco el ancho máximo para aprovechar mejor pantallas grandes */
    margin: '0 0 0 0 rem',  /* 👈 LA SOLUCIÓN: Quitamos el centrado automático (auto) y lo alineamos a la izquierda con un margen limpio */
    padding: '0 20px',     
    boxSizing: 'border-box'
  },
  
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.6rem', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { color: '#64748b', margin: 0 },
  badge: { backgroundColor: '#e2e8f0', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', color: '#475569', fontWeight: '600' },
  card: { backgroundColor: 'white', padding: '0rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '1.2rem' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.80rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.025em' },
  input: { padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.90rem', outline: 'none' },
  buttonContainer: { display: 'flex', gap: '12px' },
  
  btnPrimary: { backgroundColor: '#007bff', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  btnSecondary: { backgroundColor: '#dc3545', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnClonar: { padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  
  // 1. EL CONTENEDOR DE LA TABLA (Maneja el Scroll Horizontal)
  tableContainer: {
    width: '100%',            
    maxHeight: '650px',        /* Evita que la pantalla se vuelva infinitamente larga hacia abajo */
    overflowX: 'auto',        /* ¡CLAVE! Activa el desplazamiento lateral para las 22 columnas */
    overflowY: 'auto',        /* Activa el scroll vertical interno */
    position: 'relative',     
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  },



  tableCard: {
    overflow: 'auto',
    maxHeight: '850px', // Altura máxima para ver el scroll vertical de las filas
    maxWidth: '100%',   // Ancho completo para ver el scroll horizontal de las columnas
    position: 'relative',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  table: {
    width: 'max-content', // Evita que las columnas se colapsen y respeten los minWidth
    borderCollapse: 'separate', // ¡CRUCIAL! 'collapse' rompe el sticky en varios navegadores
    borderSpacing: 0
  },
  
  // 2. Cabecera congelada (Fila Superior)
  thSticky: {
    position: 'sticky',
    top: 0,
    zIndex: 10, // Por encima de los td de abajo
    backgroundColor: '#f8f9fa', // Color de fondo obligatorio para que no se trasluzca el texto al hacer scroll
    borderBottom: '2px solid #dee2e6',
  },

  // 3. Cabecera doble sticky (Fila superior e izquierda a la vez)
  thStickyBoth: {
    position: 'sticky',
    top: 0,
    zIndex: 20, // Mayor que las filas y mayor que las columnas comunes
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
  },

  // 4. Celdas del cuerpo congeladas (Columnas Izquierdas)
  tdSticky: {
    position: 'sticky',
    zIndex: 5,
    backgroundColor: '#ffffff', // Fondo sólido para tapar los datos que pasan por detrás
    boxShadow: '2px 0 5px rgba(0,0,0,0.05)', // Sombra sutil a la derecha para simular separación como Excel
  }
  ,

  // 3. ENCABEZADOS STICKY (Se quedan fijos arriba al hacer scroll hacia abajo)
  th: {
    position: 'sticky',
    top: 0,          
    zIndex: 10,      
    backgroundColor: '#f1f5f9', /* Forzamos color para que las celdas de abajo no se traslapen al subir */
    padding: '4px 3px', 
    fontSize: '0.70rem', 
    fontWeight: '700', 
    color: '#475569',
    textAlign: 'center',
    borderBottom: '2px solid #cbd5e1',
    borderRight: '1px solid #e2e8f0',
  },

  // 4. DISEÑO DE FILAS (Alternancia de color sutil)
  trEven: { backgroundColor: '#f8fafc' },
  trOdd: { backgroundColor: '#ffffff' },
  
  // 5. DISEÑO DE LAS CELDAS COMPACTAS (Evita saltos de línea desastrosos)
  td: {
    padding: '3px 4px',
    fontSize: '11px',
    color: '#334155',
    borderBottom: '1px solid #cbd5e1', 
    borderRight: '1px solid #f1f4f6',  
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',       /* Evita que los nombres o cargos se partan en 2 líneas */
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    textAlign: 'center'
  },

  // Componentes internos de celdas
  empContainer: {
    display: 'flex',
    flexDirection: 'column',   /* Pone el código/área abajo del nombre de forma ordenada */
    alignItems: 'flex-start',
    gap: '2px',              
  },
  empName: { fontWeight: '600', color: '#1e293b', fontSize: '11px' },
  empId: { fontSize: '10px', color: '#1763ceff' },
  dep: { fontWeight: '500', fontSize: '10px', color: '#64748b' },
  
  selectInline: { padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' },
  
  // Botones de acción minimalistas dentro de la tabla
  btnSuccess: {
    backgroundColor: '#baff2fff',
    color: '#1e293b',          /* Cambiado a oscuro para excelente contraste sobre amarillo-verde */
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnDanger: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '500',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }
};



export default Vacaciones;


