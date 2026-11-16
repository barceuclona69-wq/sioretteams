
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';

const AsistenciaComedor = () => {

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
 const [idNovedadSeleccionada, setIdNovedadSeleccionada] = useState('');
 const [modoNuevaTransaccion, setModoNuevaTransaccion] = useState(false);
 const camposDeshabilitados = !idNovedadSeleccionada && !modoNuevaTransaccion;
 const [showModalFiltroReporte, setShowModalFiltroReporte] = useState(false);
const [repFechaInicio, setRepFechaInicio] = useState('');
const [repFechaFin, setRepFechaFin] = useState('');




    const obtenerFechaLocalISO = () => {
  const d = new Date();
  // Desplazamos la hora según la zona horaria del navegador
  const offset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() - offset);
  return localDate.toISOString().split('T')[0];
};

const [inicio, setInicio] = useState(obtenerFechaLocalISO()); 
const [fin, setFin] = useState(obtenerFechaLocalISO()); 

    const [recorridos, setRecorridos] = useState([]);
    const [paradas, setParadas] = useState([]);
    const [recorridoSeleccionado, setRecorridoSeleccionado] = useState('');
    const [paradaSeleccionada, setParadaSeleccionada] = useState('');
    // Estado para controlar el porcentaje de la barra de carga
    const [progreso, setProgreso] = useState(0);
    // Almacena el objeto completo de la novedad médica que se va a editar
const [novedadEnEdicion, setNovedadEnEdicion] = useState(null); 


// Busca la primera empresa autorizada dentro de tu lista de objetos
const listaEmpresasFija = [
    { id: "5", nombre: "EXPOFLOR CIA. LTDA." },
    { id: "4", nombre: "AMAZINGROSES CIA LTDA" },
    { id: "10", nombre: "CAJA DE AHORROS BELLA FLOR" },
    { id: "3", nombre: "HIDDENGARDEN CIA LTDA" },
    { id: "12", nombre: "OASISFLOWER SAS" },
    { id: "13", nombre: "OASISORGANICS SAS" }
];

// Inicializa el estado con la primera que coincida con los permisos del usuario
const [empresa, setEmpresa] = useState(() => {
    const autorizada = listaEmpresasFija.find(opt => user.empresasAutorizadas.includes(opt.id));
    return autorizada ? autorizada.id : (user.empresasAutorizadas[0] || '');
});

const [departamento, setDepartamento] = useState(() => {
    return user.deptosAutorizados.length > 0 ? user.deptosAutorizados[0] : '';
});

    const [listaDepartamentos, setListaDepartamentos] = useState([]);
    const [busquedaLocal, setBusquedaLocal] = useState('');
    const rutaReportefact = '/REPORTES/rep_alm_mer_fact';
    const navigate = useNavigate(); 
    const [listaEmpleados, setListaEmpleados] = useState([]);
    const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState('');
    const [periodoCierre, setPeriodoCierre] = useState(null);
    const [codigoEmpDarRep, setCodigoEmpDarRep] = useState("");


// Estados para el Modal de Reposo Médico
// Estados para el Modal de Reposo Médico
const [showModalRepMedico, setShowModalRepMedico] = useState(false);
const [empleadoSeleccionadoRep, setEmpleadoSeleccionadoRep] = useState(null); // Guarda el ID del empleado
const [novedadTexto, setNovedadTexto] = useState("");
const [fechaDesdeRep, setFechaDesdeRep] = useState("");
const [fechaHastaRep, setFechaHastaRep] = useState("");
const [estadoRep, setEstadoRep] = useState("pendiente");


const totales = datos.reduce((acc, item) => ({
    // Conteo de 'si' para cada categoría
    almuerzos: acc.almuerzos + (item.almuer_si === 'si' ? 1 : 0),
    meriendas: acc.meriendas + (item.meriend_si === 'si' ? 1 : 0),
    desayunos: acc.desayunos + (item.desayuno === 'si' ? 1 : 0),
    refrigerios: acc.refrigerios + (item.refrigerio === 'si' ? 1 : 0),
    almempresa: acc.almempresa + (item.val_asume_emp_almuer === 'si' ? 1 : 0),
    mrdempresa: acc.mrdempresa + (item.val_asume_emp_meriend === 'si' ? 1 : 0),


    asiste: acc.asiste + (item.presente === 'si' ? 1 : 0),
    noasiste: acc.noasiste + (item.presente === 'no' ? 1 : 0),
    
    // Suma de valores económicos
    valor: acc.valor + (Number(item.val_asume_emp_almuer) || 0) + (Number(item.val_asume_emp_meriend) || 0)
}), { almuerzos: 0, meriendas: 0, desayunos: 0, refrigerios: 0, asiste: 0, noasiste: 0, valor: 0,almempresa: 0, mrdempresa: 0 });



// ... dentro del componente AsistenciaComedor
const estaBloqueado = (fechaRegistroStr, campoModificar) => {
  if (!Array.isArray(periodoCierre) || periodoCierre.length === 0) return true;

  const ahora = new Date();

  // 1. Identificar la referencia de la Base de Datos según el campo modificado
  let referenciaBuscar = "";
  if (campoModificar === "presente") {
    referenciaBuscar = "ASISTENCIA";
  } else if (
    campoModificar === "almuer_si" || 
    campoModificar === "val_asume_emp_almuer" || 
    campoModificar === "desayuno" || 
    campoModificar === "refrigerio"
  ) {
    referenciaBuscar = "ALMUERZOS";
  } else if (campoModificar === "meriend_si" || campoModificar === "val_asume_emp_meriend") {
    referenciaBuscar = "MERIENDAS";
  } else {
    return periodoCierre.some(p => p.estado === 'CERRADO' && ahora >= new Date(p.fecha_desde.toString().replace(' ', 'T')) && ahora <= new Date(p.fecha_hasta.toString().replace(' ', 'T')));
  }

  // 2. Buscar el registro de periodo correspondiente
  const periodoEspecifico = periodoCierre.find(p => p.referencia === referenciaBuscar);
  if (!periodoEspecifico) return false;

  // Si administrativamente el estado general de la DB se pasa a 'CERRADO', se bloquea siempre
  if (periodoEspecifico.estado === 'CERRADO') return true;

  // 3. EXTRAER LAS FECHAS EN FORMATO LIMPIO YYYY-MM-DD
  const matchRegistro = fechaRegistroStr.toString().match(/^\d{4}-\d{2}-\d{2}/);
  const matchDesde = periodoEspecifico.fecha_desde.toString().match(/^\d{4}-\d{2}-\d{2}/);
  const matchHasta = periodoEspecifico.fecha_hasta.toString().match(/^\d{4}-\d{2}-\d{2}/);

  if (!matchRegistro || !matchDesde || !matchHasta) return false;

  // Transformamos "2026-09-04" en el número entero comparable 20260904
  const numeroFila = parseInt(matchRegistro[0].replace(/-/g, ''), 10);
  const numeroDesde = parseInt(matchDesde[0].replace(/-/g, ''), 10);
  const numeroHasta = parseInt(matchHasta[0].replace(/-/g, ''), 10);

  // Evaluamos si el día consultado está dentro del periodo autorizado de la DB
  const estaEnRangoPermitido = numeroFila >= numeroDesde && numeroFila <= numeroHasta;

  // ====================================================================
  // 🔑 REGLA EXCLUSIVA PARA LA NUEVA REFERENCIA "ASISTENCIA"
  // ====================================================================
  if (referenciaBuscar === "ASISTENCIA") {
    // Si NO está en el rango permitido (como hoy 04/09 que es menor al desde 05/09), BLOQUEA inmediatamente sin mirar horas
    return !estaEnRangoPermitido;
  }

  // ====================================================================
  // 4. REGLA PARA COMIDAS (ALMUERZOS Y MERIENDAS) - CONTROL HORARIO DIARIO
  // ====================================================================
  if (!estaEnRangoPermitido) return true; // Si la fecha está fuera de rango para las comidas, también bloquea

  const limiteDesdeConHora = new Date(periodoEspecifico.fecha_desde.toString().replace(' ', 'T'));
  const limiteHastaConHora = new Date(periodoEspecifico.fecha_hasta.toString().replace(' ', 'T'));

  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const minutosInicioHabilitado = limiteDesdeConHora.getHours() * 60 + limiteDesdeConHora.getMinutes();
  const minutosFinHabilitado = limiteHastaConHora.getHours() * 60 + limiteHastaConHora.getMinutes();

  // Bloquea las celdas de alimentación si la hora actual no está dentro de su ventana diaria permitida
  return minutosAhora < minutosInicioHabilitado || minutosAhora > minutosFinHabilitado;
};


const descargarReporteNovedadesExcel = async () => {
  if (!repFechaInicio || !repFechaFin) {
    return toast.error("Por favor, seleccione ambas fechas para el reporte.");
  }
  
  try {
    setLoading(true);
    // Consumimos el nuevo endpoint
    const data = await fetchWithFallback(`/api/REPORTES/rep_novedades_medicas?inicio=${repFechaInicio}&fin=${repFechaFin}`);
    
    if (!data || data.length === 0) {
      toast.info("No se encontraron transacciones de reposos médicos en el rango seleccionado.");
      return;
    }

    // 🌟 Conversión nativa a Excel usando XLSX
    const hoja = XLSX.utils.json_to_sheet(data);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Reposos Médicos");
    
    // Descarga automática del archivo
    XLSX.writeFile(libro, `Reporte_Reposos_Medicos_${repFechaInicio}_al_${repFechaFin}.xlsx`);
    toast.success("¡Reporte generado y descargado con éxito!");
    setShowModalFiltroReporte(false); // Cerramos el modal

  } catch (error) {
    console.error("Error al generar Excel:", error);
    toast.error("Error al descargar el reporte: " + error.message);
  } finally {
    setLoading(false);
  }
};


