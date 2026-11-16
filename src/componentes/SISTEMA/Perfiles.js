import React, { useState, useEffect } from 'react';
import { fetchWithFallback } from '../../config';
import { toast } from 'sonner';

const Perfiles = () => {
    const [datos, setDatos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [editandoId, setEditandoId] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    
    // Estados para formularios de nombre
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [formEdit, setFormEdit] = useState({ nombre: '' });

    // NUEVOS ESTADOS para el mapeo Perfiles vs Opciones del menú
    const [opcionesMenu, setOpcionesMenu] = useState([]);
    const [perfilPermisoId, setPerfilPermisoId] = useState(null);
    const [permisosActivos, setPermisosActivos] = useState([]);
    const [cargandoPermisos, setCargandoPermisos] = useState(false);
    const [guardandoPermisos, setGuardandoPermisos] = useState(false);
    const fetchPerfiles = async () => {
        try {
            setCargando(true);
            const res = await fetchWithFallback('/api/SISTEMA/perfiles');
            const data = Array.isArray(res) ? res : (res.recordset || res.data || []);
            setDatos(data);
        } catch (error) { 
            console.error("Error al cargar perfiles:", error); 
        } finally { 
            setCargando(false); 
        }
    };

    const fetchOpcionesMenu = async () => {
        try {
            const res = await fetchWithFallback('/api/SISTEMAS/opciones-menu');
            if (res) setOpcionesMenu(res);
        } catch (error) {
            console.error("Error al cargar opciones maestras:", error);
        }
    };

    useEffect(() => { 
        fetchPerfiles(); 
        fetchOpcionesMenu();
    }, []);

    // Abre el panel inferior de permisos y carga los checkboxes correspondientes
    const abrirConfiguracionPermisos = async (idPerfil) => {
        setPerfilPermisoId(idPerfil);
        setCargandoPermisos(true);
        try {
            const res = await fetchWithFallback(
                `/api/SISTEMAS/permisos-por-perfil?idperfil=${idPerfil}`
            );
            if (res && Array.isArray(res)) {
                const ids = res.map(item => Number(item.opcion_menu_id));
                setPermisosActivos(ids);
            } else {
                setPermisosActivos([]);
            }
        } catch (error) {
            console.error("Error al recuperar permisos:", error);
            toast.error("No se pudieron cargar los accesos del perfil");
        } finally {
            setCargandoPermisos(false);
        }
    };
    const handleCrear = async (e) => {
        e.preventDefault();
        if (!nuevoNombre.trim()) return toast.warning("El nombre es obligatorio");
        try {
            await fetchWithFallback('/api/SISTEMA/perfiles', {
                method: 'POST',
                body: JSON.stringify({ nombre: nuevoNombre }),
                headers: { 'Content-Type': 'application/json' }
            });
            setNuevoNombre('');
            fetchPerfiles(); 
            toast.success('Perfil creado con éxito');
        } catch (error) {
            toast.error('Hubo un error al crear el perfil');
        }
    };

    const handleEditar = (item) => {
        setEditandoId(item.id);
        setFormEdit({ nombre: item.nombre });
    };

    const handleGuardar = async (id) => {
        if (!formEdit.nombre.trim()) return toast.warning("El nombre no puede estar vacío");
        try {
            await fetchWithFallback(`/api/SISTEMA/perfiles/${id}`, {
                method: 'PUT',
                body: JSON.stringify(formEdit),
                headers: { 'Content-Type': 'application/json' }
            });
            setEditandoId(null);
            fetchPerfiles(); 
            toast.success('Perfil actualizado con éxito');
        } catch (error) {
            toast.error('Hubo un error al guardar los cambios');
        }
    };

    const handleCheckboxChange = (opcionId) => {
        const id = Number(opcionId);
        setPermisosActivos(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const guardarNuevosPermisos = async () => {
        setGuardandoPermisos(true);
        try {
            await fetchWithFallback('/api/SISTEMAS/guardar-permisos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idperfil: Number(perfilPermisoId),
                    opciones: permisosActivos
                })
            });
            toast.success("Accesos del menú actualizados de forma correcta");
            setPerfilPermisoId(null);
        } catch (error) {
            console.error(error);
            toast.error("No se pudieron guardar las modificaciones");
        } finally {
            setGuardandoPermisos(false);
        }
    };

    const datosFiltrados = datos.filter((item) => 
        item.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (cargando && datos.length === 0) {
        return <div className="container mt-4 text-center">Cargando perfiles...</div>;
    }
    return (
        <div className="container mt-4" style={{ color: '#333' }}>
            <h4 className="mb-3 text-primary">Gestión de Perfiles y Accesos</h4>

            {/* Formulario Crear */}
            <div className="card mb-4 shadow-sm border-primary">
                <div className="card-header bg-primary text-white">Nuevo Perfil</div>
                <div className="card-body">
                    <form onSubmit={handleCrear} className="row g-2">
                        <div className="col-md-9">
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="Nombre del nuevo perfil (ej: Supervisor)" 
                                value={nuevoNombre}
                                onChange={(e) => setNuevoNombre(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <button type="submit" className="btn btn-primary w-100">
                                <i className="bi bi-plus-circle"></i> Crear Perfil
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Buscador */}
            <div className="row mb-3">
                <div className="col-md-4">
                    <div className="input-group">
                        <span className="input-group-text bg-white border-end-0"><i className="bi bi-search"></i></span>
                        <input 
                            type="text" 
                            className="form-control border-start-0" 
                            placeholder="Filtrar por nombre..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Tabla Principal */}
            <div className="table-responsive shadow-sm mb-4">
                <table className="table table-hover table-bordered align-middle">
                    <thead className="table-dark">
                        <tr>
                           <th style={{width: '70px', color:'grey', background:'white'}} className="text-center">ID</th>
                           <th style={{color:'grey', background:'white'}} >Nombre del Perfil</th>
                           <th style={{width: '280px', color:'black', background:'white'}} className="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datosFiltrados.length > 0 ? (
                            datosFiltrados.map((item) => (
                                <tr key={item.id} style={{ backgroundColor: perfilPermisoId === item.id ? '#f0fdf4' : 'transparent' }}>
                                    <td className="text-center"><strong>{item.id}</strong></td>
                                    <td>
                                        {editandoId === item.id ? (
                                            <input 
                                                type="text" 
                                                className="form-control form-control-sm border-primary"
                                                value={formEdit.nombre}
                                                onChange={(e) => setFormEdit({ nombre: e.target.value })}
                                                autoFocus
                                            />
                                        ) : (
                                            <span>{item.nombre}</span>
                                        )}
                                    </td>
                                    <td>
                                        {editandoId === item.id ? (
                                            <div className="btn-group w-100 shadow-sm">
                                                <button onClick={() => handleGuardar(item.id)} className="btn btn-success btn-sm">Guardar</button>
                                                <button onClick={() => setEditandoId(null)} className="btn btn-secondary btn-sm">Cancelar</button>
                                            </div>
                                        ) : (
                                            <div className="d-flex gap-2">
                                                <button onClick={() => handleEditar(item)} className="btn btn-outline-primary btn-sm flex-grow-1">
                                                    <i className="bi bi-pencil"></i> Editar
                                                </button>
                                                <button onClick={() => abrirConfiguracionPermisos(item.id)} className="btn btn-success btn-sm flex-grow-1">
                                                    <i className="bi bi-shield-lock"></i> Accesos Menu
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="text-center text-muted p-4">No se encontraron perfiles</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* NUEVA SECCIÓN DINÁMICA: Panel de asignación de Checkboxes */}
            {perfilPermisoId && (
                <div className="card shadow-lg border-success border-2 mt-4 fade-in">
                    <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                            Configurando Opciones de Menú para el Perfil ID: {perfilPermisoId}
                        </h5>
                        <button className="btn-close btn-close-white" onClick={() => setPerfilPermisoId(null)}></button>
                    </div>
                    <div className="card-body bg-light" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {cargandoPermisos ? (
                            <div className="text-center py-3 text-muted">Cargando accesos autorizados...</div>
                        ) : (
                            <div className="row g-3">
                                {opcionesMenu.map((opc) => (
                                    <div className="col-md-6 col-lg-4" key={opc.id}>
                                        <div className="p-2 bg-white rounded border d-flex align-items-center justify-content-between shadow-sm">
                                            <div>
                                                <span className={opc.padre_id === null ? "fw-bold text-primary" : "text-secondary"}>
                                                    {opc.padre_id === null ? "📁 " : "• "} {opc.nombre_opcion}
                                                </span>
                                                <div style={{ fontSize: '0.75rem' }} className="text-muted font-monospace">{opc.ruta}</div>
                                            </div>
                                            <input 
                                                type="checkbox"
                                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                                checked={permisosActivos.includes(Number(opc.id))}
                                                onChange={() => handleCheckboxChange(opc.id)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="card-footer bg-white d-flex justify-content-end gap-2">
                        <button className="btn btn-secondary" onClick={() => setPerfilPermisoId(null)}>
                            Cerrar Panel
                        </button>
                        <button className="btn btn-success px-4" onClick={guardarNuevosPermisos} disabled={guardandoPermisos}>
                            {guardandoPermisos ? "Guardando..." : "Aplicar Accesos al Perfil"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Perfiles;
