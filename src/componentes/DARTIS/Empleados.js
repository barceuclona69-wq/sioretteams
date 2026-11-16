import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

function EmpleadosDartis() {
  const [data, setData] = useState([]);
  const [areas, setAreas] = useState([]);
  const [sucursales, setSucursales] = useState([]); // Nuevo estado para sucursales

  const [departamento, setDepartamento] = useState('');
  const [sucursal, setSucursal] = useState('');

  // 1. Cargar Áreas y Sucursales al montar
  useEffect(() => {
    // Cargar Áreas
    
    fetch(`${API_BASE_URL }/api/DARTIS/area_dartis`)
      .then(res => res.json())
      .then(data => setAreas(data))
      .catch(err => console.error("Error al obtener áreas:", err));

    // Cargar Sucursales
   fetch(`${API_BASE_URL }/api/DARTIS/sucursales_dartis`)
      .then(res => res.json())
      .then(data => setSucursales(data))
      .catch(err => console.error("Error al obtener sucursales:", err));
  }, []);

  // 2. Cargar empleados cuando cambian los filtros
  useEffect(() => {
    const url = new URL(`${API_BASE_URL }/api/DARTIS/empleados`);
    if (departamento) url.searchParams.append('departamento', departamento);
    if (sucursal) url.searchParams.append('idSucursal', sucursal);

    fetch(url)
      .then(res => res.ok ? res.json() : Promise.reject("Error en red"))
      .then(data => setData(data))
      .catch(err => console.error("Error al obtener empleados:", err));
  }, [departamento, sucursal]);

  return (
    <div className="container mt-4">
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Lista de Empleados (DARTIS)</h4>
        </div>
        
        <div className="card-body bg-light border-bottom">
          <div className="row">
            <div className="col-md-6">
              <label className="form-label fw-bold">Área:</label>
              <select 
                className="form-select" 
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
              >
                <option value="">Todas las áreas</option>
                {areas.map(area => (
                  <option key={area.id} value={area.nombre}>{area.nombre}</option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">Sucursal:</label>
              <select 
                className="form-select" 
                value={sucursal}
                onChange={(e) => setSucursal(e.target.value)}
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map(suc => (
                  <option key={suc.id} value={suc.id}>
                    {suc.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card-body">
          <table className="table table-hover table-bordered">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>IDENTIFICACION</th>
                <th>EMPLEADO</th>
                <th>DEPARTAMENTO</th>
                <th>SUCURSAL</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="fw-bold text-primary">{item.id}</td>
                    <td>{item.identificacion}</td>
                    <td>{item.nombre}</td>
                    <td><span className="badge bg-info text-dark">{item.departamento}</span></td>
                    <td>{item.codcom}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted">No se encontraron registros...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EmpleadosDartis;
