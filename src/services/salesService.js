import { getFirestore, collection, doc, getDocs, query, where, runTransaction, updateDoc } from 'firebase/firestore'
import { app } from '../firebase'

const db = getFirestore(app)

export const findProductByCode = async (productCode) => {
  try {
    const q = query(collection(db, 'inventario'), where('id', '==', productCode))
    const snap = await getDocs(q)
    if (snap.empty) return null
    const docSnap = snap.docs[0]
    return { docId: docSnap.id, ...docSnap.data() }
  } catch (error) {
    console.error('Error buscando producto:', error)
    throw error
  }
}

// Crea una venta (ventaEnc + ventaDet) y actualiza inventario en una transacción
export const createSaleTransaction = async (ventaEncData, detalles) => {
  // ventaEncData: { nombreCliente, fechaHora, tipoEntrega, total }
  // detalles: [{ docId, id, nombre, precioUnitario, cantidad }]
  try {
    const result = await runTransaction(db, async (transaction) => {
      const productoRefs = detalles.map(det => doc(db, 'inventario', det.docId))
      const productoSnaps = await Promise.all(productoRefs.map(ref => transaction.get(ref)))

      for (let i = 0; i < productoSnaps.length; i++) {
        const snap = productoSnaps[i]
        const det = detalles[i]
        if (!snap.exists()) {
          throw new Error(`Producto no existe en inventario: ${det.nombre}`)
        }
        const productoData = snap.data()
        const currentStock = Number(productoData.stock || 0)
        const compraCantidad = Number(det.cantidad || 0)
        if (compraCantidad > currentStock) {
          throw new Error(`Stock insuficiente para ${det.nombre}. Disponible: ${currentStock}`)
        }
      }

      const ventaEncRef = doc(collection(db, 'ventaEnc'))
      transaction.set(ventaEncRef, { ...ventaEncData, ultimaActualizacion: new Date().toISOString() })

      for (let i = 0; i < detalles.length; i++) {
        const det = detalles[i]
        const productoRef = productoRefs[i]
        const productoSnap = productoSnaps[i]
        const productoData = productoSnap.data()
        const currentStock = Number(productoData.stock || 0)
        const compraCantidad = Number(det.cantidad || 0)
        const newStock = currentStock - compraCantidad

        transaction.update(productoRef, { stock: newStock, ultimaActualizacion: new Date().toISOString() })

        const ventaDetRef = doc(collection(db, 'ventaDet'))
        transaction.set(ventaDetRef, {
          idVentaEnc: ventaEncRef.id,
          productoId: det.id,
          productoDocId: det.docId,
          nombre: det.nombre,
          precioUnitario: Number(det.precioUnitario),
          cantidad: Number(det.cantidad)
        })
      }

      return { ventaId: ventaEncRef.id }
    })

    return { success: true, id: result.ventaId }
  } catch (error) {
    console.error('Error creando venta:', error)
    return { success: false, error: error.message }
  }
}

// Obtener ventas con filtros opcionales
export const getSales = async (filters = {}) => {
  try {
    let q = collection(db, 'ventaEnc')
    
    // Filtro por fecha (rango)
    if (filters.startDate) {
      q = query(q, where('fechaHora', '>=', filters.startDate))
    }
    if (filters.endDate) {
      q = query(q, where('fechaHora', '<=', filters.endDate))
    }
    
    // Filtro por tipo de entrega
    if (filters.tipoEntrega) {
      q = query(q, where('tipoEntrega', '==', filters.tipoEntrega))
    }
    
    const snapshot = await getDocs(q)
    const ventas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return ventas
  } catch (error) {
    console.error('Error obteniendo ventas:', error)
    throw error
  }
}

// Obtener detalles de una venta específica
export const getSaleDetails = async (ventaId) => {
  try {
    const q = query(collection(db, 'ventaDet'), where('idVentaEnc', '==', ventaId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error obteniendo detalles de venta:', error)
    throw error
  }
}

// Eliminar una venta (ventaEnc y sus ventaDet) y restaurar stock
export const deleteSale = async (ventaId) => {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // Obtener detalles de la venta para restaurar stock
      const detailsQuery = query(collection(db, 'ventaDet'), where('idVentaEnc', '==', ventaId))
      const detailsSnap = await getDocs(detailsQuery)

      // Preparar lecturas
      const stockUpdates = []
      const deleteDetails = []

      for (const detDoc of detailsSnap.docs) {
        const detail = detDoc.data()
        const productoRef = doc(db, 'inventario', detail.productoDocId)
        const productoSnap = await transaction.get(productoRef)

        if (productoSnap.exists()) {
          const productoData = productoSnap.data()
          const currentStock = Number(productoData.stock || 0)
          const restoreQty = Number(detail.cantidad || 0)
          stockUpdates.push({ ref: productoRef, newStock: currentStock + restoreQty })
        }

        deleteDetails.push(detDoc.id)
      }

      // Ejecutar escrituras
      for (const update of stockUpdates) {
        transaction.update(update.ref, { stock: update.newStock })
      }

      for (const detailId of deleteDetails) {
        transaction.delete(doc(db, 'ventaDet', detailId))
      }

      // Eliminar encabezado de venta
      transaction.delete(doc(db, 'ventaEnc', ventaId))
    })

    return { success: true }
  } catch (error) {
    console.error('Error eliminando venta:', error)
    return { success: false, error: error.message }
  }
}

// Actualizar información básica de la venta (cliente, tipo entrega)
export const updateSale = async (ventaId, updates) => {
  try {
    const ventaRef = doc(db, 'ventaEnc', ventaId)
    const { collection: _, ...validUpdates } = updates // Remove invalid fields
    await updateDoc(ventaRef, validUpdates)
    return { success: true }
  } catch (error) {
    console.error('Error actualizando venta:', error)
    return { success: false, error: error.message }
  }
}

export default { findProductByCode, createSaleTransaction, getSales, getSaleDetails, deleteSale, updateSale }
