import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';
import logoSioret from '../../imagenes/logo_sioret.png';;

const LISTA_EMPRESAS = [
    { id: 4, nombre: "AMAZINGROSES CIA LTDA" }, { id: 1, nombre: "BELLAFLOR" },
    { id: 10, nombre: "CAJA DE AHORROS BENEFACTORA BELLA FLOR" },
    { id: 14, nombre: "EL SALTO AGRICOLA E INDUSTRIAL SA" }, { id: 5, nombre: "EXPOFLOR CIA. LTDA." },
    { id: 6, nombre: "FLORMUNDO CIA LTDA" }, { id: 3, nombre: "HIDDENGARDEN CIA LTDA" },
    { id: 11, nombre: "HOLDING BELLAFLOR GROUP SCC" }, { id: 12, nombre: "OASISFLOWER SAS" },
    { id: 13, nombre: "OASISORGANICS SAS" }, { id: 2, nombre: "TIMELESSFLOWERS S.A.S." }
];

const Rep_alm_mer_des_ref = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtros, setFiltros] = useState({ fechaInicio: hoy, fechaFin: hoy, idcom: "5" });

    // 2. Adaptamos la conexión igual que en PeriodoCierre
    const cargarDatos = async () => {
    try {
        setLoading(true);
        
        // Agregamos horas explícitas para evitar desfases de zona horaria 
        // y protegemos el parámetro de texto con encodeURIComponent
        const endpoint = `/api/REPORTES/rep_alm_mer_des_ref?inicio=${filtros.fechaInicio}T00:00:00&fin=${filtros.fechaFin}T23:59:59&empresa=${encodeURIComponent(filtros.idcom)}`;
        
        const res = await fetchWithFallback(endpoint);
        
        // 3. Misma lógica de recuperación de datos (Array, recordset o data)
        const data = Array.isArray(res) ? res : (res.recordset || res.data || []);
        setEmpleados(data);
        
    } catch (err) {
        console.error("Error al cargar reporte:", err);
        setEmpleados([]);
        toast.error("Error al conectar con el servidor");
    } finally { 
        setLoading(false); 
    }
};


   // 1. Efecto de carga: Escucha los cambios en los filtros para recargar automáticamente
useEffect(() => {
    cargarDatos();
    // Al incluir los filtros aquí, la tabla se actualiza sola al cambiar empresa o fecha
}, [filtros.idcom, filtros.fechaInicio, filtros.fechaFin]); 

