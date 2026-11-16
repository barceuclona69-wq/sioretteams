const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const app = express();
ip = '192.168.0.253';
ipdartis = 'dartisteam.database.windows.net';


app.use(cors());
// 🌟 CORRECCIÓN: Ampliamos el límite de 100KB a 100MB para soportar toda la nómina de Dartis
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Importamos TYPES para poder definir los parámetros de fecha en la consulta
const { Connection, Request, TYPES } = require('tedious');



// --- CONFIGURACIONES DE SQL ---
//DB FLOWERSHOP




const config = {
    server: ip,
    authentication: {
        type: 'default',
        options: { userName: 'sa', password: 'amn110*' }
    },
    options: { 
        database: 'FLOWERSHOP', 
        encrypt: false, 
        trustServerCertificate: true,
        // 🌟 LÍNEA NUEVA: Desactiva UTC para guardar la hora exacta sin desfases
        useUTC: false 
    }
};

//DB RELOJ
const configbfg_zkbiotime = {
    server: ip,
    authentication: {
        type: 'default',
        options: { userName: 'sa', password: 'amn110*' }
    },
    options: { database: 'bfg_zkbiotime', encrypt: false, trustServerCertificate: true }
};




//DB DARTIS


const configdartis = {
    user: 'mario', // Ejemplo: admin_dartis
    password: 'Bell@fl0r2024',
    server: ipdartis,
    database: 'BELLAFLOR',
    options: {
        encrypt: true, // OBLIGATORIO para Azure SQL [1]
        trustServerCertificate: false,
        connectTimeout: 30000 // Aumenta el tiempo por si la red es lenta
    }
}


// 2. DECLARAR LOS POOLS (Esto debe ir antes de la línea 65)

const poolflowershop = new sql.ConnectionPool(config);
const pooldartis = new sql.ConnectionPool(configdartis);
const poolbiometrico = new sql.ConnectionPool(configbfg_zkbiotime);



async function connectDBs() {
    try {

        

        await poolflowershop.connect();
        console.log('✅ Flowershop Local conectada');
        
        await pooldartis.connect();
        console.log('✅ Dartis Azure conectada');

        await poolbiometrico.connect();
        console.log('✅ Biométrico Local conectada');
    } catch (err) {
        console.error('❌ Error crítico de conexión:', err);
    }
}

// IMPORTANTE: Escucha errores individuales de cada pool para evitar desconexiones silenciosas
poolflowershop.on('error', err => console.error('Error en Pool Flowershop:', err));
pooldartis.on('error', err => console.error('Error en Pool Dartis (Azure):', err));
poolbiometrico.on('error', err => console.error('Error en Pool Biométrico:', err));

connectDBs();




//api DARTIS
// Agrega "async" aquí
app.get('/api/DARTIS/Empleados', async (req, res) => {
    try {
        const { departamento, idSucursal } = req.query;

        // 1. IMPORTANTE: Usa el pool que definiste al inicio, NO sql.connect
        // No necesitas "await pooldartis.connect()" aquí porque ya lo hiciste al arrancar el server
        let request = pooldartis.request(); 
        
        request.input('ls_dep', sql.VarChar, departamento);
        request.input('ll_com', sql.Int, idSucursal);

        let result = await request.query(`
            SELECT  e.id, p.identificacion,
                    p.nombreComercial 'nombre',
                    area.nombre 'departamento',
                    area.id 'coddep',
                    e.id 'codemp',
                    e.fechaIngreso,
                    e.idSucursal 'codcom',
                    case when ebs.idBeneficio = 1 then 'ALMUERZO' else 'MERIENDA' end as 'beneficio',
                    case when ebs.permite = 1 then 'SI' else 'NO' end AS 'asume',
                    ebs.valor
            FROM tbrrhhempleados e with(nolock)
            inner join TbGrlPersonas p with(nolock) on p.id = e.idPersona
            inner join TbRrhhArea area with(nolock) on e.idArea = area.id
            left join TbRrhhBeneficiosEmpleados ebs with (nolock) on ebs.idEmpleado = e.id
            WHERE e.activo = 1 
            AND area.nombre = @ls_dep
            AND e.idSucursal = @ll_com
            GROUP BY 
                    p.Identificacion, p.nombreComercial, area.nombre, area.id,
                    e.id, e.fechaIngreso, e.idSucursal, ebs.idBeneficio,
                    ebs.permite, ebs.valor
                    order by  p.nombreComercial`);

                     // 👀 VERIFICAR SALIDA
        console.log("Registros encontrados:", result.recordset.length);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en la consulta Azure:", err);
        res.status(500).send("Error al obtener empleados: " + err.message);
    }
});



// Agrega "async" aquí
app.get('/api/RRHH/emp_asis_dartis', async (req, res) => {
    try {
        const { departamento, idSucursal } = req.query;

        // 1. IMPORTANTE: Usa el pool que definiste al inicio, NO sql.connect
        // No necesitas "await pooldartis.connect()" aquí porque ya lo hiciste al arrancar el server
        let request = pooldartis.request(); 
        
        request.input('ls_dep', sql.VarChar, departamento);
        request.input('ll_com', sql.Int, idSucursal);
console.log("SQL buscando para:", { depto: departamento, sucursal: idSucursal });

        let result = await request.query(`
                        select						
                            per.Identificacion as cedula,
                            per.nombrecomercial as nombres,
                            suc.id as codigo_com_dar ,
                            area.nombre departamento,
                            '' as fecha_dia,
                            CASE 
                                WHEN LEFT(emp.codigoPostal, 2) = 'sa' THEN 'si'
                                WHEN SUBSTRING(emp.codigoPostal, 3, 2) = 'sm' THEN 'si'
                                ELSE 'no' 
                            END AS presente,
                            IIF(LEFT(emp.codigoPostal, 2) = 'sa', 'si', 'no') AS almuer_si,
                            IIF(SUBSTRING(emp.codigoPostal, 3, 2) = 'sm', 'si', 'no') AS meriend_si,
                            'no' feriado,
                            '' as fecha_transaccion,
                            'no' vacaciones,
                            'no' hora_devuelta_dia,
                            'no' reposo_medico,
                            'no' paternidad,
                            'no' maternidad,
                            'no' calamidad_domestica,
                            'no' falta_injustificada,
                            IIF(SUBSTRING(emp.codigoPostal, 5, 3) = 'esa', 'si', 'no') AS val_asume_emp_almuer,
                            IIF(SUBSTRING(emp.codigoPostal, 8, 3) = 'esm', 'si', 'no') AS val_asume_emp_meriend,
                            emp.id AS codigo_emp_dar,
                            area.id AS codigo_dep_dar,
                            'no' refrigerio,
                            'no' desayuno,
									CASE 
                                    WHEN suc.id = 5 AND area.id = 6 THEN '(CEX6)'
                                    WHEN suc.id = 5 AND area.id = 18 THEN '(CEX6)' 
                                    WHEN suc.id = 5 THEN '(CEXP)'
                                    WHEN suc.id = 4 THEN '(CAMZ)'
                                    WHEN suc.id = 10 THEN '(CCJH)'
                                    WHEN suc.id = 3 THEN '(CHDN)'
                                    WHEN suc.id = 12 THEN '(COAF)'
                                    WHEN suc.id = 13 THEN '(COAO)'
                                    ELSE '' 
                                END AS comedor,
                            emp.idRecorrido ruta,
							emp.idParada parada,
							emp.alterno pasaje,
                            'NORMAL' as tipo_dia,
                            emp.sueldoBase,
							emp.fechaIngreso,
							  DATEDIFF(DAY, emp.fechaIngreso, GETDATE()) AS AntiguedadDias,
							  emp.rendimiento as 'porcentajerendimiento',
							  pt.nombre as 'puestotrabajo'
                            from  
                            TbRrhhEmpleados emp with(nolock)
                            inner join TbGrlPersonas per with (nolock) on per.id = emp.idPersona
                            inner join TbSisSucursales suc with (nolock) on suc.id = emp.idSucursal
                            inner join TbGrlPersonas per1 with (nolock) on per1.id = suc.idPersona
                            inner join TbRrhhArea area   with (nolock) on area.id = emp.idArea
							left join TbRrhhRecorridos rec   with (nolock) on rec.id = emp.idRecorrido
							left join TbRrhhParadas par   with (nolock) on par.id = emp.idParada
                            left join TbRrhhPuestoTrabajo pt  with (nolock) on pt.id = emp.idPuestoTrabajo
                            where 
                            emp.activo = 1
                            and emp.estadovisual = 1
                           and  area.nombre = @ls_dep
                            and suc.id = @ll_com
                order by 
                per.nombrecomercial`);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en la consulta Azure:", err);
        res.status(500).send("Error al obtener empleados: " + err.message);
    }
});



app.get('/api/RRHH/emp_asis_dartis_rend', async (req, res) => {
    try {
        const { departamento, idSucursal } = req.query;

        // 1. IMPORTANTE: Usa el pool que definiste al inicio, NO sql.connect
        // No necesitas "await pooldartis.connect()" aquí porque ya lo hiciste al arrancar el server
        let request = pooldartis.request(); 
        
        request.input('ls_dep', sql.VarChar, departamento);
        request.input('ll_com', sql.Int, idSucursal);
console.log("SQL buscando para:", { depto: departamento, sucursal: idSucursal });

        let result = await request.query(`
                        select						
                            per.Identificacion as cedula,
                            per.nombrecomercial as nombres,
                            suc.id as codigo_com_dar ,
                            area.nombre departamento,
                            '' as fecha_dia,
                            CASE 
                                WHEN LEFT(emp.codigoPostal, 2) = 'sa' THEN 'si'
                                WHEN SUBSTRING(emp.codigoPostal, 3, 2) = 'sm' THEN 'si'
                                ELSE 'no' 
                            END AS presente,
                            IIF(LEFT(emp.codigoPostal, 2) = 'sa', 'si', 'no') AS almuer_si,
                            IIF(SUBSTRING(emp.codigoPostal, 3, 2) = 'sm', 'si', 'no') AS meriend_si,
                            'no' feriado,
                            '' as fecha_transaccion,
                            'no' vacaciones,
                            'no' hora_devuelta_dia,
                            'no' reposo_medico,
                            'no' paternidad,
                            'no' maternidad,
                            'no' calamidad_domestica,
                            'no' falta_injustificada,
                            IIF(SUBSTRING(emp.codigoPostal, 5, 3) = 'esa', 'si', 'no') AS val_asume_emp_almuer,
                            IIF(SUBSTRING(emp.codigoPostal, 8, 3) = 'esm', 'si', 'no') AS val_asume_emp_meriend,
                            emp.id AS codigo_emp_dar,
                            area.id AS codigo_dep_dar,
                            'no' refrigerio,
                            'no' desayuno,
									CASE 
                                    WHEN suc.id = 5 AND area.id = 6 THEN '(CEX6)'
                                    WHEN suc.id = 5 AND area.id = 18 THEN '(CEX6)' 
                                    WHEN suc.id = 5 THEN '(CEXP)'
                                    WHEN suc.id = 4 THEN '(CAMZ)'
                                    WHEN suc.id = 10 THEN '(CCJH)'
                                    WHEN suc.id = 3 THEN '(CHDN)'
                                    WHEN suc.id = 12 THEN '(COAF)'
                                    WHEN suc.id = 13 THEN '(COAO)'
                                    ELSE '' 
                                END AS comedor,
                            emp.idRecorrido ruta,
							emp.idParada parada,
							emp.alterno pasaje,
                            'NORMAL' as tipo_dia,
                            emp.sueldoBase,
							emp.fechaIngreso,
							  DATEDIFF(DAY, emp.fechaIngreso, GETDATE()) AS AntiguedadDias,
							  emp.rendimiento as 'porcentajerendimiento',
							  pt.nombre as 'puestotrabajo',
                               CAST(DATEADD(MINUTE, -5, CAST(hd.horaInicio AS TIME)) AS TIME) AS horaInicio,
							 CAST('01:00:00' AS TIME) AS tiemalmz,
							hd.horaFin AS horaFin
                            from  
                            TbRrhhEmpleados emp with(nolock)
                            inner join TbGrlPersonas per with (nolock) on per.id = emp.idPersona
                            inner join TbSisSucursales suc with (nolock) on suc.id = emp.idSucursal
                            inner join TbGrlPersonas per1 with (nolock) on per1.id = suc.idPersona
                            inner join TbRrhhArea area   with (nolock) on area.id = emp.idArea
							left join TbRrhhRecorridos rec   with (nolock) on rec.id = emp.idRecorrido
							left join TbRrhhParadas par   with (nolock) on par.id = emp.idParada
                            left join TbRrhhPuestoTrabajo pt  with (nolock) on pt.id = emp.idPuestoTrabajo
                            inner JOIN TbRrhhTiposHorario h WITH(NOLOCK) ON h.id = emp.idTipoHorario
							inner JOIN TbRrhhDetallesHorario hd WITH(NOLOCK) ON hd.idTipoHorario = h.id
                            where 
                            emp.activo = 1
                            and emp.estadovisual = 1
                           and  area.nombre = @ls_dep
                            and suc.id = @ll_com
                            AND h.estadoVisual = 1
								 AND hd.estadoVisual = 1
                order by 
                per.nombrecomercial`);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en la consulta Azure:", err);
        res.status(500).send("Error al obtener empleados: " + err.message);
    }
});


app.get('/api/RRHH/emp_asis_dartis_vacaciones', async (req, res) => { 
  try { 
    // Uso del pool pooldartis inicializado al arranque 
    let request = pooldartis.request(); 
 
    let result = await request.query(` 
    WITH UltimosRubrosVacaciones AS ( 
  SELECT 
    rpe.idEmpleado, 
    MAX(rper.idrol) AS idrol,
    MAX(rper.fechaInicial) AS fechaInicial, 
    MAX(rper.fechaFinal) AS fechaFinal,     
    ISNULL(MAX(CASE WHEN rper.idRubro = 92 THEN rper.valor END), 0) AS dias_vacaciones_ganadas, 
    ISNULL(MAX(CASE WHEN rper.idRubro = 95 THEN rper.valor END), 0) AS dias_vacaciones_pendientes 
  FROM ( 
    SELECT 
      rper.idRolPagoEmpleado, 
      rper.idRubro, 
      rper.valor, 
      rp_sub.id AS idrol, 
      rp_sub.fechaInicial, 
      rp_sub.fechaFinal,   
      ROW_NUMBER() OVER ( 
        PARTITION BY rpe_sub.idEmpleado, rper.idRubro 
        ORDER BY rp_sub.fechaInicial DESC 
      ) AS fila_numero 
    FROM TbRrhhRolPagoEmpleadoRubro rper WITH (NOLOCK) 
    INNER JOIN TbRrhhRolPagoEmpleados rpe_sub WITH (NOLOCK) ON rpe_sub.id = rper.idRolPagoEmpleado 
    INNER JOIN TbRrhhRolesPagos rp_sub WITH (NOLOCK) ON rp_sub.id = rpe_sub.idRolPago 
    INNER JOIN TbRrhhTipoRol tr_sub WITH (NOLOCK) ON tr_sub.id = rp_sub.idTipoRol 
    WHERE tr_sub.id = 1 
      AND rp_sub.estadoVisual = 1 
      AND rp_sub.idEstado = 2 
      AND rper.idRubro IN (92, 95) 
      -- FILTRO DINÁMICO: Solo diciembre del año anterior al actual
      AND MONTH(rp_sub.fechaInicial) = 12
      AND YEAR(rp_sub.fechaInicial) = YEAR(GETDATE()) - 1
  ) rper 
  INNER JOIN TbRrhhRolPagoEmpleados rpe WITH (NOLOCK) ON rpe.id = rper.idRolPagoEmpleado 
  WHERE rper.fila_numero = 1 
  GROUP BY rpe.idEmpleado 
) 
SELECT suc.id AS codigo_com_dar, 
       area.id AS codigo_dep_dar, 
       per1.nombreComercial AS 'empresa', 
       per.Identificacion AS 'cedula', 
       emp.id idemp, 
       vac.idrol AS idrol,                   
       vac.fechaInicial AS fecha_inicial_rol, 
       vac.fechaFinal AS fecha_final_rol,     
       
       -- Muestra el mes y año real del rol (Ejemplo: 'diciembre(2025)')
       ISNULL(LOWER(DATENAME(month, vac.fechaInicial)) + '(' + CAST(YEAR(vac.fechaInicial) AS VARCHAR(4)) + ')', 'Sin Fecha') AS periodo_rol,
       
       per.nombrecomercial AS 'nombres', 
       emp.fechaIngreso AS fecha_jornada, 
       area.nombre AS 'departamento', 
       ISNULL(ger.nombre, 'Sin Gerente Asignado') AS Gerencia, 
       ISNULL(per2.nombreComercial, 'Sin Jefe Asignado') AS jefedirecto, 
       pt.nombre AS Actividad, 
      
	  ISNULL(vac.dias_vacaciones_pendientes, 0) AS dias_vacaciones_pendientes, 
	   CASE 
         WHEN ISNULL(vac.dias_vacaciones_ganadas, 0) < 1.25 THEN 1.25 
         ELSE vac.dias_vacaciones_ganadas 
       END AS dias_vacaciones_ganadas, 
	   		 	    
    
       CASE 
         WHEN ISNULL(vac.dias_vacaciones_ganadas, 0) >= 20 THEN 'SI' 
         ELSE 'NO' 
       END AS Priorizar 
FROM 
  TbRrhhEmpleados emp WITH (NOLOCK) 
  LEFT JOIN TbGrlPersonas per WITH (NOLOCK) ON per.id = emp.idPersona 
  LEFT JOIN TbSisSucursales suc WITH (NOLOCK) ON suc.id = emp.idSucursal 
  LEFT JOIN TbGrlPersonas per1 WITH (NOLOCK) ON per1.id = suc.idPersona 
  INNER JOIN TbRrhhArea area WITH (NOLOCK) ON emp.idArea = area.id 
  LEFT JOIN TbRrhhJefaturasExternas ger WITH (NOLOCK) ON ger.id = emp.idJefeExterno 
  LEFT JOIN TbRrhhEmpleados emp1 WITH (NOLOCK) ON emp1.id = emp.idEmpleadoJefeDirecto 
  LEFT JOIN TbGrlPersonas per2 WITH (NOLOCK) ON per2.id = emp1.idPersona 
  LEFT JOIN TbRrhhPuestoTrabajo pt WITH (NOLOCK) ON pt.id = emp.idPuestoTrabajo 
  LEFT JOIN UltimosRubrosVacaciones vac ON vac.idEmpleado = emp.id 
WHERE 
  emp.activo = 1 
  AND emp.estadovisual = 1 
ORDER BY 
  per.nombrecomercial;


    `); 
 
    res.json(result.recordset); 
  } catch (err) { 
    console.error("Error en la consulta Azure:", err); 
    res.status(500).send("Error al obtener empleados: " + err.message); 
  } 
});


app.get('/api/RRHH/dias_dartis_vacaciones', async (req, res) => { 
  try { 
    const anioFiltro = req.query.anio; 

    if (!anioFiltro) {
      return res.status(400).send("El parámetro 'anio' es requerido.");
    }

    let request = pooldartis.request(); 
 
    // Configuración exacta usando tu variable 'sql' declarada en el servidor
    request.input('Anio', sql.Int, parseInt(anioFiltro));

    let result = await request.query(` 
      SELECT 
          emp.id AS idemp,
          per.nombreComercial, 
          mau.nombre AS motivo,
          SUM(DATEDIFF(DAY, au.fechaDesde, au.fechaHasta) + 1) AS total_dias
      FROM TbRrhhAusentismos au WITH (NOLOCK)
      INNER JOIN TbRrhhMotivoAusentismo mau WITH (NOLOCK) ON mau.id = au.idMotivoAusentismo
      INNER JOIN TbRrhhEmpleados emp WITH (NOLOCK) ON emp.id = au.idempleado
      INNER JOIN TbGrlPersonas per WITH (NOLOCK) ON per.id = emp.idPersona
      WHERE au.estadoVisual = 1
        AND au.fechaDesde >= DATEFROMPARTS(@Anio, 1, 1)
        AND au.fechaHasta <= DATEFROMPARTS(@Anio, 12, 31)
        AND mau.id = 9 -- Vacaciones Tomadas
        AND emp.activo = 1
      GROUP BY 
          emp.id,
          per.nombreComercial, 
          mau.nombre
      ORDER BY 
          per.nombreComercial;
    `); 
 
    res.json(result.recordset); 
  } catch (err) { 
    console.error("Error en la consulta Azure:", err); 
    res.status(500).send("Error al obtener días de vacaciones: " + err.message); 
  } 
});







app.get('/api/RRHH/dias_dartis_vacaciones_detalle', async (req, res) => { 
  try { 
    const anioFiltro = req.query.anio; 

    if (!anioFiltro) {
      return res.status(400).send("El parámetro 'anio' es requerido.");
    }

    let request = pooldartis.request(); 
 
    // Configuración exacta usando tu variable 'sql' declarada en el servidor
    request.input('Anio', sql.Int, parseInt(anioFiltro));

    let result = await request.query(` 
      SELECT 
          emp.id AS idemp,
          per.nombreComercial, 
          mau.nombre AS motivo,
          au.fechaDesde, au.fechaHasta,
          SUM(DATEDIFF(DAY, au.fechaDesde, au.fechaHasta) + 1) AS total_dias
      FROM TbRrhhAusentismos au WITH (NOLOCK)
      INNER JOIN TbRrhhMotivoAusentismo mau WITH (NOLOCK) ON mau.id = au.idMotivoAusentismo
      INNER JOIN TbRrhhEmpleados emp WITH (NOLOCK) ON emp.id = au.idempleado
      INNER JOIN TbGrlPersonas per WITH (NOLOCK) ON per.id = emp.idPersona
      WHERE au.estadoVisual = 1
        AND au.fechaDesde >= DATEFROMPARTS(@Anio, 1, 1)
        AND au.fechaHasta <= DATEFROMPARTS(@Anio, 12, 31)
        AND mau.id = 9 -- Vacaciones Tomadas
        AND emp.activo = 1
      GROUP BY 
          emp.id,
          per.nombreComercial, 
          mau.nombre,
          au.fechaDesde, au.fechaHasta
      ORDER BY 
          per.nombreComercial;
    `); 
 
    res.json(result.recordset); 
  } catch (err) { 
    console.error("Error en la consulta Azure:", err); 
    res.status(500).send("Error al obtener días de vacaciones: " + err.message); 
  } 
});




