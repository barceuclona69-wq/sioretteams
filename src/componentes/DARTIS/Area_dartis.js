import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

function Listar() {
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    
    fetch(`${API_BASE_URL }/api/DARTIS/area_dartis`)
      .then(response => response.json())
      .then(data => setAreas(data))
      .catch(error => console.error('Error:', error));
  }, []);

  return (
    <div>
      <h1>Áreas Dartis</h1>
      <table border="1" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th>ID</th>
            <th>Nombre del Área</th>
            {/* Agrega aquí más encabezados si tu API tiene más campos */}
          </tr>
        </thead>
        <tbody>
          {areas.map(area => (
            <tr key={area.id}>
              <td>{area.id}</td>
              <td>{area.nombre}</td>
              {/* Ejemplo: <td>{area.descripcion}</td> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Listar;
