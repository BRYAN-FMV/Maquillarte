import { useState } from 'react'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

function ImageUpload() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    const storage = getStorage()
    const storageRef = ref(storage, `images/${file.name}`)
    
    try {
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      setImageUrl(url)
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h2>Subir Imagen</h2>
      <input type="file" onChange={handleFileChange} accept="image/*" />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Subiendo...' : 'Subir Imagen'}
      </button>
      {imageUrl && <img src={imageUrl} alt="Uploaded" style={{ maxWidth: '300px' }} />}
    </div>
  )
}

export default ImageUpload