import React, { useEffect, useState, useRef } from 'react';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner'; 
import SignatureCanvas from 'react-signature-canvas'; 
import { PDFDocument, StandardFonts } from 'pdf-lib'; 

const Informe = () => { 
  const [data, setData] = useState(); 
  const [loading, setLoading] = useState(true); 
 
  const [pdfArchivo, setPdfArchivo] = useState(null); 
  const [nombreArchivoOriginal, setNombreArchivoOriginal] = useState(""); 
  const [pdfOriginalUrl, setPdfOriginalUrl] = useState(null); 
  const [pdfFirmadoUrl, setPdfFirmadoUrl] = useState(null); 
  const [pdfBytesFinales, setPdfBytesFinales] = useState(null); 
  const [fileHandle, setFileHandle] = useState(null); 
  const firmaRef = useRef(null); 

  const obtenerData = async () => { 
    try { 
      setLoading(true); 
      const endpoint = '/api/RRHH/apidata'; 
      const result = await fetchWithFallback(endpoint); 
      if (result) { 
        setData(result); 
      } 
    } catch (error) { 
      console.error("Error al cargar registros:", error.message); 
    } finally { 
      setLoading(false); 
    }
  }; 

  useEffect(() => {
    obtenerData(); 
  }, []); 
  const seleccionarArchivo = async () => { 
    if (window.showOpenFilePicker) { 
      try { 
        const [handle] = await window.showOpenFilePicker({ 
          types: [{ 
            description: 'Documentos PDF', 
            accept: { 'application/pdf': ['.pdf'] }, 
          }], 
          multiple: false, 
        }); 
        const file = await handle.getFile(); 
        setFileHandle(handle); 
        cargarDatosPdf(file); 
      } catch (error) { 
        if (error.name !== 'AbortError') { 
          toast.error("Error al abrir el archivo."); 
        } 
      } 
    } else { 
      document.getElementById('input-pdf-oculto').click(); 
    } 
  };

  const cargarDatosPdf = (file) => { 
    setPdfArchivo(file); 
    setNombreArchivoOriginal(file.name); 
    setPdfFirmadoUrl(null); 
    setPdfBytesFinales(null); 
    const urlOriginal = URL.createObjectURL(file); 
    setPdfOriginalUrl(urlOriginal); 
    toast.success("Documento cargado correctamente."); 
  }; 

  const manejarArchivoInputFallback = (e) => { 
    const file = e.target.files?.[0]; 
    if (file) { 
      setFileHandle(null); 
      cargarDatosPdf(file); 
    } 
  }; 

  const limpiarFirma = () => { 
    if (firmaRef.current) firmaRef.current.clear(); 
  }; 
  const guardarInformeFirmado = async () => { 
    if (!pdfArchivo) { 
      return toast.error("Debe cargar un documento PDF antes de firmar."); 
    } 
    if (!firmaRef.current || firmaRef.current.isEmpty()) { 
      return toast.error("Por favor, realice su firma en el panel."); 
    } 

    try { 
      toast.loading("Generando documento firmado...", { id: "generando-pdf" }); 
      const canvasNativo = firmaRef.current.getCanvas(); 
      const urlFirmaBase64 = canvasNativo.toDataURL('image/png'); 
      const arrayBuffer = await pdfArchivo.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const firmaImagen = await pdfDoc.embedPng(urlFirmaBase64); 
      const paginas = pdfDoc.getPages(); 
      const ahora = new Date(); 
      const textoFechaHora = `Firmado el: ${ahora.toLocaleDateString()} a las ${ahora.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}`; 
      const fuenteCursiva = await pdfDoc.embedFont(StandardFonts.HelveticaOblique); 

      paginas.forEach((pagina) => { 
        const { width } = pagina.getSize(); 
        pagina.drawImage(firmaImagen, { 
          x: width - 230, 
          y: 65, 
          width: 120, 
          height: 60, 
        }); 
        pagina.drawText(textoFechaHora, { 
          x: width - 230, 
          y: 58, 
          size: 7, 
          font: fuenteCursiva, 
        }); 
      }); 

      const pdfBytesModificado = await pdfDoc.save(); 
      setPdfBytesFinales(pdfBytesModificado); 
      const blob = new Blob([pdfBytesModificado], { type: 'application/pdf' }); 
      const urlDescarga = URL.createObjectURL(blob); 
 
      setPdfFirmadoUrl(urlDescarga); 
      toast.success("¡Firma estampada con éxito!", { id: "generando-pdf" }); 
    } catch (error) { 
      console.error("Error al estampar la firma:", error); 
      toast.error("No se pudo procesar la firma en el PDF", { id: "generando-pdf" }); 
    } 
  }; 

  const obtenerNombreNuevo = () => { 
    if (!nombreArchivoOriginal) return "documento_firmado.pdf"; 
    return nombreArchivoOriginal.replace(/\.pdf$/i, '_firmado.pdf'); 
  }; 
  return ( 
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#334155', boxSizing: 'border-box' }}> 
      <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Encabezado Principal */} 
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}> 
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0', color: '#0f172a', tracking: '-0.025em' }}>Módulo de Gestión</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Valida y estampa firmas digitales de forma segura.</p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', backgroundColor: 'rgba(202, 232, 85, 0.15)', color: '#0f172a', border: '1px solid #cae855' }}>
            <span style={{ h: '8px', w: '8px', height: '8px', width: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            Firma Digital Activa
          </span>
        </div> 

        {/* SECCIÓN 1: CAPTURA DE ARCHIVO PDF */} 
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '2px dashed #e2e8f0', transition: 'border-color 0.2s' }}> 
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: '0 0 6px 0' }}>1. Selecciona el Documento Original</h2> 
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px 0' }}>Carga el reporte o informe en formato PDF que deseas procesar.</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={seleccionarArchivo} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#cae855', color: '#0f172a', fontWeigth: '700', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '14px', transition: 'background-color 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b8d44b'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#cae855'}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              Examinar PDF
            </button> 
            
            <input 
              id="input-pdf-oculto" 
              type="file" 
              accept=".pdf" 
              onChange={manejarArchivoInputFallback} 
              style={{ display: 'none' }} 
            /> 

            {pdfArchivo && ( 
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', maxWidth: '100%', boxSizing: 'border-box' }}>
                <svg style={{ width: '20px', height: '20px', color: '#ef4444', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{nombreArchivoOriginal}</span>
              </div>
            )} 
          </div>
        </div> 

        {/* SECCIÓN 2: VISOR ADAPTATIVO */} 
        {(pdfFirmadoUrl || pdfOriginalUrl) && ( 
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: pdfFirmadoUrl ? '1px solid #cae855' : '1px solid #e2e8f0' }}> 
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>
                  {pdfFirmadoUrl ? "Vista Previa: Documento Firmado" : "Vista Previa: Documento Original"}
                </h2>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Verifica la disposición y contenido del archivo antes de exportar.</p>
              </div>

              {pdfFirmadoUrl && ( 
                <a 
                  href={pdfFirmadoUrl} 
                  download={obtenerNombreNuevo()} 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#0f172a', color: '#ffffff', textDecoration: 'none', fontWeight: '600', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '14px' }}
                >
                  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Descargar Copia Firmada
                </a> 
              )} 
            </div>
            
            <div style={{ width: '100%', height: '550px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}> 
              <iframe 
                src={pdfFirmadoUrl || pdfOriginalUrl} 
                title="Visor PDF" 
                style={{ width: '100%', height: '100%', border: 'none' }} 
              /> 
            </div> 
          </div> 
        )} 

        {/* SECCIÓN 3: ÁREA TÁCTIL */} 
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}> 
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>2. Panel de Firma Manuscrita</h2> 
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px 0' }}>Usa tu mouse, trackpad o lápiz óptico directamente sobre el recuadro blanco.</p>

          <div style={{ width: '100%', height: '192px', backgroundColor: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}> 
            <SignatureCanvas 
              ref={firmaRef} 
              penColor="#40dcffff" 
              canvasProps={{ 
                style: { width: '100%', height: '100%', cursor: 'crosshair', backgroundColor: '#ffffff' }
              }} 
            /> 
            <div style={{ position: 'absolute', bottom: '8px', right: '12px', pointerEvents: 'none', fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase', tracking: '0.1em' }}>Área de captura</div>
          </div> 

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> 
            <button 
              type="button"
              onClick={limpiarFirma} 
              style={{ padding: '8px 16px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: '500', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: 'background-color 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              Borrar trazo
            </button> 
            <button 
              type="button"
              onClick={guardarInformeFirmado} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#cae855', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '14px', transition: 'background-color 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b8d44b'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#cae855'}
            >
              Estampar Firma en PDF
            </button> 
          </div> 
        </div> 

      </div> 
    </div> 
  ); 
}; 

export default Informe;
