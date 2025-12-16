// Servicio para gestión de proveedores
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { app } from '../firebase'

const db = getFirestore(app)

// Obtener todos los proveedores
export const getProviders = async () => {
  try {
    const providersSnapshot = await getDocs(collection(db, 'proveedores'))
    return providersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error obteniendo proveedores:', error)
    return []
  }
}

// Crear nuevo proveedor
export const createProvider = async (providerData) => {
  try {
    const docRef = await addDoc(collection(db, 'proveedores'), {
      nombre: providerData.nombre,
      contacto: providerData.contacto,
      activo: true,
      fechaCreacion: new Date().toISOString()
    })
    return { id: docRef.id, ...providerData, activo: true }
  } catch (error) {
    console.error('Error creando proveedor:', error)
    throw error
  }
}

// Actualizar proveedor
export const updateProvider = async (providerId, providerData) => {
  try {
    const providerRef = doc(db, 'proveedores', providerId)
    await updateDoc(providerRef, {
      nombre: providerData.nombre,
      contacto: providerData.contacto,
      activo: providerData.activo
    })
    return { id: providerId, ...providerData }
  } catch (error) {
    console.error('Error actualizando proveedor:', error)
    throw error
  }
}

// Eliminar proveedor (marcar como inactivo)
export const deleteProvider = async (providerId) => {
  try {
    const providerRef = doc(db, 'proveedores', providerId)
    await updateDoc(providerRef, {
      activo: false
    })
    return true
  } catch (error) {
    console.error('Error eliminando proveedor:', error)
    throw error
  }
}

// Obtener productos de un proveedor
export const getProviderProducts = async (providerId) => {
  try {
    const productsQuery = query(
      collection(db, 'proveedorProductos'), 
      where('idProveedor', '==', providerId)
    )
    const productsSnapshot = await getDocs(productsQuery)
    return productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error obteniendo productos del proveedor:', error)
    return []
  }
}

// Agregar producto a proveedor
export const addProductToProvider = async (providerId, productData) => {
  try {
    const docRef = await addDoc(collection(db, 'proveedorProductos'), {
      idProveedor: providerId,
      id: productData.id,
      nombre: productData.nombre,
      cantidad: Number(productData.cantidad),
      costo: Number(productData.costo),
      precio: Number(productData.precio),
      fechaCreacion: new Date().toISOString()
    })
    return { id: docRef.id, ...productData, idProveedor: providerId }
  } catch (error) {
    console.error('Error agregando producto al proveedor:', error)
    throw error
  }
}

// Actualizar costo de producto
export const updateProductCost = async (providerProductId, newCost) => {
  try {
    const productRef = doc(db, 'proveedorProductos', providerProductId)
    await updateDoc(productRef, {
      costo: Number(newCost),
      fechaActualizacion: new Date().toISOString()
    })
    return true
  } catch (error) {
    console.error('Error actualizando costo del producto:', error)
    throw error
  }
}

// Obtener historial de compras de un proveedor
export const getProviderPurchases = async (providerId) => {
  try {
    const purchasesQuery = query(
      collection(db, 'compras'), 
      where('idProveedor', '==', providerId)
    )
    const purchasesSnapshot = await getDocs(purchasesQuery)
    return purchasesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error obteniendo compras del proveedor:', error)
    return []
  }
}