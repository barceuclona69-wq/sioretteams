import React, { useState, useEffect } from 'react';
import { fetchWithFallback } from '../../config'; 
import { toast } from 'sonner'; 

const UsuariosWeb = () => { 
  const [datos, setDatos] = useState([]); 
  const [perfiles, setPerfiles] = useState([]); 
  const [listaDepartamentos, setListaDepartamentos] = useState([]); 
  const [cargando, setCargando] = useState(true); 
  const [editandoId, setEditandoId] = useState(null); 
  const [busqueda, setBusqueda] = useState(''); 


  
  const [nuevoUsuario, setNuevoUsuario] = useState({ 
    nombre_usu: '', idperfil: '', clave: '', nombre: '', id_empresa: '', departamento: '', id_dartis:''
  }); 
  const [formEdit, setFormEdit] = useState({ 
    nombre_usu: '', idperfil: '', clave: '', nombre: '', id_empresa: '', departamento: '' ,id_dartis:''
  }); 

  const LISTA_EMPRESAS = [ 
    { id: "5", nombre: "EXPOFLOR CIA. LTDA." }, 
    { id: "4", nombre: "AMAZINGROSES CIA LTDA" }, 
    { id: "10", nombre: "CAJA DE AHORROS BELLA FLOR" }, 
    { id: "3", nombre: "HIDDENGARDEN CIA LTDA" }, 
    { id: "12", nombre: "OASISFLOWER SAS" }, 
    { id: "13", nombre: "OASISORGANICS SAS" } 
  ];

  const fetchData = async () => { 
    try { 
      setCargando(true); 
      const [resUsuarios, resPerfiles, resDeptos] = await Promise.all([ 
        fetchWithFallback('/api/SISTEMA/usuario_web'), 
        fetchWithFallback('/api/SISTEMA/perfiles'), 
        fetchWithFallback('/api/DARTIS/Area_dartis') 
      ]); 
      
      setDatos(Array.isArray(resUsuarios) ? resUsuarios : (resUsuarios.recordset || resUsuarios.data || [])); 
      setPerfiles(Array.isArray(resPerfiles) ? resPerfiles : (resPerfiles.recordset || resPerfiles.data || [])); 
      
      let finalDeptos = []; 
      if (Array.isArray(resDeptos)) { 
        finalDeptos = resDeptos; 
      } else if (resDeptos.recordset) { 
        finalDeptos = resDeptos.recordset; 
      } else if (resDeptos.data) { 
        finalDeptos = Array.isArray(resDeptos.data) ? resDeptos.data : (resDeptos.data.recordset || []); 
      } 
      setListaDepartamentos(finalDeptos); 
    } catch (error) { 
      console.error("Error cargando datos:", error); 
      toast.error("Error al cargar catálogos"); 
    } finally { 
      setCargando(false); 
    } 
  }; 

  useEffect(() => { fetchData(); }, []);


  const handleCheckEmpresa = (idEmpresa, esEdicion = false) => { 
    const estadoActual = esEdicion ? formEdit : nuevoUsuario;
    const setEstado = esEdicion ? setFormEdit : setNuevoUsuario; 
    
    let lista = estadoActual.id_empresa ? String(estadoActual.id_empresa).split(',') : []; 
    if (lista.includes(idEmpresa)) { 
      lista = lista.filter(item => item !== idEmpresa); 
    } else { 
      lista.push(idEmpresa); 
    } 
    setEstado({ ...estadoActual, id_empresa: lista.join(',') }); 
  }; 

  const handleCheckboxChange = (nombre, esEdicion = false) => { 
    const estadoActual = esEdicion ? formEdit : nuevoUsuario; 
    const setEstado = esEdicion ? setFormEdit : setNuevoUsuario; 
    
    let lista = estadoActual.departamento ? estadoActual.departamento.split(',') : []; 
    if (lista.includes(nombre)) { 
      lista = lista.filter(item => item !== nombre); 
    } else { 
      lista.push(nombre); 
    }
    setEstado({ ...estadoActual, departamento: lista.join(',') }); 
  };
  const seleccionarTodosDeptos = (esEdicion = false) => { 
    const setEstado = esEdicion ? setFormEdit : setNuevoUsuario; 
    const actual = esEdicion ? formEdit.departamento : nuevoUsuario.departamento; 
    const todos = listaDepartamentos.map(d => d.nombre || d.departamento).filter(Boolean).join(','); 
    
    if (actual.split(',').filter(Boolean).length === listaDepartamentos.length) { 
      setEstado(prev => ({ ...prev, departamento: '' })); 
    } else { 
      setEstado(prev => ({ ...prev, departamento: todos })); 
    } 
  }; 

  const seleccionarTodasEmpresas = (esEdicion = false) => { 
    const setEstado = esEdicion ? setFormEdit : setNuevoUsuario; 
    const actual = esEdicion ? formEdit.id_empresa : nuevoUsuario.id_empresa; 
    const todas = LISTA_EMPRESAS.map(e => e.id).join(','); 
    
    if (actual.split(',').filter(Boolean).length === LISTA_EMPRESAS.length) { 
      setEstado(prev => ({ ...prev, id_empresa: '' })); 
    } else { 
      setEstado(prev => ({ ...prev, id_empresa: todas })); 
    } 
  };

  const handleCrear = async (e) => { 
    e.preventDefault(); 
    try { 
      await fetchWithFallback('/api/SISTEMA/usuario_web', { 
        method: 'POST', 
        body: JSON.stringify(nuevoUsuario), 
        headers: { 'Content-Type': 'application/json' } 
      }); 
      setNuevoUsuario({ nombre_usu: '', idperfil: '', clave: '', nombre: '', id_empresa: '', departamento: '', id_dartis: '' }); 
      fetchData(); 
      toast.success('Usuario creado con éxito'); 
    } catch (error) { toast.error('Error al crear usuario'); } 
  }; 

  const handleGuardar = async (id) => { 
    try { 
      await fetchWithFallback(`/api/SISTEMA/usuario_web/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(formEdit), 
        headers: { 'Content-Type': 'application/json' } 
      }); 
      setEditandoId(null); 
      fetchData(); 
      toast.success("Usuario actualizado"); 
    } catch (error) { toast.error("Error al actualizar"); } 
  }; 

  const obtenerNombrePerfil = (id) => perfiles.find(p => String(p.id) === String(id))?.nombre || `ID: ${id}`;
  if (cargando && datos.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  } 

  return ( 
    <div className="container-fluid mt-4 px-4"> 
      <div className="d-flex align-items-center mb-4 pb-2 border-bottom">
        <h4 className="m-0 fw-bold" style={{ color: '#92b91c' }}>Gestión de Usuarios Web</h4> 
      </div>

      <div className="card mb-4 shadow-sm border-0" style={{ borderRadius: '8px', overflow: 'hidden' }}> 
        <div className="card-header text-white py-2 small fw-bold" style={{ backgroundColor: '#92b91c' }}>Registrar Nuevo Usuario</div> 
        <div className="card-body py-3 bg-light"> 
          <form onSubmit={handleCrear} className="row g-2 align-items-end"> 
            <div className="col-md-2"> 
              <label className="small fw-bold text-secondary">Login:</label> 
              <input type="text" className="form-control form-control-sm" value={nuevoUsuario.nombre_usu} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, nombre_usu: e.target.value})} required /> 
            </div> 
            <div className="col-md-2"> 
              <label className="small fw-bold text-secondary">Perfil:</label> 
              <select className="form-select form-select-sm" value={nuevoUsuario.idperfil} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, idperfil: e.target.value})} required> 
                <option value="">Seleccione...</option> 
                {perfiles.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)} 
              </select> 
            </div> 
            <div className="col-md-1"> 
              <label className="small fw-bold text-secondary">Clave:</label> 
              <input type="password" className="form-control form-control-sm" value={nuevoUsuario.clave} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, clave: e.target.value})} required /> 
            </div> 
            <div className="col-md-2"> 
              <label className="small fw-bold text-secondary">Nombre Real:</label> 
              <input type="text" className="form-control form-control-sm" value={nuevoUsuario.nombre} onChange={(e)=>setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} required /> 
            </div> 
            <div className="col-md-2"> 
              <label className="small fw-bold" style={{ color: '#387a57' }}>Asignar Empresas:</label> 
              <div className="border rounded bg-white p-2" style={{ height: '100px', overflowY: 'auto' }}> 
                <div className="form-check border-bottom mb-1 pb-1"> 
                  <input className="form-check-input" type="checkbox" id="chkTodasEmpresas" checked={nuevoUsuario.id_empresa.split(',').filter(Boolean).length === LISTA_EMPRESAS.length} onChange={() => seleccionarTodasEmpresas(false)} /> 
                  <label className="form-check-label small fw-bold text-success" htmlFor="chkTodasEmpresas" style={{ fontSize: '10px' }}>-- TODAS --</label> 
                </div> 
                {LISTA_EMPRESAS.map((emp) => ( 
                  <div key={emp.id} className="form-check"> 
                    <input className="form-check-input" type="checkbox" id={`crear-emp-${emp.id}`} checked={nuevoUsuario.id_empresa.split(',').includes(emp.id)} onChange={() => handleCheckEmpresa(emp.id, false)} /> 
                    <label className="form-check-label text-dark" style={{ fontSize: '10px' }} htmlFor={`crear-emp-${emp.id}`}>{emp.nombre}</label> 
                  </div> 
                ))} 
              </div> 
            </div>

            <div className="col-md-2"> 
              <label className="small fw-bold" style={{ color: '#2c5e43' }}>Asignar Deptos:</label> 
              <div className="border rounded bg-white p-2" style={{ height: '100px', overflowY: 'auto' }}> 
                {listaDepartamentos.length > 0 && ( 
                  <div className="form-check border-bottom mb-1 pb-1"> 
                    <input className="form-check-input" type="checkbox" id="chkTodosDeptos" checked={nuevoUsuario.departamento.split(',').filter(Boolean).length === listaDepartamentos.length} onChange={() => seleccionarTodosDeptos(false)} /> 
                    <label className="form-check-label small fw-bold text-success" htmlFor="chkTodosDeptos" style={{ fontSize: '10px' }}>-- TODOS --</label> 
                  </div> 
                )} 
                {listaDepartamentos.map((d) => { 
                  const nombreDepto = d.nombre || d.departamento; 
                  return ( 
                    <div key={d.id} className="form-check"> 
                      <input className="form-check-input" type="checkbox" id={`depto-${d.id}`} checked={nuevoUsuario.departamento.split(',').includes(nombreDepto)} onChange={() => handleCheckboxChange(nombreDepto, false)} /> 
                      <label className="form-check-label small text-dark" htmlFor={`depto-${d.id}`} style={{ fontSize: '10px' }}>{nombreDepto}</label> 
                    </div> 
                  ); 
                })} 
              </div> 
            </div> 
            <div className="col-md-1"> 
              <button type="submit" className="btn btn-sm w-100 fw-bold text-white shadow-sm" style={{ backgroundColor: '#387a57' }}>Registrar</button> 
            </div> 
          </form> 
        </div> 
      </div> 

      <div className="row mb-3"> 
        <div className="col-md-4"> 
          <div className="input-group input-group-sm shadow-sm"> 
            <span className="input-group-text text-white fw-bold border-0" style={{ backgroundColor: '#92b91c' }}>Buscar:</span> 
            <input type="text" className="form-control" placeholder="ID, login, nombre o depto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /> 
            {busqueda && <button className="btn btn-outline-secondary" type="button" onClick={() => setBusqueda('')}>✕</button>} 
          </div> 
        </div> 
      </div> 
 
      <div className="table-responsive bg-white rounded shadow-sm border"> 
        <table className="table table-sm table-hover align-middle mb-0"> 
          <thead className="small text-white" style={{ backgroundColor: '#92b91c' }}> 
            <tr> 
              <th className="text-center py-2" style={{ width: '60px' }}>ID</th> 
              <th>Usuario</th> <th>Perfil</th> <th>Nombre Real</th> <th>Empresas</th> <th>Departamentos</th> <th>ID_DARTIS</th> 
              <th className="text-center" style={{ width: '120px' }}>Acciones</th> 
            </tr> 
          </thead> 
          <tbody style={{ fontSize: '0.85rem' }}> 
            {datos.filter((i) => { 
              const termino = busqueda.toLowerCase(); 
              return i.id?.toString().includes(termino) || i.nombre?.toLowerCase().includes(termino) || i.nombre_usu?.toLowerCase().includes(termino) || i.departamento?.toLowerCase().includes(termino); 
            }).map((item) => ( 
              <tr key={item.id} className={editandoId === item.id ? "table-light" : ""}> 
                <td className="text-center text-muted fw-bold">{item.id}</td> 
                <td>{editandoId === item.id ? <input className="form-control form-control-sm" value={formEdit.nombre_usu} onChange={e => setFormEdit({...formEdit, nombre_usu: e.target.value})} /> : item.nombre_usu}</td> 
                <td>{editandoId === item.id ? <select className="form-select form-select-sm" value={formEdit.idperfil} onChange={e => setFormEdit({...formEdit, idperfil: e.target.value})}>{perfiles.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select> : obtenerNombrePerfil(item.idperfil)}</td> 
                <td>{editandoId === item.id ? <input className="form-control form-control-sm" value={formEdit.nombre} onChange={e => setFormEdit({...formEdit, nombre: e.target.value})} /> : item.nombre}</td> 
                
                <td>{editandoId === item.id ? ( 
                  <div className="border rounded bg-white p-2" style={{ maxHeight: '100px', overflowY: 'auto', minWidth: '150px' }}> 
                    <div className="form-check border-bottom mb-1 pb-1"> 
                      <input className="form-check-input" type="checkbox" id={`edit-all-emp-${item.id}`} checked={formEdit.id_empresa?.split(',').filter(Boolean).length === LISTA_EMPRESAS.length} onChange={() => seleccionarTodasEmpresas(true)} /> 
                      <label className="form-check-label small fw-bold text-success" htmlFor={`edit-all-emp-${item.id}`} style={{ fontSize: '10px' }}>TODAS</label> 
                    </div> 
                    {LISTA_EMPRESAS.map((emp) => ( 
                      <div key={emp.id} className="form-check"> 
                        <input className="form-check-input" type="checkbox" id={`edit-emp-${item.id}-${emp.id}`} checked={formEdit.id_empresa?.split(',').includes(emp.id)} onChange={() => handleCheckEmpresa(emp.id, true)} /> 
                        <label className="form-check-label" style={{ fontSize: '10px' }} htmlFor={`edit-emp-${item.id}-${emp.id}`}>{emp.nombre}</label> 
                      </div> 
                    ))} 
                  </div> 
                ) : <span className="badge px-2 py-1" style={{ backgroundColor: '#e2eee6', color: '#92b91c' }}>{item.id_empresa || '—'}</span>}</td> 
                <td>{editandoId === item.id ? ( 
                  <div className="border rounded bg-white p-2" style={{ maxHeight: '100px', overflowY: 'auto', minWidth: '180px' }}> 
                    <div className="form-check border-bottom mb-1 pb-1"> 
                      <input className="form-check-input" type="checkbox" id={`todos-edit-${item.id}`} checked={formEdit.departamento?.split(',').filter(Boolean).length === listaDepartamentos.length} onChange={() => seleccionarTodosDeptos(true)} /> 
                      <label className="form-check-label small fw-bold text-success" htmlFor={`todos-edit-${item.id}`}>TODOS</label> 
                    </div> 
                   
                
                    {listaDepartamentos.map((d) => { 
                      const nombreDepto = d.nombre || d.departamento; 
                      return ( 
                        <div key={d.id} className="form-check"> 
                          <input className="form-check-input" type="checkbox" id={`edit-${item.id}-${d.id}`} checked={formEdit.departamento?.split(',').includes(nombreDepto)} onChange={() => handleCheckboxChange(nombreDepto, true)} /> 
                          <label className="form-check-label small" htmlFor={`edit-${item.id}-${d.id}`}>{nombreDepto}</label> 
                        </div> 
                      ); 
                    })} 
                  </div> 
                  
                ) : <div className="text-truncate" style={{ maxWidth: '180px', fontSize: '0.75rem' }} title={item.departamento}>{item.departamento || '—'}</div>}</td> 
                <td>{editandoId === item.id ? <input className="form-control form-control-sm" value={formEdit.id_dartis} onChange={e => setFormEdit({...formEdit, id_dartis: e.target.value})} /> : item.id_dartis}</td> 
           
               
                <td className="text-center"> 
                  {editandoId === item.id ? ( 
                    <div className="btn-group btn-group-sm shadow-sm"> 
                      <button className="btn btn-success px-2 py-0" onClick={() => handleGuardar(item.id)}>✓</button> 
                      <button className="btn btn-danger px-2 py-0" onClick={() => setEditandoId(null)}>✕</button> 
                    </div> 
                  ) : <button className="btn btn-sm py-0 px-2 btn-outline-secondary" style={{ color: '#92b91c', borderColor: '#92b91c' }} onClick={() => { setEditandoId(item.id); setFormEdit({...item}); }}>Editar</button>} 
                </td> 
              </tr> 
            ))} 
          </tbody> 
        </table> 
      </div> 
    </div> 
  ); 
}; 

export default UsuariosWeb;
