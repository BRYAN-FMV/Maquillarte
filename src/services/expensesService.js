// Servicio para gestión de gastos y compras
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, where, orderBy, setDoc, getDoc, runTransaction, deleteDoc, limit } from 'firebase/firestore'
import { app } from '../firebase'

const db = getFirestore(app)

// Categorías de gastos
export const EXPENSE_CATEGORIES = [
  { id: 'compras', name: 'Compras', color: '#e91e63' },
  { id: 'operacion', name: 'Operación', color: '#2196f3' },
  { id: 'marketing', name: 'Marketing', color: '#ff9800' },
  { id: 'otros', name: 'Otros', color: '#9c27b0' }
]

// Obtener todos los gastos
export const getExpenses = async () => {
  try {
    const expensesQuery = query(collection(db, 'gastos'), orderBy('fechaHora', 'desc'))
    const expensesSnapshot = await getDocs(expensesQuery)
    return expensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error obteniendo gastos:', error)
    return []
  }
}

// Registrar nuevo gasto
export const createExpense = async (expenseData) => {
  try {
    const docRef = await addDoc(collection(db, 'gastos'), {
      descripcion: expenseData.descripcion,
      monto: Number(expenseData.monto),
      categoria: expenseData.categoria,
      idProveedor: expenseData.idProveedor || null,
      fechaHora: new Date().toISOString(),
      tipo: 'gasto',
      usuarioId: expenseData.usuarioId
    })
    return { id: docRef.id, ...expenseData }
  } catch (error) {
    console.error('Error creando gasto:', error)
    throw error
  }
}

// Registrar compra a proveedor (crea gasto y actualiza inventario)
export const registerPurchase = async (purchaseData) => {
  try {
    // 1. Crear registro de compra
    const purchaseRef = await addDoc(collection(db, 'compras'), {
      idProveedor: purchaseData.idProveedor,
      nombreProveedor: purchaseData.nombreProveedor,
      productos: purchaseData.productos,
      total: Number(purchaseData.total),
      fechaHora: new Date().toISOString(),
      usuarioId: purchaseData.usuarioId
    })

    // 2. Registrar como gasto
    await createExpense({
      descripcion: `Compra - ${purchaseData.nombreProveedor}`,
      monto: purchaseData.total,
      categoria: 'compras',
      idProveedor: purchaseData.idProveedor,
      usuarioId: purchaseData.usuarioId
    })

    // 3. Actualizar o crear productos en inventario
    for (const producto of purchaseData.productos) {
      if (producto.isNew) {
        // Crear nuevo producto en inventario
        await createNewProduct(producto)
      } else {
        // Actualizar stock del producto existente
        await updateProductStock(producto.id, producto.cantidad)
      }
    }

    return { id: purchaseRef.id, ...purchaseData }
  } catch (error) {
    console.error('Error registrando compra:', error)
    throw error
  }
}

// Crear nuevo producto en inventario
const createNewProduct = async (productData) => {
  try {
    // Crear documento con ID personalizado igual al id del producto
    const productRef = doc(db, 'inventario', String(productData.id))
    const stockQty = Number(productData.cantidad || productData.stock || 0)
    await setDoc(productRef, {
      id: productData.id,
      nombre: productData.nombre,
      cantidad: stockQty,
      stock: stockQty,
      costo: Number(productData.costo || 0),
      precio: Number(productData.precio || 0),
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      activo: true
    })

    return String(productData.id)
  } catch (error) {
    console.error('Error creando nuevo producto:', error)
    throw error
  }
}

// Actualizar stock de producto
const updateProductStock = async (productId, quantityToAdd) => {
  try {
    const productRef = doc(db, 'inventario', String(productId))

    // Obtener el documento específico
    const productSnapshot = await getDoc(productRef)
    if (productSnapshot.exists()) {
      const data = productSnapshot.data()
      const currentStock = Number(data.stock ?? data.cantidad ?? 0)
      const newStock = currentStock + Number(quantityToAdd)

      await updateDoc(productRef, {
        stock: newStock,
        cantidad: newStock,
        fechaActualizacion: new Date().toISOString()
      })
    } else {
      // Si no existe, crear con el id proporcionado
      const stockQty = Number(quantityToAdd || 0)
      await setDoc(productRef, {
        id: productId,
        nombre: '',
        cantidad: stockQty,
        stock: stockQty,
        costo: 0,
        precio: 0,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        activo: true
      })
    }
  } catch (error) {
    console.error('Error actualizando stock:', error)
    throw error
  }
}

