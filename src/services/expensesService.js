// Servicio para gestión de gastos y compras
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore'
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
    const docRef = await addDoc(collection(db, 'inventario'), {
      id: productData.id,
      nombre: productData.nombre,
      cantidad: Number(productData.cantidad || 0),
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
    const productRef = doc(db, 'inventario', productId)
    
    // Obtener el stock actual
    const productSnapshot = await getDocs(collection(db, 'inventario'))
    const currentProduct = productSnapshot.docs.find(doc => doc.id === productId)
    
    if (currentProduct) {
      const currentStock = Number(currentProduct.data().stock || 0)
      const newStock = currentStock + Number(quantityToAdd)
      
      await updateDoc(productRef, {
        stock: newStock,
        fechaActualizacion: new Date().toISOString()
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