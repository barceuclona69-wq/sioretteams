import React, { useEffect, useState } from 'react';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner'; 

const Taller = () => { 
  // --- ESTADOS DE CURSOS Y NAVEGACIÓN DINÁMICA --- 
  const [cursoSeleccionadoId, setCursoSeleccionadoId] = useState(null); 
  const [listaCursosDropdown, setListaCursosDropdown] = useState([]); 
  const [datosCursoGlobal, setDatosCursoGlobal] = useState({ 
    nombre_curso: 'Cargando...', 
    codigo_curso: '', 
    avance_curso: 0, 
    temas: [] 
  }); 
  const [moduloAbierto, setModuloAbierto] = useState(true); 
  const [examenSeleccionadoId, setExamenSeleccionadoId] = useState(null); 
  const [examenData, setExamenData] = useState(null); 
  const [loadingMenu, setLoadingMenu] = useState(true); 
  const [loadingExamen, setLoadingExamen] = useState(true); 
 
  // Respuestas del alumno, calificaciones e indicadores discretos de actualización
  const [respuestasSeleccionadas, setRespuestasSeleccionadas] = useState({}); 
  const [quizTerminado, setQuizTerminado] = useState(false); 
  const [resultadoNota, setResultadoNota] = useState(null); 
  const [mensajeActualizacion, setMensajeActualizacion] = useState('');

  // --- ESTADO DEL USUARIO DESDE LOCALSTORAGE --- 
  const [user, setUser] = useState(() => { 
    const savedUser = localStorage.getItem("userData"); 
    const parsed = savedUser ? JSON.parse(savedUser) : { id: null, nombre: 'Usuario', idperfil: null, departamento: '', id_empresa: '' }; 
    return { 
      ...parsed, 
      empresasAutorizadas: parsed.id_empresa ? String(parsed.id_empresa).split(',').map(s => s.trim()) : [], 
      deptosAutorizados: parsed.departamento ? String(parsed.departamento).split(',').map(s => s.trim()) : [] 
    }; 
  });
  // 1. CARGAR TODOS LOS CURSOS DE LA BASE DE DATOS PARA EL DROPDOWN 
  const cargarCursosBD = async () => { 
    try { 
      const res = await fetchWithFallback('/api/Config_aprendizaje/admin/cursos'); 
      console.log("[DEBUG CURSOS] Catálogo recibido del servidor:", res); 
 
      let cursosExtraidos = []; 
      if (res) { 
        if (Array.isArray(res)) cursosExtraidos = res; 
        else if (res.data && Array.isArray(res.data)) cursosExtraidos = res.data; 
        else if (res.recordset && Array.isArray(res.recordset)) cursosExtraidos = res.recordset; 
      } 
      
      if (cursosExtraidos && cursosExtraidos.length > 0) { 
        setListaCursosDropdown(cursosExtraidos); 
        const idPrimerCursoBD = cursosExtraidos[0].id_curso; 
        console.log(`[DEBUG] Asignando automáticamente Curso Inicial ID: ${idPrimerCursoBD}`); 
        setCursoSeleccionadoId(idPrimerCursoBD); 
      } 
    } catch (error) { 
      console.error("[DEBUG ERROR] Fallo al traer catálogo de cursos:", error); 
    } 
  }; 

  // 2. CARGAR MENÚ LATERAL FILTRADO POR CURSO Y USUARIO 
  const cargarMenuLateral = async () => { 
    if (!cursoSeleccionadoId) { 
      console.log("[DEBUG] Esperando ID de curso relacional activo..."); 
      return; 
    } 
    try { 
      setLoadingMenu(true); 
      const urlPeticion = `/api/Config_aprendizaje/modulos?usuario=${user.id}&id_curso=${cursoSeleccionadoId}`; 
      console.log(`[DEBUG PETICIÓN] Cargando estructura dinámica: ${urlPeticion}`); 
      const res = await fetchWithFallback(urlPeticion); 
 
      if (res) { 
        setDatosCursoGlobal({ 
          nombre_curso: res.nombre_curso || 'Curso Sin Nombre de Retorno', 
          codigo_curso: res.codigo_curso || '', 
          avance_curso: res.avance_curso ?? 0, 
          temas: res.temas || [] 
        }); 

        if (res.temas && res.temas.length > 0) { 
          const existe = res.temas.some(item => String(item.id) === String(examenSeleccionadoId)); 
          if (!existe) setExamenSeleccionadoId(res.temas[0].id); 
        } else { 
          console.warn("[DEBUG AVISO] La API no retornó temas configurados para este curso."); 
          setExamenData(null); 
          setLoadingExamen(false); 
        } 
      } 
    } catch (error) { 
      console.error("[DEBUG CATCH] Error en cargarMenuLateral:", error); 
      toast.error("No se pudo sincronizar la estructura del curso"); 
    } finally { 
      setLoadingMenu(false); 
    } 
  };
  // 3. CARGAR RECURSOS DIDÁCTICOS O EVALUACIONES DE LA UNIDAD SELECCIONADA
  const cargarExamen = async (id) => { 
    try { 
      setLoadingExamen(true); 
      setQuizTerminado(false); 
      setResultadoNota(null); 
      setRespuestasSeleccionadas({}); 
 
      const res = await fetchWithFallback(`/api/Config_aprendizaje/examenes?id=${id}`); 
      console.log(`[DEBUG EXAMEN] Recursos mapeados del tema ID [${id}]:`, res); 
      if (res) { 
        setExamenData(res); 
      } 
    } catch (error) { 
      console.error("[DEBUG ERROR] Error al traer recursos didácticos:", error); 
      toast.error("No se pudieron descargar los datos de la lección"); 
    } finally { 
      setLoadingExamen(false); 
    } 
  }; 

  // 4. EVALUAR CUESTIONARIO Y RESPUESTAS DEL ALUMNO (SILENCIOSO, SIN REFRESCAR LA PANTALLA)
  const enviarExamen = async () => { 
    const totalPreguntas = examenData?.preguntas_lista?.length || 0; 
    const respondidas = Object.keys(respuestasSeleccionadas).length; 
 
    if (respondidas < totalPreguntas) { 
      toast.warning(`Por favor responde todas las preguntas (${respondidas}/${totalPreguntas})`); 
      return; 
    } 
    try { 
      const resData = await fetchWithFallback('/api/Config_aprendizaje/examenes/evaluar', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          id_examen: examenSeleccionadoId, 
          usuario_codigo: user.id, 
          respuestas: respuestasSeleccionadas 
        }) 
      }); 
 
      if (resData && resData.nota !== undefined) { 
        setResultadoNota(resData); 
        setQuizTerminado(true); 
        
        // El estado de actualización se envía exclusivamente arriba de forma silenciosa
        setMensajeActualizacion('✓ Actualizado OK'); 
        setTimeout(() => setMensajeActualizacion(''), 4000);

        // Cambiamos el progreso en memoria para no invocar cargarMenuLateral() y evitar parpadeos
        if (resData.nuevo_avance !== undefined) {
          setDatosCursoGlobal(prev => ({ ...prev, avance_curso: resData.nuevo_avance }));
        }
      } 
    } catch (error) { 
      toast.error("Error al registrar la calificación en el servidor"); 
    } 
  };
  // 5. REGISTRAR LECTURA COMPLETADA (SE CAMBIA EL TOAST POR ESTADO DE TEXTO EN BARRA SUPERIOR, SIN PARPADEO)
  const registrarTeoriaLeida = async () => { 
    if (quizTerminado) return; 
    try { 
      const resData = await fetchWithFallback('/api/Config_aprendizaje/examenes/completar-teoria', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id_examen: examenSeleccionadoId, usuario_codigo: user.id }) 
      }); 
      if (resData) { 
        setQuizTerminado(true); 
        
        setMensajeActualizacion('✓ Actualizado OK'); 
        setTimeout(() => setMensajeActualizacion(''), 4000); 

        // Actualizamos localmente el progreso matemático reduciendo las peticiones pesadas a la API
        if (resData.nuevo_avance !== undefined) {
          setDatosCursoGlobal(prev => ({ ...prev, avance_curso: resData.nuevo_avance }));
        }
      } 
    } catch (error) { 
      console.error("[ERROR TEORIA SILENCIOSO]", error); 
    } 
  }; 

  const handleScrollContenido = (e) => { 
    if (examenData?.tipo_contenido !== 'Teoria') return; 
    const target = e.target; 
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) { 
      registrarTeoriaLeida(); 
    } 
  }; 

  const handleOptionChange = (pId, oId) => { 
    setRespuestasSeleccionadas({ ...respuestasSeleccionadas, [pId]: oId }); 
  }; 

  // --- EFECTOS REPORTE DE REACTIVIDAD CONTRA LA CONFIGURACIÓN --- 
  useEffect(() => { 
    cargarCursosBD(); 
  }, []); 
 
  useEffect(() => { 
    cargarMenuLateral(); 
  }, [cursoSeleccionadoId]); 
 
  useEffect(() => { 
    const temaValido = datosCursoGlobal?.temas?.some(t => String(t.id) === String(examenSeleccionadoId)); 
    if (examenSeleccionadoId && temaValido) { 
      cargarExamen(examenSeleccionadoId); 
    } else { 
      setExamenData(null); 
      setLoadingExamen(false); 
    } 
  }, [examenSeleccionadoId, datosCursoGlobal.temas]); 
 
  useEffect(() => { 
    if (examenData?.tipo_contenido === 'Teoria' && !examenData?.estado_bloqueado) { 
      const timer = setTimeout(() => { registrarTeoriaLeida(); }, 3000); 
      return () => clearTimeout(timer); 
    } 
  }, [examenData]); 

  const porcentajeActual = datosCursoGlobal?.avance_curso ?? 0;
  return ( 
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f4f6f8' }}> 
 
      {/* BARRA SUPERIOR DE NAVEGACIÓN COMPLETA (LIMPIA Y LIBRE DE BANNERS INCÓMODOS DE INSPECCIÓN) */} 
      <header style={{ height: '50px', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #e0e0e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}> 
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}> 
          <span style={{ fontWeight: 'bold', color: '#333' }}>Portal de Aprendizaje</span> 
          <span style={{ color: '#666', fontSize: '14px' }}> 
            | {datosCursoGlobal?.nombre_curso} {datosCursoGlobal?.codigo_curso ? `(${datosCursoGlobal.codigo_curso})` : ''} 
            <strong style={{ color: '#7a9b17', marginLeft: '8px' }}>— Progreso: {porcentajeActual}%</strong> 
          </span>

          {/* MENSAJE DE ACTUALIZACIÓN INCORPORADO DIRECTAMENTE EN LA BARRA SUPERIOR BLANCA */}
          {mensajeActualizacion && (
            <span style={{ backgroundColor: '#e6f4ea', color: '#137333', fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '4px', marginLeft: '15px', border: '1px solid #c6f6d5' }}>
              {mensajeActualizacion}
            </span>
          )}
        </div> 
        <div style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>👤 {user.nombre}</div> 
      </header> 

      {/* CUERPO PRINCIPAL DEL TALLER */} 
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}> 
 
        {/* BARRA LATERAL IZQUIERDA (MENÚ DE CURSOS Y ESTRUCTURA SEGURO) */} 
        <aside style={{ width: '320px', backgroundColor: '#fff', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}> 
          <div style={{ padding: '15px 15px 10px 15px', borderBottom: '1px solid #eee', backgroundColor: '#fafafa' }}> 
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#777', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Curso Activo:</label> 
            <select 
              value={cursoSeleccionadoId || ''} 
              onChange={(e) => {
                const val = e.target.value;
                setCursoSeleccionadoId(val === '' ? null : (isNaN(val) ? val : parseInt(val)));
              }} 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', color: '#333', fontWeight: '500', cursor: 'pointer' }} 
            > 
              {listaCursosDropdown.map((c) => ( 
                <option key={c.id_curso} value={c.id_curso}> 
                  {c.nombre_curso} {String(c.id_curso) === String(cursoSeleccionadoId) ? `(${porcentajeActual}%)` : ''} 
                </option> 
              ))} 
            </select> 
          </div> 

          <div style={{ flex: 1, marginTop: '5px' }}> 
            <div 
              onClick={() => setModuloAbierto(!moduloAbierto)} 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', backgroundColor: '#eef3db', borderLeft: '4px solid #7a9b17', cursor: 'pointer' }} 
            > 
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4a6b10' }}>Estructura del Curso</span> 
              <span>{moduloAbierto ? '▲' : '▼'}</span> 
            </div> 
            
            {moduloAbierto && ( 
              <div style={{ display: 'flex', flexDirection: 'column' }}> 
                {loadingMenu ? ( 
                  <p style={{ padding: '10px 20px', fontSize: '12px', color: '#999' }}>Sincronizando módulos...</p> 
                ) : !datosCursoGlobal.temas || datosCursoGlobal.temas.length === 0 ? ( 
                  <p style={{ padding: '15px 20px', fontSize: '13px', color: '#777', fontStyle: 'italic' }}>No hay temas habilitados bajo este curso.</p> 
                ) : ( 
                  datosCursoGlobal.temas.map((item) => ( 
                    <div 
                      key={item.id} 
                      onClick={() => setExamenSeleccionadoId(item.id)} 
                      style={{ 
                        padding: '12px 20px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', 
                        backgroundColor: String(examenSeleccionadoId) === String(item.id) ? '#f4f7e6' : 'transparent', 
                        fontWeight: String(examenSeleccionadoId) === String(item.id) ? '600' : 'normal', 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                      }} 
                    > 
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> 
                        <span> 
                          {item.bloqueado ? '🔒' : item.tipo_contenido === 'Teoria' ? '📘' : '📝'} 
                        </span> 
                        <span> 
                          {item.titulo} 
                          {item.ultima_nota !== null && ( 
                            <span style={{ color: '#7a9b17', fontWeight: 'bold', marginLeft: '5px' }}>({item.ultima_nota}%)</span> 
                          )} 
                        </span> 
                      </div> 
                    </div> 
                  )) 
                )} 
              </div> 
            )} 
          </div> 
        </aside>
        {/* CONTENEDOR CENTRAL DE DESPLIEGUE MULTIMEDIA */} 
              {/* CONTENEDOR CENTRAL DE DESPLIEGUE MULTIMEDIA */} 
               {/* CONTENEDOR CENTRAL DE DESPLIEGUE MULTIMEDIA */} 
        <main onScroll={handleScrollContenido} style={{ flex: 1, backgroundColor: '#8ea2b3', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '30px' }}> 
          {loadingExamen ? ( 
            <div style={{ color: '#fff', textAlign: 'center', marginTop: '50px' }}>🔄 Descargando recursos y evaluaciones...</div> 
          ) : !examenData ? ( 
            <div style={{ color: '#fff', textAlign: 'center', marginTop: '50px' }}>Selecciona una lección del menú lateral para comenzar.</div> 
          ) : examenData?.estado_bloqueado ? ( 
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%' }}> 
              <div style={{ width: '100%', maxWidth: '450px', backgroundColor: '#fff', borderRadius: '8px', padding: '40px 30px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}> 
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>🔒</div> 
                <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '22px' }}>Contenido Bloqueado</h3> 
                <p style={{ color: '#666', fontSize: '14px' }}>Esta unidad se encuentra restringida por tu instructor o requiere completar los prerrequisitos anteriores.</p> 
              </div> 
            </div> 
          ) : ( 
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '30px', maxWidth: '900px', margin: '0 auto', width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '30px' }}> 
              
              <div> 
                <h2 style={{ color: '#7a9b17', marginTop: 0 }}>{examenData?.examen_titulo}</h2> 
                <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '15px 0' }} /> 
              </div> 
 
              {/* COMPONENTE DE MATERIAL TEÓRICO MULTI-TARJETA ULTRA REFORZADO */} 
              {examenData?.texto_leccion && ( 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', borderBottom: '2px dashed #e2e8f0', paddingBottom: '30px' }}> 
                  <h3 style={{ margin: 0, color: '#2d3748', fontSize: '17px' }}>📘 Material de Lectura Obligatorio</h3> 
                  
                  {/* 
                    Como el backend ya nos envía el texto unificado de ambas filas separado por '\n\n',
                    usamos .split() para fragmentarlo y renderizar de forma obligatoria CADA fila 
                    de la base de datos dentro de su propia tarjeta independiente.
                  */}
                  {examenData.texto_leccion
                    .split('\n\n')
                    .filter(parrafo => parrafo.trim().length > 0)
                    .map((textoBloque, idx) => (
                      <div key={idx} style={{ backgroundColor: '#fcfdfd', borderLeft: '4px solid #7a9b17', padding: '20px', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#333', whiteSpace: 'pre-line', margin: 0, textAlign: 'justify' }}>
                          {textoBloque}
                        </p>
                      </div>
                    ))
                  }
                </div> 
              )} 

              {/* RECURSOS MULTIMEDIA ADICIONALES */}
              {(examenData?.url_imagen || examenData?.url_video || examenData?.instrucciones_practica) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderBottom: '2px dashed #e2e8f0', paddingBottom: '30px' }}>
                  {examenData?.url_imagen && ( 
                    <div style={{ textAlign: 'center' }}><img src={examenData.url_imagen} alt="Visual Informativo" style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '6px' }} /></div> 
                  )} 
                  {examenData?.url_video && ( 
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '6px' }}> 
                      <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} src={examenData.url_video} title="Video Auxiliar" allowFullScreen></iframe> 
                    </div> 
                  )} 
                  {examenData?.instrucciones_practica && ( 
                    <div style={{ backgroundColor: '#f0f4f8', borderLeft: '5px solid #2b6cb0', padding: '20px', borderRadius: '4px' }}> 
                      <h4 style={{ margin: '0 0 10px 0', color: '#2b6cb0' }}>💻 Laboratorio Práctico</h4> 
                      <p style={{ margin: 0, fontSize: '14px', color: '#2d3748', whiteSpace: 'pre-line' }}>{examenData.instrucciones_practica}</p> 
                    </div> 
                  )}
                </div>
              )}

              {/* CUESTIONARIO DE PREGUNTAS Y EVALUACIÓN COMPLETA */} 
              {examenData?.preguntas_lista && examenData.preguntas_lista.length > 0 && ( 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}> 
                  <h3 style={{ margin: 0, color: '#2d3748', fontSize: '17px' }}>📝 Cuestionario de Evaluación</h3> 
                  {quizTerminado && resultadoNota && ( 
                    <div style={{ backgroundColor: '#eef3db', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #7a9b17' }}> 
                      <p style={{ margin: 0, color: '#333' }}>Calificación final: <strong>{resultadoNota.nota}%</strong> ({resultadoNota.aciertos} de {resultadoNota.total} correctas).</p> 
                    </div> 
                  )} 
                  {examenData.preguntas_lista.map((pregunta, index) => ( 
                    <div key={pregunta.id_pregunta} style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}> 
                      <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>{index + 1}. {pregunta.enunciado}</h4> 
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}> 
                        {pregunta.opciones?.map((opcion) => { 
                          const esSeleccionada = respuestasSeleccionadas[pregunta.id_pregunta] === opcion.id_opcion; 
                          let estiloFondo = 'transparent'; let estiloTexto = '#444'; let iconoValidacion = ''; 
                          if (quizTerminado) { 
                            if (opcion.es_correcta) { estiloFondo = '#e6f4ea'; estiloTexto = '#137333'; iconoValidacion = '  ✅ (Correcta)'; } 
                            else if (esSeleccionada && !opcion.es_correcta) { estiloFondo = '#fce8e6'; estiloTexto = '#c5221f'; iconoValidacion = '  ❌ (Tu elección)'; } 
                          } 
                          return ( 
                            <label key={opcion.id_opcion} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: estiloTexto, backgroundColor: estiloFondo, padding: quizTerminado ? '5px 10px' : '2px 0', borderRadius: '4px' }}> 
                              <input type="radio" name={`pregunta-${pregunta.id_pregunta}`} checked={esSeleccionada} onChange={() => handleOptionChange(pregunta.id_pregunta, opcion.id_opcion)} disabled={quizTerminado} /> 
                              <span>{opcion.texto_opcion}<strong>{iconoValidacion}</strong></span> 
                            </label> 
                          ); 
                        })} 
                      </div> 
                    </div> 
                  ))} 
                  <div style={{ textAlign: 'right' }}> 
                    {!quizTerminado ? ( 
                      <button onClick={enviarExamen} style={{ backgroundColor: '#7a9b17', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Enviar Respuestas</button> 
                    ) : ( 
                      <button onClick={() => { setQuizTerminado(false); setResultadoNota(null); setRespuestasSeleccionadas({}); }} style={{ backgroundColor: '#666', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '4px', cursor: 'pointer' }}>Reintentar Test</button> 
                    )} 
                  </div> 
                </div> 
              )} 
            </div> 
          )} 
        </main> 



      </div> 
    </div> 
  ); 
}; 

export default Taller;
