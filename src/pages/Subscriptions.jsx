import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { formatDate, getDaysRemaining, getStatusBadgeClass } from '../utils/dateUtils'
import { Plus, Edit, Trash2, X } from 'lucide-react'

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useLocalStorage('subscriptions', [])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    startDate: '',
    renewalDate: '',
    status: 'Active'
  })

  const handleOpenModal = (subscription = null) => {
    if (subscription) {
      setEditingId(subscription.id)
      setFormData(subscription)
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        price: '',
        startDate: '',
        renewalDate: '',
        status: 'Active'
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormData({
      name: '',
      price: '',
      startDate: '',
      renewalDate: '',
      status: 'Active'
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingId) {
      setSubscriptions(subscriptions.map(s => 
        s.id === editingId ? { ...formData, id: editingId } : s
      ))
    } else {
      setSubscriptions([...subscriptions, {
        ...formData,
        id: Date.now().toString(),
        price: parseFloat(formData.price) || 0
      }])
    }
    handleCloseModal()
  }

  const handleDelete = (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק מנוי זה?')) {
      setSubscriptions(subscriptions.filter(s => s.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">מנויים</h1>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          הוסף מנוי חדש
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-gray-400 mb-4">אין מנויים עדיין</p>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            הוסף מנוי ראשון
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subscriptions.map((subscription) => {
            const daysRemaining = getDaysRemaining(subscription.renewalDate)
            return (
              <div key={subscription.id} className="glass-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{subscription.name}</h3>
                    <p className="text-2xl font-bold text-blue-400 mb-1">₪{subscription.price}</p>
                    <p className="text-sm text-gray-400">
                      תאריך התחלה: {formatDate(subscription.startDate)}
                    </p>
                    <p className="text-sm text-gray-400">
                      תאריך חידוש: {formatDate(subscription.renewalDate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(subscription)}
                      className="p-2 hover:bg-dark-card rounded-lg transition-colors"
                    >
                      <Edit size={18} className="text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(subscription.id)}
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
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    subscription.status === 'Active'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {subscription.status === 'Active' ? 'פעיל' : 'בוטל'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingId ? 'ערוך מנוי' : 'הוסף מנוי חדש'}
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
                <label className="block text-sm font-medium mb-2">שם המנוי</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="לדוגמה: Netflix"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">מחיר (₪)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="input-field w-full"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">תאריך התחלה</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">תאריך חידוש</label>
                <input
                  type="date"
                  required
                  value={formData.renewalDate}
                  onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">סטטוס</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="Active">פעיל</option>
                  <option value="Cancelled">בוטל</option>
                </select>
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

export default Subscriptions

