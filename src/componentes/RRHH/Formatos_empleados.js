import React, { useEffect, useState } from 'react';
import { fetchWithFallback } from '../../config';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import logoBellaflor from '../../imagenes/Bellaflor.jpg';

const FichaEmpleado = () => {
  const [empleado, setEmpleado] = useState(null);
  const [loading, setLoading] = useState(true);

  const [user] = useState(() => {
    const savedUser = localStorage.getItem("userData");
    const defaultUser = {
      id: null,
      nombre: 'Usuario',
      idperfil: null,
      id_empresa: '',
      departamento: '',
      id_dartis: null
    };
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return defaultUser;
      }
    }
    return defaultUser;
  });

  const obtenerFichaempleado = async () => {
    if (!user || !user.id_dartis) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const endpoint = `/api/RRHH/fichampleado?idemp=${user.id_dartis}`;
      const data = await fetchWithFallback(endpoint);
      if (data && data.length > 0) {
        setEmpleado(data[0]);
      } else {
        toast.info('No se encontró la ficha del empleado');
      }
    } catch (error) {
      console.error("Error al procesar la petición:", error.message);
      toast.error('No se pudo cargar la ficha del empleado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerFichaempleado();
  }, [user.id_dartis]);

  // Generador de Certificados PDF con Logo Centrado
  const generarCertificadoPDF = (conSueldo = false) => {
    if (!empleado) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Logotipo BELLAFLOR centrado en la parte superior
    try {
      const anchoLogo = 88;
      const altoLogo = 18;
      const xCentrado = (210 - anchoLogo) / 2; // 61 mm
      doc.addImage(logoBellaflor, 'JPEG', xCentrado, 15, anchoLogo, altoLogo);
    } catch (err) {
      console.warn('No se pudo incrustar el logotipo en el PDF:', err);
    }

    doc.setFont('helvetica');
    doc.setTextColor(30, 30, 30);

    // 2. Título del documento
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    const titulo = conSueldo ? 'CERTIFICADO DE INGRESOS' : 'CERTIFICADO LABORAL';
    doc.text(titulo, 105, 48, { align: 'center' });

    // 3. Fecha actual
    const hoy = new Date();
    const fechaActual = `Puembo, ${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaActual, 185, 61, { align: 'right' });

    // 4. Destinatario
    doc.setFont('helvetica', 'bold');
    doc.text('A QUIEN CORRESPONDA:', 25, 75);

    // 5. Datos del empleado
    const empresaNombre = empleado.empresa || 'EXPOFLOR CIA. LTDA.';
    const nombre = (empleado.nombreComercial || '').toUpperCase();
    const cedula = empleado.Identificacion || 'N/A';
    const fechaIngreso = empleado.FechaIngreso ? String(empleado.FechaIngreso).split('T')[0] : 'N/A';
    const cargo = empleado.Cargo || empleado.PuestoTrabajo || 'Trabajador Agrícola';
    const sueldo = empleado.SueldoBase ? Number(empleado.SueldoBase).toFixed(4) : '0.0000';
    const trato = empleado.Sexo === 'F' || empleado.Sexo === 'Femenino' ? 'la señora' : 'el señor';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (!conSueldo) {
      const parrafo1 = `La empresa ${empresaNombre}, del Grupo BELLAFLOR, certifica que ${trato} ${nombre}, portador(a) de la cédula de identidad No. ${cedula}, forma parte de nuestro equipo de trabajo desde el ${fechaIngreso}. Actualmente ocupa el cargo de ${cargo}, cumpliendo con las funciones asignadas bajo los estándares de calidad y eficiencia establecidos por la organización.`;
      const parrafo2 = `Este certificado se emite para constancia de su relación laboral vigente y puede ser utilizado por el/la interesado(a) conforme a sus necesidades.`;

      const lineas1 = doc.splitTextToSize(parrafo1, 160);
      doc.text(lineas1, 25, 89, { align: 'justify', maxWidth: 160 });

      const ySiguiente = 89 + (lineas1.length * 6) + 6;
      const lineas2 = doc.splitTextToSize(parrafo2, 160);
      doc.text(lineas2, 25, ySiguiente, { align: 'justify', maxWidth: 160 });

      const yFirma = ySiguiente + 45;
      doc.text('Atentamente,', 25, yFirma);
      doc.line(25, yFirma + 25, 95, yFirma + 25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('FLORES FLORES BLANCA JESSICA', 25, yFirma + 30);
      doc.setFont('helvetica', 'normal');
      doc.text('Asistente de Recursos Humanos', 25, yFirma + 35);
      doc.setFont('helvetica', 'bold');
      doc.text('EXPOFLOR CIA. LTDA.', 25, yFirma + 40);
      doc.setFont('helvetica', 'normal');
      doc.text('Correo: jflores@bellaflor-group.com', 25, yFirma + 45);
      doc.text('Teléfono: 099 825 3782', 25, yFirma + 50);
    } else {
      const parrafo1 = `La empresa ${empresaNombre}, del Grupo BELLAFLOR, certifica que ${trato} ${nombre}, portador(a) de la cédula de identidad No. ${cedula}, mantiene una relación laboral vigente con la organización desde el ${fechaIngreso} y actualmente desempeña el cargo de ${cargo}.`;
      const parrafo2 = `Su sueldo básico mensual es de USD ${sueldo}, más los beneficios de ley que correspondan.`;
      const parrafo3 = `Se expide el presente certificado a petición de la persona interesada para los fines que estime pertinentes.`;

      const lineas1 = doc.splitTextToSize(parrafo1, 160);
      doc.text(lineas1, 25, 89, { align: 'justify', maxWidth: 160 });

      const y2 = 89 + (lineas1.length * 6) + 6;
      doc.text(parrafo2, 25, y2);

      const y3 = y2 + 16;
      doc.text(parrafo3, 25, y3);

      const yFirma = y3 + 35;
      doc.text('Atentamente,', 25, yFirma);
      doc.line(25, yFirma + 25, 95, yFirma + 25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('HIDALGO NIETO JESSICA ALEXANDRA', 25, yFirma + 30);
      doc.setFont('helvetica', 'normal');
      doc.text('Analista de Recursos Humanos', 25, yFirma + 35);
      doc.setFont('helvetica', 'bold');
      doc.text('EXPOFLOR CIA. LTDA.', 25, yFirma + 40);
      doc.setFont('helvetica', 'normal');
      doc.text('Correo: jhidalgo@bellaflor-group.com', 25, yFirma + 45);
      doc.text('Teléfono: 099 825 3782', 25, yFirma + 50);
    }

    const nombreArchivo = conSueldo
      ? `Certificado_Ingresos_${cedula}.pdf`
      : `Certificado_Laboral_${cedula}.pdf`;

    doc.save(nombreArchivo);
    toast.success('Certificado descargado correctamente');
  };
  if (loading) {
    return (
      <div style={styles.center}>
        <h3>Cargando información del empleado...</h3>
      </div>
    );
  }

  if (!empleado) {
    return (
      <div style={styles.center}>
        <h3>No hay datos disponibles para mostrar.</h3>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Encabezado Simple del Empleado */}
      <div style={styles.headerCard}>
        <div style={styles.avatar}>{empleado.nombreComercial?.charAt(0)}</div>
        <div style={styles.headerInfo}>
          <h2 style={styles.empleadoNombre}>{empleado.nombreComercial}</h2>
          <p style={styles.empleadoPuesto}>
            {empleado.Cargo || empleado.PuestoTrabajo} —{' '}
            <span style={{ color: '#666' }}>{empleado.empresa || 'EXPOFLOR CIA. LTDA.'}</span>
          </p>
        </div>
      </div>

      {/* Título de Sección */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={styles.tituloSeccion}>Emisión de Certificados en Línea</h3>
        <p style={styles.subtituloSeccion}>
          Selecciona el tipo de documento que necesitas descargar en formato PDF:
        </p>
      </div>

      {/* Tarjetas de Certificados con Imagen, Explicación y Botón */}
      <div style={styles.cardsGrid}>
        {/* TARJETA 1: CERTIFICADO LABORAL (SIN SUELDO) */}
        <div style={styles.certCard}>
          <div style={styles.iconContainerBlue}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0056b3"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>

          <h4 style={styles.cardTitle}>Certificado Laboral (Sin Sueldo)</h4>

          <p style={styles.cardDescription}>
            Acredita tu relación laboral vigente con la empresa, detallando tu fecha de ingreso y
            el cargo que desempeñas actualmente. No incluye información salarial. Ideal para
            trámites administrativos, guarderías o referencias personales.
          </p>

          <button
            onClick={() => generarCertificadoPDF(false)}
            style={styles.btnSecundario}
          >
            Descargar Certificado Laboral (PDF)
          </button>
        </div>

        {/* TARJETA 2: CERTIFICADO DE INGRESOS (CON SUELDO) */}
        <div style={styles.certCard}>
          <div style={styles.iconContainerGreen}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2b8a3e"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
              <circle cx="12" cy="14.5" r="2" />
            </svg>
          </div>

          <h4 style={styles.cardTitle}>Certificado de Ingresos (Con Sueldo)</h4>

          <p style={styles.cardDescription}>
            Certifica tu vínculo laboral activo, cargo actual, antigüedad y el valor de tu sueldo
            básico mensual más beneficios de ley. Recomendado para solicitudes bancarias, créditos,
            arriendos o trámites financieros.
          </p>

          <button
            onClick={() => generarCertificadoPDF(true)}
            style={styles.btnPrimario}
          >
            Descargar Certificado con Sueldo (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};
const styles = {
  container: {
    maxWidth: '900px',
    margin: '30px auto',
    padding: '0 20px',
    fontFamily: '"Segoe UI", Roboto, sans-serif',
    color: '#333'
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh'
  },
  headerCard: {
    display: 'flex',
    alignItems: 'center',
    background: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
    border: '1px solid #e9ecef',
    marginBottom: '28px',
    gap: '20px'
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#0056b3',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    flexShrink: 0
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  empleadoNombre: {
    margin: 0,
    fontSize: '21px',
    fontWeight: '600',
    color: '#111'
  },
  empleadoPuesto: {
    margin: '4px 0 0 0',
    color: '#0056b3',
    fontWeight: '500',
    fontSize: '14px'
  },
  tituloSeccion: {
    margin: '0 0 4px 0',
    fontSize: '19px',
    fontWeight: '600',
    color: '#111'
  },
  subtituloSeccion: {
    margin: 0,
    fontSize: '14px',
    color: '#6c757d'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px'
  },
  certCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '28px 24px',
    border: '1px solid #e9ecef',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    justifyContent: 'space-between'
  },
  iconContainerBlue: {
    width: '84px',
    height: '84px',
    borderRadius: '50%',
    backgroundColor: '#e7f1ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '18px'
  },
  iconContainerGreen: {
    width: '84px',
    height: '84px',
    borderRadius: '50%',
    backgroundColor: '#ebfbee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '18px'
  },
  cardTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#111'
  },
  cardDescription: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    lineHeight: '1.55',
    color: '#555'
  },
  btnSecundario: {
    width: '100%',
    padding: '12px 18px',
    backgroundColor: '#0056b3',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.2s'
  },
  btnPrimario: {
    width: '100%',
    padding: '12px 18px',
    backgroundColor: '#2b8a3e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.2s'
  }
};

export default FichaEmpleado;
