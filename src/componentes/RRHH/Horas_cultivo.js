
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../config';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';
import logoSioret from '../../imagenes/logo_sioretblanco.png';
import logoBellaflor from '../../imagenes/Bellaflor.png';
import { jsPDF } from 'jspdf'; 
import autoTable from 'jspdf-autotable'; 

const Horas_cultivo = () => {
     const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("userData");
        const parsed = savedUser ? JSON.parse(savedUser) : { id: null, nombre: 'Usuario', idperfil: null, departamento: '', id_empresa: '' };
      return {
            ...parsed,
            // Convertimos "5,12" en ["5", "12"] y "VENTAS,RRHH" en ["VENTAS", "RRHH"]
            empresasAutorizadas: parsed.id_empresa ? String(parsed.id_empresa).split(',').map(s => s.trim()) : [],
            deptosAutorizados: parsed.departamento ? String(parsed.departamento).split(',').map(s => s.trim()) : []
        };
    });
    
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inicio, setInicio] = useState(new Date().toISOString().split('T')[0]);
    const [fin, setFin] = useState(new Date().toISOString().split('T')[0]);
    const [mostrarModal, setMostrarModal] = useState(false); // Estado para abrir/cerrar el modal
    const [camposGuardados, setCamposGuardados] = useState({});

// Busca la primera empresa autorizada dentro de tu lista de objetos
const listaEmpresasFija = [
    { id: "5", nombre: "EXPOFLOR CIA. LTDA." },
    { id: "4", nombre: "AMAZINGROSES CIA LTDA" },
    { id: "10", nombre: "CAJA DE AHORROS BELLA FLOR" },
    { id: "3", nombre: "HIDDENGARDEN CIA LTDA" },
    { id: "12", nombre: "OASISFLOWER SAS" },
    { id: "13", nombre: "OASISORGANICS SAS" }
];


// Agrega esto junto a tus otros estados (ej. junto a const [datos, setDatos] = useState([]);)
const [seleccionados, setSeleccionados] = useState([]);

// Cambia estas funciones en tus estados iniciales
const handleCheckboxChange = (codigoEmp, fecha) => {
  // Creamos una llave única combinando Código + Fecha (ej: "1234-2026-10-07")
  const llave = `${codigoEmp}_${String(fecha).substring(0, 10)}`;
  
  setSeleccionados((prev) =>
    prev.includes(llave) ? prev.filter((item) => item !== llave) : [...prev, llave]
  );
};

const handleSeleccionarTodos = () => {
  // Evaluamos contra las filas mapeadas usando la misma estructura de la llave
  if (seleccionados.length === datos.length) {
    setSeleccionados([]); 
  } else {
    // Usamos el código de Dartis o la cédula y la fecha del registro local
    setSeleccionados(datos.map(item => `${item.codigo_emp_dar || item.cedula}_${String(item.fecha_dia).substring(0, 10)}`)); 
  }
};



// Localiza y reemplaza el estado de empresa en tu código:
const [empresa, setEmpresa] = useState(() => { 
  const autorizada = listaEmpresasFija.find(opt => user.empresasAutorizadas.includes(opt.id)); 
  // Si tiene múltiples empresas o ninguna fija estricta, permitimos iniciar en vacío (Todas)
  return user.empresasAutorizadas.length > 1 ? '' : (autorizada ? autorizada.id : '');
});

// Localiza y reemplaza el estado de departamento en tu código:
const [departamento, setDepartamento] = useState(() => { 
  // Si tiene múltiples departamentos autorizados, permitimos iniciar en vacío (Todos)
  return user.deptosAutorizados.length > 1 ? '' : (user.deptosAutorizados[0] || ''); 
});

    const [listaDepartamentos, setListaDepartamentos] = useState([]);
    const [busquedaLocal, setBusquedaLocal] = useState('');   
    const [listaEmpleados, setListaEmpleados] = useState([]);
    const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState('');
    const [periodoCierre, setPeriodoCierre] = useState(null);

const pad = (n) => n.toString().padStart(2, '0');
const formatearFechaLocal = (fecha) => {
    if (!fecha) return '';
    // Forzamos que el navegador lo trate como texto local, no UTC
    const d = new Date(fecha.toString().replace(' ', 'T').replace('Z', '')); 
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};


const transformarHoraAFraccionExcel = (horaTexto) => {
  if (!horaTexto || typeof horaTexto !== 'string' || !horaTexto.includes(':')) {
    return 0;
  }
  // CORREGIDO: Extraemos "horas" y "minutos" de forma correcta
  const [horas, minutos] = horaTexto.split(':').map(Number);
  return ((horas * 60) + minutos) / 1440;
};

const obtenerHorasRecargoNocturno = (tipoDia, hInicioJn, hFinJn) => {
  const F7 = String(tipoDia || '').toUpperCase();
  
  if (F7 === 'FIN DE SEMANA' || F7 === 'FERIADO' || !hInicioJn || !hFinJn) {
    return '00:00';
  }
  const H7 = transformarHoraAFraccionExcel(hInicioJn);
  const J7 = transformarHoraAFraccionExcel(hFinJn);
  const LIMITE_MANANA = 0.25;      // 06:00 AM
  const LIMITE_NOCHE = 19 / 24;    // 19:00 PM

  let resultadoFraccion = 0;

  if (H7 > J7) {
    resultadoFraccion = 
      Math.max(0, LIMITE_MANANA - Math.max(H7, 0)) + 
      Math.max(0, J7 - 0) + 
      Math.max(0, 1 - Math.max(H7, LIMITE_NOCHE)) + 
      Math.max(0, Math.min(J7, 1) - LIMITE_NOCHE);
  } else {
    const tramoManana = Math.max(0, Math.min(J7, LIMITE_MANANA) - Math.max(H7, 0));
    const tramoNoche = Math.max(0, Math.min(J7, 1) - Math.max(H7, LIMITE_NOCHE));
    resultadoFraccion = tramoManana + tramoNoche;
  }

  if (resultadoFraccion <= 0 || isNaN(resultadoFraccion)) return '00:00';
  
  const minutosTotales = Math.round(resultadoFraccion * 1440);
  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;
  
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
};


  const estaBloqueado = (fecha) => {
    return periodoCierre?.some(p => 
        p.estado === 'CERRADO' && 
        fecha >= p.fecha_desde && 
        fecha <= p.fecha_hasta
    );
};


const ejecutarCambioMasivo = async (tipoDiaElegido) => {
    // 1. CERRAR EL MODAL CON EL ESTADO DE REACT (REEMPLAZA LAS LÍNEAS DE WINDOW.BOOTSTRAP)
    setMostrarModal(false);
    try {
        setLoading(true);
        const listaIds = datos.map(item => item.id);
        await fetchWithFallback('/api/RRHH/finsemana_masivo_extras', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ids: listaIds, 
                usuario_modif: user.id,   
                tipo_dia: tipoDiaElegido 
            })
        });

        setDatos(prev => prev.map(item => ({ 
            ...item, 
            tipo_dia: tipoDiaElegido, 
            usuario_modif: user.id    
        })));

        toast.success(`¡Se cambiaron todos a ${tipoDiaElegido}!`);

    } catch (error) {
        toast.error("Error en el proceso: " + error.message);
    } finally {
        setLoading(false);
    }
};

// Función auxiliar para convertir la ruta de React en un objeto de imagen listo para jsPDF
const cargarImagenElemento = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
  });
};


  const exportarPDF = async () => { 
  if (loading) return; 
 
  try { 
    setLoading(true); 
    toast.info("Generando reporte PDF, por favor espere..."); 
    const urlReporte = `/api/RRHH/rep_horas_extras?inicio=${inicio}T00:00:00&fin=${fin}T23:59:59&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`; 
    let  datosReporte = await fetchWithFallback(urlReporte); 
    
    if (!Array.isArray(datosReporte) || datosReporte.length === 0) { 
      toast.warning("No se encontraron registros con horas extras calculadas para este rango."); 
      return; 
    } 

       // ================== NUEVA LÓGICA DE FILTRADO (CORREGIDA) ==================
    // Si el usuario seleccionó filas con el checkbox, filtramos el reporte de la API
     // ================== NUEVA LÓGICA DE FILTRADO (LLAVE COMPUESTA) ==================
    if (seleccionados.length > 0) {
      datosReporte = datosReporte.filter(item => {
        // Obtenemos el código de empleado del reporte (idemp1 o CEDULA)
        const codigoEmp = item.idemp1 || item.CEDULA;
        // Obtenemos la fecha limpia (YYYY-MM-DD)
        const fechaDia = item.fecha_dia ? String(item.fecha_dia).substring(0, 10) : '';
        
        // Reconstruimos la llave para este registro del reporte
        const llaveRegistro = `${codigoEmp}_${fechaDia}`;
        
        // Verificamos si esa combinación fue marcada por el usuario
        return seleccionados.includes(llaveRegistro);
      });
    } else {
      toast.warning("Por favor, selecciona al menos un registro para exportar.");
      return;
    }
    // =================================================================================

    // ==========================================================================


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
    console.error("Error generando PDF:", error); 
    toast.error("Ocurrió un error inesperado al armar el archivo PDF: " + error.message); 
  } finally { 
    setLoading(false); 
  } 
};


const exportarExcel = async () => {
  if (loading) return;

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
    console.error("Error generando Excel con SheetJS:", error);
    toast.error("Ocurrió un error inesperado al armar el archivo Excel: " + error.message);
  } finally {
    setLoading(false);
  }
};


// Nuevo estado para controlar el modal de horarios masivos
const [mostrarModalHoras, setMostrarModalHoras] = useState(false);
const [valoresMasivos, setValoresMasivos] = useState({
  h_inicio_jn: '',
  h_almuerzo: '',
  h_inicio_fn: '', // <-- Agregar aquí
  h_inicio_ext: '',
  h_fin_ext: ''
});

