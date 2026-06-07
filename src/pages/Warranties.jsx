// SUPABASE_READY: warranties, storage:receipts
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Plus, Trash2, Shield, Loader2, Save, X,
  FileText, Upload, Hash, Search, Calendar,
  Store, CheckCircle, AlertCircle
} from 'lucide-react';

const getDaysLeft = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const StatusBadge = ({ daysLeft }) => {
  if (daysLeft === null) return null;
  if (daysLeft < 0)   return <span className="pp-badge-danger">פג תוקף</span>;
  if (daysLeft <= 7)  return <span className="pp-badge-danger">נותרו {daysLeft} ימים</span>;
  if (daysLeft <= 30) return <span className="pp-badge-warning">נותרו {daysLeft} ימים</span>;
  return <span className="pp-badge-success">בתוקף</span>;
};

const Warranties = () => {
  const [warranties, setWarranties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Form fields
  const [productName, setProductName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  const [user, setUser] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchWarranties(user.id);
    });
  }, []);

  const fetchWarranties = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('user_id', userId)
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      setWarranties(data || []);
    } catch (err) {
      console.error('Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredWarranties = warranties.filter(w =>
    w.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.store?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = async (file) => {
    if (!file) return null;
    const ext = file.name.split('.').pop();
    const name = `${Math.random().toString(36).substring(2)}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('receipts').upload(name, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(name);
    return publicUrl;
  };

  const resetForm = () => {
    setProductName(''); setStoreName(''); setPurchaseDate('');
    setExpiryDate(''); setSerialNumber(''); setReceiptFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { showToast('נא להתחבר מחדש', 'error'); return; }
    setIsSaving(true);
    try {
      let receiptUrl = null;
      if (receiptFile) receiptUrl = await handleFileUpload(receiptFile);
      const { error } = await supabase.from('warranties').insert([{
        user_id: user.id,
        product_name: productName.trim(),
        store: storeName.trim() || null,
        purchase_date: purchaseDate || null,
        expiry_date: expiryDate,
        serial_number: serialNumber.trim() || null,
        receipt_url: receiptUrl,
      }]);
      if (error) throw error;
      resetForm();
      setShowForm(false);
      showToast('האחריות נשמרה בהצלחה 🎉');
      await fetchWarranties(user.id);
    } catch (err) {
      showToast(`שגיאה: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('האם למחוק אחריות זו?')) return;
    const { error } = await supabase.from('warranties').delete().eq('id', id);
    if (!error) {
      setWarranties(prev => prev.filter(w => w.id !== id));
      showToast('האחריות נמחקה');
    }
  };

  const inWarranty = warranties.filter(w => getDaysLeft(w.expiry_date) >= 0).length;
  const expired    = warranties.filter(w => getDaysLeft(w.expiry_date) < 0).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl animate-fade-in-down ${
            toast.type === 'error'
              ? 'bg-pp-coral/15 border-pp-coral/40 text-white'
              : 'bg-pp-mint/15 border-pp-mint/40 text-white'
          }`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'error'
            ? <AlertCircle size={16} className="text-pp-coral shrink-0" />
            : <CheckCircle size={16} className="text-pp-mint shrink-0" />
          }
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">אחריות</h1>
          <p className="text-pp-text-secondary text-sm mt-0.5">
            <span className="text-pp-mint font-semibold">{inWarranty} בתוקף</span>
            {expired > 0 && <span className="text-pp-coral font-semibold mr-2">• {expired} פגו תוקף</span>}
          </p>
        </div>
        <button
          id="add-warranty-btn"
          onClick={() => { setShowForm(!showForm); resetForm(); }}
          className="pp-btn-primary cursor-pointer"
          aria-label={showForm ? 'ביטול הוספת אחריות' : 'הוסף אחריות חדשה'}
          aria-expanded={showForm}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'ביטול' : 'הוסף אחריות'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="pp-glass-card animate-slide-up">
          <h2 className="text-lg font-display font-semibold text-white mb-5 flex items-center gap-2">
            <Shield size={18} className="text-pp-mint" aria-hidden="true" />
            פרטי האחריות החדשה
          </h2>
          <form id="warranty-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label htmlFor="w-product" className="block text-xs font-semibold text-pp-text-secondary mb-1.5">שם המוצר *</label>
              <input
                id="w-product"
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="pp-input pp-focus text-sm"
                placeholder="לדוגמה: מקרר Samsung"
                dir="rtl"
              />
            </div>

            <div>
              <label htmlFor="w-store" className="block text-xs font-semibold text-pp-text-secondary mb-1.5">חנות / ספק</label>
              <div className="relative">
                <Store className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={14} aria-hidden="true" />
                <input
                  id="w-store"
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="pp-input pr-9 pp-focus text-sm"
                  placeholder="לדוגמה: KSP"
                  dir="rtl"
                />
              </div>
            </div>

            <div>
              <label htmlFor="w-serial" className="block text-xs font-semibold text-pp-text-secondary mb-1.5">מספר סידורי (S/N)</label>
              <div className="relative">
                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={14} aria-hidden="true" />
                <input
                  id="w-serial"
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="pp-input pr-9 pp-focus text-sm"
                  placeholder="SN-XXXX-YYYY"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label htmlFor="w-expiry" className="block text-xs font-semibold text-pp-text-secondary mb-1.5">תאריך פקיעת אחריות *</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={14} aria-hidden="true" />
                <input
                  id="w-expiry"
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="pp-input pr-9 pp-focus text-sm"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="sm:col-span-2">
              <label htmlFor="w-receipt" className="block text-xs font-semibold text-pp-text-secondary mb-1.5">צרף קבלה (PDF / תמונה)</label>
              <label
                htmlFor="w-receipt"
                className="flex items-center justify-center gap-3 w-full p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-pp-violet/40 hover:bg-pp-violet/5"
                style={{ borderColor: receiptFile ? 'var(--pp-mint)' : 'rgba(255,255,255,0.1)' }}
              >
                {receiptFile
                  ? <CheckCircle size={18} className="text-pp-mint shrink-0" aria-hidden="true" />
                  : <Upload size={18} className="text-pp-text-muted shrink-0" aria-hidden="true" />
                }
                <span className={`text-sm font-medium truncate ${receiptFile ? 'text-pp-mint' : 'text-pp-text-muted'}`}>
                  {receiptFile ? receiptFile.name : 'לחץ לבחירת קובץ'}
                </span>
                <input
                  id="w-receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setReceiptFile(e.target.files[0])}
                  aria-label="העלאת קבלה"
                />
              </label>
            </div>

            {/* Submit */}
            <div className="sm:col-span-2 flex gap-3">
              <button
                id="warranty-submit-btn"
                type="submit"
                disabled={isSaving}
                className="pp-btn-primary flex-1 py-3 cursor-pointer"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'שומר...' : 'שמור אחריות'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="pp-btn-secondary flex-1 py-3 cursor-pointer"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      {warranties.length > 0 && (
        <div className="relative animate-slide-up" style={{ animationDelay: '50ms' }}>
          <Search
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-pp-text-muted"
            size={16}
            aria-hidden="true"
          />
          <input
            id="warranties-search"
            type="text"
            placeholder="חפש מוצר, חנות או מספר סידורי..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pp-input pr-10 text-sm pp-focus"
            dir="rtl"
            aria-label="חיפוש אחריות"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin text-pp-violet" aria-label="טוען..." />
          <p className="text-pp-text-muted text-sm font-medium">טוען אחריות...</p>
        </div>
      ) : warranties.length === 0 ? (
        <div className="pp-glass-card flex flex-col items-center justify-center py-16 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-pp-mint/10 border border-pp-mint/20 flex items-center justify-center mb-4 animate-float" aria-hidden="true">
            <Shield size={30} className="text-pp-mint" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">אין אחריות עדיין</h3>
          <p className="text-pp-text-muted text-sm mb-6">הוסף את האחריות הראשונה שלך</p>
          <button
            onClick={() => setShowForm(true)}
            className="pp-btn-primary cursor-pointer"
            id="add-first-warranty-btn"
          >
            <Plus size={16} />
            הוסף אחריות ראשונה
          </button>
        </div>
      ) : filteredWarranties.length === 0 ? (
        <div className="pp-glass-card text-center py-12">
          <p className="text-pp-text-secondary text-sm">לא נמצאו תוצאות עבור "{searchTerm}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWarranties.map((w, i) => {
            const daysLeft = getDaysLeft(w.expiry_date);
            const isExpired = daysLeft !== null && daysLeft < 0;
            return (
              <div
                key={w.id}
                className="pp-glass px-5 py-4 flex items-center justify-between gap-4 animate-slide-up group"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Left: Info */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: isExpired ? 'rgba(255,77,109,0.1)' : 'rgba(0,229,160,0.1)',
                      border: `1px solid ${isExpired ? 'rgba(255,77,109,0.25)' : 'rgba(0,229,160,0.25)'}`,
                    }}
                    aria-hidden="true"
                  >
                    <Shield size={18} style={{ color: isExpired ? 'var(--pp-coral)' : 'var(--pp-mint)' }} />
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{w.product_name}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-0.5">
                      {w.store && (
                        <span className="flex items-center gap-1 text-xs text-pp-text-muted">
                          <Store size={11} aria-hidden="true" />
                          {w.store}
                        </span>
                      )}
                      {w.expiry_date && (
                        <span className="flex items-center gap-1 text-xs text-pp-text-muted">
                          <Calendar size={11} aria-hidden="true" />
                          {new Date(w.expiry_date).toLocaleDateString('he-IL')}
                        </span>
                      )}
                      {w.serial_number && (
                        <span className="flex items-center gap-1 text-xs text-pp-text-muted font-mono">
                          <Hash size={11} aria-hidden="true" />
                          {w.serial_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Badge + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge daysLeft={daysLeft} />
                  {w.receipt_url && (
                    <a
                      href={w.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`פתח קבלה של ${w.product_name}`}
                      className="p-2 rounded-lg text-pp-text-muted hover:text-pp-cyan hover:bg-pp-cyan/10 transition-all cursor-pointer pp-focus"
                    >
                      <FileText size={16} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(w.id)}
                    aria-label={`מחק אחריות ${w.product_name}`}
                    className="p-2 rounded-lg text-pp-text-muted hover:text-pp-coral hover:bg-pp-coral/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100 pp-focus"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Warranties;