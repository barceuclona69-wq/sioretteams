import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';
import logoSioret from '../../imagenes/logo_sioret.png';

const LISTA_EMPRESAS = [
  { id: "TODOS LOS COMEDORES", nombre: "TODOS" },
  { id: "COMEDOR EXPOFLOR", nombre: "(CEXP)" },
  { id: "COMEDOR EXP B6", nombre: "(CEX6)" },
  { id: "COMEDOR AMAZING", nombre: "(CAMZ)" },
  { id: "COMEDOR CAJA DE AHORROS", nombre: "(CCJH)" },
  { id: "COMEDOR HIDDEN GARDEN", nombre: "(CHDN)" },
  { id: "COMEDOR OASIS FLOWER", nombre: "(COAF)" },
  { id: "COMEDOR OASIS ORGANIG", nombre: "(COAO)" }
];

const Rep_alm_mer_des_ref = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(false);
   
    // 2. Tu estado inicial de filtros debe arrancar con "TODOS":
    const [filtros, setFiltros] = useState({ fechaInicio: hoy, fechaFin: hoy, comedor: "TODOS" });

    

    // Carga de datos desde el servidor
        // Carga de datos desde el servidor
const cargarDatos = async () => { 
 try { 
   setLoading(true); 
   
   // Si el combo dice "TODOS", mandamos vacío ""
   const comedorParam = filtros.comedor === "TODOS" ? "" : filtros.comedor; 
 
   // Mantenemos tu console.log actualizado con la nueva estructura
   console.log("Enviando parámetros al servidor:", { 
     parametros_objeto: { ...filtros, comedor: comedorParam }, 
     url_completa: `/api/reportes/rep_alm_mer_des_comedor?inicio=${filtros.fechaInicio}T00:00:00&fin=${filtros.fechaFin}T23:59:59&comedor=${encodeURIComponent(comedorParam)}` 
   }); 
 
   // NUEVO ENDPOINT: Agregamos horas explícitas T00:00:00 y T23:59:59 
   // También corregimos definitivamente el nombre de la variable a "fechaInicio"
   const endpoint = `/api/reportes/rep_alm_mer_des_comedor?inicio=${filtros.fechaInicio}T00:00:00&fin=${filtros.fechaFin}T23:59:59&comedor=${encodeURIComponent(comedorParam)}`; 
 
   const res = await fetchWithFallback(endpoint); 
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




    // 1. Efecto de carga automático al mutar filtros
    useEffect(() => {
        cargarDatos();
    }, [filtros.comedor, filtros.fechaInicio, filtros.fechaFin]); 

    // 1. Filas de datos puros (sin ningún tipo de total de la BD)
const filasDetalle = useMemo(() => {
    return empleados.filter(e => 
        e.nombre_empresa !== 'TOTAL GENERAL' &&
        e.departamento !== '---' &&
        e.departamento !== 'SUBTOTAL COMEDOR' &&
        !(e.departamento && e.departamento.startsWith('TOTAL')) 
    );
}, [empleados]);

// 2. Cálculo para las tarjetas informativas superiores (con operador +=)
const totalesFinales = useMemo(() => {
    return filasDetalle.reduce((acc, e) => {
        acc.total_desayuno += Number(e.total_desayuno) || 0;
        acc.total_almuerzo += Number(e.total_almuerzo) || 0;
        acc.total_refrigerio += Number(e.total_refrigerio) || 0;
        acc.total_merienda += Number(e.total_merienda) || 0;
        return acc;
    }, { total_desayuno: 0, total_almuerzo: 0, total_refrigerio: 0, total_merienda: 0 });
}, [filasDetalle]);

// 3. Captura la fila de TOTAL GENERAL exacta que viene de tu base de datos
const filaTotalGeneral = useMemo(() => {
    return empleados.find(e => e.nombre_empresa === 'TOTAL GENERAL' || e.departamento === '---');
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
        if (!empleados.length) return toast.warning("No hay datos para exportar");
        
        const datosFormateados = filasDetalle.map(e => ({
            "EMPRESA": e.nombre_empresa || e.comedor || "",
            "DEPARTAMENTO": e.departamento || "",
            "DESAYUNOS": Number(e.total_desayuno) || 0,
            "ALMUERZOS": Number(e.total_almuerzo) || 0,
            "REFRIGERIOS": Number(e.total_refrigerio) || 0,
            "MERIENDAS": Number(e.total_merienda) || 0
        }));

        // Añadir fila de totales manual al excel al final
        datosFormateados.push({
            "EMPRESA": "TOTAL GENERAL",
            "DEPARTAMENTO": "",
            "DESAYUNOS": totalesFinales.total_desayuno,
            "ALMUERZOS": totalesFinales.total_almuerzo,
            "REFRIGERIOS": totalesFinales.total_refrigerio,
            "MERIENDAS": totalesFinales.total_merienda
        });

        const ws = XLSX.utils.json_to_sheet(datosFormateados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte_Alimentacion");
        XLSX.writeFile(wb, `Reporte_Comedor_${filtros.fechaInicio}_al_${filtros.fechaFin}.xlsx`);
    };

const exportarPDF = async () => {
 if (!empleados.length) return toast.warning("No hay datos para generar el PDF");
 
 const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
 const fechaImpresion = new Date().toLocaleString(); 
 
 // Modificación de etiqueta según selección de empresa
 const empresaSeleccionada = LISTA_EMPRESAS.find(emp => emp.nombre === filtros.comedor);
 const nombreEmpresa = filtros.comedor === "TODOS" 
 ? "TODOS LOS COMEDORES" 
 : (empresaSeleccionada ? `${empresaSeleccionada.id} ${empresaSeleccionada.nombre}` : filtros.comedor);
 
 const yInicial = 15;
 
 try {
 const logoBase64 = await getBase64Image(logoSioret);
 doc.addImage(logoBase64, 'PNG', 14, yInicial, 25, 12);
 } catch (e) { 
 console.warn("Logo no disponible en la ruta especificada"); 
 }
 
 doc.setFontSize(11).setFont(undefined, 'bold').setTextColor(0);
 doc.text(`MEMORANDO DE ALIMENTACION`, 45, yInicial + 5);
 doc.setFontSize(8).setFont(undefined, 'normal').setTextColor(100);
 doc.text(`Impreso: ${fechaImpresion}`, 196, yInicial + 5, { align: 'right' });
 
 doc.setFontSize(9).setTextColor(0);
 doc.text(`DE: RRHH`, 45, yInicial + 8.5);
 doc.text(`PARA: ${nombreEmpresa}`, 45, yInicial + 12);
 doc.text(`PERIODO: ${filtros.fechaInicio} al ${filtros.fechaFin}`, 45, yInicial + 17);
 
 // 1. TABLA PRINCIPAL: Incluye la columna COMEDOR al inicio (Total: 7 columnas)
 autoTable(doc, {
 startY: yInicial + 24,
 margin: { left: 10, right: 10, bottom: 15 },
 columnStyles: {
 0: { cellWidth: 25 }, // Columna COMEDOR (Ej: (CEXP))
 1: { cellWidth: 40 }, // Columna EMPRESA
 2: { cellWidth: 35 }, // Columna DEPARTAMENTO
 3: { cellWidth: 22, halign: 'center' }, // DESAYUNOS
 4: { cellWidth: 22, halign: 'center' }, // ALMUERZOS
 5: { cellWidth: 23, halign: 'center' }, // REFRIGERIOS
 6: { cellWidth: 23, halign: 'center' }  // MERIENDAS
 },
 head: [['COMEDOR', 'EMPRESA', 'DEPARTAMENTO', 'DESAYUNOS', 'ALMUERZOS', 'REFRIGERIOS', 'MERIENDAS']],
 body: filasDetalle.map(e => [
 e.comedor || "", // Inserción del valor Comedor de la DB
 e.nombre_empresa || "", 
 e.departamento || "", 
 e.total_desayuno ?? 0,
 e.total_almuerzo ?? 0,
 e.total_refrigerio ?? 0,
 e.total_merienda ?? 0
 ]),
 pageBreak: 'auto' 
 });

 // 2. EXTRAER TOTALES POR EMPRESA DE LOS DATOS DEL BACKEND ✨
 const filasSubtotales = empleados.filter(e => {
 const deptoTexto = String(e.departamento || '').toUpperCase().trim();
 return deptoTexto.startsWith('TOTAL') && !deptoTexto.includes('TOTAL GENERAL');
 });
 
 let puntoYSiguiente = doc.lastAutoTable.finalY + 10;
 
 if (filasSubtotales.length > 0) {
 if (puntoYSiguiente > 240) {
 doc.addPage();
 puntoYSiguiente = 20;
 }
 doc.setFontSize(10).setFont(undefined, 'bold').setTextColor(0);
 doc.text("RESUMEN: TOTALES POR EMPRESA", 10, puntoYSiguiente);
 
 // Se modifica a 6 columnas incluyendo la columna COMEDOR al inicio
 autoTable(doc, {
 startY: puntoYSiguiente + 4,
 margin: { left: 10, right: 10, bottom: 30 },
 columnStyles: {
 0: { cellWidth: 25 }, // Nueva columna COMEDOR (Ej: (CEXP))
 1: { cellWidth: 65 }, // RESUMEN EMPRESA (Ajustado para mantener los 90mm originales)
 2: { cellWidth: 25, halign: 'center' }, // DESAYUNOS
 3: { cellWidth: 25, halign: 'center' }, // ALMUERZOS
 4: { cellWidth: 25, halign: 'center' }, // REFRIGERIOS
 5: { cellWidth: 25, halign: 'center' }  // MERIENDAS
 },
 head: [['COMEDOR', 'RESUMEN EMPRESA', 'DESAYUNOS', 'ALMUERZOS', 'REFRIGERIOS', 'MERIENDAS']],
 body: [
 ...filasSubtotales.map(e => [
 e.comedor || "", // Muestra el código del comedor de la DB en la fila de subtotal
 String(e.departamento || '').toUpperCase(), 
 e.total_desayuno ?? 0, 
 e.total_almuerzo ?? 0, 
 e.total_refrigerio ?? 0,
 e.total_merienda ?? 0
 ]),
 // Fila de Total General Definitivo (Une COMEDOR y RESUMEN EMPRESA usando colSpan)
 [
 { content: 'TOTAL GENERAL ABSOLUTO', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, 
 totalesFinales.total_desayuno, 
 totalesFinales.total_almuerzo, 
 totalesFinales.total_refrigerio, 
 totalesFinales.total_merienda
 ]
 ],
 styles: { fontStyle: 'bold' }, 
 headStyles: { fillColor: [41, 128, 185] }, 
 pageBreak: 'auto'
 });
 puntoYSiguiente = doc.lastAutoTable.finalY + 10;
 }
 
 // 3. SECCIÓN DE FIRMAS
 let firmaY = puntoYSiguiente;
 
 if (firmaY > 250) {
 doc.addPage();
 firmaY = 20;
 }
 doc.setFontSize(8).setFont(undefined, 'bold').setTextColor(0);
 
 doc.line(20, firmaY + 15, 80, firmaY + 15);
 doc.text("FIRMA ENTREGADO", 50, firmaY + 19, { align: 'center' });
 
 doc.line(130, firmaY + 15, 190, firmaY + 15);
 doc.text("FIRMA RECIBIDO", 160, firmaY + 19, { align: 'center' });
 
 doc.save(`Memorando_${filtros.fechaInicio}_${new Date().getTime()}.pdf`);
};


    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Panel de Filtros */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="fw-bold text-primary m-0">Reporte Consolidado Comedor</h4>
                        <div className="d-flex gap-2">
                            <button className="btn btn-outline-success btn-sm" onClick={exportarExcel}>Excel</button>
                            <button className="btn btn-outline-danger btn-sm" onClick={exportarPDF}>PDF</button>
                        </div>
                    </div>
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <select 
                                className="form-select border-0 bg-light shadow-none" 
                                value={filtros.comedor} 
                                onChange={(e) => setFiltros({ ...filtros, comedor: e.target.value })}
                            >
                                {LISTA_EMPRESAS.map((emp) => (
                                    <option key={emp.nombre} value={emp.nombre}>
                                        {emp.id} {emp.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small text-muted mb-1">Fecha Inicio</label>

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
                                <thead>
                                    <tr>
                                        <th className="ps-4 py-3">COMEDOR</th>
                                        <th className="ps-4 py-3">EMPRESA</th>
                                        <th className="ps-4 py-3">DEPARTAMENTO</th>
                                        <th className="text-center py-3">DESAYUNOS</th>
                                        <th className="text-center py-3">ALMUERZOS</th>
                                        <th className="text-center py-3">REFRIGERIOS</th>
                                        <th className="text-center py-3">MERIENDAS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                   {empleados.map((e, idx) => {
                                            // 📋 Limpiamos y normalizamos los textos para evitar fallos por espacios o mayúsculas
                                            const empresaTexto = String(e.nombre_empresa || '').toUpperCase().trim();
                                            const deptoTexto = String(e.departamento || '').toUpperCase().trim();

                                            // ✨ DETECCIÓN DINÁMICA DE ACUERDO A TU BASE DE DATOS:
                                            // 1. Es el TOTAL GENERAL absoluto si el nombre es 'TOTAL GENERAL' o el departamento tiene guiones '---'
                                            const isTotalGeneral = empresaTexto === 'TOTAL GENERAL' || deptoTexto === '---';
                                            
                                            // 2. Es un subtotal de empresa si el departamento empieza con la palabra 'TOTAL' (Ej: 'TOTAL CAJA DE AHORROS...')
                                            const isSubtotalEmpresa = deptoTexto.startsWith('TOTAL') || deptoTexto === 'SUBTOTAL COMEDOR';

                                            // 🎨 Asignación de estilos y colores en base a Bootstrap 5
                                            let filaClase = '';
                                            if (isTotalGeneral) {
                                                filaClase = 'table-secondary fw-bold text-dark'; // Fondo gris intermedio para el cierre definitivo del reporte
                                            } else if (isSubtotalEmpresa) {
                                                filaClase = 'table-light fw-bold text-primary';   // Fondo gris suave y letras azules para los subtotales de cada empresa
                                            }

                                            return (
                                                <tr key={idx} className={filaClase}>
                                                    <td className="ps-4">
                                                        {isTotalGeneral ? 'TOTAL GENERAL' : (e.comedor || '')}
                                                    </td>
                                                    <td className="ps-4">
                                                        {isTotalGeneral ? 'TOTAL GENERAL' : (e.nombre_empresa || '')}
                                                    </td>
                                                    <td className="ps-4">
                                                        {/* Si es subtotal de empresa, se muestra el texto completo (Ej: 'TOTAL CAJA DE AHORROS...') */}
                                                        {isTotalGeneral ? '---' : (e.departamento || '')}
                                                    </td>
                                                    <td className="text-center">
                                                        {e.total_desayuno !== undefined && e.total_desayuno !== null ? e.total_desayuno : 0}
                                                    </td>
                                                    <td className="text-center">
                                                        {e.total_almuerzo !== undefined && e.total_almuerzo !== null ? e.total_almuerzo : 0}
                                                    </td>
                                                    <td className="text-center">
                                                        {e.total_refrigerio !== undefined && e.total_refrigerio !== null ? e.total_refrigerio : 0}
                                                    </td>
                                                    <td className="text-center">
                                                        {e.total_merienda !== undefined && e.total_merienda !== null ? e.total_merienda : 0}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {!loading && empleados.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="text-center py-4 text-muted">
                                                    No se encontraron registros para este período.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                            </table>
                        </div>
             </div>

        </div>
    );
};

export default Rep_alm_mer_des_ref;
