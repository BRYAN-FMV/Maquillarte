// Servicio para obtener datos de reportes
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'
import { app } from '../firebase'
import { getDateStringFromISO } from '../utils/dateUtils'
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
  const salesMetrics = calculateSalesMetrics(salesData, inventoryData)
  
  // Calcular métricas de inventario (sin fecha de inicio para reporte general)
  const inventoryMetrics = await calculateInventoryMetrics(inventoryData, salesData)
  
  return {
    sales: salesMetrics,
    inventory: inventoryMetrics
  }
}

// Función para obtener ventas de Firestore - OPTIMIZADO
const getSalesDataFromFirestore = async () => {
  try {
    // Cargar ventas y detalles en paralelo (evita N+1 queries)
    const [ventasSnapshot, detallesSnapshot] = await Promise.all([
      getDocs(collection(db, 'ventaEnc')),
      getDocs(collection(db, 'ventaDet'))
    ])
    
    // Crear mapa de detalles por idVentaEnc
    const detallesPorVenta = {}
    detallesSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const idVenta = data.idVentaEnc
      if (!detallesPorVenta[idVenta]) {
        detallesPorVenta[idVenta] = []
      }
      detallesPorVenta[idVenta].push(data)
    })
    
    // Mapear ventas con sus detalles
    const salesData = ventasSnapshot.docs.map(ventaDoc => {
      const ventaData = { id: ventaDoc.id, ...ventaDoc.data() }
      return {
        ...ventaData,
        timestamp: ventaData.fechaHora,
        total: Number(ventaData.total || 0),
        items: detallesPorVenta[ventaDoc.id] || []
      }
    })
    
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
    return inventarioSnapshot.docs.map(doc => {
      const data = doc.data()
      // Usar stock como prioridad, luego cantidad
      const stockActual = Number(data.stock || data.cantidad || 0)
      return {
        id: doc.id,
        ...data,
        quantity: stockActual,
        stock: stockActual,
        minStock: Number(data.minStock || 5)
      }
    })
  } catch (error) {
    console.error('Error obteniendo inventario de Firestore:', error)
    return []
  }
}

