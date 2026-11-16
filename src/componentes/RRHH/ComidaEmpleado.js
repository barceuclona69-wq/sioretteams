import React, { useEffect, useState } from 'react';
import { fetchWithFallback } from '../../config';
import { toast } from 'sonner';

const ComidaEmpleado = () => {
  const [user] = useState(() => {
    const savedUser = localStorage.getItem('userData');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return { id: null, id_dartis: null, nombre: 'Colaborador' };
      }
    }
    return { id: null, id_dartis: null, nombre: 'Colaborador' };
  });

  const idempActual = user?.id_dartis || user?.id || 1;

  const obtenerFechaHoy = () => {
    const hoy = new Date();
    const offset = hoy.getTimezoneOffset();
    const fechaLocal = new Date(hoy.getTime() - offset * 60 * 1000);
    return fechaLocal.toISOString().split('T')[0];
  };


  const fechaHoy = obtenerFechaHoy();

  const [formComida, setFormComida] = useState({
    desayuno: 'NO',
    almuerza: 'NO',
    merienda: 'NO',
    refrigerio: 'NO',
  });

  const [registroHoyId, setRegistroHoyId] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [validandoEdicion, setValidandoEdicion] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtroFechaHistorial, setFiltroFechaHistorial] = useState('');

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const data = await fetchWithFallback(`/api/RRHH/comida?idemp=${idempActual}`);
      if (Array.isArray(data)) {
        setHistorial(data);
        const registroDeHoy = data.find((item) => item.fecha_registros === fechaHoy);
        if (registroDeHoy) {
          setRegistroHoyId(registroDeHoy.id);
          setModoEdicion(false);
          setFormComida({
            desayuno: 'NO',
            almuerza: registroDeHoy.almuerza || 'NO',
            merienda: 'NO',
            refrigerio: 'NO',
          });
        } else {
          setRegistroHoyId(null);
          setModoEdicion(false);
          setFormComida({
            desayuno: 'NO',
            almuerza: 'NO',
            merienda: 'NO',
            refrigerio: 'NO',
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar historial de comida:', error);
      toast.error('No se pudo cargar el historial de alimentación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idempActual) {
      cargarHistorial();
    }
  }, [idempActual]);

  const formularioBloqueado = Boolean(registroHoyId) && !modoEdicion;

  const handleClickEditar = async () => {
    try {
      setValidandoEdicion(true);
      const resp = await fetchWithFallback(`/api/RRHH/yatieneregistros_comida/${idempActual}`);
      console.log('Respuesta yatieneregistros_comida:', resp);

      const filas = Array.isArray(resp)
        ? resp
        : Array.isArray(resp?.recordset)
        ? resp.recordset
        : Array.isArray(resp?.registros)
        ? resp.registros
        : [];

      // 1. Validar si consta como 'si'
      const tieneAlmuerzoSi = filas.some(
        (fila) =>
          Number(fila.total || 0) > 0 &&
          String(fila.almuer_si || '').trim().toLowerCase() === 'si'
      );

      if (tieneAlmuerzoSi) {
        toast.error('No puedes editar: tu almuerzo ya consta como "SI" en tu asistencia comunicate con RRHH.');
        setModoEdicion(false);
        return;
      }

      // 2. Validar si consta como 'no'
      const tieneAlmuerzoNo = filas.some(
        (fila) =>
          Number(fila.total || 0) > 0 &&
          String(fila.almuer_si || '').trim().toLowerCase() === 'no'
      );

      if (tieneAlmuerzoNo) {
      toast.error('No puedes editar: tu almuerzo ya consta como "NO" en tu asistencia comunicate con RRHH.');
        setModoEdicion(false);
        return;
      }

      // Si no consta ni como 'si' ni como 'no' (es decir, está vacío/NULL o sin registros), habilita la edición
      setModoEdicion(true);
      toast.success('Edición activada: haz clic en la tarjeta de Almuerzo para cambiarlo.');
      window.scrollTo({ top: 150, behavior: 'smooth' });
    } catch (error) {
      console.error('Error al validar edición:', error);
      toast.error('Error al consultar yatieneregistros_comida: ' + (error.message || ''));
    } finally {
      setValidandoEdicion(false);
    }
  };


  const cancelarEdicion = () => {
    setModoEdicion(false);
    const registroDeHoy = historial.find((item) => item.fecha_registros === fechaHoy);
    if (registroDeHoy) {
      setFormComida({
        desayuno: 'NO',
        almuerza: registroDeHoy.almuerza || 'NO',
        merienda: 'NO',
        refrigerio: 'NO',
      });
    }
  };

  const toggleOpcion = (campo, habilitado) => {
    if (!habilitado) {
      toast.info('Esta opción se encuentra desactivada por el momento');
      return;
    }
    if (formularioBloqueado) {
      toast.info('Haz clic en el botón "Editar" para modificar tu registro de hoy');
      return;
    }
    setFormComida((prev) => ({
      ...prev,
      [campo]: prev[campo] === 'SI' ? 'NO' : 'SI',
    }));
  };

  const handleGuardarComida = async (e) => {
    e.preventDefault();
    if (formularioBloqueado) return;

    try {
      setGuardando(true);
        const payload = {
        idemp: Number(idempActual),
        nombre: user?.nombre || 'Colaborador',
        fecha_registros: fechaHoy,
        desayuno: 'NO',
        almuerza: formComida.almuerza,
        merienda: 'NO',
        refrigerio: 'NO',
      };


      if (registroHoyId) {
        await fetchWithFallback(`/api/RRHH/comida/${registroHoyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast.success('Tu solicitud de almuerzo de hoy fue actualizada');
      } else {
        await fetchWithFallback('/api/RRHH/comida', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast.success('Registro de almuerzo guardado');
      }

      setModoEdicion(false);
      await cargarHistorial();
    } catch (error) {
      console.error('Error guardando comida:', error);
      toast.error('No se pudo completar la operación');
      await cargarHistorial();
    } finally {
      setGuardando(false);
    }
  };
  const opcionesComida = [
    { key: 'desayuno', label: 'Desayuno', hora: '07:00 - 08:30', color: '#d97706', bg: '#fef3c7', habilitado: false },
    { key: 'almuerza', label: 'Almuerzo', hora: '12:00 - 14:00', color: '#15803d', bg: '#dcfce7', habilitado: true },
    { key: 'merienda', label: 'Merienda', hora: '18:00 - 19:30', color: '#0369a1', bg: '#e0f2fe', habilitado: false },
    { key: 'refrigerio', label: 'Refrigerio', hora: 'Media mañana / tarde', color: '#7c3aed', bg: '#ede9fe', habilitado: false },
  ];

  const historialFiltrado = historial.filter((item) =>
    filtroFechaHistorial ? item.fecha_registros.includes(filtroFechaHistorial) : true
  );

  const formatearFechaLegible = (fechaStr) => {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    const fechaObj = new Date(Number(year), Number(month) - 1, Number(day));
    return fechaObj.toLocaleDateString('es-EC', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleGuardarComida} style={styles.formCard}>
        <div style={styles.formHeader}>
          <div>
            <span
              style={{
                ...styles.tagBadge,
                backgroundColor: modoEdicion
                  ? '#dbeafe'
                  : registroHoyId
                  ? '#fef3c7'
                  : '#dcfce7',
                color: modoEdicion
                  ? '#1e40af'
                  : registroHoyId
                  ? '#92400e'
                  : '#166534',
              }}
            >
              {modoEdicion
                ? '✎ EDITANDO SELECCIÓN DE HOY'
                : registroHoyId
                ? '✓ REGISTRADO HOY'
                : '● DISPONIBLE PARA REGISTRO DE HOY'}
            </span>
            <h3 style={styles.title}>Registro Diario de Almuerzo</h3>
            <p style={styles.subtitle}>
              Marca tu <strong>Almuerzo</strong> para hoy. Si ya registraste y deseas cambiarlo, pulsa <strong>Editar</strong>.
            </p>
          </div>

          <div style={{ ...styles.datePickerBox, backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}>
            <label style={styles.dateLabel}>Fecha de consumo (Hoy):</label>
            <input
              type="date"
              value={fechaHoy}
              disabled
              readOnly
              style={{
                ...styles.dateInput,
                backgroundColor: 'transparent',
                color: '#334155',
                cursor: 'not-allowed',
              }}
            />
          </div>
        </div>

        <div style={styles.cardsGrid}>
          {opcionesComida.map((op) => {
            const activo = op.habilitado && formComida[op.key] === 'SI';
            const deshabilitado = !op.habilitado || formularioBloqueado;

            return (
              <div
                key={op.key}
                onClick={() => toggleOpcion(op.key, op.habilitado)}
                style={{
                  ...styles.mealCard,
                  borderColor: !op.habilitado
                    ? '#e2e8f0'
                    : activo
                    ? op.color
                    : '#cbd5e1',
                  backgroundColor: !op.habilitado
                    ? '#f1f5f9'
                    : activo
                    ? op.bg
                    : '#ffffff',
                  opacity: !op.habilitado ? 0.55 : formularioBloqueado ? 0.8 : 1,
                  cursor: deshabilitado ? 'not-allowed' : 'pointer',
                  boxShadow: activo && !deshabilitado ? `0 8px 18px -4px ${op.color}33` : 'none',
                }}
              >
                <div style={styles.mealCardTop}>
                  <span
                    style={{
                      ...styles.mealTitle,
                      color: !op.habilitado ? '#64748b' : activo ? op.color : '#1e293b',
                    }}
                  >
                    {op.label}
                  </span>
                  <span
                    style={{
                      ...styles.statusSwitch,
                      backgroundColor: !op.habilitado
                        ? '#94a3b8'
                        : activo
                        ? op.color
                        : '#cbd5e1',
                    }}
                  >
                    {!op.habilitado ? 'OFF' : activo ? 'SÍ' : 'NO'}
                  </span>
                </div>
                <div style={styles.mealTime}>{op.hora}</div>
                <div
                  style={{
                    ...styles.mealHint,
                    color: !op.habilitado ? '#94a3b8' : activo ? op.color : '#64748b',
                  }}
                >
                  {!op.habilitado
                    ? 'No habilitado'
                    : registroHoyId && !modoEdicion
                    ? 'Pulsa "Editar" para cambiar'
                    : activo
                    ? '✓ Almuerzo seleccionado'
                    : 'Clic para pedir almuerzo'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.formActions}>
          {registroHoyId && !modoEdicion ? (
            <button
              type="button"
              onClick={handleClickEditar}
              disabled={validandoEdicion}
              style={styles.editMainBtn}
            >
              {validandoEdicion ? 'Verificando...' : '✎ Editar Almuerzo de Hoy'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {modoEdicion && (
                <button type="button" onClick={cancelarEdicion} style={styles.cancelEditBtn}>
                  Cancelar
                </button>
              )}
              <button type="submit" disabled={guardando} style={styles.submitBtn}>
                {guardando
                  ? 'Guardando...'
                  : registroHoyId
                  ? 'Guardar Cambios'
                  : 'Guardar Almuerzo de Hoy'}
              </button>
            </div>
          )}
        </div>
      </form>
      <div style={styles.historyCard}>
        <div style={styles.historyHeader}>
          <div>
            <h3 style={styles.historyTitle}>Historial de Alimentación</h3>
            <p style={styles.historySubtitle}>
              Días registrados: <strong>{historialFiltrado.length}</strong>
            </p>
          </div>

          <div style={styles.filterGroup}>
            <input
              type="month"
              value={filtroFechaHistorial}
              onChange={(e) => setFiltroFechaHistorial(e.target.value)}
              style={styles.filterInput}
              title="Filtrar por mes"
            />
            {filtroFechaHistorial && (
              <button
                type="button"
                onClick={() => setFiltroFechaHistorial('')}
                style={styles.clearBtn}
              >
                Ver todos
              </button>
            )}
          </div>
        </div>

        <div style={styles.tableResponsive}>
          {loading ? (
            <div style={styles.emptyMsg}>Cargando historial...</div>
          ) : historialFiltrado.length === 0 ? (
            <div style={styles.emptyMsg}>
              No hay registros de alimentación para mostrar.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Desayuno</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Almuerzo</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Merienda</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Refrigerio</th>
                 
                </tr>
              </thead>
              <tbody>
                {historialFiltrado.map((row) => {
                  const esHoy = row.fecha_registros === fechaHoy;

                  return (
                    <tr
                      key={row.id}
                      style={{
                        ...styles.tr,
                        backgroundColor: esHoy ? '#f0fdf4' : 'transparent',
                      }}
                    >
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600', color: '#0f172a', textTransform: 'capitalize' }}>
                          {formatearFechaLegible(row.fecha_registros)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{row.fecha_registros}</div>
                      </td>

                      {['desayuno', 'almuerza', 'merienda', 'refrigerio'].map((campo) => {
                        const esSi = row[campo] === 'SI';
                        return (
                          <td key={campo} style={{ ...styles.td, textAlign: 'center' }}>
                            <span
                              style={{
                                ...styles.pillBadge,
                                backgroundColor: esSi ? '#dcfce7' : '#f1f5f9',
                                color: esSi ? '#166534' : '#64748b',
                                border: esSi ? '1px solid #86efac' : '1px solid #e2e8f0',
                              }}
                            >
                              {row[campo]}
                            </span>
                          </td>
                        );
                      })}

                 
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '22px',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '20px',
  },
  tagBadge: {
    fontSize: '10.5px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    padding: '4px 10px',
    borderRadius: '999px',
  },
  title: {
    margin: '8px 0 2px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
  },
  datePickerBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
  },
  dateLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  dateInput: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontWeight: '600',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '14px',
    marginBottom: '20px',
  },
  mealCard: {
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  mealCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  mealTitle: {
    fontSize: '15px',
    fontWeight: '700',
  },
  statusSwitch: {
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '800',
    padding: '3px 10px',
    borderRadius: '999px',
  },
  mealTime: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '8px',
  },
  mealHint: {
    fontSize: '11.5px',
    fontWeight: '600',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '14px',
    paddingTop: '14px',
    borderTop: '1px solid #e2e8f0',
  },
  editMainBtn: {
    backgroundColor: '#d97706',
    color: '#ffffff',
    border: 'none',
    padding: '10px 22px',
    borderRadius: '10px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
  },
  cancelEditBtn: {
    backgroundColor: '#ffffff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitBtn: {
    backgroundColor: '#1b5e20',
    color: '#ffffff',
    border: 'none',
    padding: '10px 22px',
    borderRadius: '10px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(27, 94, 32, 0.25)',
  },
  historyCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    overflow: 'hidden',
  },
  historyHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  historyTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
  },
  historySubtitle: {
    margin: '2px 0 0 0',
    fontSize: '12.5px',
    color: '#64748b',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterInput: {
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    color: '#334155',
  },
  clearBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#475569',
  },
  tableResponsive: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '0.05em',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'left',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 16px',
    verticalAlign: 'middle',
  },
  pillBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11.5px',
    fontWeight: '700',
  },
  tableEditBtn: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
    padding: '5px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  completedTag: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#15803d',
  },
  emptyMsg: {
    padding: '32px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '13.5px',
  },
};

export default ComidaEmpleado;
