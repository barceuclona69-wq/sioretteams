    import React from 'react';
    import { fetchWithFallback } from '../../config';
    import { toast } from 'sonner';

    import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
    import jsPDF from 'jspdf';
    import autoTable from 'jspdf-autotable'; // Importamos la función directamente
    import logoSioret from '../../imagenes/logo_gym_blanco.jpg';
    import html2canvas from 'html2canvas';
    import { Chart, registerables } from 'chart.js';
    Chart.register(...registerables);






    class FacturacionCliente extends React.Component {
        constructor(props) {
            super(props);
            this.state = {
                id_cle: '',
                busquedaCliente: '',
                mostrarModal: false,
                detalles: [{ 
                    id_art: '', articulo: '', cantidad: 1, precio_venta: 0, 
                    fecha_pago: new Date().toISOString().split('T')[0], 
                    valor_descuento: 0, valor_pago: 0, valor_deuda: 0 
                }],
                historial: [],
                avances: [],
                listaClientes: [],
                listaArticulos: [],
                nuevoCliente: { nombres: '', apellidos: '', fecha_nacimiento: '', direccion: '',
                            telefono: '', altura: '' ,edad: '', genero: '',estado_cle: 1,
                            fecha_desde: new Date().toISOString().split('T')[0], // Fecha hoy por defecto
                            fecha_hasta: ''},
                cargando: true,
                enviando: false,
                // --- AQUÍ AGREGA LAS NUEVAS LÍNEAS ---
                mostrarModalArt: false,
                editandoArt: false,
                formArticulo: { id_art: '', nombre_art: '', precio_venta: 0, precio_compra: 0, unidad_medida: '' },
                busquedaArt: '', // <-- Nuevo campo para el buscador
                busquedaClienteModal: '', // Para el buscador interno del modal
                id_cle: '',
                altura: 0.0, // Se declara como número decimal inicial
                articulosSeleccionados: ['TODOS'], 
                
                        mostrarModalReporteArt: false,
                        articulosSeleccionadosModal: [], // Almacenará los ID de los artículos marcados dentro del modal
                        busquedaReporteArt: '',// Agrega esto dentro de tu this.state = { ... } inicial:
                menuAbierto: false,
                // --- NUEVOS ESTADOS PARA EL REPORTE MENSUAL ---
                mostrarModalReporteMensual: false,
                articulosMensualModal: ['TODOS'] // Controla los artículos seleccionados para el mes


                
            };
        }

handleDobleClic = (c) => {
    console.log("Datos recibidos del cliente:", c);

    this.setState({
        mostrarModal: true,
        editandoCliente: true,
        nuevoCliente: {
            id_cle: c.id_cle || '',
            nombres: c.Nombres || '',      // 👈 Corregido con N mayúscula
            apellidos: c.Apellidos || '',  // 👈 Corregido con A mayúscula
            telefono: c.telefono || '', 
            edad: c.Edad !== undefined && c.Edad !== null ? c.Edad : '', // 👈 Corregido con E mayúscula
            direccion: c.direccion || '',
            genero: c.genero || 'Masculino',
            estado_cle: c.estado_cle !== undefined ? c.estado_cle : 1,
            altura: c.altura || '1.70',
            
            // Extrae correctamente la fecha para el input date HTML
            fecha_nacimiento: c.fecha_nacimiento ? c.fecha_nacimiento.split('T')[0] : '',
            fecha_desde: c.fecha_desde ? c.fecha_desde.split('T')[0] : new Date().toISOString().split('T')[0],
            fecha_hasta: c.fecha_hasta ? c.fecha_hasta.split('T')[0] : ''
        }
    });
};






manejadorBusquedaReporteArt = (e) => {
    this.setState({ busquedaReporteArt: e.target.value });
}

obtenerArticulosFiltrados = () => {
    const { listaArticulos, busquedaReporteArt } = this.state;
    if (!busquedaReporteArt.trim()) return listaArticulos;
    
    return listaArticulos.filter(articulo => 
        articulo.nombre_art.toLowerCase().includes(busquedaReporteArt.toLowerCase())
    );
}


// --- NUEVA FUNCIÓN PARA GENERAR REPORTE MENSUAL DIRECTO ---
// Importa Chart.js al inicio de tu archivo si no está importado:
// import { Chart, registerables } from 'chart.js';
// Chart.register(...registerables);

generarReporteMensualDirecto = async () => {
    try {
        this.setState({ enviando: true });

        const respuesta = await fetchWithFallback('/api/RRHH/reporte_ventas_mensual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_articulos: ['TODOS'] })
        });

        if (!respuesta || !respuesta.success || !respuesta.data || respuesta.data.length === 0) {
            this.setState({ enviando: false });
            return toast.error(respuesta.error || "No hay transacciones registradas para generar el reporte.");
        }

        const datosBackend = respuesta.data;
        const doc = new jsPDF('l', 'mm', 'a4'); 

        // 1. Cabecera del PDF
        doc.setFillColor(24, 43, 73); 
        doc.rect(0, 0, 297, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("REPORTE GENERAL DE TOTALES VENTAS MENSUALES", 14, 16);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Filtros Aplicados: TODOS LOS ARTÍCULOS`, 14, 35);
        doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 235, 35);

        // 2. Preparar filas de la tabla
        const columnas = ["Mes / Año", "Total Precio Venta ($)", "Total Descuento ($)", "Total Valor Pago ($)", "Total Valor Deuda ($)"];
        
        const filas = datosBackend.map(item => [
            item.mes,
            `$${parseFloat(item.precio_venta || 0).toFixed(2)}`,
            `$${parseFloat(item.valor_descuento || 0).toFixed(2)}`,
            `$${parseFloat(item.valor_pago || 0).toFixed(2)}`,
            `$${parseFloat(item.valor_deuda || 0).toFixed(2)}`
        ]);

        const totalPrecioVenta = datosBackend.reduce((sum, item) => sum + parseFloat(item.precio_venta || 0), 0);
        const totalDescuento = datosBackend.reduce((sum, item) => sum + parseFloat(item.valor_descuento || 0), 0);
        const totalPago = datosBackend.reduce((sum, item) => sum + parseFloat(item.valor_pago || 0), 0);
        const totalDeuda = datosBackend.reduce((sum, item) => sum + parseFloat(item.valor_deuda || 0), 0);

        filas.push([
            "TOTAL HISTÓRICO", 
            `$${totalPrecioVenta.toFixed(2)}`, 
            `$${totalDescuento.toFixed(2)}`, 
            `$${totalPago.toFixed(2)}`, 
            `$${totalDeuda.toFixed(2)}`
        ]);

        // 3. Renderizar la tabla con AutoTable
        let finalY = 42;
        autoTable(doc, {
            startY: finalY,
            head: [columnas],
            body: filas,
            theme: 'striped',
            headStyles: { fillColor: [24, 43, 73], textColor: [255, 255, 255], fontSize: 10, halign: 'center' },
            styles: { fontSize: 9, halign: 'center' },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
            didParseCell: function (data) {
                if (data.row.index === filas.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [233, 236, 239];
                }
                if (data.section === 'body' && data.column.index === 4) {
                    const textoLimpio = String(data.cell.text || '').replace('$', '').trim();
                    const valorDeuda = parseFloat(textoLimpio) || 0;
                    if (valorDeuda > 0) {
                        data.cell.styles.textColor = [186, 26, 26];    
                        data.cell.styles.fillColor = [255, 230, 230];  
                    }
                }
            },
            didDrawPage: function (data) {
                finalY = data.cursor.y; 
            }
        });

        // 4. GENERACIÓN DEL GRÁFICO DE BARRAS MÁS PEQUEÑO Y COLOR LIMÓN
        const datosGrafico = [...datosBackend].reverse();
        const mesesLabels = datosGrafico.map(item => item.mes);
        const valoresPago = datosGrafico.map(item => parseFloat(item.valor_pago || 0));

        // Dimensiones reducidas del canvas virtual para mayor nitidez en menor escala
        const canvas = document.createElement('canvas');
        canvas.width = 650; 
        canvas.height = 240; 
        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: mesesLabels,
                datasets: [{
                    label: 'Valor Recaudado (Pago) por Mes ($)',
                    data: valoresPago,
                    backgroundColor: 'rgba(163, 230, 53, 0.85)', // Color Verde Limón moderno (Hex #a3e635)
                    borderColor: 'rgba(132, 204, 22, 1)',       // Borde Verde Limón más oscuro para contraste
                    borderWidth: 1.5,
                    borderRadius: 4,
                    barPercentage: 0.6 // Hace las barras un poco más esbeltas y estéticas
                }]
            },
            options: {
                responsive: false,
                animation: false, 
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { font: { size: 11, family: 'Helvetica' } }
                    },
                    x: {
                        ticks: { font: { size: 10, family: 'Helvetica', weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { labels: { font: { size: 11, family: 'Helvetica', weight: 'bold' } } }
                }
            }
        });

        const imgGraficoBase64 = canvas.toDataURL('image/png');
        chart.destroy(); 

        // 5. Espaciado e inserción del gráfico optimizado a la hoja
        // Si el espacio restante es muy corto para el nuevo tamaño compacto (65mm de alto), saltamos de página
        if (finalY + 75 > 210) {
            doc.addPage();
            finalY = 30; 
        } else {
            finalY += 12; 
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("ANÁLISIS COMPARATIVO DE RECAUDACIÓN MENSUAL", 14, finalY);

        // Renderizado centrado y más ajustado (200mm de ancho x 65mm de alto)
        const margenCentrado = (297 - 200) / 2; // Centra el gráfico horizontalmente en la página A4
        doc.addImage(imgGraficoBase64, 'PNG', margenCentrado, finalY + 4, 200, 65);

        // 6. Guardar el archivo
        doc.save(`Reporte_Ventas_Mensuales_Global.pdf`);
        toast.success("Reporte mensual con gráfico optimizado descargado.");
        this.setState({ enviando: false });

    } catch (err) {
        console.error("Error al generar PDF directo con gráfico:", err);
        this.setState({ enviando: false });
        toast.error("Error al procesar el reporte mensual.");
    }
}



    procesarReporteDesdeModal = async () => {
    const { articulosSeleccionadosModal, listaArticulos } = this.state;

    // Validación si el usuario no marcó nada
    if (articulosSeleccionadosModal.length === 0) {
        return toast.error("Por favor, seleccione al menos un artículo de la lista.");
    }

    try {
        this.setState({ enviando: true });

        // Petición POST a tu endpoint pasándole los IDs marcados en el modal
        const respuesta = await fetchWithFallback('/api/RRHH/reporte_ventas_articulos_general', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id_articulos: articulosSeleccionadosModal })
        });

        if (!respuesta || !respuesta.success || !respuesta.data || respuesta.data.length === 0) {
            this.setState({ enviando: false });
            return toast.error(respuesta.error || "No hay transacciones registradas para los artículos elegidos.");
        }

        const datosBackend = respuesta.data;
        const doc = new jsPDF('l', 'mm', 'a4');

        // Diseño del PDF
        doc.setFillColor(24, 43, 73); 
        doc.rect(0, 0, 297, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("REPORTE SELECCIÓN MÚLTIPLE DE VENTAS", 14, 16);

        // Construir subtítulo con nombres de los productos incluidos
        const nombres = articulosSeleccionadosModal.map(id => {
            const art = listaArticulos.find(a => String(a.id_art) === String(id));
            return art ? (art.descripcion || art.descripción || art.nombre_art || "Artículo") : id;
        });
        let textoFiltro = nombres.join(', ');
        if (textoFiltro.length > 80) textoFiltro = textoFiltro.substring(0, 77) + "...";

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Filtros Aplicados: ${textoFiltro}`, 14, 35);
        doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 235, 35);

        // 1. Columnas incluyendo el campo Cliente
        const columnas = ["Cliente", "Descripción del Artículo", "Cantidad", "Precio Venta ($)", "Valor Pago ($)", "Valor Deuda ($)"];
        
        // 2. Mapeo de datos trayendo item.cliente del backend
        const filas = datosBackend.map(item => [
            item.cliente || "Cliente no registrado",
            item.articulo || item.descripcion || "Artículo",
            item.cantidad,
            `$${parseFloat(item.precio_venta || 0).toFixed(2)}`,
            `$${parseFloat(item.valor_pago || 0).toFixed(2)}`,
            `$${parseFloat(item.valor_deuda || 0).toFixed(2)}`
        ]);

        // 3. Cálculos dinámicos de los acumulados para el Total
        const totalUnidades = datosBackend.reduce((sum, item) => sum + parseInt(item.cantidad || 0), 0);
        const totalPago = datosBackend.reduce((sum, item) => sum + parseFloat(item.valor_pago || 0), 0);
        const totalDeuda = datosBackend.reduce((sum, item) => sum + parseFloat(item.valor_deuda || 0), 0);
        
        // Fila final alineada para las 6 columnas actuales
        filas.push([
            "TOTAL RECAUDADO", 
            "", 
            totalUnidades, 
            "", 
            `$${totalPago.toFixed(2)}`, 
            `$${totalDeuda.toFixed(2)}`
        ]);

        // 4. Renderizado con alineaciones y condicionales de color
              // 4. Renderizado con alineaciones y condicionales de color definitivos
        autoTable(doc, {
            startY: 42,
            head: [columnas],
            body: filas,
            theme: 'striped',
            headStyles: { fillColor: [24, 43, 73], textColor: [255, 255, 255], fontSize: 10, halign: 'center' },
            styles: { fontSize: 9, halign: 'center' },
            columnStyles: { 
                0: { halign: 'left', fontStyle: 'bold' }, // Cliente alineado a la izquierda
                1: { halign: 'left' }                    // Descripción alineada a la izquierda
            },
            didParseCell: function (data) {
                // Validación para la fila final de TOTALES
                if (data.row.index === filas.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [233, 236, 239];
                }

                // Corrección: Evaluamos la columna 5 (Valor Deuda) usando el texto renderizado
                if (data.section === 'body' && data.column.index === 5) {
                    // Extraemos el texto visible de la celda (ej: "$4.00" -> "4.00")
                    const textoLimpio = String(data.cell.text || '').replace('$', '').trim();
                    const valorDeuda = parseFloat(textoLimpio) || 0;

                    if (valorDeuda > 0) {
                        data.cell.styles.textColor = [186, 26, 26];    // Texto Rojo Oscuro
                        data.cell.styles.fillColor = [255, 230, 230];  // Fondo Rojo Pastel Suave
                    }

                }
            }
        });


        doc.save(`Reporte_Ventas_Personalizado.pdf`);
        toast.success("Reporte descargado con éxito.");
        
        // Cerramos el modal y reseteamos estados de carga
        this.setState({ mostrarModalReporteArt: false, enviando: false });

    } catch (error) {
        console.error(error);
        toast.error("Error al conectarse con el servidor.");
        this.setState({ enviando: false });
    }
};




    // Úsala como propiedad de clase (Arrow Function) para heredar el contexto del "this"
    abrirModalSeleccionArticulos = () => {
        // Si quieres forzar una verificación visual:
        console.log("Abriendo modal... Artículos disponibles:", this.state.listaArticulos.length);
        
        this.setState({
            articulosSeleccionadosModal: [], 
            mostrarModalReporteArt: true
        });
    };


    // Controla el marcado y desmarcado de cada producto individual
    handleCheckArticuloModal = (id_art) => {
        this.setState(prevState => {
            const seleccionados = [...prevState.articulosSeleccionadosModal];
            const index = seleccionados.indexOf(id_art);

            if (index > -1) {
                // Si ya estaba seleccionado, lo removemos (desmarcar)
                seleccionados.splice(index, 1);
            } else {
                // Si no estaba, lo agregamos (marcar)
                seleccionados.push(id_art);
            }

            return { articulosSeleccionadosModal: seleccionados };
        });
    };


        
        handleCheckArticulo = (id) => {
        this.setState(prevState => {
            let lista = [...prevState.articulosSeleccionados];

            if (id === 'TODOS') {
                return { articulosSeleccionados: ['TODOS'] };
            }

            // Si estaba seleccionado 'TODOS', lo removemos al elegir uno individual
            if (lista.includes('TODOS')) {
                lista = [];
            }

            if (lista.includes(id)) {
                lista = lista.filter(item => item !== id);
            } else {
                lista.push(id);
            }

            // Si se desmarcan todos, volvemos a 'TODOS' por defecto
            if (lista.length === 0) {
                lista = ['TODOS'];
            }

            return { articulosSeleccionados: lista };
        });
    };


    descargarPDFDesdeModal = () => {
        const { datosReporte, articulosSeleccionados, listaArticulos } = this.state;

        if (datosReporte.length === 0) return;

        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFillColor(24, 43, 73); 
        doc.rect(0, 0, 297, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("REPORTE SELECCIÓN MÚLTIPLE DE VENTAS", 14, 16);

        let textoFiltro = "Todos los Artículos";
        if (!articulosSeleccionados.includes('TODOS')) {
            const nombres = articulosSeleccionados.map(id => {
                const art = listaArticulos.find(a => String(a.id_art) === String(id));
                return art ? art.descripcion : id;
            });
            textoFiltro = nombres.join(', ');
            if (textoFiltro.length > 80) textoFiltro = textoFiltro.substring(0, 77) + "...";
        }

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(`Filtros: ${textoFiltro}`, 14, 35);
        doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 235, 35);

        const columnas = ["ID Art.", "Descripción del Artículo", "Cantidad Total Vendida", "Precio Ref. ($)", "Total Recaudado ($)"];
        const filas = datosReporte.map(item => [
            item.id_art,
            item.articulo,
            item.cantidad,
            `$${parseFloat(item.precio_venta).toFixed(2)}`,
            `$${parseFloat(item.valor_pago).toFixed(2)}`
        ]);

        const totalUnidades = datosReporte.reduce((sum, item) => sum + parseInt(item.cantidad), 0);
        const totalDinero = datosReporte.reduce((sum, item) => sum + parseFloat(item.valor_pago), 0);
        filas.push(["", "TOTAL RECAUDADO", totalUnidades, "", `$${totalDinero.toFixed(2)}`]);

        autoTable(doc, {
            startY: 42,
            head: [columnas],
            body: filas,
            theme: 'striped',
            headStyles: { fillColor: [24, 43, 73], textColor: [255, 255, 255], fontSize: 10, halign: 'center' },
            styles: { fontSize: 9, halign: 'center' },
            columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } },
            didParseCell: function (data) {
                if (data.row.index === filas.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [230, 230, 230];
                }
            }
        });

        doc.save(`Reporte_Ventas_Multiple.pdf`);
        toast.success("Descarga iniciada.");
    };



        
        calcularDiasMembresia = () => {
        const { fecha_desde, fecha_hasta } = this.state.nuevoCliente;

        if (!fecha_desde || !fecha_hasta) return { total: 0, restantes: 0 };

        const inicio = new Date(fecha_desde);
        const fin = new Date(fecha_hasta);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Normalizamos hoy para comparar solo fechas

        // Diferencia total del contrato
        const diffTotal = fin - inicio;
        const diasTotales = Math.ceil(diffTotal / (1000 * 60 * 60 * 24));

        // Diferencia de crédito restante
        const diffRestante = fin - hoy;
        const diasRestantes = Math.ceil(diffRestante / (1000 * 60 * 60 * 24));

        return {
            total: diasTotales,
            restantes: diasRestantes
        };
    };


    chequearVencimiento = () => {
        const { restantes } = this.calcularDiasMembresia();
        const { nombres } = this.state.nuevoCliente;

        if (restantes <= 0) {
            toast.error(`La membresía de ${nombres} ha caducado.`);
        } else if (restantes <= 5) {
            toast.warning(`¡Atención! A ${nombres} le quedan solo ${restantes} días de crédito.`);
        }
    };



        
    handleFechaRangoChange = (e) => {
        const { name, value } = e.target;
        
        this.setState(prevState => {
            const nuevoCliente = { ...prevState.nuevoCliente, [name]: value };

            // Si cambias la fecha_desde y no hay fecha_hasta, sugerir 30 días después
            if (name === 'fecha_desde' && value && !nuevoCliente.fecha_hasta) {
                const fecha = new Date(value);
                fecha.setDate(fecha.getDate() + 30);
                nuevoCliente.fecha_hasta = fecha.toISOString().split('T')[0];
            }

            return { nuevoCliente };
        }, () => {
            // Disparar la notificación si ya hay fecha completa
            if (this.state.nuevoCliente.fecha_hasta) {
                this.chequearVencimiento();
            }
        });
    };



    // Agregamos async para permitir la captura de imagen
    exportarPDF = async () => {
        const { nuevoCliente, avances, altura } = this.state;
        
        if (!avances || avances.length === 0) {
            return toast.error("No hay registros para exportar");
        }

        // --- LÓGICA DE SEGURIDAD PARA EL NOMBRE ---
        // Buscamos tanto en minúsculas como en mayúsculas por si acaso
        const nombre = nuevoCliente.nombres || nuevoCliente.Nombres || "";
        const apellido = nuevoCliente.apellidos || nuevoCliente.Apellidos || "";
        const nombreCompleto = `${nombre} ${apellido}`.trim().toUpperCase() || "CLIENTE NO SELECCIONADO";
        const edadCliente = nuevoCliente.edad || nuevoCliente.Edad || 'N/A';

        const doc = new jsPDF('l', 'mm', 'a4');
        const alturaNum = parseFloat(altura);

        // --- ENCABEZADO ---
        doc.setFillColor(255, 255, 255); // Verde Limón
        doc.rect(0, 0, 297, 30, 'F'); 

        try {
            doc.addImage(logoSioret, 'JPEG', 12, 3, 24, 24); 
        } catch (e) { console.warn("Error logo", e); }

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("HISTORIAL INTEGRAL DE AVANCES Y MEDIDAS", 40, 15);

        // --- NOMBRE DEL CLIENTE (USANDO LA VARIABLE CORREGIDA) ---
        doc.setFontSize(14);
        doc.text(`CLIENTE: ${nombreCompleto}`, 40, 24);

        // --- CAPTURA E INSERCIÓN DE LA GRÁFICA ---
        const graficaArea = document.getElementById('grafica-imc');
        if (graficaArea) {
            try {
                const canvas = await html2canvas(graficaArea);
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 14, 35, 130, 65); 
            } catch (e) {}
        }

        // --- INFO ADICIONAL (DERECHA) ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("DETALLES DEL PERFIL:", 150, 45);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Edad: ${edadCliente} años`, 150, 52);
        doc.text(`Altura: ${alturaNum} m`, 150, 59);
        doc.text(`Fecha Reporte: ${new Date().toLocaleDateString()}`, 150, 66);

        // --- TABLA DE DATOS ---
        const tableColumn = ["Fecha", "Peso(kg/lb)", "IMC", "Tórax", "Pecho", "Espalda", "Abd.", "Hom.", "Brz.", "Bíc.", "Tríc.", "Ant.", "Glút.", "Pier.", "Cuád.", "Fem.", "Pant."];
        const tableRows = avances.map(av => [
            `${av.mes}/${av.año}`,
            `${av.peso_kg || 0} / ${av.peso_lb || 0}`,
            av.imc || '0.00',
            av.torax || '-',
            av.medida_pecho || '-',
            av.espalda || '-',
            av.medida_abdomen || '-',
            av.medida_hombro || '-',
            av.brazos || '-',
            av.medida_bicep || '-',
            av.medida_tricep || '-',
            av.medida_antebrazo || '-',
            av.medida_gluteos || '-',
            av.medida_piena || '-', 
            av.medida_cuadriceps || '-',
            av.medida_femoral || '-',
            av.medida_pantorrilla || '-'
        ]);


    

        autoTable(doc, {
            startY: 105,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { 
                fillColor: [154, 205, 50],
                textColor: [0, 0, 0],
                fontSize: 7, 
                halign: 'center'
            },
            styles: { fontSize: 7, halign: 'center' }
        });

        const yLeyenda = 150; // Posición vertical debajo de la gráfica
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("REFERENCIA IMC:", 14, yLeyenda);

        // Cuadro Bajo Peso (Amarillo)
        doc.setFillColor(255, 193, 7); 
        doc.rect(14, yLeyenda + 2, 4, 4, 'F');
        doc.setFont("helvetica", "normal");
        doc.text("< 18.5 Bajo Peso", 20, yLeyenda + 5);

        // Cuadro Normal (Verde)
        doc.setFillColor(40, 167, 69);
        doc.rect(50, yLeyenda + 2, 4, 4, 'F');
        doc.text("18.5 - 24.9 Normal", 56, yLeyenda + 5);

        // Cuadro Sobrepeso (Amarillo/Naranja)
        doc.setFillColor(255, 193, 7);
        doc.rect(90, yLeyenda + 2, 4, 4, 'F');
        doc.text("25.0 - 29.9 Sobrepeso", 96, yLeyenda + 5);

        // Cuadro Obesidad (Rojo)
        doc.setFillColor(220, 53, 69);
        doc.rect(130, yLeyenda + 2, 4, 4, 'F');
        doc.text("> 30.0 Obesidad", 136, yLeyenda + 5);

        // Usamos el nombre limpio para el nombre del archivo
        doc.save(`Reporte_FIT_${nombreCompleto.replace(/ /g, "_")}.pdf`);
        toast.success("Reporte generado con éxito");
    };



    recalcularValoresAvance = (avance) => {
        const peso = parseFloat(avance.peso_kg) || 0;
        const altura = parseFloat(this.state.altura) || 0;
        const abdomen = parseFloat(avance.medida_abdomen) || 0;
        const genero = this.state.nuevoCliente.genero; // "1" Masc, "2" Fem

        let imcFinal = 0;

        if (peso > 0 && altura > 0) {
            // Fórmula Estándar
            imcFinal = peso / (altura * altura);

            // Ajuste por Abdomen (Riesgo Metabólico)
            // Si el abdomen es alto (>94cm en hombres o >80cm en mujeres), 
            // sumamos un factor de riesgo simbólico al IMC visual
            const limiteAbdomen = (genero === "1") ? 94 : 80;
            if (abdomen > limiteAbdomen) {
                imcFinal += 0.5; // Factor de ajuste por riesgo abdominal
            }
        }

        return imcFinal.toFixed(2);
    };


    handleFechaNacimientoChange = (e) => {
        const fecha = e.target.value;
        let edadCalculada = "";

        if (fecha) {
            const hoy = new Date();
            const cumple = new Date(fecha);
            edadCalculada = hoy.getFullYear() - cumple.getFullYear();
            const m = hoy.getMonth() - cumple.getMonth();
            
            // Ajuste si aún no ha cumplido años en el mes/día actual
            if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
                edadCalculada--;
            }
        }

        this.setState({
            nuevoCliente: { 
                ...this.state.nuevoCliente, 
                fecha_nacimiento: fecha,
                edad: edadCalculada 
            }
        });
    };


        componentDidMount() { this.cargarDatosIniciales(); }

        cargarDatosIniciales = async () => {
            try {
                const [resClientes, resArticulos] = await Promise.all([
                    fetchWithFallback('/api/FIT/clientesfit'),
                    fetchWithFallback('/api/FIT/articulo_fit')
                ]);
                this.setState({ listaClientes: resClientes || [], listaArticulos: resArticulos || [], cargando: false });
            } catch (err) { this.setState({ cargando: false }); }
        };

    handleSelectCliente = async (e) => {
        const id = e.target.value;

        // 1. Buscamos el objeto del cliente en la lista local
        const clienteEncontrado = this.state.listaClientes.find(c => String(c.id_cle) === String(id));
        
        if (!clienteEncontrado) return;

        // 2. Normalización de Nombres
        const nombre = clienteEncontrado.nombres || clienteEncontrado.nombre || "";
        const apellido = clienteEncontrado.apellidos || clienteEncontrado.apellido || "";
        const nombreCompleto = `${nombre} ${apellido}`.trim();

        // 3. Gestión de Género
        // Guardamos el valor puro de la DB (ej: "1") para el formulario
        const generoOriginal = String(clienteEncontrado.genero || "").trim();
        
        // Generamos el texto para mostrar en etiquetas de solo lectura
        let generoDisplay = "Sin datos";
        if (generoOriginal === "1" || generoOriginal.toLowerCase().startsWith('m')) {
            generoDisplay = "Masculino";
        } else if (generoOriginal === "2" || generoOriginal.toLowerCase().startsWith('f')) {
            generoDisplay = "Femenino";
        }

        // 4. Extracción de Altura y Cálculo de Edad
        const alturaSeleccionada = parseFloat(clienteEncontrado.altura || clienteEncontrado.Altura || 0);
        
        const calcularEdad = (fecha) => {
            if (!fecha) return '';
            const hoy = new Date();
            const cumple = new Date(fecha);
            if (isNaN(cumple.getTime())) return '';
            let edad = hoy.getFullYear() - cumple.getFullYear();
            const m = hoy.getMonth() - cumple.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
            return edad;
        };

        const edadActual = calcularEdad(clienteEncontrado.fecha_nacimiento || clienteEncontrado.fecha_nac);

        // 5. Actualización del Estado (IMPORTANTE: generoOriginal va al formulario)
        // 5. Actualización del Estado
        this.setState({ 
            id_cle: id, 
            altura: alturaSeleccionada, 
            edad: edadActual,
            genero: generoDisplay, 
            busquedaCliente: nombreCompleto,
            nuevoCliente: { 
                ...this.state.nuevoCliente, 
                ...clienteEncontrado, 
                nombres: nombre,
                apellidos: apellido,
                genero: generoOriginal,
                edad: edadActual,
                estado_cle: parseInt(clienteEncontrado.estado_cle || 1),
                // USAR LAS FECHAS DEL CLIENTE SI EXISTEN, SI NO, PONER DEFAULTS
                fecha_desde: clienteEncontrado.fecha_desde || new Date().toISOString().split('T')[0],
                fecha_hasta: clienteEncontrado.fecha_hasta || '' 
            },
            historial: [], 
            avances: [] 
        }, () => {
            // DISPARAR NOTIFICACIÓN AUTOMÁTICA AL SELECCIONAR
            if (this.state.nuevoCliente.fecha_hasta) {
                this.chequearVencimiento();
            }
        });


        
        // 6. Carga de Datos desde la API (Facturas y Avances)
        if (id) {
            try {
                const [resFacturas, resAvances] = await Promise.all([
                    fetchWithFallback(`/api/FIT/consultar_facturas/${id}`),
                    fetchWithFallback(`/api/FIT/consultar_avances/${id}`)
                ]);

                // Limpieza de Facturas
                const historialLimpio = (resFacturas || []).map(item => ({
                    ...item,
                    id: item.id || item.id_pago || Math.random(),
                    fecha_pago: item.fecha_pago ? item.fecha_pago.split('T')[0] : '',
                    precio_venta: parseFloat(item.precio_venta) || 0,
                    valor_pago: parseFloat(item.valor_pago) || 0,
                    valor_deuda: parseFloat(item.valor_deuda) || 0,
                    cantidad: item.cantidad || 1
                }));

                // Limpieza de Avances y cálculo de IMC
                const avancesLimpio = (resAvances || []).map(av => {
                    const peso = parseFloat(av.peso_kg) || 0;
                    const h = alturaSeleccionada > 3 ? alturaSeleccionada / 100 : alturaSeleccionada;
                    const imcCalculado = (h > 0 && peso > 0) ? (peso / (h * h)).toFixed(2) : 0;

                    return {
                        ...av,
                        id: av.id || av.id_av || Math.random(), 
                        imc: imcCalculado, 
                        peso_kg: peso,
                        ...Object.fromEntries(Object.entries(av).map(([k, v]) => [k, v ?? 0]))
                    };
                });

                this.setState({ 
                    historial: historialLimpio, 
                    avances: avancesLimpio 
                });

            } catch (error) {
                console.error("Error cargando detalles del cliente:", error);
                toast.error("Error al recuperar datos del servidor");
            }
        }
    };





    calcularEdad = (fechaNacimiento) => {
        if (!fechaNacimiento) return "";
        const hoy = new Date();
        const cumple = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - cumple.getFullYear();
        const mes = hoy.getMonth() - cumple.getMonth();

        // Ajuste si aún no ha cumplido años en el año actual
        if (mes < 0 || (mes === 0 && hoy.getDate() < cumple.getDate())) {
            edad--;
        }
        return edad;
    };



        // --- LÓGICA DE FACTURACIÓN ---
        handleDetalleChange = (index, e) => {
            const { name, value } = e.target;
            const nuevosDetalles = [...this.state.detalles];
            nuevosDetalles[index][name] = value;

            if (name === 'id_art') {
                const art = this.state.listaArticulos.find(a => String(a.id_art) === String(value));
                if (art) {
                    nuevosDetalles[index].precio_venta = art.precio_venta || 0;
                    nuevosDetalles[index].articulo = art.nombre_art || art.articulo || ''; 
                }
            }

            const cant = parseFloat(nuevosDetalles[index].cantidad) || 0;
            const precio = parseFloat(nuevosDetalles[index].precio_venta) || 0;
            const desc = parseFloat(nuevosDetalles[index].valor_descuento) || 0;

            if (['precio_venta', 'cantidad', 'valor_descuento', 'id_art'].includes(name)) {
                nuevosDetalles[index].valor_pago = ((precio * cant) - desc).toFixed(2);
            }

            const pago = parseFloat(nuevosDetalles[index].valor_pago) || 0;
            nuevosDetalles[index].valor_deuda = ((precio * cant) - desc - pago).toFixed(2);
            this.setState({ detalles: nuevosDetalles });
        };

    handleEditHistorial = (index, e) => {
        const { name, value } = e.target;
        const nuevoHistorial = [...this.state.historial];
        
        // 1. Actualizamos el valor que cambió (id_art, cantidad, etc.)
        nuevoHistorial[index][name] = value;

        // 2. Si lo que cambió fue el artículo, buscamos su precio en la lista maestra
        if (name === 'id_art') {
            const art = this.state.listaArticulos.find(a => String(a.id_art) === String(value));
            if (art) {
                nuevoHistorial[index].precio_venta = art.precio_venta || 0;
                // Actualizamos también el nombre para que sea consistente visualmente
                nuevoHistorial[index].articulo = art.nombre_art || art.articulo || '';
            }
        }

        // 3. Recalculamos los valores con el nuevo precio (o nueva cantidad/pago)
        const p = parseFloat(nuevoHistorial[index].precio_venta) || 0;
        const c = parseFloat(nuevoHistorial[index].cantidad) || 1;
        const d = parseFloat(nuevoHistorial[index].valor_descuento) || 0;
        const pg = parseFloat(nuevoHistorial[index].valor_pago) || 0;
        
        nuevoHistorial[index].valor_deuda = ((p * c) - d - pg).toFixed(2);
        
        this.setState({ historial: nuevoHistorial });
    };


        handleBlurHistorial = async (index) => {
            const fila = this.state.historial[index];
            try {
                await fetchWithFallback(`/api/FIT/editar_pago/${fila.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fila)
                });
                toast.info("Pago actualizado");
            } catch (err) { console.error(err); }
        };

        eliminarFilaHistorial = async (id) => {
            if (!window.confirm("¿Eliminar registro de pago?")) return;
            try {
                await fetchWithFallback(`/api/FIT/eliminar_pago/${id}`, { method: 'DELETE' });
                this.setState({ historial: this.state.historial.filter(h => h.id !== id) });
                toast.success("Eliminado");
            } catch (err) { console.error(err); }
        };

        guardarFactura = async (e) => {
            e.preventDefault();
            if (!this.state.id_cle) return toast.warning("Seleccione Cliente");
            this.setState({ enviando: true });
            try {
                for (let item of this.state.detalles) {
                    if (!item.id_art) continue;
                    await fetchWithFallback('/api/FIT/guardar_pago', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...item, id_cle: this.state.id_cle })
                    });
                }
                toast.success("Venta guardada");
                this.setState({ enviando: false, detalles: [{ id_art:'', cantidad:1, precio_venta:0, valor_descuento:0, valor_pago:0, valor_deuda:0, fecha_pago: new Date().toISOString().split('T')[0] }] });
                this.handleSelectCliente({ target: { value: this.state.id_cle } });
            } catch (err) { this.setState({ enviando: false }); }
        };

        // --- MODAL CLIENTE ---
        handleNuevoClienteChange = (e) => {
            const { name, value } = e.target;
            this.setState(prev => ({ nuevoCliente: { ...prev.nuevoCliente, [name]: value } }));
        };

    guardarNuevoCliente = async (e) => {
        e.preventDefault();
        const { nuevoCliente, editandoCliente } = this.state;

        // Validación de fechas antes de enviar
        if (nuevoCliente.fecha_hasta && nuevoCliente.fecha_desde) {
            if (new Date(nuevoCliente.fecha_hasta) < new Date(nuevoCliente.fecha_desde)) {
                return toast.error("La fecha hasta no puede ser menor a la fecha desde");
            }
        }
        
        try {
            await fetchWithFallback('/api/FIT/registrarcliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoCliente) // Aquí ya se envían las nuevas fechas
            });

            toast.success(editandoCliente ? "¡Actualizado con éxito!" : "¡Cliente creado!");

            // RESETEAMOS el formulario incluyendo los nuevos campos
            this.setState({ 
                editandoCliente: false,
                nuevoCliente: { 
                    nombres: '', 
                    apellidos: '',
                    fecha_nacimiento: '',
                    direccion: '',
                    telefono: '', 
                    altura: '',
                    edad: '',
                    genero: '',
                    estado_cle: 1,
                    // --- RESET DE FECHAS ---
                    fecha_desde: new Date().toISOString().split('T')[0], 
                    fecha_hasta: '',
                    id_cle: null
                } 
            });

            this.cargarDatosIniciales();
        } catch (err) {
            toast.error("Error al procesar la solicitud");
        }
    };






    // --- LÓGICA DE AVANCES ---
    handleAvanceChange = (index, e) => {
        const { name, value } = e.target;
        const nuevosAvances = [...this.state.avances];
        nuevosAvances[index][name] = value;

        // Si cambia el peso o si ya tenemos la altura del estado
        if (name === 'peso_kg') {
            const alturaActual = this.state.altura; // La altura que ya cargaste en handleSelectCliente
            nuevosAvances[index].imc = this.calcularIMC(value, alturaActual);
        }

        this.setState({ avances: nuevosAvances });
    };


    editarAvance = (index) => {
        const nuevosAvances = [...this.state.avances];
        nuevosAvances[index].editando = true;
        nuevosAvances[index].original = { ...nuevosAvances[index] }; // Copia de seguridad
        this.setState({ avances: nuevosAvances });
    };

    cancelarEdicionAvance = (index) => {
        const nuevosAvances = [...this.state.avances];
        nuevosAvances[index] = { ...nuevosAvances[index].original, editando: false };
        this.setState({ avances: nuevosAvances });
    };

    guardarCambiosAvance = async (index) => {
        const av = this.state.avances[index];
        
        // Intentamos obtener el ID ya sea en minúscula o mayúscula
        const idReal = av.id || av.ID;

        if (!idReal) {
            console.error("Fila del avance:", av);
            return toast.error("Error: No se encontró el ID del registro en la tabla");
        }

        try {
            // Usamos la variable idReal que ya validamos
            await fetchWithFallback(`/api/FIT/actualizar_avance/${idReal}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(av)
            });

            const nuevosAvances = [...this.state.avances];
            nuevosAvances[index].editando = false;
            this.setState({ avances: nuevosAvances });
            toast.success("Avance actualizado correctamente");
        } catch (err) { 
            console.error(err);
            toast.error("Error al guardar en el servidor"); 
        }
    };

    // 3. Función para eliminar un registro de avance
        eliminarAvance = async (id) => {
            if (!window.confirm("¿Deseas eliminar este registro de avance?")) return;
            try {
                await fetchWithFallback(`/api/FIT/eliminar_avance/${id}`, { method: 'DELETE' });
                this.setState({ avances: this.state.avances.filter(a => a.id !== id) });
                toast.success("Registro eliminado");
            } catch (err) {
                console.error(err);
            }
        };


        

        // --- LÓGICA PARA NUEVO AVANCE ---
        
    agregarFilaAvance = () => {
        if (!this.state.id_cle) return toast.warning("Seleccione un cliente primero");

        const nuevoAvance = {
            id_cle: this.state.id_cle,
            mes: new Date().getMonth() + 1,
            año: new Date().getFullYear(),
            peso_kg: 0, peso_lb: 0, imc: 0, porcentaje_grasa: 0, porcentaje_musculo: 0,
            brazos: 0, medida_bicep: 0, medida_tricep: 0, medida_pecho: 0, medida_hombro: 0,
            espalda: 0, torax: 0, medida_trapecios: 0, medida_antebrazo: 0,
            medida_abdomen: 0, medida_gluteos: 0, medida_femoral: 0,
            medida_cuadriceps: 0, medida_piena: 0, medida_pantorrilla: 0,
            esNuevo: true, // Flag para saber que es un POST
            editando: true
        };

        this.setState({ avances: [nuevoAvance, ...this.state.avances] });
    };


        // Ajustamos la función de guardar para que decida entre POST (nuevo) o PUT (editar)
        guardarCambiosAvance = async (index) => {
            const av = this.state.avances[index];
            const esNuevo = av.esNuevo;
            
            // Si es nuevo usamos la ruta de guardado, si no la de actualizar
            const url = esNuevo ? '/api/FIT/guardar_avance' : `/api/FIT/actualizar_avance/${av.id || av.ID}`;
            const metodo = esNuevo ? 'POST' : 'PUT';

            try {
                await fetchWithFallback(url, {
                    method: metodo,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(av)
                });
                
                toast.success(esNuevo ? "Nuevo registro creado" : "Avance actualizado");
                
                // Recargamos los avances del cliente para obtener los IDs reales de la DB
                this.handleSelectCliente({ target: { value: this.state.id_cle } });
            } catch (err) { 
                console.error(err);
                toast.error("Error al procesar el avance"); 
            }
        };


        // Abrir modal para nuevo o editar

    /// Abrir modal (Nuevo o Editar)
    abrirModalArticulo = (art = null) => {
        if (art) {
            this.setState({ 
                mostrarModalArt: true, 
                editandoArt: true, 
                formArticulo: { ...art } 
            });
        } else {
            this.setState({ 
                mostrarModalArt: true, 
                editandoArt: false, 
                formArticulo: { id_art: '', nombre_art: '', precio_venta: 0, unidad_medida: '' } 
            });
        }
    };

    // Guardar cambios (POST para crear / PUT para editar)
    guardarArticulo = async (e) => {
        e.preventDefault();
        const { formArticulo, editandoArt } = this.state;
        const url = editandoArt ? `/api/FIT/editar_articulo/${formArticulo.id_art}` : '/api/FIT/crear_articulo';
        
        try {
            await fetchWithFallback(url, {
                method: editandoArt ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formArticulo)
            });

            toast.success(editandoArt ? "Artículo actualizado" : "Artículo creado");

            // --- LOS CAMBIOS AQUÍ ---
            this.setState({ 
                // 1. Limpiamos el formulario para que quede listo para el siguiente
                formArticulo: { nombre_art: '', precio_venta: '' }, 
                // 2. Si estaba editando, volvemos al modo "Nuevo"
                editandoArt: false 
                // 3. NO incluimos mostrarModalArt: false para que no se cierre
            });

            this.cargarDatosIniciales(); // Refresca la tabla interna del modal
            
        } catch (err) {
            toast.error("Error al procesar el artículo");
        }
    };


    // Eliminar Artículo
    eliminarArticulo = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este artículo?")) return;
        try {
            await fetchWithFallback(`/api/FIT/eliminar_articulo/${id}`, { method: 'DELETE' });
            toast.success("Artículo eliminado");

            // Si el artículo eliminado es el mismo que se está editando, limpiamos el formulario
            if (this.state.formArticulo.id_art === id) {
                this.setState({
                    editandoArt: false,
                    formArticulo: { nombre_art: '', precio_venta: '' }
                });
            }

            this.cargarDatosIniciales(); // Refresca la lista interna
        } catch (err) {
            toast.error("Error al eliminar");
        }
    };




    abrirModalCliente = (cliente = null) => {
        if (cliente) {
            console.log("Datos recibidos para editar:", cliente);
            this.setState({ 
                mostrarModal: true, 
                editandoCliente: true, 
                nuevoCliente: { 
                    id_cle: cliente.id_cle,
                    nombres: cliente.nombres || cliente.Nombres || '', 
                    apellidos: cliente.apellidos || cliente.Apellidos || '', 
                    telefono: cliente.telefono || cliente.Telefono || '',
                    direccion: cliente.direccion || cliente.Direccion || '',
                    altura: cliente.altura || cliente.Altura || '',
                    edad: cliente.edad || cliente.Edad || '',
                    fecha_nacimiento: cliente.fecha_nacimiento ? cliente.fecha_nacimiento.split('T')[0] : '',
                    genero: cliente.genero ? String(cliente.genero).trim() : "" ,
                    estado_cle: cliente.estado_cle, 
                fecha_desde: cliente.fecha_desde ? cliente.fecha_desde.split('T')[0] : '',
                    fecha_hasta: cliente.fecha_hasta ? cliente.fecha_hasta.split('T')[0] : ''
                } 
            });
        } else {
            // Para cliente nuevo, simplemente reseteamos todo
            this.setState({ 
                mostrarModal: true, 
                editandoCliente: false, 
                nuevoCliente: { 
                    nombres: '', 
                    apellidos: '', 
                    fecha_nacimiento: '', 
                    direccion: '', 
                    telefono: '', 
                    altura: '', 
                    edad: '', 
                    genero: '' ,
                    estado_cle: 1,
                    fecha_desde: new Date().toISOString().split('T')[0], // Fecha hoy por defecto
                    fecha_hasta: ''
                } 
            });
        }
    };




    eliminarCliente = async (id) => {
        if (!window.confirm("¿Eliminar este cliente permanentemente?")) return;
        try {
            await fetchWithFallback(`/api/FIT/eliminar_cliente/${id}`, { method: 'DELETE' });
            toast.success("Cliente eliminado");

            // Si el cliente que borras es el que tienes abierto en el formulario, límpialo
            if (this.state.formCliente && this.state.formCliente.id_cliente === id) {
                this.setState({
                    editandoCliente: false,
                    formCliente: { nombre: '', telefono: '', correo: '' } // Ajusta según tus campos
                });
            }

            this.cargarDatosIniciales(); // Refresca la lista de clientes sin cerrar el modal
        } catch (err) { 
            toast.error("Error al eliminar"); 
        }
    };


    handleEditAvance = (idx, e) => {
        const { name, value } = e.target;
        const nuevosAvances = [...this.state.avances];
        
        // 1. Actualizamos el valor inmediatamente para que la fila esté al día
        nuevosAvances[idx][name] = value;
        const valFloat = parseFloat(value) || 0;

        // 2. PESO: Conversión a libras (siempre que cambie el kg)
        if (name === 'peso_kg') {
            nuevosAvances[idx].peso_lb = (valFloat * 2.20462).toFixed(2);
        }

        // 3. IMC: Se dispara si cambia Peso O Abdomen
        if (name === 'peso_kg' || name === 'medida_abdomen') {
            // Pasamos toda la fila actualizada a tu función de apoyo
            nuevosAvances[idx].imc = this.recalcularValoresAvance(nuevosAvances[idx]);
        }
        
        // 4. CÁLCULOS AUTOMÁTICOS DE MEDIDAS
        if (name === 'torax') {
            nuevosAvances[idx].medida_pecho = (valFloat * 0.45).toFixed(2);
            nuevosAvances[idx].espalda = (valFloat * 0.55).toFixed(2);
        }

        if (name === 'brazos') {
            nuevosAvances[idx].medida_bicep = (valFloat * 0.58).toFixed(2);
            nuevosAvances[idx].medida_tricep = (valFloat * 0.42).toFixed(2);
        }

        if (name === 'medida_piena') {
            nuevosAvances[idx].medida_cuadriceps = (valFloat * 0.60).toFixed(2);
            nuevosAvances[idx].medida_femoral = (valFloat * 0.40).toFixed(2);
        }

        this.setState({ avances: nuevosAvances });
    };





    // 2. Guardado automático al salir del campo (Blur)
    handleBlurAvance = async (index) => {
        const data = this.state.avances[index];
        try {
            await fetchWithFallback(`/api/FIT/actualizar_avance/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            toast.success("Progreso guardado");
        } catch (err) { toast.error("Error al sincronizar"); }
    };

    calcularIMC = (pesoKg, alturaMts) => {
        if (!pesoKg || !alturaMts || alturaMts === 0) return 0;
        // La altura debe estar en metros (ej: 1.75)
        const imc = parseFloat(pesoKg) / (parseFloat(alturaMts) * parseFloat(alturaMts));
        return imc.toFixed(2); // Retorna 2 decimales
    };


    calcularMetricas = (index) => {
        const listaAvances = [...this.state.avances];
        const peso = parseFloat(listaAvances[index].peso_kg) || 0;
        const altura = parseFloat(this.state.altura) || 0;
        
        // Necesitamos la edad y sexo del cliente (deben estar en el objeto cliente seleccionado)
        const cliente = this.state.listaClientes.find(c => String(c.id_cle) === String(this.state.id_cle));
        const edad = cliente?.edad || 25; // Edad por defecto si no existe
        const esHombre = cliente?.sexo === 'Masculino' ? 1 : 0;

        if (peso > 0 && altura > 0) {
            // 1. Calcular IMC
            const imc = peso / (altura * altura);
            listaAvances[index].imc = imc.toFixed(2);

            // 2. Calcular % Grasa (Fórmula de Deurenberg)
            const grasa = (1.20 * imc) + (0.23 * edad) - (10.8 * esHombre) - 5.4;
            listaAvances[index].porcentaje_grasa = grasa.toFixed(2);
        }

        this.setState({ avances: listaAvances });
    };


    getDatosIMC = () => {
        const { avances, altura } = this.state;
        const alturaMts = parseFloat(altura); 
        
        if (!alturaMts || alturaMts <= 0 || !avances || avances.length === 0) return [];

        return avances.map(av => {
            // CAMBIO CLAVE: Usamos 'peso_kg' que es el nombre de tu input
            const peso = parseFloat(av.peso_kg); 
            
            if (isNaN(peso)) return null;

            const imc = (peso / (alturaMts * alturaMts)).toFixed(2);
            
            return {
                fecha: `${av.mes}/${av.año}`, 
                imc: parseFloat(imc)
            };
        }).filter(item => item !== null);
    };



    calcularDiasLista = (fechaHasta) => {
        if (!fechaHasta) return null;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fin = new Date(fechaHasta);
        const diff = fin - hoy;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };





        render() {
            const { listaClientes, listaArticulos, detalles, historial, avances, id_cle, busquedaCliente, mostrarModal } = this.state;
            const clientesFiltrados = listaClientes.filter(c => (`${c.Nombres || c.nombres} ${c.Apellidos || c.apellidos}`).toLowerCase().includes(busquedaCliente.toLowerCase()));
            const datosGrafica = this.getDatosIMC();
            const { mostrarModalReporteMensual, articulosMensualModal } = this.state;




            return (


                

                
            <div className="container-fluid mt-4" style={{ fontSize: '0.8rem', maxWidth: '1200px', margin: '0 auto' }}>
            
                    
        

                    <div className="card shadow-sm border-0 mb-4">
                    <div 
                        className="card-header d-flex justify-content-between align-items-center py-2" 
                        style={{ backgroundColor: '#BFFF00', color: '#000' }}
                        >
                        <div className="card-header bg-dark d-flex justify-content-between align-items-center py-1" 
                                style={{ borderBottom: '0.5px solid #BFFF00' }}>
    
                                    {/* Sección del Título/Logo */}
                                    <div className="d-flex align-items-center">
                                        <span style={{ color: '#BFFF00', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '1px' }}>
                                        CRACKENN BODY LAB - <span className="text-white">GYM</span>
                                        </span>
                                    </div>

                                    {/* Sección de Iconos o Botones */}
                                    <div className="text-white">
                                        <i className="bi bi-lightning-charge-fill" style={{ color: '#BFFF00' }}></i>
                                    </div>
                                    </div>

                                <div className="dropdown d-inline-block" style={{ marginTop: '22px' }}>
                            <button 
                                className="btn dropdown-toggle text-white fw-bold d-flex align-items-center gap-2" 
                                type="button" 
                                style={{ padding: '10px 20px', borderRadius: '5px', backgroundColor: '#182b49', border: 'none' }}
                                onClick={(e) => {
                                    // Evitamos que el clic se propague al documento inmediatamente
                                    e.stopPropagation();
                                    this.setState({ menuAbierto: !this.state.menuAbierto });
                                }}
                                onBlur={() => {
                                    // Un pequeño delay para dar tiempo a que registre el clic en los elementos hijos antes de cerrar
                                    setTimeout(() => this.setState({ menuAbierto: false }), 200);
                                }}
                                     >
        ⚙️ 
                             </button>
                        <ul 
                            className={`dropdown-menu dropdown-menu-end shadow ${this.state.menuAbierto ? 'show' : ''}`} 
                            style={{ borderRadius: '6px', border: '1px solid #ddd', display: this.state.menuAbierto ? 'block' : 'none' }}
                        >
                           <li>
                            <button 
                                className="dropdown-item py-2 d-flex align-items-center gap-2 text-success fw-bold" 
                                type="button"
                                // 👇 CAMBIA ESTA LÍNEA
                                onClick={() => {
                                    this.abrirModalCliente(); // Limpia los campos y pone el título "👤 Nuevo Cliente"
                                    this.setState({ menuAbierto: false }); // Cierra el menú desplegable
                                }}
                            >
                                👤 + Gestión de Cliente
                            </button>
                        </li>

                            <li>
                                <button 
                                    className="dropdown-item py-2 d-flex align-items-center gap-2 text-success fw-bold" 
                                    type="button"
                                    onClick={() => {
                                        this.setState({ menuAbierto: false });
                                        if (this.abrirModalArticulo) this.abrirModalArticulo();
                                    }}
                                >
                                    📦 + Gestión de Artículo
                                </button>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                                <button 
                                    className="dropdown-item py-2 d-flex align-items-center gap-2 text-primary fw-bold" 
                                    type="button"
                                    onClick={() => {
                                        this.setState({ menuAbierto: false });
                                        if (this.abrirModalSeleccionArticulos) this.abrirModalSeleccionArticulos();
                                    }}
                                >
                                    📊 Reporte de Ventas
                                </button>
                            </li>

                            <li>
                               <button 
                                className="dropdown-item py-2 d-flex align-items-center gap-2 text-primary fw-bold" 
                                type="button"
                                    onClick={this.generarReporteMensualDirecto}
                                    disabled={this.state.enviando}
                                   
                                >
                                    {this.state.enviando ? "📅 Generando..." : "📅 Reporte Totales por Mes"}
                                </button>


                            </li>



                        </ul>
                    </div>




                        













                        </div>
                        <div className="card-body">
                            {/* SELECCIÓN CLIENTE */}
                            
                        <div className="row g-3">
        {/* COLUMNA IZQUIERDA: Buscador y Grid de Clientes (8 de 12 espacios) */}
        <div className="col-md-8" style={{ borderRight: '1px solid #eee' }}>
            <div className="row mb-2">
                <div className="col-md-6">
                    <label className="fw-bold small">🔍 Buscar Cliente</label>
                    <input 
                        type="text" 
                        className="form-control form-control-sm border-success" 
                        placeholder="Escribe para filtrar..."
                        value={busquedaCliente} 
                        onChange={(e) => this.setState({ busquedaCliente: e.target.value })} 
                    />
                </div>
                <div className="col-md-6 text-end align-self-end">
                    <small className="text-muted fw-bold">Encontrados: {clientesFiltrados.length}</small>
                </div>
            </div>

            {/* El Grid de selección */}
            <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid #dee2e6', 
                borderRadius: '8px', 
                padding: '10px',
                backgroundColor: '#fdfdfd'
            }}>
                <div className="row g-2 row-cols-2 row-cols-md-6"> {/* Bajé a 4 por el espacio reducido */}
                    {clientesFiltrados.map(c => {
                        const esSeleccionado = id_cle === c.id_cle;
                        return (
                            <div key={c.id_cle} className="col">
                                <div 
                                    onClick={() => this.handleSelectCliente({ target: { value: c.id_cle } })}
                                    onDoubleClick={() => this.handleDobleClic(c)}

                                    className={`card h-100 shadow-sm p-2 text-center btn ${esSeleccionado ? 'border-primary bg-primary text-white' : 'border-light bg-white text-dark'}`}
                                    style={{ cursor: 'pointer', fontSize: '0.75rem' }}
                                >

                                    <div className="fw-bold text-truncate">{c.nombres || c.Nombres}</div>
                                    <div className="small text-truncate opacity-75">{c.apellidos || c.Apellidos}</div>

                                    {/* Cálculo de días para el cliente actual 'c' */}
                                    {(() => {
                                        const dias = this.calcularDiasLista(c.fecha_hasta || c.FECHA_HASTA);
                                        if (dias === null) {
                                            return (
                                                <div className="text-end">
                                                    <span className="d-block text-muted mb-1" style={{ fontSize: '0.55rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                                                        MEMBRESÍA
                                                    </span>
                                                    <span className="badge rounded-pill" 
                                                        style={{ 
                                                            backgroundColor: '#e9ecef', // Gris muy claro
                                                            color: '#6c757d',           // Texto gris
                                                            fontSize: '0.65rem',
                                                            padding: '5px 12px',
                                                            border: '1px solid rgba(0,0,0,0.1)',
                                                            fontWeight: 'bold'
                                                        }}>
                                                        ⚪ SIN FECHA
                                                    </span>
                                                </div>
                                            );
                                        }


                                        return (
                                        <div className="text-end">
                                    {/* Etiqueta superior minúscula */}
                                    <span className="d-block text-muted mb-1" style={{ fontSize: '0.55rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                                        MEMBRESÍA
                                    </span>

                                    {/* Badge con el mismo estilo del anterior */}
                                    <span className="badge rounded-pill" 
                                        style={{ 
                                            backgroundColor: dias <= 0 ? '#dc3545' : dias <= 5 ? '#ffc107' : '#dfff00', 
                                            color: dias <= 0 ? '#fff' : '#000',
                                            fontSize: '0.65rem',
                                            padding: '5px 12px',
                                            border: '1px solid rgba(0,0,0,0.1)',
                                            fontWeight: 'bold'
                                        }}>
                                        {dias <= 0 
                                            ? `⚠️ (${dias})` 
                                            : dias <= 5 
                                                ? `⚡(${dias} d)` 
                                                : `✅ (${dias} DÍAS)`}
                                    </span>
                                </div>

                                        );
                                    })()}

                                
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* COLUMNA DERECHA: Información del Cliente Seleccionado (4 de 12 espacios) */}
    <div className="col-md-4">
        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {/* Encabezado estilo Limón Profesional */}
            <div className="p-2 text-center" style={{ backgroundColor: '#ADFF2F', borderBottom: '2px solid #32CD32' }}>
                <h6 className="fw-bold mb-0 text-dark">
                    <i className="bi bi-person-badge me-2"></i>Ficha del Cliente
                </h6>
            </div>

            
            {/* Visualización en la ficha del cliente */}
    <div className="d-flex align-items-center justify-content-between p-2 rounded-3 shadow-sm border" 
        style={{ backgroundColor: '#ffffff', borderLeft: '5px solid #dfff00' }}>
        
    <div className="d-flex align-items-center bg-white border rounded px-2 py-1" style={{ width: 'fit-content' }}>
        {/* Icono Mini */}
        <i className="bi bi-calendar-event text-muted me-2" style={{ fontSize: '0.9rem' }}></i>

        <div className="d-flex gap-3">
            {/* Inicio */}
            <div className="border-end pe-2">
                <label className="d-block text-muted fw-bold" style={{ fontSize: '0.55rem', marginBottom: '-2px' }}>INICIO</label>
                <span className="fw-bold text-dark" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {this.state.nuevoCliente.fecha_desde?.slice(0, 10)}
                </span>
            </div>

            {/* Vencimiento */}
            <div>
                <label className="d-block text-muted fw-bold" style={{ fontSize: '0.55rem', marginBottom: '-2px' }}>VENCIMIENTO</label>
                <span className={`fw-bold ${this.calcularDiasMembresia().restantes <= 5 ? 'text-danger' : 'text-dark'}`} 
                    style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {this.state.nuevoCliente.fecha_hasta ? this.state.nuevoCliente.fecha_hasta.slice(0, 10) : "Pte. Registro"}
                </span>
            </div>
        </div>
    </div>


        {this.state.nuevoCliente.fecha_hasta && (
            <div className="text-end">
                <span className="d-block text-muted mb-1" style={{ fontSize: '0.55rem', fontWeight: '800' }}>ESTADO</span>
                <span className="badge rounded-pill" 
                    style={{ 
                        backgroundColor: this.calcularDiasMembresia().restantes <= 5 ? '#ff4d4d' : '#dfff00', 
                        color: this.calcularDiasMembresia().restantes <= 5 ? '#fff' : '#000',
                        fontSize: '0.65rem',
                        padding: '5px 12px',
                        border: '1px solid rgba(0,0,0,0.1)'
                    }}>
                    {this.calcularDiasMembresia().restantes <= 0 
                        ? '⚠️ EXPIRADO' 
                        : `${this.calcularDiasMembresia().restantes} DÍAS`}
                </span>
            </div>
        )}
    </div>



    <div className="card-body p-2" style={{ backgroundColor: '#f9fff0', borderRadius: '8px' }}>
        {!id_cle ? (
            <div className="text-center py-3">
                <p className="small text-muted mb-0">⚠️ Selecciona cliente</p>
            </div>
        ) : (
            <div className="row g-1">
                {/* Header Mini de Estado */}
                <div className="col-12 mb-1">
                    <div className="d-flex justify-content-between align-items-center px-2 py-1 rounded-pill" 
                        style={{ backgroundColor: this.state.nuevoCliente.estado_cle === 1 ? '#dfff00' : '#ffcccb', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <span className="fw-bold text-dark" style={{ fontSize: '0.6rem' }}>
                            {this.state.nuevoCliente.estado_cle === 1 ? '● ACTIVO' : '● INACTIVO'}
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.6rem' }}>ID: {id_cle}</span>
                    </div>
                </div>

                {/* Fila de Datos compacta */}
                <div className="col-4">
                    <div className="p-1 text-center bg-white border rounded shadow-sm">
                        <label className="d-block text-muted fw-bold" style={{ fontSize: '0.55rem' }}>ALTURA</label>
                        <span className="fw-bold text-dark" style={{ fontSize: '0.75rem' }}>{this.state.altura || '--'}</span>
                        <small className="text-muted d-block" style={{ fontSize: '0.5rem' }}>cm</small>
                    </div>
                </div>

                <div className="col-4">
                    <div className="p-1 text-center bg-white border rounded shadow-sm">
                        <label className="d-block text-muted fw-bold" style={{ fontSize: '0.55rem' }}>EDAD</label>
                        <span className="fw-bold text-dark" style={{ fontSize: '0.75rem' }}>{this.state.edad || '--'}</span>
                        <small className="text-muted d-block" style={{ fontSize: '0.5rem' }}>años</small>
                    </div>
                </div>

                <div className="col-4">
                    <div className="p-1 text-center bg-white border rounded shadow-sm border-start border-4" style={{ borderLeftColor: '#dfff00 !important' }}>
                        <label className="d-block text-muted fw-bold" style={{ fontSize: '0.80rem' }}>SEXO</label>
                        <span className="fw-bold" style={{ fontSize: '0.75rem', color: '#829a00' }}>
                            {this.state.nuevoCliente.genero === "1" ? "♂ M" : this.state.nuevoCliente.genero === "2" ? "♀ F" : "?"}
                        </span>
                    </div>
                </div>
            </div>
        )}
    </div>

        
        </div>
    </div>

    </div>



                            {/* TABLA FACTURACIÓN */}
                    <form onSubmit={this.guardarFactura} className="mb-5 shadow-sm p-3 bg-white rounded">
                                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <table className="table table-hover align-middle">
                                        <thead className="sticky-top" style={{ zIndex: 10 }}>
                                            <tr style={{ backgroundColor: '#BFFF00', color: '#f7fee7' }}>
                                                <th className="py-3 ps-3" style={{ width: '40%', borderTopLeftRadius: '20px' }}>AGREGAR - Artículo / Servicio</th>
                                                <th className="py-3" style={{ width: '80px', borderTopLeftRadius: '20px'  }}>Cant.</th>
                                                <th className="py-3" style={{ width: '80px', borderTopLeftRadius: '20px'  }}>Precio</th>
                                                <th className="py-3" style={{ width: '80px', borderTopLeftRadius: '20px'  }}>Desc.</th>
                                                <th className="py-3" style={{ width: '80px', borderTopLeftRadius: '20px'  }}>V. Pago</th>
                                                <th className="py-3 text-center" style={{ width: '80px', borderTopLeftRadius: '20px'  }}>Deuda</th>
                                                <th className="py-3 pe-3" style={{ width: '50px', borderTopRightRadius: '8px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody className="border-top-0">
                                            {detalles.map((det, i) => (
                                                <tr key={i} className="border-bottom">
                                                    <td className="ps-3">
                                                        <select name="id_art" className="form-select form-select-sm border-0 bg-light" value={det.id_art} onChange={(e) => this.handleDetalleChange(i, e)}>
                                                            <option value="">Seleccionar artículo...</option>
                                                            {listaArticulos.map(a => <option key={a.id_art} value={a.id_art}>{a.nombre_art || a.articulo}</option>)}
                                                        </select>
                                                    </td>
                                                    <td><input type="number" name="cantidad" className="form-control form-control-sm border-0 bg-light text-center" value={det.cantidad} onChange={(e) => this.handleDetalleChange(i, e)} /></td>
                                                    <td><input type="number" name="precio_venta" className="form-control form-control-sm border-0 bg-light" value={det.precio_venta} onChange={(e) => this.handleDetalleChange(i, e)} /></td>
                                                    <td><input type="number" name="valor_descuento" className="form-control form-control-sm border-0 bg-light text-success" value={det.valor_descuento} onChange={(e) => this.handleDetalleChange(i, e)} /></td>
                                                    <td><input type="number" name="valor_pago" className="form-control form-control-sm border-0 bg-light fw-bold" value={det.valor_pago} onChange={(e) => this.handleDetalleChange(i, e)} /></td>
                                                    <td className={`text-center fw-bold ${det.valor_deuda > 0 ? 'text-danger' : 'text-muted'}`}>
                                                        ${det.valor_deuda}
                                                    </td>
                                                    <td className="pe-3 text-end">
                                                        <button type="button" className="btn btn-outline-danger btn-sm border-0 rounded-circle" onClick={() => this.setState({ detalles: detalles.filter((_, idx) => idx !== i) })}>
                                                            <i className="bi bi-trash"></i> ×
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    
                                    <button type="submit" className="btn btn-sm px-4" style={{ backgroundColor: '#4d7c0f', color: 'white' }}>
                                        Guardar Factura
                                    </button>
                                </div>
    </form>

                            {/* HISTORIAL PAGOS MEJORADO */}
                        {historial.length > 0 && (
                            <div className="mt-4 mb-5 shadow-sm rounded border overflow-hidden">
                                <div className="bg-light p-2 border-bottom d-flex justify-content-between align-items-center">
                                    <h6 className="fw-bold text-dark mb-0 ml-2">📜 Historial de Movimientos</h6>
                                    <span className="badge bg-secondary">{historial.length} Registros</span>
                                </div>
                                <div className="table-responsive" style={{ maxHeight: '350px' }}>
                                    <table className="table table-sm table-hover mb-0 ">
                                    <thead className="sticky-top" style={{ zIndex: 1020 }}>
                                        <tr style={{ backgroundColor: '#BFFF00', color: '#000000ff' }}>
                                            <th style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Fecha</th>
                                            <th style={{ position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Artículo / Servicio</th>
                                            <th style={{ width: '100px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Precio</th>
                                            <th style={{ position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Descuento</th> 
                                            <th style={{ width: '100px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>V. Pago</th>
                                            <th style={{ width: '100px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Deuda</th>
                                            <th style={{ width: '50px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}></th>
                                        </tr>
                                    </thead>

                                        <tbody className="bg-white">
                                            {historial.map((h, i) => (
                                                <tr key={i} className={`align-middle ${parseFloat(h.valor_deuda) > 0 ? "table-light" : ""}`} style={{ transition: 'all 0.3s' }}>
                                                    {/* FECHA */}
                                                    <td className="p-1" style={{ width: '130px' }}>
                                                        <div className="input-group input-group-sm">
                                                            <span className="input-group-text bg-white border-0 text-muted"><i className="bi bi-calendar-event"></i></span>
                                                            <input type="date" name="fecha_pago" className="form-control form-control-sm border-0 bg-transparent" 
                                                                value={h.fecha_pago} onChange={(e) => this.handleEditHistorial(i, e)} onBlur={() => this.handleBlurHistorial(i)} />
                                                        </div>
                                                    </td>

                                                    {/* ARTÍCULO */}
                                                    <td className="p-1">
                                                        <select name="id_art" className="form-select form-select-sm border-0 bg-transparent fw-semibold" 
                                                            value={h.id_art} onChange={(e) => this.handleEditHistorial(i, e)} onBlur={() => this.handleBlurHistorial(i)}>
                                                            {listaArticulos.map(a => <option key={a.id_art} value={a.id_art}>{a.nombre_art}</option>)}
                                                        </select>
                                                    </td>

                                                    {/* PRECIO */}
                                                    <td className="p-1" style={{ width: '100px' }}>
                                                        <div className="d-flex align-items-center justify-content-end px-2">
                                                            <span className="small text-muted me-1">$</span>
                                                            <input type="number" name="precio_venta" className="form-control form-control-sm border-0 bg-transparent text-end fw-bold p-0" 
                                                                value={h.precio_venta} onChange={(e) => this.handleEditHistorial(i, e)} onBlur={() => this.handleBlurHistorial(i)} />
                                                        </div>
                                                    </td>

                                                    {/* DESCUENTO - Resaltado en Rojo suave */}
                                                    <td className="p-1" style={{ width: '100px' }}>
                                                        <div className="d-flex align-items-center justify-content-end px-2 bg-danger bg-opacity-10 rounded-pill">
                                                            <span className="small text-danger me-1">-</span>
                                                            <input type="number" name="valor_descuento" className="form-control form-control-sm border-0 bg-transparent text-end fw-bold p-0 text-danger" 
                                                                value={h.valor_descuento || 0} onChange={(e) => this.handleEditHistorial(i, e)} onBlur={() => this.handleBlurHistorial(i)} />
                                                        </div>
                                                    </td>

                                                    {/* VALOR PAGO - Resaltado en Azul */}
                                                    <td className="p-1" style={{ width: '100px' }}>
                                                        <div className="d-flex align-items-center justify-content-end px-2 bg-primary bg-opacity-10 rounded-pill">
                                                            <span className="small text-primary me-1">$</span>
                                                            <input type="number" name="valor_pago" className="form-control form-control-sm border-0 bg-transparent text-end fw-bold p-0 text-primary" 
                                                                value={h.valor_pago} onChange={(e) => this.handleEditHistorial(i, e)} onBlur={() => this.handleBlurHistorial(i)} />
                                                        </div>
                                                    </td>

                                                {/* DEUDA - Badge de estado con color para excedente */}
    <td className="text-center">
        {(() => {
            const deuda = parseFloat(h.valor_deuda) || 0;
            let bgColor = '#9ace00ff'; // Verde (Saldado)
            let texto = 'Saldado';

            if (deuda > 0) {
                bgColor = '#ff5555ff'; // Rojo/Rosado (Debe)
                texto = `Debe $${deuda}`;
            } else if (deuda < 0) {
                bgColor = '#0070f3'; // Azul (Excedente / Pago de más)
                texto = `Excedente $${Math.abs(deuda)}`;
            }

            return (
                <span 
                    className="badge rounded-pill" 
                    style={{ 
                        minWidth: '80px', 
                        fontSize: '0.85rem',
                        backgroundColor: bgColor,
                        color: 'white'
                    }}
                >
                    {texto}
                </span>
            );
        })()}
    </td>



                                                    {/* ACCIONES */}
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-outline-danger border-0 rounded-circle shadow-sm" 
                                                            style={{ width: '30px', height: '30px', padding: '0' }}
                                                            onClick={() => this.eliminarFilaHistorial(h.id)}>
                                                            <i className="bi bi-trash3"></i>
                                                        </button>
                                                </td>
                                                </tr>
                                        ))}

                                        </tbody>


                                                
                                    </table>

                                    
                                </div>

        <table className="table table-sm table-hover mb-0 align-middle">
        <thead className="table-lime-dark">
            <tr className="text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                <th className="ps-3" style={{ width: '140px' }}>Fecha</th>
                <th></th>
                <th className="text-end" style={{ width: '100px' }}>-</th>
                <th className="text-end" style={{ width: '100px' }}>-</th> 
                <th className="text-end" style={{ width: '100px' }}>-</th>
                <th className="text-center" style={{ width: '100px' }}>Deuda</th>
                <th style={{ width: '50px' }}></th>
            </tr>
        </thead>

        {/* ... tbody ... */}

        <tfoot className="bg-light border-top border-2">
            <tr style={{ height: '60px' }}>
                <td colSpan="2" className="text-end pe-3 align-middle">
                    <span className="fw-bold text-secondary text-uppercase small">Resumen de Movimientos</span>
                </td>

                {/* TOTAL PRECIO */}
                <td className="text-end align-middle px-2">
                    <div className="small text-muted mb-0">Total Bruto</div>
                    <span className="fw-bold text-dark h6 mb-0">
                        ${this.state.historial.reduce((acc, h) => acc + (parseFloat(h.precio_venta) || 0), 0).toFixed(2)}
                    </span>
                </td>

                {/* TOTAL DESCUENTO */}
                <td className="text-end align-middle px-2">
                    <div className="px-2 py-1 rounded bg-danger bg-opacity-10 border-end border-danger border-3">
                        <div className="text-danger small fw-bold" style={{ fontSize: '0.65rem' }}>DESC. TOTAL</div>
                        <span className="text-danger fw-bold font-monospace">
                            -${this.state.historial.reduce((acc, h) => acc + (parseFloat(h.valor_descuento) || 0), 0).toFixed(2)}
                        </span>
                    </div>
                </td>

                {/* TOTAL PAGOS */}
                <td className="text-end align-middle px-2">
                    <div className="px-2 py-1 rounded bg-primary bg-opacity-10 border-end border-primary border-3">
                        <div className="text-primary small fw-bold" style={{ fontSize: '0.65rem' }}>PAGADO</div>
                        <span className="text-primary fw-bold font-monospace">
                            ${this.state.historial.reduce((acc, h) => acc + (parseFloat(h.valor_pago) || 0), 0).toFixed(2)}
                        </span>
                    </div>
                </td>

                {/* BALANCE FINAL (DEUDA) */}
                <td className="text-center align-middle px-1">
                    {(() => {
                        const deuda = this.state.historial.reduce((acc, h) => acc + (parseFloat(h.valor_deuda) || 0), 0);
                        return (
                            <div className={`p-2 rounded shadow-sm ${deuda > 0 ? 'bg-danger' : 'bg-success'} text-white`}>
                                <div className="fw-bold" style={{ fontSize: '0.6rem', opacity: 0.8 }}>DEUDA</div>
                                <div className="fw-bolder" style={{ fontSize: '0.95rem' }}>${deuda.toFixed(2)}</div>
                            </div>
                        );
                    })()}
                </td>

                {/* Espacio para columna acciones */}
                <td></td>
            </tr>
        </tfoot>
    </table>



        </div>
    )}

                                        <div className="d-flex align-items-center gap-3 mb-3">
                                            {/* Botón de Nuevo Registro */}
                                            <button 
                                                className="btn btn-sm btn-success px-3" 
                                                onClick={this.agregarFilaAvance}
                                                style={{ height: 'fit-content' }}
                                            >
                                                <i className="bi bi-plus-lg me-1"></i>
                                                + Nuevo Registro de Avance
                                            </button>

                                        {/* Botón de PDF Estilo Cápsula Profesional */}
                            <button 
                                onClick={this.exportarPDF}
                                className="btn d-inline-flex align-items-center justify-content-center px-4 py-2 shadow-sm"
                                style={{
                                    backgroundColor: '#9ACD32', 
                                    border: 'none',
                                    color: '#000',
                                    fontWeight: '700',
                                    borderRadius: '50px', // <--- REDONDEADO TOTAL (Estilo Cápsula)
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase', // Le da un toque más serio/profesional
                                    letterSpacing: '1px',
                                    paddingLeft: '25px',
                                    paddingRight: '25px',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#a6d936';
                                    e.currentTarget.style.transform = 'scale(1.05)'; // Crece un poquito al pasar el mouse
                                    e.currentTarget.style.boxShadow = '0 6px 15px rgba(154, 205, 50, 0.4)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#9ACD32';
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
                                }}
                            >
                                <i className="bi bi-file-earmark-pdf-fill me-2" style={{ fontSize: '1.2rem', color: '#b22222' }}></i>
                                Generar Reporte
                            </button>

                                        </div>

                                                

                            {/* TABLA AVANCES FÍSICOS (CAMPOS SOLICITADOS) */}
                            {avances.length > 0 && (

                                
                                <div className="mt-4 pt-3 border-top">

                                    
                                    <h6 className="fw-bold text-success">Control de Avances Físicos</h6>
    
                                    <div className="table-responsive">
        <table className="table table-sm table-hover align-middle text-center" style={{ minWidth: '1500px', fontSize: '0.75rem' }}>
            <thead className="table-dark">
                <tr style={{ backgroundColor: '#97fd37ff', color: '#000000ff' }}>
                    <th style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Acciones</th>
                    <th style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Mes/Año</th>
                    <th style={{ width: '340px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Peso (Kg/Lb)</th>
                    <th  style={{ width: '340px', backgroundColor: '#6b6d69ff'}}>IMC</th>
                    <th  style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Tórax</th>
                    <th  style={{ width: '100px' , backgroundColor: '#6b6d69ff'}}>Pecho</th>
                    <th  style={{ width: '100px' , backgroundColor: '#6b6d69ff'}}>Espalda</th>
                    <th  style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Abdomen</th>
                    <th  style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Hombro</th>
                    <th  style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Brazos</th>
                    <th  style={{ width: '100px' , backgroundColor: '#6b6d69ff'}}>Biceps</th>
                    <th  style={{ width: '100px' , backgroundColor: '#6b6d69ff'}}>triceps</th>
                    <th  style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Antebrazo</th>
                    <th  style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Glúteos</th>
                    <th  style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Pierna</th>
                    <th style={{ width: '100px', backgroundColor: '#6b6d69ff' }}>Cuádriceps</th>
                    <th style={{ width: '100px' , backgroundColor: '#6b6d69ff'}}>Femoral</th>
                    <th style={{ width: '140px', position: 'sticky', top: 0, backgroundColor: 'inherit', color: 'inherit' }}>Panto.</th>
                </tr>
    

    

            </thead>
            <tbody>
                {avances.map((av, idx) => (
                    <tr key={idx} className={av.editando ? "table-warning" : ""}>
                        {/* ACCIONES */}
                        <td>
                            {av.editando ? (
                                <div className="btn-group btn-group-sm">
                                    <button className="btn btn-success" onClick={() => this.guardarCambiosAvance(idx)}>OK</button>
                                    <button className="btn btn-secondary" onClick={() => this.cancelarEdicionAvance(idx)}>X</button>
                                </div>
                            ) : (
                                <div className="btn-group btn-group-sm">
                                    <button className="btn btn-outline-primary" onClick={() => this.editarAvance(idx)}>Editar</button>
                                    <button className="btn btn-outline-danger" onClick={() => this.eliminarAvance(av.id)}>Borrar</button>
                                </div>
                            )}
                        </td>

                        {/* MES / AÑO */}
                        <td>
                            {av.editando ? (
                                <div className="d-flex gap-1">
                                    <input type="text" className="form-control form-control-sm px-1" name="mes" value={av.mes} onChange={(e) => this.handleEditAvance(idx, e)} />
                                    <input type="text" className="form-control form-control-sm px-1" name="año" value={av.año} onChange={(e) => this.handleEditAvance(idx, e)} />
                                </div>
                            ) : `${av.mes}/${av.año}`}
                        </td>

                        {/* PESO (Dispara IMC) */}
                        <td>
                            {av.editando ? (
                                <div className="d-flex gap-1">
                                    <input type="number" name="peso_kg" className="form-control form-control-sm" value={av.peso_kg} onChange={(e) => this.handleEditAvance(idx, e)} placeholder="kg" />
                                    <input type="number" name="peso_lb" className="form-control form-control-sm" value={av.peso_lb} onChange={(e) => this.handleEditAvance(idx, e)} placeholder="lb" />
                                </div>
                            ) : `${av.peso_kg} / ${av.peso_lb}`}
                        </td>

                        {/* IMC (Solo lectura) */}
                        {/* IMC (Solo lectura con color dinámico) */}
                            <td>
                                <input 
                                    type="number" 
                                    className="form-control form-control-sm fw-bold" 
                                    style={{ 
                                        backgroundColor: parseFloat(av.imc) > 25 ? '#ffcc00' : '#ccff00',
                                        color: '#000'
                                    }}
                                    value={av.imc} 
                                    readOnly 
                                />
                            </td>


                        {/* TÓRAX (Dispara Pecho/Espalda) */}
                        <td>
                            {av.editando ? <input type="number" name="torax" className="form-control form-control-sm border-primary" value={av.torax} onChange={(e) => this.handleEditAvance(idx, e)} /> : av.torax}
                        </td>

                        {/* PECHO Y ESPALDA (Automáticos) */}
                        <td><input type="number" className="form-control form-control-sm bg-light" value={av.medida_pecho} readOnly /></td>
                        <td><input type="number" className="form-control form-control-sm bg-light" value={av.espalda} readOnly /></td>

                    {/* MEDIDAS MANUALES - ABDOMEN */}
                                <td>
                                    {av.editando ? (
                                        <input 
                                            type="number" 
                                            name="medida_abdomen" 
                                            className="form-control form-control-sm" 
                                            value={av.medida_abdomen} 
                                            onChange={(e) => this.handleEditAvance(idx, e)}
                                            style={{
                                                // Fondo rojo si supera el límite de riesgo metabólico
                                                backgroundColor: (
                                                    (this.state.nuevoCliente.genero === "1" && parseFloat(av.medida_abdomen) > 94) ||
                                                    (this.state.nuevoCliente.genero === "2" && parseFloat(av.medida_abdomen) > 80)
                                                ) ? '#ff5555' : '#fff',
                                                // Texto blanco si está en rojo para mejor lectura
                                                color: (
                                                    (this.state.nuevoCliente.genero === "1" && parseFloat(av.medida_abdomen) > 94) ||
                                                    (this.state.nuevoCliente.genero === "2" && parseFloat(av.medida_abdomen) > 80)
                                                ) ? '#fff' : '#000',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    ) : (
                                        <span className="fw-bold">{av.medida_abdomen}</span>
                                    )}
    </td>

                        <td>{av.editando ? <input type="number" name="medida_hombro" className="form-control form-control-sm" value={av.medida_hombro} onChange={(e) => this.handleEditAvance(idx, e)} /> : av.medida_hombro}</td>
                        <td>{av.editando ? <input type="number" name="brazos" className="form-control form-control-sm" value={av.brazos} onChange={(e) => this.handleEditAvance(idx, e)} /> : av.brazos}</td>
                    {/* Input de Bíceps */}
                            <td>
                                <input 
                                    name="medida_bicep" 
                                    value={av.medida_bicep} 
                                    readOnly 
                                    className="form-control form-control-sm bg-light" 
                                />
                            </td>

                            {/* Input de Tríceps */}
                            <td>
                                <input 
                                    name="medida_tricep" 
                                    value={av.medida_tricep} 
                                    readOnly 
                                    className="form-control form-control-sm bg-light" 
                                />
    </td>
                        <td>{av.editando ? <input type="number" name="medida_antebrazo" className="form-control form-control-sm" value={av.medida_antebrazo} onChange={(e) => this.handleEditAvance(idx, e)} /> : av.medida_antebrazo}</td>
                        <td>{av.editando ? <input type="number" name="medida_gluteos" className="form-control form-control-sm" value={av.medida_gluteos} onChange={(e) => this.handleEditAvance(idx, e)} /> : av.medida_gluteos}</td>
                    {/* Input PIERNA (Manual) */}
                            <td>
                                <input name="medida_piena" type="number" className="form-control form-control-sm" 
                                    value={av.medida_piena} onChange={(e) => this.handleEditAvance(idx, e)} />
                            </td>

                            {/* Input CUÁDRICEPS (Auto) */}
                            <td>
                                <input name="medida_cuadriceps" value={av.medida_cuadriceps} readOnly 
                                    className="form-control form-control-sm bg-light" />
                            </td>

                            {/* Input FEMORAL (Auto) */}
                            <td>
                                <input name="medida_femoral" value={av.medida_femoral} readOnly 
                                    className="form-control form-control-sm bg-light" />
                            </td>

                        <td>{av.editando ? <input type="number" name="medida_pantorrilla" className="form-control form-control-sm" value={av.medida_pantorrilla} onChange={(e) => this.handleEditAvance(idx, e)} /> : av.medida_pantorrilla}</td>
                    </tr>
                ))}
            </tbody>
        </table>

    </div>


                            <div className="control-avances-fisicos">
                                                <h3>Historial de IMC</h3>
                                                            {/* Contenedor con altura fija para que no se pierda */}
                                            {/* Añadimos el id="grafica-imc" para que html2canvas pueda capturarlo */}
                                        <div id="grafica-imc" style={{ width: '100%', height: '350px', minHeight: '350px', display: 'block', backgroundColor: 'white' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart 
                                                    data={this.getDatosIMC()} 
                                                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="fecha" />
                                                    <YAxis domain={['auto', 'auto']} />
                                                    <Tooltip />
                                                    <Line 
                                                        type="monotone" 
                                                        dataKey="imc" 
                                                        stroke="#4e73df" 
                                                        strokeWidth={3} 
                                                        dot={{ r: 6 }} 
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>


                                </div>



                            <div className="row mt-3 px-3">
                                <div className="col-12">
                                    <div className="d-flex justify-content-between text-center small p-2 border rounded bg-light">
                                        <div><span className="badge bg-warning text-dark">&lt; 18.5</span><br/>Bajo Peso</div>
                                        <div><span className="badge bg-success">18.5 - 24.9</span><br/>Normal</div>
                                        <div><span className="badge bg-warning text-dark">25.0 - 29.9</span><br/>Sobrepeso</div>
                                        <div><span className="badge bg-danger">30.0 +</span><br/>Obesidad</div>
                                    </div>
                                </div>
                            </div>

                                </div>
                            )}
                        </div>
                    </div>




                  {/* MODAL ARTICULOS PARA REPORTE*/}
            {this.state.mostrarModalReporteArt && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
            <div className="modal-dialog modal-md modal-dialog-centered" role="document">
                <div className="modal-content" style={{ borderRadius: '8px', border: '2px solid #ADFF2F', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}> {/* Borde verde lima */}
                    
                    {/* Cabecera del Modal con fondo verde limón */}
                    <div className="modal-header text-dark" style={{ backgroundColor: '#ADFF2F', borderTopLeftRadius: '6px', borderTopRightRadius: '6px', borderBottom: '2px solid #ADFF2F' }}>
                        <h5 className="modal-title fw-bold">🛒 Seleccione los Productos</h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={() => this.setState({ mostrarModalReporteArt: false })}
                            style={{ cursor: 'pointer' }}
                        ></button>
                    </div>

                    {/* Cuerpo del Modal con la lista limpia */}
                    <div className="modal-body" style={{ maxHeight: '350px', overflowY: 'auto', padding: '15px' }}>
                        <p className="text-muted small mb-3">Marque uno o varios artículos para consolidar en el PDF:</p>
                        
                        <table className="table table-hover table-striped alignment-middle">
                            <thead style={{ backgroundColor: '#f0fff0', position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr className="text-success">
                                    <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                                    <th>Nombre del Producto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {this.state.listaArticulos.map((art) => {
                                    const estaMarcado = this.state.articulosSeleccionadosModal.includes(art.id_art);
                                    return (
                                        <tr 
                                            key={art.id_art} 
                                            onClick={() => this.handleCheckArticuloModal(art.id_art)}
                                            style={{ cursor: 'pointer' }}
                                            className={estaMarcado ? 'table-success' : ''} // Fondo verde/limón suave al marcarse
                                        >
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox" 
                                                    className="form-check-input border-success" // Borde del checkbox verde
                                                    checked={estaMarcado}
                                                    onChange={() => {}} // Manejado por el onClick de la fila completa
                                                    style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                                />
                                            </td>
                                            <td className="font-weight-bold text-secondary" style={{ fontSize: '14px' }}>
                                                Id: {art.id_art} - {art.nombre_art}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Acciones inferiores */}
                    <div className="modal-footer d-flex justify-content-between align-items-center" style={{ backgroundColor: '#f8f9fa', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px' }}>
                        {/* BOTONES DE SELECCIÓN MASIVA ESTILO VERDE */}
                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-success fw-bold"
                                onClick={() => {
                                    const todosLosIds = this.state.listaArticulos.map(a => a.id_art);
                                    this.setState({ articulosSeleccionadosModal: todosLosIds });
                                }}
                            >
                                ☑️ Marcar todos
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger fw-bold"
                                onClick={() => this.setState({ articulosSeleccionadosModal: [] })}
                            >
                                ⬛ Desmarcar todos
                            </button>
                        </div>

                        {/* BOTONES DE ACCIÓN PRINCIPALES */}
                        <div className="d-flex gap-2">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => this.setState({ mostrarModalReporteArt: false })}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                className="btn fw-bold text-white d-flex align-items-center gap-2" 
                                style={{ backgroundColor: '#40ff2fff' }} // Botón principal Verde Lima
                                onClick={this.procesarReporteDesdeModal}
                                disabled={this.state.enviando}
                            >
                                {this.state.enviando ? '⏳ Consultando API...' : '🖨️ Generar Reporte PDF'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )}



                            {/* MODAL ARTICULOS */}
                                {this.state.mostrarModalArt && (
                                        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                            <div className="modal-dialog modal-lg">
                                                <div className="modal-content" style={{ border: '2px solid #32CD32' }}> {/* Borde verde lima */}
                                                    {/* Header con fondo verde limón */}
                                                    <div className="modal-header text-dark" style={{ backgroundColor: '#ADFF2F', borderBottom: '2px solid #32CD32' }}>
                                                        <h5 className="modal-title fw-bold">
                                                            {this.state.editandoArt ? '📝 Editar' : '✨ Nuevo'} Artículo
                                                        </h5>
                                                        <button type="button" className="btn-close" onClick={() => this.setState({ mostrarModalArt: false })}></button>
                                                    </div>
                                                    
                                                    <form onSubmit={this.guardarArticulo}>
                                                        <div className="modal-body">
                                                            <div className="row g-3">
                                                                <div className="col-md-8">
                                                                    <label className="form-label fw-bold">Nombre / Descripción</label>
                                                                    <input type="text" className="form-control border-success" required
                                                                        value={this.state.formArticulo.nombre_art}
                                                                        onChange={(e) => this.setState({ formArticulo: { ...this.state.formArticulo, nombre_art: e.target.value } })} />
                                                                </div>
                                                                <div className="col-md-4">
                                                                    <label className="form-label fw-bold">Precio Venta</label>
                                                                    <div className="input-group">
                                                                        <span className="input-group-text bg-light border-success text-success">$</span>
                                                                        <input type="number" step="0.01" className="form-control border-success" required
                                                                            value={this.state.formArticulo.precio_venta}
                                                                            onChange={(e) => this.setState({ formArticulo: { ...this.state.formArticulo, precio_venta: e.target.value } })} />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {!this.state.editandoArt && (
                                                                <div className="mt-4">
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <h6 className="text-success fw-bold">Artículos existentes:</h6>
                                                                        <input 
                                                                            type="text" 
                                                                            className="form-control form-control-sm w-50 border-success" 
                                                                            placeholder="🔍 Buscar artículo..."
                                                                            style={{ backgroundColor: '#f9fff0' }}
                                                                            value={this.state.busquedaArt}
                                                                            onChange={(e) => this.setState({ busquedaArt: e.target.value })}
                                                                        />
                                                                    </div>
                                                                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ADFF2F', borderRadius: '4px' }}>
                                                                        <table className="table table-sm table-hover mb-0">
                                                                            <thead style={{ backgroundColor: '#f0fff0', position: 'sticky', top: 0 }}>
                                                                                <tr className="text-success"><th>Nombre</th><th className="text-end">Acciones</th></tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {this.state.listaArticulos
                                                                                    .filter(art => (art.nombre_art || '').toLowerCase().includes((this.state.busquedaArt || '').toLowerCase()))
                                                                                    .map(art => (
                                                                                        <tr key={art.id_art}>
                                                                                            <td>{art.nombre_art}</td>
                                                                                            <td className="text-end">
                                                                                                <button type="button" className="btn btn-sm btn-outline-success me-1" onClick={() => this.abrirModalArticulo(art)}>📝</button>
                                                                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => this.eliminarArticulo(art.id_art)}>🗑️</button>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))
                                                                                }
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="modal-footer bg-light">
                                                            <button type="button" className="btn btn-secondary" onClick={() => this.setState({ mostrarModalArt: false })}>Cerrar</button>
                                                            {/* Botón principal estilo Verde Lima */}
                                                            <button type="submit" className="btn fw-bold" style={{ backgroundColor: '#32CD32', color: 'white' }}>
                                                                {this.state.editandoArt ? 'Actualizar Artículo' : 'Guardar Artículo'}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>
                            )}


                    {/* MODAL CLIENTE */}
                    {this.state.mostrarModal && (
                            <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                            <div className="modal-dialog modal-lg">
                                <div className="modal-content" style={{ border: 'none' }}>
                                    <div className="modal-header" style={{ backgroundColor: '#cbff2fff', color: '#000' }}>
                                        <h5 className="modal-title" style={{ fontWeight: 'bold' }}>
                                            {this.state.editandoCliente ? '📝 Editando' : '👤 Nuevo'} Cliente
                                        </h5>
                                        <button 
                                            type="button" 
                                            className="btn-close" 
                                            style={{ filter: 'brightness(0)' }} // Hace la X negra para contrastar con el limón
                                            onClick={() => this.setState({ mostrarModal: false })}
                                        ></button>
                                    </div>

                                            <form onSubmit={this.guardarNuevoCliente}>
                                                <div className="modal-body p-2"> {/* Reducimos padding */}
                                                    <div className="row g-2 p-2 bg-light rounded border mb-2">
                                                        
                                                        {/* Fila 1: Nombres y Apellidos */}
                                                        <div className="col-md-6">
                                                            <label className="small fw-bold">Nombres</label>
                                                            <input type="text" className="form-control form-control-sm" required value={this.state.nuevoCliente.nombres} onChange={(e) => this.setState({ nuevoCliente: {...this.state.nuevoCliente, nombres: e.target.value}})} />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="small fw-bold">Apellidos</label>
                                                            <input type="text" className="form-control form-control-sm" required value={this.state.nuevoCliente.apellidos} onChange={(e) => this.setState({ nuevoCliente: {...this.state.nuevoCliente, apellidos: e.target.value}})} />
                                                        </div>

                                                        {/* Fila 2: Teléfono, Nacimiento y Edad */}
                                                        <div className="col-md-4">
                                                            <label className="small fw-bold">Teléfono</label>
                                                            <input type="text" className="form-control form-control-sm" value={this.state.nuevoCliente.telefono} onChange={(e) => this.setState({ nuevoCliente: {...this.state.nuevoCliente, telefono: e.target.value}})} />
                                                        </div>
                                                        <div className="col-md-5">
                                                            <label className="small fw-bold">Nacimiento</label>
                                                            <input type="date" className="form-control form-control-sm" value={this.state.nuevoCliente.fecha_nacimiento} onChange={this.handleFechaNacimientoChange} />
                                                        </div>
                                                        <div className="col-md-3">
                                                            <label className="small fw-bold">Edad</label>
                                                            <input type="text" className="form-control form-control-sm bg-white" value={this.state.nuevoCliente.edad} readOnly />
                                                        </div>

                                                                {/* Fila 3: Género, Estado y Altura */}
                                                                <div className="col-md-4">
                                                                    <label className="small fw-bold">Género</label>
                                                                    <select className="form-select form-select-sm" value={this.state.nuevoCliente.genero} onChange={(e) => this.setState({ nuevoCliente: { ...this.state.nuevoCliente, genero: e.target.value } })}>
                                                                        <option value="">...</option>
                                                                        <option value="1">Masculino</option>
                                                                        <option value="2">Femenino</option>
                                                                    </select>
                                                                </div>
                                                                <div className="col-md-4">
                                                                    <label className="small fw-bold">Estado</label>
                                                                    <select className="form-select form-select-sm" value={this.state.nuevoCliente.estado_cle} onChange={(e) => this.setState({ nuevoCliente: { ...this.state.nuevoCliente, estado_cle: parseInt(e.target.value) } })}>
                                                                        <option value={1}>Activo</option>
                                                                        <option value={2}>Inactivo</option>
                                                                    </select>
                                                                </div>
                                                                <div className="col-md-4">
                                                                    <label className="small fw-bold">Altura (mts)</label>
                                                                    <input type="number" step="0.01" className="form-control form-control-sm" value={this.state.nuevoCliente.altura} onChange={(e) => this.setState({ nuevoCliente: { ...this.state.nuevoCliente, altura: e.target.value } })} />
                                                                </div>

                                                                {/* Fila 4: Vigencia (Fechas en la misma línea) */}
                                                                <div className="col-md-6">
                                                                    <label className="small fw-bold">Desde</label>
                                                                    <input type="date" className="form-control form-control-sm" value={this.state.nuevoCliente.fecha_computador || ''} onChange={(e) => this.setState({ nuevoCliente: { ...this.state.nuevoCliente, fecha_desde: e.target.value } })} />
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <label className="small fw-bold">Hasta</label>
                                                                    <input type="date" className="form-control form-control-sm" value={this.state.nuevoCliente.fecha_hasta || ''} onChange={(e) => this.setState({ nuevoCliente: { ...this.state.nuevoCliente, fecha_hasta: e.target.value } })} />
                                                                </div>
                                                            </div>

                                                            {/* Botonera */}
                                                            <div className="d-flex justify-content-end gap-2 mt-2">
                                                                <button type="button" className="btn btn-dark btn-sm fw-bold" style={{ backgroundColor: '#cbff2fff', color: '#000', border: 'none' }} onClick={() => this.abrirModalCliente()}>Nuevo</button>
                                                                <button type="submit" className="btn btn-dark btn-sm fw-bold" style={{ backgroundColor: '#cbff2fff', color: '#000', border: 'none' }}>Guardar</button>
                                                            </div>
                                                        




                                                                                                {/* LISTA CON BUSCADOR */}
                                                                                                <div className="d-flex justify-content-between mb-2">
                                                                                                    <h6>Clientes Registrados:</h6>
                                                                                                    <input type="text" className="form-control form-control-sm w-50" placeholder="🔍 Buscar cliente..." 
                                                                                                        value={this.state.busquedaClienteModal} 
                                                                                                        onChange={(e) => this.setState({ busquedaClienteModal: e.target.value })} />
                                                                                                </div>
                                                                                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd' }}>
                                                                                                    <table className="table table-sm table-hover mb-0">
                                                                                                        <thead className="table-light sticky-top">
                                                                                                            <tr><th>Nombre Completo</th><th className="text-end">Acciones</th></tr>
                                                                                                        </thead>
                                                                                                            <tbody>
                                                                                                                {this.state.listaClientes
                                                                                                                    .filter(c => {
                                                                                                                        // Buscador que no falla: busca en nombres o Nombres, apellidos o Apellidos
                                                                                                                        const nom = (c.nombres || c.Nombres || '').toLowerCase();
                                                                                                                        const ape = (c.apellidos || c.Apellidos || '').toLowerCase();
                                                                                                                        const busqueda = (this.state.busquedaClienteModal || '').toLowerCase();
                                                                                                                        return nom.includes(busqueda) || ape.includes(busqueda);
                                                                                                                    })
                                                                                                                    .map(c => (
                                                                                                                        <tr key={c.id_cle}>
                                                                                                                            {/* Intentamos leer minúscula, si no existe, leemos mayúscula */}
                                                                                                                            <td>
                                                                                                                                {c.nombres || c.Nombres} {c.apellidos || c.Apellidos}
                                                                                                                            </td>
                                                                                                                            <td className="text-end px-3">
                                                                                                                            <button 
                                                                                                                                    type="button" 
                                                                                                                                    className="btn btn-sm me-1" 
                                                                                                                                    style={{ 
                                                                                                                                        borderColor: '#cbff2fff', 
                                                                                                                                        color: '#7aab00', // Un tono un poco más oscuro para que el icono resalte
                                                                                                                                        backgroundColor: 'transparent',
                                                                                                                                        transition: '0.3s'
                                                                                                                                    }}
                                                                                                                                    onClick={() => this.abrirModalCliente(c)}
                                                                                                                                    // Efecto hover para que se pinte de verde limón al pasar el mouse
                                                                                                                                    onMouseOver={(e) => {
                                                                                                                                        e.target.style.backgroundColor = '#cbff2fff';
                                                                                                                                        e.target.style.color = '#000';
                                                                                                                                    }}
                                                                                                                                    onMouseOut={(e) => {
                                                                                                                                        e.target.style.backgroundColor = 'transparent';
                                                                                                                                        e.target.style.color = '#cbff2fff';
                                                                                                                                    }}
                                                                                                                                >
                                                                                                                                    📝
                                                                                                                                </button>

                                                                                                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => this.eliminarCliente(c.id_cle)}>🗑️</button>
                                                                                                                            </td>
                                                                                                                        </tr>
                                                                                                                    ))}
                                                                                                            </tbody>


                                                                                                    </table>
                                                                                                </div>
                                                                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}


                </div>
            );
        }
    }

    export default FacturacionCliente;
