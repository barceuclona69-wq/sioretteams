import { utils, writeFile } from 'xlsx'; 
import { API_BASE_URL } from '../../config'; 
import { jsPDF } from 'jspdf'; 
import autoTable from 'jspdf-autotable'; 

/**
 * Servicio auxiliar para consultar el API de reportes de manera unificada
 */
const fetchDatosReporte = async (desde, hasta, tipo) => {
  if (!desde || !hasta) {
    throw new Error("Por favor, selecciona un rango de fechas válido.");
  }

  // Concatenamos el parámetro tipo en la URL si es enviado
  let url = `${API_BASE_URL}/api/DARTIS/avancestags_reporte?desde=${desde}&hasta=${hasta}`;
  if (tipo) {
    url += `&tipo=${tipo}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error al obtener los datos del servidor');
  }

  const data = await response.json();
  if (!data || data.length === 0) {
    throw new Error(`No se encontraron registros de tipo [${tipo || 'TODOS'}] para este rango de fechas.`);
  }

  return data;
};


/** 
 * Función para descargar el reporte de avances de tags en Excel (.xlsx) 
 */ 
export const descargarReporteAvances = async (desde, hasta, tipo) => { 
  try { 
    // 1. Pasamos el parámetro 'tipo' a la función de consulta modificada antes
    const data = await fetchDatosReporte(desde, hasta, tipo);

    // Mapeo estructurado de datos para el archivo Excel 
    const datosExcel = data.map(item => ({ 
      'Empleado': item.nombre_empleado || '-', 
      'Producto': item.nombre_producto || '-', 
      'Mesa': item.mesa || '0', 
      'Helicóptero': item.id_maquina || '0',
      'Pendiente': Number(item.Pendiente ?? 0), 
      'Listo': Number(item.Listo ?? 0), 
      'Devuelto': Number(item.Devuelto ?? 0), 
      'Anulado': Number(item.Anulado ?? 0), 
      'Cantidad Asignada': Number(item.Cantidad_Asignada ?? 0), 
      'Porcentaje Avance': `${Number(item.Porcentaje_Avance ?? 0).toFixed(2)}%`,
      // 2. Agregamos el campo para que aparezca una columna con el tipo en el archivo final
      'Tipo': tipo || 'TODOS'
    })); 

    const worksheet = utils.json_to_sheet(datosExcel); 
    const workbook = utils.book_new(); 
    utils.book_append_sheet(workbook, worksheet, "Avances Tags"); 
    
    // 3. Modificamos el nombre del archivo para incluir el tipo en el título de la descarga
    writeFile(workbook, `Reporte_Avances_${tipo || 'GLOBAL'}_${desde}_a_${hasta}.xlsx`); 
  } catch (error) { 
    console.error("❌ Error generando el reporte Excel:", error); 
    alert(error.message || "Hubo un problema al generar el reporte."); 
  } 
};


/** 
 * Función para descargar el reporte de avances de tags en PDF usando jsPDF 
 */ 
export const descargarReportePDF = async (desde, hasta, tipo) => { 
  try { 
      const data = await fetchDatosReporte(desde, hasta, tipo);

    // 1. Inicializar documento PDF en orientación Horizontal (Landscape)
    const doc = new jsPDF({ 
      orientation: 'landscape', 
      unit: 'mm', 
      format: 'a4' 
    }); 

    // 2. Cálculo acumulativo de totales mediante destructuring
    let totales = { pendiente: 0, listo: 0, devuelto: 0, anulado: 0, asignada: 0 };

    data.forEach(item => { 
      totales.pendiente += Number(item.Pendiente ?? 0); 
      totales.listo += Number(item.Listo ?? 0); 
      totales.devuelto += Number(item.Devuelto ?? 0); 
      totales.anulado += Number(item.Anulado ?? 0); 
      totales.asignada += Number(item.Cantidad_Asignada ?? 0); 
    }); 

    const porcentajeGlobal = totales.asignada > 0 
      ? ((totales.listo / totales.asignada) * 100).toFixed(2)
      : "0.00"; 

    // 3. Renderizado del Encabezado Principal del Documento
    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(16); 
    doc.text("REPORTE DE AVANCES DE TAGS", 148, 12, { align: "center" }); 
    
    doc.setFont("helvetica", "normal"); 
    doc.setFontSize(10); 
    doc.text(`Período: Desde ${desde} hasta ${hasta}`, 148, 18, { align: "center" }); 
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 148, 23, { align: "center" }); 

    // Indicadores informativos superiores
    doc.setFont("helvetica", "bold"); 
    doc.text(`Total general asignado en el período: ${totales.asignada} tags`, 14, 30); 
    doc.setFont("helvetica", "normal"); 
    doc.text(`(Registros evaluados: ${data.length})`, 283, 30, { align: "right" }); 

    // 4. Formatear matriz de filas (Se añade el flag de control de color al final)
    const filasTabla = data.map(item => [ 
      String(item.nombre_empleado || '-'), 
      String(item.nombre_producto || '-'), 
      String(item.mesa ?? '0'), 
      String(item.id_maquina ?? '0'), 
      String(item.Pendiente ?? 0), 
      String(item.Listo ?? 0), 
      String(item.Devuelto ?? 0), 
      String(item.Anulado ?? 0), 
      String(item.Cantidad_Asignada ?? 0), 
      `${Number(item.Porcentaje_Avance ?? 0).toFixed(2)}%`, 
      Number(item.Porcentaje_Avance ?? 0) // Índice: Exclusivo para lógica de color
    ]); 

    // Inserción de Fila de Totales en la última posición
    filasTabla.push([ 
      { content: 'TOTALES / SUB-TOTALES', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } }, 
      { content: String(totales.pendiente), styles: { fontStyle: 'bold', halign: 'center' } }, 
      { content: String(totales.listo), styles: { fontStyle: 'bold', halign: 'center' } }, 
      { content: String(totales.devuelto), styles: { fontStyle: 'bold', halign: 'center' } }, 
      { content: String(totales.anulado), styles: { fontStyle: 'bold', halign: 'center' } }, 
      { content: String(totales.asignada), styles: { fontStyle: 'bold', halign: 'center' } }, 
      { content: `${porcentajeGlobal}%`, styles: { fontStyle: 'bold', halign: 'center'} },
      null // Marcador de posición para equiparar la columna oculta de control y evitar desajustes
    ]); 

    // 5. Construcción automatizada de la tabla con estilos unificados
    autoTable(doc, { 
      startY: 35, 
      head: [['Empleado', 'Producto', 'Mesa', 'Helicóptero', 'Pendiente', 'Listo', 'Devuelto', 'Anulado', 'Total Asig.', 'Avance']], 
      body: filasTabla, 
      theme: 'grid', 
      headStyles: { 
        fontStyle: 'bold', 
        halign: 'center', 
        fillColor: [128, 128, 128] ,
         textColor: [0, 0, 0]       // Fuerza el texto a color negro puro
      }, 
      columnStyles: { 
        2: { halign: 'center' }, 
        3: { halign: 'center' }, 
        4: { halign: 'center' }, 
        5: { halign: 'center' }, 
        6: { halign: 'center' }, 
        7: { halign: 'center' }, 
        8: { halign: 'center', fontStyle: 'bold' }, 
        9: { halign: 'center', fontStyle: 'bold' } 
      }, 
      styles: { 
        fontSize: 8.5, 
        cellPadding: 2 
      }, 
      // Evaluador condicional por celda para pintar filas incompletas (< 100%)
      // Evaluador condicional por celda para pintar filas incompletas (< 100%)
      didParseCell: function(dataCell) { 
        if (dataCell.section === 'body') { 
          const esUltimaFilaTotales = dataCell.row.index === filasTabla.length - 1;
          
          if (!esUltimaFilaTotales) {
            // Buscamos el registro original en el arreglo 'data' usando el índice de la fila actual
            const registroOriginal = data[dataCell.row.index];
            const porcentajeAvance = Number(registroOriginal?.Porcentaje_Avance ?? 0);
            
            if (porcentajeAvance < 100) { 
              // Asignación de fondo rojo pastel elegante para alertar falta de avance sin perder legibilidad
               dataCell.cell.styles.fillColor =[225,128,128]; 
            } 
          } 
        } 
      }

            
       
    }); 

      // =========================================================================
  // COPIAR Y PEGAR DESDE AQUÍ: GENERACIÓN DEL GRÁFICO VISUAL (AUTO-DETECTABLE)
  // =========================================================================
  let totalPendiente = 0, totalListo = 0, totalDevuelto = 0, totalAnulado = 0;

  // Sumar los totales recorriendo las filas de forma inteligente (sirve para objetos y arreglos)
  filasTabla.forEach(fila => {
    if (Array.isArray(fila)) {
      // Si tus filas son ARREGLOS ordinarios (ej. por posición de columna)
      totalPendiente += Number(fila[4]) || 0;
      totalListo += Number(fila[5]) || 0;
      totalDevuelto += Number(fila[6]) || 0;
      totalAnulado += Number(fila[7]) || 0;
    } else if (fila && typeof fila === 'object') {
      // Si tus filas son OBJETOS (Busca ignorando mayúsculas y minúsculas)
      Object.keys(fila).forEach(clave => {
        const c = clave.toLowerCase();
        const valor = Number(fila[clave]) || 0;
        if (c.includes('pendiente')) totalPendiente += valor;
        else if (c.includes('listo')) totalListo += valor;
        else if (c.includes('devuelto')) totalDevuelto += valor;
        else if (c.includes('anulado')) totalAnulado += valor;
      });
    }
  });

  const granTotal = totalPendiente + totalListo + totalDevuelto + totalAnulado;

  // Forzamos la creación visual incluso si la suma falla para que puedas ver el diseño
  let posicionY = doc.lastAutoTable.finalY + 15;
  
  // Título de la sección
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Distribución General de Estados", 14, posicionY);

  const secciones = [
    { valor: totalPendiente, r: 255, g: 206, b: 86,  label: "Pendiente" }, // Amarillo
    { valor: totalListo,     r: 75,  g: 192, b: 192, label: "Listo" },     // Verde
    { valor: totalDevuelto,  r: 54,  g: 162, b: 235, label: "Devuelto" },  // Azul
    { valor: totalAnulado,   r: 255, g: 99,  b: 132, label: "Anulado" }    // Rojo
  ];

  posicionY += 12;

  secciones.forEach(sec => {
    // Si la suma dio 0, forzamos un cálculo ficticio para comprobar que pinte en pantalla
    const divisor = granTotal > 0 ? granTotal : 1; 
    const porcentaje = (sec.valor / divisor) * 100;
    const anchoBarraMaximo = 100; 
    const anchoCalculado = granTotal > 0 ? ((porcentaje / 100) * anchoBarraMaximo) : 2; // mini-barra de test si da 0

    // 1. Nombre del estado y número
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${sec.label} (${sec.valor})`, 14, posicionY + 4);

    // 2. Fondo de la barra gris
    doc.setFillColor(230, 230, 230);
    doc.rect(60, posicionY, anchoBarraMaximo, 5, 'F');

    // 3. Barra de progreso de color correspondiente
    doc.setFillColor(sec.r, sec.g, sec.b);
    doc.rect(60, posicionY, anchoCalculado, 5, 'F');

    // 4. Texto del porcentaje
    doc.setFont("helvetica", "normal");
    doc.text(`${porcentaje.toFixed(1)}%`, 165, posicionY + 4);
    
    posicionY += 10; 
  });
  // =========================================================================
  // HASTA AQUÍ
  // =========================================================================


    
    

    // 6. Descarga y almacenamiento local del documento generado
    doc.save(`Reporte_Avances_Tags_${desde}_a_${hasta}.pdf`); 
  } catch (error) { 
    console.error("❌ Error generando el PDF con jsPDF:", error); 
    alert(error.message || "Error técnico al generar el PDF."); 
  } 
};
