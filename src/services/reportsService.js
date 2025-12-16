// Servicio para obtener datos de reportes
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'
import { app } from '../firebase'
import { getDateStringFromISO, getLocalDateStringFromISO } from '../utils/dateUtils'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const db = getFirestore(app)

export const getReportsData = async () => {
  // Obtener datos de ventas de Firestore
  const salesData = await getSalesDataFromFirestore()
  
  // Obtener datos de inventario de Firestore
  const inventoryData = await getInventoryDataFromFirestore()
  
  // Calcular métricas de ventas
  const salesMetrics = calculateSalesMetrics(salesData)
  
  // Calcular métricas de inventario
  const inventoryMetrics = calculateInventoryMetrics(inventoryData, salesData)
  
  return {
    sales: salesMetrics,
    inventory: inventoryMetrics
  }
}

// Función para obtener ventas de Firestore
const getSalesDataFromFirestore = async () => {
  try {
    const ventasSnapshot = await getDocs(collection(db, 'ventaEnc'))
    
    const salesData = []
    
    for (const ventaDoc of ventasSnapshot.docs) {
      const ventaData = { id: ventaDoc.id, ...ventaDoc.data() }
      
      // Obtener detalles de la venta
      const detallesQuery = query(collection(db, 'ventaDet'), where('idVentaEnc', '==', ventaDoc.id))
      const detallesSnapshot = await getDocs(detallesQuery)
      const items = detallesSnapshot.docs.map(doc => doc.data())
      
      salesData.push({
        ...ventaData,
        timestamp: ventaData.fechaHora,
        total: Number(ventaData.total || 0),
        items: items
      })
    }
    
    return salesData
  } catch (error) {
    console.error('Error obteniendo ventas de Firestore:', error)
    return []
  }
}

// Función para obtener inventario de Firestore
const getInventoryDataFromFirestore = async () => {
  try {
    const inventarioSnapshot = await getDocs(collection(db, 'inventario'))
    return inventarioSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      quantity: Number(doc.data().cantidad || doc.data().stock || 0),
      minStock: Number(doc.data().minStock || 5)
    }))
  } catch (error) {
    console.error('Error obteniendo inventario de Firestore:', error)
    return []
  }
}

const calculateSalesMetrics = (salesData) => {
  if (!salesData || salesData.length === 0) {
    return {
      totalSales: 0,
      totalRevenue: 0,
      averageTicket: 0,
      salesByDay: [
        { day: 'Lun', sales: 0 },
        { day: 'Mar', sales: 0 },
        { day: 'Mié', sales: 0 },
        { day: 'Jue', sales: 0 },
        { day: 'Vie', sales: 0 },
        { day: 'Sáb', sales: 0 },
        { day: 'Dom', sales: 0 }
      ]
    }
  }

  const totalSales = salesData.length
  const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0)
  const averageTicket = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0

  // Agrupar ventas por día de la semana
  const salesByDay = [
    { day: 'Lun', sales: 0 },
    { day: 'Mar', sales: 0 },
    { day: 'Mié', sales: 0 },
    { day: 'Jue', sales: 0 },
    { day: 'Vie', sales: 0 },
    { day: 'Sáb', sales: 0 },
    { day: 'Dom', sales: 0 }
  ]

  salesData.forEach(sale => {
    if (sale.timestamp) {
      const date = new Date(sale.timestamp)
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1 // Convertir domingo (0) a índice 6
      if (dayIndex >= 0 && dayIndex < 7) {
        salesByDay[dayIndex].sales++
      }
    }
  })

  return {
    totalSales,
    totalRevenue,
    averageTicket,
    salesByDay
  }
}

