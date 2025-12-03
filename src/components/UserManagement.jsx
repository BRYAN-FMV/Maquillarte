import { useState, useEffect } from 'react'
import { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { FaUserShield, FaUser, FaBriefcase, FaTrash } from 'react-icons/fa'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const db = getFirestore()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'))
      const usersData = querySnapshot.docs.map(doc => ({ 
        uid: doc.id, 
        ...doc.data() 
      }))
      setUsers(usersData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching users:', error)
      setLoading(false)
    }
  }

  const handleRoleChange = async (uid, newRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole })
      alert('Rol actualizado exitosamente')
      fetchUsers()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Error al actualizar el rol: ' + error.message)
    }
  }

  const handleDeleteUser = async (uid) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return
    
    try {
      await deleteDoc(doc(db, 'users', uid))
      alert('Usuario eliminado exitosamente')
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error al eliminar usuario: ' + error.message)
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <FaUserShield style={{ color: '#FFB6C1', marginRight: '5px' }} />
      case 'employee':
        return <FaBriefcase style={{ color: '#87CEEB', marginRight: '5px' }} />
      default:
        return <FaUser style={{ color: '#90EE90', marginRight: '5px' }} />
    }
  }

  const getRoleName = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'employee':
        return 'Empleado'
      default:
        return 'Usuario'
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Cargando usuarios...</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Gestión de Usuarios</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Total de usuarios: {users.length}
      </p>

      <div style={{ 
        display: 'grid', 
        gap: '15px',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
      }}>
        {users.map(user => (
          <div key={user.uid} style={{
            background: '#fff',
            border: '2px solid #FFB6C1',
            borderRadius: '10px',
            padding: '15px',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#333' }}>Email:</strong>
              <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                {user.email}
              </div>
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
              {getRoleIcon(user.role)}
              <strong style={{ color: '#333' }}>Rol:</strong>
              <span style={{ marginLeft: '5px', color: '#666' }}>
                {getRoleName(user.role)}
              </span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                Cambiar Rol:
              </label>
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '2px solid #FFB6C1',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="user">Usuario</option>
                <option value="employee">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <button
              onClick={() => handleDeleteUser(user.uid)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#ff4444',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                fontWeight: 'bold'
              }}
            >
              <FaTrash /> Eliminar Usuario
            </button>

            {user.createdAt && (
              <div style={{ 
                marginTop: '10px', 
                fontSize: '12px', 
                color: '#999',
                textAlign: 'center'
              }}>
                Registrado: {new Date(user.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default UserManagement