app.get('/api/RRHH/emp_asis_extras_dartis', async (req, res) => {
    try {
        // 1. Extraemos la fecha que viene desde el Frontend junto a depto y sucursal
        const { departamento, idSucursal, fecha } = req.query;

        let request = pooldartis.request(); 
        
        // 2. Definimos las entradas de manera segura para prevenir Inyección SQL
        request.input('ls_dep', sql.VarChar, departamento);
        request.input('ll_com', sql.Int, idSucursal);
        request.input('ld_fecha', sql.VarChar, fecha); // <-- Nuevo parámetro dinámico

        console.log("SQL buscando para:", { depto: departamento, sucursal: idSucursal, fecha: fecha });

        let result = await request.query(`
SELECT 
    -- Campos del Query 1 (Datos del Empleado y Horarios)
    Q1.id,
    Q1.cedula,
    Q1.nombres,
    Q1.codigo_com_dar,
    Q1.departamento,
    ISNULL(CONVERT(VARCHAR, Q2.fecha, 120), '') as fecha_dia, 
    Q1.fecha_transaccion,
    Q1.codigo_emp_dar,
    Q1.codigo_dep_dar,
    Q1.tipo_dia,
    Q1.sueldoBase,
    Q1.idTipoHorario,
    Q1.nombre,
    Q1.horaInicio,
    Q1.tiemalmz,
    Q1.horaFin,

    -- Campos del Query 2 Simplificados
    ISNULL(Q2.Postcosecha, '') AS Postcosecha,
    ISNULL(Q2.Empresa, '') AS Empresa,
    ISNULL(Q2.horasExtrasTotal, 0) AS horasExtrasTotal,

    -- CORRECCIÓN: Devolver NULL en lugar de '' si no hay horas extras
    CASE 
        WHEN ISNULL(Q2.horasExtrasTotal, 0) > 0 THEN Q1.horaFin 
        ELSE NULL 
    END AS horasextrasinicio,

    CASE 
        WHEN ISNULL(Q2.horasExtrasTotal, 0) > 0 AND Q1.horaFin IS NOT NULL THEN 
            CAST(DATEADD(MINUTE, CAST(Q2.horasExtrasTotal * 60 AS INT), CAST(Q1.horaFin AS TIME)) AS TIME)
        ELSE NULL 
    END AS horasextrasfin
FROM (
    SELECT						
        emp.id,
        per.Identificacion as cedula,
        per.nombrecomercial as nombres,
        suc.id as codigo_com_dar ,
        area.nombre departamento,
        '' as fecha_dia,
        '' as fecha_transaccion,
        emp.id AS codigo_emp_dar,
        area.id AS codigo_dep_dar,
        'NORMAL' as tipo_dia,
        emp.sueldoBase,
        emp.idTipoHorario,
        h.nombre,
        -- CORRECCIÓN: Restamos 5 minutos nativamente al tipo TIME
        CAST(DATEADD(MINUTE, -5, CAST(hd.horaInicio AS TIME)) AS TIME) AS horaInicio,
        CAST('01:00:00' AS TIME) AS tiemalmz,
        hd.horaFin AS horaFin
    FROM TbRrhhEmpleados emp WITH(NOLOCK)
    INNER JOIN TbGrlPersonas per WITH(NOLOCK) ON per.id = emp.idPersona
    INNER JOIN TbSisSucursales suc WITH(NOLOCK) ON suc.id = emp.idSucursal
    INNER JOIN TbGrlPersonas per1 WITH(NOLOCK) ON per1.id = suc.idPersona
    INNER JOIN TbRrhhArea area WITH(NOLOCK) ON area.id = emp.idArea
    LEFT JOIN TbRrhhTiposHorario h WITH(NOLOCK) ON h.id = emp.idTipoHorario
    LEFT JOIN TbRrhhDetallesHorario hd WITH(NOLOCK) ON hd.idTipoHorario = h.id
    WHERE emp.activo = 1
    AND emp.estadovisual = 1
    AND h.estadoVisual = 1
    AND hd.estadoVisual = 1
    AND area.nombre = @ls_dep
    AND suc.id = @ll_com
) Q1
LEFT JOIN (
    SELECT 
        A.cedula,
        A.fecha,
        MAX(A.Postcosecha) AS Postcosecha,
        MAX(A.Empresa) AS Empresa,
        SUM(A.horasExtras) AS horasExtrasTotal
    FROM (
        SELECT 
            CONVERT(DATE, tpme.fecha) fecha,
            UPPER(tpp.nombre) Postcosecha, 
            UPPER(tgpS.nombres) Empresa,
            tgpE.identificacion cedula, 
            ISNULL(tpme.horasExtras, 0) AS horasExtras
        FROM TbPostMesasEmpleados tpme WITH(NOLOCK)
        INNER JOIN TbPostMesas tpm WITH(NOLOCK) ON tpm.id = tpme.idMesa
        INNER JOIN TbPostPostcosechas tpp WITH(NOLOCK) ON tpp.id = tpm.idPostcosecha
        INNER JOIN TbRrhhEmpleados treE WITH(NOLOCK) ON tpme.idEmpleadoEmbonchador = treE.id AND treE.estadovisual = 1
        INNER JOIN TbGrlPersonas tgpE WITH(NOLOCK) ON tgpE.id = treE.idPersona
        INNER JOIN TbSisSucursales tss WITH(NOLOCK) ON tss.id = treE.idSucursal
        INNER JOIN TbGrlPersonas tgpS WITH(NOLOCK) ON tgps.id = tss.idPersona
        -- REEMPLAZO DINÁMICO: Usamos @ld_fecha en lugar del string quemado
        WHERE tpme.fecha BETWEEN CAST(@ld_fecha AS DATE) AND CAST(@ld_fecha AS DATE)
        AND (ISNULL(tpme.horasExtras,0) + ISNULL(tpme.horasExtrasClasificador,0)) > 0
        AND tpme.estadovisual = 1 AND tpm.estadovisual = 1 AND tpm.activo = 1 

        UNION ALL

        SELECT 
            CONVERT(DATE, tpme.fecha) fecha,
            UPPER(tpp.nombre) Postcosecha, 
            UPPER(tgpS.nombres) Empresa,
            tgpC.identificacion cedula, 
            ISNULL(tpme.horasExtrasClasificador, 0) AS horasExtras
        FROM TbPostMesasEmpleados tpme WITH(NOLOCK)
        INNER JOIN TbPostMesas tpm WITH(NOLOCK) ON tpm.id = tpme.idMesa
        INNER JOIN TbPostPostcosechas tpp WITH(NOLOCK) ON tpp.id = tpm.idPostcosecha
        INNER JOIN TbRrhhEmpleados treC WITH(NOLOCK) ON tpme.idEmpleadoClasificador = treC.id AND treC.estadovisual = 1
        INNER JOIN TbGrlPersonas tgpC WITH(NOLOCK) ON tgpC.id = treC.idPersona
        INNER JOIN TbSisSucursales tss WITH(NOLOCK) ON tss.id = treC.idSucursal
        INNER JOIN TbGrlPersonas tgpS WITH(NOLOCK) ON tgps.id = tss.idPersona
        -- REEMPLAZO DINÁMICO: Usamos @ld_fecha en lugar del string quemado
        WHERE tpme.fecha BETWEEN CAST(@ld_fecha AS DATE) AND CAST(@ld_fecha AS DATE)
            AND (ISNULL(tpme.horasExtras,0) + ISNULL(tpme.horasExtrasClasificador,0)) > 0
        AND tpme.estadovisual = 1 AND tpm.estadovisual = 1 AND tpm.activo = 1 
    ) A
    GROUP BY A.cedula, A.fecha
) Q2 ON Q1.cedula = Q2.cedula
ORDER BY Q1.nombres, fecha_dia
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en la consulta Azure:", err);
        res.status(500).send("Error al obtener empleados: " + err.message);
    }
});

//LISTA EMPLEADOS

app.get('/api/DARTIS/Lista_empleados', async (req, res) => {
    try {
        // 1. ELIMINADO: let pool = await sql.connect(configdartis); 
        // 2. USAMOS DIRECTAMENTE EL POOL QUE YA ESTÁ CONECTADO:
        const request = pooldartis.request();

        let result = await request.query(`
            SELECT  
                e.id, 
                p.identificacion,
                p.nombreComercial AS nombre,
                area.nombre AS departamento,
                area.id AS coddep,
                e.id AS codemp,
                e.fechaIngreso,
                e.idSucursal AS codcom,
                e.sueldoBase as sueldo,
                RIGHT(TRIM(direccion), 2)  as mesa ,
                alterno as 'helicoptero'          
            FROM tbrrhhempleados e WITH(NOLOCK)
            INNER JOIN TbGrlPersonas p WITH(NOLOCK) ON p.id = e.idPersona
            INNER JOIN TbRrhhArea area WITH(NOLOCK) ON e.idArea = area.id
            LEFT JOIN TbRrhhBeneficiosEmpleados ebs WITH(NOLOCK) ON ebs.idEmpleado = e.id
            WHERE e.activo = 1 
            GROUP BY e.id, 
                p.identificacion,
                p.nombreComercial,
                area.nombre ,
                area.id,
                e.id ,
                e.fechaIngreso,
                e.idSucursal,
                e.sueldoBase,
                p.direccion,
               alterno
                 order by  RIGHT(TRIM(direccion), 2)
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en la consulta de Lista_empleados:", err);
        res.status(500).json({ error: "Error al obtener empleados", message: err.message });
    }
});
app.post('/api/DARTIS/asignar_empleados_transaccion', async (req, res) => {
    // 1. RECOGEMOS 'tipo' DESDE EL FRONT-END JUNTO A LAS OTRAS PROPIEDADES GLOBALMENTE
    const { cod_empleado, cod_producto, fecha_asignacion, nombre, id_maquina, helicoptero, bqt_x_hora, tipo } = req.body;

    if (!cod_empleado || !cod_producto || !fecha_asignacion || !Array.isArray(cod_empleado) || cod_empleado.length === 0) {
        return res.status(400).json({ error: "Datos incompletos o incorrectos" });
    }

    try {
        // ==========================================
        // PROCESAMIENTO Y LOG DE HELICÓPTERO/MÁQUINA
        // ==========================================
        const helicoteroTextoOriginal = id_maquina || helicoptero || "0";
        const soloNumerosHelicoptero = helicoteroTextoOriginal.toString().replace(/\D/g, '');
        const helicopteroNumerico = parseInt(soloNumerosHelicoptero, 10);
        const helicopteroFinal = isNaN(helicopteroNumerico) ? 0 : helicopteroNumerico;

        console.log("==================== LOG DE CONVERSIÓN ====================");
        console.log(`[FRONT-END] Valor original recibido (Texto): "${helicoteroTextoOriginal}"`);
        console.log(`[BACK-END]  Valor procesado a guardar (Número): ${helicopteroFinal}`);
        console.log(`[TIPO RECI] Campo 'tipo' recibido del Front: "${tipo || 'No enviado'}"`);
        console.log(`[PRODUCTO]  Código original enviado (Texto): "${cod_producto}"`);
        console.log("==========================================================");

        // Iteramos sobre el array de objetos de empleados
        for (const emp of cod_empleado) {
            const empleadoNumerico = parseInt(emp.id, 10);
            const nombreEmp = emp.nombre; 
            const mesa = emp.mesa; 

            if (isNaN(empleadoNumerico)) {
                console.warn(`Id de empleado no numérico omitido:`, emp.id);
                continue; 
            }

            console.log(`Insertando empleado: ${nombreEmp} | Mesa: ${mesa} | Tipo: ${tipo}`);

            // 2. Creamos un nuevo request por cada iteración usando tu pool correcto
            const request = poolflowershop.request();

            // 3. Declaramos los parámetros de forma segura con sus TIPOS CORRECTOS
            request.input('empleado', sql.Int, empleadoNumerico);
            
            // 🌟 SOLUCIÓN DEFINITIVA: Declaramos sql.VarChar pasándole el string original sin alterar sus letras.
            // Usamos una longitud (ej. 50 caracteres) para que el driver mssql no falle en la validación previa.
            request.input('producto', sql.VarChar(50), cod_producto ? cod_producto.toString() : ''); 
            
            request.input('fecha', sql.VarChar, fecha_asignacion);
            request.input('nombre', sql.VarChar, nombreEmp);
            request.input('nombrep', sql.VarChar, nombre);
            request.input('mesa', sql.VarChar, mesa ? mesa.toString() : '0'); 
            request.input('bqt_x_hora', sql.VarChar, bqt_x_hora);
            request.input('helicoptero', sql.Int, helicopteroFinal); 
            request.input('tipo', sql.VarChar, tipo ? tipo.toString() : 'S/N');

            // 4. Inserción limpia aplicando las nuevas columnas en SQL Server
            await request.query(`
                INSERT INTO rendimiento (
                    cod_empledo, cod_producto, fecha_asignacion, nombre_empleado, 
                    fecha_creacion, nombre_producto, mesa, id_maquina, 
                    estado_visual, bqt_x_hora, tipo
                )
                VALUES (
                    @empleado, @producto, CAST(@fecha AS DATETIME) + CAST(CAST(GETDATE() AS TIME) AS DATETIME), 
                    @nombre, GETDATE(), @nombrep, @mesa, @helicoptero, 1, @bqt_x_hora, @tipo
                )
            `);
        } // Fin del bucle for

        res.json({ success: true, message: "Empleados asignados correctamente con fecha de filtro, creación y tipo." });

    } catch (err) {
        console.error("Error exacto en la inserción de SQL Server:", err.message); 
        res.status(500).json({ error: "Error interno del servidor", message: err.message });
    }
});




//VENTAS RECETAS BQT
app.get('/api/DARTIS/ventas_recetas', async (req, res) => { 
  try { 
    // 1. OBTENEMOS LAS FECHAS DIRECTAMENTE DESDE EL FRONTEND
    // React manda '2026-08-24' y aquí le quitamos los guiones para dejarlo como '20260824'
    const { desde, hasta } = req.query;

    // Validación rápida: Si el frontend no envía las fechas, le avisa con un error
    if (!desde || !hasta) {
      return res.status(400).send("Faltan los parámetros de fecha 'desde' o 'hasta' en la petición.");
    }

    const fechaDesdeLimpia = desde.replace(/-/g, '');
    const fechaHastaLimpia = hasta.replace(/-/g, '');

    // 2. PASAMOS LAS FECHAS AL MANEJADOR DE SQL
    const request = pooldartis.request();
    request.input('FechaDesdeParam', sql.VarChar, fechaDesdeLimpia);
    request.input('FechaHastaParam', sql.VarChar, fechaHastaLimpia);

    // 3. EJECUTAMOS EL QUERY USANDO LOS PARÁMETROS DEL FRONTEND
    const result = await request.query(` 
   select 
    vd.id 'p_id', 
    vd.nombre nombre, 
    ep.nombre 'Tipo_bounche', 
    g2.nombre 'Tipo_producto', 
    gv.nombre 'Tipo_variedad', 
    '' Tallos, 
    string_agg(convert(varchar, lg.nombre), ', ') within group (order by lg.nombre) Longutud, -- Agrupa las longitudes separadas por coma
    'STD' Corte, 
    eq.nombre 'Empaque',cbreceta.alternoOdoo  as 'bqt_x_hora' 
  from ( 
    select 
      fc.fechaSalida Fecha, 
      bc.idEmpaque, 
      bc.idCalidad, 
      bc.idVariedad, 
      bc.idLongitud, 
      fc.idTipoPedido
 
    from TbExpBunch bc with(nolock) 
    inner join TbExpCajas cj with(nolock) on cj.id=bc.idCaja and cj.estadoVisual=1 
    inner join TbExpFacturas fc with(nolock) on fc.id=cj.idFactura and fc.estadoVisual=1 and fc.idEstadoDocumento<>3 
    left join TbExpBunchAdicionales ab with(nolock) on ab.idBunch=bc.id and ab.estadoVisual=1 
    inner join TbPostTallos tl with(nolock) on tl.id=bc.idTallos 
    left join (select idCaja,count(*) Valor from TbExpBunch with(nolock) where estadoVisual=1 group by idCaja) cc on cc.idCaja=cj.id 
    left join (select idBunch,count(*) Valor from TbExpBunchAdicionales with(nolock) where estadoVisual=1 group by idBunch) cb on cb.idBunch=bc.id 
    left join TbContAdicionalesDocumentos ad with(nolock) on ad.id=ab.idAdicionalDocumento 
    left Join TbContTiposAdicionales ta with(nolock) on ta.id=ad.idTipoAdicionalDocumento 
    where bc.estadoVisual=1 
    
    union 
    
    select 
   
      fc.fechaSalida Fecha, 
      bc.idEmpaque, 
      bc.idCalidad, 
      bc.idVariedad, 
      bc.idLongitud, 
      fc.idTipoPedido
    from TbExpBunch bc with(nolock) 
    inner join TbExpCajas cj with(nolock) on cj.id=bc.idCaja and cj.estadoVisual=1 
    inner join TbExpFacturas fc with(nolock) on fc.id=cj.idFactura and fc.estadoVisual=1 and fc.idEstadoDocumento<>3 
    left join (select idCaja,count(*) Valor from TbExpBunch with(nolock) where estadoVisual=1 group by idCaja) cc on cc.idCaja=cj.id 
    inner join TbPostTallos tl with(nolock) on tl.id=bc.idTallos 
    where bc.estadoVisual=1 
    group by 
      fc.fechaSalida,
      bc.idEmpaque,bc.idCalidad,bc.idVariedad,bc.idLongitud,fc.idTipoPedido,cj.id,fc.idEstadoDocumento,cj.idPostcosecha 
  ) dt 
  inner join TbCulVariedades vd with(nolock) on vd.id=dt.idVariedad 
  inner join TbCulTiposVariedad ep with(nolock) on ep.id=vd.idTipoVariedad 
  inner join TbCulGruposVariedad gv with(nolock) on gv.id=vd.idGrupoVariedad 
  inner join TbCulGruposVariedad2 g2 with(nolock) on g2.id=vd.idGrupoVariedad2 
  inner join TbPostLongitudes lg with(nolock) on lg.id=dt.idLongitud 
  inner join TbExpTiposPedido tp with(nolock) on tp.id=dt.idTipoPedido 
  inner join TbPostEmpaque eq with(nolock) on eq.id=dt.idEmpaque 
  inner join TbPostCalidades cl with(nolock) on cl.id=dt.idCalidad 
  inner join TbPostProductos cbreceta with(nolock) on cbreceta.idVariedad=vd.id 
  
  where 
 
     dt.Fecha between @FechaDesdeParam and dateadd(day, 10, @FechaDesdeParam) 
    and ep.id = 83 
  group by 
    vd.id, 
    vd.nombre, 
    ep.nombre, 
    g2.nombre, 
    gv.nombre, 
    eq.nombre, 
    cbreceta.alternoOdoo

  
       
    `); 
 
    res.json(result.recordset); 
  } catch (err) { 
    console.error("Error en la consulta ventas petite:", err); 
    res.status(500).send("Error al obtener áreas: " + err.message); 
  } 
});






/////////////INICIO GYM/////////////////////////////////////
app.post('/api/RFID/registrarsku', async (req, res) => {
    try {
        const { 
            p_id, nombre, fecha_creacion, usuario_creacion, estadovisual
        } = req.body;

        // Usamos el pool persistente local
        const request = poolflowershop.request();

        // Configuración de inputs parametrizados
        request.input('p_id', sql.VarChar, p_id);
        request.input('nombre', sql.VarChar, nombre);
        // CORRECCIÓN: Si es una fecha en la base de datos, usa sql.DateTime o sql.Date en lugar de VarChar
        request.input('fecha_creacion', sql.DateTime, fecha_creacion ? new Date(fecha_creacion) : new Date());
        request.input('usuario_creacion', sql.VarChar, usuario_creacion);
        request.input('estadovisual', sql.VarChar, estadovisual);
       
        // CORRECCIÓN: Añadidas las columnas faltantes en la definición del INSERT
        await request.query(`
            INSERT INTO skus 
            (p_id, nombre, fecha_creacion, usuario_creacion, estadovisual)
            VALUES 
            (@p_id, @nombre, @fecha_creacion, @usuario_creacion, '1')
        `);

        res.status(201).json({ message: "✅ ¡Registro creado con éxito!" });

    } catch (err) {
        console.error("❌ Error en Registrar sku:", err.message);
        res.status(500).json({ 
            error: "Error en la base de datos",
            message: err.message,
            code: err.code 
        });
    }
});

//VENTAS RECETAS SOLIDOS
app.get('/api/DARTIS/ventas_recetas_solidos', async (req, res) => { 
  try { 
    // 1. OBTENEMOS LAS FECHAS DIRECTAMENTE DESDE EL FRONTEND
    const { desde, hasta } = req.query;

    // Validación rápida de parámetros requeridos para la consulta principal
    if (!desde || !hasta) {
      return res.status(400).send("Faltan los parámetros de fecha 'desde' o 'hasta' en la petición.");
    }

    const fechaDesdeLimpia = desde.replace(/-/g, '');
    const fechaHastaLimpia = hasta.replace(/-/g, '');

    // 2. CONFIGURAMOS LAS SOLICITUDES PARA CADA POOL DE CONEXIÓN
    const requestDartis = pooldartis.request();
    requestDartis.input('FechaDesdeParam', sql.VarChar, fechaDesdeLimpia);
    requestDartis.input('FechaHastaParam', sql.VarChar, fechaHastaLimpia);

    const requestFlowershop = poolflowershop.request();

    // 3. EJECUTAMOS AMBAS CONSULTAS EN DIFERENTES DBS EN PARALELO
    const [resultDartis, resultFlowershop] = await Promise.all([
      // Consulta 1: DB Dartis (Venta del día + Producción)
      requestDartis.query(` 
        SELECT 
            tpp.nombre AS postcosecha, 
            CONCAT(UPPER(tpp.alternoOdoo), '-', tcv.id, '-', tpl.id, '-', tpta.id, '-', tpe.id) AS p_id, 
            CONCAT(UPPER(tctv.nombre),' - ' ,UPPER(tcv.nombre), ' ', tpl.nombre, 'CM ', tpta.nombre, 'ST ', tpe.nombre) AS nombre, 
            UPPER(tcv.nombre) AS variety, 
            tpe.nombre AS packing, 
            'Venta de día' AS origen
        FROM TbExpFacturas tef WITH (NOLOCK) 
        INNER JOIN tbexpcajas tec WITH (NOLOCK) ON tec.idFactura = tef.id AND tec.estadovisual = 1 
        INNER JOIN TbPostPostcosechas tpp WITH (NOLOCK) ON tpp.id = tec.idPostcosecha 
        INNER JOIN TbExpBunch teb WITH (NOLOCK) ON teb.idCaja = tec.id AND teb.estadovisual = 1 
        INNER JOIN TbPostLongitudes tpl WITH (NOLOCK) ON tpl.id = teb.idLongitud 
        INNER JOIN TbPostTallos tpta WITH (NOLOCK) ON tpta.id = teb.idTallos 
        INNER JOIN TbPostProductos tppr WITH (NOLOCK) ON tppr.id = teb.idProducto 
        INNER JOIN TbPostDetallesProducto tpdp WITH (NOLOCK) ON tpdp.idProducto = tppr.id AND tpdp.estadoVisual = 1 
        INNER JOIN TbCulVariedades tcv WITH (NOLOCK) ON tcv.id = teb.idVariedad 
        INNER JOIN tbCulTiposVariedad tctv WITH (NOLOCK) ON tctv.id = tcv.idTipoVariedad AND tctv.id NOT IN (83) 
        INNER JOIN TbPostEmpaque tpe WITH (NOLOCK) ON tpe.id = teb.idEmpaque 
        WHERE tef.fechaSalida = CAST(GETDATE() AS DATE) 
          AND tef.estadovisual = 1 
          AND tef.idestadoDocumento <> 3
          AND tpp.nombre = 'BELLA6'
        GROUP BY 
            tpp.nombre, tpp.alternoOdoo, tcv.id, tpl.id, tpta.id, tpe.id, tctv.nombre, tcv.nombre, tpl.nombre, tpta.nombre, tpe.nombre

        UNION ALL

        SELECT 
            tpp.nombre AS postcosecha, 
            CONCAT(UPPER(tpp.alternoOdoo), '-', tcv.id, '-', tpl.id, '-', tpTallos.id, '-', tpe.id) AS p_id, 
            CONCAT(UPPER(ttv.nombre), ' - ', UPPER(tcv.nombre), ' ', tpl.nombre, 'CM ', tpTallos.nombre, 'ST ', tpe.nombre) AS nombre, 
            UPPER(tcvpadre.nombre) AS variety,
            tpe.nombre AS packing, 
            'Producción' AS origen
        FROM tbPostTransacciones tpt WITH (NOLOCK) 
        INNER JOIN tbPostPostcosechas tpp WITH (NOLOCK) ON tpp.id = tpt.idPostcosecha 
        LEFT JOIN tbExpEmpaqueBunchs teeb WITH (NOLOCK) ON tpt.id = teeb.idTransaccion AND teeb.estadovisual = 1 
        LEFT JOIN tbExpCajas tec WITH (NOLOCK) ON tec.id = teeb.Idcaja 
        INNER JOIN TbPostCalidades tpc WITH (NOLOCK) ON tpc.id = tpt.idCalidad 
        INNER JOIN tbPostProductos tppr WITH (NOLOCK) ON tppr.id = tpt.idProducto 
        INNER JOIN tbPostTallos tpTallos WITH (NOLOCK) ON tpTallos.id = tppr.idTallos 
        INNER JOIN tbPostLongitudes tpl WITH (NOLOCK) ON tpl.id = tppr.idLongitud 
        INNER JOIN TbPostEmpaque tpe WITH (NOLOCK) ON tpe.id = tppr.idEmpaque 
        INNER JOIN tbCulVariedades tcv WITH (NOLOCK) ON tcv.id = tppr.idVariedad 
        INNER JOIN tbCulVariedades tcvpadre WITH (NOLOCK) ON tcvpadre.id = tcv.id 
        INNER JOIN tbCulTiposVariedad ttv WITH (NOLOCK) ON ttv.id = tcvpadre.idTipoVariedad 
        WHERE tpt.fechaRegistro BETWEEN DATEADD(day, -30, GETDATE()) AND GETDATE()
          AND tpt.idTipoTransaccion IN (3) 
          AND tpt.estadovisual = 1 
          AND tpt.tipoRegistro <> 2 
          AND tpp.nombre = 'BELLA6'
        GROUP BY 
            tpp.nombre, tpp.alternoOdoo, tcv.id, tpl.id, tpTallos.id, tpe.id, ttv.nombre, tcv.nombre, tpl.nombre, tpTallos.nombre, tpe.nombre, tcvpadre.nombre;
      `),

      // Consulta 2: DB Flowershop (Tabla Skus) - Corregida la sintaxis de comillas de SQL Server
      requestFlowershop.query(`
        SELECT 
            '' AS postcosecha, 
            p_id, 
            nombre, 
            '' AS variety, 
            '' AS packing, 
            'Creado' AS origen 
        FROM skus where estadovisual ='1';
      `)
    ]);

    // 4. UNIMOS AMBOS SETS DE REGISTROS EN UN SOLO ARRAY DE JAVASCRIPT
    const resultadoTotal = [...resultDartis.recordset, ...resultFlowershop.recordset];
 
    // 5. ENVIAMOS LA DATA INTEGRADA AL FRONTEND
    res.json(resultadoTotal); 
  } catch (err) { 
    console.error("❌ Error integrado en consulta ventas solidos:", err); 
    res.status(500).send("Error al obtener datos integrados: " + err.message); 
  } 
});


// RENDIMIENTO


app.get('/api/DARTIS/rendimiento_producto', async (req, res) => { 
    try {
        // 1. CAPTURAMOS LOS PARÁMETROS ENVIADOS DESDE EL FRONTEND
        const { desde, hasta, cod_producto } = req.query;

        // ================= LOGS CON TODOS LOS FILTROS INCLUIDOS =================
        console.log("================ FILTROS RECIBIDOS ================");
        console.log(`Fecha Desde : ${desde}`);
        console.log(`Fecha Hasta : ${hasta}`);
        console.log(`Código Prod : ${cod_producto}`);
        console.log("===================================================");

        // Validación obligatoria de parámetros
        if (!desde || !hasta || !cod_producto) {
            return res.status(400).send("Faltan parámetros obligatorios: 'desde', 'hasta' o 'cod_producto'.");
        }

        // APLICAMOS LA LIMPIEZA DE FECHAS (Convierte '2026-08-24' en '20260824')
        const fechaDesdeLimpia = desde.replace(/-/g, '');
        const fechaHastaLimpia = hasta.replace(/-/g, '');

        console.log(`Fechas limpias para SQL -> Desde: ${fechaDesdeLimpia} | Hasta: ${fechaHastaLimpia}`);
        console.log("===================================================");

        // 2. USAMOS EL POOL LOCAL CON PARÁMETROS SEGUROS
        const request = poolflowershop.request();
        request.input('FechaDesdeParam', sql.VarChar, fechaDesdeLimpia);
        request.input('FechaHastaParam', sql.VarChar, fechaHastaLimpia);
        request.input('ll_cod_producto', sql.VarChar, cod_producto); 

        // 3. EJECUTAMOS LA CONSULTA FILTRADA CON LEFT JOIN Y GROUP BY
        let result = await request.query(`
          SELECT rendimiento.id,   
       rendimiento.fecha_asignacion,   
       rendimiento.cantidad,   
       rendimiento.asignado,   
       '' as vacio,   
       rendimiento.años,   
       rendimiento.meses,   
       rendimiento.dias,   
       -- Totales calculados existentes
       ISNULL(SUM(CASE WHEN i.estado_bqt = 'Listo' THEN 1 ELSE 0 END), 0) as listo,   
       ISNULL(SUM(CASE WHEN i.estado_bqt = 'Pendiente' THEN 1 ELSE 0 END), 0) as pendiente,   
       
       -- ✅ SE QUEDA ESTA LÍNEA (CÁLCULO REAL)
       ISNULL(SUM(CASE WHEN i.estado_bqt = 'Anulado' THEN 1 ELSE 0 END), 0) as anulado,   
                   
       0 as cantasignada,   
       rendimiento.bqxhora,   
       0 as filanueva,   
       rendimiento.cod_empledo,   
       rendimiento.cod_producto,   
       rendimiento.nombre_producto,   
       rendimiento.nombre_empleado,   
       rendimiento.alias_1,   
       rendimiento.alias_2,   
       rendimiento.mesa,   
       rendimiento.fecha_creacion,   
       rendimiento.identificacion,   
       rendimiento.id_maquina,   
       rendimiento.hora_entrada,   
       rendimiento.hora_salida,   
        rendimiento.hora_almuerzo,
       rendimiento.puesto_maquina,   
       rendimiento.hora_trabajadas,   
       rendimiento.hora_tiempo_labora,   
       '' as anular,   
       rendimiento.idpatinador  ,
       rendimiento.bqt_x_hora  
FROM rendimiento WITH(nolock) 
            
-- ✅ LEFT JOIN CON LA TABLA DE TAGS FILTRANDO SOLO LOS VISIBLES
LEFT JOIN inventario_bqt i ON rendimiento.id = i.id_transaccion 
                 
WHERE ( CONVERT(VARCHAR(8), rendimiento.fecha_asignacion, 112) >= @FechaDesdeParam )   
  AND ( CONVERT(VARCHAR(8), rendimiento.fecha_asignacion, 112) <= @FechaHastaParam )  
  AND ( rendimiento.cod_producto = @ll_cod_producto ) -- ✅ Corregido el doble igual (= =)
  AND ( rendimiento.estado_visual = 1 ) -- ✅ Filtros encapsulados correctamente

-- ✅ AGRUPACIÓN OBLIGATORIA POR TODAS LAS COLUMNAS DE RENDIMIENTO
GROUP BY 
       rendimiento.id,   
       rendimiento.fecha_asignacion,   
       rendimiento.cantidad,   
       rendimiento.asignado,   
       rendimiento.años,   
       rendimiento.meses,   
       rendimiento.dias,   
       rendimiento.bqxhora,   
       rendimiento.cod_empledo,   
       rendimiento.cod_producto,   
       rendimiento.nombre_producto,   
       rendimiento.nombre_empleado,   
       rendimiento.alias_1,   
       rendimiento.alias_2,   
       rendimiento.mesa,   
       rendimiento.fecha_creacion,   
       rendimiento.identificacion,   
       rendimiento.id_maquina,   
       rendimiento.hora_entrada,   
       rendimiento.hora_salida, 
        rendimiento.hora_almuerzo,  
       rendimiento.puesto_maquina,   
       rendimiento.hora_trabajadas,   
       rendimiento.hora_tiempo_labora,   
       rendimiento.idpatinador,
       rendimiento.bqt_x_hora  

        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error en consulta Rendimiento:", err.message);
        res.status(500).send("Error al obtener Rendimiento: " + err.message);
    }
});




app.get('/api/DARTIS/rendimiento_tag', async (req, res) => { 
    try {
        // 1. CAPTURAMOS LOS PARÁMETROS ENVIADOS DESDE EL FRONTEND
        const { idtransaccion } = req.query;

        // ================= LOGS CON TODOS LOS FILTROS INCLUIDOS =================
        console.log("================ FILTROS RECIBIDOS ================");
        console.log(`ID TRANSACCIÓN : ${idtransaccion}`);
     
        // VALIDACIÓN CORREGIDA: Se verifica la variable correcta y que sea numérica
        if (!idtransaccion || isNaN(idtransaccion)) {
            return res.status(400).send("Falta el parámetro obligatorio o formato incorrecto: 'idtransaccion' debe ser un número");
        }

        // Transformamos el parámetro de texto a un entero numérico de JavaScript
        const idTransaccionNumerico = parseInt(idtransaccion, 10);

        // 2. USAMOS EL POOL LOCAL CON PARÁMETROS SEGUROS
        const request = poolflowershop.request();
        
        // CORREGIDO: Cambiado de sql.VarChar a sql.Int usando el valor numérico
        request.input('idtransaccion', sql.Int, idTransaccionNumerico);
      
        // CORREGIDO: Cambiado ':ll_transaccion' por el marcador '@idtransaccion' de SQL Server
        let result = await request.query(`
           SELECT inventario_bqt.id,   
                  inventario_bqt.id_transaccion,   
                  inventario_bqt.fecha_creacion,   
                  inventario_bqt.fecha_anulacion,   
                  inventario_bqt.usuario_anulacion,      
                  inventario_bqt.usuario_creacion,   
                  inventario_bqt.estado_bqt,   
                  inventario_bqt.id_codigo_barra  
                    
                    
             FROM inventario_bqt  
            WHERE inventario_bqt.id_transaccion = @idtransaccion 
            AND inventario_bqt.estado_visual = 1
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error en consulta Rendimiento TAGS:", err.message);
        res.status(500).send("Error al obtener Rendimiento TAGS: " + err.message);
    }
});





app.post('/api/RFID/distribuir_tags_equitativo', async (req, res) => { 
    // 1. Extraemos variables del cuerpo de la petición
    const { fecha, cod_producto, id_maquina } = req.body;

    // Validación básica de parámetros para evitar errores de ejecución
    if (!fecha || !cod_producto || !id_maquina) {
        return res.status(400).json({ error: "Faltan parámetros requeridos en el payload: fecha, cod_producto o id_maquina." });
    }

    // Formateamos la fecha quitando guiones (ej: '2026-09-14' -> '20260914') para compatibilidad universal
    const fechaFormateada = fecha.replace(/-/g, ''); 

    try {
        // --- PASO 1: RECUPERAR TODOS LOS TAGS DISPONIBLES (Query 1) ---
        const request1 = poolflowershop.request();
        request1.input('fecha', sql.VarChar, fechaFormateada);
        request1.input('cod_producto', sql.Int, parseInt(cod_producto, 10));
        request1.input('id_maquina', sql.VarChar, id_maquina.toString());

        // 💡 OPTIMIZACIÓN: CAST(@fecha AS DATETIME) seguro para evitar fallos de formato regional
        let resultadoTags = await request1.query(`
            SELECT i.id AS id_tag, i.id_codigo_barra, r.id AS id_transaccion_origen
            FROM rendimiento r WITH (NOLOCK)
            INNER JOIN inventario_bqt i WITH (NOLOCK) ON i.id_transaccion = r.id
            WHERE r.fecha_asignacion >= CAST(@fecha AS DATETIME) 
              AND r.fecha_asignacion < DATEADD(day, 1, CAST(@fecha AS DATETIME))
              AND r.cod_producto = @cod_producto
              AND i.estado_bqt IN ('Listo', 'Pendiente')
              AND r.id_maquina = @id_maquina
        `);
        
        const listaTags = resultadoTags.recordset; 
        const totalTagsDisponibles = listaTags.length;

        if (totalTagsDisponibles === 0) {
            return res.status(404).json({ error: "No se encontraron tags timbrados ('Listo' o 'Pendiente') para distribuir en este producto, helicóptero y fecha." });
        }

               // --- PASO 2: VERIFICAR LAS TRANSACCIONES DE DESTINO Y CALCULAR HORAS (Query 2) ---
        const request2 = poolflowershop.request();
        request2.input('fecha', sql.VarChar, fechaFormateada);
        request2.input('cod_producto', sql.Int, parseInt(cod_producto, 10));
        request2.input('id_maquina', sql.VarChar, id_maquina.toString());

        // 💡 CORREGIDO: Reemplazado TRIM() por RTRIM(LTRIM()) para compatibilidad universal con SQL antiguo
        let resultadoTransacciones = await request2.query(`
            SELECT 
                r.id AS id_transaccion,
                r.hora_entrada,
                r.hora_almuerzo,
                r.hora_salida,
                (DATEDIFF(MINUTE, CAST(r.hora_entrada AS TIME), CAST(r.hora_salida AS TIME)) 
                 - DATEDIFF(MINUTE, '00:00:00', 
                    CAST(
                        CASE 
                            WHEN r.hora_almuerzo IS NULL OR LEN(RTRIM(LTRIM(r.hora_almuerzo))) < 5 THEN '00:00:00'
                            ELSE r.hora_almuerzo 
                        END AS TIME
                    )
                 )) / 60.0 AS total_horastrabajadas
            FROM rendimiento r WITH (NOLOCK)
            WHERE r.fecha_asignacion >= CAST(@fecha AS DATETIME) 
              AND r.fecha_asignacion < DATEADD(day, 1, CAST(@fecha AS DATETIME))
              AND r.cod_producto = @cod_producto
              AND r.id_maquina = @id_maquina
              AND r.estado_visual = 1
        `);


        let listaTransacciones = resultadoTransacciones.recordset; 
        const totalEmpleados = listaTransacciones.length;

        if (totalEmpleados === 0) {
            return res.status(404).json({ error: "No hay transacciones activas de empleados en este helicóptero para recibir la distribución." });
        }

        // --- PASO 3 Y 4: LÓGICA DE REPARTO EN JAVASCRIPT SEGÚN HORAS TRABAJADAS ---
        const sumaTotalHoras = listaTransacciones.reduce((sum, item) => sum + (item.total_horastrabajadas || 0), 0);

        if (sumaTotalHoras === 0) {
            return res.status(400).json({ error: "La suma de las horas trabajadas es 0. Revisa los horarios de entrada/salida de los empleados." });
        }

        listaTransacciones = listaTransacciones.map(trans => {
            const proporcion = (trans.total_horastrabajadas / sumaTotalHoras) * totalTagsDisponibles;
            return {
                ...trans,
                cantidadADistribuir: Math.floor(proporcion),
                residuo: proporcion - Math.floor(proporcion)
            };
        });

        // AJUSTE DE REDONDEO CRÍTICO: 
        let diferencia = totalTagsDisponibles - listaTransacciones.reduce((sum, t) => sum + t.cantidadADistribuir, 0);
        
        if (diferencia !== 0) {
            listaTransacciones.sort((a, b) => b.residuo - a.residuo);
            for (let i = 0; i < diferencia; i++) {
                if (listaTransacciones[i]) {
                    listaTransacciones[i].cantidadADistribuir += 1;
                }
            }
        }

        // --- PASO 5: PROCESO SEGURO DE ACTUALIZACIÓN (TRANSACTION SQL) ---
        const transaction = new sql.Transaction(poolflowershop);
        await transaction.begin();

        try {
            let tagIndex = 0;

            for (const transaccion of listaTransacciones) {
                const limiteTagsParaEsteEmpleado = transaccion.cantidadADistribuir;

                for (let i = 0; i < limiteTagsParaEsteEmpleado; i++) {
                    if (tagIndex >= totalTagsDisponibles) break; 

                    const tagActual = listaTags[tagIndex];

                    const updateRequest = new sql.Request(transaction);
                    updateRequest.input('id_transaccion', sql.Int, transaccion.id_transaccion);
                    updateRequest.input('id_tag', sql.Int, tagActual.id_tag);

                    await updateRequest.query(`
                        UPDATE inventario_bqt 
                        SET id_transaccion = @id_transaccion
                        WHERE id = @id_tag
                    `);

                    tagIndex++;
                }
            }

            await transaction.commit();

            res.json({
                message: "¡Tags distribuidos correctamente de forma equitativa!",
                detalle: listaTransacciones.map(t => ({
                    transaccion: t.id_transaccion,
                    horas: t.total_horastrabajadas.toFixed(2),
                    tags_entregados: t.cantidadADistribuir
                }))
            });

        } catch (errorSql) {
            await transaction.rollback();
            throw errorSql;
        }

    } catch (err) {
        console.error("❌ Error en consulta Distribución Equitativa:", err.message);
        res.status(500).json({ error: "Error interno en el servidor al procesar la distribución: " + err.message });
    }
});





app.get('/api/DARTIS/ventas_recetas_con_transacciones', async (req, res) => {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
        return res.status(400).json({ error: "Faltan los parámetros de fecha 'desde' o 'hasta'." });
    }

    // Quitamos guiones si tu base de datos lo requiere de forma compacta (opcional, según tu arquitectura)
    const fechaDesdeFormateada = desde.replace(/-/g, '');
    const fechaHastaFormateada = hasta.replace(/-/g, '');

    try {
        const request = poolflowershop.request();
        request.input('desde', sql.VarChar, fechaDesdeFormateada);
        request.input('hasta', sql.VarChar, fechaHastaFormateada);

        // 💡 El INNER JOIN garantiza que si el producto no tiene transacciones en rendimiento, NO se incluye.
        // Usamos DISTINCT para evitar que el mismo producto se duplique muchas veces.
        let resultado = await request.query(`
            SELECT DISTINCT 
                r.cod_producto AS p_id,
                -- Aquí seleccionas los nombres y columnas tal cual se llamen en tu tabla de recetas/productos
                MAX(r.nombre_producto) AS nombre, 
                MAX(r.id_maquina) AS id_maquina,
                r.bqt_x_hora
                -- Agrega aquí campos adicionales si tu frontend los grafica (ej: Tipo_bunch, Longitud, etc.)
            FROM rendimiento r WITH (NOLOCK)
            WHERE r.fecha_asignacion >= CAST(@desde AS DATETIME)
              AND r.fecha_asignacion < DATEADD(day, 1, CAST(@hasta AS DATETIME))
              AND r.estado_visual = 1
            GROUP BY r.cod_producto,r.bqt_x_hora
        `);

        res.json(resultado.recordset);

    } catch (err) {
        console.error("❌ Error al recuperar productos con transacciones:", err.message);
        res.status(500).json({ error: "Error interno al recuperar listado filtrado: " + err.message });
    }
});

app.get('/api/RFID/transacciones_tags', async (req, res) => {
    try {
        const request = poolflowershop.request();

        // 💡 Consulta directa sin parámetros ni filtros de fecha
        let resultado = await request.query(`
            SELECT i.id AS id_tag, 
                   i.estado_bqt,
                   r.nombre_empleado,
                   i.id_codigo_barra, 
                   r.nombre_producto,
                   r.id AS id_transaccion_origen, 
                   r.fecha_asignacion,
                   i.fecha_anulacion,
                   r.fecha_creacion,
                   i.fecha_devolucion ,
                   i.motivo_devolucion 
            FROM rendimiento r WITH (NOLOCK)
            INNER JOIN inventario_bqt i WITH (NOLOCK) ON i.id_transaccion = r.id
            WHERE i.estado_bqt IN ('Pendiente', 'Anulado', 'Devueltos')
        `);

        res.json(resultado.recordset);

    } catch (err) {
        console.error("❌ Error al recuperar n transacciones:", err.message);
        res.status(500).json({ error: "Error interno al recuperar listado filtrado: " + err.message });
    }
});





// ENDPOINT CORREGIDO: ANULACIÓN MASIVA DE TAGS PENDIENTES (VARCHAR USER)
// ============================================================================
app.put('/api/RFID/anular_tags_masivo', async (req, res) => {
    const { tags, usuario_modif } = req.body; 

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ error: "No se proporcionó una lista válida de tags para anular." });
    }

    try {
        const request = poolflowershop.request();
        
        // 💡 CORRECCIÓN: Convertimos explícitamente a String y limitamos a 10 caracteres
        // para cumplir estrictamente con el tipo varchar(10) de tu tabla
        const usuarioTexto = String(usuario_modif || '1').substring(0, 10);
        request.input('usuario_modif', usuarioTexto);

        // Creamos dinámicamente los parámetros para evitar inyección SQL
        const listadoTagsSQL = tags.map((tag, index) => {
            request.input(`tag_${index}`, tag);
            return `@tag_${index}`;
        }).join(', ');

        // Sentencia UPDATE con la restricción de estado Pendiente
        let resultado = await request.query(`
            UPDATE inventario_bqt WITH (ROWLOCK)
            SET estado_bqt = 'Anulado',
                fecha_anulacion = GETDATE(),
                motivo_anulacion = 'Usuario devuelve tags!',
                usuario_anulacion = @usuario_modif
            WHERE id_codigo_barra IN (${listadoTagsSQL})
              AND estado_bqt = 'Pendiente'
        `);

        const filasModificadas = resultado.rowsAffected ? resultado.rowsAffected[0] : 0;

        return res.json({ 
            message: `¡Proceso completado! Se actualizaron y anularon ${filasModificadas} tags que estaban 'Pendientes'.` 
        });

    } catch (err) {
        console.error("❌ Error al anular lote de tags:", err.message);
        return res.status(500).json({ error: "Error interno en el servidor SQL: " + err.message });
    }
});



app.put('/api/RFID/listo_tags_masivo', async (req, res) => {
    const { tags, usuario_modif } = req.body; 

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ error: "No se proporcionó una lista válida de tags para anular." });
    }

    try {
        const request = poolflowershop.request();
        
        // 💡 CORRECCIÓN: Convertimos explícitamente a String y limitamos a 10 caracteres
        // para cumplir estrictamente con el tipo varchar(10) de tu tabla
        const usuarioTexto = String(usuario_modif || '1').substring(0, 10);
        request.input('usuario_modif', usuarioTexto);

        // Creamos dinámicamente los parámetros para evitar inyección SQL
        const listadoTagsSQL = tags.map((tag, index) => {
            request.input(`tag_${index}`, tag);
            return `@tag_${index}`;
        }).join(', ');

        // Sentencia UPDATE con la restricción de estado Pendiente
        let resultado = await request.query(`
            UPDATE inventario_bqt WITH (ROWLOCK)
            SET estado_bqt = 'Listo',
                fecha_listo = GETDATE(),
                motivo_anulacion = 'No lee antena!',
                usuario_listo = @usuario_modif
            WHERE id_codigo_barra IN (${listadoTagsSQL})
              AND estado_bqt = 'Pendiente'
        `);

        const filasModificadas = resultado.rowsAffected ? resultado.rowsAffected[0] : 0;

        return res.json({ 
            message: `¡Proceso completado! Se actualizaron y anularon ${filasModificadas} tags que estaban 'Pendientes'.` 
        });

    } catch (err) {
        console.error("❌ Error al anular lote de tags:", err.message);
        return res.status(500).json({ error: "Error interno en el servidor SQL: " + err.message });
    }
});



// RECORRIDO
app.get('/api/DARTIS/recorrido_dartis', async (req, res) => {
    try {
        // 1. ELIMINADO: let pool = await sql.connect(configdartis); 
        
        // 2. USAMOS DIRECTAMENTE EL POOL QUE DEFINISTE AL INICIO:
        const result = await pooldartis.request()
            .query('SELECT id, nombre FROM TbRrhhRecorridos order by nombre');
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en la consulta recorrido_dartis:", err);
        res.status(500).send("Error al obtener áreas: " + err.message);
    }
});


// PARADA
app.get('/api/DARTIS/parada_dartis', async (req, res) => {
    try {
        // 1. ELIMINADO: let pool = await sql.connect(configdartis); 
        
        // 2. USAMOS DIRECTAMENTE EL POOL QUE DEFINISTE AL INICIO:
        const result = await pooldartis.request()
            .query('SELECT id, nombre FROM TbRrhhParadas with(nolock) order by nombre');
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en la consulta parada_dartis:", err);
        res.status(500).send("Error al obtener áreas: " + err.message);
    }
});

//SUCURSAL
app.get('/api/DARTIS/Sucursales_dartis', async (req, res) => {
    try {
        // 1. ELIMINADO: let pool = await sql.connect(configdartis);
        
        // 2. USAMOS EL POOL QUE YA ESTÁ CONECTADO DESDE EL INICIO
        const result = await pooldartis.request().query(`
            SELECT 
                suc.id AS id,
                per.nombreComercial AS nombre
            FROM TbSisEmpresa emp WITH(NOLOCK)
            INNER JOIN TbGrlPersonas per WITH(NOLOCK) ON per.id = emp.idPersona
            INNER JOIN TbSisSucursales suc WITH(NOLOCK) ON suc.idEmpresa = emp.id
            ORDER BY per.nombreComercial
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en la consulta Sucursales_dartis:", err);
        res.status(500).send("Error al obtener sucursales: " + err.message);
    }
});



//EMPRESAS DARTIS



app.get('/api/DARTIS/Area_dartis', async (req, res) => {
    try {
        // 1. ELIMINADO: let pool = await sql.connect(configdartis); 
        
        // 2. USAMOS EL POOL QUE YA ESTÁ LISTO:
        let result = await pooldartis.request().query('SELECT id, nombre FROM TbRrhhArea with(nolock)');
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en la consulta Area_dartis:", err);
        res.status(500).send("Error al obtener áreas: " + err.message);
    }
});





// Agrega "async" aquí
app.get('/api/DARTIS/Rep_ingactivo', async (req, res) => {
    try {
        const { fIni, fFin } = req.query;
        const fechaInicio = fIni || '2026-02-27';
        const fechaFin = fFin || '2026-02-27';

        // 1. USAMOS EL POOL GLOBAL (Quitamos sql.connect)
        const request = pooldartis.request();
        
        // 2. Pasamos los parámetros
        request.input('fIniParam', sql.Date, fechaInicio);
        request.input('fFinParam', sql.Date, fechaFin);

        // 3. Ejecutamos la consulta sobre el pool específico
        let result = await request.query(`
            DECLARE @Columnas NVARCHAR(MAX), @ColumnasCalculadas NVARCHAR(MAX), @SumaColumnas NVARCHAR(MAX), @Consulta NVARCHAR(MAX);
            DECLARE @FechaInicio DATE = @fIniParam, @FechaFin DATE = @fFinParam;

            SELECT 
                @Columnas = COALESCE(@Columnas + ', ', '') + QUOTENAME(nombre),
                @ColumnasCalculadas = COALESCE(@ColumnasCalculadas + ', ', '') + 
                      'CAST(cantidad * (' + QUOTENAME(nombre) + ' / 100.0) AS DECIMAL(18,2)) AS [Cant. ' + nombre + ']',
                @SumaColumnas = COALESCE(@SumaColumnas + ', ', '') + 
                      'SUM([Cant. ' + nombre + ']) AS [Cant. ' + nombre + ']'
            FROM (
                SELECT DISTINCT IA.nombre
                FROM TbInvDetalleTransacciones DET WITH(NOLOCK)
                INNER JOIN TbInvTransacciones TRA WITH(NOLOCK) ON TRA.id = DET.idTransaccion
                LEFT JOIN TbComIngredientesActivosArticulos IAA WITH(NOLOCK) ON IAA.idArticulo = DET.idArticulo
                LEFT JOIN TbComIngredientesActivos IA WITH(NOLOCK) ON IA.ID = IAA.idIngredienteActivo
                WHERE DET.estadoVisual = 1
                AND CAST(TRA.fechaRegistro AS DATE) BETWEEN @FechaInicio AND @FechaFin
            ) AS Ingredientes;

            IF @Columnas IS NULL 
            BEGIN
                SELECT 'Sin Datos' as Mensaje;
            END
            ELSE
            BEGIN
                SET @Consulta = '
                WITH ResultadoBase AS (
                    SELECT Id, empresa, Fecharegistro, Grupo, SubGrupo, Articulo, cantidad, GradoToxicologico, UnidadMedida, ' + @ColumnasCalculadas + '
                    FROM (
                        SELECT 
                            TRA.ID AS Id,
                            pss.nombreComercial as empresa,
                            FORMAT(TRA.fechaRegistro, ''yyyy/MM/dd'') as Fecharegistro,
                            GRUP.nombre AS Grupo,
                            SUBGRUP.nombre AS SubGrupo,
                            ART.nombre AS Articulo,
                            DET.cantidad,
                            GT.nombre AS GradoToxicologico,
                            UM.nombre AS UnidadMedida,
                            IA.nombre AS IngredienteNombre, 
                            IAA.porcentaje
                        FROM TbInvTransacciones TRA WITH(NOLOCK) 
                        LEFT JOIN TbInvDetalleTransacciones DET WITH(NOLOCK) ON DET.idTransaccion = TRA.id 
                        LEFT JOIN TbComArticulos ART WITH(NOLOCK) ON ART.id = DET.idArticulo
                        LEFT JOIN TbComGrupoArticulos GRUP WITH(NOLOCK) ON GRUP.id = ART.idGrupo
                        LEFT JOIN TbComSubGrupoArticulos SUBGRUP WITH(NOLOCK) ON SUBGRUP.id = ART.idSubGrupo
                        LEFT JOIN TbComGradoToxicologico GT WITH(NOLOCK) ON GT.id = ART.idGradoToxicologico
                        LEFT JOIN TbComUnidadesMedida UM WITH(NOLOCK) ON UM.id = ART.idUnidadMedida
                        LEFT JOIN TbComIngredientesActivosArticulos IAA WITH(NOLOCK) ON IAA.idArticulo = ART.ID
                        LEFT JOIN TbComIngredientesActivos IA WITH(NOLOCK) ON IA.ID = IAA.idIngredienteActivo
                        LEFT JOIN TbSisSucursales sc with(nolock) on sc.id=TRA.idSucursal
                        LEFT JOIN TbGrlPersonas pss with(nolock) on pss.id=sc.idPersona
                        WHERE DET.estadoVisual = 1
                        AND TRA.idestado = 1
                        AND TRA.idtipotransaccion = 3
                        AND GRUP.id in (7,1)
                        AND CAST(TRA.fechaRegistro AS DATE) BETWEEN @fIni AND @fFin
                    ) SourceTable
                    PIVOT (
                        MAX(porcentaje) 
                        FOR IngredienteNombre IN (' + @Columnas + ')
                    ) AS PivotTable
                )
                SELECT * FROM ResultadoBase
                UNION ALL
                SELECT 
                    NULL, ''TOTAL GENERAL'', NULL, NULL, NULL, NULL, SUM(cantidad), NULL, NULL, ' + @SumaColumnas + '
                FROM ResultadoBase;';

                EXEC sp_executesql @Consulta, N'@fIni DATE, @fFin DATE', @fIni = @FechaInicio, @fFin = @FechaFin;
            END
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error en reporte Azure:", err);
        res.status(500).send("Error al obtener datos: " + err.message);
    }
});






// --- API COMEDOR (Sin cambios, filtra hoy) ---
app.get('/api/RRHH/asistencia_comedor', async (req, res) => {
    try {
        const { inicio, fin, empresa, departamento } = req.query; 
          
        
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;
        const filtroEmpresa = empresa || 0; 
        const filtroDepto = departamento || '';

        // 1. Usamos el POOL que ya tenemos abierto
        const request = poolflowershop.request();

        // 2. Agregamos los parámetros de forma limpia
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);
        
        let queryExtra = "";
        if (filtroEmpresa && filtroEmpresa != 0) {
            request.input('empresa', sql.Int, filtroEmpresa);
            queryExtra += ' AND codigo_com_dar = @empresa';
        }
        if (filtroDepto) {
            request.input('departamento', sql.VarChar, filtroDepto);
            queryExtra += ' AND departamento = @departamento';
        }

        // 3. Ejecutamos la consulta optimizada directamente sobre la tabla
        const result = await request.query(`
            SELECT 
                id, 
                codigo_com_dar,
                CASE codigo_com_dar
                    WHEN 1 THEN 'BELLAFLOR'
                    WHEN 2 THEN 'TIMELESSFLOWERS S.A.S.'
                    WHEN 3 THEN 'HIDDENGARDEN CIA LTDA'
                    WHEN 4 THEN 'AMAZINGROSES CIA LTDA'
                    WHEN 5 THEN 'EXPOFLOR CIA. LTDA.'
                    WHEN 6 THEN 'FLORMUNDO CIA LTDA'
                    WHEN 7 THEN 'EXPOFLOR CIA. LTDA.'
                    WHEN 8 THEN 'EXPOFLOR CIA. LTDA.'
                    WHEN 9 THEN 'EXPOFLOR CIA. LTDA.'
                    WHEN 10 THEN 'CAJA DE AHORROS BENEFACTORA BELLA FLOR'
                    WHEN 11 THEN 'HOLDING BELLAFLOR GROUP SCC'
                    WHEN 12 THEN 'OASISFLOWER SAS'
                    WHEN 13 THEN 'OASISORGANICS SAS'
                    WHEN 14 THEN 'EL SALTO AGRICOLA E INDUSTRIAL SA'
                    ELSE 'OTRA / DESCONOCIDA'
                END AS nombre_empresa,
                CONVERT(VARCHAR, fecha_dia, 23) AS fecha_dia, 
                cedula, 
                nombres, 
                departamento,
                CONVERT(VARCHAR, fecha_salida, 23) AS fecha_salida, 
                presente, 
                hora_devuelta_dia, 
                vacaciones, 
                refrigerio,
                desayuno,
                almuer_si, 
                meriend_si,
                feriado,
                calamidad_domestica,
                CONVERT(VARCHAR, fecha_transaccion, 23) AS fecha_transaccion,
                reposo_medico,
                paternidad, 
                maternidad,
                falta_injustificada,
                val_asume_emp_almuer,
                val_asume_emp_meriend,
                codigo_emp_dar, 
                codigo_dep_dar,
                comedor,
                ruta,
                parada,
                pasaje,
                horas_extras,
                estadovisual,
                t_inicio as primera_horaformat ,
                t_fin as ultima_horaformat ,
                time_totales as t_total,
                tipo_dia,
                
                -- 🌟 SE APLICA CONVERT PARA DEVOLVER EL FORMATO 'HH:MM' LISTO PARA EL INPUT DE REACT
                CONVERT(VARCHAR(5), h_inicio_jn, 108) AS h_inicio_jn,
                CONVERT(VARCHAR(5), h_almuerzo, 108) AS h_almuerzo,
                CONVERT(VARCHAR(5), h_inicio_fn, 108) AS h_inicio_fn,
                CONVERT(VARCHAR(5), h_inicio_ext, 108) AS h_inicio_ext,
                CONVERT(VARCHAR(5), h_fin_ext, 108) AS h_fin_ext,
                CONVERT(VARCHAR(5), h_jor_normal, 108) AS h_jor_normal,
                sueldo
                
            FROM rrhh_formulario WITH (NOLOCK)
            WHERE 
              
                CAST(fecha_dia AS DATE) >= @inicio
                AND CAST(fecha_dia AS DATE) <= @fin
                AND (estadovisual <> '0' OR estadovisual IS NULL)
                ${queryExtra}
            ORDER BY nombres,fecha_dia ASC;
        `);

        console.log("Primera fila:", result.recordset[0]);
console.log("Fecha inicio:", inicio);
console.log("Fecha fin:", fin);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error en asistencia_comedor:", err);
        res.status(500).json({ error: 'Error en servidor: ' + err.message });
    }
});


