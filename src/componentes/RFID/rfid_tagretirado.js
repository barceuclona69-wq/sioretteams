import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config'; 

function Devolucion() { 
  // Detector dinámico de tamaño de pantalla para Responsividad 
  const [anchoVentana, setAnchoVentana] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200); 
 
  useEffect(() => {
    const manejarResize = () => setAnchoVentana(window.innerWidth); 
    window.addEventListener('resize', manejarResize); 
    return () => window.removeEventListener('resize', manejarResize); 
  }, []); 

  const esMovil = anchoVentana <= 768; 
  const esTablet = anchoVentana > 768 && anchoVentana <= 1024; 

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

  // NUEVO: Estado para abrir/cerrar el modal de la Pantalla Táctil de Devoluciones
  const [modalTactilAbierto, setModalTactilAbierto] = useState(false);

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
  const totalAnuladoGlobal = datosReporte.reduce((acc, curr) => acc + (Number(curr.Anulado) || 0), 0); 
  const totalPendienteGlobal = datosReporte.reduce((acc, curr) => acc + (Number(curr.Pendiente) || 0), 0); 

  // --- CÁLCULOS PARA LA BARRA TRICOLOR --- 
  const totalOperativo = totalListoGlobal + totalPendienteGlobal + totalAnuladoGlobal; 
  const porcListoRelativo = totalOperativo > 0 ? Math.round((totalListoGlobal / totalOperativo) * 100) : 0; 
  const porcPendienteRelativo = totalOperativo > 0 ? Math.round((totalPendienteGlobal / totalOperativo) * 100) : 0; 
  const porcAnuladoRelativo = totalOperativo > 0 ? Math.max(0, 100 - (porcListoRelativo + porcPendienteRelativo)) : 0; 
  const avanceGlobalPromedio = datosReporte.length > 0 ? Math.round(datosReporte.reduce((acc, curr) => acc + (Number(curr.Porcentaje_Avance) || 0), 0) / datosReporte.length) : 0; 

  // --- GENERACIÓN DEL TOP 10 DINÁMICO --- 
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
    padding: esMovil ? '16px' : '24px', 
    borderRadius: '16px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)', 
    border: `1px solid ${theme.border}` 
  }; 

  return ( 
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: theme.bgBody, color: theme.textMain, width: '100%', boxSizing: 'border-box' }}> 
 
      {/* FILTROS SUPERIORES RESPONSIVE */} 
      <div style={{ display: 'flex', flexDirection: esMovil ? 'column' : 'row', justifyContent: 'space-between', alignItems: esMovil ? 'stretch' : 'center', padding: esMovil ? '16px' : '16px 32px', backgroundColor: theme.cardBg, borderBottom: `1px solid ${theme.border}`, gap: '16px' }}> 
        <div style={{ display: 'flex', flexDirection: esMovil ? 'column' : 'row', alignItems: esMovil ? 'stretch' : 'center', gap: esMovil ? '12px' : '20px', width: '100%' }}> 
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flex: 1 }}> 
            <label style={{ fontWeight: '600', color: theme.primary, fontSize: '14px' }}>Desde:</label> 
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '8px', outline: 'none', flex: esMovil ? 1 : 'none', maxWidth: esMovil ? '200px' : 'none' }} /> 
          </div> 
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flex: 1 }}> 
            <label style={{ fontWeight: '600', color: theme.primary, fontSize: '14px' }}>Hasta:</label> 
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '8px', outline: 'none', flex: esMovil ? 1 : 'none', maxWidth: esMovil ? '200px' : 'none' }} /> 
          </div> 
          {cargandoReporte && <span style={{ fontSize: '13px', color: theme.textMuted, textAlign: esMovil ? 'center' : 'left' }}>Sincronizando datos...</span>} 
        </div> 
        {/* BOTÓN PARA ABRIR LA PANTALLA TÁCTIL COMO MODAL */}
        <button type="button" onClick={() => setModalTactilAbierto(true)} style={{ padding: '10px 20px', backgroundColor: '#2e5a36', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background-color 0.2s' }}>
          ✋ PANTALLA TÁCTIL (RETIRO DE BQTS)
        </button>
      </div>
      {/* CUERPO CENTRAL DEL DASHBOARD */} 
      <div style={{ flex: 1, padding: esMovil ? '12px' : '32px', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }}> 
 
        {/* BLOQUES KPI ANALÍTICOS */} 
        <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : esTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '20px' }}> 
          <div style={{ ...cardStyle, padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}> 
            <span style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '500' }}>Total Asignado</span> 
            <span style={{ fontSize: '28px', fontWeight: '700', color: theme.primary }}>{totalAsignadoGlobal} Bouquets</span> 
          </div> 
          <div style={{ ...cardStyle, padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}> 
            <span style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '500' }}>Total Listo</span> 
            <span style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>{totalListoGlobal} Bouquets</span> 
          </div> 
          <div style={{ ...cardStyle, padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}> 
            <span style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '500' }}>Total Pendientes</span> 
            <span style={{ fontSize: '28px', fontWeight: '700', color: '#ea580c' }}>{totalPendienteGlobal} Bouquets</span> 
          </div> 
          <div style={{ ...cardStyle, padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}> 
            <span style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '500' }}>Total Anulados</span> 
            <span style={{ fontSize: '28px', fontWeight: '700', color: '#4b5563' }}>{totalAnuladoGlobal} Bouquets</span> 
          </div> 

          {/* RENDIMIENTO Y BALANCE OPERATIVO */} 
          <div style={{ ...cardStyle, padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: esMovil ? 'auto' : esTablet ? 'span 2' : 'span 4' }}> 
            <span style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '500' }}>Rendimiento y Balance Operativo</span> 
            <div style={{ display: 'flex', flexDirection: esMovil ? 'column' : 'row', alignItems: esMovil ? 'stretch' : 'center', gap: '16px', width: '100%' }}> 
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: '85px' }}> 
                <span style={{ fontSize: '24px', fontWeight: '800', color: theme.primary }}>{avanceGlobalPromedio}%</span> 
                <span style={{ fontSize: '10px', color: theme.textMuted, fontWeight: '600' }}>AVANCE TOTAL</span> 
              </div> 
              <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '999px', height: '14px', overflow: 'hidden', display: 'flex' }}> 
                <div style={{ backgroundColor: '#4fc02dff', width: `${porcListoRelativo}%`, height: '100%', transition: 'width 0.4s ease' }}></div> 
                <div style={{ backgroundColor: '#e77c2aff', width: `${porcPendienteRelativo}%`, height: '100%', transition: 'width 0.4s ease' }}></div> 
                <div style={{ backgroundColor: '#dc2626', width: `${porcAnuladoRelativo}%`, height: '100%', transition: 'width 0.4s ease' }}></div> 
              </div> 
              <div style={{ display: 'flex', gap: '14px', justifyContent: esMovil ? 'space-between' : 'flex-end', flexWrap: 'wrap' }}> 
                <div style={{ textAlign: esMovil ? 'left' : 'right' }}> 
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>{porcListoRelativo}%</span> 
                  <span style={{ fontSize: '10px', color: theme.textMuted, display: 'block', fontWeight: '600' }}>PROCESADOS</span> 
                </div> 
                <div style={{ textAlign: esMovil ? 'left' : 'right' }}> 
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#e77c2aff' }}>{porcPendienteRelativo}%</span> 
                  <span style={{ fontSize: '10px', color: theme.textMuted, display: 'block', fontWeight: '600' }}>PENDIENTES</span> 
                </div> 
                <div style={{ textAlign: esMovil ? 'left' : 'right' }}> 
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626' }}>{porcAnuladoRelativo}%</span> 
                  <span style={{ fontSize: '10px', color: theme.textMuted, display: 'block', fontWeight: '600' }}>ANULADOS</span> 
                </div> 
              </div> 
            </div> 
          </div> 
        </div>
      

        {/* CONTENEDOR DISTRIBUIDO: TABLA GENERAL (IZQ) Y TOP 10 VERTICAL (DER) */} 
        <div style={{ display: 'flex', flexDirection: (esMovil || esTablet) ? 'column' : 'row', gap: '24px', alignItems: 'stretch' }}> 
          
                   {/* REPORTE GENERAL DE OPERACIONES (CON LETRAS MÁS GRANDES) */}
          <div style={{ flex: '3.5', ...cardStyle, display: 'flex', flexDirection: 'column', height: '800px', width: '100%', overflow: 'hidden' }}> 
            <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: '16px', marginBottom: '16px' }}> 
              <h3 style={{ margin: 0, color: theme.primary, fontWeight: '700', fontSize: '18px' }}>Reporte General de Operaciones</h3> 
            </div> 
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', borderRadius: '12px', border: `1px solid ${theme.border}` }}> 
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px', minWidth: '750px' }}> 
                <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 1, borderBottom: `1px solid ${theme.border}` }}> 
                  <tr> 
                    {["MESA", "Empleado", "Máquina", "Pend.", "Listo", "Anul.", "Total Asig.", "Avance %"].map((th, i) => ( 
                      <th key={i} style={{ padding: '14px 16px', fontWeight: '700', color: theme.textMuted, fontSize: '18px' }}>{th}</th> 
                    ))} 
                  </tr> 
                </thead> 
                <tbody> 
                  {datosReporte.length === 0 ? ( 
                    <tr> 
                      <td colSpan="10" style={{ padding: '32px', textAlign: 'center', color: theme.textMuted, fontSize: '16px' }}>No hay registros de rendimiento de este rango de fechas.</td> 
                    </tr> 
                  ) : ( 
                    datosReporte.map((item, index) => ( 
                      <tr key={index} style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}> 
                        {/* Celda MESA */}
                        <td style={{ padding: '14px 16px' }}> 
                          <span style={{ backgroundColor: theme.primaryLight, color: theme.primary, padding: '6px 12px', borderRadius: '6px', fontWeight: '800', fontSize: '14px' }}>{item.mesa || 'N/A'}</span> 
                        </td> 
                      
                        {/* Celda Empleado */}
                        <td style={{ padding: '14px 16px', fontSize: '16px', color: theme.textMain }}>{item.nombre_empleado}</td> 
                        {/* Celda Máquina */}
                        <td style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '16px' }}>{item.id_maquina ? `MÁQ-${item.id_maquina}` : '-'}</td> 
                        {/* Celda Pend. */}
                        <td style={{ padding: '14px 16px', color: '#ea580c', fontWeight: '700', fontSize: '16px' }}>{item.Pendiente}</td> 
                        {/* Celda Listo */}
                        <td style={{ padding: '14px 16px', color: '#16a34a', fontWeight: '700', fontSize: '16px' }}>{item.Listo}</td> 
                        {/* Celda Anul. */}
                        <td style={{ padding: '14px 16px', color: '#4b5563', fontWeight: '700', fontSize: '16px' }}>{item.Anulado}</td> 
                        {/* Celda Total Asig. */}
                        <td style={{ padding: '14px 16px', fontWeight: '800', fontSize: '16px', color: theme.textMain }}>{item.Cantidad_Asignada}</td> 
                        {/* Celda Avance % */}
                        <td style={{ padding: '14px 16px' }}> 
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> 
                            <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '999px', height: '8px', minWidth: '60px', overflow: 'hidden' }}> 
                              <div style={{ backgroundColor: '#4fc02dff', width: `${item.Porcentaje_Avance}%`, height: '100%' }}></div> 
                            </div> 
                            <span style={{ fontWeight: '800', color: '#055321ff', fontSize: '16px' }}>{item.Porcentaje_Avance}%</span> 
                          </div> 
                        </td> 
                      </tr> 
                    )) 
                  )} 
                </tbody> 
              </table> 
            </div> 
          </div>



          {/* SECCIÓN TOP 10 CON MEDALLAS EMÁGENES DE ALTO IMPACTO VISUAL */} 
          <div style={{ flex: '1', ...cardStyle, display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '800px', overflowY: 'auto' }}> 
            <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}> 
              <span style={{ fontSize: '18px' }}>🏆</span>
              <h3 style={{ margin: 0, color: theme.primary, fontWeight: '700', fontSize: '16px' }}>Top 10 Eficiencia del Personal</h3> 
            </div> 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}> 
              {top10Empleados.length === 0 ? ( 
                <div style={{ padding: '24px', textAlign: 'center', color: theme.textMuted, fontSize: '13px' }}>Sin datos disponibles</div> 
              ) : ( 
                top10Empleados.map((item, idx) => { 
                  const esPodio = idx < 3; 
                  
                  // Colores de fondo premium degradados para las tarjetas del podio
                  const fondoTarjeta = idx === 0 ? 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)' 
                                     : idx === 1 ? 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)' 
                                     : idx === 2 ? 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)' 
                                     : '#ffffff'; 
                  const bordeTarjeta = idx === 0 ? '#fde047' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#ffedd5' : theme.border; 

                  // Asignación de insignias reales solicitadas para el podio
                  const medallaIcono = idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                  
                  // Cálculos proporcionales individuales de cada operario
                  const empListo = Number(item.Listo) || 0;
                  const empPend = Number(item.Pendiente) || 0;
                  const empAnul = Number(item.Anulado) || 0;
                  const empTotal = empListo + empPend + empAnul;

                  const pListo = empTotal > 0 ? Math.round((empListo / empTotal) * 100) : 0;
                  const pPend = empTotal > 0 ? Math.round((empPend / empTotal) * 100) : 0;
                  const pAnul = empTotal > 0 ? Math.max(0, 100 - (pListo + pPend)) : 0;

                  return ( 
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '16px', backgroundColor: idx < 3 ? 'transparent' : '#ffffff', backgroundImage: fondoTarjeta, border: `1px solid ${bordeTarjeta}`, boxShadow: esPodio ? '0 4px 12px rgba(234, 179, 8, 0.06)' : 'none', transition: 'transform 0.2s ease' }}> 
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}> 
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}> 
                          
                          {/* Renderizado de Medallas Reales o Números según Clasificación */}
                          {esPodio ? (
                            <div style={{ fontSize: '26px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {medallaIcono}
                            </div>
                          ) : (
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#64748b', flexShrink: 0 }}>
                              #{idx + 1}
                            </div>
                          )}

                          <div style={{ minWidth: 0 }}> 
                            <div style={{ fontWeight: '700', fontSize: '13px', color: theme.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre_empleado || 'Operario'}</div> 
                            <div style={{ fontSize: '11px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{item.nombre_producto || 'Sin Artículo'}</div> 
                          </div> 
                        </div> 
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '800', fontSize: '15px', color: '#16a34a', display: 'block' }}>{item.Porcentaje_Avance}%</span> 
                        </div>
                      </div> 

                     
                      {/* 🚨 BARRA TRICOLOR ULTRA GRUESA (Cambiado de 7px a 14px de altura) */}
                      <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '999px', height: '14px', overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)' }}> 
                        <div style={{ backgroundColor: '#4fc02dff', width: `${pListo}%`, height: '100%', transition: 'width 0.4s ease' }}></div> 
                        <div style={{ backgroundColor: '#ea580c', width: `${pPend}%`, height: '100%', transition: 'width 0.4s ease' }}></div> 
                        <div style={{ backgroundColor: '#dc2626', width: `${pAnul}%`, height: '100%', transition: 'width 0.4s ease' }}></div> 
                      </div> 

                      {/* 🚨 TEXTOS INFERIORES MÁS GRANDES Y NEGRITAS EXTRA (fontSize: '11px' y fontWeight: '900') */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '900', marginTop: '2px', padding: '0 2px', letterSpacing: '0.4px' }}>
                        <span style={{ color: '#111827', display: 'flex', alignItems: 'center', gap: '3px' }}>⚫ {pListo}% PROC</span>
                        <span style={{ color: '#ea580c', display: 'flex', alignItems: 'center', gap: '3px' }}>🟣 {pPend}% PEND</span>
                        <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '3px' }}>🔴 {pAnul}% ANUL</span>
                      </div>
                    </div> 
                  ); 
                }) 
              )} 
            </div> 
          </div> 

        </div>



      </div> {/* FIN CUERPO CENTRAL */}
      {/* MODAL RESPONSIVE DE LA PANTALLA TÁCTIL DE DEVOLUCIONES */}
      {modalTactilAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: esMovil ? '0' : '20px', boxSizing: 'border-box' }}>
          <div style={{ ...cardStyle, width: '100%', maxWidth: '1000px', height: esMovil ? '100%' : '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', position: 'relative' }}>
            
            {/* Header del Modal */}
            <div style={{ padding: '16px 24px', backgroundColor: '#2e5a36', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> 
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>PANEL TÁCTIL DE DEVOLUCIONES</h2> 
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {cargandoTags && <span style={{ fontSize: '12px', color: '#e2f0d9' }}>Actualizando...</span>} 
                <button type="button" onClick={() => setModalTactilAbierto(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', fontWeight: 'bold' }}>&times;</button>
              </div>
            </div> 

            {/* Contenido del Modal */}
            <div style={{ flex: 1, display: 'flex', flexDirection: esMovil ? 'column' : 'row', overflow: 'hidden', backgroundColor: '#f7faf8' }}> 
              <div style={{ flex: 1.5, padding: '16px', overflowX: 'hidden', overflowY: 'auto', display: 'grid', gridTemplateColumns: esMovil ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '12px', alignContent: 'start', borderRight: esMovil ? 'none' : '1px solid #e1e9e3', borderBottom: esMovil ? '1px solid #e1e9e3' : 'none', height: esMovil ? '50%' : '100%' }}> 
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
              <div style={{ flex: 1, minWidth: esMovil ? 'auto' : '220px', padding: '16px', backgroundColor: '#ffffff', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', height: esMovil ? '50%' : '100%' }}> 
                {registroSeleccionado ? ( 
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}> 
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#2f4f35', borderBottom: '2px solid #f1f6f2', paddingBottom: '6px', fontWeight: '700' }}>Detalles</h3> 
                    {[ 
                      { label: 'CÓDIGO RFID', val: registroSeleccionado.id_codigo_barra, mono: true }, 
                      { label: 'PRODUCTO', val: registroSeleccionado.nombre_producto, color: '#2e7d32' }, 
                      { label: 'OPERARIO', val: registroSeleccionado.nombre_empleado } 
                    ].map((campo, i) => ( 
                      <div key={i} style={{ backgroundColor: '#fbfdfb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8ede9' }}> 
                        <span style={{ fontSize: '10px', color: '#68846e', fontWeight: 'bold' }}>{campo.label}</span> 
                        <div style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: campo.mono ? 'monospace' : 'inherit', color: campo.color || '#212529', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campo.val}</div> 
                      </div> 
                    ))} 
                    <div style={{ backgroundColor: '#fdf3f3', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fbdcdb' }}> 
                      <span style={{ fontSize: '10px', color: '#c62828', fontWeight: 'bold' }}>MOTIVO</span> 
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#c62828', marginTop: '2px' }}>{registroSeleccionado.motivo_devolucion}</div> 
                    </div> 
                    <div style={{ marginTop: 'auto', paddingTop: '10px' }}> 
                      <button type="button" onClick={() => solicitarConfirmacion(`¿Desea quitar la transacción #${registroSeleccionado.id}?`, () => ejecutarQuitarDeLista(registroSeleccionado.id))} style={{ width: '100%', height: esMovil ? '55px' : '80px', padding: '10px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: esMovil ? '18px' : '22px', fontWeight: 'bold', cursor: 'pointer' }}>QUITAR DE LA LISTA</button> 
                    </div> 
                  </div> 
                ) : ( 
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a3bda8', textAlign: 'center', fontSize: '13px' }}>Selecciona una tarjeta para procesar.</div> 
                )} 
              </div> 
            </div> 

          </div>
        </div>
      )}

      {/* MODAL TOUCH DE CONFIRMACIÓN */} 
      {confirmarTouch.abierto && ( 
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000 }}> 
          <div style={{ backgroundColor: '#ffffff', padding: esMovil ? '20px' : '30px', borderRadius: '16px', maxWidth: '480px', width: '90%', textAlign: 'center', boxShadow: '0 20px 25px rgba(0,0,0,0.1)' }}> 
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
        <div style={{ position: 'fixed', top: '24px', right: esMovil ? '12px' : '24px', left: esMovil ? '12px' : 'auto', minWidth: esMovil ? 'auto' : '340px', maxWidth: '440px', backgroundColor: '#ffffff', padding: '18px 24px', borderRadius: '14px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', borderLeft: notificacion.tipo === 'success' ? '8px solid #2e7d32' : '8px solid #d32f2f', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 200000 }}> 
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
