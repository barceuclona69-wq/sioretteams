
import * as XLSX from 'xlsx';
import logoSioret from '../../imagenes/logo_sioretblanco.png';
import logoBellaflor from '../../imagenes/Bellaflor.png';
import { jsPDF } from 'jspdf'; 
import autoTable from 'jspdf-autotable'; 
import { toast } from 'sonner';




const cargarImagenElemento = (imgElement) => {
  return new Promise((resolve) => {
    if (imgElement.complete) {
      resolve(imgElement);
    } else {
      imgElement.onload = () => resolve(imgElement);
    }
  });
};




export const exportarPDFdia = async (datos, configuracion) => { 
  const { inicio, fin, empresa, departamento, listaEmpresasFija, fetchWithFallback, setLoading } = configuracion; 
  if (setLoading) setLoading(true); 
  try { 
    toast.info("Generando reporte PDF del día, por favor espere..."); 
    
    const urlReporte = `/api/RRHH/asistencia_comedor_extras_rend?inicio=${inicio}T00:00:00&fin=${fin}T23:59:59&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`; 
    const respuestaAPI = await fetchWithFallback(urlReporte); 
 
    if (!Array.isArray(respuestaAPI) || respuestaAPI.length === 0) { 
      toast.warning("No se encontraron registros para este rango."); 
      return; 
    } 

    // CORRECCIÓN CLAVE: Leer el primer objeto [0] para extraer las llaves de las columnas de tags dinámicas
    const primerRegistro = respuestaAPI[0] || {};
    const llavesTagsDinamicas = Object.keys(primerRegistro).filter( 
      key => key.startsWith('cantidad_tags_') && key !== 'cantidad_tags_vacia' 
    );

    // 2. CONSTRUIR ESTRUCTURA DE COLUMNAS
    const columnas = [ 
      { header: 'Fecha', dataKey: 'fecha_dia' }, 
      { header: 'Empleado', dataKey: 'nombres' }, 
      
      // Mapeo exacto solicitado: `${metaPorHora} h`
      ...llavesTagsDinamicas.map(key => { 
        const metaPorHora = key.replace('cantidad_tags_', ''); 
        return { 
          header: `${metaPorHora} / h`, 
          dataKey: key 
        }; 
      }), 

      { header: 'Presencia (Motivo/Hrs)', dataKey: 'presencia_concatenada' }, 
      { header: 'Ausencia (Motivo/Hrs)', dataKey: 'ausencia_concatenada' }, 
      { header: 'Hrs. Totales Proc.', dataKey: 'horas_totales_calculadas' }, 
      { header: 'Hrs. Extras (+/-)', dataKey: 'suma_total_campos' }, 
      { header: 'Hrs. Totales Netas', dataKey: 'horas_totales_netas' },
       { header: 'Novedad', dataKey: 'observacion' }
    ]; 

    // 3. MAPEAR FILAS Y CONCATENAR
    const filas = respuestaAPI.map(item => {
      const hPresenciaNum = Number(item.h_presencia || 0);
      const hAusenciaNum = Number(item.h_ausencia || 0);

      const presenciaConcatenada = hPresenciaNum > 0 
        ? `${item.m_presencia || 'Varios'} (${hPresenciaNum.toFixed(2)}h)` 
        : '-';

      const ausenciaConcatenada = hAusenciaNum > 0 
        ? `${item.m_ausencia || 'Varios'} (${hAusenciaNum.toFixed(2)}h)` 
        : '-';

      const objetoFila = {
        ...item,
        fecha_dia: item.fecha_dia ? item.fecha_dia.substring(0, 10) : '',
        nombres: item.nombres || 'N/A',
        presencia_concatenada: presenciaConcatenada,
        ausencia_concatenada: ausenciaConcatenada,
        horas_totales_calculadas: Number(item.horas_totales_calculadas || 0).toFixed(2),
        suma_total_campos: item.suma_total_campos || '0.00',
        horas_totales_netas: Number(item.horas_totales_netas || 0).toFixed(2)
      };

      llavesTagsDinamicas.forEach(key => {
        objetoFila[key] = item[key] !== null && item[key] !== undefined ? item[key] : '0';
      });

      return objetoFila;
    }); 

    // 4. CALCULAR SUMATORIAS
    const totalesGlobales = respuestaAPI.reduce((acc, current) => { 
      acc.h_presencia += Number(current.h_presencia || 0);
      acc.h_ausencia += Number(current.h_ausencia || 0);
      acc.totales_proc += Number(current.horas_totales_calculadas || 0); 
      acc.totales_netas += Number(current.horas_totales_netas || 0); 
      return acc; 
    }, { h_presencia: 0, h_ausencia: 0, totales_proc: 0, totales_netas: 0 }); 

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); 
 
    // Renderizado de Logos
    const anchoLogo = 40; const altoLogo = 12; const yLogo = 10; 
    const anchoLogo1 = 12; const altoLogo1 = 12; const yLogo1 = 10; 
    const xLogoSioret = 297 - 10 - anchoLogo1; 
    const xLogoBellaflor = xLogoSioret - 5 - anchoLogo; 
 
    try { 
      const imgSioret = await cargarImagenElemento(logoSioret); 
      doc.addImage(imgSioret, 'PNG', xLogoSioret, yLogo1, anchoLogo1, altoLogo1); 
    } catch (e) { console.error(e); } 
 
    try { 
      const imgBellaflor = await cargarImagenElemento(logoBellaflor); 
      doc.addImage(imgBellaflor, 'PNG', xLogoBellaflor, yLogo, anchoLogo, altoLogo); 
    } catch (e) { console.error(e); } 
 
    const estiloCeldaTotales = { fontSize: 5.5, fontStyle: 'bold', fillColor: '#596B43', textColor: 255, cellPadding: 1 }; 
 
    // 5. RENDERIZAR TABLA CON AUTOTABLE
    autoTable(doc, { 
      columns: columnas, 
      body: filas, 
      startY: 35, 
      theme: 'striped', 
      headStyles: { fillColor: '#596B43', textColor: 255, fontSize: 5.5, fontStyle: 'bold', halign: 'center' }, 
      bodyStyles: { fontSize: 5.2, valign: 'middle', cellPadding: 0.8 }, 
      alternateRowStyles: { fillColor: '#F2F5F0' }, 
      columnStyles: { 
        fecha_dia: { cellWidth: 12, halign: 'center' }, 
        nombres: { cellWidth: 45 }, 
        presencia_concatenada: { halign: 'left', cellWidth: 10 }, 
        ausencia_concatenada: { halign: 'left', cellWidth: 10 }, 
        horas_totales_calculadas: { halign: 'right', cellWidth: 8 },
        suma_total_campos: { halign: 'center', cellWidth: 8 },
        horas_totales_netas: { halign: 'right', cellWidth: 15 },
        observacion: { halign: 'right', cellWidth: 25 },
        ...llavesTagsDinamicas.reduce((acc, key) => { acc[key] = { halign: 'center', cellWidth: 8 }; return acc; }, {})
      }, 

        // === AGREGA ESTE BLOQUE JUSTO AQUÍ ===
didParseCell: function (data) {
  // Verificamos si estamos en las filas del cuerpo y apuntando a la columna correcta
  if (data.section === 'body' && data.column.dataKey === 'suma_total_campos') {
    
    // EXPLICACIÓN: Convertimos a string, quitamos espacios y dejamos solo el signo menos, el punto y los números
    const textoLimpio = String(data.cell.raw || '0').replace(/[^0-9.-]/g, '').trim();
    const valorNumerico = parseFloat(textoLimpio);

    if (valorNumerico > 0) {
      // Resaltado Verde para valores positivos (Formato hexadecimal de 6 dígitos válido)
      data.cell.styles.textColor = '#418c2f';
      data.cell.styles.fontStyle = 'bold';
    } else if (valorNumerico < 0) {
      // Texto Rojo para valores negativos (Balances menores a cero sin los últimos dígitos ff)
      data.cell.styles.textColor = '#a03329';
      data.cell.styles.fontStyle = 'bold';
    } else {
      // Gris si es exactamente 0.00 o no se pudo parsear
      data.cell.styles.textColor = '#636363';
    }
  }
},

      
      foot: [[ 
        { content: 'TOTALES GENERALES', colSpan: 2 + llavesTagsDinamicas.length, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: `${totalesGlobales.h_presencia.toFixed(2)}h`, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: `${totalesGlobales.h_ausencia.toFixed(2)}h`, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: `${totalesGlobales.totales_proc.toFixed(2)}h`, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: '', styles: { fillColor: '#596B43' } }, 
        { content: `${totalesGlobales.totales_netas.toFixed(2)}h`, styles: { ...estiloCeldaTotales, halign: 'right' } }
      ]], 
      didDrawPage: function () { 
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); 
        doc.text("REPORTE CONSOLIDADO DE RENDIMIENTO DIARIO", 14, 15); 
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); 
        doc.text(`Período: Desde ${inicio} Hasta ${fin}`, 14, 21); 
        const nombreEmpresa = listaEmpresasFija.find(opt => String(opt.id) === String(empresa))?.nombre || "EXPOFLOR CIA. LTDA."; 
        doc.text(`Filtros: Empresa: ${nombreEmpresa} | Departamento: ${departamento || 'Todos'}`, 14, 26); 
        doc.setLineWidth(0.5); doc.setDrawColor(89, 107, 67); doc.line(14, 29, doc.internal.pageSize.width - 14, 29); 
        const fechaImpresion = new Date().toLocaleString(); doc.setFontSize(8); doc.setFont('helvetica', 'italic'); 
        doc.text(`Generado automáticamente el: ${fechaImpresion}`, 14, doc.internal.pageSize.height - 10); 
      }, 
      margin: { top: 35, bottom: 25, left: 14, right: 14 } 
    }); 
 
    // Bloque de Firmas
    let puntoYFirmas = doc.lastAutoTable.finalY + 20; 
    if (puntoYFirmas > doc.internal.pageSize.height - 35) { doc.addPage(); puntoYFirmas = 30; } 
    const anchoPagina = doc.internal.pageSize.width; const anchoLinea = 55; 
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setLineWidth(0.3); doc.setDrawColor(0, 0, 0); 
    const posX1 = 30; doc.line(posX1, puntoYFirmas, posX1 + anchoLinea, puntoYFirmas); doc.text("Firma Elaboración", posX1 + 14, puntoYFirmas + 4); doc.setFont("helvetica", "italic"); doc.text("Elaborado por:", posX1 + 20, puntoYFirmas + 8); 
    doc.setFont("helvetica", "normal"); const posX2 = anchoPagina - 30 - anchoLinea; doc.line(posX2, puntoYFirmas, posX2 + anchoLinea, puntoYFirmas); doc.text("Firma Aprobación Responsable", posX2 + 7, puntoYFirmas + 4); 
 
    // Numeración Final
    const totalPaginas = doc.internal.getNumberOfPages(); 
    for (let i = 1; i <= totalPaginas; i++) { 
      doc.setPage(i); doc.setFontSize(8); doc.setFont('helvetica', 'italic'); 
      doc.text(`Página ${i} de ${totalPaginas}`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 10); 
    } 
    doc.save(`Rep_Rendimiento_Dia_${inicio}.pdf`); 
    toast.success("¡PDF corregido con columnas dinámicas generado!"); 
  } catch (error) { 
    console.error("Error al generar PDF:", error); toast.error("Error al generar PDF"); 
  } finally { 
    if (setLoading) setLoading(false); 
  } 
};