app.get('/api/RRHH/asistencia_comedor_extras', async (req, res) => {
    try {
        const { inicio, fin, empresa, departamento } = req.query; 
          
        
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;
        const filtroEmpresa = empresa || 0; 
        const filtroDepto = departamento || '';

        // 1. Usamos el POOL que ya tenemos abierto
        const request = poolflowershop.request();

        // 2. Agregamos los parámetros de forma limpia
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);
        
        let queryExtra = "";
        if (filtroEmpresa && filtroEmpresa != 0) {
            request.input('empresa', sql.Int, filtroEmpresa);
            queryExtra += ' AND codigo_com_dar = @empresa';
        }
        if (filtroDepto) {
            request.input('departamento', sql.VarChar, filtroDepto);
            queryExtra += ' AND departamento = @departamento';
        }

        // 3. Ejecutamos la consulta optimizada directamente sobre la tabla
        const result = await request.query(`
            SELECT 
                id, 
                codigo_com_dar,
                CASE codigo_com_dar
                    WHEN 1 THEN 'BELLAFLOR'
                    WHEN 2 THEN 'TIMELESSFLOWERS S.A.S.'
                    WHEN 3 THEN 'HIDDENGARDEN CIA LTDA'
                    WHEN 4 THEN 'AMAZINGROSES CIA LTDA'
                    WHEN 5 THEN 'EXPOFLOR CIA. LTDA.'
                    WHEN 6 THEN 'FLORMUNDO CIA LTDA'
                    WHEN 7 THEN 'EXPOFLOR CIA. LTDA.'
                    WHEN 8 THEN 'EXPOFLOR CIA. LTDA.'
                    WHEN 9 THEN 'EXPOFLOR CIA. LTDA.'
                    WHEN 10 THEN 'CAJA DE AHORROS BENEFACTORA BELLA FLOR'
                    WHEN 11 THEN 'HOLDING BELLAFLOR GROUP SCC'
                    WHEN 12 THEN 'OASISFLOWER SAS'
                    WHEN 13 THEN 'OASISORGANICS SAS'
                    WHEN 14 THEN 'EL SALTO AGRICOLA E INDUSTRIAL SA'
                    ELSE 'OTRA / DESCONOCIDA'
                END AS nombre_empresa,
                CONVERT(VARCHAR, fecha_dia, 23) AS fecha_dia, 
                cedula, 
                nombres, 
                departamento,
                CONVERT(VARCHAR, fecha_transaccion, 23) AS fecha_transaccion,
                codigo_emp_dar, 
                codigo_dep_dar,
               
                estadovisual,
                t_inicio as primera_horaformat ,
                t_fin as ultima_horaformat ,
                time_totales as t_total,
                tipo_dia,
                
                -- 🌟 SE APLICA CONVERT PARA DEVOLVER EL FORMATO 'HH:MM' LISTO PARA EL INPUT DE REACT
                CONVERT(VARCHAR(5), h_inicio_jn, 108) AS h_inicio_jn,
                CONVERT(VARCHAR(5), h_almuerzo, 108) AS h_almuerzo,
                CONVERT(VARCHAR(5), h_inicio_fn, 108) AS h_inicio_fn,
                CONVERT(VARCHAR(5), h_inicio_ext, 108) AS h_inicio_ext,
                CONVERT(VARCHAR(5), h_fin_ext, 108) AS h_fin_ext,
                CONVERT(VARCHAR(5), h_jor_normal, 108) AS h_jor_normal,
                sueldo,
                fechaIngreso,
                AntiguedadDias,
                porcentajerendimiento,
                puestotrabajo,
                m_presencia,
                m_ausencia,
                h_presencia,
                h_ausencia


                
            FROM rrhh_extras WITH (NOLOCK)
            WHERE 
              
                CAST(fecha_dia AS DATE) >= @inicio
                AND CAST(fecha_dia AS DATE) <= @fin
                AND (estadovisual <> '0' OR estadovisual IS NULL)
                ${queryExtra}
            ORDER BY nombres,fecha_dia ASC;
        `);

        console.log("Primera fila:", result.recordset[0]);
console.log("Fecha inicio:", inicio);
console.log("Fecha fin:", fin);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error en asistencia_comedor:", err);
        res.status(500).json({ error: 'Error en servidor: ' + err.message });
    }
});


app.get('/api/RRHH/asistencia_comedor_extras_rend', async (req, res) => { 
 try { 
   const { inicio, fin, empresa, departamento } = req.query; 
 
   const hoy = new Date().toISOString().split('T')[0]; 
   const fechaInicio = inicio || hoy; 
   const fechaFin = fin || hoy; 
   const filtroEmpresa = empresa ? parseInt(empresa, 10) : 0; 
   const filtroDepto = departamento || ''; 

   // 1. Usamos el POOL de conexión a base de datos 
   const request = poolflowershop.request(); 

   // 2. Registramos los parámetros de entrada seguros con sus tipos nativos
   request.input('inicio', sql.Date, fechaInicio); 
   request.input('fin', sql.Date, fechaFin); 
   request.input('empresa', sql.Int, filtroEmpresa); 
   request.input('departamento', sql.VarChar, filtroDepto); 

   // 3. Iniciamos la ejecución de la consulta dinámica
   const result = await request.query(` 
     -- MAPEAMOS LOS INPUTS DE NODE A VARIABLES LOCALES DE SQL 
     DECLARE @p_inicio DATE = @inicio; 
     DECLARE @p_fin DATE = @fin; 
     DECLARE @p_empresa INT = @empresa; 
     DECLARE @p_departamento VARCHAR(150) = @departamento; 
 
     DECLARE @sql NVARCHAR(MAX); 
     DECLARE @ColumnasCrear NVARCHAR(MAX) = ''; 
     DECLARE @ColumnasLlamar NVARCHAR(MAX) = ''; 
     DECLARE @SumaTotalHoras NVARCHAR(MAX) = ''; 

     -- A. OPTIMIZACIÓN: Construcción de columnas dinámicas con filtros nativos por DATE
     SET @ColumnasCrear = STUFF(( 
       SELECT ', SUM(CASE WHEN r.bqt_x_hora = ' + CAST(r.bqt_x_hora AS VARCHAR(10)) 
       + ' THEN ISNULL(i.total_tags, 0) ELSE 0 END) AS ' + QUOTENAME('cantidad_tags_' + CAST(r.bqt_x_hora AS VARCHAR(10))) 
       FROM rrhh_extras rh WITH (NOLOCK) 
       INNER JOIN rendimiento r WITH (NOLOCK) ON r.cod_empledo = rh.codigo_emp_dar 
       LEFT JOIN ( 
         SELECT id_transaccion, COUNT(*) AS total_tags 
         FROM inventario_bqt WITH (NOLOCK) 
         WHERE estado_bqt = 'Listo' 
         GROUP BY id_transaccion 
       ) i ON i.id_transaccion = r.id 
       WHERE rh.fecha_dia >= @p_inicio 
         AND rh.fecha_dia <= @p_fin 
         AND (rh.estadovisual <> '0' OR rh.estadovisual IS NULL) 
         AND (@p_empresa = 0 OR rh.codigo_com_dar = @p_empresa) 
         AND (@p_departamento = '' OR rh.departamento = @p_departamento) 
       GROUP BY r.bqt_x_hora 
       FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, ''); 

     -- B. CONCATENAMOS Cantidad y Horas optimizando la lectura por fecha
     SET @ColumnasLlamar = STUFF(( 
       SELECT ', CONCAT(ISNULL(sub.' + QUOTENAME('cantidad_tags_' + CAST(r.bqt_x_hora AS VARCHAR(10))) 
       + ', 0), '' ( '', CAST(ROUND((CAST(ISNULL(sub.' + QUOTENAME('cantidad_tags_' + CAST(r.bqt_x_hora AS VARCHAR(10))) 
       + ', 0) AS DECIMAL(10,2)) / ' + CAST(r.bqt_x_hora AS VARCHAR(10)) + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0), 2) AS DECIMAL(10,2)), '' hrs)'') AS ' 
       + QUOTENAME('cantidad_tags_' + CAST(r.bqt_x_hora AS VARCHAR(10))) 
       FROM rrhh_extras rh WITH (NOLOCK) 
       INNER JOIN rendimiento r WITH (NOLOCK) ON r.cod_empledo = rh.codigo_emp_dar 
       WHERE rh.fecha_dia >= @p_inicio 
         AND rh.fecha_dia <= @p_fin 
         AND (rh.estadovisual <> '0' OR rh.estadovisual IS NULL) 
         AND (@p_empresa = 0 OR rh.codigo_com_dar = @p_empresa) 
         AND (@p_departamento = '' OR rh.departamento = @p_departamento) 
       GROUP BY r.bqt_x_hora 
       FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, ''); 

     -- B.2. Generamos la SUMA total de horas de rendimiento
     SET @SumaTotalHoras = STUFF(( 
       SELECT ' + ROUND((CAST(ISNULL(sub.' + QUOTENAME('cantidad_tags_' + CAST(r.bqt_x_hora AS VARCHAR(10))) 
       + ', 0) AS DECIMAL(10,2)) / ' + CAST(r.bqt_x_hora AS VARCHAR(10)) + '), 2)' 
       FROM rrhh_extras rh WITH (NOLOCK) 
       INNER JOIN rendimiento r WITH (NOLOCK) ON r.cod_empledo = rh.codigo_emp_dar 
       WHERE rh.fecha_dia >= @p_inicio 
         AND rh.fecha_dia <= @p_fin 
         AND (rh.estadovisual <> '0' OR rh.estadovisual IS NULL) 
         AND (@p_empresa = 0 OR rh.codigo_com_dar = @p_empresa) 
         AND (@p_departamento = '' OR rh.departamento = @p_departamento) 
       GROUP BY r.bqt_x_hora 
       FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 3, ''); 

     -- Control preventivo por si no existen registros válidos cargados en el rango
     IF @ColumnasCrear IS NULL OR @ColumnasCrear = '' 
     BEGIN 
       SET @ColumnasCrear = '0 AS cantidad_tags_vacia'; 
       SET @ColumnasLlamar = '''0 - 0.00'' AS cantidad_tags_vacia'; 
       SET @SumaTotalHoras = '0.00'; 
     END 

     -- C. Continuación: Construimos la cadena del SQL Dinámico Principal
     SET @sql = ' 
     SELECT 
       rh.id, 
       rh.codigo_com_dar, 
       CASE rh.codigo_com_dar 
         WHEN 1 THEN ''BELLAFLOR'' 
         WHEN 2 THEN ''TIMELESSFLOWERS S.A.S.'' 
         WHEN 3 THEN ''HIDDENGARDEN CIA LTDA'' 
         WHEN 4 THEN ''AMAZINGROSES CIA LTDA'' 
         WHEN 5 THEN ''EXPOFLOR CIA. LTDA.'' 
         WHEN 6 THEN ''FLORMUNDO CIA LTDA'' 
         WHEN 7 THEN ''EXPOFLOR CIA. LTDA.'' 
         WHEN 8 THEN ''EXPOFLOR CIA. LTDA.'' 
         WHEN 9 THEN ''EXPOFLOR CIA. LTDA.'' 
         WHEN 10 THEN ''CAJA DE AHORROS BENEFACTORA BELLA FLOR'' 
         WHEN 11 THEN ''HOLDING BELLAFLOR GROUP SCC'' 
         WHEN 12 THEN ''OASISFLOWER SAS'' 
         WHEN 13 THEN ''OASISORGANICS SAS'' 
         WHEN 14 THEN ''EL SALTO AGRICOLA E INDUSTRIAL SA'' 
         ELSE ''OTRA / DESCONOCIDA'' 
       END AS nombre_empresa, 
       CONVERT(VARCHAR, rh.fecha_dia, 23) AS fecha_dia, 
       rh.cedula, 
       rh.nombres, 
       rh.departamento, 
       CONVERT(VARCHAR, rh.fecha_transaccion, 23) AS fecha_transaccion, 
       rh.codigo_emp_dar, 
       rh.codigo_dep_dar, 
       rh.estadovisual, 
       rh.t_inicio as primera_horaformat, 
       rh.t_fin as ultima_horaformat, 
       rh.time_totales as t_total, 
       rh.tipo_dia, 
       CONVERT(VARCHAR(5), rh.h_inicio_jn, 108) AS h_inicio_jn, 
       CONVERT(VARCHAR(5), rh.h_almuerzo, 108) AS h_almuerzo, 
       CONVERT(VARCHAR(5), rh.h_inicio_fn, 108) AS h_inicio_fn, 
       CONVERT(VARCHAR(5), rh.h_inicio_ext, 108) AS h_inicio_ext, 
       CONVERT(VARCHAR(5), rh.h_fin_ext, 108) AS h_fin_ext, 
       CONVERT(VARCHAR(5), rh.h_jor_normal, 108) AS h_jor_normal, 
       rh.sueldo, 
       rh.fechaIngreso, 
       rh.AntiguedadDias, 
       rh.porcentajerendimiento, 
       rh.puestotrabajo, 
       rh.m_presencia, 
       rh.m_ausencia, 
       rh.h_presencia, 
       rh.h_ausencia, 
       rh.h_autorizadas, 
       rh.h_bono, 
       ISNULL(sub.cantidad_tags_totales, 0) AS cantidad_tags_totales, 
       ' + @ColumnasLlamar + ', 
       CAST(ROUND((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0), 2) AS DECIMAL(10,2)) AS horas_totales_calculadas, 
       
       CASE 
         WHEN CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) > 0 
         THEN CONCAT(''+'', CAST(CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) AS VARCHAR(20))) 
         WHEN CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) < 0 
         THEN CAST(CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) AS VARCHAR(20)) 
         ELSE ''0.00'' 
       END AS horas_extras_calculadas, 
       CASE 
         WHEN CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) > 0 
         THEN CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) 
         ELSE 0.00 
       END AS hora_excede, 
       8 as hora_dia, 
       
       ISNULL(rh.h_presencia, 0) + ISNULL(rh.h_ausencia, 0) AS [total_horas_sin_proceso], 
       CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) + ISNULL(rh.h_presencia, 0) + ISNULL(rh.h_ausencia, 0), 2) AS DECIMAL(10,2)) AS [horas_totales_netas], 
       
       CASE 
         WHEN CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) > 0 
         THEN CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) 
         ELSE 0.00 
       END + ISNULL(rh.h_presencia, 0) + ISNULL(rh.h_ausencia, 0) AS horas_adicionales_netas, 
       
       CASE 
         WHEN CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) > 0 
         THEN CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) 
         ELSE 0.00 
       END + ISNULL(rh.h_presencia, 0) + ISNULL(rh.h_ausencia, 0) - h_autorizadas AS horas_bono 
     FROM rrhh_extras rh WITH (NOLOCK) 
     LEFT JOIN ( 
       SELECT 
         rh2.codigo_emp_dar, 
         rh2.fecha_dia, 
         SUM(ISNULL(i.total_tags, 0)) AS cantidad_tags_totales, 
         ' + @ColumnasCrear + ' 
       FROM rrhh_extras rh2 WITH (NOLOCK) 
       LEFT JOIN rendimiento r WITH (NOLOCK) ON r.cod_empledo = rh2.codigo_emp_dar 
       LEFT JOIN ( 
         SELECT id_transaccion, bqt_x_hora, COUNT(*) AS total_tags 
         FROM inventario_bqt WITH (NOLOCK) 
         INNER JOIN rendimiento r_in WITH (NOLOCK) on r_in.id = inventario_bqt.id_transaccion 
         WHERE estado_bqt = ''Listo'' 
           -- OPTIMIZACIÓN CRÍTICA: Búsqueda directa sobre el índice de tiempo sin usar CAST
           AND fecha_asignacion >= @inner_inicio 
           AND fecha_asignacion <= DATEADD(second, -1, DATEADD(day, 1, CAST(@inner_fin AS DATETIME)))
         GROUP BY id_transaccion, bqt_x_hora 
       ) i ON i.id_transaccion = r.id AND i.bqt_x_hora = r.bqt_x_hora 
       WHERE rh2.fecha_dia >= @inner_inicio 
         AND rh2.fecha_dia <= @inner_fin 
         AND (rh2.estadovisual <> ''0'' OR rh2.estadovisual IS NULL) 
         AND (@inner_empresa = 0 OR rh2.codigo_com_dar = @inner_empresa) 
         AND (@inner_departamento = '''' OR rh2.departamento = @inner_departamento) 
       GROUP BY rh2.codigo_emp_dar, rh2.fecha_dia 
     ) sub ON sub.codigo_emp_dar = rh.codigo_emp_dar AND sub.fecha_dia = rh.fecha_dia 
     WHERE rh.fecha_dia >= @inner_inicio 
       AND rh.fecha_dia <= @inner_fin 
       AND (rh.estadovisual <> ''0'' OR rh.estadovisual IS NULL) 
       AND (@inner_empresa = 0 OR rh.codigo_com_dar = @inner_empresa) 
       AND (@inner_departamento = '''' OR rh.departamento = @inner_departamento) 
     ORDER BY rh.nombres, rh.fecha_dia ASC;'; 

     -- D. Ejecutamos la sentencia compilada mapeando los parámetros
     EXEC sp_executesql 
       @sql, 
       N'@inner_inicio DATE, @inner_fin DATE, @inner_empresa INT, @inner_departamento VARCHAR(150)', 
       @inner_inicio = @p_inicio, 
       @inner_fin = @p_fin, 
       @inner_empresa = @p_empresa, 
       @inner_departamento = @p_departamento; 
   `); 

   console.log("Filas recuperadas exitosamente:", result.recordset.length); 
   res.json(result.recordset); 
 } catch (err) { 
   console.error("Error en asistencia_comedor_extras_rend:", err); 
   res.status(500).json({ error: 'Error en servidor: ' + err.message }); 
 } 
});


app.get('/api/RRHH/informacion_vacaciones', async (req, res) => {
    try {
        const { año, empresa, departamento } = req.query; 
        
        // 1. Instanciamos el request del pool central
        const request = poolflowershop.request();

        // 2. Definimos las condiciones base del WHERE
        let condiciones = ["(estadovisual <> '0' OR estadovisual IS NULL)"];

        // 3. Evaluamos e inyectamos los filtros dinámicamente desde Node.js
        
        // Filtro de Año: Se aplica si tiene valor y no es "Todos"
        if (año && año.trim() !== '' && año !== 'Todos') {
            request.input('anioFiltro', sql.Numeric(18, 0), parseInt(año, 10));
            condiciones.push("año = @anioFiltro");
        }

        // Filtro de Empresa: Se aplica si tiene valor y no es "Todos" (Usa la variable 'empresa')
        if (empresa && empresa.trim() !== '' && empresa !== 'Todos') {
            request.input('empresaFiltro', sql.Numeric(18, 0), parseInt(empresa, 10));
            condiciones.push("codigo_com_dar = @empresaFiltro");
        }

        // Filtro de Departamento: Se aplica si tiene valor y no es "Todos" (Mantiene el string para VarChar)
        if (departamento && departamento.trim() !== '' && departamento !== 'Todos') {
            request.input('departamentoFiltro', sql.VarChar(200), departamento.trim());
            condiciones.push("departamento = @departamentoFiltro");
        }

        // 4. Armamos el Query final concatenando las condiciones con un AND
        const queryCompleto = `
            SELECT id,
                   empresa,
                   idemp,
                   nombres,
                   departamento,
                   dias_vacaciones_ganadas,
                   dias_vacaciones_pendientes,
                   año,
                   enero, febrero, marzo, abril, mayo, junio,
                   julio, agosto, septiembre, octubre, noviembre, diciembre,
                   fecha_creacion,
                   usuario_creacion,
                   fecha_modificacion,
                   usuario_modificacion,
                   codigo_com_dar,
                   estadovisual,
                   codigo_dep_dar,
                   fecha_ingreso,
                   gerencia,
                   jefedirecto,
                   actividad,
                   periodo_rol,
                   idrol
            FROM sioret_vacaciones WITH(nolock)
            WHERE ${condiciones.join(' AND ')}
        `;

        // 5. Ejecutamos de forma limpia
        const result = await request.query(queryCompleto);

        console.log("Filas recuperadas exitosamente:", result.recordset.length);
        res.json(result.recordset);

    } catch (err) {
        console.error("Error en informacion_vacaciones:", err);
        res.status(500).json({ error: 'Error en servidor: ' + err.message });
    }
});



app.get('/api/RRHH/rep_bono_rend', async (req, res) => {

    try {
        const { inicio, fin, empresa, departamento } = req.query; 
          
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;
        const filtroEmpresa = empresa ? parseInt(empresa, 10) : 0; 
        const filtroDepto = departamento || '';

        // 1. Usamos el POOL de conexión a base de datos
        const request = poolflowershop.request();

        // 2. Registramos los parámetros de entrada seguros
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);
        request.input('empresa', sql.Int, filtroEmpresa);
        request.input('departamento', sql.VarChar, filtroDepto);

        // 3. Ejecutamos la consulta dinámica completa con los filtros nativos en SQL
        const result = await request.query(`
            -- MAPEAMOS LOS INPUTS DE NODE A VARIABLES LOCALES DE SQL
            DECLARE @p_inicio DATE = @inicio;
            DECLARE @p_fin DATE = @fin;
            DECLARE @p_empresa INT = @empresa;
            DECLARE @p_departamento VARCHAR(150) = @departamento;

          

 DECLARE @sql NVARCHAR(MAX); 
 DECLARE @ColumnasCrear NVARCHAR(MAX) = ''; 
 DECLARE @ColumnasLlamar NVARCHAR(MAX) = ''; 
 DECLARE @SumaTotalHoras NVARCHAR(MAX) = ''; 

 -- A. CORRECCIÓN CRÍTICA: Cambiamos MAX por SUM para acumular transacciones de la misma velocidad
 SET @ColumnasCrear = STUFF(( 
 SELECT ', SUM(CASE WHEN r.bqt_x_hora = ' + CAST(r.bqt_x_hora AS VARCHAR(10)) + ' 
THEN ISNULL(i.total_tags, 0) ELSE 0 END) AS ' + QUOTENAME('cantidad_tags_' + CAST(r.bqt_x_hora AS VARCHAR(10))) 
 FROM rrhh_extras rh WITH (NOLOCK) 
 INNER JOIN rendimiento r WITH (NOLOCK) ON r.cod_empledo = rh.codigo_emp_dar 
 LEFT JOIN ( 
 SELECT id_transaccion, COUNT(*) AS total_tags 
 FROM inventario_bqt WITH (NOLOCK) 
 WHERE estado_bqt = 'Listo' 
 GROUP BY id_transaccion 
 ) i ON i.id_transaccion = r.id 
 WHERE CAST(rh.fecha_dia AS DATE) >= @p_inicio 
 AND CAST(rh.fecha_dia AS DATE) <= @p_fin 
 AND (rh.estadovisual <> '0' OR rh.estadovisual IS NULL) 
 AND (@p_empresa = 0 OR rh.codigo_com_dar = @p_empresa) 
 AND (@p_departamento = '' OR rh.departamento = @p_departamento)
 GROUP BY r.bqt_x_hora 
 FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, ''); 

 -- B. CONCATENAMOS Cantidad y Horas en un solo campo dinámico 
 SET @ColumnasLlamar = STUFF(( 
 SELECT 
 ', CONCAT(ISNULL(sub.' + QUOTENAME('cantidad_tags_' + CAST(r.bqt_x_hora AS VARCHAR(10))) + ', 0), '' ( '', ' + 
 'CAST(ROUND((CAST(ISNULL(sub.' + QUOTENAME('cantidad_tags_' + CAST(r.bqt_x_hora AS VARCHAR(10))) + ', 0) AS DECIMAL(10,2)) / ' + CAST(r.bqt_x_hora AS VARCHAR(10)) + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0), 2) AS DECIMAL(10,2)), '' hrs)'') AS ' + QUOTENAME('cantidad_tags_' + CAST(r.bqt_x_hora AS VARCHAR(10))) 
 FROM rrhh_extras rh WITH (NOLOCK) 
 INNER JOIN rendimiento r WITH (NOLOCK) ON r.cod_empledo = rh.codigo_emp_dar 
 WHERE CAST(rh.fecha_dia AS DATE) >= @p_inicio 
 AND CAST(rh.fecha_dia AS DATE) <= @p_fin 
 AND (rh.estadovisual <> '0' OR rh.estadovisual IS NULL) 
 AND (@p_empresa = 0 OR rh.codigo_com_dar = @p_empresa) 
 AND (@p_departamento = '' OR rh.departamento = @p_departamento) 
 GROUP BY r.bqt_x_hora 
 FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, ''); 

 -- B.2. Generamos la SUMA numérica de todas las horas 
 SET @SumaTotalHoras = STUFF(( 
 SELECT 
 ' + ROUND((CAST(ISNULL(sub.' + QUOTENAME('cantidad_tags_' + CAST(r.bqt_x_hora AS VARCHAR(10))) + ', 0) AS DECIMAL(10,2)) / ' + CAST(r.bqt_x_hora AS VARCHAR(10)) + '), 2)' 
 FROM rrhh_extras rh WITH (NOLOCK) 
 INNER JOIN rendimiento r WITH (NOLOCK) ON r.cod_empledo = rh.codigo_emp_dar 
 WHERE CAST(rh.fecha_dia AS DATE) >= @p_inicio 
 AND CAST(rh.fecha_dia AS DATE) <= @p_fin 
 AND (rh.estadovisual <> '0' OR rh.estadovisual IS NULL) 
 AND (@p_empresa = 0 OR rh.codigo_com_dar = @p_empresa) 
 AND (@p_departamento = '' OR rh.departamento = @p_departamento) 
 GROUP BY r.bqt_x_hora 
 FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 3, ''); 

 -- Control por si no existen registros registrados en esa fecha 
 IF @ColumnasCrear IS NULL OR @ColumnasCrear = '' 
 BEGIN 
 SET @ColumnasCrear = '0 AS cantidad_tags_vacia'; 
 SET @ColumnasLlamar = ', 0 AS cantidad_tags_vacia'; 
 SET @SumaTotalHoras = '0.00'; 
 END 
 ELSE 
 BEGIN 
 SET @ColumnasLlamar = ', ' + @ColumnasLlamar; 
 END 

 -- C. Construimos el string del SQL Dinámico Final 
 SET @sql = ';WITH ResultadoFinal AS ( 
 SELECT 
 CONVERT(VARCHAR, rh.fecha_dia, 23) AS fecha_dia, 
 rh.cedula, 
 rh.nombres, 
 rh.departamento, 
 rh.tipo_dia, 
 ISNULL(sub.cantidad_tags_totales, 0) AS cantidad_tags_totales_fijo,
 CASE 
 WHEN CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) > 0 
 THEN CAST(ROUND(((' + @SumaTotalHoras + ') * (ISNULL(rh.porcentajerendimiento, 100) / 100.0)) - 8.00, 2) AS DECIMAL(10,2)) 
 ELSE 0.00 
 END + ISNULL(rh.h_presencia, 0) + ISNULL(rh.h_ausencia, 0) - ISNULL(rh.h_autorizadas, 0) AS horas_bono' 
 + @ColumnasLlamar + 
 ' FROM rrhh_extras rh WITH (NOLOCK) 
 LEFT JOIN ( 
 SELECT 
 rh2.codigo_emp_dar, 
 rh2.fecha_dia, 
 SUM(ISNULL(i.total_tags, 0)) AS cantidad_tags_totales, 
 ' + @ColumnasCrear + ' 
 FROM rrhh_extras rh2 WITH (NOLOCK) 
 LEFT JOIN rendimiento r WITH (NOLOCK) ON r.cod_empledo = rh2.codigo_emp_dar 
 LEFT JOIN ( 
 SELECT id_transaccion, bqt_x_hora, COUNT(*) AS total_tags 
 FROM inventario_bqt WITH (NOLOCK) 
 INNER JOIN rendimiento r WITH (NOLOCK) ON r.id = inventario_bqt.id_transaccion
 WHERE estado_bqt = ''Listo'' 
 AND CAST(fecha_asignacion AS DATE) >= @inner_inicio 
 AND CAST(fecha_asignacion AS DATE) <= @inner_fin
 GROUP BY id_transaccion, bqt_x_hora
 ) i ON i.id_transaccion = r.id AND i.bqt_x_hora = r.bqt_x_hora
 WHERE CAST(rh2.fecha_dia AS DATE) >= @inner_inicio 
 AND CAST(rh2.fecha_dia AS DATE) <= @inner_fin 
 AND (rh2.estadovisual <> ''0'' OR rh2.estadovisual IS NULL) 
 AND (@inner_empresa = 0 OR rh2.codigo_com_dar = @inner_empresa) 
 AND (@inner_departamento = '''' OR rh2.departamento = @inner_departamento) 
 GROUP BY rh2.codigo_emp_dar, rh2.fecha_dia 
 ) sub ON sub.codigo_emp_dar = rh.codigo_emp_dar AND sub.fecha_dia = rh.fecha_dia 
 WHERE CAST(rh.fecha_dia AS DATE) >= @inner_inicio 
 AND CAST(rh.fecha_dia AS DATE) <= @inner_fin 
 AND (rh.estadovisual <> ''0'' OR rh.estadovisual IS NULL) 
 AND (@inner_empresa = 0 OR rh.codigo_com_dar = @inner_empresa) 
 AND (@inner_departamento = '''' OR rh.departamento = @inner_departamento) 
 ) 
 SELECT * 
 FROM ResultadoFinal 
 WHERE cantidad_tags_totales_fijo > 0 
   AND horas_bono > 0 
 ORDER BY nombres, fecha_dia ASC;'; 

 -- D. Ejecutamos pasando parámetros mapeados de manera segura 
 EXEC sp_executesql 
 @sql, 
 N'@inner_inicio DATE, @inner_fin DATE, @inner_empresa INT, @inner_departamento VARCHAR(150)', 
 @inner_inicio = @p_inicio, 
 @inner_fin = @p_fin, 
 @inner_empresa = @p_empresa, 
 @inner_departamento = @p_departamento;



        `);

        console.log("Filas recuperadas exitosamente:", result.recordset.length);
        res.json(result.recordset);

    } catch (err) {
        console.error("Error en asistencia_comedor_extras_rend:", err);
        res.status(500).json({ error: 'Error en servidor: ' + err.message });
    }
});


