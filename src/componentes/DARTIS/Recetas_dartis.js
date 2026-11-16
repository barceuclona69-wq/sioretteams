import React, { useEffect, useState } from 'react';
import { fetchWithFallback } from '../../config';
import { toast } from 'sonner';

const ConsultaRecetas = () => {
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [bouquetAbierto, setBouquetAbierto] = useState(null);
  const [pestanaActiva, setPestanaActiva] = useState('creadas');

  const cargarRecetas = async () => {
    setLoading(true);
    try {
      const data = await fetchWithFallback('/api/DARTIS/recetas_bouquets');
      if (data) {
        setRecetas(agruparPorBouquet(data));
      } else {
        setRecetas([]);
      }
    } catch (error) {
      console.error("Error al cargar recetas:", error.message);
     // toast.error('No se pudieron cargar las recetas desde el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRecetas();
  }, []);
  const agruparPorBouquet = (listaPlana) => {
    if (!Array.isArray(listaPlana)) return [];
    const mapa = {};

    listaPlana.forEach((item) => {
      if (!item || !item.idBouquetFinca) return;
      const id = Number(item.idBouquetFinca);

      if (!mapa[id]) {
        mapa[id] = {
          idBouquetFinca: id,
          nombre: item.bouquet ? item.bouquet.trim() : 'Sin nombre',
          fechamodificacion: item.fechamodificacion || null,
          totalTallos: 0,
          componentes: []
        };
      }

      const cantidad = Number(item.stemsCompound) || 0;
      mapa[id].totalTallos += cantidad;
      mapa[id].componentes.push({
        variedad: item.varietyCompound,
        color: item.colorCompound,
        tallos: cantidad
      });
    });

    return Object.values(mapa);
  };

  const copiarRecetaTextoPlano = (e, receta) => {
    e.stopPropagation(); // Evita que se abra/cierre la tarjeta

    const encabezado = `${receta.nombre} (Total: ${receta.totalTallos} tallos)`;
    const separador = '-'.repeat(encabezado.length);
    const lineasComponentes = receta.componentes
      .map((c) => `- ${c.variedad} (${c.color || 'Sin color'}): ${c.tallos} tallos`)
      .join('\n');

    const textoFinal = `${encabezado}\n${separador}\n${lineasComponentes}`;

    // 1. Si hay HTTPS o localhost, usa el método moderno
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textoFinal)
        .then(() => toast.success(`Receta "${receta.nombre}" copiada al portapapeles.`))
        .catch(() => toast.error('No se pudo copiar la receta.'));
    } else {
      // 2. Respaldo para red local (http://192.168.x.x)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textoFinal;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const exito = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (exito) {
          toast.success(`Receta "${receta.nombre}" copiada al portapapeles.`);
        } else {
          toast.error('No se pudo copiar la receta.');
        }
      } catch (err) {
        toast.error('Error al intentar copiar en este navegador.');
      }
    }
  };

  const obtenerRecetasPorSeccion = () => {
    let listaBase = [...recetas];

    if (pestanaActiva === 'creadas') {
      listaBase.sort((a, b) => b.idBouquetFinca - a.idBouquetFinca);
      listaBase = listaBase.slice(0, 50);
    } else if (pestanaActiva === 'editadas') {
      listaBase = listaBase
        .filter((item) => item.fechamodificacion !== null && item.fechamodificacion !== '')
        .sort((a, b) => new Date(b.fechamodificacion) - new Date(a.fechamodificacion))
        .slice(0, 50);
    } else {
      listaBase.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    const termino = busqueda.toLowerCase();
    if (!termino) return listaBase;

    return listaBase.filter(
      (item) =>
        String(item.idBouquetFinca).includes(termino) ||
        item.nombre.toLowerCase().includes(termino) ||
        item.componentes.some(
          (c) =>
            c.variedad?.toLowerCase().includes(termino) ||
            c.color?.toLowerCase().includes(termino)
        )
    );
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return '';
    return fecha.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const recetasMostradas = obtenerRecetasPorSeccion();
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '850px', margin: '0 auto' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #7a9b17', paddingBottom: '10px' }}>
        <h3 style={{ color: '#7a9b17', margin: 0, textTransform: 'uppercase' }}>
          Consulta de Recetas ({recetasMostradas.length})
        </h3>
        <button 
          type="button" 
          onClick={cargarRecetas}
          style={{ backgroundColor: '#7a9b17', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
        >
          Actualizar
        </button>
      </div>

      {/* Pestañas de 3 Secciones */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => { setPestanaActiva('creadas'); setBouquetAbierto(null); }}
          style={{
            flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
            backgroundColor: pestanaActiva === 'creadas' ? '#7a9b17' : '#e2e8f0',
            color: pestanaActiva === 'creadas' ? '#fff' : '#475569'
          }}
        >
          Últimas 50 Creadas
        </button>

        

        <button
          type="button"
          onClick={() => { setPestanaActiva('todas'); setBouquetAbierto(null); }}
          style={{
            flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
            backgroundColor: pestanaActiva === 'todas' ? '#15803d' : '#e2e8f0',
            color: pestanaActiva === 'todas' ? '#fff' : '#475569'
          }}
        >
          Todas las Recetas ({recetas.length})
        </button>
      </div>

      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar por ID, nombre de bouquet, flor o color..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{
          width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #7a9b17',
          marginBottom: '20px', boxSizing: 'border-box', outline: 'none', fontSize: '14px'
        }}
      />

      {/* Listado */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Cargando recetas...</p>
      ) : recetasMostradas.length === 0 ? (
        <p style={{ fontStyle: 'italic', color: '#888', textAlign: 'center' }}>
          No se encontraron recetas en esta sección.
        </p>
      ) : (
        recetasMostradas.map((item) => {
          const esAbierto = bouquetAbierto === item.idBouquetFinca;

          return (
            <div key={item.idBouquetFinca} style={{ marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', overflow: 'hidden' }}>
              
              {/* Cabecera del Bouquet */}
              <div
                onClick={() => setBouquetAbierto(esAbierto ? null : item.idBouquetFinca)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '15px', backgroundColor: esAbierto ? '#edf4db' : '#fff', cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #cbd5e1' }}>
                      ID: {item.idBouquetFinca}
                    </span>
                    <span style={{ fontWeight: 'bold', color: '#333', fontSize: '15px' }}>
                      {item.nombre}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <span>Fórmula: <strong>{item.totalTallos} tallos</strong> ({item.componentes.length} variedades)</span>
                    {item.fechamodificacion && (
                      <span style={{ marginLeft: '10px', color: pestanaActiva === 'editadas' ? '#2b6cb0' : '#64748b' }}>
                        • Editado: {formatearFecha(item.fechamodificacion)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botones de Acción (Copiar + Ver receta) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={(e) => copiarRecetaTextoPlano(e, item)}
                    style={{
                      backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1',
                      padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
                    }}
                  >
                    Copiar
                  </button>

                  <span style={{ fontSize: '12px', color: '#7a9b17', fontWeight: 'bold' }}>
                    {esAbierto ? '▲ Ocultar' : '▼ Ver receta'}
                  </span>
                </div>
              </div>

              {/* Tabla de Detalles */}
              {esAbierto && (
                <div style={{ backgroundColor: '#fafafa', padding: '15px', borderTop: '1px solid #ddd' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#475569' }}>
                        <th style={{ padding: '6px 5px' }}>Variedad</th>
                        <th style={{ padding: '6px 5px' }}>Color</th>
                        <th style={{ padding: '6px 5px', textAlign: 'right' }}>Tallos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.componentes.map((comp, cIdx) => (
                        <tr key={cIdx} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}>
                          <td style={{ padding: '8px 5px', color: '#333' }}>{comp.variedad}</td>
                          <td style={{ padding: '8px 5px', color: '#666' }}>{comp.color}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '8px 5px', color: '#15803d' }}>
                            {comp.tallos}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default ConsultaRecetas;