const marcarTodosAlmuerzo = async () => {
    if (datos.length === 0) return toast.warning("No hay registros cargados");

    const confirmar = window.confirm(`Se marcará PRESENTE y ALMUERZO para ${datos.length} personas. ¿Continuar?`);
    
    if (confirmar) {
        try {
            setLoading(true);
            const listaIds = datos.map(item => item.id);

            await fetchWithFallback('/api/RRHH/almuerza_y_presente_masivo', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ids: listaIds, 
                    usuario_modif: user.id 
                })
            });

            // Refrescamos la tabla localmente para que se vea el cambio en ambos campos
            setDatos(prev => prev.map(item => ({ 
                ...item, 
                almuer_si: 'si', 
                presente: 'si' 
            })));

            toast.success("¡Asistencia y Almuerzos registrados!");
        } catch (error) {
            toast.error("Error en el proceso: " + error.message);
        } finally {
            setLoading(false);
        }
    }
};


const marcarTodosAusentes = async () => {
    if (datos.length === 0) return toast.warning("No hay registros");

    const confirmar = window.confirm(`¿Marcar como AUSENTES a los ${datos.length} registros? (Esto quitará sus almuerzos)`);
    
    if (confirmar) {
        try {
            setLoading(true);
            const listaIds = datos.map(item => item.id);

            await fetchWithFallback('/api/RRHH/ausente_todos_masivo', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: listaIds, usuario_modif: user.id })
            });

            // Actualizamos la pantalla: todo a 'no'
            setDatos(prev => prev.map(item => ({ 
                ...item, 
                presente: 'no', 
                almuer_si: 'no',
                meriend_si: 'no'
            })));
            
            toast.info("Registros marcados como ausentes");
        } catch (error) {
            toast.error("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    }
};

const replicarYActualizarComedorMasivo = async () => {
    // Validaciones de filtros obligatorios antes de enviar al backend
    if (!inicio) return toast.error("Seleccione una fecha origen en 'Desde'");
    if (!fin) return toast.error("Seleccione una fecha destino en 'Hasta'");
    if (!empresa || empresa === '0') return toast.error("Seleccione una empresa válida");
    if (!departamento) return toast.error("Seleccione un departamento");

    const confirmar = window.confirm(
        `¿Confirmas replicar el comedor en bloque desde el día (${inicio}) al día (${fin})?`
    );
    if (!confirmar) return;

    try {
        setLoading(true);
        setProgreso(50); // Barra de progreso simulada a la mitad

        // 1. Estructuramos el payload asignando inicio a Origen y fin a Destino
        const payloadEnvio = {
            fechaOrigen: inicio,      // DESDE donde tomamos la información
            fechaDestino: fin,        // HASTA donde se va a guardar
            idEmpresa: empresa,
            departamento: departamento
        };

        // 🟢 TRAZA DE AUDITORÍA: Ver datos exactos en la Consola del Navegador (F12)
        console.log("🚀 FRONTEND - Enviando datos al Backend:", payloadEnvio);

        // 2. Enviamos una sola petición directa con las instrucciones de las fechas
        await fetchWithFallback('/api/RRHH/update_comedor_masivo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadEnvio)
        });

        setProgreso(100);
        toast.success(`¡Campos comedor replicados con éxito en la fecha ${fin}!`);

        // 3. ACCIÓN CLAVE: Movemos el filtro 'Desde' a la fecha destino para visualizar
        // los nuevos cambios guardados en la base de datos de manera automática.
        setInicio(fin);

        // 4. Volvemos a consultar la grilla para traer los nuevos cambios del backend
        if (typeof fetchDatos === 'function') {
            fetchDatos();
        }

    } catch (error) {
        console.error("❌ Error en la replicación en bloque:", error);
        toast.error("Error al procesar la replicación masiva.");
    } finally {
        setLoading(false);
        setTimeout(() => setProgreso(0), 1200);
    }
};


// Resetear tabla cuando cambien los filtros principales
useEffect(() => {
    setDatos([]); // Limpia la tabla
    // Opcional: puedes limpiar también la búsqueda local si quieres un reset total
    // setBusquedaLocal(''); 
}, [empresa, departamento]); 


// 1. Cargar recorridos al iniciar
useEffect(() => {
    fetchWithFallback('/api/DARTIS/recorrido_dartis')
        .then(data => {
            setRecorridos(data || []);
        })
        .catch(err => console.error("Error recorridos:", err));
}, []);

useEffect(() => {
    fetchWithFallback('/api/DARTIS/parada_dartis')
        .then(data => {
            setParadas(data || []);
        })
        .catch(err => console.error("Error parada:", err));
}, []);


  const comprobarEstadoCierre = () => {
    if (!Array.isArray(periodoCierre) || periodoCierre.length === 0) return true;

    // Obtenemos la fecha/hora actual en formato "YYYY-MM-DD HH:mm" (Local)
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const ahoraLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    return periodoCierre.some(p => {
        // Limpiamos las fechas del backend para que sean "YYYY-MM-DD HH:mm"
        const inicio = p.fecha_desde.replace('T', ' ').substring(0, 16);
        const fin = p.fecha_hasta.replace('T', ' ').substring(0, 16);
        
        return ahoraLocal >= inicio && ahoraLocal <= fin;
    });
};


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
    // Verificamos en el estado 'datos' (que ya tienes cargados) si ya existe el registro
    const existe = datos.some(reg => 
        reg.codigo_emp_dar === nuevoEmpleado.codemp && 
        reg.fecha_dia.startsWith(nuevaFechaClon) // Compara solo la parte YYYY-MM-DD
    );

    if (existe) {
        return toast.error(`Ya existe un registro para ${nuevoEmpleado.nombre} en la fecha ${nuevaFechaClon}`);
    }
    // ------------------------------------

    // 4. Construimos el objeto de forma segura
    const nuevoRegistro = {
        ...registroAClonar, 
        cedula: nuevoEmpleado.identificacion,
        nombres: nuevoEmpleado.nombre, // Asegúrate que en el API sea 'nombre' (como en tu SQL)
        codigo_emp_dar: nuevoEmpleado.codemp,
        departamento: nuevoEmpleado.departamento,
        fecha_dia: nuevaFechaClon,
        // Aumentamos tu variable global aquí:
         usuario_trans: user.id, // <--- Se asigna el ID del usuario logueado
        id: undefined 

        
    };

    console.log("Datos a enviar:", nuevoRegistro); 

            try {
                setLoading(true);
                // Ya no necesitas 'const response', la función lanza error si falla
                await fetchWithFallback('/api/RRHH/asistencia_comedor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoRegistro)
                });

                // Si llega aquí, es porque fue exitoso (ok)
                toast.success(`Registro clonado con éxito para ${nuevoEmpleado.nombre}`);
                setShowModal(false);
                fetchDatos(); 
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

const fetchDatos = async () => {
    fetchPeriodos(); 
    setLoading(true);

    const endpoint = `/api/RRHH/asistencia_comedor?inicio=${inicio}T00:00:00&fin=${fin}T23:59:59&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`;

    try {
        const data = await fetchWithFallback(endpoint);
        const empleados = data || [];

        // Consultamos las novedades en paralelo basándonos en el código de empleado
    // Dentro de tu función fetchDatos en React, en la sección de mapeo de empleados:
const empleadosConEstado = await Promise.all(
    empleados.map(async (empleado) => {
        const codigoEmpleado = empleado.codigo_emp_dar; 

        if (!codigoEmpleado) {
            return { ...empleado, novedades_medicas: [] };
        }

        try {
            // 🔥 ENVIAMOS LAS FECHAS: Pasamos 'inicio' y 'fin' de tus inputs de filtros superiores
            const respuestaEstados = await fetchWithFallback(
                `/api/RRHH/consultar_novedad_medica?codigo_emp_dar=${codigoEmpleado}&fecha_desde=${inicio}&fecha_hasta=${fin}&_t=${Date.now()}`
            );
            
            return { 
                ...empleado, 
                novedades_medicas: Array.isArray(respuestaEstados) ? respuestaEstados : [] 
            };
        } catch (err) {
            console.error(`Error consultando historial médico para código ${codigoEmpleado}:`, err);
            return { ...empleado, novedades_medicas: [] };
        }
    })
);

        setDatos(empleadosConEstado);

    } catch (error) {
        console.error("Error en fetchDatos:", error);
        setDatos([]);
    } finally {
        setLoading(false);
    }
};