export const exportarPDF = async (datos, configuracion) => {
  const { inicio, fin, empresa, departamento, listaEmpresasFija, fetchWithFallback, setLoading } = configuracion;

  if (setLoading) setLoading(true);

  try {
    setLoading(true); 
    toast.info("Generando reporte PDF, por favor espere..."); 
    const urlReporte = `/api/RRHH/rep_horas_extras?inicio=${inicio}T00:00:00&fin=${fin}T23:59:59&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`; 
    const datosReporte = await fetchWithFallback(urlReporte); 
    
    if (!Array.isArray(datosReporte) || datosReporte.length === 0) { 
      toast.warning("No se encontraron registros con horas extras calculadas para este rango."); 
      return; 
    } 
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); 


        // --- NUEVO: CARGAR Y AGREGAR LOGOS (SIORET Y BELLAFLOR) ---
    const anchoLogo = 40; 
    const altoLogo = 12;  
    const yLogo = 10;     

      const anchoLogo1 = 12; 
    const altoLogo1 = 12;  
    const yLogo1 = 10;   

    // Logo 1 (Sioret) - Al extremo derecho
    const xLogoSioret = 297 - 10 - anchoLogo1; // 247mm
    
    // Logo 2 (Bellaflor) - Al lado del primer logo (dejando 5mm de separación)
    const xLogoBellaflor = xLogoSioret - 5 - anchoLogo; // 202mm

    // Cargar Logo Sioret
    try {
      const imgSioret = await cargarImagenElemento(logoSioret);
      doc.addImage(imgSioret, 'PNG', xLogoSioret, yLogo1, anchoLogo1, altoLogo1);
    } catch (imageError) {
      console.error("No se pudo cargar el logo Sioret en el PDF:", imageError);
    }

    // Cargar Logo Bellaflor
    try {
      const imgBellaflor = await cargarImagenElemento(logoBellaflor);
      doc.addImage(imgBellaflor, 'PNG', xLogoBellaflor, yLogo, anchoLogo, altoLogo);
    } catch (imageError) {
      console.error("No se pudo cargar el logo Bellaflor en el PDF:", imageError);
    }
    // --------------------------------------------------
    
    // 3. Estructura de columnas (24 columnas en total)
    const columnas = [ 
      { header: 'Idemp', dataKey: 'idemp1' }, 
      { header: 'Área', dataKey: 'AREA' }, 
      { header: 'Cédula', dataKey: 'CEDULA' }, 
      { header: 'Empleado', dataKey: 'EMPLEADO' }, 
      { header: 'Fecha', dataKey: 'fecha_dia' }, 
      { header: 'Tipo Día', dataKey: 'TIPO DIA' }, 
      { header: 'Día', dataKey: 'DIA' },
      { header: 'H. Inicio', dataKey: 'h_inicio_jn' }, 
      { header: 'H. Almuerzo', dataKey: 'h_almuerzo' }, 
      { header: 'H. Fin', dataKey: 'h_inicio_fn' }, 
      { header: 'H. Ini Ext', dataKey: 'h_inicio_ext' }, 
      { header: 'H. Fin Ext', dataKey: 'f_h_fin_ext' }, 
      { header: 'H. Jor Nor', dataKey: 'h_jor_normal' }, 
      { header: 'H. Rec Noc (25%)', dataKey: 'HORAS RECARGO NOCTURNO (25%)' }, 
      { header: 'H. Supl (50%)', dataKey: 'HORAS SUPLENTARIA (50%)' }, 
      { header: 'H. Extra (100%)', dataKey: 'HORA EXTRAORDINARIA (100%)' }, 
      { header: '# H. Rec Noc', dataKey: '# HORAS RECARGO NOCTURNO' }, 
      { header: '# H. Supl', dataKey: '# HORAS SUPLEMENTARIAS' }, 
      { header: '# H. Extra', dataKey: '# HORAS EXTRAORDINARIAS' }, 
      { header: 'Val. Rec Noc', dataKey: 'VALOR HORAS RECARGO NOCTURNO' }, 
      { header: 'Val. 50%', dataKey: 'VALOR HORAS SUPLEMENTARIAS' }, 
      { header: 'Val. 100%', dataKey: 'VALOR HORAS EXTRAORDINARIAS' }, 
      { header: 'Total H.E.', dataKey: 'VALOR HORAS EXTRAS' },
      { header: 'Firma', dataKey: 'col_firma' }
    ]; 

    
 
    // 4. Formatear los campos monetarios
    const filas = datosReporte.map(item => ({ 
      ...item, 
      'VALOR HORAS RECARGO NOCTURNO': `$${Number(item['VALOR HORAS RECARGO NOCTURNO'] || 0).toFixed(2)}`, 
      'VALOR HORAS SUPLEMENTARIAS': `$${Number(item['VALOR HORAS SUPLEMENTARIAS'] || 0).toFixed(2)}`, 
      'VALOR HORAS EXTRAORDINARIAS': `$${Number(item['VALOR HORAS EXTRAORDINARIAS'] || 0).toFixed(2)}`, 
      'VALOR HORAS EXTRAS': `$${Number(item['VALOR HORAS EXTRAS'] || 0).toFixed(2)}`,
      col_firma: '' 
    })); 

    // 5. Calcular sumatorias
    const totalesGlobales = datosReporte.reduce((acc, current) => {
      acc.h25 += Number(current['# HORAS RECARGO NOCTURNO'] || 0);
      acc.h50 += Number(current['# HORAS SUPLEMENTARIAS'] || 0);
      acc.h100 += Number(current['# HORAS EXTRAORDINARIAS'] || 0);
      
      acc.v25 += Number(current['VALOR HORAS RECARGO NOCTURNO'] || 0); 
      acc.v50 += Number(current['VALOR HORAS SUPLEMENTARIAS'] || 0); 
      acc.v100 += Number(current['VALOR HORAS EXTRAORDINARIAS'] || 0); 
      acc.total += Number(current['VALOR HORAS EXTRAS'] || 0); 
      return acc; 
    }, { h25: 0, h50: 0, h100: 0, v25: 0, v50: 0, v100: 0, total: 0 }); 
 
    // Estilo base reutilizable para celdas del footer (Totales más pequeños: fontSize 5)
    const estiloCeldaTotales = { fontSize: 5, fontStyle: 'bold', fillColor: '#596B43', textColor: 255, cellPadding: 1 };

    // 6. Construir la Tabla con autoTable 
   autoTable(doc, { 
      columns: columnas, 
      body: filas, 
      startY: 35, 
      theme: 'striped', 
      headStyles: { 
        fillColor: '#596B43',    // Verde Oliva exacto de Bellaflor
        textColor: 255,          // Texto blanco para contraste limpio
        fontSize: 5.5, 
        fontStyle: 'bold', 
        halign: 'center' 
      }, 
      bodyStyles: { 
        fontSize: 5.5, 
        valign: 'middle' 
      },
      alternateRowStyles: {
        fillColor: '#F2F5F0'    // Un fondo alterno grisáceo-verdoso muy sutil basado en el logo
      },
      columnStyles: { 
        idemp1: { cellWidth: 6, halign: 'center' }, 
        CEDULA: { cellWidth: 12, halign: 'center' }, 
        EMPLEADO: { cellWidth: 18 }, 
        AREA: { cellWidth: 10 }, 
        fecha_dia: { cellWidth: 13, halign: 'center' },
        '# HORAS RECARGO NOCTURNO': { halign: 'center' },
        '# HORAS SUPLEMENTARIAS': { halign: 'center' },
        '# HORAS EXTRAORDINARIAS': { halign: 'center' },
        'VALOR HORAS RECARGO NOCTURNO': { halign: 'right' }, 
        'VALOR HORAS SUPLEMENTARIAS': { halign: 'right' }, 
        'VALOR HORAS EXTRAORDINARIAS': { halign: 'right' }, 
        'VALOR HORAS EXTRAS': { halign: 'right' },
        col_firma: { cellWidth: 10 }
      }, 
      foot: [[ 
        { content: 'TOTALES GENERALES', colSpan: 16, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: `${totalesGlobales.h25}h`, styles: { ...estiloCeldaTotales, halign: 'center' } }, 
        { content: `${totalesGlobales.h50}h`, styles: { ...estiloCeldaTotales, halign: 'center' } }, 
        { content: `${totalesGlobales.h100}h`, styles: { ...estiloCeldaTotales, halign: 'center' } }, 
        { content: `$${totalesGlobales.v25.toFixed(2)}`, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: `$${totalesGlobales.v50.toFixed(2)}`, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: `$${totalesGlobales.v100.toFixed(2)}`, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: `$${totalesGlobales.total.toFixed(2)}`, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: '', styles: { fillColor: '#596B43' } }
      ]], 
      didDrawPage: function (data) { 
        // --- ENCABEZADO --- 
        doc.setFontSize(14); 
        doc.setFont('helvetica', 'bold'); 
        doc.text("REPORTE CONSOLIDADO DE HORAS EXTRAS", 14, 15); 
 
        doc.setFontSize(9); 
        doc.setFont('helvetica', 'normal'); 
        doc.text(`Período: Desde ${inicio} Hasta ${fin}`, 14, 21); 
 
        const nombreEmpresa = listaEmpresasFija.find(opt => opt.id === empresa)?.nombre || "EXPOFLOR CIA. LTDA."; 
        doc.text(`Filtros: Empresa: ${nombreEmpresa} | Departamento: ${departamento || 'Administración'}`, 14, 26); 
 
        doc.setLineWidth(0.5); 
        doc.setDrawColor(29, 95, 138); 
        doc.line(14, 29, doc.internal.pageSize.width - 14, 29); 
        
        // --- PIE DE PÁGINA (ESTÁTICO) ---
        const fechaImpresion = new Date().toLocaleString(); 
        doc.setFontSize(8); 
        doc.setFont('helvetica', 'italic'); 
        doc.text(`Generado automáticamente el: ${fechaImpresion}`, 14, doc.internal.pageSize.height - 10); 
      }, 
      margin: { top: 35, bottom: 45, left: 14, right: 14 } 
    }); 
 
    // 7. Dibujar el Bloque de Firmas al final de la tabla
    let puntoYFirmas = doc.lastAutoTable.finalY + 25; 
    const limitePagina = doc.internal.pageSize.height - 40;

    if (puntoYFirmas > limitePagina) {
      doc.addPage();
      puntoYFirmas = 40; 
    }

    const anchoPagina = doc.internal.pageSize.width;
    const anchoLinea = 60;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);

    // Firma 1: Elaborado por
    const posX1 = 20;
    doc.line(posX1, puntoYFirmas, posX1 + anchoLinea, puntoYFirmas);
    doc.text("Firma Elaboración", posX1 + 17, puntoYFirmas + 4);
    doc.setFont("helvetica", "italic");
    doc.text("Elaborado por:", posX1 + 20, puntoYFirmas + 8);
    
    // Firma 2: Aprobado por
    doc.setFont("helvetica", "normal");
    const posX2 = (anchoPagina / 2) - (anchoLinea / 2);
    doc.line(posX2, puntoYFirmas, posX2 + anchoLinea, puntoYFirmas);
    doc.text("Firma Aprobación / Responsable", posX2 + 7, puntoYFirmas + 4);
    doc.setFont("helvetica", "italic");
    doc.text("Nombre Aprobador: (Jefe Área / Supervisor)", posX2 + 2, puntoYFirmas + 8);

    // Firma 3: Recibido por
    doc.setFont("helvetica", "normal");
    const posX3 = anchoPagina - 20 - anchoLinea;
    doc.line(posX3, puntoYFirmas, posX3 + anchoLinea, puntoYFirmas);
    doc.text("Firma Revisión / Recepción", posX3 + 12, puntoYFirmas + 4);
    doc.setFont("helvetica", "italic");
    doc.text("Recibido por:", posX3 + 22, puntoYFirmas + 8);

    // 8. Numeración de Páginas Dinámica
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8); 
      doc.setFont('helvetica', 'italic'); 
      doc.text(
        `Página ${i} de ${totalPaginas}`, 
        doc.internal.pageSize.width - 35, 
        doc.internal.pageSize.height - 10
      );
    }

    // 9. Guardar archivo 
    doc.save(`Rep_Horas_Extras_${inicio}_al_${fin}.pdf`); 
    toast.success("¡PDF descargado con éxito!"); 
   } catch (error) {
    toast.error("Error al generar PDF");
  } finally {
    if (setLoading) setLoading(false);
  }
};


