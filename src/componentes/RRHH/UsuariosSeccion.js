import React from 'react';

const UsuariosSeccion = ({ 
  loadingUsers, 
  filteredUsers, 
  search, 
  setSearch, 
  openUserModal, 
  handleDeleteUsuario 
}) => {
  return (
    <div style={{ flex: '2', backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', minWidth: '320px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f3f4f6', paddingBottom: '15px', marginBottom: '15px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#374151', fontSize: '18px' }}>Control de Usuarios del Sistema</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Asignación de privilegios y accesos a la plataforma.</p>
        </div>
        <button
          onClick={() => openUserModal()}
          style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          + Nuevo Usuario
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="Buscar usuario por nombre o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '300px', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 'bold' }}>
            <tr>
              <th style={{ padding: '10px 12px' }}>Nombre</th>
              <th style={{ padding: '10px 12px' }}>Email</th>
              <th style={{ padding: '10px 12px' }}>Rol</th>
              <th style={{ padding: '10px 12px' }}>Estado</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody style={{ color: '#1f2937' }}>
            {loadingUsers ? (
              <tr>
                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Cargando lista de usuarios...</td>
              </tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{user.name}</td>
                  <td style={{ padding: '12px', color: '#4b5563' }}>{user.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151' }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '2px 8px', fontSize: '11px', borderRadius: '12px', fontWeight: 'bold',
                      backgroundColor: user.status === 'Activo' ? '#dcfce7' : '#fee2e2',
                      color: user.status === 'Activo' ? '#166534' : '#991b1b'
                    }}>
                      {user.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => openUserModal(user)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginRight: '10px' }}>Editar</button>
                    <button onClick={() => handleDeleteUsuario(user.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Eliminar</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>No se encontraron usuarios.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsuariosSeccion;
