import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoSioret from '../../imagenes/logo_sioret.png'; 
import { fetchWithFallback } from '../../config';

const LISTA_EMPRESAS = [
    { id: 4, nombre: "AMAZINGROSES CIA LTDA" }, 
    { id: 10, nombre: "CAJA DE AHORROS BENEFACTORA BELLA FLOR" },
    { id: 5, nombre: "EXPOFLOR CIA. LTDA." },
    { id: 3, nombre: "HIDDENGARDEN CIA LTDA" },
    { id: 12, nombre: "OASISFLOWER SAS" },
    { id: 13, nombre: "OASISORGANICS SAS" }, 
];

const Repalmmerfact = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    const [filtros, setFiltros] = useState({ fechaInicio: hoy, fechaFin: hoy, idcom: "" });
    const registrosPorPagina = 25;


         const cargarDatos = async () => {
        try {
            setLoading(true);
            
            // SI ESTÁ VACÍO (TODAS), ENVIAMOS 0. SI NO, EL ID NUMÉRICO.
            const empresaParam = filtros.idcom === "" ? 0 : Number(filtros.idcom);

            // Agregamos horas explícitas para evitar desfases de zona horaria en el backend
            const endpoint = `/api/REPORTES/rep_alm_mer_fact_agrupado2?inicio=${filtros.fechaInicio}T00:00:00&fin=${filtros.fechaFin}T23:59:59&empresa=${empresaParam}`;
            
            // Mantén tu log compacto para validar que ahora param_sql_empresa sea 0
            console.log(
                `%c ⚙️ PARÁMETROS ENVIADOS:`, 
                "color: #fff; background-color: #2c3e50; font-weight: bold; padding: 3px 6px; border-radius: 3px;",
                {
                    desde: `${filtros.fechaInicio}T00:00:00`,
                    hasta: `${filtros.fechaFin}T23:59:59`,
                    idcom_tipo: typeof empresaParam,
                    param_sql_empresa: empresaParam, // Debe imprimir 0 al elegir TODAS
                    url_relativa: endpoint
                }
            );

            const res = await fetchWithFallback(endpoint);
            const datos = Array.isArray(res) ? res : (res.recordset || res.data || []);
            
            setEmpleados(datos);
            setPaginaActual(1);
        } catch (err) {
            console.error("❌ Error en la petición:", err);
            setEmpleados([]);
        } finally {
            setLoading(false);
        }
    };





   // 4. Efecto para cargar datos al montar o cuando cambian los filtros
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
            T_ALMZ: e.C_ALMZ,
            T_MERND: e.C_MERND,
             T_DESAY:e.C_DESAY,
            T_REFRIG:e.C_REFRIG,

           C_ALMZ_MERND: e.C_ALMZ_MERND,
           C_ALMZ_MERND: e.C_ALMZ_MERND,
           C_DESAYUNO: e.C_DESAYUNO,
           C_REFRIGERIO: e.C_REFRIGERIO,

            VALOR_ALMZ_EMPRESA: e.VALOR_ALMZ_EMPRESA,
             VALOR_DESCT_ALMZ_EMPLD: e.VALOR_DESCT_ALMZ_EMPLD,
            VALOR_MERIENDA_EMPRESA: e.VALOR_MERIENDA_EMPRESA,
            VALOR_DESCT_MERIENDA_EMPLD: e.VALOR_DESCT_MERIENDA_EMPLD,
            VALOR_DESAYUNOS_EMPRESA: e.VALOR_DESAYUNOS_EMPRESA,
            VALOR_REFRIGERIO_EMPRESA: e.VALOR_REFRIGERIO_EMPRESA
                     
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
    
    doc.text(`Generado: ${new Date().toLocaleString()}`, 240, 12);

    // 3. Tabla de Datos IGUALADA al Excel (21 Columnas)
    autoTable(doc, {
        startY: 28,
        head: [[
            'EMPRESA', 'COMEDOR', 'DEPARTAMENTO', 'FECHA', 'CEDULA', 'NOMBRE',
            'T_ALMZ_ASUM_EMPR', 'T_MERND_ASUM_EMPR', 'T_ALMZ', 'T_MERND', 'T_DESAY', 'T_REFRIG',
            'C_ALMZ_MERND', 'C_DESAYUNO', 'C_REFRIGERIO',
            'VALOR_ALMZ_EMPRESA', 'VALOR_DESCT_ALMZ_EMPLD', 'VALOR_MERIENDA_EMPRESA', 
            'VALOR_DESCT_MERIENDA_EMPLD', 'VALOR_DESAYUNOS_EMPRESA', 'VALOR_REFRIGERIO_EMPRESA'
        ]],
        body: empleados.map(e => [
            e.NOMBRE_EMPRESA || '---', 
            e.comedor || '---',
            e.departamento || '---',
            e.fecha_dia ? e.fecha_dia.split('T')[0] : '---', 
            e.cedula || '---',
            e.nombres || '---',

            e.T_ALMZ_ASUM_EMPR ?? 0,
            e.T_MERND_ASUM_EMPR ?? 0,
            // Acceso corregido mediante strings para evitar el error de sintaxis del '#'
            e.C_ALMZ ?? 0,
            e.C_MERND ?? 0,
            e.C_DESAY ?? 0,
            e.C_REFRIG ??0,

            e.C_ALMZ_MERND ?? 0,
            e.C_DESAYUNO ?? 0,
            e.C_REFRIGERIO ?? 0,

            e.VALOR_ALMZ_EMPRESA ?? 0,
            e.VALOR_DESCT_ALMZ_EMPLD ?? 0,
            e.VALOR_MERIENDA_EMPRESA ?? 0,
            e.VALOR_DESCT_MERIENDA_EMPLD ?? 0,
            e.VALOR_DESAYUNOS_EMPRESA ?? 0,
            e.VALOR_REFRIGERIO_EMPRESA ?? 0
        ]),
        theme: 'striped',
        headStyles: {fontSize: 5.5, halign: 'center' },
        // Se reduce el tamaño de fuente y padding para que entren las 21 columnas en horizontal
        styles: { fontSize: 5, cellPadding: 0.8, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 18 }, // Empresa
            2: { cellWidth: 15 }, // Departamento
            5: { cellWidth: 22 }, // Nombre del empleado
        },
        margin: { top: 25, left: 5, right: 5 } // Márgenes ajustados al borde de la página A4
    });

    doc.save(`Reporte_Alimentacion_${filtros.fechaInicio}.pdf`);
};