const calculateSalesMetrics = (salesData, inventoryData = []) => {
  try {
    // Asegurar que trabajamos con arrays
    if (!Array.isArray(salesData)) salesData = []
    if (!Array.isArray(inventoryData)) inventoryData = []

    if (salesData.length === 0) {
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
  const totalRevenue = salesData.reduce((sum, sale) => sum + (sale && sale.total ? Number(sale.total) : 0), 0)
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

  // Agrupar ventas por categoría (si los items tienen 'categoria' o 'categoriaProducto')
  // Normalizar y agrupar ventas por categorías esperadas del inventario
  const expectedCategories = [
    'skincare',
    'maquillaje',
    'uñas',
    'depilacion',
    'cuidado personal',
    'otros'
  ]

  const normalize = (str) => {
    return (str || '').toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar marcas diacríticas
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Crear mapa inicial con categorías esperadas (clave normalizada)
  const salesByCategoryMap = {}
  const displayNames = {}
  expectedCategories.forEach(cat => {
    const norm = normalize(cat)
    salesByCategoryMap[norm] = 0
    // mostrar con mayúscula inicial y tildes originales donde sea apropiado
    displayNames[norm] = (cat === 'uñas') ? 'Uñas' : (cat === 'cuidado personal' ? 'Cuidado Personal' : (cat === 'depilacion' ? 'Depilación' : (cat.charAt(0).toUpperCase() + cat.slice(1))))
  })

  // Crear mapa de inventario por nombre para obtener categoría cuando no venga en el item
  const inventoryMapByName = {}
  if (Array.isArray(inventoryData)) {
    inventoryData.forEach(inv => {
      const name = (inv.nombre || inv.name || '').toString()
      if (name) inventoryMapByName[name] = inv
    })
  }

  salesData.forEach(sale => {
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        // Intentar obtener categoría desde el item; si no existe, buscar en inventario por nombre
        let rawCat = item.categoria || item.categoriaProducto || item.categoriaVenta || ''
        if (!rawCat || rawCat === '') {
          const itemName = item.nombre || item.name || ''
          const inv = inventoryMapByName[itemName]
          if (inv) {
            rawCat = inv.categoria || inv.categoriaProducto || inv.categoria || ''
          }
        }
        const qty = Number(item.cantidad || 1)
        const normCat = normalize(rawCat)
        if (normCat && salesByCategoryMap.hasOwnProperty(normCat)) {
          salesByCategoryMap[normCat] += qty
        } else {
          // sumar a 'otros' cuando no coincide con las categorías esperadas
          const otrosKey = normalize('otros')
          salesByCategoryMap[otrosKey] = (salesByCategoryMap[otrosKey] || 0) + qty
        }
      })
    }
  })

  // DEBUG: imprimir categorías encontradas y mapeo (solo en desarrollo)
  try {
    const encountered = new Set()
    salesData.forEach(s => {
      if (s.items && Array.isArray(s.items)) {
        s.items.forEach(it => encountered.add(it.categoria || it.categoriaProducto || it.categoriaVenta || ''))
      }
    })
    console.debug('[reportsService] encounteredCategories:', Array.from(encountered))
    console.debug('[reportsService] salesByCategoryMap:', salesByCategoryMap)
  } catch (e) {
    // no bloquear en caso de error de logging
  }

  const salesByCategory = Object.keys(salesByCategoryMap).map(key => ({ category: displayNames[key] || (key.charAt(0).toUpperCase() + key.slice(1)), sales: salesByCategoryMap[key] }))
    .sort((a, b) => b.sales - a.sales)

    return {
      totalSales,
      totalRevenue,
      averageTicket,
      salesByDay,
      salesByCategory
    }
  } catch (err) {
    console.error('[reportsService] calculateSalesMetrics error:', err)
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
      ],
      salesByCategory: []
    }
  }
}

// Calcular inventario inicial basado en ventas y compras desde una fecha específica - OPTIMIZADO
// Ahora recibe los datos pre-cargados en lugar de hacer consultas
const calculateInitialStockBatch = (salesData, comprasData, startDate) => {
  // Calcular totales vendidos por producto desde startDate
  const ventasPorProducto = {}
  const start = new Date(startDate)
  
  salesData.forEach(sale => {
    if (!sale.timestamp) return
    const ventaDate = new Date(sale.timestamp)
    if (ventaDate < start) return
    
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        const nombre = item.nombre || ''
        if (nombre) {
          ventasPorProducto[nombre] = (ventasPorProducto[nombre] || 0) + Number(item.cantidad || 0)
        }
      })
    }
  })
  
  // Calcular totales comprados por producto desde startDate
  const comprasPorProducto = {}
  
  comprasData.forEach(compra => {
    if (!compra.fechaHora) return
    const compraDate = new Date(compra.fechaHora)
    if (compraDate < start) return
    
    const productos = compra.productos || []
    productos.forEach(prod => {
      const nombre = prod.nombre || ''
      if (nombre) {
        comprasPorProducto[nombre] = (comprasPorProducto[nombre] || 0) + Number(prod.cantidad || 0)
      }
    })
  })
  
  return { ventasPorProducto, comprasPorProducto }
}

// Función legacy para compatibilidad (sin usar, deprecada)
const calculateInitialStock = async (productName, startDate, currentStock) => {
  // Esta función ya no se usa, pero se mantiene por compatibilidad
  return 0
}

