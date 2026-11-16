
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

  const [fechaDesde, setFechaDesde] = useState(obtenerFechaActual());
  const [fechaHasta, setFechaHasta] = useState(obtenerFechaActual());
  const [tagConsulta, setTagConsulta] = useState('');
  const [infoTagConsultado, setInfoTagConsultado] = useState(null);
  const [tagTimbrar, setTagTimbrar] = useState('');
  const [tagTimbrarcambioestado, setTagTimbrarcambioestado] = useState('');
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('Revisar Forma');
  const [tagsDevueltos, setTagsDevueltos] = useState([]);
  const [cargandoTags, setCargandoTags] = useState(false);
  const [modalTableroAbierto, setModalTableroAbierto] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
const [audioActivo, setAudioActivo] = useState(false);
// 🔥 NUEVO: Esta referencia mantendrá el valor real del botón accesible para el audio
const audioActivoRef = useRef(false); 

;

  // Estado del Toast (Notificación Flotante con Cero Clicks)
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'success' });
  const [confirmarTouch, setConfirmarTouch] = useState({ abierto: false, mensaje: '', accion: null });

  const listadoMotivos = ["Revisar Forma", "Producto dañado", "Revisar Accesorio", "Otros"];
// Precarga de voces para evitar inicialización silenciosa de la API
useEffect(() => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
}, []);


  // EFECTO DE AUTO-REFRESCO AUTOMÁTICO CADA 5 SEGUNDOS
useEffect(() => {
  // 1. Ejecutar la consulta inmediatamente al cargar la pantalla
  if (typeof obtenerConsultaDevueltosTags === 'function') {
    obtenerConsultaDevueltosTags();
  }

  // 2. Crear un temporizador que se ejecute estrictamente cada 5000ms (5 segundos)
  const intervaloRefresco = setInterval(() => {
    if (typeof obtenerConsultaDevueltosTags === 'function') {
      obtenerConsultaDevueltosTags();
    }
  }, 5000);

  // 3. LIMPIEZA: Apaga el temporizador si el operario sale de la pantalla para evitar fugas de memoria
  return () => clearInterval(intervaloRefresco);
}, []); // Los corchetes vacíos aseguran que el ciclo inicie una sola vez

// Guarda los IDs de transacciones que ya fueron cantadas por el audio
const [idsProcesados, setIdsProcesados] = useState([]);
// ... Tus otras referencias e idsProcesados se quedan igual ...
const estaHablando = useRef(false);
const colaDeAudio = useRef([]);
const utteranceRef = useRef(null);
const ultimaVezHabladoRef = useRef(0);
const reintentoProgramadoRef = useRef(false);

// ⏱️ CONFIGURACIÓN: Tiempo mínimo obligatorio de espera (60 segundos)
const TIEMPO_MINIMO_ESPERA = 20000; 

// 🔥 NUEVO ESTADO: Para mostrar la cuenta regresiva en la interfaz
const [segundosRestantes, setSegundosRestantes] = useState(0);

// 🔥 NUEVO EFFECT: Un reloj que calcula los segundos que faltan cada 1 segundo
useEffect(() => {
  const intervalo = setInterval(() => {
    if (ultimaVezHabladoRef.current === 0) {
      setSegundosRestantes(0);
      return;
    }

    const ahora = Date.now();
    const tiempoTranscurrido = ahora - ultimaVezHabladoRef.current;
    
    if (tiempoTranscurrido < TIEMPO_MINIMO_ESPERA) {
      // Calculamos cuántos segundos quedan para llegar a los 60 segundos
      const milisegundosQueFaltan = TIEMPO_MINIMO_ESPERA - tiempoTranscurrido;
      setSegundosRestantes(Math.ceil(milisegundosQueFaltan / 1000));
    } else {
      setSegundosRestantes(0); // Ya se cumplió el minuto, el contador llega a cero
    }
  }, 1000); // Se ejecuta cada 1 segundo

  return () => clearInterval(intervalo); // Limpieza del reloj al desmontar
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
    
    if (vozEspanol) {
      utteranceRef.current.voice = vozEspanol;
    } else {
      utteranceRef.current.lang = 'es-EC'; 
    }

    utteranceRef.current.rate = 0.85; 
    utteranceRef.current.volume = 1.0; 

    utteranceRef.current.onend = () => {
      estaHablando.current = false;
      utteranceRef.current = null;
      
      // ⏱️ Al terminar de hablar, guardamos el tiempo exacto y el useEffect empezará a contar desde 60
      ultimaVezHabladoRef.current = Date.now();
      
      if (audioActivoRef.current) {
        setTimeout(procesarColaDeAudio, 100); 
      }
    };

    utteranceRef.current.onerror = (e) => {
      console.error("Error en SpeechSynthesis:", e);
      estaHablando.current = false;
      utteranceRef.current = null;
      
      ultimaVezHabladoRef.current = Date.now();
      
      if (audioActivoRef.current) {
        setTimeout(procesarColaDeAudio, 1000); 
      }
    };

    window.speechSynthesis.speak(utteranceRef.current);
  }
};


