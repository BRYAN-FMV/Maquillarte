import { useState } from 'react'
import BarcodeScannerComponent from 'react-qr-barcode-scanner'

function Scanner({ onScan }) {
  const [data, setData] = useState('No result')
  const [scanning, setScanning] = useState(true)

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
    <div>
      <h3>Escanear Código</h3>
      {scanning && (
        <BarcodeScannerComponent
          width={500}
          height={500}
          onUpdate={handleUpdate}
        />
      )}
      <p>Resultado: {data}</p>
      {!scanning && <button onClick={() => setScanning(true)}>Escanear de nuevo</button>}
    </div>
  )
}

export default Scanner