import React, { useEffect, useState } from 'react';
import { fetchWithFallback,API_BASE_URL } from '../../config'; 
import { toast } from 'sonner';
// 🌟 Agrega API_BASE_URL dentro de las llaves en tus importaciones superiores



const coloresEstados = {
  'Pendiente': { bg: '#fef3c7', text: '#d97706' },
  'Autorizado': { bg: '#d1fae5', text: '#059669' },
  'Rechazado': { bg: '#fee2e2', text: '#dc2626' },
  'Anulado': { bg: '#f3f4f6', text: '#4b5563' }
};
const Permnisos = () => {


  // 1. Estados Simples e Independientes
  const [tiposPermisos, setTiposPermisos] = useState([]); 
  const [archivoAdjunto, setArchivoAdjunto] = useState(null);
  const [data, setData] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [esEdicion, setEsEdicion] = useState(false); 

  // Estados para controlar el visor de PDF en el Modal
const [modalPdfOpen, setModalPdfOpen] = useState(false);
const [pdfUrlSeleccionado, setPdfUrlSeleccionado] = useState('');


  // 2. Sesión del Usuario
  const [user, setUser] = useState(() => { 
    const savedUser = localStorage.getItem("userData"); 
    const parsed = savedUser ? JSON.parse(savedUser) : { id: null, nombre: 'Usuario', idperfil: null, departamento: '', id_empresa: '' ,id_dartis: null}; 
    return { 
      ...parsed,
      empresasAutorizadas: parsed.id_empresa ? String(parsed.id_empresa).split(',').map(s => s.trim()) : [], 
      deptosAutorizados: parsed.departamento ? String(parsed.departamento).split(',').map(s => s.trim()) : [] 
    }; 
  }); 

  // 3. Estado del Formulario Principal
  const [form, setForm] = useState({ 
    SolicitudID: null, 
    TipoPermisoID: '', 
    FechaInicio: '', 
    FechaFin: '', 
    Motivo: '',
    ModalidadPermiso: 'Día Completo',
    PermisoHoraDesde: '',
    PermisoHoraHasta: '',
    MetodoRecuperacion: '',
    RecuperacionFechaDesde: '',
    RecuperacionFechaHasta: '',
    RecuperacionHoraDesde: '',
    RecuperacionHoraHasta: '',
    RecuperacionObservacion: ''
  }); 

  // 4. 🌟 CALCULOS DERIVADOS: Deben ir estrictamente AQUÍ, abajo de todos los estados para que 'tiposPermisos' y 'form' existan antes de ser leídos
  const permisoActual = tiposPermisos.find(t => String(t.TipoPermisoID) === String(form.TipoPermisoID));
  const esJustificanteObligatorio = permisoActual?.RequiereJustificante === 1 || permisoActual?.RequiereJustificante === true;

  // --- De aquí para abajo continúan tus funciones obtenerData(), guardarSolicitud(), etc. ---


  // 1. RECUPERAR DATOS (GET)
  // 1. RECUPERAR DATOS (GET) adaptada a fetchWithFallback
  const obtenerData = async () => {
    if (!user || !user.id_dartis) return; // Validación preventiva si no hay sesión activa
    
    try {
      setLoading(true);
      const endpoint = `/api/RRHH/Solicitudes_permiso_todos?EmpleadoID=${user.id_dartis}`;
      
      // fetchWithFallback ya resuelve el .json() internamente
      const respuesta = await fetchWithFallback(endpoint);
      
      if (respuesta) {
        setData(respuesta);
      }
    } catch (error) {
      console.error("❌ Error al procesar la petición:", error.message);
      toast.error('No se pudieron cargar las solicitudes de permisos');
    } finally {
      setLoading(false);
    }
  };




// Cargar los tipos de permisos desde el backend al montar el componente
useEffect(() => {
  const obtenerTiposPermisos = async () => {
    try {
      const respuesta = await fetchWithFallback('/api/RRHH/motivos_permiso');
      if (respuesta && Array.isArray(respuesta)) {
        setTiposPermisos(respuesta);
      }
    } catch (error) {
      console.error("❌ Error al cargar tipos de permisos:", error.message);
    }
  };

  obtenerTiposPermisos();
}, []);


  useEffect(() => {
    obtenerData();
  }, [user.id_dartis]);

 
  // 2. CREAR O EDITAR SOLICITUD (POST / PUT) adaptada a fetchWithFallback
const guardarSolicitud = async (e) => { 
  e.preventDefault(); 
 
  if (!user || !user.id_dartis) { 
    toast.error('No hay una sesión de usuario válida.'); 
    return; 
  } 
  if (new Date(form.FechaFin) < new Date(form.FechaInicio)) { 
    toast.error('La fecha hasta no puede ser menor que la fecha desde.'); 
    return; 
  } 

  // VALIDACIÓN OBLIGATORIA: Detener el envío si el permiso exige PDF y no se ha cargado ninguno
  if (esJustificanteObligatorio && !archivoAdjunto && !esEdicion) {
    toast.error('Este tipo de permiso requiere que adjuntes un justificante (PDF) obligatoriamente.');
    return;
  }

  try { 
    setLoading(true); 
    
    // 🌟 Creamos el contenedor FormData
    const formData = new FormData();
    formData.append('EmpleadoID', user.id_dartis); 
    formData.append('TipoPermisoID', parseInt(form.TipoPermisoID)); 
    formData.append('FechaInicio', form.FechaInicio); 
    formData.append('FechaFin', form.FechaFin); 
    formData.append('Motivo', form.Motivo); 
    formData.append('UsuarioLogueado', user.nombre);
    formData.append('ModalidadPermiso', form.ModalidadPermiso || 'Día Completo');
    formData.append('PermisoHoraDesde', form.ModalidadPermiso === 'Horas' ? form.PermisoHoraDesde : '');
    formData.append('PermisoHoraHasta', form.ModalidadPermiso === 'Horas' ? form.PermisoHoraHasta : '');
    formData.append('MetodoRecuperacion', form.MetodoRecuperacion || 'No Aplica');
    formData.append('RecuperacionFechaDesde', form.RecuperacionFechaDesde || '');
    formData.append('RecuperacionFechaHasta', form.RecuperacionFechaHasta || '');
    formData.append('RecuperacionHoraDesde', form.RecuperacionHoraDesde || '');
    formData.append('RecuperacionHoraHasta', form.RecuperacionHoraHasta || '');
    formData.append('RecuperacionObservacion', form.RecuperacionObservacion || '');
    
    // 🌟 Si el usuario seleccionó un archivo físico, lo adjuntamos al paquete
    if (archivoAdjunto) {
      formData.append('archivo', archivoAdjunto);
    }

    const endpoint = esEdicion 
      ? `/api/RRHH/Solicitudes_permiso/${form.SolicitudID}` 
      : '/api/RRHH/Solicitudes_permiso'; 
 
    // NOTA IMPORTANTE: Al enviar un FormData a través de fetch, NUNCA debes definir 
    // el 'Content-Type' en los headers manualmente. El navegador se encarga de estructurarlo automáticamente.
    await fetchWithFallback(endpoint, { 
      method: esEdicion ? 'PUT' : 'POST', 
      body: formData
    }); 

    toast.success(esEdicion ? "Solicitud actualizada correctamente" : "Solicitud enviada con éxito"); 
    
    // Limpiamos el selector de archivo físico
    setArchivoAdjunto(null);
    resetForm(); 
    obtenerData(); 
 
  } catch (error) { 
    console.error("❌ Error al procesar la petición:", error.message); 
    toast.error(esEdicion ? 'No se pudo actualizar la solicitud' : 'No se pudo guardar la solicitud'); 
  } finally { 
    setLoading(false); 
  } 
};




  // 3. ANULAR SOLICITUD (PATCH) adaptada a fetchWithFallback
  const anularSolicitud = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas anular esta solicitud?")) return;
    
    try {
      setLoading(true);
      const endpoint = `/api/RRHH/Solicitudes_permiso/anular/${id}`;
      
      // Enviamos la petición PATCH con su respectivo cuerpo de auditoría a través de tu utilitario
      await fetchWithFallback(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ UsuarioLogueado: user.nombre })
      });

      // fetchWithFallback ya resolvió la respuesta; si no saltó al catch, el proceso fue exitoso
      toast.success("Solicitud anulada con éxito");
      obtenerData(); // Recarga el listado histórico de permisos en tu interfaz
      
    } catch (err) {
      console.error("❌ Error al anular solicitud:", err.message);
      toast.error("Error al anular: " + err.message);
    } finally {
      setLoading(false);
    }
  };