const calculateInventoryMetrics = (inventoryData, salesData) => {
  if (!inventoryData || inventoryData.length === 0) {
    return {
      totalProducts: 0,
      lowStock: 0,
      outOfStock: 0,
      topProducts: []
    }
  }

  const totalProducts = inventoryData.length
  const lowStock = inventoryData.filter(product => 
    (product.quantity || 0) > 0 && (product.quantity || 0) <= (product.minStock || 5)
  ).length
  const outOfStock = inventoryData.filter(product => (product.quantity || 0) === 0).length

  // Calcular productos más vendidos basado en las ventas de Firestore
  const productSales = {}

  // Contar ventas por producto
  salesData.forEach(sale => {
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        const productName = item.nombre || 'Producto desconocido'
        const quantity = Number(item.cantidad || 1)
        productSales[productName] = (productSales[productName] || 0) + quantity
      })
    }
  })

  // Crear array de productos más vendidos
  const topProducts = Object.entries(productSales)
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5) // Top 5 productos

  // Si no hay ventas, mostrar los primeros productos del inventario
  if (topProducts.length === 0) {
    const fallbackProducts = inventoryData.slice(0, 5).map(product => ({
      name: product.nombre || product.name || 'Producto sin nombre',
      sales: 0
    }))
    topProducts.push(...fallbackProducts)
  }

  return {
    totalProducts,
    lowStock,
    outOfStock,
    topProducts
  }
}

// Obtener gastos de Firestore
const getExpensesDataFromFirestore = async () => {
  try {
    // Obtener todos los gastos sin ordenamiento en la consulta (evita índices)
    const gastosSnapshot = await getDocs(collection(db, 'gastos'))
    const expenses = gastosSnapshot.docs.map(doc => {
      const data = doc.data()
      
      // El gasto puede tener fecha en formato "fecha" (YYYY-MM-DD) o "fechaHora" (ISO)
      let fechaHora = data.fechaHora
      if (!fechaHora && data.fecha) {
        // Si solo tiene fecha (YYYY-MM-DD), crear un ISO string para ese día
        fechaHora = new Date(data.fecha + 'T00:00:00Z').toISOString()
      }
      if (!fechaHora) {
        // Si no tiene ninguna fecha, usar la actual
        fechaHora = new Date().toISOString()
      }
      
      return {
        id: doc.id,
        ...data,
        monto: Number(data.monto || 0),
        fechaHora: fechaHora,
        fecha: data.fecha || fechaHora.split('T')[0]
      }
    })
    

    return expenses
  } catch (error) {
    console.error('Error obteniendo gastos de Firestore:', error)
    return []
  }
}

// Obtener proveedores de Firestore con sus productos y compras
const getProvidersDataFromFirestore = async () => {
  try {
    const proveedoresSnapshot = await getDocs(collection(db, 'proveedores'))
    const providers = []
    
    for (const provDoc of proveedoresSnapshot.docs) {
      const provData = { id: provDoc.id, ...provDoc.data() }
      
      // Obtener productos del proveedor
      const productosQuery = query(collection(db, 'proveedorProductos'), where('idProveedor', '==', provDoc.id))
      const productosSnapshot = await getDocs(productosQuery)
      const productos = productosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        costo: Number(doc.data().costo || 0),
        precio: Number(doc.data().precio || 0),
        cantidad: Number(doc.data().cantidad || 0)
      }))
      
      // Obtener compras del proveedor
      const comprasQuery = query(collection(db, 'compras'), where('idProveedor', '==', provDoc.id))
      const comprasSnapshot = await getDocs(comprasQuery)
      const compras = comprasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        total: Number(doc.data().total || 0)
      }))
      
      providers.push({
        ...provData,
        productos: productos,
        compras: compras,
        totalProductos: productos.length,
        totalCompras: compras.length,
        montoTotalCompras: compras.reduce((sum, c) => sum + (c.total || 0), 0)
      })
    }
    
    return providers
  } catch (error) {
    console.error('Error obteniendo proveedores de Firestore:', error)
    return []
  }
}

