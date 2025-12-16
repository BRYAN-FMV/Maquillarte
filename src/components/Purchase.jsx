import React, { useState, useEffect } from 'react'
import { FaShoppingCart, FaPlus, FaTrash, FaCheck, FaTruck, FaBox, FaBarcode, FaCamera, FaKeyboard } from 'react-icons/fa'
import BarcodeScannerComponent from 'react-qr-barcode-scanner'
import { getProviders, getProviderProducts } from '../services/providersService'
import { registerPurchase } from '../services/expensesService'
import { getDocs, collection } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { app } from '../firebase'

const db = getFirestore(app)

const Purchase = ({ user, onClose, onSuccess }) => {
  const [providers, setProviders] = useState([])
  const [products, setProducts] = useState([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [purchaseItems, setPurchaseItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [showBarcodeInput, setShowBarcodeInput] = useState(null) // Índice del item que está escaneando
  const [scannerMode, setScannerMode] = useState('camera') // 'camera' o 'manual'
  const [showSimpleScanner, setShowSimpleScanner] = useState(false) // Nuevo escáner simplificado

  useEffect(() => {
    loadProviders()
    loadProducts()
  }, [])

  const loadProviders = async () => {
    try {
      const providersData = await getProviders()
      setProviders(providersData.filter(p => p.activo))
    } catch (error) {
      console.error('Error cargando proveedores:', error)
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

  const addPurchaseItem = () => {
    setPurchaseItems([...purchaseItems, {
      id: '',
      nombre: '',
      cantidad: 1,
      costo: 0,
      precio: 0,
      total: 0,
      isNew: false
    }])
  }

  const updatePurchaseItem = (index, field, value) => {
    const updatedItems = [...purchaseItems]
    updatedItems[index][field] = value
    
    // Si cambió el producto, obtener su nombre y datos
    if (field === 'id') {
      if (value === 'new') {
        // Marcar como nuevo producto
        updatedItems[index].isNew = true
        updatedItems[index].nombre = ''
        updatedItems[index].precio = 0
      } else {
        // Producto existente
        updatedItems[index].isNew = false
        const selectedProduct = products.find(p => p.id === value)
        if (selectedProduct) {
          updatedItems[index].nombre = selectedProduct.nombre
          updatedItems[index].precio = selectedProduct.precio || 0
        }
      }
    }
    
    // Recalcular total del item (siempre basado en cantidad × costo)
    if (field === 'cantidad' || field === 'costo') {
      const cantidad = Number(updatedItems[index].cantidad || 0)
      const costo = Number(updatedItems[index].costo || 0)
      updatedItems[index].total = cantidad * costo
    }
    
    setPurchaseItems(updatedItems)
  }

  const removePurchaseItem = (index) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
  }

  const handleSimpleBarcodeCapture = async (barcode) => {
    if (!barcode || !barcode.trim()) return;
    
    const code = typeof barcode === 'string' ? barcode.trim() : barcode.text?.trim() || '';
    if (!code) return;
    
    try {
      // Buscar producto en inventario
      const existingProduct = products.find(p => p.id === code || p.codigoBarras === code);
      
      let newItem;
      
      if (existingProduct) {
        // Producto existe - crear item con datos del inventario
        newItem = {
          id: code,
          nombre: existingProduct.nombre,
          cantidad: 1,
          costo: existingProduct.costo || 0,
          precio: existingProduct.precio || 0,
          total: existingProduct.costo || 0,
          isNew: false
        };
      } else {
        // Producto NO existe - crear item para nuevo producto
        newItem = {
          id: code,
          nombre: '',
          cantidad: 1,
          costo: 0,
          precio: 0,
          total: 0,
          isNew: true
        };
      }
      
      // Verificar si ya está en la lista
      const existingIndex = purchaseItems.findIndex(item => item.id === code);
      
      if (existingIndex >= 0) {
        // Ya existe en la lista - incrementar cantidad
        const updatedItems = [...purchaseItems];
        updatedItems[existingIndex].cantidad += 1;
        updatedItems[existingIndex].total = updatedItems[existingIndex].cantidad * updatedItems[existingIndex].costo;
        setPurchaseItems(updatedItems);
        alert(`Producto ya en la lista. Cantidad aumentada a ${updatedItems[existingIndex].cantidad}`);
      } else {
        // Agregar nuevo item a la lista
        setPurchaseItems([...purchaseItems, newItem]);
        if (existingProduct) {
          alert(`Producto "${existingProduct.nombre}" agregado a la compra`);
        } else {
          alert(`Producto nuevo con código "${code}" agregado. Por favor completa los datos.`);
        }
      }
      
      setShowSimpleScanner(false);
      setScannerMode('camera');
    } catch (error) {
      console.error('Error procesando código de barras:', error);
      alert('Error al procesar el código de barras');
    }
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
  }

  const handleBarcodeCapture = (index, barcode) => {
    if (barcode && barcode.trim()) {
      const code = typeof barcode === 'string' ? barcode.trim() : barcode.text?.trim() || '';
      if (code) {
        updatePurchaseItem(index, 'id', code)
        setShowBarcodeInput(null)
        setScannerMode('camera')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedProvider) {
      alert('Por favor selecciona un proveedor')
      return
    }
    
    if (purchaseItems.length === 0) {
      alert('Agrega al menos un producto a la compra')
      return
    }
    
    // Validar que todos los items tengan datos completos
    const invalidItems = purchaseItems.filter(item => {
      if (item.isNew) {
        return !item.nombre || !item.cantidad || !item.costo || !item.precio
      } else {
        return !item.id || !item.cantidad || !item.costo || !item.precio
      }
    })
    
    if (invalidItems.length > 0) {
      alert('Completa todos los campos de los productos')
      return
    }

    setLoading(true)

    try {
      const selectedProviderData = providers.find(p => p.id === selectedProvider)
      
      const purchaseData = {
        idProveedor: selectedProvider,
        nombreProveedor: selectedProviderData.nombre,
        productos: purchaseItems.map(item => ({
          id: item.isNew ? item.id : item.id,
          nombre: item.nombre,
          cantidad: Number(item.cantidad),
          costo: Number(item.costo),
          precio: Number(item.precio || 0), // Siempre enviar el precio
          total: Number(item.total),
          isNew: item.isNew
        })),
        total: calculateTotal(),
        usuarioId: user?.uid || 'sistema'
      }

      await registerPurchase(purchaseData)
      
      alert('Compra registrada exitosamente')
      if (onSuccess) onSuccess()
      if (onClose) onClose()
      
    } catch (error) {
      console.error('Error registrando compra:', error)
      alert('Error al registrar la compra: ' + error.message)
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
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: window.innerWidth < 600 ? '10px' : '20px',
        width: '95%',
        maxWidth: '700px',
        maxHeight: window.innerWidth < 600 ? '95vh' : '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: window.innerWidth < 600 ? '10px' : '20px',
          paddingBottom: window.innerWidth < 600 ? '8px' : '0',
          borderBottom: window.innerWidth < 600 ? '1px solid #eee' : 'none'
        }}>
          <h2 style={{ 
            color: '#333', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            margin: 0,
            fontSize: window.innerWidth < 600 ? '16px' : '20px'
          }}>
            <FaShoppingCart style={{ color: '#e91e63' }} />
            Nueva Compra
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          {/* Selección de Proveedor */}
          <div style={{ marginBottom: '15px', flexShrink: 0 }}>
            <label style={{ 
              marginBottom: '8px', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}>
              <FaTruck style={{ color: '#e91e63' }} />
              Proveedor:
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              required
              style={{
                width: '100%',
                padding: window.innerWidth < 600 ? '14px 12px' : '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: window.innerWidth < 600 ? '16px' : '13px',
                boxSizing: 'border-box',
                minHeight: window.innerWidth < 600 ? '48px' : 'auto'
              }}
            >
              <option value="">Seleccionar proveedor</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.nombre} - {provider.contacto}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de Productos */}
          <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px',
              flexShrink: 0
            }}>
              <label style={{ 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}>
                <FaBox style={{ color: '#e91e63' }} />
                Productos:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowSimpleScanner(true)}
                  style={{
                    backgroundColor: '#2196f3',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px'
                  }}
                >
                  <FaBarcode /> Escanear
                </button>
                <button
                  type="button"
                  onClick={addPurchaseItem}
                  style={{
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px'
                  }}
                >
                  <FaPlus /> Agregar
                </button>
              </div>
            </div>

            <div style={{ overflow: 'auto', flex: 1, minHeight: 0, marginBottom: '10px', paddingRight: '5px' }}>
              {purchaseItems.map((item, index) => (
                <div key={index} style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '10px',
                  backgroundColor: item.isNew ? '#f0f8ff' : '#f9f9f9',
                  fontSize: '13px'
                }}>
                  {item.isNew && (
                    <div style={{
                      backgroundColor: '#e8f5e8',
                      padding: '6px',
                      borderRadius: '3px',
                      marginBottom: '8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#2e7d32'
                    }}>
                      ✨ Nuevo
                    </div>
                  )}
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth < 600 ? '1fr' : (item.isNew ? '1fr' : '2fr 0.8fr 0.8fr 0.8fr 0.7fr auto'),
                    gap: window.innerWidth < 600 ? '10px' : '8px',
                    alignItems: 'center',
                    marginBottom: item.isNew ? '10px' : '0'
                  }}>
                    {!item.isNew ? (
                      <select
                        value={item.id}
                        onChange={(e) => updatePurchaseItem(index, 'id', e.target.value)}
                        style={{
                          padding: window.innerWidth < 600 ? '12px' : '6px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: window.innerWidth < 600 ? '15px' : '12px',
                          minHeight: window.innerWidth < 600 ? '44px' : 'auto'
                        }}
                      >
                        <option value="">Seleccionar</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.nombre}
                          </option>
                        ))}
                        <option value="new">Nuevo</option>
                      </select>
                    ) : (
                      <div style={{ 
                        display: window.innerWidth < 600 ? 'grid' : 'flex', 
                        gridTemplateColumns: window.innerWidth < 600 ? '1fr auto' : undefined,
                        gap: window.innerWidth < 600 ? '8px' : '6px', 
                        alignItems: 'center', 
                        minWidth: 0
                      }}>
                        <input
                          type="text"
                          placeholder="Nombre"
                          value={item.nombre}
                          onChange={(e) => updatePurchaseItem(index, 'nombre', e.target.value)}
                          style={{
                            padding: window.innerWidth < 600 ? '12px' : '6px',
                            border: '1px solid #4caf50',
                            borderRadius: '3px',
                            flex: 1,
                            fontSize: window.innerWidth < 600 ? '15px' : '12px',
                            minWidth: 0,
                            minHeight: window.innerWidth < 600 ? '44px' : 'auto'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowBarcodeInput(index)}
                          style={{
                            backgroundColor: '#2196f3',
                            color: 'white',
                            border: 'none',
                            padding: window.innerWidth < 600 ? '12px 10px' : '6px 8px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: window.innerWidth < 600 ? '14px' : '11px',
                            flexShrink: 0,
                            minHeight: window.innerWidth < 600 ? '44px' : 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <FaBarcode />
                        </button>
                      </div>
                    )}

                    {!item.isNew && (
                      <>
                        <input
                          type="number"
                          placeholder="Cantidad"
                          value={item.cantidad}
                          onChange={(e) => updatePurchaseItem(index, 'cantidad', e.target.value)}
                          min="1"
                          style={{
                            padding: window.innerWidth < 600 ? '12px' : '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: window.innerWidth < 600 ? '15px' : '13px',
                            minHeight: window.innerWidth < 600 ? '44px' : 'auto',
                            gridColumn: window.innerWidth < 600 ? '1 / -1' : 'auto'
                          }}
                        />

                        <input
                          type="number"
                          step="0.01"
                          placeholder="Costo"
                          value={item.costo}
                          onChange={(e) => updatePurchaseItem(index, 'costo', e.target.value)}
                          min="0"
                          style={{
                            padding: window.innerWidth < 600 ? '12px' : '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: window.innerWidth < 600 ? '15px' : '13px',
                            minHeight: window.innerWidth < 600 ? '44px' : 'auto',
                            gridColumn: window.innerWidth < 600 ? '1 / -1' : 'auto'
                          }}
                        />

                        <input
                          type="number"
                          step="0.01"
                          placeholder="Precio"
                          value={item.precio || ''}
                          onChange={(e) => updatePurchaseItem(index, 'precio', e.target.value)}
                          min="0"
                          style={{
                            padding: window.innerWidth < 600 ? '12px' : '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: window.innerWidth < 600 ? '15px' : '13px',
                            minHeight: window.innerWidth < 600 ? '44px' : 'auto',
                            gridColumn: window.innerWidth < 600 ? '1 / -1' : 'auto'
                          }}
                        />

                        <div style={{
                          padding: '8px',
                          backgroundColor: '#e8f5e8',
                          borderRadius: '4px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          fontSize: window.innerWidth < 600 ? '13px' : '12px',
                          minHeight: window.innerWidth < 600 ? '44px' : 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2e7d32',
                          border: '1px solid #4caf50',
                          gridColumn: window.innerWidth < 600 ? '1 / -1' : 'auto'
                        }}>
                          L{item.total.toFixed(2)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removePurchaseItem(index)}
                          style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            padding: window.innerWidth < 600 ? '12px 10px' : '8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: window.innerWidth < 600 ? '14px' : '12px',
                            minHeight: window.innerWidth < 600 ? '44px' : 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gridColumn: window.innerWidth < 600 ? '1 / -1' : 'auto'
                          }}
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </div>

                  {item.isNew && item.id && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px',
                      backgroundColor: '#e8f5e8',
                      border: '1px solid #4caf50',
                      borderRadius: '3px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <FaBarcode style={{ color: '#4caf50', fontSize: '10px' }} />
                      <span>Código: {item.id}</span>
                    </div>
                  )}

                  {item.isNew && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: window.innerWidth < 600 ? '1fr 1fr' : '1fr 1fr 1fr auto',
                      gap: window.innerWidth < 600 ? '10px' : '8px',
                      alignItems: 'center',
                      marginTop: '8px'
                    }}>
                      <input
                        type="number"
                        placeholder="Cantidad"
                        value={item.cantidad}
                        onChange={(e) => updatePurchaseItem(index, 'cantidad', e.target.value)}
                        min="1"
                        style={{
                          padding: window.innerWidth < 600 ? '12px' : '8px',
                          border: '1px solid #4caf50',
                          borderRadius: '4px',
                          fontSize: window.innerWidth < 600 ? '15px' : '13px',
                          minHeight: window.innerWidth < 600 ? '44px' : 'auto',
                          gridColumn: window.innerWidth < 600 ? '1 / 2' : 'auto'
                        }}
                      />

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Costo"
                        value={item.costo}
                        onChange={(e) => updatePurchaseItem(index, 'costo', e.target.value)}
                        min="0"
                        style={{
                          padding: window.innerWidth < 600 ? '12px' : '8px',
                          border: '1px solid #4caf50',
                          borderRadius: '4px',
                          fontSize: window.innerWidth < 600 ? '15px' : '13px',
                          minHeight: window.innerWidth < 600 ? '44px' : 'auto',
                          gridColumn: window.innerWidth < 600 ? '2 / 3' : 'auto'
                        }}
                      />

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Precio"
                        value={item.precio}
                        onChange={(e) => updatePurchaseItem(index, 'precio', e.target.value)}
                        min="0"
                        style={{
                          padding: window.innerWidth < 600 ? '12px' : '8px',
                          border: '1px solid #4caf50',
                          borderRadius: '4px',
                          fontSize: window.innerWidth < 600 ? '15px' : '13px',
                          minHeight: window.innerWidth < 600 ? '44px' : 'auto',
                          gridColumn: window.innerWidth < 600 ? '1 / -1' : 'auto'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => removePurchaseItem(index)}
                        style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          padding: window.innerWidth < 600 ? '12px 10px' : '8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: window.innerWidth < 600 ? '14px' : '12px',
                          minHeight: window.innerWidth < 600 ? '44px' : 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gridColumn: window.innerWidth < 600 ? '1 / -1' : 'auto'
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}

                  {item.isNew && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px',
                      backgroundColor: '#e8f5e8',
                      borderRadius: '3px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '11px'
                    }}>
                      Total: L{item.total.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}

              {purchaseItems.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: '#666',
                  border: '2px dashed #ddd',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  <FaBox style={{ fontSize: '32px', color: '#ddd', marginBottom: '8px' }} />
                  <p style={{ margin: '5px 0' }}>Sin productos</p>
                </div>
              )}
            </div>
          </div>

          {/* Total y Botones - Fijos en la parte inferior */}
          <div style={{
            borderTop: '1px solid #eee',
            paddingTop: window.innerWidth < 600 ? '10px' : '12px',
            marginTop: 'auto',
            flexShrink: 0,
            backgroundColor: 'white'
          }}>
            {purchaseItems.length > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: window.innerWidth < 600 ? '10px' : '12px',
                padding: window.innerWidth < 600 ? '8px 10px' : '10px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e0e0e0'
              }}>
                <span style={{ fontWeight: 'bold', fontSize: window.innerWidth < 600 ? '14px' : '14px' }}>
                  Total:
                </span>
                  <span style={{ 
                  fontWeight: 'bold', 
                  fontSize: window.innerWidth < 600 ? '18px' : '16px',
                  color: '#e91e63'
                }}>
                  L{calculateTotal().toFixed(2)}
                </span>
              </div>
            )}

            {/* Botones */}
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              justifyContent: window.innerWidth < 600 ? 'stretch' : 'flex-end'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  padding: window.innerWidth < 600 ? '12px 16px' : '10px 18px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: window.innerWidth < 600 ? '14px' : '13px',
                  flex: window.innerWidth < 600 ? '1' : 'none'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !selectedProvider || purchaseItems.length === 0}
                style={{
                  backgroundColor: loading ? '#ccc' : '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: window.innerWidth < 600 ? '12px 16px' : '10px 18px',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: window.innerWidth < 600 ? '14px' : '13px',
                  flex: window.innerWidth < 600 ? '1' : 'none'
                }}
              >
              {loading ? 'Procesando...' : (
                <>
                  <FaCheck />
                  Registrar
                </>
              )}
              </button>
            </div>
          </div>
        </form>

        {/* Modal para capturar código de barras */}
        {showBarcodeInput !== null && (
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
                          handleBarcodeCapture(showBarcodeInput, result.text)
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
                        handleBarcodeCapture(showBarcodeInput, e.target.value.trim())
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
                        handleBarcodeCapture(showBarcodeInput, input.value.trim())
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
                    setShowBarcodeInput(null)
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

        {/* Modal de Escáner Simplificado */}
        {showSimpleScanner && (
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
            zIndex: 1002
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
                  Escanear Producto
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

              <div style={{
                textAlign: 'center',
                marginBottom: '15px',
                padding: '10px',
                backgroundColor: '#e3f2fd',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#1976d2'
              }}>
                El sistema verificará automáticamente si el producto existe en inventario
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
                          handleSimpleBarcodeCapture(result.text)
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
                    Apunta la cámara hacia el código de barras del producto
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
                        handleSimpleBarcodeCapture(e.target.value.trim())
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
                      const input = e.target.parentElement.parentElement.querySelector('input[placeholder*="código de barras"]')
                      if (input && input.value.trim()) {
                        handleSimpleBarcodeCapture(input.value.trim())
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
                    setShowSimpleScanner(false)
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

export default Purchase