// Obtener gastos por rango de fechas
export const getExpensesByDateRange = async (startDate, endDate) => {
  try {
    const expensesQuery = query(
      collection(db, 'gastos'),
      orderBy('fechaHora', 'desc')
    )
    const expensesSnapshot = await getDocs(expensesQuery)
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    
    return expensesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(expense => {
        const expenseDate = new Date(expense.fechaHora)
        return expenseDate >= start && expenseDate <= end
      })
  } catch (error) {
    console.error('Error obteniendo gastos por fecha:', error)
    return []
  }
}

// Obtener gastos por categoría
export const getExpensesByCategory = async () => {
  try {
    const expenses = await getExpenses()
    const expensesByCategory = {}
    
    EXPENSE_CATEGORIES.forEach(category => {
      expensesByCategory[category.id] = {
        name: category.name,
        color: category.color,
        total: 0,
        count: 0
      }
    })
    
    expenses.forEach(expense => {
      if (expensesByCategory[expense.categoria]) {
        expensesByCategory[expense.categoria].total += Number(expense.monto || 0)
        expensesByCategory[expense.categoria].count += 1
      }
    })
    
    return expensesByCategory
  } catch (error) {
    console.error('Error obteniendo gastos por categoría:', error)
    return {}
  }
}

// Obtener compras de un proveedor específico
export const getPurchasesByProvider = async (providerId) => {
  try {
    const purchasesQuery = query(
      collection(db, 'compras'), 
      where('idProveedor', '==', providerId),
      orderBy('fechaHora', 'desc')
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

// Calcular métricas financieras
export const getFinancialMetrics = async (startDate, endDate) => {
  try {
    // Obtener gastos del período
    const expenses = await getExpensesByDateRange(startDate, endDate)
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.monto || 0), 0)
    
    // Obtener ventas del período (usando el mismo servicio de reportes)
    const { getFilteredReportsData } = await import('./reportsService')
    const reportData = await getFilteredReportsData(startDate, endDate)
    const totalRevenue = reportData.sales.totalRevenue
    
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0
    
    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: Number(profitMargin)
    }
  } catch (error) {
    console.error('Error calculando métricas financieras:', error)
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      profitMargin: 0
    }
  }
}

// Eliminar compra y restaurar inventario (y gasto asociado si se encuentra)
export const deletePurchase = async (purchaseId) => {
  try {
    await runTransaction(db, async (transaction) => {
      const purchaseRef = doc(db, 'compras', purchaseId)
      const purchaseSnap = await transaction.get(purchaseRef)
      if (!purchaseSnap.exists()) throw new Error('Compra no encontrada')

      const purchaseData = purchaseSnap.data()
      const productos = purchaseData.productos || []

      // Restaurar stock para cada producto
      for (const producto of productos) {
        const prodId = String(producto.id)
        const invRef = doc(db, 'inventario', prodId)
        const invSnap = await transaction.get(invRef)
        const qty = Number(producto.cantidad || 0)

        if (invSnap.exists()) {
          const invData = invSnap.data()
          const current = Number(invData.stock ?? invData.cantidad ?? 0)
          const newStock = current + qty
          transaction.update(invRef, { stock: newStock, cantidad: newStock, fechaActualizacion: new Date().toISOString() })
        } else {
          // Crear registro si no existe
          transaction.set(invRef, {
            id: prodId,
            nombre: producto.nombre || '',
            cantidad: qty,
            stock: qty,
            costo: producto.costo || 0,
            precio: producto.precio || 0,
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString(),
            activo: true
          })
        }
      }

      // Eliminar documento de compra
      transaction.delete(purchaseRef)

      // Intentar eliminar gasto asociado (heurística: mismo proveedor + mismo monto + categoría 'compras' cercano en el tiempo)
      try {
        const gastosQuery = query(
          collection(db, 'gastos'),
          where('categoria', '==', 'compras'),
          where('idProveedor', '==', purchaseData.idProveedor || null),
          where('monto', '==', Number(purchaseData.total || 0)),
          orderBy('fechaHora', 'desc'),
          limit(5)
        )
        const gastosSnap = await getDocs(gastosQuery)
        const compraTime = new Date(purchaseData.fechaHora || new Date().toISOString())

        let toDeleteGastoId = null
        for (const gdoc of gastosSnap.docs) {
          const g = gdoc.data()
          const gTime = new Date(g.fechaHora || 0)
          const diff = Math.abs(gTime - compraTime)
          // Si la diferencia es menor a 5 minutos, considerarlo asociado
          if (diff <= 5 * 60 * 1000) {
            toDeleteGastoId = gdoc.id
            break
          }
        }

        if (toDeleteGastoId) {
          const gastoRef = doc(db, 'gastos', toDeleteGastoId)
          transaction.delete(gastoRef)
        }
      } catch (err) {
        // No bloquear la transacción si no se puede borrar el gasto
        console.warn('No se pudo eliminar gasto asociado:', err.message)
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Error eliminando compra:', error)
    return { success: false, error: error.message }
  }
}