const handleUpdate = async (id, campo, valor) => {
    const itemActual = datos.find(d => d.id === id);

    // RESTRICCIÓN: Periodo cerrado
    if (estaBloqueado(itemActual.fecha_dia)) {
        toast.warning("Este registro pertenece a un periodo CERRADO y no puede ser modificado.");
        return;
    }

    // =======================================================================
    // ✂️ SE ELIMINÓ EL BLOQUE DE INTERCEPCIÓN QUE LEVANTABA EL MODAL AUTOMÁTICAMENTE
    // Ahora el switch viaja directo a guardar sin interrupciones.
    // =======================================================================

    // 1. Clonamos el registro actual
    let nuevosValores = {
        ...itemActual,
        [campo]: valor,
        usuario_modif: user.id
    };

    // --- LÓGICA DE ASISTENCIA AUTOMÁTICA ---
    
    // Lista de campos de consumo
    const camposConsumo = ['almuer_si', 'meriend_si', 'desayuno', 'refrigerio'];

    // REGLA 1: Si activa CUALQUIER consumo, se marca PRESENTE automáticamente
    if (camposConsumo.includes(campo) && valor === 'si') {
        nuevosValores.presente = 'si';
    }

    // REGLA 2: Si marca PRESENTE como 'no', se quitan TODOS los consumos automáticamente
    if (campo === 'presente' && valor === 'no') {
        nuevosValores.almuer_si = 'no';
        nuevosValores.meriend_si = 'no';
        nuevosValores.desayuno = 'no';
        nuevosValores.refrigerio = 'no';
    }

    if (campo === 'presente' && valor === 'si') {
        nuevosValores.almuer_si = 'si';
    }

    // 2. Cuerpo para la API
    const bodyActualizado = {
        presente: nuevosValores.presente,
        almuer_si: nuevosValores.almuer_si,
        meriend_si: nuevosValores.meriend_si,
        refrigerio: nuevosValores.refrigerio,
        desayuno: nuevosValores.desayuno,
        feriado: nuevosValores.feriado,
        calamidad_domestica: nuevosValores.calamidad_domestica,
        vacaciones: nuevosValores.vacaciones,
        reposo_medico: nuevosValores.reposo_medico,
        paternidad: nuevosValores.paternidad,
        maternidad: nuevosValores.maternidad,
        falta_injustificada: nuevosValores.falta_injustificada,
        val_asume_emp_almuer: nuevosValores.val_asume_emp_almuer,
        val_asume_emp_meriend: nuevosValores.val_asume_emp_meriend,
        hora_devuelta_dia: nuevosValores.hora_devuelta_dia,
        usuario_modif: nuevosValores.usuario_modif,
        comedor: nuevosValores.comedor,
        ruta: nuevosValores.ruta,
        parada: nuevosValores.parada,
        pasaje: nuevosValores.pasaje
    };

    try {
        // Ejecutamos tu consulta original hacia el backend de asistencias
        await fetchWithFallback(`/api/RRHH/asistencia_comedor/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyActualizado)
        });

        // Actualizamos el estado local (todos los campos que cambiaron) preservando las novedades
        setDatos(prev => prev.map(d => (d.id === id ? { ...d, ...nuevosValores } : d)));
        
    } catch (error) {
        toast.error("Error al actualizar: " + error.message);
    }
};


    const handleUpdateEstado = async (id, nuevoEstado) => {
        console.log("ID recibido:", id); // Si sale undefined, aquí está el problema
         console.log("ID usr:",  user.id); // Si sale undefined, aquí está el problema
        console.log("URL:", `${API_BASE_URL}/api/RRHH/updateestado/${id}`);
    
    try {
        setLoading(true);
        
        // 1. Llamamos a la función sin asignar a 'response'
        await fetchWithFallback(`/api/RRHH/updateestado/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                estado: nuevoEstado, 
                usuario_modif_estado: user.id 
            })
        });

        // 2. Si el código llega aquí, es porque la petición fue exitosa.
        // No hace falta preguntar if(response.ok).
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

        // 3. Obtener personal desde Dartis
        // Usamos encodeURIComponent porque los departamentos tienen espacios (ej: "Bella 6")
        const urlAzure = `/api/RRHH/emp_asis_dartis?departamento=${encodeURIComponent(deptoFinal)}&idSucursal=${idSucursalFinal}`;
        const resAzure = await fetchWithFallback(urlAzure);
        
        const empleadosObtenidos = resAzure.data || resAzure;

        // 4. Verificar si la respuesta trajo gente
        if (!Array.isArray(empleadosObtenidos) || empleadosObtenidos.length === 0) {
            toast.info(`No se encontró personal activo en ${deptoFinal} para la sucursal ${idSucursalFinal}`);
            return;
        }

        // 5. Preparar guardado masivo (Fecha limpia sin horas)
        const fechaLimpia = fin.split('T')[0];

        const payload = {
            empleados: empleadosObtenidos,
            fecha_dia: fechaLimpia,
            usuario_trans: user.id
        };

        // 6. Enviar a la API de guardado
        const resGuardado = await fetchWithFallback('/api/RRHH/asistencia_comedor_masiva', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

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


const ejecutarCopiaYReplicarComedor = async () => {
    // 1. Ejecuta tu función de copia original (sin alterarla)
    // Usamos await para garantizar que termine de insertar los registros antes de leer
    try {
        await handleCopiarTodo();
        
        // 2. Inmediatamente después de copiar, dispara la sincronización del comedor
        // Esta función activará el modal y subirá la barra de progreso de 0% a 100%
        await replicarYActualizarComedorMasivo();
        
    } catch (error) {
        console.error("Error en la cadena de ejecución:", error);
    }
};


    const exportarExcel = () => {
        if (datos.length === 0) return;
        const hoja = XLSX.utils.json_to_sheet(datos);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Asistencia");
        XLSX.writeFile(libro, `Asistencia_${inicio}.xlsx`);
    };

    // Nuevo estado para la fecha de réplica
const [fechaReplica, setFechaReplica] = useState(new Date().toISOString().split('T')[0]);

const replicarDatos = async () => {
    if (datos.length === 0) return toast.warning("No hay datos para replicar");
    if (!empresa || !departamento) return toast.warning("Por favor, selecciona Empresa y Departamento antes de replicar.");

        
       try {
    setLoading(true);

    
const fechaFormateada = new Date(fechaReplica).toISOString().split('T')[0];
    // 1. VALIDACIÓN: fetchWithFallback ya debería retornar la data procesada
    // Nota: Asegúrate de usar backticks (``) para las variables en el string
    const existentes = await fetchWithFallback(
        `/api/RRHH/asistencia_comedor?inicio=${fechaFormateada}&fin=${fechaFormateada}&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`
    );

    if (existentes && existentes.length > 0) {
        setLoading(false);
        return toast.warning(`Ya existen ${existentes.length} registros para esta fecha y filtros.`);
    }

    // 2. CONFIRMACIÓN
    if (!window.confirm(`¿Replicar ${datos.length} registros para el ${fechaReplica}?`)) {
        setLoading(false);
        return;
    }

    // 3. EJECUCIÓN: Usamos fetch normal para los POST o si fetchWithFallback admite POST, úsalo
   // 3. EJECUCIÓN DE RÉPLICA
const promesas = datos.map(async (item) => { // Agregamos async
    const { id, ...resto } = item; // Extraemos el id para ignorarlo
    
    const nuevoRegistro = {
        ...resto,
        fecha_dia: fechaFormateada,
        usuario_trans: user.id
    };

    // DEBES retornar el fetch para que Promise.all pueda rastrearlo
    return fetchWithFallback('/api/RRHH/asistencia_comedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoRegistro)
    });
});

// Ahora sí, esperamos a que todas terminen

    const respuestas = await Promise.all(promesas);
  
    // Validar si todos los registros se guardaron (status 200-299)
    const todosOk = respuestas.every(res => res.ok);

    if (todosOk) {
        toast.success("Réplica completada con éxito");
        setInicio(fechaReplica);
        setFin(fechaReplica);
        fetchDatos(); 
    } else {
        toast.success("La réplica terminó.");
    }

} catch (error) {
    console.error("Error en réplica:", error);
    toast.error("Error de conexión o en el servidor.");
} finally {
    setLoading(false);
}

};


