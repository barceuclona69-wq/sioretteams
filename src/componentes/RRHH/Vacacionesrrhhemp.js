
import React, { useEffect, useState } from 'react';

import { API_BASE_URL } from '../../config';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';

// src/componentes/RRHH/Horas_rendimiento.js
import { exportarPDF, exportarExcel,exportarPDFbono } from './Reportes';

// Busca esta línea (Línea 7 aproximadamente):
const Vacaciones = ({ alSeleccionarEmpleado }) => {

     const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("userData");
        const parsed = savedUser ? JSON.parse(savedUser) : { id: null, nombre: 'Usuario', idperfil: null, departamento: '', id_empresa: '' ,id_dartis: null};
      return {
            ...parsed,
            // Convertimos "5,12" en ["5", "12"] y "VENTAS,RRHH" en ["VENTAS", "RRHH"]
            empresasAutorizadas: parsed.id_empresa ? String(parsed.id_empresa).split(',').map(s => s.trim()) : [],
            deptosAutorizados: parsed.departamento ? String(parsed.departamento).split(',').map(s => s.trim()) : []
        };
    });
    
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(false);



    // Estados para el Modal de Detalle de Vacaciones
const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
const [detalleVacaciones, setDetalleVacaciones] = useState([]);
const [loadingModal, setLoadingModal] = useState(false);


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

  // Capturamos el año actual seleccionado en el front o usamos el año en curso por defecto
  // Nota: Si 'anio' viene vacío inicialmente, forzamos el año actual (2026)
  const anioActual = anio || new Date().getFullYear(); 

  // Definimos de forma exacta ambos endpoints inyectando los filtros corregidos
  const endpointComedor = `/api/RRHH/informacion_vacaciones_emp?año=${anioActual}&empresa=${encodeURIComponent(empresa || 'Todos')}&departamento=${encodeURIComponent(departamento || 'Todos')}&idemp=${encodeURIComponent(user?.id_dartis || '')}`;
  
  const endpointDiasVacaciones = `/api/RRHH/dias_dartis_vacaciones?anio=${anioActual}`; 

  try {
    // Disparamos ambas consultas en paralelo usando Promise.all
    const [resComedor, resDias] = await Promise.all([
      fetchWithFallback(endpointComedor),
      fetchWithFallback(endpointDiasVacaciones)
    ]);

    // Formateamos y estructuramos las respuestas de forma segura
    const datosComedor = resComedor?.data || resComedor || [];
    const datosDias = resDias?.data || resDias || [];

    // Mapeamos e integramos la columna de días usando el 'idemp' como llave de cruce
    const datosCruzados = datosComedor.map(registroComedor => {
      
      // Buscamos si este empleado tiene días registrados en la API nueva
      const registroDias = datosDias.find(d => String(d.idemp) === String(registroComedor.idemp));
      
      // Si tiene registro extraemos 'total_dias', de lo contrario asignamos 0
      const diasVacacionesTomadas = registroDias ? registroDias.total_dias : 0;

      // Tu búsqueda de empleado de respaldo original de Dartis
      const empleadoDartis = listaEmpleados.find(e => String(e.codemp) === String(registroComedor.idemp));

      return {
        ...registroComedor,
        dias_tomados_api: diasVacacionesTomadas, // <-- Inyectamos la nueva columna
        nombres: registroComedor.nombres || empleadoDartis?.nombre || 'Sin Nombre',
        cedula: registroComedor.cedula || empleadoDartis?.identificacion || '',
      };
    });

    // Pintamos los resultados unificados en la interfaz
    setDatos(datosCruzados);

  } catch (error) {
    console.error("Error en fetchDatos al cruzar asistencia y vacaciones:", error);
    setDatos([]);
  } finally {
    setLoading(false);
  }
};

