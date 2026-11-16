const { Connection, Request } = require('tedious');

const config = {
  server: '192.168.0.253', 
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'amn110*'
    }
  },
  options: {
    database: 'FLOWERSHOP',
    encrypt: false,
    trustServerCertificate: true 
  }
};

const connection = new Connection(config);

connection.on('connect', (err) => {
  if (err) {
    console.error('❌ ERROR DE CONEXIÓN:', err.message);
  } else {
    console.log('✅ CONECTADO CON ÉXITO');
    ejecutarConsultaPrueba();
  }
});

// Función para pedirle algo simple a la base de datos
function ejecutarConsultaPrueba() {
  // Una consulta simple que devuelve la versión de SQL Server
  const request = new Request("SELECT @@VERSION", (err) => {
    if (err) {
      console.error('❌ ERROR EN LA CONSULTA:', err.message);
    }
    // Cerramos la conexión al terminar
    connection.close();
  });

  request.on('row', (columns) => {
    columns.forEach((column) => {
      console.log('Resultado de la prueba:', column.value);
    });
  });

  connection.execSql(request);
}

connection.connect();