const datosFiltrados = datos.filter(item => {
    const termino = busquedaLocal.toLowerCase();
    
    return (
        item.nombres?.toLowerCase().includes(termino) || 
        item.cedula?.toString().includes(termino) ||
        item.departamento?.toLowerCase().includes(termino) ||
        // Convertimos los int a String para poder usar includes
        (item.ruta !== null && item.ruta !== undefined && item.ruta.toString().includes(termino)) ||
        (item.parada !== null && item.parada !== undefined && item.parada.toString().includes(termino)) ||
        // Pasaje al ser varchar también se incluye
        item.pasaje?.toLowerCase().includes(termino)
    );
});


    return (
        
  
 <div style={styles.pageBackground}>
         <div style={styles.container}>{/* inicio B*/}  
                 {/* HEADER: Identidad y Resumen */}
      
        <div>
          <h3 style={styles.title}>Asistencia Comedor</h3>

             </div>

                                            
{/* INICIO B */} 
{/* PANEL PRINCIPAL DE FILTROS */} 
<div style={styles.card}> {/* inicio C*/} 
 
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '1px' }}> 
 
    {/* FILA 1: FILTROS Y ACCIONES ULTRA COMPACTOS */} 
    <div style={{ 
      display: 'flex', 
      flexDirection: 'row', 
      flexWrap: 'nowrap', 
      alignItems: 'flex-end', 
      justifyContent: 'space-between', 
      gap: '8px', 
      backgroundColor: '#fff',
      width: '100%',
      margin: 0
    }}> 
 
      {/* 1. FECHA DESDE */} 
      <div style={{ ...styles.inputGroup, flex: '0 1 105px', margin: 0 }}> 
        <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>📅 Desde:</label> 
        <input 
          type="date" 
          style={{ ...styles.input, width: '100%', height: '30px', fontSize: '11px', padding: '2px 4px' }} 
          value={inicio} 
          onChange={(e) => setInicio(e.target.value)} 
        /> 
      </div> 
 
      {/* 2. FECHA HASTA */} 
      <div style={{ ...styles.inputGroup, flex: '0 1 105px', margin: 0 }}> 
        <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>📅 Hasta:</label> 
        <input 
          type="date" 
          style={{ ...styles.input, width: '100%', height: '30px', fontSize: '11px', padding: '2px 4px' }} 
          value={fin} 
          onChange={(e) => setFin(e.target.value)} 
        /> 
      </div> 
 
      {/* 3. FILTRO EMPRESA */} 
      <div style={{ ...styles.inputGroup, flex: '1 1 150px', margin: 0 }}> 
        <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>🏢 Empresa:</label> 
        <select 
          style={{ ...styles.input, width: '100%', height: '30px', fontSize: '11px', padding: '2px 4px' }} 
          value={empresa} 
          onChange={(e) => setEmpresa(e.target.value)} 
        > 
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

      {/* 4. FILTRO DEPARTAMENTO */} 
      <div style={{ ...styles.inputGroup, flex: '1 1 130px', margin: 0 }}> 
        <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>📂 Depto:</label> 
        <select 
          style={{ ...styles.input, width: '100%', height: '30px', fontSize: '11px', padding: '2px 4px' }} 
          value={departamento} 
          onChange={(e) => setDepartamento(e.target.value)} 
        > 
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
 
      {/* CONTENEDOR DE ACCIONES SEGUIDAS */} 
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '4px', flexWrap: 'nowrap', margin: 0 }}> 
         

      
        <label className="fw-bold mb-1 text-muted d-flex align-items-center gap-1" style={{ fontSize: '11px' }}> 
          🔍
        </label> 
        <div className="position-relative"> 
          <input 
            type="text" 
            className="form-control shadow-sm py-1 px-2" 
            placeholder="Nombre, cédula o apellido..." 
            value={busquedaLocal} 
            onChange={(e) => setBusquedaLocal(e.target.value)} 
            style={{ paddingRight: '30px', height: '32px', borderRadius: '6px', fontSize: '12px' }} 
          /> 
          {busquedaLocal && ( 
            <button onClick={() => setBusquedaLocal('')} className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted p-0 me-2" style={{ zIndex: 5, border: 'none', background: 'transparent', fontSize: '11px' }}>✕</button> 
          )} 
       
      </div> 

        {/* 5. BOTÓN CONSULTAR */} 
        <button 
          onClick={fetchDatos} 
          className="btn shadow-sm px-2 fw-bold text-white d-inline-flex align-items-center justify-content-center" 
          disabled={loading} 
          style={{ 
            height: '30px', 
            minWidth: '75px', 
            backgroundColor: '#92b91c', 
            borderColor: '#c2f133ff', 
            opacity: loading ? 0.7 : 1, 
            fontSize: '11px',
            margin: 0 
          }} 
        > 
          {loading ? ( 
            <span className="spinner-border spinner-border-sm" role="status"></span> 
          ) : ( 
            <>🔍 Buscar</> 
          )} 
        </button> 
 
        {/* 6. BOTÓN EXCEL */} 
        <button 
          onClick={exportarExcel} 
          className="btn btn-outline-success shadow-sm px-2 fw-bold d-inline-flex align-items-center justify-content-center" 
          disabled={datos.length === 0} 
          style={{ height: '30px', minWidth: '65px', fontSize: '11px', margin: 0 }} 
        > 
          📊 Excel 
        </button>


      
        
          <button onClick={marcarTodosAlmuerzo} disabled={loading} 
          className="btn btn-outline-success shadow-sm px-2 fw-bold d-inline-flex align-items-center justify-content-center"
          style={{ height: '30px', minWidth: '65px', fontSize: '11px', margin: 0 }} > 
             TODS ALMZ 
          
          </button> 
          <button onClick={marcarTodosAusentes} disabled={loading} className="btn btn-outline-danger shadow-sm fw-bold d-flex align-items-center justify-content-center gap-1 flex-grow-1" 
            style={{ height: '30px', minWidth: '65px', fontSize: '11px', margin: 0 }} > 
            TODS AUSNT 
          </button> 
       
       
          <button onClick={replicarYActualizarComedorMasivo} disabled={loading} className="btn shadow-sm fw-bold text-white d-flex align-items-center justify-content-center gap-1 flex-grow-1"
           style={{ height: '32px', borderRadius: '6px', fontSize: '11px', backgroundColor: '#92b91c', borderColor: '#b6e234ff', opacity: loading ? 0.7 : 1 }}> 
            {loading ? ( 
              <><span className="spinner-border spinner-border-sm" role="status"></span> Replicando...</> 
            ) : ( 
              <><i className="bi bi-arrow-repeat"></i> Rep Comdr ({inicio} a {fin})</> 
            )} 
          </button> 
          <button onClick={ejecutarCopiaYReplicarComedor} disabled={loading} className="btn btn-warning shadow-sm fw-bold d-flex align-items-center justify-content-center gap-1 flex-grow-1" style={{ height: '32px', borderRadius: '6px', fontSize: '11px' }}> 
            <i className="bi bi-copy"></i> Copiar ({fin}) 
          </button> 
       
      

        {/* 7. SELECTOR DE REPORTES (CONDICIONAL) */} 
        {(Number(user.idperfil) === 1 || Number(user.idperfil) === 3) && ( 
          <div style={{ display: 'flex', flexDirection: 'column', margin: 0 }}> 
            <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>📋 Rept.</label> 
            <select 
              onChange={(e) => { 
                const val = e.target.value; 
                if (val === 'reporteNovedades') { 
                  setRepFechaInicio(inicio); 
                  setRepFechaFin(fin); 
                  setShowModalFiltroReporte(true); 
                } else if (val) { 
                  const routes = { 
                    reporte1: '/REPORTES/rep_alm_mer_des_ref', 
                    reporte2: '/REPORTES/rep_alm_mer_des_comedor', 
                    reporte3: '/REPORTES/rep_alm_mer_fact_agrupado', 
                    reporte4: '/REPORTES/rep_alm_mer_fact_agrupado2' 
                  }; 
                  window.open(routes[val], '_blank'); 
                } 
                e.target.value = ""; 
              }} 
              className="form-select form-select-sm shadow-sm py-0" 
              style={{ width: '85px', height: '30px', fontSize: '11px' }} 
              defaultValue="" 
            > 
              <option value="" disabled>Rept...</option> 
              <option value="reporte1">➥ Depto</option> 
              <option value="reporte2">➥ Comedor</option> 
              <option value="reporte3">➥ Fact. Agrup</option> 
              <option value="reporte4">➥ Fact. Agrup 2</option> 
              <option value="reporteNovedades">📊 Rep. Reposos</option> 
            </select> 
          </div> 
        )} 
      </div> 
 
    </div> 

    
{/* SECCIÓN DE HERRAMIENTAS AVANZADAS - ULTRA COMPACTA */} 

  <div className="row g-2 align-items-center" style={{ padding: '1px' }}> 
    {/* ================= COLUMNA IZQUIERDA: INDICADORES DE BLOQUEO EN UNA SOLA LÍNEA HORIZONTAL ================= */} 
    <div className="col-12 d-flex flex-row align-items-center flex-wrap gap-2" style={{ width: '100%' }}> 
      <label className="fw-bold text-muted d-flex align-items-center gap-1 m-0" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}> 
        🔒 ESTADOS DE PERIODO:
      </label> 
      
      <div className="d-flex flex-row flex-nowrap gap-2 align-items-center flex-grow-1" style={{ overflowX: 'auto' }}>
        {Array.isArray(periodoCierre) && periodoCierre.length > 0 ? ( 
          periodoCierre 
          .filter(p => p && p.referencia) 
          .map((periodo, index) => { 
   
            const d = new Date(); 
            const offset = d.getTimezoneOffset() * 60000;
            const ahora = new Date(d.getTime() - offset);
            const fechaOriginalDesde = periodo.fecha_desde ? periodo.fecha_desde.toString() : '';
            const fechaOriginalHasta = periodo.fecha_hasta ? periodo.fecha_hasta.toString() : '';
            const fechaDesdeConHora = new Date(fechaOriginalDesde.replace(' ', 'T')); 
            const fechaHastaConHora = new Date(fechaOriginalHasta.replace(' ', 'T')); 
            let estaAbierto = false; 
            if (periodo.estado !== 'CERRADO') { 
              if (periodo.referencia === "ASISTENCIA") { 
                const stringHoy = ahora.getFullYear() + String(ahora.getMonth() + 1).padStart(2, '0') + String(ahora.getDate()).padStart(2, '0'); 
                const matchDesde = fechaOriginalDesde.match(/^\d{4}-\d{2}-\d{2}/); 
                const matchHasta = fechaOriginalHasta.match(/^\d{4}-\d{2}-\d{2}/); 
                const numeroHoy = parseInt(stringHoy, 10); 
                const numeroDesde = matchDesde ? parseInt(matchDesde[0].replace(/-/g, ''), 10) : 0; 
                const numeroHasta = matchHasta ? parseInt(matchHasta[0].replace(/-/g, ''), 10) : 0; 
                estaAbierto = numeroHoy >= numeroDesde && numeroHoy <= numeroHasta; 
              } else { 
                const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes(); 
                const minutosInicioHabilitado = fechaDesdeConHora.getHours() * 60 + fechaDesdeConHora.getMinutes(); 
                const minutosFinHabilitado = fechaHastaConHora.getHours() * 60 + fechaHastaConHora.getMinutes(); 
                const stringHoy = ahora.getFullYear() + String(ahora.getMonth() + 1).padStart(2, '0') + String(ahora.getDate()).padStart(2, '0'); 
                const matchDesde = fechaOriginalDesde.match(/^\d{4}-\d{2}-\d{2}/); 
                const matchHasta = fechaOriginalHasta.match(/^\d{4}-\d{2}-\d{2}/); 
                const numeroHoy = parseInt(stringHoy, 10); 
                const numeroDesde = matchDesde ? parseInt(matchDesde[0].replace(/-/g, ''), 10) : 0; 
                const numeroHasta = matchHasta ? parseInt(matchHasta[0].replace(/-/g, ''), 10) : 0; 
                const estaEnRangoDeFecha = numeroHoy >= numeroDesde && numeroHoy <= numeroHasta; 
                estaAbierto = estaEnRangoDeFecha && minutosAhora >= minutosInicioHabilitado && minutosAhora <= minutosFinHabilitado; 
              } 
            } 
            const formatearFechaHora = (objetoFecha) => { 
              if (isNaN(objetoFecha.getTime())) return '00/00/0000 00:00'; 
              const dia = objetoFecha.getDate().toString().padStart(2, '0'); 
              const mes = (objetoFecha.getMonth() + 1).toString().padStart(2, '0'); 
              const anio = objetoFecha.getFullYear(); 
              const horas = objetoFecha.getHours().toString().padStart(2, '0'); 
              const minutos = objetoFecha.getMinutes().toString().padStart(2, '0'); 
              return `${dia}/${mes}/${anio} ${horas}:${minutos}`; 
            }; 
            const desdeCompleto = formatearFechaHora(fechaDesdeConHora); 
            const hastaCompleto = formatearFechaHora(fechaHastaConHora); 
            return ( 
              <div key={index} className="bg-light p-1 rounded border d-flex flex-row align-items-center gap-2" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}> 
                <span className="badge bg-warning text-dark fw-bold px-1 py-0.5" style={{ fontSize: '10px', letterSpacing: '0.1px' }}> 
                  {periodo.referencia} 
                </span> 
                <span className="badge px-1 py-0.5 d-flex align-items-center" style={estaAbierto ? { backgroundColor: '#92b91c', color: '#fff', fontSize: '10px' } : { backgroundColor: '#d92323', color: '#fff', fontSize: '10px' }}> 
                  <i className={`bi ${estaAbierto ? 'bi-unlock-fill' : 'bi-lock-fill'}`}></i> 
                </span> 
                <div className="text-muted font-monospace d-flex flex-row gap-2 align-items-center bg-white px-1.5 py-0.5 rounded border" style={{ fontSize: '10px' }}> 
                  <div><strong className="text-secondary">DESDE:</strong> {desdeCompleto}</div> 
                  <div className="text-secondary">|</div> 
                  <div><strong className="text-secondary">HASTA:</strong> {hastaCompleto}</div> 
                </div> 
              </div> 
            ); 
          }) 
        ) : ( 
          <div className="d-flex align-items-center justify-content-center bg-light rounded border border-dashed px-2" style={{ height: '28px' }}> 
            <span className="text-muted small fst-italic" style={{ fontSize: '11px' }}>Cargando estados...</span> 
          </div> 
        )} 
      </div>
    </div> 
  </div>   



     
    {/* FILA 2: RESUMEN DE TOTALES ULTRA SEGUIDO Y PEQUEÑO */} 
    <div style={{ 
      display: 'flex', 
      flexDirection: 'row', 
      flexWrap: 'nowrap', 
      gap: '4px', 
      backgroundColor: '#f8f9fa', 
      padding: '6px 4px', 
      borderRadius: '6px', 
      border: '1px solid #dee2e6', 
      justifyContent: 'space-between',
      width: '100%',
      marginTop: '2px'
    }}> 
      {/* Registro Total */} 
      <div style={{ textAlign: 'center', flex: '1 1 auto', minWidth: '70px' }}> 
        <small style={{ display: 'block', color: '#666', fontSize: '9px', fontWeight: 'bold' }}>TOTAL REGISTROS</small> 
        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#333' }}>{datos.length}</span> 
      </div> 
      {/* Indicadores Dinámicos */} 
      {[ 
        { label: 'ASISTE', value: totales.asiste, color: '#96bc00ff' }, 
        { label: 'NO ASISTE', value: totales.noasiste, color: '#dc3545' }, 
        { label: 'DESAYUNOS', value: totales.desayunos }, 
        { label: 'ALMUERZOS', value: totales.almuerzos }, 
        { label: 'REFRIGERIOS', value: totales.refrigerios }, 
        { label: 'MERIENDAS', value: totales.meriendas }, 
        { label: 'ASUM. EMP. ALM', value: totales.almempresa }, 
        { label: 'ASUM. EMP. MER', value: totales.mrdempresa } 
      ].map((item, index) => ( 
        <div key={index} style={{ 
          textAlign: 'center', 
          borderLeft: '1px solid #dee2e6', 
          paddingLeft: '4px', 
          flex: '1 1 auto',
          minWidth: '65px' 
        }}> 
          <small style={{ display: 'block', color: '#555', fontSize: '8px', fontWeight: 'bold', lineHeight: '1', whiteSpace: 'nowrap' }}>{item.label}</small> 
          <div style={{ fontWeight: 'bold', color: item.color || '#198754', fontSize: '14px', marginTop: '1px' }}>{item.value}</div> 
        </div> 
      ))} 
    </div> 
 

 

  </div> 
