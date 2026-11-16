import React, { Component } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { fetchWithFallback } from '../../config'; // <-- Importado fetchWithFallback
import { toast } from 'sonner';

class Listar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            datosCargados: false,
            todosLosRelojes: []
        };
        this.intervalo = null;
    }

    componentDidMount() {
        this.cargarDatos();
        this.intervalo = setInterval(() => {
            this.cargarDatos();
        }, 30000);
    }

    componentWillUnmount() {
        if (this.intervalo) {
            clearInterval(this.intervalo);
        }
    }

        cargarDatos() {
        this.setState({ datosCargados: false });
        const endpoint = `/api/REPORTES/ztecoonline`;

        fetchWithFallback(endpoint)
            .then((datos) => {
                // Normalización estructural idéntica a tu reporte de lactario
                const dataNormalizada = Array.isArray(datos) ? datos : (datos.recordset || datos.data || []);
                
                this.setState({ 
                    datosCargados: true, 
                    todosLosRelojes: dataNormalizada 
                });
            })
            .catch(err => {
                console.error("Error en reporte ZKTeco Online:", err);
                this.setState({ datosCargados: true, todosLosRelojes: [] });
                // Añadimos la misma estructura de alertas visuales de tu proyecto
                toast.error("Error al conectar con el servidor de Biométricos");
            });
    }


    render() {
        const { todosLosRelojes, datosCargados } = this.state;
        const { location, navigate } = this.props;

        if (!datosCargados) {
            return (
                <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
                    <p>⏳ Monitoreando terminales ZKTeco en tiempo real...</p>
                </div>
            );
        }

        // CONTROL DE FLUJO POR URL: Si la url es exactamente /REPORTES/rep_laptario se muestra el Paso 2
        const esRutaReporte = location.pathname === '/REPORTES/rep_laptario';

        const relojesFueraDeLinea = todosLosRelojes.filter(reloj => reloj.estadoReal === 'Desconectado');

        return (
            <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
                
                {/* === PASO 1: RESUMEN DE ALERTAS (Se muestra solo si NO estamos en la URL del reporte) === */}
                {/* === PASO 1: RESUMEN DE ALERTAS Y LISTADO COMPLETO PINTADO === */}
{!esRutaReporte && (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2>Estado del Sistema Biométrico</h2>
        
        {relojesFueraDeLinea.length === 0 ? (
            <div style={{ color: '#155724', backgroundColor: '#d4edda', padding: '15px', borderRadius: '5px', fontWeight: 'bold', marginBottom: '20px' }}>
                ✔ Excelente: Todos los relojes biométricos están En Línea.
            </div>
        ) : (
            <div style={{ backgroundColor: '#fff', border: '1px solid #f5c6cb', borderRadius: '5px', padding: '15px', marginBottom: '20px' }}>
                <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '5px', fontWeight: 'bold', marginBottom: '15px' }}>
                    🛑 ALERTA: {relojesFueraDeLinea.length} dispositivo(s) fuera de línea
                </div>
                
                <p><strong>Monitoreo de terminales:</strong></p>
                <ul style={{ listStyleType: 'none', paddingLeft: '5px' }}>
                    {todosLosRelojes.map(reloj => {
                        const estaDesconectado = reloj.estadoReal === 'Desconectado';
                        return (
                            <li 
                                key={reloj.numeroSerie} 
                                style={{ 
                                    color: estaDesconectado ? '#dc3545' : '#28a745', 
                                    fontWeight: 'bold',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                {/* Círculo indicador dinámico */}
                                <span>{estaDesconectado ? '🔴' : '🟢'}</span>
                                <span>{reloj.nombreDispositivo} ({reloj.numeroSerie}) - {reloj.estadoReal}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        )}

       {/* CONTENEDOR CON FLEXBOX: Controla la distribución y el espacio entre los botones */}
<div style={{ 
    display: 'flex', 
    flexDirection: 'column', // Apila los botones de forma vertical
    gap: '12px',             // Define una separación exacta de 12 píxeles entre cada elemento
    marginTop: '20px'        // Separa el bloque de botones de la lista de relojes superior
}}>

    <button 
        onClick={() => navigate('/REPORTES/rep_laptario')} 
        style={{
            backgroundColor: '#92b91c',
            color: 'white',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            width: '100%',
            fontWeight: 'bold'
        }}
    >
        REPORTE LACTARIO
    </button>

    <button 
        onClick={() => navigate('/REPORTES/rep_lavanderia')} 
        style={{
            backgroundColor: '#92b91c',
            color: 'white',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            width: '100%',
            fontWeight: 'bold'
        }}
    >
        REPORTE LAVANDERIA
    </button>

    <button 
        onClick={() => navigate('/REPORTES/rep_marcacion')} 
        style={{
            backgroundColor: '#92b91c',
            color: 'white',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            width: '100%',
            fontWeight: 'bold'
        }}
    >
        REPORTE MARCACIONES
    </button>

    <button 
        onClick={() => navigate('/REPORTES/rep_comedor')} 
        style={{
            backgroundColor: '#92b91c',
            color: 'white',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            width: '100%',
            fontWeight: 'bold'
        }}
    >
        REPORTE COMEDOR
    </button>

</div>


    </div>
)}


                {/* === PASO 2: REPORTE GENERAL (Se activa automáticamente al estar en /REPORTES/rep_laptario) === */}
                {esRutaReporte && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2>Reporte General de Biométricos</h2>
                            {/* Envía al usuario a la ruta anterior o raíz para ver las alertas de nuevo */}
                            <button 
                                onClick={() => navigate(-1)}
                                style={{ backgroundColor: '#6c757d', color: 'white', padding: '5px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                            >
                                ← Volver a Alertas
                            </button>
                        </div>
                        
                        <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f2f2f2' }}>
                                    <th>Número de Serie</th>
                                    <th>Nombre del Dispositivo</th>
                                    <th>Última Actividad</th>
                                    <th>Estado Real</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todosLosRelojes.map((reloj) => (
                                    <tr key={reloj.numeroSerie} style={{ 
                                        backgroundColor: reloj.estadoReal === 'Desconectado' ? '#fff5f5' : '#ffffff' 
                                    }}>
                                        <td>{reloj.numeroSerie}</td>
                                        <td><strong>{reloj.nombreDispositivo}</strong></td>
                                        <td>{reloj.ultimaActividad ? new Date(reloj.ultimaActividad).toLocaleString() : 'Sin registro'}</td>
                                        <td style={{ 
                                            color: reloj.estadoReal === 'Desconectado' ? 'red' : 'green', 
                                            fontWeight: 'bold' 
                                        }}>
                                            {reloj.estadoReal}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }
}

// En v6 inyectamos tanto "navigate" como "location" para que la clase sepa en qué url está parada
const ListarWithRouterV6 = (props) => {
    const navigate = useNavigate();
    const location = useLocation();
    return <Listar {...props} navigate={navigate} location={location} />;
};

export default ListarWithRouterV6;
