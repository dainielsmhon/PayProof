import { FileText, Upload, Download, Trash2 } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { formatDate } from '../utils/dateUtils'

const Receipts = () => {
  // Mock receipts data - in a real app, this would be managed separately
  const [receipts, setReceipts] = useLocalStorage('receipts', [
    {
      id: '1',
      fileName: 'קבלה_iPhone_15_Pro.pdf',
      productName: 'iPhone 15 Pro',
      uploadDate: new Date().toISOString().split('T')[0],
      size: '2.4 MB'
    },
    {
      id: '2',
      fileName: 'קבלה_MacBook_Pro.pdf',
      productName: 'MacBook Pro',
      uploadDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      size: '1.8 MB'
    }
  ])

  const handleUpload = () => {
    // Mock upload functionality
    const newReceipt = {
      id: Date.now().toString(),
      fileName: `קבלה_${Date.now()}.pdf`,
      productName: 'מוצר חדש',
      uploadDate: new Date().toISOString().split('T')[0],
      size: '1.2 MB'
    }
    setReceipts([...receipts, newReceipt])
    alert('קבלה הועלתה בהצלחה! (זהו פונקציונליות מדומה)')
  }

  const handleDownload = (receipt) => {
    // Mock download functionality
    alert(`מוריד קבלה: ${receipt.fileName}\n\nזהו פונקציונליות מדומה. בעתיד, כאן תורד הקבלה.`)
  }

  const handleDelete = (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק קבלה זו?')) {
      setReceipts(receipts.filter(r => r.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">קבלות</h1>
        <button
          onClick={handleUpload}
          className="btn-primary flex items-center gap-2"
        >
          <Upload size={20} />
          העלה קבלה
        </button>
      </div>

      {receipts.length === 0 ? (
        <div className="glass-card text-center py-12">
          <FileText size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-4">אין קבלות עדיין</p>
          <button onClick={handleUpload} className="btn-primary">
            העלה קבלה ראשונה
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="glass-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <FileText className="text-blue-400" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{receipt.fileName}</h3>
                    <p className="text-sm text-gray-400 mb-1">
                      <span className="font-medium">מוצר:</span> {receipt.productName}
                    </p>
                    <p className="text-sm text-gray-400">
                      <span className="font-medium">תאריך העלאה:</span> {formatDate(receipt.uploadDate)} • 
                      <span className="font-medium mr-2">גודל:</span> {receipt.size}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(receipt)}
                    className="p-2 hover:bg-dark-card rounded-lg transition-colors"
                    title="הורד"
                  >
                    <Download size={20} className="text-blue-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(receipt.id)}
                    className="p-2 hover:bg-dark-card rounded-lg transition-colors"
                    title="מחק"
                  >
                    <Trash2 size={20} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card bg-yellow-500/10 border-yellow-500/30">
        <p className="text-sm text-yellow-400">
          <strong>הערה:</strong> זהו תצוגה מדומה של קבלות. בעתיד, כאן תוצג פונקציונליות מלאה להעלאת, צפייה והורדת קבלות.
        </p>
      </div>
    </div>
  )
}

export default Receipts

