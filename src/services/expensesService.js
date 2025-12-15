// Servicio para gestión de gastos y compras
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, where, orderBy, deleteDoc, getDoc, limit } from 'firebase/firestore'
import { app } from '../firebase'

const db = getFirestore(app)

// Categorías de gastos
export const EXPENSE_CATEGORIES = [
  { id: 'compras', name: 'Compras', color: '#e91e63' },
  { id: 'inventario', name: 'Inventario', color: '#e57373' },
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
    const fechaHora = new Date().toISOString()
    const fecha = fechaHora.split('T')[0] // YYYY-MM-DD
    
    const payload = {
      descripcion: expenseData.descripcion,
      monto: Number(expenseData.monto),
      categoria: expenseData.categoria,
      idProveedor: expenseData.idProveedor || null,
      fechaHora: fechaHora,
      fecha: fecha,
      tipo: expenseData.tipo || 'gasto',
      usuarioId: expenseData.usuarioId
    }

    if (expenseData.purchaseId) payload.purchaseId = expenseData.purchaseId

    const docRef = await addDoc(collection(db, 'gastos'), payload)
    return { id: docRef.id, ...expenseData, fecha, fechaHora }
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
      categoria: 'inventario',
      idProveedor: purchaseData.idProveedor,
      usuarioId: purchaseData.usuarioId,
      purchaseId: purchaseRef.id,
      tipo: 'compra'
    })

    // 3. Actualizar o crear productos en inventario
    for (const producto of purchaseData.productos) {
      if (producto.isNew) {
        // Crear nuevo producto en inventario
        await createNewProduct(producto)
      } else {
        // Actualizar stock del producto existente
        await updateProductStock(producto.id, producto.cantidad)
        
        // Si se especificó un precio, actualizar también el precio en inventario
        if (producto.precio) {
          await updateProductPrice(producto.id, producto.precio)
        }
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
    const cantidad = Number(productData.cantidad || 0)
    const docRef = await addDoc(collection(db, 'inventario'), {
      id: productData.id,
      nombre: productData.nombre,
      cantidad: cantidad,
      stock: cantidad, // Mantener ambos campos por compatibilidad
      costo: Number(productData.costo || 0),
      precio: Number(productData.precio || 0),
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      activo: true
    })
    
    
    
    // Retornar el ID del nuevo producto creado
    return docRef.id
  } catch (error) {
    console.error('Error creando nuevo producto:', error)
    throw error
  }
}

// Actualizar stock de producto
const updateProductStock = async (productId, quantityToAdd) => {
  try {
    // Buscar el producto por su ID (campo 'id' dentro del documento)
    const inventarioQuery = query(collection(db, 'inventario'), where('id', '==', productId))
    const inventarioSnapshot = await getDocs(inventarioQuery)
    
    if (!inventarioSnapshot.empty) {
      const productDoc = inventarioSnapshot.docs[0]
      const currentData = productDoc.data()
      const currentStock = Number(currentData.cantidad || currentData.stock || 0)
      const newStock = currentStock + Number(quantityToAdd)
      
      // Actualizar el documento del producto
      await updateDoc(doc(db, 'inventario', productDoc.id), {
        cantidad: newStock,
        stock: newStock, // Mantener ambos campos por compatibilidad
        fechaActualizacion: new Date().toISOString()
      })
      
      
    } else {
      console.warn(`Producto ${productId} no encontrado en inventario`)
    }
  } catch (error) {
    console.error('Error actualizando stock:', error)
    throw error
  }
}

// Actualizar precio de producto
const updateProductPrice = async (productId, newPrice) => {
  try {
    // Buscar el producto por su ID (campo 'id' dentro del documento)
    const inventarioQuery = query(collection(db, 'inventario'), where('id', '==', productId))
    const inventarioSnapshot = await getDocs(inventarioQuery)
    
    if (!inventarioSnapshot.empty) {
      const productDoc = inventarioSnapshot.docs[0]
      
      // Actualizar el precio del producto
      await updateDoc(doc(db, 'inventario', productDoc.id), {
        precio: Number(newPrice),
        fechaActualizacion: new Date().toISOString()
      })
      
      
    } else {
      console.warn(`Producto ${productId} no encontrado para actualizar precio`)
    }
  } catch (error) {
    console.error('Error actualizando precio:', error)
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

// Eliminar gasto; si está vinculado a una compra, eliminar también la compra asociada
export const deleteExpense = async (expenseId) => {
  try {
    const expenseRef = doc(db, 'gastos', expenseId)
    const expenseSnap = await getDoc(expenseRef)
    if (!expenseSnap.exists()) return { deleted: false }

    const expense = expenseSnap.data()

    // Si tiene purchaseId explícito, eliminar la compra por id
    if (expense.purchaseId) {
      try {
        await deleteDoc(doc(db, 'compras', expense.purchaseId))
      } catch (e) {
        console.warn('No se pudo eliminar compra vinculada por purchaseId:', e)
      }
    } else if (expense.categoria === 'inventario' && expense.idProveedor && expense.monto) {
      // Fallback: intentar encontrar una compra con mismo proveedor y total en la misma fecha
      try {
        const purchasesQuery = query(
          collection(db, 'compras'),
          where('idProveedor', '==', expense.idProveedor),
          where('total', '==', Number(expense.monto)),
          orderBy('fechaHora', 'desc'),
          limit(1)
        )
        const purchasesSnap = await getDocs(purchasesQuery)
        if (!purchasesSnap.empty) {
          const candidate = purchasesSnap.docs[0]
          const compraFecha = candidate.data().fechaHora ? new Date(candidate.data().fechaHora).toISOString().split('T')[0] : null
          const gastoFecha = expense.fechaHora ? new Date(expense.fechaHora).toISOString().split('T')[0] : (expense.fecha || null)
          if (compraFecha && gastoFecha && compraFecha === gastoFecha) {
            await deleteDoc(doc(db, 'compras', candidate.id))
          }
        }
      } catch (e) {
        console.warn('Fallback eliminación compra no tuvo éxito:', e)
      }
    }

    // Finalmente eliminar el gasto
    await deleteDoc(expenseRef)
    return { deleted: true }
  } catch (error) {
    console.error('Error eliminando gasto:', error)
    throw error
  }
}