export const exportarExcel = async (datos, configuracion) => {
  // Desestructuramos todo lo que la función necesita usar de la pantalla principal
  const { inicio, fin, empresa, departamento, listaEmpresasFija, fetchWithFallback, setLoading } = configuracion;

  if (setLoading) setLoading(true);
  
  try {
    setLoading(true);
    toast.info("Generando reporte Excel, por favor espere...");

    // 1. Consumir la API de reportes usando tus filtros actuales
    const urlReporte = `/api/RRHH/rep_horas_extras?inicio=${inicio}T00:00:00&fin=${fin}T23:59:59&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`;
    const datosReporte = await fetchWithFallback(urlReporte);

    if (!Array.isArray(datosReporte) || datosReporte.length === 0) {
      toast.warning("No se encontraron registros con horas extras calculadas para este rango.");
      return;
    }

    // 2. Definir los encabezados de la tabla (Misma estructura sin Sueldo Base)
    const headers = [
      'ID Emp', 'Área', 'Cédula', 'Empleado', 'Fecha', 'Tipo Día', 'Día',
      'H. Inicio', 'H. Almuerzo', 'H. Fin', 'H. Ini Ext', 'H. Fin Ext', 'H. Jor Nor',
      'H. Rec Noc (25%)', 'H. Supl (50%)', 'H. Extra (100%)',
      '# H. Rec Noc', '# H. Supl', '# H. Extra',
      'Val. Rec Noc', 'Val. 50%', 'Val. 100%', 'Total H.E.', 'Firma'
    ];

    // 3. Crear matriz base con los datos de contexto arriba de la tabla
    const nombreEmpresa = listaEmpresasFija.find(opt => opt.id === empresa)?.nombre || "EXPOFLOR CIA. LTDA.";
    const matrizExcel = [
      ["REPORTE CONSOLIDADO DE HORAS EXTRAS"],
      [`Período: Desde ${inicio} Hasta ${fin}`],
      [`Filtros: Empresa: ${nombreEmpresa} | Departamento: ${departamento || 'Administración'}`],
      [], // Fila en blanco
      headers // Fila 5: Los encabezados de la tabla
    ];

    // 4. Mapear y empujar el cuerpo de datos a la matriz
    datosReporte.forEach((item) => {
      matrizExcel.push([
        item.idemp1,
        item.AREA,
        item.CEDULA,
        item.EMPLEADO,
        item.fecha_dia,
        item['TIPO DIA'],
        item.DIA,
        item.h_inicio_jn,
        item.h_almuerzo,
        item.h_inicio_fn,
        item.h_inicio_ext,
        item.f_h_fin_ext,
        item.h_jor_normal,
        item['HORAS RECARGO NOCTURNO (25%)'],
        item['HORAS SUPLENTARIA (50%)'],
        item['HORA EXTRAORDINARIA (100%)'],
        Number(item['# HORAS RECARGO NOCTURNO'] || 0),
        Number(item['# HORAS SUPLEMENTARIAS'] || 0),
        Number(item['# HORAS EXTRAORDINARIAS'] || 0),
        Number(item['VALOR HORAS RECARGO NOCTURNO'] || 0),
        Number(item['VALOR HORAS SUPLEMENTARIAS'] || 0),
        Number(item['VALOR HORAS EXTRAORDINARIAS'] || 0),
        Number(item['VALOR HORAS EXTRAS'] || 0),
        '' // Columna 'Firma' vacía para llenado manual
      ]);
    });

    // 5. Agregar la fila de Totales Generales empleando fórmulas de Excel nativas
    const primeraFilaDatos = 6; // En Excel base 1, los datos empiezan en la fila 6
    const ultimaFilaDatos = matrizExcel.length;
    const filaTotalesNum = ultimaFilaDatos + 1;

    const filaTotales = new Array(24).fill('');
    filaTotales[0] = 'TOTALES GENERALES'; // Celda A
    
    // Fórmulas para cantidades de horas (Columnas Q, R, S en Excel)
    filaTotales[16] = { f: `SUM(Q${primeraFilaDatos}:Q${ultimaFilaDatos})` };
    filaTotales[17] = { f: `SUM(R${primeraFilaDatos}:R${ultimaFilaDatos})` };
    filaTotales[18] = { f: `SUM(S${primeraFilaDatos}:S${ultimaFilaDatos})` };
    
    // Fórmulas para valores monetarios (Columnas T, U, V, W en Excel)
    filaTotales[19] = { f: `SUM(T${primeraFilaDatos}:T${ultimaFilaDatos})` };
    filaTotales[20] = { f: `SUM(U${primeraFilaDatos}:U${ultimaFilaDatos})` };
    filaTotales[21] = { f: `SUM(V${primeraFilaDatos}:V${ultimaFilaDatos})` };
    filaTotales[22] = { f: `SUM(W${primeraFilaDatos}:W${ultimaFilaDatos})` };

    matrizExcel.push(filaTotales);

    // 6. Agregar Bloque de firmas abajo dejando filas vacías de por medio
    matrizExcel.push([], [], []); // Espacio vertical para las firmas físicas

    const filaFirmasLineas = new Array(24).fill('');
    filaFirmasLineas[1] = '_______________________';  // Columna B
    filaFirmasLineas[9] = '_______________________';  // Columna J
    filaFirmasLineas[17] = '_______________________'; // Columna R
    matrizExcel.push(filaFirmasLineas);

    const filaFirmasTitulos = new Array(24).fill('');
    filaFirmasTitulos[1] = 'Firma Elaboración\n(Elaborado por)';
    filaFirmasTitulos[9] = 'Firma Aprobación / Responsable\n(Jefe Área / Supervisor)';
    filaFirmasTitulos[17] = 'Firma Revisión / Recepción\n(Recibido por)';
    matrizExcel.push(filaFirmasTitulos);

    // 7. Convertir la matriz final a una hoja de cálculo (Worksheet)
    const ws = XLSX.utils.aoa_to_sheet(matrizExcel);

    // 8. Aplicar formato numérico de Moneda ($0.00) a las celdas correspondientes de forma retroactiva
    for (let r = primeraFilaDatos - 1; r < filaTotalesNum; r++) {
      for (let c = 19; c <= 22; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          ws[cellRef].z = '"$"#,##0.00'; // Máscara de moneda contable en SheetJS
        }
      }
    }

    // Definir anchos sugeridos de las columnas para evitar que los textos se traslapen
    ws['!cols'] = [
      { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 35 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }
    ];

    // 9. Crear el libro de trabajo (Workbook) y descargar
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horas Extras');

    XLSX.writeFile(wb, `Rep_Horas_Extras_${inicio}_al_${fin}.xlsx`);
    toast.success("¡Excel descargado con éxito!");

    } catch (error) {
    toast.error("Error al generar Excel");
  } finally {
    if (setLoading) setLoading(false);
  }
};


