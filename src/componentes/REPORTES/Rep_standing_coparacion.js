import React from 'react'; 
import * as XLSX from 'xlsx'; 
import jsPDF from 'jspdf'; 
import autoTable from 'jspdf-autotable'; 
import logoSioret from '../../imagenes/logo_sioret.png'; 
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner'; 

class Listar extends React.Component { 
  constructor(props) { 
    super(props); 
    const hoy = new Date().toISOString().split('T')[0]; 
    this.state = { 
      datosCargados: false, 
      empleados: [], 
      paginaActual: 1, 
      registrosPorPagina: 50, 
      // Rango solicitado por defecto para el periodo original
      startDateOriginal: '2013-01-07', 
      endDateOriginal: '2013-01-11', 
      startDateReplicated: hoy, 
      endDateReplicated: hoy 
    }; 
  } 

  formatearFechaSegura = (fechaOriginal) => {
    if (!fechaOriginal) return 'N/A';
    const fechaStr = String(fechaOriginal);
    if (fechaStr.includes('T')) return fechaStr.split('T')[0];
    const d = new Date(fechaOriginal);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return fechaStr.substring(0, 10);
  };
  exportarExcel = () => { 
    const { empleados, startDateOriginal } = this.state; 
    const datosFormateados = empleados.map((emp) => ({
      'id (O)': emp.o_id || 'N/A',
      'cajas (O)': emp.o_cajas !== null ? Number(emp.o_cajas) : 0,
      'empresa (O)': emp.o_empresa || 'N/A',
      'idFactura (O)': emp.o_idFactura || 'N/A',
      'date (O)': this.formatearFechaSegura(emp.o_date),
      'day (O)': emp.o_day || 'N/A',
      'bunches (O)': emp.o_bunches !== null ? Number(emp.o_bunches) : 0,
      'total (O)': emp.o_total !== null ? Number(emp.o_total) : 0,
      'id (R)': emp.r_id || 'N/A',
      'cajas (R)': emp.r_cajas !== null ? Number(emp.r_cajas) : 0,
      'empresa (R)': emp.r_empresa || 'N/A',
      'idFactura (R)': emp.r_idFactura || 'N/A',
      'idFacturaPadre (R)': emp.r_idFacturaPadre || 'N/A',
      'date (R)': this.formatearFechaSegura(emp.r_date),
      'nombre (R)': emp.r_nombre || 'N/A',
      'day (R)': emp.r_day || 'N/A',
      'bunches (R)': emp.r_bunches !== null ? Number(emp.r_bunches) : 0,
      'total (R)': emp.r_total !== null ? Number(emp.r_total) : 0,
      'diferencia cajas': emp.diferencia_cajas !== null ? Number(emp.diferencia_cajas) : 0,
      'diferencia bunches': emp.diferencia_bunches !== null ? Number(emp.diferencia_bunches) : 0,
      'diferencia usd': emp.diferencia_usd !== null ? Number(emp.diferencia_usd) : 0
    })); 

    const worksheet = XLSX.utils.json_to_sheet(datosFormateados); 
    const workbook = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comparativo Standing"); 
    XLSX.writeFile(workbook, `Reporte_standing_${startDateOriginal}.xlsx`); 
  };

  cargarDatos() { 
    this.setState({ datosCargados: false }); 
    const { startDateOriginal, endDateOriginal, startDateReplicated, endDateReplicated } = this.state; 
    const endpoint = `/api/RRHH/rep_comparativo_standing?startDateOriginal=${startDateOriginal}&endDateOriginal=${endDateOriginal}&startDateReplicated=${startDateReplicated}&endDateReplicated=${endDateReplicated}`; 
    
    fetchWithFallback(endpoint) 
      .then((datos) => { 
        const dataNormalizada = Array.isArray(datos) ? datos : (datos.recordset || datos.data || []); 
        this.setState({ datosCargados: true, empleados: dataNormalizada, paginaActual: 1 }); 
      }) 
      .catch(err => { 
        console.error("Error en reporte:", err); 
        this.setState({ datosCargados: true, empleados: [] }); 
        toast.error("Error al conectar con el servidor"); 
      }); 
  } 

