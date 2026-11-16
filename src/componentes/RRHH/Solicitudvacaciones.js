import React, { useEffect, useState } from 'react';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';

// REEMPLÁZALA EXACTAMENTE POR ESTA:
// REEMPLAZA LA LÍNEA 4: const Solicitudvacaciones = () => {
// POR ESTA:
// DEBE QUEDAR ASÍ:
const Solicitudvacaciones = ({ diasDisponiblesMatriz }) => {


  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Control de Modo Edición
  const [isEditing, setIsEditing] = useState(false);
  const [idEditando, setIdEditando] = useState(null);

  // Estado del usuario recuperado desde el localStorage
  const [user] = useState(() => { 
    const savedUser = localStorage.getItem("userData"); 
    const defaultUser = { id: null, nombre: 'Usuario', idperfil: null, id_empresa: '', departamento: '', id_dartis: null }; 
    if (savedUser) { 
      try { return JSON.parse(savedUser); } catch (e) { return defaultUser; } 
    } 
    return defaultUser; 
  });

  // Campos de la tabla administrados por el formulario
  const [form, setForm] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    num_dias: 0,
    num_mes: 0,
    nombre_mes: '',
    num_año: 0,
    observacion: '',
    estado: 1 
  });

  // 1. OBTENER HISTORIAL PERSONAL FILTRADO POR IDEMP (GET)
  const obtenerData = async () => {
    if (!user.id_dartis) return;

    try {
      setLoading(true);
      const idempNumerico = parseInt(user.id_dartis, 10);
      
      // Apunta a la ruta GET pasando el idemp como query param
      const endpoint = `/api/RRHH/nueva_vacaciones_solicitada?idemp=${idempNumerico}`;
      const datosRecibidos = await fetchWithFallback(endpoint);
      
      if (datosRecibidos && Array.isArray(datosRecibidos)) {
        setData(datosRecibidos);
      } else if (datosRecibidos) {
        setData(datosRecibidos.data || datosRecibidos.resultado || []);
      }
    } catch (error) {
      console.error("❌ Error al cargar datos:", error.message);
      toast.error('No se pudieron cargar tus solicitudes de vacaciones');
    } finally {
      setLoading(false);
    }
  };

  // Disparar la carga del historial una vez el usuario esté disponible
  useEffect(() => {
    if (user.id_dartis) {
      obtenerData();
    }
  }, [user.id_dartis]);

  // 2. CALCULAR DÍAS NATURALES (INCLUYE FINES DE SEMANA), MES Y AÑO
  const calcularCamposVacaciones = (desde, hasta) => {
    if (!desde || !hasta) return { num_dias: 0, num_mes: 0, Easton_mes: '', num_año: 0 };

    const fechaInicio = new Date(desde + 'T00:00:00');
    const fechaFin = new Date(hasta + 'T00:00:00');

    if (fechaFin < fechaInicio) return { num_dias: 0, num_mes: 0, nombre_mes: '', num_año: 0 };

    const diferenciaTiempo = fechaFin.getTime() - fechaInicio.getTime();
    const diasTotales = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24)) + 1;

    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return {
      num_dias: diasTotales,
      num_mes: fechaInicio.getMonth() + 1,
      nombre_mes: meses[fechaInicio.getMonth()],
      num_año: fechaInicio.getFullYear()
    };
  };

  // 3. CAPTURAR CAMBIOS EN LOS INPUTS PERMITIDOS
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const valorFinal = name === 'estado' ? parseInt(value, 10) : value;
      const nuevoEstado = { ...prev, [name]: valorFinal };
      
      if (name === 'fecha_desde' || name === 'fecha_hasta') {
        const calculos = calcularCamposVacaciones(nuevoEstado.fecha_desde, nuevoEstado.fecha_hasta);
        return { ...nuevoEstado, ...calculos };
      }
      return nuevoEstado;
    });
  };

  // 4. PASAR DATOS AL FORMULARIO PARA EDITAR (SÓLO PENDIENTES)
