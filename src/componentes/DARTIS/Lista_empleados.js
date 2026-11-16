import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

function Listar() {
  const [e, setEmp] = useState([]);

  useEffect(() => {
    
    fetch(`${API_BASE_URL }/api/DARTIS/lista_empleados`)
      .then(response => response.json())
      .then(data => setEmp(data))
      .catch(error => console.error('Error:', error));
  }, []);

  return (
    <div>
      <h1>Empleados Dartis</h1>
      <table border="1" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th>ID</th>
            <th>Empleados</th>
            {/* Agrega aquí más encabezados si tu API tiene más campos */}
          </tr>
        </thead>
        <tbody>
          {e.map(e => (
            <tr key={e.id}>
              <td>{e.id}</td>
              <td>{e.nombre}</td>
              
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Listar;