const stats = useMemo(() => { 
 return empleados.reduce((acc, curr) => { 
   // Corrección de los nombres de propiedades de conteo (remplazando T_ por C_)
   acc.desayunos += (Number(curr.C_DESAY) || 0); 
   acc.almuerzos += (Number(curr.C_ALMZ) || 0); 
   acc.refrigerios += (Number(curr.C_REFRIG) || 0); 
   acc.meriendas += (Number(curr.C_MERND) || 0); 
 
   // Acumuladores de asumidos (se mantienen igual si existen en tu backend)
   acc.almuerzosAsumidos += (Number(curr.T_ALMZ_ASUM_EMPR) || 0); 
   acc.meriendasAsumidas += (Number(curr.T_MERND_ASUM_EMPR) || 0); 
   
   // Corrección del costo total utilizando la columna real de la tabla
   acc.costoTotal += (Number(curr.C_ALMZ_MERND) || 0); 
 
   return acc; 
 }, { 
   desayunos: 0, 
   almuerzos: 0, 
   refrigerios: 0, 
   meriendas: 0, 
   almuerzosAsumidos: 0, 
   meriendasAsumidas: 0, 
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
                            <select 
                                    className="form-select form-select-sm" 
                                    value={filtros.idcom} 
                                    onChange={e => {
                                        setFiltros({ ...filtros, idcom: e.target.value });
                                        setPaginaActual(1);
                                    }}
                                >
                                    <option value="">TODAS LAS EMPRESAS</option>
                                    {LISTA_EMPRESAS.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                                    ))}
                                </select>

                        </div>
                        <div className="col-md-2 d-grid">
                            <button className="btn btn-dark btn-sm fw-bold" onClick={cargarDatos} disabled={loading}>
                                {loading ? '...' : 'CONSULTAR REP 2'}
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


 <div className="card-footer bg-white py-3 d-flex justify-content-between align-items-center">
                    <span className="text-muted small">Total: {empleados.length} registros</span>
                    <Paginador />
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
{/* Agregamos max-width y un contenedor con scroll horizontal limpio por si la pantalla es muy pequeña */}
<div className="table-responsive w-100" style={{ maxWidth: '100vw', overflowX: 'auto' }}>
    {/* Agregamos la clase table-sm para reducir el padding vertical y nuestros estilos personalizados de fuente */}
    <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: '11px', tableLayout: 'fixed', width: '100%', minWidth: '1400px' }}>
        <thead className="table-light text-muted small text-uppercase">
            <tr>
                {/* Definimos anchos fijos proporcionales para optimizar el espacio horizontal */}
                <th className="ps-2" style={{ width: '100px' }}>Empresa</th>
                <th style={{ width: '90px' }}>Comedor</th>
                <th style={{ width: '110px' }}>Depto.</th>
                <th style={{ width: '85px' }}>Fecha</th>
                <th style={{ width: '85px' }}>Cédula</th>
                <th style={{ width: '140px' }}>Nombre</th>

                <th className="text-center" style={{ width: '75px' }}>ASUM_ALMZ</th>
                <th className="text-center" style={{ width: '75px' }}>ASUM_MERND</th>
               
                <th className="text-center" style={{ width: '60px' }}>C_DESAY</th>
                <th className="text-center" style={{ width: '60px' }}>C_ALMZ</th>
                <th className="text-center" style={{ width: '65px' }}>C_REFRIG</th>
                <th className="text-center" style={{ width: '60px' }}>C_MERND</th>

                <th className="text-end" style={{ width: '80px' }}>C_ALM_MER</th>
                <th className="text-end" style={{ width: '80px' }}>C_DESAY</th>
                <th className="text-end" style={{ width: '80px' }}>C_REFRIG</th>
                 
                <th className="text-end" style={{ width: '85px' }}>VAL_ALM_EM</th>
                <th className="text-end" style={{ width: '85px' }}>DES_ALM_EP</th>
                <th className="text-end" style={{ width: '85px' }}>VAL_MER_EM</th>
                <th className="text-end" style={{ width: '85px' }}>DES_MER_EP</th>
                <th className="text-end" style={{ width: '85px' }}>VAL_DES_EM</th>
                <th className="text-end pe-2" style={{ width: '85px' }}>VAL_REF_EM</th>
            </tr>
        </thead>
        <tbody>
            {registrosVisualizados.length > 0 ? (
                registrosVisualizados.map((emp, i) => (
                    <tr key={i} style={{ fontSize: '10.5px' }}>
                        {/* El uso de text-truncate evita que textos largos deformen las columnas */}
                        <td className="ps-2 text-muted text-truncate" title={emp.NOMBRE_EMPRESA}>{emp.NOMBRE_EMPRESA || '---'}</td>
                        <td className="text-truncate" title={emp.comedor}>{emp.comedor || '---'}</td>
                        <td className="text-truncate" title={emp.departamento}>{emp.departamento || '---'}</td>
                        <td>{emp.fecha_dia ? emp.fecha_dia.split('T')[0] : '---'}</td>
                        <td>{emp.cedula || '---'}</td>
                        <td className="fw-semibold text-truncate" title={emp.nombres}>{emp.nombres || '---'}</td>

                        <td className="text-center">
                            <span className={`badge p-1 bg-opacity-10 ${emp.T_ALMZ_ASUM_EMPR > 0 ? 'bg-success text-success' : 'bg-warning text-warning'}`} style={{ fontSize: '9px' }}>
                                {emp.T_ALMZ_ASUM_EMPR ?? 0}
                            </span>
                        </td>
                        <td className="text-center">
                            <span className={`badge p-1 bg-opacity-10 ${emp.T_MERND_ASUM_EMPR > 0 ? 'bg-success text-success' : 'bg-warning text-warning'}`} style={{ fontSize: '9px' }}>
                                {emp.T_MERND_ASUM_EMPR ?? 0}
                            </span>
                        </td>

                        <td className="text-center">
                            <span className={`badge p-1 bg-opacity-10 ${emp.C_DESAY > 0 ? 'bg-success text-success' : 'bg-warning text-warning'}`} style={{ fontSize: '9px' }}>
                                {emp.C_DESAY ?? 0}
                            </span>
                        </td>
                        <td className="text-center">
                            <span className={`badge p-1 bg-opacity-10 ${emp.C_ALMZ > 0 ? 'bg-success text-success' : 'bg-warning text-warning'}`} style={{ fontSize: '9px' }}>
                                {emp.C_ALMZ ?? 0}
                            </span>
                        </td>
                        <td className="text-center">
                            <span className={`badge p-1 bg-opacity-10 ${emp.C_REFRIG > 0 ? 'bg-success text-success' : 'bg-warning text-warning'}`} style={{ fontSize: '9px' }}>
                                {emp.C_REFRIG ?? 0}
                            </span>
                        </td>
                        <td className="text-center">
                            <span className={`badge p-1 bg-opacity-10 ${emp.C_MERND > 0 ? 'bg-success text-success' : 'bg-warning text-warning'}`} style={{ fontSize: '9px' }}>
                                {emp.C_MERND ?? 0}
                            </span>
                        </td>

                        <td className="text-end fw-bold text-secondary">${Number(emp.C_ALMZ_MERND || 0).toFixed(2)}</td>
                        <td className="text-end fw-bold text-secondary">${Number(emp.C_DESAYUNO || 0).toFixed(2)}</td>
                        <td className="text-end fw-bold text-secondary">${Number(emp.C_REFRIGERIO || 0).toFixed(2)}</td>
                      
                        <td className="text-end fw-bold text-primary">${Number(emp.VALOR_ALMZ_EMPRESA || 0).toFixed(2)}</td>
                        <td className="text-end fw-bold text-primary">${Number(emp.VALOR_DESCT_ALMZ_EMPLD || 0).toFixed(2)}</td>
                        <td className="text-end fw-bold text-primary">${Number(emp.VALOR_MERIENDA_EMPRESA || 0).toFixed(2)}</td>
                        <td className="text-end fw-bold text-primary">${Number(emp.VALOR_DESCT_MERIENDA_EMPLD || 0).toFixed(2)}</td>
                        <td className="text-end fw-bold text-primary">${Number(emp.VALOR_DESAYUNOS_EMPRESA || 0).toFixed(2)}</td>
                        <td className="text-end pe-2 fw-bold text-primary">${Number(emp.VALOR_REFRIGERIO_EMPRESA || 0).toFixed(2)}</td>
                    </tr>
                ))
            ) : (
                <tr><td colSpan="21" className="text-center py-4 text-muted small">{loading ? 'Cargando...' : 'Sin registros encontrados'}</td></tr>
            )}
        </tbody>
    </table>
</div>

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
