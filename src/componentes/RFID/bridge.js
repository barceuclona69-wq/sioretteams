const net = require('net');
const { WebSocketServer } = require('ws');

// 1. Crear el servidor WebSocket para conectarse con React
const wss = new WebSocketServer({ port: 8080 });
console.log("🚀 Puente RFID escuchando en ws://localhost:8080");

wss.on('connection', (ws) => {
  console.log("🔗 React se ha conectado al puente.");

  // 2. Conectarse al puerto TCP 9055 que emite el software del Vulcan (JADAK)
  const rfidClient = net.createConnection({ port: 9055, host: '127.0.0.1' }, () => {
    console.log("📡 Conectado exitosamente al flujo TCP del lector (Puerto 9055)");
  });

  // 3. Recibir los tags del lector y retransmitirlos limpios a React
  rfidClient.on('data', (data) => {
    const stringData = data.toString('utf-8').trim();
    // Separar si llegan múltiples tags juntos por saltos de línea o espacios
    const tags = stringData.split(/[\r\n\s]+/);
    
    tags.forEach(tag => {
      if (tag.length > 5) { // Filtrar ruido
        console.log("🏷️ Tag detectado:", tag);
        ws.send(tag); // Enviar directo al modal de React
      }
    });
  });

  rfidClient.on('error', (err) => {
    console.error("❌ Error en conexión TCP con el lector:", err.message);
  });

  ws.on('close', () => {
    console.log("🔌 React se desconectó. Cerrando enlace TCP.");
    rfidClient.end();
  });
});