</div> {/* fin C */}

{/* FIN B */}

 
  {/* MODAL FLOTANTE DE CARGA Y PROGRESO */} 
  {loading && progreso > 0 && ( 
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1060, backdropFilter: 'blur(2px)' }} tabIndex="-1"> 
      <div className="modal-dialog modal-dialog-centered"> 
        <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px' }}> 
          <div className="modal-body p-4 text-center"> 
            <div className="mb-3"> 
              <span style={{ fontSize: '3.2rem' }} className="d-inline-flex">⏳</span> 
            </div> 
            <h5 className="modal-title fw-bold text-dark mb-1">Replicando Comedores</h5> 
            <p className="text-muted small px-3 mb-3">Por favor, no cierre la página ni actualice el navegador. Estamos sincronizando los registros.</p> 
            <div className="progress rounded-pill my-3" style={{ height: '20px', backgroundColor: '#e9ecef' }}> 
              {/* 🎯 CORREGIDO: 'progreso' escrito de manera impecable con su letra r */}
              <div className="progress-bar progress-bar-striped progress-bar-animated bg-success text-white fw-bold" role="progressbar" style={{ width: `${progreso}%`, transition: 'width 0.1s ease', fontSize: '0.85rem' }} aria-valuenow={progreso} aria-valuemin="0" aria-valuemax="100"> 
                {progreso}% 
              </div> 
            </div> 
            <div className="d-flex justify-content-center align-items-center gap-2 mt-2"> 
              <div className="spinner-border spinner-border-sm text-success" role="status"></div> 
              <span className="text-secondary fw-bold small">Procesando... {progreso}%</span> 
            </div> 
          </div> 
        </div> 
      </div> 
    </div> 
  )} 

{/* FIN B */}



                  {/* Tabla */}
<div style={styles.tableCard}>
<table style={styles.table} >
    <thead>
    {/* PRIMERA FILA: CATEGORÍAS GENERALES */}
    <tr style={{ ...styles.tableHeader, backgroundColor: '#f8f9fa' }}>
        <th rowSpan={2} style={{ ...styles.th, ...styles.stickyHeader, width: '90px' }}>FECHA</th>
        <th rowSpan={2} style={{ ...styles.th, ...styles.stickyHeader, width: '200px' }}>EMPLEADO</th>
        <th rowSpan={2} style={{ ...styles.th, ...styles.stickyHeader, backgroundColor: '#e3ffa8ff', color: '#515723ff' }}>ASISTE</th>
        
        {/* Grupo de Novedades / Permisos */}
        <th colSpan={8} style={{ ...styles.th, ...styles.stickyHeader, backgroundColor: '#f2f2f2', color: '#595959', textAlign: 'center', borderBottom: '2px solid #d9d9d9' }}>
           NOVEDADES Y PERMISOS
        </th>
        
        {/* Grupo de Servicios de Comedor */}
        <th colSpan={4} style={{ ...styles.th, ...styles.stickyHeader, backgroundColor: '#e2efda', color: '#375623', textAlign: 'center', borderBottom: '2px solid #a9d08e' }}>
            ALIMENTACIÓN
        </th>
        
        {/* Grupo de Asignaciones Especiales */}
        <th colSpan={2} style={{ ...styles.th, ...styles.stickyHeader, backgroundColor: '#fff2cc', color: '#7f6000', textAlign: 'center', borderBottom: '2px solid #ffd966' }}>
            APLICA EMPRESA
        </th>
        
        {/* Grupo de Logística y Transporte */}
        <th colSpan={4} style={{ ...styles.th, ...styles.stickyHeader, backgroundColor: '#fce4d6', color: '#c65911', textAlign: 'center', borderBottom: '2px solid #f4b084' }}>
            COMEDOR - RUTA Y TRANSPORTE
        </th>
        
        <th rowSpan={2} style={{ ...styles.th, ...styles.stickyHeader, width: '100px' }}>ACCIONES</th>
    </tr>

    {/* SEGUNDA FILA: SUB-ENCABEZADOS DETALLADOS */}
    {/* SEGUNDA FILA: SUB-ENCABEZADOS DETALLADOS CON TOP CALCULADO */}
<tr style={styles.tableHeader}>
    {/* Sub-columnas de Novedades */}
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Feriado</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Vacación</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>H.Dev Día</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Paternid.</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Rep. Médico (Validcn.Certificado)</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Maternid.</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Calmd. Dmst.</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Falt. Inju.</th>

    {/* Sub-columnas de Alimentación */}
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Desayuno</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Almuerzo</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Refrigerio</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Merienda</th>

    {/* Sub-columnas de Asignaciones */}
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Asm/EmAlm</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Asm/EmMrd</th>

    {/* Sub-columnas de Transporte */}
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Comedor</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Ruta</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Parada</th>
    <th style={{ ...styles.th, ...styles.subTh, position: 'sticky', top: '41px', zIndex: 3 }}>Pasaje</th>
</tr>

