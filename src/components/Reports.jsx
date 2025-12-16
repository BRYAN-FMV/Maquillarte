import { useState, useEffect } from 'react'
import { FaFileAlt, FaDownload, FaCalendarAlt, FaChartBar, FaDollarSign, FaBox, FaUsers, FaShoppingBag, FaTruck } from 'react-icons/fa'
import { getReportsData, getFilteredReportsData, exportReportData } from '../services/reportsService'

function Reports({ role = 'admin' }) {
  const [selectedReport, setSelectedReport] = useState('sales')
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // Hoy
    endDate: new Date().toISOString().split('T')[0] // Hoy
  })
  const [reportData, setReportData] = useState({
    sales: {
      totalSales: 0,
      totalRevenue: 0,
      averageTicket: 0,
      salesByDay: []
    },
    inventory: {
      totalProducts: 0,
      lowStock: 0,
      outOfStock: 0,
      topProducts: []
    },
    expenses: {
      totalExpenses: 0,
      expensesByCategory: []
    },
    profitability: {
      costopromedioVendido: 0,
      precioPromedio: 0,
      margenPromedioPorProducto: 0,
      productosVendidos: [],
      costoTotalInventario: 0,
      precioTotalInventario: 0
    }
  })
  const [loading, setLoading] = useState(false)
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState([])

  // Categorías de gastos esperadas (fallback) — las que enviaste: Operativos, Inventario, Marketing, Personal, Otros
  const fallbackExpenseCategories = ['Operativos', 'Inventario', 'Marketing', 'Personal', 'Otros']

  // Construir lista de categorías a mostrar: preferir las provenientes de reportData, si existen.
  const expenseCategoriesToShow = (reportData.expenses && Array.isArray(reportData.expenses.expensesByCategory) && reportData.expenses.expensesByCategory.length > 0)
    ? reportData.expenses.expensesByCategory.map(c => ({ category: c.category, amount: c.amount || 0, color: c.color || '#ff6b6b' }))
    : fallbackExpenseCategories.map(cat => ({ category: cat, amount: 0, color: '#ff6b6b' }))

  const reportTypes = [
    {
      id: 'sales',
      name: 'Reporte de Ventas',
      icon: FaDollarSign,
      description: 'Análisis detallado de ventas y ingresos'
    },
    {
      id: 'inventory',
      name: 'Reporte de Inventario',
      icon: FaBox,
      description: 'Estado actual del inventario y productos'
    },
    // Solo admin puede ver los siguientes reportes:
      ...(role === 'admin' ? [
      {
        id: 'expenses',
        name: 'Reporte de Gastos',
        icon: FaShoppingBag,
        description: 'Análisis de gastos por categoría'
      },
      {
        id: 'profitability',
        name: 'Rentabilidad',
        icon: FaChartBar,
        description: 'Análisis de ganancias y márgenes'
      }
    ] : [])
  ]

  // Obtener datos reales de reportes
  const generateReportData = async () => {
    setLoading(true)
    
    try {
      // Usar datos filtrados por fecha de Firestore
      const data = await getFilteredReportsData(dateRange.startDate, dateRange.endDate)
      setReportData(data)
    } catch (error) {
      console.error('Error al generar reporte:', error)
      // En caso de error, usar datos vacíos
      setReportData({
        sales: {
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
        },
        inventory: {
          totalProducts: 0,
          lowStock: 0,
          outOfStock: 0,
          topProducts: []
        }
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    generateReportData()
  }, [selectedReport, dateRange])

  // Cargar datos iniciales al montar el componente
  useEffect(() => {
    generateReportData()
  }, [])

  // Inicializar categorías seleccionadas cuando cambian los datos de gastos
  useEffect(() => {
    const catsFromData = (reportData.expenses && Array.isArray(reportData.expenses.expensesByCategory) && reportData.expenses.expensesByCategory.length > 0)
      ? reportData.expenses.expensesByCategory.map(c => c.category)
      : fallbackExpenseCategories.slice()
    setSelectedExpenseCategories(catsFromData)
  }, [reportData.expenses && reportData.expenses.expensesByCategory])

  const exportReport = (format) => {
    exportReportData(reportData, format, selectedReport)
  }

  const renderSalesReport = () => (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '15px',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px',
          borderLeft: '4px solid #e91e63'
        }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.3rem',
            background: '#e91e63'
          }}>
            <FaDollarSign />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#2c3e50' }}>
              L{reportData.sales.totalRevenue.toLocaleString()}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>Ingresos Totales</p>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px',
          borderLeft: '4px solid #e91e63'
        }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.3rem',
            background: '#e91e63'
          }}>
            <FaChartBar />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#2c3e50' }}>
              {reportData.sales.totalSales}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>Ventas Realizadas</p>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px',
          borderLeft: '4px solid #e91e63'
        }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.3rem',
            background: '#e91e63'
          }}>
            <FaFileAlt />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#2c3e50' }}>
              L{reportData.sales.averageTicket}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>Ticket Promedio</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Ventas por Día de la Semana</h3>
        {reportData.sales.salesByDay.every(day => day.sales === 0) ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: '#f8f9fa',
            borderRadius: '10px',
            color: '#666'
          }}>
            <FaChartBar style={{ fontSize: '3rem', color: '#ddd', marginBottom: '15px' }} />
            <p>No hay ventas registradas en el período seleccionado</p>
            <p style={{ fontSize: '14px' }}>Realiza algunas ventas para ver estadísticas aquí</p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'end',
            gap: '15px',
            height: '180px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            {reportData.sales.salesByDay.map((day, index) => {
              const maxSales = Math.max(...reportData.sales.salesByDay.map(d => d.sales), 1)
              return (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  height: '100%'
                }}>
                  <div 
                    style={{ 
                      width: '100%',
                      height: `${(day.sales / maxSales) * 80 + 10}%`,
                      background: day.sales > 0 ? '#e91e63' : '#ddd',
                      borderRadius: '4px 4px 0 0',
                      minHeight: '10px',
                      transition: 'height 0.3s'
                    }}
                  ></div>
                  <span style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>{day.day}</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2c3e50', marginTop: '5px' }}>
                    {day.sales}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const renderInventoryReport = () => (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '15px',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px',
          borderLeft: '4px solid #e91e63'
        }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.3rem',
            background: '#2196f3'
          }}>
            <FaBox />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#2c3e50' }}>
              {reportData.inventory.totalProducts}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>Productos Totales</p>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px',
          borderLeft: '4px solid #e91e63'
        }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.3rem',
            background: '#ff9800'
          }}>
            <FaBox />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#2c3e50' }}>
              {reportData.inventory.lowStock}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>Stock Bajo</p>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px',
          borderLeft: '4px solid #e91e63'
        }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.3rem',
            background: '#f44336'
          }}>
            <FaBox />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#2c3e50' }}>
              {reportData.inventory.outOfStock}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>Sin Stock</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Productos Más Vendidos</h3>
        {reportData.inventory.topProducts.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: '#f8f9fa',
            borderRadius: '10px',
            color: '#666'
          }}>
            <FaBox style={{ fontSize: '3rem', color: '#ddd', marginBottom: '15px' }} />
            <p>No hay datos de productos vendidos</p>
            <p style={{ fontSize: '14px' }}>Realiza ventas para ver los productos más populares</p>
          </div>
        ) : (
          <div style={{
            background: '#f8f9fa',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            {reportData.inventory.topProducts.map((product, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px 20px',
                borderBottom: index < reportData.inventory.topProducts.length - 1 ? '1px solid #eee' : 'none'
              }}>
                <span style={{
                  background: '#e91e63',
                  color: 'white',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  marginRight: '15px'
                }}>#{index + 1}</span>
                <span style={{ flex: 1, color: '#2c3e50', fontWeight: '500' }}>{product.name}</span>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  {product.sales} {product.sales === 1 ? 'venta' : 'ventas'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderGeneralReport = () => (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        padding: '30px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '10px',
          borderLeft: '4px solid #e91e63'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
            background: '#4caf50'
          }}>
            <FaUsers />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.8rem', color: '#2c3e50' }}>
              {reportData.general.totalCustomers}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Clientes Totales</p>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '10px',
          borderLeft: '4px solid #e91e63'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
            background: '#9c27b0'
          }}>
            <FaUsers />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.8rem', color: '#2c3e50' }}>
              {reportData.general.newCustomers}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Nuevos Clientes</p>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '10px',
          borderLeft: '4px solid #e91e63'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
            background: '#607d8b'
          }}>
            <FaUsers />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.8rem', color: '#2c3e50' }}>
              {reportData.general.returningCustomers}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Clientes Recurrentes</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '30px', borderTop: '1px solid #eee' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Resumen del Período</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '10px',
            borderLeft: '4px solid #e91e63'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Ventas</h4>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>{reportData.sales.totalSales} transacciones</p>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>L{reportData.sales.totalRevenue.toLocaleString()} en ingresos</p>
          </div>
          <div style={{
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '10px',
            borderLeft: '4px solid #e91e63'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Inventario</h4>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>{reportData.inventory.totalProducts} productos</p>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>{reportData.inventory.lowStock} con stock bajo</p>
          </div>
          <div style={{
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '10px',
            borderLeft: '4px solid #e91e63'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Clientes</h4>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>{reportData.general.newCustomers} nuevos</p>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>{reportData.general.returningCustomers} recurrentes</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderExpensesReport = () => {
    const categoriesToShow = expenseCategoriesToShow
    const allZero = categoriesToShow.every(c => c.amount === 0)

    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '15px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            borderLeft: '4px solid #ff6b6b'
          }}>
            <div style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.3rem',
              background: '#ff6b6b'
            }}>
              <FaShoppingBag />
            </div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#2c3e50' }}>
                L{reportData.expenses.totalExpenses.toLocaleString()}
              </h3>
              <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>Gastos Totales</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
          <h3 style={{ marginBottom: '15px', color: '#2c3e50', fontSize: '14px' }}>Gastos por Categoría</h3>
          {allZero ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              background: '#f8f9fa',
              borderRadius: '8px',
              color: '#666',
              fontSize: '13px'
            }}>
              <FaShoppingBag style={{ fontSize: '2.5rem', color: '#ddd', marginBottom: '12px' }} />
              <p>No hay gastos registrados en el período seleccionado</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {categoriesToShow.map((category, index) => (
                <div key={index} style={{
                  padding: '20px',
                  background: '#f8f9fa',
                  borderRadius: '10px',
                  borderLeft: `4px solid ${category.color}`
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>{category.category}</h4>
                  <p style={{ margin: '0', fontSize: '1.8rem', fontWeight: 'bold', color: category.color }}>
                    L{category.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderProfitabilityReport = () => {
      const totalRevenue = reportData.sales.totalRevenue
      const allExpenseCategories = expenseCategoriesToShow || []
      const totalExpenses = allExpenseCategories.reduce((sum, c) => (
        selectedExpenseCategories.length === 0 || selectedExpenseCategories.includes(c.category) ? sum + (c.amount || 0) : sum
      ), 0)
      const profit = totalRevenue - totalExpenses
      const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0
    
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '12px 20px 0 20px' }}>
          <label style={{ fontWeight: 600, marginRight: 10 }}>Filtrar Gastos:</label>
          {expenseCategoriesToShow.map((c, i) => (
            <label key={i} style={{ marginRight: 12, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={selectedExpenseCategories.includes(c.category)}
                onChange={() => {
                  if (selectedExpenseCategories.includes(c.category)) {
                    setSelectedExpenseCategories(selectedExpenseCategories.filter(x => x !== c.category))
                  } else {
                    setSelectedExpenseCategories([...selectedExpenseCategories, c.category])
                  }
                }}
                style={{ marginRight: 6 }}
              />
              {c.category}
            </label>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '15px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            borderLeft: `4px solid ${profit >= 0 ? '#4caf50' : '#f44336'}`
          }}>
            <div style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.3rem',
              background: profit >= 0 ? '#4caf50' : '#f44336'
            }}>
              <FaDollarSign />
            </div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#2c3e50' }}>
                L{profit.toLocaleString()}
              </h3>
              <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>Ganancia Neta</p>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            borderLeft: '4px solid #2196f3'
          }}>
            <div style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.3rem',
              background: '#2196f3'
            }}>
              <FaChartBar />
            </div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#2c3e50' }}>
                {profitMargin}%
              </h3>
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Margen de Ganancia</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '30px', borderTop: '1px solid #eee' }}>
          <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Resumen Financiero</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '10px',
              borderLeft: '4px solid #e91e63'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Ingresos</h4>
              <p style={{ margin: '0', fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
                L{totalRevenue.toLocaleString()}
              </p>
            </div>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '10px',
              borderLeft: '4px solid #ff6b6b'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Gastos</h4>
              <p style={{ margin: '0', fontSize: '1.5rem', fontWeight: 'bold', color: '#f44336' }}>
                L{totalExpenses.toLocaleString()}
              </p>
            </div>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '10px',
              borderLeft: `4px solid ${profit >= 0 ? '#4caf50' : '#f44336'}`
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Ganancia Neta</h4>
              <p style={{ margin: '0', fontSize: '1.5rem', fontWeight: 'bold', color: profit >= 0 ? '#4caf50' : '#f44336' }}>
                L{profit.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '30px', borderTop: '1px solid #eee' }}>
          <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Análisis de Productos Vendidos</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '10px',
              borderLeft: '4px solid #ff9800'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Costo Promedio</h4>
              <p style={{ margin: '0', fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
                L{reportData.profitability.costopromedioVendido.toLocaleString()}
              </p>
            </div>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '10px',
              borderLeft: '4px solid #2196f3'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Precio Promedio</h4>
              <p style={{ margin: '0', fontSize: '1.5rem', fontWeight: 'bold', color: '#2196f3' }}>
                L{reportData.profitability.precioPromedio.toLocaleString()}
              </p>
            </div>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '10px',
              borderLeft: '4px solid #4caf50'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Margen Promedio</h4>
              <p style={{ margin: '0', fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
                {reportData.profitability.margenPromedioPorProducto}%
              </p>
            </div>
          </div>

          <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Top 10 Productos por Ganancia</h4>
          {reportData.profitability.productosVendidos.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: '#f8f9fa',
              borderRadius: '10px',
              color: '#666'
            }}>
              <FaBox style={{ fontSize: '3rem', color: '#ddd', marginBottom: '15px' }} />
              <p>No hay productos vendidos para analizar</p>
            </div>
          ) : (
            <div style={{
              background: '#f8f9fa',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#e0e0e0' }}>
                  <tr>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #999' }}>Producto</th>
                    <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #999' }}>Cantidad</th>
                    <th style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', borderBottom: '2px solid #999' }}>Costo/U</th>
                    <th style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', borderBottom: '2px solid #999' }}>Precio/U</th>
                    <th style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', borderBottom: '2px solid #999' }}>Margen</th>
                    <th style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', borderBottom: '2px solid #999' }}>Ganancia Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.profitability.productosVendidos.map((producto, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '12px 15px', color: '#2c3e50', fontWeight: '500' }}>{producto.nombre}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'center', color: '#666' }}>{producto.cantidadVendida}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right', color: '#ff9800' }}>L{producto.costoPorUnidad.toFixed(2)}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right', color: '#2196f3' }}>L{producto.precioPorUnidad.toFixed(2)}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right', color: '#4caf50', fontWeight: 'bold' }}>{producto.margenPorcentaje.toFixed(1)}%</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right', color: '#4caf50', fontWeight: 'bold' }}>L{producto.gananciaTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sección: Top 10 menos vendidos */}
        <div style={{ padding: '30px', borderTop: '1px solid #eee' }}>
          <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Top 10 Productos menos vendidos</h3>
          {((reportData.profitability && reportData.profitability.productosVendidos) || []).length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: '#f8f9fa',
              borderRadius: '10px',
              color: '#666'
            }}>
              <FaBox style={{ fontSize: '3rem', color: '#ddd', marginBottom: '15px' }} />
              <p>No hay productos vendidos para analizar</p>
            </div>
          ) : (
            (() => {
              const leastSold = (reportData.profitability.productosVendidos || []).slice().sort((a, b) => a.cantidadVendida - b.cantidadVendida).slice(0, 10)
              return (
                <div style={{ background: '#f8f9fa', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#e0e0e0' }}>
                      <tr>
                        <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #999' }}>Producto</th>
                        <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #999' }}>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leastSold.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '12px 15px', color: '#2c3e50', fontWeight: '500' }}>{p.nombre}</td>
                          <td style={{ padding: '12px 15px', textAlign: 'center', color: '#666' }}>{p.cantidadVendida}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()
          )}
        </div>

        <div style={{ padding: '30px', borderTop: '1px solid #eee' }}>
          <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Valorización del Inventario Actual</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '10px',
              borderLeft: '4px solid #ff9800'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Costo Total en Stock</h4>
              <p style={{ margin: '0', fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
                L{reportData.profitability.costoTotalInventario.toLocaleString()}
              </p>
            </div>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '10px',
              borderLeft: '4px solid #2196f3'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Valor de Venta Potencial</h4>
              <p style={{ margin: '0', fontSize: '1.5rem', fontWeight: 'bold', color: '#2196f3' }}>
                L{reportData.profitability.precioTotalInventario.toLocaleString()}
              </p>
            </div>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '10px',
              borderLeft: '4px solid #4caf50'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Ganancia Potencial</h4>
              <p style={{ margin: '0', fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
                L{(reportData.profitability.precioTotalInventario - reportData.profitability.costoTotalInventario).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'sales':
        return renderSalesReport()
      case 'inventory':
        return renderInventoryReport()
      case 'expenses':
        return renderExpensesReport()
      case 'profitability':
        return renderProfitabilityReport()
      default:
        return renderSalesReport()
    }
  }

  return (
    <div style={{
      padding: '12px',
      maxWidth: '1200px',
      margin: '0 auto',
      background: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '15px',
        padding: '12px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          color: '#2c3e50',
          marginBottom: '5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem'
        }}>
          <FaFileAlt style={{ marginRight: '8px', color: '#e91e63' }} />
          Reportes Generales
        </h1>
        <p style={{ margin: 0, fontSize: '12px' }}>Análisis y estadísticas del negocio</p>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginBottom: '15px',
        padding: '12px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#2c3e50',
          fontWeight: '500',
          fontSize: '13px',
          flexWrap: 'wrap'
        }}>
          <FaCalendarAlt style={{ marginRight: '4px', fontSize: '14px' }} />
          <span>Período:</span>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '12px'
            }}
          />
          <span>hasta</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '12px'
            }}
          />
          {dateRange.startDate === dateRange.endDate && dateRange.startDate === new Date().toISOString().split('T')[0] && (
            <span style={{ color: '#28a745', fontWeight: 'bold', fontSize: '11px', marginLeft: '5px' }}>
              Hoy
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => exportReport('PDF')} 
            style={{
              padding: '8px 14px',
              background: '#e91e63',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              fontSize: '12px'
            }}
          >
            <FaDownload style={{ fontSize: '12px' }} /> PDF
          </button>
          <button 
            onClick={() => exportReport('Excel')} 
            style={{
              padding: '8px 14px',
              background: '#e91e63',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              fontSize: '12px'
            }}
          >
            <FaDownload style={{ fontSize: '12px' }} /> Excel
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '15px',
        width: '100%'
      }}>
        {reportTypes.map(type => {
          const IconComponent = type.icon
          return (
            <button
              key={type.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                background: 'white',
                border: selectedReport === type.id ? '2px solid #e91e63' : '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                backgroundColor: selectedReport === type.id ? '#fce4ec' : 'white',
                fontSize: '13px'
              }}
              onClick={() => setSelectedReport(type.id)}
            >
              <IconComponent style={{ fontSize: '1.5rem', color: '#e91e63', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: '0 0 2px 0', color: '#2c3e50', fontSize: '13px', fontWeight: '600' }}>{type.name}</h3>
                <p style={{ margin: '0', color: '#666', fontSize: '11px' }}>{type.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #e91e63',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Generando reporte...</p>
        </div>
      ) : (
        renderReportContent()
      )}
    </div>
  )
}

export default Reports