import React, { useState, useEffect, Fragment } from 'react';
import { API_BASE_URL } from '../../config'; 
import { ModalRfid } from './ModalRfid'; // Verifica que la ruta sea correcta
import { descargarReporteAvances, descargarReportePDF } from './reporteService';
import { toast } from 'sonner';
import { fetchWithFallback } from '../../config'; 
import { AlertTriangle } from 'lucide-react'; // Paquete oficial correcto
// 1. IMPORTACIÓN (Colócala arriba del todo en tu archivo principal de React)
import { ModalRfidLiberacion  } from './ModalRfid_liberacion'; // Revisa que la ruta relativa coincida

import { ModalRfidLiberacionlisto  } from './ModalRfid_liberacionlisto'; 


function Listar() { 

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

  // 1. OBTENER EL DÍA ACTUAL DINÁMICAMENTE EN FORMATO YYYY-MM-DD 
  const obtenerFechaActual = () => { 
    const hoy = new Date(); 
    const año = hoy.getFullYear(); 
    const mes = String(hoy.getMonth() + 1).padStart(2, '0'); 
    const dia = String(hoy.getDate()).padStart(2, '0'); 
    return `${año}-${mes}-${dia}`; 
  }; 

const [modalConflicto, setModalConflicto] = useState({
  isOpen: false,
  mensaje: '',
  duplicados: [],
  onConfirm: () => {}
});
const [soloSolidos, setSoloSolidos] = useState(false); // <
// 2. NUEVO ESTADO DE VISIBILIDAD (Colócalo junto a tus otros useState en la función Listar)
const [mostrarModalLiberacionLibre, setMostrarModalLiberacionLibre] = useState(false);
// Si el check está activo ponemos "SOLIDO", caso contrario "BOUQUET"
const valorTipo = soloSolidos ? "SOLIDO" : "BOUQUET";
// Estados para el control del modal de filtros del reporte
const [modalReporteTipo, setModalReporteTipo] = useState({ isOpen: false, formato: "" }); // 'EXCEL' o 'PDF'
const [tipoReporteSeleccionado, setTipoReporteSeleccionado] = useState("BOUQUET");
// Estado para alternar la visualización del botón de "Listo"
// Guarda el ID del producto que el usuario ha decidido expandir al hacer clic
const [idProductoAbierto, setIdProductoAbierto] = useState(null);

// Estados para almacenar la longitud y tallos seleccionados en el configurador
const [longitudSel, setLongitudSel] = useState(null);
const [tallosSel, setTallosSel] = useState(null);

// Filtro activo: puede ser 'TODOS', 'VENTA', 'PRODUCCION' o 'CREADOS'
const [filtroTipo, setFiltroTipo] = useState('TODOS');

const [mostrarModalLiberacionLibrelisto, setMostrarModalLiberacionLibrelisto] = useState(false);
const [departamento, setDepartamento] = useState(() => { 
  // Si tiene múltiples departamentos autorizados, permitimos iniciar en vacío (Todos)
  return user.deptosAutorizados.length > 1 ? '' : (user.deptosAutorizados[0] || ''); 
});

const [userId, setUserId] = useState(() => {
    const savedUser = localStorage.getItem("userData");
    return savedUser ? JSON.parse(savedUser).id : null;
});

// Ejemplo de estados en tu componente de React
const [productoSeleccionado, setProductoSeleccionado] = useState({
    id: 1, 
    nombre: "Helicóptero 1" // Este nombre cambiará dinámicamente
});

// Estado para saber si estamos visualizando los productos con transacciones asignadas
const [verAsignados, setVerAsignados] = useState(false);




  const [busquedaProducto, setBusquedaProducto] = useState(''); // Guarda lo que se escribe en tiempo real
  const [terminoBusqueda, setTerminoBusqueda] = useState('');   // CONGELA la búsqueda para el filtro final

  const [productosMostrados, setProductosMostrados] = useState([]); // Almacena la copia estática para renderizar

const [mesa, setMesa] = useState(""); // O el valor inicial que corresponda
const [helicoptero, setHelicoptero] = useState(""); // O el valor inicial que corresponda

// Estados para el Modal Interactivo de Anulación
const [modalAnulacion, setModalAnulacion] = useState({ isOpen: false, idTransaccion: null });
const [motivoAnulacionInput, setMotivoAnulacionInput] = useState("");

// Estado para Notificaciones Flotantes (Toasts)
const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: "", tipo: "success" });
// Estado para el modal de anulación completa de transacción
const [modalAnulacionCompleta, setModalAnulacionCompleta] = useState({ isOpen: false, idTransaccion: null });

  // ================= ESTADOS PARA BUSCADORES =================
  const [busqueda, setBusqueda] = useState(''); // <-- ESTA ES LA QUE FALTA (Para el modal de empleados)
// Este estado guardará el texto del departamento que se escriba en tiempo real
const [busquedaDepto, setBusquedaDepto] = useState('');
const [busquedaHelicoptero, setBusquedaHelicoptero] = useState('');

// Estado para controlar el modal visual de confirmación de distribución
const [modalConfirmarDistribucion, setModalConfirmarDistribucion] = useState({ isOpen: false, idHelicoptero: null, idMaquinariaManual: null });

  // Asignamos el día de hoy automáticamente como valor inicial 
  const [fechaDesde, setFechaDesde] = useState(obtenerFechaActual()); 
  const [fechaHasta, setFechaHasta] = useState(obtenerFechaActual()); 
  const [listaDepartamentos, setListaDepartamentos] = useState([]);
  // Estados para datos originales del sistema
  const [recetas, setRecetas] = useState([]); 
  const [cargando, setCargando] = useState(false); 
  const [rendimiento, setRendimiento] = useState([]); 
  const [estadosGuardado, setEstadosGuardado] = useState({});
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null); 
  const [cargandoDetalle, setCargandoDetalle] = useState(false); 

  // NUEVOS ESTADOS PARA LA TERCERA COLUMNA (TAGS TIMBRADOS)
  const [tags, setTags] = useState([]);
  const [cargandoTags, setCargandoTags] = useState(false);
  const [transaccionSeleccionada, setTransaccionSeleccionada] = useState(null);

  // ================= ESTADOS PARA EL MODAL DE EMPLEADOS =================
const [mostrarModal, setMostrarModal] = useState(false);
const [empleados, setEmpleados] = useState([]);
const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]); // Guarda los IDs seleccionados
const [asignando, setAsignando] = useState(false);

// Controla si el modal con el formulario de creación está abierto o cerrado
const [mostrarModalCrear, setMostrarModalCrear] = useState(false);

// Almacena en tiempo real lo que el operario escribe en los campos del formulario
const [nuevoSku, setNuevoSku] = useState({
  p_id: '',
  nombre: '',
  estadovisual: 'Activo'
});


// ================= ESTADOS PARA EL MODAL RFID =================
const [mostrarModalRfid, setMostrarModalRfid] = useState(false);
const [transaccionParaRfid, setTransaccionParaRfid] = useState(null);
const [busquedaTipoProducto, setBusquedaTipoProducto] = useState('');



const [busquedaMesa, setBusquedaMesa] = useState('');
const [busquedaId, setBusquedaId] = useState('');

const [mostrarModalRevision, setMostrarModalRevision] = useState(false);
const [datosRevision, setDatosRevision] = useState([]);
const [cargandoRevision, setCargandoRevision] = useState(false);

const [filtroEstadoModal, setFiltroEstadoModal] = useState('Pendiente'); // 'Pendiente' o 'Anulado'


const obtenerRevisionTags = () => {
  setMostrarModalRevision(true);
  setCargandoRevision(true);
  
  // Petición directa sin parámetros de fecha
  fetch(`${API_BASE_URL}/api/RFID/transacciones_tags`)
    .then(response => {
      if (!response.ok) throw new Error('Error al recuperar la revisión de tags');
      return response.json();
    })
    .then(data => {
      setDatosRevision(data);
      setCargandoRevision(false);
    })
    .catch(error => {
      console.error('Error:', error);
      // Usamos tu función nativa de notificación que limpia el estado a los 4 segundos
      mostrarNotificacionToast('Ocurrió un error al traer la revisión de tags.', 'error');
      setCargandoRevision(false);
    });
};





const mostrarNotificacionToast = (mensaje, tipo = "success") => {
  setNotificacion({ mostrar: true, mensaje, tipo });
  setTimeout(() => {
    setNotificacion({ mostrar: false, mensaje: "", tipo: "success" });
  }, 4000);
};
// Cambia esto en tus líneas 94 a 96:
const [fechaDesdeReporte, setFechaDesdeReporte] = useState('');
const [fechaHastaReporte, setFechaHastaReporte] = useState('');
const [cargandoReporte, setCargandoReporte] = useState(false);


// 1. Asegúrate de tener este import arriba del todo en tu archivo rfid.js:
// import * as XLSX from 'xlsx';

// Función para disparar la descarga de Excel
// 1. Abre el modal para Excel
const manejarDescargaReporte = () => {
  if (!fechaDesdeReporte || !fechaHastaReporte) {
    alert("Por favor, selecciona un rango de fechas para el reporte.");
    return;
  }
  setModalReporteTipo({ isOpen: true, formato: "EXCEL" });
};

// 2. Abre el modal para PDF
const manejarDescargaPDF = () => {
  if (!fechaDesdeReporte || !fechaHastaReporte) {
    alert("Por favor, selecciona un rango de fechas para el reporte.");
    return;
  }
  setModalReporteTipo({ isOpen: true, formato: "PDF" });
};

// 3. Ejecuta la descarga real llamando a tu otro JS (reporteService.js) pasando el tipo
const procesarDescargaConTipo = async () => {
  const formato = modalReporteTipo.formato;
  
  // Cerramos el modal inmediatamente y activamos el spinner de carga
  setModalReporteTipo({ isOpen: false, formato: "" });
  setCargandoReporte(true);

  try {
    if (formato === "EXCEL") {
      // Llama a la función del archivo externo pasando el nuevo parámetro
      await descargarReporteAvances(fechaDesdeReporte, fechaHastaReporte, tipoReporteSeleccionado);
    } else if (formato === "PDF") {
      // Llama a la función del archivo externo pasando el nuevo parámetro
      await descargarReportePDF(fechaDesdeReporte, fechaHastaReporte, tipoReporteSeleccionado);
    }
  } catch (error) {
    console.error(`Error al gatillar el ${formato}:`, error);
  } finally {
    setCargandoReporte(false);
  }
};




// 1. Esta función ahora solo abre el modal visual en vez del window.confirm
const ejecutarDistribucionEquitativa = async (idMaquinariaManual = null) => {
  if (rendimiento.length === 0) {
    mostrarNotificacionToast("No hay registros de rendimiento para distribuir.", "error");
    return;
  }

  const idHelicopteroActivo = helicoptero || idMaquinariaManual || rendimiento?.id_maquina || '0';
  
  // Abrimos el modal interactivo pasando las variables necesarias
  setModalConfirmarDistribucion({ 
    isOpen: true, 
    idHelicoptero: idHelicopteroActivo, 
    idMaquinariaManual 
  });
};