// 🔥 Sincroniza el botón visual con la referencia y arranca/detiene el audio
useEffect(() => {
  audioActivoRef.current = audioActivo;

  if (audioActivo) {
    procesarColaDeAudio();
  } else {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Silencia al instante si se pausa
      estaHablando.current = false;
    }
  }
}, [audioActivo]);

// Este bloque es el encargado de arrancar el motor de audio en el segundo exacto que se activa el botón
useEffect(() => {
  if (audioActivo) {
    procesarColaDeAudio();
  } else {
    // Si el operario lo pausa a mitad de un anuncio, silencia inmediatamente el navegador
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      estaHablando.current = false;
    }
  }
}, [audioActivo]);

const agregarNuevosAVoz = (nuevosDatos) => {
  if (!Array.isArray(nuevosDatos) || nuevosDatos.length === 0) return;

  // Filtrar solo los registros que NO se han procesado aún
  const pendientesDeAudio = nuevosDatos.filter(item => !idsProcesados.includes(item.id));

  if (pendientesDeAudio.length > 0) {
    // Los añadimos a la cola de reproducción en orden
    colaDeAudio.current = [...colaDeAudio.current, ...pendientesDeAudio];
    
    // Actualizamos el estado para recordar que ya los tomamos en cuenta
    const nuevosIds = pendientesDeAudio.map(item => item.id);
    setIdsProcesados(prev => [...prev, ...nuevosIds]);

    // Iniciamos la reproducción automática línea por línea
    procesarColaDeAudio();
  }
};

  // CORREGIDO: Desaparece estrictamente a los 2 segundos (2000ms) sin intervención del operario
  const lanzarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => { 
      setNotificacion({ visible: false, mensaje: '', tipo: 'success' }); 
    }, 2000);
  };

  const solicitarConfirmacion = (mensaje, accion) => setConfirmarTouch({ abierto: true, mensaje, accion });
  useEffect(() => {
    obtenerConsultaDevueltosTags();
  }, [fechaDesde, fechaHasta]);

