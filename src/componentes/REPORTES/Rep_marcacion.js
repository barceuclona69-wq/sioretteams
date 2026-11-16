import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoSioret from '../../imagenes/logo_sioret.png'; 
import { fetchWithFallback } from '../../config';


import { toast } from 'sonner'; // Opcional para alertas


// Define la función aquí afuera
const getBase64Image = (imgUrl) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imgUrl;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = error => reject(error);
    });
};



class Listar extends React.Component {
    constructor(props) {
        super(props);
        const hoy = new Date().toISOString().split('T')[0];
        this.state = {
            datosCargados: false,
            empleados: [],
            paginaActual: 1,
            registrosPorPagina: 50,
            fechaInicio: hoy,
            fechaFin: hoy
        }
    }

    exportarExcel = () => {
        const { empleados, fechaInicio } = this.state;
        const datosFormateados = empleados.map(emp => ({
            'ID EMPLEADO': emp.emp_code,
            'NOMBRE COMPLETO': emp.empleado,
            'DEPARTAMENTO': emp.departamento,
            'FECHA REGISTRO': emp.fecha,
            'HORA': emp.hora,
            'HORA-FORMATO': emp.horaformat
        })); 

        const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Marcación");
        XLSX.writeFile(workbook, `Reporte_Marcacion_${fechaInicio}.xlsx`);
    };
exportarPDF = async () => { // Añadimos async
    const { empleados, fechaInicio, fechaFin } = this.state;
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const azulPrimario = [0, 0, 0];
    
    // 1. Obtener el logo en Base64
    let logoBase64 = "";
    try {
        logoBase64 = await getBase64Image(logoSioret);
    } catch (e) {
        console.error("No se pudo cargar el logo", e);
    }

    // 2. Rectángulo de encabezado
    doc.setFillColor(azulPrimario[0], azulPrimario[1], azulPrimario[2]);
    doc.rect(0, 0, 297, 25, 'F');
    
    // 3. Dibujar Logo (ajustado a la izquierda)
    if (logoBase64) {
        // imagen, formato, x, y, ancho, alto
        doc.addImage(logoBase64, 'PNG', 10, 3, 20, 20); 
    }

    // 4. Textos del encabezado (Movidos a la derecha para no tapar el logo)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("REPORTE OPERATIVO DE MARCACIÓN", 35, 15); 
    
    doc.setFontSize(9);
    doc.text(`Generado desde SIORET: ${new Date().toLocaleString()}`, 220, 15);

    // 5. Cuerpo del reporte
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.text(`Periodo seleccionado: del ${fechaInicio} al ${fechaFin}`, 14, 35);
    doc.text(`Total de registros encontrados: ${empleados.length}`, 14, 41);

    const tableColumn = ["ID", "EMPLEADO", "DEPARTAMENTO", "FECHA", "HORA", "FORMATO"];
    const tableRows = empleados.map(emp => [
        emp.emp_code, 
        emp.empleado, 
        emp.departamento, 
        emp.fecha, 
        emp.hora,
        emp.horaformat
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 48,
        theme: 'grid',
        headStyles: { fillColor: azulPrimario, fontSize: 9, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 248, 255] },
        margin: { left: 14, right: 14 }
    });

