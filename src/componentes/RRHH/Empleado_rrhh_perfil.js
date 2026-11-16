import React, { useEffect, useState } from 'react';
import { fetchWithFallback } from '../../config';
import { toast } from 'sonner';
import logoBellaflor from '../../imagenes/Bellaflor.jpg';
import FichaEmpleado from './FichaEmpleado';
import Vacacionesrrhhemp from './Vacacionesrrhhemp';
import Solicitudvacaciones from './Solicitudvacaciones';
import Permisos from './Permisos';
import Formatosempleados from './Formatos_empleados';
import Configaprendizaje from '../APRENDIZAJE/Taller';
import ComidaEmpleado from './ComidaEmpleado';
//import NominaEmpleado from './NominaEmpleado';
//import BeneficiosEmpleado from './BeneficiosEmpleado';
//import DesarrolloEmpleado from './DesarrolloEmpleado';
import '../../imagenes/ModalOverlay.css';

const Empleado_rrhh_perfil = () => {
  const [seccionActiva, setSeccionActiva] = useState('ficha');
  const [saldoMaximo, setSaldoMaximo] = useState(0);
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaActual, setFechaActual] = useState(new Date());
  const [filtroConsulta, setFiltroConsulta] = useState('');
  const [expandido, setExpandido] = useState(false);

  // Estados para Usuarios
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'Visor',
    status: 'Activo',
  });

  const [user] = useState(() => {
    const savedUser = localStorage.getItem('userData');
    const defaultUser = {
      id: null,
      nombre: 'Colaborador',
      idperfil: null,
      id_empresa: '',
      departamento: '',
      id_dartis: null,
    };
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return defaultUser;
      }
    }
    return defaultUser;
  });

  useEffect(() => {
    const timer = setInterval(() => setFechaActual(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const obtenerPeriodos = async () => {
    try {
      setLoading(true);
      const data = await fetchWithFallback('/api/RRHH/periodo_cierre');
      if (data) setPeriodos(data);
    } catch (error) {
      console.error('Error periodos:', error.message);
      toast.error('No se pudieron cargar los períodos de cierre');
    } finally {
      setLoading(false);
    }
  };

  const obtenerUsuarios = async () => {
    try {
      setLoadingUsers(true);
      const data = await fetchWithFallback('/api/RRHH/usuarios');
      if (data) setUsers(data);
    } catch (error) {
      setUsers([
        { id: 1, name: 'Carlos Mendoza', email: 'carlos@mail.com', role: 'Administrador', status: 'Activo' },
        { id: 2, name: 'Ana Gómez', email: 'ana@mail.com', role: 'Editor', status: 'Inactivo' },
      ]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    obtenerPeriodos();
    obtenerUsuarios();
  }, []);

  const openUserModal = (selectedUser = null) => {
    if (selectedUser) {
      setEditingUser(selectedUser);
      setUserFormData({
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        status: selectedUser.status,
      });
    } else {
      setEditingUser(null);
      setUserFormData({ name: '', email: '', role: 'Visor', status: 'Activo' });
    }
    setIsModalOpen(true);
  };

  const handleSubmitUsuario = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await fetchWithFallback(`/api/RRHH/usuarios/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData),
        });
      } else {
        await fetchWithFallback('/api/RRHH/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData),
        });
      }
      setIsModalOpen(false);
      obtenerUsuarios();
      toast.success('Operación completada');
    } catch (error) {
      if (editingUser) {
        setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...userFormData } : u)));
      } else {
        setUsers([...users, { id: Date.now(), ...userFormData }]);
      }
      setIsModalOpen(false);
    }
  };
  const opcionesCirculares = [
    {
      id: 'ficha',
      titulo: 'Mi Perfil',
      descripcion: 'Ficha y datos',
      color: '#1b5e20',
      acento: '#4caf50',
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'vacaciones',
      titulo: 'Vacaciones',
      descripcion: `Saldo: ${saldoMaximo}d`,
      color: '#00695c',
      acento: '#26a69a',
      badge: `${saldoMaximo}d`,
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'solicitudes',
      titulo: 'Ausentismos',
      descripcion: 'Permisos y novedades',
      color: '#2e7d32',
      acento: '#66bb6a',
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'formatos',
      titulo: 'Certificados',
      descripcion: 'Formatos laborales',
      color: '#0277bd',
      acento: '#29b6f6',
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'encuestas',
      titulo: 'Aprende Bellaflor',
      descripcion: 'Cursos y talleres',
      color: '#558b2f',
      acento: '#9ccc65',
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: 'comida',
      titulo: 'Comida',
      descripcion: 'Menú y comedor',
      color: '#c62828',
      acento: '#ef5350',
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6M4 4v5a3 3 0 003 3h1v8M16 4v16m0-16a3 3 0 013 3v4a3 3 0 01-3 3" />
        </svg>
      ),
    },
    {
      id: 'nomina',
      titulo: 'Nómina',
      descripcion: 'Roles de pago',
      color: '#4527a0',
      acento: '#7e57c2',
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'beneficios',
      titulo: 'Beneficios',
      descripcion: 'Convenios y seguros',
      color: '#ad1457',
      acento: '#ec407a',
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
    },
    {
      id: 'desarrollo',
      titulo: 'Desarrollo',
      descripcion: 'Plan de carrera',
      color: '#00838f',
      acento: '#26c6da',
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  const opcionesFiltradas = opcionesCirculares.filter(
    (op) =>
      op.titulo.toLowerCase().includes(filtroConsulta.toLowerCase()) ||
      op.descripcion.toLowerCase().includes(filtroConsulta.toLowerCase())
  );

  const fechaBonita = fechaActual.toLocaleDateString('es-EC', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const horaBonita = fechaActual.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={styles.portalBg}>
      <style>{`
        .portal-circle-btn {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .portal-circle-btn:hover {
          transform: translateY(-6px) scale(1.06);
        }
        .portal-content-anim {
          animation: fadePortal 0.35s ease-out forwards;
        }
        @keyframes fadePortal {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .portal-circles-scroll::-webkit-scrollbar {
          height: 5px;
        }
        .portal-circles-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }

        /* TABLET Y PANTALLAS MEDIANAS (Para que los 9 círculos deslicen sin cortarse) */
        @media (max-width: 1280px) {
          .portal-circles-scroll {
            justify-content: flex-start !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
          }
          .portal-circle-item {
            scroll-snap-align: center;
          }
        }

        /* CELULAR */
        @media (max-width: 640px) {
          .portal-header-inner {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .portal-pills-group {
            width: 100%;
            justify-content: flex-start !important;
          }
          .portal-main-title {
            font-size: 20px !important;
          }
          .portal-circle-item {
            width: 98px !important;
          }
          .portal-circle-btn {
            width: 70px !important;
            height: 70px !important;
          }
          .portal-results-box {
            padding: 14px !important;
          }
          .portal-vacaciones-col {
            min-width: 100% !important;
            flex: 1 1 100% !important;
          }
        }
      `}</style>

      {/* BARRA SUPERIOR DEL PORTAL */}
      <header style={styles.topHeader}>
        <div className="portal-header-inner" style={styles.topHeaderInner}>
          <div style={styles.logoArea}>
            <img src={logoBellaflor} alt="Logo Bellaflor" style={styles.logo} />
            <div style={styles.verticalSep} />
            <div>
              <div style={styles.portalTag}>PORTAL DE CONSULTAS RRHH</div>
              <div style={styles.userWelcome}>
                Bienvenido, <strong>{user?.nombre || 'Colaborador'}</strong>
              </div>
            </div>
          </div>

          {/* INFO DE FECHA, PERÍODO Y ID DARTIS */}
          <div className="portal-pills-group" style={styles.infoPillsGroup}>
            <div style={styles.datePill}>
              <span style={{ textTransform: 'capitalize' }}>{fechaBonita}</span>
              <span style={styles.timeBadge}>{horaBonita}</span>
            </div>

            <div style={styles.dartisPill}>
              DARTIS (ID): <strong>{user?.id_dartis || 'Cargando...'}</strong>
            </div>

            <div style={styles.periodPill}>
              Período:{' '}
              <strong>
                {loading
                  ? '...'
                  : periodos.length > 0
                  ? periodos?.nombre || 'Vigente'
                  : '2026'}
              </strong>
            </div>
          </div>
        </div>
      </header>
      {/* SECCIÓN HERO CON BUSCADOR Y CÍRCULOS EN LÍNEA */}
      <section style={styles.heroSection}>
        <div style={styles.heroContainer}>
          <h1 className="portal-main-title" style={styles.mainHeading}>
            ¿Qué deseas consultar o gestionar hoy?
          </h1>
          <p style={styles.subHeading}>
            Selecciona una opción circular para desplegar tu información en línea
          </p>

          {/* BUSCADOR RÁPIDO DE OPCIONES */}
          <div style={styles.searchWrapper}>
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{ flexShrink: 0 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar consulta (ej. vacaciones, nómina, beneficios, desarrollo...)"
              value={filtroConsulta}
              onChange={(e) => setFiltroConsulta(e.target.value)}
              style={styles.searchInput}
            />
            {filtroConsulta && (
              <button onClick={() => setFiltroConsulta('')} style={styles.clearSearchBtn}>
                &times;
              </button>
            )}
          </div>

          {/* FILA ÚNICA DE CÍRCULOS INTERACTIVOS */}
          <div className="portal-circles-scroll" style={styles.circlesRow}>
            {opcionesFiltradas.map((item) => {
              const isSelected = seccionActiva === item.id;
              return (
                <div
                  key={item.id}
                  className="portal-circle-item"
                  style={styles.circleItemWrapper}
                >
                  <button
                    onClick={() => setSeccionActiva(item.id)}
                    className="portal-circle-btn"
                    style={{
                      ...styles.circleButton,
                      background: isSelected
                        ? `linear-gradient(135deg, ${item.color} 0%, ${item.acento} 100%)`
                        : '#ffffff',
                      color: isSelected ? '#ffffff' : item.color,
                      border: isSelected
                        ? '4px solid #ffffff'
                        : `3px solid ${item.acento}55`,
                      boxShadow: isSelected
                        ? `0 14px 28px -6px ${item.color}66, 0 0 0 4px ${item.acento}40`
                        : '0 8px 20px rgba(15, 23, 42, 0.07)',
                    }}
                  >
                    {item.icon}

                    {item.badge && (
                      <span
                        style={{
                          ...styles.circleBadge,
                          backgroundColor: isSelected ? '#ffffff' : item.color,
                          color: isSelected ? item.color : '#ffffff',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>

                  <span
                    style={{
                      ...styles.circleTitle,
                      color: isSelected ? item.color : '#1e293b',
                    }}
                  >
                    {item.titulo}
                  </span>
                  <span style={styles.circleDesc}>{item.descripcion}</span>

                  <div
                    style={{
                      ...styles.activeDotBar,
                      backgroundColor: isSelected ? item.acento : 'transparent',
                      width: isSelected ? '36px' : '0px',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTENEDOR AMPLIO DE RESULTADOS */}
      <main
        style={{
          ...styles.resultsContainer,
          maxWidth: expandido ? '100%' : '96%',
          padding: expandido ? '0 8px' : '0 14px',
        }}
      >
        <div style={styles.resultsHeaderBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={styles.liveIndicator} />
            <h2 style={styles.resultsTitle}>
              {opcionesCirculares.find((o) => o.id === seccionActiva)?.titulo || 'Módulo RRHH'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setExpandido(!expandido)}
              style={styles.adminUsersBtn}
            >
              {expandido ? 'Contraer vista' : 'Ampliar vista'}
            </button>

            <button onClick={() => openUserModal()} style={styles.adminUsersBtn}>
              Administrar Usuarios ({users.length})
            </button>
          </div>
        </div>

        <div
          key={seccionActiva}
          className="portal-content-anim portal-results-box"
          style={styles.resultsBody}
        >
          {seccionActiva === 'ficha' ? (
            <FichaEmpleado />
          ) : seccionActiva === 'vacaciones' ? (
            <div style={styles.vacacionesGrid}>
              <div className="portal-vacaciones-col" style={styles.vacacionesCol}>
                <Vacacionesrrhhemp alSeleccionarEmpleado={setSaldoMaximo} />
              </div>
              <div className="portal-vacaciones-col" style={styles.vacacionesFormBox}>
                <Solicitudvacaciones diasDisponiblesMatriz={saldoMaximo} />
              </div>
            </div>
          ) : seccionActiva === 'solicitudes' ? (
            <Permisos />
          ) : seccionActiva === 'formatos' ? (
            <Formatosempleados />
          ) : seccionActiva === 'encuestas' ? (
            <Configaprendizaje />
         ) : seccionActiva === 'comida' ? (
            <ComidaEmpleado />
         /*  ) : seccionActiva === 'nomina' ? (
            <NominaEmpleado />
          ) : seccionActiva === 'beneficios' ? (
            <BeneficiosEmpleado />
          ) : seccionActiva === 'desarrollo' ? (
            <DesarrolloEmpleado />*/
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Esta sección estará disponible próximamente.
            </div>
          )}
        </div>
      </main>

      {/* MODAL DE USUARIOS */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div className="portal-content-anim" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>
                {editingUser ? 'Modificar Usuario' : 'Registrar Nuevo Usuario'}
              </h4>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitUsuario} style={styles.modalForm}>
              <div>
                <label style={styles.label}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Rol</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    style={styles.input}
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Editor">Editor</option>
                    <option value="Visor">Visor</option>
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Estado</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                    style={styles.input}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="submit" style={styles.saveBtn}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
const styles = {
  portalBg: {
    minHeight: '100vh',
    backgroundColor: '#f4f7f5',
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    color: '#1e293b',
    paddingBottom: '40px',
  },
  topHeader: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '12px 20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
  },
  topHeaderInner: {
    maxWidth: '96%',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '14px',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  logo: {
    height: '60px',
    objectFit: 'contain',
  },
  verticalSep: {
    width: '1px',
    height: '36px',
    backgroundColor: '#cbd5e1',
  },
  portalTag: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    color: '#1b5e20',
  },
  userWelcome: {
    fontSize: '15px',
    color: '#334155',
    marginTop: '2px',
  },
  infoPillsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  datePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '12.5px',
    color: '#334155',
  },
  timeBadge: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: '700',
  },
  dartisPill: {
    backgroundColor: '#e8f5e9',
    color: '#1b5e20',
    border: '1px solid #c8e6c9',
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '12.5px',
  },
  periodPill: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '12.5px',
  },
  heroSection: {
    background: 'linear-gradient(180deg, #ffffff 0%, #eaf5ee 100%)',
    borderBottom: '1px solid #d7e8de',
    padding: '24px 10px 28px 10px',
    textAlign: 'center',
  },
  heroContainer: {
    maxWidth: '100%',
    margin: '0 auto',
  },
  mainHeading: {
    margin: 0,
    fontSize: '25px',
    fontWeight: '800',
    color: '#143d18',
    letterSpacing: '-0.01em',
  },
  subHeading: {
    margin: '6px 0 18px 0',
    fontSize: '13.5px',
    color: '#526658',
  },
  searchWrapper: {
    maxWidth: '480px',
    margin: '0 auto 24px auto',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    padding: '9px 16px',
    boxShadow: '0 4px 12px rgba(20, 61, 24, 0.06)',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '13.5px',
    color: '#1e293b',
    backgroundColor: 'transparent',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  circlesRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '14px',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    paddingTop: '6px',
    paddingBottom: '10px',
  },
  circleItemWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '112px',
    flexShrink: 0,
    textAlign: 'center',
  },
  circleButton: {
    position: 'relative',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginBottom: '9px',
  },
  circleBadge: {
    position: 'absolute',
    top: '-2px',
    right: '-4px',
    fontSize: '11px',
    fontWeight: '800',
    padding: '3px 7px',
    borderRadius: '999px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  },
  circleTitle: {
    fontSize: '12px',
    fontWeight: '700',
    lineHeight: '1.25',
    marginBottom: '2px',
  },
  circleDesc: {
    fontSize: '10.5px',
    color: '#64748b',
  },
  activeDotBar: {
    height: '4px',
    borderRadius: '999px',
    marginTop: '7px',
    transition: 'all 0.3s ease',
  },
  resultsContainer: {
    margin: '22px auto 0 auto',
    transition: 'all 0.3s ease',
  },
  resultsHeaderBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '14px 22px',
    borderRadius: '14px 14px 0 0',
    border: '1px solid #e2e8f0',
    borderBottom: 'none',
    flexWrap: 'wrap',
    gap: '10px',
  },
  liveIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#2e7d32',
  },
  resultsTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '700',
    color: '#1e293b',
  },
  adminUsersBtn: {
    backgroundColor: '#f1f8f3',
    color: '#1b5e20',
    border: '1px solid #c8e6c9',
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  resultsBody: {
    backgroundColor: '#ffffff',
    padding: '28px',
    borderRadius: '0 0 14px 14px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
    minHeight: '520px',
    width: '100%',
    boxSizing: 'border-box',
    overflowX: 'auto',
  },
  vacacionesGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: '22px',
    flexWrap: 'wrap',
  },
  vacacionesCol: {
    flex: '1 1 300px',
    minWidth: 'min(100%, 260px)',
  },
  vacacionesFormBox: {
    flex: '1.4 1 420px',
    minWidth: 'min(100%, 300px)',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    boxSizing: 'border-box',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    width: '100%',
    maxWidth: '400px',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    padding: '15px 20px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#64748b',
  },
  modalForm: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '5px',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '13px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    boxSizing: 'border-box',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
  },
  cancelBtn: {
    padding: '8px 14px',
    fontSize: '13px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#475569',
  },
  saveBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    backgroundColor: '#1b5e20',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#ffffff',
    fontWeight: '600',
  },
};

export default Empleado_rrhh_perfil;
