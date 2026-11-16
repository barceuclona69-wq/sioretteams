import { useEffect, useState, useRef } from 'react';
import { API_BASE_URL } from '../../config'; 

function Devolucion() { 
  const obtenerFechaActual = () => { 
    const hoy = new Date(); 
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`; 
  }; 

  const [userId] = useState(() => { 
    const savedUser = localStorage.getItem("userData"); 
    return savedUser ? JSON.parse(savedUser).id : null; 
  }); 

  // Estados de Filtros y Formularios
  const [fechaDesde, setFechaDesde] = useState(obtenerFechaActual()); 
  const [fechaHasta, setFechaHasta] = useState(obtenerFechaActual()); 
  const [tagConsulta, setTagConsulta] = useState(''); 
  const [infoTagConsultado, setInfoTagConsultado] = useState(null); 
  const [tagTimbrar, setTagTimbrar] = useState(''); 
  const [tagTimbrarcambioestado, setTagTimbrarcambioestado] = useState(''); 
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('Revisar Forma'); 
  const [tagsDevueltos, setTagsDevueltos] = useState([]); 
  const [cargandoTags, setCargandoTags] = useState(false); 
  
  // Modales
  const [modalTableroAbierto, setModalTableroAbierto] = useState(false); 
  const [modalConsultaAbierto, setModalConsultaAbierto] = useState(false); 
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null); 
  const [confirmarTouch, setConfirmarTouch] = useState({ abierto: false, mensaje: '', accion: null }); 
  
  // Audio y Notificaciones
  const [audioActivo, setAudioActivo] = useState(false); 
  const audioActivoRef = useRef(false); 
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'success' }); 
  const [idsProcesados, setIdsProcesados] = useState([]); 
  const estaHablando = useRef(false); 
  const colaDeAudio = useRef([]); 
  const utteranceRef = useRef(null); 
  const ultimaVezHabladoRef = useRef(0); 
  const reintentoProgramadoRef = useRef(false); 
  const TIEMPO_MINIMO_ESPERA = 20000; 
  const [segundosRestantes, setSegundosRestantes] = useState(0); 

  const listadoMotivos = ["Revisar Forma", "Producto dañado", "Revisar Accesorio", "Otros"]; 
  // Precarga de voces
  useEffect(() => {
    if ('speechSynthesis' in window) { 
      window.speechSynthesis.getVoices(); 
    } 
  }, []); 

  // Auto-refresco cada 5 segundos
  useEffect(() => {
    obtenerConsultaDevueltosTags(); 
    const intervaloRefresco = setInterval(() => { 
      obtenerConsultaDevueltosTags(); 
    }, 5000); 
    return () => clearInterval(intervaloRefresco); 
  }, []); 

  // Filtro por fechas
  useEffect(() => {
    obtenerConsultaDevueltosTags(); 
  }, [fechaDesde, fechaHasta]); 

  // Cuenta regresiva audio
  useEffect(() => {
    const intervalo = setInterval(() => { 
      if (ultimaVezHabladoRef.current === 0) { 
        setSegundosRestantes(0); 
        return; 
      } 
      const ahora = Date.now(); 
      const tiempoTranscurrido = ahora - ultimaVezHabladoRef.current; 
      if (tiempoTranscurrido < TIEMPO_MINIMO_ESPERA) { 
        const milisegundosQueFaltan = TIEMPO_MINIMO_ESPERA - tiempoTranscurrido; 
        setSegundosRestantes(Math.ceil(milisegundosQueFaltan / 1000)); 
      } else { 
        setSegundosRestantes(0); 
      } 
    }, 1000); 
    return () => clearInterval(intervalo); 
  }, []); 

  const procesarColaDeAudio = () => { 
    if (!audioActivoRef.current || estaHablando.current || colaDeAudio.current.length === 0) return; 
    const ahora = Date.now(); 
    const tiempoTranscurrido = ahora - ultimaVezHabladoRef.current; 
    if (tiempoTranscurrido < TIEMPO_MINIMO_ESPERA) { 
      const tiempoRestante = TIEMPO_MINIMO_ESPERA - tiempoTranscurrido; 
      if (!reintentoProgramadoRef.current) { 
        reintentoProgramadoRef.current = true; 
        setTimeout(() => { 
          reintentoProgramadoRef.current = false; 
          procesarColaDeAudio(); 
        }, tiempoRestante); 
      } 
      return; 
    } 
    const siguienteItem = colaDeAudio.current.shift(); 
    if ('speechSynthesis' in window) { 
      estaHablando.current = true; 
      const mensaje = `Devolución mesa ${siguienteItem.mesa || 'No asignada'}. ${siguienteItem.nombre_empleado || 'Desconocido'}. Motivo: ${siguienteItem.motivo_devolucion || 'No especificado'}.`; 
      utteranceRef.current = new SpeechSynthesisUtterance(mensaje); 
      const vocesDisponibles = window.speechSynthesis.getVoices(); 
      const vozEspanol = vocesDisponibles.find(v => v.lang.startsWith('es')); 
      if (vozEspanol) { utteranceRef.current.voice = vozEspanol; } 
      else { utteranceRef.current.lang = 'es-EC'; } 
      utteranceRef.current.rate = 0.85; 
      utteranceRef.current.volume = 1.0; 
      utteranceRef.current.onend = () => { 
        estaHablando.current = false; 
        utteranceRef.current = null; 
        ultimaVezHabladoRef.current = Date.now(); 
        if (audioActivoRef.current) { setTimeout(procesarColaDeAudio, 100); } 
      }; 
      utteranceRef.current.onerror = (e) => { 
        console.error("Error en SpeechSynthesis:", e); 
        estaHablando.current = false; 
        utteranceRef.current = null; 
        ultimaVezHabladoRef.current = Date.now(); 
        if (audioActivoRef.current) { setTimeout(procesarColaDeAudio, 1000); } 
      }; 
      window.speechSynthesis.speak(utteranceRef.current); 
    } 
  }; 

  useEffect(() => {
    audioActivoRef.current = audioActivo; 
    if (audioActivo) { procesarColaDeAudio(); } 
    else { 
      if ('speechSynthesis' in window) { 
        window.speechSynthesis.cancel(); 
        estaHablando.current = false; 
      } 
    } 
  }, [audioActivo]); 

  const agregarNuevosAVoz = (nuevosDatos) => { 
    if (!Array.isArray(nuevosDatos) || nuevosDatos.length === 0) return; 
    const pendientesDeAudio = nuevosDatos.filter(item => !idsProcesados.includes(item.id)); 
    if (pendientesDeAudio.length > 0) { 
      colaDeAudio.current = [...colaDeAudio.current, ...pendientesDeAudio]; 
      const nuevosIds = pendientesDeAudio.map(item => item.id); 
      setIdsProcesados(prev => [...prev, ...nuevosIds]); 
      procesarColaDeAudio(); 
    } 
  }; 
  const lanzarNotificacion = (mensaje, tipo = 'success') => { 
    setNotificacion({ visible: true, mensaje, tipo }); 
    setTimeout(() => { 
      setNotificacion({ visible: false, mensaje: '', tipo: 'success' }); 
    }, 2000); 
  }; 

  const solicitarConfirmacion = (mensaje, accion) => setConfirmarTouch({ abierto: true, mensaje, accion }); 

  const obtenerConsultaDevueltosTags = () => { 
    setCargandoTags(true); 
    fetch(`${API_BASE_URL}/api/DARTIS/consultadevueltostags?desde=${fechaDesde}&hasta=${fechaHasta}`) 
      .then(res => res.json()) 
      .then(data => { 
        const listadoValido = data && data.error ? [] : (Array.isArray(data) ? data : []); 
        setTagsDevueltos(listadoValido); 
        agregarNuevosAVoz(listadoValido); 
      }) 
      .catch(err => { 
        console.error(err); 
        setTagsDevueltos([]); 
      }) 
      .finally(() => setCargandoTags(false)); 
  }; 

  const manejarConsultaTag = (e) => { 
    e.preventDefault(); 
    if (!tagConsulta.trim()) return; 
    const tagBuscado = tagConsulta.trim(); 
    setTagConsulta(''); 
    
    fetch(`${API_BASE_URL}/api/RFID/consulta_tags?idbarras=${tagBuscado}`) 
      .then(res => res.json()) 
      .then(data => { 
        setInfoTagConsultado(Array.isArray(data) ? data : [data]); 
        setModalConsultaAbierto(true); 
      }) 
      .catch(err => { 
        console.error(err); 
        setInfoTagConsultado([]); 
        lanzarNotificacion('Error al consultar el tag en la base de datos', 'error'); 
      }); 
  }; 

  const manejarTimbradoTag = (e) => { 
    e.preventDefault(); 
    if (!tagTimbrar.trim()) return; 
    const tagAEnviar = tagTimbrar.trim(); 
    setTagTimbrar(''); 
    const hoy = new Date().toISOString().split('T')[0]; 
    fetch(`${API_BASE_URL}/api/RFID/devolucion_tags`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id_codigo_barra: tagAEnviar, usuario_devolucion: userId || 1, motivo_devolucion: motivoSeleccionado, desde: hoy, hasta: hoy }) 
    }) 
    .then(res => res.json()) 
    .then(data => { 
      if (data.error) { lanzarNotificacion(`${data.error}`, 'error'); } 
      else { 
        lanzarNotificacion(data.message || '¡Devolución registrada!', 'success'); 
        obtenerConsultaDevueltosTags(); 
      } 
    }) 
    .catch(() => lanzarNotificacion('Error de red al registrar devolución', 'error')); 
  }; 

  const rollbackapendiente = (e) => { 
    e.preventDefault(); 
    if (!tagTimbrarcambioestado.trim()) return; 
    const tagARevertir = tagTimbrarcambioestado.trim(); 
    setTagTimbrarcambioestado(''); 
    const hoy = new Date().toISOString().split('T')[0]; 
    fetch(`${API_BASE_URL}/api/RFID/rollbackapendiente`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id_codigo_barra: tagARevertir, usuario_devolucion: userId || 1, desde: hoy, hasta: hoy }) 
    }) 
    .then(res => res.json()) 
    .then(data => { 
      if (data.error) { lanzarNotificacion(`${data.error}`, 'error'); } 
      else { 
        lanzarNotificacion(data.message || '¡Rollback procesado!', 'success'); 
        obtenerConsultaDevueltosTags(); 
        setRegistroSeleccionado(null); 
      } 
    }) 
    .catch(() => lanzarNotificacion('Error de red al procesar Rollback', 'error')); 
  }; 

  const ejecutarQuitarDeLista = (idTransaccion) => { 
    fetch(`${API_BASE_URL}/api/RFID/quitar_devuelto_tag`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id_transaccion: idTransaccion }) 
    }) 
    .then(res => res.json()) 
    .then(data => { 
      if (data.error) { lanzarNotificacion(`${data.error}`, 'error'); } 
      else { 
        lanzarNotificacion(data.message || 'Tag quitado de la lista correctamente.', 'success'); 
        obtenerConsultaDevueltosTags(); 
        setRegistroSeleccionado(null); 
      } 
    }) 
    .catch(() => lanzarNotificacion('Error con el servidor al intentar quitar el tag', 'error')); 
  }; 

  // --- ESTILOS OPTIMIZADOS PARA PANTALLAS TÁCTILES ---
  const touchStyles = {
    card: { backgroundColor: '#ffffff', padding: '30px', borderRadius: '16px', boxShadow: '0 6px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' },
    input: { width: '100%', padding: '20px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '22px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' },
    select: { width: '100%', padding: '20px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '22px', outline: 'none', backgroundColor: '#ffffff', height: '70px', boxSizing: 'border-box' },
    btnPrimary: { padding: '20px 30px', borderRadius: '12px', border: 'none', color: '#ffffff', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer', minHeight: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '22px', color: '#334155' }
  };
  return ( 
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f1f5f9', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}> 
      
      {/* CABECERA / FILTROS GIGANTES */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px', padding: '20px', backgroundColor: '#ffffff', borderBottom: '2px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}> 
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontWeight: '700', color: '#1e293b', fontSize: '20px' }}>Desde:</label> 
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ padding: '15px', border: '2px solid #cbd5e1', borderRadius: '10px', fontSize: '18px', height: '60px' }} /> 
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontWeight: '700', color: '#1e293b', fontSize: '20px' }}>Hasta:</label> 
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ padding: '15px', border: '2px solid #cbd5e1', borderRadius: '10px', fontSize: '18px', height: '60px' }} /> 
          </div>
        </div>

        <button 
          type="button" 
          onClick={() => { setRegistroSeleccionado(null); setModalTableroAbierto(true); }} 
          style={{ ...touchStyles.btnPrimary, backgroundColor: '#0284c7', fontSize: '22px', height: '70px', padding: '0 40px' }}
        > 
          📱 ABRIR PANEL TÁCTIL
        </button> 
      </div> 

      {/* CUERPO PRINCIPAL EN CUADRÍCULA DISTRIBUIDA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '24px', flex: 1 }}>
        
        {/* COLUMNA IZQUIERDA: FORMULARIOS DE ACCIÓN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* CARD: TIMBRAR DEVOLUCIÓN */}
          <div style={touchStyles.card}> 
            <h3 style={{ margin: 0, color: '#9a3412', fontSize: '32px', fontWeight: '700', borderBottom: '2px solid #fed7aa', paddingBottom: '10px' }}>📥 Timbrar Devolución</h3> 
            <form onSubmit={manejarTimbradoTag} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}> 
              <div> 
                <label style={touchStyles.label}>Motivo de la Devolución:</label> 
                <select value={motivoSeleccionado} onChange={(e) => setMotivoSeleccionado(e.target.value)} style={touchStyles.select}> 
                  {listadoMotivos.map((m, idx) => <option key={idx} value={m}>{m}</option>)} 
                </select> 
              </div> 
              <div> 
                <label style={touchStyles.label}>Código del Tag a Devolver:</label> 
                <div style={{ display: 'flex', gap: '16px' }}> 
                  <input type="text" placeholder="Escanee o digite el Tag..." value={tagTimbrar} onChange={(e) => setTagTimbrar(e.target.value)} style={touchStyles.input} />
                  <button type="submit" style={{ ...touchStyles.btnPrimary, backgroundColor: '#ea580c', minWidth: '220px' }}>REGISTRAR</button> 
                </div> 
              </div> 
            </form> 
          </div> 

          {/* CARD: CONSULTAR ESTADO TAG */}
          <div style={touchStyles.card}> 
            <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '32px', fontWeight: '700', borderBottom: '2px solid #bfdbfe', paddingBottom: '10px' }}>🔍 Consultar Estado de Tag</h3> 
            <form onSubmit={manejarConsultaTag} style={{ display: 'flex', gap: '16px' }}> 
              <input type="text" placeholder="Escanee Código de Barra..." value={tagConsulta} onChange={(e) => setTagConsulta(e.target.value)} style={touchStyles.input} /> 
              <button type="submit" style={{ ...touchStyles.btnPrimary, backgroundColor: '#2563eb', minWidth: '220px' }}>CONSULTAR</button> 
            </form> 
          </div>

          {/* CARD: EMERGENCIA ROLLBACK */}
          <div style={{ ...touchStyles.card, borderLeft: '8px solid #dc2626' }}> 
            <h3 style={{ margin: 0, color: '#dc2626', fontSize: '28px', fontWeight: '700' }}>⚠️ Emergencia: Roll Back</h3> 
            <form onSubmit={rollbackapendiente} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}> 
              <div style={{ flex: 1 }}>
                <input type="text" placeholder="Tag a cambiar a pendiente..." value={tagTimbrarcambioestado} onChange={(e) => setTagTimbrarcambioestado(e.target.value)} style={touchStyles.input} />
              </div> 
              <button type="submit" style={{ ...touchStyles.btnPrimary, backgroundColor: '#dc2626', minWidth: '220px' }}>REVERTIR</button> 
            </form> 
          </div> 
        </div>
        {/* COLUMNA DERECHA: REPRODUCTOR DE AUDIO Y LISTADO EN TIEMPO REAL */}
        <div style={{ ...touchStyles.card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#334155' }}>📢 Audio de Devoluciones</h3>
              {segundosRestantes > 0 ? ( 
                <div style={{ color: '#ea580c', fontWeight: 'bold', fontSize: '16px', marginTop: '4px' }}> 
                  ⏳ Próximo audio disponible en: {segundosRestantes}s 
                </div> 
              ) : ( 
                <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '16px', marginTop: '4px' }}> 
                  ✅ Sistema listo para cantar
                </div> 
              )}
            </div>

            <button 
              type="button" 
              onClick={() => setAudioActivo(!audioActivo)} 
              style={{
                ...touchStyles.btnPrimary,
                backgroundColor: audioActivo ? '#16a34a' : '#dc2626',
                fontSize: '22px', padding: '16px 32px', minWidth: '240px', height: '70px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }} 
            > 
              <span>{audioActivo ? '🔊 AUDIO: ACTIVO' : '🔇 AUDIO: PAUSADO'}</span> 
            </button> 
          </div>

          {/* TABLA PRINCIPAL DE DEVOLUCIONES RECIENTES */}
          <div style={{ flex: 1, overflowY: 'auto', marginTop: '20px', border: '1px solid #cbd5e1', borderRadius: '12px', backgroundColor: '#ffffff' }}> 
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '16px' }}> 
              <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 1, borderBottom: '2px solid #cbd5e1' }}> 
                <tr> 
                  {["ID", "TAG", "MESA", "Producto", "Hora", "Motivo"].map((th, i) => (
                    <th key={i} style={{ padding: '18px', fontWeight: '700', color: '#475569' }}>{th}</th>
                  ))} 
                </tr> 
              </thead> 
              <tbody> 
                {tagsDevueltos.map((item, index) => ( 
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '18px', fontWeight: 'bold' }}>{item.id}</td> 
                    <td style={{ padding: '18px' }}><span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '6px 10px', borderRadius: '6px', fontWeight: '600', fontFamily: 'monospace' }}>{item.id_codigo_barra}</span></td> 
                    <td style={{ padding: '18px' }}><span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '6px 14px', borderRadius: '6px', fontWeight: '700' }}>{item.mesa || 'N/A'}</span></td> 
                    <td style={{ padding: '18px', color: '#334155' }}>{item.nombre_producto}</td> 
                    <td style={{ padding: '18px', color: '#64748b' }}>{item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleTimeString('es-EC') : '-'}</td> 
                    <td style={{ padding: '18px', color: '#dc2626', fontWeight: '500' }}>{item.motivo_devolucion}</td> 
                  </tr> 
                ))} 
              </tbody> 
            </table> 
          </div> 
        </div>
      </div> 

      {/* ================= MODAL NUEVO: CONSULTAR ESTADO DE TAG ================= */}
      {modalConsultaAbierto && infoTagConsultado && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}> 
          <div style={{ backgroundColor: '#ffffff', width: '95%', maxWidth: '1200px', maxHeight: '90vh', borderRadius: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}> 
            
            <div style={{ padding: '24px 32px', backgroundColor: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> 
              <h2 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>🔎 Resultado de la Consulta de Tag</h2> 
              <button onClick={() => { setModalConsultaAbierto(false); setInfoTagConsultado(null); }} style={{ backgroundColor: '#ef4444', fontSize: '28px', color: '#ffffff', border: 'none', width: '70px', height: '70px', borderRadius: '50%', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button> 
            </div> 

            <div style={{ flex: 1, padding: '32px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
              {infoTagConsultado.length === 0 ? (
                <p style={{ fontSize: '28px', color: '#64748b', textAlign: 'center', padding: '40px' }}>❌ No se encontraron registros para este Tag.</p>
              ) : (
                <div style={{ border: '2px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff' }}> 
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '18px', textAlign: 'left' }}> 
                    <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}> 
                      <tr> 
                        {["Estado BQT", "Mesa", "Producto", "Empleado", "Máquina", "F. Creación", "F. Devolución", "Motivo Dev."].map((h, i) => (
                          <th key={i} style={{ padding: '16px 12px', fontWeight: '700' }}>{h}</th>
                        ))}
                      </tr> 
                    </thead> 
                    <tbody> 
                      {infoTagConsultado.map((reg, idx) => ( 
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ padding: '16px 12px' }}>
                            <span style={{ 
                              padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', 
                              backgroundColor: reg.estado_bqt === 'Pendiente' ? '#fef3c7' : (reg.estado_bqt === 'ANULADO' || reg.estado_bqt === 'Anulado' ? '#fee2e2' : '#dcfce7'), 
                              color: reg.estado_bqt === 'Pendiente' ? '#d97706' : (reg.estado_bqt === 'ANULADO' || reg.estado_bqt === 'Anulado' ? '#b91c1c' : '#15803d') 
                            }}>{reg.estado_bqt}</span>
                          </td> 
                          <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#1e3a8a' }}>{reg.mesa || 'N/A'}</td> 
                          <td style={{ padding: '16px 12px' }}>{reg.nombre_producto || 'N/A'}</td> 
                          <td style={{ padding: '16px 12px' }}>{reg.nombre_empleado || 'N/A'}</td> 
                          <td style={{ padding: '16px 12px' }}>{reg.id_maquina || 'N/A'}</td> 
                          <td style={{ padding: '16px 12px' }}>{reg.fecha_creacion ? new Date(reg.fecha_creacion).toLocaleString('es-EC') : 'N/A'}</td> 
                          <td style={{ padding: '16px 12px' }}>{reg.fecha_devolucion ? new Date(reg.fecha_devolucion).toLocaleString('es-EC') : '-'}</td> 
                          <td style={{ padding: '16px 12px', color: '#dc2626', fontWeight: '500' }}>{reg.motivo_devolucion || '-'}</td> 
                        </tr> 
                      ))} 
                    </tbody> 
                  </table> 
                </div> 
              )}
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModalConsultaAbierto(false); setInfoTagConsultado(null); }} style={{ ...touchStyles.btnPrimary, backgroundColor: '#64748b', fontSize: '22px', height: '60px' }}>
                Entendido / Cerrar
              </button>
            </div>
          </div> 
        </div>
      )}
      {/* ================= MODAL EXISTENTE: PANEL TÁCTIL DE MESAS ================= */}
      {modalTableroAbierto && ( 
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}> 
          <div style={{ backgroundColor: '#ffffff', width: '95%', maxWidth: '1300px', height: '85vh', borderRadius: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}> 
            <div style={{ padding: '24px 32px', backgroundColor: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> 
              <h2 style={{ margin: 0, fontSize: '36px', fontWeight: '700' }}>📱 PANEL TÁCTIL DE MESAS</h2>
              <button onClick={() => setModalTableroAbierto(false)} style={{ backgroundColor: '#ffffff', fontSize: '32px', width: '70px', height: '70px', color: '#1e293b', border: 'none', borderRadius: '50%', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button> 
            </div> 
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', backgroundColor: '#f8fafc' }}> 
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', alignContent: 'start', borderRight: '2px solid #e2e8f0' }}> 
                {tagsDevueltos.map((item, idx) => { 
                  const sel = registroSeleccionado?.id === item.id; 
                  return ( 
                    <button key={idx} type="button" onClick={() => setRegistroSeleccionado(item)} style={{ textAlign: 'left', padding: '24px', borderRadius: '16px', border: sel ? '4px solid #16a34a' : '2px solid #cbd5e1', backgroundColor: sel ? '#f0fdf4' : '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>ID TRN: {item.id}</span>
                        <span style={{ backgroundColor: '#e2e8f0', color: '#334155', fontSize: '14px', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{item.id_maquina ? `MÁQ-${item.id_maquina}` : 'S/M'}</span>
                      </div> 
                      <div style={{ backgroundColor: sel ? '#bbf7d0' : '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '12px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '36px', fontWeight: '900', color: '#14532d' }}>{item.mesa || 'N/A'}</span>
                      </div> 
                      <span style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', width: '100%', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📦 {item.nombre_producto || 'Sin Producto'}</span> 
                    </button> 
                  ); 
                })} 
              </div> 
              <div style={{ width: '460px', padding: '24px', backgroundColor: '#ffffff', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}> 
                {registroSeleccionado ? ( 
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}> 
                    <h3 style={{ margin: 0, fontSize: '22px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', fontWeight: '700' }}>📋 Detalles Selección</h3> 
                    {[ 
                      { label: 'CÓDIGO DE TAG (RFID)', val: registroSeleccionado.id_codigo_barra, mono: true }, 
                      { label: 'PRODUCTO / ARTÍCULO', val: registroSeleccionado.nombre_producto, color: '#16a34a' }, 
                      { label: 'OPERARIO / EMPLEADO', val: registroSeleccionado.nombre_empleado }, 
                      { label: 'FECHA Y HORA CREACIÓN', val: registroSeleccionado.fecha_creacion ? new Date(registroSeleccionado.fecha_creacion).toLocaleString('es-EC') : 'N/A' } 
                    ].map((c, i) => ( 
                      <div key={i} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}> 
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>{c.label}</span> 
                        <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: c.mono ? 'monospace' : 'inherit', color: c.color || '#1e293b', marginTop: '6px' }}>{c.val}</div> 
                      </div> 
                    ))} 
                    <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                      <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 'bold' }}>MOTIVO</span>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', marginTop: '6px' }}>{registroSeleccionado.motivo_devolucion}</div>
                    </div> 
                    <div style={{ marginTop: 'auto', paddingTop: '15px' }}> 
                      <button 
                        type="button" 
                        onClick={() => solicitarConfirmacion(`¿Desea quitar la transacción #${registroSeleccionado.id} de la lista?`, () => ejecutarQuitarDeLista(registroSeleccionado.id))} 
                        style={{ ...touchStyles.btnPrimary, backgroundColor: '#dc2626', width: '100%', fontSize: '22px', height: '80px' }} 
                      > 
                        ❌ QUITAR DE LA LISTA 
                      </button> 
                    </div> 
                  </div> 
                ) : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '20px' }}>👈 Seleccione una tarjeta de la izquierda.</div>} 
              </div> 
            </div> 
          </div> 
        </div> 
      )} 

      {/* CONFIRMAR ACCIÓN TOUCH */}
      {confirmarTouch.abierto && ( 
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}> 
          <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '24px', maxWidth: '550px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}> 
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '26px', fontWeight: 'bold' }}>¿Confirmar Acción?</h3> 
            <p style={{ color: '#475569', marginBottom: '32px', fontSize: '20px' }}>{confirmarTouch.mensaje}</p> 
            <div style={{ display: 'flex', gap: '20px' }}>
              <button onClick={() => setConfirmarTouch({ abierto: false, mensaje: '', accion: null })} style={{ ...touchStyles.btnPrimary, flex: 1, backgroundColor: '#cbd5e1', color: '#334155' }}>Cancelar</button>
              <button onClick={() => { confirmarTouch.accion(); setConfirmarTouch({ abierto: false, mensaje: '', accion: null }); }} style={{ ...touchStyles.btnPrimary, flex: 1, backgroundColor: '#dc2626' }}>Confirmar</button>
            </div> 
          </div> 
        </div> 
      )} 

      {/* TOAST NOTIFICACIÓN */}
      {notificacion.visible && ( 
        <div style={{ position: 'fixed', top: '24px', right: '24px', minWidth: '400px', maxWidth: '500px', backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', borderLeft: notificacion.tipo === 'success' ? '12px solid #16a34a' : '12px solid #dc2626', display: 'flex', alignItems: 'center', gap: '20px', zIndex: 200000 }}> 
          <div style={{ fontSize: '40px' }}>{notificacion.tipo === 'success' ? '✅' : '❌'}</div> 
          <div style={{ flex: 1 }}> 
            <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{notificacion.tipo === 'success' ? 'Operación Exitosa' : 'Mensaje del Sistema'}</h4> 
            <p style={{ margin: 0, fontSize: '16px', color: '#475569', fontWeight: '600' }}>{notificacion.mensaje}</p> 
          </div> 
        </div> 
      )} 
    </div> 
  ); 
} 

export default Devolucion;
