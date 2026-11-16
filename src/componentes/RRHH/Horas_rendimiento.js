
import React, { useEffect, useState } from 'react';

import { API_BASE_URL } from '../../config';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; // Cambia la importación a esta
// src/componentes/RRHH/Horas_rendimiento.js
import { 
  exportarPDF, 
  exportarExcel, 
  exportarPDFbono, 
  exportarExcelposneg, 
  exportarPDFdia // <-- Agrega esta función aquí
} from './Reportes';



const Horas_cultivo = () => {
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
    const [inicio, setInicio] = useState(new Date().toISOString().split('T')[0]);
   const [fin, setFin] = useState(new Date().toISOString().split('T')[0]); 
 
const [camposGuardados, setCamposGuardados] = useState({}); 

// === AGREGAR ESTAS LÍNEAS AQUÍ ===
const [camposDesbloqueados, setCamposDesbloqueados] = useState(false);
const [mostrarModalPassword, setMostrarModalPassword] = useState(false);
const [inputPassword, setInputPassword] = useState('');
// Estado para controlar la visibilidad de las columnas de Tags
const [mostrarTags, setMostrarTags] = useState(true);
 const [mostrarModal, setMostrarModal] = useState(false); // Estado para abrir/cerrar el modal


  // 2. Coloca esto dentro de tu componente Horas_cultivo (donde tienes tus otros estados)
const [modalAbierto, setModalAbierto] = useState(false);
const [horaSeleccionada, setHoraSeleccionada] = useState('');

// Agrega esto junto a tus otros useState locales
const [menuReportesAbierto, setMenuReportesAbierto] = useState(false);

// Nuevo estado para controlar si los campos especiales están desbloqueados


const TIPO_DIA_OPTIONS = [
  { value: "NORMAL", label: "NRMAL" },
  { value: "FERIADO", label: "FR" },
  { value: "FIN DE SEMANA", label: "FS" }
];






// 2. REPORTE DIARIO PDF
if (jsPDF.API && !jsPDF.API.autoTable) {
    jsPDF.API.autoTable = autoTable;
}




const handleDesbloquearCampos = () => {
  if (camposDesbloqueados) {
    setCamposDesbloqueados(false);
    toast.info("Campos bloqueados nuevamente.");
  } else {
    setMostrarModalPassword(true);
  }
};

const verificarPasswordModal = (e) => {
  if (e) e.preventDefault();

  if (inputPassword === "fer1989") { 
    setCamposDesbloqueados(true);
    setMostrarModalPassword(false);
    setInputPassword('');
    toast.success("¡Campos desbloqueados correctamente para su edición!");
  } else {
    toast.error("Contraseña incorrecta. Los campos permanecen bloqueados.");
  }
};

const obtenerDatosDelDia = (datosEntrada) => {
    if (!datosEntrada || !Array.isArray(datosEntrada)) return [];
    return datosEntrada.map(item => ({
        'Empleado / Ítem': item.nombre || item.empleado || item.nombre_completo || 'N/A', 
        'Horas Totales': parseFloat(item.horas_totales_calculadas) || 0,
        'Horas Bono': parseFloat(item.horas_totales_calculadas) === 0 ? 0 : (parseFloat(item.horas_bono) || 0)
    }));
};

// 1. EXPORTAR A EXCEL (Recibe los datos directamente)
const exportarAExcel = (datosTabla) => {
    const datos = obtenerDatosDelDia(datosTabla);
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Reporte Diario');
    XLSX.writeFile(libro, `Reporte_del_Dia_${fechaHoy}.xlsx`);
};



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
    const [listaEmpleados, setListaEmpleados] = useState([]);
    const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState('');
    const [periodoCierre, setPeriodoCierre] = useState(null);

const pad = (n) => n.toString().padStart(2, '0');

const calcularRangoObservacion = (finJornada, horasExtrasStr) => {
  if (!finJornada || finJornada === '') return '-';
  
  // Limpiamos el string "+4.71" quitando el '+'
  const stringLimpio = String(horasExtrasStr || '').replace('+', '').trim();
  const horasExtrasNum = parseFloat(stringLimpio) || 0;

  // ====== RESTRICCIÓN: Solo si son horas positivas (+) ======
  if (horasExtrasNum <= 0) {
    return '-'; // Si es 0 o negativo, muestra un guion (puedes cambiarlo por '' si prefieres vacío)
  }

  // Si es positivo, hace el cálculo normal (ej: 12:30 + 4.71h = 20:13)
  const minInicio = horaAMinutos(finJornada);
  const deltaMinutos = Math.round(horasExtrasNum * 60);
  
  let minFin = (minInicio + deltaMinutos) % 1440;
  if (minFin < 0) minFin += 1440; 

  const horaFinCalculada = minutosAHora(minFin);
  
  return `${finJornada} / ${horaFinCalculada}`;
};

const ejecutarCambioMasivo = async (tipoDiaElegido) => {
    // 1. CERRAR EL MODAL CON EL ESTADO DE REACT (REEMPLAZA LAS LÍNEAS DE WINDOW.BOOTSTRAP)
    setMostrarModal(false);
    try {
        setLoading(true);
        const listaIds = datos.map(item => item.id);
        await fetchWithFallback('/api/RRHH/finsemana_masivo_extras', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ids: listaIds, 
                usuario_modif: user.id,   
                tipo_dia: tipoDiaElegido 
            })
        });

        setDatos(prev => prev.map(item => ({ 
            ...item, 
            tipo_dia: tipoDiaElegido, 
            usuario_modif: user.id    
        })));

        toast.success(`¡Se cambiaron todos a ${tipoDiaElegido}!`);

    } catch (error) {
        toast.error("Error en el proceso: " + error.message);
    } finally {
        setLoading(false);
    }
};


  const estaBloqueado = (fecha) => {
    return periodoCierre?.some(p => 
        p.estado === 'CERRADO' && 
        fecha >= p.fecha_desde && 
        fecha <= p.fecha_hasta
    );
};




const abrirConfirmacion = () => {
  // Verifica si el filtro actual tiene registros válidos en pantalla
  if (!datosFiltrados || datosFiltrados.length === 0) {
    return toast.warning("No hay registros cargados o visibles que coincidan con la búsqueda.");
  }
  setModalAbierto(true); // Abre el modal de forma segura
};


const ingresohorasautorizadas = async () => {
  // 1. Validamos que haya una hora escrita
  if (!horaSeleccionada) return toast.warning("Por favor, ingrese una hora");
  
  // 2. Tomar los IDs de los registros FILTRADOS en pantalla
  if (!datosFiltrados || datosFiltrados.length === 0) {
    return toast.warning("No hay registros en la tabla para actualizar.");
  }
  const listaIds = datosFiltrados.map(item => item.id);

  try {
    setLoading(true);
    setModalAbierto(false); // Cerramos el modal para mejorar la experiencia de usuario

    const valorHoraDecimal = parseFloat(horaSeleccionada);

    // 🚀 ACCIÓN RECTIFICADORA DE ESTADO LOCAL (ROLLBACK VISUAL INMEDIATO)
    // Recorremos el estado y para todos los IDs que se van a actualizar,
    // colocamos la nueva hora autorizada y limpiamos los campos de horas extras.
    setDatos(prevDatos => 
      prevDatos.map(item => 
        listaIds.includes(item.id) 
          ? { 
              ...item, 
              h_autorizadas: valorHoraDecimal
              //,h_inicio_ext: null, 
              //h_fin_ext: null 
            } 
          : item
      )
    );

    // 3. Petición PUT al backend con los IDs correctos
    await fetchWithFallback('/api/RRHH/ingresohorasautorizadas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: listaIds,
        usuario_modif: user.id,
        hora: valorHoraDecimal 
      })
    });

    toast.success("¡Horas autorizadas registradas y horas extras reiniciadas correctamente!");
    setHoraSeleccionada(''); // Limpiamos el campo de hora del modal
    
    // 4. Refrescar la tabla automáticamente para asegurar consistencia total con la DB

    fetchDatos(); 

  } catch (error) {
    console.error("Error en proceso masivo:", error);
    toast.error("Error en el proceso: " + error.message);
    
    // Opcional: Si el servidor falla, podrías volver a llamar a fetchDatos() 
    // aquí para revertir el cambio visual y mostrar lo que realmente hay en DB.
    fetchDatos();
  } finally {
    setLoading(false);
  }
};




// Resetear tabla cuando cambien los filtros principales
useEffect(() => {
   // setDatos([]); // Limpia la tabla
    // Opcional: puedes limpiar también la búsqueda local si quieres un reset total
    // setBusquedaLocal(''); 
}, [empresa, departamento]); 

useEffect(() => {
    fetchWithFallback('/api/RRHH/periodo_cierre')
        .then(res => {
            const data = res.data ? res.data : res;
            // Guardamos el array completo (si es un objeto único, lo envolvemos en array)
            setPeriodoCierre(Array.isArray(data) ? data : [data]);
        })
        .catch(err => console.error("Error al cargar periodos:", err));
}, []);

 const fetchPeriodos = () => {
        fetchWithFallback('/api/RRHH/periodo_cierre')
            .then(res => {
                const data = res.data ? res.data : res;
                setPeriodoCierre(Array.isArray(data) ? data : [data]);
            })
            .catch(err => console.error("Error al cargar periodos:", err));
    };

     // 3. useEffect para la carga inicial
    useEffect(() => {
        fetchPeriodos();
    }, []);

  useEffect(() => {
     fetchWithFallback('/api/DARTIS/lista_empleados')
         .then(res => {
             // Si res es un objeto de Axios, los datos están en res.data
             // y el código de estado en res.status
             if (res.data) {
                 setListaEmpleados(res.data);
             } else {
                 // Si es el fetch nativo pero modificado, intenta manejarlo como objeto
                 setListaEmpleados(res);
             }
         })
         .catch(err => {
             // Aquí capturas si la red falló o el servidor tiró error
             console.error("Error cargando empleados:", err);
         });
 }, []);

   

    // Estados para el modal
const [showModal, setShowModal] = useState(false);
const [registroAClonar, setRegistroAClonar] = useState(null);
const [nuevaFechaClon, setNuevaFechaClon] = useState(new Date().toISOString().split('T')[0]);