// ==========================================
// 🔥 EFECTO AUTOMÁTICO AL HACER CLICK EN LA PESTAÑA
// ==========================================
useEffect(() => {
  // Se dispara solo si el componente se monta y el id_dartis existe en el localStorage
  if (user?.id_dartis) {
    fetchDatos();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id_dartis]); 




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
                     
       


      
             {/* Tabla */}

<div style={styles.tableCard}>
    <table style={styles.table} >
        <thead style={{ display: 'block', width: '100%', marginBottom: '15px' }}>
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
                  

                  </div>
        </thead>


          <tbody style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%' }}>
            {datosAgrupados && Object.keys(datosAgrupados).length > 0 ? (
              Object.keys(datosAgrupados).map((puestoNombre) => (
                <React.Fragment key={puestoNombre}>
                  {/* ENCABEZADO DE GRUPO POR PUESTO DE TRABAJO */}
                  <tr style={{ display: 'block', width: '100%' }}>
                    <td colSpan="4" style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', padding: '8px 12px', backgroundColor: '#e2e8f0', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      RESUMEN DE VACACIONES
                    </td>
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


                  </tr>

                  {/* MAPEO DE REGISTROS EN MODO CONSULTA EXCLUSIVA */}
                  {datosAgrupados[puestoNombre].map((item, index) => {
                    // --- CÁLCULOS MATEMÁTICOS DEL COMPONENTE ---
                    let saldoArrastrado = parseFloat(item.dias_vacaciones_pendientes) || 0;
                    const mesesOrdenados = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    
                    const totalPlanificado = Number(
                      (parseFloat(item.enero) || 0) + (parseFloat(item.febrero) || 0) + (parseFloat(item.marzo) || 0) +
                      (parseFloat(item.abril) || 0) + (parseFloat(item.mayo) || 0) + (parseFloat(item.junio) || 0) +
                      (parseFloat(item.julio) || 0) + (parseFloat(item.agosto) || 0) + (parseFloat(item.septiembre) || 0) +
                      (parseFloat(item.octubre) || 0) + (parseFloat(item.noviembre) || 0) + (parseFloat(item.diciembre) || 0)
                    );

                    const diasAusentismoApi = parseFloat(item.dias_tomados_api) || 0;
                    let porcentajeAvance = totalPlanificado > 0 ? (diasAusentismoApi * 100) / totalPlanificado : 0;
                    const porcentajeVisualBarra = Math.min(100, Math.max(0, porcentajeAvance));

                    const esPrioritario = item.priorizar === 'SI' || item.Priorizar === 'SI' || (item.dias_vacaciones_pendientes ?? 0) >= 15;

                    const saldoFinal = Number(
                      ((item.dias_vacaciones_ganadas ?? 0) * 12) + (item.dias_vacaciones_pendientes ?? 0) - totalPlanificado
                    );
                    let bgSaldoFinal = '#f3f4f6'; let textSaldoFinal = '#6b7280'; let borderSaldoFinal = '#e5e7eb';
                    if (saldoFinal >= 15) { bgSaldoFinal = '#fee2e2'; textSaldoFinal = '#b91c1c'; borderSaldoFinal = '#fca5a5'; }
                    else if (saldoFinal > 0) { bgSaldoFinal = '#e0f2fe'; textSaldoFinal = '#0369a1'; borderSaldoFinal = '#bae6fd'; }

                 // REEMPLÁZALO EXACTAMENTE POR ESTO:
                      return (
                        <tr
                          key={item.id || index}
                          onMouseEnter={() => {
                            // Sincroniza el saldo con la matriz de manera 100% automática al posar el cursor
                            if (typeof alSeleccionarEmpleado === 'function') {
                              alSeleccionarEmpleado(Number(item.dias_vacaciones_pendientes_alafecha) || 0);
                            }
                          }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.06)',
                            border: '1px solid #e2e8f0',
                            borderLeft: esPrioritario ? '6px solid #dc2626' : '6px solid #6f42c1',
                            width: '100%',
                            cursor: 'pointer', // Hace notar al usuario que la fila es interactiva
                          }}
                          boxSizing="border-box"
                          marginBottom="15px"
                        >

                        {/* SECCIÓN GENERAL DE IDENTIFICACIÓN */}
                        <td style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', padding: '0 0 12px 0', width: '100%', textAlign: 'left', borderRight: 'none' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#253a00' }}>{item.nombres}</h4>
                            <div style={{ fontSize: '12px', color: '#545454', marginTop: '3px' }}>
                              <strong>Cédula:</strong> {item.cedula} | <strong>idEmp:</strong> {item.idemp} | <strong>Fech.ING:</strong> {item.fecha_ingreso ? item.fecha_ingreso.split('T') : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '12px', color: '#253a00' }}>
                            <strong>{item.empresa}</strong> | {item.actividad} <br />
                            <small className="text-muted">Depto: {item.departamento} (IdTrn: {item.id})</small>
                          </div>
                        </td>
                        {/* SECCIÓN INTERMEDIA: JEFATURAS Y RESUMEN CONTABLE INICIAL */}
                        <td style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', fontSize: '12px', padding: 0, width: '100%', border: 'none', textAlign: 'left' }}>
                          {/* Bloque de Estructura Organizativa */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', borderRight: '1px solid #f1f5f9', paddingRight: '10px' }}>
                            <div><span style={{ color: '#64748b' }}>Gerencia:</span> <strong style={{ color: '#06325d' }}>{item.Gerencia || item.gerencia}</strong></div>
                            <div><span style={{ color: '#64748b' }}>Jefe Directo:</span> <strong style={{ color: '#545454' }}>{item.jefedirecto}</strong></div>
                            <div><span style={{ color: '#64748b' }}>Información de Rol:</span> <span style={{ color: '#06325d', fontWeight: '600' }}>IdRol: {item.idrol} (Periodo: {item.periodo_rol})</span></div>
                          </div>

                          {/* Bloque de Saldos de Contrato Iniciales */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderRight: '1px solid #f1f5f9', paddingRight: '10px' }}>
                        
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#475569' }}>Días Proyectados por Mes:</span>
                              <span style={{ display: 'inline-block', minWidth: '35px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f3f4f6', color: '#0369a1', border: '1px solid #bae6fd' }}>
                                {item.dias_vacaciones_ganadas ?? 0}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#475569' }}>Priorizar Gestión:</span>
                              <span style={{ display: 'inline-block', minWidth: '50px', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: esPrioritario ? '#dc2626' : '#f3f4f6', color: esPrioritario ? '#fff' : '#6b7280', border: '1px solid', borderColor: esPrioritario ? '#b91c1c' : '#e5e7eb' }}>
                                {esPrioritario ? 'SI' : 'NO'}
                              </span>
                            </div>
                          </div>

                          {/* Bloque Historial API (Activo con Clic para Consulta en Modal) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#475569' }}>Días Ausentismo (API Dartis):</span>
                              <span style={{ display: 'inline-block', minWidth: '35px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0' }}>
                                {item.dias_tomados_api ?? 0}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }} onClick={() => abrirDetalleEmpleado(item)}>
                              <span style={{ color: '#475569', fontSize: '11px' }}>% Avance vs Planificación (Ver Desglose de AUSENTIMOS):</span>
                              <div style={{ width: '100%', height: '18px', backgroundColor: '#fee2e2', borderRadius: '10px', position: 'relative', overflow: 'hidden', border: '1px solid #fca5a5' }}>
                                <div style={{ width: `${porcentajeVisualBarra}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.4s ease-in-out' }} />
                                <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: '10px', fontWeight: 'bold', color: porcentajeVisualBarra > 50 ? '#fff' : '#1e293b' }}>
                                  {porcentajeAvance.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* SECCIÓN DE PLANIFICACIÓN BLOQUEADA POR COMPLETO (SOLO MODO LECTURA) */}
                        <td style={{ backgroundColor: '#f4f4f5', padding: '12px', borderRadius: '8px', border: '1px solid #e4e4e7', display: 'block', width: '100%' }}>
                          <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#52525b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'left' }}>
                            Planificación Mensual Registrada (Modo Consulta):
                          </span>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                            {mesesOrdenados.map((mes) => {
                              const derechoMesActual = 1.25;
                              const maxPermitidoEsteMes = Number(saldoArrastrado + derechoMesActual);
                              const valorDigitado = parseFloat(item[mes]) || 0;
                              saldoArrastrado = maxPermitidoEsteMes - valorDigitado;

                              return (
                                <div key={mes} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', backgroundColor: '#ffffff', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase' }}>{mes.substring(0, 4)}</span>
                                  <input 
                                    type="text" 
                                    value={item[mes] ?? "0"} 
                                    disabled={true} /* Inmovilizado 100% */
                                    style={{
                                      width: '100%', height: '26px', textAlign: 'center', fontSize: '12px', borderRadius: '4px', border: '1px solid #e4e4e7', outline: 'none',
                                      backgroundColor: parseFloat(item[mes]) > 0 ? '#fef08a' : '#fafafa', /* Tono amarillo sutil si tiene días cargados */
                                      color: '#27272a', cursor: 'not-allowed', boxSizing: 'border-box', fontWeight: parseFloat(item[mes]) > 0 ? 'bold' : 'normal'
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* RESUMEN DE MÉTRICAS CONSOLIDADAS AL FINALIZAR EL AÑO */}
                        <td style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Días Proyectados (Año)</span>
                            <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#f3f4f6', color: '#0369a1', border: '1px solid #f3f4f6' }}>
                              {Number((item.dias_vacaciones_ganadas ?? 0) * 12).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Total Planificado</span>
                            <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: totalPlanificado > 0 ? '#e0f2fe' : '#f3f4f6', color: totalPlanificado > 0 ? '#0369a1' : '#6b7280', border: '1px solid', borderColor: totalPlanificado > 0 ? '#bae6fd' : '#e5e7eb' }}>
                              {totalPlanificado.toFixed(1)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Saldo Final (T. Año)</span>
                            <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#f3f4f6', color: '#0369a1', border: '1px solid #f3f4f6' }}>
                              {Number(((item.dias_vacaciones_ganadas ?? 0) * 12) + (item.dias_vacaciones_pendientes ?? 0)).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Saldo Pendiente (Diciembre)</span>
                            <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: bgSaldoFinal, color: textSaldoFinal, border: '1px solid', borderColor: borderSaldoFinal, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                              {saldoFinal.toFixed(2)}
                            </span>
                          </div>

                          <div>
                            <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Saldo Pendiente a la fecha</span>
                            <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '16px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#bae150ff', color: textSaldoFinal, border: '1px solid', borderColor: borderSaldoFinal, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                              {item.dias_vacaciones_pendientes_alafecha}
                            </span>

                          </div>


                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600', display: 'block', width: '100%' }}>
                  No se encontraron registros coincidentes con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>

{/* ========================================================= */}
{/* === MODAL FLOTANTE: DESGLOSE DE FECHAS DE VACACIONES === */}
{/* ========================================================= */}
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