</thead>

                       
                        <tbody >

                                                            
                                {/* Inyecta esta regla CSS arriba en tu componente o JSX */}
                                <style>{`
                                    .celda-hover {
                                    transition: background-color 0.2s ease;
                                    cursor: pointer;
                                    }
                                    .celda-hover:hover {
                                    background-color: #f3fed8ff !important; /* El color que deseas cuando pasas el mouse */
                                    }
                                `}</style>

                            {datosFiltrados.map((item, index) => (
                                <tr  className="celda-hover" key={item.id} style={index % 2 === 0 ? {} : styles.trEven}>

                                     <td className="borde-grupo-inicio" style={styles.td}>
                                         {item.id}
                                <div style={styles.dep}>

                                    {item.fecha_dia ? (() => {
                                        // Si viene con formato ISO completo, extraemos los primeros 10 caracteres (YYYY-MM-DD) directamente como texto uniforme
                                        return item.fecha_dia.substring(0, 10);
                                    })() : 'N/A'}
                                    </div>




                                     </td>
                                                                            
                                       
                                     
                                    <td className="borde-grupo-inicio" style={styles.td}>
                                            <div style={styles.empName}>
                                                {item.nombres} 
                                                <span style={{ fontSize: '9px', color: '#666', marginLeft: '1px' }}>
                                                    ({item.departamento})-IDEMP: ({item.codigo_emp_dar})
                                                </span>
                                            </div>
                                     </td>

                                  

                                    <>


                            {/* Tu celda actualizada */}
                          <td className="borde-grupo-inicio" style={styles.td}>
                                        <EditableSelect 
                                            id={item.id} 
                                            campo="presente" 
                                            valor={item.presente} 
                                            handleUpdate={handleUpdate} 
                                            // 🔑 Llama a la función global pasándole el campo correcto
                                            disabled={estaBloqueado(item.fecha_dia, 'presente')} 
                                        />
                                    </td>



                            </>

                                      <td className="borde-grupo-inicio"  style={styles.td}>
                                    <label className="switch">
                                        <input 
                                        type="checkbox" 
                                        checked={item.feriado === 'si'} // O el valor booleano que uses
                                        onChange={(e) => handleUpdate(item.id, 'feriado', e.target.checked ? 'si' : 'no')}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                    </td>

                                     <td className="borde-grupo-inicio"  style={styles.td}>
                                    <label className="switch">
                                        <input 
                                        type="checkbox" 
                                        checked={item.vacaciones === 'si'} // O el valor booleano que uses
                                        onChange={(e) => handleUpdate(item.id, 'vacaciones', e.target.checked ? 'si' : 'no')}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                    </td>


                                       <td className="borde-grupo-inicio"   style={styles.td}>
                                    <label className="switch">
                                        <input 
                                        type="checkbox" 
                                        checked={item.hora_devuelta_dia === 'si'} // O el valor booleano que uses
                                        onChange={(e) => handleUpdate(item.id, 'hora_devuelta_dia', e.target.checked ? 'si' : 'no')}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                    </td>


                                     <td className="borde-grupo-inicio"  style={styles.td}>
                                    <label className="switch">
                                        <input 
                                        type="checkbox" 
                                        checked={item.paternidad === 'si'} // O el valor booleano que uses
                                        onChange={(e) => handleUpdate(item.id, 'paternidad', e.target.checked ? 'si' : 'no')}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                    </td>



            <td className="borde-grupo-inicio text-center" style={{ ...styles.td, minWidth: '180px' }}>
  <div className="d-flex flex-column align-items-center gap-2">
    
    {/* 1. Switch de activación estándar */}
    <label className="switch">
      <input 
        type="checkbox" 
        checked={item.reposo_medico === 'si'} 
        onChange={(e) => handleUpdate(item.id, 'reposo_medico', e.target.checked ? 'si' : 'no')}
      />
      <span className="slider"></span>
    </label>

    {/* 2. Botón Registrar Manual */}
    {item.reposo_medico === 'si' && (
      <button
        type="button"
        className="btn btn-sm btn-outline-primary fw-bold py-0 px-2"
        style={{ fontSize: '0.68rem', borderRadius: '4px' }}
        onClick={() => {
          setEmpleadoSeleccionadoRep(item.id);
           setCodigoEmpDarRep(item.codigo_emp_dar || ""); // 🔥 CAPTURAMOS EL CÓDIGO
          setNovedadEnEdicion(null); // Modo Creación
          setNovedadTexto(""); 
          setFechaDesdeRep(item.fecha_dia ? item.fecha_dia.substring(0, 10) : ""); 
          setFechaHastaRep("");
          setEstadoRep("pendiente");
          setShowModalRepMedico(true);
        }}
      >
        ➕ Registrar
      </button>
    )}

    {/* 3. Contenedor de novedades */}
    {item.reposo_medico === 'si' && item.novedades_medicas && item.novedades_medicas.length > 0 && (
      <div className="d-flex flex-column gap-1 w-100 align-items-center mt-1 border-top pt-1">
        {item.novedades_medicas.map((nov, idx) => {
          const estadoLimpio = nov.estado ? nov.estado.toLowerCase().trim() : 'pendiente';
          const primerNombre = nov.nombre_usu ? nov.nombre_usu.split(' ')[0] : 'Sistema';

          return (
            <div 
              key={nov.id || idx} 
              className="d-flex align-items-center justify-content-center gap-2 w-100 px-1"
              style={{ cursor: 'pointer' }}
              title="Haz clic para editar esta novedad médica"
             
             onClick={() => {
                // 📊 AUDITORÍA: Abre la consola web (F12) al dar clic y dinos qué se imprime aquí
                console.log("🔍 REVISANDO OBJETO COMPLETO DE LA NOVEDAD:", nov);

                setEmpleadoSeleccionadoRep(item.id);
                setCodigoEmpDarRep(item.codigo_emp_dar || "");

                // Forzamos la captura buscando la propiedad exacta de forma flexible
                const idNovedadReal = nov.id || nov.ID || nov.id_novedad;
                
                console.log("🎯 ID DETECTADO PARA EDICIÓN:", idNovedadReal);

                // Activamos el modo edición guardando el objeto con su id normalizado
                setNovedadEnEdicion({ ...nov, id: idNovedadReal }); 

                setNovedadTexto(nov.reposo || ""); 
                setEstadoRep(nov.estado || "pendiente");
                
                if (nov.fecha_desde) setFechaDesdeRep(nov.fecha_desde.substring(0, 10));
                if (nov.fecha_hasta) setFechaHastaRep(nov.fecha_hasta.substring(0, 10));
                
                setShowModalRepMedico(true);
                }}


            >
              
              {/* Badge del Estado */}
              <span 
                className="badge px-2 py-1 rounded-pill small"
                style={
                  estadoLimpio === 'aprobado' ? { backgroundColor: '#198754', color: '#fff', fontSize: '0.68rem', minWidth: '85px' } : 
                  estadoLimpio === 'revisado' ? { backgroundColor: '#0dcaf0', color: '#000', fontSize: '0.68rem', minWidth: '85px' } : 
                  estadoLimpio === 'rechazado' ? { backgroundColor: '#dc3545', color: '#fff', fontSize: '0.68rem', minWidth: '85px' } : 
                  { backgroundColor: '#ffc107', color: '#000', fontSize: '0.68rem', minWidth: '85px' }
                }
              >
                {estadoLimpio === 'aprobado' ? '👍 APROB.' :
                 estadoLimpio === 'revisado' ? '✅ REVIS.' :
                 estadoLimpio === 'rechazado' ? '❌ RECHAZ.' :
                 '⏳ PEND.'}
              </span>

              {/* Nombre del Usuario */}
              <small className="text-muted fw-bold" style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }} title={nov.nombre_usu}>
                👤 {primerNombre}
              </small>

            </div>
          );
        })}
      </div>
    )}

  </div>
</td>









                                     <td className="borde-grupo-inicio"  style={styles.td}>
                                    <label className="switch">
                                        <input 
                                        type="checkbox" 
                                        checked={item.maternidad === 'si'} // O el valor booleano que uses
                                        onChange={(e) => handleUpdate(item.id, 'maternidad', e.target.checked ? 'si' : 'no')}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                    </td>

                                   <td className="borde-grupo-inicio"  style={styles.td}>
                                    <label className="switch">
                                        <input 
                                        type="checkbox" 
                                        checked={item.calamidad_domestica === 'si'} // O el valor booleano que uses
                                        onChange={(e) => handleUpdate(item.id, 'calamidad_domestica', e.target.checked ? 'si' : 'no')}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                    </td>

                                    <td className="borde-grupo-inicio" style={styles.td}>
                                        <label className="switch">
                                            <input 
                                            type="checkbox" 
                                            checked={item.falta_injustificada === 'si'} // O el valor booleano que uses
                                            onChange={(e) => handleUpdate(item.id, 'falta_injustificada', e.target.checked ? 'si' : 'no')}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </td>
                                    
                                                                
                                    <td className="borde-grupo-inicio" style={styles.td}>
                                        <EditableSelect 
                                            id={item.id} 
                                            campo="desayuno" 
                                            valor={item.desayuno} 
                                            handleUpdate={handleUpdate} 
                                            // 🔑 Llama a la función global pasándole el campo correcto
                                            disabled={estaBloqueado(item.fecha_dia, 'desayuno')} 
                                        />
                                    </td>

                                              <td className="borde-grupo-inicio" style={styles.td}>
                                                <EditableSelect 
                                                    id={item.id} 
                                                    campo="almuer_si" 
                                                    valor={item.almuer_si} 
                                                    handleUpdate={handleUpdate} 
                                                    // 🔑 Llama a la función global pasándole el campo correcto
                                                    disabled={estaBloqueado(item.fecha_dia, 'almuer_si')} 
                                                />
                                            </td>


                                                 <td className="borde-grupo-inicio" style={styles.td}>
                                                    <EditableSelect 
                                                        id={item.id} 
                                                        campo="refrigerio" 
                                                        valor={item.refrigerio} 
                                                        handleUpdate={handleUpdate} 
                                                        // 🔑 Llama a la función global pasándole el campo correcto
                                                        disabled={estaBloqueado(item.fecha_dia, 'refrigerio')} 
                                                    />
                                                </td>


                                                                            
                                                                            
                                            <td className="borde-grupo-inicio" style={styles.td}>
                                                <EditableSelect 
                                                    id={item.id} 
                                                    campo="meriend_si" 
                                                    valor={item.meriend_si} 
                                                    handleUpdate={handleUpdate} 
                                                    // 🔑 Llama a la función pasándole el campo de meriendas
                                                    disabled={estaBloqueado(item.fecha_dia, 'meriend_si')} 
                                                />
                                            </td>
           

                                     <td className="borde-grupo-inicio" style={styles.td}>
                                        <EditableSelect id={item.id} campo="val_asume_emp_almuer" valor={item.val_asume_emp_almuer} handleUpdate={handleUpdate} 
                                        
                                        disabled={
                                            !(user.idperfil == 1 || user.idperfil == 3 || user.idperfil == 5) || 
                                            estaBloqueado(item.fecha_dia.split('T')[0])
                                        }

                                        />
                                    </td>

                             

                                     <td className="borde-grupo-inicio" style={styles.td}>
                                        <EditableSelect id={item.id} campo="val_asume_emp_meriend" valor={item.val_asume_emp_meriend} handleUpdate={handleUpdate} 
                                        
                                        
                                        disabled={
                                            !(user.idperfil == 1 || user.idperfil == 3 || user.idperfil == 5) || 
                                            estaBloqueado(item.fecha_dia.split('T')[0])
                                        }

                                        />
                                    </td>
                                    

                                   <td className="borde-grupo-inicio td-editable">
                                    <select
                                        className={`select-comedor ${!item.comedor ? 'select-placeholder' : ''}`}
                                        value={item.comedor || ""}
                                        onChange={(e) => handleUpdate(item.id, "comedor", e.target.value)}
                                      // disabled={!estaAbiertoGlobal}
                                    >
                                        <option value="" disabled>— Seleccionar —</option>
                                        {["(CEXP)", "(CEX6)", "(CAMZ)", "(CHDN)", "(CCJH)", "(CQNC)", "(COAF)", "(COAO)"].map(op => (
                                            <option key={op} value={op}>
                                                {op}
                                            </option>
                                        ))}
                                    </select>
                            </td>
                              
                            {/* Columna de Ruta */}
                            <td className="borde-grupo-inicio " style={styles.td}>
                                {
                                    // Buscamos en el array de recorridos el objeto cuyo id coincida con item.ruta
                                    recorridos.find(r => Number(r.id) === Number(item.ruta))?.nombre || item.ruta || '---'
                                }
                            </td>

                            {/* Columna de Parada */}
                            <td className="borde-grupo-inicio" style={styles.td}>
                                {
                                    // Buscamos en el array de paradas el objeto cuyo id coincida con item.parada
                                    paradas.find(p => Number(p.id) === Number(item.parada))?.nombre || item.parada || '---'
                                }
                            </td>

                            {/* Columna de Pasaje (Varchar) */}
                            <td className="borde-grupo-inicio" style={styles.td}>
                                {item.pasaje || '0.00'}
                            </td>

                                                    
                               <td className="borde-grupo-fin">
                                            {/* BOTÓN COPIAR */}
                                            {/* Condición: Solo si es el primer elemento (índice 0) */}
                                            {index === 0 && (
                                                <button 
                                                    className="btn btn-sm" 
                                                    onClick={() => { setRegistroAClonar(item); setShowModal(true); }}
                                                    // 🔑 Aplicamos tu verde corporativo #92b91c en los estilos
                                                    style={{ 
                                                        padding: '2px 5px', 
                                                        fontSize: '25px', 
                                                        cursor: 'pointer',
                                                        backgroundColor: '#c0e74bff',
                                                        borderColor: '#c0e74bff',
                                                        color: '#3a4b1fff'
                                                    }}
                                                > 
                                                    + 
                                                </button>
                                            )}

                                            {/* BOTÓN ANULAR */}
                                            <button   
                                                className="btn btn-sm"  
                                                // 🔑 Aplicamos tu rojo personalizado #d92323 en los estilos
                                                style={{ 
                                                    padding: '2px 5px', 
                                                    fontSize: '11px', 
                                                    cursor: 'pointer',
                                                    backgroundColor: '#f96060ff',
                                                    borderColor: '#f96060ff',
                                                    color: '#fff',
                                                    marginLeft: '5px'
                                                }} 
                                                onClick={() => {
                                                    if(window.confirm("¿Está seguro de anular registro?")) {
                                                        handleUpdateEstado(item.id, 'Anulada');
                                                    }
                                                }}
                                                disabled={item.estado === 'Anulada'} 
                                            >
                                                {item.estado === 'Anulada' ? '🚫 Anulada' : '🗑️'}
                                            </button>
                                        </td>

                                   
                                </tr>

                                
                            ))}
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
                                    <button onClick={() => setShowModal(false)} style={styles.btnSecondary}>Cancelar</button>
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

