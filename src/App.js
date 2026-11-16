import React, { useState, useEffect } from 'react';
import {
  Route,
  BrowserRouter as Router,
  Routes,
  NavLink
} from "react-router-dom";
import logoSioret from './imagenes/logo_sioret.png';
import { Toaster, toast } from 'sonner';
import { fetchWithFallback } from './config';

import AsistenciaComedor from "./componentes/RRHH/Asistencia_comedor";
import Replavanderia from "./componentes/REPORTES/Rep_lavanderia";
import Repasistencia from "./componentes/REPORTES/Rep_asistencia";
import Replaptario from "./componentes/REPORTES/Rep_laptario";
import Repcomedor from "./componentes/REPORTES/Rep_comedor";
import Repalertabiometrico from "./componentes/REPORTES/Rep_alerta_biometrico";
import Repstandingcoparacion from "./componentes/REPORTES/Rep_standing_coparacion";
import Repmarcacion from "./componentes/REPORTES/Rep_marcacion";
import Login from "./componentes/Login";
import Sucursalesdartis from "./componentes/DARTIS/Sucursales_dartis";
import Fitregistro from "./componentes/FIT/fit_registro";
import Repalmmerfact from "./componentes/REPORTES/Rep_alm_mer_fact";
import Repalmmerdesref from "./componentes/REPORTES/Rep_alm_mer_des_ref";
import Repalmmerdescom from "./componentes/REPORTES/Rep_alm_mer_des_comedor";
import Repalmmerfactagrupado from "./componentes/REPORTES/Rep_alm_mer_fact_agrupado";
import Repalmmerfactagrupado2 from "./componentes/REPORTES/Rep_alm_mer_fact_agrupado2";
import PeriodoCierre from "./componentes/RRHH/Periodo_cierre";
import UsuariosWeb from "./componentes/SISTEMA/Usuarios_web";
import PerfilesWeb from "./componentes/SISTEMA/Perfiles";
import AsistenciaComedor2 from "./componentes/RRHH/Asistencia_comedor2";
import HorasCultivo from "./componentes/RRHH/Horas_cultivo";
import HorasRendimiento from "./componentes/RRHH/Horas_rendimiento";
import VacacionesRrhh from "./componentes/RRHH/Vacaciones_rrhh";
import Rfid from "./componentes/RFID/rfid";
import Rfidmovil from "./componentes/RFID/rfidmovil";
import Rfidcontrolcalidad from "./componentes/RFID/rfid_controlcalidad";
import Rfidtagretirado from "./componentes/RFID/rfid_tagretirado";
import Empleadorrhhperfil from "./componentes/RRHH/Empleado_rrhh_perfil";
import Talleres from "./componentes/APRENDIZAJE/Taller";
import Configaprendizaje from "./componentes/APRENDIZAJE/Config_aprendizaje";
import Recetas from "./componentes/DARTIS/Recetas";
import Recetasdartis from "./componentes/DARTIS/Recetas_dartis";
import Informe from './componentes/TS/informe';
import OpcionesMenu from './componentes/SISTEMA/OpcionesMenu';
import "./App.css";
import imagenBienvenida from './imagenes/Bellaflor.jpg';

