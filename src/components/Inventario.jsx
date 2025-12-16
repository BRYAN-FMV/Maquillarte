import { useState, useEffect, useCallback, useRef } from 'react'
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query as fsQuery, where as fsWhere, orderBy, limit as fsLimit, startAfter } from 'firebase/firestore'
import Scanner from './Scanner'

function Inventario({ userRole }) {
  const [inventario, setInventario] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const lastDocRef = useRef(null)
  const [newItem, setNewItem] = useState({ id: '', nombre: '', cantidad: '', costo: '', precio: '', categoria: 'otros' })
  const [editingId, setEditingId] = useState(null)
  const [showScanner, setShowScanner] = useState(false)

  const db = getFirestore()

  // Permisos basados en roles
  const canEdit = userRole === 'admin' || userRole === 'employee'
  const canDelete = userRole === 'admin'
  const canAdd = userRole === 'admin' || userRole === 'employee'

  // Carga inicial: solo primeros 20 items ordenados por nombre
  const fetchInventario = useCallback(async () => {
    const q = fsQuery(collection(db, 'inventario'), orderBy('nombre'), fsLimit(20))
    const querySnapshot = await getDocs(q)
    const items = querySnapshot.docs.map(d => ({ docId: d.id, ...d.data() }))
    setInventario(items)
    if (querySnapshot.docs.length > 0) {
      lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1]
      setHasMore(querySnapshot.docs.length === 20)
    } else {
      lastDocRef.current = null
      setHasMore(false)
    }
  }, [db])

  const loadMore = async () => {
    if (!lastDocRef.current) return
    setLoadingMore(true)
    try {
      const q = fsQuery(collection(db, 'inventario'), orderBy('nombre'), startAfter(lastDocRef.current), fsLimit(20))
      const snap = await getDocs(q)
      const items = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
      setInventario(prev => [...prev, ...items])
      if (snap.docs.length > 0) {
        lastDocRef.current = snap.docs[snap.docs.length - 1]
        setHasMore(snap.docs.length === 20)
      } else {
        lastDocRef.current = null
        setHasMore(false)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  // Buscar por ID exacto y por nombre (prefijo)
  const runSearch = async (qStr) => {
    const raw = String(qStr || '').trim()
    if (!raw) {
      fetchInventario()
      return
    }

    const q = raw
    const qLower = q.toLowerCase()
    const qUpper = q.toUpperCase()
    const resultsMap = new Map()

    try {
      // Probar coincidencias exactas de ID con variantes (usuario puede escribir en distinta capitalización)
      const idVariants = [q, qLower, qUpper]
      for (const idv of idVariants) {
        const idQuery = fsQuery(collection(db, 'inventario'), fsWhere('id', '==', idv))
        const idSnap = await getDocs(idQuery)
        idSnap.docs.forEach(d => resultsMap.set(d.id, { docId: d.id, ...d.data() }))
      }

      // Buscar por nombre (rango por prefijo) y filtrar en cliente de forma case-insensitive
      const pref = q
      const nameQuery = fsQuery(collection(db, 'inventario'), fsWhere('nombre', '>=', pref), fsWhere('nombre', '<=', pref + '\uf8ff'), fsLimit(50))
      const nameSnap = await getDocs(nameQuery)
      nameSnap.docs.forEach(d => {
        const data = { docId: d.id, ...d.data() }
        if ((data.nombre || '').toLowerCase().startsWith(qLower)) {
          resultsMap.set(d.id, data)
        }
      })

      let items = Array.from(resultsMap.values())
      // Si no hay resultados, intentar un fallback: consultar primeros 200 items y filtrar client-side
      if (items.length === 0) {
        try {
          const fallbackQuery = fsQuery(collection(db, 'inventario'), orderBy('nombre'), fsLimit(200))
          const fallbackSnap = await getDocs(fallbackQuery)
          fallbackSnap.docs.forEach(d => {
            const data = { docId: d.id, ...d.data() }
            if ((data.nombre || '').toLowerCase().includes(qLower)) {
              resultsMap.set(d.id, data)
            }
          })
          items = Array.from(resultsMap.values())
        } catch (fbErr) {
          console.error('Fallback search error:', fbErr)
        }
      }
      setInventario(items)
      // reset pagination
      lastDocRef.current = null
      setHasMore(false)
    } catch (error) {
      console.error('Error buscando en inventario:', error)
      alert('Error al buscar: ' + error.message)
    }
  }

  useEffect(() => {
    fetchInventario() // carga inicial limitada (20)
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
    if (!newItem.id || !newItem.nombre || !newItem.cantidad || !newItem.costo || !newItem.precio) return
    try {
      await addDoc(collection(db, 'inventario'), {
        ...newItem,
        cantidad: parseInt(newItem.cantidad),
        costo: parseFloat(newItem.costo),
        precio: parseFloat(newItem.precio),
        categoria: newItem.categoria || 'otros',
        ultimaActualizacion: new Date().toISOString()
      })
      setNewItem({ id: '', nombre: '', cantidad: '', costo: '', precio: '', categoria: 'otros' })
      // recargar página inicial
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
    setNewItem({
      id: item.id || '',
      nombre: item.nombre || '',
      cantidad: item.cantidad || item.stock || '',
      costo: item.costo || '',
      precio: item.precio || '',
      categoria: item.categoria || 'otros'
    })
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
        cantidad: parseInt(newItem.cantidad),
        costo: parseFloat(newItem.costo),
        precio: parseFloat(newItem.precio),
        categoria: newItem.categoria || 'otros',
        ultimaActualizacion: new Date().toISOString()
      })
      setNewItem({ id: '', nombre: '', cantidad: '', costo: '', precio: '', categoria: 'otros' })
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
      // quitar localmente
      setInventario(prev => prev.filter(i => i.docId !== docId))
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Categoría</label>
              <select
                value={newItem.categoria}
                onChange={e => setNewItem(prev => ({ ...prev, categoria: e.target.value }))}
                style={{ width: '100%', padding: '12px', border: '2px solid #FFB6C1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              >
                <option value="skincare">skincare</option>
                <option value="maquillaje">maquillaje</option>
                <option value="uñas">uñas</option>
                <option value="depilación">depilación</option>
                <option value="cuidado personal">cuidado personal</option>
                <option value="otros">otros</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Cantidad</label>
              <input
                type="number"
                placeholder="Cantidad en inventario"
                value={newItem.cantidad}
                onChange={(e) => setNewItem({ ...newItem, cantidad: e.target.value })}
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
            {canAdd && userRole === 'admin' && (
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Costo</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Costo de compra"
                  value={newItem.costo}
                  onChange={(e) => setNewItem({ ...newItem, costo: e.target.value })}
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
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Precio de Venta</label>
              <input
                type="number"
                step="0.01"
                placeholder="Precio de venta"
                value={newItem.precio}
                onChange={(e) => setNewItem({ ...newItem, precio: e.target.value })}
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
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Buscar por ID o nombre..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch(searchQuery) }}
            style={{ padding: '8px', flex: 1, borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <button onClick={() => runSearch(searchQuery)} style={{ padding: '8px 12px', background: '#FFB6C1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Buscar</button>
          <button onClick={() => { setSearchQuery(''); fetchInventario() }} style={{ padding: '8px 12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Restablecer</button>
        </div>
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
          <>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '15px',
            width: '100%',
            maxWidth: '1200px'
          }}>
            {inventario.map(item => (
              <div key={item.docId} style={{
                padding: '15px',
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '10px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minHeight: 'auto',
                overflow: 'hidden'
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px', color: '#333', wordWrap: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.nombre}
                  </div>
                  <div style={{ color: '#666', marginBottom: '5px', fontSize: '13px', wordWrap: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <strong>ID:</strong> {item.id}
                  </div>
                </div>
                <div style={{ color: '#666', marginBottom: '5px', fontSize: '13px' }}>
                  <strong>Categoría:</strong> {item.categoria || 'otros'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  <span style={{ color: (item.cantidad || item.stock) > 0 ? '#28a745' : '#dc3545' }}>
                    <strong>Cant:</strong> {item.cantidad || item.stock}
                  </span>
                  {userRole === 'admin' && (
                    <span style={{ color: '#ff6b35' }}>
                      <strong>Costo:</strong> L.{item.costo || 0}
                    </span>
                  )}
                  <span style={{ color: '#007bff' }}>
                    <strong>Precio:</strong> L.{item.precio || 0}
                  </span>
                  {userRole === 'admin' && item.costo && item.precio && (
                    <span style={{ color: '#28a745', fontSize: '12px' }}>
                      <strong>Gan:</strong> L.{(item.precio - item.costo).toFixed(2)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#999', wordWrap: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <strong>Act:</strong> {new Date(item.ultimaActualizacion).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginTop: 'auto' }}>
                  {canEdit && (
                    <button 
                      onClick={() => handleEditItem(item)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        flex: '1',
                        minWidth: 0
                      }}
                    >
                      Editar
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      onClick={() => handleDeleteItem(item.docId)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        flex: '1',
                        minWidth: 0
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <button onClick={loadMore} disabled={loadingMore} style={{ padding: '10px 16px', background: '#FFB6C1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}

export default Inventario