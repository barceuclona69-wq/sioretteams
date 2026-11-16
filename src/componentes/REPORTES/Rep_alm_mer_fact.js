import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoSioret from '../../imagenes/logo_sioret.png'; 
import { fetchWithFallback } from '../../config'; // Importado fetchWithFallback
import { toast } from 'sonner';

const LISTA_EMPRESAS = [
    { id: 4, nombre: "AMAZINGROSES CIA LTDA" }, { id: 1, nombre: "BELLAFLOR" },
    { id: 10, nombre: "CAJA DE AHORROS BENEFACTORA BELLA FLOR" },
    { id: 14, nombre: "EL SALTO AGRICOLA E INDUSTRIAL SA" }, { id: 5, nombre: "EXPOFLOR CIA. LTDA." },
    { id: 6, nombre: "FLORMUNDO CIA LTDA" }, { id: 3, nombre: "HIDDENGARDEN CIA LTDA" },
    { id: 11, nombre: "HOLDING BELLAFLOR GROUP SCC" }, { id: 12, nombre: "OASISFLOWER SAS" },
    { id: 13, nombre: "OASISORGANICS SAS" }, { id: 2, nombre: "TIMELESSFLOWERS S.A.S." }
];

const Repalmmerfact = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    const [filtros, setFiltros] = useState({ fechaInicio: hoy, fechaFin: hoy, idcom: "" });
    const registrosPorPagina = 25;

    // --- NUEVA CONEXIÓN IMPLEMENTADA ---
   const cargarDatos = async () => {
        try {
            setLoading(true);
            
            // Agregamos horas explícitas para evitar desfases de zona horaria
            // y protegemos el parámetro empresa con encodeURIComponent
            const endpoint = `/api/REPORTES/rep_alm_mer_fact?inicio=${filtros.fechaInicio}T00:00:00&fin=${filtros.fechaFin}T23:59:59&empresa=${encodeURIComponent(filtros.idcom)}`;
            
            const res = await fetchWithFallback(endpoint);
            
            // Normalización de datos según el formato que devuelva el backend
            const datos = Array.isArray(res) ? res : (res.recordset || res.data || []);
            
            setEmpleados(datos);
            setPaginaActual(1);
        } catch (err) {
            console.error("Error al cargar reporte:", err);
            setEmpleados([]);
            toast.error("Error al conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    // Actualización automática al cambiar filtros
    useEffect(() => { 
        cargarDatos(); 
    }, [filtros.fechaInicio, filtros.fechaFin, filtros.idcom]);

    // Lógica de exportación Excel
    const exportarExcel = () => {
    if (!empleados.length) return alert("Sin datos");

    // Mapeo de datos
    const data = empleados.map(e => ({
        EMPRESA: e.NOMBRE_EMPRESA , 
        COMEDOR: e.comedor,
        DEPARTAMENTO: e.departamento,
         FECHA: e.fecha_dia ? e.fecha_dia.split('T')[0] : '---', 
        CEDULA: e.cedula,
        NOMBRE: e.nombres,
        T_ALMZ_ASUM_EMPR: e.T_ALMZ_ASUM_EMPR,
        T_MERND_ASUM_EMPR: e.T_MERND_ASUM_EMPR,
        T_ALMZ: e.T_ALMZ,
        T_MERND: e.T_MERND,
         T_DESAY:e['T_DESAY'],
        T_REFRIG:e['T_REFRIG'],
       C_ALMZ_MERND: e.C_ALMZ_MERND,
       C_ALMZ_MERND: e.C_ALMZ_MERND,
       C_DESAYUNO: e.C_DESAYUNO,
       C_REFRIGERIO: e.C_REFRIGERIO,
        COSTO_ALMZ_MERND: e['COSTO(ALMZ/MERND)'],
         DESCT_ALMZ_MERND_EMPLD: e['DESCT(ALMZ_MERND/EMPLD)'],
        T_PAGO_ALMZ: e['T_PAGO_ALMZ'],
        T_PAGO_MERND: e['T_PAGO_MERND']
                 
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // --- LÓGICA PARA AJUSTAR EL ANCHO DE COLUMNAS ---
    const objectMaxLength = [];
    data.forEach((row) => {
        Object.keys(row).forEach((key, i) => {
            const value = row[key] ? row[key].toString() : "";
            objectMaxLength[i] = Math.max(objectMaxLength[i] || 0, value.length, key.length);
        });
    });
    worksheet["!cols"] = objectMaxLength.map(w => ({ width: w + 2 })); 
    // -----------------------------------------------

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, `Reporte_${filtros.fechaInicio}.xlsx`);
};



const getBase64Image = (imgUrl) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imgUrl;
        img.setAttribute('crossOrigin', 'anonymous');
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



const exportarPDF = async () => { // Agregado async
    if (!empleados.length) return alert("Sin datos");
    
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const azulOscuro = [33, 37, 41]; // Color para el encabezado
    const empresaSeleccionada = LISTA_EMPRESAS.find(emp => emp.id === Number(filtros.idcom));
    const nombreEmpresa = empresaSeleccionada ? empresaSeleccionada.nombre : "TODAS LAS EMPRESAS";

    // 1. Cargar Logo
    try {
        const logoBase64 = await getBase64Image(logoSioret);
        doc.addImage(logoBase64, 'PNG', 10, 5, 25, 15); 
    } catch (e) {
        console.warn("Logo no disponible");
    }

    // 2. Encabezado Estilizado
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("REPORTE DE DESAY-ALMUEZ-REFRIG-MERIEND- (FACTURACION)", 40, 12);
    
    doc.setFontSize(9);
    doc.text(`Empresa: ${nombreEmpresa}`, 40, 22);
    doc.text(`Periodo: ${filtros.fechaInicio} al ${filtros.fechaFin}`, 40, 18);
    
    
    doc.text(`Generado: ${new Date().toLocaleString()}`, 230, 12);

    // 3. Tabla de Datos
    autoTable(doc, {
        startY: 28,
        head: [['CEDULA', 'NOMBRE', 'FECHA', 'T_ALMZ', 'T_MERND', 'T_DESAY','T_REFRIG','T_ALMZ_ASUM_EMPR', 'T_MERND_ASUM_EMPR','COSTO(ALMZ/MERND','DESCT(ALMZ_MERND/EMPLD)','T_PAGO_ALMZ','T_PAGO_MERND']],
        body: empleados.map(e => [
            e.cedula, 
            e.nombres, 
            e.fecha_dia ? e.fecha_dia.split('T')[0] : '---', 
            e.T_ALMZ, 
            e.T_MERND, 
            e['T_DESAY'],
            e['T_REFRIG'],
            e.T_ALMZ_ASUM_EMPR,
            e.T_MERND_ASUM_EMPR,
            e['COSTO(ALMZ/MERND)'], 
            e['DESCT(ALMZ_MERND/EMPLD)'], 
            e['T_PAGO_ALMZ'], 
            e['T_PAGO_MERND']

        ]),
        theme: 'striped',
        headStyles: { fillColor: azulOscuro, fontSize: 8, halign: 'center' },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: {
            1: { cellWidth: 50 }, // Nombre más ancho
            10: { cellWidth: 40 } // Empresa con ajuste
        },
        margin: { top: 25 }
    });

    doc.save(`Reporte_Alimentacion_${filtros.fechaInicio}.pdf`);
};


   const stats = useMemo(() => {
    return empleados.reduce((acc, curr) => {
        acc.desayunos += (Number(curr.T_DESAY) || 0); 
        acc.almuerzos += (Number(curr.T_ALMZ) || 0);
        acc.refrigerios += (Number(curr.T_REFRIG) || 0); 
        acc.meriendas += (Number(curr.T_MERND) || 0); 

        // Acumuladores de asumidos
        acc.almuerzosAsumidos += (Number(curr.T_ALMZ_ASUM_EMPR) || 0);
        acc.meriendasAsumidas += (Number(curr.T_MERND_ASUM_EMPR) || 0);

        acc.costoTotal += (Number(curr['T_PAGO_ALMZ']) || 0) + (Number(curr['T_PAGO_MERND']) || 0);
        
        return acc;
    }, { 
        desayunos: 0, 
        almuerzos: 0, 
        refrigerios: 0, 
        meriendas: 0, 
        almuerzosAsumidos: 0, // Inicializado
        meriendasAsumidas: 0, // Inicializado
        costoTotal: 0 
    });
}, [empleados]);



    const { registrosVisualizados, totalPaginas } = useMemo(() => {
        const total = Math.ceil(empleados.length / registrosPorPagina) || 1;
        return { registrosVisualizados: empleados.slice((paginaActual - 1) * registrosPorPagina, paginaActual * registrosPorPagina), totalPaginas: total };
    }, [empleados, paginaActual]);

    const Paginador = () => (
        <ul className="pagination pagination-sm mb-0 shadow-sm">
            <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                <button className="page-link border-0 px-3" onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}>Anterior</button>
            </li>
            <li className="page-item active"><span className="page-link bg-dark border-dark px-3">{paginaActual}</span></li>
            <li className={`page-item ${paginaActual >= totalPaginas ? 'disabled' : ''}`}>
                <button className="page-link border-0 px-3" onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))}>Siguiente</button>
            </li>
        </ul>
    );

    return (
        <div className="container-fluid py-4 bg-light min-vh-100" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header / Filtros */}
            <div className="card border-0 shadow-sm mb-4 rounded-3">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label small fw-bold text-muted">DESDE</label>
                            <input type="date" className="form-control form-control-sm" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold text-muted">HASTA</label>
                            <input type="date" className="form-control form-control-sm" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label small fw-bold text-muted">EMPRESA</label>
                            <select className="form-select form-select-sm" value={filtros.idcom} onChange={e => setFiltros({...filtros, idcom: e.target.value})}>
                                <option value="">TODAS LAS EMPRESAS</option>
                                {LISTA_EMPRESAS.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                            </select>
                        </div>
                        <div className="col-md-2 d-grid">
                            <button className="btn btn-dark btn-sm fw-bold" onClick={cargarDatos} disabled={loading}>
                                {loading ? '...' : 'CONSULTAR'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

      {/* KPIs - Resumen Visual */}
<div className="row g-3 mb-4">
    {[
        { label: 'Desayunos', value: stats.desayunos, color: 'primary', icon: 'bi-cup-hot' },
        { label: 'Almuerzos', value: stats.almuerzos, color: 'success', icon: 'bi-sun' },
        { label: 'Refrigerios', value: stats.refrigerios, color: 'warning', icon: 'bi-apple' },
        { label: 'Meriendas', value: stats.meriendas, color: 'info', icon: 'bi-moon-stars' }
    ].map((item, index) => (
        <div className="col-md-3" key={index}>
            <div className={`card border-0 shadow-sm p-3 h-100 border-start border-4 border-${item.color}`}>
                <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                        <small className="text-muted fw-bold text-uppercase d-block mb-1">{item.label}</small>
                        <h3 className="fw-bold m-0">{item.value}</h3>
                    </div>
                    <div className={`bg-${item.color} bg-opacity-10 p-2 rounded-3 text-${item.color}`}>
                        <i className={`bi ${item.icon} fs-4`}></i>
                    </div>
                </div>
            </div>
        </div>
    ))}

    {/* Card: Costo Total Destacado */}
    <div className="col-12 mt-3">
        <div className="card border-0 shadow-sm bg-dark text-white p-3 overflow-hidden position-relative">
            <div className="row align-items-center">
                <div className="col-md-8">
                    <small className="text-white-50 fw-bold text-uppercase">Costo Total Facturado (Almuerzos + Meriendas)</small>
                    <h2 className="fw-bold m-0 text-info display-6">${stats.costoTotal.toFixed(2)}</h2>
                </div>
                <div className="col-md-4 text-end opacity-25">
                    <i className="bi bi-cash-stack display-1 position-absolute top-50 end-0 translate-middle-y me-3"></i>
                </div>
            </div>
        </div>
    </div>
</div>



            {/* Tabla con Botones Integrados */}
            <div className="card border-0 shadow-sm rounded-3">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <Paginador />
                    <div className="btn-group shadow-sm">
                        <button className="btn btn-outline-success btn-sm px-3" onClick={exportarExcel}>
                            <i className="bi bi-file-earmark-excel-fill me-2"></i>Excel
                        </button>
                        <button className="btn btn-outline-danger btn-sm px-3" onClick={exportarPDF}>
                            <i className="bi bi-file-earmark-pdf-fill me-2"></i>PDF
                        </button>
                    </div>
                </div>
               <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light text-muted small text-uppercase">
                            <tr>
                                <th className="ps-4">Cédula</th>
                                <th>Nombre</th>
                                <th>Fecha día</th>
                                <th className="text-center">T_DESAY.</th>
                                <th className="text-center">T_ALMZ</th>
                                <th className="text-center">T_REFRIG.</th>
                                <th className="text-center">T_MERND.</th>
                                 
                                  

                                <th className="text-center">T_ALMZ_ASUM_EMPR</th>
                                 <th className="text-center">T_MERND_ASUM_EMPR</th>
                                <th className="text-end pe-4">Costo Unit.</th>
                                 <th className="text-end pe-4">Cost Unt Empr</th>
                                 <th className="text-end pe-4">DESCT_EMPLDO</th>
                                 <th className="text-end pe-4">T_PAGO_ALMZ</th>
                                 <th className="text-end pe-4">T_PAGO_MERND</th>
                                 
                            </tr>
                        </thead>
                        <tbody>
                            {registrosVisualizados.length > 0 ? (
                                registrosVisualizados.map((emp, i) => (
                                    <tr key={i} className="small">
                                        <td className="ps-4 text-muted">{emp.cedula}</td>
                                        <td className="fw-semibold">{emp.nombres}</td>
                                        <td className="fw-semibold text-secondary">
                                            {emp.fecha_dia ? emp.fecha_dia.split('T')[0] : '---'}
                                        </td>

                                         <td className="text-center">
                                        <span className={`badge bg-opacity-10 ${emp.T_DESAY === 1 ? 'bg-success text-success' : 'bg-warning text-warning'}`}>
                                            {emp.T_DESAY}
                                        </span>
                                        </td>

                                       <td className="text-center">
                                        <span className={`badge bg-opacity-10 ${emp.T_ALMZ === 1 ? 'bg-success text-success' : 'bg-warning text-warning'}`}>
                                            {emp.T_ALMZ}
                                        </span>
                                        </td>

                                          <td className="text-center">
                                        <span className={`badge bg-opacity-10 ${emp.T_REFRIG === 1 ? 'bg-success text-success' : 'bg-warning text-warning'}`}>
                                            {emp.T_REFRIG}
                                        </span>
                                        </td>
                                        
                                        <td className="text-center">
                                        <span className={`badge bg-opacity-10 ${emp.T_MERND === 1 ? 'bg-success text-success' : 'bg-warning text-warning'}`}>
                                            {emp.T_MERND}
                                        </span>
                                        </td>

                                        

                                      


                                        <td className="text-center">
                                        <span className={`badge bg-opacity-10 ${emp.T_ALMZ_ASUM_EMPR === 1 ? 'bg-success text-success' : 'bg-warning text-warning'}`}>
                                            {emp.T_ALMZ_ASUM_EMPR}
                                        </span>
                                        </td>

                                        <td className="text-center">
                                        <span className={`badge bg-opacity-10 ${emp.T_MERND_ASUM_EMPR === 1 ? 'bg-success text-success' : 'bg-warning text-warning'}`}>
                                            {emp.T_MERND_ASUM_EMPR}
                                        </span>
                                        </td>

                                        <td className="text-end pe-4 fw-bold text-primary">${Number(emp['COSTO(ALMZ/MERND)']).toFixed(2)}</td>
                                        <td className="text-end pe-4 fw-bold text-primary">${Number(emp['COSTO(ALMZ_MERND/ASUM_EMPRE)']).toFixed(2)}</td>
                                        <td className="text-end pe-4 fw-bold text-primary">${Number(emp['DESCT(ALMZ_MERND/EMPLD)']).toFixed(2)}</td>
                                         <td className="text-end pe-4 fw-bold text-primary">${Number(emp['T_PAGO_ALMZ']).toFixed(2)}</td>
                                          <td className="text-end pe-4 fw-bold text-primary">${Number(emp['T_PAGO_MERND']).toFixed(2)}</td>
                                        
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="text-center py-5 text-muted small">{loading ? 'Cargando...' : 'Sin registros encontrados'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="card-footer bg-white py-3 d-flex justify-content-between align-items-center">
                    <span className="text-muted small">Total: {empleados.length} registros</span>
                    <Paginador />
                </div>
            </div>
        </div>
    );
};

export default Repalmmerfact;