const seleccionarParaEditar = (sol) => {
  if (sol.Estado !== 'Pendiente') {
    toast.error("Solo se pueden editar solicitudes en estado 'Pendiente'");
    return;
  }
  setForm({
    SolicitudID: sol.SolicitudID,
    TipoPermisoID: sol.TipoPermisoID,
    FechaInicio: sol.FechaInicio,
    FechaFin: sol.FechaFin,
    Motivo: sol.Motivo,
    ModalidadPermiso: sol.ModalidadPermiso || 'Día Completo',
    PermisoHoraDesde: sol.PermisoHoraDesde || '',
    PermisoHoraHasta: sol.PermisoHoraHasta || '',
    MetodoRecuperacion: sol.MetodoRecuperacion || '',
    RecuperacionFechaDesde: sol.RecuperacionFechaDesde || '',
    RecuperacionFechaHasta: sol.RecuperacionFechaHasta || '',
    RecuperacionHoraDesde: sol.RecuperacionHoraDesde || '',
    RecuperacionHoraHasta: sol.RecuperacionHoraHasta || '',
    RecuperacionObservacion: sol.RecuperacionObservacion || ''
  });
  setEsEdicion(true);
};


const resetForm = () => {
  setForm({ 
    SolicitudID: null, TipoPermisoID: '', FechaInicio: '', FechaFin: '', Motivo: '',
    ModalidadPermiso: 'Día Completo', PermisoHoraDesde: '', PermisoHoraHasta: '',
    MetodoRecuperacion: '', RecuperacionFechaDesde: '', RecuperacionFechaHasta: '',
    RecuperacionHoraDesde: '', RecuperacionHoraHasta: '', RecuperacionObservacion: '' 
  });
  setArchivoAdjunto(null); // 🌟 Limpia el archivo de la memoria de la UI
  setEsEdicion(false);
};


  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Encabezado con logos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#ffffffff', padding: '10px 20px', borderRadius: '8px' }}>
        <h2 style={{ color: '#7a9b17ff', margin: 0 }}>Módulo de Gestión de Permisos</h2>
        <span style={{ fontSize: '14px', color: '#4b5563' }}>Usuario: <strong>{user.nombre}</strong></span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'stretch', width: '100%', flexWrap: 'wrap' }}>
        {/* SECCIÓN IZQUIERDA: FORMULARIO */}
        <div style={{ flex: '0.8 1 350px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#374151' }}>
            {esEdicion ? '📝 Editar Solicitud' : '➕ Nueva Solicitud'}
          </h3>
         
