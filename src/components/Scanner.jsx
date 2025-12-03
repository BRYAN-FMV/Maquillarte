import { useState, useEffect } from 'react'
import BarcodeScannerComponent from 'react-qr-barcode-scanner'

function Scanner({ onScan }) {
  const [data, setData] = useState('No result')
  const [scanning, setScanning] = useState(true)
  const [scannerSize, setScannerSize] = useState({ width: 500, height: 500 })

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
      onScan(result.text)
    } else {
      setData('No result')
    }
  }

  return (
    <div style={{ padding: '10px', textAlign: 'center' }}>
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
      {!scanning && (
        <button 
          onClick={() => setScanning(true)}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            width: '100%',
            maxWidth: '200px'
          }}
        >
          Escanear de nuevo
        </button>
      )}
    </div>
  )
}

export default Scanner