// Calcular métricas de gastos
const calculateExpensesMetrics = (expensesData) => {
  if (!expensesData || expensesData.length === 0) {
    return {
      totalExpenses: 0,
      expensesByCategory: [
        { category: 'Operativos', amount: 0, color: '#e91e63' },
        { category: 'Inventario', amount: 0, color: '#e57373' },
        { category: 'Marketing', amount: 0, color: '#ff9800' },
        { category: 'Personal', amount: 0, color: '#9c27b0' },
        { category: 'Otros', amount: 0, color: '#9c27b0' }
      ]
    }
  }

  const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.monto || 0), 0)
  

  // Normalizar categorías para evitar problemas de formato
  const normalize = (str) => {
    return (str || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
      .replace(/\s+/g, '') // quita espacios
  }

  const categoryMap = {
    'operativos': { category: 'Operativos', color: '#e91e63' },
    'inventario': { category: 'Inventario', color: '#e57373' },
    'marketing': { category: 'Marketing', color: '#ff9800' },
    'personal': { category: 'Personal', color: '#9c27b0' },
    'otros': { category: 'Otros', color: '#9c27b0' }
  }


  // Categorías presentes en los datos
  const foundCategories = {};
  expensesData.forEach(e => {
    const norm = normalize(e.categoria);
    if (!foundCategories[norm]) {
      foundCategories[norm] = {
        category: e.categoria || 'Sin categoría',
        color: categoryMap[norm]?.color || '#bdbdbd',
        amount: 0
      };
    }
    foundCategories[norm].amount += e.monto || 0;
  });

  // Mantener el orden de las categorías predefinidas primero
  const expensesByCategory = [
    ...Object.entries(categoryMap).map(([key, value]) => {
      const found = foundCategories[key];
      return {
        category: value.category,
        amount: found ? found.amount : 0,
        color: value.color
      };
    }),
    // Agregar las categorías no predefinidas
    ...Object.entries(foundCategories)
      .filter(([key]) => !categoryMap[key])
      .map(([key, value]) => ({
        category: value.category,
        amount: value.amount,
        color: value.color
      }))
  ];

  return {
    totalExpenses,
    expensesByCategory
  }
}

// Calcular métricas de proveedores
const calculateProvidersMetrics = (providersData) => {
  if (!providersData || providersData.length === 0) {
    return {
      totalProviders: 0,
      totalProductos: 0,
      proveedoresPrincipales: [],
      analisisMargen: {
        margenPromedio: 0,
        productosAltaMargen: [],
        productosBajaMargen: []
      }
    }
  }

  const totalProviders = providersData.filter(p => p.activo !== false).length
  const totalProductos = providersData.reduce((sum, p) => sum + (p.totalProductos || 0), 0)
  
  // Proveedores principales por monto de compras
  const proveedoresPrincipales = providersData
    .filter(p => p.activo !== false)
    .map(p => ({
      nombre: p.nombre,
      montoCompras: p.montoTotalCompras || 0,
      totalProductos: p.totalProductos || 0,
      cantidadCompras: p.totalCompras || 0
    }))
    .sort((a, b) => b.montoCompras - a.montoCompras)
    .slice(0, 5)

  // Análisis de margen de ganancia
  const allProducts = providersData.flatMap(p => 
    (p.productos || []).map(prod => ({
      nombre: prod.nombre,
      proveedor: p.nombre,
      costo: prod.costo || 0,
      precio: prod.precio || 0,
      margen: prod.precio && prod.costo ? ((prod.precio - prod.costo) / prod.costo * 100) : 0
    }))
  )

  const margenPromedio = allProducts.length > 0 
    ? Math.round(allProducts.reduce((sum, p) => sum + p.margen, 0) / allProducts.length)
    : 0

  const productosAltaMargen = allProducts
    .filter(p => p.margen >= 50)
    .sort((a, b) => b.margen - a.margen)
    .slice(0, 5)

  const productosBajaMargen = allProducts
    .filter(p => p.margen > 0 && p.margen < 20)
    .sort((a, b) => a.margen - b.margen)
    .slice(0, 5)

  return {
    totalProviders,
    totalProductos,
    proveedoresPrincipales,
    analisisMargen: {
      margenPromedio,
      productosAltaMargen,
      productosBajaMargen
    }
  }
}

