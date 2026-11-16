import { useState } from 'react';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../config';

function EmpleadosDartis() {
  const [data, setData] = useState([]);
  const hoy = new Date().toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [loading, setLoading] = useState(false);

  // Estados para Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(25);

  const exportarExcel = () => {
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Reporte_DARTIS_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  const consultarDatos = () => {
    setLoading(true);
    setPaginaActual(1);
   fetch(`${API_BASE_URL }/api/DARTIS/rep_ingactivo?fIni=${fechaInicio}&fFin=${fechaFin}`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  // Lógica de Paginación
  const ultimoIndice = paginaActual * registrosPorPagina;
  const primerIndice = ultimoIndice - registrosPorPagina;
  const registrosActuales = data.length > 0 && !data.Mensaje ? data.slice(primerIndice, ultimoIndice) : [];
  const totalPaginas = Math.ceil(data.length / registrosPorPagina);

  const columnas = data.length > 0 && !data.Mensaje ? Object.keys(data[0]) : [];

  return (
    <div className="d-flex flex-column vh-100 bg-light p-3 mx-auto" style={{ overflow: 'hidden', maxWidth: '1600px', width: '100%' }}>
      <div className="card shadow-sm d-flex flex-column h-100 overflow-hidden border-0">
        
        {/* HEADER */}
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center py-2 flex-shrink-0">
          <h6 className="mb-0 fw-bold"><i className="bi bi-table me-2"></i>REPORTE DARTIS</h6>
          <div className="d-flex gap-2 align-items-center">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-secondary text-white border-0">De</span>
              <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-secondary text-white border-0">A</span>
              <input type="date" className="form-control" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm fw-bold px-3 shadow-sm" onClick={consultarDatos} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm"></span> : 'CONSULTAR'}
            </button>
            {data.length > 0 && (
              <button className="btn btn-success btn-sm fw-bold px-3 shadow-sm" onClick={exportarExcel}>EXCEL</button>
            )}
          </div>
        </div>

        {/* BARRA DE CONTROL Y PAGINACIÓN */}
        <div className="bg-white border-bottom p-2 d-flex justify-content-between align-items-center flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted fw-bold">Mostrar:</span>
            <select 
              className="form-select form-select-sm w-auto" 
              value={registrosPorPagina} 
              onChange={(e) => { setRegistrosPorPagina(Number(e.target.value)); setPaginaActual(1); }}
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <nav className="d-flex align-items-center gap-3">
            <button 
              className="btn btn-outline-secondary btn-sm border-0" 
              disabled={paginaActual === 1 || loading} 
              onClick={() => setPaginaActual(p => p - 1)}
            >
              <b>&laquo; Anterior</b>
            </button>
            <span className="small fw-bold px-3 py-1 bg-light rounded border">
              Página {paginaActual} de {totalPaginas || 1}
            </span>
            <button 
              className="btn btn-outline-secondary btn-sm border-0" 
              disabled={paginaActual === totalPaginas || totalPaginas === 0 || loading} 
              onClick={() => setPaginaActual(p => p + 1)}
            >
              <b>Siguiente &raquo;</b>
            </button>
          </nav>
        </div>

        {/* CONTENEDOR DE TABLA SIN TOTALES */}
        <div className="card-body p-0 flex-grow-1 overflow-hidden position-relative">
          <div className="table-responsive h-100 w-100" style={{ overflow: 'auto' }}>
            <table className="table table-sm table-hover table-bordered mb-0" style={{ fontSize: '0.82rem', width: 'max-content', minWidth: '100%' }}>
              <thead className="table-dark sticky-top" style={{ zIndex: 10 }}>
                <tr>
                  {columnas.map((col) => (
                    <th key={col} className="text-nowrap px-3 py-2 align-middle text-center border-bottom-0">{col.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={columnas.length || 1} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                      <div className="mt-2 text-muted">Procesando datos...</div>
                    </td>
                  </tr>
                ) : registrosActuales.length > 0 ? (
                  registrosActuales.map((item, index) => (
                    <tr key={index}>
                      {columnas.map((col) => (
                        <td key={`${index}-${col}`} className="px-3 py-1 text-nowrap align-middle">
                          {col.toLowerCase().includes('id') ? <span className="fw-bold text-primary">{item[col]}</span> : (item[col] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columnas.length || 1} className="text-center py-5 text-muted">
                      <i className="bi bi-info-circle me-2"></i>No hay registros para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* FOOTER INFERIOR */}
        <div className="card-footer py-1 bg-white text-muted small flex-shrink-0 d-flex justify-content-between border-top">
          <span>Mostrando <b>{data.length > 0 ? primerIndice + 1 : 0} - {Math.min(ultimoIndice, data.length)}</b> de <b>{data.length}</b> registros</span>
          <span className="opacity-75">DARTIS Sistema v1.2</span>
        </div>
      </div>
    </div>
  );
}

export default EmpleadosDartis;
