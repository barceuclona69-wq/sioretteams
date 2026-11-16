import { useState, useEffect, useRef } from 'react';

export function ModalRfid({ isOpen, onClose, transaccion, onGuardarTags }) {
  const [tagsLeidos, setTagsLeidos] = useState([]);
  const [escaneando, setEscaneando] = useState(false);
  const puertoRef = useRef(null);
  const continuarLeyendoRef = useRef(true);
  const readerRef = useRef(null); 

  // ========================================================
  // 1. APAGADO SEGURO
  // ========================================================
  async function detenerEscaneo() {
    continuarLeyendoRef.current = false;
    setEscaneando(false);

    if (puertoRef.current) {
      try {
        puertoRef.current.close(); // Cierra el WebSocket de forma limpia
      } catch (e) {
        console.error("Error al cerrar socket:", e);
      }
      puertoRef.current = null;
    }
  }

  // ========================================================
  // 2. CONTROL DEL CICLO DE VIDA (Unificado y seguro)
  // ========================================================
  useEffect(() => {
    if (isOpen) { 
      setTagsLeidos([]); 
    } 
    return () => { 
      // Al desmontarse el modal, apaga todo de forma limpia
      detenerEscaneo(); 
    }; 
  }, [isOpen]); 

  // Si el modal no está abierto, no renderizamos nada
  if (!isOpen) return null;

  // ========================================================
  // 3. INICIAR EL BUCLE DE LECTURA (Vía WebSocket Local)
  // ========================================================
    // ========================================================
  // 3. INICIAR EL BUCLE DE LECTURA (Vía WebSocket Local)
  // ========================================================
    // ========================================================
  // 3. INICIAR EL BUCLE DE LECTURA (Con Filtro de Seguridad)
  // ========================================================
  function iniciarEscaneo() { 
    try { 
      setEscaneando(true); 
      continuarLeyendoRef.current = true; 
      
      const socket = new WebSocket('ws://localhost:8080');
      puertoRef.current = socket; 
      
      socket.onmessage = (event) => {
        const datoLimpio = event.data.trim().toUpperCase();
        
        // ⚡ FILTRO ESPECTRO EN REACT: Solo acepta cadenas de exactamente 24 caracteres Hex (EPC Gen2)
        if (/^[0-9A-F]{24}$/.test(datoLimpio)) {
          setTagsLeidos((tagsActuales) => { 
            if (!tagsActuales.includes(datoLimpio)) { 
              return [...tagsActuales, datoLimpio]; 
            } 
            return tagsActuales; 
          });
        } else {
          // Descarta silenciosamente marcas de tiempo u otros textos corruptos
          console.log("Fragmento descartado por seguridad en Web:", datoLimpio);
        }
      };

      socket.onerror = (error) => {
        console.error("Error de conexión con el puente:", error);
        alert("No se pudo conectar al puente RFID local. Asegúrate de tener corriendo el comando 'node bridge.js' en tu terminal.");
        detenerEscaneo();
      };

    } catch (error) { 
      console.error("Error de inicialización:", error); 
    } 
  }



  // ========================================================
  // 4. CONFIRMAR Y ENVIAR AL COMPONENTE PADRE
  // ========================================================
  async function manejarConfirmacion() {
    await detenerEscaneo();
    onGuardarTags(transaccion.id, tagsLeidos); 
    onClose();
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={{ marginTop: 0 }}>Asignar Tags por RFID</h3>
        <p><strong>Id Transacción:</strong> #{transaccion?.id}</p>
        <p><strong>Empleado Activo:</strong> {transaccion?.nombre_empleado}</p>

        <div style={{ margin: '15px 0' }}>
          {!escaneando ? (
            <button onClick={iniciarEscaneo} style={styles.btnConectar}>Encender Lector USB</button>
          ) : (
            <button onClick={detenerEscaneo} style={styles.btnDetener}>Detener Lector</button>
          )}
        </div>

        <div style={styles.contenedorLista}>
          {tagsLeidos.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', marginTop: '50px' }}>
              Acerque los tags al lector Vulcan...
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tagsLeidos.map((tag, i) => (
                <li key={i} style={styles.itemTag}>🏷️ {tag}</li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={styles.btnCancelar}>Cancelar</button>
          <button 
            onClick={manejarConfirmacion} 
            disabled={tagsLeidos.length === 0} 
            style={{...styles.btnAsignar, opacity: tagsLeidos.length === 0 ? 0.5 : 1}}
          >
            Confirmar Asignación ({tagsLeidos.length})
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modal: { background: 'white', padding: '20px', borderRadius: '8px', width: '450px', fontFamily: 'Arial, sans-serif' },
  btnConectar: { backgroundColor: '#92b91c', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnDetener: { backgroundColor: '#cc0000', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  contenedorLista: { background: '#f5f5f5', border: '1px solid #ddd', height: '150px', overflowY: 'auto', padding: '10px', marginBottom: '15px', borderRadius: '4px' },
  itemTag: { padding: '4px 0', borderBottom: '1px solid #e5e5e5', fontFamily: 'monospace', fontSize: '13px' },
  btnCancelar: { backgroundColor: '#ccc', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' },
  btnAsignar: { backgroundColor: '#257a14', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};
