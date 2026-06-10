// SUPABASE_READY: subscriptions
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { formatDate, getDaysRemaining, getStatusBadgeClass } from '../utils/dateUtils'
import { Plus, Edit, Trash2, X, CreditCard, Search, Calendar, DollarSign, Loader2 } from 'lucide-react'

const EMPTY_FORM = {
  name: '', price: '', startDate: '', renewalDate: '', status: 'Active'
}

// Status badge using new design system
const StatusBadge = ({ daysRemaining }) => {
  if (daysRemaining === null) return <span className="pp-badge pp-badge-info">ללא תאריך</span>
  if (daysRemaining < 0)   return <span className="pp-badge-danger">פג לפני {Math.abs(daysRemaining)} ימים</span>
  if (daysRemaining <= 7)  return <span className="pp-badge-danger">נותרו {daysRemaining} ימים</span>
  if (daysRemaining <= 30) return <span className="pp-badge-warning">נותרו {daysRemaining} ימים</span>
  return <span className="pp-badge-success">בתוקף</span>
}

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) fetchSubscriptions(user.id)
      else setLoading(false)
    })
  }, [])

  const fetchSubscriptions = async (userId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })
      if (error) throw error
      const formatted = (data || []).map(s => ({
        ...s,
        startDate: s.start_date || '',
        renewalDate: s.renewal_date || ''
      }))
      setSubscriptions(formatted)
    } catch (e) {
      console.error('שגיאה בשליפת מנויים:', e.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = subscriptions.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenModal = (sub = null) => {
    if (sub) { setEditingId(sub.id); setFormData(sub) }
    else     { setEditingId(null);   setFormData(EMPTY_FORM) }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false); setEditingId(null); setFormData(EMPTY_FORM)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    setIsSaving(true)
    try {
      const payload = {
        user_id: user.id,
        name: formData.name.trim(),
        price: parseFloat(formData.price) || 0,
        start_date: formData.startDate || null,
        renewal_date: formData.renewalDate,
        status: formData.status,
      }
      
      if (editingId) {
        const { error } = await supabase
          .from('subscriptions')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert([payload])
        if (error) throw error
      }
      handleCloseModal()
      await fetchSubscriptions(user.id)
    } catch (err) {
      alert('שגיאה בשמירת המנוי: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('האם למחוק מנוי זה?')) return
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)
      if (error) throw error
      setSubscriptions(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      alert('שגיאה במחיקת המנוי: ' + err.message)
    }
  }

  // Monthly total
  const monthlyTotal = subscriptions
    .filter(s => s.status === 'Active')
    .reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0)

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">מנויים</h1>
          <p className="text-pp-text-secondary text-sm mt-0.5">
            {subscriptions.filter(s => s.status === 'Active').length} מנויים פעילים
            {monthlyTotal > 0 && (
              <span className="text-pp-violet font-semibold mr-2">• ₪{monthlyTotal.toFixed(2)} סה״כ</span>
            )}
          </p>
        </div>
        <button
          id="add-subscription-btn"
          onClick={() => handleOpenModal()}
          className="pp-btn-primary cursor-pointer"
          aria-label="הוסף מנוי חדש"
        >
          <Plus size={16} />
          הוסף מנוי
        </button>
      </div>

      {/* Search */}
      {subscriptions.length > 0 && (
        <div className="relative animate-slide-up" style={{ animationDelay: '50ms' }}>
          <Search
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-pp-text-muted"
            size={16}
            aria-hidden="true"
          />
          <input
            id="subscriptions-search"
            type="text"
            placeholder="חפש מנוי..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pp-input pr-10 text-sm pp-focus"
            dir="rtl"
            aria-label="חיפוש מנויים"
          />
        </div>
      )}

      {/* Loader & Empty States */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 size={36} className="animate-spin text-pp-cyan mb-4" />
          <p className="text-pp-text-secondary text-sm font-medium">טוען מנויים מהשרת...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="pp-glass-card flex flex-col items-center justify-center py-16 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-pp-cyan/10 border border-pp-cyan/20 flex items-center justify-center mb-4 animate-float" aria-hidden="true">
            <CreditCard size={30} className="text-pp-cyan" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">אין מנויים עדיין</h3>
          <p className="text-pp-text-muted text-sm mb-6">הוסף את המנוי הראשון שלך ותתחיל לנהל</p>
          <button
            id="add-first-subscription-btn"
            onClick={() => handleOpenModal()}
            className="pp-btn-primary cursor-pointer"
          >
            <Plus size={16} />
            הוסף מנוי ראשון
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pp-glass-card text-center py-12">
          <p className="text-pp-text-secondary text-sm">לא נמצאו מנויים עבור "{searchTerm}"</p>
        </div>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((sub, i) => {
            const daysRemaining = getDaysRemaining(sub.renewalDate)
            const isActive = sub.status === 'Active'
            return (
              <div
                key={sub.id}
                className="pp-glass p-5 flex flex-col gap-4 animate-slide-up group"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    {/* Name */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-pp-cyan/15 border border-pp-cyan/25 flex items-center justify-center shrink-0" aria-hidden="true">
                        <CreditCard size={14} className="text-pp-cyan" />
                      </div>
                      <h3 className="text-base font-semibold text-white truncate">{sub.name}</h3>
                    </div>
                    {/* Price */}
                    <p className="text-2xl font-display font-bold text-pp-cyan font-numeric mr-10">
                      ₪{parseFloat(sub.price || 0).toFixed(2)}
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleOpenModal(sub)}
                      aria-label={`ערוך מנוי ${sub.name}`}
                      className="p-2 rounded-lg text-pp-text-muted hover:text-pp-violet hover:bg-pp-violet/10 transition-all cursor-pointer pp-focus"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      aria-label={`מחק מנוי ${sub.name}`}
                      className="p-2 rounded-lg text-pp-text-muted hover:text-pp-coral hover:bg-pp-coral/10 transition-all cursor-pointer pp-focus"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-1.5">
                  {sub.startDate && (
                    <div className="flex items-center gap-2 text-xs text-pp-text-muted">
                      <Calendar size={12} aria-hidden="true" />
                      <span>התחיל: {formatDate(sub.startDate)}</span>
                    </div>
                  )}
                  {sub.renewalDate && (
                    <div className="flex items-center gap-2 text-xs text-pp-text-muted">
                      <Calendar size={12} aria-hidden="true" />
                      <span>חידוש: {formatDate(sub.renewalDate)}</span>
                    </div>
                  )}
                </div>

                {/* Footer: Status Badges */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <StatusBadge daysRemaining={daysRemaining} />
                  <span className={isActive ? 'pp-badge-success' : 'pp-badge pp-badge-danger'}>
                    {isActive ? 'פעיל' : 'בוטל'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          className="pp-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal() }}
        >
          <div className="pp-modal" dir="rtl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 id="modal-title" className="text-xl font-display font-bold text-white">
                {editingId ? 'עריכת מנוי' : 'הוסף מנוי חדש'}
              </h2>
              <button
                onClick={handleCloseModal}
                aria-label="סגור חלון"
                className="p-2 rounded-xl text-pp-text-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer pp-focus"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form id="subscription-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="sub-name" className="block text-xs font-semibold text-pp-text-secondary mb-1.5">שם המנוי *</label>
                <input
                  id="sub-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pp-input pp-focus text-sm"
                  placeholder="לדוגמה: Netflix"
                  dir="rtl"
                />
              </div>

              <div>
                <label htmlFor="sub-price" className="block text-xs font-semibold text-pp-text-secondary mb-1.5">מחיר (₪) *</label>
                <div className="relative">
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={14} aria-hidden="true" />
                  <input
                    id="sub-price"
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="pp-input pr-9 pp-focus text-sm font-numeric"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sub-start" className="block text-xs font-semibold text-pp-text-secondary mb-1.5">תאריך התחלה</label>
                  <input
                    id="sub-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="pp-input pp-focus text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sub-renewal" className="block text-xs font-semibold text-pp-text-secondary mb-1.5">תאריך חידוש *</label>
                  <input
                    id="sub-renewal"
                    type="date"
                    required
                    value={formData.renewalDate}
                    onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                    className="pp-input pp-focus text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sub-status" className="block text-xs font-semibold text-pp-text-secondary mb-1.5">סטטוס</label>
                <select
                  id="sub-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="pp-input pp-focus text-sm cursor-pointer"
                >
                  <option value="Active">פעיל</option>
                  <option value="Cancelled">בוטל</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  id="subscription-submit-btn"
                  type="submit"
                  className="pp-btn-primary flex-1 py-3 cursor-pointer"
                >
                  {editingId ? 'עדכן מנוי' : 'הוסף מנוי'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="pp-btn-secondary flex-1 py-3 cursor-pointer"
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