//reportes HEXT CULTIVO
app.get('/api/RRHH/rep_horas_extras', async (req, res) => {
    try {
        const { inicio, fin, empresa, departamento } = req.query; 
          
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;
        const filtroEmpresa = empresa || 0; 
        const filtroDepto = departamento || '';

        // 1. Usamos el POOL que ya tenemos abierto
        const request = poolflowershop.request();

        // 2. Agregamos los parámetros obligatorios de forma limpia
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);
        
        // Construcción dinámica de filtros opcionales
        let queryExtra = "";
        if (filtroEmpresa && filtroEmpresa != 0) {
            request.input('empresa', sql.Int, filtroEmpresa);
            queryExtra += ' AND f.codigo_com_dar = @empresa';
        }
        if (filtroDepto) {
            request.input('departamento', sql.VarChar, filtroDepto);
            queryExtra += ' AND f.departamento = @departamento';
        }

        // 3. Ejecutamos la consulta usando variables @inicio y @fin, más el queryExtra dinámico
        const result = await request.query(`
     
SELECT
f.codigo_emp_dar AS idemp1,
f.departamento AS AREA,
f.cedula AS CEDULA,
f.nombres AS EMPLEADO,
CONVERT(VARCHAR(10), f.fecha_dia, 23) AS fecha_dia,
f.tipo_dia AS [TIPO DIA],
-- Nombre del día en español (Se corrige la lectura de DATEPART por estándar de SQL)
CASE ((DATEPART(dw, f.fecha_dia) + @@DATEFIRST - 2) % 7 + 1)
WHEN 1 THEN 'LUNES' WHEN 2 THEN 'MARTES' WHEN 3 THEN 'MIERCOLES'
WHEN 4 THEN 'JUEVES' WHEN 5 THEN 'VIERNES' WHEN 6 THEN 'SABADO'
ELSE 'DOMINGO'
END AS DIA,
CONVERT(VARCHAR(5), f.h_inicio_jn, 108) AS h_inicio_jn,
CONVERT(VARCHAR(5), f.h_almuerzo, 108) AS h_almuerzo,
CONVERT(VARCHAR(5), f.h_inicio_fn, 108) AS h_inicio_fn,
CONVERT(VARCHAR(5), f.h_inicio_ext, 108) AS h_inicio_ext,
CONVERT(VARCHAR(5), f.h_fin_ext, 108) AS f_h_fin_ext,
CONVERT(VARCHAR(5), f.h_jor_normal, 108) AS h_jor_normal,
f.sueldo AS SUELDO_BASE,
-- Formato Visual de Horas (HH:MM) - CALCULO DE JORNADA NOCTURNA (19:00 a 06:00)
CASE
WHEN f.h_inicio_jn IS NULL OR f.h_inicio_fn IS NULL THEN '00:00'
WHEN f.tipo_dia IN ('FIN DE SEMANA', 'FERIADO') THEN '00:00'
ELSE
CONVERT(VARCHAR(5),
DATEADD(MINUTE,
CASE
-- CASO 1: Termina el mismo día (Evaluamos bloque mañana 00-06 y bloque tarde 19-24)
WHEN f.h_inicio_fn >= f.h_inicio_jn THEN
-- Minutos en la madrugada (00:00 a 06:00)
CASE WHEN f.h_inicio_jn < '06:00:00'
THEN DATEDIFF(MINUTE, f.h_inicio_jn, CASE WHEN f.h_inicio_fn < '06:00:00' THEN f.h_inicio_fn ELSE '06:00:00' END)
ELSE 0 END +
-- Minutos en la noche (19:00 a 24:00)
CASE WHEN f.h_inicio_fn > '19:00:00'
THEN DATEDIFF(MINUTE, CASE WHEN f.h_inicio_jn > '19:00:00' THEN f.h_inicio_jn ELSE '19:00:00' END, f.h_inicio_fn)
ELSE 0 END
-- CASO 2: Pasa de la medianoche
ELSE
DATEDIFF(MINUTE, CASE WHEN f.h_inicio_jn > '19:00:00' THEN f.h_inicio_jn ELSE '19:00:00' END, '23:59:59') + 1 +
DATEDIFF(MINUTE, '00:00:00', CASE WHEN f.h_inicio_fn < '06:00:00' THEN f.h_inicio_fn ELSE '06:00:00' END)
END,
'00:00:00'),
108)
END AS [HORAS RECARGO NOCTURNO (25%)],

CASE WHEN f.tipo_dia = 'NORMAL' AND f.h_inicio_ext IS NOT NULL AND f.h_fin_ext IS NOT NULL
THEN RIGHT('0' + CAST(DATEDIFF(MINUTE, f.h_inicio_ext, f.h_fin_ext) / 60 AS VARCHAR(2)), 2) + ':' +
RIGHT('0' + CAST(DATEDIFF(MINUTE, f.h_inicio_ext, f.h_fin_ext) % 60 AS VARCHAR(2)), 2)
ELSE '00:00' END AS [HORAS SUPLENTARIA (50%)],

CASE WHEN f.tipo_dia IN ('FIN DE SEMANA', 'FERIADO') AND f.h_inicio_jn IS NOT NULL AND f.h_inicio_fn IS NOT NULL
THEN RIGHT('0' + CAST((DATEDIFF(MINUTE, f.h_inicio_jn, f.h_inicio_fn) -
(ISNULL(DATEPART(HOUR, f.h_almuerzo),0) * 60 + ISNULL(DATEPART(MINUTE, f.h_almuerzo),0))) / 60 AS VARCHAR(2)), 2) + ':' +
RIGHT('0' + CAST((DATEDIFF(MINUTE, f.h_inicio_jn, f.h_inicio_fn) -
(ISNULL(DATEPART(HOUR, f.h_almuerzo),0) * 60 + ISNULL(DATEPART(MINUTE, f.h_almuerzo),0))) % 60 AS VARCHAR(2)), 2)
ELSE '00:00' END AS [HORA EXTRAORDINARIA (100%)],

-- # CANTIDAD NUMÉRICA DE HORAS RECARGO NOCTURNO
CASE
WHEN f.h_inicio_jn IS NULL OR f.h_inicio_fn IS NULL THEN 0.00
WHEN f.tipo_dia IN ('FIN DE SEMANA', 'FERIADO') THEN 0.00
ELSE
CAST(
CASE
-- Mismo día
WHEN f.h_inicio_fn >= f.h_inicio_jn THEN
CASE WHEN f.h_inicio_jn < '06:00:00'
THEN DATEDIFF(MINUTE, f.h_inicio_jn, CASE WHEN f.h_inicio_fn < '06:00:00' THEN f.h_inicio_fn ELSE '06:00:00' END)
ELSE 0 END +
CASE WHEN f.h_inicio_fn > '19:00:00'
THEN DATEDIFF(MINUTE, CASE WHEN f.h_inicio_jn > '19:00:00' THEN f.h_inicio_jn ELSE '19:00:00' END, f.h_inicio_fn)
ELSE 0 END
-- Cruzando medianoche
ELSE
DATEDIFF(MINUTE, CASE WHEN f.h_inicio_jn > '19:00:00' THEN f.h_inicio_jn ELSE '19:00:00' END, '23:59:59') + 1 +
DATEDIFF(MINUTE, '00:00:00', CASE WHEN f.h_inicio_fn < '06:00:00' THEN f.h_inicio_fn ELSE '06:00:00' END)
END
AS DECIMAL(10, 2)) / 60.0
END AS [# HORAS RECARGO NOCTURNO],

CASE WHEN f.tipo_dia = 'NORMAL' AND f.h_inicio_ext IS NOT NULL AND f.h_fin_ext IS NOT NULL
THEN DATEDIFF(MINUTE, f.h_inicio_ext, f.h_fin_ext) / 60.0
ELSE 0.00 END AS [# HORAS SUPLEMENTARIAS],

CASE WHEN f.tipo_dia IN ('FIN DE SEMANA', 'FERIADO') AND f.h_inicio_jn IS NOT NULL AND f.h_inicio_fn IS NOT NULL
THEN (DATEDIFF(MINUTE, f.h_inicio_jn, f.h_inicio_fn) - (ISNULL(DATEPART(HOUR, f.h_almuerzo),0) * 60 + ISNULL(DATEPART(MINUTE, f.h_almuerzo),0))) / 60.0
ELSE 0.00 END AS [# HORAS EXTRAORDINARIAS],

-- #VALOR HORAS RECARGO NOCTURNO
CAST(
(ISNULL(f.sueldo, 0) / 240.0) * 0.25 *
CASE
WHEN f.h_inicio_jn IS NULL OR f.h_inicio_fn IS NULL THEN 0.00
WHEN f.tipo_dia IN ('FIN DE SEMANA', 'FERIADO') THEN 0.00
ELSE
CAST(
CASE WHEN f.h_inicio_fn >= f.h_inicio_jn THEN
CASE WHEN f.h_inicio_jn < '06:00:00'
THEN DATEDIFF(MINUTE, f.h_inicio_jn, CASE WHEN f.h_inicio_fn < '06:00:00' THEN f.h_inicio_fn ELSE '06:00:00' END)
ELSE 0 END +
CASE WHEN f.h_inicio_fn > '19:00:00'
THEN DATEDIFF(MINUTE, CASE WHEN f.h_inicio_jn > '19:00:00' THEN f.h_inicio_jn ELSE '19:00:00' END, f.h_inicio_fn)
ELSE 0 END
ELSE
DATEDIFF(MINUTE, CASE WHEN f.h_inicio_jn > '19:00:00' THEN f.h_inicio_jn ELSE '19:00:00' END, '23:59:59') + 1 +
DATEDIFF(MINUTE, '00:00:00', CASE WHEN f.h_inicio_fn < '06:00:00' THEN f.h_inicio_fn ELSE '06:00:00' END)
END
AS DECIMAL(10, 2)) / 60.0
END
AS DECIMAL(10, 2)) AS [VALOR HORAS RECARGO NOCTURNO],

CASE WHEN f.tipo_dia = 'NORMAL' AND f.h_inicio_ext IS NOT NULL AND f.h_fin_ext IS NOT NULL
THEN CAST((DATEDIFF(MINUTE, f.h_inicio_ext, f.h_fin_ext) / 60.0) * (f.sueldo / 240.0 * 1.5) AS DECIMAL(18,2))
ELSE 0.00 END AS [VALOR HORAS SUPLEMENTARIAS],

CASE WHEN f.tipo_dia IN ('FIN DE SEMANA', 'FERIADO') AND f.h_inicio_jn IS NOT NULL AND f.h_inicio_fn IS NOT NULL
THEN CAST(((DATEDIFF(MINUTE, f.h_inicio_jn, f.h_inicio_fn) -
(ISNULL(DATEPART(HOUR, f.h_almuerzo),0) * 60 + ISNULL(DATEPART(MINUTE, f.h_almuerzo),0))) / 60.0) * (f.sueldo / 240.0 * 2.0) AS DECIMAL(18,2))
ELSE 0.00 END AS [VALOR HORAS EXTRAORDINARIAS],

-- # VALOR TOTAL HORAS EXTRAS (Suma corregida con la nueva nocturna)
CAST(
-- 1. VALOR RECARGO NOCTURNO
((ISNULL(f.sueldo, 0) / 240.0) * 0.25 *
CASE
WHEN f.h_inicio_jn IS NULL OR f.h_inicio_fn IS NULL THEN 0.00
WHEN f.tipo_dia IN ('FIN DE SEMANA', 'FERIADO') THEN 0.00
ELSE
CAST(CASE WHEN f.h_inicio_fn >= f.h_inicio_jn THEN
CASE WHEN f.h_inicio_jn < '06:00:00'
THEN DATEDIFF(MINUTE, f.h_inicio_jn, CASE WHEN f.h_inicio_fn < '06:00:00' THEN f.h_inicio_fn ELSE '06:00:00' END)
ELSE 0 END +
CASE WHEN f.h_inicio_fn > '19:00:00'
THEN DATEDIFF(MINUTE, CASE WHEN f.h_inicio_jn > '19:00:00' THEN f.h_inicio_jn ELSE '19:00:00' END, f.h_inicio_fn)
ELSE 0 END
ELSE DATEDIFF(MINUTE, CASE WHEN f.h_inicio_jn > '19:00:00' THEN f.h_inicio_jn ELSE '19:00:00' END, '23:59:59') + 1 + DATEDIFF(MINUTE, '00:00:00', CASE WHEN f.h_inicio_fn < '06:00:00' THEN f.h_inicio_fn ELSE '06:00:00' END) END AS DECIMAL(10, 2)) / 60.0
END
) +
-- 2. VALOR HORAS SUPLEMENTARIAS 50%
((ISNULL(f.sueldo, 0) / 240.0) * 1.50 *
CASE WHEN f.tipo_dia = 'NORMAL' AND f.h_inicio_ext IS NOT NULL AND f.h_fin_ext IS NOT NULL
THEN CAST(DATEDIFF(MINUTE, f.h_inicio_ext, f.h_fin_ext) AS DECIMAL(10,2)) / 60.0
ELSE 0.00 END
) +
-- 3. VALOR HORAS EXTRAORDINARIAS 100%
((ISNULL(f.sueldo, 0) / 240.0) * 2.00 *
CASE WHEN f.tipo_dia IN ('FIN DE SEMANA', 'FERIADO') AND f.h_inicio_jn IS NOT NULL AND f.h_inicio_fn IS NOT NULL
THEN CAST(DATEDIFF(MINUTE, f.h_inicio_jn, f.h_inicio_fn) - (ISNULL(DATEPART(HOUR, f.h_almuerzo), 0) * 60 + ISNULL(DATEPART(MINUTE, f.h_almuerzo), 0)) AS DECIMAL(10,2)) / 60.0
ELSE 0.00 END
)
AS DECIMAL(10, 2)) AS [VALOR HORAS EXTRAS]

FROM rrhh_extras f WITH (NOLOCK)
WHERE
f.fecha_dia BETWEEN @inicio AND @fin
AND ISNULL(f.estadovisual, '') <> '0'

 ${queryExtra} 


AND (
    -- 1. Valor Recargo Nocturno > 0 (Corregido para evaluar bloque madrugada de 00:00 a 06:00)
    (
        f.h_inicio_jn IS NOT NULL AND f.h_inicio_fn IS NOT NULL
        AND f.tipo_dia NOT IN ('FIN DE SEMANA', 'FERIADO')
        AND CASE
            -- Mismo día
            WHEN f.h_inicio_fn >= f.h_inicio_jn THEN
                CASE WHEN f.h_inicio_jn < '06:00:00'
                THEN DATEDIFF(MINUTE, f.h_inicio_jn, CASE WHEN f.h_inicio_fn < '06:00:00' THEN f.h_inicio_fn ELSE '06:00:00' END)
                ELSE 0 END +
                CASE WHEN f.h_inicio_fn > '19:00:00'
                THEN DATEDIFF(MINUTE, CASE WHEN f.h_inicio_jn > '19:00:00' THEN f.h_inicio_jn ELSE '19:00:00' END, f.h_inicio_fn)
                ELSE 0 END
            -- Cruzando medianoche
            ELSE 
                DATEDIFF(MINUTE, CASE WHEN f.h_inicio_jn > '19:00:00' THEN f.h_inicio_jn ELSE '19:00:00' END, '23:59:59') + 1 + 
                DATEDIFF(MINUTE, '00:00:00', CASE WHEN f.h_inicio_fn < '06:00:00' THEN f.h_inicio_fn ELSE '06:00:00' END)
        END > 0
    )
    OR
    -- 2. Valor Horas Suplementarias > 0
    (
        f.tipo_dia = 'NORMAL' AND f.h_inicio_ext IS NOT NULL AND f.h_fin_ext IS NOT NULL
        AND DATEDIFF(MINUTE, f.h_inicio_ext, f.h_fin_ext) > 0
    )
    OR
    -- 3. Valor Horas Extraordinarias > 0
    (
        f.tipo_dia IN ('FIN DE SEMANA', 'FERIADO') AND f.h_inicio_jn IS NOT NULL AND f.h_inicio_fn IS NOT NULL
        AND (DATEDIFF(MINUTE, f.h_inicio_jn, f.h_inicio_fn) - (ISNULL(DATEPART(HOUR, f.h_almuerzo),0) * 60 + ISNULL(DATEPART(MINUTE, f.h_almuerzo),0))) > 0
    )
)
ORDER BY f.nombres, f.fecha_dia ASC;


        `);

        console.log("Primera fila:", result.recordset[0]);
        console.log("Fecha inicio:", fechaInicio);
        console.log("Fecha fin:", fechaFin);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error en asistencia_comedor:", err);
        res.status(500).json({ error: 'Error en servidor: ' + err.message });
    }
});




app.put('/api/RRHH/update_comedor_masivo', async (req, res) => {
    try {
        console.log("📥 BACKEND - Cuerpo de petición recibido (req.body):", req.body);

        const { fechaOrigen, fechaDestino, idEmpresa, departamento } = req.body;

        if (!fechaOrigen || !fechaDestino || !idEmpresa || !departamento) {
            return res.status(400).json({ error: 'Todos los filtros son obligatorios.' });
        }

        // QUERY DEFINITIVO CON CAMPO CORREGIDO A 'codigo_com_dar'
        const querySQL = `
            UPDATE destino
            SET destino.comedor = origen.comedor
            FROM rrhh_formulario AS destino WITH(NOLOCK)
            INNER JOIN rrhh_formulario AS origen WITH(NOLOCK)
                ON destino.cedula = origen.cedula
            WHERE 
                CAST(origen.fecha_dia AS DATE) = @fechaOrigen
                AND CAST(destino.fecha_dia AS DATE) = @fechaDestino
                -- Filtrado exclusivo por el origen usando la columna correcta de la empresa
                AND origen.codigo_com_dar = @idEmpresa
                AND origen.departamento = @departamento
                AND (destino.estadovisual <> '0' OR destino.estadovisual IS NULL)
                AND (origen.estadovisual <> '0' OR origen.estadovisual IS NULL);
        `;

       
        const debugSQL = `
-- COPY / PASTE EN SSMS PARA PRUEBAS:
DECLARE @fechaOrigen DATE = '${fechaOrigen}';
DECLARE @fechaDestino DATE = '${fechaDestino}';
DECLARE @idEmpresa INT = ${idEmpresa};
DECLARE @departamento VARCHAR(100) = '${departamento.replace(/'/g, "''")}';

${querySQL}
        `;

        console.log("🖥️  QUERY EJECUTADO EN VALORES REALES:\n", debugSQL);

                // Configuración y ejecución segura de la petición a la base de datos
        const request = poolflowershop.request();
        
        // CORRECCIÓN: Se cambia sql.Date por sql.VarChar para evitar desfases de zona horaria
        request.input('fechaOrigen', sql.VarChar, fechaOrigen);
        request.input('fechaDestino', sql.VarChar, fechaDestino);
        request.input('idEmpresa', sql.Int, idEmpresa); 
        request.input('departamento', sql.VarChar, departamento);


        const result = await request.query(querySQL);
        const filasActualizadas = Array.isArray(result.rowsAffected) ? result.rowsAffected[0] : result.rowsAffected;
        
        console.log(`✅ SQL SERVER - Filas afectadas en la réplica: ${filasActualizadas || 0}`);

        res.json({ 
            success: true, 
            message: `Réplica completada. Se actualizaron ${filasActualizadas || 0} registros.` 
        });

    } catch (err) {
        console.error("❌ Error en replicación masiva directa por SQL:", err);
        res.status(500).json({ error: 'Error en servidor: ' + err.message });
    }
});



