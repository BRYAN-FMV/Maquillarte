import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { deleteExpense } from '../services/expensesService'

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]); // Hoy por defecto
  const [filterCategory, setFilterCategory] = useState('Todas'); // Nueva filtro por categoría
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    categoria: 'Operativos',
    monto: '',
    descripcion: '',
    metodoPago: 'Efectivo',
  });

  const db = getFirestore();
  const categorias = ['Operativos', 'Inventario', 'Marketing', 'Personal', 'Otros'];
  const categoriasFilter = ['Todas', ...categorias];
  const metodosPago = ['Efectivo', 'Tarjeta'];

  const fetchExpenses = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'gastos'));
      const expensesData = querySnapshot.docs.map(doc => ({ 
        docId: doc.id, 
        ...doc.data() 
      }));
      setExpenses(expensesData);
      // No filtrar aquí - el filtro se aplica por separado
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  }, [db]); // Solo depender de db, no de filterDate

  const filterExpensesByDate = (expensesData, selectedDate, selectedCategory = filterCategory) => {
    let filtered = expensesData.filter(expense => {
      // Si tiene campo fecha, comparar directamente
      if (expense.fecha) {
        return expense.fecha === selectedDate
      }
      // Si solo tiene fechaHora, extraer la fecha
      if (expense.fechaHora) {
        const expenseDate = expense.fechaHora.split('T')[0]
        return expenseDate === selectedDate
      }
      // Si no tiene ninguna, no incluir
      return false
    })

    // Aplicar filtro por categoría
    if (selectedCategory !== 'Todas') {
      filtered = filtered.filter(expense => expense.categoria === selectedCategory)
    }

    setFilteredExpenses(filtered)
  }

  const handleDateFilterChange = (e) => {
    const selectedDate = e.target.value;
    setFilterDate(selectedDate);
  };

  const handleCategoryFilterChange = (e) => {
    const selectedCategory = e.target.value;
    setFilterCategory(selectedCategory);
  };

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Aplicar filtros cuando cambien los datos, fecha o categoría
  useEffect(() => {
    if (expenses.length > 0) {
      filterExpensesByDate(expenses, filterDate, filterCategory);
    }
  }, [expenses, filterDate, filterCategory]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.monto) {
      alert('Por favor, ingresa el monto del gasto.');
      return;
    }

    try {
      const nuevoGasto = {
        fecha: formData.fecha,
        categoria: formData.categoria,
        monto: parseFloat(formData.monto),
        descripcion: formData.descripcion,
        metodoPago: formData.metodoPago,
        fechaCreacion: new Date().toISOString()
      };

      await addDoc(collection(db, 'gastos'), nuevoGasto);
      
      setFormData({ 
        fecha: new Date().toISOString().split('T')[0], // Mantener fecha actual
        categoria: 'Operativos', 
        monto: '', 
        descripcion: '', 
        metodoPago: 'Efectivo' 
      });
      
      fetchExpenses(); // Recargar la lista de gastos
      alert('Gasto registrado exitosamente');
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Error al registrar el gasto: ' + error.message);
    }
  };

  const handleEdit = (gasto) => {
    setFormData({
      fecha: gasto.fecha,
      categoria: gasto.categoria,
      monto: gasto.monto.toString(),
      descripcion: gasto.descripcion || '',
      metodoPago: gasto.metodoPago,
    });
    setEditingId(gasto.docId);
  };

  const handleUpdate = async () => {
    if (!formData.monto) {
      alert('Por favor, ingresa el monto del gasto.');
      return;
    }

    try {
      const gastoActualizado = {
        fecha: formData.fecha,
        categoria: formData.categoria,
        monto: parseFloat(formData.monto),
        descripcion: formData.descripcion,
        metodoPago: formData.metodoPago,
        fechaModificacion: new Date().toISOString()
      };

      await updateDoc(doc(db, 'gastos', editingId), gastoActualizado);
      
      setFormData({ 
        fecha: new Date().toISOString().split('T')[0],
        categoria: 'Operativos', 
        monto: '', 
        descripcion: '', 
        metodoPago: 'Efectivo' 
      });
      setEditingId(null);
      
      fetchExpenses();
      alert('Gasto actualizado exitosamente');
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Error al actualizar el gasto: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setFormData({ 
      fecha: new Date().toISOString().split('T')[0],
      categoria: 'Operativos', 
      monto: '', 
      descripcion: '', 
      metodoPago: 'Efectivo' 
    });
    setEditingId(null);
  };

  const handleDelete = async (docId) => {
    try {
      const res = await deleteExpense(docId)
      if (res && res.deleted) {
        fetchExpenses(); // Recargar la lista de gastos
        alert('Gasto eliminado exitosamente')
      } else {
        // Si no se encontró, recargar para mantener UI en sync
        fetchExpenses()
        alert('Gasto no encontrado o ya eliminado')
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error al eliminar el gasto: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' }}>
      <h2 style={{ marginBottom: '30px', color: '#FF69B4' }}>
        {editingId ? 'Editar Gasto' : 'Registro de Gastos'}
      </h2>

      {/* Filtros */}
      <div style={{
        marginBottom: '15px',
        padding: '12px',
        background: '#fff',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        fontSize: '13px'
      }}>
        <label style={{ fontWeight: 'bold', color: '#495057' }}>Filtrar:</label>
        <input
          type="date"
          value={filterDate}
          onChange={handleDateFilterChange}
          style={{
            padding: '6px 10px',
            border: '1px solid #FFB6C1',
            borderRadius: '5px',
            fontSize: '12px'
          }}
        />
        <select
          value={filterCategory}
          onChange={handleCategoryFilterChange}
          style={{
            padding: '6px 10px',
            border: '1px solid #FFB6C1',
            borderRadius: '5px',
            fontSize: '12px'
          }}
        >
          {categoriasFilter.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
        <span style={{ color: '#666', fontSize: '12px' }}>
          {new Date(filterDate + 'T00:00:00').toLocaleDateString('es-ES')} 
          {filterCategory !== 'Todas' && ` - ${filterCategory}`}
        </span>
      </div>

      {/* Formulario */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '12px', 
        marginBottom: '15px',
        padding: '15px',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>Fecha</label>
          <input
            type="text"
            value={new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
            readOnly
            style={{
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '5px', 
              fontSize: '12px',
              boxSizing: 'border-box',
              backgroundColor: '#f5f5f5',
              color: '#666'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>Categoría</label>
          <select 
            name="categoria" 
            value={formData.categoria} 
            onChange={handleInputChange}
            style={{
              width: '100%', 
              padding: '8px', 
              border: '1px solid #FFB6C1', 
              borderRadius: '5px', 
              fontSize: '12px',
              boxSizing: 'border-box'
            }}
          >
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>Monto</label>
          <input
            type="number"
            step="0.01"
            name="monto"
            placeholder="Monto"
            value={formData.monto}
            onChange={handleInputChange}
            required
            style={{
              width: '100%', 
              padding: '8px', 
              border: '1px solid #FFB6C1', 
              borderRadius: '5px', 
              fontSize: '12px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>Descripción</label>
          <input
            type="text"
            name="descripcion"
            placeholder="Descripción (opcional)"
            value={formData.descripcion}
            onChange={handleInputChange}
            style={{
              width: '100%', 
              padding: '8px', 
              border: '1px solid #FFB6C1', 
              borderRadius: '5px', 
              fontSize: '12px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>Método de Pago</label>
          <select 
            name="metodoPago" 
            value={formData.metodoPago} 
            onChange={handleInputChange}
            style={{
              width: '100%', 
              padding: '8px', 
              border: '1px solid #FFB6C1', 
              borderRadius: '5px', 
              fontSize: '12px',
              boxSizing: 'border-box'
            }}
          >
            {metodosPago.map((metodo) => (
              <option key={metodo} value={metodo}>
                {metodo}
              </option>
            ))}
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1', alignSelf: 'end', display: 'flex', gap: '8px' }}>
          {editingId ? (
            <>
              <button 
                onClick={handleUpdate} 
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                Actualizar
              </button>
              <button 
                onClick={handleCancelEdit} 
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                Cancelar
              </button>
            </>
          ) : (
            <button 
              onClick={handleSubmit} 
              style={{
                width: '100%', 
                padding: '8px 16px',
                backgroundColor: '#FFB6C1',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#FF91A4'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#FFB6C1'}
            >
              Registrar Gasto
            </button>
          )}
        </div>
      </div>

      {/* Lista de Gastos */}
      <div style={{ 
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <h3 style={{ 
          margin: '0',
          padding: '12px 15px',
          backgroundColor: '#FFB6C1',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>Lista de Gastos</h3>
        
        {filteredExpenses.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
            <p style={{ margin: 0 }}>No hay gastos registrados para la fecha seleccionada</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ 
                    padding: '15px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#495057'
                  }}>Fecha</th>
                  <th style={{ 
                    padding: '15px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#495057'
                  }}>Categoría</th>
                  <th style={{ 
                    padding: '15px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#495057'
                  }}>Monto</th>
                  <th style={{ 
                    padding: '15px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#495057'
                  }}>Descripción</th>
                  <th style={{ 
                    padding: '15px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#495057'
                  }}>Método de Pago</th>
                  <th style={{ 
                    padding: '15px', 
                    textAlign: 'center', 
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#495057'
                  }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((gasto, index) => (
                  <tr key={gasto.docId} style={{ 
                    backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                  }}>
                    <td style={{ 
                      padding: '15px', 
                      borderBottom: '1px solid #dee2e6'
                    }}>{new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-ES')}</td>
                    <td style={{ 
                      padding: '15px', 
                      borderBottom: '1px solid #dee2e6'
                    }}>{gasto.categoria}</td>
                    <td style={{ 
                      padding: '15px', 
                      borderBottom: '1px solid #dee2e6',
                      fontWeight: 'bold',
                      color: '#28a745'
                    }}>${gasto.monto.toFixed(2)}</td>
                    <td style={{ 
                      padding: '15px', 
                      borderBottom: '1px solid #dee2e6'
                    }}>{gasto.descripcion || 'Sin descripción'}</td>
                    <td style={{ 
                      padding: '15px', 
                      borderBottom: '1px solid #dee2e6'
                    }}>{gasto.metodoPago}</td>
                    <td style={{ 
                      padding: '15px', 
                      borderBottom: '1px solid #dee2e6',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleEdit(gasto)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(gasto.docId)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Expenses;