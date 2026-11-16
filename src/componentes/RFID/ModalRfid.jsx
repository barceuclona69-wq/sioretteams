import { useState, useEffect, useRef } from 'react';

export function ModalRfid({ isOpen, onClose, transaccion, onGuardarTags }) {
  const [tagsLeidos, setTagsLeidos] = useState([]);
  const [escaneando, setEscaneando] = useState(false);
  const [inputManual, setInputManual] = useState(''); // Estado para la caja de texto
  const socketRef = useRef(null);

  // ========================================================
  // 1. APAGADO SEGURO
  // ========================================================
  function detenerEscaneo() {
    setEscaneando(false);
    if (socketRef.current) {
      try {
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.onclose = null;
        socketRef.current.close(); 
      } catch (e) {
        console.error("Error al cerrar socket:", e);
      }
      socketRef.current = null;
    }
  }

  // ========================================================
  // 2. CONTROL DEL CICLO DE VIDA
  // ========================================================
  useEffect(() => {
    if (isOpen) { 
      setTagsLeidos([]); 
      setInputManual('');
    } 
    return () => { 
      detenerEscaneo(); 
    }; 
  }, [isOpen]); 

  if (!isOpen) return null;

  // ========================================================
  // 3. PROCESAR TAG (Función única para validar e insertar)
  // ========================================================
  function procesarNuevoTag(tag) {
    const datoLimpio = tag.trim().toUpperCase();
    
    // Filtro Hexadecimal
    if (/^[0-9A-F]+$/.test(datoLimpio)) {
      setTagsLeidos((tagsActuales) => { 
        if (!tagsActuales.includes(datoLimpio)) { 
          return [...tagsActuales, datoLimpio]; 
        } 
        return tagsActuales; 
      });
    }
  }

  // ========================================================
  // 4. LECTURA MANUAL (Emulación de Teclado + Enter)
  // ========================================================
  function manejarKeyDownManual(e) {
    if (e.key === 'Enter' && inputManual.trim() !== '') {
      e.preventDefault(); // Previene que se intente enviar un formulario fantasma
      procesarNuevoTag(inputManual);
      setInputManual(''); // Limpia la caja para recibir el próximo tag inmediatamente
    }
  }

  // ========================================================
  // 5. INICIAR EL BUCLE DE LECTURA (WebSocket)
  // ========================================================
  function iniciarEscaneo() { 
    try { 
      if (socketRef.current) detenerEscaneo();

      setEscaneando(true); 
      setTagsLeidos([]); 
      
      const socket = new WebSocket('ws://192.168.0.253:8080');
      socketRef.current = socket; 
      
      socket.onopen = () => {
        console.log("✅ WebSocket conectado exitosamente al servidor");
      };
      
      socket.onmessage = (event) => {
        console.log("✉️ Recibido desde WebSocket:", event.data);
        procesarNuevoTag(event.data);
      };

      socket.onerror = (error) => {
        console.error("❌ Error en WebSocket:", error);
        alert("No se pudo conectar o se perdió la conexión con el servidor de lectura.");
        detenerEscaneo();
      };

      socket.onclose = () => {
        detenerEscaneo();
      };

    } catch (error) { 
      console.error("Error de inicialización:", error); 
      setEscaneando(false);
    } 
  }

  function manejarConfirmacion() {
    detenerEscaneo();
    onGuardarTags(transaccion.id, tagsLeidos); 
    onClose();
  }

  function manejarCancelar() {
    detenerEscaneo();
    onClose();
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={{ marginTop: 0 }}>Asignar Tags por RFID</h3>
        <p><strong>Id Transacción:</strong> #{transaccion?.id}</p>
        <p><strong>Empleado Activo:</strong> {transaccion?.nombre_empleado}</p>

        {/* ⚡ CONTENEDOR DE BOTONES Y ENTRADAS */}
        <div style={styles.contenedorControles}>
          {!escaneando ? (
            <button onClick={iniciarEscaneo} style={styles.btnConectar}>Encender Lector USB</button>
          ) : (
            <button onClick={detenerEscaneo} style={styles.btnDetener}>Detener Lector</button>
          )}

          {/* Caja de texto para el lector manual uno a uno */}
          <input 
            type="text"
            placeholder="Escaneo manual (Pistola)..."
            value={inputManual}
            onChange={(e) => setInputManual(e.target.value)}
            onKeyDown={manejarKeyDownManual}
            disabled={escaneando} // Se deshabilita si el WebSocket general está encendido
            style={{
              ...styles.inputManual,
              backgroundColor: escaneando ? '#e9e9e9' : '#fff'
            }}
          />
        </div>

        <div style={styles.contenedorLista}>
          {tagsLeidos.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', marginTop: '50px' }}>
              {escaneando ? "Acerque los tags al lector Vulcan..." : "Use el lector automático o posicione el cursor en la caja manual."}
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
          <button onClick={manejarCancelar} style={styles.btnCancelar}>Cancelar</button>
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
  modal: { background: 'white', padding: '20px', borderRadius: '8px', width: '480px', fontFamily: 'Arial, sans-serif' }, // Ancho ajustado a 480px para dar espacio al input
  contenedorControles: { display: 'flex', gap: '10px', margin: '15px 0', alignItems: 'center' },
  btnConectar: { backgroundColor: '#92b91c', color: 'white', border: 'none', padding: '10px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' },
  btnDetener: { backgroundColor: '#cc0000', color: 'white', border: 'none', padding: '10px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' },
  inputManual: { flex: 1, padding: '9px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', outline: 'none' },
  contenedorLista: { background: '#f5f5f5', border: '1px solid #ddd', height: '150px', overflowY: 'auto', padding: '10px', marginBottom: '15px', borderRadius: '4px' },
  itemTag: { padding: '4px 0', borderBottom: '1px solid #e5e5e5', fontFamily: 'monospace', fontSize: '13px', color: '#333' },
  btnCancelar: { backgroundColor: '#ccc', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' },
  btnAsignar: { backgroundColor: '#257a14', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};
