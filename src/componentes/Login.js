import React, { useState } from 'react';
import logoSioret from '../imagenes/logo_sioretblanco.png';
import { fetchWithFallback } from './../config'; 
import imagenBienvenida from '../imagenes/Bellaflor.jpg'; 

function Login({ onLogin }) {
  // Almacenamiento modular para el login
  const [credentials, setCredentials] = useState({ user: '', pass: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Escucha los cambios de los inputs y limpia alertas previas
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
    if (error) setError(''); 
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const params = new URLSearchParams({
      nombre_usu: credentials.user,
      clave: credentials.pass
    });

    try {
      // Consume el endpoint unificado local/remoto
      const data = await fetchWithFallback(`/api/SISTEMA/usuario?${params}`, {
        method: 'GET'
      });

      // Valida la respuesta del recordset
      if (data && data.length > 0) {
        const usuarioEncontrado = data[0];
        onLogin({ 
          id: usuarioEncontrado.id, 
          nombre_usu: usuarioEncontrado.nombre_usu,
          nombre: usuarioEncontrado.nombre,
          idperfil: usuarioEncontrado.idperfil,
          id_empresa: usuarioEncontrado.id_empresa,
          departamento: usuarioEncontrado.departamento,
          id_dartis: usuarioEncontrado.id_dartis
        });
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      console.error("Error de conexión en ambas rutas:", err);
      setError('No se pudo conectar con el servidor (Local/Remoto).');
    } finally {
      setLoading(false);
    }
  };

    return (
    <div className="d-flex justify-content-center align-items-center vh-100" 
         style={{ background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' }}>
      
      <div className="card border-0 shadow-lg bg-white text-dark" style={{ width: '600px', borderRadius: '16px' }}>
        <div className="card-body p-5">
          
          {/* Encabezado Corporativo */}
          <div className="text-center mb-4">
            <div className="mb-3">

          <img src={imagenBienvenida} alt="Logo" style={{ width: '520px' }} />
          <img src={logoSioret} alt="Logo" style={{ width: '40px' }} />
              
            </div>
            <h2 className="fw-bold mb-0" style={{ color: '#126586ff', fontSize: '1.6rem' }}>SIORET TEAMS!</h2>
            <p className="small text-uppercase fw-bold mt-1" style={{ color: '#7e9638ff', letterSpacing: '1px' }}>
              Módulo de Acceso
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger py-2 small mb-3">
                <i className="bi bi-exclamation-circle-fill me-2"></i>
                {error}
              </div>
            )}

            {/* Input Usuario */}
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">USUARIO</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-secondary"><i className="bi bi-person-fill"></i></span>
                <input 
                  type="text" 
                  name="user"
                  value={credentials.user}
                  className="form-control bg-light border-start-0 text-dark shadow-none" 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary">CONTRASEÑA</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-secondary"><i className="bi bi-lock-fill"></i></span>
                <input 
                  type="password" 
                  name="pass"
                  value={credentials.pass}
                  className="form-control bg-light border-start-0 text-dark shadow-none" 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            {/* Botón de Entrada */}
            <button type="submit" className="btn w-100 py-2 fw-bold text-uppercase text-white shadow-sm border-0" 
                    style={{ backgroundColor: '#89a23ecb', transition: 'background 0.2s' }} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm"></span> : 'Ingresar'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <small className="text-secondary opacity-70">V1.10001 © 2026</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
