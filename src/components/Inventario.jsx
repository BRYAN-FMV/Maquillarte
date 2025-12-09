import { useState, useEffect, useCallback } from 'react'
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import Scanner from './Scanner'

function Inventario({ userRole }) {
  const [inventario, setInventario] = useState([])
  const [newItem, setNewItem] = useState({ id: '', nombre: '', stock: '', precioUnitario: '' })
  const [editingId, setEditingId] = useState(null)
  const [showScanner, setShowScanner] = useState(false)

  const db = getFirestore()

  // Permisos basados en roles
  const canEdit = userRole === 'admin' || userRole === 'employee'
  const canDelete = userRole === 'admin'
  const canAdd = userRole === 'admin' || userRole === 'employee'

  const fetchInventario = useCallback(async () => {
    const querySnapshot = await getDocs(collection(db, 'inventario'))
    const items = querySnapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }))
    setInventario(items)
  }, [db])

  useEffect(() => {
    fetchInventario() // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchInventario])

  const handleScan = (scannedData) => {
    // El código escaneado es el ID
    setNewItem({ ...newItem, id: scannedData })
    setShowScanner(false)
  }

  const handleAddItem = async () => {
    if (!canAdd) {
      alert('No tienes permisos para agregar productos')
      return
    }
    if (!newItem.id || !newItem.nombre || !newItem.stock || !newItem.precioUnitario) return
    try {
      await addDoc(collection(db, 'inventario'), {
        ...newItem,
        ultimaActualizacion: new Date().toISOString()
      })
      setNewItem({ id: '', nombre: '', stock: '', precioUnitario: '' })
      fetchInventario()
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const handleEditItem = (item) => {
    if (!canEdit) {
      alert('No tienes permisos para editar productos')
      return
    }
    setNewItem(item)
    setEditingId(item.docId)
  }

  const handleUpdateItem = async () => {
    if (!canEdit) {
      alert('No tienes permisos para editar productos')
      return
    }
    if (!editingId) return
    try {
      await updateDoc(doc(db, 'inventario', editingId), {
        id: newItem.id,
        nombre: newItem.nombre,
        stock: newItem.stock,
        precioUnitario: newItem.precioUnitario,
        ultimaActualizacion: new Date().toISOString()
      })
      setNewItem({ id: '', nombre: '', stock: '', precioUnitario: '' })
      setEditingId(null)
      fetchInventario()
    } catch (error) {
      console.error('Error updating item:', error)
      alert('Error al actualizar: ' + error.message)
    }
  }

  const handleDeleteItem = async (docId) => {
    if (!canDelete) {
      alert('No tienes permisos para eliminar productos')
      return
    }
    try {
      await deleteDoc(doc(db, 'inventario', docId))
      fetchInventario()
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Error al eliminar: ' + error.message)
    }
  }

  return (
    <div style={{ padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' }}>
      <h2 style={{ marginBottom: '30px', color: '#FF69B4' }}>Inventario</h2>
      
      {/* Información de permisos removida: la vista ya no muestra datos del usuario */}

      {canAdd && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => setShowScanner(!showScanner)}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#FFB6C1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '15px'
              }}
            >
              {showScanner ? 'Desactivar Escáner' : 'Activar Escáner'}
            </button>
          </div>
          
          {showScanner && (
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
              <Scanner onScan={handleScan} />
            </div>
          )}
          
          <div className="form-container" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px', 
            marginBottom: '20px',
            padding: '25px',
            background: '#fff',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ID del Producto</label>
              <input
                type="text"
                placeholder="ID (escanea el código)"
                value={newItem.id}
                onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #FFB6C1', 
                  borderRadius: '8px', 
                  fontSize: '14px',
                  boxSizing: 'border-box' 
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nombre</label>
              <input
                type="text"
                placeholder="Nombre del producto"
                value={newItem.nombre}
                onChange={(e) => setNewItem({ ...newItem, nombre: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #FFB6C1', 
                  borderRadius: '8px', 
                  fontSize: '14px',
                  boxSizing: 'border-box' 
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Stock</label>
              <input
                type="number"
                placeholder="Cantidad en stock"
                value={newItem.stock}
                onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #FFB6C1', 
                  borderRadius: '8px', 
                  fontSize: '14px',
                  boxSizing: 'border-box' 
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Precio Unitario</label>
              <input
                type="number"
                placeholder="Precio por unidad"
                value={newItem.precioUnitario}
                onChange={(e) => setNewItem({ ...newItem, precioUnitario: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #FFB6C1', 
                  borderRadius: '8px', 
                  fontSize: '14px',
                  boxSizing: 'border-box' 
                }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', alignSelf: 'end', maxWidth: '300px' }}>
              {editingId ? (
                <button 
                  onClick={handleUpdateItem} 
                  style={{ 
                    width: '100%', 
                    padding: '12px 24px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Actualizar
                </button>
              ) : (
                <button 
                  onClick={handleAddItem} 
                  style={{ 
                    width: '100%', 
                    padding: '12px 24px',
                    backgroundColor: '#FFB6C1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Agregar
                </button>
              )}
            </div>
          </div>
        </>
      )}
      
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ marginBottom: '20px', color: '#333' }}>Lista de Productos</h3>
        {inventario.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            background: '#f8f9fa', 
            borderRadius: '10px',
            color: '#666'
          }}>
            No hay productos en el inventario
          </div>
        ) : (
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '20px',
            width: '100%'
          }}>
            {inventario.map(item => (
              <div key={item.docId} style={{
                padding: '20px',
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '10px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ flex: '1', minWidth: '250px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>
                    {item.nombre}
                  </div>
                  <div style={{ color: '#666', marginBottom: '5px' }}>
                    <strong>ID:</strong> {item.id}
                  </div>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                    <span style={{ color: item.stock > 0 ? '#28a745' : '#dc3545' }}>
                      <strong>Stock:</strong> {item.stock}
                    </span>
                    <span style={{ color: '#007bff' }}>
                      <strong>Precio:</strong> L.{item.precioUnitario}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                    <span style={{ color: '#666' }}>
                      <strong>Última Actualización:</strong> {new Date(item.ultimaActualizacion).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                  {canEdit && (
                    <button 
                      onClick={() => handleEditItem(item)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Editar
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      onClick={() => handleDeleteItem(item.docId)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Inventario