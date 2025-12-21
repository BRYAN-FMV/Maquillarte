import { useState } from 'react'
import { createSaleTransaction } from '../services/salesService'

function SalesCart({ items, onClose, onUpdateItems, user, onSaleCompleted }) {
  const [cliente, setCliente] = useState('Cliente general')
  const [tipoEntrega, setTipoEntrega] = useState('local')
  const [tipoPago, setTipoPago] = useState('efectivo')
  const [banco, setBanco] = useState('BAC')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [observaciones, setObservaciones] = useState('')

  const updateCantidad = (index, value) => {
    const clone = [...items]
    const cantidad = Number(value) || 1 // Mínimo 1 en lugar de 0
    const stockDisponible = Number(clone[index].stockActual || clone[index].stockOriginal || clone[index].cantidad || clone[index].stock || 0)
    
    // Validar contra el stock real del inventario
    if (cantidad > stockDisponible) {
      alert(`Stock insuficiente. Disponible: ${stockDisponible}`)
      return
    }
    
    // Asegurar que la cantidad sea al menos 1
    clone[index].cantidad = Math.max(1, cantidad)
    onUpdateItems(clone)
  }

  const removeItem = (index) => {
    const clone = [...items]
    clone.splice(index, 1)
    onUpdateItems(clone)
  }

  const total = items.reduce((sum, it) => sum + (Number(it.precioUnitario || 0) * Number(it.cantidad || 0)), 0)

  const handleFinalize = async () => {
    if (!items.length) return alert('No hay productos en el carrito')
    setLoading(true)
    const fechaHora = new Date().toISOString()
    const ventaEnc = { nombreCliente: cliente, fechaHora, tipoEntrega, tipoPago, total, banco: tipoPago === 'transferencia' ? banco : '', observaciones }
    const detalles = items.map(it => ({ docId: it.docId, id: it.id, nombre: it.nombre, precioUnitario: it.precioUnitario, cantidad: it.cantidad }))
    const res = await createSaleTransaction(ventaEnc, detalles)
    setLoading(false)
    if (res.success) {
      setMessage(`Venta registrada (ID: ${res.id})`)
      // Recargar productos para actualizar stock
      if (onSaleCompleted) {
        onSaleCompleted()
      }
      // limpiar carrito y cerrar si desea
      setTimeout(() => {
        onClose && onClose()
      }, 1200)
    } else {
      setMessage(`Error: ${res.error}`)
    }
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: window.innerWidth < 600 ? '8px' : '12px', background: '#fff', borderRadius: '8px' }}>
      <h3>Carrito de Venta</h3>
      <div style={{ marginBottom: '8px' }}>
        <label>Nombre del cliente</label>
        <input 
          value={cliente} 
          onChange={e => setCliente(e.target.value)} 
          style={{ 
            width: '100%', 
            padding: window.innerWidth < 600 ? '12px' : '8px',
            fontSize: window.innerWidth < 600 ? '15px' : '13px',
            boxSizing: 'border-box',
            minHeight: window.innerWidth < 600 ? '44px' : 'auto'
          }} 
        />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label>Tipo de entrega</label>
        <select 
          value={tipoEntrega} 
          onChange={e => setTipoEntrega(e.target.value)} 
          style={{ 
            width: '100%', 
            padding: window.innerWidth < 600 ? '12px' : '8px',
            fontSize: window.innerWidth < 600 ? '15px' : '13px',
            boxSizing: 'border-box',
            minHeight: window.innerWidth < 600 ? '44px' : 'auto'
          }}
        >
          <option value="local">Local</option>
          <option value="nacional">Nacional</option>
          <option value="domicilio">Domicilio</option>
        </select>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label>Tipo de pago</label>
        <select 
          value={tipoPago} 
          onChange={e => setTipoPago(e.target.value)} 
          style={{ 
            width: '100%', 
            padding: window.innerWidth < 600 ? '12px' : '8px',
            fontSize: window.innerWidth < 600 ? '15px' : '13px',
            boxSizing: 'border-box',
            minHeight: window.innerWidth < 600 ? '44px' : 'auto'
          }}
        >
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label>Observaciones</label>
        <textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          placeholder="Notas u observaciones sobre la venta"
          style={{
            width: '100%',
            padding: window.innerWidth < 600 ? '12px' : '8px',
            fontSize: window.innerWidth < 600 ? '15px' : '13px',
            boxSizing: 'border-box',
            minHeight: '60px',
            borderRadius: '6px'
          }}
        />
      </div>

      {tipoPago === 'transferencia' && (
        <div style={{ marginBottom: '8px' }}>
          <label>Banco</label>
          <select
            value={banco}
            onChange={e => setBanco(e.target.value)}
            style={{
              width: '100%',
              padding: window.innerWidth < 600 ? '12px' : '8px',
              fontSize: window.innerWidth < 600 ? '15px' : '13px',
              boxSizing: 'border-box',
              minHeight: window.innerWidth < 600 ? '44px' : 'auto'
            }}
          >
            <option value="BAC">BAC</option>
            <option value="Atlántida">Atlántida</option>
            <option value="Occidente">Occidente</option>
            <option value="Banpais">Banpais</option>
            <option value="Ficohsa">Ficohsa</option>
          </select>
        </div>
      )}

      <div>
        <h4>Productos ({items.length})</h4>
        {items.map((it, idx) => (
          <div key={it.docId} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
            <div style={{ flex: 1 }}>
              <strong>{it.nombre}</strong>
              <div style={{ fontSize: '12px', color: '#666' }}>Stock disponible: {it.stockActual || it.stockOriginal || it.cantidadInventario || 0}</div>
            </div>
            <div style={{ fontSize: '14px' }}>L{Number(it.precioUnitario || 0).toFixed(2)}</div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: window.innerWidth < 600 ? '4px' : '2px'
            }}>
              {/* Botón disminuir - especialmente útil para móviles */}
              <button
                onClick={() => updateCantidad(idx, Math.max(1, (it.cantidad || 1) - 1))}
                disabled={it.cantidad <= 1}
                style={{
                  padding: window.innerWidth < 600 ? '8px 10px' : '4px 6px',
                  background: it.cantidad <= 1 ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: it.cantidad <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: window.innerWidth < 600 ? '16px' : '14px',
                  minHeight: window.innerWidth < 600 ? '36px' : 'auto',
                  minWidth: window.innerWidth < 600 ? '36px' : '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Disminuir cantidad"
              >
                -
              </button>
              
              <input 
                type="number" 
                min="1" 
                max={it.stockActual || it.stockOriginal || it.cantidadInventario || 0} 
                value={it.cantidad} 
                onChange={e => updateCantidad(idx, e.target.value)} 
                style={{ 
                  width: window.innerWidth < 600 ? '50px' : '60px', 
                  padding: window.innerWidth < 600 ? '8px 4px' : '4px',
                  fontSize: window.innerWidth < 600 ? '14px' : '12px',
                  minHeight: window.innerWidth < 600 ? '36px' : 'auto',
                  textAlign: 'center',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }} 
              />
              
              {/* Botón aumentar - especialmente útil para móviles */}
              <button
                onClick={() => updateCantidad(idx, Math.min((it.stockActual || it.stockOriginal || it.cantidadInventario || 0), (it.cantidad || 0) + 1))}
                disabled={it.cantidad >= (it.stockActual || it.stockOriginal || it.cantidadInventario || 0)}
                style={{
                  padding: window.innerWidth < 600 ? '8px 10px' : '4px 6px',
                  background: it.cantidad >= (it.stockActual || it.stockOriginal || it.cantidadInventario || 0) ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: it.cantidad >= (it.stockActual || it.stockOriginal || it.cantidadInventario || 0) ? 'not-allowed' : 'pointer',
                  fontSize: window.innerWidth < 600 ? '16px' : '14px',
                  minHeight: window.innerWidth < 600 ? '36px' : 'auto',
                  minWidth: window.innerWidth < 600 ? '36px' : '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Aumentar cantidad"
              >
                +
              </button>
            </div>
            <button 
              onClick={() => removeItem(idx)}
              style={{ 
                padding: window.innerWidth < 600 ? '6px 8px' : '4px 8px', 
                background: '#ff4444', 
                color: 'white', 
                border: 'none', 
                cursor: 'pointer', 
                borderRadius: '3px',
                fontSize: window.innerWidth < 600 ? '12px' : '12px',
                minHeight: window.innerWidth < 600 ? '28px' : 'auto',
                minWidth: window.innerWidth < 600 ? '28px' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Eliminar producto"
            >
              ×
            </button>
          </div>
        ))}
        <div style={{ marginTop: '12px', fontWeight: 700, fontSize: '16px' }}>Total: L{total.toFixed(2)}</div>
      </div>

      {message && <div style={{ marginTop: '10px' }}>{message}</div>}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button 
          onClick={handleFinalize} 
          disabled={loading} 
          style={{ 
            padding: window.innerWidth < 600 ? '14px 16px' : '10px 14px', 
            background: '#FFB6C1', 
            border: 'none', 
            cursor: 'pointer',
            fontSize: window.innerWidth < 600 ? '14px' : '13px',
            flex: window.innerWidth < 600 ? 1 : 'auto',
            minHeight: window.innerWidth < 600 ? '44px' : 'auto'
          }}
        >
          {loading ? 'Procesando...' : 'Finalizar Venta'}
        </button>
        <button 
          onClick={() => onClose && onClose()} 
          style={{ 
            padding: window.innerWidth < 600 ? '14px 16px' : '10px 14px',
            fontSize: window.innerWidth < 600 ? '14px' : '13px',
            flex: window.innerWidth < 600 ? 1 : 'auto',
            minHeight: window.innerWidth < 600 ? '44px' : 'auto'
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default SalesCart