const calculateInventoryMetrics = async (inventoryData, salesData, startDate = null, comprasData = null) => {
  if (!inventoryData || inventoryData.length === 0) {
    return {
      totalProducts: 0,
      lowStock: 0,
      outOfStock: 0,
      topProducts: []
    }
  }

  const totalProducts = inventoryData.length
  
  // Filtrar solo productos activos para el cálculo de stock
  const activeProducts = inventoryData.filter(product => product.activo !== false)
  
  const lowStock = activeProducts.filter(product => {
    const qty = Number(product.quantity || product.stock || 0)
    const minStock = Number(product.minStock || 5)
    return qty > 0 && qty <= minStock
  }).length
  
  const outOfStock = activeProducts.filter(product => {
    const qty = Number(product.quantity || product.stock || 0)
    return qty === 0
  }).length

  // Calcular productos más vendidos basado en las ventas de Firestore
  const productSales = {}
  const productInventoryMap = {}
  
  // Crear mapa de productos de inventario por nombre
  inventoryData.forEach(product => {
    const name = product.nombre || product.name || 'Producto sin nombre'
    productInventoryMap[name] = product
  })

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

  // Crear array de productos (incluir todos los del inventario, ventas=0 si no hay registro)
  const allProductNames = new Set([
    ...Object.keys(productInventoryMap),
    ...Object.keys(productSales)
  ])

  // Calcular stock inicial en batch (una sola vez para todos los productos)
  let ventasPorProducto = {}
  let comprasPorProducto = {}
  if (startDate && comprasData) {
    const stockBatch = calculateInitialStockBatch(salesData, comprasData, startDate)
    ventasPorProducto = stockBatch.ventasPorProducto
    comprasPorProducto = stockBatch.comprasPorProducto
  }

  // Mapear productos de forma síncrona (ya no hacemos consultas async por producto)
  const topProductsWithStock = Array.from(allProductNames).map(name => {
    const sales = productSales[name] || 0
    const inventoryProduct = productInventoryMap[name]
    const currentStock = inventoryProduct ? Number(inventoryProduct.quantity || inventoryProduct.stock || 0) : 0

    let stockInicial = 0
    if (startDate && inventoryProduct) {
      // Stock inicial = Stock actual - Compras desde fecha + Ventas desde fecha
      const totalVendido = ventasPorProducto[name] || 0
      const totalComprado = comprasPorProducto[name] || 0
      stockInicial = Math.max(0, currentStock - totalComprado + totalVendido)
    }

    return {
      name,
      sales,
      stockActual: currentStock,
      stockInicial: stockInicial,
      precio: inventoryProduct ? Number(inventoryProduct.precio || 0) : 0
    }
  })
  
  // Ordenar todos los productos por ventas (desc)
  const sortedAll = topProductsWithStock.sort((a, b) => b.sales - a.sales)
  const topProductsAll = sortedAll.slice() // copia de todos
  const topProducts = topProductsAll.slice(0, 5) // Top 5 para la UI

  // Si no hay ventas en topProductsAll, construir fallback con todo el inventario
  if (topProductsAll.length === 0) {
    const fallbackProducts = inventoryData.map(product => {
      const name = product.nombre || product.name || 'Producto sin nombre'
      const currentStock = Number(product.quantity || product.stock || 0)
      let stockInicial = 0
      
      if (startDate) {
        const totalVendido = ventasPorProducto[name] || 0
        const totalComprado = comprasPorProducto[name] || 0
        stockInicial = Math.max(0, currentStock - totalComprado + totalVendido)
      }
      
      return {
        name,
        sales: 0,
        stockActual: currentStock,
        stockInicial: stockInicial,
        precio: Number(product.precio || 0)
      }
    })
    return {
      totalProducts,
      lowStock,
      outOfStock,
      topProducts: fallbackProducts.slice(0, 5),
      topProductsAll: fallbackProducts
    }
  }

  return {
    totalProducts,
    lowStock,
    outOfStock,
    topProducts,
    topProductsAll
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

// Obtener proveedores de Firestore con sus productos y compras - OPTIMIZADO
const getProvidersDataFromFirestore = async () => {
  try {
    // Cargar todo en paralelo (evita N+1 queries)
    const [proveedoresSnapshot, productosSnapshot, comprasSnapshot] = await Promise.all([
      getDocs(collection(db, 'proveedores')),
      getDocs(collection(db, 'proveedorProductos')),
      getDocs(collection(db, 'compras'))
    ])
    
    // Crear mapa de productos por idProveedor
    const productosPorProveedor = {}
    productosSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const idProv = data.idProveedor
      if (!productosPorProveedor[idProv]) {
        productosPorProveedor[idProv] = []
      }
      productosPorProveedor[idProv].push({
        id: doc.id,
        ...data,
        costo: Number(data.costo || 0),
        precio: Number(data.precio || 0),
        cantidad: Number(data.cantidad || 0)
      })
    })
    
    // Crear mapa de compras por idProveedor
    const comprasPorProveedor = {}
    comprasSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const idProv = data.idProveedor
      if (!comprasPorProveedor[idProv]) {
        comprasPorProveedor[idProv] = []
      }
      comprasPorProveedor[idProv].push({
        id: doc.id,
        ...data,
        total: Number(data.total || 0)
      })
    })
    
    // Mapear proveedores con sus datos relacionados
    const providers = proveedoresSnapshot.docs.map(provDoc => {
      const provData = { id: provDoc.id, ...provDoc.data() }
      const productos = productosPorProveedor[provDoc.id] || []
      const compras = comprasPorProveedor[provDoc.id] || []
      
      return {
        ...provData,
        productos: productos,
        compras: compras,
        totalProductos: productos.length,
        totalCompras: compras.length,
        montoTotalCompras: compras.reduce((sum, c) => sum + (c.total || 0), 0)
      }
    })
    
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
        { category: 'Compras', amount: 0, color: '#e91e63' },
        { category: 'Operación', amount: 0, color: '#2196f3' },
        { category: 'Marketing', amount: 0, color: '#ff9800' },
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
    'compras': { category: 'Compras', color: '#e91e63' },
    'operacion': { category: 'Operación', color: '#2196f3' },
    'marketing': { category: 'Marketing', color: '#ff9800' },
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

  // Crear mapa de costos y precios de productos desde el inventario y proveedores
  const productoCostos = {}
  const productoPrecios = {}

  // Obtener costos desde proveedorProductos
  providersData.forEach(provider => {
    if (provider.productos) {
      provider.productos.forEach(prod => {
        if (!productoCostos[prod.nombre]) {
          productoCostos[prod.nombre] = prod.costo || 0
        }
      })
    }
  })

  // Obtener precios desde inventario
  inventoryData.forEach(inv => {
    productoPrecios[inv.nombre] = inv.precio || 0
  })

  // Calcular métricas de productos vendidos
  const productosVendidosMap = {}
  
  salesData.forEach(sale => {
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        const nombre = item.nombre || 'Producto desconocido'
        const cantidad = Number(item.cantidad || 1)
        const precioVenta = Number(item.precioUnitario || 0)
        const costo = productoCostos[nombre] || 0
        const margen = precioVenta > 0 ? ((precioVenta - costo) / precioVenta * 100) : 0

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
  const costoTotalInventario = inventoryData.reduce((sum, inv) => {
    const costo = productoCostos[inv.nombre] || 0
    const cantidad = inv.stock || 0
    return sum + (costo * cantidad)
  }, 0)

  const precioTotalInventario = inventoryData.reduce((sum, inv) => {
    const precio = inv.precio || 0
    const cantidad = inv.stock || 0
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

// Función para filtrar datos por rango de fechas - OPTIMIZADO
export const getFilteredReportsData = async (startDate, endDate) => {
  try {
    
    // Cargar todos los datos en paralelo (gran mejora de rendimiento)
    const [allSalesData, inventoryData, allExpensesData, providersData, comprasSnapshot] = await Promise.all([
      getSalesDataFromFirestore(),
      getInventoryDataFromFirestore(),
      getExpensesDataFromFirestore(),
      getProvidersDataFromFirestore(),
      getDocs(collection(db, 'compras')) // Para calcular stock inicial
    ])

    // Procesar compras para calculateInventoryMetrics
    const comprasData = comprasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Filtrar ventas por fecha usando la fecha local (YYYY-MM-DD)
    const filteredSales = allSalesData.filter(sale => {
      if (!sale.timestamp) {
        return false
      }
      
      // Extraer la fecha del timestamp ISO (sin considerar hora/zona horaria)
      const saleDateString = getDateStringFromISO(sale.timestamp)
      if (!saleDateString) return false
      
      // Comparar fechas como strings (YYYY-MM-DD)
      return saleDateString >= startDate && saleDateString <= endDate
    })

    // Filtrar gastos por fecha - comparación simple de strings YYYY-MM-DD
    const filteredExpenses = allExpensesData.filter(expense => {
      if (!expense.fechaHora && !expense.fecha) return false
      // Usar fecha si existe (YYYY-MM-DD), si no usar la parte fecha del timestamp ISO
      const expenseDateString = expense.fecha || getDateStringFromISO(expense.fechaHora)
      if (!expenseDateString) return false
      // Comparar fechas como strings (YYYY-MM-DD)
      return expenseDateString >= startDate && expenseDateString <= endDate
    })

    // Calcular métricas con datos filtrados (pasar comprasData para stock inicial)
    const salesMetrics = calculateSalesMetrics(filteredSales, inventoryData)
    const inventoryMetrics = await calculateInventoryMetrics(inventoryData, filteredSales, startDate, comprasData)
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

    // Tabla de ventas por categoría
    if (reportData.sales.salesByCategory && reportData.sales.salesByCategory.length > 0) {
      yPosition = doc.previousAutoTable ? doc.previousAutoTable.finalY + 8 : yPosition + 8
      const catTable = reportData.sales.salesByCategory.map(c => [c.category, c.sales])
      autoTable(doc, {
        head: [['Categoría', 'Ventas']],
        body: catTable,
        startY: yPosition,
        headStyles: { fillColor: [33, 150, 243] },
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
    
    // Tabla de productos más vendidos (usar lista completa si está disponible)
    const productsForExport = (reportData.inventory.topProductsAll && reportData.inventory.topProductsAll.length > 0)
      ? reportData.inventory.topProductsAll
      : (reportData.inventory.topProducts || [])
    if (productsForExport && productsForExport.length > 0) {
      const topProductsData = productsForExport.map((product, index) => [
        index + 1,
        product.name,
        product.sales,
        product.stockInicial !== undefined ? product.stockInicial : '-',
        product.stockActual !== undefined ? product.stockActual : '-'
      ])
      
      autoTable(doc, {
        head: [['#', 'Producto', 'Ventas', 'Stock Inicial', 'Stock Actual']],
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

    // Añadir sección Ventas por categoría
    if (reportData.sales.salesByCategory && reportData.sales.salesByCategory.length > 0) {
      summaryData.push([''])
      summaryData.push(['Ventas por Categoría'])
      summaryData.push(['Categoría', 'Ventas'])
      reportData.sales.salesByCategory.forEach(c => {
        summaryData.push([c.category, c.sales])
      })
    }
    
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
      ['Posición', 'Producto', 'Ventas', 'Stock Inicial', 'Stock Actual'],
      ...((reportData.inventory.topProductsAll && reportData.inventory.topProductsAll.length > 0)
        ? reportData.inventory.topProductsAll.map((product, index) => [
            index + 1,
            product.name,
            product.sales,
            product.stockInicial !== undefined ? product.stockInicial : '-',
            product.stockActual !== undefined ? product.stockActual : '-'
          ])
        : (reportData.inventory.topProducts || []).map((product, index) => [
            index + 1,
            product.name,
            product.sales,
            product.stockInicial !== undefined ? product.stockInicial : '-',
            product.stockActual !== undefined ? product.stockActual : '-'
          ])
      )
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