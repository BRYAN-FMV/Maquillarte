import { logoutUser } from '../services/authService'

function UserProfile({ user, role, onLogout }) {
  const handleLogout = async () => {
    const result = await logoutUser()
    if (result.success) {
      onLogout()
    }
  }

  const getRoleName = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'employee':
        return 'Empleado'
      case 'user':
        return 'Usuario'
      default:
        return 'Usuario'
    }
  }

  return (
    <div style={{
      background: '#fff',
      padding: '15px',
      borderRadius: '10px',
      marginBottom: '20px',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ marginBottom: '10px' }}>
        <strong style={{ color: '#FFB6C1' }}>Usuario:</strong> {user.email}
      </div>
      <div style={{ marginBottom: '15px' }}>
        <strong style={{ color: '#FFB6C1' }}>Rol:</strong> {getRoleName(role)}
      </div>
      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          padding: '10px',
          background: '#ff4444',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Cerrar Sesión
      </button>
    </div>
  )
}

export default UserProfile
