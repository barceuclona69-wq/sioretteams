import React, { Component } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { fetchWithFallback } from '../../config';
import { toast } from 'sonner';

class Listar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            datosCargados: false,
            todosLosRelojes: [],
            tooltip: { visible: false, titulo: '', equipos: [], x: 0, y: 0 }
        };
        this.intervalo = null;
    }



    
    componentDidMount() {
        this.cargarDatos(true);
        this.intervalo = setInterval(() => {
            this.cargarDatos(false);
        }, 30000);
    }

    componentWillUnmount() {
        if (this.intervalo) {
            clearInterval(this.intervalo);
        }
    }

    cargarDatos(esCargaInicial = false) {
        if (esCargaInicial) {
            this.setState({ datosCargados: false });
        }
        
        const endpoint = `/api/REPORTES/ztecoonline`;

        fetchWithFallback(endpoint)
            .then((datos) => {
                const dataNormalizada = Array.isArray(datos) ? datos : (datos.recordset || datos.data || []);
                
                this.setState({ 
                    datosCargados: true, 
                    todosLosRelojes: dataNormalizada 
                });
            })
            .catch(err => {
                console.error("Error en reporte ZKTeco Online:", err);
                this.setState({ datosCargados: true, todosLosRelojes: [] });
                toast.error("Error al conectar con el servidor de Biométricos");
            });
    }
    renderGraficoPastel(listaEnLinea, listaDesconectados) {
        const enLinea = listaEnLinea.length;
        const desconectados = listaDesconectados.length;
        const total = enLinea + desconectados;
        
        if (total === 0) return null;

        const { tooltip } = this.state;
        const radio = 70;
        const centro = 90;
        const circunferencia = 2 * Math.PI * radio;

        const pctEnLinea = ((enLinea / total) * 100).toFixed(1);
        const pctDesconectados = ((desconectados / total) * 100).toFixed(1);

        const arcoEnLinea = (enLinea / total) * circunferencia;
        const arcoDesconectados = (desconectados / total) * circunferencia;

        const manejarMouseMove = (e, titulo, equipos) => {
            this.setState({
                tooltip: {
                    visible: true,
                    titulo: titulo,
                    equipos: equipos,
                    x: e.clientX + 14,
                    y: e.clientY + 14
                }
            });
        };

        const manejarMouseLeave = () => {
            this.setState({ tooltip: { ...tooltip, visible: false } });
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Equipos ({total} Total)</h4>
                
                <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)', cursor: 'pointer' }}>
                    {desconectados > 0 && (
                        <circle
                            r={radio}
                            cx={centro}
                            cy={centro}
                            fill="transparent"
                            stroke="#dc3545"
                            strokeWidth="35"
                            strokeDasharray={`${arcoDesconectados} ${circunferencia}`}
                            strokeDashoffset={-arcoEnLinea}
                            onMouseMove={(e) => manejarMouseMove(
                                e, 
                                `🔴 Desconectados: ${desconectados} (${pctDesconectados}%)`, 
                                listaDesconectados
                            )}
                            onMouseLeave={manejarMouseLeave}
                        />
                    )}
                    {enLinea > 0 && (
                        <circle
                            r={radio}
                            cx={centro}
                            cy={centro}
                            fill="transparent"
                            stroke="#28a745"
                            strokeWidth="35"
                            strokeDasharray={`${arcoEnLinea} ${circunferencia}`}
                            strokeDashoffset="0"
                            onMouseMove={(e) => manejarMouseMove(
                                e, 
                                `🟢 En Línea: ${enLinea} (${pctEnLinea}%)`, 
                                listaEnLinea
                            )}
                            onMouseLeave={manejarMouseLeave}
                        />
                    )}
                </svg>

                <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                    <span style={{ color: '#28a745' }}>🟢 En Línea: {enLinea}</span>
                    <span style={{ color: '#dc3545' }}>🔴 Desconectados: {desconectados}</span>
                </div>

                {/* Tooltip flotante con Nombre y Serie */}
                {tooltip.visible && (
                    <div style={{
                        position: 'fixed',
                        top: tooltip.y,
                        left: tooltip.x,
                        backgroundColor: 'rgba(20, 20, 20, 0.92)',
                        color: '#fff',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        pointerEvents: 'none',
                        zIndex: 9999,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
                        maxWidth: '320px'
                    }}>
                        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '6px' }}>
                            {tooltip.titulo}
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', lineHeight: '1.6' }}>
                            {tooltip.equipos.map((eq, idx) => (
                                <li key={eq.numeroSerie || idx}>
                                    <strong>{eq.nombreDispositivo}</strong> <span style={{ color: '#ccc' }}>({eq.numeroSerie})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
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

        const esRutaReporte = location.pathname === '/REPORTES/rep_laptario';
        const relojesFueraDeLinea = todosLosRelojes.filter(reloj => reloj.estadoReal === 'Desconectado');
        const relojesEnLinea = todosLosRelojes.filter(reloj => reloj.estadoReal !== 'Desconectado');

        return (
            <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
                {!esRutaReporte && (
                    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                        <h3 style={{ marginTop: 0 }}>Estado del Sistema Biométrico</h3>

                        {this.renderGraficoPastel(relojesEnLinea, relojesFueraDeLinea)}
                        
                        {/* Muestra el banner verde solo si todos están en línea */}
                        {relojesFueraDeLinea.length === 0 && (
                            <div style={{ color: '#155724', backgroundColor: '#d4edda', padding: '15px', borderRadius: '5px', fontWeight: 'bold' }}>
                                ✔ Excelente: Todos los relojes biométricos están En Línea.
                            </div>
                        )}
                    </div>
                )}

                {esRutaReporte && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2>Reporte General de Biométricos</h2>
                            <button 
                                onClick={() => navigate(-1)}
                                style={{ backgroundColor: '#6c757d', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
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

const ListarWithRouterV6 = (props) => {
    const navigate = useNavigate();
    const location = useLocation();
    return <Listar {...props} navigate={navigate} location={location} />;
};

export default ListarWithRouterV6;
