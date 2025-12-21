import { getFirestore, collection, doc, getDocs, query, where, runTransaction, updateDoc } from 'firebase/firestore'
import { app } from '../firebase'
import { getLocalDateStringFromISO } from '../utils/dateUtils'

const db = getFirestore(app)

export const findProductByCode = async (productCode) => {
  try {
    const q = query(collection(db, 'inventario'), where('id', '==', productCode))
    const snap = await getDocs(q)
    if (snap.empty) {
      return null
    }
    const docSnap = snap.docs[0]
    const raw = docSnap.data()
    const productData = { 
      docId: docSnap.id, 
      ...raw,
      precioUnitario: Number(raw.precio || raw.precioUnitario || 0)
    }
    return productData
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
        const currentStock = Number(productoData.cantidad || productoData.stock || 0)
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
        const currentStock = Number(productoData.cantidad || productoData.stock || 0)
        const compraCantidad = Number(det.cantidad || 0)
        const newStock = currentStock - compraCantidad

        transaction.update(productoRef, { cantidad: newStock, ultimaActualizacion: new Date().toISOString() })

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
    const snapshot = await getDocs(collection(db, 'ventaEnc'))
    let ventas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Filtrar por fecha en el cliente para evitar problemas de zona horaria
    if (filters.startDate || filters.endDate) {
      ventas = ventas.filter(venta => {
        if (!venta.fechaHora) return false

        // Obtener la fecha en zona local para comparar con los filtros (YYYY-MM-DD)
        const ventaDate = getLocalDateStringFromISO(venta.fechaHora)

        if (filters.startDate && ventaDate < filters.startDate) return false
        if (filters.endDate && ventaDate > filters.endDate) return false

        return true
      })
    }
    
    // Aplicar filtros adicionales en el cliente
    if (filters.tipoEntrega) {
      ventas = ventas.filter(venta => venta.tipoEntrega === filters.tipoEntrega)
    }
    
    if (filters.tipoPago) {
      ventas = ventas.filter(venta => venta.tipoPago === filters.tipoPago)
    }
    
    if (filters.banco) {
      ventas = ventas.filter(venta => (venta.banco || '') === filters.banco)
    }

    if (filters.searchQuery) {
      const q = String(filters.searchQuery).toLowerCase()
      ventas = ventas.filter(venta => {
        const nombre = String(venta.nombreCliente || '').toLowerCase()
        const id = String(venta.id || '').toLowerCase()
        return nombre.includes(q) || id.includes(q)
      })
    }
    
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

// Actualizar encabezado y detalles de una venta, ajustando stock según diferencias
export const updateSaleWithDetails = async (ventaId, ventaUpdates, updatedDetails = []) => {
  try {
    await runTransaction(db, async (transaction) => {
      // Obtener detalles originales
      const detailsQuery = query(collection(db, 'ventaDet'), where('idVentaEnc', '==', ventaId))
      const detailsSnap = await getDocs(detailsQuery)
      const originalDetails = detailsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Mapear por id para comparaciones
      const originalById = {}
      for (const od of originalDetails) originalById[od.id] = od

      // Procesar cada detalle original: si fue modificado, ajustar la diferencia; si fue eliminado, restaurar stock
      for (const od of originalDetails) {
        const updated = updatedDetails.find(u => u.id === od.id)
        const productoRef = od.productoDocId ? doc(db, 'inventario', od.productoDocId) : null

        if (updated) {
          const newQty = Number(updated.cantidad || 0)
          const oldQty = Number(od.cantidad || 0)
          const diff = newQty - oldQty // positivo: aumentar venta (resta stock); negativo: disminuir venta (aumenta stock)

          if (diff !== 0 && productoRef) {
            const productoSnap = await transaction.get(productoRef)
            if (!productoSnap.exists()) throw new Error(`Producto no existe en inventario: ${od.nombre}`)
            const productoData = productoSnap.data()
            const currentStock = Number(productoData.cantidad || productoData.stock || 0)

            if (diff > 0 && currentStock < diff) {
              throw new Error(`Stock insuficiente para ${od.nombre}. Disponible: ${currentStock}`)
            }

            const newStock = currentStock - diff
            transaction.update(productoRef, { cantidad: newStock, ultimaActualizacion: new Date().toISOString() })
          }

          // Actualizar el detalle
          const detRef = doc(db, 'ventaDet', od.id)
          transaction.update(detRef, { cantidad: Number(updated.cantidad || 0), precioUnitario: Number(updated.precioUnitario || od.precioUnitario || 0) })
        } else {
          // detalle eliminado: restaurar stock
          if (productoRef) {
            const productoSnap = await transaction.get(productoRef)
            if (productoSnap.exists()) {
              const productoData = productoSnap.data()
              const currentStock = Number(productoData.cantidad || productoData.stock || 0)
              const restoreQty = Number(od.cantidad || 0)
              transaction.update(productoRef, { cantidad: currentStock + restoreQty, ultimaActualizacion: new Date().toISOString() })
            }
          }
          // eliminar detalle
          transaction.delete(doc(db, 'ventaDet', od.id))
        }
      }

      // Si hay nuevos detalles (sin id), agregarlos y disminuir stock
      for (const ud of updatedDetails) {
        if (!ud.id && ud.productoDocId) {
          const productoRef = doc(db, 'inventario', ud.productoDocId)
          const productoSnap = await transaction.get(productoRef)
          if (!productoSnap.exists()) throw new Error(`Producto no existe en inventario: ${ud.nombre}`)
          const productoData = productoSnap.data()
          const currentStock = Number(productoData.cantidad || productoData.stock || 0)
          const qty = Number(ud.cantidad || 0)
          if (currentStock < qty) throw new Error(`Stock insuficiente para ${ud.nombre}. Disponible: ${currentStock}`)
          transaction.update(productoRef, { cantidad: currentStock - qty, ultimaActualizacion: new Date().toISOString() })

          const ventaDetRef = doc(collection(db, 'ventaDet'))
          transaction.set(ventaDetRef, {
            idVentaEnc: ventaId,
            productoId: ud.id || ud.productoId || '',
            productoDocId: ud.productoDocId,
            nombre: ud.nombre,
            precioUnitario: Number(ud.precioUnitario || 0),
            cantidad: Number(qty)
          })
        }
      }

      // Recalcular total y actualizar encabezado
      const finalDetails = updatedDetails.filter(d => Number(d.cantidad || 0) > 0)
      const newTotal = finalDetails.reduce((s, d) => s + (Number(d.precioUnitario || 0) * Number(d.cantidad || 0)), 0)
      const ventaRef = doc(db, 'ventaEnc', ventaId)
      transaction.update(ventaRef, { ...ventaUpdates, total: newTotal, ultimaActualizacion: new Date().toISOString() })
    })

    return { success: true }
  } catch (error) {
    console.error('Error actualizando venta y detalles:', error)
    return { success: false, error: error.message }
  }
}

// Eliminar una venta (ventaEnc y sus ventaDet) y restaurar stock
export const deleteSale = async (ventaId) => {
  try {
    // Primero obtener los detalles fuera de la transacción
    const detailsQuery = query(collection(db, 'ventaDet'), where('idVentaEnc', '==', ventaId))
    const detailsSnap = await getDocs(detailsQuery)
    const details = detailsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Ahora ejecutar la transacción
    await runTransaction(db, async (transaction) => {
      // Primero leer todos los productos para validar y obtener stock actual
      const stockUpdates = []

      for (const detail of details) {
        if (detail.productoDocId) {
          const productoRef = doc(db, 'inventario', detail.productoDocId)
          const productoSnap = await transaction.get(productoRef)

          if (productoSnap.exists()) {
            const productoData = productoSnap.data()
            const currentStock = Number(productoData.cantidad || productoData.stock || 0)
            const restoreQty = Number(detail.cantidad || 0)
            stockUpdates.push({ 
              ref: productoRef, 
              newStock: currentStock + restoreQty,
              productName: detail.nombre,
              restoreQty
            })
          } else {
            console.warn(`Producto no encontrado: ${detail.productoDocId} (${detail.nombre})`)
          }
        }
      }

      // Actualizar stock de todos los productos
      for (const update of stockUpdates) {
        transaction.update(update.ref, { 
          cantidad: update.newStock, 
          ultimaActualizacion: new Date().toISOString() 
        })
      }

      // Eliminar todos los detalles de la venta
      for (const detail of details) {
        transaction.delete(doc(db, 'ventaDet', detail.id))
      }

      // Eliminar el encabezado de la venta
      transaction.delete(doc(db, 'ventaEnc', ventaId))

      return { deletedDetails: details.length, stockUpdates: stockUpdates.length }
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
