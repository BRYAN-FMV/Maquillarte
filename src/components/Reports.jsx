import { useState, useEffect } from 'react'
import { FaFileAlt, FaDownload, FaCalendarAlt, FaChartBar, FaDollarSign, FaBox, FaUsers } from 'react-icons/fa'
import { getReportsData, getFilteredReportsData, exportReportData } from '../services/reportsService'

function Reports() {
  const [selectedReport, setSelectedReport] = useState('sales')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Últimos 30 días
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Incluir mañana para cubrir hoy
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
    }
  })
  const [loading, setLoading] = useState(false)

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
    }
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
            background: '#e91e63'
          }}>
            <FaDollarSign />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.8rem', color: '#2c3e50' }}>
              ${reportData.sales.totalRevenue.toLocaleString()}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Ingresos Totales</p>
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
            background: '#e91e63'
          }}>
            <FaChartBar />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.8rem', color: '#2c3e50' }}>
              {reportData.sales.totalSales}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Ventas Realizadas</p>
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
            background: '#e91e63'
          }}>
            <FaFileAlt />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.8rem', color: '#2c3e50' }}>
              ${reportData.sales.averageTicket}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Ticket Promedio</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '30px', borderTop: '1px solid #eee' }}>
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
            gap: '20px',
            height: '200px',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '10px'
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
            background: '#2196f3'
          }}>
            <FaBox />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.8rem', color: '#2c3e50' }}>
              {reportData.inventory.totalProducts}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Productos Totales</p>
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
            background: '#ff9800'
          }}>
            <FaBox />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.8rem', color: '#2c3e50' }}>
              {reportData.inventory.lowStock}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Stock Bajo</p>
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
            background: '#f44336'
          }}>
            <FaBox />
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.8rem', color: '#2c3e50' }}>
              {reportData.inventory.outOfStock}
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Sin Stock</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '30px', borderTop: '1px solid #eee' }}>
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
            <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>${reportData.sales.totalRevenue.toLocaleString()} en ingresos</p>
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

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'sales':
        return renderSalesReport()
      case 'inventory':
        return renderInventoryReport()
      default:
        return renderSalesReport()
    }
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      background: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        padding: '20px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          color: '#2c3e50',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem'
        }}>
          <FaFileAlt style={{ marginRight: '10px', color: '#e91e63' }} />
          Reportes Generales
        </h1>
        <p>Análisis y estadísticas del negocio</p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#2c3e50',
          fontWeight: '500'
        }}>
          <FaCalendarAlt style={{ marginRight: '8px' }} />
          <span>Período:</span>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            style={{
              padding: '8px 12px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <span>hasta</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            style={{
              padding: '8px 12px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => exportReport('PDF')} 
            style={{
              padding: '10px 20px',
              background: '#e91e63',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500'
            }}
          >
            <FaDownload /> PDF
          </button>
          <button 
            onClick={() => exportReport('Excel')} 
            style={{
              padding: '10px 20px',
              background: '#e91e63',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500'
            }}
          >
            <FaDownload /> Excel
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {reportTypes.map(type => {
          const IconComponent = type.icon
          return (
            <button
              key={type.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '20px',
                background: 'white',
                border: selectedReport === type.id ? '2px solid #e91e63' : '2px solid #eee',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                backgroundColor: selectedReport === type.id ? '#fce4ec' : 'white'
              }}
              onClick={() => setSelectedReport(type.id)}
            >
              <IconComponent style={{ fontSize: '2rem', color: '#e91e63' }} />
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{type.name}</h3>
                <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>{type.description}</p>
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