const ejecutarCambioHorasMasivo = async (e) => {
  e.preventDefault();
  if (datos.length === 0) return toast.warning("No hay registros en la tabla para actualizar.");

  // 1. Identificar estrictamente cuál campo tiene información cargada
  let campoSeleccionado = null;
  let horaValor = null;

  for (const [key, value] of Object.entries(valoresMasivos)) {
    if (value && value.trim() !== '') {
      campoSeleccionado = key;
      horaValor = value;
      break; // Rompemos al encontrar el primero (un campo a la vez)
    }
  }

  // Si todos están vacíos, frenamos la ejecución
  if (!campoSeleccionado || !horaValor) {
    return toast.warning("Por favor, ingresa un horario en el campo que deseas actualizar.");
  }

  // 2. Validar si algún registro está bloqueado antes de proceder
  const algunBloqueado = datos.some(item => estaBloqueado(item.fecha_dia));
  if (algunBloqueado) {
    if (!window.confirm("Algunos registros pertenecen a un periodo CERRADO. ¿Deseas actualizar el resto?")) {
      return;
    }
  }

  const limpiarHoraFrontend = (val) => {
    if (!val || val.trim() === '') return null;
    return val.substring(0, 5);
  };

  const horaLimpia = limpiarHoraFrontend(horaValor);

  // 3. Payload adaptado para enviar únicamente el identificador y el valor del campo editado
  const payloadHoras = {
    campo: campoSeleccionado, // Ej: "h_inicio_jn"
    hora: horaLimpia          // Ej: "06:30"
  };

  setMostrarModalHoras(false);

  try {
    setLoading(true);
    const listaIds = datos.map(item => item.id);

    // 4. ACTUALIZACIÓN OPTIMISTA: Modifica en caliente localmente SOLO la celda alterada
    setDatos(prev => prev.map(item => {
      if (estaBloqueado(item.fecha_dia)) return item; 

      return {
        ...item,
        [campoSeleccionado]: horaLimpia, // Inyección dinámica en el estado de la tabla
        usuario_modif: user.id
      };
    }));

    // 5. PETICIÓN HTTP A LA API MIGRADA (Envío en formato dinámico)
    try {
      await fetchWithFallback('/api/RRHH/horario_masivo_extras', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: listaIds,
          usuario_modif: user.id,
          ...payloadHoras // Adjunta 'campo' y 'hora' al cuerpo de la petición
        })
      });

      toast.success("¡Horario actualizado en lote correctamente!");
      
      // Limpiar el estado del modal tras el éxito para futuras aperturas
      setValoresMasivos({ h_inicio_jn: '', h_almuerzo: '', h_inicio_fn: '', h_inicio_ext: '', h_fin_ext: '' });

    } catch (fetchError) {
      const errorMsg = fetchError.message ? fetchError.message.toLowerCase() : '';
      if (fetchError.name === 'DOMException' || errorMsg.includes('timeout') || errorMsg.includes('deadlock')) {
        console.warn("⚠️ Operación en cola en segundo plano en el servidor.");
        toast.info("Actualización en cola. Los cambios ya se reflejan en pantalla.");
      } else {
        throw fetchError;
      }
    }

    // Refrescamos la tabla para sincronizar los cálculos finales
    fetchDatos(); 

  } catch (error) {
    console.error("❌ Error detallado en proceso masivo:", error);
    toast.error("Error en el proceso masivo: " + error.message);
  } finally {
    setLoading(false);
  }
};


// Resetear tabla cuando cambien los filtros principales
useEffect(() => {
    setDatos([]); // Limpia la tabla
    // Opcional: puedes limpiar también la búsqueda local si quieres un reset total
    // setBusquedaLocal(''); 
}, [empresa, departamento]); 

useEffect(() => {
    fetchWithFallback('/api/RRHH/periodo_cierre')
        .then(res => {
            const data = res.data ? res.data : res;
            // Guardamos el array completo (si es un objeto único, lo envolvemos en array)
            setPeriodoCierre(Array.isArray(data) ? data : [data]);
        })
        .catch(err => console.error("Error al cargar periodos:", err));
}, []);

 const fetchPeriodos = () => {
        fetchWithFallback('/api/RRHH/periodo_cierre')
            .then(res => {
                const data = res.data ? res.data : res;
                setPeriodoCierre(Array.isArray(data) ? data : [data]);
            })
            .catch(err => console.error("Error al cargar periodos:", err));
    };

     // 3. useEffect para la carga inicial
    useEffect(() => {
        fetchPeriodos();
    }, []);

  useEffect(() => {
     fetchWithFallback('/api/DARTIS/lista_empleados')
         .then(res => {
             // Si res es un objeto de Axios, los datos están en res.data
             // y el código de estado en res.status
             if (res.data) {
                 setListaEmpleados(res.data);
             } else {
                 // Si es el fetch nativo pero modificado, intenta manejarlo como objeto
                 setListaEmpleados(res);
             }
         })
         .catch(err => {
             // Aquí capturas si la red falló o el servidor tiró error
             console.error("Error cargando empleados:", err);
         });
 }, []);

   

    // Estados para el modal
const [showModal, setShowModal] = useState(false);
const [registroAClonar, setRegistroAClonar] = useState(null);
const [nuevaFechaClon, setNuevaFechaClon] = useState(new Date().toISOString().split('T')[0]);

const handleClonar = async () => { 
 // 1. Verificación básica de selección 
 if (!registroAClonar || !empleadoSeleccionadoId) { 
 return toast.warning("Por favor, selecciona un empleado de la lista."); 
 } 
  // 2. Buscamos al empleado usando '==' por si uno es String y el otro Number 
 const nuevoEmpleado = listaEmpleados.find(e => e.nombre == empleadoSeleccionadoId); 
  // 3. Validamos que el empleado realmente exista en la lista cargada 
 if (!nuevoEmpleado) { 
 return toast.warning("No se encontraron los datos del empleado seleccionado. Intenta recargar la página."); 
 } 
  // --- NUEVA LÓGICA ANTI-DUPLICADOS --- 
 const existe = datos.some(reg => 
 reg.codigo_emp_dar === nuevoEmpleado.codemp && 
 reg.fecha_dia.startsWith(nuevaFechaClon) 
 ); 
  // 4. Construimos el objeto de forma segura incluyendo el SUELDO actualizado
 const nuevoRegistro = { 
 ...registroAClonar, 
 cedula: nuevoEmpleado.identificacion, 
 nombres: nuevoEmpleado.nombre, 
 codigo_emp_dar: nuevoEmpleado.codemp, 
 departamento: nuevoEmpleado.departamento, 
 fecha_dia: nuevaFechaClon, 
 // ASIGNACIÓN DEL SUELDO: Extraemos el sueldo real del nuevo empleado de Dartis
 sueldo: nuevoEmpleado.sueldo ? parseFloat(nuevoEmpleado.sueldo) : 0,
 usuario_trans: user.id, 
 id: undefined 
 }; 
 
 console.log("Datos a enviar con sueldo actualizado:", nuevoRegistro); 
 
 try { 
 setLoading(true); 
 await fetchWithFallback('/api/RRHH/asistencia_comedor_extras', { 
 method: 'POST', 
 headers: { 'Content-Type': 'application/json' }, 
 body: JSON.stringify(nuevoRegistro) 
 }); 
 
 toast.success(`Registro clonado con éxito para ${nuevoEmpleado.nombre}`); 
 setShowModal(false); 
 fetchDatos(); // Esto refrescará la tabla y recalculará los valores en pantalla
 } catch (error) { 
 toast.error("Error al clonar: " + error.message); 
 } finally { 
 setLoading(false); 
 } 
};

    
   useEffect(() => {
    fetchWithFallback('/api/DARTIS/area_dartis')
        .then(res => {
            // Si res es un objeto de Axios, los datos están en res.data
            // y el código de estado en res.status
            if (res.data) {
                setListaDepartamentos(res.data);
            } else {
                // Si es el fetch nativo pero modificado, intenta manejarlo como objeto
                setListaDepartamentos(res);
            }
        })
        .catch(err => {
            // Aquí capturas si la red falló o el servidor tiró error
            console.error("Error cargando departamentos:", err);
        });
}, []);


// Convierte una string "HH:MM" a minutos totales (ej: "01:30" -> 90)
const horaAMinutos = (horaStr) => {
  if (!horaStr || !horaStr.includes(':') || horaStr.length < 5) return 0;
  const [horas, minutos] = horaStr.split(':').map(Number);
  return (horas * 60) + minutos;
};

// Convierte minutos totales de regreso a string "HH:MM" (ej: 480 -> "08:00")
const minutosAHora = (minutosTotales) => {
  if (minutosTotales <= 0 || isNaN(minutosTotales)) return '00:00';
  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
};

// Función centralizada que calcula la jornada en base a 3 valores string
const calcularJornadaEnCaliente = (inicio, fin, almuerzo) => {
  const minInicio = horaAMinutos(inicio);
  const minFin = horaAMinutos(fin);
  const minAlmuerzo = horaAMinutos(almuerzo);

  if (minInicio === 0 && minFin === 0) return '00:00';

  // Fórmula: Fin - Inicio
  let diferenciaMinutos = minFin - minInicio;
  // Soporte para jornadas nocturnas / amanecidas (cruza las 00:00)
  if (diferenciaMinutos < 0) diferenciaMinutos += 1440; 

  // Restamos el almuerzo
  const minutosTotales = diferenciaMinutos - minAlmuerzo;
  return minutosAHora(minutosTotales);
};

    // 4. Fetch principal con Fallback
