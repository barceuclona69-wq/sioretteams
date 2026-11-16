import React, { useEffect, useState } from 'react';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';

const Menu = () => {
  const [perfiles, setPerfiles] = useState([]);
  const [opcionesMenu, setOpcionesMenu] = useState([]);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState('');
  const [permisosActivos, setPermisosActivos] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // 1. OBTENER LOS PERFILES
  const obtenerPerfiles = async () => {
    try {
      const endpoint = '/api/SISTEMAS/perfiles'; 
      const resData = await fetchWithFallback(endpoint);
      // Validamos que sea un array antes de guardarlo
      if (resData && Array.isArray(resData)) {
        setPerfiles(resData);
      } else {
        setPerfiles([]);
      }
    } catch (error) {
      console.error("❌ Error al cargar perfiles:", error.message);
      toast.error('No se pudieron cargar los perfiles');
    }
  };

  // 2. OBTENER TODAS LAS OPCIONES DEL MENÚ
  const obtenerOpcionesMenu = async () => {
    try {
      const endpoint = '/api/SISTEMAS/opciones-menu'; 
      const resData = await fetchWithFallback(endpoint);
      if (resData && Array.isArray(resData)) {
        setOpcionesMenu(resData);
      } else {
        setOpcionesMenu([]);
      }
    } catch (error) {
      console.error("❌ Error al cargar opciones de menú:", error.message);
      toast.error('No se pudieron cargar las opciones del menú');
    }
  };

  // 3. OBTENER PERMISOS DEL PERFIL SELECCIONADO
  const obtenerPermisosPorPerfil = async (idPerfil) => {
    if (!idPerfil) {
      setPermisosActivos([]);
      return;
    }
    try {
      setLoading(true);
      const endpoint = `/api/SISTEMAS/permisos-por-perfil?idperfil=${idPerfil}`;
      const resData = await fetchWithFallback(endpoint);
      
      if (resData && Array.isArray(resData)) {
        const idsActivos = resData.map(item => item.opcion_menu_id);
        setPermisosActivos(idsActivos);
      } else {
        setPermisosActivos([]);
      }
    } catch (error) {
      console.error("❌ Error al cargar permisos:", error.message);
      toast.error('No se pudieron obtener los permisos del perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerPerfiles();
    obtenerOpcionesMenu();
  }, []);

  const handlePerfilChange = (e) => {
    const idPerfil = e.target.value;
    setPerfilSeleccionado(idPerfil);
    obtenerPermisosPorPerfil(idPerfil);
  };

  const handleCheckboxChange = (opcionId) => {
    const id = Number(opcionId); 
    setPermisosActivos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 4. GUARDAR CAMBIOS (POST)
  const guardarCambios = async () => {
    if (!perfilSeleccionado) {
      toast.warning('Por favor, selecciona un perfil primero');
      return;
    }

    try {
      setGuardando(true);
      const endpoint = '/api/SISTEMAS/guardar-permisos';
      
      const payload = {
        idperfil: Number(perfilSeleccionado),
        opciones: permisosActivos 
      };

      await fetchWithFallback(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      toast.success('¡Permisos actualizados con éxito en SQL Server!');
    } catch (error) {
      console.error("❌ Error al guardar permisos:", error.message);
      toast.error('Error al guardar las modificaciones');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto', color: '#333' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#ffffff', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ color: '#7a9b17ff', margin: 0 }}>Asignación de Permisos de Menú</h2>
      </div>

      {/* Selector de Perfil */}
      <div style={{ marginBottom: '25px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
          Seleccione el Perfil a Configurar:
        </label>
        <select 
          value={perfilSeleccionado} 
          onChange={handlePerfilChange}
          style={{ width: '100%', padding: '10px', fontSize: '15px', borderRadius: '5px', border: '1px solid #ccc' }}
        >
          <option value="">-- Seleccione un Perfil --</option>
          {perfiles?.map((perf) => (
            <option key={perf.id} value={perf.id}>{perf.nombre_perfil}</option>
          ))}
        </select>
      </div>

      {/* Tabla de Opciones */}
      {perfilSeleccionado && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ color: '#555', marginTop: 0, marginBottom: '15px' }}>Accesos Disponibles para el Menú</h3>

          {loading ? (
            <p>Cargando datos de accesos...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left', borderBottom: '2px solid #92b91c' }}>
                    <th style={{ padding: '12px 10px' }}>Opción de Menú</th>
                    <th style={{ padding: '12px 10px' }}>Ruta de la App</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>¿Tiene Acceso?</th>
                  </tr>
                </thead>
                <tbody>
                  {opcionesMenu?.map((opcion) => (
                    <tr key={opcion.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>
                        {opcion.nombre_opcion}
                      </td>
                      <td style={{ padding: '12px 10px', color: '#666' }}>
                        {opcion.ruta}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          style={{ width: '19px', height: '19px', cursor: 'pointer' }}
                          checked={permisosActivos.includes(Number(opcion.id))}
                          onChange={() => handleCheckboxChange(opcion.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Botón de guardar */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={guardarCambios}
              disabled={guardando}
              style={{
                backgroundColor: guardando ? '#ccc' : '#7a9b17ff',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                fontSize: '16px',
                borderRadius: '5px',
                cursor: guardando ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {guardando ? 'Guardando...' : 'Aplicar Permisos'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
