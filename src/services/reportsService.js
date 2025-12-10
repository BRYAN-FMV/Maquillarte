// Servicio para obtener datos de reportes
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'
import { app } from '../firebase'
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
      quantity: Number(doc.data().stock || 0),
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

// Función para filtrar datos por rango de fechas
export const getFilteredReportsData = async (startDate, endDate) => {
  try {
    
    // Obtener todas las ventas de Firestore
    const allSalesData = await getSalesDataFromFirestore()
    
    // Obtener datos de inventario de Firestore
    const inventoryData = await getInventoryDataFromFirestore()

    // Filtrar ventas por fecha
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999) // Incluir todo el día final


    const filteredSales = allSalesData.filter(sale => {
      if (!sale.timestamp) {
        return false
      }
      
      // Convertir la fecha de la venta a fecha local (sin hora)
      const saleDate = new Date(sale.timestamp)
      const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate())
      
      // Convertir las fechas de filtro a fechas locales
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      
      const isInRange = saleDateOnly >= startDateOnly && saleDateOnly <= endDateOnly
      return isInRange
    })


    // Calcular métricas con datos filtrados
    const salesMetrics = calculateSalesMetrics(filteredSales)
    const inventoryMetrics = calculateInventoryMetrics(inventoryData, filteredSales)

    return {
      sales: salesMetrics,
      inventory: inventoryMetrics
    }
  } catch (error) {
    console.error('Error obteniendo datos filtrados:', error)
    return {
      sales: { totalSales: 0, totalRevenue: 0, averageTicket: 0, salesByDay: [] },
      inventory: { totalProducts: 0, lowStock: 0, outOfStock: 0, topProducts: [] }
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
  
  // Configurar fuente y títulos
  doc.setFontSize(20)
  doc.setTextColor(40)
  
  // Título principal
  const mainTitle = reportType === 'sales' ? 'Reporte de Ventas' : 'Reporte de Inventario'
  doc.text(mainTitle, pageWidth / 2, 20, { align: 'center' })
  
  // Fecha del reporte
  doc.setFontSize(12)
  doc.setTextColor(100)
  doc.text(`Generado el: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' })
  
  let yPosition = 50

  if (reportType === 'sales') {
    // Reporte de Ventas
    doc.setFontSize(16)
    doc.setTextColor(40)
    doc.text('Resumen de Ventas', 14, yPosition)
    yPosition += 10
    
    // Métricas principales
    doc.setFontSize(12)
    doc.text(`Total de Ventas: ${reportData.sales.totalSales}`, 14, yPosition)
    yPosition += 8
    doc.text(`Ingresos Totales: $${reportData.sales.totalRevenue.toLocaleString()}`, 14, yPosition)
    yPosition += 8
    doc.text(`Ticket Promedio: $${reportData.sales.averageTicket}`, 14, yPosition)
    yPosition += 15
    
    // Tabla de ventas por día
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
  } else {
    // Reporte de Inventario
    doc.setFontSize(16)
    doc.setTextColor(40)
    doc.text('Resumen de Inventario', 14, yPosition)
    yPosition += 10
    
    // Métricas principales
    doc.setFontSize(12)
    doc.text(`Total de Productos: ${reportData.inventory.totalProducts}`, 14, yPosition)
    yPosition += 8
    doc.text(`Productos con Stock Bajo: ${reportData.inventory.lowStock}`, 14, yPosition)
    yPosition += 8
    doc.text(`Productos Sin Stock: ${reportData.inventory.outOfStock}`, 14, yPosition)
    yPosition += 15
    
    // Tabla de productos más vendidos
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
  }
  
  // Guardar PDF
  doc.save(`${fileName}.pdf`)
}

// Generar reporte en Excel
const generateExcelReport = (reportData, fileName, reportType) => {
  const workbook = XLSX.utils.book_new()
  
  if (reportType === 'sales') {
    // Hoja de resumen de ventas
    const summaryData = [
      ['Reporte de Ventas'],
      ['Fecha:', new Date().toLocaleDateString()],
      [''],
      ['Métricas Principales'],
      ['Total de Ventas:', reportData.sales.totalSales],
      ['Ingresos Totales:', `$${reportData.sales.totalRevenue.toLocaleString()}`],
      ['Ticket Promedio:', `$${reportData.sales.averageTicket}`],
      [''],
      ['Ventas por Día de la Semana'],
      ['Día', 'Cantidad de Ventas'],
      ...reportData.sales.salesByDay.map(day => [day.day, day.sales])
    ]
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    
    // Aplicar estilos básicos
    summarySheet['A1'] = { v: 'Reporte de Ventas', t: 's', s: { font: { bold: true, sz: 16 } } }
    summarySheet['A4'] = { v: 'Métricas Principales', t: 's', s: { font: { bold: true } } }
    summarySheet['A9'] = { v: 'Ventas por Día de la Semana', t: 's', s: { font: { bold: true } } }
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen de Ventas')
    
  } else {
    // Hoja de resumen de inventario
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
      ...reportData.inventory.topProducts.map((product, index) => [
        index + 1,
        product.name,
        product.sales
      ])
    ]
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    
    // Aplicar estilos básicos
    summarySheet['A1'] = { v: 'Reporte de Inventario', t: 's', s: { font: { bold: true, sz: 16 } } }
    summarySheet['A4'] = { v: 'Métricas Principales', t: 's', s: { font: { bold: true } } }
    summarySheet['A9'] = { v: 'Productos Más Vendidos', t: 's', s: { font: { bold: true } } }
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen de Inventario')
  }
  
  // Guardar Excel
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}