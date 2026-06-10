// SUPABASE_READY: receipts (currently LocalStorage with real file uploads simulation)
import React, { useState, useRef } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { formatDate } from '../utils/dateUtils'
import {
  FileText, Upload, Download, Trash2, Search,
  Eye, X, Plus, Sparkles, CheckCircle, AlertCircle, File
} from 'lucide-react'

const Receipts = () => {
  const [receipts, setReceipts] = useLocalStorage('receipts', [
    {
      id: '1',
      fileName: 'קבלה_iPhone_15_Pro.pdf',
      productName: 'iPhone 15 Pro',
      storeName: 'iDigital',
      price: '4,500 ₪',
      uploadDate: new Date().toISOString().split('T')[0],
      size: '2.4 MB'
    },
    {
      id: '2',
      fileName: 'קבלה_MacBook_Pro.pdf',
      productName: 'MacBook Pro',
      storeName: 'Apple Store',
      price: '9,800 ₪',
      uploadDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      size: '1.8 MB'
    }
  ])

  const [searchTerm, setSearchTerm] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [previewReceipt, setPreviewReceipt] = useState(null)
  const [toast, setToast] = useState(null)

  // Upload form states
  const [newProductName, setNewProductName] = useState('')
  const [newStoreName, setNewStoreName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      // Autofill file name if product name is empty
      if (!newProductName) {
        const cleanName = e.target.files[0].name.replace(/\.[^/.]+$/, "").replace(/_/g, " ")
        setNewProductName(cleanName)
      }
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleUploadSubmit = (e) => {
    e.preventDefault()
    if (!selectedFile) {
      showToast('נא לבחור קובץ להעלאה', 'error')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const fileSizeInMB = (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB'
      const isImage = selectedFile.type.startsWith('image/')
      
      const newReceipt = {
        id: Date.now().toString(),
        fileName: selectedFile.name,
        productName: newProductName || 'מוצר ללא שם',
        storeName: newStoreName || 'חנות כללית',
        price: newPrice ? `${parseFloat(newPrice).toLocaleString()} ₪` : 'לא צוין מחיר',
        uploadDate: new Date().toISOString().split('T')[0],
        size: fileSizeInMB,
        fileDataUrl: reader.result,
        isImage: isImage
      }

      setReceipts([newReceipt, ...receipts])
      showToast('הקבלה הועלתה ונשמרה בהצלחה!', 'success')
      
      // Reset states
      setNewProductName('')
      setNewStoreName('')
      setNewPrice('')
      setSelectedFile(null)
      setIsUploadOpen(false)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleDownload = (receipt) => {
    showToast(`מוריד קובץ: ${receipt.fileName}`, 'success')
  }

  const handleDelete = (id, e) => {
    e.stopPropagation()
    if (window.confirm('האם אתה בטוח שברצונך למחוק קבלה זו?')) {
      setReceipts(receipts.filter(r => r.id !== id))
      showToast('הקבלה נמחקה', 'info')
      if (previewReceipt?.id === id) {
        setPreviewReceipt(null)
      }
    }
  }

  const filteredReceipts = receipts.filter(r => 
    r.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.storeName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-right pb-10" dir="rtl">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border animate-slide-up ${
          toast.type === 'error'
            ? 'bg-red-500/20 border-red-500/50 text-red-200'
            : toast.type === 'info'
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-200'
            : 'bg-green-500/20 border-green-500/50 text-green-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-3xl font-display font-black text-white flex items-center gap-2">
            <span className="pp-gradient-text">קבלות דיגיטליות</span>
            <Sparkles className="text-pp-cyan" size={24} />
          </h1>
          <p className="text-pp-text-secondary text-sm mt-1">
            ניהול, העלאה וארכיון של קבלות רכישה להוכחת קנייה ואחריות
          </p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="pp-btn-primary cursor-pointer flex items-center gap-2 self-start sm:self-auto"
          aria-label="העלה קבלה חדשה"
        >
          <Upload size={18} />
          העלה קבלה
        </button>
      </div>

      {/* Stats Dashboard Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '50ms' }}>
        <div className="pp-glass-card p-5 flex items-center justify-between">
          <div>
            <p className="text-pp-text-muted text-xs font-bold">סה"כ קבלות</p>
            <h3 className="text-3xl font-display font-bold text-white mt-1">{receipts.length}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-pp-violet/10 text-pp-violet">
            <FileText size={24} />
          </div>
        </div>

        <div className="pp-glass-card p-5 flex items-center justify-between">
          <div>
            <p className="text-pp-text-muted text-xs font-bold">החודש הנוכחי</p>
            <h3 className="text-3xl font-display font-bold text-pp-cyan mt-1">
              {receipts.filter(r => new Date(r.uploadDate).getMonth() === new Date().getMonth()).length}
            </h3>
          </div>
          <div className="p-3 rounded-2xl bg-pp-cyan/10 text-pp-cyan">
            <Plus size={24} />
          </div>
        </div>

        <div className="pp-glass-card p-5 flex items-center justify-between">
          <div>
            <p className="text-pp-text-muted text-xs font-bold">שטח אחסון מנוצל</p>
            <h3 className="text-3xl font-display font-bold text-pp-amber mt-1">
              {(receipts.reduce((acc, r) => acc + parseFloat(r.size), 0)).toFixed(1)} MB
            </h3>
          </div>
          <div className="p-3 rounded-2xl bg-pp-amber/10 text-pp-amber">
            <Download size={24} />
          </div>
        </div>
      </div>

      {/* Search & Toolbar */}
      <div className="relative animate-slide-up" style={{ animationDelay: '100ms' }}>
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-pp-text-muted" size={18} />
        <input
          type="text"
          placeholder="חפש לפי שם קובץ, שם מוצר או חנות..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pp-input w-full pr-12 pl-4"
        />
      </div>

      {/* Receipts List */}
      <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
        {filteredReceipts.length === 0 ? (
          <div className="pp-glass-card text-center py-16 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 text-pp-text-muted">
              <File size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">לא נמצאו קבלות</h3>
            <p className="text-pp-text-secondary mb-6 max-w-md">
              {searchTerm ? 'נסה לשנות את מונחי החיפוש שלך או להעלות קבלה חדשה.' : 'עדיין לא העלית קבלות לחשבונך. לחץ על הכפתור כדי להתחיל.'}
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="pp-btn-secondary cursor-pointer"
            >
              העלה קבלה ראשונה
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReceipts.map((receipt) => (
              <div
                key={receipt.id}
                onClick={() => setPreviewReceipt(receipt)}
                className="pp-glass-card p-5 cursor-pointer hover:border-white/20 transition-all duration-300 group flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-pp-violet/10 to-pp-cyan/10 border border-pp-violet/20 text-pp-violet group-hover:scale-110 transition-transform duration-300">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg group-hover:text-pp-violet transition-colors">
                      {receipt.productName}
                    </h4>
                    <p className="text-sm text-pp-text-secondary mt-1 font-medium">
                      חנות: <span className="text-white">{receipt.storeName}</span>
                      {receipt.price && <span className="mr-3 font-bold text-pp-cyan">• {receipt.price}</span>}
                    </p>
                    <p className="text-xs text-pp-text-muted mt-2">
                      {formatDate(receipt.uploadDate)} • {receipt.size}
                    </p>
                    <p className="text-xs text-pp-text-muted mt-1 truncate max-w-[250px] font-mono">
                      {receipt.fileName}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-1.5 self-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewReceipt(receipt); }}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white transition-all cursor-pointer"
                    title="הצג"
                    aria-label="הצג קבלה"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(receipt); }}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-pp-cyan transition-all cursor-pointer"
                    title="הורד"
                    aria-label="הורד קבלה"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(receipt.id, e)}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 text-pp-coral transition-all cursor-pointer"
                    title="מחק"
                    aria-label="מחק קבלה"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="pp-modal-overlay">
          <div className="pp-modal max-w-lg w-full p-6 text-right relative overflow-hidden animate-slide-up" dir="rtl">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4 left-4 p-2 text-pp-text-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="סגור חלון"
            >
              <X size={20} />
            </button>

            <h3 className="text-2xl font-display font-bold text-white mb-2 flex items-center gap-2">
              <Upload className="text-pp-violet" size={22} />
              העלאת קבלה חדשה
            </h3>
            <p className="text-pp-text-secondary text-sm mb-6">
              מלא את פרטי הרכישה והעלה את קובץ הקבלה למערכת
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Upload Area */}
              <div className="space-y-3">
                <label className="text-white text-xs font-bold mr-1 block">בחר מקור להעלאה *</label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf"
                />

                {/* 3 Source Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "image/*"
                        fileInputRef.current.setAttribute("capture", "environment")
                        fileInputRef.current.click()
                      }
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-pp-violet/40 transition-all text-center gap-1.5 cursor-pointer text-white pp-focus"
                  >
                    <span className="text-xl">📷</span>
                    <span className="text-[10px] font-bold">צלם במצלמה</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "image/*"
                        fileInputRef.current.removeAttribute("capture")
                        fileInputRef.current.click()
                      }
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-pp-cyan/40 transition-all text-center gap-1.5 cursor-pointer text-white pp-focus"
                  >
                    <span className="text-xl">🖼️</span>
                    <span className="text-[10px] font-bold">גלריית תמונות</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "image/*,application/pdf"
                        fileInputRef.current.removeAttribute("capture")
                        fileInputRef.current.click()
                      }
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-pp-amber/40 transition-all text-center gap-1.5 cursor-pointer text-white pp-focus"
                  >
                    <span className="text-xl">💾</span>
                    <span className="text-[10px] font-bold">קובץ / Google Drive</span>
                  </button>
                </div>

                {/* Drop/Status Zone */}
                <div
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*,application/pdf"
                      fileInputRef.current.removeAttribute("capture")
                      fileInputRef.current.click()
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-pp-cyan/50 bg-pp-cyan/5'
                      : 'border-white/10 bg-white/5 hover:border-white/10'
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-2 rounded-xl bg-pp-cyan/10 text-pp-cyan">
                        <FileText size={20} />
                      </div>
                      <div className="text-right min-w-0 flex-1">
                        <p className="text-white font-bold text-xs truncate">{selectedFile.name}</p>
                        <p className="text-pp-cyan text-[10px] mt-0.5">{(selectedFile.size / 1024).toFixed(0)} KB • מוכן לשמירה</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFile(null)
                        }}
                        className="p-1 rounded-lg text-pp-text-muted hover:text-pp-coral hover:bg-pp-coral/10 transition-all cursor-pointer"
                        title="הסר קובץ"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-pp-text-secondary text-xs">או גרור קובץ לכאן (PDF, PNG, JPG)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-white text-xs font-bold mr-1">שם המוצר *</label>
                <input
                  type="text"
                  required
                  placeholder="לדוגמה: אייפון 15 פרו"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="pp-input w-full"
                />
              </div>

              {/* Store & Price grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-white text-xs font-bold mr-1">שם החנות</label>
                  <input
                    type="text"
                    placeholder="לדוגמה: איידיגיטל"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    className="pp-input w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-white text-xs font-bold mr-1">מחיר (₪)</label>
                  <input
                    type="number"
                    placeholder="לדוגמה: 4500"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="pp-input w-full"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="submit"
                  className="pp-btn-primary cursor-pointer flex-1"
                >
                  העלה ושמור קבלה
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="pp-btn-secondary cursor-pointer px-6"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewReceipt && (
        <div className="pp-modal-overlay">
          <div className="pp-modal max-w-2xl w-full p-6 text-right relative animate-slide-up" dir="rtl">
            <button
              onClick={() => setPreviewReceipt(null)}
              className="absolute top-4 left-4 p-2 text-pp-text-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="סגור חלון"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <div className="p-3 rounded-2xl bg-pp-violet/10 text-pp-violet">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold text-white">{previewReceipt.productName}</h3>
                <p className="text-pp-text-secondary text-xs mt-0.5">{previewReceipt.fileName}</p>
              </div>
            </div>

            {/* Scanned Receipt and Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Right Column: Receipt Details (Styled as a receipt ticket) */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-6 flex flex-col justify-between relative overflow-hidden font-sans min-h-[320px] text-right">
                {/* Decorative design watermarks */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none select-none">
                  <FileText size={150} />
                </div>
                
                <div className="relative z-10 flex justify-between items-start gap-4">
                  <div>
                    <h4 className="text-lg font-bold text-white">{previewReceipt.storeName}</h4>
                    <p className="text-pp-text-muted text-[11px] mt-1">חשבונית מס / קבלה ממוחשבת</p>
                  </div>
                  <div className="text-left">
                    <p className="text-pp-text-secondary text-[10px]">תאריך רכישה</p>
                    <p className="text-white font-bold text-xs mt-0.5">{formatDate(previewReceipt.uploadDate)}</p>
                  </div>
                </div>

                <div className="relative z-10 my-6 border-t border-b border-dashed border-white/10 py-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-pp-text-secondary">תיאור הפריט</span>
                    <span className="text-white font-bold">{previewReceipt.productName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-pp-text-secondary">חנות מנפיקה</span>
                    <span className="text-white font-medium">{previewReceipt.storeName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-pp-text-secondary">מזהה קבלה פנימי</span>
                    <span className="text-white font-mono text-[11px]">RC-{previewReceipt.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-pp-text-secondary">גודל קובץ</span>
                    <span className="text-white font-medium">{previewReceipt.size || 'לא ידוע'}</span>
                  </div>
                </div>

                <div className="relative z-10 flex justify-between items-end">
                  <div>
                    <p className="text-pp-text-muted text-[10px]">סטטוס מסמך</p>
                    <span className="pp-badge-success text-[10px] mt-1 inline-block">מאושר מקור</span>
                  </div>
                  <div className="text-left">
                    <p className="text-pp-text-secondary text-[10px]">סה"כ לתשלום</p>
                    <p className="text-xl font-display font-black text-pp-cyan mt-0.5">{previewReceipt.price}</p>
                  </div>
                </div>
              </div>

              {/* Left Column: Scanned View / Image */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden">
                {previewReceipt.fileDataUrl && (previewReceipt.isImage || previewReceipt.fileDataUrl.startsWith('data:image/')) ? (
                  <div className="w-full h-full flex items-center justify-center max-h-[300px]">
                    <img 
                      src={previewReceipt.fileDataUrl} 
                      className="max-w-full max-h-full object-contain rounded-lg border border-white/5 shadow-lg" 
                      alt="צילום קבלה מקורי" 
                    />
                  </div>
                ) : (
                  /* Beautiful mock receipt scanned image placeholder if no real image exists */
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-pp-text-muted select-none">
                    <div className="relative w-40 bg-white text-black p-4 shadow-2xl rounded-sm border border-gray-200 rotate-1 flex flex-col justify-between font-mono text-[9px] min-h-[220px] text-right">
                      {/* Thermal receipt header */}
                      <div className="border-b border-dashed border-gray-400 pb-2 mb-2 text-center" dir="rtl">
                        <p className="font-bold text-[10px] tracking-wider">{previewReceipt.storeName}</p>
                        <p className="text-[7px] text-gray-500">חשבונית מס / קבלה</p>
                        <p className="text-[7px] text-gray-500">תאריך: {previewReceipt.uploadDate}</p>
                      </div>
                      
                      {/* Items */}
                      <div className="flex-1 space-y-1 mb-2" dir="rtl">
                        <div className="flex justify-between font-bold">
                          <span>1x {previewReceipt.productName}</span>
                          <span>{previewReceipt.price}</span>
                        </div>
                        <p className="text-[6px] text-gray-400 text-right">כולל מע"מ (17%)</p>
                      </div>

                      {/* Barcode representation */}
                      <div className="border-t border-dashed border-gray-400 pt-2 flex flex-col items-center gap-1.5 mt-auto">
                        <div className="w-full h-8 flex gap-[1px] bg-black items-stretch justify-center px-2">
                          {[1,3,1,2,4,1,2,3,1,4,2,1,3,1,2].map((w, idx) => (
                            <div key={idx} className="bg-white" style={{ width: `${w * 2}px` }} />
                          ))}
                        </div>
                        <p className="text-[6px] tracking-widest text-gray-600">RC-{previewReceipt.id}-99482</p>
                        <p className="text-[7px] font-bold text-green-700">PAID & APPROVED</p>
                      </div>
                    </div>
                    <p className="text-xs text-pp-text-secondary mt-4">
                      תצוגת הדמיה של הקבלה הסרוקה
                    </p>
                    <p className="text-[10px] text-pp-text-muted mt-1">
                      העלה קובץ תמונה כדי לראות את המקור כאן
                    </p>
                  </div>
                )}
              </div>

            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => handleDownload(previewReceipt)}
                className="pp-btn-primary cursor-pointer flex items-center gap-2"
              >
                <Download size={16} />
                הורד קובץ
              </button>
              <button
                onClick={(e) => handleDelete(previewReceipt.id, e)}
                className="pp-btn-secondary cursor-pointer hover:bg-red-500/10 hover:border-red-500/20 text-pp-coral flex items-center gap-2"
              >
                <Trash2 size={16} />
                מחק קבלה
              </button>
              <button
                onClick={() => setPreviewReceipt(null)}
                className="pp-btn-secondary cursor-pointer px-6"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info notice */}
      <div className="pp-glass-card bg-pp-violet/5 border-pp-violet/20 flex items-start gap-3 p-4">
        <AlertCircle size={20} className="text-pp-violet shrink-0 mt-0.5" />
        <p className="text-sm text-pp-text-secondary leading-relaxed">
          <strong>הערה:</strong> זהו ארכיון הקבלות הדיגיטליות שלך. כל הקבלות שמורות כעת מקומית בדפדפן ויהיו מוכנות לגיבוי ענן אוטומטי ומאובטח ברגע שתתחבר לחשבון Supabase שלך.
        </p>
      </div>
    </div>
  )
}

export default Receipts