const fetchDatos = async () => { 
  // --- Refresca los periodos de cierre al consultar --- 
  fetchPeriodos(); 
  setLoading(true); 
 
  const endpointComedor = `/api/RRHH/asistencia_comedor_extras?inicio=${inicio}T00:00:00&fin=${fin}T23:59:59&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`; 
  const endpointTimbres = `/api/REPORTES/timbres?inicio=${inicio}T00:00:00&fin=${fin}T00:00:00`; 
 
  try { 
    // 1. Traemos los datos de ambas fuentes simultáneamente
    const [resComedor, resTimbres] = await Promise.all([ 
      fetchWithFallback(endpointComedor), 
      fetchWithFallback(endpointTimbres) 
    ]); 
 
    const datosComedor = resComedor || []; 
    const datosTimbres = resTimbres || []; 
 
    const formatearHoraBaseDatos = (horaStr) => { 
      if (!horaStr || horaStr === '') return ''; 
      if (typeof horaStr === 'string' && horaStr.includes(':')) { 
        return horaStr.substring(0, 5); 
      } 
      return horaStr; 
    }; 
 
    // Array para almacenar las peticiones de actualización automática a la DB
    const promesasActualizacionSueldo = [];
 
    // 2. Cruzamos la información en el frontend
    const datosCruzados = datosComedor.map(registroComedor => { 

        // Extraemos solo la parte YYYY-MM-DD de la fila actual
  const fechaFila = registroComedor.fecha_dia.substring(0, 10);

  const timbreCorrespondiente = datosTimbres.find(t => 
    String(t.emp_code) === String(registroComedor.codigo_emp_dar) &&
    (t.fecha_dia || t.fecha || '').startsWith(fechaFila) 
  );
      // CORREGIDO: Buscamos usando .codemp de la DB externa
      const empleadoDartis = listaEmpleados.find(e => 
        String(e.codemp) === String(registroComedor.codigo_emp_dar) 
      ); 
      
      const sueldoEmpleado = empleadoDartis ? parseFloat(empleadoDartis.sueldo) : 0; 
 
      // --- DETECCIÓN AUTOMÁTICA DE SINCRONIZACIÓN ---
      // Si el sueldo en tu DB local es diferente al de DARTIS, programamos la actualización
    // Dentro de datosComedor.map(registroComedor => { ...
          if (sueldoEmpleado > 0 && parseFloat(registroComedor.sueldo) !== sueldoEmpleado) { 
          // Pasamos 'registroComedor' al final para que handleUpdate lo procese sin depender de 'datos'
          promesasActualizacionSueldo.push( 
            handleUpdate(registroComedor.id, 'sueldo', sueldoEmpleado, false, registroComedor) 
          ); 
          }

      const horasRecargoNocturnasStr = obtenerHorasRecargoNocturno( 
        registroComedor.tipo_dia, 
        formatearHoraBaseDatos(registroComedor.h_inicio_jn), 
        formatearHoraBaseDatos(registroComedor.h_fin_ext)
      ); 
 
      const minutosNocturnos = horaAMinutos(horasRecargoNocturnasStr); 
      const horasNocturnasDecimal = minutosNocturnos / 60; 
      const valorRecargoNocturno = (sueldoEmpleado / 240) * 0.25 * horasNocturnasDecimal; 
 
      return { 
        ...registroComedor, 
        h_inicio_jn: formatearHoraBaseDatos(registroComedor.h_inicio_jn), 
        h_almuerzo: formatearHoraBaseDatos(registroComedor.h_almuerzo), 
        h_inicio_fn: formatearHoraBaseDatos(registroComedor.h_inicio_fn), 
        h_inicio_ext: formatearHoraBaseDatos(registroComedor.h_inicio_ext), 
        h_fin_ext: formatearHoraBaseDatos(registroComedor.h_fin_ext), 
        h_jor_normal: formatearHoraBaseDatos(registroComedor.h_jor_normal), 
        primera_horaformat: timbreCorrespondiente ? timbreCorrespondiente.primera_horaformat : '0', 
        ultima_horaformat: timbreCorrespondiente ? timbreCorrespondiente.ultima_horaformat : '0', 
        t_total: timbreCorrespondiente ? timbreCorrespondiente.t_total : '0', 
        
        // Seteamos el sueldo fresco de DARTIS en el estado de la tabla
       // sueldo: sueldoEmpleado, 
        hrs_recargo_noct_25: horasRecargoNocturnasStr, 
        valor_horas_recargo_nocturno: isNaN(valorRecargoNocturno) ? 0 : valorRecargoNocturno 
      }; 
    }); 
 
    // 3. Pintamos los datos cruzados inmediatamente en la interfaz
    setDatos(datosCruzados); 
  
  } catch (error) { 
    console.error("Error en fetchDatos al cruzar asistencia con timbres:", error); 
    setDatos([]); 
  } finally { 
    setLoading(false); 
  } 
};