const MenuSection = ({ id, title, icon, isOpen, onToggle, children }) => {
  return (
    <li className="nav-item mb-1">
      <div
        className={`nav-link d-flex align-items-center justify-content-between p-3 rounded-3 text-white transition-all ${isOpen ? 'bg-white bg-opacity-10 text-white shadow-sm' : 'hover-link'}`}
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          border: isOpen ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent'
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <i
            className={`bi ${icon || 'bi-folder-fill'} fs-5`}
            style={isOpen ? { color: '#92b91c' } : { color: 'rgba(255,255,255,0.7)' }}
          ></i>
          <span className="fw-medium" style={{ fontSize: '0.85rem', letterSpacing: '0.3px' }}>
            {title}
          </span>
        </div>
        <i
          className={`bi bi-chevron-down small transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={isOpen ? { color: '#92b91c' } : { color: 'rgba(255,255,255,0.5)' }}
        ></i>
      </div>
      <div className={`submenu-collapse ${isOpen ? 'show' : ''}`}>
        <div
          className="d-flex flex-column gap-1 py-2 ps-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', borderRadius: '0 0 12px 12px' }}
        >
          {children}
        </div>
      </div>
    </li>
  );
};
function App() {
  const nombresPerfiles = {
    1: "ADMINISTRADOR",
    2: "OPERADOR",
    3: "RRHH",
    4: "MEDICINA",
    5: "TRABAJO SOCIAL"
  };

  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("auth") === "true");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuDinamico, setMenuDinamico] = useState([]);
  const [avatar, setAvatar] = useState(() => localStorage.getItem("userAvatar") || logoSioret);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [conteoVacacionesPendientes, setConteoVacacionesPendientes] = useState(0);
  const [conteoPermisosPendientes, setConteoPermisosPendientes] = useState(0);
  const [conteoTSPendientes, setConteoTSPendientes] = useState(0);
  const [openMenu, setOpenMenu] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("userData");
    const defaultUser = { id: null, nombre: 'Usuario', idperfil: null, id_empresa: '', departamento: '', id_dartis: null };
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch (e) { return defaultUser; }
    }
    return defaultUser;
  });

  useEffect(() => { setOnlineCount(1); }, []);
  useEffect(() => { localStorage.setItem("auth", isAuthenticated); }, [isAuthenticated]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const cargarAlertasMenu = async () => {
      if (!isAuthenticated) return;
      try {
        const resPermisos = await fetchWithFallback('/api/RRHH/conteo_solicitudes_permiso');
        const dataPermisos = resPermisos?.data || resPermisos || [];
        const totalP = dataPermisos.reduce((acc, curr) => acc + (Number(curr.total_permisos) || 0), 0);
        setConteoPermisosPendientes(totalP);

        const resTS = await fetchWithFallback('/api/RRHH/conteo_solicitudes_permiso_TS');
        const dataTS = resTS?.data || resTS || [];
        const totalTS = dataTS.reduce((acc, curr) => acc + (Number(curr.total_permisos) || 0), 0);
        setConteoTSPendientes(totalTS);

        const resVacaciones = await fetchWithFallback('/api/RRHH/informacion_vacaciones?año=' + new Date().getFullYear());
        const dataVacaciones = resVacaciones?.data || resVacaciones || [];
        const totalV = dataVacaciones.reduce((acc, curr) => acc + (Number(curr.total_solicitudes) || 0), 0);
        setConteoVacacionesPendientes(totalV);
      } catch (error) {
        console.error("Error cargando las alertas del menú lateral:", error);
      }
    };

    cargarAlertasMenu();
    const intervalAlertas = setInterval(cargarAlertasMenu, 30000);
    return () => clearInterval(intervalAlertas);
  }, [isAuthenticated]);

  const toggleMenu = (menuId) => {
    setOpenMenu(openMenu === menuId ? null : menuId);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser({ id: null, nombre: '', idperfil: null, id_empresa: '', departamento: '', id_dartis: '' });
    setMenuDinamico([]);
    localStorage.clear();
    toast.info("Sesión cerrada correctamente");
    setTimeout(() => { window.location.href = "/"; }, 1000);
  };

  useEffect(() => {
    const cargarMenuUsuario = async () => {
      if (!isAuthenticated || !user?.idperfil) return;
      try {
        const endpoint = `/api/SISTEMAS/permisos-por-perfil?idperfil=${user.idperfil}`;
        const dataPermisos = await fetchWithFallback(endpoint);
        if (dataPermisos && Array.isArray(dataPermisos)) {
          const opcionesMaestras = await fetchWithFallback('/api/SISTEMAS/opciones-menu');
          if (opcionesMaestras && Array.isArray(opcionesMaestras)) {
            const idsPermitidos = dataPermisos.map(p => Number(p.opcion_menu_id));
            const opcionesFiltradas = opcionesMaestras.filter(o => idsPermitidos.includes(Number(o.id)));
            const carpetasPadre = opcionesFiltradas.filter(o => o.padre_id === null);
            const estructuraMenu = carpetasPadre.map(padre => {
              const hijos = opcionesFiltradas.filter(o => Number(o.padre_id) === Number(padre.id));
              return { ...padre, submenus: hijos };
            });
            setMenuDinamico(estructuraMenu);
          }
        }
      } catch (error) {
        console.error("Error al procesar menú dinámico:", error.message);
        toast.error("No se pudo construir la barra de navegación.");
      }
    };
    cargarMenuUsuario();
  }, [isAuthenticated, user?.idperfil]);
  if (!isAuthenticated) {
    return (
      <>
        <Toaster richColors position="top-center" />
        <Login onLogin={(userData) => {
          setIsAuthenticated(true);
          setUser(userData);
          localStorage.setItem("auth", "true");
          localStorage.setItem("userData", JSON.stringify(userData));
          toast.success(`Bienvenido/a ${userData.nombre}`);
        }} />
      </>
    );
  }

  const totalTramites = conteoVacacionesPendientes + conteoPermisosPendientes + conteoTSPendientes;
  const pctVacaciones = totalTramites > 0 ? Math.round((conteoVacacionesPendientes / totalTramites) * 100) : 34;
  const pctPermisos = totalTramites > 0 ? Math.round((conteoPermisosPendientes / totalTramites) * 100) : 33;
  const pctTS = totalTramites > 0 ? Math.max(0, 100 - pctVacaciones - pctPermisos) : 33;

  const datosBarras = [
    { dia: 'Lunes', asistencias: 94, atrasos: 6 },
    { dia: 'Martes', asistencias: 97, atrasos: 3 },
    { dia: 'Miércoles', asistencias: 92, atrasos: 8 },
    { dia: 'Jueves', asistencias: 98, atrasos: 2 },
    { dia: 'Viernes', asistencias: 91, atrasos: 9 },
  ];

  return (
    <Router>
      <Toaster
        position="top-center"
        expand={true}
        richColors
        toastOptions={{
          style: { fontSize: '1.1rem', padding: '20px 25px', width: '400px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' },
          success: { style: { background: '#fff', border: '2px solid #92b91c', color: '#2c3e50' } },
          error: { style: { background: '#fff', border: '2px solid #e53e3e', color: '#742a2a' } },
          info: { style: { background: '#fff', border: '2px solid #92b91c', color: '#2c3e50' } }
        }}
      />
      <style>{`
        .transition-all { transition: all 0.3s ease-in-out; }
        .transition-transform { transition: transform 0.3s ease; }
        .rotate-180 { transform: rotate(180deg); }
        .hover-link:hover { background-color: rgba(255,255,255,0.05); color: #92b91c !important; }
        .hover-link:hover i { color: #92b91c !important; }
        .submenu-collapse { max-height: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0, 1, 0, 1); background: rgba(0,0,0,0.1); border-radius: 0 0 10px 10px; }
        .submenu-collapse.show { max-height: 500px; transition: max-height 0.4s ease-in-out; }
        .sub-link { text-decoration: none; color: rgba(255,255,255,0.6); font-size: 0.85rem; padding: 8px 15px; border-left: 2px solid transparent; transition: all 0.2s; }
        .sub-link:hover, .sub-link.active { color: #92b91c !important; border-left: 2px solid #92b91c !important; background: rgba(146, 185, 28, 0.05); }
        .kpi-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important; }
      `}</style>
      <div className="d-flex min-vh-100 bg-light">
        <aside
          className="bg-dark text-white shadow-lg d-flex flex-column sticky-top transition-all"
          style={{ width: sidebarOpen ? '280px' : '0px', minWidth: sidebarOpen ? '280px' : '0px', height: '100vh', overflow: 'hidden', opacity: sidebarOpen ? 1 : 0 }}
        >
          <div className="p-4 border-bottom border-secondary border-opacity-25" style={{ minWidth: '280px' }}>
            <div className="d-flex align-items-center gap-3">
              <img src={logoSioret} alt="Logo" style={{ width: '40px' }} />
              <div>
                <h6 className="mb-0 fw-bold letter-spacing-1">SIORET TEAMS</h6>
                <span className="badge text-white" style={{ fontSize: '0.6rem', backgroundColor: '#92b91c' }}>V1.10001</span>
              </div>
            </div>
          </div>

          <ul className="nav flex-column px-3 mt-3 flex-grow-1 overflow-auto" style={{ minWidth: '280px' }}>
            <li className="nav-item mb-1">
              <NavLink
                to="/"
                className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 transition-all ${isActive ? 'text-white shadow-sm' : 'text-secondary hover-bg-light'}`}
                style={({ isActive }) => isActive ? { backgroundColor: '#92b91c' } : {}}
              >
                <i className="bi bi-house-door-fill fs-5 lh-1"></i>
                <span className="fw-semibold text-uppercase small tracking-wider">Principal</span>
              </NavLink>
            </li>

            {menuDinamico.map((seccion) => (
              <MenuSection
                key={seccion.id}
                id={seccion.id.toString()}
                title={seccion.nombre_opcion}
                icon={seccion.icono}
                isOpen={openMenu === seccion.id.toString()}
                onToggle={() => toggleMenu(seccion.id.toString())}
              >
                {seccion.submenus && seccion.submenus.length > 0 ? (
                  seccion.submenus.map((sub) => {
                    const esModuloVacaciones = sub.ruta === "/RRHH/vacaciones_rrhh";
                    return (
                      <NavLink key={sub.id} to={sub.ruta} className="sub-link d-flex align-items-center justify-content-between w-100">
                        <span>• {sub.nombre_opcion}</span>
                        <div className="d-flex align-items-center gap-1 ms-auto">
                          {esModuloVacaciones && conteoVacacionesPendientes > 0 && (
                            <span className="badge rounded-pill bg-danger text-white" style={{ fontSize: '10px', padding: '3px 6px' }}>
                              {conteoVacacionesPendientes}
                            </span>
                          )}
                          {esModuloVacaciones && conteoPermisosPendientes > 0 && (
                            <span className="badge rounded-pill bg-warning text-dark" style={{ fontSize: '10px', padding: '3px 6px', fontWeight: 'bold' }}>
                              {conteoPermisosPendientes}
                            </span>
                          )}
                          {esModuloVacaciones && conteoTSPendientes > 0 && (
                            <span className="badge rounded-pill text-white" style={{ fontSize: '10px', padding: '3px 6px', fontWeight: 'bold', backgroundColor: '#0284c7' }}>
                              {conteoTSPendientes}
                            </span>
                          )}
                        </div>
                      </NavLink>
                    );
                  })
                ) : (
                  <NavLink to={seccion.ruta} className="sub-link">• Ir a {seccion.nombre_opcion}</NavLink>
                )}
              </MenuSection>
            ))}
          </ul>

          <div className="p-3 mt-auto" style={{ minWidth: '280px' }}>
            <button
              onClick={handleLogout}
              className="btn w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 transition-all border-0 fw-semibold text-white-50"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', fontSize: '0.85rem', letterSpacing: '0.5px' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#92b91c'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.color = ''; }}
            >
              <i className="bi bi-box-arrow-left fs-5"></i> Cerrar Sesión
            </button>
          </div>
        </aside>
        <main className="flex-grow-1 d-flex flex-column" style={{ overflowX: 'hidden' }}>
          <header className="navbar navbar-white bg-white border-bottom shadow-sm px-4 py-3 sticky-top">
            <div className="container-fluid d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? "Ocultar Menú" : "Mostrar Menú"}>
                  <div className="burger-icon"><span></span><span></span><span></span></div>
                </button>
                <div className="d-flex flex-column">
                  <span className="fw-bold text-secondary text-uppercase small ls-1">Módulo Administrativo</span>
                  <div className="d-flex align-items-center gap-2 mt-0.5">
                    <span className="position-relative d-flex" style={{ width: '10px', height: '10px' }}>
                      <span className="animate-ping position-absolute h-100 w-100 rounded-circle bg-success opacity-75"></span>
                      <span className="position-relative rounded-circle bg-success" style={{ width: '10px', height: '10px' }}></span>
                    </span>
                    <span className="fw-bold text-success" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                      {onlineCount || 0} USUARIOS ACTIVOS
                    </span>
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 bg-light p-1 pe-4 rounded-pill border shadow-sm">
                <img src={avatar} alt="User" className="rounded-circle shadow-sm border border-2 border-white" style={{ width: '60px', height: '60px', objectFit: 'cover' }} />
                <div className="lh-1">
                  <div className="d-flex gap-2 mb-1">
                    <span className="badge bg-dark-subtle text-dark-emphasis" style={{ fontSize: '0.65rem' }}>ID: {user.id}</span>
                    <span className="badge text-white" style={{ fontSize: '0.65rem', backgroundColor: '#92b91c' }}>{nombresPerfiles[user.idperfil] || "INVITADO"}</span>
                  </div>
                  <div className="fw-bold text-dark px-2 py-1 rounded bg-white border shadow-sm" style={{ fontSize: '0.9rem', letterSpacing: '0.05em', minWidth: '120px' }}>
                    <i className="bi bi-person-fill me-1" style={{ color: '#92b91c' }}></i> {user.nombre}
                  </div>
                </div>
                <div className="border-start ps-3 ms-2 d-none d-md-block text-center">
                  <div className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}>Hora Actual</div>
                  <div className="fw-bold" style={{ fontSize: '1.6rem', fontFamily: 'monospace', lineHeight: '1', color: '#92b91c' }}>{currentTime}</div>
                </div>
              </div>
            </div>
          </header>

          <div className="p-4 flex-grow-1" style={{ backgroundColor: '#f1f5f9' }}>
            <Routes>
              <Route path="/" element={
                <div className="container-fluid fade-in py-2">
                  <div className="card border-0 rounded-4 shadow-sm mb-4 overflow-hidden bg-white text-dark">

                    <div className="card-body p-4 p-md-5 position-relative">
                      <div className="position-absolute rounded-circle" style={{ backgroundColor: '#92b91c', width: '320px', height: '320px', right: '-80px', top: '-100px', opacity: 0.18, filter: 'blur(45px)' }}></div>
                      <div className="row align-items-center position-relative" style={{ zIndex: 2 }}>
                        <div className="col-md-8 text-start">
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <span className="badge rounded-pill px-3 py-1 fw-bold" style={{ backgroundColor: '#92b91c', color: '#fff' }}>
                              <i className="bi bi-cpu me-1"></i> SISTEMA ACTIVO v1.10001
                            </span>
                            <span className="badge bg-white bg-opacity-10 text-light rounded-pill px-3 py-1">
                              ID DARTIS: {user?.id_dartis || "—"}
                            </span>
                          </div>
                         <h1 className="display-6 fw-bold text-dark mb-2">
                            ¡Hola, <span style={{ color: '#6f8a1eff' }}>{user.nombre}</span>!
                          </h1>

                          <p className="text-secondary mb-0" style={{ maxWidth: '620px' }}>
                      Bienvenido al <strong className="text-dark">Panel Central de SIORET TEAMS</strong>. Supervisa métricas clave de RRHH, asistencia operativa y alertas biométricas en tiempo real.
                    </p>

                        </div>
                        <div className="col-md-4 mt-4 mt-md-0 text-center text-md-end">
                          <img src={imagenBienvenida} alt="Dashboard" className="img-fluid rounded-4 shadow-lg" style={{ maxWidth: '240px', objectFit: 'cover', border: '3px solid rgba(146, 185, 28, 0.5)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="row g-3 mb-4">
                    <div className="col-sm-6 col-xl-3">
                      <div className="card border-0 rounded-4 shadow-sm h-100 p-3 bg-white kpi-card">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Vacaciones Pendientes</span>
                            <h2 className="fw-bold mb-0 mt-1 text-dark">{conteoVacacionesPendientes}</h2>
                          </div>
                          <div className="rounded-4 d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
                            <i className="bi bi-calendar-check fs-4"></i>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-top small text-muted">
                          <span className="text-danger fw-semibold">● Requiere aprobación</span> en RRHH
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-6 col-xl-3">
                      <div className="card border-0 rounded-4 shadow-sm h-100 p-3 bg-white kpi-card">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Permisos Solicitados</span>
                            <h2 className="fw-bold mb-0 mt-1 text-dark">{conteoPermisosPendientes}</h2>
                          </div>
                          <div className="rounded-4 d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
                            <i className="bi bi-file-earmark-text fs-4"></i>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-top small text-muted">
                          <span className="text-warning fw-semibold">● En revisión</span> administrativa
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-6 col-xl-3">
                      <div className="card border-0 rounded-4 shadow-sm h-100 p-3 bg-white kpi-card">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Casos Trabajo Social</span>
                            <h2 className="fw-bold mb-0 mt-1 text-dark">{conteoTSPendientes}</h2>
                          </div>
                          <div className="rounded-4 d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
                            <i className="bi bi-heart-pulse fs-4"></i>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-top small text-muted">
                          <span className="text-info fw-semibold">● Seguimiento</span> activo TS
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-6 col-xl-3">
                      <div className="card border-0 rounded-4 shadow-sm h-100 p-3 bg-white kpi-card">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Estado de Red</span>
                            <h4 className="fw-bold mb-0 mt-2 text-success">EN LÍNEA</h4>
                          </div>
                          <div className="rounded-4 d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', backgroundColor: 'rgba(146, 185, 28, 0.15)', color: '#92b91c' }}>
                            <i className="bi bi-wifi fs-4"></i>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-top small text-muted">
                          <span className="text-success fw-semibold">● Sincronizado</span> en tiempo real
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row g-4 mb-4">
                    <div className="col-lg-8">
                      <div className="card border-0 rounded-4 shadow-sm h-100 p-4 bg-white">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                          <div>
                            <h6 className="fw-bold text-dark mb-0">Índice Semanal de Puntualidad y Asistencia</h6>
                            <small className="text-muted">Porcentaje de cumplimiento operativo diario</small>
                          </div>
                          <div className="d-flex gap-3 small fw-semibold">
                            <span><i className="bi bi-circle-fill me-1" style={{ color: '#92b91c' }}></i> Puntual</span>
                            <span><i className="bi bi-circle-fill me-1 text-dark"></i> Atrasos</span>
                          </div>
                        </div>

                        <div className="row align-items-end text-center pt-3" style={{ height: '210px' }}>
                          {datosBarras.map((item, index) => (
                            <div key={index} className="col d-flex flex-column align-items-center h-100 justify-content-end">
                              <span className="small fw-bold text-dark mb-1">{item.asistencias}%</span>
                              <div className="w-50 d-flex flex-column justify-content-end rounded-3 overflow-hidden shadow-sm" style={{ height: '150px', backgroundColor: '#f1f5f9' }}>
                                <div style={{ height: `${item.atrasos}%`, backgroundColor: '#1e293b', transition: 'height 0.6s ease' }} title={`Atrasos: ${item.atrasos}%`}></div>
                                <div style={{ height: `${item.asistencias}%`, backgroundColor: '#92b91c', transition: 'height 0.6s ease' }} title={`Puntual: ${item.asistencias}%`}></div>
                              </div>
                              <span className="small text-muted fw-semibold mt-2">{item.dia}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-4">
                   <h6 className="fw-bold text-dark mb-3">
                          <i className="bi bi-fingerprint me-2" style={{ color: '#92b91c' }}></i>
                          Monitor de Alertas Biométricas
                        </h6>
                        <Repalertabiometrico />
                    </div>
                  </div>

                  <div className="row g-4">
                    <div className="col-lg-7">
                      <div className="card border-0 rounded-4 shadow-sm h-100 p-4 bg-white">
                      

                             <div className="card border-0 rounded-4 shadow-sm h-100 p-4 bg-white d-flex flex-column justify-content-between">
                        <div>
                          <h6 className="fw-bold text-dark mb-0">Distribución de Trámites</h6>
                          <small className="text-muted">Carga actual por tipo de solicitud</small>
                        </div>

                        <div className="d-flex justify-content-center align-items-center my-3 position-relative">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                            style={{
                              width: '155px',
                              height: '155px',
                              background: `conic-gradient(#dc2626 0% ${pctVacaciones}%, #f59e0b ${pctVacaciones}% ${pctVacaciones + pctPermisos}%, #0284c7 ${pctVacaciones + pctPermisos}% 100%)`
                            }}
                          >
                            <div className="bg-white rounded-circle d-flex flex-column align-items-center justify-content-center" style={{ width: '105px', height: '105px' }}>
                              <span className="fw-bold fs-4 text-dark lh-1">{totalTramites}</span>
                              <small className="text-muted" style={{ fontSize: '0.65rem' }}>TOTAL</small>
                            </div>
                          </div>
                        </div>

                        <div className="d-flex justify-content-around small border-top pt-3">
                          <div className="text-center">
                            <span className="d-block fw-bold text-danger">{pctVacaciones}%</span>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>Vacaciones</span>
                          </div>
                          <div className="text-center">
                            <span className="d-block fw-bold text-warning">{pctPermisos}%</span>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>Permisos</span>
                          </div>
                          <div className="text-center">
                            <span className="d-block fw-bold text-info">{pctTS}%</span>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>Trab. Social</span>
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>

                    <div className="col-lg-5">
                      <div className="card border-0 rounded-4 shadow-sm h-100 p-4 bg-white">
                        <h6 className="fw-bold text-dark mb-3">
                          <i className="bi bi-person-badge me-2" style={{ color: '#92b91c' }}></i>
                          Credenciales y Departamentos
                        </h6>

                        <div className="d-flex flex-wrap gap-2 mb-3 pb-3 border-bottom">
                          <span className="badge bg-light text-dark border px-3 py-2"><strong>ID:</strong> {user?.id || "—"}</span>
                          <span className="badge bg-light text-dark border px-3 py-2"><strong>Perfil:</strong> {nombresPerfiles?.[user?.idperfil] || "ADMINISTRADOR"}</span>
                          <span className="badge bg-light text-dark border px-3 py-2"><strong>Empresa:</strong> {Array.isArray(user?.id_empresa) ? user.id_empresa.join(', ') : (user?.id_empresa || "—")}</span>
                        </div>

                        <h6 className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                          Departamentos Asignados
                        </h6>
                        <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                          {(() => {
                            const deptoData = user?.departamento;
                            const renderBadge = (name, index) => (
                              <span
                                key={index}
                                className="badge px-3 py-2 rounded-3 fw-semibold text-uppercase transition-all border"
                                style={{ backgroundColor: 'rgba(146, 185, 28, 0.08)', color: '#5c760e', borderColor: 'rgba(146, 185, 28, 0.25)', fontSize: '0.72rem' }}
                              >
                                {String(name).trim()}
                              </span>
                            );
                            if (Array.isArray(deptoData)) return deptoData.map((dept, index) => renderBadge(dept, index));
                            if (typeof deptoData === 'string' && deptoData.trim() !== '') return deptoData.split(',').map((dept, index) => renderBadge(dept, index));
                            return <span className="text-muted small fst-italic">Sin departamentos asignados</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              } />
              <Route path="/RRHH/asistencia_comedor" element={<AsistenciaComedor />} />
              <Route path="/RRHH/horas_cultivo" element={<HorasCultivo />} />
              <Route path="/RRHH/horas_rendimiento" element={<HorasRendimiento />} />
              <Route path="/RRHH/vacaciones_rrhh" element={<VacacionesRrhh />} />
              <Route path="/RRHH/asistencia_comedor2" element={<AsistenciaComedor2 />} />
              <Route path="/REPORTES/rep_lavanderia" element={<Replavanderia />} />
              <Route path="/REPORTES/rep_asistencia" element={<Repasistencia />} />
              <Route path="/REPORTES/rep_laptario" element={<Replaptario />} />
              <Route path="/REPORTES/rep_comedor" element={<Repcomedor />} />
              <Route path="/REPORTES/rep_alerta_biometrico" element={<Repalertabiometrico />} />
              <Route path="/REPORTES/rep_standing_coparacion" element={<Repstandingcoparacion />} />
              <Route path="/REPORTES/rep_marcacion" element={<Repmarcacion />} />
              <Route path="/DARTIS/sucursales_dartis" element={<Sucursalesdartis />} />
              <Route path="/FIT/fit_registro" element={<Fitregistro />} />
              <Route path="/RFID/rfid" element={<Rfid />} />
              <Route path="/RFID/rfidmovil" element={<Rfidmovil />} />
              <Route path="/RFID/rfid_controlcalidad" element={<Rfidcontrolcalidad />} />
              <Route path="/RFID/rfid_tagretirado" element={<Rfidtagretirado />} />
              <Route path="/RFID/Empleado_rrhh_perfil" element={<Empleadorrhhperfil />} />
              <Route path="/APRENDIZAJE/Taller" element={<Talleres />} />
              <Route path="/APRENDIZAJE/Config_aprendizaje" element={<Configaprendizaje />} />
              <Route path="/DARTIS/Recetas" element={<Recetas />} />
              <Route path="/DARTIS/Recetas_dartis" element={<Recetasdartis />} />
              <Route path="/SISTEMA/usuarios_web" element={<UsuariosWeb />} />
              <Route path="/SISTEMA/perfiles" element={<PerfilesWeb />} />
              <Route path="/REPORTES/Rep_alm_mer_fact" element={<Repalmmerfact />} />
              <Route path="/REPORTES/Rep_alm_mer_des_ref" element={<Repalmmerdesref />} />
              <Route path="/REPORTES/Rep_alm_mer_des_comedor" element={<Repalmmerdescom />} />
              <Route path="/REPORTES/Rep_alm_mer_fact_agrupado" element={<Repalmmerfactagrupado />} />
              <Route path="/REPORTES/Rep_alm_mer_fact_agrupado2" element={<Repalmmerfactagrupado2 />} />
              <Route path="/RRHH/periodo_cierre" element={<PeriodoCierre />} />
              <Route path="/TS/informe" element={<Informe />} />
              <Route path="/SISTEMA/OpcionesMenu" element={<OpcionesMenu />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
