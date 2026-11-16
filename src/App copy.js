import React, { useState, useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes, NavLink } from "react-router-dom"; 
import logoSioret from './imagenes/logo_sioret.png'; 
import { Toaster, toast } from 'sonner'; 

// Importaciones de Componentes del Sistema
import AsistenciaComedor from "./componentes/RRHH/Asistencia_comedor"; 
import Replavanderia from "./componentes/REPORTES/Rep_lavanderia"; 
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
import Informe from './componentes/TS/informe'; 
import Menu from './componentes/SISTEMA/Menu'; 

import "./App.css";

import imagenBienvenida from './imagenes/Bellaflor.jpg'; 
function App() { 
  const nombresPerfiles = { 
    1: "ADMINISTRADOR", 
    2: "OPERADOR", 
    3: "RRHH", 
    4: "MEDICINA", 
    5: "TRABAJO SOCIAL" 
  }; 

  // Control de autenticación nativo y toggle del nuevo Sidebar colapsable
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("auth") === "true"); 
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [user, setUser] = useState(() => { 
    const savedUser = localStorage.getItem("userData"); 
    const defaultUser = { id: null, nombre: 'Usuario', idperfil: null, id_empresa: '', departamento: '' ,id_dartis: null}; 
 
    if (savedUser) { 
      try { 
        return JSON.parse(savedUser); 
      } catch (e) { 
        return defaultUser; 
      } 
    } 
    return defaultUser; 
  }); 

  const [avatar, setAvatar] = useState(() => localStorage.getItem("userAvatar") || logoSioret); 
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString()); 
  const [openMenu, setOpenMenu] = useState(null); 
  const [onlineCount, setOnlineCount] = useState(0); 

  useEffect(() => { 
    setOnlineCount(1); 
  }, []); 

  useEffect(() => { 
    localStorage.setItem("auth", isAuthenticated); 
  }, [isAuthenticated]); 

  useEffect(() => { 
    const timer = setInterval(() => { 
      setCurrentTime(new Date().toLocaleTimeString()); 
    }, 1000); 
    return () => clearInterval(timer); 
  }, []);


     const toggleMenu = (menuName) => { 
    setOpenMenu(openMenu === menuName ? null : menuName); 
  }; 

  const handleLogout = () => { 
    setIsAuthenticated(false); 
    setUser({ id: null, nombre: '', idperfil: null, id_empresa: '', departamento: '',id_dartis: '' }); 
    localStorage.clear(); 
    toast.info("Sesión cerrada correctamente"); 
    setTimeout(() => { 
      window.location.href = "/"; 
    }, 1000); 
  }; 

  // Componente reutilizable con diseño transparente (Glassmorphism)
  const MenuSection = ({ id, title, icon, children }) => { 
    const isOpen = openMenu === id; 
    return ( 
      <li className="nav-item mb-1"> 
        <div className={`nav-link d-flex align-items-center justify-content-between p-3 rounded-3 text-white transition-all ${isOpen ? 'bg-white bg-opacity-10 text-white shadow-sm' : 'hover-link'}`} 
             onClick={() => toggleMenu(id)} style={{ cursor: 'pointer', border: isOpen ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent' }}> 
          <div className="d-flex align-items-center gap-3"> 
            <i className={`bi ${icon} fs-5`} style={isOpen ? { color: '#92b91c' } : { color: 'rgba(255,255,255,0.7)' }}></i> 
            <span className="fw-medium" style={{ fontSize: '0.85rem', letterSpacing: '0.3px' }}>{title}</span> 
          </div> 
          <i className={`bi bi-chevron-down small transition-transform ${isOpen ? 'rotate-180' : ''}`} style={isOpen ? { color: '#92b91c' } : { color: 'rgba(255,255,255,0.5)' }}></i> 
        </div> 
        <div className={`submenu-collapse ${isOpen ? 'show' : ''}`}> 
          <div className="d-flex flex-column gap-1 py-2 ps-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', borderRadius: '0 0 12px 12px' }}> 
            {children} 
          </div> 
        </div> 
      </li> 
    ); 
  };

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


    return ( 
    <Router> 
      <Toaster position="top-center" expand={true} richColors 
               toastOptions={{ 
                 style: { fontSize: '1.1rem', padding: '20px 25px', width: '400px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }, 
                 success: { style: { background: '#ffffff', border: '2px solid #92b91c', color: '#2c3e50' } }, 
                 error: { style: { background: '#ffffff', border: '2px solid #e53e3e', color: '#742a2a' } }, 
                 info: { style: { background: '#ffffff', border: '2px solid #92b91c', color: '#2c3e50' } } 
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
        .sidebar-hidden { width: 0px !important; min-width: 0px !important; overflow: hidden; opacity: 0; pointer-events: none; }
      `}</style> 

      <div className="d-flex min-vh-100 bg-light"> 
        {/* SIDEBAR INTERACTIVO CON CLASE DE OCULTADO */} 
        <aside className={`bg-dark text-white shadow-lg d-flex flex-column sticky-top transition-all`} style={{ width: sidebarOpen ? '280px' : '0px', minWidth: sidebarOpen ? '280px' : '0px', height: '100vh', overflow: 'hidden', opacity: sidebarOpen ? 1 : 0 }}> 
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
              <NavLink to="/" className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 transition-all ${isActive ? 'text-white shadow-sm' : 'text-secondary hover-bg-light'}`} style={({ isActive }) => isActive ? { backgroundColor: '#92b91c' } : {}}> 
                <i className="bi bi-house-door-fill fs-5 lh-1"></i> 
                <span className="fw-semibold text-uppercase small tracking-wider">Principal</span> 
              </NavLink> 
            </li> 

            {(user.idperfil == 1 || user.idperfil == 3 || user.idperfil == 2 || user.idperfil == 5) && ( 
              <MenuSection id="rrhh" title="GESTIÓN RRHH" icon="bi-people-fill"> 
                <NavLink to="/RRHH/asistencia_comedor" className="sub-link">• Registro Asistencia</NavLink> 
                <NavLink to="/RRHH/horas_cultivo" className="sub-link">• Horas Extras</NavLink> 
                 <NavLink to="/RRHH/horas_rendimiento" className="sub-link">• Horas Rendimiento</NavLink> 
                 <NavLink to="/RRHH/vacaciones_rrhh" className="sub-link">• Vacaciones (Matríz)</NavLink> 
                <NavLink to="/RRHH/periodo_cierre" className="sub-link">• Cierre de Periodos</NavLink> 
                <NavLink to="/RFID/Empleado_rrhh_perfil" className="sub-link">• Gestión empleado</NavLink> 
              </MenuSection> 

              
            )} 

             {(user.idperfil == 1 || user.idperfil == 3 || user.idperfil == 2 || user.idperfil == 5) && ( 
              <MenuSection id="rrhhapre" title="APRENDIZAJE" icon="bi-people-fill"> 
                <NavLink to="/APRENDIZAJE/Taller" className="sub-link">• Ingreso al Curso</NavLink> 
                <NavLink to="/APRENDIZAJE/Config_aprendizaje" className="sub-link">• Configurar Cursos</NavLink> 
      
              </MenuSection> 

              
            )} 

            {(user.idperfil == 1 ||  user.idperfil == 7   ||  user.idperfil == 8 ) && ( 
              <MenuSection id="dartisrecetas" title="DARTIS" icon="bi-people-fill"> 
                <NavLink to="/DARTIS/Recetas" className="sub-link">• Recetas</NavLink> 
              </MenuSection> 
            )} 

              {(user.idperfil == 1 ||  user.idperfil == 7   ||  user.idperfil == 8 ) && ( 
              <MenuSection id="ts" title="TRABAJO SOCIAL" icon="bi-people-fill"> 
                <NavLink to="/TS/informe" className="sub-link">• Firmar Documentos</NavLink> 
              </MenuSection> 
            )} 



            {user.idperfil == 2 && ( 
                        <MenuSection id="rfd" title="RFID" icon="bi-cpu-fill"> 
                              <NavLink to="/RFID/rfid" className="sub-link">• CONTROL RFID</NavLink> 
                              <NavLink to="/RFID/rfidmovil" className="sub-link">• ASIGNACION RFID MOVIL</NavLink> 
                              <NavLink to="/RFID/rfid_controlcalidad" className="sub-link">• CONTROL DE CALIDAD</NavLink> 
                              <NavLink to="/RFID/rfid_tagretirado" className="sub-link">• RETIRAR TAGS</NavLink> 
                            </MenuSection> 
                            
            )}

            {user.idperfil == 1 && ( 
              <>
                <MenuSection id="fit" title="FITNESS" icon="bi-bicycle"> 
                  <NavLink to="/FIT/fit_registro" className="sub-link">• Registro Clientes Fit</NavLink> 
                  <NavLink to="/RRHH/asistencia_comedor2" className="sub-link">• Registro Asistencia 2</NavLink> 
                </MenuSection> 
                <MenuSection id="sis" title="SISTEMA" icon="bi-shield-lock-fill"> 
                  <NavLink to="/SISTEMA/usuarios_web" className="sub-link">• Gestion de Usuarios</NavLink> 
                  <NavLink to="/SISTEMA/perfiles" className="sub-link">• Gestion de Perfiles</NavLink> 
                   <NavLink to="/SISTEMA/Menu" className="sub-link">• Menu</NavLink> 
                </MenuSection> 
                <MenuSection id="rfd" title="RFID" icon="bi-cpu-fill"> 
                  <NavLink to="/RFID/rfid" className="sub-link">• CONTROL RFID</NavLink> 
                  <NavLink to="/RFID/rfidmovil" className="sub-link">• ASIGNACION RFID MOVIL</NavLink> 
                  <NavLink to="/RFID/rfid_controlcalidad" className="sub-link">• CONTROL DE CALIDAD</NavLink> 
                  <NavLink to="/RFID/rfid_tagretirado" className="sub-link">• RETIRAR TAGS</NavLink> 
                </MenuSection> 
              </>
            )}

             {user.idperfil == 8 && ( //BQT
              <>
                 <MenuSection id="rfd" title="RFID" icon="bi-cpu-fill"> 
                  <NavLink to="/RFID/rfid" className="sub-link">• CONTROL RFID</NavLink> 
                  <NavLink to="/RFID/rfidmovil" className="sub-link">• ASIGNACION RFID MOVIL</NavLink> 
                  <NavLink to="/RFID/rfid_controlcalidad" className="sub-link">• CONTROL DE CALIDAD</NavLink> 
                  <NavLink to="/RFID/rfid_tagretirado" className="sub-link">• RETIRAR TAGS</NavLink> 
                </MenuSection> 
              </>
            )}

              {user.idperfil == 9 && ( //SUPERVISOR BQT
              <>
                 <MenuSection id="rfd" title="RFID" icon="bi-cpu-fill"> 
                  <NavLink to="/RFID/rfid" className="sub-link">• CONTROL RFID</NavLink> 
                  <NavLink to="/RFID/rfidmovil" className="sub-link">• ASIGNACION RFID MOVIL</NavLink> 
                  <NavLink to="/RFID/rfid_controlcalidad" className="sub-link">• CONTROL DE CALIDAD</NavLink> 
                  <NavLink to="/RFID/rfid_tagretirado" className="sub-link">• RETIRAR TAGS</NavLink> 
                </MenuSection> 

                 <MenuSection id="rrhh" title="GESTIÓN RRHH" icon="bi-people-fill"> 
                  <NavLink to="/RRHH/asistencia_comedor" className="sub-link">• Registro Asistencia</NavLink>
                    <NavLink to="/RRHH/horas_rendimiento" className="sub-link">• Horas Rendimiento</NavLink> 
                  </MenuSection> 
              </>
            )}

   {user.idperfil == 10 && ( //COMEDOR
              <>
                <MenuSection id="rrhh" title="GESTIÓN RRHH" icon="bi-people-fill"> 
                <NavLink to="/RRHH/asistencia_comedor" className="sub-link">• Registro Asistencia</NavLink> 
                <NavLink to="/RRHH/horas_cultivo" className="sub-link">• Horas Extras</NavLink> 
              </MenuSection> 
              </>
            )}

 {user.idperfil == 11 && ( //COORDINACION
              <>
                <MenuSection id="rrhh" title="GESTIÓN RRHH" icon="bi-people-fill"> 
                <NavLink to="/RRHH/asistencia_comedor" className="sub-link">• Registro Asistencia</NavLink> 
              </MenuSection> 
              </>
            )}


            {user.idperfil == 1 && ( 
              <MenuSection id="reportes" title="REPORTES" icon="bi-file-earmark-bar-graph"> 
                <NavLink to="/REPORTES/rep_alerta_biometrico" className="sub-link">• Biométrico</NavLink> 
                <NavLink to="/DARTIS/sucursales_dartis" className="sub-link">• Sucursales Dartis</NavLink> 
                 <NavLink to="/REPORTES/Rep_standing_coparacion" className="sub-link">• Standig (Comparación)</NavLink> 
               
              </MenuSection> 
            )} 

         {(user.idperfil == 4 || user.idperfil == 5 || user.idperfil == 3) && ( 
       <>
        <MenuSection id="reportes_personal" title="REPORTES" icon="bi-file-earmark-bar-graph"> 
          <NavLink to="/REPORTES/rep_alerta_biometrico" className="sub-link">• Biométrico</NavLink> 
        </MenuSection> 
        
         <MenuSection id="rrhh" title="GESTIÓN RRHH" icon="bi-people-fill"> 
                <NavLink to="/RRHH/asistencia_comedor" className="sub-link">• Registro Asistencia</NavLink> 
              </MenuSection> 
      </>
     )}

          </ul> 

          <div className="p-3 mt-auto" style={{ minWidth: '280px' }}> 
        <button 
  onClick={handleLogout} 
  className="btn w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 transition-all border-0 fw-semibold text-white-50"
  style={{ 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    fontSize: '0.85rem',
    letterSpacing: '0.5px'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = '#92b91c';
    e.currentTarget.style.color = '#ffffff';
    e.currentTarget.classList.remove('text-white-50');
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(146, 185, 28, 0.2)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
    e.currentTarget.style.color = '';
    e.currentTarget.classList.add('text-white-50');
    e.currentTarget.style.boxShadow = 'none';
  }}
> 
  <i className="bi bi-box-arrow-left fs-5"></i> 
  Cerrar Sesión 
</button>

          </div> 
        </aside> 

        {/* ÁREA DE CONTENIDO */} 
        <main className="flex-grow-1 d-flex flex-column" style={{ overflowX: 'hidden' }}> 
          <header className="navbar navbar-white bg-white border-bottom shadow-sm px-4 py-3 sticky-top"> 
            <div className="container-fluid d-flex justify-content-between align-items-center"> 
              
              {/* Bloque Izquierdo: Botón Hamburguesa Interactivo */}
              <div className="d-flex align-items-center gap-3">
               <button 
                    className={`sidebar-toggle-btn ${sidebarOpen ? 'open' : ''}`} 
                    onClick={() => setSidebarOpen(!sidebarOpen)} 
                    title={sidebarOpen ? "Ocultar Menú" : "Mostrar Menú"}
                  >
                    <div className="burger-icon">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
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
                <img src={avatar} alt="User" className="rounded-circle shadow-sm border border-2 border-white" style={{ width: '70px', height: '70px', objectFit: 'cover' }} /> 
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
                  <div className="fw-bold" style={{ fontSize: '1.8rem', fontFamily: 'monospace', lineHeight: '1', color: '#92b91c' }}>{currentTime}</div> 
                </div> 
              </div> 
            </div> 
          </header>
                       <div className="p-4 flex-grow-1" style={{ backgroundColor: '#f8fafc' }}> 
            <Routes> 
              <Route path="/" element={ 
                <div className="container-fluid fade-in py-3"> 
                  
                  {/* SECCIÓN SUPERIOR: BIENVENIDA + IMAGEN ELEGANTE */}
                  <div className="card border-0 rounded-4 shadow-sm p-4 p-md-5 mb-4 bg-white position-relative overflow-hidden" style={{ minHeight: '260px' }}>
                    {/* Decoración geométrica sutil de fondo */}
                    <div className="position-absolute opacity-10 rounded-circle" style={{ backgroundColor: '#92b91c', width: '300px', height: '300px', right: '-100px', top: '-100px', filter: 'blur(40px)' }}></div>
                    
                    <div className="row align-items-center position-relative" style={{ zIndex: 2 }}>
                      {/* Columna Izquierda: Texto de Bienvenida */}
                      <div className="col-md-7 col-lg-8 text-start">
                        <div className="badge text-white mb-2 px-3 py-1.5 rounded-pill fw-bold shadow-sm" style={{ backgroundColor: '#92b91c', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                          SISTEMA ACTIVO v1.10001 
                        </div> 
                        <h1 className="display-5 fw-extrabold text-dark mb-2" style={{ letterSpacing: '-1px', lineHeight: '1.2' }}> 
                          ¡Hola, <span style={{ color: '#92b91c' }}>{user.nombre}</span>! 
                        </h1> 
                        <p className="text-secondary mb-0 fs-6" style={{ maxWidth: '600px', lineHeight: '1.6' }}> 
                          Bienvenido al <em className="fst-normal text-dark fw-medium">Panel Central de SIORET TEAMS</em>. Desde aquí puedes gestionar recursos humanos, revisar reportes y controlar los registros de manera eficiente. 
                        </p> 
                      </div>

                      {/* Columna Derecha: Contenedor de Imagen Elegante */}
                      <div className="col-md-5 col-lg-4 mt-4 mt-md-0 text-center text-md-end">
                        <div className="d-inline-block position-relative">
                          {/* Marco decorativo detrás de la imagen */}
                          <div className="position-absolute w-100 h-100 rounded-4" style={{ border: '2px dashed rgba(146, 185, 28, 0.3)', top: '10px', left: '10px', zIndex: 1 }}></div>
                          
                          {/* La Imagen Principal */}
                          <img 
                            src={imagenBienvenida}
                            alt="Dashboard Analytics" 
                            className="img-fluid rounded-4 shadow position-relative transition-all"
                            style={{ 
                              maxWidth: '320px', 
                              objectFit: 'cover', 
                              zIndex: 2,
                              border: '4px solid #ffffff'
                            }} 
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '0 12px 24px rgba(146, 185, 28, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Distribución Inferior Estilo Bento Grid */}
                  <div className="row g-4"> 
                    {/* Tarjeta Principal de Información */} 
                    <div className="col-lg-9"> 
                      <div className="p-4 bg-white rounded-4 border-0 shadow-sm h-100 text-start"> 
                        
                        {/* Fila Superior: ID y Perfil */} 
                        <div className="row g-3 mb-4 pb-3 border-bottom border-light-subtle"> 
                          <div className="col-sm-4 border-end border-light-subtle"> 
                            <h6 className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}> 
                              ID de Usuario 
                            </h6> 
                            <span className="font-monospace fw-bold text-dark fs-5 bg-light px-2.5 py-1 rounded-3 border"> 
                              {user?.id || "—"} (1D)DARTIS: 

                              {user?.id_dartis || "—"} 
                            </span> 
                          </div> 
                          <div className="col-sm-8 ps-sm-4"> 
                            <h6 className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}> 
                              Perfil Asignado 
                            </h6> 
                            <div className="d-flex align-items-center gap-2"> 
                              <span className="badge bg-dark bg-opacity-10 text-dark font-monospace fw-semibold px-2 py-1.5" style={{ borderRadius: '6px' }}> 
                                ID: {user?.idperfil || "0"} 
                              </span> 
                              <span className="fw-bold fs-6 text-uppercase" style={{ color: '#2c3e50', letterSpacing: '0.5px' }}> 
                                {nombresPerfiles?.[user?.idperfil] || "ADMINISTRADOR"} 
                              </span> 
                            </div> 
                          </div> 
                        </div> 

                        {/* Fila Media: Empresas Asignadas */} 
                        <div className="mb-4 pb-3 border-bottom border-light-subtle"> 
                          <h6 className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}> 
                            Empresas Autorizadas 
                          </h6> 
                          <span className="fw-bold text-dark font-monospace fs-6 bg-light px-2.5 py-1.5 rounded-3 border tracking-wider"> 
                            {Array.isArray(user?.id_empresa) ? user.id_empresa.join(', ') : (user?.id_empresa || "—")} 
                          </span> 
                        </div> 

                        {/* Fila Inferior: Departamentos Estilizados */} 
                        <div> 
                          <h6 className="text-uppercase text-muted fw-bold mb-3" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}> 
                            Departamentos Asignados 
                          </h6> 
                          <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '5px' }}> 
                            {(() => { 
                              const deptoData = user?.departamento; 
                              const renderBadge = (name, index) => (
                                <span key={index} 
                                      className="badge px-3 py-2 rounded-3 fw-semibold text-uppercase transition-all border" 
                                      style={{ 
                                        backgroundColor: 'rgba(146, 185, 28, 0.05)', 
                                        color: '#769614', 
                                        borderColor: 'rgba(146, 185, 28, 0.2)',
                                        fontSize: '0.72rem',
                                        letterSpacing: '0.3px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#92b91c';
                                        e.currentTarget.style.color = '#ffffff';
                                        e.currentTarget.style.borderColor = '#92b91c';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(146, 185, 28, 0.05)';
                                        e.currentTarget.style.color = '#769614';
                                        e.currentTarget.style.borderColor = 'rgba(146, 185, 28, 0.2)';
                                      }}
                                > 
                                  {String(name).trim()} 
                                </span>
                              );

                              if (Array.isArray(deptoData)) { 
                                return deptoData.map((dept, index) => renderBadge(dept, index)); 
                              } 
                              if (typeof deptoData === 'string' && deptoData.trim() !== '') { 
                                return deptoData.split(',').map((dept, index) => renderBadge(dept, index)); 
                              } 
                              return <span className="text-muted small italic">Sin departamentos asignados</span>; 
                            })()} 
                          </div> 
                        </div> 
                      </div> 
                    </div> 

                    {/* Tarjeta Lateral Izquierda: Estado de Conexión */} 
                    <div className="col-lg-3"> 
                      <div className="p-4 bg-white rounded-4 border-0 shadow-sm text-center h-100 d-flex flex-column justify-content-center align-items-center"> 
                  <div className="position-relative mb-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', backgroundColor: 'rgba(40, 167, 69, 0.08)', borderRadius: '50%' }}> 
                          <span className="position-absolute h-75 w-75 rounded-circle bg-success opacity-20 animate-ping"></span>
                          <span className="text-success fs-3 position-relative" style={{ top: '-1px' }}>●</span> 
                        </div> 
                        <h6 className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}> 
                          Estado de Red
                        </h6> 
                        <span className="badge text-white px-3 py-2 rounded-pill fw-bold border-0 shadow-sm" style={{ fontSize: '0.75rem', backgroundColor: '#92b91c', letterSpacing: '0.5px' }}> 
                          SISTEMA EN LÍNEA 
                        </span> 
                      </div> 
                    </div> 
                  </div> 
                </div> 
              } /> 
              {/* Rutas Hijas se mantienen exactamente iguales */}
              <Route path="/RRHH/asistencia_comedor" element={<AsistenciaComedor />} /> 
              <Route path="/RRHH/horas_cultivo" element={<HorasCultivo />} /> 
              <Route path="/RRHH/horas_rendimiento" element={<HorasRendimiento />} /> 
              <Route path="/RRHH/vacaciones_rrhh" element={<VacacionesRrhh />} />              
              <Route path="/RRHH/asistencia_comedor2" element={<AsistenciaComedor2 />} /> 
              <Route path="/REPORTES/rep_lavanderia" element={<Replavanderia />} /> 
              <Route path="/REPORTES/rep_laptario" element={<Replaptario />} /> 
              <Route path="/REPORTES/rep_comedor" element={<Repcomedor />} /> 
              <Route path="/REPORTES/rep_alerta_biometrico" element={<Repalertabiometrico />} /> 
               <Route path="/REPORTES/rep_standing_coparacion" element={<Repstandingcoparacion/>} /> 
              <Route path="/REPORTES/rep_marcacion" element={<Repmarcacion />} /> 
              <Route path="/DARTIS/sucursales_dartis" element={<Sucursalesdartis />} /> 
              <Route path="/FIT/fit_registro" element={<Fitregistro />} /> 
              <Route path="/RFID/rfid" element={<Rfid />} /> 
              <Route path="/RFID/rfidmovil" element={<Rfidmovil/>} /> 
              <Route path="/RFID/rfid_controlcalidad" element={<Rfidcontrolcalidad />} /> 
              <Route path="/RFID/rfid_tagretirado" element={<Rfidtagretirado />} /> 
              <Route path="/RFID/Empleado_rrhh_perfil" element={<Empleadorrhhperfil />} /> 
              <Route path="/APRENDIZAJE/Taller" element={<Talleres />} /> 
              <Route path="/APRENDIZAJE/Config_aprendizaje" element={<Configaprendizaje />} />
              <Route path="/DARTIS/Recetas" element={<Recetas/>} />
             
              
              
              <Route path="/SISTEMA/usuarios_web" element={<UsuariosWeb />} /> 
              <Route path="/SISTEMA/perfiles" element={<PerfilesWeb />} /> 
              <Route path="/REPORTES/Rep_alm_mer_fact" element={<Repalmmerfact />} /> 
              <Route path="/REPORTES/Rep_alm_mer_des_ref" element={<Repalmmerdesref />} /> 
              <Route path="/REPORTES/Rep_alm_mer_des_comedor" element={<Repalmmerdescom />} /> 
              <Route path="/REPORTES/Rep_alm_mer_fact_agrupado" element={<Repalmmerfactagrupado />} /> 
              <Route path="/REPORTES/Rep_alm_mer_fact_agrupado2" element={<Repalmmerfactagrupado2 />} /> 

              <Route path="/RRHH/periodo_cierre" element={<PeriodoCierre />} /> 
               <Route path="/TS/informe" element={<Informe/>} />
               <Route path="/SISTEMA/Menu" element={<Menu/>} />
            </Routes> 
          </div> 
        </main> 
      </div> 
    </Router> 
  ); 
} 

export default App;
