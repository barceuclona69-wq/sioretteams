import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';

const FichaEmpleado = () => {
  const navigate = useNavigate();
  const [empleado, setEmpleado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState('personales');

  const [user] = useState(() => { 
    const savedUser = localStorage.getItem("userData"); 
    const defaultUser = { id: null, nombre: 'Usuario', idperfil: null, id_empresa: '', departamento: '', id_dartis: null }; 
    if (savedUser) { 
      try { return JSON.parse(savedUser); } catch (e) { return defaultUser; } 
    } 
    return defaultUser; 
  }); 

  const obtenerFichaempleado = async () => {
    if (!user || !user.id_dartis) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const endpoint = `/api/RRHH/fichampleado?idemp=${user.id_dartis}`;
      const data = await fetchWithFallback(endpoint);
      
      if (data && data.length > 0) {
        setEmpleado(data[0]); // Se toma el primer registro devuelto del recordset
      } else {
        toast.info('No se encontró la ficha del empleado');
      }
    } catch (error) {
      console.error("❌ Error al procesar la petición:", error.message);
      toast.error('No se pudo cargar la ficha del empleado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerFichaempleado();
  }, [user.id_dartis]);

  if (loading) {
    return <div style={styles.center}><h3>Cargando información del empleado...</h3></div>;
  }

  if (!empleado) {
    return <div style={styles.center}><h3>No hay datos disponibles para mostrar.</h3></div>;
  }

  // Formateadores de ayuda
  const formatearFecha = (fecha) => fecha ? new Date(fecha).toLocaleDateString() : 'N/A';
  const formatearMoneda = (valor) => valor ? `$${Number(valor).toFixed(2)}` : '$0.00';

    return (
    <div style={styles.container}>
      {/* Encabezado del Perfil */}
      <div style={styles.headerCard}>
        <div style={styles.avatar}>{empleado.nombreComercial?.charAt(0)}</div>
        <div style={styles.headerInfo}>
          <h2 style={styles.empleadoNombre}>{empleado.nombreComercial}</h2>
          <p style={styles.empleadoPuesto}>{empleado.PuestoTrabajo} — <span style={{color: '#666'}}>{empleado.empresa}</span></p>
        </div>
      </div>

      {/* Navegación por Secciones (Tabs) */}
      <div style={styles.tabsContainer}>
        <button style={seccionActiva === 'personales' ? styles.tabActive : styles.tab} onClick={() => setSeccionActiva('personales')}>Datos Personales</button>
        <button style={seccionActiva === 'laborales' ? styles.tabActive : styles.tab} onClick={() => setSeccionActiva('laborales')}>Información Laboral</button>
        <button style={seccionActiva === 'seguridadSocial' ? styles.tabActive : styles.tab} onClick={() => setSeccionActiva('seguridadSocial')}>IESS & Discapacidad</button>
        <button style={seccionActiva === 'financieros' ? styles.tabActive : styles.tab} onClick={() => setSeccionActiva('financieros')}>Financiero y Logística</button>
      </div>

      {/* Contenido Dinámico de Secciones */}
      <div style={styles.contentCard}>
        
        {seccionActiva === 'personales' && (
          <div>
            <h3 style={styles.seccionTitulo}>Identificación y Contacto</h3>
            <div style={styles.grid}>
              <div style={styles.campo}><label style={styles.label}>Cédula / Identificación</label><span style={styles.valor}>{empleado.Identificacion}</span></div>
              <div style={styles.campo}><label style={styles.label}>Sexo</label><span style={styles.valor}>{empleado.Sexo || 'No definido'}</span></div>
              <div style={styles.campo}><label style={styles.label}>Estado Civil</label><span style={styles.valor}>{empleado.EstadoCivil}</span></div>
              <div style={styles.campo}><label style={styles.label}>Fecha de Nacimiento</label><span style={styles.valor}>{formatearFecha(empleado.FechaNacimiento)}</span></div>
              <div style={styles.campo}><label style={styles.label}>Correo Electrónico</label><span style={styles.valor}>{empleado.correo}</span></div>
              <div style={styles.campo}><label style={styles.label}>Contacto de Emergencia</label><span style={styles.valor}>{empleado.telefonoContactoEmergencia || 'N/A'}</span></div>
              <div style={styles.campo}><label style={styles.label}>Dirección</label><span style={styles.valor}>{empleado.Direccion}</span></div>
              <div style={styles.campo}><label style={styles.label}>Profesión / Título</label><span style={styles.valor}>{empleado.Profesion} — {empleado.Titulo}</span></div>
            </div>
          </div>
        )}

        {seccionActiva === 'laborales' && (
          <div>
            <h3 style={styles.seccionTitulo}>Estructura Interna</h3>
            <div style={styles.grid}>
              <div style={styles.campo}><label style={styles.label}>Área</label><span style={styles.valor}>{empleado.nombre}</span></div>
              <div style={styles.campo}><label style={styles.label}>Cargo asignado</label><span style={styles.valor}>{empleado.Cargo}</span></div>
              <div style={styles.campo}><label style={styles.label}>Estructura Organizacional</label><span style={styles.valor}>{empleado.EstructuraOrganizacional}</span></div>
              <div style={styles.campo}><label style={styles.label}>Tipo de Contrato</label><span style={styles.valor}>{empleado.TipoContrato}</span></div>
              <div style={styles.campo}><label style={styles.label}>Tipo de Rol</label><span style={styles.valor}>{empleado.Tiporol}</span></div>
              <div style={styles.campo}><label style={styles.label}>Fecha de Ingreso</label><span style={styles.valor}>{formatearFecha(empleado.FechaIngreso)}</span></div>
              <div style={styles.campo}><label style={styles.label}>Sueldo Base</label><span style={{...styles.valor, ...styles.sueldo}}>{formatearMoneda(empleado.SueldoBase)}</span></div>
              <div style={styles.campo}><label style={styles.label}>Usa Marcaciones / Timbrado</label><span style={styles.valor}>{empleado.UsaTimbrado ? 'Sí' : 'No'}</span></div>
            </div>
          </div>
        )}

        {seccionActiva === 'seguridadSocial' && (
          <div>
            <h3 style={styles.seccionTitulo}>Afiliación y Beneficios</h3>
            <div style={styles.grid}>
              <div style={styles.campo}><label style={styles.label}>Afiliado al IESS</label><span style={styles.valor}>{empleado.AfiliadoIess ? 'Sí' : 'No'}</span></div>
              <div style={styles.campo}><label style={styles.label}>Fecha Afiliación</label><span style={styles.valor}>{formatearFecha(empleado.FechaAfiliacionIess)}</span></div>
              <div style={styles.campo}><label style={styles.label}>Cargas Familiares</label><span style={styles.valor}>{empleado.NumeroCargasFamiliares}</span></div>
              <div style={styles.campo}><label style={styles.label}>Tipo Discapacidad</label><span style={styles.valor}>{empleado.TipoDiscapacidad || 'Ninguna'}</span></div>
              <div style={styles.campo}><label style={styles.label}>Nivel / Porcentaje</label><span style={styles.valor}>{empleado.NivelDiscapacidad ? `${empleado.NivelDiscapacidad}%` : 'N/A'}</span></div>
              <div style={styles.campo}><label style={styles.label}>Nro. Carnet Discapacidad</label><span style={styles.valor}>{empleado.IdentificacionDiscapacidad || 'N/A'}</span></div>
              <div style={styles.campo}><label style={styles.label}>Sustituto de Discapacidad</label><span style={styles.valor}>{empleado.SustitutoDiscapacidad ? 'Sí' : 'No'}</span></div>
            </div>
          </div>
        )}

        {seccionActiva === 'financieros' && (
          <div>
            <h3 style={styles.seccionTitulo}>Método de Pago y Rutas</h3>
            <div style={styles.grid}>
              <div style={styles.campo}><label style={styles.label}>Institución Bancaria</label><span style={styles.valor}>{empleado.Banco}</span></div>
              <div style={styles.campo}><label style={styles.label}>Número de Cuenta</label><span style={styles.valor}>{empleado.NumeroCuenta}</span></div>
              <div style={styles.campo}><label style={styles.label}>Forma de Pago</label><span style={styles.valor}>{empleado.FormaPago}</span></div>
              <div style={styles.campo}><label style={styles.label}>Horario Laboral</label><span style={styles.valor}>{empleado.Horario}</span></div>
              <div style={styles.campo}><label style={styles.label}>Ruta de Recorrido</label><span style={styles.valor}>{empleado.Recorrido || 'No asignado'}</span></div>
              <div style={styles.campo}><label style={styles.label}>Parada Asignada</label><span style={styles.valor}>{empleado.Parada || 'No asignado'}</span></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1000px', margin: '30px auto', padding: '0 20px', fontFamily: '"Segoe UI", Roboto, sans-serif', color: '#333' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' },
  headerCard: { display: 'flex', alignItems: 'center', background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px', gap: '20px' },
  avatar: { width: '60px', height: '60px', borderRadius: '50%', background: '#0056b3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' },
  headerInfo: { display: 'flex', flexDirection: 'column' },
  empleadoNombre: { margin: 0, fontSize: '22px', fontWeight: '60px', color: '#111' },
  empleadoPuesto: { margin: '4px 0 0 0', color: '#0056b3', fontWeight: '500' },
  tabsContainer: { display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '2px solid #e9ecef', paddingBottom: '2px', overflowX: 'auto' },
  tab: { padding: '10px 20px', background: 'none', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#6c757d', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  tabActive: { padding: '10px 20px', background: 'none', border: 'none', borderBottom: '3px solid #0056b3', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#0056b3', whiteSpace: 'nowrap' },
  contentCard: { background: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e9ecef' },
  seccionTitulo: { margin: '0 0 20px 0', fontSize: '18px', color: '#111', borderBottom: '1px solid #f1f3f5', paddingBottom: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
  campo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '11px', textTransform: 'uppercase', color: '#868e96', fontWeight: '600', letterSpacing: '0.5px' },
  valor: { fontSize: '14px', fontWeight: '500', color: '#212529' },
  sueldo: { fontSize: '16px', fontWeight: 'bold', color: '#2b8a3e' }
};

export default FichaEmpleado;
