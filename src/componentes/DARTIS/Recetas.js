import React, { useEffect, useState } from 'react';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';

const Recetas = () => {
  // Estado para controlar la pestaña activa de navegación superior
  const [pestanaActiva, setPestanaActiva] = useState('crear');
  
  // Catálogos e Historial cargados desde la base de datos de Azure
  const [catalogoVariedades, setCatalogoVariedades] = useState([]);
  const [historialRecetas, setHistorialRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [bouquetAbierto, setBouquetAbierto] = useState(null);




const [tipoReceta, setTipoReceta] = useState(''); // Inicia vacío para obligar a seleccionar


  // Recuperar los datos del usuario logueado de forma segura desde el localStorage
  const [user] = useState(() => { 
    const savedUser = localStorage.getItem("userData"); 
    const defaultUser = { id: null, nombre: 'Usuario', idperfil: null, id_empresa: '', departamento: '', id_dartis: null }; 
    if (savedUser) { 
      try { return JSON.parse(savedUser); } catch (e) { return defaultUser; } 
    } 
    return defaultUser; 
  });

  // Parámetros para la creación y concatenación automatizada de nombres
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idRecetaAEditar, setIdRecetaAEditar] = useState(null);
  const [nombreBase, setNombreBase] = useState('');
  const [tamano, setTamano] = useState('');
  const [colorReceta, setColorReceta] = useState('');
  const [longitud1, setLongitud1] = useState('');
  const [longitud2, setLongitud2] = useState('');
  const [longitud3, setLongitud3] = useState('');
  const [observacion, setObservacion] = useState('');
  const [nuevosComponentes, setNuevosComponentes] = useState([]);

  // Controladores exclusivos de la ventana emergente de selección rápida de flores
  const [mostrarModal, setMostrarModal] = useState(false);
  const [busquedaFlor, setBusquedaFlor] = useState('');
  const [floresSeleccionadasTemporales, setFloresSeleccionadasTemporales] = useState({});
  // Cargar datos al montar la pantalla (Catálogo de Flores + Historial Maestro-Detalle)
  // Cargar datos al montar la pantalla de forma independiente
  const cargarDatosIniciales = async () => {
    setLoading(true);
    
    // 1. Intentar cargar el catálogo base para el Buscador de Flores
    try {
      const resVariedades = await fetchWithFallback('/api/DARTIS/recetas_dartis');
      if (resVariedades) {
        setCatalogoVariedades(resVariedades);
      } else {
        console.warn("⚠️ El catálogo de variedades retornó vacío.");
      }
    } catch (error) {
      console.error("❌ Error al cargar catálogo de variedades:", error.message);
      toast.error('No se pudo cargar el catálogo de flores desde el servidor.');
    }

    // 2. Intentar cargar la lista maestra de recetas creadas (Historial)
    try {
      const resHistorial = await fetchWithFallback('/api/DARTIS/listar_composiciones'); 
      if (resHistorial) {
        setHistorialRecetas(agruparPorBouquet(resHistorial));
      } else {
        console.warn("⚠️ El historial de composiciones retornó vacío.");
        setHistorialRecetas([]);
      }
    } catch (error) {
      console.error("❌ Error al cargar historial de composiciones:", error.message);
      toast.error('No se pudo conectar con el historial de recetas guardadas.');
    } finally {
      setLoading(false);
    }
  };

  // Transforma las filas planas unidas por SQL en objetos jerárquicos Maestro-Detalle
const agruparPorBouquet = (listaPlanos) => {
    if (!Array.isArray(listaPlanos)) return [];
    const mapa = {};
    listaPlanos.forEach(item => {
      if (!item || !item.id_bouquet) return;
      if (!mapa[item.id_bouquet]) {
        mapa[item.id_bouquet] = {
          id: item.id_bouquet,
          nombre: item.bouquet,
          // 1. Usamos parseInt para asegurar que el estado sea un número entero limpio (ej: 4)
          estado: parseInt(item.estado, 10) || 1, 
          totalTallos: 0,
          fecha_creacion: item.fecha_creacion,
          longitud_1: item.longitud_1,
          longitud_2: item.longitud_2,
          longitud_3: item.longitud_3,
          // 🟥 CORRECCIÓN CRÍTICA: Te faltaba mapear la observación aquí
          observacion: item.observacion || '', 
          tipo: item.tipo ? Number(item.tipo) : 1, // <-- Asegura que sea número
          receta: []
        };
      }
      const cant = Number(item.TALLOS) || 0;
      mapa[item.id_bouquet].totalTallos += cant;
      mapa[item.id_bouquet].receta.push({ varietyCompound: item.varietyCompound, TALLOS: cant });
    });
    return Object.values(mapa);
};


  useEffect(() => {
    cargarDatosIniciales();
  }, []);


  useEffect(() => {
    cargarDatosIniciales();
  }, []);
  const handleTallosChange = (index, valor) => {
    const copia = [...nuevosComponentes];
    copia[index].TALLOS = valor;
    setNuevosComponentes(copia);
  };

  const eliminarComponente = (index) => {
    setNuevosComponentes(nuevosComponentes.filter((_, i) => i !== index));
  };

  const toggleSeleccionTemporal = (nombreFlor) => {
    setFloresSeleccionadasTemporales(prev => ({ ...prev, [nombreFlor]: !prev[nombreFlor] }));
  };

  const confirmarAgregarFlores = () => {
    const seleccionadas = Object.keys(floresSeleccionadasTemporales).filter(k => floresSeleccionadasTemporales[k]);
    const nuevosItems = seleccionadas
      .filter(flor => !nuevosComponentes.some(comp => comp.varietyCompound === flor))
      .map(flor => ({ varietyCompound: flor, TALLOS: '' }));
    setNuevosComponentes([...nuevosComponentes, ...nuevosItems]);
    setFloresSeleccionadasTemporales({});
    setBusquedaFlor('');
    setMostrarModal(false);
  };

  const catalogoFiltrado = catalogoVariedades.filter(f => 
    f?.varietyCompound?.toLowerCase().includes(busquedaFlor.toLowerCase())
  );

  const totalTallosFormulario = nuevosComponentes.reduce((acc, curr) => acc + (Number(curr.TALLOS) || 0), 0);

  const construirNombreBouquet = () => {
    const parteInicial = [nombreBase.trim(), tamano.trim(), colorReceta.trim()].filter(Boolean).join(' ');
    return parteInicial ? `${parteInicial.toUpperCase()} - (${totalTallosFormulario}ST)` : '';
  };
  const cambiarEstadoBouquet = async (id, nuevoEstado) => {
    try {
      await fetchWithFallback(`/api/DARTIS/actualizar_estado/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      toast.success('Estado del bouquet actualizado correctamente.');
      cargarDatosIniciales(); 
    } catch (error) {
      toast.error('No se pudo cambiar el estado.');
    }
  };

 const iniciarEdicion = (receta) => { 
  setIdRecetaAEditar(receta.id); 
  setModoEdicion(true); 
  
  const nombreCompleto = receta.nombre || ''; 
  
  // 1. Separamos estrictamente usando el patrón del guion que aísla los tallos
  const partesGuion = nombreCompleto.split(/\s*-\s*\(.*\)/); 
  const textoLimpio = partesGuion[0] ? partesGuion[0].trim() : nombreCompleto.split(' - ')[0] || ''; 
  
  // 2. Asignamos TODO el bloque de texto directamente a la caja de NOMBRE
  setNombreBase(textoLimpio); 
  
  // 3. Vaciamos o limpiamos las cajas de tamaño y color si ahora forman parte del NOMBRE base
  setTamano(''); 
  setColorReceta(''); 
  
  // ✅ CORRECCIÓN: Carga el tipo guardado en la receta (o 2 = Edición si viniera vacío)
  setTipoReceta(receta.tipo ? Number(receta.tipo) : 2); 

  // 4. Mapeo seguro de los campos de longitud y observaciones de la receta
  setLongitud1(receta.longitud_1 !== null && receta.longitud_1 !== undefined ? String(receta.longitud_1) : ''); 
  setLongitud2(receta.longitud_2 !== null && receta.longitud_2 !== undefined ? String(receta.longitud_2) : ''); 
  setLongitud3(receta.longitud_3 !== null && receta.longitud_3 !== undefined ? String(receta.longitud_3) : ''); 
  setObservacion(receta.observacion || ''); 
  
  // 5. Cargamos los componentes florales y redirigimos a la pestaña del formulario
  setNuevosComponentes(receta.receta.map(c => ({ ...c }))); 
  setPestanaActiva('crear'); 
};


const renderBadgeTipo = (tipo) => {
  const esEdicion = Number(tipo) === 2;
  return (
    <span
      style={{
        display: 'inline-block',
        marginLeft: '8px',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        backgroundColor: esEdicion ? '#fef3c7' : '#dcfce7',
        color: esEdicion ? '#b45309' : '#15803d',
        border: `1px solid ${esEdicion ? '#fcd34d' : '#86efac'}`,
        verticalAlign: 'middle'
      }}
    >
      {esEdicion ? 'Edición' : 'Creación'}
    </span>
  );
};



  const cancelarEdicion = () => {
    setModoEdicion(false);
    setIdRecetaAEditar(null);
    setNombreBase('');
    setTamano('');
    setColorReceta('');
    setLongitud1('');
    setLongitud2('');
    setLongitud3('');
    setObservacion('');
    setNuevosComponentes([]);
    setTipoReceta(''); // Vuelve a quedar vacío al limpiar el formulario

  };

const guardarReceta = async (e) => { 
  e.preventDefault(); 
  const nombreCompletoGenerado = construirNombreBouquet(); 
  
  if (!nombreCompletoGenerado || !nombreBase.trim()) {
    return toast.error('Estructura un nombre válido.'); 
  }
  
  // ✅ NUEVA VALIDACIÓN PARA EL CAMPO TIPO
  if (!tipoReceta || ![1, 2].includes(Number(tipoReceta))) {
    return toast.error('Por favor, selecciona el tipo de receta (Creación o Edición).');
  }

  if (nuevosComponentes.length === 0) {
    return toast.error('Añade al menos un componente válido.'); 
  }

  const payload = { 
    bouquet: nombreCompletoGenerado, 
    usuario_creacion: user?.id ? Number(user.id) : null, 
    estado: 1, 
    tipo: Number(tipoReceta), // Ya está validado que es 1 o 2
    longitud_1: longitud1 ? Number(longitud1) : null, 
    longitud_2: longitud2 ? Number(longitud2) : null, 
    longitud_3: longitud3 ? Number(longitud3) : null, 
    observacion: observacion.trim(), 
    componentes: nuevosComponentes.map(c => ({ 
      varietyCompound: c.varietyCompound, 
      TALLOS: Number(c.TALLOS) 
    })) 
  }; 
  // ... resto de tu código fetchWithFallback ...


    try { 
        const url = modoEdicion ? `/api/DARTIS/editar_receta/${idRecetaAEditar}` : '/api/DARTIS/crear_receta'; 
        const metodo = modoEdicion ? 'PUT' : 'POST'; 

        await fetchWithFallback(url, { 
            method: metodo, 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 

        toast.success(modoEdicion ? '¡Receta modificada con éxito!' : '¡Composición guardada exitosamente!'); 
        cancelarEdicion(); 
        cargarDatosIniciales(); 
        setPestanaActiva('aprobados'); 
    } catch (error) { 
        toast.error('Ocurrió un error al procesar la operación en la base de datos.'); 
    } 
};


  const historialFiltrado = historialRecetas.filter(item => {
    const t = busqueda.toLowerCase();
    return item.nombre.toLowerCase().includes(t) || item.receta.some(c => c.varietyCompound.toLowerCase().includes(t));
  });
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '850px', margin: '0 auto' }}>
      
      {/* Barra de 4 Pestañas Superiores */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
    
{/* Barra de Pestañas Estilo Línea de Tiempo - VERSIÓN AMPLIADA */}
<div style={{ 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  position: 'relative', 
  marginBottom: '40px', 
  padding: '20px 25px', /* Más espacio interno */
  backgroundColor: '#fff',
  borderRadius: '14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  width: '100%', /* Ocupa todo el contenedor base */
  boxSizing: 'border-box'
}}>
  
  {/* LÍNEA DE TIEMPO (FONDO Y LLENADO DINÁMICO REESCALADO) */}
  {/* Línea gris base */}
  <div style={{
    position: 'absolute',
    top: '46px', /* Ajustado para el nuevo tamaño de círculos */
    left: '8%',
    right: '28%', 
    height: '5px', /* Más gruesa para que se note */
    backgroundColor: '#e2e8f0',
    zIndex: 1,
  }} />
  
  {/* Línea de progreso activa */}
  <div style={{
    position: 'absolute',
    top: '46px',
    left: '8%',
    width: 
      pestanaActiva === 'crear' ? '0%' : 
      pestanaActiva === 'aprobados' ? '33%' : 
      pestanaActiva === 'dartis' ? '66%' : 
      pestanaActiva === 'creados' ? '100%' : '0%', 
    height: '5px',
    backgroundColor: '#7a9b17',
    zIndex: 1,
    transition: 'width 0.4s ease-in-out'
  }} />

  {/* PASO 1: CREAR / EDITAR */}
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
    <button type="button" onClick={() => { setPestanaActiva('crear'); if(!modoEdicion) cancelarEdicion(); }} style={{ 
      width: '56px', height: '56px', borderRadius: '50%', border: '4px solid', /* Círculos más grandes */
      borderColor: pestanaActiva === 'crear' ? '#7a9b17' : '#e2e8f0', fontWeight: 'bold', cursor: 'pointer', 
      backgroundColor: pestanaActiva === 'crear' ? '#7a9b17' : '#fff', color: pestanaActiva === 'crear' ? '#fff' : '#64748b', 
      fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'all 0.3s'
    }}>
      {modoEdicion ? '📝' : '➕'}
    </button>
    <span style={{ fontSize: '13px', fontWeight: '700', marginTop: '10px', color: pestanaActiva === 'crear' ? '#7a9b17' : '#475569' }}>
      {modoEdicion ? 'Editando' : 'Crear'}
    </span>
  </div>

  {/* PASO 2: BQT */}
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
    <button type="button" onClick={() => setPestanaActiva('aprobados')} style={{ 
      width: '56px', height: '56px', borderRadius: '50%', border: '4px solid',
      borderColor: pestanaActiva === 'aprobados' ? '#7a9b17' : 
                   (['dartis', 'creados'].includes(pestanaActiva)) ? '#7a9b17' : '#e2e8f0', fontWeight: 'bold', cursor: 'pointer', 
      backgroundColor: pestanaActiva === 'aprobados' ? '#7a9b17' : 
                       (['dartis', 'creados'].includes(pestanaActiva)) ? '#f0fdf4' : '#fff', 
      color: pestanaActiva === 'aprobados' ? '#fff' : '#7a9b17', 
      fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'all 0.3s'
    }}>
      🟢
    </button>
    <span style={{ fontSize: '13px', fontWeight: '700', marginTop: '10px', color: pestanaActiva === 'aprobados' ? '#7a9b17' : '#475569' }}>
      BQT ({historialRecetas.filter(i => i.estado === 1).length})
    </span>
  </div>

  {/* PASO 3: SISTEMAS */}
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
    <button type="button" onClick={() => setPestanaActiva('dartis')} style={{ 
      width: '56px', height: '56px', borderRadius: '50%', border: '4px solid',
      borderColor: pestanaActiva === 'dartis' ? '#2b6cb0' : 
                   (pestanaActiva === 'creados') ? '#7a9b17' : '#e2e8f0', fontWeight: 'bold', cursor: 'pointer', 
      backgroundColor: pestanaActiva === 'dartis' ? '#2b6cb0' : 
                       (pestanaActiva === 'creados') ? '#f0fdf4' : '#fff', 
      color: pestanaActiva === 'dartis' ? '#fff' : '#2b6cb0', 
      fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'all 0.3s'
    }}>
      🔵
    </button>
    <span style={{ fontSize: '13px', fontWeight: '700', marginTop: '10px', color: pestanaActiva === 'dartis' ? '#2b6cb0' : '#475569' }}>
      Sistemas ({historialRecetas.filter(i => i.estado === 2).length})
    </span>
  </div>

  {/* PASO 4: CREADOS */}
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
    <button type="button" onClick={() => setPestanaActiva('creados')} style={{ 
      width: '56px', height: '56px', borderRadius: '50%', border: '4px solid',
      borderColor: pestanaActiva === 'creados' ? '#15803d' : '#e2e8f0', fontWeight: 'bold', cursor: 'pointer', 
      backgroundColor: pestanaActiva === 'creados' ? '#15803d' : '#fff', color: pestanaActiva === 'creados' ? '#fff' : '#15803d', 
      fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'all 0.3s'
    }}>
      ✅
    </button>
    <span style={{ fontSize: '13px', fontWeight: '700', marginTop: '10px', color: pestanaActiva === 'creados' ? '#15803d' : '#475569' }}>
      Creados ({historialRecetas.filter(i => i.estado === 4).length})
    </span>
  </div>

  {/* LÍNEA DIVISORIA */}
  <div style={{ height: '40px', width: '2px', backgroundColor: '#cbd5e1', margin: '0 15px', marginTop: '-20px' }} />

  {/* PASO EXTRA: ANULADOS */}
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 0.9 }}>
    <button type="button" onClick={() => setPestanaActiva('anulados')} style={{ 
      width: '56px', height: '56px', borderRadius: '50%', border: '4px solid',
      borderColor: pestanaActiva === 'anulados' ? '#e53e3e' : '#e2e8f0', fontWeight: 'bold', cursor: 'pointer', 
      backgroundColor: pestanaActiva === 'anulados' ? '#e53e3e' : '#fff', color: pestanaActiva === 'anulados' ? '#fff' : '#e53e3e', 
      fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'all 0.3s'
    }}>
      ❌
    </button>
    <span style={{ fontSize: '13px', fontWeight: '700', marginTop: '10px', color: pestanaActiva === 'anulados' ? '#e53e3e' : '#475569' }}>
      Anulados ({historialRecetas.filter(i => i.estado === 3).length})
    </span>
  </div>

</div>


      </div>

      {/* PESTAÑA A: FORMULARIO CONFIGURADOR */}
      {pestanaActiva === 'crear' && (
        <form onSubmit={guardarReceta} style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
         

                  <h4 style={{ 
                    color: '#7a9b17', 
                    margin: '0 0 20px 0', 
                    borderBottom: '2px solid #7a9b17', 
                    paddingBottom: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    📋 Estructura del Nombre de la Composición
                  </h4>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(12, 1fr)', 
                    gap: '16px', 
                    marginBottom: '25px',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box'
                  }}>
                    
                    {/* PRIMERA FILA: DATOS BASE DEL NOMBRE */}
                    {/* Campo NOMBRE (Ocupa 6 de 12 columnas) */}
                    <div style={{ gridColumn: 'span 6' }}>
                      <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '6px', color: '#475569' }}>
                        NOMBRE BASE:
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ej: CB ASST" 
                        value={nombreBase} 
                        onChange={(e) => setNombreBase(e.target.value)} 
                        style={{ 
                          width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                          boxSizing: 'border-box', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc',
                          transition: 'all 0.2s ease'
                        }} 
                        onFocus={(e) => { e.target.style.borderColor = '#7a9b17'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(122,155,23,0.15)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.backgroundColor = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                        required 
                      />
                    </div>
                    
                 {/* Selector TAMAÑO (Ocupa 3 de 12 columnas) */}
                  <div style={{ gridColumn: 'span 3' }}>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '6px', color: '#475569' }}>
                      TAMAÑO:
                    </label>
                    <select 
                      value={tamano} 
                      onChange={(e) => setTamano(e.target.value)} 
                      style={{ 
                        width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                        boxSizing: 'border-box', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc',
                        transition: 'all 0.2s ease', cursor: 'pointer'
                      }} 
                      onFocus={(e) => { e.target.style.borderColor = '#7a9b17'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(122,155,23,0.15)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.backgroundColor = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    >
                      <option value="">Seleccione...</option>
                      <option value="SMALL">SMALL</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LARGE">LARGE</option>
                    </select>
                  </div>


                    {/* Campo COLOR (Ocupa 3 de 12 columnas) */}
                  {/* Selector COLOR / RECETA Completo (Ocupa 3 de 12 columnas) */}
<div style={{ gridColumn: 'span 3' }}>
  <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '6px', color: '#475569' }}>
    COLOR / RECETA:
  </label>
  <select 
    value={colorReceta} 
    onChange={(e) => setColorReceta(e.target.value)} 
    style={{ 
      width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', 
      boxSizing: 'border-box', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc',
      transition: 'all 0.2s ease', cursor: 'pointer'
    }} 
    onFocus={(e) => { e.target.style.borderColor = '#7a9b17'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(122,155,23,0.15)'; }}
    onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.backgroundColor = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
  >
    <option value="">Seleccione...</option>
        <optgroup label="Colores Sólidos Individuales">
      <option value="BLACK">BLACK</option>
      <option value="BLUE">BLUE</option>
      <option value="BRONZE">BRONZE</option>
      <option value="BROWN">BROWN</option>
      <option value="BURGUNDY">BURGUNDY</option>
      <option value="CORAL">CORAL</option>
      <option value="CREAM">CREAM</option>
      <option value="GRAY">GRAY</option>
      <option value="GREEN">GREEN</option>
      <option value="HOT PINK">HOT PINK</option>
      <option value="LAVENDER">LAVENDER</option>
      <option value="ORANGE">ORANGE</option>
      <option value="PEACH">PEACH</option>
      <option value="PINK">PINK</option>
      <option value="PURPLE">PURPLE</option>
      <option value="RED">RED</option>
      <option value="SALMON">SALMON</option>
      <option value="SAND">SAND</option>
      <option value="WHITE">WHITE</option>
      <option value="YELLOW">YELLOW</option>
    </optgroup>



    <optgroup label="Base BLACK">
      <option value="BLACK/BICOLOR">BLACK/BICOLOR</option>
      <option value="BLACK/BLUE">BLACK/BLUE</option>
      <option value="BLACK/BROWN">BLACK/BROWN</option>
      <option value="BLACK/CREAM">BLACK/CREAM</option>
      <option value="BLACK/GRAY">BLACK/GRAY</option>
      <option value="BLACK/GREEN">BLACK/GREEN</option>
      <option value="BLACK/HOT PINK">BLACK/HOT PINK</option>
      <option value="BLACK/LAVENDER">BLACK/LAVENDER</option>
      <option value="BLACK/ORANGE">BLACK/ORANGE</option>
      <option value="BLACK/PEACH">BLACK/PEACH</option>
      <option value="BLACK/PINK">BLACK/PINK</option>
      <option value="BLACK/RED">BLACK/RED</option>
      <option value="BLACK/WHITE">BLACK/WHITE</option>
      <option value="BLACK/YELLOW">BLACK/YELLOW</option>
      <option value="BLACK/PURPLE">BLACK/PURPLE</option>
      <option value="BLACK/SALMON">BLACK/SALMON</option>
      <option value="BLACK/SAND">BLACK/SAND</option>
      <option value="BLACK/BRONZE">BLACK/BRONZE</option>
      <option value="BLACK/CORAL">BLACK/CORAL</option>
      <option value="BLACK/BURGUNDY">BLACK/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base BLUE">
      <option value="BLUE/BICOLOR">BLUE/BICOLOR</option>
      <option value="BLUE/BROWN">BLUE/BROWN</option>
      <option value="BLUE/CREAM">BLUE/CREAM</option>
      <option value="BLUE/GRAY">BLUE/GRAY</option>
      <option value="BLUE/GREEN">BLUE/GREEN</option>
      <option value="BLUE/HOT PINK">BLUE/HOT PINK</option>
      <option value="BLUE/LAVENDER">BLUE/LAVENDER</option>
      <option value="BLUE/ORANGE">BLUE/ORANGE</option>
      <option value="BLUE/PEACH">BLUE/PEACH</option>
      <option value="BLUE/PINK">BLUE/PINK</option>
      <option value="BLUE/RED">BLUE/RED</option>
      <option value="BLUE/WHITE">BLUE/WHITE</option>
      <option value="BLUE/YELLOW">BLUE/YELLOW</option>
      <option value="BLUE/PURPLE">BLUE/PURPLE</option>
      <option value="BLUE/BLACK">BLUE/BLACK</option>
      <option value="BLUE/SALMON">BLUE/SALMON</option>
      <option value="BLUE/SAND">BLUE/SAND</option>
      <option value="BLUE/BRONZE">BLUE/BRONZE</option>
      <option value="BLUE/CORAL">BLUE/CORAL</option>
      <option value="BLUE/BURGUNDY">BLUE/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base BRONZE">
      <option value="BRONZE/BICOLOR">BRONZE/BICOLOR</option>
      <option value="BRONZE/BLUE">BRONZE/BLUE</option>
      <option value="BRONZE/BROWN">BRONZE/BROWN</option>
      <option value="BRONZE/CREAM">BRONZE/CREAM</option>
      <option value="BRONZE/GRAY">BRONZE/GRAY</option>
      <option value="BRONZE/GREEN">BRONZE/GREEN</option>
      <option value="BRONZE/HOT PINK">BRONZE/HOT PINK</option>
      <option value="BRONZE/LAVENDER">BRONZE/LAVENDER</option>
      <option value="BRONZE/ORANGE">BRONZE/ORANGE</option>
      <option value="BRONZE/PEACH">BRONZE/PEACH</option>
      <option value="BRONZE/PINK">BRONZE/PINK</option>
      <option value="BRONZE/RED">BRONZE/RED</option>
      <option value="BRONZE/WHITE">BRONZE/WHITE</option>
      <option value="BRONZE/YELLOW">BRONZE/YELLOW</option>
      <option value="BRONZE/PURPLE">BRONZE/PURPLE</option>
      <option value="BRONZE/BLACK">BRONZE/BLACK</option>
      <option value="BRONZE/SALMON">BRONZE/SALMON</option>
      <option value="BRONZE/SAND">BRONZE/SAND</option>
      <option value="BRONZE/CORAL">BRONZE/CORAL</option>
      <option value="BRONZE/BURGUNDY">BRONZE/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base BROWN">
      <option value="BROWN/BICOLOR">BROWN/BICOLOR</option>
      <option value="BROWN/BLUE">BROWN/BLUE</option>
      <option value="BROWN/CREAM">BROWN/CREAM</option>
      <option value="BROWN/GRAY">BROWN/GRAY</option>
      <option value="BROWN/GREEN">BROWN/GREEN</option>
      <option value="BROWN/HOT PINK">BROWN/HOT PINK</option>
      <option value="BROWN/LAVENDER">BROWN/LAVENDER</option>
      <option value="BROWN/ORANGE">BROWN/ORANGE</option>
      <option value="BROWN/PEACH">BROWN/PEACH</option>
      <option value="BROWN/PINK">BROWN/PINK</option>
      <option value="BROWN/RED">BROWN/RED</option>
      <option value="BROWN/WHITE">BROWN/WHITE</option>
      <option value="BROWN/YELLOW">BROWN/YELLOW</option>
      <option value="BROWN/PURPLE">BROWN/PURPLE</option>
      <option value="BROWN/BLACK">BROWN/BLACK</option>
      <option value="BROWN/SALMON">BROWN/SALMON</option>
      <option value="BROWN/SAND">BROWN/SAND</option>
      <option value="BROWN/BRONZE">BROWN/BRONZE</option>
      <option value="BROWN/CORAL">BROWN/CORAL</option>
      <option value="BROWN/BURGUNDY">BROWN/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base BURGUNDY">
      <option value="BURGUNDY/BICOLOR">BURGUNDY/BICOLOR</option>
      <option value="BURGUNDY/BLUE">BURGUNDY/BLUE</option>
      <option value="BURGUNDY/BROWN">BURGUNDY/BROWN</option>
      <option value="BURGUNDY/CREAM">BURGUNDY/CREAM</option>
      <option value="BURGUNDY/GRAY">BURGUNDY/GRAY</option>
      <option value="BURGUNDY/GREEN">BURGUNDY/GREEN</option>
      <option value="BURGUNDY/HOT PINK">BURGUNDY/HOT PINK</option>
      <option value="BURGUNDY/LAVENDER">BURGUNDY/LAVENDER</option>
      <option value="BURGUNDY/ORANGE">BURGUNDY/ORANGE</option>
      <option value="BURGUNDY/PEACH">BURGUNDY/PEACH</option>
      <option value="BURGUNDY/PINK">BURGUNDY/PINK</option>
      <option value="BURGUNDY/RED">BURGUNDY/RED</option>
      <option value="BURGUNDY/WHITE">BURGUNDY/WHITE</option>
      <option value="BURGUNDY/YELLOW">BURGUNDY/YELLOW</option>
      <option value="BURGUNDY/PURPLE">BURGUNDY/PURPLE</option>
      <option value="BURGUNDY/BLACK">BURGUNDY/BLACK</option>
      <option value="BURGUNDY/SALMON">BURGUNDY/SALMON</option>
      <option value="BURGUNDY/SAND">BURGUNDY/SAND</option>
      <option value="BURGUNDY/BRONZE">BURGUNDY/BRONZE</option>
      <option value="BURGUNDY/CORAL">BURGUNDY/CORAL</option>
    </optgroup>


    <optgroup label="Base CORAL">
      <option value="CORAL/BICOLOR">CORAL/BICOLOR</option>
      <option value="CORAL/BLUE">CORAL/BLUE</option>
      <option value="CORAL/BROWN">CORAL/BROWN</option>
      <option value="CORAL/CREAM">CORAL/CREAM</option>
      <option value="CORAL/GRAY">CORAL/GRAY</option>
      <option value="CORAL/GREEN">CORAL/GREEN</option>
      <option value="CORAL/HOT PINK">CORAL/HOT PINK</option>
      <option value="CORAL/LAVENDER">CORAL/LAVENDER</option>
      <option value="CORAL/ORANGE">CORAL/ORANGE</option>
      <option value="CORAL/PEACH">CORAL/PEACH</option>
      <option value="CORAL/PINK">CORAL/PINK</option>
      <option value="CORAL/RED">CORAL/RED</option>
      <option value="CORAL/WHITE">CORAL/WHITE</option>
      <option value="CORAL/YELLOW">CORAL/YELLOW</option>
      <option value="CORAL/PURPLE">CORAL/PURPLE</option>
      <option value="CORAL/BLACK">CORAL/BLACK</option>
      <option value="CORAL/SALMON">CORAL/SALMON</option>
      <option value="CORAL/SAND">CORAL/SAND</option>
      <option value="CORAL/BRONZE">CORAL/BRONZE</option>
      <option value="CORAL/BURGUNDY">CORAL/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base CREAM">
      <option value="CREAM/BICOLOR">CREAM/BICOLOR</option>
      <option value="CREAM/BLUE">CREAM/BLUE</option>
      <option value="CREAM/BROWN">CREAM/BROWN</option>
      <option value="CREAM/GRAY">CREAM/GRAY</option>
      <option value="CREAM/GREEN">CREAM/GREEN</option>
      <option value="CREAM/HOT PINK">CREAM/HOT PINK</option>
      <option value="CREAM/LAVENDER">CREAM/LAVENDER</option>
      <option value="CREAM/ORANGE">CREAM/ORANGE</option>
      <option value="CREAM/PEACH">CREAM/PEACH</option>
      <option value="CREAM/PINK">CREAM/PINK</option>
      <option value="CREAM/RED">CREAM/RED</option>
      <option value="CREAM/WHITE">CREAM/WHITE</option>
      <option value="CREAM/YELLOW">CREAM/YELLOW</option>
      <option value="CREAM/PURPLE">CREAM/PURPLE</option>
      <option value="CREAM/BLACK">CREAM/BLACK</option>
      <option value="CREAM/SALMON">CREAM/SALMON</option>
      <option value="CREAM/SAND">CREAM/SAND</option>
      <option value="CREAM/BRONZE">CREAM/BRONZE</option>
      <option value="CREAM/CORAL">CREAM/CORAL</option>
      <option value="CREAM/BURGUNDY">CREAM/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base GRAY">
      <option value="GRAY/BICOLOR">GRAY/BICOLOR</option>
      <option value="GRAY/BLUE">GRAY/BLUE</option>
      <option value="GRAY/BROWN">GRAY/BROWN</option>
      <option value="GRAY/CREAM">GRAY/CREAM</option>
      <option value="GRAY/GREEN">GRAY/GREEN</option>
      <option value="GRAY/HOT PINK">GRAY/HOT PINK</option>
      <option value="GRAY/LAVENDER">GRAY/LAVENDER</option>
      <option value="GRAY/ORANGE">GRAY/ORANGE</option>
      <option value="GRAY/PEACH">GRAY/PEACH</option>
      <option value="GRAY/PINK">GRAY/PINK</option>
      <option value="GRAY/RED">GRAY/RED</option>
      <option value="GRAY/WHITE">GRAY/WHITE</option>
      <option value="GRAY/YELLOW">GRAY/YELLOW</option>
      <option value="GRAY/PURPLE">GRAY/PURPLE</option>
      <option value="GRAY/BLACK">GRAY/BLACK</option>
      <option value="GRAY/SALMON">GRAY/SALMON</option>
      <option value="GRAY/SAND">GRAY/SAND</option>
      <option value="GRAY/BRONZE">GRAY/BRONZE</option>
      <option value="GRAY/CORAL">GRAY/CORAL</option>
      <option value="GRAY/BURGUNDY">GRAY/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base GREEN">
      <option value="GREEN/BICOLOR">GREEN/BICOLOR</option>
      <option value="GREEN/BLUE">GREEN/BLUE</option>
      <option value="GREEN/BROWN">GREEN/BROWN</option>
      <option value="GREEN/CREAM">GREEN/CREAM</option>
      <option value="GREEN/GRAY">GREEN/GRAY</option>
      <option value="GREEN/HOT PINK">GREEN/HOT PINK</option>
      <option value="GREEN/LAVENDER">GREEN/LAVENDER</option>
      <option value="GREEN/ORANGE">GREEN/ORANGE</option>
      <option value="GREEN/PEACH">GREEN/PEACH</option>
      <option value="GREEN/PINK">GREEN/PINK</option>
      <option value="GREEN/RED">GREEN/RED</option>
      <option value="GREEN/WHITE">GREEN/WHITE</option>
      <option value="GREEN/YELLOW">GREEN/YELLOW</option>
      <option value="GREEN/PURPLE">GREEN/PURPLE</option>
      <option value="GREEN/BLACK">GREEN/BLACK</option>
      <option value="GREEN/SALMON">GREEN/SALMON</option>
      <option value="GREEN/SAND">GREEN/SAND</option>
      <option value="GREEN/BRONZE">GREEN/BRONZE</option>
      <option value="GREEN/CORAL">GREEN/CORAL</option>
      <option value="GREEN/BURGUNDY">GREEN/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base HOT PINK">
      <option value="HOT PINK/BICOLOR">HOT PINK/BICOLOR</option>
      <option value="HOT PINK/BLUE">HOT PINK/BLUE</option>
      <option value="HOT PINK/BROWN">HOT PINK/BROWN</option>
      <option value="HOT PINK/CREAM">HOT PINK/CREAM</option>
      <option value="HOT PINK/GRAY">HOT PINK/GRAY</option>
      <option value="HOT PINK/GREEN">HOT PINK/GREEN</option>
      <option value="HOT PINK/LAVENDER">HOT PINK/LAVENDER</option>
      <option value="HOT PINK/ORANGE">HOT PINK/ORANGE</option>
      <option value="HOT PINK/PEACH">HOT PINK/PEACH</option>
      <option value="HOT PINK/PINK">HOT PINK/PINK</option>
      <option value="HOT PINK/RED">HOT PINK/RED</option>
      <option value="HOT PINK/WHITE">HOT PINK/WHITE</option>
      <option value="HOT PINK/YELLOW">HOT PINK/YELLOW</option>
      <option value="HOT PINK/PURPLE">HOT PINK/PURPLE</option>
      <option value="HOT PINK/BLACK">HOT PINK/BLACK</option>
      <option value="HOT PINK/SALMON">HOT PINK/SALMON</option>
      <option value="HOT PINK/SAND">HOT PINK/SAND</option>
      <option value="HOT PINK/BRONZE">HOT PINK/BRONZE</option>
      <option value="HOT PINK/CORAL">HOT PINK/CORAL</option>
      <option value="HOT PINK/BURGUNDY">HOT PINK/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base LAVENDER">
      <option value="LAVENDER/BICOLOR">LAVENDER/BICOLOR</option>
      <option value="LAVENDER/BLUE">LAVENDER/BLUE</option>
      <option value="LAVENDER/BROWN">LAVENDER/BROWN</option>
      <option value="LAVENDER/CREAM">LAVENDER/CREAM</option>
      <option value="LAVENDER/GRAY">LAVENDER/GRAY</option>
      <option value="LAVENDER/GREEN">LAVENDER/GREEN</option>
      <option value="LAVENDER/HOT PINK">LAVENDER/HOT PINK</option>
      <option value="LAVENDER/ORANGE">LAVENDER/ORANGE</option>
      <option value="LAVENDER/PEACH">LAVENDER/PEACH</option>
      <option value="LAVENDER/PINK">LAVENDER/PINK</option>
      <option value="LAVENDER/RED">LAVENDER/RED</option>
      <option value="LAVENDER/WHITE">LAVENDER/WHITE</option>
      <option value="LAVENDER/YELLOW">LAVENDER/YELLOW</option>
      <option value="LAVENDER/PURPLE">LAVENDER/PURPLE</option>
      <option value="LAVENDER/BLACK">LAVENDER/BLACK</option>
      <option value="LAVENDER/SALMON">LAVENDER/SALMON</option>
      <option value="LAVENDER/SAND">LAVENDER/SAND</option>
      <option value="LAVENDER/BRONZE">LAVENDER/BRONZE</option>
      <option value="LAVENDER/CORAL">LAVENDER/CORAL</option>
      <option value="LAVENDER/BURGUNDY">LAVENDER/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base ORANGE">
      <option value="ORANGE/BICOLOR">ORANGE/BICOLOR</option>
      <option value="ORANGE/BLUE">ORANGE/BLUE</option>
      <option value="ORANGE/BROWN">ORANGE/BROWN</option>
      <option value="ORANGE/CREAM">ORANGE/CREAM</option>
      <option value="ORANGE/GRAY">ORANGE/GRAY</option>
      <option value="ORANGE/GREEN">ORANGE/GREEN</option>
      <option value="ORANGE/HOT PINK">ORANGE/HOT PINK</option>
      <option value="ORANGE/LAVENDER">ORANGE/LAVENDER</option>
      <option value="ORANGE/PEACH">ORANGE/PEACH</option>
      <option value="ORANGE/PINK">ORANGE/PINK</option>
      <option value="ORANGE/RED">ORANGE/RED</option>
      <option value="ORANGE/WHITE">ORANGE/WHITE</option>
      <option value="ORANGE/YELLOW">ORANGE/YELLOW</option>
      <option value="ORANGE/PURPLE">ORANGE/PURPLE</option>
      <option value="ORANGE/BLACK">ORANGE/BLACK</option>
      <option value="ORANGE/SALMON">ORANGE/SALMON</option>
      <option value="ORANGE/SAND">ORANGE/SAND</option>
      <option value="ORANGE/BRONZE">ORANGE/BRONZE</option>
      <option value="ORANGE/CORAL">ORANGE/CORAL</option>
      <option value="ORANGE/BURGUNDY">ORANGE/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base PEACH">
      <option value="PEACH/BICOLOR">PEACH/BICOLOR</option>
      <option value="PEACH/BLUE">PEACH/BLUE</option>
      <option value="PEACH/BROWN">PEACH/BROWN</option>
      <option value="PEACH/CREAM">PEACH/CREAM</option>
      <option value="PEACH/GRAY">PEACH/GRAY</option>
      <option value="PEACH/GREEN">PEACH/GREEN</option>
      <option value="PEACH/HOT PINK">PEACH/HOT PINK</option>
      <option value="PEACH/LAVENDER">PEACH/LAVENDER</option>
      <option value="PEACH/ORANGE">PEACH/ORANGE</option>
      <option value="PEACH/PINK">PEACH/PINK</option>
      <option value="PEACH/RED">PEACH/RED</option>
      <option value="PEACH/WHITE">PEACH/WHITE</option>
      <option value="PEACH/YELLOW">PEACH/YELLOW</option>
      <option value="PEACH/PURPLE">PEACH/PURPLE</option>
      <option value="PEACH/BLACK">PEACH/BLACK</option>
      <option value="PEACH/SALMON">PEACH/SALMON</option>
      <option value="PEACH/SAND">PEACH/SAND</option>
      <option value="PEACH/BRONZE">PEACH/BRONZE</option>
      <option value="PEACH/CORAL">PEACH/CORAL</option>
      <option value="PEACH/BURGUNDY">PEACH/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base PINK">
      <option value="PINK/BICOLOR">PINK/BICOLOR</option>
      <option value="PINK/BLUE">PINK/BLUE</option>
      <option value="PINK/BROWN">PINK/BROWN</option>
      <option value="PINK/CREAM">PINK/CREAM</option>
      <option value="PINK/GRAY">PINK/GRAY</option>
      <option value="PINK/GREEN">PINK/GREEN</option>
      <option value="PINK/HOT PINK">PINK/HOT PINK</option>
      <option value="PINK/LAVENDER">PINK/LAVENDER</option>
      <option value="PINK/ORANGE">PINK/ORANGE</option>
      <option value="PINK/PEACH">PINK/PEACH</option>
      <option value="PINK/RED">PINK/RED</option>
      <option value="PINK/WHITE">PINK/WHITE</option>
      <option value="PINK/YELLOW">PINK/YELLOW</option>
      <option value="PINK/PURPLE">PINK/PURPLE</option>
      <option value="PINK/BLACK">PINK/BLACK</option>
      <option value="PINK/SALMON">PINK/SALMON</option>
      <option value="PINK/SAND">PINK/SAND</option>
      <option value="PINK/BRONZE">PINK/BRONZE</option>
      <option value="PINK/CORAL">PINK/CORAL</option>
      <option value="PINK/BURGUNDY">PINK/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base PURPLE">
      <option value="PURPLE/BICOLOR">PURPLE/BICOLOR</option>
      <option value="PURPLE/BLUE">PURPLE/BLUE</option>
      <option value="PURPLE/BROWN">PURPLE/BROWN</option>
      <option value="PURPLE/CREAM">PURPLE/CREAM</option>
      <option value="PURPLE/GRAY">PURPLE/GRAY</option>
      <option value="PURPLE/GREEN">PURPLE/GREEN</option>
      <option value="PURPLE/HOT PINK">PURPLE/HOT PINK</option>
      <option value="PURPLE/LAVENDER">PURPLE/LAVENDER</option>
      <option value="PURPLE/ORANGE">PURPLE/ORANGE</option>
      <option value="PURPLE/PEACH">PURPLE/PEACH</option>
      <option value="PURPLE/PINK">PURPLE/PINK</option>
      <option value="PURPLE/RED">PURPLE/RED</option>
      <option value="PURPLE/WHITE">PURPLE/WHITE</option>
      <option value="PURPLE/YELLOW">PURPLE/YELLOW</option>
      <option value="PURPLE/BLACK">PURPLE/BLACK</option>
      <option value="PURPLE/SALMON">PURPLE/SALMON</option>
      <option value="PURPLE/SAND">PURPLE/SAND</option>
      <option value="PURPLE/BRONZE">PURPLE/BRONZE</option>
      <option value="PURPLE/CORAL">PURPLE/CORAL</option>
      <option value="PURPLE/BURGUNDY">PURPLE/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base RED">
      <option value="RED/BICOLOR">RED/BICOLOR</option>
      <option value="RED/BLUE">RED/BLUE</option>
      <option value="RED/BROWN">RED/BROWN</option>
      <option value="RED/CREAM">RED/CREAM</option>
      <option value="RED/GRAY">RED/GRAY</option>
      <option value="RED/GREEN">RED/GREEN</option>
      <option value="RED/HOT PINK">RED/HOT PINK</option>
      <option value="RED/LAVENDER">RED/LAVENDER</option>
      <option value="RED/ORANGE">RED/ORANGE</option>
      <option value="RED/PEACH">RED/PEACH</option>
      <option value="RED/PINK">RED/PINK</option>
      <option value="RED/WHITE">RED/WHITE</option>
      <option value="RED/YELLOW">RED/YELLOW</option>
      <option value="RED/PURPLE">RED/PURPLE</option>
      <option value="RED/BLACK">RED/BLACK</option>
      <option value="RED/SALMON">RED/SALMON</option>
      <option value="RED/SAND">RED/SAND</option>
      <option value="RED/BRONZE">RED/BRONZE</option>
      <option value="RED/CORAL">RED/CORAL</option>
      <option value="RED/BURGUNDY">RED/BURGUNDY</option>
    </optgroup>
    <optgroup label="Base SALMON">
      <option value="SALMON/BICOLOR">SALMON/BICOLOR</option>
      <option value="SALMON/BLUE">SALMON/BLUE</option>
      <option value="SALMON/BROWN">SALMON/BROWN</option>
      <option value="SALMON/CREAM">SALMON/CREAM</option>
      <option value="SALMON/GRAY">SALMON/GRAY</option>
      <option value="SALMON/GREEN">SALMON/GREEN</option>
      <option value="SALMON/HOT PINK">SALMON/HOT PINK</option>
      <option value="SALMON/LAVENDER">SALMON/LAVENDER</option>
      <option value="SALMON/ORANGE">SALMON/ORANGE</option>
      <option value="SALMON/PEACH">SALMON/PEACH</option>
      <option value="SALMON/PINK">SALMON/PINK</option>
      <option value="SALMON/RED">SALMON/RED</option>
      <option value="SALMON/WHITE">SALMON/WHITE</option>
      <option value="SALMON/YELLOW">SALMON/YELLOW</option>
      <option value="SALMON/PURPLE">SALMON/PURPLE</option>
      <option value="SALMON/BLACK">SALMON/BLACK</option>
      <option value="SALMON/SAND">SALMON/SAND</option>
      <option value="SALMON/BRONZE">SALMON/BRONZE</option>
      <option value="SALMON/CORAL">SALMON/CORAL</option>
      <option value="SALMON/BURGUNDY">SALMON/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base SAND">
      <option value="SAND/BICOLOR">SAND/BICOLOR</option>
      <option value="SAND/BLUE">SAND/BLUE</option>
      <option value="SAND/BROWN">SAND/BROWN</option>
      <option value="SAND/CREAM">SAND/CREAM</option>
      <option value="SAND/GRAY">SAND/GRAY</option>
      <option value="SAND/GREEN">SAND/GREEN</option>
      <option value="SAND/HOT PINK">SAND/HOT PINK</option>
      <option value="SAND/LAVENDER">SAND/LAVENDER</option>
      <option value="SAND/ORANGE">SAND/ORANGE</option>
      <option value="SAND/PEACH">SAND/PEACH</option>
      <option value="SAND/PINK">SAND/PINK</option>
      <option value="SAND/RED">SAND/RED</option>
      <option value="SAND/WHITE">SAND/WHITE</option>
      <option value="SAND/YELLOW">SAND/YELLOW</option>
      <option value="SAND/PURPLE">SAND/PURPLE</option>
      <option value="SAND/BLACK">SAND/BLACK</option>
      <option value="SAND/SALMON">SAND/SALMON</option>
      <option value="SAND/BRONZE">SAND/BRONZE</option>
      <option value="SAND/CORAL">SAND/CORAL</option>
      <option value="SAND/BURGUNDY">SAND/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base WHITE">
      <option value="WHITE/BICOLOR">WHITE/BICOLOR</option>
      <option value="WHITE/BLUE">WHITE/BLUE</option>
      <option value="WHITE/BROWN">WHITE/BROWN</option>
      <option value="WHITE/CREAM">WHITE/CREAM</option>
      <option value="WHITE/GRAY">WHITE/GRAY</option>
      <option value="WHITE/GREEN">WHITE/GREEN</option>
      <option value="WHITE/HOT PINK">WHITE/HOT PINK</option>
      <option value="WHITE/LAVENDER">WHITE/LAVENDER</option>
      <option value="WHITE/ORANGE">WHITE/ORANGE</option>
      <option value="WHITE/PEACH">WHITE/PEACH</option>
      <option value="WHITE/PINK">WHITE/PINK</option>
      <option value="WHITE/RED">WHITE/RED</option>
      <option value="WHITE/YELLOW">WHITE/YELLOW</option>
      <option value="WHITE/PURPLE">WHITE/PURPLE</option>
      <option value="WHITE/BLACK">WHITE/BLACK</option>
      <option value="WHITE/SALMON">WHITE/SALMON</option>
      <option value="WHITE/SAND">WHITE/SAND</option>
      <option value="WHITE/BRONZE">WHITE/BRONZE</option>
      <option value="WHITE/CORAL">WHITE/CORAL</option>
      <option value="WHITE/BURGUNDY">WHITE/BURGUNDY</option>
    </optgroup>

    <optgroup label="Base YELLOW">
      <option value="YELLOW/BICOLOR">YELLOW/BICOLOR</option>
      <option value="YELLOW/BLUE">YELLOW/BLUE</option>
      <option value="YELLOW/BROWN">YELLOW/BROWN</option>
      <option value="YELLOW/CREAM">YELLOW/CREAM</option>
      <option value="YELLOW/GRAY">YELLOW/GRAY</option>
      <option value="YELLOW/GREEN">YELLOW/GREEN</option>
      <option value="YELLOW/HOT PINK">YELLOW/HOT PINK</option>
      <option value="YELLOW/LAVENDER">YELLOW/LAVENDER</option>
      <option value="YELLOW/ORANGE">YELLOW/ORANGE</option>
      <option value="YELLOW/PEACH">YELLOW/PEACH</option>
      <option value="YELLOW/PINK">YELLOW/PINK</option>
      <option value="YELLOW/RED">YELLOW/RED</option>
      <option value="YELLOW/WHITE">YELLOW/WHITE</option>
      <option value="YELLOW/PURPLE">YELLOW/PURPLE</option>
      <option value="YELLOW/BLACK">YELLOW/BLACK</option>
      <option value="YELLOW/SALMON">YELLOW/SALMON</option>
      <option value="YELLOW/SAND">YELLOW/SAND</option>
      <option value="YELLOW/BRONZE">YELLOW/BRONZE</option>
      <option value="YELLOW/CORAL">YELLOW/CORAL</option>
      <option value="YELLOW/BURGUNDY">YELLOW/BURGUNDY</option>
    </optgroup>
  </select>
</div>


                    {/* SEGUNDA FILA: MEDIDAS DE LONGITUD Y OBSERVACIÓN */}
                    {/* Selector LONG1 (Ocupa 2 de 12 columnas) */}
                    <div style={{ gridColumn: 'span 2' }}> 
                      <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '6px', color: '#475569' }}>LONG1 (CM)</label> 
                      <select 
                        value={longitud1} 
                        onChange={(e) => setLongitud1(e.target.value)} 
                        required 
                        style={{ 
                          width: '100%', padding: '11px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                          boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' 
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#7a9b17'}
                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                      > 
                        <option value="">Sel...</option> 
                        {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => ( 
                          <option key={num} value={String(num)}>{num} cm</option>
                        ))} 
                      </select> 
                    </div>

                    {/* Selector LONG2 (Ocupa 2 de 12 columnas) */}
                    <div style={{ gridColumn: 'span 2' }}> 
                      <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '6px', color: '#475569' }}>LONG2 (CM)</label> 
                      <select 
                        value={longitud2} 
                        onChange={(e) => setLongitud2(e.target.value)} 
                        style={{ 
                          width: '100%', padding: '11px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                          boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' 
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#7a9b17'}
                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                      > 
                        <option value="">Sel...</option> 
                        {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => ( 
                          <option key={num} value={String(num)}>{num} cm</option>
                        ))} 
                      </select> 
                    </div>

                    {/* Selector LONG3 (Ocupa 2 de 12 columnas) */}
                    <div style={{ gridColumn: 'span 2' }}> 
                      <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '6px', color: '#475569' }}>LONG3 (CM)</label> 
                      <select 
                        value={longitud3} 
                        onChange={(e) => setLongitud3(e.target.value)} 
                        style={{ 
                          width: '100%', padding: '11px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                          boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' 
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#7a9b17'}
                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                      > 
                        <option value="">Sel...</option> 
                        {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => ( 
                          <option key={num} value={String(num)}>{num} cm</option>
                        ))} 
                      </select> 
                    </div>

                {/* Selector TIPO (Ocupa 2 de 12 columnas) */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '6px', color: '#475569' }}>
                          TIPO:
                        </label>
                       <select
                        value={tipoReceta}
                        onChange={(e) => setTipoReceta(e.target.value ? Number(e.target.value) : '')}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          boxSizing: 'border-box',
                          backgroundColor: '#ffffff',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#7a9b17'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
                      >
                        <option value="">Seleccione...</option>
                        <option value={1}>Creación</option>
                        <option value={2}>Edición</option>
</select>

                      </div>

                      {/* Campo OBSERVACIÓN (Ajustado a span 4 para cuadrar las 12 columnas) */}
                      <div style={{ gridColumn: 'span 4' }}>
                        <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '6px', color: '#475569' }}>
                          OBSERVACIONES DE PRODUCCIÓN:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Algún detalle o especificación del armado"
                          value={observacion}
                          onChange={(e) => setObservacion(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            boxSizing: 'border-box',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: '#f8fafc',
                            transition: 'all 0.2s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#7a9b17';
                            e.target.style.backgroundColor = '#ffffff';
                            e.target.style.boxShadow = '0 0 0 3px rgba(122,155,23,0.15)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#cbd5e1';
                            e.target.style.backgroundColor = '#f8fafc';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>


                  </div>



          <div style={{ marginBottom: '25px', backgroundColor: '#f9f9f9', padding: '12px 15px', borderRadius: '6px', borderLeft: '5px solid #7a9b17ff' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '2px' }}>VISTA PREVIA EN TIEMPO REAL:</span>
            <span style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'monospace', color: '#333' }}>{construirNombreBouquet() || '(Complete los datos para generar)'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ color: '#7a9b17ff', margin: 0 }}>Componentes de la Fórmula</h4>
            <button type="button" onClick={() => setMostrarModal(true)} style={{ backgroundColor: '#7a9b17ff', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🔍 Buscar Flores</button>
          </div>

          {nuevosComponentes.length === 0 ? <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', margin: '20px 0' }}>No hay componentes seleccionados.</p> : (
            nuevosComponentes.map((comp, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '6px 12px', borderRadius: '6px', border: '1px solid #eee' }}>
                <span style={{ flex: 3, fontSize: '14px', fontWeight: '500' }}>{comp.varietyCompound}</span>
                <input type="number" placeholder="Tallos" min="1" value={comp.TALLOS} onChange={(e) => handleTallosChange(idx, e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
                <button type="button" onClick={() => eliminarComponente(idx)} style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
              </div>
            ))
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #ddd', paddingTop: '15px', marginTop: '20px', alignItems: 'center' }}>
            {modoEdicion && <button type="button" onClick={cancelarEdicion} style={{ backgroundColor: '#aaa', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar Edición</button>}
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginLeft: 'auto', color: '#444' }}>Total Proyectado: <span style={{ color: '#7a9b17ff', fontSize: '18px' }}>{totalTallosFormulario} tallos</span></div>
          </div>
          <button type="submit" style={{ width: '100%', backgroundColor: '#92b91c', color: '#fff', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}>{modoEdicion ? '💾 Guardar Cambios Realizados' : '💾 Guardar Composición Completa'}</button>
        </form>
      )}


{/* PESTAÑA CREADOS (ESTADO 4) */}
{pestanaActiva === 'creados' && ( 
  <div> 
    <input 
      type="text" 
      placeholder="Filtrar creados..." 
      value={busqueda} 
      onChange={(e) => setBusqueda(e.target.value)} 
      style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #7a9b17', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }} 
    /> 
    
    {/* 🟥 Cambiado el filtro a String para evitar conflictos de tipo number/string */}
    {historialFiltrado.filter(i => String(i.estado) === '4').length === 0 ? (
      <p style={{ fontStyle: 'italic', color: '#888', textAlign: 'center' }}>No hay recetas en la sección de Creados.</p> 
    ) : ( 
      historialFiltrado.filter(i => String(i.estado) === '4').map((item, idx) => { 
        const esAbierto = bouquetAbierto === item.id; 
        return ( 
          <div key={idx} style={{ marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', overflow: 'hidden' }}> 
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: esAbierto ? '#edf4db' : '#fff' }}>
              
              <div onClick={() => setBouquetAbierto(esAbierto ? null : item.id)} style={{ cursor: 'pointer', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>
                    {item.nombre}
                  </span>
                  {renderBadgeTipo(item.tipo)}
                </div>

                <span style={{ fontSize: '12px', color: '#666' }}>Fórmula: {item.totalTallos} tallos</span>
                <span style={{ fontSize: '12px', color: '#525252' }}> - Longitudes {item.longitud_1} {item.longitud_2} {item.longitud_3} CM</span>
                <span style={{ fontSize: '12px', color: '#908f35' }}> - Fecha creación {item.fecha_creacion}</span>
              </div>

              
              <div style={{ display: 'flex', gap: '6px' }}> 
              {/* Botón: Editar */}
                    <button 
                      type="button" 
                      onClick={() => iniciarEdicion(item)} 
                      disabled={!(user.idperfil === 1)} // 🟥 Bloquea la acción si no es perfil 1
                      style={{ 
                        backgroundColor: (user.idperfil === 1) ? '#3c179b' : '#e0e0e0', // 🟥 Cambia a gris si está desactivado
                        color: '#fff', 
                        border: 'none', 
                        padding: '6px 10px', 
                        borderRadius: '4px', 
                        fontWeight: 'bold', 
                        cursor: (user.idperfil === 1) ? 'pointer' : 'not-allowed', // 🟥 Cambia el cursor
                        fontSize: '11px',
                        opacity: (user.idperfil === 1) ? 1 : 0.6 // 🟥 Baja la opacidad
                      }}
                    >
                      Editar
                    </button> 

                    {/* Botón: A Sistemas */}
                    <button 
                      type="button" 
                      onClick={() => cambiarEstadoBouquet(item.id, 2)} 
                      disabled={!(user.idperfil === 1)} // 🟥 Bloquea la acción si no es perfil 1
                      style={{ 
                        backgroundColor: (user.idperfil === 1) ? '#2b6cb0' : '#e0e0e0', // 🟥 Cambia a gris si está desactivado
                        color: '#fff', 
                        border: 'none', 
                        padding: '6px 10px', 
                        borderRadius: '4px', 
                        fontWeight: 'bold', 
                        cursor: (user.idperfil === 1) ? 'pointer' : 'not-allowed', // 🟥 Cambia el cursor
                        fontSize: '11px',
                        opacity: (user.idperfil === 1) ? 1 : 0.6 // 🟥 Baja la opacidad
                      }}
                    >
                      A Sistemas
                    </button> 

                    {/* Botón: Anular */}
                    <button 
                      type="button" 
                      onClick={() => cambiarEstadoBouquet(item.id, 3)} 
                      disabled={!(user.idperfil === 1)} // 🟥 Bloquea la acción si no es perfil 1
                      style={{ 
                        backgroundColor: (user.idperfil === 1) ? '#e53e3e' : '#e0e0e0', // 🟥 Cambia a gris si está desactivado
                        color: '#fff', 
                        border: 'none', 
                        padding: '6px 10px', 
                        borderRadius: '4px', 
                        fontWeight: 'bold', 
                        cursor: (user.idperfil === 1) ? 'pointer' : 'not-allowed', // 🟥 Cambia el cursor
                        fontSize: '11px',
                        opacity: (user.idperfil === 1) ? 1 : 0.6 // 🟥 Baja la opacidad
                      }}
                    >
                      Anular
                    </button>

              </div> 
              
            </div> 
            
            {esAbierto && ( 
              <div style={{ backgroundColor: '#fafafa', padding: '15px', borderTop: '1px solid #ddd' }}> 
                <table style={{ width: '100%', borderCollapse: 'collapse' }}> 
                  <tbody>
                    {item.receta.map((c, sIdx) => (
                      <tr key={sIdx} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}>
                        <td style={{ padding: '8px 5px' }}>{c.varietyCompound}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '8px 5px' }}>{c.TALLOS}</td>
                      </tr>
                    ))}
                  </tbody> 
                </table> 
              </div> 
            )} 
          </div> 
        ); 
      }) 
    )} 
  </div> 
)}




      {/* PESTAÑAS DE HISTORIAL DE DATOS */}
      {pestanaActiva === 'aprobados' && (
        <div>
          <input type="text" placeholder="🔍 Filtrar aprobados..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #92b91c', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }} />
          {historialFiltrado.filter(i => i.estado === 1).length === 0 ? <p style={{ fontStyle: 'italic', color: '#888', textAlign: 'center' }}>No hay recetas pendientes en BQT.</p> : (
            historialFiltrado.filter(i => i.estado === 1).map((item, idx) => {
              const esAbierto = bouquetAbierto === item.id;
              return (
                <div key={idx} style={{ marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: esAbierto ? '#edf4db' : '#fff' }}>
                   <div onClick={() => setBouquetAbierto(esAbierto ? null : item.id)} style={{ cursor: 'pointer', flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: '#333' }}>
                              {item.nombre}
                            </span>
                            {renderBadgeTipo(item.tipo)}
                          </div>
                          <span style={{ fontSize: '12px', color: '#666' }}>Fórmula: {item.totalTallos} tallos</span>
                          <span style={{ fontSize: '12px', color: '#525252' }}> - Longitudes {item.longitud_1} {item.longitud_2} {item.longitud_3} CM</span>
                          <span style={{ fontSize: '12px', color: '#908f35' }}> - Fecha creación {item.fecha_creacion}</span>
                        </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => iniciarEdicion(item)} style={{ backgroundColor: '#3c179bff', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>✏️ Editar</button>
                      <button type="button" onClick={() => cambiarEstadoBouquet(item.id, 2)} style={{ backgroundColor: '#688512ff', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>📦 Aprobar</button>
                      <button type="button" onClick={() => cambiarEstadoBouquet(item.id, 3)} style={{ backgroundColor: '#e53e3e', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>🗑️ Anular</button>
                    </div>
                  </div>
                  {esAbierto && (
                    <div style={{ backgroundColor: '#fafafa', padding: '15px', borderTop: '1px solid #ddd' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>{item.receta.map((c, sIdx) => (<tr key={sIdx} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}><td style={{ padding: '8px 5px' }}>{c.varietyCompound}</td><td style={{ textAlign: 'right', fontWeight: 'bold', padding: '8px 5px' }}>{c.TALLOS}</td></tr>))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

  {pestanaActiva === 'dartis' && ( 
  <div> 
    <input 
      type="text" 
      placeholder="Filtrar migrados..." 
      value={busqueda} 
      onChange={(e) => setBusqueda(e.target.value)} 
      style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #2b6cb0', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }} 
    /> 
    
    {historialFiltrado.filter(i => i.estado === 2).length === 0 ? (
      <p style={{ fontStyle: 'italic', color: '#888', textAlign: 'center' }}>Ninguna receta migrada en esta sección.</p> 
    ) : ( 
      historialFiltrado.filter(i => i.estado === 2).map((item, idx) => { 
        const esAbierto = bouquetAbierto === item.id; 
        return ( 
          <div key={idx} style={{ marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', overflow: 'hidden' }}> 
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: esAbierto ? '#ebf8ff' : '#fff' }}>
              
             <div onClick={() => setBouquetAbierto(esAbierto ? null : item.id)} style={{ cursor: 'pointer', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', color: '#333' }}>
                  {item.nombre}
                </span>
                {renderBadgeTipo(item.tipo)}
              </div>
              <span style={{ fontSize: '12px', color: '#666' }}>Fórmula: {item.totalTallos} tallos</span>
              <span style={{ fontSize: '12px', color: '#525252' }}> - Longitudes {item.longitud_1} {item.longitud_2} {item.longitud_3} CM</span>
              <span style={{ fontSize: '12px', color: '#908f35' }}> - Fecha creación {item.fecha_creacion}</span>
            </div>

              
              <div style={{ display: 'flex', gap: '6px' }}> 
                
                {/* 🟢 NUEVO BOTÓN: Creado (Cambia el estado a 4) */}
               <button 
                type="button" 
                onClick={() => cambiarEstadoBouquet(item.id, 4)} 
                disabled={!(user.idperfil === 1)} // 🟥 Bloquea físicamente la acción si no es administrador
                style={{ 
                  backgroundColor: (user.idperfil === 1) ? '#7a9b17' : '#e0e0e0', // 🟥 Cambia a gris si está desactivado
                  color: '#fff', 
                  border: 'none', 
                  padding: '6px 10px', 
                  borderRadius: '4px', 
                  fontWeight: 'bold', 
                  cursor: (user.idperfil === 1) ? 'pointer' : 'not-allowed', // 🟥 Cambia el cursor según el permiso
                  fontSize: '11px',
                  opacity: (user.idperfil === 1) ? 1 : 0.6 // 🟥 Baja la opacidad para denotar el bloqueo
                }}
              >
                🟢 Creado
              </button>


                {/* Botón existente: A BQT */}
                <button 
                  type="button" 
                  onClick={() => cambiarEstadoBouquet(item.id, 1)} 
                  disabled={!(user.idperfil === 1)} 
                  style={{ 
                    backgroundColor: (user.idperfil === 1) ? '#4a5568' : '#e0e0e0', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '6px 10px', 
                    borderRadius: '4px', 
                    fontWeight: 'bold', 
                    cursor: (user.idperfil === 1) ? 'pointer' : 'not-allowed', 
                    fontSize: '11px', 
                    opacity: (user.idperfil === 1) ? 1 : 0.6 
                  }}
                > 
                  DEVOLVER A BQT 
                </button> 

                {/* Botón existente: Anular */}
                <button 
                  type="button" 
                  onClick={() => cambiarEstadoBouquet(item.id, 3)} 
                  disabled={!(user.idperfil === 1)} 
                  style={{ 
                    backgroundColor: (user.idperfil === 1) ? '#e53e3e' : '#e0e0e0', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '6px 10px', 
                    borderRadius: '4px', 
                    fontWeight: 'bold', 
                    cursor: (user.idperfil === 1) ? 'pointer' : 'not-allowed', 
                    fontSize: '11px', 
                    opacity: (user.idperfil === 1) ? 1 : 0.6 
                  }}
                > 
                  Anular 
                </button> 
                
              </div> 
            </div> 
            
            {esAbierto && ( 
              <div style={{ backgroundColor: '#fafafa', padding: '15px', borderTop: '1px solid #ddd' }}> 
                <table style={{ width: '100%', borderCollapse: 'collapse' }}> 
                  <tbody>
                    {item.receta.map((c, sIdx) => (
                      <tr key={sIdx} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}>
                        <td style={{ padding: '8px 5px' }}>{c.varietyCompound}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '8px 5px' }}>{c.TALLOS}</td>
                      </tr>
                    ))}
                  </tbody> 
                </table> 
              </div> 
            )} 
          </div> 
        ); 
      }) 
    )} 
  </div> 
)}


      {pestanaActiva === 'anulados' && (
        <div>
          <input type="text" placeholder="🔍 Filtrar anulados..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #e53e3e', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }} />
          {historialFiltrado.filter(i => i.estado === 3).length === 0 ? <p style={{ fontStyle: 'italic', color: '#888', textAlign: 'center' }}>No hay registros anulados.</p> : (
            historialFiltrado.filter(i => i.estado === 3).map((item, idx) => {
              const esAbierto = bouquetAbierto === item.id;
             return (
                      <div key={idx} style={{ marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', overflow: 'hidden', opacity: 0.8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#fff5f5' }}>
                          <div onClick={() => setBouquetAbierto(esAbierto ? null : item.id)} style={{ cursor: 'pointer', flex: 1 }}>
                            <span style={{ fontWeight: 'bold', display: 'block', color: '#c53030', textDecoration: 'line-through' }}>{item.nombre}</span>
                            <span style={{ fontSize: '12px', color: '#666' }}>Fórmula: {item.totalTallos} tallos</span>
                            <span style={{ fontSize: '12px', color: '#525252ff' }}> - Longitudes {item.longitud_1}  {item.longitud_2}  {item.longitud_3} CM</span>
                    <span style={{ fontSize: '12px', color: '#908f35ff' }}> - Fecha creación {item.fecha_creacion}</span>
                          </div>
                          
                          {/* Botón Reactivar con control de permisos */}
                          <button 
                            type="button" 
                            onClick={() => cambiarEstadoBouquet(item.id, 1)} 
                            disabled={!(user.idperfil === 1 )}
                            style={{ 
                              backgroundColor: (user.idperfil === 1 || user.idperfil === 10026) ? '#4a5568' : '#e0e0e0', 
                              color: '#fff', 
                              border: 'none', 
                              padding: '8px 12px', 
                              borderRadius: '4px', 
                              fontWeight: 'bold', 
                              cursor: (user.idperfil === 1 ) ? 'pointer' : 'not-allowed', 
                              fontSize: '11px',
                              opacity: (user.idperfil === 1 ) ? 1 : 0.6
                            }}
                          >
                            🔄 Reactivar
                          </button>
                        </div>
                        
                        {esAbierto && (
                          <div style={{ backgroundColor: '#fafafa', padding: '15px', borderTop: '1px solid #ddd' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <tbody>
                                {item.receta.map((c, sIdx) => (
                                  <tr key={sIdx} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}>
                                    <td style={{ padding: '8px 5px' }}>{c.varietyCompound}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '8px 5px' }}>{c.TALLOS}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );

            })
          )}
        </div>
      )}

      {/* MODAL SELECTOR FLOTANTE */}
      {mostrarModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '500px', borderRadius: '8px', padding: '20px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: '#7a9b17ff', margin: '0 0 15px 0' }}>Buscador y Selector de Flores</h3>
            <input type="text" placeholder="Filtrar..." value={busquedaFlor} onChange={(e) => setBusquedaFlor(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', border: '2px solid #7a9b17ff', borderRadius: '4px', outline: 'none' }} />
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ddd', padding: '10px', marginBottom: '15px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
              {catalogoFiltrado.map((flor, fIdx) => (
                <label key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 5px', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!floresSeleccionadasTemporales[flor.varietyCompound]} onChange={() => toggleSeleccionTemporal(flor.varietyCompound)} />
                  <span style={{ fontSize: '13px', color: '#333' }}>{flor.varietyCompound}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setMostrarModal(false); setFloresSeleccionadasTemporales({}); }} style={{ backgroundColor: '#999', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px' }}>Cancelar</button>
              <button type="button" onClick={confirmarAgregarFlores} style={{ backgroundColor: '#92b91c', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px' }}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recetas;
