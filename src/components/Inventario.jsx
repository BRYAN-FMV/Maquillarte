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
    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
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
    await addDoc(collection(db, 'inventario'), newItem)
    setNewItem({ id: '', nombre: '', stock: '', precioUnitario: '' })
    fetchInventario()
  }

  const handleEditItem = (item) => {
    setNewItem(item)
    setEditingId(item.id)
  }

  const handleUpdateItem = async () => {
    if (!editingId) return
    await updateDoc(doc(db, 'inventario', editingId), newItem)
    setNewItem({ id: '', nombre: '', stock: '', precioUnitario: '' })
    setEditingId(null)
    fetchInventario()
  }

  const handleDeleteItem = async (id) => {
    await deleteDoc(doc(db, 'inventario', id))
    fetchInventario()
  }

  return (
    <div>
      <h2>Inventario</h2>
      <button onClick={() => setShowScanner(!showScanner)}>
        {showScanner ? 'Desactivar Escáner' : 'Activar Escáner'}
      </button>
      {showScanner && <Scanner onScan={handleScan} />}
      <div>
        <input
          type="text"
          placeholder="ID (escanea el código)"
          value={newItem.id}
          onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
        />
        <input
          type="text"
          placeholder="Nombre"
          value={newItem.nombre}
          onChange={(e) => setNewItem({ ...newItem, nombre: e.target.value })}
        />
        <input
          type="number"
          placeholder="Stock"
          value={newItem.stock}
          onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
        />
        <input
          type="number"
          placeholder="Precio Unitario"
          value={newItem.precioUnitario}
          onChange={(e) => setNewItem({ ...newItem, precioUnitario: e.target.value })}
        />
        {editingId ? (
          <button onClick={handleUpdateItem}>Actualizar</button>
        ) : (
          <button onClick={handleAddItem}>Agregar</button>
        )}
      </div>
      
      <ul>
        {inventario.map(item => (
          <li key={item.id}>
            ID: {item.id} - {item.nombre} - Stock: {item.stock} - Precio: ${item.precioUnitario}
            <button onClick={() => handleEditItem(item)}>Editar</button>
            <button onClick={() => handleDeleteItem(item.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Inventario