const habilitarEdicion = (item) => {
  if (item.estado !== 1) {
    toast.error('Solo se pueden editar solicitudes en estado Pendiente');
    return;
  }

  // Recorta de forma segura el formato timestamp de SQL Server a YYYY-MM-DD
  const fDesde = item.fecha_desde ? item.fecha_desde.substring(0, 10) : '';
  const fHasta = item.fecha_hasta ? item.fecha_hasta.substring(0, 10) : '';

  setForm({
    fecha_desde: fDesde,
    fecha_hasta: fHasta,
    num_dias: item.num_dias || 0,
    num_mes: item.num_mes || 0,
    nombre_mes: item.nombre_mes || '',
    num_año: item.num_año || 0,
    observacion: item.observacion || '',
    estado: item.estado || 1
  });

  setIsEditing(true);
  setIdEditando(item.id);
};

  // 5. CANCELAR O RESETEAR EL FORMULARIO
  const cancelarEdicion = () => {
    setForm({ fecha_desde: '', fecha_hasta: '', num_dias: 0, num_mes: 0, nombre_mes: '', num_año: 0, observacion: '', estado: 1 });
    setIsEditing(false);
    setIdEditando(null);
  };

  // 6. GUARDAR (POST) O ACTUALIZAR (PUT)
  const handleSubmit = async (e) => {
    e.preventDefault();

    
  // --- NUEVA VALIDACIÓN DE SEGURIDAD ---
  const diasSolicitados = Number(form.num_dias) || 0;
  const maximoPermitido = Number(diasDisponiblesMatriz) || 0;

  if (diasSolicitados > maximoPermitido) {
    toast.error(`Acción Denegada: Estás solicitando ${diasSolicitados} días, pero el empleado solo dispone de ${maximoPermitido} días pendientes a la fecha.`);
    return; // Detiene la función por completo. No ejecutará el POST ni el PUT a la API.
  }
  // -------------------------------------

    if (!form.fecha_desde || !form.fecha_hasta || form.num_dias <= 0) {
      toast.warning('Por favor ingresa un rango de fechas válido');
      return;
    }

    try {
      setSubmitting(true);
      
      if (isEditing) {
        // Endpoint PUT adaptado a la tabla
        const endpoint = `/api/RRHH/editar_solicitud_vacaciones/${idEditando}`;
        await fetchWithFallback(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        toast.success('Solicitud modificada con éxito 🎉');
      } else {
        // Endpoint POST corregido apuntando a la tabla real del backend
        const endpoint = '/api/RRHH/sioret_solicitud_vacaciones';
        const idempNumerico = user.id_dartis ? parseInt(user.id_dartis, 10) : null;

        if (!idempNumerico) {
          toast.error("No se pudo identificar el ID numérico del empleado logueado.");
          setSubmitting(false);
          return;
        }

        await fetchWithFallback(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            idemp: idempNumerico 
          }) 
        });
        toast.success('Solicitud enviada exitosamente 🎉');
      }

      cancelarEdicion();
      obtenerData();
    } catch (error) {
      console.error("❌ Error detectado:", error);
      const mensajeError = error?.response?.data?.error || error?.message || 'Error al procesar la solicitud';
      toast.error(mensajeError);
    } finally {
      setSubmitting(false);
    }
  };

  const renderBadgeEstado = (estadoNumerico) => {
    switch (estadoNumerico) {
      case 1: return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fff3e0', color: '#f57c00', fontSize: '12px', fontWeight: 'bold' }}>Pendiente</span>;
      case 2: return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: '12px', fontWeight: 'bold' }}>Aprobado</span>;
      case 3: return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#ffebee', color: '#c62828', fontSize: '12px', fontWeight: 'bold' }}>Rechazado</span>;
      case 4: return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#eceff1', color: '#455a64', fontSize: '12px', fontWeight: 'bold' }}>Anulado</span>;
      default: return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#eee', color: '#333', fontSize: '12px' }}>Desconocido</span>;
    }
  };
  const inputStyle = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', marginTop: '5px', backgroundColor: '#fff' };
  const readOnlyStyle = { ...inputStyle, backgroundColor: '#f0f0f0', color: '#555', fontWeight: 'bold' };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Encabezado Dinámico */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#ffffff', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: isEditing ? '#f57c00' : '#7a9b17ff', margin: 0 }}>
          {isEditing ? `Modificando Registro #${idEditando}` : 'Módulo de Vacaciones'}
        </h2>
        <span style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>
          👤 Colaborador: {user.nombre}
        </span>
        <span style={{ fontSize: '16px', color: '#333', display: 'block', marginTop: '4px' }}>
        Saldo Disponible máximo hasta la fecha: <strong style={{ color: '#7a9b17ff' }}>{diasDisponiblesMatriz || 0} días</strong>
      </span>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: '20px', alignItems: 'start' }}>
        
        {/* COLUMNA 1: FORMULARIO */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: isEditing ? '#f57c00' : '#7a9b17ff', marginTop: 0, borderBottom: isEditing ? '2px solid #f57c00' : '2px solid #92b91c', paddingBottom: '8px' }}>
            {isEditing ? 'Campos Editables' : 'Nueva Solicitud'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Fecha Desde *</label>
              <input type="date" name="fecha_desde" value={form.fecha_desde} onChange={handleChange} style={inputStyle} required />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Fecha Hasta *</label>
              <input type="date" name="fecha_hasta" value={form.fecha_hasta} onChange={handleChange} style={inputStyle} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666' }}>Días (Naturales)</label>
                <input type="text" value={form.num_dias} style={readOnlyStyle} readOnly />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666' }}>Año laboral</label>
                <input type="text" value={form.num_año || ''} style={readOnlyStyle} readOnly />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666' }}>Mes correspondiente</label>
              <input type="text" value={form.nombre_mes ? `${form.nombre_mes} (N° ${form.num_mes})` : ''} style={readOnlyStyle} readOnly />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Observación</label>
              <textarea name="observacion" rows="2" value={form.observacion} onChange={handleChange} style={inputStyle} placeholder="Detalles o comentarios..." />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Estado de la Solicitud</label>
              <select name="estado" value={form.estado} onChange={handleChange} style={inputStyle}>
                <option value={1}>1 - Pendiente</option>
                <option value={4}>4 - Anulado</option>
              </select>
            </div>
<button 
  type="submit" 
  disabled={submitting || form.num_dias === 0 || Number(form.num_dias) > Number(diasDisponiblesMatriz)} 
  style={{ 
    width: '100%', 
    padding: '10px', 
    // Cambia a gris si procesa, a rojo si excede, o mantiene sus colores originales (naranja/verde)
    backgroundColor: (submitting || form.num_dias === 0) 
      ? '#ccc' 
      : (Number(form.num_dias) > Number(diasDisponiblesMatriz) ? '#dc2626' : (isEditing ? '#f57c00' : '#92b91c')), 
    color: '#fff', 
    border: 'none', 
    borderRadius: '4px', 
    fontWeight: 'bold', 
    // Cambia el cursor a prohibido si excede o está vacío
    cursor: (submitting || form.num_dias === 0 || Number(form.num_dias) > Number(diasDisponiblesMatriz)) ? 'not-allowed' : 'pointer', 
    marginBottom: '10px' 
  }}
>
  {/* Texto dinámico según el estado de la validación */}
  {submitting 
    ? 'Procesando...' 
    : (Number(form.num_dias) > Number(diasDisponiblesMatriz) ? 'Excede Días Disponibles' : (isEditing ? 'Guardar Cambios' : 'Enviar Solicitud'))}
</button>


            {isEditing && (
              <button type="button" onClick={cancelarEdicion} style={{ width: '100%', padding: '8px', backgroundColor: '#e0e0e0', color: '#333', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar Edición
              </button>
            )}
          </form>
        </div>

        {/* COLUMNA 2: HISTORIAL DE SOLICITUDES */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#7a9b17ff', marginTop: 0 }}>Historial de Solicitudes</h3>
          
          {loading ? <p>Cargando registros...</p> : data.length === 0 ? <p style={{ color: '#777' }}>No hay solicitudes previas registradas.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left', borderBottom: '2px solid #92b91c' }}>
                    <th style={{ padding: '10px' }}>ID</th>
                    <th style={{ padding: '10px' }}>Desde</th>
                    <th style={{ padding: '10px' }}>Hasta</th>
                    <th style={{ padding: '10px' }}>Días</th>
                    <th style={{ padding: '10px' }}>Mes / Año</th>
                    <th style={{ padding: '10px' }}>Observación</th>
                    <th style={{ padding: '10px' }}>Estado</th>
                    <th style={{ padding: '10px' }}>Novedad Rechazo</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #eee', fontSize: '14px', backgroundColor: idEditando === item.id ? '#fff3e0' : 'transparent' }}>
                      <td style={{ padding: '10px' }}>#{item.id}</td>
                      <td style={{ padding: '10px' }}>{item.fecha_desde ? new Date(item.fecha_desde).toLocaleDateString('es-ES') : ''}</td>
                      <td style={{ padding: '10px' }}>{item.fecha_hasta ? new Date(item.fecha_hasta).toLocaleDateString('es-ES') : ''}</td>
                      <td style={{ padding: '10px' }}>{item.num_dias}</td>
                      <td style={{ padding: '10px' }}>{item.nombre_mes} - {item.num_año}</td>
                      <td style={{ padding: '10px' }}>{item.observacion || '-'}</td>
                      <td style={{ padding: '10px' }}>{renderBadgeEstado(item.estado)}</td>
                       <td style={{ padding: '10px' }}>{item.observacion_rechazo}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {item.estado === 1 ? (
                          <button onClick={() => habilitarEdicion(item)} style={{ backgroundColor: '#92b91c', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                            ✏️ Editar
                          </button>
                        ) : (
                          <span style={{ color: '#aaa', fontSize: '12px', fontStyle: 'italic' }}>Bloqueado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Solicitudvacaciones;
