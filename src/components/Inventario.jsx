import { useState, useEffect, useCallback } from 'react'
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import Scanner from './Scanner'

function Inventario() {
  const [inventario, setInventario] = useState([])
  const [newItem, setNewItem] = useState({ id: '', nombre: '', stock: '', precioUnitario: '' })
  const [editingId, setEditingId] = useState(null)
  const [showScanner, setShowScanner] = useState(false)

  const db = getFirestore()

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
    if (!newItem.id || !newItem.nombre || !newItem.stock || !newItem.precioUnitario) return
    try {
      await addDoc(collection(db, 'inventario'), newItem)
      setNewItem({ id: '', nombre: '', stock: '', precioUnitario: '' })
      fetchInventario()
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const handleEditItem = (item) => {
    setNewItem(item)
    setEditingId(item.docId)
  }

  const handleUpdateItem = async () => {
    if (!editingId) return
    try {
      await updateDoc(doc(db, 'inventario', editingId), {
        id: newItem.id,
        nombre: newItem.nombre,
        stock: newItem.stock,
        precioUnitario: newItem.precioUnitario
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
    try {
      await deleteDoc(doc(db, 'inventario', docId))
      fetchInventario()
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Error al eliminar: ' + error.message)
    }
  }

  return (
    <div>
      <h2>Inventario</h2>
      <button onClick={() => setShowScanner(!showScanner)}>
        {showScanner ? 'Desactivar Escáner' : 'Activar Escáner'}
      </button>
      {showScanner && <Scanner onScan={handleScan} />}
      <div className="form-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px', margin: '0 auto' }}>
        <input
          type="text"
          placeholder="ID (escanea el código)"
          value={newItem.id}
          onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <input
          type="text"
          placeholder="Nombre"
          value={newItem.nombre}
          onChange={(e) => setNewItem({ ...newItem, nombre: e.target.value })}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <input
          type="number"
          placeholder="Stock"
          value={newItem.stock}
          onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <input
          type="number"
          placeholder="Precio Unitario"
          value={newItem.precioUnitario}
          onChange={(e) => setNewItem({ ...newItem, precioUnitario: e.target.value })}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        {editingId ? (
          <button onClick={handleUpdateItem} style={{ width: '100%' }}>Actualizar</button>
        ) : (
          <button onClick={handleAddItem} style={{ width: '100%' }}>Agregar</button>
        )}
      </div>
      
      <ul>
        {inventario.map(item => (
          <li key={item.docId}>
            ID: {item.id} - {item.nombre} - Stock: {item.stock} - Precio: ${item.precioUnitario}
            <button onClick={() => handleEditItem(item)}>Editar</button>
            <button onClick={() => handleDeleteItem(item.docId)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Inventario