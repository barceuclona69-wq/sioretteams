import React, { useEffect, useState } from 'react';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';

const Config_aprendizaje = () => {
  // --- ESTADOS DE CONTROL DE PESTAÑAS Y FILTROS ---
  const [pestanaActiva, setPestanaActiva] = useState('cursos');
  const [loading, setLoading] = useState(true);
  const [cursoFiltroId, setCursoFiltroId] = useState('TODOS'); 

  // Estados de datos extraídos de SQL Server
  const [cursos, setCursos] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [preguntas, setPreguntas] = useState([]);
  const [opciones, setOpciones] = useState([]);
  const [intentos, setIntentos] = useState([]);
  const [teoria, setTeoria] = useState([]);

  // --- ESTADOS PARA MODALES DE ACCIÓN (CRUD) ---
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false); 
  const [idRegistroEditar, setIdRegistroEdicion] = useState(null);

  const [datosFormulario, setDatosFormulario] = useState({
    nombre_curso: '', codigo_curso: '', descripcion_curso: '',
    id_curso: '', id_examen: '', id_pregunta: '', titulo: '', modulo: '', 
    tiempo_limite_minutos: '30', tipo_contenido: 'Teoria', enunciado: '', 
    texto_opcion: '', es_correcta: false, texto_leccion: '', url_video: '', 
    url_imagen: '', instrucciones_practica: ''
  });

  // Configuración estructural para renderizar las grillas y formularios con nombres JOIN del backend
  const configuracionPestanas = [
    { id: 'cursos', etiqueta: '🗂️ Cursos', data: cursos, pk: 'id_curso', columnas: ['id_curso', 'nombre_curso', 'codigo_curso', 'descripcion_curso', 'estado_activo'] },
    { id: 'examenes', etiqueta: '📝 Exámenes / Módulos', data: examenes, pk: 'id_examen', columnas: ['id_examen', 'curso_relacionado', 'titulo', 'modulo', 'tipo_contenido', 'estado_bloqueado', 'tiempo_limite_minutos'] },
    { id: 'preguntas', etiqueta: '❓ Preguntas', data: preguntas, pk: 'id_pregunta', columnas: ['id_pregunta', 'modulo_o_examen', 'enunciado', 'tipo_pregunta'] },
    { id: 'opciones', etiqueta: '🔘 Opciones de Respuesta', data: opciones, pk: 'id_opcion', columnas: ['id_opcion', 'pregunta_asociada', 'texto_opcion', 'es_correcta'] },
    { id: 'contenido_teorico', etiqueta: '📄 Marcos Teóricos', data: teoria, pk: 'id_teoria', columnas: ['id_teoria', 'modulo_teorico', 'texto_leccion', 'url_video', 'url_imagen', 'instrucciones_practica'] },
    { id: 'intentos_examen', etiqueta: '📊 Historial Intentos', data: intentos, pk: 'id_intento', columnas: ['id_intento', 'actividad_evaluada', 'id_usuario', 'calificacion', 'completado', 'fecha_intento'] }
  ];


   // 1. CARGAR DATOS DESDE EL BACKEND EN CASCADA CON EL FILTRO SELECCIONADO
  const cargarDatosBD = async () => {
    setLoading(true);
    const mapearPeticion = async (endpoint, setEstado) => {
      try {
        const res = await fetchWithFallback(`/api/Config_aprendizaje/admin/${endpoint}?id_curso=${cursoFiltroId}`);
        if (res) {
          if (Array.isArray(res)) setEstado(res);
          else if (res.data && Array.isArray(res.data)) setEstado(res.data);
          else if (res.recordset && Array.isArray(res.recordset)) setEstado(res.recordset);
        }
      } catch (err) {
        console.warn(`⚠️ Tabla [${endpoint}] sin respuesta:`, err.message);
      }
    };

    await Promise.all([
      mapearPeticion('cursos', setCursos),
      mapearPeticion('examenes', setExamenes),
      mapearPeticion('preguntas', setPreguntas),
      mapearPeticion('opciones', setOpciones),
      mapearPeticion('teoria', setTeoria),
      mapearPeticion('intentos', setIntentos)
    ]);
    setLoading(false);
  };

  useEffect(() => {
    cargarDatosBD();
  }, [cursoFiltroId]); 

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDatosFormulario({ ...datosFormulario, [name]: type === 'checkbox' ? checked : value });
  };

  // 2. ABRIR MODAL EN MODO EDICIÓN PRE-CARGANDO LOS DATOS DE LA FILA
  const prepararEdicion = (fila, pkName) => {
    setModoEdicion(true);
    setIdRegistroEdicion(fila[pkName]);
    setDatosFormulario({ ...datosFormulario, ...fila });
    setModalAbierto(true);
  };

  // 3. GUARDAR DINÁMICAMENTE (CREAR O EDITAR)
  const guardarRegistroDinamico = async (e) => {
    e.preventDefault();
    let subRuta = pestanaActiva === 'contenido_teorico' ? 'teoria' : pestanaActiva === 'opciones' ? 'opciones' : pestanaActiva;
    
    let urlEndpoint = modoEdicion 
      ? `/api/Config_aprendizaje/admin/${subRuta}/editar`
      : `/api/Config_aprendizaje/admin/${subRuta}`;
    
    const cuerpoPeticion = modoEdicion 
      ? { ...datosFormulario, id_registro: idRegistroEditar }
      : datosFormulario;

    try {
      const res = await fetchWithFallback(urlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoPeticion)
      });

      if (res) {
        toast.success(modoEdicion ? "Registro actualizado con éxito" : "Registro creado con éxito");
        setModalAbierto(false);
        setModoEdicion(false);
        setDatosFormulario({ ...datosFormulario, nombre_curso: '', codigo_curso: '', titulo: '', modulo: '', enunciado: '', texto_opcion: '', texto_leccion: '' });
        cargarDatosBD(); 
      }
    } catch (error) {
      toast.error("Error al procesar la operación en el servidor");
    }
  };

  // 4. ANULAR O ACTIVAR LÓGICAMENTE UN REGISTRO (SWITCH DE ESTADO)
  const alternarAnulacionLogica = async (id, pkName, estadoActual) => {
    let subRuta = pestanaActiva === 'contenido_teorico' ? 'teoria' : pestanaActiva === 'opciones' ? 'opciones' : pestanaActiva;
    try {
      const res = await fetchWithFallback(`/api/Config_aprendizaje/admin/${subRuta}/anular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_registro: id, campo_pk: pkName, nuevo_estado: estadoActual ? 0 : 1 })
      });
      if (res) {
        toast.success("Estado del registro actualizado");
        cargarDatosBD();
      }
    } catch (error) {
      toast.error("No se pudo cambiar el estado del registro");
    }
  };

  // 5. ELIMINACIÓN SUAVE MEDIANTE ESTADO VISUAL (estadovisual = 0)
  const eliminarRegistroVisual = async (id, pkName) => {
    if (!window.confirm("¿Está completamente seguro de que desea eliminar este registro de la vista?")) return;
    
    let subRuta = pestanaActiva === 'contenido_teorico' ? 'teoria' : pestanaActiva === 'opciones' ? 'opciones' : pestanaActiva;
    try {
      const res = await fetchWithFallback(`/api/Config_aprendizaje/admin/${subRuta}/eliminar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_registro: id, campo_pk: pkName })
      });
      if (res) {
        toast.success("Registro eliminado correctamente");
        cargarDatosBD(); 
      }
    } catch (error) {
      toast.error("No se pudo procesar la eliminación lógica");
    }
  };

  const pestañaSeleccionada = configuracionPestanas.find(p => p.id === pestanaActiva);

  return (
    <div style={{ padding: '30px', fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      
      {/* HEADER DE CONTROL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: '#ffffff', padding: '15px 25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div>
          <h2 style={{ color: '#7a9b17', margin: 0, fontSize: '22px' }}>Consola Integral de Aprendizaje</h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '13px' }}>Filtro relacional estricto en cascada por curso activo conectado a SQL Server.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* FILTRO GENERAL POR CURSO */}
          <div style={{ textAlign: 'right' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#777', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Filtrar Datos Por Curso:</label>
            <select value={cursoFiltroId} onChange={(e) => setCursoFiltroId(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', fontWeight: '500', cursor: 'pointer', backgroundColor: '#fdfdfd' }}>
              <option value="TODOS">🌍 Mostrar Todos los Cursos</option>
              {cursos.map(c => <option key={c.id_curso} value={c.id_curso}>📘 {c.nombre_curso}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '5px', marginTop: '14px' }}>
            <button onClick={() => { setModoEdicion(false); setModalAbierto(true); }} style={{ backgroundColor: '#7a9b17', color: '#fff', border: 'none', padding: '9px 15px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
              ➕ Crear Nuevo
            </button>
            <button onClick={cargarDatosBD} style={{ backgroundColor: '#fff', color: '#333', border: '1px solid #ccc', padding: '9px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
              🔄 Sincronizar
            </button>
          </div>
        </div>
      </div>

      {/* PESTAÑAS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
        {configuracionPestanas.map((pestana) => (
          <button key={pestana.id} onClick={() => setPestanaActiva(pestana.id)} style={{ padding: '12px 18px', borderRadius: '6px', border: '1px solid', borderColor: pestanaActiva === pestana.id ? '#7a9b17' : '#e2e8f0', backgroundColor: pestanaActiva === pestana.id ? '#7a9b17' : '#ffffff', color: pestanaActiva === pestana.id ? '#ffffff' : '#4a5568', fontWeight: '600', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {pestana.etiqueta} ({pestana.data?.length || 0})
          </button>
        ))}
      </div>

      {/* TABLA DE RESULTADOS EN REJILLA */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '8px' }}>Filtrando registros en SQL Server...</div>
      ) : !pestañaSeleccionada.data || pestañaSeleccionada.data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '8px', color: '#777', fontStyle: 'italic' }}>No se encontraron registros para esta sección bajo el curso seleccionado.</div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', overflowX: 'auto', padding: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #7a9b17' }}>
                {pestañaSeleccionada.columnas.map((col) => <th key={col} style={{ padding: '12px 15px', fontWeight: '600', textTransform: 'uppercase', color: '#4a5568' }}>{col.replace(/_/g, ' ')}</th>)}
                <th style={{ padding: '12px 15px', fontWeight: '600', textTransform: 'uppercase', color: '#4a5568', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pestañaSeleccionada.data.map((fila, i) => {
                const estaAnulado = fila.estado_activo === false || fila.estado_bloqueado === true;
                
                // 🎯 ESTILO REQUERIDO POR ESTADO: Verde suave activo, Rojo suave bloqueado/anulado
                let colorFondoFila = estaAnulado ? '#fed7d7' : '#c6f6d5';

                return (
                  <tr key={i} style={{ borderBottom: '1px solid #edf2f7', backgroundColor: colorFondoFila, transition: 'background-color 0.2s ease' }}>
                    {pestañaSeleccionada.columnas.map((col) => {
                      const val = fila[col];
                      let texto = String(val ?? '');
                      if (typeof val === 'boolean') texto = val ? '✅ Activo / Sí' : '❌ Bloqueado / No';
                      else if (col.includes('fecha') && val) texto = new Date(val).toLocaleString();
                      return <td key={col} style={{ padding: '12px 15px', color: '#2d3748', fontWeight: '500', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={texto}>{texto}</td>;
                    })}
                    
                    {/* BOTONES INTERACTIVOS DE ACCIÓN CON BORRADO LOGICO */}
                    <td style={{ padding: '12px 15px', textAlign: 'center', whiteSpace: 'nowrap', display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      {pestanaActiva !== 'intentos_examen' && (
                        <>
                          <button onClick={() => prepararEdicion(fila, pestañaSeleccionada.pk)} style={{ padding: '5px 12px', backgroundColor: '#ffffff', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', color: '#4a5568' }}>📝 Editar</button>
                          <button onClick={() => alternarAnulacionLogica(fila[pestañaSeleccionada.pk], pestañaSeleccionada.pk, fila.estado_activo ?? !fila.estado_bloqueado)} style={{ padding: '5px 12px', backgroundColor: estaAnulado ? '#2f855a' : '#c53030', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                            {estaAnulado ? '🟢 Activar' : '🚫 Bloquear'}
                          </button>
                          <button onClick={() => eliminarRegistroVisual(fila[pestañaSeleccionada.pk], pestañaSeleccionada.pk)} style={{ padding: '5px 12px', backgroundColor: '#4a5568', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                            🗑️ Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE ALTAS / EDICIÓN */}
      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form onSubmit={guardarRegistroDinamico} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '25px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>{modoEdicion ? '✏️ Modificar' : '➕ Registrar'} en <span style={{ color: '#7a9b17', textTransform: 'uppercase' }}>{pestanaActiva}</span></h3>
            <hr style={{ border: 0, borderTop: '1px solid #eee', margin: 0 }} />

            {pestanaActiva === 'cursos' && (
              <>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Nombre del Curso:</label>
                <input type="text" name="nombre_curso" required value={datosFormulario.nombre_curso} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Código Único:</label>
                <input type="text" name="codigo_curso" required disabled={modoEdicion} value={datosFormulario.codigo_curso} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: modoEdicion ? '#f7fafc' : '#fff' }} />
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Descripción:</label>
                <textarea name="descripcion_curso" value={datosFormulario.descripcion_curso} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '60px' }} />
              </>
            )}

            {pestanaActiva === 'examenes' && (
              <>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Curso Destino:</label>
                <select name="id_curso" required value={datosFormulario.id_curso} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Seleccionar --</option>
                  {cursos.map(c => <option key={c.id_curso} value={c.id_curso}>{c.nombre_curso}</option>)}
                </select>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Título de la Actividad:</label>
                <input type="text" name="titulo" required value={datosFormulario.titulo} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Nombre del Módulo:</label>
                <input type="text" name="modulo" required value={datosFormulario.modulo} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Tipo de Contenido:</label>
                <select name="tipo_contenido" value={datosFormulario.tipo_contenido} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}><option value="Teoria">Teoria</option><option value="Examen">Examen</option></select>
              </>
            )}

            {pestanaActiva === 'preguntas' && (
              <>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Módulo Asociado:</label>
                <select name="id_examen" required value={datosFormulario.id_examen} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Seleccionar --</option>
                  {examenes.map(e => <option key={e.id_examen} value={e.id_examen}>{e.titulo}</option>)}
                </select>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Enunciado de la Pregunta:</label>
                <textarea name="enunciado" required value={datosFormulario.enunciado} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '60px' }} />
              </>
            )}

            {pestanaActiva === 'opciones' && (
              <>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Pregunta Destino:</label>
                <select name="id_pregunta" required value={datosFormulario.id_pregunta} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Seleccionar --</option>
                  {preguntas.map(p => <option key={p.id_pregunta} value={p.id_pregunta}>{p.enunciado}</option>)}
                </select>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Texto de la Respuesta:</label>
                <input type="text" name="texto_opcion" required value={datosFormulario.texto_opcion} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" name="es_correcta" checked={datosFormulario.es_correcta} onChange={handleInputChange} /> ¿Es la correcta?
                </label>
              </>
            )}

            {pestanaActiva === 'contenido_teorico' && (
              <>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Módulo Teórico Destino:</label>
                <select name="id_examen" required value={datosFormulario.id_examen} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Seleccionar --</option>
                  {examenes.filter(ex => ex.tipo_contenido === 'Teoria').map(e => <option key={e.id_examen} value={e.id_examen}>{e.titulo}</option>)}
                </select>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Texto de la Lección:</label>
                <textarea name="texto_leccion" required value={datosFormulario.texto_leccion} onChange={handleInputChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }} />
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => { setModalAbierto(false); setModoEdicion(false); }} style={{ padding: '8px 15px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '8px 18px', borderRadius: '4px', border: 'none', backgroundColor: '#7a9b17', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                {modoEdicion ? 'Actualizar Cambios' : 'Guardar Registro'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Config_aprendizaje;