    // 6. Numeración de páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, 270, 205);
    }

    doc.save(`Reporte_Marcacion_${fechaInicio}.pdf`);
};



    cargarDatos() {
        this.setState({ datosCargados: false });
        const { fechaInicio, fechaFin } = this.state;

        // Agregamos horas explícitas para evitar desfases de zona horaria en el backend
      
 const endpoint = `/api/REPORTES/rep_marcacion?inicio=${fechaInicio}&fin=${fechaFin}`; 
        // 2. Implementación de fetchWithFallback
        fetchWithFallback(endpoint)
            .then((datos) => {
                // Normalizamos los datos según como los devuelva tu API
                const dataNormalizada = Array.isArray(datos) ? datos : (datos.recordset || datos.data || []);
                
                this.setState({ 
                    datosCargados: true, 
                    empleados: dataNormalizada, 
                    paginaActual: 1 
                });
            })
            .catch(err => {
                console.error("Error en reporte marcacion:", err);
                this.setState({ datosCargados: true, empleados: [] });
                // Si usas sonner o alguna librería de notificaciones:
                // toast.error("Error al conectar con el servidor");
            });
    }




    componentDidMount() { this.cargarDatos(); }
    handleFechaChange = (e) => this.setState({ [e.target.name]: e.target.value });
    cambiarPagina = (n) => this.setState({ paginaActual: n });
    cambiarRegistrosPorPagina = (e) => this.setState({ registrosPorPagina: parseInt(e.target.value), paginaActual: 1 });

    render() {
        const { datosCargados, empleados, paginaActual, registrosPorPagina, fechaInicio, fechaFin } = this.state;
        const ultimoIndice = paginaActual * registrosPorPagina;
        const primerIndice = ultimoIndice - registrosPorPagina;
        const registrosActuales = empleados.slice(primerIndice, ultimoIndice);
        const totalPaginas = Math.ceil(empleados.length / registrosPorPagina) || 1;

        // Componente de Paginación reutilizable
        const Paginador = () => (
            <div className="d-flex justify-content-between align-items-center px-4 py-2 bg-white border-bottom">
                <div className="text-muted small">
                    Mostrando <b>{primerIndice + 1} - {Math.min(ultimoIndice, empleados.length)}</b> de {empleados.length}
                </div>
                <nav>
                    <ul className="pagination pagination-sm mb-0 shadow-sm">
                        <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                            <button className="page-link"  style={{ color: '#92b91c' }} onClick={() => this.cambiarPagina(paginaActual - 1)}>Anterior</button>
                        </li>
                        <span 
                            className="page-link" 
                            style={{ backgroundColor: '#92b91c', borderColor: '#92b91c', color: '#ffffff' }}
                        >
                            {paginaActual} / {totalPaginas}
                        </span>
                        <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                            <button className="page-link" style={{ color: '#92b91c' }} onClick={() => this.cambiarPagina(paginaActual + 1)}>Siguiente</button>
                        </li>
                    </ul>
                </nav>
            </div>
        );

        return (
            <div className="container-fluid py-4 bg-light min-vh-100" style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="card border-0 shadow-sm mb-4 rounded-3">
                    <div className="card-body p-4">
                        <div className="row align-items-center">
                            <div className="col-lg-3">
                               

                                
                                <h4 className="fw-bold mb-1" style={{ color: '#92b91c' }}>
                                                Reporte de Marcación
                                    </h4>
                                <p className="text-muted small mb-0">Panel de Control y Reportes</p>
                            </div>
                            <div className="col-lg-5">
                                <div className="d-flex gap-3">
                                    <div className="flex-grow-1">
                                        <label className="form-label x-small fw-bold text-uppercase text-muted">DESDE</label>
                                        <input type="date" name="fechaInicio" className="form-control form-control-sm border-light-subtle" value={fechaInicio} onChange={this.handleFechaChange} />
                                    </div>
                                    <div className="flex-grow-1">
                                        <label className="form-label x-small fw-bold text-uppercase text-muted">HASTA</label>
                                        <input type="date" name="fechaFin" className="form-control form-control-sm border-light-subtle" value={fechaFin} onChange={this.handleFechaChange} />
                                    </div>
                                </div>
                            </div>

                           <div className="col-lg-4 d-flex justify-content-lg-end align-items-center mt-3 mt-lg-0">
                            {/* Grupo de Exportación: Estilo sutil y limpio */}
                            <div className="btn-group shadow-sm me-3">
                                <button className="btn btn-outline-secondary btn-sm d-flex align-items-center" onClick={this.exportarExcel}>
                                    <i className="bi bi-file-earmark-excel me-2 text-success"></i> Excel
                                </button>
                                <button className="btn btn-outline-secondary btn-sm d-flex align-items-center" onClick={this.exportarPDF}>
                                    <i className="bi bi-file-earmark-pdf me-2 text-danger"></i> PDF
                                </button>
                            </div>

                            {/* Acción Principal: Destacada con icono de acción */}
                           <button 
                                className="btn btn-sm px-4 shadow-sm d-flex align-items-center fw-bold" 
                                style={{ backgroundColor: '#92b91c', borderColor: '#92b91c', color: '#ffffff' }} 
                                onClick={() => this.cargarDatos()}
                                >
                                <i className="bi bi-arrow-clockwise me-2"></i> CARGAR
                                </button>
                        </div>

                        </div>
                    </div>
                </div>

                {!datosCargados ? (
                    <div className="text-center py-5"><div className="spinner-grow text-primary"></div></div>
                ) : (
                    <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
                        {/* PAGINADOR SUPERIOR */}
                        <Paginador />

                        <div className="table-responsive shadow-sm rounded border">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">ID</th>
                                           
                                            <th>EMPLEADO</th>
                                            <th>DEPARTAMENTO</th>
                                            <th className="text-center">FECHA</th>
                                            <th className="text-center">HORA</th>
                                            <th className="text-center pe-3">FORMATO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {registrosActuales.map((emp, index) => (
                                            <tr key={index}>
                                                <td className="ps-3 fw-bold" style={{ color: '#92b91c' }}>
                                                {emp.emp_code}
                                                </td>
                                               
                                                <td className="fw-semibold">{emp.empleado}</td>
                                                <td>
                                                    <span className="text-muted small">{emp.departamento}</span>
                                                </td>
                                                <td className="text-center">{emp.fecha}</td>
                                                <td className="text-center text-secondary">{emp.hora}</td>
                                                <td className="text-center pe-3">
                                                     <span 
                                                        className="badge rounded-pill border" 
                                                        style={{ 
                                                            backgroundColor: '#92b91c18', // Fondo verde claro sutil
                                                            color: '#6e8c15',             // Texto verde oscuro para alta legibilidad
                                                            borderColor: '#92b91c40'     // Borde verde semi-transparente
                                                        }}
                                                    >
                                                        {emp.horaformat}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
</div>


                        {/* PAGINADOR INFERIOR (Opcional, lo mantengo para consistencia) */}
                        <div className="border-top">
                            <Paginador />
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

export default Listar;
