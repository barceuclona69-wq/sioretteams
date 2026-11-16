import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoSioret from '../../imagenes/logo_sioret.png'; 
import { API_BASE_URL } from '../../config';

import { fetchWithFallback } from '../../config'; // <-- Importado fetchWithFallback


// Cambia esto en tu sección de imports:
import { Toaster, toast } from 'sonner';



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

    // Método auxiliar para aplicar el color
getEstiloNoTimbra = (valor) => {
    const esNoTimbra = String(valor || "").toLowerCase().trim() === "no timbra";
    
    return esNoTimbra ? {
       color: '#d9534f',
        fontWeight: 'bold',
        backgroundColor: '#fff5f5',
        border: '1px solid #d9534f', // Añadido para resaltar el óvalo
        padding: '1px 8px',         // Más padding a los lados para acentuar el óvalo
        borderRadius: '50px',        // Esto crea el efecto de óvalo completo
        display: 'inline-block',     // Asegura que respete el padding y radio
        textAlign: 'center'
    } : {};
};





   exportarExcel = () => {
    const { empleados, fechaInicio } = this.state;
    const datosFormateados = empleados.map(emp => ({
        'ID EMPLEADO': emp.emp_code,
        'IDENTIFICACIÓN': emp.identificacion,
        'NOMBRE COMPLETO': emp.empleado,
        'DEPARTAMENTO': emp.departamento,
        'FECHA REGISTRO': emp.fecha,
        'HORA': emp.hora,
        'HORA-FORMATO': emp.horaformat,
        // Nuevas columnas agregadas:
        'TIM 1 IN': emp.Tim_1_IN,
        'TIM 1 FN': emp.Tim_1_FN,
        'TIM 2 IN': emp.Tim_2_IN,
        'TIM 2 FN': emp.Tim_2_FN,
        'TIM 3 IN': emp.Tim_3_IN,
        'TIM 3 FN': emp.Tim_3_FN
      
    })); 

    const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Lactario");
    XLSX.writeFile(workbook, `Reporte_Lactario_${fechaInicio}.xlsx`);
};

    
exportarPDF = async () => {
    const { empleados, fechaInicio, fechaFin } = this.state;
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const azulPrimario = [0, 0, 0];
    
    let logoBase64 = "";
    try {
        logoBase64 = await getBase64Image(logoSioret);
    } catch (e) {
        console.error("No se pudo cargar el logo", e);
    }

    // Encabezado
    doc.setFillColor(azulPrimario[0], azulPrimario[1], azulPrimario[2]);
    doc.rect(0, 0, 297, 25, 'F');
    
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 10, 3, 20, 20); 
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("REPORTE OPERATIVO DE LACTARIO", 35, 15); 
    
    doc.setFontSize(9);
    doc.text(`Generado desde SIORET: ${new Date().toLocaleString()}`, 220, 15);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Periodo seleccionado: del ${fechaInicio} al ${fechaFin}`, 10, 35);
    doc.text(`Total de registros encontrados: ${empleados.length}`, 10, 40);

    // 1. Aumentamos los encabezados de las columnas
    const tableColumn = [
        "ID", "IDENTIFICACIÓN", "EMPLEADO", "DEP.", "FECHA", 
        "T1-IN", "T1-FN", "T2-IN", "T2-FN", "T3-IN", "T3-FN"
    ];

    // 2. Mapeamos todos los campos de timbraje solicitados
    const tableRows = empleados.map(emp => [
        emp.emp_code, 
        emp.identificacion, 
        emp.empleado, 
        emp.departamento, 
        emp.fecha, 
        emp.Tim_1_IN, emp.Tim_1_FN,
        emp.Tim_2_IN, emp.Tim_2_FN,
        emp.Tim_3_IN, emp.Tim_3_FN
       
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: azulPrimario, fontSize: 7, halign: 'center' },
        styles: { 
            fontSize: 6.5, // Reducido un poco para que entren las 15 columnas
            cellPadding: 1,
            halign: 'center' 
        },
        columnStyles: {
            2: { halign: 'left', cellWidth: 40 }, // Nombre del empleado un poco más ancho
        },
        alternateRowStyles: { fillColor: [245, 248, 255] },
        margin: { left: 10, right: 10 },
        // Lógica para pintar de rojo "No timbra" igual que en tu tabla HTML
        didParseCell: function (data) {
            if (data.section === 'body') {
                const cellText = String(data.cell.raw || "").toLowerCase().trim();
                if (cellText === "no timbra") {
                    data.cell.styles.textColor = [217, 83, 79]; // Color #d9534f
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, 270, 205);
    }

    doc.save(`Reporte_Lactario${fechaInicio}.pdf`);
};



   cargarDatos() {
        this.setState({ datosCargados: false });
        const { fechaInicio, fechaFin } = this.state;

        // Agregamos horas explícitas para evitar desfases de zona horaria en el backend
      

         const endpoint = `/api/REPORTES/rep_laptario?inicio=${fechaInicio}&fin=${fechaFin}`; 
        fetchWithFallback(endpoint)
            .then((datos) => {
                // Normalización de datos (Array, recordset o data)
                const dataNormalizada = Array.isArray(datos) ? datos : (datos.recordset || datos.data || []);
                
                this.setState({ 
                    datosCargados: true, 
                    empleados: dataNormalizada, 
                    paginaActual: 1 
                });
            })
            .catch(err => {
                console.error("Error en reporte lactario:", err);
                this.setState({ datosCargados: true, empleados: [] });
                toast.error("Error al conectar con el servidor de Lactario");
            });
    }


    consultarEstadoBiometrico() {
    const serial = 'JUC5243200047';
    // Se concatena la variable serial al final de la ruta
    const endpoint = `/api/REPORTES/ztecoonline_veronline/${serial}`;
   
    fetchWithFallback(endpoint)
        .then((dispositivo) => {
            this.setState({ dispositivoStatus: dispositivo });
            console.log("✅ Datos del biométrico recibidos:", dispositivo);

            if (!dispositivo || !dispositivo.estadoReal) return;

            if (dispositivo.estadoReal === 'Desconectado') {
                toast.error(
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="spinner-grow spinner-grow-sm text-danger" role="status" style={{ width: '15px', height: '15px' }}></span>
                            <strong style={{ fontSize: '1.05rem', color: '#721c24' }}>
                                ¡ALERTA: BIOMÉTRICO DESCONECTADO!
                            </strong>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#555' }}>
                            El dispositivo <b>{dispositivo.nombreDispositivo || 'LACTARIO / JUC5243200047'}</b> ha perdido comunicación.
                        </p>
                    </div>,
                    {
                        id: 'alerta-biometrico-id',
                        duration: Infinity, 
                        style: { background: '#fff5f5', borderLeft: '8px solid #d9534f', padding: '16px', borderRadius: '8px' },
                        action: { label: 'Verificar Ahora', onClick: () => this.consultarEstadoBiometrico() }
                    }
                );
            } else if (dispositivo.estadoReal === 'En Línea') {
                toast.success(
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <strong style={{ fontSize: '0.95rem' }}>¡Conexión Exitosa!</strong>
                        <span style={{ fontSize: '0.85rem' }}>
                            Biométrico <b>{dispositivo.nombreDispositivo || 'LACTARIO / JUC5243200047'}</b> en línea de forma correcta.
                        </span>
                    </div>, 
                    { 
                        id: 'alerta-biometrico-id',
                        duration: 18000 
                    }
                );
            }
        })
        .catch(err => console.error("❌ Error en flujo del biométrico:", err));
}


componentDidMount() {
    this.cargarDatos();
    
    // Ejecución inmediata inicial
    this.consultarEstadoBiometrico(); 

    // Configura un chequeo automático en segundo plano cada 30 segundos (30000 ms)
    this.biometricoInterval = setInterval(() => {
        this.consultarEstadoBiometrico();
    }, 20000);

}

// OBLIGATORIO: Limpiar el intervalo cuando el usuario abandone esta pantalla para evitar fugas de memoria
componentWillUnmount() {
    if (this.biometricoInterval) {
        clearInterval(this.biometricoInterval);
    }
}


   // Se dispara al montar el componente
   componentDidMount() {
    this.cargarDatos();

    // CORREGIDO: Usamos setTimeout de 100ms para asegurar que el DOM y el Toaster estén listos
    this.timerInicial = setTimeout(() => {
        this.consultarEstadoBiometrico();
    }, 100);

    // Configura el chequeo automático en segundo plano cada 30 segundos
    this.biometricoInterval = setInterval(() => {
        this.consultarEstadoBiometrico();
    }, 20000);
}


    // Se dispara si cambias las fechas (opcional, para carga automática)
    componentDidUpdate(prevProps, prevState) {
        if (prevState.fechaInicio !== this.state.fechaInicio || prevState.fechaFin !== this.state.fechaFin) {
            this.cargarDatos();
        }
    }
    
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
                            <button className="page-link" onClick={() => this.cambiarPagina(paginaActual - 1)}>Anterior</button>
                        </li>
                        <li className="page-item active">
                        <span 
                            className="page-link" 
                            style={{ backgroundColor: '#92b91c', borderColor: '#92b91c', color: '#ffffff' }}
                        >
                            {paginaActual} / {totalPaginas}
                        </span>
                    </li>

                        <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => this.cambiarPagina(paginaActual + 1)}>Siguiente</button>
                        </li>
                    </ul>
                </nav>
            </div>
        );

        return (
           
                <div className="container-fluid py-4 bg-light min-vh-100" style={{ fontFamily: "'Inter', sans-serif" }}>
                     {/* COMPONENTE SIEMPRE VISIBLE EN LA RAÍZ DEL COMPONENTE */}
          
      
                <div className="card border-0 shadow-sm mb-4 rounded-3">
                    <div className="card-body p-4">
                        <div className="row align-items-center">
                            <div className="col-lg-3">
                               <h4 className="fw-bold mb-1" style={{ color: '#92b91c' }}>
                                                Lactario
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
                                            <th>IDENTIFICACIÓN</th>
                                            <th>EMPLEADO</th>
                                            <th>DEPARTAMENTO</th>
                                            <th className="text-center">FECHA</th>
                                            <th className="text-center">TIM_1_IN</th>
                                            <th className="text-center">TIM_1_FN</th>
                                            <th className="text-center">TIM_2_IN</th>
                                            <th className="text-center">TIM_2_FN</th>
                                            <th className="text-center">TIM_3_IN</th>
                                            <th className="text-center">TIM_3_FN</th>
                                            <th className="text-center">TIM_4_IN</th>
                                            <th className="text-center">TIM_4_FN</th>
                                            <th className="text-center">TIM_5_IN</th>
                                            <th className="text-center">TIM_5_FN</th>
                                            <th className="text-center">TIM_6_IN</th>
                                            <th className="text-center">TIM_6_FN</th>
                                            
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {registrosActuales.map((emp, index) => (
                                            <tr key={index}>
                                            <td className="ps-3 fw-bold" style={{ color: '#92b91c' }}>
                                                {emp.emp_code}
                                                </td>

                                                <td>{emp.identificacion}</td>
                                                <td className="fw-semibold">{emp.empleado}</td>
                                                <td>
                                                    <span className="text-muted small">{emp.departamento}</span>
                                                </td>
                                                <td className="text-center">{emp.fecha}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_1_IN)}>{emp.Tim_1_IN}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_1_FN)}>{emp.Tim_1_FN}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_2_IN)}>{emp.Tim_2_IN}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_2_FN)}>{emp.Tim_2_FN}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_3_IN)}>{emp.Tim_3_IN}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_3_FN)}>{emp.Tim_3_FN}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_4_IN)}>{emp.Tim_4_IN}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_4_FN)}>{emp.Tim_4_FN}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_5_IN)}>{emp.Tim_5_IN}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_5_FN)}>{emp.Tim_5_FN}</td>
                                                 <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_6_IN)}>{emp.Tim_6_IN}</td>
                                                <td className="text-center" style={this.getEstiloNoTimbra(emp.Tim_6_FN)}>{emp.Tim_6_FN}</td>
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
