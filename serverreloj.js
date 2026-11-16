const express = require('express');
const cors = require('cors');
const { Connection, Request } = require('tedious');
/*const helmet = require('helmet');*/

const app = express();
app.use(cors()); // Permite que tu React (puerto 3000) hable con Node (puerto 4000)



// CONFIGURACIÓN DE TU SQL
const config = {
    server: '192.168.0.253',
    authentication: {
        type: 'default',
        options: { userName: 'sa', password: 'amn110*' }
    },
    options: { database: 'FLOWERSHOP', encrypt: false, trustServerCertificate: true }
};




// --- API COMEDOR ---

app.get('/api/asistencia_comedor', (req, res) => {
    const connection = new Connection(config);

    connection.on('connect', (err) => {
        if (err) return res.status(500).json({ error: err.message });

        //Consulta de asistencia alimentación
       
        // Dentro de app.get('/api/asistencia_comedor', ...)

        const sql = `
            SELECT 
                id, 
                CONVERT(VARCHAR, fecha_dia, 23) AS fecha_dia, 
                cedula, 
                nombres, 
                departamento,
                  CONVERT(VARCHAR, fecha_salida, 23) AS fecha_salida,
                presente,
                hora_devuelta_dia,
                paternidad,
                reposo_medico,
                maternidad,
                calamidad_domestica,
                falta_injustificada,
                almuer_si,
                meriend_si,
                val_asume_emp_almuer,
                val_asume_emp_meriend
            FROM rrhh_formulario
            WHERE CAST(fecha_dia AS DATE) = CAST(GETDATE() AS DATE)
            ORDER BY id DESC
        `.trim();

        const result = [];

        const request = new Request(sql, (err) => {
            connection.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json(result); // Envía los datos a quien llame a esta URL
        });

        request.on('row', (columns) => {
            let item = {};
            columns.forEach(col => { item[col.metadata.colName] = col.value; });
            result.push(item);
        });

        connection.execSql(request);
    });

    connection.connect();
});


// Ejemplo de endpoint en Express
app.put('/empleados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, puesto } = req.body;
        const pool = await sql.connect(config);
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, nombre)
            .query('UPDATE Empleados SET nombre = @nombre WHERE id = @id');
            
        res.json({ success: true });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Arranca el servidor en el puerto 4000
app.listen(4000, () => {
    console.log('Servidor API SIORET corriendo en http://localhost:4000');
});
