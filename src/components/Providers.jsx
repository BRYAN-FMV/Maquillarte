import React, { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaUser, FaPhone, FaShoppingCart } from 'react-icons/fa'
import { getProviders, createProvider, updateProvider, deleteProvider, getProviderPurchases } from '../services/providersService'
import { deletePurchase } from '../services/expensesService'
import Purchase from './Purchase'


const Providers = ({ user }) => {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showPurchaseForm, setShowPurchaseForm] = useState(false)
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false)
  const [selectedProviderPurchases, setSelectedProviderPurchases] = useState([])
  const [loadingPurchases, setLoadingPurchases] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [editingProvider, setEditingProvider] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: ''
  })


  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      const providersData = await getProviders()
      setProviders(providersData)
    } catch (error) {
      console.error('Error cargando proveedores:', error)
    } finally {
      setLoading(false)
    }
  }



  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingProvider) {
        await updateProvider(editingProvider.id, formData)
      } else {
        await createProvider(formData)
      }
      await loadProviders()
      resetForm()
    } catch (error) {
      console.error('Error guardando proveedor:', error)
    }
  }



  const handleViewPurchases = async (provider) => {
    setLoadingPurchases(true)
    try {
      const purchases = await getProviderPurchases(provider.id)
      setSelectedProviderPurchases(purchases)
      setSelectedProvider(provider)
      setShowPurchaseHistory(true)
    } catch (error) {
      console.error('Error cargando compras:', error)
      alert('Error al cargar el historial de compras')
    } finally {
      setLoadingPurchases(false)
    }
  }

  const handleEdit = (provider) => {
    setEditingProvider(provider)
    setFormData({
      nombre: provider.nombre,
      contacto: provider.contacto
    })
    setShowForm(true)
  }

  const handleDelete = async (providerId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
      try {
        await deleteProvider(providerId)
        await loadProviders()
      } catch (error) {
        console.error('Error eliminando proveedor:', error)
      }
    }
  }

  const handleDeletePurchase = async (purchaseId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta compra? Se restaurará el inventario y esta acción no se puede deshacer.')) {
      try {
        await deletePurchase(purchaseId)
        // Recargar el historial de compras
        await handleViewPurchases(selectedProvider)
        alert('Compra eliminada exitosamente')
      } catch (error) {
        console.error('Error eliminando compra:', error)
        alert('Error al eliminar la compra')
      }
    }
  }

  const resetForm = () => {
    setFormData({ nombre: '', contacto: '' })
    setEditingProvider(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Cargando proveedores...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#333', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaUser />
          Proveedores
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              backgroundColor: '#e91e63',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <FaPlus /> Nuevo Proveedor
          </button>

          <button
            onClick={() => setShowPurchaseForm(true)}
            style={{
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <FaShoppingCart /> Nueva Compra
          </button>
        </div>

        {/* Formulario de Proveedor */}
        {showForm && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h3>{editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Nombre del Proveedor:
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="Ej: Cosmetics ABC"
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Contacto:
                </label>
                <input
                  type="text"
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="Ej: 555-1234 / juan@cosmetics.com"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {editingProvider ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Proveedores */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {providers.filter(p => p.activo).map(provider => (
            <div
              key={provider.id}
              style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                border: '1px solid #eee'
              }}
            >
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ color: '#333', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaUser style={{ color: '#e91e63' }} />
                  {provider.nombre}
                </h3>
                
                <p style={{ color: '#666', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaPhone style={{ color: '#666' }} />
                  {provider.contacto}
                </p>
                
                <p style={{ color: '#999', fontSize: '12px' }}>
                  Creado: {new Date(provider.fechaCreacion).toLocaleDateString()}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleViewPurchases(provider)}
                  disabled={loadingPurchases}
                  style={{
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: loadingPurchases ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    opacity: loadingPurchases ? 0.6 : 1
                  }}
                >
                  <FaShoppingCart /> Compras
                </button>
                
                <button
                  onClick={() => handleEdit(provider)}
                  style={{
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <FaEdit /> Editar
                </button>
                
                <button
                  onClick={() => handleDelete(provider.id)}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <FaTrash /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        {providers.filter(p => p.activo).length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#666',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <FaUser style={{ fontSize: '48px', color: '#ddd', marginBottom: '20px' }} />
            <p>No hay proveedores registrados</p>
            <p style={{ fontSize: '14px' }}>Haz clic en "Nuevo Proveedor" para comenzar</p>
          </div>
        )}

        {/* Modal de compra */}
        {showPurchaseForm && (
          <Purchase
            user={user}
            onClose={() => setShowPurchaseForm(false)}
            onSuccess={() => {
              setShowPurchaseForm(false)
              // Opcional: recargar datos o mostrar mensaje de éxito
            }}
          />
        )}

        {/* Modal para ver historial de compras */}
        {showPurchaseHistory && selectedProvider && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                borderBottom: '1px solid #eee',
                paddingBottom: '15px'
              }}>
                <h3 style={{ color: '#333', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaShoppingCart style={{ color: '#4caf50' }} />
                  Compras - {selectedProvider.nombre}
                </h3>
                <button
                  onClick={() => setShowPurchaseHistory(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>

              {selectedProviderPurchases.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#666'
                }}>
                  <FaShoppingCart style={{ fontSize: '3rem', color: '#ddd', marginBottom: '15px' }} />
                  <p>No hay compras registradas para este proveedor</p>
                </div>
              ) : (
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto auto',
                    gap: '10px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                  }}>
                    <div>Fecha</div>
                    <div>Productos</div>
                    <div>Total</div>
                    <div>Detalles</div>
                    <div>Acciones</div>
                  </div>
                  
                  {selectedProviderPurchases.map((purchase, index) => (
                    <div key={index} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto auto auto',
                      gap: '10px',
                      padding: '15px',
                      borderBottom: '1px solid #eee',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>
                          {new Date(purchase.fechaHora).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {new Date(purchase.fechaHora).toLocaleTimeString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {purchase.productos ? purchase.productos.length : 0} items
                      </div>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: '#4caf50',
                        textAlign: 'right'
                      }}>
                        L{purchase.total.toLocaleString()}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <details style={{ cursor: 'pointer' }}>
                          <summary style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#e3f2fd', 
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            Ver productos
                          </summary>
                          <div style={{
                            marginTop: '10px',
                            padding: '10px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {purchase.productos && purchase.productos.map((producto, prodIndex) => (
                              <div key={prodIndex} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '5px',
                                paddingBottom: '5px',
                                borderBottom: prodIndex < purchase.productos.length - 1 ? '1px solid #ddd' : 'none'
                              }}>
                                <span>{producto.nombre}</span>
                                <span>Cant: {producto.cantidad} | L{producto.costo}/u</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeletePurchase(purchase.id)}
                          style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FaTrash /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                  
                    <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#e8f5e8',
                    borderRadius: '8px',
                    textAlign: 'right'
                  }}>
                    <strong>
                      Total gastado: L
                      {selectedProviderPurchases.reduce((sum, purchase) => sum + purchase.total, 0).toLocaleString()}
                    </strong>
                  </div>
                </div>
              )}

              <div style={{
                marginTop: '20px',
                textAlign: 'center'
              }}>
                <button
                  onClick={() => setShowPurchaseHistory(false)}
                  style={{
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Providers