const obtenerConsultaDevueltosTags = () => { 
  setCargandoTags(true); 
  fetch(`${API_BASE_URL}/api/DARTIS/consultadevueltostags?desde=${fechaDesde}&hasta=${fechaHasta}`) 
    .then(res => res.json()) 
    .then(data => {
      const listadoValido = data && data.error ? [] : (Array.isArray(data) ? data : []);
      setTagsDevueltos(listadoValido);
      
      // 🔥 CONEXIÓN AUTOMÁTICA: Procesa línea por línea lo nuevo que llegó
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
    
    // CORREGIDO: Vaciado inmediato e instantáneo del campo antes de llamar al servidor
    const tagBuscado = tagConsulta.trim();
    setTagConsulta(''); 

    fetch(`${API_BASE_URL}/api/RFID/consulta_tags?idbarras=${tagBuscado}`)
      .then(res => res.json())
      .then(data => {
        setInfoTagConsultado(Array.isArray(data) ? data : [data]);
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
    
    // CORREGIDO: Limpieza inmediata del input para evitar que quede congelado en la pantalla
    const tagAEnviar = tagTimbrar.trim();
    setTagTimbrar(''); 
 const hoy = new Date().toISOString().split('T')[0];
    fetch(`${API_BASE_URL}/api/RFID/devolucion_tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_codigo_barra: tagAEnviar, usuario_devolucion: userId || 1, motivo_devolucion: motivoSeleccionado,desde: hoy, hasta: hoy  })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) { lanzarNotificacion(`${data.error}`, 'error'); } 
        else { lanzarNotificacion(data.message || '¡Devolución registrada!', 'success'); obtenerConsultaDevueltosTags(); }
      })
      .catch(() => lanzarNotificacion('Error de red al registrar devolución', 'error'));
  };

  const rollbackapendiente = (e) => {
    e.preventDefault();
    if (!tagTimbrarcambioestado.trim()) return;
    
    // CORREGIDO: Limpieza inmediata del input de rollback al enviar
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
        else { lanzarNotificacion(data.message || '¡Rollback procesado!', 'success'); obtenerConsultaDevueltosTags(); setRegistroSeleccionado(null); }
      })
      .catch(() => lanzarNotificacion('Error de red al procesar Rollback', 'error'));
  };

  const ejecutarQuitarDeLista = (idTransaccion) => {
    fetch(`${API_BASE_URL}/api/RFID/quitar_devuelto_tag`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      // Se modificó esta línea para enviar solo el id_transaccion
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


  const cardStyle = { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', border: '1px solid #e8ede9' };
  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cedcd0', fontSize: '14px', outline: 'none', backgroundColor: '#fbfdfb' };
  const btnStyle = { padding: '11px 22px', borderRadius: '8px', border: 'none', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' };
 
 
 
 
  return (
    

    
    <div style={{ display: 'flex', flexDirection: 'column', height: '500vh', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f4f7f5' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#2f4f35', fontSize: '14px' }}>Desde:</label>
           <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #cedcd0', borderRadius: '6px' }} />
             
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#2f4f35', fontSize: '14px' }}>Hasta:</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #cedcd0', borderRadius: '6px' }} />
          </div>
        </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #e1e9e3' }}>
        
      
        
       
           <div style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#7d2e2eff', fontSize: '36px', fontWeight: '00' }}>📥 Timbrar Devolución</h3>
            <form onSubmit={manejarTimbradoTag} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '26px', color: '#4a5d4e' }}>Motivo de la Devolución:</label>
                <select value={motivoSeleccionado} onChange={(e) => setMotivoSeleccionado(e.target.value)} style={{ ...inputStyle, backgroundColor: '#ffffff' ,fontSize: '20px'}}>
                  {listadoMotivos.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '26px', color: '#4a5d4e' }}>Código del Tag a Devolver:</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input type="text" placeholder="Escanee el Tag..." value={tagTimbrar} onChange={(e) => setTagTimbrar(e.target.value)} style={{ ...inputStyle, border: '1px solid #b8b8b8ff' ,fontSize: '16px',backgroundColor: '#ffefd7ff'}} />
                  <button type="submit" style={{ ...btnStyle, backgroundColor: '#a24b19ff',fontSize: '26px' }}>DEVOLUCIÓN DE TAG</button>
                </div>
              </div>
            </form>
          </div>
          
          <div style={{ ...cardStyle, borderLeft: '4px solid #c62828' }}>
          
             
             <h3 style={{ marginTop: 0, marginBottom: '6px', color: '#c62828', fontSize: '36px', fontWeight: '600' , gap: '16px'}}>⚠️ Emergencia: Roll Back</h3>
            <form onSubmit={rollbackapendiente} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginTop: '12px' }}>
              <div style={{ flex: 1,fontSize: '20px' }}><input type="text" placeholder="Tag a cambiar a pendiente" value={tagTimbrarcambioestado} onChange={(e) => setTagTimbrarcambioestado(e.target.value)} style={{ ...inputStyle, border: '1px solid #c0c0c0ff' ,fontSize: '16px',backgroundColor: '#ffe0e0ff'}}  /></div>
              <button type="submit" style={{ ...btnStyle, backgroundColor: '#c62828' ,fontSize: '20px'}}>CAMBIAR A PENDIENTE</button>
            </form>
          </div>

          
         <button 
  type="button" 
  // FUNCIÓN PROGRAMADA: Resetea la selección y abre el panel
  onClick={() => { 
    if (typeof setRegistroSeleccionado === 'function') setRegistroSeleccionado(null); 
    if (typeof setModalTableroAbierto === 'function') setModalTableroAbierto(true); 
  }} 
  style={{ 
    ...btnStyle, 
    backgroundColor: '#cbfe41ff',      // Color gris oscuro profesional (Slate)
    color: '#2f620fff',                // Texto blanco de alta legibilidad
    border: 'none',                  // Sin bordes gruesos
    padding: '12px 24px',            // Grosor normal/estándar
    borderRadius: '0px',             // Estilo completamente cuadrado
    fontSize: '66px',                // Tamaño de letra equilibrado
    fontWeight: '600',               // Grosor de letra semibold limpio
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '12px', 
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', // Sombra ligera y sutil
    cursor: 'pointer',
    borderRadius: '20px'
  }}
>  
  📱
</button>

         
          
         
         
      </div>

   

      <div style={{ display: 'flex', flex: 1, padding: '24px', gap: '24px', overflow: 'hidden' }}>
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
          
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#2f4f35', fontSize: '36px', fontWeight: '600' }}>🔍 Consultar Estado de Tag</h3>
            <form onSubmit={manejarConsultaTag} style={{ display: 'flex', gap: '12px', marginBottom: infoTagConsultado ? '15px' : 0 }}>
              <input type="text" placeholder="Código de Barra..." value={tagConsulta} onChange={(e) => setTagConsulta(e.target.value)} style={{ ...inputStyle, border: '1px solid #b3b3b3ff' ,fontSize: '16px',backgroundColor: '#f1ffe5ff'}}  />
              <button type="submit" style={{ ...btnStyle, backgroundColor: '#a6bc46ff' ,fontSize: '26px'}}>CONSULTA TÚ TAG</button>
            </form>
            
            {infoTagConsultado && (
              <div style={{ marginTop: '1px', borderTop: '1px solid #e1e9e3', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ color: '#2f4f35', fontSize: '20px' }}>Historial del Tag:</strong>
                  <button type="button" onClick={() => setInfoTagConsultado(null)} style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: '26px', fontWeight: 'bold' }}>✖ Limpiar</button>
                </div>
                {infoTagConsultado.length === 0 ? <p style={{ fontSize: '36px', color: '#6c757d', fontStyle: 'italic', margin: 0 }}>No se encontraron registros.</p> : (
                  <div style={{ overflowX: 'auto', maxHeight: '620px', border: '1px solid #e1e9e3', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#f1f6f2', position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid #e1e9e3' }}>
                          <th style={{ padding: '6px 8px' }}>Estado BQT</th>
                          <th style={{ padding: '6px 8px', color: '#007bff' }}>Mesa</th>
                          <th style={{ padding: '6px 8px' }}>Producto</th>
                          <th style={{ padding: '6px 8px' }}>Empleado</th>
                          <th style={{ padding: '6px 8px' }}>Máquina</th>
                          <th style={{ padding: '6px 8px' }}>F. Creación</th>
                          <th style={{ padding: '6px 8px' }}>F. Devolución</th>
                          <th style={{ padding: '6px 8px' }}>Motivo Dev.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {infoTagConsultado.map((reg, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e8ede9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fbfdfb' }}>
                            <td style={{ padding: '6px 8px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', backgroundColor: reg.estado_bqt === 'Pendiente' ? '#fff3cd' : (reg.estado_bqt === 'ANULADO' || reg.estado_bqt === 'Anulado' ? '#f8d7da' : '#d4edda'), color: reg.estado_bqt === 'Pendiente' ? '#856404' : (reg.estado_bqt === 'ANULADO' || reg.estado_bqt === 'Anulado' ? '#721c24' : '#155724') }}>{reg.estado_bqt}</span></td>
                            <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#385723' }}>{reg.mesa || 'N/A'}</td>
                            <td style={{ padding: '6px 8px' }}>{reg.nombre_producto || 'N/A'}</td>
                            <td style={{ padding: '6px 8px' }}>{reg.nombre_empleado || 'N/A'}</td>
                            <td style={{ padding: '6px 8px' }}>{reg.id_maquina || 'N/A'}</td>
                            <td style={{ padding: '6px 8px' }}>{reg.fecha_creacion ? new Date(reg.fecha_creacion).toLocaleString('es-EC') : 'N/A'}</td>
                            <td style={{ padding: '6px 8px' }}>{reg.fecha_devolucion ? new Date(reg.fecha_devolucion).toLocaleString('es-EC') : '-'}</td>
                            <td style={{ padding: '6px 8px', color: '#c62828' }}>{reg.motivo_devolucion || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
      

        </div>

        <div style={{ flex: '2', ...cardStyle, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e8ede9', paddingBottom: '12px' }}>
           



 <div className="contenedor-principal-rfid"> 
   

      {/* 📍 ¡AQUÍ LO PEGAS! Justo en medio del diseño actual */}
      <div className="p-4 border rounded shadow-md" style={{ border: '1px solid #ccc', padding: '5px', borderRadius: '8px', margin: '5px 0' }}>
        <h3>📢 Audio de Devoluciones</h3>
        
        {segundosRestantes > 0 ? (
          <div style={{ color: 'orange', fontWeight: 'bold', marginTop: '10px' }}>
            ⏳ Siguiente audio disponible en: {segundosRestantes} segundos
          </div>
        ) : (
          <div style={{ color: 'green', fontWeight: 'bold', marginTop: '10px' }}>
            ✅ Sistema listo para cantar de inmediato
          </div>
        )}

       {/* <p>Mensajes en espera: {colaDeAudio.current.length}</p> */}
      </div>
    
            
    </div>


{/* 🔥 NUEVO BOTÓN MAESTRO DE AUDIO AUTOMÁTICO */}
    <button
  type="button"
  onClick={() => setAudioActivo(!audioActivo)}
  style={{
    ...btnStyle,
    backgroundColor: audioActivo ? '#16a34a' : '#dc2626', // Verde vibrante / Rojo vibrante
    color: '#ffffff',
    
    // 🖐️ OPTIMIZACIÓN TÁCTIL: Altura y espacio más grande para evitar fallar el toque con el dedo
    padding: '16px 28px', 
    minWidth: '120px', // Evita que el botón cambie de tamaño bruscamente al cambiar el texto
    minHeight: '60px', // Cumple con el estándar de accesibilidad móvil (mínimo 44-48px)
    
    borderRadius: '12px', // Bordes más redondeados y modernos, amigables a la vista
    fontSize: '25px', // Texto un poco más grande para leer rápido en entornos de trabajo
    fontWeight: '700',
    letterSpacing: '0.5px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center', // Centra perfectamente el contenido
    gap: '12px',
    
    // Desactiva el resaltado azul feo que ponen los navegadores móviles al tocar
    WebkitTapHighlightColor: 'transparent', 
    userSelect: 'none', // Evita que el operador seleccione el texto por accidente al dejar presionado
    
    border: 'none',
    outline: 'none',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    transition: 'transform 0.1s ease, background-color 0.2s ease', // Respuesta ultra rápida
  }}
  // 🖐️ EFECTO DE PULSACIÓN INMEDIATA AL TOCAR CON EL DEDO
  onMouseDown={(e) => {
    e.currentTarget.style.transform = 'scale(0.95)';
    e.currentTarget.style.backgroundColor = audioActivo ? '#15803d' : '#b91c1c'; // Se oscurece SOLO mientras se presiona
  }}
  onMouseUp={(e) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.backgroundColor = audioActivo ? '#16a34a' : '#dc2626';
  }}
  onTouchStart={(e) => {
    e.currentTarget.style.transform = 'scale(0.95)';
    e.currentTarget.style.backgroundColor = audioActivo ? '#15803d' : '#b91c1c';
  }}
  onTouchEnd={(e) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.backgroundColor = audioActivo ? '#16a34a' : '#dc2626';
  }}
>
  <span style={{ fontSize: '20px' }}>
    {audioActivo ? '🔊' : '🔇'}
  </span>
  <span>
    {audioActivo ? 'AUDIO : ACTIVO' : 'AUDIO : PAUSADO'}
  </span>
</button>

          </div>
          <div style={{ flex: 1, overflowY: 'auto', marginTop: '16px', border: '1px solid #e1e9e3', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#f1f6f2', position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid #e1e9e3' }}>
                  {["ID Trans.", "TAG", "MESA", "Producto", "Empleado", "Máquina", "Hora", "Motivo"].map((th, i) => <th key={i} style={{ padding: '14px 16px', fontWeight: '600', color: '#3d5a42' }}>{th}</th>)}
                </tr>
              </thead>
              <tbody>
                {tagsDevueltos.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e8ede9', backgroundColor: index % 2 === 0 ? '#ffffff' : '#fbfdfb' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600' }}>{item.id}</td>
                    <td style={{ padding: '14px 16px' }}><span style={{ backgroundColor: '#fcf8e3', color: '#66512c', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', border: '1px solid #faebcc', fontFamily: 'monospace' }}>{item.id_codigo_barra}</span></td>
                    <td style={{ padding: '14px 16px' }}><span style={{ backgroundColor: '#e2f0d9', color: '#385723', padding: '4px 12px', borderRadius: '6px', fontWeight: '700', border: '1px solid #c5e0b4' }}>{item.mesa || 'N/A'}</span></td>
                    <td style={{ padding: '14px 16px', color: '#495057' }}>{item.nombre_producto}</td>
                    <td style={{ padding: '14px 16px', color: '#495057' }}>{item.nombre_empleado}</td>
                    <td style={{ padding: '14px 16px', color: '#6c757d' }}>{item.id_maquina || '-'}</td>
                    <td style={{ padding: '14px 16px', color: '#6c757d' }}>{item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleTimeString('es-EC') : '-'}</td>
                    <td style={{ padding: '14px 16px', color: '#c62828', fontWeight: '500' }}>{item.motivo_devolucion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {modalTableroAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(28, 43, 31, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', width: '95%', maxWidth: '1150px', height: '85vh', borderRadius: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 32px', backgroundColor: '#2e5a36', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><h2 style={{ margin: 0, fontSize: '40px', fontWeight: '700' }}>📱 PANEL TÁCTIL</h2></div>
              <button onClick={() => setModalTableroAbierto(false)} style={{ backgroundColor: '#d2e573ff', fontSize: '50px',width: '100px',height: '100px',color: '#040404ff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>✖</button>
            </div>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', backgroundColor: '#f7faf8' }}>
             {/* CONTENEDOR ACTUALIZADO A 3 COLUMNAS FIJAS */}
                        <div 
                          style={{ 
                            flex: 1, 
                            padding: '24px', 
                            overflowY: 'auto', 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(2, 1fr)', // <- CAMBIADO: Ahora siempre serán 2 columnas perfectas
                            gap: '16px', 
                            alignContent: 'start', 
                            borderRight: '1px solid #e1e9e3' 
                          }}
                        >
                          {tagsDevueltos.map((item, idx) => {
                            const sel = registroSeleccionado?.id === item.id;
                            return (
                              <button key={idx} type="button" onClick={() => setRegistroSeleccionado(item)} style={{ textAlign: 'left', padding: '20px', borderRadius: '14px', border: sel ? '3px solid #2e7d32' : '1px solid #cedcd0', backgroundColor: sel ? '#f1f9f2' : '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', fontWeight: 'bold', color: '#5b7560' }}>ID TRN: {item.id}</span><span style={{ backgroundColor: '#e8ede9', color: '#2f4f35', fontSize: '12px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{item.id_maquina ? `MÁQ-${item.id_maquina}` : 'S/M'}</span></div>
                                <div style={{ backgroundColor: sel ? 'rgba(194, 221, 43, 1)' : '#e2f0d9', border: '1px solid #b7d7a8', borderRadius: '8px', padding: '10px', textAlign: 'center' }}><span style={{ fontSize: '30px', fontWeight: '900', color: '#3b6025ff' }}> {item.mesa || 'N/A'}</span></div>
                                <span style={{ fontSize: '15px', color: '#5a483dff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📦 {item.nombre_producto || 'Sin Producto'}</span>
                              </button>
                            );
                          })}
                        </div>

              <div style={{ width: '440px', padding: '24px', backgroundColor: '#ffffff', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {registroSeleccionado ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2f4f35', borderBottom: '2px solid #f1f6f2', paddingBottom: '10px', fontWeight: '700' }}>📋 Detalles</h3>
                    {[
                      { label: 'CÓDIGO DE TAG (RFID)', val: registroSeleccionado.id_codigo_barra, mono: true },
                      { label: 'PRODUCTO / ARTÍCULO', val: registroSeleccionado.nombre_producto, color: '#2e7d32' },
                      { label: 'OPERARIO / EMPLEADO', val: registroSeleccionado.nombre_empleado },
                      { label: 'FECHA Y HORA CREACIÓN', val: registroSeleccionado.fecha_creacion ? new Date(registroSeleccionado.fecha_creacion).toLocaleString('es-EC') : 'N/A' }
                    ].map((c, i) => (
                      <div key={i} style={{ backgroundColor: '#fbfdfb', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e8ede9' }}>
                        <span style={{ fontSize: '11px', color: '#68846e', fontWeight: 'bold' }}>{c.label}</span>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: c.mono ? 'monospace' : 'inherit', color: c.color || '#212529', marginTop: '4px' }}>{c.val}</div>
                      </div>
                    ))}
                    <div style={{ backgroundColor: '#fdf3f3', padding: '12px 16px', borderRadius: '10px', border: '1px solid #fbdcdb' }}><span style={{ fontSize: '11px', color: '#c62828', fontWeight: 'bold' }}>MOTIVO</span><div style={{ fontSize: '14px', fontWeight: 'bold', color: '#c62828', marginTop: '4px' }}>{registroSeleccionado.motivo_devolucion}</div></div>
                                    <div style={{ marginTop: 'auto', paddingTop: '15px' }}>
                    <button 
                      type="button" 
                      onClick={() => solicitarConfirmacion(
                        `¿Desea quitar la transacción #${registroSeleccionado.id} de la lista?`, 
                        () => ejecutarQuitarDeLista(registroSeleccionado.id) // <- Esta función hará todo el trabajo al confirmar
                      )} 
                      style={{ height: '220px',width: '220px',width: '100%',padding: '18px', backgroundColor: '#dc2626', color: '#ffffff', border: '2px solid #e3f1d4ff', borderRadius: '14px', fontSize: '26px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      QUITAR DE LA  LISTA
                    </button>
          </div>

                  </div>
                ) : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a3bda8' }}>Toque una tarjeta a la izquierda.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmarTouch.abierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '16px', maxWidth: '480px', width: '90%', textAlign: 'center', boxShadow: '0 20px 25px rgba(208, 253, 9, 0.86)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#58722dff', fontSize: '18px', fontWeight: 'bold' }}>Confirmar</h3>
            <p style={{ color: '#4a5d4e', marginBottom: '24px' }}>{confirmarTouch.mensaje}</p>
            <div style={{ display: 'flex', gap: '14px' }}><button onClick={() => setConfirmarTouch({ abierto: false, mensaje: '', accion: null })} style={{ flex: 1, padding: '14px', backgroundColor: '#e8ede9', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button><button onClick={() => { confirmarTouch.accion(); setConfirmarTouch({ abierto: false, mensaje: '', accion: null }); }} style={{ flex: 1, padding: '14px', backgroundColor: '#dc2626',width: '100px', height: '100px', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar</button></div>
          </div>
        </div>
      )}

      {/* TOAST FLOTANTE FIJO CON DESVANECIMIENTO SEGURO A LOS 2 SEGUNDOS */}
      {notificacion.visible && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', minWidth: '340px', maxWidth: '440px', backgroundColor: '#ffffff',
          padding: '18px 24px', borderRadius: '14px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
          borderLeft: notificacion.tipo === 'success' ? '8px solid #2e7d32' : '8px solid #d32f2f',
          display: 'flex', alignItems: 'center', gap: '16px', zIndex: 200000, opacity: 1
        }}>
          <div style={{ fontSize: '32px' }}>{notificacion.tipo === 'success' ? '✅' : '❌'}</div>
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