export const exportarExcelposneg = async (datos, configuracion) => {
  const { inicio, fin, empresa, departamento, listaEmpresasFija, fetchWithFallback, setLoading } = configuracion;

  if (setLoading) setLoading(true);
  
  try {
    toast.info("Generando reporte Excel, por favor espere...");

    // 1. Consumir la API usando tus filtros (Enviando solo YYYY-MM-DD sin alterar la query del backend)
    const urlReporte = `/api/RRHH/rep_horas_extrasposneg?inicio=${inicio}&fin=${fin}&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`;
    
    console.log("=== ENVIANDO PETICIÓN AL BACKEND ===");
    console.log("URL Completa:", urlReporte);
    console.log("Filtros crudos:", { inicio, fin, empresa, departamento });
    console.log("=====================================");
    const datosReporte = await fetchWithFallback(urlReporte);

    if (!Array.isArray(datosReporte) || datosReporte.length === 0) {
      toast.warning("No se encontraron registros para este rango.");
      return;
    }

    // 2. Definir los encabezados fijos (Ya no hay columnas dinámicas por velocidad)
    const headers = [
      'ID Emp', 
      'Cédula', 
      'Empleado', 
      'Departamento', 
      'Horas Diarias Base', 
  
      'Hrs Totales Proceso', 
      'Hrs Totales Sin Proceso', 
      'Hrs Totales Con/Sin Proceso', 
      'Balance (+/-)', 
      'Firma'
    ];

    // 3. Crear matriz base con los datos de contexto arriba de la tabla
    const nombreEmpresa = listaEmpresasFija.find(opt => opt.id === Number(empresa))?.nombre || "EXPOFLOR CIA. LTDA.";
    const matrizExcel = [
      ["REPORTE CONSOLIDADO DE RENDIMIENTO Y HORAS (POS/NEG)"],
      [`Período: Desde ${inicio} Hasta ${fin}`],
      [`Filtros: Empresa: ${nombreEmpresa} | Departamento: ${departamento || 'Todos'}`],
      [], // Fila en blanco
      headers // Fila 5: Los encabezados estructurados
    ];

    // 4. Mapear y empujar el cuerpo de datos a la matriz
    datosReporte.forEach((item) => {
      const fila = [
        item.Idemp,
        item.cedula,
        item.nombres,
        item.departamento,
        Number(item.horas_jornada_base || 8),

        Number(item.horas_totales_proceso || 0),
        Number(item.horas_totales_sin_proceso || 0),
        Number(item.horas_totales_consin_proceso || 0),
        item.horas_mas_menos || '0.00',
        '' // Columna 'Firma' vacía
      ];

      matrizExcel.push(fila);
    });

    // 5. Agregar la fila de Totales Generales empleando fórmulas dinámicas de Excel
    const primeraFilaDatos = 6; 
    const ultimaFilaDatos = matrizExcel.length;
    const filaTotalesNum = ultimaFilaDatos + 1;

    // Inicializamos la fila de totales con el largo exacto de columnas
    const filaTotales = new Array(headers.length).fill('');
    filaTotales[0] = 'TOTALES GENERALES'; 

    // Función auxiliar para obtener la letra de la columna en Excel basándose en su índice numérico
    const getExcelColumnName = (colIndex) => {
      let columnName = '';
      while (colIndex >= 0) {
        columnName = String.fromCharCode((colIndex % 26) + 65) + columnName;
        colIndex = Math.floor(colIndex / 26) - 1;
      }
      return columnName;
    };

    // Índices fijos para aplicar las sumatorias en Excel
    const indiceTagsTotales = 6; // Columna G
    const indiceHorasProceso = 7; // Columna H

    // Sumamos la columna de Tags Totales
    const colLetraTags = getExcelColumnName(indiceTagsTotales);
    filaTotales[indiceTagsTotales] = { f: `SUM(${colLetraTags}${primeraFilaDatos}:${colLetraTags}${ultimaFilaDatos})` };

    // Inyectamos las fórmulas de suma (SUM) en las 3 columnas de horas acumuladas de la derecha
    for (let i = 0; i < 3; i++) {
      const colLetraHoras = getExcelColumnName(indiceHorasProceso + i);
      filaTotales[indiceHorasProceso + i] = { f: `SUM(${colLetraHoras}${primeraFilaDatos}:${colLetraHoras}${ultimaFilaDatos})` };
    }

    matrizExcel.push(filaTotales);

    // 6. Agregar Bloque de firmas físicas abajo
    matrizExcel.push([], [], []); 

    const filaFirmasLineas = new Array(headers.length).fill('');
    filaFirmasLineas[1] = '_______________________';  
    filaFirmasLineas[5] = '_______________________';  
    filaFirmasLineas[headers.length - 2] = '_______________________'; 
    matrizExcel.push(filaFirmasLineas);

    const filaFirmasTitulos = new Array(headers.length).fill('');
    filaFirmasTitulos[1] = 'Firma Elaboración\n(Elaborado por)';
    filaFirmasTitulos[5] = 'Firma Aprobación / Responsable\n(Jefe Área / Supervisor)';
    filaFirmasTitulos[headers.length - 2] = 'Firma Revisión / Recepción\n(Recibido por)';
    matrizExcel.push(filaFirmasTitulos);

    // 7. Convertir la matriz final a una hoja de cálculo (Worksheet)
    const ws = XLSX.utils.aoa_to_sheet(matrizExcel);

    // 8. Aplicar formato numérico estándar (Decimal de 2 dígitos) a las columnas de horas totales
    for (let r = primeraFilaDatos - 1; r < filaTotalesNum; r++) {
      for (let i = 0; i < 3; i++) {
        const c = indiceHorasProceso + i;
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          ws[cellRef].z = '#,##0.00'; 
        }
      }
    }

    // Definir anchos adaptativos estables para las columnas fijas
    ws['!cols'] = headers.map((h, i) => {
      if (i === 2) return { wch: 35 }; // Columna Empleado más ancha
      if (i === 3) return { wch: 22 }; // Columna Departamento
      if (i === 6) return { wch: 20 }; // Cantidad Tags Totales
      return { wch: 15 }; // Ancho por defecto para el resto
    });

    // 9. Crear el libro de trabajo (Workbook) y descargar
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rendimiento y Horas');

    XLSX.writeFile(wb, `Rep_Horas_Extras_PosNeg_${inicio}_al_${fin}.xlsx`);
    toast.success("¡Excel de rendimiento descargado con éxito!");

  } catch (error) {
    console.error("Error detallado en Excel:", error);
    toast.error("Error al generar el archivo Excel");
  } finally {
    if (setLoading) setLoading(false);
  }
};