{/* ================= MODAL: DETALLE REPOSO MÉDICO ================= */}
{showModalRepMedico && (
  <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px' }}>
        
        <div 
          className="modal-header text-dark" 
          style={{ 
            borderTopLeftRadius: '12px', 
            borderTopRightRadius: '12px', 
            backgroundColor: '#ccff67' 
          }}
        >
         <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
        {/* 🔥 Cambia según el estado de control de edición */}
        {novedadEnEdicion ? "✏️ Editar Reposo Médico" : "🩺 Registrar Reposo Médico"}
        </h5>

        <button type="button" className="btn-close" onClick={() => { setShowModalRepMedico(false); setNovedadEnEdicion(null); }}></button>
        </div>

        <div className="modal-body p-4">
          <div className="row g-3">
            <div className="col-12">
              <label className="small fw-bold text-muted mb-1">Descripción de la Novedad</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Escriba los detalles o diagnóstico..."
                value={novedadTexto}
                onChange={(e) => setNovedadTexto(e.target.value)}
                disabled={camposDeshabilitados} // 🔒 BLOQUEADO POR DEFECTO
                style={{ borderRadius: '8px' }}
              />
            </div>

            <div className="col-md-6">
              <label className="small fw-bold text-muted mb-1">Fecha Desde</label>
              <input
                type="date"
                className="form-control"
                value={fechaDesdeRep}
                onChange={(e) => setFechaDesdeRep(e.target.value)}
                disabled={camposDeshabilitados} // 🔒 BLOQUEADO POR DEFECTO
                style={{ borderRadius: '8px' }}
              />
            </div>

            <div className="col-md-6">
              <label className="small fw-bold text-muted mb-1">Fecha Hasta</label>
              <input
                type="date"
                className="form-control"
                value={fechaHastaRep}
                onChange={(e) => setFechaHastaRep(e.target.value)}
                disabled={camposDeshabilitados} // 🔒 BLOQUEADO POR DEFECTO
                style={{ borderRadius: '8px' }}
              />
            </div>

            <div className="col-12">
              <label className="small fw-bold text-muted mb-1">Estado del Permiso</label>
              <select
                className="form-select"
                value={estadoRep}
                onChange={(e) => setEstadoRep(e.target.value)}
                disabled={camposDeshabilitados} // 🔒 BLOQUEADO POR DEFECTO
                style={{ borderRadius: '8px' }}
              >
                <option value="pendiente">⏳ Pendiente</option>
                <option value="revisado">✅ Revisado</option>
                <option value="aprobado">👍 Aprobado</option>
                <option value="rechazado">❌ Rechazado</option>
              </select>
            </div>
          </div>
        </div>

                    {/* 🌟 HISTORIAL INTERACTIVO CON BLOQUEO AUTOMÁTICO DE EDICIÓN */}
                <div className="mb-4 mt-3 p-3 rounded" style={{ backgroundColor: '#f8f9fa', border: '1px dashed #ced4da' }}>
                    <label className="small fw-bold text-secondary mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-clock-history text-primary"></i> 
                        HISTORIAL DE TRANSACCIONES:
                    </label>

                    <div className="d-flex flex-column gap-2" style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
                        
                        {/* Opción: Nueva transacción independiente */}
                        <div 
                            onClick={() => {
                                setIdNovedadSeleccionada('');
                                setModoNuevaTransaccion(true); // 🔥 Habilita el formulario para creación pura
                                setNovedadTexto('');
                                setFechaDesdeRep('');
                                setFechaHastaRep('');
                                setEstadoRep('pendiente');
                            }}
                            className="p-2 rounded text-center fw-bold transition-all"
                            style={{ 
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                border: '2px solid',
                                borderColor: modoNuevaTransaccion ? '#92b91c' : '#dee2e6',
                                backgroundColor: modoNuevaTransaccion ? '#f4f9e4' : '#fff',
                                color: modoNuevaTransaccion ? '#6d8a14' : '#6c757d'
                            }}
                        >
                            <i className="bi bi-plus-circle-fill me-2"></i>
                            Nueva transacción independiente (Sin sobreescribir)
                        </div>

                        {/* Mapeo de tarjetas de novedades */}
                        {datos
                            .find(d => d.codigo_emp_dar === codigoEmpDarRep)
                            ?.novedades_medicas?.filter(n => n.estadovisual !== 0)
                            .map((nov) => {
                                const esSeleccionada = String(idNovedadSeleccionada) === String(nov.id);
                                const usuarioRegistro = nov.nombre_usu || nov.usuario_creacion || 'Sistema';

                                return (
                                    <div 
                                        key={nov.id}
                                        onClick={() => {
                                            setIdNovedadSeleccionada(nov.id);
                                            setModoNuevaTransaccion(false); // 🔥 Apaga el modo de creación pura
                                            setNovedadTexto(nov.reposo);
                                            setFechaDesdeRep(nov.fecha_desde.split('T')[0]);
                                            setFechaHastaRep(nov.fecha_hasta.split('T')[0]);
                                            setEstadoRep(nov.estado || 'pendiente');
                                        }}
                                        className="p-3 rounded border shadow-sm transition-all"
                                        style={{
                                            cursor: 'pointer',
                                            backgroundColor: esSeleccionada ? '#fff5f5' : '#fff',
                                            borderColor: esSeleccionada ? '#dc3545' : '#e3e6f0',
                                            borderLeft: esSeleccionada ? '5px solid #dc3545' : '5px solid #4f05d9',
                                            transform: esSeleccionada ? 'scale(1.01)' : 'scale(1)',
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                    >
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="fw-bold" style={{ color: esSeleccionada ? '#dc3545' : '#333', fontSize: '0.9rem' }}>
                                                {nov.reposo}
                                            </span>
                                            <span className={`badge ${esSeleccionada ? 'bg-danger' : 'bg-secondary'}`} style={{ fontSize: '0.75rem' }}>
                                                {esSeleccionada ? 'Seleccionada' : (nov.estado ? nov.estado.toUpperCase() : 'ACTIVA')}
                                            </span>
                                        </div>
                                        
                                        <div className="d-flex justify-content-between align-items-center mt-2" style={{ fontSize: '0.8rem' }}>
                                            <div className="text-muted font-monospace">
                                                <i className="bi bi-calendar-range me-1"></i>
                                                {nov.fecha_desde.split('T')[0]} <span className="text-danger fw-bold">➔</span> {nov.fecha_hasta.split('T')[0]}
                                            </div>
                                            
                                            <div className="text-secondary fw-semibold d-flex align-items-center gap-1 bg-light px-2 py-0.5 rounded border-sm" style={{ fontSize: '0.75rem' }}>
                                                <i className="bi bi-person-circle text-muted"></i>
                                                Reg: <span className="text-dark">{usuarioRegistro}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        }
    </div>
</div>



{/* 🔥 ALERTA VISUAL CON DESPLIEGUE DEL NOMBRE DEL EMPLEADO */}
{idNovedadSeleccionada && (
    <div className="alert alert-warning d-flex align-items-center gap-3 border-0 shadow-sm mb-4 animate__animated animate__fadeIn" style={{ borderRadius: '8px', backgroundColor: '#fff3cd' }}>
        <i className="bi bi-exclamation-triangle-fill text-warning fs-4"></i>
        <div style={{ fontSize: '0.85rem', color: '#664d03' }}>
            <strong className="d-block text-uppercase">
                ⚠️ MODO EDICIÓN ACTIVADO: {datos.find(d => d.codigo_emp_dar === codigoEmpDarRep)?.nombres || 'Empleado'}
            </strong>
            Al guardar, los días del rango anterior se revertirán automáticamente a <span className="badge bg-dark">reposo_medico = no</span> para este colaborador y se habilitará su nuevo intervalo.
        </div>
    </div>
)}






        <div className="modal-footer bg-light" style={{ borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', backgroundColor: '#ccff67' }}>
       
                <button type="button" className="btn btn-secondary fw-bold" style={{ borderRadius: '8px' }} onClick={() => { setShowModalRepMedico(false); setNovedadEnEdicion(null); }}>
                Cancelar
                </button>

     <button 
    type="button" 
    className="btn fw-bold px-4 shadow d-inline-flex align-items-center justify-content-center gap-2"
    disabled={!fechaDesdeRep || !fechaHastaRep || !novedadTexto.trim() || loading}
    onClick={async () => {
        try {
            setLoading(true);

            const payload = {
                id_asistencia: empleadoSeleccionadoRep, 
                codigo_emp_dar: codigoEmpDarRep, 
                reposo: novedadTexto,                   
                fecha_desde: fechaDesdeRep,             
                fecha_hasta: fechaHastaRep,             
                estado: estadoRep,
                usuario_modif: user.id,
                idNovedadAnterior: idNovedadSeleccionada || null 
            };

            // Guardado seguro en el servidor
            await fetchWithFallback('/api/RRHH/guardar_novedad_medica_segura', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Sincronización del nuevo rango en rrhh_formulario
            await fetchWithFallback('/api/RRHH/actualizar_reposo_medico', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigo_emp_dar: codigoEmpDarRep,
                    fecha_desde: fechaDesdeRep,
                    fecha_hasta: fechaHastaRep
                })
            });

            toast.success(idNovedadSeleccionada ? "¡Rollback ejecutado y nuevo reposo aplicado!" : "Novedad registrada con éxito.");
            
            // Limpieza total de los controles del modal
            setShowModalRepMedico(false);
            setIdNovedadSeleccionada('');
            setNovedadTexto('');
            setFechaDesdeRep('');
            setFechaHastaRep('');
            setNovedadEnEdicion(null);
            
            // Refrescar grilla principal
            fetchDatos();

        } catch (error) {
            toast.error("Error al procesar la novedad médica: " + error.message);
        } finally {
            setLoading(false);
        }
    }}
    style={{ 
        backgroundColor: idNovedadSeleccionada ? '#dc3545' : '#92b91c', 
        color: '#ffffff',
        border: 'none', 
        borderRadius: '8px',
        height: '42px',
        transition: 'all 0.3s ease'
    }}
>
    {loading ? (
        <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Procesando...
        </>
    ) : idNovedadSeleccionada ? (
        <>
            <i className="bi bi-arrow-counterclockwise"></i> Reemplazar y Aplicar Rollback
        </>
    ) : (
        <>
            <i className="bi bi-check-circle-fill"></i> Registrar Reposo Puro
        </>
    )}
</button>




        </div>
        

      </div>
    </div>
  </div>
)}






{/* 🌟 MODAL INTERACTIVO PARA FILTRAR EL REPORTE DE NOVEDADES */}
{showModalFiltroReporte && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
      <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px' }}>
        
        {/* Cabecera del Modal */}
        <div className="modal-header border-0 pb-0" style={{ padding: '20px' }}>
          <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: '1.15rem' }}>
            <i className="bi bi-file-earmark-excel-fill text-success fs-4"></i>
            Reporte de Reposos Médicos
          </h5>
          <button type="button" className="btn-close" onClick={() => setShowModalFiltroReporte(false)}></button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="modal-body" style={{ padding: '20px' }}>
          <p className="text-muted small mb-3">Defina el rango de fechas de consulta para compilar el histórico en un documento Excel.</p>
          
          <div className="form-group mb-3">
            <label className="fw-bold small text-secondary mb-1">Fecha Desde:</label>
            <input 
              type="date" 
              className="form-control" 
              value={repFechaInicio} 
              onChange={(e) => setRepFechaInicio(e.target.value)} 
            />
          </div>

          <div className="form-group mb-4">
            <label className="fw-bold small text-secondary mb-1">Fecha Hasta:</label>
            <input 
              type="date" 
              className="form-control" 
              value={repFechaFin} 
              onChange={(e) => setRepFechaFin(e.target.value)} 
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="modal-footer border-0 pt-0 d-flex gap-2" style={{ padding: '20px' }}>
          <button 
            type="button" 
            className="btn btn-light fw-bold flex-grow-1" 
            style={{ borderRadius: '8px', height: '40px' }}
            onClick={() => setShowModalFiltroReporte(false)}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn btn-success fw-bold flex-grow-1 d-inline-flex align-items-center justify-content-center gap-2" 
            style={{ backgroundColor: '#198754', border: 'none', borderRadius: '8px', height: '40px' }}
            onClick={descargarReporteNovedadesExcel}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Generando...
              </>
            ) : (
              <>
                <i className="bi bi-download"></i> Descargar Excel
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  </div>
)}



        </div>
    );
};

