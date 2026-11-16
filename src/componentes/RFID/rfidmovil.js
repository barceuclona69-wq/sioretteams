import React, { useState, useEffect, Fragment } from 'react';
import { API_BASE_URL } from '../../config'; 
import { ModalRfid } from './ModalRfidmovil'; 
import { toast } from 'sonner'; 
import { fetchWithFallback } from '../../config'; 
import { AlertTriangle, List, BarChart2 } from 'lucide-react'; 

function Listar() { 
  const [user, setUser] = useState(() => { 
    const savedUser = localStorage.getItem("userData"); 
    const parsed = savedUser ? JSON.parse(savedUser) : { id: null, nombre: 'Usuario', idperfil: null, departamento: '', id_empresa: '' }; 
    return { 
      ...parsed, 
      empresasAutorizadas: parsed.id_empresa ? String(parsed.id_empresa).split(',').map(s => s.trim()) : [], 
      deptosAutorizados: parsed.departamento ? String(parsed.departamento).split(',').map(s => s.trim()) : [] 
    }; 
  }); 

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

  const [soloSolidos, setSoloSolidos] = useState(false); 
  const [idProductoAbierto, setIdProductoAbierto] = useState(null); 
  const [filtroTipo, setFiltroTipo] = useState('TODOS'); 
  const [departamento, setDepartamento] = useState(() => { 
    return user.deptosAutorizados.length > 1 ? '' : (user.deptosAutorizados[0] || ''); 
  }); 
  const [userId, setUserId] = useState(() => { 
    const savedUser = localStorage.getItem("userData"); 
    return savedUser ? JSON.parse(savedUser).id : null; 
  }); 

  const [verAsignados, setVerAsignados] = useState(false); 
  const [busquedaProducto, setBusquedaProducto] = useState(''); 
  const [productosMostrados, setProductosMostrados] = useState([]); 
  const [mesa, setMesa] = useState(""); 
  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: "", tipo: "success" }); 
  const [fechaDesde, setFechaDesde] = useState(obtenerFechaActual()); 
  const [fechaHasta, setFechaHasta] = useState(obtenerFechaActual()); 
  const [listaDepartamentos, setListaDepartamentos] = useState([]); 
  const [recetas, setRecetas] = useState([]); 
  const [cargando, setCargando] = useState(false); 
  const [rendimiento, setRendimiento] = useState([]); 
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null); 
  const [cargandoDetalle, setCargandoDetalle] = useState(false); 
  const [tags, setTags] = useState([]); 
  const [cargandoTags, setCargandoTags] = useState(false); 
  const [transaccionSeleccionada, setTransaccionSeleccionada] = useState(null); 
  const [mostrarModalRfid, setMostrarModalRfid] = useState(false); 
  const [transaccionParaRfid, setTransaccionParaRfid] = useState(null); 
  const [busquedaTipoProducto, setBusquedaTipoProducto] = useState(''); 

  const [mostrarModal, setMostrarModal] = useState(false); 
  const [empleados, setEmpleados] = useState([]); 
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]); 
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false); 
  const [asignando, setAsignando] = useState(false); 

  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaId, setBusquedaId] = useState(''); 
  const [busquedaDepto, setBusquedaDepto] = useState(''); 
  const [busquedaHelicoptero, setBusquedaHelicoptero] = useState(''); 
  const [busquedaMesa, setBusquedaMesa] = useState(''); 

  const [pestanaActiva, setPestanaActiva] = useState('productos'); 

  const mostrarNotificacionToast = (mensaje, tipo = "success") => { 
    setNotificacion({ mostrar: true, mensaje, tipo }); 
    setTimeout(() => { setNotificacion({ mostrar: false, mensaje: "", tipo: "success" }); }, 4000); 
  }; 
  const obtenerSoloConTransacciones = () => { 
     setPestanaActiva('productos'); 
    if (!fechaDesde || !fechaHasta) {
      toast.error("Por favor, seleccione una fecha válida.");
      return;
    }
    setCargando(true); 
    setVerAsignados(true); 
    const tipoActual = soloSolidos ? "SOLIDO" : "BOUQUET"; 
    const params = new URLSearchParams({ desde: fechaDesde, hasta: fechaHasta, tipo: tipoActual }).toString();

    fetch(`${API_BASE_URL}/api/DARTIS/ventas_recetas_con_transacciones?${params}`) 
      .then(response => { 
        if (!response.ok) throw new Error(`Status ${response.status}`); 
        return response.json(); 
      }) 
      .then(data => { 
        if (Array.isArray(data)) {
          setRecetas(data); 
          setProductosMostrados(data); 
          if (data.length === 0) ;
          else toast.success(`Cargados: ${data.length}`);
        } else { toast.error("Formato de respuesta incorrecto."); }
        setCargando(false); 
      }) 
      .catch(error => { console.error(error); setCargando(false); }); 
  }; 

  const guardarTagsAsignados = (idTransaccion, listaDeTags) => { 
    if (!listaDeTags || listaDeTags.length === 0) return; 
    ejecutarPeticionGuardarRfid(idTransaccion, listaDeTags, false); 
  }; 

  const ejecutarPeticionGuardarRfid = async (idTransaccion, listaDeTags, confirmarSobrescribir = false) => {
    const payload = { id_transaccion: idTransaccion, tags: listaDeTags, usuario_creacion: userId, confirmar_sobrescribir: confirmarSobrescribir }; 
    try { 
      const res = await fetch(`${API_BASE_URL}/api/RFID/guardar_tags`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
      }); 
      if (res.status === 409) { 
        const errorData = await res.json().catch(() => ({})); 
        const tagsDuplicados = errorData.duplicados || []; 
        setModalConflicto({ 
          isOpen: true, mensaje: errorData.error || "Conflicto", duplicados: tagsDuplicados, 
          onConfirm: async () => { setModalConflicto(prev => ({ ...prev, isOpen: false })); await ejecutarPeticionGuardarRfid(idTransaccion, listaDeTags, true); } 
        }); 
        return; 
      } 
      if (!res.ok) throw new Error('Error al guardar'); 
      toast.success("¡Tags asignados!"); setMostrarModalRfid(false); 
      if (recetaSeleccionada) obtenerRendimientoProducto(recetaSeleccionada); 
    } catch (error) { 
      toast.error(error.message); 
    } 
  }; 


  useEffect(() => {
    fetchWithFallback('/api/DARTIS/area_dartis') 
      .then(res => { if (res.data) { setListaDepartamentos(res.data); } else { setListaDepartamentos(res); } }) 
      .catch(err => console.error(err)); 
  }, []); 


   // ================= NUEVA MEJORA: CARGA AUTOMÁTICA AL INGRESAR A LA PANTALLA =================
  useEffect(() => {
    // Se ejecuta de forma directa en cuanto la pantalla termina de cargarse en el celular
    obtenerSoloConTransacciones();
  }, []); // El array vacío asegura que solo se dispare una única vez al entrar
  // ============================================================================================


  const obtenerRendimientoProducto = (receta) => { 
    setRecetaSeleccionada(receta); setCargandoDetalle(true); setTags([]); setTransaccionSeleccionada(null); 
    fetch(`${API_BASE_URL}/api/DARTIS/rendimiento_producto?desde=${fechaDesde}&hasta=${fechaHasta}&cod_producto=${receta.p_id}`) 
      .then(response => response.json()) 
      .then(data => { setRendimiento(data); setCargandoDetalle(false); setPestanaActiva('rendimiento'); }) 
      .catch(error => { console.error(error); setCargandoDetalle(false); }); 
  }; 

  useEffect(() => {
    setRecetas([]); setProductosMostrados([]); setRecetaSeleccionada(null); 
    if (departamento === "Postcosecha BQT") { setSoloSolidos(false); } else { setSoloSolidos(true); } 
  }, [departamento]); 

  // ================= CORRECCIÓN CRÍTICA DE CARGA AUTOMÁTICA EN MÓVIL =================
  useEffect(() => { 
    // Se ejecuta de forma directa al entrar O al cambiar filtros, asegurando estados válidos
     setPestanaActiva('productos'); 
    obtenerSoloConTransacciones(); 
  }, [fechaDesde, fechaHasta, departamento, soloSolidos]); // <--- Escucha el depto y el tipo para no fallar
  // ===================================================================================


  const abrirModalEmpleado = () => {
    if (!soloSolidos && (parseFloat(recetaSeleccionada?.bqt_x_hora) || 0) <= 0) {
      toast.error("Para productos no sólidos, 'Tallos por Hora' debe ser mayor a cero.");
      return;
    }
    setMostrarModal(true); setCargandoEmpleados(true); setEmpleadosSeleccionados([]); 
    setBusqueda(''); setBusquedaDepto(departamento); setBusquedaHelicoptero(''); setBusquedaMesa(''); setBusquedaId('');        
    fetch(`${API_BASE_URL}/api/DARTIS/Lista_empleados`) 
      .then(response => response.json()).then(data => { setEmpleados(data); setCargandoEmpleados(false); }) 
      .catch(error => { console.error(error); setCargandoEmpleados(false); }); 
  };

  const manejarSeleccionEmpleado = (idEmpleado) => { 
    if (empleadosSeleccionados.includes(idEmpleado)) { setEmpleadosSeleccionados(empleadosSeleccionados.filter(id => id !== idEmpleado)); } 
    else { setEmpleadosSeleccionados([...empleadosSeleccionados, idEmpleado]); } 
  };

  // ================= LÓGICA DE ASIGNACIÓN CORREGIDA Y DEPURADA =================
  const ejecutarAsignacion = () => { 
    if (empleadosSeleccionados.length === 0) { 
      toast.error("Por favor, selecciona al menos un empleado."); 
      return; 
    } 
    setAsignando(true); 
   
    // 1. Mapeo seguro de sub-objetos de empleados
    const empleadosConNombre = empleadosSeleccionados.map(idSeleccionado => { 
      const datosEmpleado = empleados.find(e => e.codemp === idSeleccionado); 
      return { 
        id: idSeleccionado, 
        nombre: datosEmpleado ? datosEmpleado.nombre : 'Empleado Sin Nombre', 
        mesa: datosEmpleado ? (datosEmpleado.mesa || '0') : '0', 
        helicoptero: datosEmpleado ? (datosEmpleado.helicoptero || '0') : '0' 
      }; 
    }); 

    // CORRECCIÓN 1: Buscar en el array usando el primer índice seleccionado [0]
    const primerEmpleado = empleados.find(e => e.codemp === empleadosSeleccionados[0]); 
    const helicopteroDetectado = primerEmpleado ? (primerEmpleado.helicoptero || '0') : '0'; 
    
    // CORRECCIÓN 2: Extraer la mesa real del operario activo en lugar de un estado global vacío
    const mesaDetectada = primerEmpleado ? (primerEmpleado.mesa || '0') : '0';
    
    const valorTipo = soloSolidos ? "SOLIDO" : "BOUQUET"; 
   
    const payload = { 
      cod_empleado: empleadosConNombre, 
      cod_producto: recetaSeleccionada?.p_id, 
      fecha_asignacion: fechaDesde, 
      nombre: recetaSeleccionada?.nombre, 
      mesa: mesaDetectada, 
      helicoptero: helicopteroDetectado, 
      bqt_x_hora: recetaSeleccionada?.bqt_x_hora || '0', 
      tipo: valorTipo 
    }; 

    console.log("📡 Payload Móvil Corregido Enviado:", payload);

    fetch(`${API_BASE_URL}/api/DARTIS/asignar_empleados_transaccion`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    }) 
    .then(response => { 
      if (!response.ok) throw new Error('Error en la respuesta del servidor al procesar la inserción.'); 
      return response.json(); 
    }) 
    .then(data => { 
      toast.success("¡Empleados asignados correctamente!"); 
      setMostrarModal(false); 
      setAsignando(false); 
      
      // Refresco de datos inmediato para poblar las tarjetas
      obtenerSoloConTransacciones();
      if (recetaSeleccionada) { 
        obtenerRendimientoProducto(recetaSeleccionada); 
      } 
    }) 
    .catch(error => { 
      console.error('❌ Error fatal en API Asignar:', error); 
      toast.error('Error al guardar en la base de datos. Revisa la consola.'); 
      setAsignando(false); 
    }); 
  };

