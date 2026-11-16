import React, { useState, useEffect } from 'react';
import { fetchWithFallback } from '../../config';
import { toast } from 'sonner';

const OpcionesMenu = () => {
    const [opciones, setOpciones] = useState([]);
    const [carpetasPadre, setCarpetasPadre] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [editandoId, setEditandoId] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    // Estados para el formulario de inserción
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevaRuta, setNuevaRuta] = useState('');
    const [nuevoIcono, setNuevoIcono] = useState('bi-folder-fill');
    const [padreSeleccionado, setPadreSeleccionado] = useState('');

    // Estado para el formulario de edición en línea
    const [formEdit, setFormEdit] = useState({
        nombre_opcion: '',
        ruta: '',
        icono: '',
        padre_id: ''
    });
    const fetchOpciones = async () => {
        try {
            setCargando(true);
            const res = await fetchWithFallback('/api/SISTEMAS/opciones-menu');
            const data = Array.isArray(res) ? res : [];
            setOpciones(data);
            
            // Filtramos únicamente las opciones maestras (carpetas) para el selector padre
            const padres = data.filter(item => item.padre_id === null);
            setCarpetasPadre(padres);
        } catch (error) {
            console.error("❌ Error al cargar opciones de menú:", error);
            toast.error("No se pudieron cargar los módulos maestros");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        fetchOpciones();
    }, []);

    const handleEditar = (item) => {
        setEditandoId(item.id);
        setFormEdit({
            nombre_opcion: item.nombre_opcion,
            ruta: item.ruta,
            icono: item.icono || '',
            padre_id: item.padre_id || ''
        });
    };
    const handleCrear = async (e) => {
        e.preventDefault();
        if (!nuevoNombre.trim() || !nuevaRuta.trim()) {
            return toast.warning("Nombre y Ruta son campos obligatorios");
        }

        const payload = {
            nombre_opcion: nuevoNombre,
            ruta: nuevaRuta,
            icono: nuevoIcono,
            padre_id: padreSeleccionado !== '' ? Number(padreSeleccionado) : null
        };

        try {
            // Nota: Debes crear el endpoint POST en tu backend de Node.js
            await fetchWithFallback('/api/SISTEMAS/crear-opcion-menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            toast.success("Módulo de menú registrado correctamente");
            setNuevoNombre('');
            setNuevaRuta('');
            setNuevoIcono('bi-folder-fill');
            setPadreSeleccionado('');
            fetchOpciones();
        } catch (error) {
            toast.error("Error al guardar el nuevo módulo");
        }
    };

    const handleGuardarEdit = async (id) => {
        if (!formEdit.nombre_opcion.trim() || !formEdit.ruta.trim()) {
            return toast.warning("Nombre y Ruta no pueden estar vacíos");
        }

        const payload = {
            nombre_opcion: formEdit.nombre_opcion,
            ruta: formEdit.ruta,
            icono: formEdit.icono || null,
            padre_id: formEdit.padre_id !== '' ? Number(formEdit.padre_id) : null
        };

        try {
            // Nota: Debes crear el endpoint PUT en tu backend de Node.js
            await fetchWithFallback(`/api/SISTEMAS/opciones-menu/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            toast.success("Módulo de menú actualizado");
            setEditandoId(null);
            fetchOpciones();
        } catch (error) {
            toast.error("Error al actualizar la configuración");
        }
    };

    const filtrados = opciones.filter(item => 
        item.nombre_opcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.ruta?.toLowerCase().includes(busqueda.toLowerCase())
    );
    return (
        <div className="container mt-4" style={{ color: '#333' }}>
            <h4 className="mb-3 text-primary">Configuración Maestra de Opciones de Menú</h4>

            {/* Formulario Crear */}
            <div className="card mb-4 shadow-sm border-primary">
                <div className="card-header bg-primary text-white">Nueva Opción o Módulo</div>
                <div className="card-body">
                    <form onSubmit={handleCrear} className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label fw-bold">Nombre Visible:</label>
                            <input type="text" className="form-control" placeholder="Ej: Registro Asistencia" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-bold">Ruta Enrutador (React Router):</label>
                            <input type="text" className="form-control" placeholder="Ej: /RRHH/asistencia" value={nuevaRuta} onChange={(e) => setNuevaRuta(e.target.value)} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-bold">Icono Bootstrap (Solo Padres):</label>
                            <input type="text" className="form-control" placeholder="Ej: bi-people-fill" value={nuevoIcono} onChange={(e) => setNuevoIcono(e.target.value)} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-bold">Pertenece a Carpeta (Padre):</label>
                            <select className="form-select" value={padreSeleccionado} onChange={(e) => setPadreSeleccionado(e.target.value)}>
                                <option value="">-- Ninguno (Es Carpeta Raíz) --</option>
                                {carpetasPadre.map(padre => (
                                    <option key={padre.id} value={padre.id}>{padre.nombre_opcion}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12 d-flex justify-content-end">
                            <button type="submit" className="btn btn-primary px-4">
                                <i className="bi bi-plus-circle"></i> Agregar al Sistema
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Buscador */}
            <div className="row mb-3">
                <div className="col-md-4">
                    <div className="input-group">
                        <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                        <input type="text" className="form-control" placeholder="Buscar por módulo o ruta..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    </div>
                </div>
            </div>
            {/* Tabla de Resultados */}
            <div className="table-responsive shadow-sm">
                <table className="table table-hover table-bordered align-middle bg-white">
                    <thead className="table-dark">
                        <tr>
                            <th style={{ width: '70px', color: 'grey', background: 'white' }} className="text-center">ID</th>
                            <th style={{ color: 'grey', background: 'white' }}>Módulo / Opción</th>
                            <th style={{ color: 'grey', background: 'white' }}>Ruta React</th>
                            <th style={{ width: '180px', color: 'grey', background: 'white' }}>Carpeta Padre</th>
                            <th style={{ width: '180px', color: 'black', background: 'white' }} className="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr><td colSpan="5" className="text-center py-4 text-muted">Cargando catálogo...</td></tr>
                        ) : filtrados.length > 0 ? (
                            filtrados.map((item) => {
                                const nombrePadre = carpetasPadre.find(p => Number(p.id) === Number(item.padre_id))?.nombre_opcion || "—";
                                return (
                                    <tr key={item.id}>
                                        <td className="text-center"><strong>{item.id}</strong></td>
                                        <td>
                                            {editandoId === item.id ? (
                                                <input type="text" className="form-control form-control-sm border-primary" value={formEdit.nombre_opcion} onChange={(e) => setFormEdit({ ...formEdit, nombre_opcion: e.target.value })} />
                                            ) : (
                                                <span className={item.padre_id === null ? "fw-bold text-primary" : ""}>
                                                    {item.padre_id === null ? "📁 " : "• "} {item.nombre_opcion}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {editandoId === item.id ? (
                                                <input type="text" className="form-control form-control-sm border-primary" value={formEdit.ruta} onChange={(e) => setFormEdit({ ...formEdit, ruta: e.target.value })} />
                                            ) : <code className="text-secondary">{item.ruta}</code>}
                                        </td>
                                        <td>
                                            {editandoId === item.id ? (
                                                <select className="form-select form-select-sm border-primary" value={formEdit.padre_id} onChange={(e) => setFormEdit({ ...formEdit, padre_id: e.target.value })}>
                                                    <option value="">-- Ninguno --</option>
                                                    {carpetasPadre.filter(p => Number(p.id) !== Number(item.id)).map(p => (
                                                        <option key={p.id} value={p.id}>{p.nombre_opcion}</option>
                                                    ))}
                                                </select>
                                            ) : <span>{nombrePadre}</span>}
                                        </td>
                                        <td className="text-center">
                                            {editandoId === item.id ? (
                                                <div className="btn-group w-100">
                                                    <button onClick={() => handleGuardarEdit(item.id)} className="btn btn-success btn-sm">OK</button>
                                                    <button onClick={() => setEditandoId(null)} className="btn btn-secondary btn-sm">X</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEditar(item)} className="btn btn-outline-primary btn-sm w-100">
                                                    <i className="bi bi-gear"></i> Modificar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="5" className="text-center text-muted p-4">No existen registros</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OpcionesMenu;
