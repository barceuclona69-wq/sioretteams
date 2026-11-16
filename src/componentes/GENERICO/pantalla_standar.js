import React, { useEffect, useState } from 'react';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner';

const Solicitudvacaciones = () => {

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  

  // 1. RECUPERAR DATOS (GET)
const obtenerData = async () => {
  try {
    setLoading(true);
    const endpoint = '/api/RRHH/apidata';
    
    // fetchWithFallback ya hace el .json() internamente y te entrega los datos puros
    const data = await fetchWithFallback(endpoint);
    
    console.log("🎯 Datos recibidos correctamente en React:", data);
    
    // Si la función devolvió datos válidos, los guardamos en el estado
    if (data) {
      setData(data);
    }
  } catch (error) {
    console.error("❌ Error al procesar la petición:", error.message);
    toast.error('No se pudieron cargar los períodos de cierre');
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    obtenerData();
  }, []);


  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Encabezado con logos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#ffffffff', padding: '10px 20px', borderRadius: '8px' }}>
     
        <h2 style={{ color: '#7a9b17ff', margin: 0 }}>Titulo</h2>
      
      </div>

      {/* Contenedor de la Tabla */}
      {loading ? (
        <p>Cargando data...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left', borderBottom: '2px solid #92b91c' }}>
               
              </tr>
            </thead>
            <tbody>
              
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Solicitudvacaciones;