// 2. Cálculo de totales: Extrae la fila de 'TOTAL' que viene de tu procedimiento almacenado
const totalesFinales = useMemo(() => {
    // Buscamos la fila de total. Usamos optional chaining (?.) por seguridad
    const filaTotal = empleados?.find(e => e.departamento === 'TOTAL');

    return filaTotal || {
        total_desayuno: 0,
        total_almuerzo: 0,
        total_refrigerio: 0,
        total_merienda: 0
    };
}, [empleados]);


    // --- FUNCIÓN AUXILIAR PARA IMAGEN ---
    const getBase64Image = (imgUrl) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = imgUrl;
            img.setAttribute('crossOrigin', 'anonymous');
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = error => reject(error);
        });
    };

    const exportarExcel = () => {
        if (!empleados.length) return alert("No hay datos");
        const ws = XLSX.utils.json_to_sheet(empleados.map(e => ({
            "DEPARTAMENTO": e.departamento === 'TOTAL' ? 'TOTAL GENERAL' : e.departamento,
            "DESAYUNOS": e.total_desayuno, "ALMUERZOS": e.total_almuerzo,
            "REFRIGERIOS": e.total_refrigerio, "MERIENDAS": e.total_merienda
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
        XLSX.writeFile(wb, `Reporte_${filtros.fechaInicio}.xlsx`);
    };


    const exportarPDF = async () => {
    if (!empleados.length) return alert("No hay datos");
    const doc = new jsPDF();
    // 1. Capturamos la fecha actual una sola vez para que sea la misma en ambos
    const fechaImpresion = new Date().toLocaleString(); 

    const totalD = empleados.reduce((acc, e) => acc + (Number(e.total_desayuno) || 0), 0);
    const totalA = empleados.reduce((acc, e) => acc + (Number(e.total_almuerzo) || 0), 0);
    const totalR = empleados.reduce((acc, e) => acc + (Number(e.total_refrigerio) || 0), 0);
    const totalM = empleados.reduce((acc, e) => acc + (Number(e.total_merienda) || 0), 0);
    const totalDepartamentos = empleados.filter(e => e.departamento !== 'TOTAL').length;

    const generarCuerpoReporte = async (yInicial) => {
        try {
            const logoBase64 = await getBase64Image(logoSioret);
            doc.addImage(logoBase64, 'PNG', 14, yInicial, 25, 12);
        } catch (e) { console.warn("Logo no disponible"); }

        const nombreEmpresa = LISTA_EMPRESAS.find(emp => emp.id.toString() === filtros.idcom.toString())?.nombre || "";
        
        doc.setFontSize(11).setFont(undefined, 'bold');
        doc.text(`MEMORANDO DE ALIMENTACION`, 45, yInicial + 5);
        
        // --- FECHA DE IMPRESIÓN (Alineada a la derecha) ---
        doc.setFontSize(8).setFont(undefined, 'normal').setTextColor(100);
        doc.text(`Impreso: ${fechaImpresion}`, 196, yInicial + 5, { align: 'right' });
        doc.setTextColor(0); // Resetear color a negro

        doc.setFontSize(9);
        doc.text(`EMPRESA: ${nombreEmpresa}`, 45, yInicial + 10);
        doc.text(`PERIODO: ${filtros.fechaInicio} al ${filtros.fechaFin}`, 45, yInicial + 15);
        doc.text(`TOTAL DEPARTAMENTOS: ${totalDepartamentos}`, 45, yInicial + 20);

        autoTable(doc, {
            startY: yInicial + 25,
            head: [['DEPARTAMENTO', 'DESAYUNOS', 'ALMUERZOS', 'REFRIGERIOS', 'MERIENDAS']],
            body: [
                ...empleados.filter(e => e.departamento !== 'TOTAL').map(e => [
                    e.departamento, e.total_desayuno, e.total_almuerzo, e.total_refrigerio, e.total_merienda
                ]),
                ['TOTAL GENERAL', totalD, totalA, totalR, totalM]
            ],
            theme: 'grid',
            headStyles: { fillColor: [33, 37, 41], fontSize: 8 },
            styles: { fontSize: 7, cellPadding: 1 },
            didParseCell: (data) => {
                if (data.row.raw[0] === 'TOTAL GENERAL') {
                    data.cell.styles.fillColor = [230, 230, 230];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(8).setFont(undefined, 'bold');
        doc.line(20, finalY + 10, 80, finalY + 10);
        doc.text("FIRMA ENTREGADO", 50, finalY + 15, { align: 'center' });
        doc.line(130, finalY + 10, 190, finalY + 10);
        doc.text("FIRMA RECIBIDO", 160, finalY + 15, { align: 'center' });
    };

    // Generar las dos copias
    await generarCuerpoReporte(10); 
    doc.setLineDash([1, 1], 0);
    doc.line(0, 148, 210, 148);
    doc.setLineDash([], 0);
    await generarCuerpoReporte(155); 

    doc.save(`Memorando_Con_Fecha_${new Date().getTime()}.pdf`);
};



    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Filtros */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="fw-bold text-primary m-0">Reporte Consolidado de Alimentación</h4>
                        <div className="d-flex gap-2">
                            <button className="btn btn-outline-success btn-sm" onClick={exportarExcel}>Excel</button>
                            <button className="btn btn-outline-danger btn-sm" onClick={exportarPDF}>PDF</button>
                        </div>
                    </div>
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <select className="form-select border-0 bg-light shadow-none" value={filtros.idcom} onChange={(e) => setFiltros({ ...filtros, idcom: e.target.value })}>
                                {LISTA_EMPRESAS.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <input type="date" className="form-control border-0 bg-light" value={filtros.fechaInicio} onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })} />
                        </div>
                        <div className="col-md-2">
                            <input type="date" className="form-control border-0 bg-light" value={filtros.fechaFin} onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })} />
                        </div>
                        <div className="col-md-2">
                           <button 
                className="btn btn-primary btn-sm" 
                onClick={cargarDatos} 
                disabled={loading}
            >
                {loading ? 'Cargando...' : 'Consultar'}
            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="row g-3 mb-4 text-center">
                {[
                    { label: 'Desayunos', val: totalesFinales.total_desayuno, color: 'primary' },
                    { label: 'Almuerzos', val: totalesFinales.total_almuerzo, color: 'success' },
                    { label: 'Refrigerios', val: totalesFinales.total_refrigerio, color: 'warning' },
                    { label: 'Meriendas', val: totalesFinales.total_merienda, color: 'info' }
                ].map((item, i) => (
                    <div className="col-md-3" key={i}>
                        <div className={`card border-0 shadow-sm p-3 border-start border-4 border-${item.color}`}>
                            <small className="text-muted fw-bold text-uppercase">{item.label}</small>
                            <h3 className={`fw-bold m-0 text-${item.color}`}>{item.val}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabla */}
            <div className="card border-0 shadow-sm overflow-hidden">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-dark text-white">
                            <tr>
                                <th className="ps-4 py-3">DEPARTAMENTO</th>
                                <th className="text-center">DESAYUNOS</th>
                                <th className="text-center">ALMUERZOS</th>
                                <th className="text-center">REFRIGERIOS</th>
                                <th className="text-center">MERIENDAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empleados.map((e, idx) => (
                                <tr key={idx} className={e.departamento === 'TOTAL' ? 'table-secondary fw-bold' : ''}>
                                    <td className="ps-4">{e.departamento === 'TOTAL' ? 'TOTAL GENERAL' : e.departamento}</td>
                                    <td className="text-center">{e.total_desayuno}</td>
                                    <td className="text-center">{e.total_almuerzo}</td>
                                    <td className="text-center">{e.total_refrigerio}</td>
                                    <td className="text-center">{e.total_merienda}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Rep_alm_mer_des_ref;