///ASISTENCIA NORMAL
app.get('/api/RRHH/asistencia_comedor_normal', async (req, res) => {
    try {
        const { inicio, fin, empresa, departamento } = req.query; 
        
        const hoy = new Date().toISOString().split('T');
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;
        const filtroEmpresa = empresa || 0; 
        const filtroDepto = departamento || ''; // Viene del cliente

        const request = poolflowershop.request();

        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);
        
        let queryExtra = "";

        // Filtro de Empresa (Sigue igual)
        if (filtroEmpresa && filtroEmpresa != 0) {
            request.input('empresa', sql.Int, filtroEmpresa);
            queryExtra += ' AND codigo_com_dar = @empresa';
        }

        // --- CORRECCIÓN AQUÍ: Filtro por código numérico ---
        if (filtroDepto && filtroDepto !== '') {
            request.input('departamento', sql.Int, filtroDepto); // Cambiado a sql.Int
            queryExtra += ' AND codigo_dep_dar = @departamento'; // Cambiado de 'departamento' a 'codigo_dep_dar'
        }

        const result = await request.query(`
            SELECT * FROM (
                SELECT 
                    id, 
                    codigo_com_dar,
                    CASE codigo_com_dar
                        WHEN 1 THEN 'BELLAFLOR'
                        WHEN 2 THEN 'TIMELESSFLOWERS S.A.S.'
                        WHEN 3 THEN 'HIDDENGARDEN CIA LTDA'
                        WHEN 4 THEN 'AMAZINGROSES CIA LTDA'
                        WHEN 5 THEN 'EXPOFLOR CIA. LTDA.'
                        WHEN 6 THEN 'FLORMUNDO CIA LTDA'
                        WHEN 7 THEN 'EXPOFLOR CIA. LTDA.'
                        WHEN 8 THEN 'EXPOFLOR CIA. LTDA.'
                        WHEN 9 THEN 'EXPOFLOR CIA. LTDA.'
                        WHEN 10 THEN 'CAJA DE AHORROS BENEFACTORA BELLA FLOR'
                        WHEN 11 THEN 'HOLDING BELLAFLOR GROUP SCC'
                        WHEN 12 THEN 'OASISFLOWER SAS'
                        WHEN 13 THEN 'OASISORGANICS SAS'
                        WHEN 14 THEN 'EL SALTO AGRICOLA E INDUSTRIAL SA'
                        ELSE 'OTRA / DESCONOCIDA'
                    END AS nombre_empresa,
                    CONVERT(VARCHAR, fecha_dia, 23) AS fecha_dia, 
                    cedula, 
                    nombres, 
                    departamento, -- Nombre del dpto para mostrar en tabla
                    CONVERT(VARCHAR, fecha_salida, 23) AS fecha_salida, 
                    presente, 
                    hora_devuelta_dia, 
                    vacaciones, 
                    refrigerio,
                    desayuno,
                    almuer_si, 
                    meriend_si,
                    feriado,
                    calamidad_domestica,
                    CONVERT(VARCHAR, fecha_transaccion, 23) AS fecha_transaccion,
                    reposo_medico,
                    paternidad, 
                    maternidad,
                    falta_injustificada,
                    val_asume_emp_almuer,
                    val_asume_emp_meriend,
                    codigo_emp_dar, 
                    comedor,
                     ruta,
                                parada,
                                pasaje,
                                horas_extras,
                    codigo_dep_dar, -- <--- CAMPO CLAVE PARA EL FILTRO
                    estadovisual,
                    tipo_dia,
                h_inicio_jn,
                h_almuerzo,
                h_inicio_fn,
                h_inicio_ext,
                h_fin_ext,
                h_jor_normal
                FROM rrhh_formulario with(nolock)
            ) AS subconsulta
            WHERE 
                (estadovisual <> '0' OR estadovisual IS NULL)
                AND fecha_dia BETWEEN @inicio AND @fin
                ${queryExtra}
            ORDER BY nombres ASC;
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error en asistencia_comedor:", err);
        res.status(500).json({ error: 'Error en servidor: ' + err.message });
    }
});


// Para actualizar tu empledo de asistencia
app.put('/api/RRHH/asistencia_comedor/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Asumiendo que 'user' es accesible globalmente o viene en el request
       

        const { 
            presente, almuer_si, meriend_si, feriado, calamidad_domestica, vacaciones,
            refrigerio, desayuno, reposo_medico, paternidad, maternidad, 
            falta_injustificada, val_asume_emp_almuer, val_asume_emp_meriend, hora_devuelta_dia ,usuario_modif,comedor
        } = req.body;

        const request = poolflowershop.request();

        // Parámetros existentes
        request.input('id', sql.Int, id);
        request.input('presente', sql.VarChar, presente);
        request.input('almuer_si', sql.VarChar, almuer_si);
        request.input('meriend_si', sql.VarChar, meriend_si);
        request.input('feriado', sql.VarChar, feriado);
        request.input('calamidad_domestica', sql.VarChar, calamidad_domestica);
        request.input('vacaciones', sql.VarChar, vacaciones);
        request.input('refrigerio', sql.VarChar, refrigerio);
        request.input('desayuno', sql.VarChar, desayuno);
        request.input('reposo_medico', sql.VarChar, reposo_medico);
        request.input('paternidad', sql.VarChar, paternidad);
        request.input('maternidad', sql.VarChar, maternidad);
        request.input('falta_injustificada', sql.VarChar, falta_injustificada);
        request.input('val_asume_emp_almuer', sql.VarChar, val_asume_emp_almuer);
        request.input('val_asume_emp_meriend', sql.VarChar, val_asume_emp_meriend);
        request.input('hora_devuelta_dia', sql.VarChar, hora_devuelta_dia);
         request.input('comedor', sql.VarChar, comedor);
       // request.input('horas_extras', sql.Decimal(5, 2), horas_extras); 
         

        // 3. Mapeo del usuario que realiza la transacción
        request.input('usuario_modif', sql.Int, usuario_modif); 
        
        await request.query(`
            UPDATE rrhh_formulario  
            SET presente = @presente, 
                almuer_si = @almuer_si, 
                meriend_si = @meriend_si,
                feriado = @feriado,
                calamidad_domestica = @calamidad_domestica,
                vacaciones = @vacaciones,
                refrigerio = @refrigerio,
                desayuno = @desayuno,
                reposo_medico = @reposo_medico,
                paternidad = @paternidad,
                maternidad = @maternidad,
                falta_injustificada = @falta_injustificada,
                val_asume_emp_almuer = @val_asume_emp_almuer,
                val_asume_emp_meriend = @val_asume_emp_meriend,
                hora_devuelta_dia = @hora_devuelta_dia, 
                usuario_modif = @usuario_modif,
                comedor = @comedor
              
                
            WHERE id = @id
        `);

        res.json({ success: true, message: "✅ Actualizado correctamente en DB Local" });

    } catch (err) {
        console.error("❌ Error al actualizar asistencia:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});



//HORAS EXTRAS
app.put('/api/RRHH/asistencia_comedor_hext/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            
            usuario_modif,
            tipo_dia,
            sueldo, // 1. NUEVO: Recibe el sueldo enviado desde el frontend
            // NUEVO: Desestructuración de los 6 campos de tiempo
            h_inicio_jn,
            h_almuerzo,
            h_inicio_fn,
            h_inicio_ext,
            h_fin_ext,
            h_jor_normal
        } = req.body;
        
        const request = poolflowershop.request();

        // Parámetros existentes
        request.input('id', sql.Int, id);
       
        request.input('usuario_modif', sql.Int, usuario_modif); 
        request.input('tipo_dia', sql.VarChar(100), tipo_dia); 
        
        // 2. NUEVO: Declaración del parámetro sueldo para la consulta SQL
        // Usamos sql.Decimal(10, 2) para soportar de manera segura valores de sueldos con céntimos
        request.input('sueldo', sql.Decimal(10, 2), sueldo ? parseFloat(sueldo) : 0);

        const parsearHoraParaSQL = (horaStr) => {
            if (!horaStr || horaStr === '') return null;
            
            // Si la cadena ya viene limpia en formato "HH:MM", creamos una fecha dummy para mssql
            if (typeof horaStr === 'string' && horaStr.includes(':') && horaStr.length <= 8) {
                const [horas, minutos] = horaStr.split(':');
                const d = new Date();
                d.setHours(parseInt(horas, 10), parseInt(minutos, 10), 0, 0);
                return d; // Tedious acepta objetos Date perfectamente para tipos sql.Time
            }
            return horaStr; // Si ya es otra estructura, la dejamos pasar
        };

        // NUEVO: Declaración de parámetros con tipo de dato sql.Time para SQL Server
        // Mapeamos los campos recibidos del body usando la función limpiadora
        request.input('h_inicio_jn', sql.Time, parsearHoraParaSQL(h_inicio_jn));
        request.input('h_almuerzo', sql.Time, parsearHoraParaSQL(h_almuerzo));
        request.input('h_inicio_fn', sql.Time, parsearHoraParaSQL(h_inicio_fn));
        request.input('h_inicio_ext', sql.Time, parsearHoraParaSQL(h_inicio_ext));
        request.input('h_fin_ext', sql.Time, parsearHoraParaSQL(h_fin_ext));
        request.input('h_jor_normal', sql.Time, parsearHoraParaSQL(h_jor_normal));
        
        // 3. NUEVO: Query extendida inyectando la actualización de la columna sueldo
        await request.query(`
            UPDATE rrhh_extras
            SET 
                usuario_modif = @usuario_modif,
                tipo_dia = @tipo_dia,
                sueldo = @sueldo,
                h_inicio_jn = @h_inicio_jn,
                h_almuerzo = @h_almuerzo,
                h_inicio_fn = @h_inicio_fn,
                h_inicio_ext = @h_inicio_ext,
                h_fin_ext = @h_fin_ext,
                h_jor_normal = @h_jor_normal
            WHERE id = @id
        `);

        res.json({ success: true, message: "✅ Actualizado correctamente en DB Local" });

    } catch (err) {
        console.error("❌ Error al actualizar registro de asistencia:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});




//HORAS EXTRAS
app.put('/api/RRHH/asistencia_comedor_hext_rend/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            usuario_modif,
            tipo_dia,
            sueldo, 
            h_inicio_jn,
            h_almuerzo,
            h_inicio_fn,
            h_inicio_ext,
            h_fin_ext,
            h_jor_normal,
            m_presencia,
            m_ausencia,
            h_presencia,
            h_ausencia,
            h_autorizadas
        } = req.body;
        
        const request = poolflowershop.request();

        // Parámetros existentes
        request.input('id', sql.Int, id);
        request.input('usuario_modif', sql.Int, usuario_modif); 
        request.input('tipo_dia', sql.VarChar(100), tipo_dia); 
        request.input('m_presencia', sql.VarChar(100), m_presencia); 
        request.input('m_ausencia', sql.VarChar(100), m_ausencia); 
       
        const valorHorasAutorizadas = (h_autorizadas !== undefined && h_autorizadas !== null && h_autorizadas !== '') 
            ? parseFloat(h_autorizadas) 
            : 0.00;

        // Declaras el parámetro como 'h_autorizadas'
        request.input('h_autorizadas', sql.Decimal(18, 2), valorHorasAutorizadas);

        request.input('h_presencia', sql.Decimal(18, 2), h_presencia ? parseFloat(h_presencia) : null); 
        request.input('h_ausencia', sql.Decimal(18, 2), h_ausencia ? parseFloat(h_ausencia) : null);
        request.input('sueldo', sql.Decimal(10, 2), sueldo ? parseFloat(sueldo) : 0);

        const parsearHoraParaSQL = (horaStr) => {
            if (!horaStr || horaStr === '') return null;
            if (typeof horaStr === 'string' && horaStr.includes(':') && horaStr.length <= 8) {
                const [horas, minutos] = horaStr.split(':');
                const d = new Date();
                d.setHours(parseInt(horas, 10), parseInt(minutos, 10), 0, 0);
                return d; 
            }
            return horaStr; 
        };

        request.input('h_inicio_jn', sql.Time, parsearHoraParaSQL(h_inicio_jn));
        request.input('h_almuerzo', sql.Time, parsearHoraParaSQL(h_almuerzo));
        request.input('h_inicio_fn', sql.Time, parsearHoraParaSQL(h_inicio_fn));
        request.input('h_inicio_ext', sql.Time, parsearHoraParaSQL(h_inicio_ext));
        request.input('h_fin_ext', sql.Time, parsearHoraParaSQL(h_fin_ext));
        request.input('h_jor_normal', sql.Time, parsearHoraParaSQL(h_jor_normal));
        
        // CORREGIDO: Se cambia @valorHorasAutorizadas por @h_autorizadas
        await request.query(`
            UPDATE rrhh_extras
            SET 
                usuario_modif = @usuario_modif,
                tipo_dia = @tipo_dia,
                sueldo = @sueldo,
                h_inicio_jn = @h_inicio_jn,
                h_almuerzo = @h_almuerzo,
                h_inicio_fn = @h_inicio_fn,
                h_inicio_ext = @h_inicio_ext,
                h_fin_ext = @h_fin_ext,
                h_jor_normal = @h_jor_normal,
                m_presencia = @m_presencia,
                m_ausencia = @m_ausencia,
                h_presencia = @h_presencia,
                h_ausencia = @h_ausencia,
                h_autorizadas = @h_autorizadas
            WHERE id = @id
        `);

        res.json({ success: true, message: "✅ Actualizado correctamente en DB Local" });

    } catch (err) {
        console.error("❌ Error al actualizar registro de asistencia:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});




//VACACIONES
app.put('/api/RRHH/actualizar_mes_vacaciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            enero,
            febrero,
            marzo,
            abril,
            mayo,
            junio,
            julio,
            agosto,
            septiembre,
            octubre,
            noviembre,
            diciembre
        } = req.body;
        
        const request = poolflowershop.request();

        // 1. Identificador de la fila
        request.input('id', sql.Int, id);

        // 2. Función auxiliar para normalizar los valores vacíos o nulos a 0.00
        const parsearMesParaSQL = (valorMes) => {
            if (valorMes === undefined || valorMes === null || valorMes === '') return 0.00;
            const num = parseFloat(valorMes);
            return isNaN(num) ? 0.00 : num;
        };

        // 3. Registro de inputs seguros para cada mes con tipo Decimal(18,2)
        request.input('enero', sql.Decimal(18, 2), parsearMesParaSQL(enero));
        request.input('febrero', sql.Decimal(18, 2), parsearMesParaSQL(febrero));
        request.input('marzo', sql.Decimal(18, 2), parsearMesParaSQL(marzo));
        request.input('abril', sql.Decimal(18, 2), parsearMesParaSQL(abril));
        request.input('mayo', sql.Decimal(18, 2), parsearMesParaSQL(mayo));
        request.input('junio', sql.Decimal(18, 2), parsearMesParaSQL(junio));
        request.input('julio', sql.Decimal(18, 2), parsearMesParaSQL(julio));
        request.input('agosto', sql.Decimal(18, 2), parsearMesParaSQL(agosto));
        request.input('septiembre', sql.Decimal(18, 2), parsearMesParaSQL(septiembre));
        request.input('octubre', sql.Decimal(18, 2), parsearMesParaSQL(octubre));
        request.input('noviembre', sql.Decimal(18, 2), parsearMesParaSQL(noviembre));
        request.input('diciembre', sql.Decimal(18, 2), parsearMesParaSQL(diciembre));
        
        // 4. Ejecución del UPDATE modificando exclusivamente los 12 meses
        await request.query(`
            UPDATE SIORET_VACACIONES
            SET 
                enero = @enero,
                febrero = @febrero,
                marzo = @marzo,
                abril = @abril,
                mayo = @mayo,
                junio = @junio,
                julio = @julio,
                agosto = @agosto,
                septiembre = @septiembre,
                octubre = @octubre,
                noviembre = @noviembre,
                diciembre = @diciembre
            WHERE id = @id
        `);

        res.json({ success: true, message: "✅ Meses de vacaciones actualizados correctamente en DB Local" });

    } catch (err) {
        console.error("❌ Error al actualizar registro de vacaciones:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


// Ruta para actualización MASIVA
app.put('/api/RRHH/almuerza_si_masivo', async (req, res) => {
    try {
        const { ids, usuario_modif } = req.body; // Recibimos array de IDs y el usuario

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "No se proporcionaron IDs válidos" });
        }

        const request = poolflowershop.request();
        
        // Configuramos el usuario que modifica
        request.input('usuario_modif', sql.Int, usuario_modif);
        request.input('valor_si', sql.VarChar, 'si');

        // IMPORTANTE: SQL Server no acepta arrays directamente en @ids. 
        // Concatenamos los IDs de forma segura (asumiendo que son números)
        const idsString = ids.join(',');

        await request.query(`
            UPDATE rrhh_formulario 
            SET  
                almuer_si = @valor_si, 
                usuario_modif = @usuario_modif
               
            WHERE id IN (${idsString})
        `);

        res.json({ success: true, message: `✅ ${ids.length} registros actualizados correctamente` });

    } catch (err) {
        console.error("❌ Error al actualizar masivo:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


// Ruta para marcar ASISTENCIA (presente) masiva
app.put('/api/RRHH/presente_no_masivo', async (req, res) => {
    try {
        const { ids, usuario_modif } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "No se proporcionaron IDs" });
        }

        const request = poolflowershop.request();
        request.input('usuario_modif', sql.Int, usuario_modif);
        request.input('valor_si', sql.VarChar, 'no');

        const idsString = ids.join(',');

        await request.query(`
            UPDATE rrhh_formulario 
            SET  
                presente = @valor_si, 
                usuario_modif = @usuario_modif
               
            WHERE id IN (${idsString})
        `);

        res.json({ success: true, message: `✅ ${ids.length} registros marcados como NO PRESENTES` });

    } catch (err) {
        console.error("❌ Error en asistencia masiva:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/RRHH/presente_si_masivo', async (req, res) => {
    try {
        const { ids, usuario_modif } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "No se proporcionaron IDs" });
        }

        const request = poolflowershop.request();
        request.input('usuario_modif', sql.Int, usuario_modif);
        request.input('valor_si', sql.VarChar, 'si');

        const idsString = ids.join(',');

        await request.query(`
            UPDATE rrhh_formulario 
            SET  
                presente = @valor_si, 
                usuario_modif = @usuario_modif
               
            WHERE id IN (${idsString})
        `);

        res.json({ success: true, message: `✅ ${ids.length} registros marcados como NO PRESENTES` });

    } catch (err) {
        console.error("❌ Error en asistencia masiva:", err);
        res.status(500).json({ error: err.message });
    }
});



app.put('/api/RRHH/almuerza_y_presente_masivo', async (req, res) => {
    try {
        const { ids, usuario_modif } = req.body;

        if (!ids || ids.length === 0) {
            return res.status(400).json({ error: "No hay IDs" });
        }

        const request = poolflowershop.request();
        request.input('usuario_modif', sql.Int, usuario_modif);
        request.input('si', sql.VarChar, 'si');

        const idsString = ids.join(',');

        // Actualizamos AMBOS campos en una sola consulta
        await request.query(`
            UPDATE rrhh_formulario 
            SET  
                almuer_si = @si, 
                presente = @si, 
                usuario_modif = @usuario_modif
            WHERE id IN (${idsString})
        `);

        res.json({ success: true, message: "Actualización masiva completada" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.put('/api/RRHH/ingresohorasautorizadas', async (req, res) => {
    try {
        const { ids, usuario_modif, hora } = req.body; 

        // 1. Verificación de IDs
        if (!ids || ids.length === 0) {
            return res.status(400).json({ error: "No hay IDs" });
        }
        
        // 2. CORRECCIÓN: Validar que no sea undefined o null, permitiendo el número 0
        if (hora === undefined || hora === null || hora === '') {
            return res.status(400).json({ error: "Debe ingresar una hora" });
        }

        const request = poolflowershop.request();
        
        // 3. CORRECCIÓN: 'usuario_autoriza' mapeado correctamente como entero numérico
        request.input('usuario_autoriza', sql.Int, usuario_modif);
        
        // 4. CORRECCIÓN: Mapear la hora como Decimal para soportar fracciones (ej: 1.5, 2.75)
        request.input('hora_autorizada', sql.Decimal(10, 2), parseFloat(hora)); 

        // Unimos los IDs de forma segura para la cláusula IN
        const idsString = ids.join(',');

        // 🚀 EJECUCIÓN DE LA CONSULTA CON EL ROLLBACK MASIVO INTEGRADO
        await request.query(`
            UPDATE rrhh_extras 
            SET  
                h_autorizadas = @hora_autorizada, 
                usuario_autoriza = @usuario_autoriza,
                -- ACCIÓN DE ROLLBACK: Limpia las horas extras de forma masiva
                h_inicio_ext = NULL,
                h_fin_ext = NULL
            WHERE id IN (${idsString})
        `);

        res.json({ success: true, message: "Actualización masiva y rollback completados" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});





app.put('/api/RRHH/finsemana_masivo', async (req, res) => {
    try {
        // 1. Recibimos "tipo_dia" desde el Frontend
        const { ids, usuario_modif, tipo_dia } = req.body; 

        if (!ids || ids.length === 0) {
            return res.status(400).json({ error: "No hay IDs" });
        }
        // Validamos que sea uno de los tres permitidos
        if (!['NORMAL', 'FERIADO', 'FIN DE SEMANA'].includes(tipo_dia)) {
            return res.status(400).json({ error: "Tipo de día no válido" });
        }

        const request = poolflowershop.request();
        request.input('usuario_modif', sql.Int, usuario_modif);
        request.input('tipo_dia', sql.VarChar, tipo_dia); // 2. Pasamos el parámetro dinámico

        const idsString = ids.join(',');

        await request.query(`
            UPDATE rrhh_formulario 
            SET  
                tipo_dia = @tipo_dia, 
                usuario_modif = @usuario_modif
            WHERE id IN (${idsString})
        `);

        res.json({ success: true, message: "Actualización masiva completada" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.put('/api/RRHH/finsemana_masivo_extras', async (req, res) => {
    try {
        // 1. Recibimos "tipo_dia" desde el Frontend
        const { ids, usuario_modif, tipo_dia } = req.body; 

        if (!ids || ids.length === 0) {
            return res.status(400).json({ error: "No hay IDs" });
        }
        // Validamos que sea uno de los tres permitidos
        if (!['NORMAL', 'FERIADO', 'FIN DE SEMANA'].includes(tipo_dia)) {
            return res.status(400).json({ error: "Tipo de día no válido" });
        }

        const request = poolflowershop.request();
        request.input('usuario_modif', sql.Int, usuario_modif);
        request.input('tipo_dia', sql.VarChar, tipo_dia); // 2. Pasamos el parámetro dinámico

        const idsString = ids.join(',');

        await request.query(`
            UPDATE rrhh_extras
            SET  
                tipo_dia = @tipo_dia, 
                usuario_modif = @usuario_modif
            WHERE id IN (${idsString})
        `);

        res.json({ success: true, message: "Actualización masiva completada" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.put('/api/RRHH/horario_masivo', async (req, res) => {
    try {
        console.log("📥 Payload recibido en API:", req.body);
        
        // 1. Capturamos los parámetros dinámicos que envía tu Frontend corregido
        const { ids, usuario_modif, campo, hora } = req.body; 

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "No hay IDs válidos" });
        }

        // 2. Filtro de seguridad estricto (Lista Blanca) para evitar inyección SQL
        const camposPermitidos = ['h_inicio_jn', 'h_almuerzo', 'h_inicio_fn', 'h_inicio_ext', 'h_fin_ext'];
        if (!camposPermitidos.includes(campo)) {
            return res.status(400).json({ error: `El campo '${campo}' no es una columna válida.` });
        }

        // 3. Convertidor seguro a objeto Date compatible con sql.Time
        const limpiarHoraBackend = (val) => {
            if (!val || val === '' || val === undefined || val === '""') return null;
            
            if (typeof val === 'string' && val.includes(':')) {
                const partes = val.trim().split(':');
                const horas = parseInt(partes[0], 10);
                const minutos = parseInt(partes[1], 10);

                if (!isNaN(horas) && !isNaN(minutos)) {
                    const fechaObjeto = new Date();
                    fechaObjeto.setHours(horas, minutos, 0, 0);
                    return fechaObjeto; 
                }
            }
            return null;
        };

        const horaFormateada = limpiarHoraBackend(hora);
        const request = poolflowershop.request();

        // 4. Mapeo seguro de variables de entrada
        request.input('usuario_modif', sql.Int, usuario_modif);
        request.input('hora_valor', sql.Time, horaFormateada ? horaFormateada : null);

        const idsSeguros = ids.map(id => Number(id)).filter(id => !isNaN(id));
        if (idsSeguros.length === 0) {
            return res.status(400).json({ error: "Los IDs proporcionados no son válidos" });
        }
        const idsString = idsSeguros.join(',');

        // 5. Query Dinámico: Solo modificamos la columna guardada en ${campo}
        // Al estar validado en la lista blanca de arriba, es 100% seguro contra SQL Injection
        const queryDinamic = `
            UPDATE rrhh_formulario 
            SET  
                ${campo} = @hora_valor,
                usuario_modif = @usuario_modif
            WHERE id IN (${idsString})
        `;

        await request.query(queryDinamic);

        res.json({ success: true, message: `Columna ${campo} actualizada exitosamente de forma masiva.` });
    } catch (err) {
        console.error("❌ Error real capturado en terminal de Node:", err.message);
        res.status(500).json({ error: err.message });
    }
});



app.put('/api/RRHH/horario_masivo_extras', async (req, res) => {
    try {
        console.log("📥 Payload recibido en API:", req.body);
        
        // 1. Capturamos los parámetros dinámicos que envía tu Frontend corregido
        const { ids, usuario_modif, campo, hora } = req.body; 

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "No hay IDs válidos" });
        }

        // 2. Filtro de seguridad estricto (Lista Blanca) para evitar inyección SQL
        const camposPermitidos = ['h_inicio_jn', 'h_almuerzo', 'h_inicio_fn', 'h_inicio_ext', 'h_fin_ext'];
        if (!camposPermitidos.includes(campo)) {
            return res.status(400).json({ error: `El campo '${campo}' no es una columna válida.` });
        }

        // 3. Convertidor seguro a objeto Date compatible con sql.Time
        const limpiarHoraBackend = (val) => {
            if (!val || val === '' || val === undefined || val === '""') return null;
            
            if (typeof val === 'string' && val.includes(':')) {
                const partes = val.trim().split(':');
                const horas = parseInt(partes[0], 10);
                const minutos = parseInt(partes[1], 10);

                if (!isNaN(horas) && !isNaN(minutos)) {
                    const fechaObjeto = new Date();
                    fechaObjeto.setHours(horas, minutos, 0, 0);
                    return fechaObjeto; 
                }
            }
            return null;
        };

        const horaFormateada = limpiarHoraBackend(hora);
        const request = poolflowershop.request();

        // 4. Mapeo seguro de variables de entrada
        request.input('usuario_modif', sql.Int, usuario_modif);
        request.input('hora_valor', sql.Time, horaFormateada ? horaFormateada : null);

        const idsSeguros = ids.map(id => Number(id)).filter(id => !isNaN(id));
        if (idsSeguros.length === 0) {
            return res.status(400).json({ error: "Los IDs proporcionados no son válidos" });
        }
        const idsString = idsSeguros.join(',');

        // 5. Query Dinámico: Solo modificamos la columna guardada en ${campo}
        // Al estar validado en la lista blanca de arriba, es 100% seguro contra SQL Injection
        const queryDinamic = `
            UPDATE rrhh_extras
            SET  
                ${campo} = @hora_valor,
                usuario_modif = @usuario_modif
            WHERE id IN (${idsString})
        `;

        await request.query(queryDinamic);

        res.json({ success: true, message: `Columna ${campo} actualizada exitosamente de forma masiva.` });
    } catch (err) {
        console.error("❌ Error real capturado en terminal de Node:", err.message);
        res.status(500).json({ error: err.message });
    }
});





app.put('/api/RRHH/ausente_todos_masivo', async (req, res) => {
    try {
        const { ids, usuario_modif } = req.body;
        const request = poolflowershop.request();
        
        request.input('usuario_modif', sql.Int, usuario_modif);
        request.input('no', sql.VarChar, 'no');
        const idsString = ids.join(',');

        // Si NO ASISTE, entonces ALMUERZO y MERIENDA también son NO
        await request.query(`
            UPDATE rrhh_formulario 
            SET  
                presente = @no, 
                almuer_si = @no, 
                meriend_si = @no,
                refrigerio = @no,
                desayuno = @no,
                usuario_modif = @usuario_modif
            WHERE id IN (${idsString})
        `);

        res.json({ success: true, message: "Registros marcados como AUSENTES" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Para actualizar tu registro de asistencia
app.put('/api/RRHH/updateestado/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estadovisual,usuario_modif_estado} = req.body;

        

        // 1. Usamos el POOL que ya está abierto desde el inicio del server
        // Esto evita crear y cerrar conexiones físicas en cada clic de guardado
        const request = poolflowershop.request();

        // 2. Parámetros seguros (evita inyección SQL y errores de tipo)
        request.input('id', sql.Int, id);
        // 3. Mapeo del usuario que realiza la transacción
        request.input('usuario_modif_estado', sql.Int, usuario_modif_estado);
        
       


        // 3. Ejecución directa con async/await
        await request.query(`
            UPDATE rrhh_formulario 
            SET estadovisual = '0', 
            usuario_modif_estado = @usuario_modif_estado
            WHERE id = @id
        `);

        res.json({ success: true, message: "✅ Actualizado correctamente en DB Local" });

    } catch (err) {
        console.error("❌ Error al actualizar estado:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


// Para actualizar tu registro de asistencia
app.put('/api/RRHH/updateestado_extras/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estadovisual,usuario_modif_estado} = req.body;

        

        // 1. Usamos el POOL que ya está abierto desde el inicio del server
        // Esto evita crear y cerrar conexiones físicas en cada clic de guardado
        const request = poolflowershop.request();

        // 2. Parámetros seguros (evita inyección SQL y errores de tipo)
        request.input('id', sql.Int, id);
        // 3. Mapeo del usuario que realiza la transacción
        request.input('usuario_modif_estado', sql.Int, usuario_modif_estado);
        
       


        // 3. Ejecución directa con async/await
        await request.query(`
            UPDATE rrhh_extras
            SET estadovisual = '0', 
            usuario_modif_estado = @usuario_modif_estado
            WHERE id = @id
        `);

        res.json({ success: true, message: "✅ Actualizado correctamente en DB Local" });

    } catch (err) {
        console.error("❌ Error al actualizar estado:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


app.put('/api/RFID/guardar_tags', async (req, res) => {
    const { id_transaccion, tags, usuario_creacion, confirmar_sobrescribir } = req.body;

    if (!id_transaccion || !tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ 
            error: "Datos inválidos. Se requiere id_transaccion y un arreglo de tags no vacío." 
        });
    }

    const transaction = new sql.Transaction(poolflowershop);
    
    try {
        await transaction.begin();
        const checkRequest = new sql.Request(transaction);
        
        // Preparar parámetros dinámicos para buscar duplicados
        const tagParams = tags.map((_, index) => `@tag${index}`);
        tags.forEach((tag, index) => {
            checkRequest.input(`tag${index}`, sql.VarChar, tag);
        });

        // Consulta para detectar cuáles del lote ya están en 'Pendiente'
        const queryBuscar = `
            SELECT i.id_codigo_barra
            FROM inventario_bqt i
            WHERE i.id_codigo_barra IN (${tagParams.join(', ')}) AND i.estado_bqt = 'Pendiente'
        `;

        const checkResult = await checkRequest.query(queryBuscar);
        const codigosDuplicadosBD = checkResult.recordset.map(r => r.id_codigo_barra);

        // --- CASO A: HAY DUPLICADOS Y EL USUARIO NO HA CONFIRMADO TODAVÍA (Primer intento) ---
        if (codigosDuplicadosBD.length > 0 && !confirmar_sobrescribir) {
            await transaction.rollback(); 
            return res.status(409).json({
                requiereConfirmacion: true,
                error: `Se detectaron (${codigosDuplicadosBD.length}) tags en estado 'Pendiente' en el lote actual.`,
                duplicados: codigosDuplicadosBD
            });
        }

        // --- CASO B: EL USUARIO YA DIJO QUE "SÍ" O NO HUBO DUPLICADOS ---

        // 1. Si hay duplicados y el usuario confirmó, actualizamos SOLO esos tags existentes a 'Listo'
        if (codigosDuplicadosBD.length > 0 && confirmar_sobrescribir) {
            const updateRequest = new sql.Request(transaction);
            
            const updParams = codigosDuplicadosBD.map((_, index) => `@updTag${index}`);
            codigosDuplicadosBD.forEach((tag, index) => {
                updateRequest.input(`updTag${index}`, sql.VarChar, tag);
            });

            const queryActualizar = `
                UPDATE inventario_bqt
                SET estado_bqt = 'Listo',
                    usuario_listo = 'BQT'
                WHERE id_codigo_barra IN (${updParams.join(', ')}) AND estado_bqt = 'Pendiente'
            `;
            await updateRequest.query(queryActualizar);
            console.log(`✅ ${codigosDuplicadosBD.length} tags anteriores actualizados a 'Listo'.`);
        }

        // 2. Insertamos TODOS los tags recibidos en la petición como 'Pendiente'
        if (tags.length > 0) {
            const insertRequest = new sql.Request(transaction);
            
            insertRequest.input('id_transaccion', sql.Int, id_transaccion);
            // CORREGIDO: Se reestablece estrictamente a sql.Int tal como en tu código original
            insertRequest.input('usuario_creacion', sql.Int, usuario_creacion || 1); 

            // Mapeamos los parámetros dinámicos para la lista COMPLETA de tags
            tags.forEach((tag, index) => {
                insertRequest.input(`ins_tag${index}`, sql.VarChar, tag);
            });

            const valuesRows = tags.map((_, index) => 
                `(@id_transaccion, @ins_tag${index}, GETDATE(), 1, 'Pendiente', @usuario_creacion)`
            ).join(', ');

            const queryInsertar = `
                INSERT INTO inventario_bqt (
                    id_transaccion, 
                    id_codigo_barra, 
                    fecha_creacion, 
                    estado_visual, 
                    estado_bqt, 
                    usuario_creacion
                )
                VALUES ${valuesRows}
            `;

            await insertRequest.query(queryInsertar);
            console.log(`✅ ${tags.length} registros creados en estado 'Pendiente'.`);
        } else {
            console.log("ℹ️ No hubo tags para insertar.");
        }

        // Guardamos todo de forma segura
        await transaction.commit();
        
        return res.json({ 
            success: true, 
            message: `Proceso completado. Actualizados: ${confirmar_sobrescribir ? codigosDuplicadosBD.length : 0}, Insertados: ${tags.length}` 
        });

    } catch (err) {
        if (transaction.isOpen) {
            await transaction.rollback();
        }
        console.error("❌ Error en la transacción de asignación:", err);
        return res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});



app.put('/api/RFID/anular_tags', async (req, res) => {
    try {
        // 1. CORREGIDO: Extraemos motivo_anulacion enviado desde el Frontend
        const { id_transaccion, usuario_modif, motivo_anulacion } = req.body;

        if (!id_transaccion) {
            return res.status(400).json({ error: "Se requiere el id_transaccion para anular." });
        }

        // Validación preventiva para asegurar que el motivo no llegue vacío
        if (!motivo_anulacion || motivo_anulacion.trim() === "") {
            return res.status(400).json({ error: "Se requiere un motivo de anulación obligatorio." });
        }

        const request = poolflowershop.request();
        request.input('id_transaccion', sql.Int, id_transaccion);
        request.input('usuario_modif', sql.Int, usuario_modif || 1);
        // 2. CORREGIDO: Declaramos la variable de entrada para el Query de SQL Server
        request.input('motivo_anulacion', sql.VarChar, motivo_anulacion.trim());

        // Actualiza a 'Anulado' afectando ÚNICAMENTE a los registros que estén 'Pendiente'
        const result = await request.query(`
            UPDATE inventario_bqt
            SET 
                estado_bqt = 'Anulado',
                --estado_visual = 0,
                fecha_anulacion = GETDATE(), 
                usuario_anulacion = @usuario_modif,
                motivo_anulacion = @motivo_anulacion
            WHERE id_transaccion = @id_transaccion 
              AND estado_bqt = 'Pendiente'
        `);

        res.json({ 
            success: true, 
            message: `✅ Se anularon (${result.rowsAffected[0]}) tags correctamente.` 
        });

    } catch (err) {
        console.error("❌ Error al anular tags:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


app.put('/api/RFID/quitar_devuelto_tag', async (req, res) => {
    try {
        // 🟢 LOG: Ver el cuerpo completo de la petición que llega del Frontend
        console.log("📥 Petición recibida en /quitar_devuelto_tag. Body:", req.body);

        const { id_transaccion } = req.body;

        // 🟢 LOG: Ver específicamente el ID extraído
        console.log(`🔍 ID Transacción extraído: ${id_transaccion} (Tipo de dato: ${typeof id_transaccion})`);

        if (!id_transaccion) {
            console.warn("⚠️ Advertencia: id_transaccion no fue proporcionado o es inválido.");
            return res.status(400).json({ error: "Se requiere el id_transaccion para quitar de la lista." });
        }

        const request = poolflowershop.request();
        request.input('id_transaccion', sql.Int, id_transaccion);

        // Actualiza a 'Pendiente' afectando ÚNICAMENTE al id_transaccion enviado
        const result = await request.query(`
            UPDATE inventario_bqt
            SET estado_bqt = 'Pendiente'
            WHERE id = @id_transaccion 
        `);

        // Validamos cuántas filas se afectaron de forma segura
        const filasAfectadas = result.rowsAffected && result.rowsAffected[0] ? result.rowsAffected[0] : 0;

        // 🟢 LOG: Confirmar que la base de datos se actualizó correctamente
        console.log(`✅ SQL Executed: ${filasAfectadas} filas actualizadas para el ID: ${id_transaccion}`);

        res.json({ 
            success: true, 
            message: `Tag quitado de la lista correctamente. Filas afectadas: ${filasAfectadas}` 
        });

    } catch (err) {
        console.error("❌ Error al quitar tag de la lista:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


app.post('/api/RRHH/guardar_novedad_medica_segura', async (req, res) => {
  try {
    console.log("⬇️ BACKEND - Procesando novedad médica con opción de reemplazo:", req.body);

    const { 
      id_asistencia, 
      codigo_emp_dar, 
      reposo, 
      novedad, 
      fecha_desde, 
      fecha_hasta, 
      estado, 
      usuario_modif,
      idNovedadAnterior // 👈 ID de la transacción vieja que el usuario seleccionó para editar/pisar
    } = req.body;

    const textoReposo = reposo || novedad; 
    const empId = codigo_emp_dar ? Number(codigo_emp_dar) : null;

    if (!id_asistencia || !textoReposo || !fecha_desde || !fecha_hasta) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const request = poolflowershop.request();
    request.input('codigo_emp_dar', sql.Numeric(18, 0), empId);

    // 🔥 1. LOGICA DE ROLLBACK SELECTIVO
    if (idNovedadAnterior) {
      request.input('id_viejo', sql.Int, Number(idNovedadAnterior));
      
      // Buscamos las fechas exactas de la transacción anterior elegida para no borrar todo el historial del empleado
      const queryBuscarViejo = `
        SELECT fecha_desde, fecha_hasta 
        FROM sioret_novedad_medica 
        WHERE id = @id_viejo
        and estadovisual = 1
      `;
      const resultViejo = await request.query(queryBuscarViejo);

      if (resultViejo.recordset.length > 0) {
        const viejo = resultViejo.recordset[0];
        
        request.input('v_desde', sql.Date, viejo.fecha_desde);
        request.input('v_hasta', sql.Date, viejo.fecha_hasta);

        console.log(`🔄 Backend: Revirtiendo reposo anterior del ${viejo.fecha_desde} al ${viejo.fecha_hasta}`);

        // Ponemos en 'no' SOLO los días que correspondían al rango de la transacción vieja elegida
        const queryRollback = `
          UPDATE rrhh_formulario 
          SET reposo_medico = 'no' 
          WHERE codigo_emp_dar = @codigo_emp_dar 
            AND CAST(fecha_dia AS DATE) >= @v_desde 
            AND CAST(fecha_dia AS DATE) <= @v_hasta
        `;
        await request.query(queryRollback);

        // Desactivamos visualmente la novedad vieja para que no se duplique
        await request.query(`UPDATE sioret_novedad_medica SET estadovisual = 0 WHERE id = @id_viejo`);
      }
    }

    // 2. INSERCIÓN DE LA NUEVA TRANSACCIÓN
    request.input('idtransaccion', sql.Numeric(18, 0), id_asistencia);
    request.input('reposo', sql.VarChar(50), textoReposo);
    request.input('fecha_desde', sql.VarChar(10), fecha_desde); 
    request.input('fecha_hasta', sql.VarChar(10), fecha_hasta);
    request.input('estado', sql.VarChar(50), estado || 'pendiente');
    request.input('usuario_creacion', sql.Numeric(18, 0), usuario_modif);

    const queryInsert = `
      INSERT INTO sioret_novedad_medica 
      (idtransaccion, codigo_emp_dar, reposo, fecha_desde, fecha_hasta, estado, usuario_creacion, fecha_creacion, estadovisual)
      VALUES 
      (@idtransaccion, @codigo_emp_dar, @reposo, @fecha_desde, @fecha_hasta, @estado, @usuario_creacion, GETDATE(), 1);
    `;

    await request.query(queryInsert);
    res.status(200).json({ success: true, message: "Nueva configuración de reposo aplicada y anterior revertida." });

  } catch (err) {
    console.error("❌ Error crítico en guardar_novedad_medica_segura:", err);
    res.status(500).json({ error: "Error en el servidor: " + err.message });
  }
});




app.get('/api/RRHH/consultar_novedad_medica', async (req, res) => {
  try {
    // 📥 Recibimos el código del empleado y el rango de fechas desde la URL
    const { codigo_emp_dar, fecha_desde, fecha_hasta } = req.query; 

    if (!codigo_emp_dar) {
      return res.status(400).json({ error: "El parámetro codigo_emp_dar es obligatorio." });
    }

    const request = poolflowershop.request();
    
    // Parametrización estricta de variables
    request.input('codigo_emp_dar', sql.Numeric(18, 0), Number(codigo_emp_dar));
    
    // 📅 Agregamos las entradas de fecha como VarChar para mitigar desfases horarios
    request.input('f_desde', sql.VarChar(10), fecha_desde || null);
    request.input('f_hasta', sql.VarChar(10), fecha_hasta || null);

    // 🔍 Ajustamos la consulta: Filtra por código y evalúa condicionalmente el rango si las fechas existen
    const querySelect = `
      SELECT n.id, n.estado, u.nombre_usu,
             n.codigo_emp_dar, n.reposo, n.fecha_desde, n.fecha_hasta
      FROM sioret_novedad_medica n
      INNER JOIN usuario_web u ON u.id = n.usuario_creacion
      WHERE n.codigo_emp_dar = @codigo_emp_dar
         AND n.fecha_desde <= @f_hasta -- El reposo debe haber iniciado antes (o durante) tu fecha límite
  AND n.fecha_hasta >= @f_hasta
  and  n.estadovisual = 1; 
    `;

    console.log(`🔍 Backend: Consultando historial médico para el empleado ${codigo_emp_dar} en rango [${fecha_desde} - ${fecha_hasta}]`);
    const result = await request.query(querySelect);
    
    res.json(result.recordset);

  } catch (err) {
    console.error("❌ Error al consultar sioret_novedad_medica por código y fecha:", err);
    res.status(500).json({ error: "Error en el servidor: " + err.message });
  }
});


app.put('/api/RRHH/editar_novedad_medica/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    const { codigo_emp_dar, reposo, fecha_desde, fecha_hasta, estado, usuario_modif } = req.body;

    // 🔥 DEFENSA INTERNA: Validamos y convertimos el parámetro de la URL a un número puro
    const idNumerico = Number(id);

    if (isNaN(idNumerico) || idNumerico <= 0) {
      console.warn(`⚠️ Backend: Intento de edición rechazado. El ID recibido es inválido: ${id}`);
      return res.status(400).json({ error: "El ID de la novedad proporcionado en la URL no es válido." });
    }

    if (!reposo || !fecha_desde || !fecha_hasta) {
      return res.status(400).json({ error: "Faltan campos obligatorios para la edición." });
    }

    const request = poolflowershop.request();

    // Declaramos parámetros estrictos usando el ID numérico ya depurado
    request.input('id', sql.Numeric(18, 0), idNumerico);
    request.input('codigo_emp_dar', sql.Numeric(18, 0), codigo_emp_dar ? Number(codigo_emp_dar) : null);
    request.input('reposo', sql.VarChar(50), reposo);
    request.input('fecha_desde', sql.VarChar(10), fecha_desde);
    request.input('fecha_hasta', sql.VarChar(10), fecha_hasta);
    request.input('estado', sql.VarChar(50), estado);
    request.input('usuario_modif', sql.Numeric(18, 0), usuario_modif);

    const queryUpdate = `
      UPDATE sioret_novedad_medica
      SET codigo_emp_dar = @codigo_emp_dar,
          reposo = @reposo,
          fecha_desde = @fecha_desde,
          fecha_hasta = @fecha_hasta,
          estado = @estado,
          usuario_creacion = @usuario_modif,
          fecha_creacion = GETDATE()
      WHERE id = @id
      and estadovisual = 1;
    `;

    console.log(`⏳ Backend: Editando registro de novedad médica ID: ${idNumerico} para el empleado: ${codigo_emp_dar}...`);
    await request.query(queryUpdate);

    res.status(200).json({ success: true, message: "Novedad médica actualizada correctamente." });

  } catch (err) {
    console.error("❌ Error crítico al editar sioret_novedad_medica:", err);
    res.status(500).json({ error: "Error en el servidor: " + err.message });
  }
});



app.put('/api/RRHH/actualizar_reposo_medico', async (req, res) => {
  try {
    const { codigo_emp_dar, fecha_desde, fecha_hasta } = req.body;

    // Validación estricta de campos obligatorios
    if (!codigo_emp_dar || !fecha_desde || !fecha_hasta) {
      return res.status(400).json({ error: "Faltan campos obligatorios para la sincronización." });
    }

    const request = poolflowershop.request();

    // 🎯 REPARACIÓN DE PARÁMETROS: Sincronizamos con los tipos de tu query nativa
    // Forzamos el código a ser un entero puro (igual al 3367 de tu prueba)
    request.input('codigo_emp_dar', sql.Int, Number(codigo_emp_dar));
    
    // Pasamos las fechas de forma segura limpiando cualquier residuo de zona horaria o texto
    request.input('fecha_desde', sql.VarChar, fecha_desde.split('T')[0]);
    request.input('fecha_hasta', sql.VarChar, fecha_hasta.split('T')[0]);

    // Usamos la query exacta con el CAST que te funcionó en la base de datos
    const queryUpdate = `
      UPDATE rrhh_formulario 
      SET reposo_medico = 'si'
      WHERE CAST(fecha_dia AS DATE) >= @fecha_desde
        AND CAST(fecha_dia AS DATE) <= @fecha_hasta
        AND codigo_emp_dar = @codigo_emp_dar
    `;

    console.log(`⏳ Backend: Sincronizando asistencias en rango [${fecha_desde} al ${fecha_hasta}] para empleado: ${codigo_emp_dar}...`);
    
    const resultado = await request.query(queryUpdate);
    
    // 🔍 Traza de control para ver cuántas filas alteró Node.js en tiempo real
    console.log(`🔹 Filas reales modificadas por Node.js: ${resultado.rowsAffected[0]}`);

    res.status(200).json({ 
      success: true, 
      rowsAffected: resultado.rowsAffected[0],
      message: "Estado de reposo médico actualizado correctamente." 
    });

  } catch (err) {
    console.error("❌ Error crítico en actualizar_reposo_medico:", err);
    res.status(500).json({ error: "Error en el servidor: " + err.message });
  }
});




app.get('/api/REPORTES/rep_novedades_medicas', async (req, res) => {
  try {
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
      return res.status(400).json({ error: "Faltan los parámetros de fecha de inicio o fin." });
    }

    const request = poolflowershop.request();
    
    // Mapeamos los parámetros de fecha limpiando strings de forma segura
    request.input('fecha_inicio', sql.VarChar(10), inicio.split('T')[0]);
    request.input('fecha_fin', sql.VarChar(10), fin.split('T')[0]);

    // Tu Query exacta adaptada con variables seguras
    const queryReporte = `
       SELECT 
        nm.id,
        asis.codigo_emp_dar AS 'ID_EMP',
        asis.cedula AS 'IDENTIFICACION',
        asis.nombres AS 'EMPLEADO',
        CONVERT(VARCHAR(10), nm.fecha_desde, 120) AS 'FECHA_DESDE', 
        CONVERT(VARCHAR(10), nm.fecha_hasta, 120) AS 'FECHA_HASTA',
        nm.reposo AS 'OBSERVACION',
        nm.estado AS 'ESTADO',
        CONVERT(VARCHAR(10), nm.fecha_creacion, 120) AS 'FECHA_REGISTRA',
        CONVERT(VARCHAR(10), asis.fecha_dia, 120) AS 'FECHA_DIA',
		usu.nombre + '('+ usu.nombre_usu + ')' as 'USARIO_REVISION'
      FROM sioret_novedad_medica nm WITH(NOLOCK)
      INNER JOIN rrhh_formulario asis WITH(NOLOCK) ON asis.id = nm.idtransaccion
        INNER JOIN usuario_web usu WITH(NOLOCK) ON usu.id = nm.usuario_creacion
      WHERE nm.fecha_desde >= @fecha_inicio
        AND nm.fecha_hasta <= @fecha_fin
        AND nm.estadovisual = 1
      ORDER BY nm.fecha_desde DESC;
    `;

    console.log(`📊 Backend: Generando reporte de novedades médicas desde ${inicio} hasta ${fin}...`);
    const resultado = await request.query(queryReporte);

    // Devolvemos el recordset directo para que React lo procese a Excel
    res.status(200).json(resultado.recordset);

  } catch (err) {
    console.error("❌ Error crítico al generar reporte de novedades médicas:", err);
    res.status(500).json({ error: "Error interno del servidor: " + err.message });
  }
});


app.put('/api/RFID/devolucion_tags', async (req, res) => {
    try {
        // MODIFICADO: Extraemos 'desde' y 'hasta' del cuerpo de la petición
        const { id_codigo_barra, usuario_devolucion, motivo_devolucion, desde, hasta } = req.body;

        if (!id_codigo_barra || id_codigo_barra.trim() === "") {
            return res.status(400).json({ error: "Se requiere el id_codigo_barra para procesar la devolución." });
        }

        if (!motivo_devolucion || motivo_devolucion.trim() === "") {
            return res.status(400).json({ error: "Se requiere un motivo de devolución obligatorio." });
        }

        // MODIFICADO: Validación para asegurar que las fechas fueron enviadas
        if (!desde || !hasta) {
            return res.status(400).json({ error: "Se requieren los rangos de fecha 'desde' y 'hasta' para filtrar." });
        }

        const request = poolflowershop.request();
        request.input('id_codigo_barra', sql.VarChar, id_codigo_barra.trim());
        request.input('usuario_devolucion', sql.Int, usuario_devolucion || 1);
        request.input('motivo_devolucion', sql.VarChar, motivo_devolucion.trim());
        
        // MODIFICADO: Declaramos los parámetros de fecha que la consulta SQL necesita
        request.input('fechaDesde', sql.VarChar, desde);
        request.input('fechaHasta', sql.VarChar, hasta);

        // NOTA: Tu comentario decía que quitaste "AND estado_bqt = 'Pendiente'" en el UPDATE externo, 
        // pero dentro del subquery aún lo tienes. Lo mantengo tal cual lo enviaste.
        const result = await request.query(`
            UPDATE inventario_bqt  
            SET devuelto = 'si',
                fecha_devolucion = GETDATE(),
                usuario_devolucion = @usuario_devolucion,
                motivo_devolucion = @motivo_devolucion,
                estado_bqt = 'Devuelto'
            WHERE id = (
                SELECT MAX(i.id) 
                FROM inventario_bqt i
                INNER JOIN rendimiento r ON r.id = i.id_transaccion
                WHERE i.id_codigo_barra = @id_codigo_barra  
                  AND i.estado_bqt = 'Pendiente'
                  AND i.fecha_creacion BETWEEN @fechaDesde AND DATEADD(SECOND, -1, DATEADD(DAY, 1, CAST(@fechaHasta AS DATETIME)))
            )          
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "No se encontró ningún tag pendiente en el rango de fechas especificado." });
        }

        res.json({ 
            success: true, 
            message: `✅ Se marcó como devuelto el tag (${id_codigo_barra}) correctamente.` 
        });

    } catch (err) {
        console.error("❌ Error al devolver tags:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});



app.put('/api/RFID/rollbackapendiente', async (req, res) => {
    try {
        const { desde, hasta, id_codigo_barra } = req.body;

        // Validamos que vengan los campos obligatorios para la consulta SQL
        if (!desde || !hasta || !id_codigo_barra) {
            return res.status(400).json({ 
                error: "Se requieren los parámetros 'desde', 'hasta' y 'id_codigo_barra' en el body." 
            });
        }

        const codigoLimpio = id_codigo_barra.trim();
        const request = poolflowershop.request();
        
        // CORREGIDO: Enviamos las fechas limpias en formato YYYY-MM-DD sin concatenar texto aquí
        request.input('fechaDesde', sql.VarChar, desde); 
        request.input('fechaHasta', sql.VarChar, hasta); 
        request.input('id_codigo_barra', sql.VarChar, codigoLimpio);

        // CORREGIDO: Usamos DATEADD de manera matemática para agregar las 23:59:59 
        // Evita el error "out-of-range value" sin importar la región del servidor SQL Server
        const result = await request.query(`
            UPDATE inventario_bqt  
            SET estado_bqt = 'Pendiente'  ,
            fecha_listo = NULL,
            usuario_listo = NULL
            WHERE id = (
                SELECT MAX(i.id) 
                FROM inventario_bqt i
                INNER JOIN rendimiento r ON r.id = i.id_transaccion
                WHERE i.id_codigo_barra = @id_codigo_barra  
                  AND i.estado_bqt = 'Listo'
                  AND i.fecha_creacion BETWEEN @fechaDesde AND DATEADD(SECOND, -1, DATEADD(DAY, 1, CAST(@fechaHasta AS DATETIME)))
            )
        `);

        // CORREGIDO: En mssql, rowsAffected puede ser un entero directo o un arreglo. 
        // Usar result.rowsAffected === 0 o result.rowsAffected[0] === 0 de forma preventiva.
        const filasAfectadas = Array.isArray(result.rowsAffected) ? result.rowsAffected[0] : result.rowsAffected;

        if (filasAfectadas === 0) {
            return res.status(404).json({ 
                error: `No se encontró ningún tag en estado 'Listo' con el código ${codigoLimpio} en el rango de fechas.` 
            });
        }

        res.json({ 
            success: true, 
            message: `✅ Se marcó como 'Pendiente' el tag (${codigoLimpio}) correctamente.` 
        });

    } catch (err) {
        console.error("❌ Error al devolver tags:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


app.get('/api/RFID/consulta_tags', async (req, res) => {
    try {
        const { idbarras } = req.query;

        if (!idbarras) {
            return res.status(400).json({ error: "Se requiere el id_codigo_barra para realizar la consulta." });
        }

        const request = poolflowershop.request();
        request.input('idbarras', sql.VarChar, idbarras.trim());

        // Ejecuta el nuevo SELECT con el INNER JOIN a rendimiento
        const result = await request.query(`
            SELECT top(10) 
                i.estado_bqt,
                rendimiento.mesa,   
                rendimiento.nombre_producto,   
                rendimiento.nombre_empleado,    
                rendimiento.fecha_creacion, 
                i.fecha_anulacion,
                i.fecha_devolucion,
                i.motivo_devolucion,
                i.usuario_devolucion,
                rendimiento.id_maquina 
            FROM rendimiento WITH(nolock) 
            INNER JOIN inventario_bqt i ON rendimiento.id = i.id_transaccion 
            WHERE id_codigo_barra = @idbarras
            ORDER BY rendimiento.fecha_creacion DESC
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error al consultar tags:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


app.get('/api/DARTIS/consultadevueltostags', async (req, res) => {
    try {
        const { desde, hasta } = req.query;

        if (!desde || !hasta) {
            return res.status(400).json({ error: "Se requieren los parámetros 'desde' and 'hasta'." });
        }

        const request = poolflowershop.request();
        request.input('fechaDesde', sql.VarChar, desde);
        request.input('fechaHasta', sql.VarChar, hasta);

        const result = await request.query(`
            SELECT 
                i.id,   
                rendimiento.fecha_asignacion,     
                rendimiento.mesa,   
                rendimiento.nombre_producto,   
                rendimiento.nombre_empleado,   
                rendimiento.fecha_creacion,    
                rendimiento.id_maquina,
                i.motivo_devolucion,
                i.id_codigo_barra
            FROM rendimiento WITH(nolock) 
            INNER JOIN inventario_bqt i ON rendimiento.id = i.id_transaccion 
            WHERE i.fecha_devolucion BETWEEN @fechaDesde AND @fechaHasta + ' 23:59:59'
              AND i.devuelto = 'si'
              AND i.estado_bqt = 'Devuelto'
            GROUP BY 
                i.id,   
                rendimiento.fecha_asignacion,     
                rendimiento.mesa,   
                rendimiento.nombre_producto,   
                rendimiento.nombre_empleado,   
                rendimiento.fecha_creacion,    
                rendimiento.id_maquina,
                i.motivo_devolucion,
                i.id_codigo_barra
            ORDER BY rendimiento.fecha_creacion DESC
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error al obtener consulta de devueltos:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});




app.get('/api/DARTIS/aavancestags', async (req, res) => {
    try {
        const { desde, hasta } = req.query;

        if (!desde || !hasta) {
            return res.status(400).json({ error: "Se requieren los parámetros 'desde' and 'hasta'." });
        }

        const request = poolflowershop.request();
        request.input('fechaDesde', sql.VarChar, desde);
        request.input('fechaHasta', sql.VarChar, hasta);

        const result = await request.query(`
         SELECT 
                
                rendimiento.nombre_empleado,   
                rendimiento.mesa,   
                rendimiento.id_maquina,
                
                -- 1. Cálculo de Cantidades por Estado
                SUM(CASE WHEN i.estado_bqt = 'Pendiente' THEN 1 ELSE 0 END) AS Pendiente,
                SUM(CASE WHEN i.estado_bqt = 'Listo' THEN 1 ELSE 0 END) AS Listo,
                SUM(CASE WHEN i.estado_bqt = 'Devuelto' THEN 1 ELSE 0 END) AS Devuelto,
                SUM(CASE WHEN i.estado_bqt = 'Anulado' THEN 1 ELSE 0 END) AS Anulado,
                
                -- 2. Cantidad Total Asignada (Suma de todos los registros procesados)
                COUNT(i.id) AS Cantidad_Asignada,
                
                -- 3. Porcentaje de Avance (Listo / Total Asignado)
                CASE 
                    WHEN COUNT(i.id) > 0 THEN 
                        ROUND((SUM(CASE WHEN i.estado_bqt = 'Listo' THEN 1.0 ELSE 0.0 END) / COUNT(i.id)) * 100, 2)
                    ELSE 0 
                END AS Porcentaje_Avance

            FROM rendimiento WITH(nolock) 
            INNER JOIN inventario_bqt i ON rendimiento.id = i.id_transaccion 
            WHERE i.fecha_creacion BETWEEN @fechaDesde AND @fechaHasta + ' 23:59:59'
            GROUP BY 
                 
                rendimiento.nombre_empleado,   
                rendimiento.mesa,   
                rendimiento.id_maquina
            ORDER BY 
    Porcentaje_Avance DESC;

            
       
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error al obtener consulta de devueltos:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


app.get('/api/DARTIS/avancestags_reporte', async (req, res) => {
    try {
        // 1. Recibimos el parámetro 'tipo' desde el Front-end junto a las fechas
        const { desde, hasta, tipo } = req.query;

        if (!desde || !hasta) {
            return res.status(400).json({ error: "Se requieren los parámetros 'desde' y 'hasta'." });
        }

        const request = poolflowershop.request();
        request.input('fechaDesde', sql.VarChar, desde);
        request.input('fechaHasta', sql.VarChar, hasta);
        
        // 2. Si viene el parámetro tipo, lo parametrizamos de forma segura
        if (tipo) {
            request.input('tipoReporte', sql.VarChar, tipo);
        }

        // 3. Construimos el filtro condicional para la query SQL
        // Si no se envía el tipo, por defecto no filtrará por esa columna (trae ambos)
        const filtroTipoSql = tipo ? "AND rendimiento.tipo = @tipoReporte" : "";

        const result = await request.query(`
            SELECT 
                rendimiento.nombre_producto,
                rendimiento.nombre_empleado,   
                rendimiento.mesa,   
                rendimiento.id_maquina,
                
                -- 1. Cálculo de Cantidades por Estado
                SUM(CASE WHEN i.estado_bqt = 'Pendiente' THEN 1 ELSE 0 END) AS Pendiente,
                SUM(CASE WHEN i.estado_bqt = 'Listo' THEN 1 ELSE 0 END) AS Listo,
                SUM(CASE WHEN i.estado_bqt = 'Devuelto' THEN 1 ELSE 0 END) AS Devuelto,
                SUM(CASE WHEN i.estado_bqt = 'Anulado' THEN 1 ELSE 0 END) AS Anulado,
                
                -- 2. Cantidad Total Asignada (Suma de todos los registros procesados)
                COUNT(i.id) AS Cantidad_Asignada,
                
                -- 3. Porcentaje de Avance (Listo / Total Asignado)
                CASE 
                    WHEN COUNT(i.id) > 0 THEN 
                        ROUND((SUM(CASE WHEN i.estado_bqt = 'Listo' THEN 1.0 ELSE 0.0 END) / COUNT(i.id)) * 100, 2)
                    ELSE 0 
                END AS Porcentaje_Avance

            FROM rendimiento WITH(nolock) 
            INNER JOIN inventario_bqt i ON rendimiento.id = i.id_transaccion 
            WHERE i.fecha_creacion BETWEEN @fechaDesde AND @fechaHasta + ' 23:59:59'
              ${filtroTipoSql} -- <-- NUEVO FILTRO DINÁMICO INYECTADO DE FORMA SEGURA
            GROUP BY 
                rendimiento.nombre_producto,
                rendimiento.nombre_empleado,   
                rendimiento.mesa,   
                rendimiento.id_maquina
            ORDER BY 
                Porcentaje_Avance DESC;
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error al obtener consulta de devueltos:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});




// 🛠️ Cambiado a /api/DARTIS/anular_transaccion para que coincida con tu fetch de React
app.put('/api/DARTIS/anular_transaccion_rendimiento', async (req, res) => {
    try {
        const { id_transaccion, usuario_modif } = req.body;

        if (!id_transaccion) {
            return res.status(400).json({ error: "Se requiere el id_transaccion para anular." });
        }

        const request = poolflowershop.request();
        request.input('id_transaccion', sql.Int, id_transaccion);
        // 🌟 Declaramos el parámetro con el mismo nombre que usaremos en el Query
        request.input('usuario_modif', sql.Int, usuario_modif || 1); 

        // Actualiza la transacción afectando ÚNICAMENTE a la que corresponda el id
        const result = await request.query(`
            UPDATE rendimiento
            SET 
                estado_visual = 0,
                fecha_anulacion = GETDATE(), 
                usuario_anulacion = @usuario_modif -- 🌟 Corregido: Ahora coincide con el input de arriba
            WHERE id = @id_transaccion 
        `);

        // Validamos si la transacción realmente existía en la base de datos
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: `No se encontró ninguna transacción activa con el ID #${id_transaccion}.` });
        }

        res.json({ 
            success: true, 
            message: `✅ Transacción #${id_transaccion} anulada correctamente.` 
        });

    } catch (err) {
        console.error("❌ Error al anular transaccion asignada:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});
app.put('/api/DARTIS/actualizar_puesto', async (req, res) => {
    try {
        const { id_transaccion, puesto_maquina, hora_entrada, hora_salida, hora_almuerzo, id_maquina } = req.body;

        if (!id_transaccion) {
            return res.status(400).json({ error: "Se requiere el id_transaccion para modificar." });
        }

        const request = poolflowershop.request();
        request.input('id_transaccion', sql.Int, id_transaccion);

        let columnasAActualizar = [];

        // 🎛️ 1. Puesto Máquina
        if (puesto_maquina !== undefined && puesto_maquina !== '' && puesto_maquina !== null) {
            const puestoNumerico = parseInt(puesto_maquina, 10);
            if (!isNaN(puestoNumerico)) {
                request.input('puesto_maquina', sql.Int, puestoNumerico);
                columnasAActualizar.push("puesto_maquina = @puesto_maquina");
            }
        }
    // 🎛️ 1.1   Helicoptero
        
         if (id_maquina !== undefined && id_maquina !== '' && id_maquina !== null) {
            const puestoMaquina= parseInt(id_maquina, 10);
            if (!isNaN(puestoMaquina)) {
                request.input('id_maquina', sql.Int, puestoMaquina);
                columnasAActualizar.push("id_maquina = @id_maquina");
            }
        }

        // 🕒 2. Hora Entrada
        if (hora_entrada !== undefined && hora_entrada !== null && String(hora_entrada).trim() !== '') {
            request.input('hh_mm_entrada', sql.VarChar(5), String(hora_entrada).trim());
            columnasAActualizar.push("hora_entrada = @hh_mm_entrada"); 
        }

        // 🕒 3. Hora Salida
        if (hora_salida !== undefined && hora_salida !== null && String(hora_salida).trim() !== '') {
            request.input('hh_mm_salida', sql.VarChar(5), String(hora_salida).trim());
            columnasAActualizar.push("hora_salida = @hh_mm_salida"); 
        }

        // 🍽️ 4. Nueva Hora Almuerzo (Añadido)
        if (hora_almuerzo !== undefined && hora_almuerzo !== null && String(hora_almuerzo).trim() !== '') {
            request.input('hh_mm_almuerzo', sql.VarChar(5), String(hora_almuerzo).trim());
            columnasAActualizar.push("hora_almuerzo = @hh_mm_almuerzo"); 
        }

        if (columnasAActualizar.length === 0) {
            return res.status(400).json({ error: "No se proporcionó ningún campo válido para actualizar." });
        }

        const queryFinal = `
            UPDATE rendimiento
            SET ${columnasAActualizar.join(', ')}
            WHERE id = @id_transaccion
        `;

        const result = await request.query(queryFinal);

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: `No se encontró la transacción ID #${id_transaccion}.` });
        }

        res.json({ success: true, message: `✅ Transacción #${id_transaccion} actualizada.` });

    } catch (err) {
        console.error("❌ Error al modificar:", err);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});



////////////////////

// Ruta: POST /api/RRHH/asistencia_comedor
app.post('/api/RRHH/asistencia_comedor', async (req, res) => {
    try {
        // 1. ELIMINADO: const pool = await sql.connect(config);
       
        const { 
            cedula, nombres, codigo_com_dar, departamento, 
            fecha_dia, presente, almuer_si, meriend_si, feriado, fecha_transaccion,
            vacaciones, hora_devuelta_dia, reposo_medico,
            paternidad, maternidad, calamidad_domestica, falta_injustificada,
            val_asume_emp_almuer, val_asume_emp_meriend, codigo_emp_dar, codigo_dep_dar,refrigerio,
            desayuno,usuario_trans , comedor, ruta, parada, pasaje
        } = req.body;

        // 2. USAMOS EL POOL CONSTANTE PARA ESTA DB LOCAL
        const request = poolflowershop.request();

        // 3. Mapeo de inputs (se mantiene igual, es correcto)
        request.input('cedula', sql.VarChar, cedula);
        request.input('nombres', sql.VarChar, nombres);
        request.input('codigocomdar', sql.Int, codigo_com_dar);
        request.input('depto', sql.VarChar, departamento);
        request.input('fecha', sql.VarChar, fecha_dia);
        request.input('pres', sql.VarChar, presente);
        request.input('almuer', sql.VarChar, almuer_si);
        request.input('merien', sql.VarChar, meriend_si);
        request.input('fer', sql.VarChar, feriado);
        request.input('fechatran', sql.VarChar, fecha_transaccion);
        request.input('vacaciones', sql.VarChar, vacaciones);
        request.input('horadevueltadia', sql.VarChar, hora_devuelta_dia);
        request.input('reposomedico', sql.VarChar, reposo_medico);
        request.input('paternidad', sql.VarChar, paternidad);
        request.input('maternidad', sql.VarChar, maternidad);
        request.input('calamidaddomestica', sql.VarChar, calamidad_domestica);
        request.input('faltainjustificada', sql.VarChar, falta_injustificada);
        request.input('valasumeempalmuer', sql.VarChar, val_asume_emp_almuer);
        request.input('valasumeempmeriend', sql.VarChar, val_asume_emp_meriend);
        request.input('codigoempdar', sql.Int, codigo_emp_dar);
        request.input('codigodepdar', sql.Int, codigo_dep_dar);
        request.input('refri', sql.VarChar, refrigerio);
        request.input('desa', sql.VarChar, desayuno);
       request.input('usuario_trans', sql.Int, usuario_trans); 
         request.input('comedor', sql.VarChar, comedor);
          request.input('ruta', sql.Int, ruta);
           request.input('parada', sql.Int, parada);
            request.input('pasaje', sql.VarChar, pasaje);
          
            

        await request.query(`
            INSERT INTO rrhh_formulario 
            (cedula, nombres, codigo_com_dar, departamento, fecha_dia, presente, almuer_si, meriend_si, feriado,
            fecha_transaccion, vacaciones, hora_devuelta_dia, reposo_medico, paternidad, maternidad, calamidad_domestica,
            falta_injustificada, val_asume_emp_almuer, val_asume_emp_meriend, codigo_emp_dar, codigo_dep_dar,refrigerio,desayuno,usuario_trans,comedor,
            ruta,parada,pasaje)
            VALUES (@cedula, @nombres, @codigocomdar, @depto, CAST(@fecha AS DATE), @pres, @almuer, @merien, @fer,
             CAST(@fechatran AS DATE), @vacaciones, @horadevueltadia, @reposomedico, @paternidad, @maternidad, @calamidaddomestica,
            @faltainjustificada, @valasumeempalmuer, @valasumeempmeriend, @codigoempdar, @codigodepdar,@refri,@desa,@usuario_trans,@comedor,
            @ruta,@parada,@pasaje)
        `);

        res.status(201).json({ message: "✅ Registro replicado correctamente en Local" });
    } catch (err) {
        console.error("Detalle del error SQL en INSERT:", err.message);
        res.status(500).json({ 
            error: "Error en la base de datos",
            message: err.message,
            code: err.code 
        });
    }
});


// Ruta: POST /api/RRHH/asistencia_comedor
app.post('/api/RRHH/asistencia_comedor_extras', async (req, res) => {
    try {
        // 1. ELIMINADO: const pool = await sql.connect(config);
       
        const { 
            cedula, nombres, codigo_com_dar, departamento, 
            fecha_dia, fecha_transaccion,
            codigo_emp_dar, codigo_dep_dar,
            usuario_trans 
        } = req.body;

        // 2. USAMOS EL POOL CONSTANTE PARA ESTA DB LOCAL
        const request = poolflowershop.request();

        // 3. Mapeo de inputs (se mantiene igual, es correcto)
        request.input('cedula', sql.VarChar, cedula);
        request.input('nombres', sql.VarChar, nombres);
        request.input('codigocomdar', sql.Int, codigo_com_dar);
        request.input('depto', sql.VarChar, departamento);
        request.input('fecha', sql.VarChar, fecha_dia);
        request.input('fechatran', sql.VarChar, fecha_transaccion);
        request.input('codigoempdar', sql.Int, codigo_emp_dar);
        request.input('codigodepdar', sql.Int, codigo_dep_dar);
       request.input('usuario_trans', sql.Int, usuario_trans); 
    
          
            

        await request.query(`
            INSERT INTO rrhh_extras
            (cedula, nombres, codigo_com_dar, departamento, fecha_dia,
            fecha_transaccion,codigo_emp_dar, codigo_dep_dar,usuario_trans)
            
            VALUES (@cedula, @nombres, @codigocomdar, @depto, CAST(@fecha AS DATE), 
             CAST(@fechatran AS DATE), @codigoempdar, @codigodepdar,@usuario_trans)
          
        `);

        res.status(201).json({ message: "✅ Registro replicado correctamente en Local" });
    } catch (err) {
        console.error("Detalle del error SQL en INSERT:", err.message);
        res.status(500).json({ 
            error: "Error en la base de datos",
            message: err.message,
            code: err.code 
        });
    }
});



app.post('/api/RRHH/asistencia_comedor_masiva', async (req, res) => {
    // 1. Desestructuramos el cuerpo de la petición
    const { empleados, fecha_dia, usuario_trans, tipo_dia } = req.body;
    let transaction;

    try {
        const pool = poolflowershop;

        if (!empleados || empleados.length === 0) {
            return res.status(400).json({ error: "No se recibieron empleados." });
        }

        const fechaLimpia = fecha_dia.split('T')[0]; 

        const checkRequest = pool.request();
        checkRequest.input('fecha', sql.VarChar, fechaLimpia); 
        checkRequest.input('depto', sql.VarChar, empleados[0].departamento);
        checkRequest.input('sucursal', sql.Int, empleados[0].codigo_com_dar);

        const checkResult = await checkRequest.query(`
            SELECT COUNT(*) as total 
            FROM rrhh_formulario with(nolock)
            WHERE fecha_dia = CAST(@fecha AS DATE) 
              AND departamento = @depto 
              AND codigo_com_dar = @sucursal
              and (estadovisual <> '0' OR estadovisual IS NULL)
        `);

        if (checkResult.recordset[0].total > 0) {
            console.log(`Bloqueado: Se encontraron ${checkResult.recordset[0].total} registros existentes.`);
            return res.status(409).json({ 
                error: "Duplicado", 
                message: `Ya existen registros para ${empleados[0].departamento} en la fecha ${fechaLimpia}.` 
            });
        }

        // 2. INICIO DE LA TRANSACCIÓN
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const fecha_transaccion = new Date();

        for (const emp of empleados) {
            const request = new sql.Request(transaction);
            
            // Mapeo exhaustivo de parámetros
            request.input('cedula', sql.VarChar, emp.cedula);
            request.input('nombres', sql.VarChar, emp.nombres);
            request.input('codigocomdar', sql.Int, emp.codigo_com_dar);
            request.input('depto', sql.VarChar, emp.departamento);
            request.input('fecha', sql.VarChar, fecha_dia);
            request.input('pres', sql.VarChar, emp.presente);
            request.input('almuer', sql.VarChar, emp.almuer_si);
            request.input('merien', sql.VarChar, emp.meriend_si);
            request.input('fer', sql.VarChar, emp.feriado);
            request.input('fechatran', sql.DateTime, fecha_transaccion);
            request.input('vacaciones', sql.VarChar, emp.vacaciones);
            request.input('horadevueltadia', sql.VarChar, emp.hora_devuelta_dia);
            request.input('reposomedico', sql.VarChar, emp.reposo_medico);
            request.input('paternidad', sql.VarChar, emp.paternidad);
            request.input('maternidad', sql.VarChar, emp.maternidad);
            request.input('calamidaddomestica', sql.VarChar, emp.calamidad_domestica);
            request.input('faltainjustificada', sql.VarChar, emp.falta_injustificada);
            request.input('valasumeempalmuer', sql.VarChar, emp.val_asume_emp_almuer);
            request.input('valasumeempmeriend', sql.VarChar, emp.val_asume_emp_meriend);
            request.input('codigoempdar', sql.Int, emp.codigo_emp_dar);
            request.input('codigodepdar', sql.Int, emp.codigo_dep_dar);
            request.input('refri', sql.VarChar, emp.refrigerio);
            request.input('desa', sql.VarChar, emp.desayuno);
            request.input('usuario_trans', sql.Int, usuario_trans);
            request.input('comedor', sql.VarChar, emp.comedor || null);
            request.input('ruta', sql.Int, emp.ruta || null);
            request.input('parada', sql.Int, emp.parada || null);
            request.input('pasaje', sql.VarChar, emp.pasaje || null);
           
            
            // Prioriza el tipo_dia que viene en la raíz del body, de lo contrario usa el del empleado o 'NORMAL'
            request.input('tipodia', sql.VarChar, tipo_dia || emp.tipo_dia || 'NORMAL');
         
            request.input('sueldobase', sql.Decimal(18, 2), emp.sueldoBase != null ? Number(emp.sueldoBase) : null);


            await request.query(`
                INSERT INTO rrhh_formulario 
                (cedula, nombres, codigo_com_dar, departamento, fecha_dia, presente, almuer_si, meriend_si, feriado,
                fecha_transaccion, vacaciones, hora_devuelta_dia, reposo_medico, paternidad, maternidad, calamidad_domestica,
                falta_injustificada, val_asume_emp_almuer, val_asume_emp_meriend, codigo_emp_dar, codigo_dep_dar, refrigerio, desayuno, usuario_trans, comedor,
                ruta, parada, pasaje, tipo_dia,sueldo)
                VALUES (@cedula, @nombres, @codigocomdar, @depto, CAST(@fecha AS DATE), @pres, @almuer, @merien, @fer,
                @fechatran, @vacaciones, @horadevueltadia, @reposomedico, @paternidad, @maternidad, @calamidaddomestica,
                @faltainjustificada, @valasumeempalmuer, @valasumeempmeriend, @codigoempdar, @codigodepdar, @refri, @desa, @usuario_trans, @comedor,
                @ruta, @parada, @pasaje, @tipodia,@sueldobase) -- CORREGIDO: @tipodia emparejado con request.input
            `);
        } // CORREGIDO: Se añadió el cierre del bucle for

        await transaction.commit();
        res.status(201).json({ message: `✅ ${empleados.length} registros copiados con éxito.` });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("Error en Inserción Masiva:", err.message);
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
});








app.post('/api/RRHH/asistencia_comedor_masiva_extras', async (req, res) => {
    // 1. Desestructuramos el cuerpo de la petición
    const { empleados, fecha_dia, usuario_trans, tipo_dia } = req.body;
    let transaction;

    try {
        const pool = poolflowershop;

        if (!empleados || empleados.length === 0) {
            return res.status(400).json({ error: "No se recibieron empleados." });
        }

        const fechaLimpia = fecha_dia.split('T')[0]; 

        const checkRequest = pool.request();
        checkRequest.input('fecha', sql.VarChar, fechaLimpia); 
        checkRequest.input('depto', sql.VarChar, empleados[0].departamento);
        checkRequest.input('sucursal', sql.Int, empleados[0].codigo_com_dar);

        const checkResult = await checkRequest.query(`
            SELECT COUNT(*) as total 
            FROM rrhh_extras with(nolock)
            WHERE fecha_dia = CAST(@fecha AS DATE) 
              AND departamento = @depto 
              AND codigo_com_dar = @sucursal
              and (estadovisual <> '0' OR estadovisual IS NULL)
        `);

        if (checkResult.recordset[0].total > 0) {
            console.log(`Bloqueado: Se encontraron ${checkResult.recordset[0].total} registros existentes.`);
            return res.status(409).json({ 
                error: "Duplicado", 
                message: `Ya existen registros para ${empleados[0].departamento} en la fecha ${fechaLimpia}.` 
            });
        }

        // 2. INICIO DE LA TRANSACCIÓN
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const fecha_transaccion = new Date();

        for (const emp of empleados) {
            const request = new sql.Request(transaction);
            
            // Mapeo exhaustivo de parámetros
            request.input('cedula', sql.VarChar, emp.cedula);
            request.input('nombres', sql.VarChar, emp.nombres);
            request.input('codigocomdar', sql.Int, emp.codigo_com_dar);
            request.input('depto', sql.VarChar, emp.departamento);
            request.input('fecha', sql.VarChar, fecha_dia);
         
            request.input('fechatran', sql.DateTime, fecha_transaccion);
           
    
            request.input('codigoempdar', sql.Int, emp.codigo_emp_dar);
            request.input('codigodepdar', sql.Int, emp.codigo_dep_dar);
       
            request.input('usuario_trans', sql.Int, usuario_trans);
        
           
            
            // Prioriza el tipo_dia que viene en la raíz del body, de lo contrario usa el del empleado o 'NORMAL'
            request.input('tipodia', sql.VarChar, tipo_dia || emp.tipo_dia || 'NORMAL');
         
            request.input('sueldobase', sql.Decimal(18, 2), emp.sueldoBase != null ? Number(emp.sueldoBase) : null);


            await request.query(`
                INSERT INTO rrhh_extras 
                (cedula, nombres, codigo_com_dar, departamento, fecha_dia, 
                fecha_transaccion, 
                codigo_emp_dar, codigo_dep_dar, usuario_trans, 
                tipo_dia,sueldo)
                VALUES (@cedula, @nombres, @codigocomdar, @depto, CAST(@fecha AS DATE), 
                @fechatran, 
                @codigoempdar, @codigodepdar, @usuario_trans,
                @tipodia,@sueldobase) -- CORREGIDO: @tipodia emparejado con request.input
            `);
        } // CORREGIDO: Se añadió el cierre del bucle for

        await transaction.commit();
        res.status(201).json({ message: `✅ ${empleados.length} registros copiados con éxito.` });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("Error en Inserción Masiva:", err.message);
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
});



app.post('/api/RRHH/horas_extras_masiva_bqt', async (req, res) => {
    const { empleados, fecha_dia, usuario_trans, tipo_dia } = req.body;
    let transaction;

    try {
        const pool = poolflowershop;

        if (!empleados || empleados.length === 0) {
            return res.status(400).json({ error: "No se recibieron empleados." });
        }

        const fechaLimpia = fecha_dia.split('T')[0]; 

        const checkRequest = pool.request();
        checkRequest.input('fecha', sql.VarChar, fechaLimpia); 
        checkRequest.input('depto', sql.VarChar, empleados[0].departamento);
        checkRequest.input('sucursal', sql.Int, empleados[0].codigo_com_dar);

        const checkResult = await checkRequest.query(`
            SELECT COUNT(*) as total 
            FROM rrhh_extras with(nolock)
            WHERE fecha_dia = CAST(@fecha AS DATE) 
              AND departamento = @depto 
              AND codigo_com_dar = @sucursal
              and (estadovisual <> '0' OR estadovisual IS NULL)
        `);

        if (checkResult.recordset[0].total > 0) {
            console.log(`Bloqueado: Se encontraron ${checkResult.recordset[0].total} registros existentes.`);
            return res.status(409).json({ 
                error: "Duplicado", 
                message: `Ya existen registros para ${empleados[0].departamento} en la fecha ${fechaLimpia}.` 
            });
        }

        // 2. INICIO DE LA TRANSACCIÓN
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const fecha_transaccion = new Date();

        // Ejecución secuencial controlada para evitar "request in progress"
        for (const emp of empleados) {
            const request = new sql.Request(transaction);
            
            request.input('cedula', sql.VarChar, emp.cedula);
            request.input('nombres', sql.VarChar, emp.nombres);
            request.input('codigocomdar', sql.Int, emp.codigo_com_dar);
            request.input('depto', sql.VarChar, emp.departamento);
            request.input('fecha', sql.VarChar, fecha_dia);
            request.input('fechatran', sql.DateTime, fecha_transaccion);
            request.input('codigoempdar', sql.Int, emp.codigo_emp_dar);
            request.input('codigodepdar', sql.Int, emp.codigo_dep_dar);

            // Manejo de fechaIngreso como sql.Date
            let fechaIngresoFormateada = null;
            if (emp.fechaIngreso) {
                fechaIngresoFormateada = new Date(emp.fechaIngreso).toISOString().split('T')[0];
            }
            request.input('fechaIngreso', sql.Date, fechaIngresoFormateada);

            request.input('AntiguedadDias', sql.Int, emp.AntiguedadDias);
            request.input('porcentajerendimiento', sql.Int, emp.porcentajerendimiento);
            request.input('puestotrabajo', sql.VarChar, emp.puestotrabajo);
            request.input('usuario_trans', sql.Int, usuario_trans);
            
            request.input('tipodia', sql.VarChar, tipo_dia || emp.tipo_dia || 'NORMAL');
            request.input('sueldobase', sql.Decimal(18, 2), emp.sueldoBase != null ? Number(emp.sueldoBase) : null);

            // 1. Declaras los parámetros con un nombre (Primer argumento de request.input)
            request.input('h_inicio_jn', sql.VarChar, parsearHora(emp.horaInicio));
            request.input('h_almuerzo', sql.VarChar, parsearHora(emp.tiemalmz));
            request.input('h_inicio_fn', sql.VarChar, parsearHora(emp.horaFin));

            // Esperamos estrictamente a que termine ESTA consulta antes de pasar al siguiente empleado
            await request.query(`
                INSERT INTO rrhh_extras 
                (cedula, nombres, codigo_com_dar, departamento, fecha_dia, 
                fecha_transaccion, 
                codigo_emp_dar, codigo_dep_dar, usuario_trans, 
                tipo_dia, sueldo, fechaIngreso, AntiguedadDias, porcentajerendimiento, puestotrabajo,
                h_inicio_jn, h_almuerzo, h_inicio_fn)
                VALUES 
                (@cedula, @nombres, @codigocomdar, @depto, CAST(@fecha AS DATE), 
                @fechatran, 
                @codigoempdar, @codigodepdar, @usuario_trans,
                @tipodia, @sueldobase, @fechaIngreso, @AntiguedadDias, @porcentajerendimiento, @puestotrabajo,
                @h_inicio_jn, @h_almuerzo, @h_inicio_fn) -- CORREGIDO: Ahora coinciden exactamente con los inputs
            `);

        }

        // Confirmamos la transacción solo si todo el bucle terminó con éxito
        await transaction.commit();
        res.status(201).json({ message: `✅ ${empleados.length} registros copiados con éxito.` });

    } catch (err) {
        // El rollback ahora funcionará de forma segura porque ninguna consulta estará "en progreso"
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error("Error al ejecutar rollback:", rollbackErr.message);
            }
        }
        console.error("Error en Inserción Masiva:", err.message);
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
});


app.post('/api/RRHH/registrar_transacciones_vacaciones', async (req, res) => { 
  const { empleados, año, usuario_trans } = req.body; 
  let transaction; 
  
  try { 
    const pool = poolflowershop; 
    
    if (!empleados || empleados.length === 0) { 
      return res.status(400).json({ error: "No se recibieron empleados." }); 
    } 
    
    // 1. CONTROL ANTI-DUPLICADOS GLOBAL (Únicamente por Año)
    const checkRequest = pool.request(); 
    checkRequest.input('anio', sql.Numeric(18, 0), año); 
    
    const checkResult = await checkRequest.query(` 
      SELECT COUNT(*) as total 
      FROM sioret_vacaciones WITH(nolock) 
      WHERE año = @anio 
        AND (estadovisual <> '0' OR estadovisual IS NULL) 
    `); 
    
    if (checkResult.recordset[0].total > 0) { 
      return res.status(409).json({ 
        error: "Duplicado", 
        message: `Ya existen registros guardados para el periodo ${año}.` 
      }); 
    } 

    // 2. INICIO DE TRANSACCIÓN CONTROLADA EN BASE LOCAL 
    transaction = new sql.Transaction(pool); 
    await transaction.begin(); 
    const fecha_transaccion = new Date(); 
    
    // Bucle de inserción secuencial controlado para la totalidad de la nómina
    for (const emp of empleados) { 
      const request = new sql.Request(transaction); 
      
      request.input('empresa', sql.VarChar(200), emp.empresa || ''); 
      request.input('idemp', sql.Numeric(18, 0), emp.idemp); 
      request.input('nombres', sql.VarChar(200), emp.nombres); 
      request.input('depto', sql.VarChar(200), emp.departamento); 
      request.input('ganadas', sql.Decimal(18, 2), emp.dias_vacaciones_ganadas || 0); 
      request.input('pendientes', sql.Decimal(18, 2), emp.dias_vacaciones_pendientes || 0); 
      request.input('anio', sql.Numeric(18, 0), año); 
      request.input('fechatran', sql.DateTime, fecha_transaccion); 
      request.input('usuario_trans', sql.Numeric(18, 0), usuario_trans); 
      request.input('codigocomdar', sql.Numeric(18, 0), emp.codigo_com_dar); 
      request.input('codigodepdar', sql.Numeric(18, 0), emp.codigo_dep_dar); 
      request.input('cedula', sql.VarChar(20), emp.cedula || ''); 
      
      // Mapeado directo sobre 'fecha_jornada' que proviene de Dartis
      const fechaIngresoValida = emp.fecha_jornada ? new Date(emp.fecha_jornada) : null; 
      request.input('fecha_ingreso', sql.DateTime, (fechaIngresoValida && !isNaN(fechaIngresoValida.getTime())) ? fechaIngresoValida : null); 
      
      request.input('gerencia', sql.VarChar(200), emp.Gerencia || emp.gerencia || 'Sin Gerencia Asignada'); 
      request.input('jefedirecto', sql.VarChar(200), emp.jefedirecto || 'Sin Jefe Asignado'); 
      request.input('actividad', sql.VarChar(200), emp.Actividad || emp.actividad || ''); 

      request.input('periodo_rol', sql.VarChar(100), emp.periodo_rol || 'Sin rol'); 
    request.input('idrol', sql.Numeric(18, 0), emp.idrol); 

      
      await request.query(` 
        INSERT INTO sioret_vacaciones 
        ( 
          empresa, idemp, nombres, departamento, 
          dias_vacaciones_ganadas, dias_vacaciones_pendientes, 
          año, fecha_creacion, usuario_creacion, codigo_com_dar, codigo_dep_dar, cedula, 
          fecha_ingreso, gerencia, jefedirecto, actividad ,idrol,periodo_rol
        ) 
        VALUES 
        ( 
          @empresa, @idemp, @nombres, @depto, 
          @ganadas, @pendientes, 
          @anio, @fechatran, @usuario_trans, @codigocomdar, @codigodepdar, @cedula, 
          @fecha_ingreso, @gerencia, @jefedirecto, @actividad ,@idrol,@periodo_rol
        ) 
      `); 
    } 
    
    await transaction.commit(); 
    res.status(201).json({ message: `Se copiaron ${empleados.length} registros globales con éxito.` }); 

  } catch (err) { 
    if (transaction) { 
      try { await transaction.rollback(); } catch (rbErr) { console.error(rbErr); } 
    } 
    console.error("Error en Inserción Masiva Local:", err.message); 
    res.status(500).json({ error: "Error interno del servidor", details: err.message }); 
  } 
});



// ==========================================
// 1. FUNCIÓN AUXILIAR (Colocada arriba)
// ==========================================
function parsearHora(horaInput) {
    if (!horaInput) return null;
    
    // Si viene como un objeto Date nativo de JavaScript
    if (horaInput instanceof Date) {
        return horaInput.toISOString().split('T')[1].substring(0, 8);
    }
    
    if (typeof horaInput === 'string') {
        const limpia = horaInput.trim();
        if (limpia === '' || limpia.toLowerCase() === 'null' || limpia.toLowerCase() === 'undefined') {
            return null;
        }
        
        // Si viene en formato ISO completo de texto (ej: "1970-01-01T06:35:00.000Z")
        if (limpia.includes('T')) {
            return limpia.split('T')[1].substring(0, 8); // Extrae "06:35:00"
        }
        
        // Si viene en formato corto HH:mm, le agregamos los segundos
        const partes = limpia.split(':');
        if (partes.length === 2) {
            return `${limpia}:00`;
        }
        
        return limpia;
    }
    
    return null;
}


app.post('/api/RRHH/asistencia_comedor_masiva_extras_dartis', async (req, res) => {
    const { empleados, fecha_dia, usuario_trans, tipo_dia } = req.body;
    let transaction;

    try {
        const pool = poolflowershop;

         console.log("📥 DATOS RECIBIDOS EN EL REQ.BODY:", JSON.stringify(empleados[0], null, 2));

        if (!empleados || empleados.length === 0) {
            return res.status(400).json({ error: "No se recibieron empleados." });
        }

        const fechaLimpia = fecha_dia.split('T')[0]; 

        // 1. VALIDACIÓN DE DUPLICADOS (Usando el primer elemento como referencia)
        const checkRequest = pool.request();
        checkRequest.input('fecha', sql.VarChar, fechaLimpia); 
        checkRequest.input('depto', sql.VarChar, empleados[0].departamento);
        checkRequest.input('sucursal', sql.Int, empleados[0].codigo_com_dar);

        const checkResult = await checkRequest.query(`
            SELECT COUNT(*) as total 
            FROM rrhh_extras with(nolock)
            WHERE fecha_dia = CAST(@fecha AS DATE) 
              AND departamento = @depto 
              AND codigo_com_dar = @sucursal
              AND (estadovisual <> '0' OR estadovisual IS NULL)
        `);

        if (checkResult.recordset[0].total > 0) {
            console.log(`Bloqueado: Se encontraron ${checkResult.recordset[0].total} registros existentes.`);
            return res.status(409).json({ 
                error: "Duplicado", 
                message: `Ya existen registros para ${empleados[0].departamento} en la fecha ${fechaLimpia}.` 
            });
        }

        // 2. INICIO DE LA TRANSACCIÓN
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const fecha_transaccion = new Date();

        // Creamos un único objeto Request para optimizar el rendimiento
        const request = new sql.Request(transaction);

        // 3. BUCLE DE INSERCIÓN MASIVA
        for (const emp of empleados) {
            // Limpiar parámetros de la iteración anterior
            request.parameters = {}; 

            request.input('cedula', sql.VarChar, emp.cedula);
            request.input('nombres', sql.VarChar, emp.nombres);
            request.input('codigocomdar', sql.Int, emp.codigo_com_dar);
            request.input('depto', sql.VarChar, emp.departamento);
            request.input('fecha', sql.VarChar, fecha_dia);
            request.input('fechatran', sql.DateTime, fecha_transaccion);
            request.input('codigoempdar', sql.Int, emp.codigo_emp_dar);
            request.input('codigodepdar', sql.Int, emp.codigo_dep_dar);
            request.input('usuario_trans', sql.Int, usuario_trans);
            request.input('tipodia', sql.VarChar, tipo_dia || emp.tipo_dia || 'NORMAL');
            request.input('sueldobase', sql.Decimal(18, 2), emp.sueldoBase != null ? Number(emp.sueldoBase) : null);

            // =========================================================================
            // CAPTURA ULTRA-SEGURA DE HORAS (Soporta múltiples nomenclaturas del Frontend)
            // =========================================================================
            const h_inicio = emp.horaInicio || emp.h_inicio_jn || emp.hora_inicio || null;
            const h_almuerzo = emp.tiemalmz || emp.h_almuerzo || emp.almuerzo || null;
            const h_fin_jn = emp.horaFin || emp.h_inicio_fn || emp.hora_fin || null;
            const h_ini_ext = emp.horasextrasinicio || emp.h_inicio_ext || emp.horas_extras_inicio || null;
            const h_fin_ext = emp.horasextrasfin || emp.h_fin_ext || emp.horas_extras_fin || null;

            // Mapeo estricto como VARCHAR con formato limpio (HH:mm:ss) hacia SQL Server
            request.input('h_inicio_jn', sql.VarChar, parsearHora(h_inicio));
            request.input('h_almuerzo', sql.VarChar, parsearHora(h_almuerzo));
            request.input('h_inicio_fn', sql.VarChar, parsearHora(h_fin_jn));
            request.input('h_inicio_ext', sql.VarChar, parsearHora(h_ini_ext));
            request.input('h_fin_ext', sql.VarChar, parsearHora(h_fin_ext));

            await request.query(`
                INSERT INTO rrhh_extras 
                (
                    cedula, nombres, codigo_com_dar, departamento, fecha_dia, 
                    fecha_transaccion, codigo_emp_dar, codigo_dep_dar, usuario_trans, 
                    tipo_dia, sueldo,
                    h_inicio_jn, h_almuerzo, h_inicio_fn, h_inicio_ext, h_fin_ext
                )
                VALUES 
                (
                    @cedula, @nombres, @codigocomdar, @depto, CAST(@fecha AS DATE), 
                    @fechatran, @codigoempdar, @codigodepdar, @usuario_trans, 
                    @tipodia, @sueldobase,
                    @h_inicio_jn, @h_almuerzo, @h_inicio_fn, @h_inicio_ext, @h_fin_ext
                )
            `);
        } 

        // 4. CONFIRMACIÓN
        await transaction.commit();
        res.status(201).json({ message: `✅ ${empleados.length} registros copiados con éxito.` });

    } catch (err) {
        // Reversión segura en caso de fallo
        if (transaction && transaction.id !== null) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error("Error al ejecutar rollback:", rollbackErr.message);
            }
        }
        console.error("Error en Inserción Masiva:", err.message);
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
});



app.post('/api/FIT/registrarcliente', async (req, res) => {
    try {
        // Recibimos los campos del body
        const { id_cle, nombres, apellidos, direccion, telefono, fecha_nacimiento,altura,edad,genero,estado_cle, fecha_desde,fecha_hasta } = req.body;
        const request = poolflowershop.request();

        // Parámetros SQL comunes
        request
            .input('nom', nombres)
            .input('ape', apellidos)
            .input('dir', direccion || '')
            .input('tel', telefono || '')
             .input('alt', altura || '')
              .input('eda', edad || '')
               .input('gen', genero || '')
               .input('estado', sql.Int, estado_cle || 0)
            .input('f_d', fecha_desde || null)
            .input('f_h', fecha_hasta || null)
            .input('f_nac', fecha_nacimiento || null);
            

        // --- EL TRUCO ESTÁ AQUÍ ---
        if (id_cle && id_cle !== '') {
            // SI HAY ID -> ACTUALIZAR REGISTRO EXISTENTE
            await request.input('id', id_cle).query(`
                UPDATE fit_clientes 
                SET Nombres = @nom, 
                    Apellidos = @ape, 
                    direccion = @dir, 
                    telefono = @tel, 
                    altura = @alt, 
                     edad = @eda, 
                       estado_cle = @estado, 
                     genero = @gen, 
                     fecha_desde = @f_d,
                     fecha_hasta = @f_h,
                    fecha_nacimiento = @f_nac
                WHERE id_cle = @id
            `);
            res.json({ message: "Cliente actualizado" });
        } else {
            // SI NO HAY ID -> CREAR REGISTRO NUEVO
            await request.query(`
                INSERT INTO fit_clientes (Nombres, Apellidos, direccion, telefono, fecha_nacimiento, fecha_computador,altura,edad,genero,estado_cle,fecha_desde,fecha_hasta)
                VALUES (@nom, @ape, @dir, @tel, @f_nac, GETDATE(),@alt,@eda,@gen,@estado,@f_d,@f_h)
            `);
            res.json({ message: "Cliente creado" });
        }
    } catch (err) {
        console.error("Error en DB:", err.message);
        res.status(500).send("Error al guardar: " + err.message);
    }
});



// para buscar empleado de la asistencia
app.get('/api/RRHH/asistencia_comedor/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. USAMOS EL POOL GLOBAL (Adiós a new Connection y tedious)
        const request = poolflowershop.request();

        // 2. Parámetro seguro con mssql
        request.input('id', sql.Int, id);

        // 3. Ejecución directa con async/await
        const result = await request.query(`
            SELECT * FROM rrhh_formulario with(nolock) WHERE id = @id
        `);

        // 4. Validación de existencia
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "No encontrado" });
        }

        // Enviamos el primer (y único) registro encontrado
        res.json(result.recordset[0]);

    } catch (err) {
        console.error("❌ Error al obtener registro por ID:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});



/////////////INICIO GYM/////////////////////////////////////
app.post('/api/FIT/registrarcliente', async (req, res) => {
    try {
        // 1. ELIMINADO: const pool = await sql.connect(config);
        
        const { 
            nombres, apellidos, fecha_nacimiento, fecha_computador, direccion, telefono
        } = req.body;

        // 2. USAMOS EL POOL PERSISTENTE (poolflowershop o el nombre de tu pool local)
        const request = poolflowershop.request();

        request.input('nombres', sql.VarChar, nombres);
        request.input('apellidos', sql.VarChar, apellidos);
        request.input('fecha_nacimiento', sql.VarChar, fecha_nacimiento);
        request.input('fecha_computador', sql.VarChar, fecha_computador);          
        request.input('direccion', sql.VarChar, direccion);
        request.input('telefono', sql.VarChar, telefono);
    
        await request.query(`
            INSERT INTO fit_clientes 
            (nombres, apellidos, fecha_nacimiento, fecha_computador, direccion, telefono)
            VALUES 
            (@nombres, @apellidos, CAST(@fecha_nacimiento AS DATE),
             CAST(@fecha_computador AS DATE), @direccion, @telefono)
        `);

        res.status(201).json({ message: "✅ ¡Registro creado con éxito!" });

    } catch (err) {
        console.error("❌ Error en FIT RegistrarCliente:", err.message);
        res.status(500).json({ 
            error: "Error en la base de datos",
            message: err.message,
            code: err.code 
        });
    }
});






// para buscar clientes fit
app.get('/api/FIT/clientesfit', async (req, res) => {
    try {
        // 1. ELIMINADO: let pool = await sql.connect(config); 
        
        // 2. USAMOS EL POOL LOCAL QUE YA ESTÁ CONECTADO (poolflowershop)
        const request = poolflowershop.request();

        let result = await request.query(`
            SELECT 
                id_cle, Nombres, Apellidos, 
                Edad, fecha_nacimiento, 
                direccion, mail, telefono  , altura, genero, estado_cle, fecha_desde,fecha_hasta
            FROM fit_clientes with(nolock)
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error en consulta Clientes FIT:", err.message);
        res.status(500).send("Error al obtener Clientes fit: " + err.message);
    }
});


//FIT DETALLE
app.get('/api/FIT/detalle_fit', async (req, res) => {
    try {
        // 1. ELIMINADO: let pool = await sql.connect(config); 
        
        // 2. USAMOS EL POOL LOCAL QUE YA ESTÁ CONECTADO (poolflowershop)
        const request = poolflowershop.request();

        let result = await request.query(`
            select id, id_cle,articulo, precio_venta  
            from fit_clientes_pagos with(nolock)
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error en consulta Clientes FIT:", err.message);
        res.status(500).send("Error al obtener Clientes fit: " + err.message);
    }
});


//FIT Articulos
app.get('/api/FIT/articulo_fit', async (req, res) => {
    try {
        // 1. ELIMINADO: let pool = await sql.connect(config); 
        
        // 2. USAMOS EL POOL LOCAL QUE YA ESTÁ CONECTADO (poolflowershop)
        const request = poolflowershop.request();

        let result = await request.query(`
            select id_art, descripción nombre_art, unidad_medida, precio_compra, precio_venta 
        from fit_articulos with(nolock) order by descripción
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error en consulta artículos fit:", err.message);
        res.status(500).send("Error al obtener artículosT fit: " + err.message);
    }
});



// CONSULTAR HISTORIAL
app.get('/api/FIT/consultar_facturas/:id_cle', async (req, res) => {
    try {
        const { id_cle } = req.params;
        const request = poolflowershop.request();
        request.input('id_cle', sql.Int, id_cle); 

        const result = await request.query(`
            SELECT id, id_cle, articulo as id_art, precio_venta, 
                   fecha_pago, valor_descuento, valor_pago, valor_deuda 
            FROM fit_clientes_pagos  with(nolock)
            WHERE id_cle = @id_cle
            ORDER BY fecha_pago DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Error al consultar" });
    }
});





app.put('/api/FIT/editar_pago/:id', async (req, res) => {
    const { id } = req.params;
    const { id_art, precio_venta, cantidad, valor_descuento, valor_pago, fecha_pago } = req.body;

    // Recalcular valores en el servidor por seguridad
    const subtotal = (parseFloat(precio_venta) * parseInt(cantidad || 1)) - parseFloat(valor_descuento || 0);
    const deuda = subtotal - parseFloat(valor_pago || 0);

    try {
        const pool = await poolflowershop;
        await pool.request()
            .input('id', sql.Int, id)
            .input('id_art', sql.Int, id_art)
            .input('precio', sql.Decimal(18, 2), subtotal)
            .input('fecha', sql.DateTime, fecha_pago)
            .input('desc', sql.Decimal(18, 2), valor_descuento)
            .input('pago', sql.Decimal(18, 2), valor_pago)
            .input('deuda', sql.Decimal(18, 2), deuda)
            .query(`
                UPDATE fit_clientes_pagos 
                SET articulo = @id_art, 
                    precio_venta = @precio, 
                    fecha_pago = @fecha, 
                    valor_descuento = @desc, 
                    valor_pago = @pago, 
                    valor_deuda = @deuda 
                WHERE id = @id
            `);

        res.json({ success: true, message: "Registro actualizado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// ELIMINAR REGISTRO INDIVIDUAL
app.delete('/api/FIT/eliminar_pago/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolflowershop;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM fit_clientes_pagos WHERE id = @id');

        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: "Registro eliminado correctamente" });
        } else {
            res.status(404).json({ success: false, message: "No se encontró el registro" });
        }
    } catch (err) {
        console.error("Error al eliminar:", err);
        res.status(500).json({ error: err.message });
    }
});

// REGISTRAR UN SOLO PAGO (POST)
app.post('/api/FIT/guardar_pago', async (req, res) => {
    // 1. Extraemos y damos valores por defecto para evitar errores de cálculo
    const id_cle = parseInt(req.body.id_cle);
    const id_art = parseInt(req.body.id_art);
    const precio_venta = parseFloat(req.body.precio_venta) || 0;
    const cantidad = parseInt(req.body.cantidad) || 1;
    const valor_descuento = parseFloat(req.body.valor_descuento) || 0;
    const valor_pago = parseFloat(req.body.valor_pago) || 0;
    const fecha_pago = req.body.fecha_pago || new Date(); 

    // 2. Cálculos limpios
    const subtotal = (precio_venta * cantidad) - valor_descuento;
    const deuda = subtotal - valor_pago;

    try {
        const pool = await poolflowershop;
        const result = await pool.request()
            .input('id_cle', sql.Int, id_cle)
            .input('id_art', sql.Int, id_art)
            .input('precio', sql.Decimal(18, 2), subtotal)
            .input('fecha', sql.DateTime, fecha_pago)
            .input('desc', sql.Decimal(18, 2), valor_descuento)
            .input('pago', sql.Decimal(18, 2), valor_pago)
            .input('deuda', sql.Decimal(18, 2), deuda)
            .query(`
                INSERT INTO fit_clientes_pagos (id_cle, articulo, precio_venta, fecha_pago, valor_descuento, valor_pago, valor_deuda) 
                VALUES (@id_cle, @id_art, @precio, @fecha, @desc, @pago, @deuda);
                SELECT SCOPE_IDENTITY() AS id;
            `);

        res.json({ 
            success: true, 
            id: result.recordset[0].id,
            calculos: { subtotal, deuda } // Útil para verificar en el front
        });
    } catch (err) {
        console.error("Error al guardar pago:", err.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});




app.get('/api/FIT/consultar_avances/:id_cle', async (req, res) => {
    try {
        const { id_cle } = req.params;
        const request = poolflowershop.request(); // Usando tu pool persistente
        
        request.input('id_cle', sql.Int, id_cle);
        
        const result = await request.query(`
            SELECT id,peso_kg
      ,peso_lb
      ,medida_bicep
      ,medida_tricep
      ,medida_pecho
      ,medida_hombro
      ,medida_gluteos
      ,medida_femoral
      ,medida_cuadriceps
      ,medida_piena
      ,medida_pantorrilla
      ,medida_abdomen
      ,medida_antebrazo
      ,medida_trapecios
      ,porcentaje_grasa
      ,mes
      ,año
       ,brazos
      ,espalda
      ,torax
      ,imc
            
            
            FROM fit_clientes_avances  with(nolock)
            WHERE id_cle = @id_cle 
            ORDER BY año DESC, mes DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error al obtener avances:", err.message);
        res.status(500).json({ error: "Error en el servidor" });
    }
});



// EDITAR AVANCE
app.put('/api/FIT/actualizar_avance/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const d = req.body;
        const request = poolflowershop.request();

        request.input('id', sql.Numeric, id);
        request.input('peso_kg', sql.Decimal(18, 2), d.peso_kg);
        request.input('peso_lb', sql.Decimal(18, 2), d.peso_lb);
        request.input('medida_bicep', sql.Decimal(18, 2), d.medida_bicep);
        request.input('medida_tricep', sql.Decimal(18, 2), d.medida_tricep);
        request.input('medida_pecho', sql.Decimal(18, 2), d.medida_pecho);
        request.input('medida_hombro', sql.Decimal(18, 2), d.medida_hombro);
        request.input('medida_gluteos', sql.Decimal(18, 2), d.medida_gluteos);
        request.input('medida_femoral', sql.Decimal(18, 2), d.medida_femoral);
        request.input('medida_cuadriceps', sql.Decimal(18, 2), d.medida_cuadriceps);
        request.input('medida_piena', sql.Decimal(18, 2), d.medida_piena);
        request.input('medida_pantorrilla', sql.Decimal(18, 2), d.medida_pantorrilla);
        request.input('medida_abdomen', sql.Decimal(18, 2), d.medida_abdomen);
        request.input('medida_antebrazo', sql.Decimal(18, 2), d.medida_antebrazo);
        request.input('medida_trapecios', sql.Decimal(18, 2), d.medida_trapecios);
        request.input('porcentaje_grasa', sql.Decimal(18, 2), d.porcentaje_grasa);
        request.input('mes', sql.Numeric(18, 0), d.mes);
        request.input('año', sql.Numeric(18, 0), d.año);
        request.input('porcentaje_musculo', sql.Decimal(18, 2), d.porcentaje_musculo);
        request.input('brazos', sql.Decimal(18, 2), d.brazos);
        request.input('espalda', sql.Decimal(18, 2), d.espalda);
        request.input('torax', sql.Decimal(18, 2), d.torax);
        request.input('imc', sql.Decimal(18, 2), d.imc);

        await request.query(`
            UPDATE fit_clientes_avances SET 
                peso_kg=@peso_kg, peso_lb=@peso_lb, medida_bicep=@medida_bicep, medida_tricep=@medida_tricep,
                medida_pecho=@medida_pecho, medida_hombro=@medida_hombro, medida_gluteos=@medida_gluteos,
                medida_femoral=@medida_femoral, medida_cuadriceps=@medida_cuadriceps, medida_piena=@medida_piena,
                medida_pantorrilla=@medida_pantorrilla, medida_abdomen=@medida_abdomen, medida_antebrazo=@medida_antebrazo,
                medida_trapecios=@medida_trapecios, porcentaje_grasa=@porcentaje_grasa, mes=@mes, año=@año,
                porcentaje_musculo=@porcentaje_musculo, brazos=@brazos, espalda=@espalda, torax=@torax, imc=@imc
            WHERE id = @id
        `);
        res.json({ message: "Actualizado" });
    } catch (err) { res.status(500).send(err.message); }
});

// ELIMINAR AVANCE
app.delete('/api/FIT/eliminar_avance/:id', async (req, res) => {
    try {
        const request = poolflowershop.request();
        request.input('id', sql.Numeric, req.params.id);
        await request.query("DELETE FROM fit_clientes_avances WHERE id = @id");
        res.json({ message: "Eliminado" });
    } catch (err) { res.status(500).send(err.message); }
});


app.post('/api/FIT/guardar_avance', async (req, res) => {
    try {
        const d = req.body;
        const request = poolflowershop.request();

        // Identificadores y Tiempo (Numeric/Int)
        request.input('id_cle', sql.Int, d.id_cle);
        request.input('mes', sql.Numeric(18, 0), d.mes);
        request.input('año', sql.Numeric(18, 0), d.año);

        // Medidas Decimales (18, 2)
        // Usamos || 0 para evitar que valores vacíos rompan la consulta
        request.input('peso_kg', sql.Decimal(18, 2), d.peso_kg || 0);
        request.input('peso_lb', sql.Decimal(18, 2), d.peso_lb || 0);
        request.input('imc', sql.Decimal(18, 2), d.imc || 0);
        request.input('porcentaje_grasa', sql.Decimal(18, 2), d.porcentaje_grasa || 0);
        request.input('porcentaje_musculo', sql.Decimal(18, 2), d.porcentaje_musculo || 0);
        request.input('brazos', sql.Decimal(18, 2), d.brazos || 0);
        request.input('espalda', sql.Decimal(18, 2), d.espalda || 0);
        request.input('torax', sql.Decimal(18, 2), d.torax || 0);
        request.input('medida_bicep', sql.Decimal(18, 2), d.medida_bicep || 0);
        request.input('medida_tricep', sql.Decimal(18, 2), d.medida_tricep || 0);
        request.input('medida_pecho', sql.Decimal(18, 2), d.medida_pecho || 0);
        request.input('medida_hombro', sql.Decimal(18, 2), d.medida_hombro || 0);
        request.input('medida_gluteos', sql.Decimal(18, 2), d.medida_gluteos || 0);
        request.input('medida_femoral', sql.Decimal(18, 2), d.medida_femoral || 0);
        request.input('medida_cuadriceps', sql.Decimal(18, 2), d.medida_cuadriceps || 0);
        request.input('medida_piena', sql.Decimal(18, 2), d.medida_piena || 0);
        request.input('medida_pantorrilla', sql.Decimal(18, 2), d.medida_pantorrilla || 0);
        request.input('medida_abdomen', sql.Decimal(18, 2), d.medida_abdomen || 0);
        request.input('medida_antebrazo', sql.Decimal(18, 2), d.medida_antebrazo || 0);
        request.input('medida_trapecios', sql.Decimal(18, 2), d.medida_trapecios || 0);

        await request.query(`
            INSERT INTO fit_clientes_avances (
                id_cle, mes, año, peso_kg, peso_lb, imc, porcentaje_grasa, 
                porcentaje_musculo, brazos, espalda, torax, medida_bicep, 
                medida_tricep, medida_pecho, medida_hombro, medida_gluteos, 
                medida_femoral, medida_cuadriceps, medida_piena, 
                medida_pantorrilla, medida_abdomen, medida_antebrazo, medida_trapecios
            ) 
            VALUES (
                @id_cle, @mes, @año, @peso_kg, @peso_lb, @imc, @porcentaje_grasa, 
                @porcentaje_musculo, @brazos, @espalda, @torax, @medida_bicep, 
                @medida_tricep, @medida_pecho, @medida_hombro, @medida_gluteos, 
                @medida_femoral, @medida_cuadriceps, @medida_piena, 
                @medida_pantorrilla, @medida_abdomen, @medida_antebrazo, @medida_trapecios
            )
        `);

        res.json({ message: 'Avance guardado correctamente' });
    } catch (err) {
        console.error("Error en POST guardar_avance:", err);
        res.status(500).send(err.message);
    }
});



app.post('/api/FIT/guardar_avance', async (req, res) => {
    try {
        const d = req.body;
        const request = poolflowershop.request();

        // Identificadores
        request.input('id_cle', sql.Int, d.id_cle);
        request.input('mes', sql.Numeric(18, 0), d.mes);
        request.input('año', sql.Numeric(18, 0), d.año);

        // Medidas y Pesos
        request.input('peso_kg', sql.Decimal(18, 2), d.peso_kg || 0);
        request.input('peso_lb', sql.Decimal(18, 2), d.peso_lb || 0);
        request.input('imc', sql.Decimal(18, 2), d.imc || 0);
        request.input('porcentaje_grasa', sql.Decimal(18, 2), d.porcentaje_grasa || 0);
        request.input('porcentaje_musculo', sql.Decimal(18, 2), d.porcentaje_musculo || 0);
        
        // Tren Superior
        request.input('brazos', sql.Decimal(18, 2), d.brazos || 0);
        request.input('medida_bicep', sql.Decimal(18, 2), d.medida_bicep || 0);
        request.input('medida_tricep', sql.Decimal(18, 2), d.medida_tricep || 0);
        request.input('medida_pecho', sql.Decimal(18, 2), d.medida_pecho || 0);
        request.input('medida_hombro', sql.Decimal(18, 2), d.medida_hombro || 0);
        request.input('espalda', sql.Decimal(18, 2), d.espalda || 0);
        request.input('torax', sql.Decimal(18, 2), d.torax || 0);
        request.input('medida_trapecios', sql.Decimal(18, 2), d.medida_trapecios || 0);
        request.input('medida_antebrazo', sql.Decimal(18, 2), d.medida_antebrazo || 0);

        // Tronco y Tren Inferior
        request.input('medida_abdomen', sql.Decimal(18, 2), d.medida_abdomen || 0);
        request.input('medida_gluteos', sql.Decimal(18, 2), d.medida_gluteos || 0);
        request.input('medida_femoral', sql.Decimal(18, 2), d.medida_femoral || 0);
        request.input('medida_cuadriceps', sql.Decimal(18, 2), d.medida_cuadriceps || 0);
        request.input('medida_piena', sql.Decimal(18, 2), d.medida_piena || 0);
        request.input('medida_pantorrilla', sql.Decimal(18, 2), d.medida_pantorrilla || 0);

        await request.query(`
            INSERT INTO fit_clientes_avances (
                id_cle, peso_kg, peso_lb, medida_bicep, medida_tricep, medida_pecho, 
                medida_hombro, medida_gluteos, medida_femoral, medida_cuadriceps, 
                medida_piena, medida_pantorrilla, medida_abdomen, medida_antebrazo, 
                medida_trapecios, porcentaje_grasa, mes, año, porcentaje_musculo, 
                brazos, espalda, torax, imc
            ) VALUES (
                @id_cle, @peso_kg, @peso_lb, @medida_bicep, @medida_tricep, @medida_pecho, 
                @medida_hombro, @medida_gluteos, @medida_femoral, @medida_cuadriceps, 
                @medida_piena, @medida_pantorrilla, @medida_abdomen, @medida_antebrazo, 
                @medida_trapecios, @porcentaje_grasa, @mes, @año, @porcentaje_musculo, 
                @brazos, @espalda, @torax, @imc
            )
        `);

        res.json({ message: "Avance guardado con éxito" });
    } catch (err) {
        console.error("Error al guardar:", err);
        res.status(500).send(err.message);
    }
});


// 1. CREAR ARTÍCULO
app.post('/api/FIT/crear_articulo', async (req, res) => {
    try {
        const { nombre_art, unidad_medida, precio_compra, precio_venta } = req.body;
        const request = poolflowershop.request();
        
        await request
            .input('descripcion', nombre_art)
            .input('unidad', unidad_medida || 'u')
            .input('p_compra', precio_compra || 0)
            .input('p_venta', precio_venta || 0)
            .query(`
                INSERT INTO fit_articulos (descripción, unidad_medida, precio_compra, precio_venta)
                VALUES (@descripcion, @unidad, @p_compra, @p_venta)
            `);
        
        res.json({ message: "Artículo creado con éxito" });
    } catch (err) {
        console.error("Error al crear artículo:", err.message);
        res.status(500).send("Error del servidor");
    }
});

// 2. EDITAR ARTÍCULO
app.put('/api/FIT/editar_articulo/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_art, unidad_medida, precio_compra, precio_venta } = req.body;
        const request = poolflowershop.request();

        await request
            .input('id', id)
            .input('descripcion', nombre_art)
            .input('unidad', unidad_medida)
            .input('p_compra', precio_compra)
            .input('p_venta', precio_venta)
            .query(`
                UPDATE fit_articulos 
                SET descripción = @descripcion, 
                    unidad_medida = @unidad, 
                    precio_compra = @p_compra, 
                    precio_venta = @p_venta
                WHERE id_art = @id
            `);

        res.json({ message: "Artículo actualizado" });
    } catch (err) {
        console.error("Error al editar artículo:", err.message);
        res.status(500).send("Error del servidor");
    }
});

// 3. ELIMINAR ARTÍCULO
app.delete('/api/FIT/eliminar_articulo/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const request = poolflowershop.request();

        await request
            .input('id', id)
            .query('DELETE FROM fit_articulos WHERE id_art = @id');

        res.json({ message: "Artículo eliminado" });
    } catch (err) {
        console.error("Error al eliminar artículo:", err.message);
        res.status(500).send("Error al eliminar: Es posible que el artículo esté en uso en facturas.");
    }
});



// GUARDAR O EDITAR CLIENTE
app.post('/api/FIT/registrarcliente', async (req, res) => {
    try {
        const { id_cle, nombres, apellidos, fecha_nacimiento, direccion, telefono, mail, genero,estado_cle,fecha_desde,fecha_hasta} = req.body;
        const request = poolflowershop.request();
        
        request
            .input('nombres', nombres)
            .input('apellidos', apellidos)
            .input('f_d', fecha_desde || null)
            .input('f_h', fecha_hasta || null)
            .input('f_nac', fecha_nacimiento || null)
            .input('dir', direccion || '')
            .input('tel', telefono || '')
            .input('mail', mail || '')
            .input('estado', sql.Int, estado_cle || 0)
            .input('gen', genero || '');
            

        if (id_cle) {
            // EDITAR
            await request.input('id', id_cle).query(`
                UPDATE fit_clientes SET Nombres=@nombres, Apellidos=@apellidos, 
                fecha_nacimiento=@f_nac, direccion=@dir, telefono=@tel, mail=@mail, genero=@gen,estado_cle=@estado, fecha_desde=@f_d,fecha_hasta=@f_h
                WHERE id_cle=@id
            `);
        } else {
            // CREAR
            await request.query(`
                INSERT INTO fit_clientes (Nombres, Apellidos, fecha_nacimiento, fecha_computador, direccion, telefono, mail, genero,estado_cle,fecha_desde,fecha_hasta)
                VALUES (@nombres, @apellidos, @f_nac, GETDATE(), @dir, @tel, @mail, @gen,@estado,@f_d,@f_h)
            `);
        }
        res.json({ ok: true });
    } catch (err) { res.status(500).send(err.message); }
});

// ELIMINAR CLIENTE
app.delete('/api/FIT/eliminar_cliente/:id', async (req, res) => {
    try {
        await poolflowershop.request()
            .input('id', req.params.id)
            .query('DELETE FROM fit_clientes WHERE id_cle = @id');
        res.json({ ok: true });
    } catch (err) { res.status(500).send("No se puede eliminar: el cliente tiene historial de pagos."); }
});



// para buscar clientes fit
app.get('/api/FIT/clientesfit', async (req, res) => {
    try {
        // 1. ELIMINADO: let pool = await sql.connect(config); 
        
        // 2. USAMOS EL POOL LOCAL QUE YA ESTÁ CONECTADO (poolflowershop)
        const request = poolflowershop.request();

        let result = await request.query(`
            SELECT 
                id_cle, Nombres nombres, Apellidos apellidos, 
                Edad edad, fecha_nacimiento, 
                direccion, mail, telefono  , altura
            FROM fit_clientes
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error en consulta Clientes FIT:", err.message);
        res.status(500).send("Error al obtener Clientes fit: " + err.message);
    }
});
///REPORTES GYM

app.post('/api/RRHH/reporte_ventas_articulos_general', async (req, res) => {
    try {
        // Recibimos un arreglo de números desde el frontend
        const { id_articulos } = req.body;

        const request = poolflowershop.request();

        // 1. Añadimos la columna p.cantidad para que el frontend pueda sumarla en el PDF
        let query = `
                 SELECT 
                a.id_art,
                a.descripción AS descripcion,
                (c.nombres + ' ' + c.apellidos) AS cliente,
                p.precio_venta, 
                p.valor_pago,   
                p.valor_deuda    
            FROM fit_clientes_pagos p with(nolock)
            INNER JOIN fit_articulos a ON p.articulo = a.id_art
            INNER JOIN fit_clientes c ON p.id_cle = c.id_cle 
            WHERE p.articulo IS NOT NULL
            
            
        `;

        // Si se reciben artículos específicos y el arreglo no contiene "TODOS", filtramos con IN
        if (id_articulos && id_articulos.length > 0 && !id_articulos.includes('TODOS')) {
            const params = [];
            id_articulos.forEach((id, index) => {
                const paramName = `id_${index}`;
                request.input(paramName, sql.Int, id);
                params.push(`@${paramName}`);
            });
            
            query += ` AND a.id_art IN (${params.join(', ')}) `;
        }

        // 2. CORRECCIÓN: Eliminamos el GROUP BY que rompía la consulta y ordenamos por cliente/fecha
        query += `
            ORDER BY c.nombres ASC, a.descripción DESC;
        `;

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: "No se registran transacciones para los artículos seleccionados." 
            });
        }

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (err) {
        console.error("❌ Error al obtener reporte múltiple de artículos:", err.message);
        res.status(500).json({ 
            success: false, 
            error: "Error interno en el servidor: " + err.message 
        });
    }
});



app.post('/api/RRHH/reporte_ventas_mensual', async (req, res) => {
    try {
        // Recibimos un arreglo de números desde el frontend
        const { id_articulos } = req.body;

        const request = poolflowershop.request();

        // 1. Consulta estructurada para agrupar totales por mes (Mayúsculas y en Español)
        let query = `
            SELECT 
                UPPER(FORMAT(p.fecha_pago, 'MMMM yyyy', 'es-ES')) AS mes,
                SUM(p.precio_venta) AS precio_venta, 
                SUM(p.valor_descuento) AS valor_descuento, 
                SUM(p.valor_pago) AS valor_pago,   
                SUM(p.valor_deuda) AS valor_deuda    
            FROM fit_clientes_pagos p with(nolock)
            INNER JOIN fit_articulos a ON p.articulo = a.id_art
            INNER JOIN fit_clientes c ON p.id_cle = c.id_cle 
            WHERE p.articulo IS NOT NULL
        `;

        // Si se reciben artículos específicos y el arreglo no contiene "TODOS", filtramos con IN
        if (id_articulos && id_articulos.length > 0 && !id_articulos.includes('TODOS')) {
            const params = [];
            id_articulos.forEach((id, index) => {
                const paramName = `id_${index}`;
                request.input(paramName, sql.Int, id);
                params.push(`@${paramName}`);
            });
            
            query += ` AND a.id_art IN (${params.join(', ')}) `;
        }

        // 2. Agrupación por formato de texto y ordenación cronológica descendente (De más reciente a más antiguo)
        query += `
            GROUP BY FORMAT(p.fecha_pago, 'MMMM yyyy', 'es-ES'), FORMAT(p.fecha_pago, 'yyyy-MM')
            ORDER BY FORMAT(p.fecha_pago, 'yyyy-MM') DESC;
        `;

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: "No se registran transacciones para los artículos seleccionados." 
            });
        }

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (err) {
        console.error("❌ Error al obtener reporte mensual de artículos:", err.message);
        res.status(500).json({ 
            success: false, 
            error: "Error interno en el servidor: " + err.message 
        });
    }
});



/////////////FIN GYM/////////////////////////////////////

// para buscar usuario
app.get('/api/SISTEMA/usuario_web', async (req, res) => {
    try {
        // Extraemos los datos de la query o el body (ajusta según cómo los envíes)
        const { nombre_usu, clave } = req.query; 

        const request = poolflowershop.request();

        // 1. Definimos los parámetros de entrada
        request.input('nombre_usu', nombre_usu);
        request.input('clave', clave);

        // 2. Usamos la sintaxis @nombre para SQL Server
        let result = await request.query(`
            SELECT *
            FROM usuario_web 
           
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error en consulta usuario:", err.message);
        res.status(500).send("Error al obtener usuario: " + err.message);
    }
});
//Para el login
app.get('/api/SISTEMA/usuario', async (req, res) => {
    try {
        const { nombre_usu, clave } = req.query;
        console.log("Intentando login para:", nombre_usu); // DEBUG

        const request = poolflowershop.request();
        request.input('nombre_usu', nombre_usu);
        request.input('clave', clave);

        let result = await request.query(`
            SELECT id, nombre_usu, idperfil, clave, nombre, id_empresa, departamento
            FROM usuario_web  with(nolock)
            WHERE nombre_usu = @nombre_usu AND clave = @clave
        `);

        if (result.recordset.length === 0) {
            console.log("⚠️ No se encontró el usuario en la DB");
            return res.json([]); // Retorna array vacío si no hay coincidencia
        }

        // PROCESAMIENTO SEGURO DE ARRAYS
        const usuariosProcesados = result.recordset.map(user => {
            return {
                ...user,
                // Convertimos a string primero por si en la DB aún es un número
                id_empresa: user.id_empresa 
                    ? String(user.id_empresa).split(',').map(n => n.trim()).map(Number) 
                    : [0],
                
                departamento: user.departamento 
                    ? String(user.departamento).split(',').map(d => d.trim()) 
                    : ['TODOS']
            };
        });

        console.log("✅ Usuario encontrado y procesado:", usuariosProcesados[0]);
        res.json(usuariosProcesados);

    } catch (err) {
        console.error("❌ Error en el servidor:", err.message);
        res.status(500).send("Error: " + err.message);
    }
});





//CREAR USUARIOS WEB
app.post('/api/SISTEMA/usuario_web', async (req, res) => {
    try {
        // Añadimos los nuevos campos a la desestructuración
        const { nombre_usu, idperfil, clave, nombre, id_empresa, departamento } = req.body;
        const request = poolflowershop.request();

        await request
            .input('nombre_usu', sql.VarChar, nombre_usu)
            .input('idperfil', sql.Int, idperfil)
            .input('clave', sql.VarChar, clave)
            .input('nombre', sql.VarChar, nombre)
            // Agregamos los inputs para la DB (se guardan como VarChar para soportar "5,12")
            .input('id_empresa', sql.VarChar, id_empresa) 
            .input('departamento', sql.VarChar, departamento)
            .query(`
                INSERT INTO usuario_web (nombre_usu, idperfil, clave, nombre, id_empresa, departamento)
                VALUES (@nombre_usu, @idperfil, @clave, @nombre, @id_empresa, @departamento)
            `);

        res.status(201).json({ message: "Usuario creado con éxito" });
    } catch (err) {
        console.error("❌ Error al insertar usuario:", err.message);
        res.status(500).json({ error: "Error en el servidor al crear usuario" });
    }
});



// para buscar perfiles
app.get('/api/SISTEMA/perfiles', async (req, res) => {
    try {
        // Extraemos los datos de la query o el body (ajusta según cómo los envíes)
        const { } = req.query; 

        const request = poolflowershop.request();

        
        // 2. Usamos la sintaxis @nombre para SQL Server
        let result = await request.query(`
            SELECT *
            FROM perfil_web 
           
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error en consulta perfiles:", err.message);
        res.status(500).send("Error al obtener perfiles: " + err.message);
    }
});

//Para Editar perfiles
app.put('/api/SISTEMA/perfiles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body; // Suponiendo que el campo principal se llama 'nombre'
        const request = poolflowershop.request();

        // 1. Mapear las variables del body al input de SQL
        await request
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, nombre)
            .query(`
                UPDATE perfil_web 
                SET nombre = @nombre
                WHERE id = @id
            `);

        res.json({ message: "Perfil actualizado con éxito" });
    } catch (err) {
        console.error("❌ Error al actualizar perfil:", err.message);
        res.status(500).json({ error: "Error en el servidor al actualizar el perfil" });
    }
});
//Para crear perfiles
app.post('/api/SISTEMA/perfiles', async (req, res) => {
    try {
        const { nombre } = req.body;
        const request = poolflowershop.request();

        await request
            .input('nombre', sql.VarChar, nombre)
            .query(`
                INSERT INTO perfil_web (nombre)
                VALUES (@nombre)
            `);

        res.status(201).json({ message: "Perfil creado con éxito" });
    } catch (err) {
        console.error("❌ Error al crear perfil:", err.message);
        res.status(500).json({ error: "Error en el servidor al crear el perfil" });
    }
});



// --- API LAVANDERIA (FILTRO POR RANGO DE FECHAS) ---

app.get('/api/REPORTES/rep_lavanderia', async (req, res) => {
    try {
        const { inicio, fin } = req.query;
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;

        // 1. USAMOS EL POOL PERSISTENTE (Quitamos new Connection y tedious)
        const request = poolbiometrico.request();

        // 2. Agregamos parámetros de forma segura con mssql
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);

        // 3. Ejecutamos la consulta con async/await
        const result = await request.query(`
            SELECT 
                CAST(emp_code AS INT) AS emp_code, 
                office_tel AS identificacion,
                (last_name + ' ' + first_name) AS empleado,
                dept_name AS departamento,
                CONVERT(VARCHAR, punch_time, 23) AS fecha,
                REPLACE(LEFT(CAST(punch_time AS TIME), 8), ':', '') AS hora,
                LEFT(CAST(punch_time AS TIME), 8) AS horaformat
            FROM (
                SELECT 
                    trn.emp_code, 
                    MIN(punch_time) AS punch_time, 
                    emp.first_name, 
                    emp.last_name, 
                    emp.office_tel, 
                    dep.dept_name
                FROM iclock_transaction trn with(nolock)
                INNER JOIN personnel_employee emp ON trn.emp_code = emp.emp_code
                INNER JOIN personnel_department dep ON emp.department_id = dep.dept_code
                WHERE trn.terminal_sn IN ('JUC5243200040')
                AND CAST(trn.punch_time AS DATE) BETWEEN @inicio AND @fin
                GROUP BY 
                    trn.emp_code, 
                    emp.first_name, 
                    emp.last_name, 
                    emp.office_tel, 
                    dep.dept_name, 
                    CAST(trn.punch_time AS DATE)
            ) AS min_ 
            ORDER BY fecha DESC, hora DESC
        `);

        // 4. Enviamos el recordset directamente
        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte Lavandería:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});



app.get('/api/REPORTES/rep_marcacion', async (req, res) => {
    try {
        const { inicio, fin } = req.query;
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;

        // 1. USAMOS EL POOL PERSISTENTE (Quitamos new Connection y tedious)
        const request = poolbiometrico.request();

        // 2. Agregamos parámetros de forma segura con mssql
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);

        // 3. Ejecutamos la consulta con async/await
        const result = await request.query(`
            SELECT 
                CAST(trn.emp_code AS INT) AS emp_code, 
            (emp.last_name + ' ' + emp.first_name) AS empleado,
            dep.dept_name AS departamento,
            CONVERT(VARCHAR, trn.punch_time, 23) AS fecha,
            REPLACE(LEFT(CAST(trn.punch_time AS TIME), 8), ':', '') AS hora,
            LEFT(CAST(trn.punch_time AS TIME), 8) AS horaformat
            FROM iclock_transaction trn with(nolock)
            INNER JOIN personnel_employee emp ON trn.emp_code = emp.emp_code
            INNER JOIN personnel_department dep ON emp.department_id = dep.dept_code
            WHERE CAST(trn.punch_time AS DATE) BETWEEN @inicio AND @fin
            order by (emp.last_name + ' ' + emp.first_name) 
        `);

        // 4. Enviamos el recordset directamente
        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte Marcación:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});

//Data timbres

app.get('/api/REPORTES/timbres', async (req, res) => { 
 try { 
   const { inicio, fin } = req.query; 
   const hoy = new Date().toISOString().split('T')[0]; 
   const fechaInicio = inicio || hoy; 
   const fechaFin = fin || hoy; 

   // 1. USAMOS EL POOL PERSISTENTE
   const request = poolbiometrico.request(); 

   // 2. Agregamos parámetros de forma segura con mssql 
   request.input('inicio', sql.Date, fechaInicio); 
   request.input('fin', sql.Date, fechaFin); 

   // 3. Ejecutamos la consulta optimizada con async/await 
   const result = await request.query(` 
     SELECT 
       CAST(trn.emp_code AS INT) AS emp_code, 
       emp.office_tel,
       (emp.last_name + ' ' + emp.first_name) AS empleado, 
       dep.dept_name AS departamento, 
       CONVERT(VARCHAR, trn.punch_time, 23) AS fecha, 
       LEFT(CAST(MIN(trn.punch_time) AS TIME), 8) AS primera_horaformat, 
       LEFT(CAST(MAX(trn.punch_time) AS TIME), 8) AS ultima_horaformat 
     FROM iclock_transaction trn WITH(NOLOCK) 
     INNER JOIN personnel_employee emp ON trn.emp_code = emp.emp_code 
     INNER JOIN personnel_department dep ON emp.department_id = dep.dept_code 
     
     -- OPTIMIZACIÓN CRÍTICA: Buscamos en el rango de tiempo de forma nativa.
     -- Tomamos desde las 00:00:00 del día de inicio hasta las 23:59:59 del día de fin.
     WHERE trn.punch_time >= CAST(@inicio AS DATETIME) 
       AND trn.punch_time <= DATEADD(second, -1, DATEADD(day, 1, CAST(@fin AS DATETIME))) 
 
     GROUP BY 
       trn.emp_code, 
       emp.office_tel,
       emp.last_name, 
       emp.first_name, 
       dep.dept_name, 
       CONVERT(VARCHAR, trn.punch_time, 23) -- Agrupamos por la fecha limpia en formato texto
   `); 

   // 4. Enviamos el recordset directamente 
   console.log("Marcajes de timbres recuperados exitosamente:", result.recordset.length);
   res.json(result.recordset); 
 } catch (err) { 
   console.error("Error en Reporte Marcación:", err.message); 
   res.status(500).json({ error: "Error en el servidor: " + err.message }); 
 } 
});


// ====================================================================
// CONFIGURACIÓN DE RUTAS EN EL BACK-END (server.js)
// ====================================================================


app.get('/api/REPORTES/ztecoonline_veronline/:sn', async (req, res) => {
    try {
        // Captura el parámetro obligatorio :sn directamente desde la URL
        const { sn } = req.params;
        
        const request = poolbiometrico.request();
        request.input('serialNumber', sn);

        const result = await request.query(`
            SELECT 
                sn AS numeroSerie, 
                alias AS nombreDispositivo, 
                last_activity AS ultimaActividad,
                CASE 
                    WHEN state = 1 
                        AND CAST(last_activity AS DATE) = CAST(GETDATE() AS DATE) 
                        THEN 'En Línea'
                    ELSE 'Desconectado'
                END AS estadoReal
            FROM iclock_terminal
            WHERE sn = @serialNumber;
        `);

        if (!result.recordset || result.recordset.length === 0) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(404).json({ error: "Dispositivo no encontrado" });
        }

        // Retorna el objeto encontrado al frontend
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(result.recordset[0]);

    } catch (err) {
        console.error("❌ Error en Reporte ZKTeco Online:", err.message);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Error interno en el servidor" });
    }
});


app.get('/api/REPORTES/ztecoonline_veronlinevarios/:sn', async (req, res) => {
    try {
        // 1. Captura el string de seriales y lo convierte en un Array
        const { sn } = req.params;
        const serialesArray = sn.split(',');

        const request = poolbiometrico.request();

        // 2. Declaramos dinámicamente cada serial en la consulta para evitar SQL Injection
        const parametrosSQL = [];
        serialesArray.forEach((serial, index) => {
            const nombreParametro = `sn_${index}`;
            request.input(nombreParametro, serial.trim());
            parametrosSQL.push(`@${nombreParametro}`);
        });

        // Si no se enviaron seriales válidos, retornamos error rápido
        if (parametrosSQL.length === 0) {
            return res.status(400).json({ error: "No se proporcionaron seriales válidos" });
        }

        // 3. Modificamos el WHERE para usar IN (@sn_0, @sn_1, ...)
        const result = await request.query(`
            SELECT 
                sn AS numeroSerie, 
                alias AS nombreDispositivo, 
                last_activity AS ultimaActividad,
                CASE 
                    WHEN state = 1 
                        AND CAST(last_activity AS DATE) = CAST(GETDATE() AS DATE) 
                        THEN 'En Línea'
                    ELSE 'Desconectado'
                END AS estadoReal
            FROM iclock_terminal
            WHERE sn IN (${parametrosSQL.join(', ')});
        `);

        if (!result.recordset || result.recordset.length === 0) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(404).json({ error: "Dispositivos no encontrados" });
        }

        // 4. Retorna TODO el arreglo de dispositivos encontrados en lugar de solo el primero [0]
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte ZKTeco Online Varios:", err.message);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Error interno en el servidor" });
    }
});



// 1. Agregamos el signo "?" a :sn? para que la ruta funcione con o sin serial
app.get('/api/REPORTES/ztecoonline_lavanderia', async (req, res) => {
    try {
        const request = poolbiometrico.request();

        // Consulta SQL con el serial quemado directamente en el WHERE
        const result = await request.query(`
            SELECT 
                sn AS numeroSerie, 
                alias AS nombreDispositivo, 
                last_activity AS ultimaActividad,
                CASE 
                    WHEN state = 1 
                        AND CAST(last_activity AS DATE) = CAST(GETDATE() AS DATE) 
                        THEN 'En Línea'
                    ELSE 'Desconectado'
                END AS estadoReal
            FROM iclock_terminal
            WHERE sn = 'JUC5243200047';
        `);

        // Validación estricta para asegurar que result.recordset traiga información
        if (!result.recordset || result.recordset.length === 0) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(404).json({ error: "Dispositivo no encontrado" });
        }

        // Extraemos explícitamente el primer objeto para que no viaje como una lista (Array)
        const dispositivoEncontrado = result.recordset[0];

        // Forzamos las cabeceras a JSON puro antes de responder con código 200 OK
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(dispositivoEncontrado);

    } catch (err) {
        console.error("❌ Error en Reporte ZKTeco Online:", err.message);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Error interno en el servidor" });
    }
});



// --- API LAPTARIO (FILTRO POR RANGO DE FECHAS) ---

app.get('/api/REPORTES/rep_laptario', async (req, res) => {
    try {
        const { inicio, fin } = req.query;
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;

        // 1. USAMOS EL POOL PERSISTENTE (Eliminamos new Connection y tedious)
        const request = poolbiometrico.request();

        // 2. Parámetros seguros
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);

        // 3. Ejecución con async/await
        const result = await request.query(`
            SELECT 
                        emp_code,
                        identificacion,
                        empleado,
                        departamento,
                        fecha,
                        -- Timbraje 1
                        MAX(CASE WHEN nro_timbraje = 1 THEN horaformat END) AS Tim_1_IN,
                        CASE 
                            WHEN MAX(CASE WHEN nro_timbraje = 1 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN nro_timbraje = 2 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN nro_timbraje = 2 THEN horaformat END) 
                        END AS Tim_1_FN,
                        
                        -- Timbraje 2
                        MAX(CASE WHEN nro_timbraje = 3 THEN horaformat END) AS Tim_2_IN,
                        CASE 
                            WHEN MAX(CASE WHEN nro_timbraje = 3 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN nro_timbraje = 4 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN nro_timbraje = 4 THEN horaformat END) 
                        END AS Tim_2_FN,
                        
                        -- Timbraje 3
                        MAX(CASE WHEN nro_timbraje = 5 THEN horaformat END) AS Tim_3_IN,
                        CASE 
                            WHEN MAX(CASE WHEN nro_timbraje = 5 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN nro_timbraje = 6 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN nro_timbraje = 6 THEN horaformat END) 
                        END AS Tim_3_FN,
                        
                        -- Timbraje 4
                        MAX(CASE WHEN nro_timbraje = 7 THEN horaformat END) AS Tim_4_IN,
                        CASE 
                            WHEN MAX(CASE WHEN nro_timbraje = 7 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN nro_timbraje = 8 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN nro_timbraje = 8 THEN horaformat END) 
                        END AS Tim_4_FN,
                        
                        -- Timbraje 5
                        MAX(CASE WHEN nro_timbraje = 9 THEN horaformat END) AS Tim_5_IN,
                        CASE 
                            WHEN MAX(CASE WHEN nro_timbraje = 9 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN nro_timbraje = 10 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN nro_timbraje = 10 THEN horaformat END) 
                        END AS Tim_5_FN,

                         -- Timbraje 6
                        MAX(CASE WHEN nro_timbraje = 11 THEN horaformat END) AS Tim_6_IN,
                        CASE 
                            WHEN MAX(CASE WHEN nro_timbraje = 11 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN nro_timbraje = 12 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN nro_timbraje = 12 THEN horaformat END) 
                        END AS Tim_6_FN


                    FROM (
                        SELECT 
                            CAST(trn.emp_code AS INT) AS emp_code,
                            emp.office_tel AS identificacion,
                            (emp.last_name + ' ' + emp.first_name) AS empleado,
                            dep.dept_name AS departamento,
                            CONVERT(VARCHAR, trn.punch_time, 23) AS fecha,
                            LEFT(CAST(trn.punch_time AS TIME), 8) AS horaformat,
                            ROW_NUMBER() OVER (
                                PARTITION BY trn.emp_code, CAST(trn.punch_time AS DATE) 
                                ORDER BY trn.punch_time ASC
                            ) AS nro_timbraje
                        FROM iclock_transaction trn with(nolock)
                        INNER JOIN personnel_employee emp ON trn.emp_code = emp.emp_code
                        INNER JOIN personnel_department dep ON emp.department_id = dep.dept_code
                        WHERE trn.terminal_sn IN ('JUC5243200047') --LACTARIO
                       -- WHERE trn.terminal_sn IN ('QJT3253300018') --COMEDOR B6

                        
                       AND CAST(trn.punch_time AS DATE) BETWEEN CAST(@inicio AS DATE) AND CAST(@fin AS DATE)

                        AND trn.emp_code <> '3024'
                    ) AS subquery
                    GROUP BY emp_code, identificacion, empleado, departamento, fecha
                    ORDER BY empleado ASC, fecha ASC;
               
        `);

        // 4. Retornamos el recordset directamente
        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte Lactario:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


//Aui despleiga los 5 relojes

app.get('/api/REPORTES/rep_comedor_biometrico', async (req, res) => {
    try {
        const { inicio, fin } = req.query;
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;

        // 1. USAMOS EL POOL PERSISTENTE (Eliminamos new Connection y tedious)
        const request = poolbiometrico.request();

        // 2. Parámetros seguros
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);

        // 3. Ejecución con async/await
        const result = await request.query(`
            SELECT 
                        -- Muestra el nombre del comedor principal del registro
                        MAX(CASE 
                            WHEN terminal_sn = 'QJT3253300005' THEN 'CMD OAS'
                            WHEN terminal_sn = 'QJT3253300007' THEN 'CMD EXP'
                            WHEN terminal_sn = 'QJT3253300016' THEN 'CMD AMZ'
                            WHEN terminal_sn = 'QJT3253300018' THEN 'CMD B6'
                            ELSE terminal_sn 
                        END) AS comedor,
                        emp_code,
                        identificacion,
                        empleado,
                        departamento,
                        fecha,
                        
                        -- =========================================================================
                        -- COMEDOR OASIS (QJT3253300005)
                        -- =========================================================================
                        MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 1 THEN horaformat END) AS Tim_1_IN_OASIS,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 1 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 2 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 2 THEN horaformat END) 
                        END AS Tim_1_FN_OASIS,
                        MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 3 THEN horaformat END) AS Tim_2_IN_OASIS,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 3 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 4 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 4 THEN horaformat END) 
                        END AS Tim_2_FN_OASIS,
                        MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 5 THEN horaformat END) AS Tim_3_IN_OASIS,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 5 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 6 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300005' AND nro_timbraje = 6 THEN horaformat END) 
                        END AS Tim_3_FN_OASIS,

                        -- =========================================================================
                        -- COMEDOR EXPO (QJT3253300007)
                        -- =========================================================================
                        MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 1 THEN horaformat END) AS Tim_1_IN_EXPO,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 1 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 2 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 2 THEN horaformat END) 
                        END AS Tim_1_FN_EXPO,
                        MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 3 THEN horaformat END) AS Tim_2_IN_EXPO,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 3 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 4 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 4 THEN horaformat END) 
                        END AS Tim_2_FN_EXPO,
                        MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 5 THEN horaformat END) AS Tim_3_IN_EXPO,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 5 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 6 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300007' AND nro_timbraje = 6 THEN horaformat END) 
                        END AS Tim_3_FN_EXPO,

                        -- =========================================================================
                        -- COMEDOR AMAZING (QJT3253300016)
                        -- =========================================================================
                        MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 1 THEN horaformat END) AS Tim_1_IN_AMAZING,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 1 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 2 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 2 THEN horaformat END) 
                        END AS Tim_1_FN_AMAZING,
                        MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 3 THEN horaformat END) AS Tim_2_IN_AMAZING,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 3 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 4 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 4 THEN horaformat END) 
                        END AS Tim_2_FN_AMAZING,
                        MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 5 THEN horaformat END) AS Tim_3_IN_AMAZING,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 5 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 6 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300016' AND nro_timbraje = 6 THEN horaformat END) 
                        END AS Tim_3_FN_AMAZING,

                        -- =========================================================================
                        -- COMEDOR B6 (QJT3253300018)
                        -- =========================================================================
                        MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 1 THEN horaformat END) AS Tim_1_IN_B6,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 1 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 2 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 2 THEN horaformat END) 
                        END AS Tim_1_FN_B6,
                        MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 3 THEN horaformat END) AS Tim_2_IN_B6,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 3 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 4 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 4 THEN horaformat END) 
                        END AS Tim_2_FN_B6,
                        MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 5 THEN horaformat END) AS Tim_3_IN_B6,
                        CASE 
                            WHEN MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 5 THEN horaformat END) IS NOT NULL 
                                AND MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 6 THEN horaformat END) IS NULL THEN 'no timbra' 
                            ELSE MAX(CASE WHEN terminal_sn = 'QJT3253300018' AND nro_timbraje = 6 THEN horaformat END) 
                        END AS Tim_3_FN_B6

                    FROM (
                        SELECT 
                            CAST(trn.emp_code AS INT) AS emp_code,
                            emp.office_tel AS identificacion,
                            (emp.last_name + ' ' + emp.first_name) AS empleado,
                            dep.dept_name AS departamento,
                            CONVERT(VARCHAR, trn.punch_time, 23) AS fecha,
                            LEFT(CAST(trn.punch_time AS TIME), 8) AS horaformat,
                            trn.terminal_sn,
                            ROW_NUMBER() OVER (
                                PARTITION BY trn.emp_code, CAST(trn.punch_time AS DATE), trn.terminal_sn 
                                ORDER BY trn.punch_time ASC
                            ) AS nro_timbraje

                        FROM iclock_transaction trn WITH(NOLOCK)
                        INNER JOIN personnel_employee emp ON trn.emp_code = emp.emp_code
                        INNER JOIN personnel_department dep ON emp.department_id = dep.dept_code
                        WHERE trn.terminal_sn IN ('QJT3253300005', 'QJT3253300007', 'QJT3253300016', 'QJT3253300018')
                        -- Mantiene el rango de fechas dinámico solicitado
                        AND CAST(trn.punch_time AS DATE) >= CAST(@inicio AS DATE)
                        AND CAST(trn.punch_time AS DATE) <= CAST(@fin AS DATE)


                    ) AS subquery
                    GROUP BY 
                        emp_code, 
                        identificacion, 
                        empleado, 
                        departamento, 
                        fecha
                    ORDER BY 
                        empleado ASC, 
                        fecha ASC;
        `);

        // 4. Retornamos el recordset directamente
        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte Lactario:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


app.get('/api/REPORTES/ztecoonline', async (req, res) => {
    try {
        const request = poolbiometrico.request();

        // Usamos la misma lógica exacta que te funcionó en el gestor SQL
        const result = await request.query(`
            SELECT 
                sn AS numeroSerie, 
                alias AS nombreDispositivo, 
                last_activity AS ultimaActividad,
                CASE 
                    WHEN state = 1 AND CAST(last_activity AS DATE) = CAST(GETDATE() AS DATE) THEN 'En Línea'
                    ELSE 'Desconectado'
                END AS estadoReal
            FROM iclock_terminal;
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte ZKTeco Online:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});







app.get('/api/REPORTES/rep_laptario_ant', async (req, res) => {
    try {
        const { inicio, fin } = req.query;
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;

        // 1. USAMOS EL POOL PERSISTENTE (Eliminamos new Connection y tedious)
        const request = poolbiometrico.request();

        // 2. Parámetros seguros
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);

        // 3. Ejecución con async/await
        const result = await request.query(`
            SELECT 
                CAST(emp_code AS INT) AS emp_code, 
                office_tel AS identificacion,
                (last_name + ' ' + first_name) AS empleado,
                dept_name AS departamento,
                CONVERT(VARCHAR, punch_time, 23) AS fecha,
                REPLACE(LEFT(CAST(punch_time AS TIME), 8), ':', '') AS hora,
                LEFT(CAST(punch_time AS TIME), 8) AS horaformat
            FROM (
                SELECT 
                    trn.emp_code, 
                    MIN(punch_time) AS punch_time, 
                    emp.first_name, 
                    emp.last_name, 
                    emp.office_tel, 
                    dep.dept_name
                FROM iclock_transaction trn with(nolock)
                INNER JOIN personnel_employee emp ON trn.emp_code = emp.emp_code
                INNER JOIN personnel_department dep ON emp.department_id = dep.dept_code
                WHERE trn.terminal_sn IN ('JUC5243200047')
                AND CAST(trn.punch_time AS DATE) BETWEEN @inicio AND @fin
                AND emp.emp_code <> '3024'
                GROUP BY 
                    trn.emp_code, 
                    emp.first_name, 
                    emp.last_name, 
                    emp.office_tel, 
                    dep.dept_name, 
                    CAST(trn.punch_time AS DATE)
            ) AS min_ 
            ORDER BY fecha DESC, hora DESC
        `);

        // 4. Retornamos el recordset directamente
        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte Lactario:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});




app.get('/api/REPORTES/rep_alm_mer_fact', async (req, res) => {
    try {
        // 1. Capturamos parámetros
        const { inicio, fin, empresa } = req.query;
        
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;
        const idcom = parseInt(empresa) || 0; 

        // 2. USAMOS EL POOL PERSISTENTE (Eliminamos new Connection y tedious)
        const request = poolflowershop.request();

        // 3. Inyectamos parámetros de forma segura con mssql
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);
        request.input('idcom', sql.Int, idcom);

        // 4. Ejecución con async/await
        const result = await request.query(`
             SELECT 
 CASE codigo_com_dar
            WHEN 1 THEN 'BELLAFLOR'
            WHEN 2 THEN 'TIMELESSFLOWERS S.A.S.'
            WHEN 3 THEN 'HIDDENGARDEN CIA LTDA'
            WHEN 4 THEN 'AMAZINGROSES CIA LTDA'
            WHEN 5 THEN 'EXPOFLOR CIA. LTDA.'
            WHEN 6 THEN 'FLORMUNDO CIA LTDA'
            WHEN 7 THEN 'EXPOFLOR CIA. LTDA.'
            WHEN 8 THEN 'EXPOFLOR CIA. LTDA.'
            WHEN 9 THEN 'EXPOFLOR CIA. LTDA.'
            WHEN 10 THEN 'CAJA DE AHORROS BENEFACTORA BELLA FLOR'
            WHEN 11 THEN 'HOLDING BELLAFLOR GROUP SCC'
            WHEN 12 THEN 'OASISFLOWER SAS'
            WHEN 13 THEN 'OASISORGANICS SAS'
            WHEN 14 THEN 'EL SALTO AGRICOLA E INDUSTRIAL SA'
            ELSE 'OTRA / DESCONOCIDA'
        END AS NOMBRE_EMPRESA,
		comedor,
		departamento,
		fecha_dia,
        cedula,
        nombres,
		SUM(CASE WHEN val_asume_emp_almuer = 'si' THEN 1 ELSE 0 END) AS T_ALMZ_ASUM_EMPR,
		SUM(CASE WHEN val_asume_emp_meriend = 'si' THEN 1 ELSE 0 END) AS T_MERND_ASUM_EMPR,
		SUM(CASE WHEN almuer_si = 'si' THEN 1 ELSE 0 END) AS T_ALMZ,
        SUM(CASE WHEN meriend_si = 'si' THEN 1 ELSE 0 END) AS T_MERND,
        SUM(CASE WHEN desayuno = 'si' THEN 1 ELSE 0 END) AS T_DESAY,
        SUM(CASE WHEN refrigerio = 'si' THEN 1 ELSE 0 END) AS T_REFRIG,
		0.00 'C_ALMZ_MERND',
		0.00 'C_ALMZ_MERND',
		0.00 'C_DESAYUNO',
		0.00 'C_REFRIGERIO',
        -- Precios unitarios
        MAX(IIF(codigo_com_dar = 3, 3.00, 1.80)) AS [COSTO(ALMZ/MERND)],
        MAX(IIF(codigo_com_dar = 3, 1.88, 0.68)) AS [COSTO(ALMZ_MERND/ASUM_EMPRE)],
        1.12 AS [DESCT(ALMZ_MERND/EMPLD)],
		0.00 'V_DESAYUNO',
		0.00 'V_REFRIGERIO',
        -- Totales calculados sobre la agregación
        SUM(CASE WHEN almuer_si = 'si' THEN 1 ELSE 0 END) * MAX(IIF(codigo_com_dar = 3, 3.00, 1.80)) AS T_PAGO_ALMZ,
        SUM(CASE WHEN meriend_si = 'si' THEN 1 ELSE 0 END) * MAX(IIF(codigo_com_dar = 3, 3.00, 1.80)) AS T_PAGO_MERND
    FROM rrhh_formulario with(nolock)
   WHERE CAST(fecha_dia AS DATE) BETWEEN @inicio AND @fin
    --AND codigo_com_dar = @idcom
    AND (estadovisual <> '0' OR estadovisual IS NULL)
    GROUP BY 
	comedor,
	departamento,
	fecha_dia,
        cedula,
        nombres,
        codigo_com_dar 
    ORDER BY nombres, fecha_dia
        `);

        // 5. Retornamos el recordset directamente
        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte Facturación:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


//AGRUPADO
app.get('/api/REPORTES/rep_alm_mer_fact_agrupado', async (req, res) => {
    try {
        // 1. Capturamos y normalizamos parámetros de la URL
        const { inicio, fin, empresa } = req.query;
        
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;
        
        // Convertimos a entero. Si viene vacío o "0" desde React, se establece en 0 (Todas)
        const idcom = parseInt(empresa, 10) || 0; 

        // 2. Usamos el pool persistente seguro de mssql
        const request = poolflowershop.request();

        // 3. Inyectamos parámetros de forma estricta para evitar Inyección SQL
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);
        request.input('idcom', sql.Int, idcom);

        // 4. Ejecución asíncrona de la consulta con optimización lógica en el WHERE
        const result = await request.query(`
            SELECT 
                cedula,
                nombres,
                -- Totales de asistencia y consumo
                SUM(CASE WHEN presente <> 'no' AND desayuno = 'si' THEN 1 ELSE 0 END) AS T_DESAY,
                SUM(CASE WHEN presente <> 'no' AND almuer_si = 'si' THEN 1 ELSE 0 END) AS T_ALMZ,
                SUM(CASE WHEN presente <> 'no' AND refrigerio = 'si' THEN 1 ELSE 0 END) AS T_REFRIG,
                SUM(CASE WHEN presente <> 'no' AND meriend_si = 'si' THEN 1 ELSE 0 END) AS T_MERND,
                
                -- Valores asumidos por la empresa
                SUM(CASE WHEN presente <> 'no' AND almuer_si = 'si' AND val_asume_emp_almuer = 'si' THEN 1 ELSE 0 END) AS T_ALMZ_ASUM_EMPR,
                SUM(CASE WHEN presente <> 'no' AND meriend_si = 'si' AND val_asume_emp_meriend = 'si' THEN 1 ELSE 0 END) AS T_MERND_ASUM_EMPR,
                
                -- Costos de referencia basados en el código de empresa
                MAX(IIF(codigo_com_dar = 3, 3.00, 1.80)) AS [COSTO(ALMZ/MERND)],
                MAX(IIF(codigo_com_dar = 3, 1.88, 0.68)) AS [COSTO(ALMZ_MERND/ASUM_EMPRE)], 
                
                -- Cálculos de pagos totales (Consumo total * Costo diario)
                SUM(CASE WHEN presente <> 'no' AND almuer_si = 'si' THEN IIF(codigo_com_dar = 3, 3.00, 1.80) ELSE 0 END) AS T_PAGO_ALMZ,
                SUM(CASE WHEN presente <> 'no' AND meriend_si = 'si' THEN IIF(codigo_com_dar = 3, 3.00, 1.80) ELSE 0 END) AS T_PAGO_MERND,
                
                -- ALMUERZO: Si la empresa lo asume (val_asume_emp_almuer = 'si'), el descuento es 0
                SUM(CASE WHEN presente <> 'no' AND almuer_si = 'si' AND val_asume_emp_almuer <> 'si' THEN IIF(codigo_com_dar = 3, 3.00, 1.12) ELSE 0 END) AS T_DESC_ALMZ_EMP,
                
                -- MERIENDA: Si la empresa lo asume (val_asume_emp_meriend = 'si'), el descuento es 0
                SUM(CASE WHEN presente <> 'no' AND meriend_si = 'si' AND val_asume_emp_meriend <> 'si' THEN IIF(codigo_com_dar = 3, 3.00, 1.12) ELSE 0 END) AS T_DESC_MERND_EMP,
                
                -- Nombre mapeado de la empresa
                MAX(CASE codigo_com_dar
                    WHEN 3 THEN 'HIDDENGARDEN CIA LTDA'
                    WHEN 4 THEN 'AMAZINGROSES CIA LTDA'
                    WHEN 5 THEN 'EXPOFLOR CIA. LTDA.'
                    WHEN 10 THEN 'CAJA DE AHORROS BENEFACTORA BELLA FLOR'
                    WHEN 12 THEN 'OASISFLOWER SAS'
                    WHEN 13 THEN 'OASISORGANICS SAS'
                    ELSE 'OTRA / DESCONOCIDA'
                END) AS NOMBRE_EMPRESA
            FROM rrhh_formulario with(nolock)
            WHERE CAST(fecha_dia AS DATE) BETWEEN @inicio AND @fin
              -- Lógica numérica: si @idcom es 0 salta el filtro, si no, busca el ID específico
               AND (@idcom = 0 OR codigo_com_dar = @idcom)
              AND (estadovisual <> '0' OR estadovisual IS NULL)
            GROUP BY 
                cedula,
                nombres
            ORDER BY 
                nombres;
        `);

        // 5. Retornamos el recordset directo en formato JSON nativo
        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte Facturación:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


//AGRUPADO2
app.get('/api/REPORTES/rep_alm_mer_fact_agrupado2', async (req, res) => {
    try {
        // 1. Capturamos y normalizamos parámetros de la URL
        const { inicio, fin, empresa } = req.query;
        
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;
        
        // Convertimos a entero. Si viene vacío o "0" desde React, se establece en 0 (Todas)
        const idcom = parseInt(empresa, 10) || 0; 

        // 2. Usamos el pool persistente seguro de mssql
        const request = poolflowershop.request();

        // 3. Inyectamos parámetros de forma estricta para evitar Inyección SQL
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);
        request.input('idcom', sql.Int, idcom);

        // 4. Ejecución asíncrona de la consulta con optimización lógica en el WHERE
        const result = await request.query(`

            SELECT  MAX(CASE codigo_com_dar
                    WHEN 3 THEN 'HIDDENGARDEN CIA LTDA'
                    WHEN 4 THEN 'AMAZINGROSES CIA LTDA'
                    WHEN 5 THEN 'EXPOFLOR CIA. LTDA.'
                    WHEN 10 THEN 'CAJA DE AHORROS BENEFACTORA BELLA FLOR'
                    WHEN 12 THEN 'OASISFLOWER SAS'
                    WHEN 13 THEN 'OASISORGANICS SAS'
                    ELSE 'OTRA / DESCONOCIDA'
                END) AS NOMBRE_EMPRESA,
				comedor,
				departamento,
				fecha_dia,
				cedula,
				nombres,
                SUM(CASE WHEN presente <> 'no' AND almuer_si = 'si' AND val_asume_emp_almuer = 'si' THEN 1 ELSE 0 END) AS T_ALMZ_ASUM_EMPR,
                SUM(CASE WHEN presente <> 'no' AND meriend_si = 'si' AND val_asume_emp_meriend = 'si' THEN 1 ELSE 0 END) AS T_MERND_ASUM_EMPR,
				SUM(CASE WHEN presente <> 'no' AND almuer_si = 'si' THEN 1 ELSE 0 END) AS C_ALMZ,
				SUM(CASE WHEN presente <> 'no' AND meriend_si = 'si' THEN 1 ELSE 0 END) AS C_MERND,
				SUM(CASE WHEN presente <> 'no' AND desayuno = 'si' THEN 1 ELSE 0 END) AS C_DESAY,
                SUM(CASE WHEN presente <> 'no' AND refrigerio = 'si' THEN 1 ELSE 0 END) AS C_REFRIG,
				
				 MAX(IIF(codigo_com_dar = 3, 3, 1.80)) AS 'C_ALMZ_MERND',
				1.80 'C_ALMZ_MERND',
				1.50 'C_DESAYUNO',
				2.00 'C_REFRIGERIO',

				 SUM(CASE WHEN presente <> 'no' AND almuer_si = 'si' THEN IIF(codigo_com_dar = 3, 1.88, 0.68) ELSE 0 END) AS VALOR_ALMZ_EMPRESA,
                SUM(CASE WHEN presente <> 'no' AND almuer_si = 'si' AND val_asume_emp_almuer <> 'si' THEN IIF(codigo_com_dar = 3, 3.00, 1.12) ELSE 0 END) AS VALOR_DESCT_ALMZ_EMPLD,
				SUM(CASE WHEN presente <> 'no' AND meriend_si = 'si' THEN IIF(codigo_com_dar = 3, 1.88, 0.68) ELSE 0 END) AS VALOR_MERIENDA_EMPRESA,
                SUM(CASE WHEN presente <> 'no' AND meriend_si = 'si' AND val_asume_emp_meriend <> 'si' THEN IIF(codigo_com_dar = 3, 3.00, 1.12) ELSE 0 END) AS VALOR_DESCT_MERIENDA_EMPLD,

				 SUM(CASE WHEN presente <> 'no' AND desayuno = 'si' THEN IIF(codigo_com_dar = 3, 1.50, 1.50) ELSE 0 END) AS 'VALOR_DESAYUNOS_EMPRESA',
				  SUM(CASE WHEN presente <> 'no' AND refrigerio = 'si' THEN IIF(codigo_com_dar = 3, 2.00, 2.00) ELSE 0 END) AS 'VALOR_REFRIGERIO_EMPRESA'
                 FROM rrhh_formulario with(nolock)
           
            WHERE CAST(fecha_dia AS DATE) BETWEEN @inicio AND @fin
              -- Lógica numérica: si @idcom es 0 salta el filtro, si no, busca el ID específico
               AND (@idcom = 0 OR codigo_com_dar = @idcom)
              AND (estadovisual <> '0' OR estadovisual IS NULL)
			 
            GROUP BY 
			comedor,
			departamento,
			fecha_dia,
                cedula,
                nombres
            ORDER BY 
                nombres;

           
            
          
        `);

        // 5. Retornamos el recordset directo en formato JSON nativo
        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte Facturación:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});




//REP ALM MER, DES, REF
app.get('/api/REPORTES/Rep_alm_mer_des_ref', async (req, res) => {
    try {
        // 1. Capturamos parámetros
        const { inicio, fin, empresa } = req.query;
        
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;
        const idcom = parseInt(empresa) || 0; 

        // 2. USAMOS EL POOL PERSISTENTE (Eliminamos new Connection y tedious)
        const request = poolflowershop.request();

        // 3. Inyectamos parámetros de forma segura con mssql
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);
        request.input('idcom', sql.Int, idcom);

        // 4. Ejecución con async/await
        const result = await request.query(`
             SELECT 
     ISNULL(departamento, 'TOTAL') AS departamento,
    SUM(CASE WHEN desayuno = 'si' THEN 1 ELSE 0 END) AS total_desayuno,
    SUM(CASE WHEN almuer_si = 'si' THEN 1 ELSE 0 END) AS total_almuerzo,
    SUM(CASE WHEN refrigerio = 'si' THEN 1 ELSE 0 END) AS total_refrigerio,
    SUM(CASE WHEN meriend_si = 'si' THEN 1 ELSE 0 END) AS total_merienda
FROM rrhh_formulario with(nolock)
WHERE CAST(fecha_dia AS DATE) BETWEEN @inicio AND @fin
    AND codigo_com_dar = @idcom
    AND (estadovisual <> '0' OR estadovisual IS NULL)
GROUP BY ROLLUP(departamento);

        `);

        // 5. Retornamos el recordset directamente
        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte Facturación:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});



//POR COMEDOR Y DEPARTAMENTO
app.get('/api/REPORTES/Rep_alm_mer_des_comedor', async (req, res) => {
    try {
        // 1. Capturamos parámetros (Se usa queryComedor para evitar duplicar el identificador)
        const { inicio, fin, comedor: queryComedor } = req.query;
        
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInicio = inicio || hoy;
        const fechaFin = fin || hoy;
        const comedorParam = queryComedor || ''; 

        // 2. USAMOS EL POOL PERSISTENTE
        const request = poolflowershop.request();

        // 3. Inyectamos parámetros de forma segura con mssql
        request.input('inicio', sql.Date, fechaInicio);
        request.input('fin', sql.Date, fechaFin);
        request.input('comedor', sql.VarChar, comedorParam);

        // 4. Ejecución con async/await
        const result = await request.query(`   
                       WITH DatosBase AS (
    SELECT 
        -- Unificamos los IDs repetidos en un solo nombre de empresa desde el inicio
        CASE codigo_com_dar
            WHEN 1 THEN 'BELLAFLOR'
            WHEN 2 THEN 'TIMELESSFLOWERS S.A.S.'
            WHEN 3 THEN 'HIDDENGARDEN CIA LTDA'
            WHEN 4 THEN 'AMAZINGROSES CIA LTDA'
            WHEN 5 THEN 'EXPOFLOR CIA. LTDA.'
            WHEN 6 THEN 'FLORMUNDO CIA LTDA'
            WHEN 7 THEN 'EXPOFLOR CIA. LTDA.'
            WHEN 8 THEN 'EXPOFLOR CIA. LTDA.'
            WHEN 9 THEN 'EXPOFLOR CIA. LTDA.'
            WHEN 10 THEN 'CAJA DE AHORROS BENEFACTORA BELLA FLOR'
            WHEN 11 THEN 'HOLDING BELLAFLOR GROUP SCC'
            WHEN 12 THEN 'OASISFLOWER SAS'
            WHEN 13 THEN 'OASISORGANICS SAS'
            WHEN 14 THEN 'EL SALTO AGRICOLA E INDUSTRIAL SA'
            ELSE 'OTRA EMPRESA'
        END AS nombre_empresa,
        -- Si el departamento o comedor son nulos o vacíos se controlan aquí
        ISNULL(NULLIF(departamento, ''), 'Sin Departamento') AS departamento,
        ISNULL(NULLIF(comedor, ''), 'Sin Comedor') AS comedor, -- 🆕 Campo aumentado
        CASE WHEN desayuno = 'si' THEN 1 ELSE 0 END AS d,
        CASE WHEN almuer_si = 'si' THEN 1 ELSE 0 END AS a,
        CASE WHEN refrigerio = 'si' THEN 1 ELSE 0 END AS r,
        CASE WHEN meriend_si = 'si' THEN 1 ELSE 0 END AS m
    FROM rrhh_formulario with(nolock)
    WHERE CAST(fecha_dia AS DATE) BETWEEN @inicio AND @fin
                            -- ✨ MODIFICACIÓN AQUÍ: Si @comedor es vacío, ignora el filtro y trae TODOS
                            AND (@comedor = '' OR comedor = @comedor)
                            AND (estadovisual <> '0' OR estadovisual IS NULL)
)
SELECT
    CASE 
        WHEN GROUPING(nombre_empresa) = 1 THEN 'TOTAL GENERAL'
        ELSE nombre_empresa
    END AS nombre_empresa,
    CASE 
        WHEN GROUPING(nombre_empresa) = 1 THEN '---'
        WHEN GROUPING(departamento) = 1 THEN 'TOTAL ' + nombre_empresa
        ELSE departamento
    END AS departamento,
    CASE 
        WHEN GROUPING(departamento) = 1 THEN '---'
        WHEN GROUPING(comedor) = 1 THEN 'TOTAL ' + departamento
        ELSE comedor
    END AS comedor, -- 🆕 Subtotales para el comedor aumentado
    SUM(d) AS total_desayuno,
    SUM(a) AS total_almuerzo,
    SUM(r) AS total_refrigerio,
    SUM(m) AS total_merienda
FROM 
    DatosBase
GROUP BY 
    ROLLUP(comedor,nombre_empresa, departamento); -- 🆕 Agregado a la jerarquía de ROLLUP

                      
                        
                   
        `);

        // 5. Retornamos el recordset directamente
        res.json(result.recordset);

    } catch (err) {
        console.error("❌ Error en Reporte Facturación:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


// --- API EMPLEADOS (PUT) ---
app.put('/empleados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        // 1. USAMOS EL POOL PERSISTENTE (Eliminamos new Connection y tedious)
        const request = poolflowershop.request();

        // 2. Agregamos parámetros de forma segura con mssql
        request.input('id', sql.Int, id);
        request.input('nombre', sql.VarChar, nombre);

        // 3. Ejecutamos el UPDATE con async/await
        await request.query(`
            UPDATE Empleados 
            SET nombre = @nombre 
            WHERE id = @id
        `);

        res.json({ success: true, message: "✅ Empleado actualizado correctamente" });

    } catch (err) {
        console.error("❌ Error al actualizar empleado:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});


// --- API EMPLEADOS (PUT) ---
app.put('/empleados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        // 1. USAMOS EL POOL PERSISTENTE (Eliminamos new Connection y tedious)
        const request = poolflowershop.request();

        // 2. Agregamos parámetros de forma segura con mssql
        request.input('id', sql.Int, id);
        request.input('nombre', sql.VarChar, nombre);

        // 3. Ejecutamos el UPDATE con async/await
        await request.query(`
            UPDATE Empleados 
            SET nombre = @nombre 
            WHERE id = @id
        `);

        res.json({ success: true, message: "✅ Empleado actualizado correctamente" });

    } catch (err) {
        console.error("❌ Error al actualizar empleado:", err.message);
        res.status(500).json({ error: "Error en el servidor: " + err.message });
    }
});

// CIERRE DE PERIODO
app.get('/api/RRHH/periodo_cierre', async (req, res) => {
    try {
        // Extraemos parámetros por si decides filtrar después
       
        const request = poolflowershop.request();

        // Ejemplo de cómo filtrar de forma segura si lo necesitaras:
        // if (inicio) request.input('inicio', inicio);
        
        const result = await request.query(`
            SELECT * FROM periodo_cierre with(nolock)
            ORDER BY id asc 
        `);

        res.json(result.recordset);

    } catch (err) {
        // Ajustamos el log para que coincida con la función
        console.error("❌ Error en Cierre de Periodo:", err.message);
        res.status(500).json({ 
            error: "Error interno del servidor", 
            detalle: err.message 
        });
    }
});

//Actualizar preridos


app.put('/api/RRHH/periodo_cierre/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha_desde, fecha_hasta } = req.body;
        const request = poolflowershop.request();

        // 1. Limpiamos el formato reemplazando la 'T' por un espacio
        const desdeLimpio = fecha_desde.replace('T', ' ');
        const hastaLimpio = fecha_hasta.replace('T', ' ');

        await request
            .input('id', sql.Int, id)
            .input('desde', sql.DateTime, desdeLimpio) // Forzamos tipo DateTime
            .input('hasta', sql.DateTime, hastaLimpio) // Forzamos tipo DateTime
            .query(`
                UPDATE periodo_cierre 
                SET fecha_desde = @desde, fecha_hasta = @hasta 
                WHERE id = @id
            `);

        res.json({ message: "Periodo actualizado con éxito" });
    } catch (err) {
        console.error("❌ Error al actualizar:", err.message);
        res.status(500).json({ error: "Error de conversión: verifique el formato de fecha" });
    }
});

app.put('/api/SISTEMA/usuario_web/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 1. Añadimos los campos a la desestructuración del body
        const { nombre_usu, idperfil, clave, nombre, id_empresa, departamento } = req.body;
        const request = poolflowershop.request();

        await request
            .input('id', sql.Int, id)
            .input('nombre_usu', sql.VarChar, nombre_usu)
            .input('idperfil', sql.Int, idperfil)
            .input('clave', sql.VarChar, clave)
            .input('nombre', sql.VarChar, nombre)
            // 2. Agregamos los inputs como VarChar para soportar los strings separados por comas
            .input('id_empresa', sql.VarChar, id_empresa)
            .input('departamento', sql.VarChar, departamento)
            .query(`
                UPDATE usuario_web 
                SET nombre_usu = @nombre_usu, 
                    idperfil = @idperfil, 
                    clave = @clave, 
                    nombre = @nombre,
                    id_empresa = @id_empresa,
                    departamento = @departamento
                WHERE id = @id
            `);

        res.json({ message: "Usuario actualizado con éxito" });
    } catch (err) {
        console.error("❌ Error al actualizar:", err.message);
        res.status(500).json({ error: "Error en el servidor al actualizar el usuario" });
    }
});





// Arranca el servidor
app.listen(4000, () => {
    console.log('Servidor API SIORET corriendo en ${API_BASE_URL }',);
});
