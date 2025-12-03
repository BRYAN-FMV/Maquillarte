import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import { app } from '../firebase'

const auth = getAuth(app)
const db = getFirestore(app)

// Registrar un nuevo usuario con rol
export const registerUser = async (email, password, role = 'user') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Guardar el rol del usuario en Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      role: role,
      createdAt: new Date().toISOString()
    })

    return { success: true, user, role }
  } catch (error) {
    console.error('Error al registrar usuario:', error)
    return { success: false, error: error.message }
  }
}

// Iniciar sesión
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Obtener el rol del usuario
    const role = await getUserRole(user.uid)

    return { success: true, user, role }
  } catch (error) {
    console.error('Error al iniciar sesión:', error)
    return { success: false, error: error.message }
  }
}

// Cerrar sesión
export const logoutUser = async () => {
  try {
    await signOut(auth)
    return { success: true }
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
    return { success: false, error: error.message }
  }
}

// Obtener el rol del usuario
export const getUserRole = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      return data.role || 'user'
    }
    return 'user' // Rol por defecto
  } catch (error) {
    console.error('Error al obtener rol del usuario:', error)
    return 'user'
  }
}

// Observador de estado de autenticación
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const role = await getUserRole(user.uid)
      callback({ user, role })
    } else {
      callback({ user: null, role: null })
    }
  })
}

// Obtener el usuario actual
export const getCurrentUser = () => {
  return auth.currentUser
}

// Verificar si el usuario tiene un rol específico
export const hasRole = async (requiredRole) => {
  const user = getCurrentUser()
  if (!user) return false

  const userRole = await getUserRole(user.uid)
  return userRole === requiredRole
}

// Verificar si el usuario tiene uno de los roles permitidos
export const hasAnyRole = async (allowedRoles) => {
  const user = getCurrentUser()
  if (!user) return false

  const userRole = await getUserRole(user.uid)
  return allowedRoles.includes(userRole)
}

export { auth }
