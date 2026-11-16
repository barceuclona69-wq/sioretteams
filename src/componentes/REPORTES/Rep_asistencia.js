import React from 'react';
import { fetchWithFallback } from '../../config';
import logoDartis from '../../imagenes/dartis.jpg';
import Repalertabiometrico from '../REPORTES/Rep_alerta_biometrico';

class Repasistencia extends React.Component {
    constructor(props) {
        super(props);
        const hoy = new Date().toLocaleDateString('en-CA');
        this.state = {
            datosCargados: false,
            empleados: [],
            paginaActual: 1,
            registrosPorPagina: 50,
            fechaInicio: hoy,
            fechaFin: hoy,
            menuTxtAbierto: false
        };
    }

    componentDidMount() {
        this.cargarDatos();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.fechaInicio !== this.state.fechaInicio || prevState.fechaFin !== this.state.fechaFin) {
            this.cargarDatos();
        }
    }

    cargarDatos() {
        this.setState({ datosCargados: false, menuTxtAbierto: false });
        const { fechaInicio, fechaFin } = this.state;
        const endpoint = `/api/REPORTES/rep_asistencia?inicio=${fechaInicio}&fin=${fechaFin}`;

        fetchWithFallback(endpoint)
            .then((datos) => {
                const dataNormalizada = Array.isArray(datos) ? datos : (datos.recordset || datos.data || []);
                this.setState({
                    datosCargados: true,
                    empleados: dataNormalizada,
                    paginaActual: 1
                });
            })
            .catch(err => {
                console.error("Error en reporte de asistencia:", err);
                this.setState({ datosCargados: true, empleados: [] });
            });
    }
    exportarTxt = (conEncabezados) => {
        this.setState({ menuTxtAbierto: false });
        const { empleados, fechaInicio, fechaFin } = this.state;
        if (!empleados || empleados.length === 0) return;

        const lineas = [];
        if (conEncabezados) {
            lineas.push('ID\tFECHA\tHORA');
        }
        empleados.forEach((emp) => {
            lineas.push(`${emp.emp_code}\t${emp.fecha}\t${emp.hora}`);
        });

        const contenido = lineas.join('\r\n');
        const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.setAttribute('download', `asistencia_${fechaInicio}_a_${fechaFin}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    toggleMenuTxt = () => {
        this.setState(prevState => ({ menuTxtAbierto: !prevState.menuTxtAbierto }));
    };

    handleFechaChange = (e) => this.setState({ [e.target.name]: e.target.value });
    cambiarPagina = (n) => this.setState({ paginaActual: n });
    cambiarRegistrosPorPagina = (e) => this.setState({ registrosPorPagina: parseInt(e.target.value, 10), paginaActual: 1 });

    render() {
        const { datosCargados, empleados, paginaActual, registrosPorPagina, fechaInicio, fechaFin, menuTxtAbierto } = this.state;

        const totalRegistros = empleados.length;
        const empleadosUnicos = new Set(empleados.map(e => e.emp_code)).size;
        const ultimoIndice = paginaActual * registrosPorPagina;
        const primerIndice = ultimoIndice - registrosPorPagina;
        const registrosActuales = empleados.slice(primerIndice, ultimoIndice);
        const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina) || 1;

        const Paginador = () => (
            <div className="d-flex flex-wrap justify-content-between align-items-center px-4 py-3 bg-white gap-2">
                <div className="text-muted small">
                    Mostrando <b>{totalRegistros === 0 ? 0 : primerIndice + 1} - {Math.min(ultimoIndice, totalRegistros)}</b> de <b>{totalRegistros}</b> registros
                </div>
                <nav>
                    <ul className="pagination pagination-sm mb-0 shadow-sm">
                        <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                            <button className="page-link text-dark" onClick={() => this.cambiarPagina(paginaActual - 1)}>
                                <i className="bi bi-chevron-left"></i>
                            </button>
                        </li>
                        <span
                            className="page-link fw-semibold px-3"
                            style={{ backgroundColor: '#92b91c', borderColor: '#92b91c', color: '#ffffff' }}
                        >
                            {paginaActual} / {totalPaginas}
                        </span>
                        <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                            <button className="page-link text-dark" onClick={() => this.cambiarPagina(paginaActual + 1)}>
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>
        );
        return (
            <div className="container-fluid py-4 bg-light min-vh-100" style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="mx-auto" style={{ maxWidth: '1040px' }}>
                    <div className="mb-4">
                        <Repalertabiometrico />
                    </div>
                    {/* Tarjeta de Cabecera, Filtros y Aviso DARTIS */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-4">
                            <div className="row g-3 align-items-end">
                                <div className="col-lg-3">
                                    <div className="d-flex align-items-center gap-2 mb-1">

                                         {/* === GRÁFICO DE MONITOREO BIOMÉTRICO EN TIEMPO REAL === */}
                   

                                        <div
                                            className="rounded-3 d-flex align-items-center justify-content-center"
                                            style={{ width: '36px', height: '36px', backgroundColor: '#92b91c20', color: '#92b91c' }}
                                        >
                                            <i className="bi bi-fingerprint fs-5"></i>
                                        </div>
                                        <h4 className="fw-bold mb-0" style={{ color: '#2b3035' }}>
                                            Asistencia
                                        </h4>
                                    </div>
                                    <p className="text-muted small mb-0">Registro de marcaciones</p>
                                </div>

                                <div className="col-lg-4">
                                    <div className="d-flex gap-2">
                                        <div className="flex-grow-1">
                                            <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: '0.75rem' }}>DESDE</label>
                                            <input
                                                type="date"
                                                name="fechaInicio"
                                                className="form-control form-control-sm bg-light border-0 py-2 px-3 rounded-3"
                                                value={fechaInicio}
                                                onChange={this.handleFechaChange}
                                            />
                                        </div>
                                        <div className="flex-grow-1">
                                            <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: '0.75rem' }}>HASTA</label>
                                            <input
                                                type="date"
                                                name="fechaFin"
                                                className="form-control form-control-sm bg-light border-0 py-2 px-3 rounded-3"
                                                value={fechaFin}
                                                onChange={this.handleFechaChange}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="col-lg-5">
                                    <div className="d-flex flex-wrap align-items-center gap-2 justify-content-lg-end">
                                        <button
                                            className="btn btn-sm py-2 px-3 shadow-sm fw-semibold rounded-3 d-flex align-items-center justify-content-center"
                                            style={{ backgroundColor: '#92b91c', borderColor: '#92b91c', color: '#ffffff' }}
                                            onClick={() => this.cargarDatos()}
                                        >
                                            <i className="bi bi-arrow-clockwise me-1"></i> Actualizar
                                        </button>

                                        {/* Menú TXT controlado por React */}
                                        <div className="position-relative">
                                            <button
                                                className="btn btn-sm btn-outline-secondary py-2 px-3 shadow-sm fw-semibold rounded-3 dropdown-toggle d-flex align-items-center"
                                                type="button"
                                                onClick={this.toggleMenuTxt}
                                                disabled={!datosCargados || totalRegistros === 0}
                                            >
                                                <i className="bi bi-file-earmark-text me-1"></i> TXT
                                            </button>
                                            {menuTxtAbierto && (
                                                <ul
                                                    className="dropdown-menu show shadow border-0 rounded-3 mt-1"
                                                    style={{ position: 'absolute', right: 0, left: 'auto', zIndex: 1050, minWidth: '180px' }}
                                                >
                                                    <li>
                                                        <button type="button" className="dropdown-item small py-2" onClick={() => this.exportarTxt(true)}>
                                                            <i className="bi bi-card-heading me-2 text-success"></i> Con encabezados
                                                        </button>
                                                    </li>
                                                    <li>
                                                        <button type="button" className="dropdown-item small py-2" onClick={() => this.exportarTxt(false)}>
                                                            <i className="bi bi-list-ul me-2 text-secondary"></i> Sin encabezados
                                                        </button>
                                                    </li>
                                                </ul>
                                            )}
                                        </div>

                                        {/* Distintivo de migración a DARTIS */}
                                        <div title="Esta información debe ser migrada a DARTIS" className="d-flex align-items-center gap-2">
                                            <img
                                                src={logoDartis}
                                                alt="Logo DARTIS"
                                                className="rounded-2 object-fit-cover shadow-xs"
                                                style={{ width: '68px', height: '68px' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
           
                    {/* Tarjetas de Resumen Rápido (KPIs) */}
                    {datosCargados && (
                        <div className="row g-3 mb-4">
                            <div className="col-6">
                                <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row align-items-center gap-3">
                                    <div className="rounded-circle p-3 d-flex" style={{ backgroundColor: '#92b91c18', color: '#7a9c16' }}>
                                        <i className="bi bi-check2-circle fs-4"></i>
                                    </div>
                                    <div>
                                        <div className="text-muted small fw-semibold">Total Marcaciones</div>
                                        <div className="fs-4 fw-bold text-dark">{totalRegistros}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-6">
                                <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row align-items-center gap-3">
                                    <div className="rounded-circle p-3 d-flex bg-primary bg-opacity-10 text-primary">
                                        <i className="bi bi-people fs-4"></i>
                                    </div>
                                    <div>
                                        <div className="text-muted small fw-semibold">Empleados Únicos</div>
                                        <div className="fs-4 fw-bold text-dark">{empleadosUnicos}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                   
                    {/* Tabla de Resultados */}
                    {!datosCargados ? (
                        <div className="card border-0 shadow-sm rounded-4 py-5 text-center">
                            <div className="spinner-border mx-auto mb-2" style={{ color: '#92b91c' }} role="status"></div>
                            <p className="text-muted small mb-0">Cargando marcaciones...</p>
                        </div>
                    ) : (
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                            <Paginador />
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #edf2f7', borderBottom: '1px solid #edf2f7' }}>
                                        <tr className="text-muted small text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                                            <th className="ps-4 py-3">Empleado / ID</th>
                                            <th className="text-center py-3">Fecha</th>
                                            <th className="text-end pe-4 py-3">Hora de Marca</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {registrosActuales.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="text-center py-5">
                                                    <i className="bi bi-inbox fs-1 text-muted opacity-50 d-block mb-2"></i>
                                                    <span className="text-muted">No se encontraron marcaciones en el rango seleccionado.</span>
                                                </td>
                                            </tr>
                                        ) : (
                                            registrosActuales.map((emp, index) => (
                                                <tr key={`${emp.emp_code}-${emp.fecha}-${emp.hora}-${index}`}>
                                                    <td className="ps-4 py-3">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div
                                                                className="rounded-circle d-flex align-items-center justify-content-center fw-bold small"
                                                                style={{ width: '32px', height: '32px', backgroundColor: '#f1f5f9', color: '#475569' }}
                                                            >
                                                                <i className="bi bi-person-badge"></i>
                                                            </div>
                                                            <span className="fw-bold" style={{ color: '#2b3035' }}>
                                                                {emp.emp_code}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center text-secondary">
                                                        <i className="bi bi-calendar3 me-2 text-muted small"></i>
                                                        {emp.fecha}
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <span
                                                            className="badge rounded-pill px-3 py-2 fw-semibold"
                                                            style={{
                                                                backgroundColor: '#92b91c18',
                                                                color: '#6e8c15',
                                                                border: '1px solid #92b91c40'
                                                            }}
                                                        >
                                                            <i className="bi bi-clock me-1"></i> {emp.hora}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {totalRegistros > 0 && (
                                <div className="border-top">
                                    <Paginador />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

export default Repasistencia;
