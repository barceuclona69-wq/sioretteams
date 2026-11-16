import { useState, useEffect, useRef } from 'react';

export function ModalRfid({ isOpen, onClose, transaccion, onGuardarTags }) {
  const [tagsLeidos, setTagsLeidos] = useState([]);
  const [escaneando, setEscaneando] = useState(false);
  const puertoRef = useRef(null);

  // ========================================================
  // 1. APAGADO SEGURO
  // ========================================================
  function detenerEscaneo() {
    setEscaneando(false);
    if (puertoRef.current) {
      try {
        puertoRef.current.close(); 
      } catch (e) {
        console.error("Error al cerrar socket:", e);
      }
      puertoRef.current = null;
    }
  }

  // ========================================================
  // 2. CONTROL DEL CICLO DE VIDA
  // ========================================================
  useEffect(() => {
    if (isOpen) { 
      setTagsLeidos([]); 
    } 
    return () => { 
      detenerEscaneo(); 
    }; 
  }, [isOpen]); 

  if (!isOpen) return null;

  // ========================================================
  // 3. INICIAR EL BUCLE DE LECTURA (Conexión Directa al Servidor)
  // ========================================================
  function iniciarEscaneo() { 
    try { 
      setEscaneando(true); 
      setTagsLeidos([]); // Limpiar la lista al iniciar una nueva lectura
      
      // ⚠️ Conecta al puente en el servidor
      const socket = new WebSocket('ws://192.168.0.253:8080');
      puertoRef.current = socket; 
      
      socket.onopen = () => {
        console.log("✅ WebSocket conectado exitosamente al servidor");
      };
      
      socket.onmessage = (event) => {
        const datoLimpio = event.data.trim().toUpperCase();
        console.log("✉️ Recibido desde WebSocket:", datoLimpio);
        
        // ⚡ FILTRO FLEXIBLE: Acepta cualquier código hexadecimal válido que envíe el bridge
        if (/^[0-9A-F]+$/.test(datoLimpio)) {
          setTagsLeidos((tagsActuales) => { 
            if (!tagsActuales.includes(datoLimpio)) { 
              return [...tagsActuales, datoLimpio]; 
            } 
            return tagsActuales; 
          });
        }
      };

      socket.onerror = (error) => {
        console.error("❌ Error en WebSocket:", error);
        alert("Se perdió la conexión con el servidor de lectura.");
        detenerEscaneo();
      };

      socket.onclose = () => {
        setEscaneando(false);
      };

    } catch (error) { 
      console.error("Error de inicialización:", error); 
    } 
  }

  // ========================================================
  // 4. CONFIRMAR Y ENVIAR AL COMPONENTE PADRE
  // ========================================================
  function manejarConfirmacion() {
    detenerEscaneo();
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
  itemTag: { padding: '4px 0', borderBottom: '1px solid #e5e5e5', fontFamily: 'monospace', fontSize: '13px', color: '#333' },
  btnCancelar: { backgroundColor: '#ccc', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' },
  btnAsignar: { backgroundColor: '#257a14', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};