// Calcular métricas de rentabilidad por producto
const calculateProfitabilityMetrics = (salesData, providersData, inventoryData) => {
  if (!salesData || salesData.length === 0) {
    return {
      costopromedioVendido: 0,
      precioPromedio: 0,
      margenPromedioPorProducto: 0,
      productosVendidos: [],
      costoTotalInventario: 0,
      precioTotalInventario: 0
    }
  }

  // Normalizar clave de producto (nombre -> lowercase trimmed)
  const normKey = (s) => String(s || '').trim().toLowerCase()

  // Crear mapa de costos y precios de productos desde inventario y proveedores
  const productoCostos = {}
  const productoPrecios = {}

  // Obtener costos desde proveedorProductos (normalizando nombres)
  ;(providersData || []).forEach(provider => {
    if (provider.productos) {
      provider.productos.forEach(prod => {
        const key = normKey(prod.nombre || prod.name)
        if (!productoCostos[key]) {
          productoCostos[key] = Number(prod.costo || prod.cost || 0)
        }
      })
    }
  })

  // Obtener precios desde inventario y usar costo del inventario como fallback
  ;(inventoryData || []).forEach(inv => {
    const key = normKey(inv.nombre || inv.name)
    productoPrecios[key] = Number(inv.precio || inv.price || 0)
    if (!productoCostos[key]) {
      productoCostos[key] = Number(inv.costo || inv.cost || 0)
    }
  })

  // Calcular métricas de productos vendidos
  const productosVendidosMap = {}
  
  salesData.forEach(sale => {
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        const rawName = item.nombre || item.name || 'Producto desconocido'
        const nombre = String(rawName)
        const key = normKey(rawName)
        const cantidad = Number(item.cantidad || 1)
        const precioVenta = Number(item.precioUnitario || item.precio || 0)
        const costo = Number(productoCostos[key] || 0)
        const margen = precioVenta > 0 ? ((precioVenta - costo) / (precioVenta || 1) * 100) : 0

        if (!productosVendidosMap[nombre]) {
          productosVendidosMap[nombre] = {
            nombre: nombre,
            cantidadVendida: 0,
            costoPorUnidad: costo,
            precioPorUnidad: precioVenta,
            margenPorcentaje: margen,
            ingresoTotal: 0,
            costoTotal: 0,
            gananciaTotal: 0
          }
        }

        productosVendidosMap[nombre].cantidadVendida += cantidad
        productosVendidosMap[nombre].ingresoTotal += precioVenta * cantidad
        productosVendidosMap[nombre].costoTotal += costo * cantidad
        productosVendidosMap[nombre].gananciaTotal += (precioVenta - costo) * cantidad
      })
    }
  })

    // Incluir productos del inventario que no aparecen en las ventas (cantidadVendida = 0)
    ;(inventoryData || []).forEach(inv => {
      const invName = inv.nombre || inv.name || 'Producto sin nombre'
      if (!productosVendidosMap[invName]) {
        const key = normKey(invName)
        const costoInv = Number(productoCostos[key] || 0)
        const precioInv = Number(productoPrecios[key] || 0)
        const margenInv = precioInv > 0 ? ((precioInv - costoInv) / (precioInv || 1) * 100) : 0
        productosVendidosMap[invName] = {
          nombre: invName,
          cantidadVendida: 0,
          costoPorUnidad: costoInv,
          precioPorUnidad: precioInv,
          margenPorcentaje: margenInv,
          ingresoTotal: 0,
          costoTotal: 0,
          gananciaTotal: 0
        }
      }
    })

    const productosVendidos = Object.values(productosVendidosMap)
      .sort((a, b) => b.gananciaTotal - a.gananciaTotal)

  // Calcular promedios
  const costopromedioVendido = productosVendidos.length > 0
    ? productosVendidos.reduce((sum, p) => sum + p.costoPorUnidad, 0) / productosVendidos.length
    : 0

  const precioPromedio = productosVendidos.length > 0
    ? productosVendidos.reduce((sum, p) => sum + p.precioPorUnidad, 0) / productosVendidos.length
    : 0

  const margenPromedioPorProducto = productosVendidos.length > 0
    ? productosVendidos.reduce((sum, p) => sum + p.margenPorcentaje, 0) / productosVendidos.length
    : 0

  // Calcular costo total del inventario
  const costoTotalInventario = (inventoryData || []).reduce((sum, inv) => {
    const key = normKey(inv.nombre || inv.name)
    const costo = Number(productoCostos[key] || 0)
    const cantidad = Number(inv.cantidad || inv.stock || 0)
    return sum + (costo * cantidad)
  }, 0)

  const precioTotalInventario = inventoryData.reduce((sum, inv) => {
    const precio = inv.precio || 0
    const cantidad = inv.cantidad || inv.stock || 0
    return sum + (precio * cantidad)
  }, 0)

  return {
    costopromedioVendido: Math.round(costopromedioVendido * 100) / 100,
    precioPromedio: Math.round(precioPromedio * 100) / 100,
    margenPromedioPorProducto: Math.round(margenPromedioPorProducto * 100) / 100,
    productosVendidos: productosVendidos.slice(0, 10),
    costoTotalInventario: Math.round(costoTotalInventario * 100) / 100,
    precioTotalInventario: Math.round(precioTotalInventario * 100) / 100
  }
}

