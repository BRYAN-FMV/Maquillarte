import { useState, useEffect } from 'react'
import { getSales, getSaleDetails, deleteSale, updateSale } from '../services/salesService'
import { formatLocalDateTime } from '../utils/dateUtils'
import NewSale from './NewSale'

function SalesView({ userRole, onNavigate, user }) {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0], // Hoy
    endDate: new Date().toISOString().split('T')[0], // Hoy
    tipoEntrega: '',
    tipoPago: ''
  })
  const [expandedSale, setExpandedSale] = useState(null)
  const [saleDetails, setSaleDetails] = useState({})
  const [editingSale, setEditingSale] = useState(null)
  const [editForm, setEditForm] = useState({
    nombreCliente: '',
    tipoEntrega: ''
  })
  const [showNewSale, setShowNewSale] = useState(false)

  // Solo admin y employee pueden ver ventas
  const canViewSales = userRole === 'admin' || userRole === 'employee'

  useEffect(() => {
    if (canViewSales) {
      fetchSales()
    }
  }, [canViewSales])

  const fetchSales = async () => {
    setLoading(true)
    try {
      const salesData = await getSales(filters)
      setVentas(salesData.sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora)))
    } catch (error) {
      console.error('Error cargando ventas:', error)
      alert('Error al cargar ventas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const applyFilters = () => {
    fetchSales()
  }

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', tipoEntrega: '' })
    setTimeout(() => fetchSales(), 100)
  }

  const toggleSaleDetails = async (ventaId) => {
    if (expandedSale === ventaId) {
      setExpandedSale(null)
      return
    }

    try {
      if (!saleDetails[ventaId]) {
        const details = await getSaleDetails(ventaId)
        setSaleDetails(prev => ({ ...prev, [ventaId]: details }))
      }
      setExpandedSale(ventaId)
    } catch (error) {
      console.error('Error cargando detalles:', error)
      alert('Error al cargar detalles: ' + error.message)
    }
  }

  const handleDeleteSale = async (venta) => {
    const confirm = window.confirm(`¿Estás seguro de eliminar la venta de ${venta.nombreCliente}? Se restaurará el stock de los productos.`)
    if (!confirm) return

    setLoading(true)
    try {
      const result = await deleteSale(venta.id)
      if (result.success) {
        alert('Venta eliminada exitosamente. Stock restaurado.')
        fetchSales() // Recargar ventas
      } else {
        alert('Error al eliminar venta: ' + result.error)
      }
    } catch (error) {
      console.error('Error eliminando venta:', error)
      alert('Error al eliminar venta: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const startEditSale = (venta) => {
    setEditingSale(venta.id)
    setEditForm({
      nombreCliente: venta.nombreCliente,
      tipoEntrega: venta.tipoEntrega
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.nombreCliente.trim()) {
      alert('El nombre del cliente es requerido')
      return
    }

    setLoading(true)
    try {
      const result = await updateSale(editingSale, editForm)
      if (result.success) {
        setEditingSale(null)
        fetchSales() // Recargar ventas
      } else {
        alert('Error al actualizar venta: ' + result.error)
      }
    } catch (error) {
      console.error('Error actualizando venta:', error)
      alert('Error al actualizar venta: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const cancelEdit = () => {
    setEditingSale(null)
    setEditForm({ nombreCliente: '', tipoEntrega: '' })
  }

  const totalGeneral = ventas.reduce((sum, venta) => sum + Number(venta.total || 0), 0)

  if (!canViewSales) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para ver las ventas.</p>
      </div>
    )
  }

  return (

    <div style={{ padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' }}> 
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => setShowNewSale(true)}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)'
          }}
        >
          + Nueva Venta
        </button>
      </div>
      
      {/* Filtros */}
      <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4>Filtros</h4>
          {filters.startDate === filters.endDate && filters.startDate === new Date().toISOString().split('T')[0] && (
            <span style={{ color: '#28a745', fontWeight: 'bold', fontSize: '14px' }}>
              Mostrando ventas de hoy
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '10px' }}>
          <div>
            <label>Fecha inicio:</label>
            <input 
              type="date" 
              value={filters.startDate} 
              onChange={e => handleFilterChange('startDate', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>Fecha fin:</label>
            <input 
              type="date" 
              value={filters.endDate} 
              onChange={e => handleFilterChange('endDate', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>Tipo de entrega:</label>
            <select 
              value={filters.tipoEntrega} 
              onChange={e => handleFilterChange('tipoEntrega', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            >
              <option value="">Todos</option>
              <option value="local">Local</option>
              <option value="nacional">Nacional</option>
              <option value="domicilio">Domicilio</option>
            </select>
          </div>
          <div>
            <label>Tipo de pago:</label>
            <select 
              value={filters.tipoPago} 
              onChange={e => handleFilterChange('tipoPago', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            >
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={applyFilters} style={{ padding: '8px 15px', background: '#FFB6C1', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>Aplicar Filtros</button>
          <button onClick={clearFilters} style={{ padding: '8px 15px', background: '#8b8b8bff', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>Limpiar</button>
        </div>
      </div>

      {/* Total General */}
      <div style={{ background: '#e8f5e8', padding: '12px', borderRadius: '6px', marginBottom: '15px', width: '100%', boxSizing: 'border-box', fontSize: '13px' }}>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '15px' }}>Total General: L.{totalGeneral.toFixed(2)}</h3>
        <p style={{ margin: 0, fontSize: '12px' }}>Mostrando {ventas.length} venta(s)</p>
      </div>

      {/* Lista de Ventas */}
      {loading ? (
        <div>Cargando ventas...</div>
      ) : (
        <div>
          {ventas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>No hay ventas que mostrar</div>
          ) : (
            ventas.map(venta => (
              <div key={venta.id} style={{ border: '1px solid #ddd', borderRadius: '6px', marginBottom: '8px', overflow: 'hidden', fontSize: '13px' }}>
                <div 
                  style={{ padding: '12px', background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}
                >
                  <div style={{ flex: 1 }}>
                    {editingSale === venta.id ? (
                      <div>
                        <input 
                          value={editForm.nombreCliente}
                          onChange={e => setEditForm(prev => ({ ...prev, nombreCliente: e.target.value }))}
                          placeholder="Nombre del cliente"
                          style={{ padding: '5px', marginBottom: '5px', width: '200px' }}
                        />
                        <select 
                          value={editForm.tipoEntrega}
                          onChange={e => setEditForm(prev => ({ ...prev, tipoEntrega: e.target.value }))}
                          style={{ padding: '5px', marginLeft: '10px' }}
                        >
                          <option value="local">Local</option>
                          <option value="nacional">Nacional</option>
                          <option value="domicilio">Domicilio</option>
                        </select>
                        <div style={{ marginTop: '8px' }}>
                          <button onClick={handleSaveEdit} style={{ padding: '4px 8px', marginRight: '5px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>Guardar</button>
                          <button onClick={cancelEdit} style={{ padding: '4px 8px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <strong>Cliente: {venta.nombreCliente}</strong>
                        <div>Fecha: {formatLocalDateTime(venta.fechaHora)}</div>
                        <div>Entrega: {venta.tipoEntrega}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>${Number(venta.total || 0).toFixed(2)}</div>
                      <div 
                        style={{ fontSize: '12px', color: '#666', cursor: 'pointer' }}
                        onClick={() => toggleSaleDetails(venta.id)}
                      >
                        {expandedSale === venta.id ? '▼' : '▶'} Ver detalles
                      </div>
                    </div>
                    {userRole === 'admin' && editingSale !== venta.id && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <button 
                          onClick={() => startEditSale(venta)}
                          style={{ padding: '4px 8px', background: '#2196F3', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteSale(venta)}
                          style={{ padding: '4px 8px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {expandedSale === venta.id && saleDetails[venta.id] && (
                  <div style={{ padding: '12px', background: '#fff', borderTop: '1px solid #ddd', overflowX: 'auto' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '13px' }}>Productos vendidos:</h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #ddd', fontSize: '11px' }}>Producto</th>
                          <th style={{ padding: '6px', textAlign: 'center', border: '1px solid #ddd', fontSize: '11px' }}>Cant</th>
                          <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #ddd', fontSize: '11px' }}>Precio</th>
                          <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #ddd', fontSize: '11px' }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {saleDetails[venta.id].map(detalle => (
                          <tr key={detalle.id}>
                            <td style={{ padding: '6px', border: '1px solid #ddd', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detalle.nombre}</td>
                            <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #ddd' }}>{detalle.cantidad}</td>
                            <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #ddd' }}>${Number(detalle.precioUnitario || 0).toFixed(2)}</td>
                            <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #ddd' }}>${(Number(detalle.precioUnitario || 0) * Number(detalle.cantidad || 0)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Modal de Nueva Venta */}
      {showNewSale && (
        <NewSale 
          onClose={() => {
            setShowNewSale(false)
            fetchSales() // Recargar ventas después de crear una nueva
          }} 
          user={user}
        />
      )}
    </div>
  )
}

export default SalesView