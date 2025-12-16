import { useState, useEffect } from 'react'
import BarcodeScannerComponent from 'react-qr-barcode-scanner'
import { findProductByCode } from '../services/salesService'
import SalesCart from './SalesCart'

function Scanner({ onScan, role, user }) {
  const [data, setData] = useState('No result')
  const [scanning, setScanning] = useState(true)
  const [scannerSize, setScannerSize] = useState({ width: 500, height: 500 })
  const [cartItems, setCartItems] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [newProduct, setNewProduct] = useState({
    nombre: '',
    cantidad: '',
    precioUnitario: ''
  })

  useEffect(() => {
    const updateSize = () => {
      const isMobile = window.innerWidth <= 768
      setScannerSize({
        width: isMobile ? Math.min(300, window.innerWidth - 40) : 500,
        height: isMobile ? Math.min(300, window.innerWidth - 40) : 500
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const handleUpdate = (err, result) => {
    if (result) {
      setData(result.text)
      setScanning(false)
      // If parent provided onScan (old behavior), call it
      if (onScan) {
        onScan(result.text)
        return
      }

      // Otherwise, handle sales flow
      handleSaleFlow(result.text)
    } else {
      setData('No result')
    }
  }

  const handleSaleFlow = async (scannedCode) => {
    // Role restriction: only admin/employee can sell
    if (!(role === 'admin' || role === 'employee')) {
      alert('No tienes permisos para realizar ventas.')
      return
    }

    try {
      const product = await findProductByCode(scannedCode)
      if (!product) {
        setScannedCode(scannedCode)
        setShowAddModal(true)
      } else {
        // Add found product to cart
        addToCart(product)
      }
    } catch (error) {
      console.error('Error en flujo de venta:', error)
      alert('Error al procesar el producto: ' + (error.message || error))
    }
  }

  const addToCart = (product) => {
    setCartItems(prev => {
      // Check if product already exists in cart
      const existingIndex = prev.findIndex(item => item.docId === product.docId)
      if (existingIndex >= 0) {
        // Increment quantity if product already in cart
        const updated = [...prev]
        const currentQty = Number(updated[existingIndex].cantidad || 0)
        const maxStock = Number(product.cantidad || product.stock || 0)
        if (currentQty < maxStock) {
          updated[existingIndex].cantidad = currentQty + 1
        } else {
          alert(`No se puede agregar más. Stock máximo: ${maxStock}`)
        }
        return updated
      } else {
        // Add new product to cart with quantity 1
        const newCartItem = { ...product, cantidad: 1 }
        const newCart = [...prev, newCartItem]
        return newCart
      }
    })
    setShowCart(true)
  }

  const handleAddProduct = async () => {
    const { nombre, cantidad, precioUnitario } = newProduct
    if (!nombre.trim()) {
      alert('El nombre del producto es requerido')
      return
    }
    
    try {
      const stockNum = Number(cantidad) || 0
      const precioNum = Number(precioUnitario) || 0
      
      // Agregar al inventario
      const { getFirestore, collection, addDoc } = await import('firebase/firestore')
      const { app } = await import('../firebase')
      const db = getFirestore(app)
      const newDoc = await addDoc(collection(db, 'inventario'), { 
        id: scannedCode, 
        nombre: nombre.trim(), 
        cantidad: stockNum, 
        precioUnitario: precioNum 
      })
      
      const newItem = { 
        docId: newDoc.id, 
        id: scannedCode, 
        nombre: nombre.trim(), 
        cantidad: stockNum, 
        precioUnitario: precioNum 
      }
      
      addToCart(newItem)
      handleCloseModal()
    } catch (error) {
      console.error('Error agregando producto:', error)
      alert('Error al agregar producto: ' + error.message)
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
      setNewProduct({ nombre: '', cantidad: '', precioUnitario: '' })
    setScannedCode('')
    setScanning(true)
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', width: '100%', minHeight: '100vh', boxSizing: 'border-box' }}>
      <h3>Escanear Código</h3>
      {scanning && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <BarcodeScannerComponent
            width={scannerSize.width}
            height={scannerSize.height}
            onUpdate={handleUpdate}
          />
        </div>
      )}
      <p style={{ fontSize: '16px', marginBottom: '20px' }}>Resultado: {data}</p>
      
      {cartItems.length > 0 && (
        <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
          <strong>Productos en carrito: {cartItems.length}</strong>
          <button 
            onClick={() => setShowCart(!showCart)} 
            style={{ marginLeft: '10px', padding: '5px 10px', background: '#FFB6C1', border: 'none', cursor: 'pointer' }}
          >
            {showCart ? 'Ocultar Carrito' : 'Ver Carrito'}
          </button>
        </div>
      )}
      
      {!scanning && (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
          <button 
            onClick={() => { setScanning(true) }}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Escanear otro producto
          </button>
          {cartItems.length > 0 && (
            <button 
              onClick={() => setShowCart(true)}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: '#FFB6C1',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Ver Carrito ({cartItems.length})
            </button>
          )}
        </div>
      )}
      
      {scanning && (
        <div style={{ margin: '10px 0', fontSize: '14px', color: '#666' }}>
          {cartItems.length > 0 ? `Productos en carrito: ${cartItems.length}` : 'Escanea un código para comenzar'}
        </div>
      )}

      {showCart && cartItems.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <SalesCart 
            items={cartItems} 
            onClose={() => { setShowCart(false); setCartItems([]); setScanning(true) }} 
            onUpdateItems={setCartItems}
            user={user} 
          />
        </div>
      )}

      {/* Modal flotante para agregar producto */}
      {showAddModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>Producto No Encontrado</h3>
            <p style={{ marginBottom: '20px', textAlign: 'center', color: '#666' }}>
              El código <strong>{scannedCode}</strong> no existe en el inventario.
            </p>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nombre del producto *</label>
              <input
                type="text"
                value={newProduct.nombre}
                onChange={(e) => setNewProduct(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Base de maquillaje"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Stock inicial</label>
              <input
                type="number"
                value={newProduct.cantidad}
                onChange={(e) => setNewProduct(prev => ({ ...prev, cantidad: e.target.value }))}
                placeholder="0"
                min="0"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Precio unitario</label>
              <input
                type="number"
                value={newProduct.precioUnitario}
                onChange={(e) => setNewProduct(prev => ({ ...prev, precioUnitario: e.target.value }))}
                placeholder="0.00"
                min="0"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseModal}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddProduct}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: '#FFB6C1',
                  color: 'white',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Agregar Producto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Scanner