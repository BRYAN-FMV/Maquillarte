import React, { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaUser, FaPhone, FaBox, FaShoppingCart, FaBarcode, FaCamera, FaKeyboard } from 'react-icons/fa'
import BarcodeScannerComponent from 'react-qr-barcode-scanner'
import { getProviders, createProvider, updateProvider, deleteProvider, getProviderProducts, addProductToProvider } from '../services/providersService'
import Purchase from './Purchase'
import { getDocs, collection } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { app } from '../firebase'

const db = getFirestore(app)

const Providers = ({ user }) => {
  const [providers, setProviders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [showPurchaseForm, setShowPurchaseForm] = useState(false)
  const [showBarcodeInput, setShowBarcodeInput] = useState(false)
  const [scannerMode, setScannerMode] = useState('camera') // 'camera' o 'manual'
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [editingProvider, setEditingProvider] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: ''
  })
  const [productFormData, setProductFormData] = useState({
    id: '',
    nombre: '',
    cantidad: 1,
    costo: '',
    precio: ''
  })

  useEffect(() => {
    loadProviders()
    loadProducts()
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

  const loadProducts = async () => {
    try {
      const inventorySnapshot = await getDocs(collection(db, 'inventario'))
      const productsData = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre || doc.data().name,
        ...doc.data()
      }))
      setProducts(productsData)
    } catch (error) {
      console.error('Error cargando productos:', error)
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

  const handleBarcodeCapture = (barcode) => {
    if (barcode && barcode.trim()) {
      const code = typeof barcode === 'string' ? barcode.trim() : barcode.text?.trim() || '';
      if (code) {
        setProductFormData({ ...productFormData, id: code })
        setShowBarcodeInput(false)
        setScannerMode('camera')
      }
    }
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!selectedProvider || !productFormData.id || !productFormData.nombre || !productFormData.costo || !productFormData.precio) {
      alert('Por favor completa todos los campos')
      return
    }

    try {
      await addProductToProvider(selectedProvider.id, {
        id: productFormData.id,
        nombre: productFormData.nombre,
        cantidad: Number(productFormData.cantidad),
        costo: Number(productFormData.costo),
        precio: Number(productFormData.precio)
      })
      
      setShowProductForm(false)
      setProductFormData({ id: '', nombre: '', cantidad: 1, costo: '', precio: '' })
      // Aquí podrías recargar los productos del proveedor si tienes una vista detallada
    } catch (error) {
      console.error('Error agregando producto:', error)
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
    if (window.confirm('¿Estás seguro de que quieres desactivar este proveedor?')) {
      try {
        await deleteProvider(providerId)
        await loadProviders()
      } catch (error) {
        console.error('Error eliminando proveedor:', error)
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
                  onClick={() => {
                    setSelectedProvider(provider)
                    setShowProductForm(true)
                  }}
                  style={{
                    backgroundColor: '#2196f3',
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
                  <FaBox /> Productos
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

        {/* Modal para agregar productos */}
        {showProductForm && selectedProvider && (
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
              maxWidth: '400px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
              <h3>Agregar Producto a {selectedProvider.nombre}</h3>
              <form onSubmit={handleAddProduct}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    ID (Código de Barras):
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={productFormData.id}
                      onChange={(e) => setProductFormData({ ...productFormData, id: e.target.value })}
                      required
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      placeholder="Código de barras del producto"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBarcodeInput(true)}
                      style={{
                        padding: '10px 15px',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Escanear código de barras"
                    >
                      <FaBarcode />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Nombre:
                  </label>
                  <input
                    type="text"
                    value={productFormData.nombre}
                    onChange={(e) => setProductFormData({ ...productFormData, nombre: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '100px'
                    }}
                    placeholder="Nombre del producto"
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Cantidad:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={productFormData.cantidad}
                    onChange={(e) => setProductFormData({ ...productFormData, cantidad: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="Cantidad disponible"
                  />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Costo:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productFormData.costo}
                    onChange={(e) => setProductFormData({ ...productFormData, costo: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="Precio de costo"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Precio:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productFormData.precio}
                    onChange={(e) => setProductFormData({ ...productFormData, precio: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="Precio de venta"
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
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductForm(false)
                      setProductFormData({ id: '', nombre: '', cantidad: 1, costo: '', precio: '' })
                      setSelectedProvider(null)
                    }}
                    style={{
                      backgroundColor: '#666',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
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

        {/* Modal para capturar código de barras */}
        {showBarcodeInput && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              width: '95%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FaBarcode style={{ color: '#2196f3' }} />
                  Código de Barras
                </h3>
                <div style={{
                  display: 'flex',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => setScannerMode('camera')}
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: scannerMode === 'camera' ? '#2196f3' : '#f0f0f0',
                      color: scannerMode === 'camera' ? 'white' : '#333',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '14px'
                    }}
                  >
                    <FaCamera />
                    Cámara
                  </button>
                  <button
                    onClick={() => setScannerMode('manual')}
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: scannerMode === 'manual' ? '#2196f3' : '#f0f0f0',
                      color: scannerMode === 'manual' ? 'white' : '#333',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '14px'
                    }}
                  >
                    <FaKeyboard />
                    Manual
                  </button>
                </div>
              </div>

              {scannerMode === 'camera' ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <div style={{
                    width: '100%',
                    maxWidth: '400px',
                    height: '300px',
                    border: '2px solid #2196f3',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <BarcodeScannerComponent
                      width={380}
                      height={280}
                      onUpdate={(err, result) => {
                        if (result) {
                          handleBarcodeCapture(result.text)
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  <p style={{
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px',
                    margin: 0
                  }}>
                    Apunta la cámara hacia el código de barras
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  <input
                    type="text"
                    placeholder="Escribe o escanea el código de barras"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        handleBarcodeCapture(e.target.value.trim())
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #2196f3',
                      borderRadius: '8px',
                      fontSize: '16px',
                      textAlign: 'center',
                      letterSpacing: '2px'
                    }}
                  />
                  <p style={{
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px',
                    margin: 0
                  }}>
                    Escribe el código o usa un escáner conectado
                  </p>
                </div>
              )}

              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                marginTop: '20px'
              }}>
                {scannerMode === 'manual' && (
                  <button
                    onClick={(e) => {
                      const input = document.querySelector('input[placeholder*="código de barras"]')
                      if (input && input.value.trim()) {
                        handleBarcodeCapture(input.value.trim())
                      }
                    }}
                    style={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Confirmar
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowBarcodeInput(false)
                    setScannerMode('camera')
                  }}
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Providers