const obtenerDatosFiltrados = () => {
   setPestanaActiva('productos'); 
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



const filtradosAlDigitar = productosMostrados.filter(receta => { 
  // --- 1. LÓGICA DE BÚSQUEDA AVANZADA ESTILO SQL LIKE ---
  let cumpleNombre = true;

  if (busquedaProducto) {
    const termino = busquedaProducto.trim().toLowerCase();
    
    // Escapamos los caracteres especiales de Regex, excepto nuestros comodines * y %
    let patronRegex = termino
      .replace(/[-\/\\^$+.()|[\]{}]/g, '\\$&') 
      .replace(/[*%]/g, '.*'); // Convierte * o % en el comodín de Regex '.*'

    try {
      let regex;
      // Si el usuario usó comodines explícitos (* o %), respetamos su posición exacta sin forzar extremos
      if (termino.includes('*') || termino.includes('%')) {
        regex = new RegExp(`^${patronRegex}$`, 'i');
      } else {
        // Si escribió texto normal (ej: "achillea"), se comporta como un "Contiene" tradicional (%achillea%)
        regex = new RegExp(patronRegex, 'i');
      }

      const nombre = receta.nombre?.toLowerCase() || '';
      const p_id = receta.p_id?.toLowerCase() || ''; 
      
      cumpleNombre = regex.test(nombre) || regex.test(p_id);
    } catch (e) {
      // Evitamos caídas si se escribe una expresión incompleta
      cumpleNombre = false;
    }
  }

  // --- 2. TUS FILTROS ORIGINALES (Mantenidos intactos) ---
  const cumpleTipo = !busquedaTipoProducto || 
    receta.Tipo_producto?.toLowerCase().includes(busquedaTipoProducto.toLowerCase()) || 
    receta.tipo_producto?.toLowerCase().includes(busquedaTipoProducto.toLowerCase()); 

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



  const gruposRendimiento = rendimiento.reduce((acc, item) => { 
    const helico = item.id_maquina || 'Lista de emplados Asignados'; 
    if (!acc[helico]) { acc[helico] = { items: [], totalListo: 0, totalPendiente: 0, totalAnulado: 0 }; } 
    acc[helico].items.push(item); 
    acc[helico].totalListo += (item.listo || 0); acc[helico].totalPendiente += (item.pendiente || 0); acc[helico].totalAnulado += (item.anulado || 0); 
    return acc; 
  }, {}); 

  return ( 
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f3f4f6' }}> 
      
        <div style={{ display: 'flex', height: '46px', backgroundColor: '#fff', borderTop: '1px solid #e5e7eb', zIndex: 10 }}>
        <button onClick={() => setPestanaActiva('productos')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: pestanaActiva === 'productos' ? '#92b91c' : '#64748b', fontSize: '11px' }}><List style={{ width: '18px', height: '18px' }} />Productos</button>
        <button onClick={() => setPestanaActiva('rendimiento')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: pestanaActiva === 'rendimiento' ? '#92b91c' : '#64748b', fontSize: '11px' }}><BarChart2 style={{ width: '18px', height: '18px' }} />Rendimiento</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '5px', padding: '5px 8px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <select 
          style={{ width: '28%', padding: '3px', border: '1px solid #ccc', borderRadius: '4px', height: '26px', fontSize: '11px' }} 
          value={departamento} onChange={(e) => setDepartamento(e.target.value)} 
        > 
          <option value="">Depto</option> 
          {listaDepartamentos.filter(dep => user.deptosAutorizados.length === 0 || user.deptosAutorizados.includes(dep.nombre || dep.departamento)).map((dep, idx) => ( <option key={idx} value={dep.nombre || dep.departamento}>{dep.nombre || dep.departamento}</option> ))} 
        </select> 

        <input 
          type="date" value={fechaDesde} onChange={(e) => { setFechaDesde(e.target.value); setFechaHasta(e.target.value); }} 
          style={{ width: '32%', padding: '3px', border: '1px solid #ccc', borderRadius: '4px', height: '26px', fontSize: '11px', textAlign: 'center' }} 
        /> 

        <button 
          onClick={obtenerSoloConTransacciones} 
          style={{ width: '38%', backgroundColor: '#a5c34a', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', height: '26px', whiteSpace: 'nowrap' }} 
        > 
          {cargando ? '...' : '🔍ASIGNADOS'} 
        </button>

        
        <button 
          onClick={obtenerDatosFiltrados} 
          style={{ width: '38%', backgroundColor: '#a5c34a', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', height: '26px', whiteSpace: 'nowrap' }} 
        > 
          {cargando ? '...' : '🔍TODOS'} 
        </button>

      </div> 

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px', boxSizing: 'border-box' }}>
        


       {pestanaActiva === 'productos' && (

        
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <input 
      type="text" 
      placeholder="🔍 Buscar Producto..." 
      value={busquedaProducto} 
      onChange={(e) => setBusquedaProducto(e.target.value)} 
      style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', height: '32px' }} 
    /> 
    <div style={{ fontSize: '10px', color: '#666', paddingLeft: '2px', marginTop: '-2px' }}>
      TOTAL: <strong>{filtradosAlDigitar.length}</strong>
    </div>

    {/* CORRECCIÓN DE VALIDACIONES */}
    {productosMostrados.length === 0 ? ( 
      <div style={{ textAlign: 'center', color: '#aaa', padding: '10px', fontSize: '12px' }}>No hay productos cargados.</div> 
    ) : filtradosAlDigitar.length === 0 ? ( 
      <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '10px', fontSize: '12px' }}>Sin coincidencias.</div> 
    ) : ( 
      filtradosAlDigitar.map((receta, index) => { 
        const esSel = recetaSeleccionada?.p_id === receta.p_id; 
        return ( 
          <div key={`${receta.p_id || 'prod'}-${index}`} onClick={() => obtenerRendimientoProducto(receta)} style={{ padding: '6px 8px', backgroundColor: esSel ? '#effbcb' : '#fff', border: esSel ? '1.5px solid #92b91c' : '1px solid #e5e7eb', borderRadius: '6px', display: 'flex', flexDirection: 'column' }} > 
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#888', lineHeight: 1 }}>
              <span>{receta.p_id}</span>
              <span style={{ fontWeight: 'bold', color: receta.origen === 'Venta de día' ? '#8b8204' : '#0056b3' }}>{receta.origen}</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#222' }}>{receta.nombre}</div> 
            <div style={{ fontSize: '11px', color: '#555', display: 'flex', gap: '6px' }}>
              {receta.Longitud && <span>{receta.Longitud}CM</span>}
              {receta.Empaque && <span>• {receta.Empaque}</span>}
            </div>
          </div> 
        ); 
      }) 
    )}
  </div>
)}


        {pestanaActiva === 'rendimiento' && (
          <div>
            {!recetaSeleccionada ? ( <div style={{ textAlign: 'center', color: '#999', padding: '10px', fontSize: '12px' }}>Selecciona un producto en "Productos".</div> ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: '5px 8px', borderRadius: '6px', marginBottom: '6px', borderLeft: '3px solid #92b91c', gap: '6px' }}>
                  <h3 style={{ margin: 0, color: '#677e11', fontSize: '13px', textTransform: 'uppercase', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recetaSeleccionada.nombre}</h3>
                  <button onClick={abrirModalEmpleado} style={{ padding: '4px 8px', backgroundColor: '#d2eb64', border: '1px solid #b7d142', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', height: '24px', display: 'flex', alignItems: 'center', flexShrink: 0, cursor: 'pointer', color: '#000' }} >+ EMPLEADO</button>
                </div>

                {cargandoDetalle ? ( <div style={{ textAlign: 'center', color: '#666', padding: '10px', fontSize: '12px' }}>Cargando rendimiento...</div> ) : rendimiento.length === 0 ? ( <div style={{ padding: '10px', backgroundColor: '#fff', textAlign: 'center', fontSize: '12px' }}>Sin registros.</div> ) : (
                  Object.keys(gruposRendimiento).map((helicoKey) => {
                    const grupo = gruposRendimiento[helicoKey];
                    return (
                      <div key={helicoKey} style={{ marginBottom: '8px' }}>
                        <div style={{ backgroundColor: '#e2e8f0', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', color: '#475569', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}><span>🚁 {helicoKey}</span><span>Registros: {grupo.items.length}</span></div>
                        {grupo.items.map((item, idx) => (
                          <div key={`${item.id}-${idx}`} style={{ backgroundColor: '#fff', borderRadius: '6px', padding: '5px 6px', marginBottom: '4px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '5px', fontSize: '11px' }}>
                              <div style={{ whiteSpace: 'nowrap', flexShrink: 0 }}><span style={{ color: '#ddd', margin: '0 3px' }}>|</span><span>M:<strong>{item.mesa || '0'}</strong></span><span style={{ color: '#ddd', margin: '0 3px' }}>|</span></div>
                              <div style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>{item.nombre_empleado}</strong><span style={{ color: '#666', fontSize: '10px', marginLeft: '3px' }}>Cod Emp:({item.cod_empledo}<span style={{ fontWeight: 'bold', color: '#ffffffff' }}>#{item.id || '-'}
                                
                                  <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', backgroundColor: '#f8fafc', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                    <span style={{ color: '#779619' }}>✓ {item.listo || 0}</span>
                                    <span style={{ color: '#db970f' }}>⏳ {item.pendiente || 0}</span>
                                    <span style={{ color: '#ca4662' }}>✕ {item.anulado || 0}</span>
                                  </div>
                                </span>
                                

                                </span>
                                </div>
                             
                             
                              <button onClick={(e) => { e.stopPropagation(); setTransaccionParaRfid(item); setMostrarModalRfid(true); }} style={{ backgroundColor: '#92b91c', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', height: '30px', flexShrink: 0 }} >+ TAGS</button>
                            </div>

                          </div>
                        ))}
                        <div style={{ backgroundColor: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px dashed #cbd5e1', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}><span>Total:</span><span style={{ color: '#779619' }}>✓ {grupo.totalListo}</span><span style={{ color: '#db970f' }}>⏳ {grupo.totalPendiente}</span><span style={{ color: '#ca4662' }}>✕ {grupo.totalAnulado}</span></div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div> 

      
      <ModalRfid isOpen={mostrarModalRfid} onClose={() => setMostrarModalRfid(false)} transaccion={transaccionParaRfid} onGuardarTags={guardarTagsAsignados} /> 
      {mostrarModal && ( 
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 99999 }}> 
          <div style={{ backgroundColor: 'white', width: '100%', height: '88vh', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '10px 14px', backgroundColor: '#f9fafb' }}> 
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>Asignar emp: <span style={{ color: '#92b91c' }}>{recetaSeleccionada?.nombre}</span></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f9fafb', borderTop: '1px solid #eee' }}><span style={{ fontSize: '11px' }}>Sel: <strong>{empleadosSeleccionados.length}</strong></span><div style={{ display: 'flex', gap: '6px' }}><button onClick={() => setMostrarModal(false)} style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>Cerrar</button><button onClick={ejecutarAsignacion} disabled={asignando || empleadosSeleccionados.length === 0} style={{ padding: '6px 12px', backgroundColor: empleadosSeleccionados.length === 0 ? '#a0c0e0' : '#257a14', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{asignando ? '...' : 'Asignar Emp'}</button></div></div> 
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', fontWeight: 'bold', color: '#aaa' }}>&times;</button> 
            </div> 
            <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#f3f4f6' }}>
              <div style={{ display: 'flex', gap: '4px' }}><input type="text" placeholder="🔍 Nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ flex: 2, padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '11px', height: '24px' }} /><input type="text" placeholder="🆔 ID..." value={busquedaId} onChange={(e) => setBusquedaId(e.target.value)} style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '11px', height: '24px' }} /></div>
              <div style={{ display: 'flex', gap: '4px' }}><input type="text" placeholder="🏢 Depto..." value={busquedaDepto} disabled onChange={(e) => setBusquedaDepto(e.target.value)} style={{ flex: 1.2, padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '11px', height: '24px' }} /><input type="text" placeholder="🚁 Helico..." value={busquedaHelicoptero} onChange={(e) => setBusquedaHelicoptero(e.target.value)} style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '11px', height: '24px' }} /><input type="text" placeholder="🪑 Mesa..." value={busquedaMesa} onChange={(e) => setBusquedaMesa(e.target.value)} style={{ flex: 0.8, padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '11px', height: '24px' }} /></div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px', backgroundColor: '#fafafa' }}> 
              {cargandoEmpleados ? ( <div style={{ textAlign: 'center', color: '#666', padding: '20px', fontSize: '12px' }}>Cargando empleados...</div> ) : empleados.length > 0 ? ( (() => { 
                  const filtrados = empleados.filter(e => (!busqueda || e.nombre?.toLowerCase().includes(busqueda.toLowerCase())) && (!busquedaId || e.id?.toString().includes(busquedaId) || e.codemp?.toString().includes(busquedaId)) && (!busquedaDepto || e.departamento?.toLowerCase().includes(busquedaDepto.toLowerCase())) && (!busquedaHelicoptero || e.helicoptero?.toLowerCase().includes(busquedaHelicoptero.toLowerCase())) && (!busquedaMesa || e.mesa?.toString().includes(busquedaMesa))); 
                  if (filtrados.length > 0) { return ( <> 
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}><button type="button" onClick={() => setEmpleadosSeleccionados(Array.from(new Set([...empleadosSeleccionados, ...filtrados.map(e => e.codemp)])))} style={{ flex: 1, padding: '5px', backgroundColor: '#eef7cf', color: '#56700c', border: '1px solid #92b91c', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>✓ Todos ({filtrados.length})</button><button type="button" onClick={() => setEmpleadosSeleccionados(empleadosSeleccionados.filter(id => !filtrados.map(e => e.codemp).includes(id)))} style={{ flex: 1, padding: '5px', backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #ccc', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>✗ Limpiar</button></div> 
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>{filtrados.map((emp) => { const sel = empleadosSeleccionados.includes(emp.codemp); return ( <label key={emp.id || emp.codemp} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderRadius: '6px', border: sel ? '1.5px solid #92b91c' : '1px solid #e0e0e0', backgroundColor: sel ? '#f6fbe7' : '#fff', gap: '8px' }}><input type="checkbox" checked={sel} onChange={() => manejarSeleccionEmpleado(emp.codemp)} style={{ width: '16px', height: '16px', accentColor: '#92b91c' }} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.nombre}</div><div style={{ fontSize: '10px', color: '#666' }}><span style={{ color: '#63a925' }}>{emp.departamento || 'Sin Área'}</span> • ID: {emp.codemp}</div></div><div style={{ backgroundColor: sel ? '#92b91c' : '#467602', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>M/H:{emp.mesa || '-'}/{emp.helicoptero || '0'}</div></label> ); })}</div> 
                      </> ); } 
                  return ( <div style={{ textAlign: 'center', color: '#666', padding: '20px', fontSize: '12px' }}>Sin resultados.</div> ); 
                })() ) : ( <div style={{ textAlign: 'center', color: '#aaa', padding: '20px', fontSize: '12px' }}>No hay empleados.</div> )} 
            </div> 
         
          </div> 
        </div> 
      )} 
      {modalConflicto.isOpen && ( <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999, padding: '10px' }}><div style={{ backgroundColor: 'white', width: '100%', maxWidth: '360px', borderRadius: '8px', overflow: 'hidden' }}><div style={{ backgroundColor: '#fffbeb', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle style={{ color: '#d97706', width: '20px', height: '20px' }} /><h3 style={{ margin: 0, color: '#78350f', fontSize: '14px' }}>Conflicto</h3></div><div style={{ padding: '12px', fontSize: '12px', color: '#4b5563' }}>{modalConflicto.mensaje}</div><div style={{ backgroundColor: '#f9fafb', padding: '8px 12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><button onClick={() => setModalConflicto(prev => ({ ...prev, isOpen: false }))} style={{ padding: '6px 10px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}>No</button><button onClick={modalConflicto.onConfirm} style={{ padding: '6px 10px', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Sí, forzar</button></div></div></div> )} 
    </div> 
  ); 
} 
export default Listar;
