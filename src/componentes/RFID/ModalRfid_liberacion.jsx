import React, { useState, useEffect, useRef } from 'react'; 
import { API_BASE_URL } from '../../config'; 
import { toast } from 'sonner'; 

export function ModalRfidLiberacion({ isOpen, onClose }) {
  const [tagsLeidos, setTagsLeidos] = useState([]);
  const [escaneando, setEscaneando] = useState(false);
  // 💡 CORRECCIÓN: Definimos el estado 'cargando' que solicitaban las líneas 92 y 119
  const [cargando, setCargando] = useState(false); 
  const puertoRef = useRef(null);

  // ========================================================
  // 1. APAGADO SEGURO DEL HARDWARE RFID
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
  // 2. CONTROL DEL CICLO DE VIDA DEL MODAL
  // ========================================================
  useEffect(() => {
    if (isOpen) { 
      setTagsLeidos([]); 
      setCargando(false);
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
      
      const socket = new WebSocket('ws://192.168.0.253:8080');
      puertoRef.current = socket; 
      
      socket.onopen = () => {
        console.log("✅ WebSocket conectado exitosamente al servidor");
      };
      
      socket.onmessage = (event) => {
        const datoLimpio = event.data.trim().toUpperCase();
        console.log("✉️ Recibido desde WebSocket:", datoLimpio);
        
        // 💡 CORRECCIÓN CRÍTICA: Expresión regular corregida sin la barra invertida rota
        if (/^[0-9A-F]+$/.test(datoLimpio)) {
          setTagsLeidos((tagsActuales) => { 
            if (!tagsActuales.includes(datoLimpio)) { 
              return [...tagsActuales, datoLimpio]; 
            } 
            return tagsActuales; 
          });
        } else {
          console.warn("⚠️ Código ignorado por formato inválido:", datoLimpio);
        }
      };

      socket.onerror = (error) => {
        console.error("❌ Error en WebSocket:", error);
        toast.error("Se perdió la conexión con el servidor de lectura.");
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
  // 4. CONFIRMAR Y EJECUTAR ANULACIÓN MASIVA EN BACKEND
  // ========================================================
    // ========================================================
  // 4. CONFIRMAR Y EJECUTAR ANULACIÓN MASIVA EN BACKEND
  // ========================================================
  async function manejarConfirmacion() {
    if (tagsLeidos.length === 0) return;
    detenerEscaneo();
    setCargando(true);

    try {
      const savedUser = localStorage.getItem("userData");
      // 💡 CORRECCIÓN: Nos aseguramos de extraer el ID y convertirlo a String de forma segura
      let idUsuarioActual = "1";
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        // Si tu objeto usa 'id', 'username' o 'codemp', cámbialo aquí para enviar el texto correcto de 10 caracteres
        idUsuarioActual = String(parsed.id || parsed.codemp || "1");
      }

      const response = await fetch(`${API_BASE_URL}/api/RFID/anular_tags_masivo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tags: tagsLeidos,
          usuario_modif: idUsuarioActual
        })
      });

      const contentType = response.headers.get("content-type");
      let data = {};
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const textoError = await response.text();
        throw new Error(`El servidor no respondió en formato JSON. Detalle: ${textoError.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la anulación masiva en el servidor.');
      }

      toast.success(data.message || "¡Proceso de anulación completado con éxito!");
      onClose();
    } catch (error) {
      console.error("❌ Error en anulación masiva:", error);
      alert(`Hubo un problema al anular: ${error.message}`);
    } finally {
      setCargando(false);
    }
  }


    return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* 💡 CORRECCIÓN: Textos e interfaz limpia adaptada para anulación libre */}
        <h3 style={{ marginTop: 0, color: '#dc3545', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🛑 Anulación Libre de Tags RFID
        </h3>
        <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.4', margin: '10px 0' }}>
          Acerque los elementos a la antena Vulcan. Todos los códigos de barra capturados que estén <strong>Pendientes</strong> pasarán de forma inmediata al estado <strong>Anulado</strong>.
        </p>

        <div style={{ margin: '15px 0' }}>
          {!escaneando ? (
            <button onClick={iniciarEscaneo} disabled={cargando} style={styles.btnConectar}>
              Encender Lector USB
            </button>
          ) : (
            <button onClick={detenerEscaneo} style={styles.btnDetener}>
              Detener Lector
            </button>
          )}
        </div>

               <div style={styles.contenedorLista}>
          {cargando ? (
            <p style={{ color: '#dc3545', textAlign: 'center', marginTop: '50px', fontWeight: 'bold' }}>
              Procesando anulación en base de datos...
            </p>
          ) : tagsLeidos.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', marginTop: '50px', fontSize: '13px' }}>
              Acerque los tags al lector Vulcan...
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tagsLeidos.map((tag, i) => (
                <li key={`${tag}-${i}`} style={styles.itemTag}>
                  🔹 {tag}
                </li>
              ))}
            </ul>
          )}
        </div>


        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
          <button onClick={onClose} disabled={cargando} style={styles.btnCancelar}>Cancelar</button>
          <button 
            onClick={manejarConfirmacion} 
            disabled={tagsLeidos.length === 0 || cargando} 
            style={{
              ...styles.btnAsignar, 
              backgroundColor: '#dc3545', // Color rojo de advertencia/anulación masiva
              opacity: (tagsLeidos.length === 0 || cargando) ? 0.5 : 1
            }}
          >
            {cargando ? 'Procesando...' : `Confirmar Anulación (${tagsLeidos.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999 }, // Elevado zIndex para superponerse correctamente
  modal: { background: 'white', padding: '20px', borderRadius: '12px', width: '450px', fontFamily: 'Arial, sans-serif', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' },
  btnConectar: { backgroundColor: '#2b6cb0', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnDetener: { backgroundColor: '#cc0000', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  contenedorLista: { background: '#f9fafb', border: '1px solid #e5e7eb', height: '150px', overflowY: 'auto', padding: '10px', marginBottom: '15px', borderRadius: '6px' },
  itemTag: { padding: '5px 0', borderBottom: '1px dashed #e5e7eb', fontFamily: 'monospace', fontSize: '13px', color: '#1f2937' },
  btnCancelar: { backgroundColor: '#f3f4f6', color: '#374151', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  btnAsignar: { color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};