  componentDidMount() { this.cargarDatos(); } 
  handleFechaChange = (e) => this.setState({ [e.target.name]: e.target.value }); 
  cambiarPagina = (n) => this.setState({ paginaActual: n }); 
  cambiarRegistrosPorPagina = (e) => this.setState({ registrosPorPagina: parseInt(e.target.value), paginaActual: 1 }); 
  render() { 
    const { datosCargados, empleados, paginaActual, registrosPorPagina, startDateOriginal, endDateOriginal, startDateReplicated, endDateReplicated } = this.state; 
    const ultimoIndice = paginaActual * registrosPorPagina; 
    const primerIndice = ultimoIndice - registrosPorPagina; 
    const registrosActuales = empleados.slice(primerIndice, ultimoIndice); 
    const totalPaginas = Math.ceil(empleados.length / registrosPorPagina) || 1; 

    // Cálculos globales acumulados para el Resumen de Diferencias Totales
    const totalDifCajas = empleados.reduce((sum, emp) => sum + Number(emp.diferencia_cajas || 0), 0);
    const totalDifBunches = empleados.reduce((sum, emp) => sum + Number(emp.diferencia_bunches || 0), 0);
    const totalDifUsd = empleados.reduce((sum, emp) => sum + Number(emp.diferencia_usd || 0), 0);

    const Paginador = () => ( 
      <div className="d-flex justify-content-between align-items-center px-4 py-2 bg-white border-bottom"> 
        <div className="text-muted small">Mostrando <b>{primerIndice + 1} - {Math.min(ultimoIndice, empleados.length)}</b> de {empleados.length}</div> 
        <nav> 
          <ul className="pagination pagination-sm mb-0 shadow-sm"> 
            <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}><button className="page-link" style={{ color: '#92b91c' }} onClick={() => this.cambiarPagina(paginaActual - 1)}>Anterior</button></li> 
            <span className="page-link" style={{ backgroundColor: '#92b91c', borderColor: '#92b91c', color: '#ffffff' }}>{paginaActual} / {totalPaginas}</span> 
            <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}><button className="page-link" style={{ color: '#92b91c' }} onClick={() => this.cambiarPagina(paginaActual + 1)}>Siguiente</button></li> 
          </ul> 
        </nav> 
      </div> 
    ); 

    return ( 
      <div className="container-fluid py-4 bg-light min-vh-100" style={{ fontFamily: "'Inter', sans-serif" }}> 
        <div className="card border-0 shadow-sm mb-4 rounded-3"> 
          <div className="card-body p-4"> 
            <div className="row align-items-center g-3"> 
              <div className="col-xl-3 col-lg-12"> 
                <h4 className="fw-bold mb-1" style={{ color: '#92b91c' }}>Reporte Standing</h4> 
                <p className="text-muted small mb-0">Vista Plana Comparativa</p> 
              </div> 
              <div className="col-xl-4 col-lg-6">
                <div className="p-2 border rounded bg-white">
                  <span className="badge text-dark mb-2" style={{ backgroundColor: '#e3f2fd' }}>PERIODO ORIGINAL</span>
                  <div className="d-flex gap-2"> 
                    <div className="flex-grow-1"><label className="form-label x-small fw-bold text-muted mb-1">DESDE</label><input type="date" name="startDateOriginal" className="form-control form-control-sm" value={startDateOriginal} onChange={this.handleFechaChange} /></div> 
                    <div className="flex-grow-1"><label className="form-label x-small fw-bold text-muted mb-1">HASTA</label><input type="date" name="endDateOriginal" className="form-control form-control-sm" value={endDateOriginal} onChange={this.handleFechaChange} /></div> 
                  </div>
                </div>
              </div> 
              <div className="col-xl-4 col-lg-6">
                <div className="p-2 border rounded bg-white">
                  <span className="badge text-dark mb-2" style={{ backgroundColor: '#f1f8e9' }}>PERIODO REPLICADO</span>
                  <div className="d-flex gap-2"> 
                    <div className="flex-grow-1"><label className="form-label x-small fw-bold text-muted mb-1">DESDE</label><input type="date" name="startDateReplicated" className="form-control form-control-sm" value={startDateReplicated} onChange={this.handleFechaChange} /></div> 
                    <div className="flex-grow-1"><label className="form-label x-small fw-bold text-muted mb-1">HASTA</label><input type="date" name="endDateReplicated" className="form-control form-control-sm" value={endDateReplicated} onChange={this.handleFechaChange} /></div> 
                  </div>
                </div>
              </div> 
              <div className="col-xl-1 col-lg-12 d-flex justify-content-xl-end gap-2 mt-xl-4"> 
                <button className="btn btn-outline-secondary btn-sm" onClick={this.exportarExcel} title="Exportar Excel"><i className="bi bi-file-earmark-excel text-success"></i>Excel</button> 
                <button className="btn btn-sm fw-bold px-3 text-white" style={{ backgroundColor: '#92b91c', borderColor: '#92b91c' }} onClick={() => this.cargarDatos()}><i className="bi bi-arrow-clockwise"></i>Cargar</button> 
              </div> 
            </div> 
          </div> 
        </div>

        {/* SECCIÓN VISUAL DE TARJETAS DE RESUMEN (KPIs) */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-3 bg-white border-start border-warning border-4">
              <div className="card-body p-3">
                <div className="text-muted small text-uppercase fw-bold">Total Dif. Cajas</div>
                <h3 className={`fw-bold mb-0 mt-1 ${totalDifCajas < 0 ? 'text-danger' : totalDifCajas > 0 ? 'text-success' : 'text-dark'}`}>
                  {totalDifCajas > 0 ? `+${totalDifCajas}` : totalDifCajas}
                </h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-3 bg-white border-start border-warning border-4">
              <div className="card-body p-3">
                <div className="text-muted small text-uppercase fw-bold">Total Dif. Bunches</div>
                <h3 className={`fw-bold mb-0 mt-1 ${totalDifBunches < 0 ? 'text-danger' : totalDifBunches > 0 ? 'text-success' : 'text-dark'}`}>
                  {totalDifBunches > 0 ? `+${totalDifBunches}` : totalDifBunches}
                </h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-3 bg-white border-start border-warning border-4">
              <div className="card-body p-3">
                <div className="text-muted small text-uppercase fw-bold">Total Dif. Balance USD</div>
                <h3 className={`fw-bold mb-0 mt-1 ${totalDifUsd < 0 ? 'text-danger' : totalDifUsd > 0 ? 'text-success' : 'text-dark'}`}>
                  {totalDifUsd >= 0 ? `$${totalDifUsd.toFixed(2)}` : `-$${Math.abs(totalDifUsd).toFixed(2)}`}
                </h3>
              </div>
            </div>
          </div>
        </div>
        {!datosCargados ? ( 
          <div className="text-center py-5"><div className="spinner-grow text-primary"></div></div> 
        ) : ( 
          <div className="card border-0 shadow-sm rounded-3 overflow-hidden"> 
            <Paginador /> 
            <div className="table-responsive shadow-sm rounded border"> 
              <table className="table table-hover align-middle mb-0 text-center small table-bordered" style={{ fontSize: '0.74rem', minWidth: '2400px' }}> 
                <thead className="table-light fw-bold"> 
                  <tr>
                    <th>id</th><th>cajas</th><th>empresa</th><th>idFactura</th><th>date</th><th>day</th><th>bunches</th><th>total</th>
                    <th>id</th><th>cajas</th><th>empresa</th><th>idFactura</th><th>idFacturaPadre</th><th>date</th><th>nombre</th><th>day</th><th>bunches</th><th>total</th>
                    <th className="table-warning">diferencia cajas</th><th className="table-warning">diferencia bunches</th><th className="table-warning">diferencia usd</th>
                  </tr>
                </thead> 
                <tbody> 
                  {registrosActuales.map((emp, idx) => {
                    const cO = emp.o_cajas !== null && emp.o_cajas !== undefined ? Number(emp.o_cajas) : 0;
                    const bO = emp.o_bunches !== null && emp.o_bunches !== undefined ? Number(emp.o_bunches) : 0;
                    const tO = emp.o_total !== null && emp.o_total !== undefined ? Number(emp.o_total) : 0;

                    const cR = emp.r_cajas !== null && emp.r_cajas !== undefined ? Number(emp.r_cajas) : 0;
                    const bR = emp.r_bunches !== null && emp.r_bunches !== undefined ? Number(emp.r_bunches) : 0;
                    const tR = emp.r_total !== null && emp.r_total !== undefined ? Number(emp.r_total) : 0;

                    const difC = emp.diferencia_cajas !== null && emp.diferencia_cajas !== undefined ? Number(emp.diferencia_cajas) : 0;
                    const difB = emp.diferencia_bunches !== null && emp.diferencia_bunches !== undefined ? Number(emp.diferencia_bunches) : 0;
                    const difU = emp.diferencia_usd !== null && emp.diferencia_usd !== undefined ? Number(emp.diferencia_usd) : 0;

                    return (
                      <tr key={idx}>
                        {/* Columnas Originales */}
                        <td>{emp.o_id || 'N/A'}</td>
                        <td>{cO}</td>
                        <td className="text-start">{emp.o_empresa || 'N/A'}</td>
                        <td>{emp.o_idFactura || 'N/A'}</td>
                        <td>{this.formatearFechaSegura(emp.o_date)}</td>
                        <td>{emp.o_day || 'N/A'}</td>
                        <td>{bO}</td>
                        <td>${tO.toFixed(2)}</td>

                        {/* Columnas Replicadas */}
                        <td>{emp.r_id || 'N/A'}</td>
                        <td>{cR}</td>
                        <td className="text-start">{emp.r_empresa || 'N/A'}</td>
                        <td>{emp.r_idFactura || 'N/A'}</td>
                        <td>{emp.r_idFacturaPadre || 'N/A'}</td>
                        <td>{this.formatearFechaSegura(emp.r_date)}</td>
                        <td>{emp.r_nombre ? <span className="badge bg-secondary">{emp.r_nombre}</span> : 'N/A'}</td>
                        <td>{emp.r_day || 'N/A'}</td>
                        <td>{bR}</td>
                        <td>${tR.toFixed(2)}</td>

                        {/* Columnas Diferencias */}
                        <td className={`fw-bold ${difC < 0 ? 'text-danger' : difC > 0 ? 'text-success' : 'text-muted'}`}>{difC}</td>
                        <td className={`fw-bold ${difB < 0 ? 'text-danger' : difB > 0 ? 'text-success' : 'text-muted'}`}>{difB}</td>
                        <td className={`fw-bold ${difU < 0 ? 'text-danger' : difU > 0 ? 'text-success' : 'text-muted'}`}>${difU.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody> 
              </table> 
            </div> 
            <div className="border-top"><Paginador /></div> 
          </div> 
        )} 
      </div> 
    ); 
  } 
} 

export default Listar;