// Función para filtrar datos por rango de fechas
export const getFilteredReportsData = async (startDate, endDate) => {
  try {
    
    // Obtener todas las ventas de Firestore
    const allSalesData = await getSalesDataFromFirestore()
    
    // Obtener datos de inventario de Firestore
    const inventoryData = await getInventoryDataFromFirestore()

    // Obtener datos de gastos de Firestore
    const allExpensesData = await getExpensesDataFromFirestore()

    // Obtener datos de proveedores de Firestore
    const providersData = await getProvidersDataFromFirestore()

    // Convertir compras a gastos con categoría 'Inventario' para reportes
    const purchaseExpenses = (providersData || []).flatMap(provider => (
      (provider.compras || []).map(compra => {
        const fechaHora = compra.fechaHora || compra.fecha || new Date().toISOString()
        return {
          id: compra.id || `${provider.id}_compra_${Math.random().toString(36).substr(2,9)}`,
          monto: Number(compra.total || compra.monto || 0),
          fechaHora: fechaHora,
          fecha: compra.fecha || getDateStringFromISO(compra.fechaHora) || fechaHora.split('T')[0],
          categoria: 'Inventario',
          descripcion: `Compra a ${provider.nombre || 'Proveedor'}`
        }
      })
    ))

    // Unir gastos de la colección 'gastos' con las compras convertidas
    const mergedExpensesData = [ ...(allExpensesData || []), ...purchaseExpenses ]

    // Filtrar ventas por fecha usando la fecha local (YYYY-MM-DD)
    const filteredSales = allSalesData.filter(sale => {
      if (!sale.timestamp) return false
      const saleDateString = getLocalDateStringFromISO(sale.timestamp)
      if (!saleDateString) return false
      return saleDateString >= startDate && saleDateString <= endDate
    })

    // Filtrar gastos por fecha - usar fecha local cuando haya timestamp
    const filteredExpenses = mergedExpensesData.filter(expense => {
      if (!expense.fechaHora && !expense.fecha) return false
      const expenseDateString = expense.fecha || getLocalDateStringFromISO(expense.fechaHora)
      if (!expenseDateString) return false
      return expenseDateString >= startDate && expenseDateString <= endDate
    })




    // Calcular métricas con datos filtrados
    const salesMetrics = calculateSalesMetrics(filteredSales)
    const inventoryMetrics = calculateInventoryMetrics(inventoryData, filteredSales)
    const expensesMetrics = calculateExpensesMetrics(filteredExpenses)
    const providersMetrics = calculateProvidersMetrics(providersData)
    const profitabilityMetrics = calculateProfitabilityMetrics(filteredSales, providersData, inventoryData)





    return {
      sales: salesMetrics,
      inventory: inventoryMetrics,
      expenses: expensesMetrics,
      providers: providersMetrics,
      profitability: profitabilityMetrics
    }
  } catch (error) {
    console.error('Error obteniendo datos filtrados:', error)
    return {
      sales: { totalSales: 0, totalRevenue: 0, averageTicket: 0, salesByDay: [] },
      inventory: { totalProducts: 0, lowStock: 0, outOfStock: 0, topProducts: [] },
      expenses: { totalExpenses: 0, expensesByCategory: [] },
      providers: { totalProviders: 0, totalProductos: 0, proveedoresPrincipales: [], analisisMargen: { margenPromedio: 0, productosAltaMargen: [], productosBajaMargen: [] } },
      profitability: { costopromedioVendido: 0, precioPromedio: 0, margenPromedioPorProducto: 0, productosVendidos: [], costoTotalInventario: 0, precioTotalInventario: 0 }
    }
  }
}

// Función para exportar reportes
export const exportReportData = (reportData, format, reportType) => {
  const timestamp = new Date().toISOString().split('T')[0]
  const fileName = `reporte_${reportType}_${timestamp}`
  
  try {
    if (format === 'PDF') {
      generatePDFReport(reportData, fileName, reportType)
    } else if (format === 'Excel') {
      generateExcelReport(reportData, fileName, reportType)
    }
  } catch (error) {
    console.error('Error al exportar reporte:', error)
    alert('Error al generar el reporte: ' + error.message)
  }
}

