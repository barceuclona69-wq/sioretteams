import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function Editar() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // 1. Agregamos todos los campos que quieres editar al estado inicial
  const [empleado, setEmpleado] = useState({ 
    fecha: '',
    cedula:'',
    nombres: '', 
    departamento: '' // Añade aquí más campos según tu tabla de SQL Server
  });
  const [errores, setErrores] = useState({});

  //Obtengo la informacion de la asiestencia
  useEffect(() => {
    fetch(`http://192.168.0.253:4000/api/RRHH/asistencia_comedor`)
      .then(res => res.json())
      .then(data => {
        // SQL Server suele devolver un array: [ { id: 1, nombres: 'Juan', ... } ]
        const datosCargados = Array.isArray(data) ? data[0] : data;
        setEmpleado(datosCargados);
      })
      .catch(err => console.error("Error al obtener datos:", err));
  }, [id]);

  const validar = () => {
    let tempErrores = {};
    if (!empleado.nombres?.trim()) tempErrores.nombres = "El nombre es obligatorio";
    if (!empleado.puesto?.trim()) tempErrores.puesto = "El puesto es obligatorio";
    
    setErrores(tempErrores);
    return Object.keys(tempErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validar()) {
      try {
        const response = await fetch(`http://localhost:4000/api/RRHH/editar/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(empleado)
        });
        
        if (response.ok) {
          alert("¡Actualizado con éxito!");
          navigate("/");
        }
      } catch (error) {
        console.error("Error al conectar con SQL Server", error);
      }
    }
  };

  // Función genérica para manejar cambios en cualquier input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmpleado({ ...empleado, [name]: value });
  };

  return (
    <div className="card p-4 shadow">
      <h3 className="mb-4">Editar Empleado #{id}</h3>
      <form onSubmit={handleSubmit}>
        
        {/* CAMPO NOMBRES */}
        <div className="mb-3">
          <label className="form-label fw-bold">Nombres Completos</label>
          <input 
            type="text" 
            className={`form-control ${errores.nombres ? 'is-invalid' : ''}`}
            name="nombres"
            value={empleado.nombres || ''} 
            onChange={handleChange}
          />
          {errores.nombres && <div className="invalid-feedback">{errores.nombres}</div>}
        </div>

       

        {
        <div className="mb-3">
          <label className="form-label fw-bold">Departamento</label>
          <input 
            type="text" 
            className="form-control"
            name="departamento"
            value={empleado.departamento || ''} 
            onChange={handleChange}
          />
        </div> 
        }

        <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-success px-4">Guardar Cambios</button>
            <button type="button" className="btn btn-secondary px-4" onClick={() => navigate("RRHH/asistencia_comedor")}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

export default Editar;