// Componente Interno para Selects Estilizados
const EditableSelect = ({ id, campo, valor, handleUpdate, disabled }) => (
    <select 
        value={valor || 'no'} 
        onChange={(e) => handleUpdate(id, campo, e.target.value)}
        disabled={disabled} // <--- Vinculación del bloqueo nativo de HTML
        style={{
            ...styles.selectInline,
            backgroundColor: valor === 'si' ? '#ccff67ff' : '#fff1f2',
            color: valor === 'si' ? '#669605ff' : '#e11d48',
            borderColor: valor === 'si' ? '#ccff67ff' : '#fb7185',
            // 🎨 Estilos visuales adicionales cuando el campo esté bloqueado
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer'
        }}
    >
        <option value="si">✔</option>
        <option value="no">no</option>
    </select>
);



const styles = {
    pageBackground: { backgroundColor: '#f8fafc', minHeight: '10vh', padding: '0.5rem' },
    container: { maxWidth: '2100px', margin: '0 auto', fontFamily: '"Inter", system-ui, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
    title: { fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', margin: 0 },
    subtitle: { color: '#64748b', margin: 0 },
    badge: { backgroundColor: '#e2e8f0', padding: '3px 6px', borderRadius: '20px', fontSize: '0.65rem', color: '#475569', fontWeight: '300' },
    card: { backgroundColor: 'white', padding: '0.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '1.5rem' },
    filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label: { fontSize: '0.85rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.025em' },
    input: { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s' },
    buttonContainer: { display: 'flex', gap: '12px' },
    btnPrimary: { backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
    btnSuccess: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
    tableCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden' ,

maxHeight: '600px', // O la altura que prefieras (puedes usar 80vh)
        overflowY: 'auto',  // Permite el scroll interno
        position: 'relative', // Ayuda a posicionar elementos sticky


    },

    table: {borderCollapse: 'separate', // Importante para que el sticky no oculte bordes
        borderSpacing: 0,
         borderCollapse: 'collapse',
        width: '100%', },

    
    tableHeader: { backgroundColor: '#f1f5f9' },
    td: { 
        padding: '5px', 
        borderBottom: '1px solid #afaeaeff', 
        fontSize: '0.65rem', 
        color: '#334155',
        backgroundColor: 'transparent', // Permite que se vea el hover
        transition: 'background-color 0.2s ease' // Hace el efecto suave
    },

    
    trEven: { backgroundColor: '#f8fafc' },
    empName: { fontWeight: '600', color: '#005c0fff',fontSize: '0.65rem' },
    empId: { fontSize: '0.65rem', color: '#1763ceff' },
    idtrn: { fontSize: '0.65rem', color: '#94a3b8' },
    dep: { fontSize: '0.65rem', color: '#94a3b8' },
    selectInline: { padding: '4px 8px', borderRadius: '6px', border: '1px solid', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' },
     btnClonar: { padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' },
    btnPrimary: { backgroundColor: '#007bff', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    btnSecondary: { backgroundColor: '#dc3545', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' },

      th: {
        position: 'sticky',
        top: 0,
        backgroundColor: '#ffffff',
        color: '#333333',
        fontWeight: '600',
        fontSize: '13px',
        padding: '10px 8px',
        border: '1px solid #e0e0e0',
        textAlign: 'left',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
        zIndex: 2
    },

    stickyHeader: {
        top: 0,
        zIndex: 3 // Evita que el contenido de la tabla pase por encima al hacer scroll
    },
    subTh: {
        fontSize: '11.5px',
        fontWeight: '500',
        color: '#0b0b0bff',
        backgroundColor: '#fafafa',
        textAlign: 'center',
        padding: '6px 4px'
    },
    tableHeader: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)' // Da un sutil efecto de elevación al congelar
    },

  // Opcional: Un contenedor con altura máxima si quieres scroll interno
  tableContainer: {
    maxHeight: '50px', 
    overflowY: 'auto'
  }

      
};

export default AsistenciaComedor;