export const exportarPDFbono = async (datos, configuracion) => {
  const { inicio, fin, empresa, departamento, listaEmpresasFija, fetchWithFallback, setLoading } = configuracion;

  if (setLoading) setLoading(true);

  try {
    toast.info("Generando reporte de bonos por rendimiento, por favor espere..."); 
    
    // 1. Petición limpia a la API con los parámetros que espera el backend
 
    const urlReporte = `/api/RRHH/rep_bono_rend?inicio=${inicio}T00:00:00&fin=${fin}T23:59:59&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`;
      console.log("=== DIAGNÓSTICO URL ENVIADA ===", urlReporte); 

    const datosReporte = await fetchWithFallback(urlReporte); 
    console.log("=== RESPUESTA DE LA API ===", datosReporte); 
    
    if (!Array.isArray(datosReporte) || datosReporte.length === 0) { 
      toast.warning("No se encontraron registros con horas de bono calculadas para este rango."); 
      if (setLoading) setLoading(false);
      return; 
    } 

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); 

    // 2. DETECTAR LAS COLUMNAS DINÁMICAS DE METAS (Ej: cantidad_tags_60, cantidad_tags_80, etc.)
    // Filtramos las propiedades del primer objeto para encontrar las columnas de tags dinámicas reales
    const llavesTagsDinamicas = Object.keys(datosReporte[0]).filter(
      key => key.startsWith('cantidad_tags_') && key !== 'cantidad_tags_vacia'
    );

    // 3. MAPEO ESTRUCTURAL DE COLUMNAS EXACTO A LA API
    const columnas = [ 
      { header: 'Fecha', dataKey: 'fecha_dia' },
      { header: 'Cédula', dataKey: 'cedula' }, 
      { header: 'Empleado', dataKey: 'nombres' }, 
      { header: 'Departamento', dataKey: 'departamento' }, 
      { header: 'Tipo Día', dataKey: 'tipo_dia' }, 
      // Insertamos automáticamente las metas dinámicas que traiga la consulta
      ...llavesTagsDinamicas.map(key => {
        const metaPorHora = key.replace('cantidad_tags_', '');
        return {
          header: `Ramos / ${metaPorHora}h`, // Queda limpio como: Ramos / 60h
          dataKey: key
        };
      }),
      { header: 'Hrs. Bono', dataKey: 'horas_bono' },
      { header: 'Firma Recibido', dataKey: 'col_firma' }
    ]; 

    // 4. FORMATEAR FILAS (Mantenemos los strings de tags intactos ya que traen cantidad + horas desde SQL)
    const filas = datosReporte.map(item => ({ 
      ...item, 
      horas_bono: `${Number(item.horas_bono || 0).toFixed(2)}`, // Formato numérico limpio a dos decimales
      col_firma: '' 
    })); 

    // 5. CALCULAR SUMATORIA GLOBAL DE HORAS BONO
    const totalHorasBono = datosReporte.reduce((acc, current) => acc + Number(current.horas_bono || 0), 0);
 
    const estiloCeldaTotales = { fontSize: 6.5, fontStyle: 'bold', fillColor: '#596B43', textColor: 255, cellPadding: 2 };

    // 6. CONSTRUIR TABLA CON AUTOTABLE Y SUS VALORES COINCIDENTES
    autoTable(doc, { 
      columns: columnas, 
      body: filas, 
      startY: 35, 
      theme: 'striped', 
      headStyles: { 
        fillColor: '#596B43',    // Verde Oliva corporativo
        textColor: 255,          
        fontSize: 6.5, 
        fontStyle: 'bold', 
        halign: 'center' 
      }, 
      bodyStyles: { 
        fontSize: 6.5, 
        valign: 'middle' 
      },
      alternateRowStyles: {
        fillColor: '#F2F5F0'    // Fondo sutil alterno grisáceo-verdoso
      },
      columnStyles: { 
        fecha_dia: { cellWidth: 18, halign: 'center' },
        cedula: { cellWidth: 18, halign: 'center' }, 
        nombres: { cellWidth: 45 }, 
        departamento: { cellWidth: 30 }, 
        tipo_dia: { cellWidth: 18, halign: 'center' },
        horas_bono: { cellWidth: 18, halign: 'right' },
        col_firma: { cellWidth: 25 },
        // Centramos dinámicamente el contenido de todas las columnas de tags
        ...llavesTagsDinamicas.reduce((acc, key) => {
          acc[key] = { halign: 'center' };
          return acc;
        }, {})
      }, 
      foot: [[ 
        // El colSpan se adapta automáticamente sumando los 5 campos fijos iniciales + la cantidad de columnas de metas extras
        { content: 'TOTAL HORAS BONO', colSpan: 5 + llavesTagsDinamicas.length, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: `${totalHorasBono.toFixed(2)} hrs`, styles: { ...estiloCeldaTotales, halign: 'right' } }, 
        { content: '', styles: { fillColor: '#596B43' } }
      ]],
      didDrawPage: function (data) { 
        // --- ENCABEZADO --- 
        doc.setFontSize(14); 
        doc.setFont('helvetica', 'bold'); 
        doc.text("REPORTE DE BONOS POR RENDIMIENTO", 14, 15); 
 
        doc.setFontSize(9); 
        doc.setFont('helvetica', 'normal'); 
        doc.text(`Período: Desde ${inicio} Hasta ${fin}`, 14, 21); 
 
        const idEmpresaNum = parseInt(empresa, 10);
        const nombreEmpresa = listaEmpresasFija.find(opt => opt.id === idEmpresaNum)?.nombre || "EXPOFLOR CIA. LTDA."; 
        doc.text(`Filtros: Empresa: ${nombreEmpresa} | Departamento: ${departamento || 'Todos'}`, 14, 26); 
 
        doc.setLineWidth(0.5); 
        doc.setDrawColor(89, 107, 67); 
        doc.line(14, 29, doc.internal.pageSize.width - 14, 29); 
        
        // --- PIE DE PÁGINA ESTÁTICO ---
        const fechaImpresion = new Date().toLocaleString(); 
        doc.setFontSize(8); 
        doc.setFont('helvetica', 'italic'); 
        doc.text(`Generado automáticamente el: ${fechaImpresion}`, 14, doc.internal.pageSize.height - 10); 
      }, 
      margin: { top: 35, bottom: 45, left: 14, right: 14 } 
    });

    // 7. INYECCIÓN ASÍNCRONA DE LOGOS Y NUMERACIÓN DE PÁGINAS (SIN ENCRUCIJADAS)
    const totalPaginas = doc.internal.getNumberOfPages();
    
    // Precargamos los logos UNA SOLA VEZ fuera del bucle para máximo rendimiento
    let imgSioretCargada = null;
    let imgBellaflorCargada = null;

    try {
      if (typeof logoSioret !== 'undefined' && logoSioret) {
        imgSioretCargada = await cargarImagenElemento(logoSioret);
      }
    } catch (e) { console.error("Error al precargar logo Sioret:", e); }

    try {
      if (typeof logoBellaflor !== 'undefined' && logoBellaflor) {
        imgBellaflorCargada = await cargarImagenElemento(logoBellaflor);
      }
    } catch (e) { console.error("Error al precargar logo Bellaflor:", e); }

    // Ahora el bucle dibuja en memoria de forma instantánea
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      
      const anchoLogo = 40; const altoLogo = 12; const yLogo = 10;     
      const anchoLogo1 = 12; const altoLogo1 = 12; const yLogo1 = 10;   
      const xLogoSioret = 297 - 10 - anchoLogo1; 
      const xLogoBellaflor = xLogoSioret - 5 - anchoLogo; 

      // Reutilizamos la imagen en caché instantáneamente si cargó con éxito
      if (imgSioretCargada) {
        doc.addImage(imgSioretCargada, 'PNG', xLogoSioret, yLogo1, anchoLogo1, altoLogo1);
      }
      if (imgBellaflorCargada) {
        doc.addImage(imgBellaflorCargada, 'PNG', xLogoBellaflor, yLogo, anchoLogo, altoLogo);
      }

      // Escribir numeración final limpia
      doc.setFontSize(8); 
      doc.setFont('helvetica', 'italic'); 
      doc.text(`Página ${i} de ${totalPaginas}`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 10);
    }

    // Retornamos el puntero del PDF a la última página para estampar las firmas autorizadas
    doc.setPage(totalPaginas);

    // 8. BLOQUE DE FIRMAS DE CONTROL REVISADO
    let puntoYFirmas = doc.lastAutoTable.finalY + 25; 
    const limitePagina = doc.internal.pageSize.height - 40;

    if (puntoYFirmas > limitePagina) {
      doc.addPage();
      puntoYFirmas = 40; 
    }

    const anchoPagina = doc.internal.pageSize.width;
    const anchoLinea = 60;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);

    // Firma 1: Elaborado por
    const posX1 = 20;
    doc.line(posX1, puntoYFirmas, posX1 + anchoLinea, puntoYFirmas);
    doc.text("Firma Elaboración", posX1 + 17, puntoYFirmas + 4);
    doc.setFont("helvetica", "italic");
    doc.text("Elaborado por:", posX1 + 20, puntoYFirmas + 8);
    
    // Firma 2: Aprobado por
    doc.setFont("helvetica", "normal");
    const posX2 = (anchoPagina / 2) - (anchoLinea / 2);
    doc.line(posX2, puntoYFirmas, posX2 + anchoLinea, puntoYFirmas);
    doc.text("Firma Aprobación / Responsable", posX2 + 7, puntoYFirmas + 4);
    doc.setFont("helvetica", "italic");
    doc.text("Nombre Aprobador: (Jefe Área / Supervisor)", posX2 + 2, puntoYFirmas + 8);

    // Firma 3: Recibido por
    doc.setFont("helvetica", "normal");
    const posX3 = anchoPagina - 20 - anchoLinea;
    doc.line(posX3, puntoYFirmas, posX3 + anchoLinea, puntoYFirmas);
    doc.text("Firma Revisión / Recepción", posX3 + 12, puntoYFirmas + 4);
    doc.setFont("helvetica", "italic");
    doc.text("Recibido por:", posX3 + 22, puntoYFirmas + 8);

    // 9. GUARDAR Y BAJAR ARCHIVO COMPATIBLE
    doc.save(`Rep_Bono_Rendimiento_${inicio}_al_${fin}.pdf`); 
    toast.success("¡PDF de bonos por rendimiento descargado con éxito!"); 
  } catch (error) {
    console.error("Error crítico en generación del PDF:", error);
    toast.error("Error al generar PDF de bonos");
  } finally {
    if (setLoading) setLoading(false); 
  }
};