// 1. Declarar el estado arriba en tu componente junto a los demás useState
// Agregamos un 4to parámetro opcional: registroFresco
const handleUpdate = async (id, campo, valor, debeNotificar = false, registroFresco = null) => { 
 // 1. Si nos pasan el registro fresco lo usamos, si no, lo buscamos en el estado local
 const itemActual = registroFresco || datos.find(d => d.id === id); 
 
 // Si por alguna razón sigue sin existir el registro, frenamos para evitar el crash
 if (!itemActual) {
   console.warn(`No se encontró el registro con ID ${id} para actualizar el campo ${campo}`);
   return;
 }

 // RESTRICCIÓN: Periodo cerrado 
 if (estaBloqueado(itemActual.fecha_dia)) { 
   if (debeNotificar) toast.warning("Este registro pertenece a un periodo CERRADO y no puede ser modificado."); 
   return; 
 } 
 
 // Función interna para asegurar que la hora vaya en formato limpio "HH:MM" o null 
 const limpiarHora = (val) => { 
   if (!val || val === '' || val === undefined) return null; 
   return typeof val === 'string' ? val.substring(0, 5) : null; 
 }; 
 
 let valorSanitizado = valor; 
 if (campo === 'horas_extras' || campo === 'sueldo') { 
   valorSanitizado = parseFloat(valor) || 0; 
 } else if (['h_inicio_jn', 'h_almuerzo', 'h_inicio_fn', 'h_inicio_ext', 'h_fin_ext', 'h_jor_normal'].includes(campo)) { 
   valorSanitizado = limpiarHora(valor); 
 } else if (valor === '' || valor === undefined) { 
   valorSanitizado = null; 
 } 

 // 2. Construimos el cuerpo consolidado
 const bodyActualizado = { 
   horas_extras: campo === 'horas_extras' ? valorSanitizado : (parseFloat(itemActual.horas_extras) || 0), 
   tipo_dia: campo === 'tipo_dia' ? valorSanitizado : (itemActual.tipo_dia || 'NORMAL'), 
   sueldo: campo === 'sueldo' ? parseFloat(valor) : (parseFloat(itemActual.sueldo) || 0), 
   h_inicio_jn: campo === 'h_inicio_jn' ? valorSanitizado : limpiarHora(itemActual.h_inicio_jn), 
   h_almuerzo: campo === 'h_almuerzo' ? valorSanitizado : limpiarHora(itemActual.h_almuerzo), 
   h_inicio_fn: campo === 'h_inicio_fn' ? valorSanitizado : limpiarHora(itemActual.h_inicio_fn), 
   h_inicio_ext: campo === 'h_inicio_ext' ? valorSanitizado : limpiarHora(itemActual.h_inicio_ext), 
   h_fin_ext: campo === 'h_fin_ext' ? valorSanitizado : limpiarHora(itemActual.h_fin_ext), 
   h_jor_normal: campo === 'h_jor_normal' ? valorSanitizado : limpiarHora(itemActual.h_jor_normal), 
   usuario_modif: user.id 
 }; 
 
 try { 
   await fetchWithFallback(`/api/RRHH/asistencia_comedor_hext/${id}`, { 
     method: 'PUT', 
     headers: { 'Content-Type': 'application/json' }, 
     body: JSON.stringify(bodyActualizado) 
   }); 
 
   // Sincronizamos el estado de React localmente de forma segura
   setDatos(prev => prev.map(d => (d.id === id ? { ...d, ...bodyActualizado } : d))); 
 
   if (debeNotificar) { 
     const key = `${id}-${campo}`; 
     setCamposGuardados(prev => ({ ...prev, [key]: true })); 
     setTimeout(() => { 
       setCamposGuardados(prev => ({ ...prev, [key]: false })); 
     }, 3000); 
   } 
 
   if (campo === 'tipo_dia' && debeNotificar) { 
     toast.success("Tipo de día actualizado en la base de datos"); 
   } else if (debeNotificar) { 
     const camposTiempo = ['h_inicio_jn', 'h_almuerzo', 'h_inicio_fn', 'h_inicio_ext', 'h_fin_ext', 'h_jor_normal']; 
     if (camposTiempo.includes(campo)) { 
       toast.success("Horario actualizado correctamente"); 
     } 
   } 
 } catch (error) { 
   console.error("Error en handleUpdate:", error);
 } 
};

    const handleUpdateEstado = async (id, nuevoEstado) => {
        console.log("ID recibido:", id); // Si sale undefined, aquí está el problema
         console.log("ID usr:",  user.id); // Si sale undefined, aquí está el problema
        console.log("URL:", `${API_BASE_URL}/api/RRHH/updateestado_extras/${id}`);
    
    try {
        setLoading(true);
        
        // 1. Llamamos a la función sin asignar a 'response'
        await fetchWithFallback(`/api/RRHH/updateestado_extras/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                estado: nuevoEstado, 
                usuario_modif_estado: user.id 
            })
        });

        setDatos(datos.map(item => 
            item.id === id ? { 
                ...item, 
                estado: nuevoEstado, 
                usuario_modif_estado: user.id 
            } : item
        ));
        toast.success("Estado actualizado correctamente");

    } catch (error) {
        // 3. Si falla (en cualquiera de las APIs), cae aquí directamente.
        toast.error("Error: " + error.message);
    } finally {
        setLoading(false);
    }
};

const handleCopiarTodo = async () => {
    // 1. Limpiamos los valores de los filtros (por si traen espacios o son arrays)
    const idSucursalFinal = String(empresa || '').trim();
    const deptoFinal = String(departamento || '').trim();

    // 2. Validación Robusta: Si el ID es vacío, nulo o "0"
    if (!idSucursalFinal || idSucursalFinal === '0') {
        console.warn("Validación fallida - Sucursal actual:", idSucursalFinal);
        return toast.error("❌ Por favor, seleccione una empresa válida de la lista.");
    }

    if (!deptoFinal) {
        return toast.error("❌ Por favor, seleccione un departamento.");
    }

    try {
        setLoading(true);
        const urlAzure = `/api/RRHH/emp_asis_dartis?departamento=${encodeURIComponent(deptoFinal)}&idSucursal=${idSucursalFinal}`;
        const resAzure = await fetchWithFallback(urlAzure);
        
        const empleadosObtenidos = resAzure.data || resAzure;

        // 4. Verificar si la respuesta trajo gente
        if (!Array.isArray(empleadosObtenidos) || empleadosObtenidos.length === 0) {
            toast.info(`No se encontró personal activo en ${deptoFinal} para la sucursal ${idSucursalFinal}`);
            return;
        }

       // 5. Preparar guardado masivo (Fecha limpia sin horas) y forzar tipo_dia a 'NORMAL'
            const fechaLimpia = inicio.split('T')[0];
            const payload = { 
            empleados: empleadosObtenidos, 
            fecha_dia: fechaLimpia, 
            tipo_dia: 'NORMAL', // <--- Agrega esta línea para establecer el tipo de día por defecto
            usuario_trans: user.id 
            }; 

        // 6. Enviar a la API de guardado
        const resGuardado = await fetchWithFallback('/api/RRHH/asistencia_comedor_masiva_extras', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
      fetchDatos(); // Esto refrescará la tabla y recalculará los valores en pantalla
        // 7. Éxito y actualización local
        toast.success(`✅ Se copiaron ${empleadosObtenidos.length} registros con éxito.`);
        setDatos(empleadosObtenidos);

    } catch (error) {
        console.error("Error en handleCopiarTodo:", error);
        
        // Manejo de duplicados (Error 409)
        if (error.response?.status === 409 || error.status === 409) {
            toast.error("❌ Ya existen registros para estos filtros en esta fecha.");
        } else {
            toast.error("❌ Error al procesar, ya existen registros para ese filtro: " + (error.message || "Error de red"));
        }
    } finally {
        setLoading(false);
    }
};


const handleCopiarTodoDartis = async () => {
    // 1. Limpiamos los valores de los filtros (por si traen espacios o son arrays)
    const idSucursalFinal = String(empresa || '').trim();
    const deptoFinal = String(departamento || '').trim();

    // 2. Validación Robusta: Si el ID es vacío, nulo o "0"
    if (!idSucursalFinal || idSucursalFinal === '0') {
        console.warn("Validación fallida - Sucursal actual:", idSucursalFinal);
        return toast.error("❌ Por favor, seleccione una empresa válida de la lista.");
    }

    if (!deptoFinal) {
        return toast.error("❌ Por favor, seleccione un departamento.");
    }

    try {
        setLoading(true);
        const fechaParaURL = String(inicio).split('T')[0]; 
       
        const urlAzure = `/api/RRHH/emp_asis_extras_dartis?departamento=${encodeURIComponent(deptoFinal)}&idSucursal=${idSucursalFinal}&fecha=${fechaParaURL}`;

        const resAzure = await fetchWithFallback(urlAzure);
        
        const empleadosObtenidos = resAzure.data || resAzure;

        // 4. Verificar si la respuesta trajo gente
        if (!Array.isArray(empleadosObtenidos) || empleadosObtenidos.length === 0) {
            toast.info(`No se encontró personal activo en ${deptoFinal} para la sucursal ${idSucursalFinal}`);
            return;
        }

        // 5. Mapeo y auditoría de propiedades de horas
        const fechaLimpia = inicio.split('T')[0];
        
        const empleadosMapeados = empleadosObtenidos.map((emp, index) => {
            // Imprime en la consola el primer empleado para auditar cómo se llaman sus propiedades reales
            if (index === 0) {
                console.log("👉 ESTRUCTURA REAL DEL EMPLEADO QUE TRAE AZURE:", emp);
            }

            return {
                ...emp,
                // Mapeo seguro: intentamos leer el nombre esperado por tu backend o sus variantes comunes
                horaInicio: emp.horaInicio || emp.h_inicio_jn || emp.hora_inicio || null, 
                tiemalmz: emp.tiemalmz || emp.h_almuerzo || emp.almuerzo || null, 
                horaFin: emp.horaFin || emp.h_inicio_fn || emp.hora_fin || null,
                horasextrasinicio: emp.horasextrasinicio || emp.h_inicio_ext || emp.horas_extras_inicio || null,
                horasextrasfin: emp.horasextrasfin || emp.h_fin_ext || emp.horas_extras_fin || null
            };
        });

        // CORRECCIÓN: Se eliminó tipo_dia: 'NORMAL' de aquí para que no sobrescriba la información individual
        const payload = { 
            empleados: empleadosMapeados, 
            fecha_dia: fechaLimpia, 
            usuario_trans: user.id 
        }; 

        // 6. Enviar a la API de guardado
        const resGuardado = await fetchWithFallback('/api/RRHH/asistencia_comedor_masiva_extras_dartis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 7. Éxito y actualización local
        toast.success(`✅ Se copiaron ${empleadosObtenidos.length} registros con éxito.`);
        setDatos(empleadosMapeados);

    } catch (error) {
        console.error("Error en handleCopiarTodo:", error);
        
        // Manejo de duplicados (Error 409)
        if (error.response?.status === 409 || error.status === 409) {
            toast.error("❌ Ya existen registros para estos filtros en esta fecha.");
        } else {
            toast.error("❌ Error al procesar, ya existen registros para ese filtro: " + (error.message || "Error de red"));
        }
    } finally {
        setLoading(false);
    }
};


    // Nuevo estado para la fecha de réplica
const [fechaReplica, setFechaReplica] = useState(new Date().toISOString().split('T')[0]);

const replicarDatos = async () => {
    if (datos.length === 0) return toast.warning("No hay datos para replicar");
    if (!empresa || !departamento) return toast.warning("Por favor, selecciona Empresa y Departamento antes de replicar.");

        
       try {
    setLoading(true);
  
const fechaFormateada = new Date(fechaReplica).toISOString().split('T')[0];
    // 1. VALIDACIÓN: fetchWithFallback ya debería retornar la data procesada
    // Nota: Asegúrate de usar backticks (``) para las variables en el string
    const existentes = await fetchWithFallback(
        `/api/RRHH/asistencia_comedor_extras?inicio=${fechaFormateada}&fin=${fechaFormateada}&empresa=${encodeURIComponent(empresa)}&departamento=${encodeURIComponent(departamento)}`
    );

    if (existentes && existentes.length > 0) {
        setLoading(false);
        return toast.warning(`Ya existen ${existentes.length} registros para esta fecha y filtros.`);
    }

    // 2. CONFIRMACIÓN
    if (!window.confirm(`¿Replicar ${datos.length} registros para el ${fechaReplica}?`)) {
        setLoading(false);
        return;
    }

    // 3. EJECUCIÓN: Usamos fetch normal para los POST o si fetchWithFallback admite POST, úsalo
   // 3. EJECUCIÓN DE RÉPLICA
const promesas = datos.map(async (item) => { // Agregamos async
    const { id, ...resto } = item; // Extraemos el id para ignorarlo
    
    const nuevoRegistro = {
        ...resto,
        fecha_dia: fechaFormateada,
        usuario_trans: user.id
    };

    // DEBES retornar el fetch para que Promise.all pueda rastrearlo
    return fetchWithFallback('/api/RRHH/asistencia_comedor_extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoRegistro)
    });
});

// Ahora sí, esperamos a que todas terminen

    const respuestas = await Promise.all(promesas);

        
    // Validar si todos los registros se guardaron (status 200-299)
    const todosOk = respuestas.every(res => res.ok);

    if (todosOk) {
        toast.success("Réplica completada con éxito");
        setInicio(fechaReplica);
        setFin(fechaReplica);
        fetchDatos(); 
    } else {
        toast.success("La réplica terminó.");
    }

} catch (error) {
    console.error("Error en réplica:", error);
    toast.error("Error de conexión o en el servidor.");
} finally {
    setLoading(false);
}

};


const datosFiltrados = datos.filter(item => {
    const termino = busquedaLocal.toLowerCase();

    return (
        item.nombres?.toLowerCase().includes(termino) || 
        item.cedula?.toString().includes(termino) ||
        item.departamento?.toLowerCase().includes(termino) ||
        item.ruta?.toString().includes(termino) ||
        item.parada?.toString().includes(termino) ||
        item.pasaje?.toLowerCase().includes(termino)
        // Ahora buscará correctamente sobre el sueldo cruzado del backend
       
    );
});


  return (  
  
                    <div style={styles.pageBackground}>
                        <div style={styles.container}>
                            {/* HEADER: Identidad y Resumen */}
                          
                                <div>
                                    <h3 style={styles.title}> Horas Extras</h3>

                                </div>

                            {/* PANEL PRINCIPAL DE FILTROS */}
                            <div style={styles.card}>
                                    
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '1px' }}>
                        
                        {/* SECCIÓN 1: FILTROS Y BÚSQUEDA */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '15px',
                            backgroundColor: '#fff',
                            padding: '1px',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                          
                
                  
{/* {/* CONTENEDOR DE FILTROS Y ACCIONES ULTRA COMPACTO */} 
<div style={{ 
  display: 'flex', 
  flexDirection: 'row', 
  flexWrap: 'nowrap', 
  alignItems: 'flex-end', 
  justifyContent: 'space-between', 
  gap: '6px', 
  backgroundColor: '#fff',
  padding: '3px 4px', 
  borderRadius: '8px', 
 
  width: '100%'
}}> 
 
  {/* 1. FECHA DESDE */} 
  <div style={{ ...styles.inputGroup, flex: '0 1 100px', margin: 0 }}> 
    <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>📅 Desde:</label> 
    <input 
      type="date" 
      style={{ ...styles.input, width: '100%', height: '30px', fontSize: '11px', padding: '2px 4px' }} 
      value={inicio} 
      onChange={(e) => setInicio(e.target.value)} 
    /> 
  </div> 
 
  {/* 2. FECHA HASTA */} 
  <div style={{ ...styles.inputGroup, flex: '0 1 100px', margin: 0 }}> 
    <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>📅 Hasta:</label> 
    <input 
      type="date" 
      style={{ ...styles.input, width: '100%', height: '30px', fontSize: '11px', padding: '2px 4px' }} 
      value={fin} 
      onChange={(e) => setFin(e.target.value)} 
    /> 
  </div> 
 
  {/* 3. FILTRO EMPRESA */} 
  <div style={{ ...styles.inputGroup, flex: '1 1 140px', margin: 0 }}> 
    <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>🏢 Empresa:</label> 
    <select 
      style={{ ...styles.input, width: '100%', height: '30px', fontSize: '11px', padding: '2px 4px' }} 
      value={empresa} 
      onChange={(e) => setEmpresa(e.target.value)} 
    > 
      <option value="">Todas las empresas</option> 
      {[ 
        { id: "5", nombre: "EXPOFLOR CIA. LTDA." }, 
        { id: "4", nombre: "AMAZINGROSES CIA LTDA" }, 
        { id: "10", nombre: "CAJA DE AHORROS BELLA FLOR" }, 
        { id: "3", nombre: "HIDDENGARDEN CIA LTDA" }, 
        { id: "12", nombre: "OASISFLOWER SAS" }, 
        { id: "13", nombre: "OASISORGANICS SAS" } 
      ] 
      .filter(opt => user.empresasAutorizadas.length === 0 || user.empresasAutorizadas.includes(opt.id)) 
      .map(opt => ( 
        <option key={opt.id} value={opt.id}>{opt.nombre}</option> 
      ))} 
    </select> 
  </div>

  {/* 4. FILTRO DEPARTAMENTO */} 
  <div style={{ ...styles.inputGroup, flex: '1 1 130px', margin: 0 }}> 
    <label style={{ ...styles.label, marginBottom: '2px', fontSize: '11px', whiteSpace: 'nowrap', display: 'block' }}>📂 Depto:</label> 
    <select 
      style={{ ...styles.input, width: '100%', height: '30px', fontSize: '11px', padding: '2px 4px' }} 
      value={departamento} 
      onChange={(e) => setDepartamento(e.target.value)} 
    > 
      <option value="">Todos los departamentos</option> 
      {listaDepartamentos 
      .filter(dep => { 
        const nombreDep = dep.nombre || dep.departamento; 
        return user.deptosAutorizados.length === 0 || user.deptosAutorizados.includes(nombreDep); 
      }) 
      .map((dep, index) => ( 
        <option key={index} value={dep.nombre || dep.departamento}> 
          {dep.nombre || dep.departamento} 
        </option> 
      )) 
      } 
    </select> 
  </div> 

  {/* 5. BOTÓN CONSULTAR */} 
  <button 
    onClick={fetchDatos} 
    className="btn shadow-sm px-2 fw-bold text-white d-inline-flex align-items-center justify-content-center" 
    disabled={loading} 
    style={{ 
      height: '30px', 
      minWidth: '70px', 
      backgroundColor: '#92b91c', 
      borderColor: '#c2f133ff',
      opacity: loading ? 0.7 : 1,
      fontSize: '11px',
      margin: 0
    }} 
    aria-label={loading ? 'Cargando datos' : 'Buscar'} 
  > 
    {loading ? ( 
      <span className="spinner-border spinner-border-sm" role="status"></span> 
    ) : ( 
      <>🔍 Buscar</> 
    )} 
  </button> 

  {/* 🔍 BÚSQUEDA DIRECTA INTEGRADA EN LA LÍNEA */} 
  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 150px', margin: 0 }}> 
    <label className="fw-bolder mb-0 text-muted" style={{ fontSize: '11px', marginBottom: '2px', whiteSpace: 'nowrap' }}>🔍 Búsqueda:</label> 
    <div className="position-relative" style={{ width: '100%' }}> 
      <input 
        type="text" 
        className="form-control shadow-sm border-secondary-subtle py-0" 
        placeholder="Nombre, cédula o apellido..." 
        value={busquedaLocal} 
        onChange={(e) => setBusquedaLocal(e.target.value)} 
        style={{ paddingRight: '22px', height: '30px', fontSize: '11px', borderRadius: '4px' }} 
      /> 
      {busquedaLocal && ( 
        <button 
          type="button" 
          onClick={() => setBusquedaLocal('')} 
          className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted p-0 pe-1.5" 
          style={{ zIndex: 5, border: 'none', background: 'transparent', fontSize: '11px' }} 
        > 
          ✕ 
        </button> 
      )} 
    </div> 
  </div>


  {/* 🔢 CONTADOR DE REGISTROS COMPACTO */} 
  <div style={{ display: 'flex', flexDirection: 'column', flex: '0 1 85px', margin: 0 }}> 
    <label className="fw-bolder text-muted" style={{ fontSize: '11px', marginBottom: '2px', whiteSpace: 'nowrap' }}>📊 Info:</label> 
    <div className="bg-light rounded border border-secondary-subtle d-flex align-items-center justify-content-between px-2" style={{ height: '30px', width: '100%' }}> 
      <small className="fw-bolder text-muted m-0" style={{ fontSize: '9px', letterSpacing: '0.2px' }}>Reg:</small> 
      <span className="fw-bold text-dark" style={{ fontSize: '11px' }}>{datos.length}</span> 
    </div> 
  </div> 

  {/* BOTONES DE ACCIÓN HORIZONTALES Y SEGUIDOS */} 
  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '4px', flexWrap: 'nowrap', margin: 0 }}> 
    
    {/* TIPO DIA */} 
    <button 
      type="button" 
      onClick={() => { 
        if (datos.length === 0) return toast.warning("No hay registros cargados"); 
        setMostrarModal(true); 
      }} 
      disabled={loading} 
      className="btn btn-outline-success shadow-sm px-2 fw-bold d-inline-flex align-items-center justify-content-center" 
      style={{ height: '30px', minWidth: '70px', fontSize: '11px', margin: 0 }} 
    > 
      📅 TIPO DIA 
    </button> 
 
    {/* HORARIOS */} 
    <button 
      type="button" 
      onClick={() => { 
        if (datos.length === 0) return toast.warning("No hay registros cargados"); 
        setMostrarModalHoras(true); 
      }} 
      disabled={loading} 
      className="btn btn-outline-primary shadow-sm px-2 fw-bold d-inline-flex align-items-center justify-content-center" 
      style={{ height: '30px', minWidth: '75px', fontSize: '11px', margin: 0 }} 
    > 
      🕒 HORARIOS 
    </button> 
 
    {/* INGRESAR HORAS */} 
    <button 
      type="button" 
      onClick={handleCopiarTodo} 
      disabled={loading} 
      className="btn btn-warning shadow-sm px-2 fw-bold d-inline-flex align-items-center justify-content-center" 
      style={{ height: '30px', minWidth: '105px', fontSize: '11px', margin: 0 }} 
    > 
      ✍️ {loading ? "..." : "Ing. Horas de "}{inicio}  
    </button>

    {/* EXCEL */} 
    <button 
      type="button" 
      onClick={exportarExcel} 
      disabled={loading || datos.length === 0} 
      className="btn btn-outline-success shadow-sm px-2 fw-bold d-inline-flex align-items-center justify-content-center" 
      style={{ height: '30px', minWidth: '60px', fontSize: '11px', margin: 0 }} 
    > 
      📊 EXCEL 
    </button> 
 
    {/* PDF */} 
    <button 
      type="button" 
      onClick={() => { 
        console.log("Hiciste clic en el botón PDF"); 
        exportarPDF(); 
      }} 
      disabled={datos.length === 0} 
      className="btn btn-outline-danger shadow-sm px-2 fw-bold d-inline-flex align-items-center justify-content-center" 
      style={{ height: '30px', minWidth: '55px', fontSize: '11px', margin: 0 }} 
    > 
     PDF 
    </button> 
 
    {/* HRS EXT POST DARTS */} 
    <button 
      type="button" 
      onClick={handleCopiarTodoDartis} 
      disabled={loading} 
      className="btn btn-primary shadow-sm px-2 fw-bold text-white d-inline-flex align-items-center justify-content-center" 
      style={{ height: '30px', minWidth: '115px', fontSize: '11px', backgroundColor: '#ff307fff', borderColor: '#ff307fff', margin: 0 }} 
    > 
      🚀 {loading ? "..." : "Dartis Horas Postco"} 
    </button> 
 
  </div> 

    {/* MODAL CONTROLADO POR REACT */}
    {mostrarModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-sm">
                <div className="modal-content shadow-lg border-0">
                    <div className="modal-header bg-light">
                        <h6 className="modal-title fw-bold text-secondary m-0">Selecciona el Tipo de Día</h6>
                        <button type="button" className="btn-close" onClick={() => setMostrarModal(false)}></button>
                    </div>
                    <div className="modal-body d-flex flex-column gap-2 p-3">
                        <p className="text-muted small text-center mb-2">
                            Se actualizarán <strong>{datos.length}</strong> registros en total.
                        </p>
                        
                        <button 
                            className="btn btn-outline-primary fw-bold py-2 text-start"
                            onClick={() => ejecutarCambioMasivo('NORMAL')}
                        >
                            🔄 Cambiar a NORMAL
                        </button>
                        
                        <button 
                            className="btn btn-outline-danger fw-bold py-2 text-start"
                            onClick={() => ejecutarCambioMasivo('FERIADO')}
                        >
                            📅 Cambiar a FERIADO
                        </button>
                        
                        <button 
                            className="btn btn-outline-success fw-bold py-2 text-start"
                            onClick={() => ejecutarCambioMasivo('FIN DE SEMANA')}
                        >
                            ✨ Cambiar a FIN DE SEMANA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )}



{/* MODAL DE HORARIOS MASIVOS */}
{mostrarModalHoras && (() => {
  // 🌟 SOLUCIÓN ESLINT: Declaramos la variable internamente para que no falle el compilador
  const campoActivo = Object.keys(valoresMasivos).find(key => valoresMasivos[key] !== '') || null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-light">
            <h6 className="modal-title fw-bold text-secondary m-0">Horarios en lote ({datos.length} reg.)</h6>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => {
                setValoresMasivos({ h_inicio_jn: '', h_almuerzo: '', h_inicio_fn: '', h_inicio_ext: '', h_fin_ext: '' });
                setMostrarModalHoras(false);
              }}
            ></button>
          </div>
          <form onSubmit={ejecutarCambioHorasMasivo}>
            <div className="modal-body d-flex flex-column gap-3 p-3" style={{ fontSize: '0.9rem' }}>
              <small className="text-muted border-bottom pb-2">
                💡 <strong>Nota:</strong> Al ingresar una hora, los demás campos se bloquearán automáticamente.
              </small>
              
              {/* 1. Hr Inicio Jornada Normal */}
              <div className="form-group">
                <label className={`fw-bold mb-1 ${campoActivo && campoActivo !== 'h_inicio_jn' ? 'text-muted opacity-50' : 'text-secondary'}`}>
                  Hr Inicio Jornada Normal:
                </label>
                <input 
                  type="time" className="form-control form-control-sm"
                  value={valoresMasivos.h_inicio_jn}
                  disabled={campoActivo !== null && campoActivo !== 'h_inicio_jn'}
                  onChange={(e) => setValoresMasivos({ ...valoresMasivos, h_inicio_jn: e.target.value })}

                />
              </div>

              {/* 2. Tiempo Almuerzo/Merienda */}
              <div className="form-group">
                <label className={`fw-bold mb-1 ${campoActivo && campoActivo !== 'h_almuerzo' ? 'text-muted opacity-50' : 'text-secondary'}`}>
                  Tiempo Almuerzo/Merienda:
                </label>
                <input 
                  type="time" className="form-control form-control-sm"
                  value={valoresMasivos.h_almuerzo}
                  disabled={campoActivo !== null && campoActivo !== 'h_almuerzo'}
                  onChange={(e) => setValoresMasivos({ ...valoresMasivos, h_almuerzo: e.target.value })}

                />
              </div>

              {/* 3. Hr Fin de Jornada */}
              <div className="form-group">
                <label className={`fw-bold mb-1 ${campoActivo && campoActivo !== 'h_inicio_fn' ? 'text-muted opacity-50' : 'text-secondary'}`}>
                  Hr Fin de Jornada:
                </label>
                <input 
                  type="time" className="form-control form-control-sm"
                  value={valoresMasivos.h_inicio_fn}
                  disabled={campoActivo !== null && campoActivo !== 'h_inicio_fn'}
                  onChange={(e) => setValoresMasivos({...valoresMasivos, h_inicio_fn: e.target.value})}
                />
              </div>

              {/* 4. Hr Inicio Hr Extra */}
              <div className="form-group">
                <label className={`fw-bold mb-1 ${campoActivo && campoActivo !== 'h_inicio_ext' ? 'text-muted opacity-50' : 'text-secondary'}`}>
                  Hr Inicio Hr Extra:
                </label>
                <input 
                  type="time" className="form-control form-control-sm"
                  value={valoresMasivos.h_inicio_ext}
                  disabled={campoActivo !== null && campoActivo !== 'h_inicio_ext'}
                  
                  onChange={(e) => setValoresMasivos({ ...valoresMasivos, h_inicio_ext: e.target.value })}

                />
              </div>

              {/* 5. Hr Fin Hr Extra */}
              <div className="form-group">
                <label className={`fw-bold mb-1 ${campoActivo && campoActivo !== 'h_fin_ext' ? 'text-muted opacity-50' : 'text-secondary'}`}>
                  Hr Fin Hr Extra:
                </label>
                <input 
                  type="time" className="form-control form-control-sm"
                  value={valoresMasivos.h_fin_ext}
                  disabled={campoActivo !== null && campoActivo !== 'h_fin_ext'}
                  onChange={(e) => setValoresMasivos({ ...valoresMasivos, h_fin_ext: e.target.value })}

                />
              </div>

            </div>
            
            <div className="modal-footer bg-light p-2 d-flex justify-content-end gap-2">
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={() => {
                  setValoresMasivos({ h_inicio_jn: '', h_almuerzo: '', h_inicio_fn: '', h_inicio_ext: '', h_fin_ext: '' });
                  setMostrarModalHoras(false);
                }}
              >
                Cancelar
              </button>
              
              <button 
                type="submit" 
                className="btn btn-sm btn-success fw-bold px-3"
                disabled={campoActivo === null} // Deshabilitado si no hay una hora escrita
              >
                Aplicar a Todos
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
})()}



</div>

    
</div>

   
</div>


</div>


     
             {/* Tabla */}
                <div style={styles.tableCard}>
                    <table style={styles.table} >
              <thead>
    {/* FILA 1: CATEGORÍAS GENERALES Y BLOQUES */}
    <tr style={styles.tableHeader}>

    
       <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, width: '80px', minWidth: '80px' }}>
              <input 
              type="checkbox" 
              onChange={handleSeleccionarTodos}
              checked={datos.length > 0 && seleccionados.length === datos.length}
            />
            {" Imprime"}
        </th>

      <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, width: '80px', minWidth: '280px' }}>
            ID
        </th>
        <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, width: '280px', minWidth: '280px' }}>
            EMPLEADO / ÁREA
        </th>
        <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, width: '130px', minWidth: '130px' }}>
           FECHA / DÍA
        </th>
        <th rowSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, ...styles.mainTh, width: '100px', minWidth: '100px' }}>
            TIPO DE DÍA
        </th>
        
        {/* Bloque Marcas de Reloj */}
        <th colSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, backgroundColor: '#e8f0fe', color: '#1a73e8', textAlign: 'center', borderBottom: '2px solid #1a73e8' }}>
            MARCAJE RELOJ BIOMÉTRICO
        </th>

        {/* Bloque Jornada Normal */}
        <th colSpan={3} className="borde-grupo-inicio" style={{ ...styles.th, backgroundColor: '#e2f0d9', color: '#385723', textAlign: 'center', borderBottom: '2px solid #385723' }}>
           JORNADA NORMAL
        </th>

        {/* Bloque Horas Extras */}
        <th colSpan={2} className="borde-grupo-inicio" style={{ ...styles.th, backgroundColor: '#fff2cc', color: '#7f6000', textAlign: 'center', borderBottom: '2px solid #7f6000' }}>
         HORAS EXTRAS
        </th>

        {/* 🌟 AQUÍ ESTÁ ACCIONES INTEGRADO (Ocupa las 2 filas de alto) */}
        <th rowSpan={2} className="borde-grupo-fin" style={{ ...styles.th, backgroundColor: '#f0f0f0ff', color: '#003503ff', width: '150px', minWidth: '150px', textAlign: 'center' }}>
            ACCIONES
        </th>
    </tr>

   {/* FILA 2: SUB-ENCABEZADOS DETALLADOS Y CORTOS */}
<tr style={styles.tableHeader}>
    {/* Sub-columnas Reloj */}
    <th style={{ ...styles.th, ...styles.subTh, width: '90px', minWidth: '90px', position: 'sticky', top: '40px', zIndex: 2, borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc' }}>RELOJ IN</th>
    <th style={{ ...styles.th, ...styles.subTh, width: '90px', minWidth: '90px', position: 'sticky', top: '40px', zIndex: 2, borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc' }}>RELOJ FN</th>

    {/* Sub-columnas Jornada Normal */}
    <th style={{ ...styles.th, ...styles.subTh, width: '85px', minWidth: '85px', position: 'sticky', top: '40px', zIndex: 2, borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc' }} title="Hora de Inicio de Jornada Normal">
        IN JORND
    </th>
    <th style={{ ...styles.th, ...styles.subTh, width: '90px', minWidth: '90px', position: 'sticky', top: '40px', zIndex: 2, borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc' }} title="Tiempo de Almuerzo / Merienda">
        ALM/MRD
    </th>
    <th style={{ ...styles.th, ...styles.subTh, width: '85px', minWidth: '85px', position: 'sticky', top: '40px', zIndex: 2, borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc' }} title="Hora de Fin de Jornada Normal">
        FN JORNADA
    </th>

    {/* Sub-columnas Horas Extras */}
    <th style={{ ...styles.th, ...styles.subTh, width: '85px', minWidth: '85px', position: 'sticky', top: '40px', zIndex: 2, borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc' }} title="Hora de Inicio de Horas Extras">
        IN HR EXTRAS
    </th>
    <th style={{ ...styles.th, ...styles.subTh, width: '85px', minWidth: '85px', position: 'sticky', top: '40px', zIndex: 2, borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc' }} title="Hora de Fin de Horas Extras">
        FN HR EXTRAS
    </th>
    {/* Nota: Aquí no se pone nada para Acciones, porque el rowSpan de arriba ya cubre este espacio */}
</tr>

</thead>

                       
                       <tbody> 
    {/* Regla CSS inyectada para efectos dinámicos visuales */} 
   <style>{` 
    /* 1. Efecto base para la fila completa */
    .celda-hover { 
        transition: background-color 0.2s ease; 
        cursor: pointer; 
    } 
    
    /* 2. Cuando la fila cambie, fuerza a todas las celdas a cambiar */
    .celda-hover:hover { 
        background-color: #eaf2f8 !important; 
    } 
    .celda-hover:hover td { 
        background-color: #eaf2f8 !important; 
    }

    /* 3. ¡EL TRUCO! Hace que los inputs y selects se vuelvan transparentes 
       solo cuando el mouse está sobre la fila, revelando el color azul pastel */
    .celda-hover:hover input,
    .celda-hover:hover select { 
        background-color: transparent !important; 
    } 
`}</style>


    {datosFiltrados.map((item, index) => ( 
        <tr className="celda-hover" key={item.id} style={index % 2 === 0 ? {} : styles.trEven}> 

     <td className="borde-grupo-inicio" style={styles.td }> 
          <input 
            type="checkbox" 
            // Evaluamos con la llave compuesta
            checked={seleccionados.includes(`${item.codigo_emp_dar || item.cedula}_${String(item.fecha_dia).substring(0, 10)}`)} 
            // Pasamos el código de empleado y la fecha de la fila actual
            onChange={() => handleCheckboxChange(item.codigo_emp_dar || item.cedula, item.fecha_dia)} 
          />
        </td>

        <td className="borde-grupo-inicio" style={styles.td }> 
                <div style={{ ...styles.empName, fontWeight: '600', color: '#2c3e50' }}> 
                        {item.id} 
                    </div> 
            </td> 

            
            {/* 1. COLUMNA EMPLEADO / ÁREA */}
            <td className="borde-grupo-inicio" style={styles.td}> 
                <div style={styles.empContainer}> 
                    {/* Línea principal: Nombre del empleado */} 
                    <div style={{ ...styles.empName, fontWeight: '600', color: '#2c3e50' }}> 
                        {item.nombres} 
                    </div> 
                    {/* Línea secundaria: Departamento o Área */} 
                    {item.departamento && ( 
                        <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '2px' }}> 
                            {`${item.departamento} - ID: (${item.codigo_emp_dar || item.id})`} 
                        </div> 
                    )} 
                </div> 
            </td>


            {/* 2. COLUMNA FECHA / DÍA */} 
            <td className="borde-grupo-inicio" style={styles.td}> 
                <div style={styles.dep}> 
                    <span style={{ fontWeight: 'bold' }}>
                        {item.fecha_dia ? item.fecha_dia.split('T')[0] : 'N/A'}
                    </span>
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '2px' }}> 
                        {item.fecha_dia ? ( 
                            `${new Date(item.fecha_dia + 'T00:00:00').toLocaleDateString('es-ES', { 
                                weekday: 'long' 
                            }).replace(/^\w/, (c) => c.toUpperCase())} (${item.cedula})` 
                        ) : ( 
                            `N/A (${item.cedula})` 
                        )} 
                    </div> 
                </div> 
            </td> 

            {/* 3. COLUMNA TIPO DE DÍA (DROPDOWN) */}
            <td className="borde-grupo-inicio" style={styles.td }> 
                <select 
                    value={item.tipo_dia || "NORMAL"} 
                    onChange={(e) => handleUpdate(item.id, 'tipo_dia', e.target.value, false)} 
                    style={{...styles.selectInput, padding: '4px 6px', borderRadius: '4px'}} 
                > 
                    {TIPO_DIA_OPTIONS.map((option) => ( 
                        <option key={option.value} value={option.value}> 
                            {option.label} 
                        </option> 
                    ))} 
                </select> 
            </td> 

            {/* 4. COLUMNA BIOMÉTRICO RELOJ IN */} 
            <td className="borde-grupo-inicio" style={{ ...styles.td, textAlign: 'center' }}> 
                <span style={{ fontSize: '12px', color: '#2c3e50', fontFamily: 'monospace', fontWeight: '500' }}> 
                    {item.primera_horaformat || '--:--:--'} 
                </span> 
            </td> 

            {/* 5. COLUMNA BIOMÉTRICO RELOJ FN */} 
            <td className="borde-grupo-inicio" style={{ ...styles.td, textAlign: 'center' }}> 
                <span style={{ fontSize: '12px', color: '#2c3e50', fontFamily: 'monospace', fontWeight: '500' }}> 
                    {item.ultima_horaformat || '--:--:--'} 
                </span> 
            </td>
            {/* 6. INPUT: HR INICIO DE JORNADA NORMAL */} 
            <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                <input 
                    type="text" placeholder="00:00" maxLength={5} value={item.h_inicio_jn || ''} 
                    style={{ ...estilosCompactos.inputTime, textAlign: 'center', fontFamily: 'monospace' }} 
                    onChange={(e) => { 
                        let nuevoValor = e.target.value.replace(/[^0-9:]/g, ''); 
                        if (nuevoValor.length === 2 && !nuevoValor.includes(':')) nuevoValor = nuevoValor + ':'; 
                        const partes = nuevoValor.split(':'); 
                        if (partes && parseInt(partes[0], 10) > 23) return; 
                        if (partes && parseInt(partes[1], 10) > 59) return; 
                        
                        const key = `${item.id}-h_inicio_jn`; 
                        if (camposGuardados[key]) setCamposGuardados(prev => ({ ...prev, [key]: false })); 
                        
                        let jorCalculada = item.h_jor_normal; 
                        if (nuevoValor.length === 5) jorCalculada = calcularJornadaEnCaliente(nuevoValor, item.h_fn, item.h_almuerzo); 
                        setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_jn: nuevoValor, h_jor_normal: jorCalculada } : d)); 
                    }} 
                    onBlur={(e) => { 
                        const valorFinal = e.target.value; 
                        if (valorFinal && valorFinal.length === 5) { 
                            handleUpdate(item.id, 'h_inicio_jn', valorFinal, true); 
                        } else { 
                            handleUpdate(item.id, 'h_inicio_jn', null, true); 
                            setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_jn: '' } : d)); 
                        } 
                    }} 
                /> 
                {camposGuardados[`${item.id}-h_inicio_jn`] && <span style={estilosCompactos.badgeOk}>Ok (✓)</span>} 
            </td> 

            {/* 7. INPUT: TIEMPO ALMUERZO/MERIENDA */} 
            <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                <input 
                    type="text" placeholder="00:00" maxLength={5} value={item.h_almuerzo || ''} 
                    style={{ ...estilosCompactos.inputTime, textAlign: 'center', fontFamily: 'monospace' }} 
                    onChange={(e) => { 
                        let nuevoValor = e.target.value.replace(/[^0-9:]/g, ''); 
                        if (nuevoValor.length === 2 && !nuevoValor.includes(':')) nuevoValor = nuevoValor + ':'; 
                        const partes = nuevoValor.split(':'); 
                        if (partes && parseInt(partes[0], 10) > 23) return; 
                        if (partes && parseInt(partes[1], 10) > 59) return; 
                        
                        const key = `${item.id}-h_almuerzo`; 
                        if (camposGuardados[key]) setCamposGuardados(prev => ({ ...prev, [key]: false })); 
                        
                        let jorCalculada = item.h_jor_normal; 
                        if (nuevoValor.length === 5) jorCalculada = calcularJornadaEnCaliente(item.h_inicio_jn, item.h_inicio_fn, nuevoValor); 
                        setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_almuerzo: nuevoValor, h_jor_normal: jorCalculada } : d)); 
                    }} 
                    onBlur={(e) => { 
                        const valorFinal = e.target.value; 
                        if (valorFinal && valorFinal.length === 5) { 
                            handleUpdate(item.id, 'h_almuerzo', valorFinal, true); 
                        } else { 
                            handleUpdate(item.id, 'h_almuerzo', null, true); 
                            setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_almuerzo: '' } : d)); 
                        } 
                    }} 
                /> 
                {camposGuardados[`${item.id}-h_almuerzo`] && <span style={estilosCompactos.badgeOk}>Ok (✓)</span>} 
            </td> 

            {/* 8. INPUT: HR FIN DE JORNADA NORMAL */} 
            <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                <input 
                    type="text" placeholder="00:00" maxLength={5} value={item.h_inicio_fn || ''} 
                    style={{ ...estilosCompactos.inputTime, textAlign: 'center', fontFamily: 'monospace' }} 
                    onChange={(e) => { 
                        let nuevoValor = e.target.value.replace(/[^0-9:]/g, ''); 
                        if (nuevoValor.length === 2 && !nuevoValor.includes(':')) nuevoValor = nuevoValor + ':'; 
                        const partes = nuevoValor.split(':'); 
                        if (partes && parseInt(partes[0], 10) > 23) return; 
                        if (partes && parseInt(partes[1], 10) > 59) return; 
                        
                        const key = `${item.id}-h_inicio_fn`; 
                        if (camposGuardados[key]) setCamposGuardados(prev => ({ ...prev, [key]: false })); 
                        
                        let jorCalculada = item.h_jor_normal; 
                        if (nuevoValor.length === 5) jorCalculada = calcularJornadaEnCaliente(item.h_inicio_jn, nuevoValor, item.h_almuerzo); 
                        setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_fn: nuevoValor, h_jor_normal: jorCalculada } : d)); 
                    }} 
                    onBlur={(e) => { 
                        const valorFinal = e.target.value; 
                        if (valorFinal && valorFinal.length === 5) { 
                            handleUpdate(item.id, 'h_inicio_fn', valorFinal, true); 
                        } else { 
                            handleUpdate(item.id, 'h_inicio_fn', null, true); 
                            setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_fn: '' } : d)); 
                        } 
                    }} 
                /> 
                {camposGuardados[`${item.id}-h_inicio_fn`] && <span style={estilosCompactos.badgeOk}>Ok (✓)</span>} 
            </td>

            {/* 9. INPUT: HR INICIO HR EXTRA */} 
            <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                <input 
                    type="text" placeholder="00:00" maxLength={5} value={item.h_inicio_ext || ''} 
                    style={{ ...estilosCompactos.inputTime, textAlign: 'center', fontFamily: 'monospace' }} 
                    onChange={(e) => { 
                        let nuevoValor = e.target.value.replace(/[^0-9:]/g, ''); 
                        if (nuevoValor.length === 2 && !nuevoValor.includes(':')) nuevoValor = nuevoValor + ':'; 
                        const partes = nuevoValor.split(':'); 
                        if (partes && parseInt(partes[0], 10) > 23) return; 
                        if (partes && parseInt(partes[1], 10) > 59) return; 
                        setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_ext: nuevoValor } : d)); 
                    }} 
                    onBlur={(e) => { 
                        const valorFinal = e.target.value; 
                        if (valorFinal && valorFinal.length === 5) handleUpdate(item.id, 'h_inicio_ext', valorFinal, true); 
                        else { 
                            handleUpdate(item.id, 'h_inicio_ext', null, true); 
                            setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_inicio_ext: '' } : d)); 
                        } 
                    }} 
                /> 
                {camposGuardados[`${item.id}-h_inicio_ext`] && <span style={estilosCompactos.badgeOk} title="Guardado">(✓)</span>} 
            </td> 

            {/* 10. INPUT: HR FIN HR EXTRA */} 
            <td className="borde-grupo-inicio" style={estilosCompactos.td}> 
                <input 
                    type="text" placeholder="00:00" maxLength={5} value={item.h_fin_ext || ''} 
                    style={{ ...estilosCompactos.inputTime, textAlign: 'center', fontFamily: 'monospace' }} 
                    onChange={(e) => { 
                        let nuevoValor = e.target.value.replace(/[^0-9:]/g, ''); 
                        if (nuevoValor.length === 2 && !nuevoValor.includes(':')) nuevoValor = nuevoValor + ':'; 
                        const partes = nuevoValor.split(':'); 
                        if (partes && parseInt(partes[0], 10) > 23) return; 
                        if (partes && parseInt(partes[1], 10) > 59) return; 
                        setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_fin_ext: nuevoValor } : d)); 
                    }} 
                    onBlur={(e) => { 
                        const valorFinal = e.target.value; 
                        if (valorFinal && valorFinal.length === 5) handleUpdate(item.id, 'h_fin_ext', valorFinal, true); 
                        else { 
                            handleUpdate(item.id, 'h_fin_ext', null, true); 
                            setDatos(prev => prev.map(d => d.id === item.id ? { ...d, h_fin_ext: '' } : d)); 
                        } 
                    }} 
                /> 
                {camposGuardados[`${item.id}-h_fin_ext`] && <span style={estilosCompactos.badgeOk} title="Guardado">(✓)</span>} 
            
            
            </td> 
              {/* 11. ACCIONES: BOTONES INTEGRADOS CON TUS MÉTODOS Y CLASES */} 
                          <td style={{ ...styles.td, textAlign: 'center', width: '50px' }}> 
                  <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', alignItems: 'center' }}> 
                      
                      {/* Botón Clonar Registro (+) */}
                      <button 
                          className="btn btn-sm" 
                          onClick={(e) => { 
                              e.stopPropagation(); // Evita clics fantasmas en la fila
                              setRegistroAClonar(item); 
                              setShowModal(true); 
                          }}
                          // 🔑 Se inyecta tu verde corporativo #92b91c
                          style={{ 
                              padding: '3px 11px', 
                              fontSize: '14px', 
                              cursor: 'pointer',
                              backgroundColor: '#92b91c',
                              borderColor: '#92b91c',
                              color: '#194113ff'
                          }}
                      > 
                          + 
                      </button>

                      {/* Botón Anular Registro */}
                      <button 
                          className="btn btn-sm" 
                          onClick={(e) => { 
                              e.stopPropagation(); // Evita clics fantasmas en la fila
                              if (window.confirm(`¿Estás seguro de anular el registro de ${item.nombres}?`)) {
                                  handleUpdateEstado(item.id, 'tipo_dia', 'ANULADO', false); 
                              }
                          }}
                          // 🔑 Se inyecta tu rojo personalizado #d92323
                          style={{ 
                              padding: '3px 6px', 
                              fontSize: '12px', 
                              cursor: 'pointer',
                              backgroundColor: '#d92323',
                              borderColor: '#d92323',
                              color: '#fff'
                          }}
                      > 
                        🗑️
                      </button> 

                  </div> 
              </td>

        </tr> 
    ))} 
</tbody>


                    </table>
                </div>
            </div>

                    {showModal && (
                        <div style={styles.modalOverlay}>
                            <div style={styles.modalContent}>
                                <h3 style={{ marginBottom: '15px' }}>Copiar Registro a Nuevo Empleado</h3>
                                
                                {/* Selector de Empleado */}
                            <div style={styles.inputGroup}>
                            <label style={styles.label}>Seleccionar Empleado de {registroAClonar?.departamento}:</label>
                            <select 
                                style={styles.input} 
                                value={empleadoSeleccionadoId} 
                                onChange={(e) => setEmpleadoSeleccionadoId(e.target.value)}
                            >
                                <option value="">-- Seleccione un compañero --</option>
                                {listaEmpleados
                                    .filter(emp => emp.departamento === registroAClonar?.departamento) // Filtrado dinámico
                                    .map(emp => (
                                        <option key={emp.codemp} value={emp.nombre}>
                                            {emp.nombre}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>


                                {/* Fecha */}
                                <div style={{ ...styles.inputGroup, marginTop: '15px' }}>
                                    <label style={styles.label}>Fecha para el nuevo registro:</label>
                                    <input 
                                        type="date" 
                                        style={styles.input} 
                                        value={nuevaFechaClon} 
                                        onChange={(e) => setNuevaFechaClon(e.target.value)} 
                                    />
                                </div>

                               <div style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                              <button onClick={() => setShowModal(false)} style={styles.btnSecondary}>
                                  Cancelar
                              </button>
                              <button  
                                  onClick={handleClonar} 
                                  style={{ 
                                      ...styles.btnPrimary, 
                                      backgroundColor: '#ccff67ff', // Fondo del botón en verde lima
                                      color: '#000000',             // Texto en negro (o el color que contraste mejor)
                                      opacity: !empleadoSeleccionadoId ? 0.5 : 1
                                  }}
                                  disabled={loading || !empleadoSeleccionadoId}
                              >
                                  {loading ? 'Procesando...' : 'Crear Copia'}
                              </button>
                          </div>

                            </div>
                        </div>
                    )}


        </div>
    );
};



const estilosCompactos = {
  td: {
    textAlign: 'center', 
    verticalAlign: 'middle',
    padding: '1px',           // Espaciado mínimo para que la fila no sea alta
    position: 'relative'      // Permite posicionar el badge de forma óptima
  },
  inputTime: {
    width: '45px',            // Ancho justo y exacto para el formato HH:MM
    height: '28px',           // Altura reducida y compacta
    fontSize: '13px',         // Letra ligeramente más pequeña y legible
    textAlign: 'center',      // Centrado absoluto del texto
    backgroundColor: '#ccff67ff', 
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '0',             // Elimina rellenos que agrandan el campo
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer'
  },
  badgeOk: {
    color: '#ccff67ff',
    fontSize: '11px',
    fontWeight: 'bold',
    display: 'block',
    marginTop: '2px'
  }
};



const TIPO_DIA_OPTIONS = [
  { value: "NORMAL", label: "Normal" },
  { value: "FERIADO", label: "Feriado" },
  { value: "FIN DE SEMANA", label: "Fin de semana" }
];

const styles = {
  // ... tus otros estilos anteriores
  selectInput: {
    width: '100%',
    padding: '3px 2px',
    borderRadius: '4px',
    border: '1px solid #f8faf5ff',
    backgroundColor: '#ddfbb2ff',
    fontSize: '13px'
  },

  pageBackground: { 
    backgroundColor: '#f8fafc', 
    minHeight: '100vh', 
    padding: '0.5rem 0rem' 
  },
  
  container: {
    width: '100%',
    maxWidth: '1630px',    /* Subimos un poco el ancho máximo para aprovechar mejor pantallas grandes */
    margin: '0 0 0 4rem',  /* 👈 LA SOLUCIÓN: Quitamos el centrado automático (auto) y lo alineamos a la izquierda con un margen limpio */
    padding: '0 0px',     
    boxSizing: 'border-box'
  },
  
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.6rem', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { color: '#64748b', margin: 0 },
  badge: { backgroundColor: '#e2e8f0', padding: '3px 6px', borderRadius: '20px', fontSize: '0.85rem', color: '#475569', fontWeight: '600' },
  card: { backgroundColor: 'white', padding: '0.2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '1.2rem' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.80rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.025em' },
  input: { padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.90rem', outline: 'none' },
  buttonContainer: { display: 'flex', gap: '12px' },
  
  btnPrimary: { backgroundColor: '#007bff', color: 'white', padding: '5px 7px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  btnSecondary: { backgroundColor: '#dc3545', color: 'white', padding: '5px 7px', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnClonar: { padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  
  // 1. EL CONTENEDOR DE LA TABLA (Maneja el Scroll Horizontal)
  tableContainer: {
    width: '100%',            
    maxHeight: '650px',        /* Evita que la pantalla se vuelva infinitamente larga hacia abajo */
    overflowX: 'auto',        /* ¡CLAVE! Activa el desplazamiento lateral para las 22 columnas */
    overflowY: 'auto',        /* Activa el scroll vertical interno */
    position: 'relative',     
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  },

  // 2. ESTRUCTURA DE LA TABLA
  table: {
    width: '80%',            
    minWidth: '1500px',       /* Fuerza a las 22 columnas a tener espacio para respirar sin encogerse */
    borderCollapse: 'collapse',
    backgroundColor: '#ffffff',
  },
  
  // 3. ENCABEZADOS STICKY (Se quedan fijos arriba al hacer scroll hacia abajo)
  th: {
    position: 'sticky',
    top: 0,          
    zIndex: 10,      
    backgroundColor: '#f1f5f9', /* Forzamos color para que las celdas de abajo no se traslapen al subir */
    padding: '4px 3px', 
    fontSize: '0.70rem', 
    fontWeight: '700', 
    color: '#475569',
    textAlign: 'center',
    borderBottom: '2px solid #cbd5e1',
    borderRight: '1px solid #e2e8f0',
  },

  // 4. DISEÑO DE FILAS (Alternancia de color sutil)
  trEven: { backgroundColor: '#f8fafc' },
  trOdd: { backgroundColor: '#ffffff' },
  
  // 5. DISEÑO DE LAS CELDAS COMPACTAS (Evita saltos de línea desastrosos)
  td: {
    padding: '3px 4px',
    fontSize: '11px',
    color: '#334155',
    borderBottom: '1px solid #cbd5e1', 
    borderRight: '1px solid #f1f4f6',  
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',       /* Evita que los nombres o cargos se partan en 2 líneas */
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    textAlign: 'center'
  },

  // Componentes internos de celdas
  empContainer: {
    display: 'flex',
    flexDirection: 'column',   /* Pone el código/área abajo del nombre de forma ordenada */
    alignItems: 'flex-start',
    gap: '2px',              
  },
  empName: { fontWeight: '600', color: '#1e293b', fontSize: '11px' },
  empId: { fontSize: '10px', color: '#1763ceff' },
  dep: { fontWeight: '500', fontSize: '10px', color: '#64748b' },
  
  selectInline: { padding: '2px 3px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' },
  
  // Botones de acción minimalistas dentro de la tabla
  btnSuccess: {
    backgroundColor: '#ccff67ff',
    color: '#1e293b',          /* Cambiado a oscuro para excelente contraste sobre amarillo-verde */
    border: 'none',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnDanger: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '11px',
    fontWeight: '500',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '15px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }
};

export default Horas_cultivo;


