import { useState, useEffect } from 'react'
import { findProductByCode } from '../services/salesService'
import SalesCart from './SalesCart'

function NewSale({ onClose, user }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [products, setProducts] = useState([])

  // Cargar productos del inventario para la búsqueda
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const { getFirestore, collection, getDocs } = await import('firebase/firestore')
      const { app } = await import('../firebase')
      const db = getFirestore(app)
      const querySnapshot = await getDocs(collection(db, 'inventario'))
      const productsData = []
      querySnapshot.forEach(doc => {
        productsData.push({ docId: doc.id, ...doc.data() })
      })
      setProducts(productsData)
    } catch (error) {
      console.error('Error cargando productos:', error)
    }
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    if (term.trim() === '') {
      setSearchResults([])
      return
    }

    const results = products.filter(product => 
      product.id?.toLowerCase().includes(term.toLowerCase()) ||
      product.nombre?.toLowerCase().includes(term.toLowerCase())
    )
    setSearchResults(results.slice(0, 10)) // Limitar a 10 resultados
  }

  const addToCart = (product) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.docId === product.docId)
      if (existingIndex >= 0) {
        const updated = [...prev]
        const currentQty = Number(updated[existingIndex].cantidad || 0)
        const maxStock = Number(product.stock || 0)
        if (currentQty < maxStock) {
          updated[existingIndex].cantidad = currentQty + 1
        } else {
          alert(`No se puede agregar más. Stock máximo: ${maxStock}`)
        }
        return updated
      } else {
        return [...prev, { ...product, cantidad: 1 }]
      }
    })
    
    // Limpiar búsqueda después de agregar
    setSearchTerm('')
    setSearchResults([])
  }

  const handleScannerToggle = () => {
    setShowScanner(!showScanner)
  }

  const handleScanResult = async (scannedCode) => {
    setLoading(true)
    try {
      const product = await findProductByCode(scannedCode)
      if (product) {
        addToCart(product)
        setShowScanner(false)
      } else {
        alert('Producto no encontrado con ese código')
      }
    } catch (error) {
      console.error('Error buscando producto:', error)
      alert('Error al buscar producto: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '15px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FF69B4',
          color: 'white',
          borderRadius: '15px 15px 0 0'
        }}>
          <h2 style={{ margin: 0, 
            color: 'white' 
            }}>Nueva Venta</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '2px solid white',
              color: 'white',
              borderRadius: '50%',
              width: '35px',
              height: '35px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Opciones de agregar producto */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '15px', 
            marginBottom: '20px' 
          }}>
            {/* Búsqueda manual */}
            <div style={{
              border: '2px solid #FFB6C1',
              borderRadius: '10px',
              padding: '15px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#FF69B4' }}>Buscar Producto</h4>
              <input
                type="text"
                placeholder="Buscar por código o nombre..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              
              {/* Resultados de búsqueda */}
              {searchResults.length > 0 && (
                <div style={{
                  maxHeight: '150px',
                  overflow: 'auto',
                  marginTop: '10px',
                  border: '1px solid #eee',
                  borderRadius: '5px'
                }}>
                  {searchResults.map(product => (
                    <div
                      key={product.docId}
                      style={{
                        padding: '10px',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onClick={() => addToCart(product)}
                      onMouseEnter={(e) => e.target.style.background = '#f9f9f9'}
                      onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                      <div>
                        <strong>{product.nombre}</strong>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          ID: {product.id} | Stock: {product.stock} | ${product.precioUnitario}
                        </div>
                      </div>
                      <button style={{
                        background: '#FFB6C1',
                        border: 'none',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '3px',
                        fontSize: '12px'
                      }}>
                        Agregar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Escáner */}
            <div style={{
              border: '2px solid #FF69B4',
              borderRadius: '10px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#FF69B4' }}>Escanear Código</h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>
                Usa la cámara para escanear códigos de barras
              </p>
              <button
                onClick={handleScannerToggle}
                disabled={loading}
                style={{
                  background: showScanner ? '#ff4757' : '#FF69B4',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  width: '100%'
                }}
              >
                {loading ? 'Procesando...' : showScanner ? 'Cerrar Escáner' : 'Abrir Escáner'}
              </button>
              
              {showScanner && (
                <div style={{ marginTop: '15px' }}>
                  <ScannerComponent onScanResult={handleScanResult} />
                </div>
              )}
            </div>
          </div>

          {/* Carrito */}
          {cartItems.length > 0 && (
            <div style={{
              border: '2px solid #28a745',
              borderRadius: '10px',
              padding: '15px',
              marginTop: '20px'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#28a745' }}>🛒 Carrito de Venta</h4>
              <SalesCart 
                items={cartItems} 
                onClose={() => {
                  setCartItems([])
                  onClose()
                }} 
                onUpdateItems={setCartItems}
                user={user}
                isModal={true}
              />
            </div>
          )}

          {cartItems.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#666',
              fontSize: '16px'
            }}>
              <p>🛒 El carrito está vacío</p>
              <p style={{ fontSize: '14px' }}>Busca o escanea productos para comenzar una venta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente del escáner simplificado
function ScannerComponent({ onScanResult }) {
  const [data, setData] = useState('No result')
  const [BarcodeScannerComponent, setBarcodeScannerComponent] = useState(null)

  useEffect(() => {
    const loadScanner = async () => {
      try {
        const module = await import('react-qr-barcode-scanner')
        setBarcodeScannerComponent(() => module.default)
      } catch (error) {
        console.error('Error loading scanner:', error)
      }
    }
    
    loadScanner()
  }, [])

  const handleUpdate = (err, result) => {
    if (result) {
      setData(result.text)
      onScanResult(result.text)
    } else {
      setData('No result')
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      padding: '10px'
    }}>
      <div style={{
        border: '2px solid #FF69B4',
        borderRadius: '10px',
        padding: '10px',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {BarcodeScannerComponent ? (
          <BarcodeScannerComponent
            width={250}
            height={250}
            onUpdate={handleUpdate}
          />
        ) : (
          <div style={{ 
            width: '250px', 
            height: '250px', 
            background: '#f0f0f0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: '8px',
            color: '#666'
          }}>
            <p>Cargando escáner...</p>
          </div>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
        Último resultado: <strong>{data}</strong>
      </p>
    </div>
  )
}

export default NewSale