const handleClonar = async () => { 
 // 1. Verificación básica de selección 
 if (!registroAClonar || !empleadoSeleccionadoId) { 
 return toast.warning("Por favor, selecciona un empleado de la lista."); 
 } 
  // 2. Buscamos al empleado usando '==' por si uno es String y el otro Number 
 const nuevoEmpleado = listaEmpleados.find(e => e.nombre == empleadoSeleccionadoId); 
  // 3. Validamos que el empleado realmente exista en la lista cargada 
 if (!nuevoEmpleado) { 
 return toast.warning("No se encontraron los datos del empleado seleccionado. Intenta recargar la página."); 
 } 
  // --- NUEVA LÓGICA ANTI-DUPLICADOS --- 
 const existe = datos.some(reg => 
 reg.codigo_emp_dar === nuevoEmpleado.codemp && 
 reg.fecha_dia.startsWith(nuevaFechaClon) 
 ); 
  // 4. Construimos el objeto de forma segura incluyendo el SUELDO actualizado
 const nuevoRegistro = { 
 ...registroAClonar, 
 cedula: nuevoEmpleado.identificacion, 
 nombres: nuevoEmpleado.nombre, 
 codigo_emp_dar: nuevoEmpleado.codemp, 
 departamento: nuevoEmpleado.departamento, 
 fecha_dia: nuevaFechaClon, 
 // ASIGNACIÓN DEL SUELDO: Extraemos el sueldo real del nuevo empleado de Dartis
 sueldo: nuevoEmpleado.sueldo ? parseFloat(nuevoEmpleado.sueldo) : 0,
 usuario_trans: user.id, 
 id: undefined 
 }; 
 
 console.log("Datos a enviar con sueldo actualizado:", nuevoRegistro); 
 
 try { 
 setLoading(true); 
 await fetchWithFallback('/api/RRHH/asistencia_comedor_extras', { 
 method: 'POST', 
 headers: { 'Content-Type': 'application/json' }, 
 body: JSON.stringify(nuevoRegistro) 
 }); 
 
 toast.success(`Registro clonado con éxito para ${nuevoEmpleado.nombre}`); 
 setShowModal(false); 
 fetchDatos(); // Esto refrescará la tabla y recalculará los valores en pantalla
 } catch (error) { 
 toast.error("Error al clonar: " + error.message); 
 } finally { 
 setLoading(false); 
 } 
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


// Convierte una string "HH:MM" a minutos totales (ej: "01:30" -> 90)
const horaAMinutos = (horaStr) => {
  if (!horaStr || !horaStr.includes(':') || horaStr.length < 5) return 0;
  const [horas, minutos] = horaStr.split(':').map(Number);
  return (horas * 60) + minutos;
};

// Convierte minutos totales de regreso a string "HH:MM" (ej: 480 -> "08:00")
const minutosAHora = (minutosTotales) => {
  if (minutosTotales <= 0 || isNaN(minutosTotales)) return '00:00';
  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
};

// Función centralizada que calcula la jornada en base a 3 valores string
const calcularJornadaEnCaliente = (inicio, fin, almuerzo) => {
  const minInicio = horaAMinutos(inicio);
  const minFin = horaAMinutos(fin);
  const minAlmuerzo = horaAMinutos(almuerzo);

  if (minInicio === 0 && minFin === 0) return '00:00';

  // Fórmula: Fin - Inicio
  let diferenciaMinutos = minFin - minInicio;
  // Soporte para jornadas nocturnas / amanecidas (cruza las 00:00)
  if (diferenciaMinutos < 0) diferenciaMinutos += 1440; 

  // Restamos el almuerzo
  const minutosTotales = diferenciaMinutos - minAlmuerzo;
  return minutosAHora(minutosTotales);
};

    // 4. Fetch principal con Fallback
// 1. Definimos una referencia fuera o dentro del componente para guardar el controlador activo
// Puedes colocar esta línea justo arriba de tu función fetchDatos
const abortControllerRef = React.useRef(null);


const fetchDatos = async () => {
  // Si hay una petición anterior procesándose, la cancelamos de inmediato
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  // Creamos un nuevo controlador de aborto para esta consulta activa
  const controller = new AbortController();
  abortControllerRef.current = controller;

  setLoading(true);
  
  // Opcional: Refrescar periodos de cierre al consultar
  fetchPeriodos(); 

  // CORRECCIÓN CLAVE: endpointTimbres ahora usa \({fin} en lugar de\){inicio} para rangos extensos
  const endpointComedor = `/api/RRHH/asistencia_comedor_extras_rend?inicio=${inicio}T00:00:00&fin=${fin}T23:59:59&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`;
  const endpointTimbres = `/api/REPORTES/timbres?inicio=${inicio}T00:00:00&fin=${fin}T23:59:59`; 
 
  try { 
    // Enviamos ambas peticiones en paralelo pasando el signal de aborto
    const [resComedor, resTimbres] = await Promise.all([ 
      fetchWithFallback(endpointComedor, { signal: controller.signal }), 
      fetchWithFallback(endpointTimbres, { signal: controller.signal }) 
    ]); 
 
    // Si el usuario cambió de filtros o canceló mientras cargaba, nos detenemos aquí
    if (controller.signal.aborted) return;

    const datosComedor = resComedor || []; 
    const datosTimbres = resTimbres || []; 
 
    // LOGS DE CONTROL: Para verificar en la consola (F12) cuánto está llegando exactamente
    console.log("=== INSPECCIÓN DE DATOS RECUPERADOS ===");
    console.log("Filas comedor (DB):", datosComedor.length);
    console.log("Filas timbres (DB):", datosTimbres.length);

    const formatearHoraBaseDatos = (horaStr) => { 
      if (!horaStr || horaStr === '') return ''; 
      if (typeof horaStr === 'string' && horaStr.includes(':')) { 
        return horaStr.substring(0, 5); 
      } 
      return horaStr; 
    }; 
 
    const promesasActualizacionSueldo = []; 
 
    // Cruzamos la información en el frontend 
    const datosCruzados = datosComedor.map(registroComedor => { 
      const fechaFila = registroComedor.fecha_dia ? registroComedor.fecha_dia.substring(0, 10) : ''; 
      
      // Buscamos el timbre correspondiente protegiendo la existencia de propiedades
      const timbreCorrespondiente = datosTimbres.find(t => 
        String(t.emp_code) === String(registroComedor.codigo_emp_dar) && 
        (t.fecha_dia || t.fecha || '').startsWith(fechaFila)
      ); 
 
      const empleadoDartis = listaEmpleados.find(e => 
        String(e.codemp) === String(registroComedor.codigo_emp_dar) 
      ); 
 
      const sueldoEmpleado = empleadoDartis ? parseFloat(empleadoDartis.sueldo) : 0; 
      
      if (sueldoEmpleado > 0 && parseFloat(registroComedor.sueldo) !== sueldoEmpleado) { 
        promesasActualizacionSueldo.push( 
          handleUpdate(registroComedor.id, 'sueldo', sueldoEmpleado, false, registroComedor) 
        ); 
      } 
 
      const finJornadaFormateada = formatearHoraBaseDatos(registroComedor.h_inicio_fn); 
      
      const authRaw = registroComedor.h_autorizadas; 
      const horasAutorizadasNum = (authRaw === null || authRaw === undefined || authRaw === '-' || authRaw === '') 
        ? 0 
        : (parseFloat(authRaw) || 0); 
 
      const bonoRaw = registroComedor.h_bono; 
      let horasBonoCalculadas; 
      if (bonoRaw === null || bonoRaw === undefined || bonoRaw === '-' || bonoRaw === '' || parseFloat(bonoRaw) === 0) { 
        horasBonoCalculadas = horasAutorizadasNum; 
      } else { 
        horasBonoCalculadas = parseFloat(bonoRaw) || 0; 
      } 
 
      return { 
        ...registroComedor, 
        h_inicio_jn: formatearHoraBaseDatos(registroComedor.h_inicio_jn), 
        h_almuerzo: formatearHoraBaseDatos(registroComedor.h_almuerzo), 
        h_inicio_fn: formatearHoraBaseDatos(registroComedor.h_inicio_fn), 
        h_inicio_ext: formatearHoraBaseDatos(registroComedor.h_inicio_ext), 
        h_fin_ext: formatearHoraBaseDatos(registroComedor.h_fin_ext), 
        h_jor_normal: formatearHoraBaseDatos(registroComedor.h_jor_normal), 
        // Si no hay marcación (timbreCorrespondiente es undefined), evitamos que rompa asignando '0'
        primera_horaformat: timbreCorrespondiente ? timbreCorrespondiente.primera_horaformat : '0', 
        ultima_horaformat: timbreCorrespondiente ? timbreCorrespondiente.ultima_horaformat : '0', 
        t_total: timbreCorrespondiente ? timbreCorrespondiente.t_total : '0', 
        h_autorizadas: horasAutorizadasNum, 
        h_bono: horasBonoCalculadas, 
        observacion_rango_hr: calcularRangoObservacion(finJornadaFormateada, horasAutorizadasNum) 
      }; 
    }); 
 
    console.log("Filas cruzadas finales listas para renderizar:", datosCruzados.length);

    // Solo actualizamos el estado si esta petición sigue siendo la última vigente
    if (!controller.signal.aborted) {
      setDatos(datosCruzados); 
    } 
 
  } catch (error) { 
    // Ignoramos el error si fue causado por la cancelación intencional del AbortController
    if (error.name === 'AbortError') {
      console.log("Una petición lenta anterior fue cancelada exitosamente.");
    } else {
      console.error("Error en fetchDatos al cruzar asistencia con timbres:", error); 
      setDatos([]); 
    }
  } finally { 
    // Apagamos el loading únicamente si es la petición que sigue vigente
    if (!controller.signal.aborted) {
      setLoading(false); 
    }
  } 
};



// 1. Declarar el estado arriba en tu componente junto a los demás useState
// Agregamos un 4to parámetro opcional: registroFresco
const handleUpdate = async (id, campo, valor, debeNotificar = false, registroFresco = null) => { 
 // 1. Si nos pasan el registro fresco lo usamos, si no, lo buscamos en el estado local
 const itemActual = registroFresco || datos.find(d => d.id === id); 
 
 // Si por alguna razón sigue sin existir el registro, frenamos para evitar el crash
 if (!itemActual) {
   console.warn(`No se encontró el registro con ID ${id} para actualizar el campo ${campo}`);
   return;
 }

 // RESTRICCIÓN: Periodo cerrado
 if (estaBloqueado(itemActual.fecha_dia)) { 
   if (debeNotificar) toast.warning("Este registro pertenece a un periodo CERRADO y no puede ser modificado.");
   return; 
 } 
 
 // Función interna para asegurar que la hora vaya en formato limpio "HH:MM" o null
 const limpiarHora = (val) => { 
   if (!val || val === '' || val === undefined) return null; 
   return typeof val === 'string' ? val.substring(0, 5) : null;
 }; 
 
let valorSanitizado = valor; 

// 1. Forzamos a que si el valor ingresado es vacío o null, se convierta en 0 numérico
if (campo === 'horas_extras' || campo === 'sueldo' || campo === 'h_autorizadas' || campo === 'h_bono') {
  if (valor === '' || valor === null || valor === undefined) {
    valorSanitizado = 0;
  } else {
    valorSanitizado = parseFloat(valor);
    if (isNaN(valorSanitizado)) valorSanitizado = 0;
  }
} else if (['h_inicio_jn', 'h_almuerzo', 'h_inicio_fn', 'h_inicio_ext', 'h_fin_ext', 'h_jor_normal'].includes(campo)) {
  valorSanitizado = limpiarHora(valor);
} else if (campo === 'observacion') {
  // === NUEVO TRATAMIENTO: Mantenemos el valor como texto puro ===
  valorSanitizado = valor === '' || valor === undefined ? null : String(valor);
} else if (valor === '' || valor === undefined) {
  valorSanitizado = null;
} 

// Capturamos el valor actual de h_autorizadas de manera segura, transformando null o "-" en 0
let autorizadasActuales = 0;
if (campo === 'h_autorizadas') {
  autorizadasActuales = valorSanitizado;
} else {
  const vActual = itemActual.h_autorizadas;
  autorizadasActuales = (vActual === null || vActual === undefined || vActual === '-') ? 0 : (parseFloat(vActual) || 0);
}

// 2. Construimos el cuerpo consolidado
const bodyActualizado = { 
  horas_extras: campo === 'horas_extras' ? valorSanitizado : (parseFloat(itemActual.horas_extras) || 0),
  tipo_dia: campo === 'tipo_dia' ? valorSanitizado : (itemActual.tipo_dia || 'NORMAL'),
  m_presencia: campo === 'm_presencia' ? valorSanitizado : (itemActual.m_presencia || '-'),
  m_ausencia: campo === 'm_ausencia' ? valorSanitizado : (itemActual.m_ausencia || '-'),
  h_presencia: campo === 'h_presencia' ? valorSanitizado : (itemActual.h_presencia || '-'),
  h_ausencia: campo === 'h_ausencia' ? valorSanitizado : (itemActual.h_ausencia || '-'),
  
  // === NUEVO CAMPO ADICIONADO AL CUERPO ===
  observacion: campo === 'observacion' ? valorSanitizado : (itemActual.observacion || null),
  
  // Aquí guardamos el valor numérico limpio (evitamos enviar el guion '-' al backend si es numérico)
  h_autorizadas: autorizadasActuales,
  
  sueldo: campo === 'sueldo' ? parseFloat(valor) : (parseFloat(itemActual.sueldo) || 0),
  h_inicio_jn: campo === 'h_inicio_jn' ? valorSanitizado : limpiarHora(itemActual.h_inicio_jn),
  h_almuerzo: campo === 'h_almuerzo' ? valorSanitizado : limpiarHora(itemActual.h_almuerzo),
  h_inicio_fn: campo === 'h_inicio_fn' ? valorSanitizado : limpiarHora(itemActual.h_inicio_fn),
  h_inicio_ext: campo === 'h_inicio_ext' ? valorSanitizado : limpiarHora(itemActual.h_inicio_ext),
  h_fin_ext: campo === 'h_fin_ext' ? valorSanitizado : limpiarHora(itemActual.h_fin_ext),
  h_jor_normal: campo === 'h_jor_normal' ? valorSanitizado : limpiarHora(itemActual.h_jor_normal),
  
  // === CONTROL INTEGRAL DE HORAS BONO ===
  h_bono: campo === 'h_autorizadas'
    ? autorizadasActuales
    : (campo === 'h_bono' ? valorSanitizado : ((itemActual.h_bono === null || itemActual.h_bono === undefined || itemActual.h_bono === '-') ? 0 : (parseFloat(itemActual.h_bono) || 0))),

  usuario_modif: user.id
};

 
 try { 
   await fetchWithFallback(`/api/RRHH/asistencia_comedor_hext_rend/${id}`, {
     method: 'PUT',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(bodyActualizado)
   }); 
 
   // Sincronizamos el estado de React localmente de forma segura
   setDatos(prev => prev.map(d => (d.id === id ? { ...d, ...bodyActualizado } : d)));
 
   if (debeNotificar) {
     const key = `${id}-${campo}`;
     setCamposGuardados(prev => ({ ...prev, [key]: true }));
     setTimeout(() => {
       setCamposGuardados(prev => ({ ...prev, [key]: false }));
     }, 3000);
   } 
 
   if (campo === 'tipo_dia' && debeNotificar) {
     toast.success("Tipo de día actualizado en la base de datos");
   } else if (campo === 'observacion' && debeNotificar) {
     toast.success("Comentario/Observación guardado correctamente");
   } else if (debeNotificar) {
     const camposTiempo = ['h_inicio_jn', 'h_almuerzo', 'h_inicio_fn', 'h_inicio_ext', 'h_fin_ext', 'h_jor_normal'];
     if (camposTiempo.includes(campo)) {
       toast.success("Horario actualizado correctamente");
     } 
   } 
 } catch (error) { 
   console.error("Error en handleUpdate:", error);
 } 
};


    const handleUpdateEstado = async (id, nuevoEstado) => {
        console.log("ID recibido:", id); // Si sale undefined, aquí está el problema
         console.log("ID usr:",  user.id); // Si sale undefined, aquí está el problema
        console.log("URL:", `${API_BASE_URL}/api/RRHH/updateestado_extras/${id}`);
    
    try {
        setLoading(true);
        
        // 1. Llamamos a la función sin asignar a 'response'
        await fetchWithFallback(`/api/RRHH/updateestado_extras/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                estado: nuevoEstado, 
                usuario_modif_estado: user.id 
            })
        });

        setDatos(datos.map(item => 
            item.id === id ? { 
                ...item, 
                estado: nuevoEstado, 
                usuario_modif_estado: user.id 
            } : item
        ));
        toast.success("Estado actualizado correctamente");

    } catch (error) {
        // 3. Si falla (en cualquiera de las APIs), cae aquí directamente.
        toast.error("Error: " + error.message);
    } finally {
        setLoading(false);
    }
};

const handleCopiarTodo = async () => {
    // 1. Limpiamos los valores de los filtros (por si traen espacios o son arrays)
    const idSucursalFinal = String(empresa || '').trim();
    const deptoFinal = String(departamento || '').trim();

    // 2. Validación Robusta: Si el ID es vacío, nulo o "0"
    if (!idSucursalFinal || idSucursalFinal === '0') {
        console.warn("Validación fallida - Sucursal actual:", idSucursalFinal);
        return toast.error("❌ Por favor, seleccione una empresa válida de la lista.");
    }

    if (!deptoFinal) {
        return toast.error("❌ Por favor, seleccione un departamento.");
    }

    try {
        setLoading(true);
        const urlAzure = `/api/RRHH/emp_asis_dartis_rend?departamento=${encodeURIComponent(deptoFinal)}&idSucursal=${idSucursalFinal}`;
        const resAzure = await fetchWithFallback(urlAzure);
        
        const empleadosObtenidos = resAzure.data || resAzure;

        // 4. Verificar si la respuesta trajo gente
        if (!Array.isArray(empleadosObtenidos) || empleadosObtenidos.length === 0) {
            toast.info(`No se encontró personal activo en ${deptoFinal} para la sucursal ${idSucursalFinal}`);
            return;
        }

       // 5. Preparar guardado masivo (Fecha limpia sin horas) y forzar tipo_dia a 'NORMAL'
            const fechaLimpia = inicio.split('T')[0];
            const payload = { 
            empleados: empleadosObtenidos, 
            fecha_dia: fechaLimpia, 
            tipo_dia: 'NORMAL', // <--- Agrega esta línea para establecer el tipo de día por defecto
            usuario_trans: user.id 
            }; 

        // 6. Enviar a la API de guardado
        const resGuardado = await fetchWithFallback('/api/RRHH/horas_extras_masiva_bqt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
          fetchDatos(); // Esto refrescará la tabla y recalculará los valores en pantalla
        // 7. Éxito y actualización local
        toast.success(`✅ Se copiaron ${empleadosObtenidos.length} registros con éxito.`);
        setDatos(empleadosObtenidos);
 
    } catch (error) {
        console.error("Error en handleCopiarTodo:", error);
        
        // Manejo de duplicados (Error 409)
        if (error.response?.status === 409 || error.status === 409) {
            toast.error("❌ Ya existen registros para estos filtros en esta fecha.");
        } else {
            toast.error("❌ Error al procesar, ya existen registros para ese filtro: " + (error.message || "Error de red"));
        }
    } finally {
        setLoading(false);
    }
};


const datosFiltrados = datos.filter(item => { 
  // Nos aseguramos de limpiar espacios extras del buscador
  const termino = (busquedaLocal || '').trim().toLowerCase(); 
  
  // Si el buscador está completamente vacío, dejamos pasar el registro directo
  if (!termino) return true; 

  // Validamos rigurosamente cada propiedad convirtiéndola a string seguro antes de buscar
  const nombreValido = String(item.nombres || '').toLowerCase().includes(termino);
  const cedulaValida = String(item.cedula || '').toLowerCase().includes(termino);
  const deptoValido  = String(item.departamento || '').toLowerCase().includes(termino);
  const rutaValida   = String(item.ruta || '').toLowerCase().includes(termino);
  const paradaValida = String(item.parada || '').toLowerCase().includes(termino);
  const pasajeValido = String(item.pasaje || '').toLowerCase().includes(termino);

  return nombreValido || cedulaValida || deptoValido || rutaValida || paradaValida || pasajeValido;
});



// 2. 🌟 NUEVA LÓGICA DE AGRUPACIÓN POR PUESTO DE TRABAJO
const datosAgrupados = datosFiltrados.reduce((grupos, item) => {
  // Si el puesto viene vacío o nulo, lo asignamos a un grupo genérico
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
  padding: '0.30rem 0.50rem' 
}}> 
  {/* d-flex flex-nowrap obliga a todos los objetos a quedarse estrictamente en la misma línea */}
  <div className="d-flex align-items-end justify-content-between flex-nowrap gap-1.5 w-100"> 
 
    {/* 1. FECHA DESDE */} 
    <div className="flex-shrink-0" style={{ width: '105px' }}> 
      <div className="form-group mb-0"> 
        <label className="small fw-bolder mb-1 text-uppercase text-muted" style={{ fontSize: '8.5px' }}>
          📅 Desde
        </label> 
        <input 
          type="date" 
          className="form-control shadow-sm border-secondary-subtle" 
          value={inicio} 
          onChange={(e) => setInicio(e.target.value)} 
          style={{ height: '34px', padding: '0 4px', fontSize: '0.78rem' }}
        /> 
      </div> 
    </div> 

    {/* 2. FECHA HASTA */} 
    <div className="flex-shrink-0" style={{ width: '105px' }}> 
      <div className="form-group mb-0"> 
        <label className="small fw-bolder mb-1 text-uppercase text-muted" style={{ fontSize: '8.5px' }}>
          📅 Hasta
        </label> 
        <input 
          type="date" 
          className="form-control shadow-sm border-secondary-subtle" 
          value={fin} 
          onChange={(e) => setFin(e.target.value)} 
          style={{ height: '34px', padding: '0 4px', fontSize: '0.78rem' }}
        /> 
      </div> 
    </div> 

    {/* 3. FILTRO EMPRESA */} 
    <div className="flex-grow-1" style={{ minWidth: '110px', maxWidth: '165px' }}> 
      <div className="form-group mb-0"> 
        <label className="small fw-bolder mb-1 text-uppercase text-muted" style={{ fontSize: '8.5px' }}>
          🏢 Empresa
        </label> 
        <select 
          className="form-select shadow-sm border-secondary-subtle" 
          value={empresa} 
          onChange={(e) => setEmpresa(e.target.value)} 
          style={{ height: '34px', fontSize: '0.78rem', paddingRight: '18px', paddingLeft: '6px' }}
        > 
          <option value="">Todas</option> 
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
    </div> 

    {/* 4. FILTRO DEPARTAMENTO */} 
    <div className="flex-grow-1" style={{ minWidth: '110px', maxWidth: '165px' }}> 
      <div className="form-group mb-0"> 
        <label className="small fw-bolder mb-1 text-uppercase text-muted" style={{ fontSize: '8.5px' }}>
          📁 Depto
        </label> 
        <select 
          className="form-select shadow-sm border-secondary-subtle" 
          value={departamento} 
          onChange={(e) => setDepartamento(e.target.value)} 
          style={{ height: '34px', fontSize: '0.78rem', paddingRight: '18px', paddingLeft: '6px' }}
        > 
          <option value="">Todos</option> 
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
    </div> 

    {/* 5. BOTÓN CONSULTAR */} 
    <div className="flex-shrink-0">
      <button 
        onClick={fetchDatos} 
        className="btn shadow-sm fw-bold text-white d-inline-flex align-items-center justify-content-center" 
        disabled={loading} 
        style={{ height: '34px', padding: '0 10px', fontSize: '0.78rem', backgroundColor: '#92b91c', borderColor: '#92b91c' }} 
      > 
        {loading ? "..." : "🔭 Actualizar"} 
      </button> 
    </div>

    {/* SEPARADOR VISUAL DELGADO */}
    <div className="border-end border-secondary-subtle align-self-stretch my-1" style={{ width: '1px' }}></div>

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

    {/* BLOQUE DE ACCIONES MASIVAS */}
    <div className="d-flex align-items-end flex-shrink-0 gap-1"> 
      
      {/* 8. BOTÓN INGRESAR HORAS */}
      <button 
        type="button" 
        onClick={handleCopiarTodo} 
        disabled={loading} 
        className="btn btn-success shadow-sm fw-bold d-inline-flex align-items-center justify-content-center gap-1" 
        style={{ height: '34px', padding: '0 8px', fontSize: '0.78rem', backgroundColor: '#92b91c', borderColor: '#92b91c' }} 
        title={`Ingresar horas (${inicio})`}
      > 
       <span>📥</span> {loading ? "Cargando..." : `Registrar (${inicio})`}

      </button> 
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
      <button className="dropdown-item d-flex align-items-center gap-2" type="button" onClick={() => { exportarExcel(datos, { inicio, fin, empresa, departamento, listaEmpresasFija, fetchWithFallback, setLoading }); setMenuReportesAbierto(false); }}>
        Horas extras (Excel) 
      </button> 
    </li> 
    <li> 
      <button className="dropdown-item d-flex align-items-center gap-2" type="button" onClick={() => { exportarPDF(datos, { inicio, fin, empresa, departamento, listaEmpresasFija, fetchWithFallback, setLoading }); setMenuReportesAbierto(false); }}>
        Horas Extras (PDF) 
      </button> 
    </li> 
    <li> 
      <button className="dropdown-item d-flex align-items-center gap-2" type="button" onClick={async () => { if (typeof setMenuReportesAbierto === 'function') setMenuReportesAbierto(false); await exportarPDFbono(datos, { inicio, fin, empresa, departamento, listaEmpresasFija, fetchWithFallback, setLoading }); }}>
        Horas Bono (PDF) 
      </button> 
    </li>
    <li>
      <button 
        className="dropdown-item d-flex align-items-center gap-2" 
        type="button" 
        onClick={() => { 
          console.log("=== CLIC EN EXPORTAR EXCEL (POS/NEG) ===");
          exportarExcelposneg(null, { inicio, fin, empresa, departamento, listaEmpresasFija, fetchWithFallback, setLoading }); 
          setMenuReportesAbierto(false); 
        }}
      >
        Horas (+)(-) (Excel) 
      </button>
    </li>

    {/* SEPARADOR VISUAL PARA LOS REPORTES NUEVOS DEL DÍA */}
    <li><hr className="dropdown-divider" /></li>
    <li className="dropdown-header fw-bold text-dark" style={{ fontSize: '0.75rem', padding: '4px 16px' }}>REPORTES DEL DÍA</li>

    {/* Busca esta sección dentro de tu dropdown en el JSX y reemplázala */}
            <li> 
              <button 
                className="dropdown-item d-flex align-items-center gap-2" 
                type="button" 
                onClick={() => { 
                  exportarPDFdia(datos, { 
                    inicio, 
                    fin, 
                    empresa, 
                    departamento, 
                    listaEmpresasFija, 
                    fetchWithFallback, 
                    setLoading 
                  }); 
                  setMenuReportesAbierto(false); 
                }}
              > 
             📄   Reporte del Día (PDF) 
              </button> 
            </li>

    
  </ul> 
</div>

      {/* 10. BOTÓN AUTORIZAR HORAS */}
      <button 
        type="button" 
        onClick={() => camposDesbloqueados ? abrirConfirmacion() : setMostrarModalPassword(true)} 
        className="btn btn-primary shadow-sm fw-bold d-inline-flex align-items-center justify-content-center" 
        style={{ height: '34px', padding: '0 8px', fontSize: '0.78rem', backgroundColor: '#2563eb', borderColor: '#2563eb' }} 
      > 
        🚀 Autorizar
      </button> 


          {/* TIPO DIA */} 
          <button 
            type="button" 
            onClick={() => { 
              if (datos.length === 0) return toast.warning("No hay registros cargados"); 
              setMostrarModal(true); 
            }} 
            disabled={loading} 
            className="btn btn-outline-success shadow-sm px-2 fw-bold d-inline-flex align-items-center justify-content-center" 
            style={{ height: '34px', padding: '0 8px', fontSize: '0.78rem', backgroundColor: '#91db3dff', borderColor: '#70a533ff' }} 
          > 
            📅 TIPO DIA 
          </button> 
            
      {/* 11. BOTÓN BLOQUEAR / DESBLOQUEAR */}
      <button 
        type="button" 
        onClick={handleDesbloquearCampos} 
        className={`btn shadow-sm fw-bold d-inline-flex align-items-center justify-content-center ${camposDesbloqueados ? 'btn-danger' : 'btn-warning'}`} 
        style={{ height: '34px', width: '34px', padding: '0', fontSize: '0.85rem' }} 
        title={camposDesbloqueados ? "Bloquear Edición" : "Desbloquear Campos"}
      > 
        {camposDesbloqueados ? "🔒" : "🔓"}
      </button> 


      {/* CHECKBOX PARA OCULTAR/MOSTRAR TAGS */}
<div className="flex-shrink-0 d-flex align-items-center bg-light px-2 rounded border border-secondary-subtle" style={{ height: '34px' }}>
  <div className="form-check mb-0 d-flex align-items-center gap-2">
    <input
      type="checkbox"
      className="form-check-input"
      id="checkMostrarTags"
      checked={mostrarTags}
      onChange={(e) => setMostrarTags(e.target.checked)}
      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
    />
    <label 
      className="form-check-label fw-bold text-muted" 
      htmlFor="checkMostrarTags"
      style={{ fontSize: '11px', cursor: 'pointer', userSelect: 'none' }}
    >
      Ver Rendimiento TAGS
    </label>
  </div>
</div>



    </div> 

  </div> 
</div>



      
             {/* Tabla */}

             
                <div style={styles.tableCard}>
                    <table style={styles.table} >
 <thead>
  {/* FILA 1: CATEGORÍAS GENERALES Y BLOQUES */}
  <tr style={styles.tableHeader}>
     
   
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.thStickyBoth, left: '110px', width: '180px', minWidth: '180px' }}>
        EMPLEADO / ÁREA
    </th>
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.thStickyBoth, left: 0, width: '110px', minWidth: '110px' }}>
       ID - FECHA / DÍA
    </th>
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '80x', minWidth: '80px' }}>
       TIP DÍA
    </th>
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        MOTIVO PRESENCIA
    </th>

    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' }}>
        H.PRS
    </th>

    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        MOTIVO AUSENCIA
    </th>
    
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' }}>
       H.AUS
    </th>

    {/* Bloque Marcas de Reloj */}
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' }}>
        TMB INI
    </th>

    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '50px', minWidth: '50px' }}>
        TMB FIN
    </th>

    {/* 1. BLOQUE SUPERIOR DINÁMICO DE TAGS BQT */}
    {mostrarTags && columnasTags.length > 0 && ( 
      <th colSpan={columnasTags.length} className="borde-grupo-inicio" style={{ 
        ...styles.th, backgroundColor: '#e6f4ea', color: '#137333', textAlign: 'center', borderBottom: 
        '2px solid #137333' , ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' 
      }}> 
        CANTIDAD DE TAGS BQT 
      </th> 
    )}

    {/* TODAS ESTAS COLUMNAS CONTINÚAN FORMANDO PARTE DE LA FILA 1 */}
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        IN JORND
    </th>
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        A/M
    </th>
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        FN JORND
    </th>

    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        HORA DIA
    </th>
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        HORAS TOTALES PROCESO
    </th>
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        HORAS TOTALES SIN PROCESO
    </th>
   
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        HORAS TOTALES CON/SIN PROCESO
    </th>

    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        HORAS EXTRAS(+)(-) 
    </th>
   
   
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        HORAS AUTORIZADAS
    </th>

    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        HORAS BONO
    </th>

    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        PAGAR
    </th>

    {/* Sub-columnas Horas Extras */}
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        IN HR EXTRAS
    </th>
    <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        FN HR EXTRAS
    </th>


     <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        Novedad
    </th>
    {/* ACCIONES Ocupa las 2 filas de alto */}
    <th rowSpan={2} className="borde-grupo-fin" style={{ ...styles.th, backgroundColor: '#f0f0f0ff', color: '#003503ff', textAlign: 'center', ...styles.mainTh, ...styles.thSticky, width: '100px', minWidth: '100px' }}>
        ACCIONES
    </th>
   
  </tr> {/* <-- AQUÍ FINALIZA LA FILA 1 DE MANERA CORRECTA */}


  {/* FILA 2: SUB-ENCABEZADOS DETALLADOS Y CORTOS (COMPLETAMENTE EXTERNA) */}
  {mostrarTags && columnasTags.length > 0 && (
    <tr style={styles.tableHeader}>
      {/* 2. SUB-ENCABEZADOS DINÁMICOS (Muestra: "TAGS 18", "TAGS 20", etc.) */}
      {columnasTags.map(col => { 
        const numeroMeta = col.replace('cantidad_tags_', ''); 
        return ( 
          <th 
            key={col} 
            style={{ 
              ...styles.th, 
              ...styles.subTh, 
              width: '50¡¡25px', 
              minWidth: '25px', 
              position: 'sticky', 
              top: '30px', 
              zIndex: 2, 
              borderBottom: '1px solid #ccc', 
              borderRight: '1px solid #ccc', 
              textAlign: 'center', 
              backgroundColor: '#f4faf6', 
              color: '#17843bff' 
            }} 
          > 
            {numeroMeta} 
          </th> 
        ); 
      })} 
    </tr>
  )}
</thead>



 <tbody>
  {Object.keys(datosAgrupados).length > 0 ? (
    Object.keys(datosAgrupados).map((puestoNombre) => (
      <React.Fragment key={puestoNombre}>
        {/* Regla CSS inyectada para efectos dinámicos visuales */} 
        <style>{` 
          .celda-hover { 
            transition: background-color 0.2s ease; 
            cursor: pointer; 
          } 
          .celda-hover:hover { 
            background-color: #eaf2f8 !important; 
          } 
          .celda-hover:hover td { 
            background-color: #eaf2f8 !important; 
          } 
          .celda-hover:hover input, 
          .celda-hover:hover select { 
            background-color: transparent !important; 
          } 
        `}</style>

       {/* FILA DIVISORIA DE GRUPO (PUESTO DE TRABAJO) */}
          <tr style={{ backgroundColor: '#f1f5f9' }}> 
          <td 
            colSpan={24 + (mostrarTags ? columnasTags.length : 0)} 
            style={{ 
              padding: '10px 16px', 
              fontWeight: '800', 
              color: '#000000', 
              textAlign: 'left',
              borderBottom: '2px solid #cbd5e1', 
              fontSize: '0.9rem', 
              letterSpacing: '0.5px' 
            }} 
          > 
          

            💼 PUESTO: <span style={{ color: '#609a1dff', textTransform: 'uppercase' }}>{puestoNombre}</span> 
            <span className="badge bg-secondary ms-2" style={{ fontSize: '11px' }}>
              {datosAgrupados[puestoNombre].length} {datosAgrupados[puestoNombre].length === 1 ? 'registro' : 'registros'}
            </span>
          </td>
        </tr>

        {/* MAPEO DE LOS REGISTROS DEL GRUPO ESPECÍFICO */}
        {datosAgrupados[puestoNombre].map((item, index) => (
          <tr key={item.id} className="celda-hover" style={styles.tableRow}> 
        

          

            
  {/* 2. COLUMNA EMPLEADO / ÁREA - Optimizada para ocupar menos espacio horizontal */}
<td style={{ ...styles.td, ...styles.tdSticky, left: '0px', width: '190px', minWidth: '190px', borderRight: '2px solid #adb5bd', verticalAlign: 'middle' }}>
    <div style={{ ...styles.empContainer, paddingRight: '10px' }}> 
        {/* Línea principal: Nombre del empleado */} 
        <div style={{ ...styles.empName, fontWeight: '700', color: '#2c3e50', fontSize: '14.5px', lineHeight: '1.2' }}> 
            {item.nombres}
             <span> | <strong>C.I:</strong> {item.cedula}</span>
            
        </div> 
        
        {/* Bloque de datos corrido horizontalmente en una sola masa fluida */} 
        <div style={{ fontSize: '10px', color: '#454545', marginTop: '3px', fontWeight: '500', lineHeight: '1.4' }}> 
           <span> | <strong>Depto:</strong> {item.departamento}</span>
            {item.fechaIngreso && <span> | <strong>Ing:</strong> {item.fechaIngreso.split('T')[0]}</span>}
            <span> | <strong>ID:</strong> {item.codigo_emp_dar || item.id}</span>
            {item.puestotrabajo && <span> | <strong>Puesto:</strong> {item.puestotrabajo}</span>}
            {item.AntiguedadDias !== undefined && item.AntiguedadDias !== null && <span> ({item.AntiguedadDias}d ant.)</span>}
            <span> | <strong>Rend:</strong> <span style={{ color: '#2b6cb0', fontWeight: '700' }}>{item.porcentajerendimiento}%</span></span>
        </div>
    </div> 
</td>

 {/* 1. COLUMNA IS - FECHA / DÍA */} 
            <td style={{ ...styles.td}}>
                <div style={styles.dep}> 
                    <span style={{ fontWeight: 'bold' }}>
                      Id: {item.id} - {item.fecha_dia ? item.fecha_dia.split('T')[0] : 'N/A'}
                    </span>
                    <div style={{ fontSize: '11px', color: '#6e979aff', marginTop: '2px' }}> 
                        {item.fecha_dia ? ( 
                            `${new Date(item.fecha_dia + 'T00:00:00').toLocaleDateString('es-ES', { 
                                weekday: 'long' 
                            }).replace(/^\w/, (c) => c.toUpperCase())}` 
                        ) : ( 
                            `` 
                        )} 
                    </div> 


                       
                </div> 
            </td> 

                        {/* 3. COLUMNA TIPO DE DÍA (DROPDOWN) */}
                        <td style={{ ...styles.td

                                     

                        }}>
                            <select 
                                value={item.tipo_dia || "NORMAL"} 
                                onChange={(e) => handleUpdate(item.id, 'tipo_dia', e.target.value, false)} 
                                style={{
                                    ...styles.selectInput, 
                                    padding: '4px 6px', 
                                    borderRadius: '4px',
                                    fontWeight: '600',
                                    // 🌟 CAMBIO DE COLOR DINÁMICO SEGÚN EL TIPO DE DÍA
                                    backgroundColor: 
                                        item.tipo_dia === 'FERIADO' ? '#f8d7da' :      // Rojo/Rosa suave
                                        item.tipo_dia === 'FIN DE SEMANA' ? '#cce5ff' : // Azul suave
                                        '#ffffffff',                                     // Blanco para Normal
                                    
                                    color: 
                                        item.tipo_dia === 'FERIADO' ? '#721c24' :      // Texto rojo oscuro
                                        item.tipo_dia === 'FIN DE SEMANA' ? '#004085' : // Texto azul oscuro
                                        '#212529',                                     // Texto gris oscuro
                                    
                                    border: 
                                        item.tipo_dia === 'FERIADO' ? '1px solid #f5c6cb' : 
                                        item.tipo_dia === 'FIN DE SEMANA' ? '1px solid #b8daff' : 
                                        '1px solid #b0b0b0ff',
                                        
                                    transition: 'all 0.2s ease'
                                }} 
                            > 
                                {TIPO_DIA_OPTIONS.map((option) => ( 
                                    <option 
                                        key={option.value} 
                                        value={option.value}
                                        style={{ backgroundColor: '#ffffff', color: '#212529' }} // Forzar opciones internas limpias
                                    > 
                                        {option.label} 
                                    </option> 
                                ))} 
                            </select> 
                        </td>


                        <td className="borde-grupo-inicio" style={{ ...styles.td, verticalAlign: 'middle', padding: '6px 4px' }}>
                                {/* Selector */}
                                <select 
                                    value={item.m_presencia || "-"} 
                                    onChange={(e) => handleUpdate(item.id, 'm_presencia', e.target.value, false)} 
                                    style={{
                                        ...styles.selectInput,
                                        width: '100%',
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #c9c9c9ff',
                                        backgroundColor: '#ffffffff',
                                      fontSize: '14px',
                                        color: '#305500',
                                        textAlign: 'right', 
                                        outline: 'none',
                                        height: '40px',
                                        boxSizing: 'border-box'
                                    }} 
                                > 
                                    {TIPO_PRESENCIA.map((option) => ( 
                                        <option key={option.value} value={option.value}> 
                                            {option.label} 
                                        </option> 
                                    ))} 
                                </select> 
                        </td>
                        <td className="borde-grupo-inicio" style={{ ...styles.td, verticalAlign: 'middle', padding: '6px 4px' }}>
                                {/* Input Numérico (CORREGIDO Y SITUADO EN ONCHANGE) */}
                                <input 
                                    type="text" 
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={item.h_presencia ?? ""} 
                                    onChange={(e) => {
                                        const valor = e.target.value;
                                        
                                        // Expresión regular que permite solo números y un punto decimal de forma interactiva
                                        if (valor === "" || /^\d*\.?\d*$/.test(valor)) {
                                            // Llamamos a tu función handleUpdate mapeando el campo real 'h_presencia'
                                            handleUpdate(item.id, 'h_presencia', valor, false);
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                         border: '1px solid #c9c9c9ff',
                                        backgroundColor: '#ffffffff', 
                                      fontSize: '14px',
                                        color: '#305500',
                                        textAlign: 'right', 
                                        outline: 'none',
                                        height: '40px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                          
                        </td>



                        <td className="borde-grupo-inicio" style={{ ...styles.td, verticalAlign: 'middle', padding: '5px 4px' }}>
                            
                                
                                {/* Selector de Motivo Ausencia */}
                                <select 
                                    value={item.m_ausencia || "-"} 
                                    onChange={(e) => handleUpdate(item.id, 'm_ausencia', e.target.value, false)} 
                                    style={{
                                        ...styles.selectInput,
                                        width: '100%', 
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                       border: '1px solid #c9c9c9ff',
                                        backgroundColor: '#ffffffff',
                                     fontSize: '14px',
                                        color: '#305500',
                                        textAlign: 'right', 
                                        outline: 'none',
                                        height: '40px',
                                        boxSizing: 'border-box'
                                    }} 
                                > 
                                    {TIPO_AUSENCIA.map((option) => ( 
                                        <option key={option.value} value={option.value}> 
                                            {option.label} 
                                        </option> 
                                    ))} 
                                </select> 

                          
                        </td>


  <td className="borde-grupo-inicio" style={{ ...styles.td, verticalAlign: 'middle', padding: '5px 4px' }}>    
                                {/* Input Numérico de Horas Ausencia (CORREGIDO) */}
                                <input 
                                    type="text" 
                                    inputMode="decimal" 
                                    placeholder="0.00"
                                    value={item.h_ausencia ?? ""} 
                                    onChange={(e) => {
                                        let val = e.target.value;
                                        val = val.replace(',', '.'); // Reemplaza comas por puntos de forma interactiva

                                        // Permite cualquier cantidad de números, un punto opcional y un máximo de 2 decimales
                                        if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                                            // Pasamos el string limpio directamente para que React lo renderice con fluidez
                                            handleUpdate(item.id, 'h_ausencia', val, false);
                                        }
                                    }} 
                                    onBlur={(e) => {
                                        // CUANDO EL USUARIO SALE DEL CAMPO: Normalizamos el valor a número o nulo si está vacío
                                        const val = e.target.value;
                                        if (val === "" || isNaN(parseFloat(val))) {
                                            handleUpdate(item.id, 'h_ausencia', null, false);
                                        } else {
                                            // Guardamos la conversión flotante limpia definitiva
                                            handleUpdate(item.id, 'h_ausencia', parseFloat(val), false);
                                        }
                                    }}
                                    style={{
                                        width: '100%', 
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                         border: '1px solid #c9c9c9ff',
                                        backgroundColor: '#ffffffff',
                                        fontSize: '14px',
                                        color: '#305500',
                                        textAlign: 'right', 
                                        outline: 'none',
                                        height: '40px',
                                        boxSizing: 'border-box',
                                        fontSize: '14px'
                                    }} 
                                /> 
                           
                        </td>



                                    {/* 4. COLUMNA BIOMÉTRICO RELOJ IN */} 
                                



                        <td className="borde-grupo-inicio" style={styles.td}> 
                                        <div style={styles.empContainer}> 
                                            <div style={{ ...styles.empName, fontSize: '14px',fontWeight: '600', color: '#284a6dff' }}> 
                                            {item.primera_horaformat || '--:--:--'}
                                            </div> 
                                            
                                        </div> 
                            </td>

                             <td className="borde-grupo-inicio" style={styles.td }> 
                                        <div style={styles.empContainer}> 
                                           
                                            <div style={{ ...styles.empName, fontSize: '14px',fontWeight: '600', color: '#284a6dff' }}> 
                                            {item.ultima_horaformat || '--:--:--'} 
                                        </div> 
                                        </div> 
                            </td>
                                
                        {/* =================================================================== */}
                          {/* 💥 MODIFICAR AQUÍ: AGREGAR "mostrarTags &&" ANTES DEL MAPEO 💥 */}
                          {mostrarTags && columnasTags.map(col => { 
                            // 1. Limpieza absoluta: convertimos a string, quitamos espacios y evaluamos como número decimal 
                            const valorLimpio = String(item[col] || '').trim(); 
                            const valorNumerico = parseFloat(valorLimpio) || 0; 
                            
                            // 2. Condición: se activa con CUALQUIER valor estrictamente mayor a 0 
                            const esMayorACero = valorNumerico > 0; 
                            return ( 
                              <td 
                                key={col} 
                                className="borde-grupo-inicio" 
                                style={{ 
                                  ...styles.td, 
                                  textAlign: 'center', 
                                  fontWeight: '700', 
                                   fontSize: '15px',
                                  // Colores condicionales aplicados a TODOS los campos válidos 
                                  color: esMayorACero ? '#155724' : '#737373ff', 
                                  backgroundColor: esMayorACero ? '#e5e5e5ff' : 'transparent',
                                  border: esMayorACero ? '3px solid #0c6630' : styles.td?.border,
                                  transition: 'all 0.2s ease' 
                                }} 
                              > 
                                {/* Mostramos el valor original limpio, si es vacío o nulo muestra 0 */} 
                                {valorLimpio !== '' ? item[col] : 0} 
                              </td> 
                            ); 
                          })} 
                          {/* =================================================================== */}

                                    {/* 6. INPUT: HR INICIO DE JORNADA NORMAL */} 
                                    <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                                        <input 
                                            type="text" placeholder="00:00" maxLength={5} value={item.h_inicio_jn || ''} 
                                            style={{ ...estilosCompactos.inputTime, textAlign: 'center', fontFamily: 'monospace' }} 
                                            onChange={(e) => { 
                                                let nuevoValor = e.target.value.replace(/[^0-9:]/g, ''); 
                                                if (nuevoValor.length === 2 && !nuevoValor.includes(':')) nuevoValor = nuevoValor + ':'; 
                                                const partes = nuevoValor.split(':'); 
                                                if (partes && parseInt(partes[0], 10) > 23) return; 
                                                if (partes && parseInt(partes[1], 10) > 59) return; 
                                                
                                                const key = `${item.id}-h_inicio_jn`; 
                                                if (camposGuardados[key]) setCamposGuardados(prev => ({ ...prev, [key]: false })); 
                                                
                                                let jorCalculada = item.h_jor_normal; 
                                                if (nuevoValor.length === 5) jorCalculada = calcularJornadaEnCaliente(nuevoValor, item.h_fn, item.h_almuerzo); 
                                                setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_jn: nuevoValor, h_jor_normal: jorCalculada } : d)); 
                                            }} 
                                            onBlur={(e) => { 
                                                const valorFinal = e.target.value; 
                                                if (valorFinal && valorFinal.length === 5) { 
                                                    handleUpdate(item.id, 'h_inicio_jn', valorFinal, true); 
                                                } else { 
                                                    handleUpdate(item.id, 'h_inicio_jn', null, true); 
                                                    setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_jn: '' } : d)); 
                                                } 
                                            }} 
                                        /> 
                                        {camposGuardados[`${item.id}-h_inicio_jn`] && <span style={estilosCompactos.badgeOk}>Ok (✓)</span>} 
                                    </td> 

                                    {/* 7. INPUT: TIEMPO ALMUERZO/MERIENDA */} 
                                    <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                                        <input 
                                            type="text" placeholder="00:00" maxLength={5} value={item.h_almuerzo || ''} 
                                            style={{ ...estilosCompactos.inputTime, textAlign: 'center', fontFamily: 'monospace' }} 
                                            onChange={(e) => { 
                                                let nuevoValor = e.target.value.replace(/[^0-9:]/g, ''); 
                                                if (nuevoValor.length === 2 && !nuevoValor.includes(':')) nuevoValor = nuevoValor + ':'; 
                                                const partes = nuevoValor.split(':'); 
                                                if (partes && parseInt(partes[0], 10) > 23) return; 
                                                if (partes && parseInt(partes[1], 10) > 59) return; 
                                                
                                                const key = `${item.id}-h_almuerzo`; 
                                                if (camposGuardados[key]) setCamposGuardados(prev => ({ ...prev, [key]: false })); 
                                                
                                                let jorCalculada = item.h_jor_normal; 
                                                if (nuevoValor.length === 5) jorCalculada = calcularJornadaEnCaliente(item.h_inicio_jn, item.h_inicio_fn, nuevoValor); 
                                                setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_almuerzo: nuevoValor, h_jor_normal: jorCalculada } : d)); 
                                            }} 
                                            onBlur={(e) => { 
                                                const valorFinal = e.target.value; 
                                                if (valorFinal && valorFinal.length === 5) { 
                                                    handleUpdate(item.id, 'h_almuerzo', valorFinal, true); 
                                                } else { 
                                                    handleUpdate(item.id, 'h_almuerzo', null, true); 
                                                    setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_almuerzo: '' } : d)); 
                                                } 
                                            }} 
                                        /> 
                                        {camposGuardados[`${item.id}-h_almuerzo`] && <span style={estilosCompactos.badgeOk}>Ok (✓)</span>} 
                                    </td> 

                                    {/* 8. INPUT: HR FIN DE JORNADA NORMAL */} 
                                    <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                                        <input 
                                            type="text" placeholder="00:00" maxLength={5} value={item.h_inicio_fn || ''} 
                                            style={{ ...estilosCompactos.inputTime, textAlign: 'center', fontFamily: 'monospace' }} 
                                            onChange={(e) => { 
                                                let nuevoValor = e.target.value.replace(/[^0-9:]/g, ''); 
                                                if (nuevoValor.length === 2 && !nuevoValor.includes(':')) nuevoValor = nuevoValor + ':'; 
                                                const partes = nuevoValor.split(':'); 
                                                if (partes && parseInt(partes[0], 10) > 23) return; 
                                                if (partes && parseInt(partes[1], 10) > 59) return; 
                                                
                                                const key = `${item.id}-h_inicio_fn`; 
                                                if (camposGuardados[key]) setCamposGuardados(prev => ({ ...prev, [key]: false })); 
                                                
                                                let jorCalculada = item.h_jor_normal; 
                                                if (nuevoValor.length === 5) jorCalculada = calcularJornadaEnCaliente(item.h_inicio_jn, nuevoValor, item.h_almuerzo); 
                                                setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_fn: nuevoValor, h_jor_normal: jorCalculada } : d)); 
                                            }} 
                                            onBlur={(e) => { 
                                                const valorFinal = e.target.value; 
                                                if (valorFinal && valorFinal.length === 5) { 
                                                    handleUpdate(item.id, 'h_inicio_fn', valorFinal, true); 
                                                } else { 
                                                    handleUpdate(item.id, 'h_inicio_fn', null, true); 
                                                    setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_fn: '' } : d)); 
                                                } 
                                            }} 
                                        /> 
                                        {camposGuardados[`${item.id}-h_inicio_fn`] && <span style={estilosCompactos.badgeOk}>Ok (✓)</span>} 
                                    </td>


                        <td className="borde-grupo-inicio" style={styles.td }> 
                                        <div style={{ ...styles.empName, fontWeight: '600', color: '#2c3e50' ,fontSize: '14px'}}> 
                                                {item.hora_dia} hr
                                            </div> 
                            </td> 

                        <td className="borde-grupo-inicio" style={styles.td }> 
                                        <div style={{ ...styles.empName, fontWeight: '600', color: '#2c3e50' ,fontSize: '14px'}}> 
                                                {item.horas_totales_calculadas} 
                                            </div> 
                            </td> 

                                    <td className="borde-grupo-inicio" style={styles.td }> 
                                        <div style={{ ...styles.empName, fontWeight: '600', color: '#2c3e50' ,fontSize: '14px'}}> 
                                                {item.total_horas_sin_proceso} 
                                            </div> 
                                    </td> 


                                        <td className="borde-grupo-inicio" style={styles.td }> 
                                            <div style={{ ...styles.empName, fontWeight: '600', color: '#2c3e50',fontSize: '14px' }}> 
                                                {item.horas_totales_netas} 
                                            </div> 
                                        </td> 

                          <td className="borde-grupo-inicio" style={{ ...styles.td, textAlign: 'center' }}> 
                                  {(() => {
                                      // 1. Calculamos el total una sola vez
                                      const totalHoras = (Number(item.horas_extras_calculadas) || 0) + 
                                                          (Number(item.h_presencia) || 0) + 
                                                          (Number(item.h_ausencia) || 0);

                                      // 2. Definimos los colores según el resultado (Verde si > 0, Rojo si <= 0)
                                      const esPositivo = totalHoras > 0;
                                      const colorTexto = esPositivo ? '#78ae27ff' : '#ff8c65ff';
                                      const colorFondo = esPositivo ? '#78ae271a' : '#c0502b1a'; // Color con 10% de opacidad para el fondo

                                      return (
                                          <div style={{ 
                                              ...styles.empName, 
                                              display: 'inline-block',      // Hace que el contenedor se ajuste al texto como cápsula
                                              fontWeight: '700', 
                                              fontSize: '14px',
                                              color: colorTexto,            // Color de la letra
                                              backgroundColor: colorFondo,  // Fondo suave de la cápsula
                                              padding: '4px 12px',          // Margen interno (arriba/abajo izquierdo/derecho)
                                              borderRadius: '50px',         // Bordes completamente redondeados
                                              border: `1px solid ${colorTexto}`, // Borde sutil del mismo color
                                              whiteSpace: 'nowrap'          // Evita que el número se parta en dos líneas
                                          }}> 
                                              { totalHoras.toFixed(2) }
                                          </div> 
                                      );
                                  })()}
                              </td>

                                                                              
                                                            
                                    <td className="borde-grupo-inicio" style={styles.td}> 
                                                        <input 
                                                            type="text" 
                                                            inputMode="decimal" 
                                                            placeholder="0.00"
                                                            value={item.h_autorizadas ?? ""} 
                                                            onChange={(e) => {
                                                                let val = e.target.value;
                                                                val = val.replace(',', '.'); // Reemplaza comas por puntos automáticamente

                                                                // 1. Permitimos que escriba libremente (números, punto y hasta 2 decimales)
                                                                if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                    // Actualizamos el estado visual de inmediato para que el teclado responda rápido
                                                                    const registroConCambioTexto = { 
                                                                        ...item, 
                                                                        h_autorizadas: val
                                                                      //  h_inicio_ext: null, // Limpiamos visualmente en el estado
                                                                     //   h_fin_ext: null 
                                                                    };
                                                                    
                                                                    setDatos(prev => prev.map(d => d.id === item.id ? registroConCambioTexto : d));
                                                                }
                                                            }} 
                                                            //disabled={!camposDesbloqueados || estaBloqueado(item.fecha_dia)}
                                                            onBlur={async (e) => {
                                                                // 2. CUANDO EL USUARIO TERMINA DE ESCRIBIR: Procesamos el guardado definitivo
                                                                const val = e.target.value;
                                                                
                                                                // Convertimos a flotante puro o nulo si lo dejó en blanco
                                                                const valorNumerico = (val === "" || isNaN(parseFloat(val))) ? null : parseFloat(val);

                                                                const registroLimpioDefinitivo = { 
                                                                    ...item, 
                                                                    h_autorizadas: valorNumerico
                                                                   // h_inicio_ext: null, 
                                                                   // h_fin_ext: null 
                                                                };

                                                                try {
                                                                    // Guardamos en la base de datos pasando el bloque completo consolidado
                                                                    await handleUpdate(item.id, 'h_autorizadas', valorNumerico, false, registroLimpioDefinitivo);
                                                                } catch (err) {
                                                                    console.error("Error al procesar el cambio con rollback en onBlur:", err);
                                                                }
                                                            }}
                                                            style={{
                                                                width: '60%', 
                                                                padding: '4px 6px',
                                                                borderRadius: '9px',
                                                                border: '1px solid #93ce3aff',
                                                                backgroundColor: '#ffffffff', 
                                                                fontSize: '14px',
                                                                color: '#000000ff',
                                                                textAlign: 'center', 
                                                                outline: 'none',
                                                                height: '40px',
                                                                boxSizing: 'border-box'
                                                            }} 
                                                        /> 
                                                    </td>





                               <td className="borde-grupo-inicio" style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle' }}> 
    <div style={{ 
        ...styles.empName, 
        fontWeight: '600', 
        color: '#2c3e50', 
        fontSize: '14px', 
        display: 'flex', 
        justifyContent: 'center', // Centrado horizontal en Flex
        alignItems: 'center',     // Centrado vertical en Flex
        width: '100%' 
    }}> 
       
        {(() => {
            const horasBono = parseFloat(item.horas_bono) || 0;
            const horasTotales = parseFloat(item.horas_totales_calculadas) || 0;

            if (horasTotales === 0 || horasBono === 0) {
                return <span>0</span>;
            }

            return (
                <span style={{
                    backgroundColor: '#e8f5e9', 
                    color: '#2e7d32',           
                    padding: '2px 8px',
                    borderRadius: '12px',       
                    display: 'inline-flex',    // Cambiado a inline-flex para alinear bien el texto interno
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '14px',
                    fontWeight: '700'
                }}>
                    {item.horas_bono}
                </span>
            );
        })()}
        {/* INDICADOR DE RANGO CALCULADO */} 
    </div> 
</td>

                                        
                                        

                                        
                                        <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                                            <div style={{ display: 'flex', fontSize: '14px',flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                                
                                                {/* INDICADOR DE RANGO CALCULADO */}
                                                <span 
                                                    className="badge text-dark border bg-light w-100" 
                                                    style={{ fontSize: '10px', padding: '3px 4px', letterSpacing: '0.3px', fontFamily: 'monospace' }}
                                                >
                                                    {calcularRangoObservacion(item.h_inicio_jn, item.h_autorizadas)}
                                                </span>

                                                {/* CONTENEDOR HORIZONTAL DE BOTONES */}
                                                <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                                                    
                                                    {/* BOTÓN: APLICAR */}
                                                        <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-success"
                                                                style={{ 
                                                                    padding: '2px 4px', 
                                                                    fontSize: '12px', 
                                                                    whiteSpace: 'nowrap', 
                                                                    lineHeight: 1, 
                                                                    flex: 1,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '1px',
                                                                    fontSize: '14px'
                                                                }}
                                                                title="Transferir rango calculado a campos de horas extras"
                                                                // NUEVA LÓGICA DE BLOQUEO EN EL DISABLED
                                                                disabled={
                                                                    !camposDesbloqueados || 
                                                                    estaBloqueado(item.fecha_dia) || 
                                                                    (() => {
                                                                        const strLimpio = String(item.h_autorizadas || '').replace('+', '').trim();
                                                                        return (parseFloat(strLimpio) || 0) <= 0 || !item.h_inicio_jn;
                                                                    })()
                                                                }
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={async (e) => {
                                                                    e.preventDefault();
                                                                    const horaInicioExtra = item.h_inicio_jn;
                                                                    const strLimpio = String(item.h_autorizadas || '').replace('+', '').trim();
                                                                    const horasExtrasNum = parseFloat(strLimpio) || 0;
                                                                    const minInicio = typeof horaAMinutos === 'function' ? horaAMinutos(horaInicioExtra) : 0;
                                                                    const deltaMinutos = Math.round(horasExtrasNum * 60);
                                                                    let minFin = (minInicio + deltaMinutos) % 1440;
                                                                    if (minFin < 0) minFin += 1440;
                                                                    const horaFinExtra = typeof minutosAHora === 'function' ? minutosAHora(minFin) : '00:00';

                                                                    const registroConInicio = { ...item, h_inicio_ext: horaInicioExtra };
                                                                    const registroConAmbos = { ...item, h_inicio_ext: horaInicioExtra, h_fin_ext: horaFinExtra };

                                                                    try {
                                                                        setDatos(prev => prev.map(d => d.id === item.id ? registroConAmbos : d));
                                                                        await handleUpdate(item.id, 'h_inicio_ext', horaInicioExtra, false, item);
                                                                        await new Promise(resolve => setTimeout(resolve, 300));
                                                                        await handleUpdate(item.id, 'h_fin_ext', horaFinExtra, false, registroConInicio);
                                                                    } catch (err) {
                                                                        console.error("Error al emular digitación:", err);
                                                                    }
                                                                }}
                                                            >
                                                                Autorizar
                                                            </button>


                                    {/* BOTÓN: ROLLBACK (BORRAR) */}
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-outline-danger" 
                                        style={{ 
                                            padding: '2px 4px', 
                                            fontSize: '9px', 
                                            whiteSpace: 'nowrap', 
                                            lineHeight: 1, 
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '1px',
                                            fontSize: '14px'
                                        }}
                                        title="Limpiar campos de horas extras (Rollback)"
                                        disabled={!item.h_inicio_ext && !item.h_fin_ext}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            const registroConInicioLimpio = { ...item, h_inicio_ext: '' };
                                            const registroConAmbosLimpios = { ...item, h_inicio_ext: '', h_fin_ext: '' };

                                            try {
                                                setDatos(prev => prev.map(d => d.id === item.id ? registroConAmbosLimpios : d));
                                                await handleUpdate(item.id, 'h_inicio_ext', null, false, item);
                                                await new Promise(resolve => setTimeout(resolve, 300));
                                                await handleUpdate(item.id, 'h_fin_ext', null, false, registroConInicioLimpio);
                                            } catch (err) {
                                                console.error("Error al ejecutar rollback:", err);
                                            }
                                        }}
                                    >
                                        X
                                    </button>
                                </div>

                            </div>
                        </td>



                                            {/* 9. INPUT: HR INICIO HR EXTRA */} 
                                <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                            <input 
                                type="text" 
                                placeholder="00:00" 
                                maxLength={5} 
                                value={item.h_inicio_ext || ''} 
                                style={{ 
                                    ...estilosCompactos.inputTime, 
                                    textAlign: 'center', 
                                    fontFamily: 'monospace',
                                    fontWeight: '600',fontSize: '14px',
                                    // 🌟 CAMBIO DE COLOR DINÁMICO SI ESTÁ EN CERO O VACÍO
                                    backgroundColor: (!item.h_inicio_ext || item.h_inicio_ext === '00:00') 
                                        ? '#ffeaecff' // Fondo rojo suave
                                        : '#ffffff', // Fondo blanco común
                                    
                                    color: (!item.h_inicio_ext || item.h_inicio_ext === '00:00') 
                                        ? '#721c24' // Texto rojo oscuro
                                        : '#212529', // Texto normal
                                    
                                    border: (!item.h_inicio_ext || item.h_inicio_ext === '00:00') 
                                        ? '1px solid #ffeaecff' 
                                        : '1px solid #ced4da',
                                        
                                    transition: 'all 0.2s ease'
                                }} 
                                onChange={(e) => { 
                                    let nuevoValor = e.target.value.replace(/[^0-9:]/g, ''); 
                                    if (nuevoValor.length === 2 && !nuevoValor.includes(':')) nuevoValor = nuevoValor + ':'; 
                                    const partes = nuevoValor.split(':'); 
                                    
                                    // 🌟 CORRECCIÓN AQUÍ: 'partes' en minúscula para evitar el error no-undef
                                    if (partes && parseInt(partes[0], 10) > 23) return; 
                                    if (partes && partes[1] && parseInt(partes[1], 10) > 59) return; 
                                    
                                    setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_ext: nuevoValor } : d)); 
                                }} 
                                disabled={!camposDesbloqueados || estaBloqueado(item.fecha_dia)}
                                onBlur={(e) => { 
                                    const valorFinal = e.target.value; 
                                    if (valorFinal && valorFinal.length === 5) handleUpdate(item.id, 'h_inicio_ext', valorFinal, true); 
                                    else { 
                                        handleUpdate(item.id, 'h_inicio_ext', null, true); 
                                        setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_ext: '' } : d)); 
                                    } 
                                }} 
                            /> 
                            {camposGuardados[`${item.id}-h_inicio_ext`] && <span style={estilosCompactos.badgeOk} title="Guardado">(✓)</span>} 
                        </td>

                                    {/* 10. INPUT: HR FIN HR EXTRA */} 
                                <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                            <input 
                                type="text" 
                                placeholder="00:00" 
                                maxLength={5} 
                                value={item.h_fin_ext || ''} 
                                style={{ 
                                    ...estilosCompactos.inputTime, 
                                    textAlign: 'center', 
                                    fontFamily: 'monospace',
                                    fontWeight: '600',fontSize: '14px',
                                    // 🌟 CAMBIO DE COLOR DINÁMICO SI ESTÁ EN CERO O VACÍO
                                    backgroundColor: (!item.h_fin_ext || item.h_fin_ext === '00:00') 
                                        ? '#ffeaecff' // Fondo rojo suave
                                        : '#ffffff', // Fondo blanco común
                                    
                                    color: (!item.h_fin_ext || item.h_fin_ext === '00:00') 
                                        ? '#721c24' // Texto rojo oscuro
                                        : '#212529', // Texto normal
                                    
                                    border: (!item.h_fin_ext || item.h_fin_ext === '00:00') 
                                        ? '1px solid #ffeaecff' 
                                        : '1px solid #ced4da',
                                        
                                    transition: 'all 0.2s ease'
                                }} 
                                onChange={(e) => { 
                                    let nuevoValor = e.target.value.replace(/[^0-9:]/g, ''); 
                                    if (nuevoValor.length === 2 && !nuevoValor.includes(':')) nuevoValor = nuevoValor + ':'; 
                                    const partes = nuevoValor.split(':'); 
                                    
                                    // 🌟 VALIDACIÓN DE FORMATO DE HORA SEGURA (Todo en minúsculas)
                                    if (partes[0] && parseInt(partes[0], 10) > 23) return; 
                                    if (partes[1] && parseInt(partes[1], 10) > 59) return; 
                                    
                                    setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_fin_ext: nuevoValor } : d)); 
                                }} 
                                disabled={!camposDesbloqueados || estaBloqueado(item.fecha_dia)}
                                onBlur={(e) => { 
                                    const valorFinal = e.target.value; 
                                    if (valorFinal && valorFinal.length === 5) handleUpdate(item.id, 'h_fin_ext', valorFinal, true); 
                                    else { 
                                        handleUpdate(item.id, 'h_fin_ext', null, true); 
                                        setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_fin_ext: '' } : d)); 
                                    } 
                                }} 
                            /> 
                            {camposGuardados[`${item.id}-h_fin_ext`] && <span style={estilosCompactos.badgeOk} title="Guardado">(✓)</span>} 
                        </td>



<input 
    type="text" 
    placeholder="Escriba una observación..."
    value={item.observacion ?? ""} 
    onChange={(e) => {
        const val = e.target.value;
        // Permite escribir cualquier texto libremente sin restricciones ni expresiones regulares
        handleUpdate(item.id, 'observacion', val, false);
    }} 
    onBlur={(e) => {
        // Al salir del campo, guardamos el texto ingresado tal cual, o null si está completamente vacío
        const val = e.target.value.trim();
        if (val === "") {
            handleUpdate(item.id, 'observacion', '', true);
        } else {
            handleUpdate(item.id, 'observacion', val, true);
        }
    }}
    style={{
        width: '100%', 
        padding: '4px 6px',
        borderRadius: '4px',
        border: '1px solid #c9c9c9ff',
        backgroundColor: '#ffffffff',
        color: '#305500',
  
        outline: 'none',
        height: '50px',
        boxSizing: 'border-box',
        fontSize: '12px'
    }} 
/>

                                    {/* 11. ACCIONES: BOTONES INTEGRADOS CON TUS MÉTODOS Y CLASES */} 
                                            <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}> 
                                            
                                            {/* Botón Clonar Registro (+) */}
                                            <button 
                                                className="btn btn-sm" 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); // Evita clics fantasmas en la fila
                                                    setRegistroAClonar(item); 
                                                    setShowModal(true); 
                                                }}
                                                // 🔑 Se inyecta tu verde corporativo #92b91c
                                                style={{ 
                                                    padding: '6px 12px', 
                                                    fontSize: '12px', 
                                                    cursor: 'pointer',
                                                    backgroundColor: '#92b91c',
                                                    borderColor: '#92b91c',
                                                    color: '#194113ff'
                                                }}
                                            > 
                                                + 
                                            </button>

                                            {/* Botón Anular Registro */}
                                            <button 
                                                className="btn btn-sm" 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); // Evita clics fantasmas en la fila
                                                    if (window.confirm(`¿Estás seguro de anular el registro de ${item.nombres}?`)) {
                                                        handleUpdateEstado(item.id, 'tipo_dia', 'ANULADO', false); 
                                                    }
                                                }}
                                                // 🔑 Se inyecta tu rojo personalizado #d92323
                                                style={{ 
                                                    padding: '6px 12px', 
                                                    fontSize: '10px', 
                                                    cursor: 'pointer',
                                                    backgroundColor: '#d92323',
                                                    borderColor: '#d92323',
                                                    color: '#fff'
                                                }}
                                            > 
                                                🗑️
                                            </button> 

                                        </div> 
                                    </td>

                                </tr> 
                            ))} 

                                 </React.Fragment>
    ))
  ) : ( 
  <tr> 
    {/* 💥 MODIFICAR AQUÍ EL COLSPAN 💥 */}
    <td colSpan={24 + (mostrarTags ? columnasTags.length : 0)} className="text-center p-4 text-muted fw-semibold"> 
      No se encontraron registros coincidentes con los filtros seleccionados. 
    </td> 
  </tr> 
)}

</tbody>


                    </table>
                </div>
            </div>

                    {showModal && (
                        <div style={styles.modalOverlay}>
                            <div style={styles.modalContent}>
                                <h3 style={{ marginBottom: '15px' }}>Copiar Registro a Nuevo Empleado</h3>
                                
                                {/* Selector de Empleado */}
                            <div style={styles.inputGroup}>
                            <label style={styles.label}>Seleccionar Empleado de {registroAClonar?.departamento}:</label>
                            <select 
                                style={styles.input} 
                                value={empleadoSeleccionadoId} 
                                onChange={(e) => setEmpleadoSeleccionadoId(e.target.value)}
                            >
                                <option value="">-- Seleccione un compañero --</option>
                                {listaEmpleados
                                    .filter(emp => emp.departamento === registroAClonar?.departamento) // Filtrado dinámico
                                    .map(emp => (
                                        <option key={emp.codemp} value={emp.nombre}>
                                            {emp.nombre}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>


                                {/* Fecha */}
                                <div style={{ ...styles.inputGroup, marginTop: '15px' }}>
                                    <label style={styles.label}>Fecha para el nuevo registro:</label>
                                    <input 
                                        type="date" 
                                        style={styles.input} 
                                        value={nuevaFechaClon} 
                                        onChange={(e) => setNuevaFechaClon(e.target.value)} 
                                    />
                                </div>

                               <div style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                              <button onClick={() => setShowModal(false)} style={styles.btnSecondary}>
                                  Cancelar
                              </button>
                              <button  
                                  onClick={handleClonar} 
                                  style={{ 
                                      ...styles.btnPrimary, 
                                      backgroundColor: '#ccff67ff', // Fondo del botón en verde lima
                                      color: '#000000',             // Texto en negro (o el color que contraste mejor)
                                      opacity: !empleadoSeleccionadoId ? 0.5 : 1
                                  }}
                                  disabled={loading || !empleadoSeleccionadoId}
                              >
                                  {loading ? 'Procesando...' : 'Crear Copia'}
                              </button>
                          </div>

                            </div>
                        </div>
                    )}


   {/* MODAL CONTROLADO POR REACT */}
    {mostrarModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-sm">
                <div className="modal-content shadow-lg border-0">
                    <div className="modal-header bg-light">
                        <h6 className="modal-title fw-bold text-secondary m-0">Selecciona el Tipo de Día</h6>
                        <button type="button" className="btn-close" onClick={() => setMostrarModal(false)}></button>
                    </div>
                    <div className="modal-body d-flex flex-column gap-2 p-3">
                        <p className="text-muted small text-center mb-2">
                            Se actualizarán <strong>{datos.length}</strong> registros en total.
                        </p>
                        
                        <button 
                            className="btn btn-outline-primary fw-bold py-2 text-start"
                            onClick={() => ejecutarCambioMasivo('NORMAL')}
                        >
                            🔄 Cambiar a NORMAL
                        </button>
                        
                        <button 
                            className="btn btn-outline-danger fw-bold py-2 text-start"
                            onClick={() => ejecutarCambioMasivo('FERIADO')}
                        >
                            📅 Cambiar a FERIADO
                        </button>
                        
                        <button 
                            className="btn btn-outline-success fw-bold py-2 text-start"
                            onClick={() => ejecutarCambioMasivo('FIN DE SEMANA')}
                        >
                            ✨ Cambiar a FIN DE SEMANA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )}
{/* VENTANA EMERGENTE (MODAL) PARA CONTRASEÑA DE SEGURIDAD */}
{mostrarModalPassword && (
  <div style={{ 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    width: '100vw', 
    height: '100vh', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    backdropFilter: 'blur(4px)', 
    zIndex: 10000, // Un z-index ligeramente mayor para superponerse si es necesario
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  }}>
    <div className="card shadow-lg" style={{ width: '100%', maxWidth: '380px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}> 
      
      {/* Encabezado del Modal */} 
      <div className="card-header bg-light py-3" style={{ borderBottom: '1px solid #f3f4f6' }}> 
        <h5 className="m-0 fw-bold text-dark" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}> 
          🔒 Autorización de Seguridad
        </h5> 
        <p className="text-muted small m-0 mt-1" style={{ textAlign: 'left' }}> 
          Se requiere una clave de administrador para modificar horas.
        </p> 
      </div> 

      {/* Cuerpo del Modal */} 
      <form onSubmit={verificarPasswordModal}>
        <div className="card-body p-4" style={{ textAlign: 'left' }}> 
          <label className="form-label fw-semibold text-secondary mb-2"> 
            Ingrese la contraseña: 
          </label> 
          <div className="input-group"> 
            <input 
              type="password" 
              placeholder="••••••••" 
              className="form-control" 
              value={inputPassword} 
              onChange={(e) => setInputPassword(e.target.value)} 
              autoFocus
              style={{ padding: '10px', fontSize: '1rem', borderRadius: '8px' }} 
            /> 
          </div> 
        </div> 

        {/* Acciones / Botones */} 
        <div className="card-footer bg-light d-flex justify-content-end gap-2 py-3" style={{ borderTop: '1px solid #f3f4f6' }}> 
          <button 
            type="button" 
            onClick={() => { 
              setMostrarModalPassword(false); 
              setInputPassword(''); 
            }} 
            className="btn btn-light border" 
            style={{ padding: '8px 16px', borderRadius: '8px' }} 
          > 
            Cancelar 
          </button> 
          
          <button 
            type="submit" 
            disabled={!inputPassword} 
            className="btn btn-primary" 
            style={{ 
              padding: '8px 16px', 
              borderRadius: '8px', 
              backgroundColor: inputPassword ? '#2563eb' : '#d1d5db', 
              borderColor: inputPassword ? '#2563eb' : '#d1d5db' 
            }} 
          > 
            Verificar
          </button> 
        </div> 
      </form>
    </div> 
  </div> 
)}





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
    width: '90px',            // Ancho justo y exacto para el formato HH:MM
    height: '38px',           // Altura reducida y compacta
    fontSize: '14px',        // Letra ligeramente más pequeña y legible
    textAlign: 'center',      // Centrado absoluto del texto
    backgroundColor: '#ffffffff', 
    border: '1px solid #7c7c7cff',
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




const TIPO_PRESENCIA = [
  { value: "-", label: "-" },
  { value: "entrega lasos", label: "ENTREGA LASOS" },
  { value: "tarea echeverria", label: "TAREA ECHEVERRIA" },
  { value: "corte de yute", label: "CORTE DE YUTE" },
  { value: "lactancia", label: "LACTANCIA" },
  { value: "control de calidad", label: "CONTROL DE CALIDAD" },
  { value: "patinando", label: "PATINANDO" },
  { value: "sacando recetas", label: "SACANDO RECETAS" },
  { value: "desempacando", label: "DESEMPACANDO" },
  { value: "en el cuarto frio", label: "EN EL CUARTO FRIO" },
  { value: "limpieza", label: "LIMPIEZA" },
  { value: "desenfundando comida", label: "DESENFUNDANDO COMIDA" },
  { value: "capacitacion medica", label: "CAPACITACION MEDICA" },
  { value: "pegando upc", label: "PEGANDO UPC" },
  { value: "cambio de solucion", label: "CAMBIO DE SOLUCION" },
  { value: "flor de baja", label: "FLOR DE BAJA" },
  { value: "amarrando lasos", label: "AMARRANDO LASOS" },
  { value: "pelando lianas", label: "PELANDO LIANAS" },
  { value: "guardando rosas", label: "GUARDANDO ROSAS" },
  { value: "digitacion", label: "DIGITACION" },
  { value: "otras tareas", label: "OTRAS TAREAS" },
  { value: "reproceso", label: "REPROCESO" },
  { value: "campo", label: "CAMPO" },
  { value: "porteria", label: "PORTERIA" },
  { value: "asistencia", label: "ASISTENCIA" },
  { value: "capacitacion", label: "CAPACITACION" },
  { value: "apoyo bqt", label: "APOYO BQT" },
  { value: "reunion comite", label: "REUNION COMITE" },
  { value: "reunion", label: "REUNION" },
  { value: "empaque", label: "EMPAQUE" },
  { value: "amarrando piñas", label: "AMARRANDO PIÑAS" },
  { value: "amarrando palos", label: "AMARRANDO PALOS" },
  { value: "tinturado", label: "TINTURADO" },
  { value: "arbolitos de navidad", label: "ARBOLITOS DE NAVIDAD" },
  { value: "examen medico", label: "EXAMEN MEDICO" },
  { value: "odontologia", label: "ODONTOLOGIA" },
  { value: "realizacion de recetas", label: "REALIZACION DE RECETAS" },
  { value: "entrega de materiales", label: "ENTREGA DE MATERIALES" },
  { value: "pelando flor", label: "PELANDO FLOR" },
  { value: "prepacion solucion tachos", label: "PREPACION SOLUCION TACHOS" },
  { value: "pintando", label: "PINTANDO" },
  { value: "apoyo en otra area", label: "APOYO EN OTRA AREA" },
  { value: "proceso verdes", label: "PROCESO VERDES" },
  { value: "dispensario medico", label: "DISPENSARIO MEDICO" },
  { value: "falta de flor", label: "FALTA DE FLOR" },
  { value: "horas dev amazing", label: "HORAS DEV AMAZING" },
  { value: "horas dev mes septiembre", label: "HORAS DEV MES SEPTIEMBRE" },
  { value: "ayudando a empacar bq", label: "AYUDANDO A EMPACAR BQ" },
  { value: "proceso apoyo b6", label: "PROCESO APOYO B6" },
  { value: "colocando deco", label: "COLOCANDO DECO" },
  { value: "proceso arbolitos", label: "PROCESO ARBOLITOS" },
  { value: "proceso senecio", label: "PROCESO SENECIO" },
  { value: "proceso molucella", label: "PROCESO MOLUCELLA" },
  { value: "cosechando chrysantemo", label: "COSECHANDO CHRYSANTEMO" },
  { value: "programa finca", label: "PROGRAMA FINCA" },
  { value: "apoyo auditoria whole foods", label: "APOYO AUDITORIA WHOLE FOODS" },
  { value: "terapia", label: "TERAPIA" },
  { value: "flor de feria", label: "FLOR DE FERIA" },
  { value: "pagando horas", label: "PAGANDO HORAS" },
  { value: "proceso flor", label: "PROCESO FLOR" },
  { value: "aspirando", label: "ASPIRANDO" },
  { value: "botando basura", label: "BOTANDO BASURA" },
  { value: "deshojador", label: "DESHOJADOR" },
  { value: "hora x flor nacional", label: "HORA X FLOR NACIONAL" },
  { value: "emboncheo", label: "EMBONCHEO" },
  { value: "reproceso flor", label: "REPROCESO FLOR" },
  { value: "apoyo b6", label: "APOYO B6" },
  { value: "apoyo fm", label: "APOYO FM" },
  { value: "proceso astromelias", label: "PROCESO ASTROMELIAS" },
  { value: "recibir flor amazing", label: "RECIBIR FLOR AMAZING" },
  { value: "recibir flor del campo", label: "RECIBIR FLOR DEL CAMPO" },
  { value: "revisar chrysantemos", label: "REVISAR CHRYSANTEMOS" },
  { value: "trachelium (proc)", label: "TRACHELIUM (PROC)" },
  { value: "supervisor", label: "SUPERVISOR" },
  { value: "cochero(bajador de flor)", label: "COCHERO(BAJADOR DE FLOR)" },
  { value: "revisar la rosa", label: "REVISAR LA ROSA" },
  { value: "rend.marquez luz", label: "REND.MARQUEZ LUZ" },
  { value: "conteo nacional", label: "CONTEO NACIONAL" }
];

const TIPO_AUSENCIA = [
  { value: "-", label: "-" },
  { value: "feriado", label: "FERIADO" },
  { value: "vacaciones", label: "VACACIONES" },
  { value: "lactancia", label: "LACTANCIA" },
  { value: "maternidad", label: "MATERNIDAD" },
  { value: "reposo medico", label: "REPOSO MEDICO" },
  { value: "falta calamidad domestica", label: "FALTA CALAMIDAD DOMESTICA" },
  { value: "devolucion de horas", label: "DEVOLUCIÓN DE HORAS" },
  { value: "capacitacion", label: "CAPACITACIÓN" },
  { value: "dispensario médico", label: "DISPENSARIO MÉDICO" },
  { value: "cita medica", label: "CITA MÉDICA" }
          
];


const styles = {
  // ... tus otros estilos anteriores
  selectInput: {
    width: '100%',
    padding: '3px 2px',
    borderRadius: '4px',
    border: '1px solid #f8faf5ff',
    backgroundColor: '#fdffdeff',
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
    backgroundColor: '#f7f7f7ff', // Fondo sólido para tapar los datos que pasan por detrás
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
    fontWeight: '500', 
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
  empName: { fontWeight: '600', color: '#1e293b', fontSize: '14px' },
  empId: { fontSize: '14px', color: '#1763ceff' },
  dep: { fontWeight: '500', fontSize: '11px', color: '#64748b' },
  
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



export default Horas_cultivo;


