import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { formatDate, getDaysRemaining, getStatusBadgeClass } from '../utils/dateUtils'
import { Plus, Edit, Trash2, X, FileText } from 'lucide-react'

const Warranties = () => {
  const [warranties, setWarranties] = useLocalStorage('warranties', [])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    productName: '',
    category: '',
    store: '',
    purchaseDate: '',
    expiryDate: '',
    serialNumber: ''
  })

  const handleOpenModal = (warranty = null) => {
    if (warranty) {
      setEditingId(warranty.id)
      setFormData(warranty)
    } else {
      setEditingId(null)
      setFormData({
        productName: '',
        category: '',
        store: '',
        purchaseDate: '',
        expiryDate: '',
        serialNumber: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormData({
      productName: '',
      category: '',
      store: '',
      purchaseDate: '',
      expiryDate: '',
      serialNumber: ''
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingId) {
      setWarranties(warranties.map(w => 
        w.id === editingId ? { ...formData, id: editingId } : w
      ))
    } else {
      setWarranties([...warranties, {
        ...formData,
        id: Date.now().toString()
      }])
    }
    handleCloseModal()
  }

  const handleDelete = (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק אחריות זו?')) {
      setWarranties(warranties.filter(w => w.id !== id))
    }
  }

  const handleViewReceipt = (warranty) => {
    // Mock functionality - just show an alert for now
    alert(`צפייה בקבלה עבור: ${warranty.productName}\n\nזהו פונקציונליות מדומה. בעתיד, כאן תוצג הקבלה שהועלתה.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">אחריות</h1>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          הוסף אחריות חדשה
        </button>
      </div>

      {warranties.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-gray-400 mb-4">אין אחריות עדיין</p>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            הוסף אחריות ראשונה
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warranties.map((warranty) => {
            const daysRemaining = getDaysRemaining(warranty.expiryDate)
            return (
              <div key={warranty.id} className="glass-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{warranty.productName}</h3>
                    <p className="text-sm text-gray-400 mb-1">
                      <span className="font-medium">קטגוריה:</span> {warranty.category}
                    </p>
                    <p className="text-sm text-gray-400 mb-1">
                      <span className="font-medium">חנות:</span> {warranty.store}
                    </p>
                    <p className="text-sm text-gray-400 mb-1">
                      <span className="font-medium">תאריך רכישה:</span> {formatDate(warranty.purchaseDate)}
                    </p>
                    <p className="text-sm text-gray-400 mb-1">
                      <span className="font-medium">תאריך פגיעה:</span> {formatDate(warranty.expiryDate)}
                    </p>
                    {warranty.serialNumber && (
                      <p className="text-sm text-gray-400">
                        <span className="font-medium">מספר סידורי:</span> {warranty.serialNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(warranty)}
                      className="p-2 hover:bg-dark-card rounded-lg transition-colors"
                    >
                      <Edit size={18} className="text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(warranty.id)}
                      className="p-2 hover:bg-dark-card rounded-lg transition-colors"
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <span className={getStatusBadgeClass(daysRemaining)}>
                    {daysRemaining !== null
                      ? daysRemaining < 0
                        ? `פג לפני ${Math.abs(daysRemaining)} ימים`
                        : `נותרו ${daysRemaining} ימים`
                      : 'ללא תאריך'}
                  </span>
                  <button
                    onClick={() => handleViewReceipt(warranty)}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <FileText size={16} />
                    צפה בקבלה
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingId ? 'ערוך אחריות' : 'הוסף אחריות חדשה'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-dark-card rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">שם המוצר</label>
                <input
                  type="text"
                  required
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="input-field w-full"
                  placeholder="לדוגמה: iPhone 15 Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">קטגוריה</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field w-full"
                  placeholder="לדוגמה: אלקטרוניקה"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">חנות/ספק</label>
                <input
                  type="text"
                  required
                  value={formData.store}
                  onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                  className="input-field w-full"
                  placeholder="לדוגמה: iStore"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">תאריך רכישה</label>
                <input
                  type="date"
                  required
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">תאריך פגיעה</label>
                <input
                  type="date"
                  required
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">מספר סידורי (אופציונלי)</label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="input-field w-full"
                  placeholder="לדוגמה: SN123456789"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingId ? 'עדכן' : 'הוסף'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary flex-1"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Warranties

