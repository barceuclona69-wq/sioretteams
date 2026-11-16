import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config'; 

function Devolucion() { 
  // Función para obtener la fecha de hoy en formato YYYY-MM-DD 
  const obtenerFechaActual = () => { 
    const hoy = new Date(); 
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`; 
  }; 

  // Estado para guardar el ID de usuario de LocalStorage 
  const [userId] = useState(() => { 
    const savedUser = localStorage.getItem("userData"); 
    return savedUser ? JSON.parse(savedUser).id : null; 
  }); 

  // Estados de control de filtros de fecha y datos de tags devueltos 
  const [fechaDesde, setFechaDesde] = useState(obtenerFechaActual()); 
  const [fechaHasta, setFechaHasta] = useState(obtenerFechaActual()); 
  const [tagsDevueltos, setTagsDevueltos] = useState([]); 
  const [cargandoTags, setCargandoTags] = useState(false); 
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null); 
 
  // Estados independientes para el Reporte de la API /info 
  const [datosReporte, setDatosReporte] = useState([]); 
  const [cargandoReporte, setCargandoReporte] = useState(false); 
  
  // Estados de control para Notificaciones flotantes y Modales Touch de confirmación 
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'success' }); 
  const [confirmarTouch, setConfirmarTouch] = useState({ abierto: false, mensaje: '', accion: null }); 
  // EFECTO DE AUTO-REFRESCO AUTOMÁTICO CADA 5 SEGUNDOS 
  useEffect(() => {
    obtenerConsultaDevueltosTags(); 
    obtenerInfoReporte(); 
    const intervaloRefresco = setInterval(() => { 
      obtenerConsultaDevueltosTags(); 
      obtenerInfoReporte(); 
    }, 5000); 
    return () => clearInterval(intervaloRefresco); 
  }, [fechaDesde, fechaHasta]); 

  const lanzarNotificacion = (mensaje, tipo = 'success') => { 
    setNotificacion({ visible: true, mensaje, tipo }); 
    setTimeout(() => { 
      setNotificacion({ visible: false, mensaje: '', tipo: 'success' }); 
    }, 2000); 
  }; 

  const solicitarConfirmacion = (mensaje, accion) => { 
    setConfirmarTouch({ abierto: true, mensaje, accion }); 
  }; 

  // Petición de tags devueltos para el panel táctil 
  const obtenerConsultaDevueltosTags = () => { 
    setCargandoTags(true); 
    fetch(`${API_BASE_URL}/api/DARTIS/consultadevueltostags?desde=${fechaDesde}&hasta=${fechaHasta}`) 
      .then(res => res.json()) 
      .then(data => setTagsDevueltos(data && data.error ? [] : (Array.isArray(data) ? data : []))) 
      .catch(err => { console.error(err); setTagsDevueltos([]); })
      .finally(() => setCargandoTags(false)); 
  }; 

  // Petición del Reporte General 
  const obtenerInfoReporte = () => { 
    setCargandoReporte(true); 
    fetch(`${API_BASE_URL}/api/DARTIS/aavancestags?desde=${fechaDesde}&hasta=${fechaHasta}`) 
      .then(res => res.json()) 
      .then(data => setDatosReporte(data && data.error ? [] : (Array.isArray(data) ? data : []))) 
      .catch(err => { 
        console.error("Error en API info:", err); 
        setDatosReporte([]); 
      }) 
      .finally(() => setCargandoReporte(false)); 
  }; 

  // Acción para remover un elemento procesado 
  const ejecutarQuitarDeLista = (idTransaccion) => { 
    fetch(`${API_BASE_URL}/api/RFID/quitar_devuelto_tag`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id_transaccion: idTransaccion }) 
    }) 
    .then(res => res.json()) 
    .then(data => { 
      if (data.error) { 
        lanzarNotificacion(`${data.error}`, 'error'); 
      } else { 
        lanzarNotificacion(data.message || 'Tag quitado de la lista correctamente.', 'success'); 
        obtenerConsultaDevueltosTags(); 
        setRegistroSeleccionado(null); 
      } 
    }) 
    .catch(() => lanzarNotificacion('Error con el servidor al intentar quitar el tag', 'error')); 
  }; 
  // --- CÁLCULO DE MÉTRICAS GENERALES PARA KPIs --- 
  const totalAsignadoGlobal = datosReporte.reduce((acc, curr) => acc + (Number(curr.Cantidad_Asignada) || 0), 0); 
  const totalListoGlobal = datosReporte.reduce((acc, curr) => acc + (Number(curr.Listo) || 0), 0); 
  const avanceGlobalPromedio = datosReporte.length > 0 
    ? Math.round(datosReporte.reduce((acc, curr) => acc + (Number(curr.Porcentaje_Avance) || 0), 0) / datosReporte.length) 
    : 0; 

  // --- LÓGICA AGREGADA: GENERACIÓN DEL TOP 10 DINÁMICO --- 
  const top10Empleados = [...datosReporte] 
    .sort((a, b) => (Number(b.Porcentaje_Avance) || 0) - (Number(a.Porcentaje_Avance) || 0)) 
    .slice(0, 10); 

  // --- CONFIGURACIÓN DE APARIENCIA PROFESIONAL (THEMING) --- 
  const theme = { 
    primary: '#1e3a24', 
    primaryLight: '#eef5f0', 
    accent: '#16a34a', 
    textMain: '#1f2937', 
    textMuted: '#6b7280', 
    border: '#e5e7eb', 
    bgBody: '#f8fafc', 
    cardBg: '#ffffff'
  }; 

  const cardStyle = { 
    backgroundColor: theme.cardBg, 
    padding: '24px', 
    borderRadius: '16px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)', 
    border: `1px solid ${theme.border}` 
  }; 

  return ( 
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: theme.bgBody, color: theme.textMain }}> 
 
      {/* FILTROS SUPERIORES */} 
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backgroundColor: theme.cardBg, borderBottom: `1px solid ${theme.border}` }}> 
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}> 
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> 
            <label style={{ fontWeight: '600', color: theme.primary, fontSize: '14px' }}>Desde:</label> 
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '8px', outline: 'none' }} /> 
          </div> 
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> 
            <label style={{ fontWeight: '600', color: theme.primary, fontSize: '14px' }}>Hasta:</label> 
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '8px', outline: 'none' }} /> 
          </div> 
          {cargandoReporte && <span style={{ fontSize: '13px', color: theme.textMuted }}>Sincronizando datos...</span>} 
        </div> 
      </div> 

      {/* CUERPO CENTRAL DEL DASHBOARD */} 
      <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}> 
 
        {/* BLOQUES KPI ANALÍTICOS */} 
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}> 
          <div style={{ ...cardStyle, padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}> 
            <span style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '500' }}>Total Asignado</span> 
            <span style={{ fontSize: '28px', fontWeight: '700', color: theme.primary }}>{totalAsignadoGlobal} Bouquets</span> 
          </div> 
          <div style={{ ...cardStyle, padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}> 
            <span style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '500' }}>Total Completados</span> 
            <span style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>{totalListoGlobal} Bouquets</span> 
          </div> 
          <div style={{ ...cardStyle, padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}> 
            <span style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '500' }}>Rendimiento Promedio</span> 
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}> 
              <span style={{ fontSize: '28px', fontWeight: '700', color: theme.primary }}>{avanceGlobalPromedio}%</span> 
              <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '999px', height: '8px', overflow: 'hidden' }}> 
                <div style={{ backgroundColor: theme.primary, width: `${avanceGlobalPromedio}%`, height: '100%' }}></div> 
              </div> 
            </div> 
          </div> 
        </div> 
        {/* FILA 1: TABLA GENERAL + PANEL TÁCTIL LADO A LADO */} 
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}> 
          {/* TABLA PRINCIPAL DE REGISTROS */} 
          <div style={{ flex: '2', ...cardStyle, display: 'flex', flexDirection: 'column', height: '550px' }}> 
            <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: '16px', marginBottom: '16px' }}> 
              <h3 style={{ margin: 0, color: theme.primary, fontWeight: '700', fontSize: '18px' }}>Reporte General de Operaciones</h3> 
            </div> 
            <div style={{ flex: 1, overflowY: 'auto', borderRadius: '12px', border: `1px solid ${theme.border}` }}> 
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}> 
                <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 1, borderBottom: `1px solid ${theme.border}` }}> 
                  <tr> 
                    {["MESA", "Producto", "Empleado", "Máquina", "Pend.", "Listo", "Dev.", "Anul.", "Total Asig.", "Avance %"].map((th, i) => ( 
                      <th key={i} style={{ padding: '14px 16px', fontWeight: '600', color: theme.textMuted }}>{th}</th> 
                    ))} 
                  </tr> 
                </thead> 
                <tbody> 
                  {datosReporte.length === 0 ? ( 
                    <tr> 
                      <td colSpan="10" style={{ padding: '32px', textAlign: 'center', color: theme.textMuted }}>No hay registros de rendimiento en este rango de fechas.</td> 
                    </tr> 
                  ) : ( 
                    datosReporte.map((item, index) => ( 
                      <tr key={index} style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}> 
                        <td style={{ padding: '14px 16px' }}> 
                          <span style={{ backgroundColor: theme.primaryLight, color: theme.primary, padding: '4px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>{item.mesa || 'N/A'}</span> 
                        </td> 
                        <td style={{ padding: '14px 16px', fontWeight: '500' }}>{item.nombre_producto}</td> 
                        <td style={{ padding: '14px 16px' }}>{item.nombre_empleado}</td> 
                        <td style={{ padding: '14px 16px', color: theme.textMuted }}>{item.id_maquina ? `MÁQ-${item.id_maquina}` : '-'}</td> 
                        <td style={{ padding: '14px 16px', color: '#ea580c', fontWeight: '600' }}>{item.Pendiente}</td> 
                        <td style={{ padding: '14px 16px', color: '#16a34a', fontWeight: '600' }}>{item.Listo}</td> 
                        <td style={{ padding: '14px 16px', color: '#dc2626', fontWeight: '600' }}>{item.Devuelto}</td> 
                        <td style={{ padding: '14px 16px', color: '#4b5563', fontWeight: '600' }}>{item.Anulado}</td> 
                        <td style={{ padding: '14px 16px', fontWeight: '700' }}>{item.Cantidad_Asignada}</td> 
                        <td style={{ padding: '14px 16px' }}> 
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> 
                            <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '999px', height: '6px', minWidth: '60px', overflow: 'hidden' }}> 
                              <div style={{ backgroundColor: '#16a34a', width: `${item.Porcentaje_Avance}%`, height: '100%' }}></div> 
                            </div> 
                            <span style={{ fontWeight: '700', color: '#16a34a' }}>{item.Porcentaje_Avance}%</span> 
                          </div> 
                        </td> 
                      </tr> 
                    )) 
                  )} 
                </tbody> 
              </table> 
            </div> 
          </div> 
                   {/* PANEL TÁCTIL DE DEVOLUCIONES UBICADO A LA DERECHA */}
          <div style={{ flex: '2.5', ...cardStyle, display: 'flex', flexDirection: 'column', height: '550px', padding: '0px', overflow: 'hidden' }}> 
            <div style={{ padding: '16px 24px', backgroundColor: '#2e5a36', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> 
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>PANEL TÁCTIL DE DEVOLUCIONES</h2>
              {cargandoTags && <span style={{ fontSize: '12px', color: '#e2f0d9' }}>Actualizando...</span>} 
            </div> 
            
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', backgroundColor: '#f7faf8' }}> 
              {/* COLUMNA IZQUIERDA DEL PANEL: EN 3 COLUMNAS PERFECTAS CON SCROLL VERTICAL */} 
              <div 
                style={{ 
                  flex: 1.5, 
                  padding: '16px', 
                  overflowX: 'hidden', 
                  overflowY: 'auto', 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '12px', 
                  alignContent: 'start',
                  borderRight: '1px solid #e1e9e3'
                }}
              > 
                {tagsDevueltos.map((item, idx) => { 
                  const sel = registroSeleccionado?.id === item.id; 
                  return ( 
                    <button key={idx} type="button" onClick={() => setRegistroSeleccionado(item)} style={{ textAlign: 'left', padding: '10px', borderRadius: '12px', border: sel ? '3px solid #2e7d32' : '1px solid #cedcd0', backgroundColor: sel ? '#f1f9f2' : '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#5b7560' }}>ID: {item.id}</span>
                        <span style={{ backgroundColor: '#e8ede9', color: '#2f4f35', fontSize: '11px', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>{item.id_maquina ? `MÁQ-${item.id_maquina}` : 'S/M'}</span>
                      </div> 
                      <div style={{ backgroundColor: sel ? 'rgba(194, 221, 43, 1)' : '#e2f0d9', border: '1px solid #b7d7a8', borderRadius: '8px', padding: '6px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '18px', fontWeight: '900', color: '#3b6025' }}>{item.mesa || 'N/A'}</span>
                      </div> 
                      <span style={{ fontSize: '12px', color: '#5a483d', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre_producto || 'Sin Producto'}</span> 
                    </button> 
                  ); 
                })} 
              </div> 

              {/* COLUMNA DERECHA DEL PANEL: DETALLES */} 
              <div style={{ flex: 1, minWidth: '220px', padding: '16px', backgroundColor: '#ffffff', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}> 
                {registroSeleccionado ? ( 
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}> 
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#2f4f35', borderBottom: '2px solid #f1f6f2', paddingBottom: '6px', fontWeight: '700' }}>Detalles</h3> 
                    {[ 
                      { label: 'CÓDIGO RFID', val: registroSeleccionado.id_codigo_barra, mono: true }, 
                      { label: 'PRODUCTO', val: registroSeleccionado.nombre_producto, color: '#2e7d32' }, 
                      { label: 'OPERARIO', val: registroSeleccionado.nombre_empleado }
                    ].map((c, i) => ( 
                      <div key={i} style={{ backgroundColor: '#fbfdfb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8ede9' }}> 
                        <span style={{ fontSize: '10px', color: '#68846e', fontWeight: 'bold' }}>{c.label}</span> 
                        <div style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: c.mono ? 'monospace' : 'inherit', color: c.color || '#212529', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.val}</div> 
                      </div> 
                    ))} 
                    <div style={{ backgroundColor: '#fdf3f3', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fbdcdb' }}>
                      <span style={{ fontSize: '10px', color: '#c62828', fontWeight: 'bold' }}>MOTIVO</span>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#c62828', marginTop: '2px' }}>{registroSeleccionado.motivo_devolucion}</div>
                    </div> 
                    <div style={{ marginTop: 'auto', paddingTop: '10px' }}> 
                      <button 
                        type="button" 
                        onClick={() => solicitarConfirmacion( 
                          `¿Desea quitar la transacción #${registroSeleccionado.id}?`, 
                          () => ejecutarQuitarDeLista(registroSeleccionado.id)
                        )} 
                        style={{ width: '100%', height: '100px', padding: '10px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '25px', fontWeight: 'bold', cursor: 'pointer' }} 
                      > 
                        QUITAR DE LA LISTA 
                      </button> 
                    </div> 
                  </div> 
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a3bda8', textAlign: 'center', fontSize: '13px' }}>
                    Selecciona una tarjeta para procesar.
                  </div>
                )} 
              </div> 
            </div> 
          </div>
        </div> 

               {/* FILA 2: SECCIÓN TOP 10 INYECTADA ABAJO (DISEÑO MEJORADO) */} 
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '16px' }}> 
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📈</span>
            <h3 style={{ margin: 0, color: theme.primary, fontWeight: '700', fontSize: '18px' }}>Top 10 Eficiencia del Personal</h3> 
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}> 
            {top10Empleados.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: theme.textMuted, fontSize: '13px' }}>Sin datos disponibles en este rango de fechas</div> 
            ) : ( 
              top10Empleados.map((item, idx) => {
                const esPodio = idx < 3;
                const fondoMedalla = idx === 0 ? '#fefce8' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#fff7ed' : '#ffffff';
                const bordeMedalla = idx === 0 ? '#fef08a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : theme.border;
                const medallaIcono = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;

                return ( 
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '14px', backgroundColor: fondoMedalla, border: `1px solid ${bordeMedalla}`, boxShadow: esPodio ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' }}> 
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: esPodio ? 'transparent' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: esPodio ? '16px' : '11px', fontWeight: '700', color: theme.textMain }}> 
                        {medallaIcono} 
                      </div> 
                      <div style={{ flex: 1, minWidth: 0 }}> 
                        <div style={{ fontWeight: '700', fontSize: '13px', color: theme.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre_empleado || 'Operario'}</div> 
                        <div style={{ fontSize: '11px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{item.nombre_producto || 'Sin Artículo'}</div> 
                      </div> 
                      <span style={{ fontWeight: '800', fontSize: '14px', color: '#16a34a' }}>{item.Porcentaje_Avance}%</span> 
                    </div>
                    {/* Barra de progreso de rendimiento individual */}
                    <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                      <div style={{ backgroundColor: '#16a34a', width: `${Math.min(Number(item.Porcentaje_Avance) || 0, 100)}%`, height: '100%', borderRadius: '999px' }}></div>
                    </div>
                  </div> 
                );
              }) 
            )} 
          </div> 
        </div> 
      </div>

      {/* MODAL TOUCH DE CONFIRMACIÓN */} 
      {confirmarTouch.abierto && ( 
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}> 
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '16px', maxWidth: '480px', width: '90%', textAlign: 'center', boxShadow: '0 20px 25px rgba(208, 253, 9, 0.86)' }}> 
            <h3 style={{ margin: '0 0 16px 0', color: theme.primary, fontSize: '18px', fontWeight: 'bold' }}>Confirmar Acción</h3> 
            <p style={{ color: '#4a5d4e', marginBottom: '24px', fontSize: '15px' }}>{confirmarTouch.mensaje}</p> 
            <div style={{ display: 'flex', gap: '14px' }}>
              <button onClick={() => setConfirmarTouch({ abierto: false, mensaje: '', accion: null })} style={{ flex: 1, padding: '14px', backgroundColor: '#e8ede9', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => { confirmarTouch.accion(); setConfirmarTouch({ abierto: false, mensaje: '', accion: null }); }} style={{ flex: 1, padding: '14px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar</button>
            </div> 
          </div> 
        </div> 
      )} 

      {/* TOAST FLOTANTE */} 
      {notificacion.visible && ( 
        <div style={{ position: 'fixed', top: '24px', right: '24px', minWidth: '340px', maxWidth: '440px', backgroundColor: '#ffffff', padding: '18px 24px', borderRadius: '14px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', borderLeft: notificacion.tipo === 'success' ? '8px solid #2e7d32' : '8px solid #d32f2f', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 200000 }}> 
          <div style={{ flex: 1 }}> 
            <h4 style={{ margin: '0 0 3px 0', fontSize: '15px', fontWeight: '700', color: '#111827' }}>{notificacion.tipo === 'success' ? 'Operación Exitosa' : 'Mensaje del Sistema'}</h4> 
            <p style={{ margin: 0, fontSize: '13px', color: '#374151', fontWeight: '600', lineHeight: '1.4' }}>{notificacion.mensaje}</p> 
          </div> 
        </div> 
      )} 
    </div> 
  ); 
} 

export default Devolucion;