// Generar reporte en PDF
const generatePDFReport = (reportData, fileName, reportType) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width

  doc.setFontSize(20)
  doc.setTextColor(40)

  const titles = {
    sales: 'Reporte de Ventas',
    inventory: 'Reporte de Inventario',
    expenses: 'Reporte de Gastos',
    profitability: 'Reporte de Rentabilidad'
  }

  const mainTitle = titles[reportType] || 'Reporte'
  doc.text(mainTitle, pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.setTextColor(100)
  doc.text(`Generado el: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' })

  let yPosition = 50

  switch (reportType) {
    case 'sales': {
      doc.setFontSize(16)
      doc.setTextColor(40)
      doc.text('Resumen de Ventas', 14, yPosition)
      yPosition += 10
      doc.setFontSize(12)
      doc.text(`Total de Ventas: ${reportData.sales.totalSales}`, 14, yPosition)
      yPosition += 8
      doc.text(`Ingresos Totales: L${reportData.sales.totalRevenue.toLocaleString()}`, 14, yPosition)
      yPosition += 8
      doc.text(`Ticket Promedio: L${reportData.sales.averageTicket}`, 14, yPosition)
      yPosition += 12

      if (reportData.sales.salesByDay && reportData.sales.salesByDay.length > 0) {
        const salesTableData = reportData.sales.salesByDay.map(day => [day.day, day.sales])
        autoTable(doc, {
          head: [['Día', 'Ventas']],
          body: salesTableData,
          startY: yPosition,
          headStyles: { fillColor: [233, 30, 99] },
          margin: { left: 14 }
        })
      }
      break
    }
    case 'inventory': {
      doc.setFontSize(16)
      doc.setTextColor(40)
      doc.text('Resumen de Inventario', 14, yPosition)
      yPosition += 10
      doc.setFontSize(12)
      doc.text(`Total de Productos: ${reportData.inventory.totalProducts}`, 14, yPosition)
      yPosition += 8
      doc.text(`Productos con Stock Bajo: ${reportData.inventory.lowStock}`, 14, yPosition)
      yPosition += 8
      doc.text(`Productos Sin Stock: ${reportData.inventory.outOfStock}`, 14, yPosition)
      yPosition += 12

      if (reportData.inventory.topProducts && reportData.inventory.topProducts.length > 0) {
        const topProductsData = reportData.inventory.topProducts.map((product, index) => [
          index + 1,
          product.name,
          product.sales
        ])
        autoTable(doc, {
          head: [['#', 'Producto', 'Ventas']],
          body: topProductsData,
          startY: yPosition,
          headStyles: { fillColor: [233, 30, 99] },
          margin: { left: 14 }
        })
      }
      break
    }
    case 'expenses': {
      doc.setFontSize(16)
      doc.setTextColor(40)
      doc.text('Resumen de Gastos', 14, yPosition)
      yPosition += 10
      doc.setFontSize(12)
      doc.text(`Gastos Totales: L${(reportData.expenses && reportData.expenses.totalExpenses) ? reportData.expenses.totalExpenses.toLocaleString() : 0}`, 14, yPosition)
      yPosition += 12

      if (reportData.expenses && Array.isArray(reportData.expenses.expensesByCategory) && reportData.expenses.expensesByCategory.length > 0) {
        const catTable = reportData.expenses.expensesByCategory.map(c => [c.category, `L${(c.amount || 0).toLocaleString()}`])
        autoTable(doc, {
          head: [['Categoría', 'Monto']],
          body: catTable,
          startY: yPosition,
          headStyles: { fillColor: [233, 30, 99] },
          margin: { left: 14 }
        })
      }
      break
    }
    case 'profitability': {
      doc.setFontSize(16)
      doc.setTextColor(40)
      doc.text('Resumen de Rentabilidad', 14, yPosition)
      yPosition += 10
      doc.setFontSize(12)

      const ingresos = reportData.sales?.totalRevenue || 0
      const gastos = reportData.expenses?.totalExpenses || 0
      const profit = ingresos - gastos
      const margin = ingresos > 0 ? ((profit / ingresos) * 100).toFixed(2) : '0'

      doc.text(`Ingresos Totales: L${ingresos.toLocaleString()}`, 14, yPosition); yPosition += 8
      doc.text(`Gastos Totales: L${gastos.toLocaleString()}`, 14, yPosition); yPosition += 8
      doc.text(`Ganancia Neta: L${profit.toLocaleString()}`, 14, yPosition); yPosition += 8
      doc.text(`Margen: ${margin}%`, 14, yPosition); yPosition += 12

      // Tabla: Top vendidos (si existe)
      if (reportData.profitability && Array.isArray(reportData.profitability.productosVendidos) && reportData.profitability.productosVendidos.length > 0) {
        const topData = reportData.profitability.productosVendidos.map((p, idx) => [idx + 1, p.nombre || p.name, p.cantidadVendida || 0])
        autoTable(doc, {
          head: [['#', 'Producto', 'Cantidad Vendida']],
          body: topData,
          startY: yPosition,
          headStyles: { fillColor: [233, 30, 99] },
          margin: { left: 14 }
        })
      }
      break
    }
    default: {
      doc.setFontSize(12)
      doc.text('No hay contenido específico para este tipo de reporte.', 14, yPosition)
    }
  }

  doc.save(`${fileName}.pdf`)
}

// Generar reporte en Excel
const generateExcelReport = (reportData, fileName, reportType) => {
  const workbook = XLSX.utils.book_new()

  switch (reportType) {
    case 'sales': {
      const summaryData = [
        ['Reporte de Ventas'],
        ['Fecha:', new Date().toLocaleDateString()],
        [''],
        ['Métricas Principales'],
        ['Total de Ventas:', reportData.sales.totalSales],
        ['Ingresos Totales:', `L${reportData.sales.totalRevenue.toLocaleString()}`],
        ['Ticket Promedio:', `L${reportData.sales.averageTicket}`],
        [''],
        ['Ventas por Día de la Semana'],
        ['Día', 'Cantidad de Ventas'],
        ...((reportData.sales.salesByDay || []).map(day => [day.day, day.sales]))
      ]

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen de Ventas')
      break
    }
    case 'inventory': {
      const summaryData = [
        ['Reporte de Inventario'],
        ['Fecha:', new Date().toLocaleDateString()],
        [''],
        ['Métricas Principales'],
        ['Total de Productos:', reportData.inventory.totalProducts],
        ['Productos con Stock Bajo:', reportData.inventory.lowStock],
        ['Productos Sin Stock:', reportData.inventory.outOfStock],
        [''],
        ['Productos Más Vendidos'],
        ['Posición', 'Producto', 'Ventas'],
        ...((reportData.inventory.topProducts || []).map((product, index) => [index + 1, product.name, product.sales]))
      ]

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen de Inventario')
      break
    }
    case 'expenses': {
      const summaryData = [
        ['Reporte de Gastos'],
        ['Fecha:', new Date().toLocaleDateString()],
        [''],
        ['Gastos Totales:', (reportData.expenses && reportData.expenses.totalExpenses) ? `L${reportData.expenses.totalExpenses.toLocaleString()}` : 'L0'],
        [''],
        ['Gastos por Categoría'],
        ['Categoría', 'Monto'],
        ...((reportData.expenses.expensesByCategory || []).map(c => [c.category, `L${(c.amount || 0).toLocaleString()}`]))
      ]

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Gastos')
      break
    }
    case 'profitability': {
      const ingresos = reportData.sales?.totalRevenue || 0
      const gastos = reportData.expenses?.totalExpenses || 0
      const profit = ingresos - gastos

      const summaryData = [
        ['Reporte de Rentabilidad'],
        ['Fecha:', new Date().toLocaleDateString()],
        [''],
        ['Ingresos Totales:', `L${ingresos.toLocaleString()}`],
        ['Gastos Totales:', `L${gastos.toLocaleString()}`],
        ['Ganancia Neta:', `L${profit.toLocaleString()}`],
        [''],
        ['Top Productos (por cantidad vendida)'],
        ['Pos', 'Producto', 'Cantidad Vendida'],
        ...((reportData.profitability.productosVendidos || []).map((p, i) => [i + 1, p.nombre || p.name, p.cantidadVendida || 0]))
      ]

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Rentabilidad')
      break
    }
    default: {
      const summaryData = [['Reporte'], ['Fecha:', new Date().toLocaleDateString()]]
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')
    }
  }

  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}