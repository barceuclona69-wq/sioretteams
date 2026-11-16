import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import logoSioret from '../../imagenes/logo_sioretblanco.png';
import logoBellaflor from '../../imagenes/Bellaflor.jpg';


const Periodo_cierre = () => {
  const navigate = useNavigate();
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para la edición en línea
  const [editandoId, setEditandoId] = useState(null);
 const [formValues, setFormValues] = useState({ referencia: '', fecha_desde: '', fecha_hasta: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. RECUPERAR DATOS (GET)
const obtenerPeriodos = async () => {
  try {
    setLoading(true);
    const endpoint = '/api/RRHH/periodo_cierre';
    
    // fetchWithFallback ya hace el .json() internamente y te entrega los datos puros
    const data = await fetchWithFallback(endpoint);
    
    console.log("🎯 Datos recibidos correctamente en React:", data);
    
    // Si la función devolvió datos válidos, los guardamos en el estado
    if (data) {
      setPeriodos(data);
    }
  } catch (error) {
    console.error("❌ Error al procesar la petición:", error.message);
    toast.error('No se pudieron cargar los períodos de cierre');
  } finally {
    setLoading(false);
  }
};




  useEffect(() => {
    obtenerPeriodos();
  }, []);

  // 2. ACTIVAR MODO EDICIÓN
  const handleEditarClick = (periodo) => {
    setEditandoId(periodo.id);
    
    // Convierte el formato de la base de datos a un formato compatible con <input type="datetime-local">
    const formatearFechaInput = (fechaStr) => {
      if (!fechaStr) return '';
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return '';
      // Retorna 'YYYY-MM-DDTHH:mm' ajustando la zona horaria local
      const tzoffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
      return localISOTime;
    };

   setFormValues({
  referencia: periodo.referencia, // <-- Añade esta línea
  fecha_desde: formatearFechaInput(periodo.fecha_desde),
  fecha_hasta: formatearFechaInput(periodo.fecha_hasta),
});

  };

  // 3. ACTUALIZAR DATOS (PUT)
const handleGuardar = async (id) => {
  if (!formValues.fecha_desde || !formValues.fecha_hasta) {
    toast.warning('Por favor, complete ambas fechas');
    return;
  }

  try {
    setIsSubmitting(true);
    
    // Endpoint relativo correcto utilizando template literals
    const endpoint = `/api/RRHH/periodo_cierre/${id}`;

    // Tu backend limpia la 'T' del input y espera un espacio
    const bodyEnvio = {
      fecha_desde: formValues.fecha_desde.replace('T', ' '),
      fecha_hasta: formValues.fecha_hasta.replace('T', ' ')
    };

    // fetchWithFallback maneja la petición y los errores internamente
    await fetchWithFallback(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyEnvio),
    });

    // Si el flujo continúa sin saltar al catch, la actualización fue exitosa
    toast.success('Período actualizado con éxito');
    setEditandoId(null);
    obtenerPeriodos(); // Recarga la tabla de inmediato para ver los cambios
  } catch (error) {
    console.error("❌ Error al actualizar:", error.message);
    toast.error('Error al guardar los cambios');
  } finally {
    setIsSubmitting(false);
  }
};



  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Encabezado con logos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#ffffffff', padding: '10px 20px', borderRadius: '8px' }}>
        <img src={logoSioret} alt="Logo Sioret" style={{ height: '40px', objectFit: 'contain' }} />
        <h2 style={{ color: '#92b91c', margin: 0 }}>Gestión de Períodos de Cierre</h2>
        <img src={logoBellaflor} alt="Logo Bellaflor" style={{ height: '40px', objectFit: 'contain' }} />
      </div>


      {/* Contenedor de la Tabla */}
      {loading ? (
        <p>Cargando períodos...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left', borderBottom: '2px solid #92b91c' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>Referencia</th>
                <th style={{ padding: '12px' }}>Fecha Desde</th>
                <th style={{ padding: '12px' }}>Fecha Hasta</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {periodos.map((periodo) => (
                <tr key={periodo.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px' }}>{periodo.id}</td>

               
                        {/* Celda Referencia */}
        <td style={{ padding: '12px' }}>
          {editandoId === periodo.id ? (
            <input 
              type="text" 
              value={formValues.referencia || ''}
              onChange={(e) => setFormValues({ ...formValues, referencia: e.target.value })}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }}
            />
          ) : (
            periodo.referencia
          )}
        </td>

                  
                  {/* Celda Fecha Desde */}
                  <td style={{ padding: '12px' }}>
                    {editandoId === periodo.id ? (
                      <input 
                        type="datetime-local" 
                        value={formValues.fecha_desde}
                        onChange={(e) => setFormValues({ ...formValues, fecha_desde: e.target.value })}
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    ) : (
                      new Date(periodo.fecha_desde).toLocaleString()
                    )}
                  </td>

                  {/* Celda Fecha Hasta */}
                  <td style={{ padding: '12px' }}>
                    {editandoId === periodo.id ? (
                      <input 
                        type="datetime-local" 
                        value={formValues.fecha_hasta}
                        onChange={(e) => setFormValues({ ...formValues, fecha_hasta: e.target.value })}
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    ) : (
                      new Date(periodo.fecha_hasta).toLocaleString()
                    )}
                  </td>

                  {/* Columna de Acciones */}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {editandoId === periodo.id ? (
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleGuardar(periodo.id)} 
                          disabled={isSubmitting}
                          style={{ padding: '6px 12px', backgroundColor: '#9fca1eff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button 
                          onClick={() => setEditandoId(null)}
                          style={{ padding: '6px 12px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleEditarClick(periodo)}
                        style={{ padding: '6px 12px', backgroundColor: '#b3e129ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >

                        ✏️ Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Periodo_cierre;