// 2. Esta función ejecuta el proceso real al dar clic en "Sí, Distribuir"
const confirmarYEjecutarDistribucion = async () => {
  const { idHelicoptero, idMaquinariaManual } = modalConfirmarDistribucion;
  
  // Cerramos el modal inmediatamente para una experiencia fluida
  setModalConfirmarDistribucion({ isOpen: false, idHelicoptero: null, idMaquinariaManual: null });
  setCargando(true); // Activa el overlay de carga profesional de tu pantalla

  try {
    const payload = {
      id_maquina: idHelicoptero,
      cod_producto: recetaSeleccionada?.p_id,
      fecha: fechaDesde,
      transacciones: rendimiento.map(item => ({
        id_transaccion: item.id,
        cod_empleado: item.cod_empledo
      }))
    };

    const response = await fetch(`${API_BASE_URL}/api/RFID/distribuir_tags_equitativo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al procesar la distribución en el servidor.');
    }

    // 🔔 NOTIFICACIÓN INTERACTIVA DE ÉXITO
    mostrarNotificacionToast(data.message || "¡Tags distribuidos correctamente!", "success");
    
    obtenerRendimientoProducto(recetaSeleccionada);
  } catch (error) {
    console.error("Error en la distribución:", error);
    // 🔔 NOTIFICACIÓN INTERACTIVA DE ERROR
    mostrarNotificacionToast(error.message || "Hubo un problema al distribuir los tags.", "error");
  } finally {
    setCargando(false);
  }
};


const obtenerSoloConTransacciones = () => { 
  setCargando(true); 
  setVerAsignados(true); 
 
  // Determinamos el tipo dinámicamente usando la variable que ya tienes definida
  // o directamente evaluando: soloSolidos ? "SOLIDO" : "BOUQUET"
  const tipoActual = soloSolidos ? "SOLIDO" : "BOUQUET";

  fetch(`${API_BASE_URL}/api/DARTIS/ventas_recetas_con_transacciones?desde=${fechaDesde}&hasta=${fechaHasta}&tipo=${tipoActual}`) 
   .then(response => { 
     if (!response.ok) throw new Error('Error al recuperar los productos filtrados'); 
     return response.json(); 
   }) 
   .then(data => { 
     setRecetas(data); 
     setProductosMostrados(data); 
     setCargando(false); 
   }) 
   .catch(error => { 
     console.error('Error:', error); 
     alert('Ocurrió un error al traer los productos con transacciones.'); 
     setCargando(false); 
   }); 
};




  // ================= FUNCIONES PARA EL MODAL =================
  const manejarSeleccionEmpleado = (idEmpleado) => {
    if (empleadosSeleccionados.includes(idEmpleado)) {
      // Si el empleado ya estaba en la lista, lo removemos (desmarcar)
      setEmpleadosSeleccionados(empleadosSeleccionados.filter(id => id !== idEmpleado));
    } else {
      // Si no estaba, lo agregamos al array (marcar)
      setEmpleadosSeleccionados([...empleadosSeleccionados, idEmpleado]);
    }
  };




  const anularTransaccionSinTags = async (idTransaccion) => {

  if (!idTransaccion) return;
  setModalAnulacionCompleta({ isOpen: true, idTransaccion });
};

// 2. Ejecuta la petición al backend si el usuario confirma de forma visual
const ejecutarAnulacionCompletaSinTags = async () => {
  const idTransaccion = modalAnulacionCompleta.idTransaccion;
  if (!idTransaccion) return;

  // Cerramos el modal inmediatamente y activamos el cargando principal
  setModalAnulacionCompleta({ isOpen: false, idTransaccion: null });
  setCargando(true);

  try {
    const response = await fetch(`${API_BASE_URL}/api/DARTIS/anular_transaccion_rendimiento`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_transaccion: idTransaccion,
        usuario_modif: userId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al intentar anular la transacción.');
    }

    const data = await response.json();
    
    // 🔔 NOTIFICACIÓN INTERACTIVA DE ÉXITO
    mostrarNotificacionToast(data.message || "Transacción anulada con éxito.", "success");

    if (recetaSeleccionada) {
      obtenerRendimientoProducto(recetaSeleccionada);
    }
  } catch (error) {
    console.error("Error al anular transacción sin tags:", error);
    // 🔔 NOTIFICACIÓN INTERACTIVA DE ERROR
    mostrarNotificacionToast(error.message || "Hubo un problema al anular.", "error");
  } finally {
    setCargando(false);
  }
};


const manejarCrearSku = async (e) => {
  e.preventDefault(); // Evita que la pantalla se recargue al procesar el formulario

  // 1. Validaciones básicas de seguridad para cadenas de texto
  if (!nuevoSku.p_id || !nuevoSku.p_id.trim() || !nuevoSku.nombre || !nuevoSku.nombre.trim()) {
    toast.error("Por favor, completa el ID y el Nombre.");
    return;
  }

  setCargando(true); 

  try {
    // 2. ESTRUCTURA EXACTA: Armamos el payload simulando el objeto esperado por la base de datos
    const payload = {
      p_id: nuevoSku.p_id.trim(),
      nombre: nuevoSku.nombre.trim(),
      fecha_creacion: new Date().toISOString(), // Formato estricto compatible con sql.DateTime
      usuario_creacion: String(userId || '1'),   // Toma el ID limpio del operario en el sistema
      estadovisual: nuevoSku.estadovisual || 'Activo' // 'Activo' o 'Inactivo' mapeado desde el select
    };

    // 3. Petición HTTP POST hacia tu API definitiva
    const response = await fetch(`${API_BASE_URL}/api/RFID/registrarsku`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload) // Convertimos el objeto idéntico al backend en texto JSON
    });

    const textData = await response.text();
    let data = {};
    if (textData) {
      data = JSON.parse(textData);
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Error al registrar el SKU');
    }

    // 4. Flujo de éxito tras confirmación positiva del backend
    toast.success("¡SKU registrado con éxito!");
    
    // Ocultar modal (Soporte híbrido: Funciona con estado o con ID nativo)
    if (typeof setMostrarModalCrear === 'function') {
      setMostrarModalCrear(false);
    }
    const modalElement = document.getElementById('mi-modal-crear');
    if (modalElement) modalElement.style.display = 'none';

    // Limpiar campos para evitar duplicaciones accidentales en el próximo uso
    setNuevoSku({ p_id: '', nombre: '', estadovisual: 'Activo' });

    // Refrescar lista de productos en tiempo real
    if (typeof obtenerDatosFiltrados === 'function') {
      obtenerDatosFiltrados();
    }

  } catch (error) {
    console.error("Error al crear registro:", error);
    toast.error(`No se pudo crear: ${error.message}`);
  } finally {
    setCargando(false); 
  }
};


// 1. FUNCIÓN QUE GATILLA EL BOTÓN (Mantén el mismo nombre que usas en tu botón)
const guardarTagsAsignados = (idTransaccion, listaDeTags) => {
  if (!listaDeTags || listaDeTags.length === 0) {
    console.warn("⚠️ No hay tags capturados para asignar.");
    return;
  }

  // Despega la ejecución limpia inicial con la bandera en false
  ejecutarPeticionGuardarRfid(idTransaccion, listaDeTags, false);
};

// 2. NUEVA FUNCIÓN INDEPENDIENTE (Saca la lógica asíncrona al nivel del componente)
const ejecutarPeticionGuardarRfid = async (idTransaccion, listaDeTags, confirmarSobrescribir = false) => {
  const payload = { 
    id_transaccion: idTransaccion, 
    tags: listaDeTags, 
    usuario_creacion: userId,
    confirmar_sobrescribir: confirmarSobrescribir
  }; 

  console.log("🚀 Enviando datos al servidor...", payload); 

  try {
    const res = await fetch(`${API_BASE_URL}/api/RFID/guardar_tags`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    }); 

    console.log(`📡 Respuesta del servidor recibida. Status: ${res.status} (${res.statusText})`); 

    // --- INTERCEPCIÓN PARA DUPLICADOS (409) --- 
    if (res.status === 409) { 
      const errorData = await res.json().catch(() => ({})); 
      console.log("⚠️ Conflicto 409 detectado. Datos del error:", errorData); 
      
      const mensajeError = errorData.error || "Se detectaron tags en estado 'Pendiente' en el lote actual."; 
      const tagsDuplicados = errorData.duplicados || []; 
      
      // Forzamos la apertura del modal en el hilo principal de React
      setModalConflicto({ 
        isOpen: true, 
        mensaje: mensajeError, 
        duplicados: tagsDuplicados, 
        onConfirm: async () => { 
          console.log("🔄 El usuario aceptó sobrescribir. Re-intentando operación..."); 
          setModalConflicto(prev => ({ ...prev, isOpen: false })); // Cerramos el modal
          
          // Re-intentamos llamando a la función externa pasando la bandera en true
          await ejecutarPeticionGuardarRfid(idTransaccion, listaDeTags, true); 
        } 
      }); 
      return; // Bloquea la continuación para que no arroje alertas secundarias
    } 

    // --- SI NO ES 409 PERO TAMPOCO ES OK (400, 500) --- 
    if (!res.ok) { 
      const errorData = await res.json().catch(() => ({})); 
      console.error("❌ Detalles del error del backend:", errorData); 
      throw new Error(errorData.error || 'Error al guardar los tags en el servidor'); 
    } 
    
    // --- RESPUESTA EXITOSA (200 OK) --- 
    const data = await res.json(); 
    console.log("✅ Respuesta exitosa del servidor:", data); 
    
    toast.success("¡Tags asignados con éxito en la base de datos!"); 
    setMostrarModalRfid(false); 
    
    if (recetaSeleccionada) { 
      obtenerRendimientoProducto(recetaSeleccionada); 
    } 
  } catch (error) { 
    console.error("💥 Error capturado en el bloque catch:", error); 
    toast.error(`Hubo un problema al guardar los tags: ${error.message}`); 
  } 
};



const anularTagsPendientes = async (idTransaccion) => {
  if (!idTransaccion) return;
  setMotivoAnulacionInput(""); // Limpiamos texto anterior
  setModalAnulacion({ isOpen: true, idTransaccion });
};

const confirmarAnulacionTags = async () => {
  const { idTransaccion } = modalAnulacion;
  if (motivoAnulacionInput.trim().length < 10) return;

  // Cerramos modal de entrada de datos para evitar doble clic
  setModalAnulacion({ isOpen: false, idTransaccion: null });
  setCargandoTags(true); // Activa la barra/spinner de carga que ya tienes en la columna derecha

  try {
    const response = await fetch(`${API_BASE_URL}/api/RFID/anular_tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({
        id_transaccion: idTransaccion,
        usuario_modif: userId,
        motivo_anulacion: motivoAnulacionInput.trim()
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al intentar anular los tags.');
    }

    const data = await response.json();
    
    // NOTIFICACIÓN INTERACTIVA DE ÉXITO
    mostrarNotificacionToast(data.message || "Tags anulados con éxito.", "success");

    if (typeof obtenerRendimientoTags === 'function') {
      obtenerRendimientoTags(idTransaccion);
    }
  } catch (error) {
    console.error("Error al anular:", error);
    // NOTIFICACIÓN INTERACTIVA DE ERROR
    mostrarNotificacionToast(error.message || "Hubo un problema al anular los tags.", "error");
  } finally {
    setCargandoTags(false);
  }
};



  // ================= FUNCIONES PARA EL MODAL =================
   const abrirModalEmpleado = () => {
  // === NUEVA VALIDACIÓN COMPLETA ANTES DE ABRIR EL MODAL ===
  // Si NO es sólido, validamos obligatoriamente que bqt_x_hora sea mayor a cero
  if (!soloSolidos) {
    const bqtHora = parseFloat(recetaSeleccionada?.bqt_x_hora) || 0;
    
    if (bqtHora <= 0) {
      // Muestra la alerta elegante en pantalla y cancela la apertura del modal
      toast.error("No se puede asignar: Para productos no sólidos, 'Tallos por Hora' (bqt_x_hora) debe ser mayor a cero.");
      return; // Detiene la ejecución por completo
    }
  }
  // =========================================================
   setMostrarModal(true); 
   setCargandoEmpleados(true); 
   setEmpleadosSeleccionados([]); 
   setBusqueda(''); 
   setBusquedaDepto(''); 
   setBusquedaHelicoptero(''); // Limpia helicóptero si no estaba
   setBusquedaMesa('');      // 💡 NUEVO: Limpia el buscador de mesa
   setBusquedaId('');        // 💡 NUEVO: Limpia el buscador de ID
   
   fetch(`${API_BASE_URL}/api/DARTIS/Lista_empleados`) 
     .then(response => response.json())
     .then(data => { 
       setEmpleados(data); 
       setCargandoEmpleados(false); 
     })
     .catch(error => { 
       console.error('Error al obtener empleados:', error); 
       setCargandoEmpleados(false); 
     }); 
 }; 

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


  // Consulta 1: Trae el rendimiento del producto al dar clic en la lista izquierda (Columna Central)
  const obtenerRendimientoProducto = (receta) => { 
    setRecetaSeleccionada(receta); 
    setCargandoDetalle(true); 
    
    // Limpiamos la columna derecha al cambiar de receta para mantener el orden
    setTags([]);
    setTransaccionSeleccionada(null);

    fetch(`${API_BASE_URL}/api/DARTIS/rendimiento_producto?desde=${fechaDesde}&hasta=${fechaHasta}&cod_producto=${receta.p_id}`) 
      .then(response => response.json()) 
      .then(data => { 
        setRendimiento(data); 
        setCargandoDetalle(false); 
      }) 
      .catch(error => { 
        console.error('Error al obtener rendimiento:', error); 
        setCargandoDetalle(false); 
      }); 
  }; 

  // NUEVA CONSULTA 2: Trae los tags desde tu nueva API al dar clic en la columna central (Columna Derecha)
  const obtenerRendimientoTags = (idTransaccion) => {
    if (!idTransaccion) return;
    setTransaccionSeleccionada(idTransaccion);
    setCargandoTags(true);

    fetch(`${API_BASE_URL}/api/DARTIS/rendimiento_tag?idtransaccion=${idTransaccion}`)
      .then(response => response.json())
      .then(data => {
        setTags(data);
        setCargandoTags(false);
      })
      .catch(error => {
        console.error('Error al obtener rendimiento TAGS:', error);
        setCargandoTags(false);
      });
  };


const obtenerDatosFiltrados = () => {
  setCargando(true);
  setVerAsignados(false); // <-- AGREGA ESTA LÍNEA AQUÍ para reactivar el botón

  // Decidimos dinámicamente qué endpoint usar según el estado del checkbox
  const endpoint = soloSolidos ? 'ventas_recetas_solidos' : 'ventas_recetas';
  
  fetch(`${API_BASE_URL}/api/DARTIS/${endpoint}?desde=${fechaDesde}&hasta=${fechaHasta}`)
    .then(response => {
      if (!response.ok) throw new Error('Error al recuperar datos del servidor');
      return response.json();
    })
    .then(data => {
      setRecetas(data);
      setProductosMostrados(data); // Actualiza la copia estática inicial
      setCargando(false);
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Ocurrió un error al cargar las recetas.');
      setCargando(false);
    });
};




 
useEffect(() => {
  // Limpiamos la sección de productos inmediatamente al cambiar de departamento 
  setRecetas([]); 
  setProductosMostrados([]); 
  setRecetaSeleccionada(null); 
  setVerAsignados(false); 
  
  if (departamento === "Postcosecha BQT") { 
    setSoloSolidos(false); 
  } else { 
    setSoloSolidos(true); 
  }
}, [departamento]);


const ejecutarAsignacion = () => {
  if (empleadosSeleccionados.length === 0) {
    alert("Por favor, selecciona al menos un empleado.");
    return;
  }

  setAsignando(true);
  
  // 1. Mapeamos los IDs seleccionados para transformarlos en objetos
  const empleadosConNombre = empleadosSeleccionados.map(idSeleccionado => {
    const datosEmpleado = empleados.find(e => e.codemp === idSeleccionado);
    return {
      id: idSeleccionado,
      nombre: datosEmpleado ? datosEmpleado.nombre : 'Empleado Sin Nombre',
      mesa: datosEmpleado ? datosEmpleado.mesa : '0',
      helicoptero: datosEmpleado ? datosEmpleado.helicoptero : '0'
    };
  });

  // 2. BUSCAR EL HELICOPTERO DEL PRIMER EMPLEADO SELECCIONADO
  const primerEmpleado = empleados.find(e => e.codemp === empleadosSeleccionados[0]);
  const helicopteroDetectado = primerEmpleado ? (primerEmpleado.helicoptero || '0') : '0';

  // ================= NUEVA LÓGICA PARA EL CAMPO TIPO =================
  // Si el check está activo ponemos "SOLIDO", caso contrario "Activo"
  const valorTipo = soloSolidos ? "SOLIDO" : "BOUQUET";
  // ===================================================================

  const payload = {
    cod_empleado: empleadosConNombre,
    cod_producto: recetaSeleccionada?.p_id,
    fecha_asignacion: fechaDesde,
    nombre: recetaSeleccionada?.nombre,
    mesa: mesa,
    helicoptero: helicopteroDetectado, 
    bqt_x_hora: recetaSeleccionada?.bqt_x_hora,
    tipo: valorTipo // <-- AQUÍ SE AGREGA EL NUEVO CAMPO AL PAYLOAD
  };

  console.log("Valor enviado en 'tipo':", payload.tipo);
  console.log("Valor enviado en 'helicoptero':", payload.helicoptero);
  console.log("Valor enviado en 'mesa':", mesa);

  fetch(`${API_BASE_URL}/api/DARTIS/asignar_empleados_transaccion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) throw new Error('Error en el servidor');
    return response.json();
  })
  .then(data => {
    mostrarNotificacionToast("¡Empleados asignados correctamente al producto!", "success");
    setMostrarModal(false);
    setAsignando(false);
    if (recetaSeleccionada) {
      obtenerRendimientoProducto(recetaSeleccionada);
    }
  })
  .catch(error => {
    console.error('Error al asignar:', error);
    alert('Ocurrió un error al procesar la asignación.');
    setAsignando(false);
  });
};



// 🔄 Coloca este estado arriba con tus otros useState
const [guardandoPuestos, setGuardandoPuestos] = useState({});


const actualizarPuestoHelicoptero = async (idTransaccion, nuevoValor, nombreCampo = 'puesto_maquina') => {
  const celdaKey = `${idTransaccion}-${nombreCampo}`;
  setGuardandoPuestos(prev => ({ ...prev, [celdaKey]: 'cargando' }));

  try {
    const bodyData = { id_transaccion: idTransaccion };

    // 🛠️ Mapeamos la propiedad exacta según el campo editado
    switch (nombreCampo) {
      case 'puesto_maquina':
        bodyData.puesto_maquina = parseInt(nuevoValor, 10) || 0;
        break;
      case 'hora_entrada':
        bodyData.hora_entrada = nuevoValor;
        break;
      case 'hora_salida':
        bodyData.hora_salida = nuevoValor;
        break;
      case 'hora_almuerzo': // 🌟 Añadido para dar soporte a la nueva columna
        bodyData.hora_almuerzo = nuevoValor;
        break;
        case 'id_maquina': // 
        bodyData.id_maquina = nuevoValor;
        break;
        
      default:
        throw new Error("Campo de actualización no reconocido en el Frontend");
    }

    const respuesta = await fetch(`${API_BASE_URL}/api/DARTIS/actualizar_puesto`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.error || 'No se pudo actualizar el registro en el servidor');
    }
    
    // ✨ ACTUALIZACIÓN INMEDIATA DEL ESTADO LOCAL
    setRendimiento(prevRendimiento => 
      prevRendimiento.map(item => 
        item.id === idTransaccion ? { ...item, [nombreCampo]: nuevoValor } : item
      )
    );

    setGuardandoPuestos(prev => ({ ...prev, [celdaKey]: 'exito' }));

    setTimeout(() => {
      setGuardandoPuestos(prev => { const copia = { ...prev }; delete copia[celdaKey]; return copia; });
    }, 2000);

  } catch (error) {
    console.error('❌ Error al actualizar el registro:', error);
    alert(error.message || 'Ocurrió un error al guardar los cambios.');
    setGuardandoPuestos(prev => { const copia = { ...prev }; delete copia[celdaKey]; return copia; });
  }
};



   
  
    return ( 
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Arial, sans-serif' }}> 
 
      {/* ================= BARRA SUPERIOR: Filtros de Fecha ================= */} 
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '10px 15px', backgroundColor: '#fff', borderBottom: '1px solid #ccc' }}>
 

     
{/* ================= BARRA SUPERIOR PRINCIPAL EN LÍNEA ================= */}
<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '20px', padding: '10px 15px', backgroundColor: '#ffffff', borderBottom: '1px solid #ccc', flexWrap: 'wrap' }}>
  
   {/* 4. FILTRO DEPARTAMENTO  */}
 <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}> 
   <label style={{ fontWeight: 'bold', marginBottom: '2px' }}>📂 Depto:</label> 
    <select 
   style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', height: '24px', boxSizing: 'border-box' }} 
      value={departamento} 
      onChange={(e) => setDepartamento(e.target.value)} 
    > 
      <option value="">Todos los departamentos</option> 
      {listaDepartamentos 
      .filter(dep => { 
        const nombreDep = dep.nombre || dep.departamento; 
        return user.deptosAutorizados.length === 0 || user.deptosAutorizados.includes(nombreDep); 
      }) 
      .map((dep, index) => ( 
        <option key={index} value={dep.nombre || dep.departamento}> 
          {dep.nombre || dep.departamento} 
        </option> 
      )) 
      } 
    </select> 
  </div> 
  
  {/* INPUT DESDE */} 
  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}> 
    <label style={{ fontWeight: 'bold', marginBottom: '2px' }}>Fecha Desde:</label> 
    <input 
      type="date" 
      value={fechaDesde} 
      onChange={(e) => {
        const nuevaFecha = e.target.value;
        setFechaDesde(nuevaFecha);
        setFechaHasta(nuevaFecha); 
      }} 
      style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', height: '24px', boxSizing: 'border-box' }} 
    /> 
  </div> 

  {/* INPUT HASTA */} 
  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}> 
    <label style={{ fontWeight: 'bold', marginBottom: '2px' }}>Fecha Hasta:</label> 
    <input 
      type="date" 
      value={fechaHasta} 
      onChange={(e) => {
        const nuevaFecha = e.target.value;
        setFechaHasta(nuevaFecha);
        setFechaDesde(nuevaFecha); 
      }} 
      style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', height: '24px', boxSizing: 'border-box' }} 
    /> 
  </div> 

  {/* BOTÓN ASIGNAR EMPLEADO */} 

<button
  onClick={abrirModalEmpleado}
  // Se deshabilita si no hay receta seleccionada O si estamos viendo "PRODUCTOS ASIGNADOS"
  disabled={!recetaSeleccionada || verAsignados}
  style={{
    padding: '10px 12px',
    // Cambia el cursor a no-permitido si cumple cualquiera de las dos condiciones
    cursor: (!recetaSeleccionada || verAsignados) ? 'not-allowed' : 'pointer',
    backgroundColor: (!recetaSeleccionada || verAsignados) ? '#cccccc' : '#d2eb64',
    border: (!recetaSeleccionada || verAsignados) ? '1px solid #aaaaaa' : '1px solid #b7d142',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: (!recetaSeleccionada || verAsignados) ? '#666666' : '#000000',
    opacity: (!recetaSeleccionada || verAsignados) ? 0.6 : 1,
    transition: 'all 0.1s ease',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}
  title={
    verAsignados 
      ? "No se pueden asignar empleados a productos que ya tienen transacciones"
      : !recetaSeleccionada 
        ? "Selecciona primero un producto del listado izquierdo" 
        : "Asignar empleados al producto activo"
  }
>
  ASIGNAR EMPLEADO
</button>

  {/* CONTENEDOR INTERNO DE FILTROS Y ACCIONES DEL REPORTE */}
  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '8px', borderLeft: '1px solid #ddd', paddingLeft: '15px' }}>
    
    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '11px', color: '#555' }}>
      <label style={{ fontWeight: 'bold', marginBottom: '2px' }}>Filtros Reporte:</label>
      <div style={{ display: 'flex', gap: '5px' }}>
        {/* Input Desde para Reporte */}
        <input 
          type="date" 
          value={fechaDesdeReporte} 
          onChange={(e) => setFechaDesdeReporte(e.target.value)} 
          style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', height: '24px', boxSizing: 'border-box' }}
        />
        {/* Input Hasta para Reporte */}
        <input 
          type="date" 
          value={fechaHastaReporte} 
          onChange={(e) => setFechaHastaReporte(e.target.value)} 
          style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', height: '24px', boxSizing: 'border-box' }}
        />
      </div>
    </div>

    {/* Botón Excel */}
    <button
      onClick={manejarDescargaReporte}
      disabled={cargandoReporte}
      style={{
        padding: '0px 12px',
        cursor: cargandoReporte ? 'not-allowed' : 'pointer',
        backgroundColor: '#d2eb64', 
        color: 'black',
        border: 'none',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        opacity: cargandoReporte ? 0.6 : 1,
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {cargandoReporte ? 'PROCESANDO...' : 'EXCEL'}
    </button>

    {/* Botón PDF */}
    <button
      onClick={manejarDescargaPDF}
      disabled={cargandoReporte}
      style={{
        padding: '0px 12px',
        cursor: cargandoReporte ? 'not-allowed' : 'pointer',
        backgroundColor: '#ff4356', 
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        opacity: cargandoReporte ? 0.6 : 1,
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {cargandoReporte ? 'PROCESANDO...' : 'PDF'}
    </button>

  </div>

  
{/* CONTENEDOR DE BOTONES DE ACCIÓN COMPACTOS */}
<div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
  
  {/* BOTÓN REVISIÓN DE TAGS */}
  <button
    onClick={obtenerRevisionTags}
    style={{
      padding: '0px 12px',
      cursor: 'pointer',
      backgroundColor: '#2b6cb0',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 'bold',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.2s'
    }}
    title="Revisar tags en estado Pendiente, Anulado o Devuelto en el sistema"
  >
    REVISIÓN DE TAGS
  </button>


{/* BOTÓN LIBERAR TAGS */}
<button
  onClick={() => setMostrarModalLiberacionLibre(true)}
  style={{
    padding: '0px 12px',
    cursor: 'pointer',
    backgroundColor: '#b95d1cff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.1s ease',
    marginLeft: '5px'
  }}
  onMouseOver={(e) => e.target.style.backgroundColor = '#b95d1cff'}
  onMouseOut={(e) => e.target.style.backgroundColor = '#b95d1cff'}
  title="Abrir la interfaz de lectura del hardware para liberar o capturar tags mediante el dispositivo RFID"
>
  ANULAR TAGS
</button>



{/* BOTÓN LIBERAR TAGS */}
<button
  onClick={() => setMostrarModalLiberacionLibrelisto(true)}
  style={{
    padding: '0px 12px',
    cursor: 'pointer',
    backgroundColor: '#92b91c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.1s ease',
    marginLeft: '5px'
  }}
  onMouseOver={(e) => e.target.style.backgroundColor = '#7fa217'}
  onMouseOut={(e) => e.target.style.backgroundColor = '#92b91c'}
  title="Abrir la interfaz de lectura del hardware para liberar o capturar tags mediante el dispositivo RFID"
>
  LIBERAR TAGS
</button>


</div>

  

</div>


          
      </div> 




        {/* CONTENEDOR DE BOTONES JUNTOS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
  
{/* CONTENEDOR DE BOTONES JUNTOS */} 
<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}> 
 

 {/* ================= MODAL EMERGENTE DE EMPLEADOS CON BUSCADOR ================= */} 
 {mostrarModal && ( 
 <div style={{ 
 position: 'fixed', 
 top: 0, 
 left: 0, 
 width: '100vw', 
 height: '100vh',
 backgroundColor: 'rgba(0,0,0,0.5)', 
 display: 'flex', 
 justifyContent: 'center', 
 alignItems: 'center', 
 zIndex: 99999, 
 pointerEvents: 'auto' 
 }}> 
 {/* Ampliado a 750px para organizar la cuadrícula táctil */} 
 <div style={{ backgroundColor: 'white', width: '1550px', maxHeight: '85vh', borderRadius: '12px', padding: '25px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}> 
 
 {/* Cabecera del Modal */} 
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '15px' }}> 
 <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>Asignar Empleados a: <span style={{color: '#92b91c'}}>{recetaSeleccionada?.nombre} - {recetaSeleccionada?.Tipo_bounche} - Tallos o Ramos x Hr ({recetaSeleccionada?.bqt_x_hora})</span></h3> 
 <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', fontWeight: 'bold', color: '#999' }}>&times;</button> 
 </div> 

 {/* SECCIÓN DE FILTROS EN UNA SOLA LÍNEA HORIZONTAL COMPACTA */} 
<div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', width: '100%' }}> 
  
  {/* 1. Buscador General (Nombre) */} 
  <div style={{ flex: 2, position: 'relative' }}> 
    <input 
      type="text" 
      placeholder="🔍 Buscar por nombre..." 
      value={busqueda} 
      onChange={(e) => setBusqueda(e.target.value)} 
      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '12px', height: '26px', outline: 'none' }} 
    /> 
  </div> 

  {/* 2. Buscador por ID */} 
  <div style={{ flex: 1, position: 'relative' }}> 
    <input 
      type="text" 
      placeholder="🆔 Buscar ID / Identif..." 
      value={busquedaId} 
      onChange={(e) => setBusquedaId(e.target.value)} 
      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '12px', height: '26px', outline: 'none' }} 
    /> 
  </div>

  {/* 3. Buscador por Departamento */} 
  <div style={{ flex: 1.5, position: 'relative' }}> 
    <input 
      type="text" 
      placeholder="🏢 Departamento..." 
      value={busquedaDepto} 
      onChange={(e) => setBusquedaDepto(e.target.value)} 
      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '12px', height: '26px', outline: 'none' }} 
    /> 
  </div> 

  {/* 4. Buscador por Helicóptero */} 
  <div style={{ flex: 1, position: 'relative' }}> 
    <input 
      type="text" 
      placeholder="🚁 Helicóptero..." 
      value={busquedaHelicoptero} 
      onChange={(e) => setBusquedaHelicoptero(e.target.value)} 
      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '12px', height: '26px', outline: 'none' }} 
    /> 
  </div> 

  {/* 5. Buscador por Mesa */} 
  <div style={{ flex: 1, position: 'relative' }}> 
    <input 
      type="text" 
      placeholder="🪑 Mesa..." 
      value={busquedaMesa} 
      onChange={(e) => setBusquedaMesa(e.target.value)} 
      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '12px', height: '26px', outline: 'none' }} 
    /> 
  </div> 

</div> 

{/* CONTENEDOR DE LA LISTA EN TIEMPO REAL - DISEÑO TOUCH GRID */} 
<div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}> 
 {cargandoEmpleados ? ( 
   <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '20px' }}>Cargando lista de empleados...</div> 
 ) : empleados.length > 0 ? ( 
   (() => { 
     
     // 💡 LÓGICA DE FILTRADO MULTI-NIVEL EN TIEMPO REAL ACTUALIZADA
     const empleadosFiltrados = empleados.filter(emp => { 
       const termino = busqueda.toLowerCase(); 
       const terminoDepto = busquedaDepto.toLowerCase(); 
       const terminoHelicoptero = busquedaHelicoptero.toLowerCase(); 
       const terminoMesa = busquedaMesa.toLowerCase();
       const terminoId = busquedaId.toLowerCase();

       const cumpleNombre = !busqueda || emp.nombre?.toLowerCase().includes(termino); 
       
       // Evalúa ID o Identificación de forma segura
       const cumpleId = !busquedaId || 
         emp.id?.toString().toLowerCase().includes(terminoId) || 
         emp.identificacion?.toString().toLowerCase().includes(terminoId) ||
         emp.codemp?.toString().toLowerCase().includes(terminoId); 

       const cumpleDepartamento = !busquedaDepto || emp.departamento?.toLowerCase().includes(terminoDepto); 
       const cumpleHelicoptero = !busquedaHelicoptero || emp.helicoptero?.toLowerCase().includes(terminoHelicoptero); 
       
       // Evalúa el número de mesa
       const cumpleMesa = !busquedaMesa || emp.mesa?.toString().toLowerCase().includes(terminoMesa); 

       return cumpleNombre && cumpleId && cumpleDepartamento && cumpleHelicoptero && cumpleMesa; 
     });

 // Funciones internas para manejo masivo respetando los filtros actuales
 const marcarTodosFiltrados = () => {
   const idsFiltrados = empleadosFiltrados.map(emp => emp.codemp);
   const nuevaSeleccion = Array.from(new Set([...empleadosSeleccionados, ...idsFiltrados]));
   setEmpleadosSeleccionados(nuevaSeleccion);
 };

 const desmarcarTodosFiltrados = () => {
   const idsFiltrados = empleadosFiltrados.map(emp => emp.codemp);
   const nuevaSeleccion = empleadosSeleccionados.filter(id => !idsFiltrados.includes(id));
   setEmpleadosSeleccionados(nuevaSeleccion);
 };

 // Mapeo en formato de botones táctiles responsivos 
 if (empleadosFiltrados.length > 0) { 
 return ( 
 <>
   {/* BOTONES DE SELECCIÓN MASIVA (Alineados dinámicamente sobre la cuadrícula) */}
   <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', padding: '0 5px' }}>
     <button
       type="button"
       onClick={marcarTodosFiltrados}
       style={{ padding: '6px 12px', backgroundColor: '#eef7cf', color: '#56700c', border: '1px solid #92b91c', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'background-color 0.2s' }}
     >
       ✓ Marcar Todos ({empleadosFiltrados.length})
     </button>
     <button
       type="button"
       onClick={desmarcarTodosFiltrados}
       style={{ padding: '6px 12px', backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'background-color 0.2s' }}
     >
       ✗ Desmarcar Todos
     </button>
   </div>

   <div style={{ 
     display: 'grid', 
     gridTemplateColumns: 'repeat(6, 1fr)', 
     gap: '8px', 
     padding: '5px' 
   }}> 
   {empleadosFiltrados.map((emp) => { 
   const estaSeleccionado = empleadosSeleccionados.includes(emp.codemp); 
   
   return ( 
   <label 
     key={emp.id || emp.codemp} 
     style={{ 
       display: 'flex', 
       flexDirection: 'column', 
       justifyContent: 'space-between', 
       position: 'relative', 
       padding: '12px', 
       borderRadius: '8px', 
       border: estaSeleccionado ? '2px solid #92b91c' : '1px solid #e0e0e0', 
       cursor: 'pointer', 
       backgroundColor: estaSeleccionado ? '#f6fbe7' : '#ffffff', 
       boxShadow: estaSeleccionado ? '0 3px 8px rgba(146,185,28,0.15)' : '0 1px 3px rgba(0,0,0,0.05)', 
       transition: 'all 0.15s ease', 
       userSelect: 'none', 
       minHeight: '90px' 
     }} 
   > 
     {/* Checkbox superior izquierdo */} 
     <input 
       type="checkbox" 
       checked={estaSeleccionado} 
       onChange={() => manejarSeleccionEmpleado(emp.codemp)} 
       style={{ position: 'absolute', top: '10px', left: '10px', width: '15px', height: '15px', accentColor: '#92b91c' }} 
     /> 

     {/* Placa de Mesa con prioridad Visual */} 
     <div style={{ 
       position: 'absolute',
       top: '50px',
       right: '8px',
       backgroundColor: estaSeleccionado ? '#92b91c' : '#467602', 
       color: '#ffffff', 
       padding: '3px 7px', 
       borderRadius: '6px', 
       fontSize: '16px', 
       fontWeight: 'bold', 
       boxShadow: '0 1px 3px rgba(0,0,0,0.15)', 
       textAlign: 'center',
       minWidth: '28px'
     }}> 
       <div style={{ fontSize: '10px', fontWeight: 'normal', opacity: 2.5, marginBottom: '-2px' }}>MESA / ID</div>
       {emp.mesa || '-'} / {emp.id}
     </div> 
     
     {/* Datos del empleado */} 
     <div style={{ paddingRight: '50px', marginTop: '22px' }}> 
       <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '2px', lineHeight: '1.2' }}> 
       {emp.nombre} 
       </div> 
       <div style={{ fontSize: '14px', color: '#63a925', fontWeight: '600', marginBottom: '4px' }}> 
         {emp.departamento || 'Sin Área'} 
       </div> 
     </div> 

     {/* Sección inferior: Detalles e Identificaciones */} 
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '6px', marginTop: '4px' }}> 
       <div style={{ fontSize: '12px', color: '#696969ff', lineHeight: '1.4' }}> 
         <div>IDNT: {emp.identificacion} | HELICOPT: {emp.helicoptero || '0'}</div> 
       </div> 
     </div> 
   </label> 
   ); 
   })} 
   </div> 
 </>
 ); 
 } 
 return ( 
 <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '20px', fontSize: '12px' }}> 
 No se encontraron empleados que coincidan con los filtros ingresados. 
 </div> 
 ); 
 })() 
 ) : ( 
 <div style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>No hay empleados activos disponibles.</div> 
 )} 
 </div> 

 {/* Acciones del Modal con tus condiciones y funciones originales */} 
 <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '12px' }}> 
 <button 
 onClick={() => setMostrarModal(false)} 
 style={{ padding: '10px 18px', backgroundColor: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} 
 > 
 Cancelar 
 </button> 
 <button 
 onClick={ejecutarAsignacion} 
 disabled={asignando || empleadosSeleccionados.length === 0} 
 style={{ 
 padding: '10px 18px', 
 backgroundColor: empleadosSeleccionados.length === 0 ? '#a0c0e0' : '#257a14', 
 color: 'white', 
 border: 'none', 
 borderRadius: '6px', 
 cursor: empleadosSeleccionados.length === 0 ? 'not-allowed' : 'pointer', 
 fontSize: '13px', 
 fontWeight: 'bold' 
 }} 
 > 
 {asignando ? 'Asignando...' : `Asignar (${empleadosSeleccionados.length})`} 
 </button> 
 </div> 
 </div> 
 </div> 
 )} 
</div>


              
         </div>

        
      {/* ================= CUERPO INFERIOR: Distribución en 3 Columnas ================= */} 
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}> 
 
             {/* ================= 1. COLUMNA IZQUIERDA: Listado de Recetas Sincronizado ================= */} 
<div style={{ width: '380px', backgroundColor: '#fff', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}> 
  
  {/* Título de la columna superior limpio */}
  <div style={{ backgroundColor: '#92b91c', color: 'white', fontWeight: 'bold', textAlign: 'center', padding: '8px', fontSize: '14px', letterSpacing: '1px' }}> 
    PRODUCTOS 
  </div>

  {/* 💡 CONTENEDOR DE FILTROS: Checkbox y Botón perfectamente alineados uno al lado del otro */}
  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: '#fdfdfd', borderBottom: '1px solid #eee', gap: '10px' }}>
 {/* Checkbox Sólidos */}
<label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#333', cursor: 'pointer', userSelect: 'none' }}>
  <input
    type="checkbox"
    checked={soloSolidos}
    onChange={(e) => setSoloSolidos(e.target.checked)}
    // Bloqueado para todos, EXCEPTO para "Postcosecha BQT"
    //disabled={departamento !== "Postcosecha BQT"}
    disabled={true}
    style={{ 
      width: '15px', 
      height: '15px', 
      accentColor: '#92b91c', 
      cursor: departamento !== "Postcosecha BQT" ? 'not-allowed' : 'pointer' 
    }}
  />
  Sólidos
</label>



    {/* Botón RECUPERAR */} 
    <button 
      onClick={obtenerDatosFiltrados} 
      style={{ 
        padding: '5px 14px', 
        cursor: 'pointer', 
        backgroundColor: '#d2eb64', 
        border: '1px solid #b7d142', 
        borderRadius: '4px', 
        fontSize: '11px', 
        fontWeight: 'bold',
        color: '#000',
        height: '26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.1s ease'
      }} 
    > 
      {cargando ? 'Cargando...' : 'RECUPERAR'} 
    </button> 

  </div>


       
          
                    {/* BUSCADOR DE PRODUCTOS AUTOMÁTICO EN BARRA SUPERIOR */}
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', fontSize: '12px', marginLeft: '10px' }}>
                
                {/* Contenedor del Input (Mantiene la etiqueta arriba y el input abajo) */}
                {/* ================= CONTENEDOR DE BÚSQUEDA FLUIDA EN LÍNEA ================= */}
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', fontSize: '12px', marginLeft: '1px', gap: '1px' }}>
                
                {/* 1. Caja: Buscar Producto (Ancho compacto de 160px) */}
                <div style={{ display: 'flex', flexDirection: 'column', width: '160px' }}>
                  <label style={{ fontWeight: 'bold', marginBottom: '2px', whiteSpace: 'nowrap' }}>Buscar Producto:</label>
                  <input 
                    type="text" 
                    placeholder="🔍 Nombre produc..." 
                    value={busquedaProducto} 
                    onChange={(e) => setBusquedaProducto(e.target.value)} 
                    style={{ 
                      padding: '5px 8px', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      width: '100%', 
                      boxSizing: 'border-box',
                      outline: 'none',
                      height: '24px', 
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      backgroundColor: '#ffffff'
                    }} 
                    onFocus={(e) => {
                      e.target.style.borderColor = '#92b91c'; 
                      e.target.style.boxShadow = '0 0 4px rgba(146, 185, 28, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#ccc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
  </div>

  {/* 2. Caja: Tipo Producto (Ancho compacto de 140px) */}
  <div style={{ display: 'flex', flexDirection: 'column', width: '140px' }}>
    <label style={{ fontWeight: 'bold', marginBottom: '2px', whiteSpace: 'nowrap' }}>Tipo Producto:</label>
    <input 
      type="text" 
      placeholder="🔍 Tipo de produc..." 
      value={busquedaTipoProducto} 
      onChange={(e) => setBusquedaTipoProducto(e.target.value)} 
      style={{ 
        padding: '5px 8px', 
        border: '1px solid #ccc', 
        borderRadius: '4px',
        fontSize: '12px',
        width: '100%', 
        boxSizing: 'border-box',
        outline: 'none',
        height: '24px', 
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        backgroundColor: '#ffffff'
      }} 
      onFocus={(e) => {
        e.target.style.borderColor = '#92b91c'; 
        e.target.style.boxShadow = '0 0 4px rgba(146, 185, 28, 0.3)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#ccc';
        e.target.style.boxShadow = 'none';
      }}
    />
  </div>



</div>




</div>


 {/* SECCIÓN DE FILTROS POR ORIGEN / TIPO */}
<div style={{ 
  display: 'flex', 
  gap: '12px', 
  padding: '6px 8px', 
  backgroundColor: '#f3f4f6', 
  borderRadius: '4px', 
  marginBottom: '6px',
  fontSize: '11px',
  fontWeight: 'bold',
  alignItems: 'center'
}}>
  


</div>

{/* CONTENEDOR DEL SCROLL DE TARJETAS AL DIGITAR */}
<div style={{ flex: 1, overflowY: 'auto', padding: '5px', backgroundColor: '#f9f9f9' }}> 
  {/* 💡 CORRECCIÓN: Filtro de texto y origen aplicados en tiempo real */}
  {(() => {
    const filtradosAlDigitar = productosMostrados.filter(receta => {
      // 1. Filtros por texto existentes
      const cumpleNombre = !busquedaProducto || receta.nombre?.toLowerCase().includes(busquedaProducto.toLowerCase());
      const cumpleTipo = !busquedaTipoProducto || 
        receta.Tipo_producto?.toLowerCase().includes(busquedaTipoProducto.toLowerCase()) ||
        receta.tipo_producto?.toLowerCase().includes(busquedaTipoProducto.toLowerCase());

      // 2. CORRECCIÓN DEL FILTRO: Transformamos p_id a String de forma segura para evitar caídas
      let cumpleOrigen = true;
      if (filtroTipo === 'VENTA') {
        cumpleOrigen = receta.origen === 'Venta de día';
      } else if (filtroTipo === 'PRODUCCION') {
        cumpleOrigen = receta.origen === 'Producción';
      } else if (filtroTipo === 'CREADOS') {
        const idComoTexto = receta.p_id ? String(receta.p_id) : '';
        cumpleOrigen = receta.origen === 'Creado' || idComoTexto.startsWith('sku_');
      }

      return cumpleNombre && cumpleTipo && cumpleOrigen;
    });

    return (
      <>
        {/* ================= BARRA DE CONTROLES: CHECKS DE FILTRADO POR TIPO ================= */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          padding: '6px 10px', 
          backgroundColor: '#eef2f6', 
          borderRadius: '4px', 
          marginBottom: '6px',
          fontSize: '11px',
          fontWeight: 'bold',
          alignItems: 'center',
          border: '1px solid #ddd'
        }}>
          <span style={{ color: '#4b5563' }}>Filtrar Origen:</span>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#333' }}>
            <input 
              type="radio" 
              name="origenFiltro" 
              checked={filtroTipo === 'TODOS'} 
              onChange={() => setFiltroTipo('TODOS')}
              style={{ accentColor: '#92b91c' }}
            />
            Todos
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'rgba(139, 130, 4, 1)' }}>
            <input 
              type="radio" 
              name="origenFiltro" 
              checked={filtroTipo === 'VENTA'} 
              onChange={() => setFiltroTipo('VENTA')}
              style={{ accentColor: 'rgba(139, 130, 4, 1)' }}
            />
            Ventas
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#8b4513' }}>
            <input 
              type="radio" 
              name="origenFiltro" 
              checked={filtroTipo === 'PRODUCCION'} 
              onChange={() => setFiltroTipo('PRODUCCION')}
              style={{ accentColor: '#8b4513' }}
            />
            Producción
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#0056b3' }}>
            <input 
              type="radio" 
              name="origenFiltro" 
              checked={filtroTipo === 'CREADOS'} 
              onChange={() => setFiltroTipo('CREADOS')}
              style={{ accentColor: '#0056b3' }}
            />
            Creados
          </label>
        </div>

        {/* 💡 CONTEXTO ALINEADO: Texto y Botón en la misma línea horizontal con espaciado limpio */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '5px 10px', 
          fontSize: '11px', 
          color: '#555', 
          borderBottom: '1px solid #eee' 
        }}> 
          
          {/* Texto del contador dinámico */}
          <span>Total productos: <strong style={{ color: '#333' }}>{filtradosAlDigitar.length}</strong></span> 

          {/* Botón ASIG */} 
          <button 
            onClick={obtenerSoloConTransacciones} 
            style={{ 
              padding: '2px 10px', 
              cursor: 'pointer', 
              backgroundColor: '#a5c34a', 
              color: 'white',
              border: '1px solid #78874d', 
              borderRadius: '4px', 
              fontSize: '11px',
              fontWeight: 'bold',
              height: '20px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap'
            }} 
            title="Recuperar solo productos con transacciones"
          > 
            {cargando ? '...' : 'PRODUCTOS ASIGNADOS'} 
          </button>

        </div>

        {/* CONTENEDOR DEL SCROLL DE TARJETAS AL DIGITAR */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px', backgroundColor: '#eeeeeeff' }}> 
          {productosMostrados.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '5px', fontSize: '12px' }}>No hay productos cargados.</div>
          ) : filtradosAlDigitar.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '20px', fontSize: '12px' }}>
              No se encontraron coincidencias.
            </div>
          ) : (
            filtradosAlDigitar.map((receta, index) => {
              const elProductoId = receta.p_id;
              const esPostcosecha = departamento === "Postcosecha BQT";
              const estaAbierto = idProductoAbierto === elProductoId;
              const esElSeleccionado = recetaSeleccionada?.p_id === receta.p_id;

              return (
                <div 
                  key={`${receta.p_id || 'prod'}-${index}`}
                  onClick={() => {
                    setRecetaSeleccionada(receta);
                    obtenerRendimientoProducto(receta);
                  }} 
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!esPostcosecha) {
                      setIdProductoAbierto(estaAbierto ? null : elProductoId);
                    }
                  }}
                  style={{ 
                    display: 'flex', 
                    flexDirection: esPostcosecha ? 'row' : 'column', 
                    marginBottom: '4px', 
                    fontSize: '11px', 
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: esElSeleccionado ? '#c2f56bff' : '#ffffff', 
                    border: esElSeleccionado ? '2px solid #92b91c' : '1px solid #ccc', 
                    borderRadius: '6px',
                    transition: 'all 0.15s ease'
                  }} 
                >
                  <div style={{ 
                    fontSize: '12px', 
                    backgroundColor: 'transparent', 
                    width: esPostcosecha ? '120px' : '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    fontWeight: 'bold',
                    padding: '4px 5px',       
                    textAlign: 'center',
                    gap: '4px'
                  }}> 
                    
                    {/* BLOQUE SUPERIOR: ID y Origen */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', width: '100%' }}>
                      <span style={{ color: '#6b7280', overflowWrap: 'break-word', fontSize: '10px' }}>
                        {receta.p_id}
                      </span>
                      <span style={{ color: '#4b5332', overflowWrap: 'break-word', fontSize: '10px' }}>
                        Origen: {receta.origen}
                      </span>
                    </div>

                    {/* BLOQUE INFERIOR: Nombre con color condicional estricto */}
                    <div style={{ 
                      color: receta.origen === 'Venta de día' 
                        ? 'rgba(139, 130, 4, 1)' 
                        : receta.origen === 'Producción' 
                          ? '#8b4513' 
                          : receta.origen === 'Creado'
                            ? '#0056b3' 
                            : 'rgba(139, 130, 4, 1)', 
                      overflowWrap: 'break-word', 
                      width: '100%',
                      fontSize: '15px'
                    }}>
                      {receta.nombre}
                    </div>


          </div>

     

                  {esPostcosecha ? (
                    /* --- SI SE CUMPLE LA CONDICIÓN (POSTCOSECHA BQT) --- */
                    <div style={{ flex: 1, padding: '4px' }}> 
                      <div style={{ fontWeight: 'bold', color: '#78874d' }}> 
                        <div style={{ border: '1px solid #fff', backgroundColor: '#ffffff' }}> 
                          
                          {/* 1. Longitud */}
                          {(receta.Longitud || receta.Longutud) && (
                            <span style={{ display: 'block' }}>
                              {receta.Longitud || receta.Longutud} CM
                            </span>
                          )}

                          {/* Contenedor secundario para textos informativos */}
                          <div style={{ color: '#666', fontSize: '10px', fontWeight: 'normal' }}> 
                            
                            {/* 2. Empaque y Tipo de Producto */}
                            {receta.Empaque && (
                              <div style={{ fontSize: '10px', marginTop: '2px', lineHeight: '1.1' }}>
                                {receta.Empaque} Tipo producto ({receta.Tipo_producto || 'Sin Tipo'})
                              </div>
                            )}

                            {/* 3. Tipo Bunch y Variedad */}
                            {(receta.Tipo_bunch || receta.Tipo_bounche) && receta.Tipo_variedad && (
                              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000', marginTop: '2px' }}>
                                {receta.Tipo_bunch || receta.Tipo_bounche} - {receta.Tipo_variedad}
                              </div>
                            )}

                            {/* 4. Empaque y Tallos/Ramos x Hora */}
                            {receta.Empaque && (
                              <div style={{ fontSize: '9px', marginTop: '2px', color: '#666' }}>
                                {receta.Empaque} Tallos/Ramos x Hr ({receta.bqt_x_hora || '0'})
                              </div>
                            )}

                          </div> 

                        </div> 
                      </div> 
                    </div>
                  ) : (
                    
                    /* --- SI NO SE CUMPLE (CASO ELSE): Se abre hacia abajo mostrando los datos técnicos --- */
                    /* --- SI NO SE CUMPLE (CASO ELSE): CONFIGURADOR INTERACTIVO --- */
              estaAbierto && (
                      <div 
                        style={{ 
                          width: '100%', 
                          padding: '1px', 
                          backgroundColor: '#ffffff', 
                          borderTop: '1px dashed #ccc',
                          boxSizing: 'border-box'
                        }}
                        onClick={(e) => e.stopPropagation()} // Evita que la tarjeta se cierre al pulsar los números
                      > 
                        
                        {(() => {
                          // 1. EXTRAER LONGITUDES Y TALLOS YA EXISTENTES EN LA LISTA EN TIEMPO REAL
                          const longitudesExistentes = new Set();
                          const tallosExistentes = new Set();

                          filtradosAlDigitar.forEach(p => {
                            if (p.nombre) {
                              const partes = String(p.nombre).toUpperCase().split(' ');
                              
                              // Buscar el número que acompaña a 'CM'
                              const indiceCM = partes.indexOf('CM');
                              if (indiceCM > 0) {
                                const valorCM = parseInt(partes[indiceCM - 1], 10);
                                if (!isNaN(valorCM)) longitudesExistentes.add(valorCM);
                              }

                              // Buscar el número que acompaña a 'ST' o 'HAC' (según tus variaciones)
                              const indiceST = partes.findIndex(part => part === 'ST' || part === 'HAC');
                              if (indiceST > 0) {
                                const valorST = parseInt(partes[indiceST - 1], 10);
                                if (!isNaN(valorST)) tallosExistentes.add(valorST);
                              }
                            }
                          });

                          // 2. CONSTRUIR EL TEXTO BASE DEL RESULTADO
                          const nombreLimpio = receta.nombre ? String(receta.nombre).split(' ')[0] : 'PRODUCTO';
                          const txtLon = longitudSel ? `${longitudSel} CM` : '__ CM';
                          const txtTal = tallosSel ? `${String(tallosSel).padStart(2, '0')} ST` : '__ ST';
                          const nombreArmadoEjemplo = `${nombreLimpio} ${txtLon} ${txtTal} BEL`;

                          return (
                            <>
                              {/* CONTENEDOR EN LÍNEA: TEXTO RESULTADO + BOTÓN PEQUEÑO AL LADO */}
                              <div style={{ 
                                backgroundColor: '#f1f8e9', 
                                padding: '4px 8px', 
                                border: '1px solid #c5e1a5', 
                                borderRadius: '4px', 
                                marginBottom: '10px',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px'
                              }}>
                                {/* Texto Compuesto de Forma Segura */}
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#33691e', overflowWrap: 'break-word', flex: 1 }}>
                                  Resultado: {nombreArmadoEjemplo}
                                </div>

                                {/* BOTÓN CREAR PEQUEÑO */}
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Evita que se disparen otros eventos de la tarjeta

                                  // 1. Armamos el texto del resultado combinando el nombre, longitud y tallos como se muestra en tu interfaz
                                  // Si ya tienes una propiedad armada en tu objeto llamada receta.resultado, usa esa directamente.
                                  // De lo contrario, aquí construimos el texto exacto del input:
                                  const textoResultado = `DIANTHUS 5 CM 15 ST BEL`; // Reemplázalo por tu variable dinámica si aplica, ej: receta.nombre

                                  // 2. Inyectamos los datos automáticamente en el estado del formulario
                                  setNuevoSku({
                                    p_id: 'sku_'+ receta.p_id,        // Carga automáticamente "BELLA6-117-3-2-2"
                                    nombre: nombreArmadoEjemplo,   // Carga automáticamente "DIANTHUS 5 CM 15 ST BEL"
                                    estadovisual: 'Activo'
                                  });

                                  // 3. Abrimos el modal
                                  setMostrarModalCrear(true);
                                }} 
                                style={{ 
                                  padding: '4px 8px', 
                                  cursor: 'pointer', 
                                  backgroundColor: '#92b91c', 
                                  color: 'white', 
                                  border: 'none', 
                                  borderRadius: '4px', 
                                  fontSize: '11px', 
                                  fontWeight: 'bold',
                                  marginLeft: '6px'
                                }}
                              >
                                + CREAR SKU
                              </button>


                              </div>

                              {/* SECCIÓN 1: LONGITUD (1 al 100) */}
                              <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#555' }}>Longitud (CM):</div>
                              <div style={{ display: 'flex', gap: '2px', overflowX: 'auto', paddingBottom: '3px', marginBottom: '8px' }}>
                                {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
                                  const yaExisteLongitud = longitudesExistentes.has(num);

                                  return (
                                    <div
                                      key={`lon-${num}`}
                                      onClick={() => {
                                        if (!yaExisteLongitud) setLongitudSel(num);
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        minWidth: '28px',
                                        textAlign: 'center',
                                        // Estilos condicionales: Gris deshabilitado si ya existe
                                        backgroundColor: yaExisteLongitud ? '#e0e0e0' : (longitudSel === num ? '#769713ff' : '#f5f5f5'),
                                        color: yaExisteLongitud ? '#9e9e9e' : (longitudSel === num ? 'white' : '#333'),
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        fontSize: '10px',
                                        cursor: yaExisteLongitud ? 'not-allowed' : 'pointer',
                                        opacity: yaExisteLongitud ? 0.6 : 1
                                      }}
                                      title={yaExisteLongitud ? "Esta longitud ya existe en el listado" : ""}
                                    >
                                      {num}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* SECCIÓN 2: TALLOS (1 al 100) */}
                              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#555' }}>Tallos (ST):</div>
                              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '6px' }}>
                                {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
                                  const yaExisteTallo = tallosExistentes.has(num);

                                  return (
                                    <div
                                      key={`tal-${num}`}
                                      onClick={() => {
                                        if (!yaExisteTallo) setTallosSel(num);
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        minWidth: '28px',
                                        textAlign: 'center',
                                        // Estilos condicionales: Gris deshabilitado si ya existe
                                        backgroundColor: yaExisteTallo ? '#e0e0e0' : (tallosSel === num ? '#a5c34a' : '#f5f5f5'),
                                        color: yaExisteTallo ? '#9e9e9e' : (tallosSel === num ? 'white' : '#333'),
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        fontSize: '10px',
                                        cursor: yaExisteTallo ? 'not-allowed' : 'pointer',
                                        opacity: yaExisteTallo ? 0.6 : 1
                                      }}
                                      title={yaExisteTallo ? "Esta cantidad de tallos ya existe en el listado" : ""}
                                    >
                                      {num}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}

                      </div>
                    )

                  )}

              </div> 
            );
          })
        )} 
      </div>
    </>
  );
})()}

</div>

        </div>


        {/* ================= FIN DE COLUMNA IZQUIERDA ================= */}

{/* 2. COLUMNA CENTRAL: Tabla de Rendimiento (Agrupada por Helicóptero) */}
<div style={{ flex: 1, backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', borderRight: '1px solid #ccc' }}>
{cargandoDetalle ? (
  <div style={{ margin: 'auto', color: '#666', fontStyle: 'italic'}}>Consultando rendimiento en base de datos...</div>
) : recetaSeleccionada ? (
  <div>
    {/* CABECERA MODIFICADA CON BOTÓN DISTRIBUIR Y FILTRO VISUAL */}
    <div style={{ 
      borderBottom: '2px solid #92b91c', 
      paddingBottom: '10px', 
      marginBottom: '15px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      {/* Información del Producto */}
      <div>
        <span style={{ fontSize: '12px', color: '#374506ff', fontWeight: 'bold' }}>CÓDIGO: {recetaSeleccionada.p_id}</span>
        <h2 style={{ margin: '5px 0 0 0', color: '#677e11', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{recetaSeleccionada.nombre}</h2>
      </div>

      {/* Contenedor de Acciones de Distribución */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {rendimiento.length > 0 && (
          <>
            {/* BOTÓN DISTRIBUIR */}
            <button
            onClick={() => ejecutarDistribucionEquitativa(helicoptero || rendimiento[0]?.id_maquina || '0')}
            style={{
              backgroundColor: '#ffffff',
              color: '#235214ff', 
              border: '2px solid #6aa225ff',
              padding: '8px 20px',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase'
            }}
            onMouseOver={(e) => { e.target.style.backgroundColor = '#e2f91f'; e.target.style.color = '#235214ff'; }}
            onMouseOut={(e) => { e.target.style.backgroundColor = '#fff'; e.target.style.color = '#235214ff'; }}
          >
            DISTRIBUIR
          </button>

           {/* INDICADOR DE HELICÓPTERO EDITABLE */}
            {/* INDICADOR DE HELICÓPTERO (SOLO VALOR) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Helicoptero</span>
                  <input
                    type="text"
                    value={helicoptero || (rendimiento[0]?.id_maquina || '')}
                    onChange={(e) => setHelicoptero(e.target.value)}
                    style={{
                      border: '2px solid #91dc35ff',
                      color: '#417e05ff',
                      fontWeight: 'bold',
                      padding: '4px 0px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: '#f5ffdaff',
                      width: '55px',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />

            </div>
          </>
        )}
      </div>
    </div>
 {rendimiento.length > 0 ? ( 
 (() => {
   // 🛠️ LÓGICA DE AGRUPACIÓN: Agrupamos el rendimiento por el campo 'id_maquina' (Helicóptero)
   const grupos = rendimiento.reduce((acc, item) => {
     const helico = item.id_maquina || 'Sin Helicóptero';
     if (!acc[helico]) {
       acc[helico] = {
         items: [],
         totalListo: 0,
         totalPendiente: 0,
         totalAnulado: 0
       };
     }
     acc[helico].items.push(item);
     acc[helico].totalListo += (item.listo || 0);
     acc[helico].totalPendiente += (item.pendiente || 0);
     acc[helico].totalAnulado += (item.anulado || 0);
     return acc;
   }, {});

   return (
     <div style={{ overflowX: 'auto' }}> 
       <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}> 
         <thead> 
           <tr style={{ backgroundColor: '#f2f2f2', borderBottom: '2px solid #ccc' }}> 
             <th style={{ padding: '8px', textAlign: 'center' }}>Anular</th> 
             <th style={{ padding: '8px' }}>Id trans</th> 
             <th style={{ padding: '8px' }}>Mesa</th> 
             <th style={{ padding: '8px' }}>Empleado</th> 
             <th style={{ padding: '8px' }}>Producto</th> 
             <th style={{ padding: '20px', textAlign: 'center' }}>Avances</th> 
             <th style={{ padding: '8px', textAlign: 'center' }}>Fecha Asignación</th> 
             <th style={{ padding: '8px', textAlign: 'center' }}>Helicoptero</th> 
             <th style={{ padding: '8px', textAlign: 'center' }}>Pst Helcptr</th> 
             <th style={{ padding: '8px', textAlign: 'center' }}>H.Entrd</th> 
             <th style={{ padding: '8px', textAlign: 'center' }}>H.Almz</th> 
             <th style={{ padding: '8px', textAlign: 'center' }}>H.Salida</th> 
             
              <th style={{ padding: '8px', textAlign: 'center' }}>Horas</th> 
             <th style={{ padding: '8px', textAlign: 'center' }}>ASIGNAR</th> 
           </tr> 
         </thead> 
        <tbody>
                {Object.keys(grupos).map((helicoKey) => {
                  const grupo = grupos[helicoKey];
                  
                  // 1. Contamos cuántas veces se repite cada puesto en este helicóptero
                  const conteoPuestos = grupo.items.reduce((acc, current) => {
                    const puesto = parseInt(current.puesto_maquina, 10) || 0;
                    acc[puesto] = (acc[puesto] || 0) + 1;
                    return acc;
                  }, {});

                  return (
                    <React.Fragment key={helicoKey}>
                      {/* FILAS DEL GRUPO */}
                      {grupo.items.map((item, index) => {
                        // 2. Evaluamos si el puesto actual está duplicado (solo si es mayor a 0)
                        const puestoActual = parseInt(item.puesto_maquina, 10) || 0;
                        const elPuestoEstaDuplicado = puestoActual > 0 && conteoPuestos[puestoActual] > 1;

                        return (
                          <tr
                            key={`${item.id}-${index}`}
                            onClick={() => obtenerRendimientoTags(item.id)}
                            style={{
                              borderBottom: '1px solid #e0e0e0',
                              cursor: 'pointer',
                              // Pintamos verde claro si está seleccionado, o rosado suave si está duplicado
                              backgroundColor: transaccionSeleccionada === item.id 
                                ? '#def49f' 
                                : elPuestoEstaDuplicado 
                                  ? '#fbe7e7' 
                                  : 'transparent'
                            }}
                          >
                            <td>
                          

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    anularTransaccionSinTags(item.id); // Abre tu modal interactivo profesional de confirmación
                                  }}
                                  // 🔓 DESBLOQUEO INTELIGENTE: Se bloquea SÓLO si hay tags activos en 'Listo' o 'Pendiente'.
                                  // Si la transacción no tiene tags, o si TODOS sus tags asociados ya dicen 'Anulado', el botón se activa (queda en ROJO).
                                  disabled={((item.listo || 0) + (item.pendiente || 0)) > 0}
                                  style={{
                                    // Si hay tags activos se pinta gris (#cccccc), si todo está en 0 o anulado se pinta rojo (#dc3545)
                                    backgroundColor: ((item.listo || 0) + (item.pendiente || 0)) > 0 ? '#cccccc' : '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 1px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    cursor: ((item.listo || 0) + (item.pendiente || 0)) > 0 ? 'not-allowed' : 'pointer'
                                  }}
                                  title={((item.listo || 0) + (item.pendiente || 0)) > 0 
                                    ? "No se puede anular porque contiene registros activos de TAGS (Listo o Pendiente)" 
                                    : "Anular transacción (No hay registros activos)"
                                  }
                                >
                                  Anular
                                </button>


                            </td>
                            <td style={{ padding: '16px', fontWeight: 'bold', color: '#779619' }}>{item.id || '-'}</td>
                            <td style={{ padding: '4px' }}>
                              <div style={{ fontWeight: 'bold', color: '#779619', backgroundColor: '#e2f91f', borderRadius: '8px', padding: '8px', textAlign: 'center', display: 'block' }}>
                                {item.mesa || '0'}
                              </div>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '12px'}}>{item.nombre_empleado}</div>
                              <div style={{ fontSize: '11px', color: '#888' }}>ID EMP: {item.cod_empledo} - BQT X HORA: ({item.bqt_x_hora})</div>
                            </td>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: '#779619' }}>{item.nombre_producto || '-'}</td>
                            <td style={{ textAlign: 'center', padding: '12px 8px', verticalAlign: 'middle' }}>
                              <div>
                                <span style={{ color: item.listo > 0 ? '#779619' : '#6c757d', fontWeight: item.listo > 0 ? '700' : '600' }}>
                                  ✓ {item.listo || 0}
                                </span>
                                <span style={{ color: '#adb5bd', margin: '0 2px' }}> | </span>
                                <span style={{ color: item.pendiente > 0 ? '#a56e00ff' : '#6c757d', fontWeight: item.pendiente > 0 ? '700' : '600' }}>
                                  {item.pendiente || 0}
                                </span>
                                <span style={{ color: '#adb5bd', margin: '0 2px' }}> | </span>
                                <span style={{ color: item.anulado > 0 ? '#ca4662' : '#6c757d', fontWeight: item.anulado > 0 ? '700' : '600' }}>
                                  X {item.anulado ?? 0}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'CENTER', color: '#779619', fontSize: '12px' }}>
                              {item.fecha_asignacion ? new Date(item.fecha_asignacion).toISOString().split('T')[0] : '-'}
                            </td>
                            

                                   {/* CELDA:  HELICOPTERO */}
                            <td style={{ padding: '4px' }}>
                              <div style={{
                                fontWeight: 'bold',
                                color: '#779619',
                                backgroundColor: guardandoPuestos[`${item.id}-id_maquina`] === 'exito' ? '#d4edda' : '#d8f4b1ff',
                                borderRadius: '8px',
                                padding: '4px 2px',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                border: guardandoPuestos[`${item.id}-id_maquina`] === 'exito' ? '1px solid #c3e6cb' : 'none',
                                minHeight: '29px'
                              }}>
                                {guardandoPuestos[`${item.id}-id_maquina`] === 'cargando' ? (
                                  <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>...</span>
                                ) : guardandoPuestos[`${item.id}-id_maquina`] === 'exito' ? (
                                  <span style={{ fontSize: '12px', color: '#155724', fontWeight: 'bold' }}>✓</span>
                                ) : (
                                  <input
                                    type="text"
                                    defaultValue={item.id_maquina || '0'}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                    onBlur={(e) => {
                                      const valor = e.target.value;
                                      if (valor !== (item.id_maquina || '0')) {
                                        actualizarPuestoHelicoptero(item.id, valor, 'id_maquina');
                                      }
                                    }}
                                    style={{
                                      width: '50px',
                                      background: 'transparent',
                                      border: 'none',
                                      textAlign: 'center',
                                      fontWeight: 'bold',
                                      color: '#779619',
                                      fontSize: '13px',
                                      outline: 'none',
                                      padding: '2px 0'
                                    }}
                                  />
                                )}
                              </div>
                            </td>

                            {/* CELDA: PUESTO MÁQUINA */}
                            <td style={{ padding: '4px' }}>
                              <div style={{
                                fontWeight: 'bold',
                                backgroundColor: elPuestoEstaDuplicado 
                                  ? '#ff8b96ff'
                                  : guardandoPuestos[`${item.id}-puesto_maquina`] === 'exito' ? '#d4edda' : '#e2f91f',
                                color: elPuestoEstaDuplicado ? '#ffffff' : '#779619',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                minHeight: '29px'
                              }}>
                                {guardandoPuestos[`${item.id}-puesto_maquina`] === 'cargando' ? (
                                  <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic'}}>...</span>
                                ) : guardandoPuestos[`${item.id}-puesto_maquina`] === 'exito' ? (
                                  <span style={{ fontSize: '14px', color: '#155724', fontWeight: 'bold' }}>✓</span>
                                ) : (
                                  <input
                                    type="number"
                                    defaultValue={item.puesto_maquina || '0'}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                    onBlur={(e) => {
                                      const valorIngresado = parseInt(e.target.value, 10) || 0;
                                      if (valorIngresado !== (item.puesto_maquina || 0)) {
                                        actualizarPuestoHelicoptero(item.id, valorIngresado, 'puesto_maquina');
                                      }
                                    }}
                                    style={{
                                      width: '50px',
                                      background: 'transparent',
                                      border: 'none',
                                      textAlign: 'center',
                                      fontWeight: 'bold',
                                      color: elPuestoEstaDuplicado ? '#ffffff' : '#779619',
                                      fontSize: '13px',
                                      outline: 'none',
                                      padding: '2px 0'
                                    }}
                                  />
                                )}
                              </div>
                            </td>

                            {/* CELDA: HORA ENTRADA EDITABLE */}
                            <td style={{ padding: '4px' }}>
                              <div style={{
                                fontWeight: 'bold',
                                color: '#779619',
                                backgroundColor: guardandoPuestos[`${item.id}-hora_entrada`] === 'exito' ? '#d4edda' : '#d8f4b1ff',
                                borderRadius: '8px',
                                padding: '4px 2px',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                border: guardandoPuestos[`${item.id}-hora_entrada`] === 'exito' ? '1px solid #c3e6cb' : 'none',
                                minHeight: '29px'
                              }}>
                                {guardandoPuestos[`${item.id}-hora_entrada`] === 'cargando' ? (
                                  <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>...</span>
                                ) : guardandoPuestos[`${item.id}-hora_entrada`] === 'exito' ? (
                                  <span style={{ fontSize: '12px', color: '#155724', fontWeight: 'bold' }}>✓</span>
                                ) : (
                                  <input
                                    type="text"
                                    defaultValue={item.hora_entrada || '0'}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                    onBlur={(e) => {
                                      const valor = e.target.value;
                                      if (valor !== (item.hora_entrada || '0')) {
                                        actualizarPuestoHelicoptero(item.id, valor, 'hora_entrada');
                                      }
                                    }}
                                    style={{
                                      width: '50px',
                                      background: 'transparent',
                                      border: 'none',
                                      textAlign: 'center',
                                      fontWeight: 'bold',
                                      color: '#779619',
                                      fontSize: '13px',
                                      outline: 'none',
                                      padding: '2px 0'
                                    }}
                                  />
                                )}
                              </div>
                            </td>

                            {/* CELDA: HORA ALMUERZO EDITABLE */}
                            <td style={{ padding: '4px' }}>
                              <div style={{
                                fontWeight: 'bold',
                                color: '#779619',
                                backgroundColor: guardandoPuestos[`${item.id}-hora_almuerzo`] === 'exito' ? '#d4edda' : '#d8f4b1ff',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                border: guardandoPuestos[`${item.id}-hora_almuerzo`] === 'exito' ? '1px solid #c3e6cb' : 'none',
                                minHeight: '29px'
                              }}>
                                {guardandoPuestos[`${item.id}-hora_almuerzo`] === 'cargando' ? (
                                  <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>...</span>
                                ) : guardandoPuestos[`${item.id}-hora_almuerzo`] === 'exito' ? (
                                  <span style={{ fontSize: '12px', color: '#155724', fontWeight: 'bold' }}>✓</span>
                                ) : (
                                  <input
                                    type="text"
                                    defaultValue={item.hora_almuerzo || '00:00'}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                    onBlur={(e) => {
                                      const valor = e.target.value;
                                      if (valor !== (item.hora_almuerzo || '00:00')) {
                                        actualizarPuestoHelicoptero(item.id, valor, 'hora_almuerzo');
                                      }
                                    }}
                                    style={{
                                      width: '50px',
                                      background: 'transparent',
                                      border: 'none',
                                      textAlign: 'center',
                                      fontWeight: 'bold',
                                      color: '#779619',
                                      fontSize: '13px',
                                      outline: 'none',
                                      padding: '2px 0'
                                    }}
                                  />
                                )}
                              </div>
                            </td>

                            {/* CELDA: HORA SALIDA EDITABLE */}
                            <td style={{ padding: '4px' }}>
                              <div style={{
                                fontWeight: 'bold',
                                color: '#779619',
                                backgroundColor: guardandoPuestos[`${item.id}-hora_salida`] === 'exito' ? '#d4edda' : '#d8f4b1ff',
                                borderRadius: '8px',
                                padding: '4px 2px',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                border: guardandoPuestos[`${item.id}-hora_salida`] === 'exito' ? '1px solid #c3e6cb' : 'none',
                                minHeight: '29px'
                              }}>
                                {guardandoPuestos[`${item.id}-hora_salida`] === 'cargando' ? (
                                  <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}></span>
                                ) : guardandoPuestos[`${item.id}-hora_salida`] === 'exito' ? (
                                  <span style={{ fontSize: '12px', color: '#155724', fontWeight: 'bold' }}>✓</span>
                                ) : (
                                  <input
                                    type="text"
                                    defaultValue={item.hora_salida || '0'}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                    onBlur={(e) => {
                                      const valor = e.target.value;
                                      if (valor !== (item.hora_salida || '0')) {
                                        actualizarPuestoHelicoptero(item.id, valor, 'hora_salida');
                                      }
                                    }}
                                    style={{
                                      width: '50px',
                                      background: 'transparent',
                                      border: 'none',
                                      textAlign: 'center',
                                      fontWeight: 'bold',
                                      color: '#779619',
                                      fontSize: '13px',
                                      outline: 'none',
                                      padding: '2px 0'
                                    }}
                                  />
                                )}
                              </div>
                            </td>
                            {/* CELDA: HORAS TRANSCURRIDAS */}
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <div style={{
                                display: 'inline-flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                color: '#333',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                minWidth: '70px',
                                border: '1px solid #e0e0e0',
                                fontSize: '11px'
                              }}>
                                <span>
                                  {(() => {
                                    if (!item.hora_entrada || !item.hora_salida || item.hora_entrada === '0' || item.hora_salida === '0') return '00:00';
                                    if (!item.hora_entrada.includes(':') || !item.hora_salida.includes(':')) return '00:00';

                                    const [hEntrada, mEntrada] = item.hora_entrada.split(':').map(Number);
                                    const [hSalida, mSalida] = item.hora_salida.split(':').map(Number);
                                    let minutosEntrada = (hEntrada * 60) + mEntrada;
                                    let minutosSalida = (hSalida * 60) + mSalida;

                                    if (minutosSalida < minutosEntrada) minutosSalida += 24 * 60;
                                    let minutosTotales = minutosSalida - minutosEntrada;

                                    let minutosAlmuerzo = 60;
                                    const almuerzoRaw = item.hora_almuerzo;

                                    if (almuerzoRaw !== undefined && almuerzoRaw !== null && almuerzoRaw !== '') {
                                      if (almuerzoRaw.toString().includes(':')) {
                                        const [hAlm, mAlm] = almuerzoRaw.toString().split(':').map(Number);
                                        minutosAlmuerzo = (!isNaN(hAlm) && !isNaN(mAlm)) ? (hAlm * 60) + mAlm : 60;
                                      } else {
                                        const numDecimal = parseFloat(almuerzoRaw);
                                        minutosAlmuerzo = !isNaN(numDecimal) ? Math.round(numDecimal * 60) : 60;
                                      }
                                    }

                                    const minutosNetos = Math.max(0, minutosTotales - minutosAlmuerzo);
                                    const horasFinales = Math.floor(minutosNetos / 60);
                                    const minutosFinales = minutosNetos % 60;
                                    return `${horasFinales.toString().padStart(2, '0')}:${minutosFinales.toString().padStart(2, '0')}`;
                                  })()} hrs
                                </span>
                              </div>
                            </td>
                            
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransaccionParaRfid(item);
                                  setMostrarModalRfid(true);
                                }}
                                style={{ backgroundColor: '#92b91c', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Asignar Tags
                              </button>
                            </td>
                          </tr>
                        ); // <- Fin del bloque return interno
                      })} {/* <- Fin del mapeo de filas con llaves */}

                      {/* FILA DE RESUMEN DEL GRUPO */}
                      <tr style={{ backgroundColor: '#ffffff', borderBottom: '3px double #92b91c' }}>
                        <td colSpan="10" style={{ padding: '10px 15px', textAlign: 'right', fontWeight: 'bold', color: '#333', fontSize: '11px' }}>
                          <span>Registros: <span style={{ color: '#92b91c', marginRight: '15px' }}>{grupo.items.length}</span></span>
                          <span>Helicóptero: <span style={{ color: '#92b91c', marginRight: '25px' }}>{helicoKey}</span></span>
                          <span style={{ borderLeft: '1px solid #ccc', paddingLeft: '15px' }}>Total: </span>
                          <span style={{ color: '#779619', marginLeft: '5px' }}> {grupo.totalListo}</span>
                          <span style={{ color: '#adb5bd', margin: '0 5px' }}>|</span>
                          <span style={{ color: '#db970f' }}> {grupo.totalPendiente}</span>
                          <span style={{ color: '#adb5bd', margin: '0 5px' }}>| </span>
                          <span style={{ color: '#ca4662' }}> X {grupo.totalAnulado}</span> 
                          <span style={{ color: '#adb5bd', margin: '0 5px' }}>| </span>
                          <span > TOTAL ASIGNADOS: </span>
                           <span style={{ color: '#4f6316ff', marginLeft: '5px' }}> {grupo.totalListo + grupo.totalPendiente + grupo.totalAnulado} / Tags</span>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
                </tbody>

       </table> 
     </div> 
   );
 })()
 ) : ( 
 <div style={{ padding: '20px', backgroundColor: '#edffcdff', border: '1px solid #edffcdff', borderRadius: '4px', color: '#252624', fontSize: '13px' }}> 
 No se encontraron registros de rendimiento para este producto. 
 </div> 
 )} 
 </div> 
 ) : ( 
 <div style={{ margin: 'auto', color: '#aaa', fontStyle: 'italic' }}> 
 Selecciona una receta del listado izquierdo para desplegar su rendimiento de trabajo. 
 </div> 
 )} 
</div>




        

              {/* 3. COLUMNA DERECHA: Nueva Sección Automatizada de Tags Timbrados */} 
        <div style={{ width: '420px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', padding: '15px', overflowY: 'auto' }}> 
         

           <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', // Fuerza el orden vertical en espacios angostos
                  borderBottom: '2px solid #92b91c', 
                  paddingBottom: '12px', 
                  marginBottom: '15px',
                  gap: '12px'
                }}> 
                  {/* LÍNEA 1: TÍTULO PRINCIPAL */}
                  <h3 style={{ 
                    margin: 0, 
                    color: '#1a1a1a', 
                    fontSize: '13px', 
                    fontWeight: '800',
                    letterSpacing: '0.7px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: '#92b91c', fontSize: '14px' }}>■</span> REGISTRO DE TAGS
                  </h3> 

                  {/* LÍNEA 2: CONTENEDOR DE INDICADORES Y BOTÓN */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap' // Permite adaptarse dinámicamente si es extremadamente angosto
                  }}>
                    {/* SUB-CONTENEDOR DE BADGES */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {transaccionSeleccionada && (
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#1e4620', 
                          backgroundColor: '#e8f5e9', 
                          padding: '5px 10px', 
                          borderRadius: '4px',
                          fontWeight: '700',
                          border: '1px solid #c8e6c9',
                          whiteSpace: 'nowrap' // Evita que el texto interno se rompa
                        }}>
                          TOTAL: {tags ? tags.length : 0}
                        </span>
                      )}
                      
                      {transaccionSeleccionada && (
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#333333', 
                          backgroundColor: '#f1f3f5', 
                          padding: '5px 10px', 
                          borderRadius: '4px',
                          fontWeight: '700',
                          border: '1px solid #e9ecef',
                          whiteSpace: 'nowrap'
                        }}>
                          TRN: #{transaccionSeleccionada}
                        </span>
                      )}
                    </div>

                    {/* BOTÓN DE ACCIÓN ALINEADO A LA DERECHA */}
                
                    {transaccionSeleccionada && (
                                    <button
                                      onClick={() => anularTagsPendientes(transaccionSeleccionada)}
                                      style={{
                                        backgroundColor: '#dc3545',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        fontSize: '11px',
                                        letterSpacing: '0.3px',
                                        boxShadow: '0 2px 4px rgba(220, 53, 69, 0.15)',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      Anular Pendientes
                                    </button>
                                  )}

                  </div>
                </div>
   

          {cargandoTags ? (
            <div style={{ margin: 'auto', color: '#666', fontStyle: 'italic', fontSize: '12px' }}>Consultando tags en tiempo real...</div>
          ) : tags.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f2f2f2', borderBottom: '2px solid #ccc' }}>
                     <th style={{ padding: '6px' }}>ID</th>
                    <th style={{ padding: '6px' }}>ID Barcode</th>
                    <th style={{ padding: '6px' }}>Fech.Asig</th>
               
                    <th style={{ padding: '6px' }}>Estado Bqt</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((tag, idx) => (
                    <tr key={`${tag.id}-${idx}`} style={{ borderBottom: '1px solid #e0e0e0' }}>

                    <td style={{ padding: '6px', fontWeight: 'bold', color: tag.estado_bqt === 'Anulado' ? '#888888' : '#444' }}>
                      {tag.id || '-'}
                    </td>

                      <td style={{ padding: '6px', fontWeight: 'bold', color: tag.estado_bqt === 'Anulado' ? '#888888' : '#444' }}>
                      {tag.id_codigo_barra || '-'}
                    </td>
                    <td style={{ padding: '6px', fontWeight: 'bold', color: tag.estado_bqt === 'Anulado' ? '#888888' : '#444' }}>
                      {tag.fecha_creacion || '-'}
                    </td>

                    
                      
                      <td style={{ padding: '6px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          backgroundColor: tag.estado_bqt === 'Listo' ? '#b5ff2cff' : tag.estado_bqt === 'Anulado' ? '#eeeeeeff' : '#fbd6d6ff',

                          color: tag.estado_bqt === 'Listo' ? '#4a5c00ff' : tag.estado_bqt === 'Pendiente' ? '#c90000ff' : '#636262ff',
                          fontWeight: 'bold'
                        }}>
                          {tag.estado_bqt || 'S/E'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ margin: 'auto', color: '#aaa', fontStyle: 'italic', fontSize: '12px', textAlign: 'center' }}> 
              {transaccionSeleccionada 
                ? 'No se encontraron registros de barras timbradas para esta transacción.' 
                : 'Haz clic en una fila del panel central ("Id trans") para desplegar el desglose de códigos de barra.'}
            </div> 
          )} 
        </div> 

         {/* ================= INYECCIÓN DEL MODAL RFID HARDWARE ================= */}
      <ModalRfid 
        isOpen={mostrarModalRfid}
        onClose={() => setMostrarModalRfid(false)}
        transaccion={transaccionParaRfid}
        onGuardarTags={guardarTagsAsignados}
      />
      
      {/* ================= INYECCIÓN DEL MODAL RFID DE LIBERACIÓN LIBRE ================= */}
        <ModalRfidLiberacion 
          isOpen={mostrarModalLiberacionLibre} 
          onClose={() => setMostrarModalLiberacionLibre(false)} 
        />


 <ModalRfidLiberacionlisto 
          isOpen={mostrarModalLiberacionLibrelisto} 
          onClose={() => setMostrarModalLiberacionLibrelisto(false)} 
        />
      {/* ================= PEGA EL NUEVO MODAL JUSTO AQUÍ ABAJO ================= */}
      {modalAnulacionCompleta.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99998
        }}>
          <div style={{
            backgroundColor: '#ffffff', width: '400px', padding: '25px', 
            borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚨</div>
            
            <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '16px', fontWeight: 'bold' }}>
              ¿Confirmas la anulación completa?
            </h3>
            
            <p style={{ margin: '0 0 20px 0', color: '#4b5563', fontSize: '13px', lineHeight: '1.4' }}>
              ¿Estás seguro de que deseas anular por completo la transacción <strong style={{ color: '#dc3545' }}>#{modalAnulacionCompleta.idTransaccion}</strong>? Esta acción no se puede deshacer.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => setModalAnulacionCompleta({ isOpen: false, idTransaccion: null })}
                style={{ 
                  padding: '10px 20px', backgroundColor: '#e5e7eb', border: 'none', 
                  borderRadius: '6px', cursor: 'pointer', fontSize: '13px', 
                  fontWeight: '600', color: '#374151', minWidth: '100px' 
                }}
              >
                No, Cancelar
              </button>
              <button
                onClick={ejecutarAnulacionCompletaSinTags}
                style={{
                  padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', 
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 'bold', minWidth: '100px',
                  boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)'
                }}
              >
                Sí, Anular
              </button>
            </div>
          </div>
        </div>
      )}
   




      </div> {/* Fin de Cuerpo Inferior */} 


            {/* 🌟 MODAL DE CARGA PROFESIONAL (OVERLAY) CONTROLED POR EL BOTÓN RECUPERAR */}
              {cargando && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)', 
                  backdropFilter: 'blur(4px)', 
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 9999, 
                }}>
                  <style>{`
                    @keyframes spin-custom {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>

                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '30px 40px',
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px'
                  }}>
                    {/* Círculo Animado */}
                    <div style={{
                      width: '45px',
                      height: '45px',
                      border: '4px solid #f3f4f6', 
                      borderTop: '4px solid #d4ec5bff', // Color azul del spinner
                      borderRadius: '50%',
                      animation: 'spin-custom 1s linear infinite',
                    }} />
                    
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1f2937', fontFamily: 'system-ui, sans-serif' }}>
                        Recuperando información (Productos DARTIS)
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280', fontFamily: 'system-ui, sans-serif' }}>
                        Por favor, espere un momento...
                      </p>
                    </div>
                  </div>
                </div>
              )}

      

      {/* ================= NOTIFICACIÓN FLOTANTE INTERACTIVA (TOAST) ================= */}
{notificacion.mostrar && (
  <div style={{
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: notificacion.tipo === 'success' ? '#2e7d32' : '#d32f2f',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: 'bold',
    fontSize: '13px',
    animation: 'fadeIn 0.3s ease'
  }}>
    <span>{notificacion.tipo === 'success' ? '✅' : '❌'}</span>
    {notificacion.mensaje}
  </div>
)}


      {/* ================= MODAL INTERACTIVO: CONFIRMACIÓN DE DISTRIBUCIÓN EQUITATIVA ================= */}
      {modalConfirmarDistribucion.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99998
        }}>
          <div style={{
            backgroundColor: '#ffffff', width: '420px', padding: '25px', 
            borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            textAlign: 'center'
          }}>
            {/* Icono de caja/reparto profesional */}
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📦</div>
            
            <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '16px', fontWeight: 'bold' }}>
              Confirmar Distribución de Tags
            </h3>
            
            <p style={{ margin: '0 0 20px 0', color: '#4b5563', fontSize: '13px', lineHeight: '1.5' }}>
              ¿Deseas distribuir los tags timbrados equitativamente entre los empleados asignados al <strong style={{ color: '#92b91c' }}>Helicóptero {modalConfirmarDistribucion.idHelicoptero}</strong>?
            </p>

            {/* ACCIONES DEL MODAL */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => setModalConfirmarDistribucion({ isOpen: false, idHelicoptero: null, idMaquinariaManual: null })}
                style={{ 
                  padding: '10px 20px', backgroundColor: '#e5e7eb', border: 'none', 
                  borderRadius: '6px', cursor: 'pointer', fontSize: '13px', 
                  fontWeight: '600', color: '#374151', minWidth: '100px' 
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarYEjecutarDistribucion} // <-- EJECUTA EL PROCESO REAL
                style={{
                  padding: '10px 20px', backgroundColor: '#92b91c', color: 'white', 
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 'bold', minWidth: '120px',
                  boxShadow: '0 2px 4px rgba(146, 185, 28, 0.2)',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#7fa217'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#92b91c'}
              >
                Sí, Distribuir
              </button>
            </div>
          </div>
        </div>
      )}


{/* ================= MODAL INTERACTIVO: MOTIVO DE ANULACIÓN ================= */}
{modalAnulacion.isOpen && (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99998
  }}>
    <div style={{
      backgroundColor: '#ffffff', width: '450px', padding: '25px', 
      borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '16px' }}>
        ⚠️ Justificación Obligatoria de Anulación
      </h3>
      <p style={{ margin: '0 0 15px 0', color: '#4b5563', fontSize: '12px' }}>
        Estás por anular los tags de la transacción <strong>#{modalAnulacion.idTransaccion}</strong>. Por seguridad, describe el motivo detallado:
      </p>

      <textarea
        rows="3"
        placeholder="Ej: Tags timbrados por error en la lectura del helicóptero..."
        value={motivoAnulacionInput}
        onChange={(e) => setMotivoAnulacionInput(e.target.value)}
        style={{
          width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc',
          boxSizing: 'border-box', resize: 'none', fontSize: '13px', outline: 'none'
        }}
      />

      {/* BARRA DE PROGRESO DINÁMICA (Visualiza los 10 caracteres mínimos requeridos) */}
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
          <span>Progreso de validación:</span>
          <span style={{ fontWeight: 'bold', color: motivoAnulacionInput.length >= 10 ? '#257a14' : '#dc3545' }}>
            {motivoAnulacionInput.length} / 10 caracteres
          </span>
        </div>
        <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min((motivoAnulacionInput.length / 10) * 100, 100)}%`,
            height: '100%',
            backgroundColor: motivoAnulacionInput.length >= 10 ? '#257a14' : '#dc3545',
            transition: 'width 0.2s ease, background-color 0.2s ease'
          }} />
        </div>
      </div>

      {/* ACCIONES DEL MODAL */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button
          onClick={() => setModalAnulacion({ isOpen: false, idTransaccion: null })}
          style={{ padding: '8px 15px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151' }}
        >
          Cancelar
        </button>
        <button
          onClick={confirmarAnulacionTags}
          disabled={motivoAnulacionInput.trim().length < 10}
          style={{
            padding: '8px 15px',
            backgroundColor: motivoAnulacionInput.trim().length < 10 ? '#9ca3af' : '#dc3545',
            color: 'white', border: 'none', borderRadius: '6px',
            cursor: motivoAnulacionInput.trim().length < 10 ? 'not-allowed' : 'pointer',
            fontSize: '13px', fontWeight: 'bold', transition: 'background-color 0.2s'
          }}
        >
          Confirmar Anulación
        </button>
      </div>
    </div>
  </div>
)}


  {/* ======================================================== */}
  {/*      MODAL PERSONALIZADO DE CONFLICTO (ALERT TRIANGLE)    */}
  {/* ======================================================== */}
  {modalConflicto.isOpen && (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999, /* Por encima de cualquier otra vista */
      pointerEvents: 'auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        width: '450px', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)' 
      }}>
        
        {/* Encabezado con el ícono de Lucide React */}
        <div style={{ 
          backgroundColor: '#fffbeb', 
          padding: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          borderBottom: '1px solid #fef3c7' 
        }}>
          <div style={{ 
            backgroundColor: '#fef3c7', 
            padding: '8px', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            color: '#d97706' 
          }}>
            <AlertTriangle style={{ width: '24px', height: '24px' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#78350f', fontSize: '16px', fontWeight: 'bold' }}>
              Conflicto de Tags Detectado
            </h3>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 16px 0', color: '#4b5563', fontSize: '13px', lineHeight: '1.5' }}>
            {modalConflicto.mensaje}
          </p>
          
          <p style={{ margin: '0 0 12px 0', color: '#b45309', fontSize: '12px', fontWeight: 'bold' }}>
            ¿Desea cambiarlos al estado 'Listo' y continuar con el guardado?
          </p>

          {/* Listado dinámico de códigos devueltos por el backend */}
          {modalConflicto.duplicados && modalConflicto.duplicados.length > 0 && (
            <div style={{ 
              backgroundColor: '#f9fafb', 
              borderRadius: '6px', 
              padding: '10px', 
              border: '1px solid #e5e7eb' 
            }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                Tags Afectados:
              </span>
              <div style={{ 
                maxHeight: '90px', 
                overflowY: 'auto', 
                fontSize: '11px', 
                color: '#374151', 
                fontFamily: 'monospace', 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '4px' 
              }}>
                {modalConflicto.duplicados.map((tag, idx) => (
                  <span key={idx} style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción inferiores */}
        <div style={{ 
          backgroundColor: '#f9fafb', 
          padding: '12px 20px', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '10px', 
          borderTop: '1px solid #e5e7eb' 
        }}>
          <button 
            onClick={() => setModalConflicto(prev => ({ ...prev, isOpen: false }))}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: 'white', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px', 
              fontSize: '13px', 
              cursor: 'pointer',
              color: '#374151'
            }}
          >
            Cancelar
          </button>
          <button 
            onClick={modalConflicto.onConfirm}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#d97706', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '13px', 
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Sí, cambiar estado y guardar
          </button>
        </div>

      </div>
    </div>
  )}




{/* ================= MODAL EMERGENTE: REVISIÓN GENERAL DE TAGS ================= */}
{mostrarModalRevision && (() => {
  // Lógica de filtrado en tiempo real en el hilo de renderizado
  const datosFiltradosModal = datosRevision.filter(row => row.estado_bqt === filtroEstadoModal);

  // Función auxiliar para formatear fechas de manera segura sin romper la app
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '-';
    try {
      return new Date(fechaStr).toISOString().split('T')[0];
    } catch (e) {
      return '-';
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      zIndex: 99999, 
      pointerEvents: 'auto' 
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        width: '1580px', // Ampliado para albergar cómodamente todas las columnas y el botón RFID
        maxHeight: '85vh', 
        borderRadius: '12px', 
        padding: '25px', 
        display: 'flex', 
        flexDirection: 'column', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)' 
      }}>
        
        {/* Cabecera del Modal */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid #eee', 
          paddingBottom: '12px', 
          marginBottom: '15px' 
        }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '18px', fontWeight: 'bold' }}>
            🔍 Revisión General de Tags 
            <span style={{ fontSize: '13px', color: '#666', fontWeight: 'normal', marginLeft: '10px' }}>
              (Registros del Sistema)
            </span>
          </h3>
          <button 
            onClick={() => setMostrarModalRevision(false)} 
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', fontWeight: 'bold', color: '#999' }}
          >
            &times;
          </button>
        </div>

        {/* PESTAÑAS DE FILTRADO (TABS) */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <button
            onClick={() => setFiltroEstadoModal('Pendiente')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: filtroEstadoModal === 'Pendiente' ? '#fff3cd' : '#f7fafc',
              color: filtroEstadoModal === 'Pendiente' ? '#856404' : '#4a5568',
              boxShadow: filtroEstadoModal === 'Pendiente' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            ⏳ Pendientes ({datosRevision.filter(r => r.estado_bqt === 'Pendiente').length})
          </button>
          
          <button
            onClick={() => setFiltroEstadoModal('Anulado')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: filtroEstadoModal === 'Anulado' ? '#fbd6d6' : '#f7fafc',
              color: filtroEstadoModal === 'Anulado' ? '#c90000' : '#4a5568',
              boxShadow: filtroEstadoModal === 'Anulado' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            ❌ Anulados ({datosRevision.filter(r => r.estado_bqt === 'Anulado').length})
          </button>

          <button
            onClick={() => setFiltroEstadoModal('Devueltos')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: filtroEstadoModal === 'Devueltos' ? '#e2f0fe' : '#f7fafc',
              color: filtroEstadoModal === 'Devueltos' ? '#1a56db' : '#4a5568',
              boxShadow: filtroEstadoModal === 'Devueltos' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            📦 Devueltos ({datosRevision.filter(r => r.estado_bqt === 'Devueltos').length})
          </button>
        </div>
        {/* Contenedor de la Tabla con scroll independiente */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px' }}>
          {cargandoRevision ? (
            <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '40px' }}>
              Consultando bitácora de revisión en tiempo real...
            </div>
          ) : datosFiltradosModal.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2', borderBottom: '2px solid #ccc' }}>
                  <th style={{ padding: '10px 6px' }}>ID Tag</th>
                  <th style={{ padding: '10px 6px' }}>Código de Barra</th>
                  <th style={{ padding: '10px 6px' }}>Producto</th>
                  <th style={{ padding: '10px 6px' }}>Empleado</th>
                  <th style={{ padding: '10px 6px', textAlign: 'center' }}>Transacción Origen</th>
                  <th style={{ padding: '10px 6px', textAlign: 'center' }}>F. Creación</th>
                  <th style={{ padding: '10px 6px', textAlign: 'center' }}>F. Asignación</th>
                  <th style={{ padding: '10px 6px', textAlign: 'center' }}>F. Anulación</th>
                  <th style={{ padding: '10px 6px', textAlign: 'center' }}>F. Devolución</th>
                  <th style={{ padding: '10px 6px' }}>Motivo Devolución</th>
                  <th style={{ padding: '10px 6px', textAlign: 'center' }}>Estado</th>
                 
                </tr>
              </thead>
              <tbody>
                {datosFiltradosModal.map((row, idx) => (
                  <tr 
                    key={`${row.id_tag}-${idx}`} 
                    style={{ 
                      borderBottom: '1px solid #e0e0e0', 
                      backgroundColor: row.estado_bqt === 'Anulado' ? '#fdf2f2' : row.estado_bqt === 'Devueltos' ? '#f4f9ff' : 'transparent' 
                    }}
                  >
                    <td style={{ padding: '10px 6px', fontWeight: 'bold' }}>{row.id_tag}</td>
                    <td style={{ padding: '10px 6px', fontFamily: 'monospace', color: '#333' }}>
                      {row.id_codigo_barra || '-'}
                    </td>
                    <td style={{ padding: '10px 6px' }}>{row.nombre_producto || '-'}</td>
                    <td style={{ padding: '10px 6px' }}>{row.nombre_empleado || '-'}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', color: '#2b6cb0' }}>
                      #{row.id_transaccion_origen}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#4a5568' }}>{formatearFecha(row.fecha_creacion)}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#4a5568' }}>{formatearFecha(row.fecha_asignacion)}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#c53030' }}>{formatearFecha(row.fecha_anulacion)}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#2b6cb0' }}>{formatearFecha(row.fecha_devolucion)}</td>
                    <td style={{ padding: '10px 6px', maxWidth: '220px', whiteSpace: 'normal', wordBreak: 'break-word', color: row.motivo_devolucion ? '#2d3748' : '#a0aec0', fontStyle: row.motivo_devolucion ? 'normal' : 'italic' }}>
                      {row.motivo_devolucion || 'No especificado'}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: row.estado_bqt === 'Anulado' ? '#fbd6d6' : row.estado_bqt === 'Devueltos' ? '#e2f0fe' : '#fff3cd',
                        color: row.estado_bqt === 'Anulado' ? '#c90000' : row.estado_bqt === 'Devueltos' ? '#1a56db' : '#856404'
                      }}>
                        {row.estado_bqt}
                      </span>
                    </td>

                
                    
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '40px', fontStyle: 'italic' }}>
              No se encontraron registros en estado "{filtroEstadoModal}".
            </div>
          )}
        </div>

        {/* Acciones inferiores del Modal */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '12px' }}>
          <button 
            onClick={() => setMostrarModalRevision(false)} 
            style={{ 
              padding: '8px 20px', 
              backgroundColor: '#4a5568', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontSize: '13px', 
              fontWeight: 'bold',
              transition: 'background-color 0.2s' 
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2d3748'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#4a5568'}
          >
            Cerrar Vista
          </button>
        </div>
      </div>
    </div>
  );
})()}


{/* ================= MODAL FILTRO DE TIPO PARA REPORTES ================= */}
{modalReporteTipo.isOpen && (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
  }}>
    <div style={{
      backgroundColor: '#ffffff', width: '400px', padding: '25px',
      borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
      textAlign: 'center', fontFamily: 'Arial, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '16px', fontWeight: 'bold' }}>
        Filtro de Reporte ({modalReporteTipo.formato})
      </h3>
      <p style={{ margin: '0 0 20px 0', color: '#4b5563', fontSize: '13px', lineHeight: '1.4' }}>
        Selecciona el tipo de producción que deseas exportar:
      </p>

      {/* Selector de Tipo */}
      <div style={{ marginBottom: '25px', textAlign: 'left' }}>
        <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#374151', display: 'block', marginBottom: '6px' }}>
          Tipo de Producción:
        </label>
        <select
          value={tipoReporteSeleccionado}
          onChange={(e) => setTipoReporteSeleccionado(e.target.value)}
          style={{
            width: '100%', padding: '8px', border: '1px solid #ccc',
            borderRadius: '6px', fontSize: '13px', outline: 'none', height: '36px'
          }}
        >
          <option value="BOUQUET">BOUQUET</option>
          <option value="SOLIDO">SOLIDO</option>
        </select>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <button
          onClick={() => setModalReporteTipo({ isOpen: false, formato: "" })}
          style={{
            padding: '10px 20px', backgroundColor: '#e5e7eb', border: 'none',
            borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
            fontWeight: '600', color: '#374151', minWidth: '100px'
          }}
        >
          Cancelar
        </button>
        <button
          onClick={procesarDescargaConTipo}
          style={{
            padding: '10px 20px', 
            backgroundColor: modalReporteTipo.formato === 'EXCEL' ? '#92b91c' : '#ff4356', 
            color: 'white',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontSize: '13px', fontWeight: 'bold', minWidth: '130px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          Descargar {modalReporteTipo.formato}
        </button>
      </div>
    </div>
  </div>
)}

{/* ================= MODAL EMERGENTE PARA CREAR NUEVO SKU ================= */}
{mostrarModalCrear && (
  <div style={{ 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    width: '100vw', 
    height: '100vh', 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 99999 
  }}>
    <div style={{ 
      backgroundColor: 'white', 
      width: '400px', 
      borderRadius: '8px', 
      padding: '20px', 
      display: 'flex', 
      flexDirection: 'column', 
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)' 
    }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#333', fontSize: '16px' }}>Registrar Nuevo SKU</h3>
        <button type="button" onClick={() => setMostrarModalCrear(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold', color: '#999' }}>&times;</button>
      </div>

      {/* Formulario */}
      <form onSubmit={manejarCrearSku} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Campo p_id (BLOQUEADO) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>ID del Producto (p_id):</label>
          <input 
            type="text" 
            required
            disabled // <-- BLOQUEA EL CAMPO COMPLETAMENTE
            value={nuevoSku.p_id}
            onChange={(e) => setNuevoSku({ ...nuevoSku, p_id: e.target.value })}
            style={{ 
              padding: '6px 10px', 
              borderRadius: '4px', 
              border: '1px solid #ccc', 
              fontSize: '13px', 
              outline: 'none',
              backgroundColor: '#f3f4f6', // Color gris para denotar que está bloqueado
              cursor: 'not-allowed'
            }}
          />
        </div>

        {/* Campo nombre (BLOQUEADO) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Nombre del Producto:</label>
          <input 
            type="text" 
            required
            disabled // <-- BLOQUEA EL CAMPO COMPLETAMENTE
            value={nuevoSku.nombre}
            onChange={(e) => setNuevoSku({ ...nuevoSku, nombre: e.target.value })}
            style={{ 
              padding: '6px 10px', 
              borderRadius: '4px', 
              border: '1px solid #ccc', 
              fontSize: '13px', 
              outline: 'none',
              backgroundColor: '#f3f4f6', // Color gris para denotar que está bloqueado
              cursor: 'not-allowed'
            }}
          />
        </div>

        {/* Campo Estado Visual */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Estado Visual:</label>
          <select
            value={nuevoSku.estadovisual}
            onChange={(e) => setNuevoSku({ ...nuevoSku, estadovisual: e.target.value })}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', outline: 'none', height: '32px' }}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
          <button 
            type="button" 
            onClick={() => setMostrarModalCrear(false)} 
            style={{ padding: '6px 12px', backgroundColor: '#f3f4f6', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', color: '#555' }}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={cargando}
            style={{ padding: '6px 16px', backgroundColor: '#92b91c', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', color: 'white', fontWeight: 'bold' }}
          >
            {cargando ? 'Guardando...' : 'Guardar Registro'}
          </button>
        </div>

      </form>
    </div>
  </div>
)}


 </div> 

    

    
  ); 
} 

export default Listar;
