import { useState, useEffect } from 'react'
import { FaBarcode, FaSearch } from 'react-icons/fa'
import { findProductByCode } from '../services/salesService'
import { FaShoppingCart } from 'react-icons/fa'
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
        borderRadius: '12px',
        padding: window.innerWidth < 600 ? '12px' : '16px',
        width: '100%',
        maxWidth: '700px',
        maxHeight: window.innerWidth < 600 ? '100vh' : '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: window.innerWidth < 600 ? '12px' : '15px',
          flexShrink: 0
        }}>
          <h2 style={{ 
            color: '#333', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            margin: 0,
            fontSize: window.innerWidth < 600 ? '16px' : '18px'
          }}>
            <FaShoppingCart /> Nueva Venta
          </h2>
          <button 
            onClick={onClose}
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

        {/* Búsqueda y Escáner - Opciones compactas */}
        <div style={{ 
          display: 'flex',
          flexDirection: window.innerWidth < 600 ? 'column' : 'row',
          gap: window.innerWidth < 600 ? '8px' : '10px',
          marginBottom: '12px',
          flexShrink: 0,
          alignItems: window.innerWidth < 600 ? 'stretch' : 'center'
        }}>
          {/* Búsqueda */}
          <div style={{ flex: 1, minWidth: '0', width: window.innerWidth < 600 ? '100%' : 'auto' }}>
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
            
            {/* Resultados de búsqueda - Sin position absolute */}
            {searchResults.length > 0 && (
              <div style={{
                maxHeight: window.innerWidth < 600 ? '200px' : '180px',
                overflow: 'auto',
                marginTop: '6px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {searchResults.map(product => (
                  <div
                    key={product.docId}
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: '8px',
                      alignItems: 'center',
                      fontSize: '12px',
                      background: 'white'
                    }}
                    onClick={() => addToCart(product)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.nombre}
                      </strong>
                      <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        ${product.precioUnitario} | Stock: {product.stock}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        addToCart(product)
                      }}
                      style={{
                        background: '#FF69B4',
                        border: 'none',
                        color: 'white',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Agregar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón Escáner */}
          <button
            onClick={handleScannerToggle}
            disabled={loading}
            style={{
              backgroundColor: showScanner ? '#ff4757' : '#2196f3',
              color: 'white',
              border: 'none',
              padding: window.innerWidth < 600 ? '10px 16px' : '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              width: window.innerWidth < 600 ? '100%' : 'auto'
            }}
          >
            <FaBarcode />
            {loading ? 'Procesando...' : showScanner ? 'Cerrar' : 'Escanear'}
          </button>
        </div>

        {/* Escáner - Si está abierto */}
        {showScanner && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '6px',
            border: '1px solid #ddd',
            flexShrink: 0
          }}>
            <ScannerComponent onScanResult={handleScanResult} />
          </div>
        )}

        {/* Carrito */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {cartItems.length > 0 ? (
            <>
              <div style={{
                fontWeight: 'bold',
                fontSize: '13px',
                marginBottom: '8px',
                color: '#333',
                flexShrink: 0
              }}>
                <FaShoppingCart /> Carrito ({cartItems.length} items)
              </div>
              <div style={{ overflow: 'auto', flex: 1, minHeight: 0, marginBottom: '12px' }}>
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
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: '#999',
              fontSize: '13px',
              padding: '20px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '24px' }}><FaShoppingCart /></p>
              <p style={{ margin: 0 }}>El carrito está vacío</p>
              <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Busca o escanea productos</p>
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