<form onSubmit={guardarSolicitud} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
  {/* 1. TIPO DE PERMISO (MÉDICO, ASUNTOS PERSONALES, ETC.) */}
  <div>
    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>Tipo de Permiso</label>
    <select 
      value={form.TipoPermisoID} 
      onChange={(e) => setForm({...form, TipoPermisoID: e.target.value})} 
      required 
      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
    >
      <option value="">Seleccione una opción...</option>
      {tiposPermisos.map((tipo) => (
        <option key={tipo.TipoPermisoID} value={tipo.TipoPermisoID}>
          {tipo.Nombre}
        </option>
      ))}
    </select>
  </div>

{/* 📄 CAMPO DE ARCHIVO CONDICIONADO DINÁMICAMENTE */}
{esJustificanteObligatorio && (
  <div style={{ marginTop: '5px' }}>
    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>
      Documento Justificante (PDF) <span style={{ color: '#ef4444', fontWeight: 'bold' }}>* Obligatorio</span>
    </label>
    <input 
      type="file" 
      accept=".pdf"
      onChange={(e) => setArchivoAdjunto(e.target.files && e.target.files.length > 0 ? e.target.files[0] : null)}
      required={!esEdicion} // Obligatorio solo al crear una nueva solicitud
      style={{ 
        width: '100%', 
        padding: '10px', 
        borderRadius: '6px', 
        border: !archivoAdjunto ? '2px dashed #ef4444' : '1px solid #d1d5db',
        backgroundColor: !archivoAdjunto ? '#fef2f2' : '#ffffff',
        outline: 'none'
      }} 
    />
  </div>
)}



  {/* 🌟 2. NUEVO: ¿EL PERMISO ES POR DÍA COMPLETO O POR HORAS? */}
  <div>
    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>Modalidad del Permiso</label>
    <select 
      value={form.ModalidadPermiso || ''} 
      onChange={(e) => setForm({...form, ModalidadPermiso: e.target.value})} 
      required 
      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
    >
      <option value="">Seleccione la modalidad...</option>
      <option value="Día Completo">Día Completo</option>
      <option value="Horas">Por Horas</option>
    </select>
  </div>

  {/* 3. FILA DE FECHAS DEL PERMISO */}
  <div style={{ display: 'flex', gap: '10px' }}>
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>Fecha Desde</label>
      <input type="date" value={form.FechaInicio} onChange={(e) => setForm({...form, FechaInicio: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
    </div>
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>Fecha Hasta</label>
      <input type="date" value={form.FechaFin} onChange={(e) => setForm({...form, FechaFin: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
    </div>
  </div>

  {/* 🌟 4. NUEVO: CAMPOS DE HORAS CONDICIONALES PARA EL PERMISO PRINCIPAL */}
  {form.ModalidadPermiso === 'Horas' && (
    <div style={{ display: 'flex', gap: '10px', backgroundColor: '#f0f4f8', padding: '12px', borderRadius: '6px', border: '1px solid #dbe2e9' }}>
      <div style={{ flex: 1 }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#334155', fontWeight: '500' }}>⏱️ Hora Permiso Desde</label>
        <input 
          type="time" 
          value={form.PermisoHoraDesde || ''} 
          onChange={(e) => setForm({...form, PermisoHoraDesde: e.target.value})} 
          required 
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
        />
      </div>
      <div style={{ flex: 1 }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#334155', fontWeight: '500' }}>⏱️ Hora Permiso Hasta</label>
        <input 
          type="time" 
          value={form.PermisoHoraHasta || ''} 
          onChange={(e) => setForm({...form, PermisoHoraHasta: e.target.value})} 
          required 
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
        />
      </div>
    </div>
  )}

  {/* 5. MOTIVO */}
  <div>
    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>Motivo / Justificación</label>
    <textarea rows="4" value={form.Motivo} onChange={(e) => setForm({...form, Motivo: e.target.value})} required placeholder="Describa la razón del permiso..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }}></textarea>
  </div>

  {/* 6. DESPLEGABLE MÉTODO DE RECUPERACIÓN */}
  <div>
    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>Método de Recuperación</label>
    <select 
      value={form.MetodoRecuperacion} 
      onChange={(e) => setForm({...form, MetodoRecuperacion: e.target.value})} 
      required 
      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
    >
      <option value="">Seleccione el método...</option>
      <option value="Día Completo">Día Completo</option>
      <option value="Horas">Por Horas</option>
      <option value="No Aplica">No Aplica / No Recuperable</option>
    </select>
  </div>

  {/* 7. CONTENEDOR DE RECUPERACIÓN CONDICIONAL */}
  {form.MetodoRecuperacion && form.MetodoRecuperacion !== 'No Aplica' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#4b5563' }}>Fecha Recuperación Desde</label>
          <input type="date" value={form.RecuperacionFechaDesde} onChange={(e) => setForm({...form, RecuperacionFechaDesde: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#4b5563' }}>Fecha Recuperación Hasta</label>
          <input type="date" value={form.RecuperacionFechaHasta} onChange={(e) => setForm({...form, RecuperacionFechaHasta: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#4b5563' }}>Hora Desde</label>
          <input type="time" value={form.RecuperacionHoraDesde} onChange={(e) => setForm({...form, RecuperacionHoraDesde: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#4b5563' }}>Hora Hasta</label>
          <input type="time" value={form.RecuperacionHoraHasta} onChange={(e) => setForm({...form, RecuperacionHoraHasta: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#4b5563' }}>Observaciones de la recuperación</label>
        <input type="text" placeholder="Ej: Se compensarán las horas del permiso de la mañana..." value={form.RecuperacionObservacion} onChange={(e) => setForm({...form, RecuperacionObservacion: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
      </div>
    </div>
  )}

  {/* 8. BOTONES DE ACCIÓN */}
  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
    <button type="submit" style={{ flex: 1, backgroundColor: '#7a9b17ff', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
      {esEdicion ? 'Actualizar Solicitud' : 'Enviar Solicitud'}
    </button>
    {esEdicion && (
      <button type="button" onClick={resetForm} style={{ backgroundColor: '#9ca3af', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
    )}
  </div>
</form>





        </div>
        {/* SECCIÓN DERECHA: HISTORIAL */}
        <div style={{ flex: '1.4 1 450px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#374151' }}>📋 Historial de Solicitudes</h3>
         

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {loading ? (
                      <p>Cargando historial...</p>
                    ) : data.map((sol) => (
                      <div key={sol.SolicitudID} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       

<div>
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
    <span style={{ fontWeight: 'bold', color: '#374151' }}>{sol.TipoPermiso}</span>
    
    {/* ⏱️ NUEVA ETIQUETA DE MODALIDAD (DÍA COMPLETO / HORAS) */}
    <span style={{ 
      fontSize: '11px', 
      padding: '1px 6px', 
      borderRadius: '4px', 
      fontWeight: '500', 
      backgroundColor: sol.ModalidadPermiso === 'Horas' ? '#e0f2fe' : '#f1f5f9', 
      color: sol.ModalidadPermiso === 'Horas' ? '#0369a1' : '#475569' 
    }}>
      {sol.ModalidadPermiso || 'Día Completo'}
    </span>


{/* 🌟 BOTÓN DINÁMICO PARA LEER EL PDF DIRECTAMENTE DESDE EL SERVIDOR */}
{/* 🌟 BOTÓN ACTUALIZADO PARA ABRIR EL MODAL */}


{sol.url_archivo && (
  <div style={{ marginTop: '10px' }}>
    {/* 🌟 SI EL LINK TIENE ANEXADO EL /:f:/ SIGNIFICA QUE ES UNA CARPETA DE SHAREPOINT */}
    {sol.url_archivo.includes('/:f:/') || sol.url_archivo.includes('shared?listurl') ? (
      <a 
        href={sol.url_archivo}
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: '#0078d4', // Azul corporativo Microsoft
          color: '#ffffff',
          textDecoration: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          boxShadow: '0 2px 4px rgba(0, 120, 212, 0.15)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005a9e'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0078d4'}
      >
        ☁️ Abrir Carpeta de Respaldos (SharePoint)
      </a>
    ) : (
      // Si es un archivo incrustable (local o embed.aspx), abrimos tu modal centrado habitual
      <button 
        type="button"
        onClick={() => {
          const urlFinal = sol.url_archivo.startsWith('http') 
            ? sol.url_archivo 
            : `${API_BASE_URL}${sol.url_archivo}`;
          
          setPdfUrlSeleccionado(urlFinal);
          setModalPdfOpen(true);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: '#dc2626',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(220, 38, 38, 0.15)'
        }}
      >
        📄 Ver Justificante
      </button>
    )}
  </div>
)}



    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: '600', backgroundColor: coloresEstados[sol.Estado]?.bg || '#f3f4f6', color: coloresEstados[sol.Estado]?.text || '#1f2937' }}>{sol.Estado}</span>
  </div>

            <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#6b7280' }}>
              📅 <strong>Periodo:</strong> {sol.FechaInicio} al {sol.FechaFin}
              {/* ⏱️ RANGO DE HORAS DEL PERMISO PRINCIPAL (SI APLICA) */}
              {sol.ModalidadPermiso === 'Horas' && sol.PermisoHoraDesde && sol.PermisoHoraHasta && (
                <span style={{ color: '#0284c7', fontWeight: '600', marginLeft: '6px' }}>
                  (⏱️ {sol.PermisoHoraDesde} - {sol.PermisoHoraHasta})
                </span>
              )}
            </p>

            <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#4b5563' }}>📝 {sol.Motivo}</p>

            {/* 🔄 SECCIÓN DE RECUPERACIÓN VISIBLE EN EL HISTORIAL */}
            {sol.MetodoRecuperacion && sol.MetodoRecuperacion !== 'No Aplica' && (
              <div style={{ 
                margin: '8px 0 0 0', 
                fontSize: '12px', 
                backgroundColor: '#f0fdf4', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                borderLeft: '3px solid #16a34a',
                color: '#14532d'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                  🔄 Recuperación ({sol.MetodoRecuperacion})
                </div>
                <div>
                  <strong>Periodo:</strong> {sol.RecuperacionFechaDesde} al {sol.RecuperacionFechaHasta}
                </div>
                <div>
                  <strong>Horario:</strong> {sol.RecuperacionHoraDesde} - {sol.RecuperacionHoraHasta}
                </div>
                {sol.RecuperacionObservacion && (
                  <div style={{ fontStyle: 'italic', marginTop: '2px', color: '#166534' }}>
                    "{sol.RecuperacionObservacion}"
                  </div>
                )}
              </div>
            )}

           {sol.ComentariosAdmin && (
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#dc2626', backgroundColor: '#fef2f2', padding: '6px', borderRadius: '4px', borderLeft: '3px solid #dc2626' }}>
                  <strong>Nota RRHH:</strong> {sol.ComentariosAdmin}
                </p>
              )}

              {/* OBSERVACIÓN DE RECHAZO (Visible cuando existe o el estado es Rechazado) */}
              {sol.observacion_rechazo && (
                <div
                  style={{
                    margin: '8px 0 0 0',
                    fontSize: '12.5px',
                    color: '#991b1b',
                    backgroundColor: '#fef2f2',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    borderLeft: '4px solid #dc2626'
                  }}
                >
                  <strong>❌ Motivo de Rechazo:</strong> {sol.observacion_rechazo}
                </div>
              )}

          </div>


                        <div style={{ display: 'flex', gap: '5px' }}>
                          {sol.Estado === 'Pendiente' && (
                            <>
                              <button onClick={() => seleccionarParaEditar(sol)} style={{ padding: '6px 10px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Editar</button>
                              <button onClick={() => anularSolicitud(sol.SolicitudID)} style={{ padding: '6px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Anular</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {!loading && data.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>No registras solicitudes actualmente.</p>}
                  </div>



{/* 🌟 MODAL FLOTANTE COMPLETAMENTE CENTRADO PARA VISUALIZAR EL PDF */}
{modalPdfOpen && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    justifyContent: 'center', 
    alignItems: 'center',     
    zIndex: 9999,             
    padding: '20px',
    backdropFilter: 'blur(3px)' 
  }}>
    <div style={{
      backgroundColor: '#ffffff',
      width: '90%',
      maxWidth: '950px',
      height: '85vh',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      overflow: 'hidden'
    }}>
      {/* Cabecera del Modal */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '15px 20px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc'
      }}>
        <h4 style={{ margin: 0, color: '#1e293b', fontWeight: '600', fontSize: '1rem' }}>
          📄 SIORET - Visualizador de Justificante Médico / Legal
        </h4>
        <button 
          type="button"
          onClick={() => {
            setModalPdfOpen(false);
            setPdfUrlSeleccionado('');
          }}
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '12px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
        >
          Cerrar ×
        </button>
      </div>

      {/* Cuerpo del Modal con el lector de PDF adaptado para Local y SharePoint */}
      <div style={{ flex: 1, backgroundColor: '#475569', padding: '10px' }}>
        <iframe 
          // 🚀 Agregada la validación automática para SharePoint e incrustación segura
          src={pdfUrlSeleccionado.includes('sharepoint.com') && !pdfUrlSeleccionado.includes('action=embedview')
            ? `${pdfUrlSeleccionado}&action=embedview` 
            : pdfUrlSeleccionado
          } 
          title="Visor Justificante PDF"
          width="100%" 
          height="100%" 
          style={{ border: 'none', borderRadius: '6px', backgroundColor: '#ffffff' }}
          allow="autoplay"
        />
      </div>
    </div>
  </div>
)}




        </div>
      </div>
    </div>
  );
};

export default Permnisos;
