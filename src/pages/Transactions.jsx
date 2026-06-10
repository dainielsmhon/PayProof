// SUPABASE_READY: transactions (trigger deploy)
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { askGeminiAgent, parseTextToTransactions } from '../lib/gemini'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Plus, Trash2, ChevronLeft, ChevronRight,
  Upload, FileText, Send, Loader2, Sparkles, AlertCircle, X,
  DollarSign, Wallet, Scale, Bot, CheckCircle2, BarChart2
} from 'lucide-react'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const HEBREW_MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
]

const fmt = (n) => `₪${Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`

// Helper to get date range for a given month/year (strictly calendar-based)
const getBillingRange = (year, month) => {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const toDate = new Date(year, month + 1, 0)
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`
  return { from, to }
}

const adjustDateToCalendarMonth = (originalDateStr, targetYear, targetMonth) => {
  const d = new Date(originalDateStr)
  if (isNaN(d.getTime())) return originalDateStr
  const originalDay = d.getDate()
  
  // Get last day of target month to cap day if needed (e.g. 31st to 30th)
  const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate()
  const finalDay = Math.min(originalDay, lastDayOfTarget)
  
  const finalDate = new Date(targetYear, targetMonth, finalDay)
  const y = finalDate.getFullYear()
  const m = String(finalDate.getMonth() + 1).padStart(2, '0')
  const dayStr = String(finalDate.getDate()).padStart(2, '0')
  return `${y}-${m}-${dayStr}`
}

const PIE_COLORS = [
  '#7C6FFF','#00D4FF','#00E5A0','#FF6B6B','#FFB347',
  '#FF69B4','#A8E063','#56CCF2','#F7971E','#C471ED'
]

// Parse a simple CSV text into transaction rows
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''))
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g,''))
    const obj = {}
    header.forEach((h, i) => { obj[h] = cols[i] || '' })

    // Try to map common column names
    const name = obj['name'] || obj['תיאור'] || obj['description'] || obj['שם'] || ''
    const amount = parseFloat(obj['amount'] || obj['סכום'] || obj['sum'] || '0') || 0
    const dateRaw = obj['date'] || obj['תאריך'] || obj['transaction_date'] || ''
    const type = (obj['type'] || obj['סוג'] || '').toLowerCase()

    if (!name || !amount || !dateRaw) return null

    // Normalize date to YYYY-MM-DD
    let transaction_date = dateRaw
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateRaw)) {
      const [d, m, y] = dateRaw.split('/')
      transaction_date = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateRaw)) {
      const [d, m, y] = dateRaw.split('-')
      transaction_date = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    }

    return {
      name,
      amount,
      transaction_date,
      type: type === 'income' || type === 'הכנסה' ? 'income' : 'expense',
    }
  }).filter(Boolean)
}

// ── PDF.js & SheetJS Dynamic Loaders & Extractors ──
const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'
      resolve(window.pdfjsLib)
    }
    script.onerror = () => reject(new Error('שגיאה בטעינת ספריית PDF.js מהרשת'))
    document.head.appendChild(script)
  })
}

const extractTextFromPdf = async (file) => {
  const pdfjsLib = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map(item => item.str).join(' ')
    fullText += pageText + '\n'
  }
  return fullText
}

const loadXlsx = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) {
      resolve(window.XLSX)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload = () => resolve(window.XLSX)
    script.onerror = () => reject(new Error('שגיאה בטעינת ספריית Excel מהרשת'))
    document.head.appendChild(script)
  })
}

const extractTextFromXlsx = async (file) => {
  const XLSX = await loadXlsx()
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  let fullText = ''
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(worksheet)
    fullText += `--- Sheet: ${sheetName} ---\n${csv}\n`
  })
  return fullText
}


// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

// Summary Stat Card
const StatCard = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <div
    className="pp-glass p-5 flex flex-col gap-3 animate-slide-up relative overflow-hidden cursor-default"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div
      className="absolute top-0 left-0 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none"
      style={{ background: color, transform: 'translate(-40%, -40%)' }}
      aria-hidden="true"
    />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-pp-text-secondary text-xs font-medium mb-1">{label}</p>
        <p className="text-2xl font-display font-bold font-numeric" style={{ color }}>{value}</p>
      </div>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        aria-hidden="true"
      >
        <Icon size={18} style={{ color }} />
      </div>
    </div>
  </div>
)

// Custom Recharts Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="pp-glass p-3 rounded-xl border border-white/10 text-sm shadow-xl" dir="rtl">
      <p className="text-pp-text-secondary text-xs mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

// Transaction row
const TxRow = ({ tx, onDelete }) => (
  <div
    className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors duration-150 group"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
        style={{
          background: tx.type === 'income' ? 'rgba(0,229,160,0.12)' : 'rgba(255,107,107,0.12)',
          color: tx.type === 'income' ? 'var(--pp-mint)' : 'var(--pp-coral)',
          border: `1px solid ${tx.type === 'income' ? 'rgba(0,229,160,0.2)' : 'rgba(255,107,107,0.2)'}`
        }}
      >
        {tx.type === 'income' ? '↑' : '↓'}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{tx.name}</p>
        <p className="text-[11px] text-pp-text-muted">{tx.transaction_date}</p>
      </div>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <span
        className="text-sm font-bold font-numeric"
        style={{ color: tx.type === 'income' ? 'var(--pp-mint)' : 'var(--pp-coral)' }}
      >
        {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
      </span>
      <button
        onClick={() => onDelete(tx.id)}
        aria-label={`מחק ${tx.name}`}
        className="p-1.5 rounded-lg text-pp-text-muted hover:text-pp-coral hover:bg-pp-coral/10 transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={13} />
      </button>
    </div>
  </div>
)

// Add Transaction Modal
const AddModal = ({ type, onClose, onSave, loading, existingTransactions }) => {
  const [form, setForm] = useState({
    name: '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  })

  const isIncome = type === 'income'
  const accentColor = isIncome ? 'var(--pp-mint)' : 'var(--pp-coral)'
  const label = isIncome ? 'הכנסה' : 'הוצאה'

  // Check for duplicate dynamically based on date and amount
  const possibleDuplicate = existingTransactions?.find(t => 
    t.transaction_date === form.transaction_date &&
    Math.abs(Number(t.amount) - parseFloat(form.amount || '0')) < 0.01
  )

  const isExactDuplicate = possibleDuplicate && 
    possibleDuplicate.name.trim().toLowerCase() === form.name.trim().toLowerCase()

  const handleAddClick = () => {
    if (isExactDuplicate) {
      if (!window.confirm('שים לב: כבר קיימת עסקה זהה לחלוטין. האם ברצונך להוסיף אותה בכל זאת?')) {
        return
      }
    }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative pp-glass rounded-2xl p-6 w-full max-w-sm animate-slide-up shadow-2xl"
        style={{ border: `1px solid ${accentColor}25` }}
      >
        {/* Glow */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: accentColor, transform: 'translate(40%, -40%)' }}
          aria-hidden="true"
        />

        <div className="flex items-center justify-between mb-5 relative z-10">
          <h2 className="text-base font-bold text-white">הוסף {label}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-pp-text-muted hover:text-white hover:bg-white/10 transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 relative z-10">
          <div>
            <label className="text-xs text-pp-text-secondary mb-1.5 block font-medium">שם / תיאור</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={isIncome ? 'משכורת, פרילנס...' : 'שכר דירה, חשמל...'}
              className="pp-input w-full text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-pp-text-secondary mb-1.5 block font-medium">סכום (₪)</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="pp-input w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-pp-text-secondary mb-1.5 block font-medium">תאריך</label>
            <input
              type="date"
              value={form.transaction_date}
              onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
              className="pp-input w-full text-sm"
            />
          </div>
        </div>

        {/* Real-time duplicate warning */}
        {possibleDuplicate && (
          <div className="mt-4 p-3 rounded-xl border border-pp-amber/30 bg-pp-amber/10 flex items-start gap-2.5 text-xs text-pp-amber relative z-10 animate-fade-in text-right">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{isExactDuplicate ? 'נמצאה עסקה זהה לחלוטין' : 'נמצאה עסקה דומה בתאריך זה'}</p>
              <p className="mt-0.5 leading-relaxed">
                {isExactDuplicate 
                  ? `כבר קיימת עסקה בשם "${possibleDuplicate.name}" בסכום זהה בתאריך שנבחר.`
                  : `כבר קיימת עסקה בשם "${possibleDuplicate.name}" בסכום של ₪${Number(possibleDuplicate.amount).toLocaleString('he-IL')} בתאריך שנבחר.`
                }
                <br />
                אנא ודא שאין זו כפילות.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-6 relative z-10">
          <button
            onClick={onClose}
            className="flex-1 pp-btn-ghost text-sm py-2.5"
          >
            ביטול
          </button>
          <button
            onClick={handleAddClick}
            disabled={loading || !form.name || !form.amount}
            className="flex-1 pp-btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${accentColor}CC, ${accentColor}88)` }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {loading ? 'שומר...' : `הוסף ${label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// Parsing loader with simulated progress bar
const ParsingLoader = ({ onClose }) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 95) return p
        let diff = 0.1
        if (p < 50) {
          diff = 1.8
        } else if (p < 75) {
          diff = 1.0
        } else if (p < 90) {
          diff = 0.5
        }
        return Math.min(95, p + diff)
      })
    }, 300)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative pp-glass rounded-2xl p-8 w-full max-w-sm flex flex-col items-center justify-center text-center animate-slide-up shadow-2xl" style={{ border: '1px solid rgba(0, 212, 255, 0.25)' }}>
        <Loader2 size={36} className="animate-spin text-pp-cyan mb-4" />
        <h2 className="text-base font-bold text-white mb-2">מנתח ומעבד את הקובץ...</h2>
        <p className="text-xs text-pp-text-muted leading-relaxed mb-4">אנא המתן, סורק עסקאות ומחלץ נתונים בעזרת מנוע AI</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden relative mb-2">
          <div 
            className="bg-pp-cyan h-full rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] font-bold text-pp-cyan font-numeric">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

// ── Upload Wizard Modal Component ──
const UploadWizardModal = ({
  file,
  rows,
  onClose,
  onConfirm,
  loading,
  parsing,
  month,
  year,
  existingTransactions
}) => {
  const [targetMonth, setTargetMonth] = useState(month)
  const [targetYear, setTargetYear] = useState(year)
  const [forceCalendarMonth, setForceCalendarMonth] = useState(true)
  const [fileType, setFileType] = useState('credit') // 'credit' | 'bank'

  if (parsing) {
    return <ParsingLoader onClose={onClose} />
  }

  // Calculate adjusted rows preview
  const previewRows = rows.map(row => {
    const amountParsed = parseFloat(row.amount)
    const absoluteAmount = Math.abs(amountParsed)
    
    let typeParsed = 'expense'
    if (fileType === 'credit') {
      // In credit card statements: positive is charge (expense), negative is credit (income)
      if (amountParsed < 0) {
        typeParsed = 'income'
      } else if (row.type === 'income' || row.type === 'הכנסה') {
        typeParsed = 'income'
      } else {
        typeParsed = 'expense'
      }
    } else {
      // In bank statement files: positive is deposit (income), negative is withdrawal (expense)
      if (amountParsed > 0) {
        typeParsed = 'income'
      } else if (row.type === 'income' || row.type === 'הכנסה') {
        typeParsed = 'income'
      } else {
        typeParsed = 'expense'
      }
    }

    let dateParsed = row.transaction_date
    if (forceCalendarMonth) {
      dateParsed = adjustDateToCalendarMonth(row.transaction_date, targetYear, targetMonth)
    }

    // Check if duplicate of already imported database transactions
    const isDuplicate = existingTransactions?.some(t =>
      t.transaction_date === dateParsed &&
      t.name.trim().toLowerCase() === row.name.trim().toLowerCase() &&
      Math.abs(Number(t.amount) - absoluteAmount) < 0.01 &&
      t.type === typeParsed
    )

    return {
      ...row,
      amount: absoluteAmount,
      type: typeParsed,
      transaction_date: dateParsed,
      original_date: row.original_date || row.transaction_date,
      isDuplicate
    }
  })

  const handleConfirmClick = () => {
    onConfirm({
      rows: previewRows,
      month: targetMonth,
      year: targetYear
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative pp-glass rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up shadow-2xl overflow-hidden" style={{ border: '1px solid rgba(0, 212, 255, 0.25)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none bg-pp-cyan" style={{ transform: 'translate(40%, -40%)' }} aria-hidden="true" />

        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Upload size={18} className="text-pp-cyan" />
              אשף העלאת עסקאות
            </h2>
            <p className="text-xs text-pp-text-secondary mt-0.5">קובץ: {file?.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-pp-text-muted hover:text-white hover:bg-white/10 transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-right">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-xs font-bold text-pp-cyan">הגדרות שיוך תאריכים</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-pp-text-secondary mb-1.5 block font-medium">חודש יעד</label>
                  <select
                    value={targetMonth}
                    onChange={e => setTargetMonth(Number(e.target.value))}
                    className="pp-input w-full text-sm"
                  >
                    {HEBREW_MONTHS.map((m, idx) => (
                      <option key={idx} value={idx} className="bg-pp-card text-white">{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-pp-text-secondary mb-1.5 block font-medium">שנת יעד</label>
                  <select
                    value={targetYear}
                    onChange={e => setTargetYear(Number(e.target.value))}
                    className="pp-input w-full text-sm"
                  >
                    {[year - 1, year, year + 1].map(y => (
                      <option key={y} value={y} className="bg-pp-card text-white">{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="forceCalendarMonth"
                  checked={forceCalendarMonth}
                  onChange={e => setForceCalendarMonth(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-pp-cyan focus:ring-pp-cyan"
                />
                <label htmlFor="forceCalendarMonth" className="text-xs text-pp-text-secondary cursor-pointer font-medium">
                  שייך את כל העסקאות לחודש הקלנדרי הנבחר
                </label>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-xs font-bold text-pp-cyan">הגדרות קורא קבצים</h3>

              <div>
                <label className="text-xs text-pp-text-secondary mb-1.5 block font-medium">סוג החשבון / קובץ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFileType('credit')}
                    className={`text-xs py-2 px-3 rounded-lg border transition-all ${
                      fileType === 'credit'
                        ? 'border-pp-cyan bg-pp-cyan/10 text-white font-bold'
                        : 'border-white/10 hover:border-white/20 text-pp-text-secondary'
                    }`}
                  >
                    כרטיס אשראי
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileType('bank')}
                    className={`text-xs py-2 px-3 rounded-lg border transition-all ${
                      fileType === 'bank'
                        ? 'border-pp-cyan bg-pp-cyan/10 text-white font-bold'
                        : 'border-white/10 hover:border-white/20 text-pp-text-secondary'
                    }`}
                  >
                    חשבון בנק
                  </button>
                </div>
                <p className="text-[10px] text-pp-text-muted mt-2 leading-relaxed">
                  {fileType === 'credit'
                    ? '* בכרטיסי אשראי, סכומים חיוביים יפורשו כהוצאות וסכומים שליליים כזיכויים (הכנסות).'
                    : '* בחשבון בנק, סכומים שליליים יפורשו כהוצאות וסכומים חיוביים כהכנסות.'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-pp-cyan flex items-center gap-1.5">
              תצוגה מקדימה של עסקאות ({previewRows.length})
            </h3>
            <div className="border border-white/5 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-white/5 text-pp-text-secondary border-b border-white/5">
                    <th className="p-2 font-semibold">תאריך</th>
                    <th className="p-2 font-semibold">בית עסק</th>
                    <th className="p-2 font-semibold text-left">סכום</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {previewRows.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-white/5 transition-colors ${row.isDuplicate ? 'opacity-40 bg-pp-amber/5' : ''}`}
                    >
                      <td className="p-2 text-pp-text-secondary font-numeric">
                        {row.transaction_date}
                        {forceCalendarMonth && row.transaction_date !== row.original_date && (
                          <span className="text-[10px] text-pp-amber block line-through">
                            {row.original_date}
                          </span>
                        )}
                      </td>
                      <td className="p-2 font-medium text-white truncate max-w-[150px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{row.name}</span>
                          {row.isDuplicate && (
                            <span 
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pp-amber/20 text-pp-amber border border-pp-amber/30 shrink-0"
                              title="עסקה זו כבר קיימת במערכת ותדולג במהלך הייבוא"
                            >
                              כפילות (תדולג)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 font-bold text-left font-numeric" style={{ color: row.type === 'income' ? 'var(--pp-mint)' : 'var(--pp-coral)' }}>
                        {row.type === 'income' ? '+' : '-'}{fmt(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-white/5 shrink-0">
          <button onClick={onClose} className="flex-1 pp-btn-ghost text-sm py-2.5">
            ביטול
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={loading || previewRows.length === 0}
            className="flex-1 pp-btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.7), rgba(0, 212, 255, 0.4))' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {loading ? 'מייבא עסקאות...' : 'אשר וייבא עסקאות'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function Transactions() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed

  const [transactions, setTransactions] = useState([])
  const [allTx, setAllTx] = useState([]) // for charts (12 months)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modal, setModal] = useState(null) // 'income' | 'expense' | null
  const [saving, setSaving] = useState(false)

  // File upload
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const fileRef = useRef()

  // Pre-upload wizard modal
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingRows, setPendingRows] = useState([])
  const [showUploadWizard, setShowUploadWizard] = useState(false)
  const [wizardParsing, setWizardParsing] = useState(false)
  const [wizardTargetMonth, setWizardTargetMonth] = useState(month)
  const [wizardTargetYear, setWizardTargetYear] = useState(year)

  // AI Chat
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef()

  const SUGGESTIONS = [
    'איפה אני מוציא הכי הרבה?',
    'מה המאזן החודשי שלי?',
    'תן לי 3 עצות לחיסכון',
    'מה הטרנדים הפיננסיים שלי?',
  ]

  // ── Fetch transactions ──────────────────────
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Current month range based on billing cycle
      const { from, to } = getBillingRange(year, month)

      const { data, error: e } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', from)
        .lte('transaction_date', to)
        .order('transaction_date', { ascending: false })

      if (e) throw e
      setTransactions(data || [])

      // All 12 months for charts - cover full billing cycles range
      const yearFrom = `${year - 1}-11-01`
      const yearTo   = `${year + 1}-02-01`
      const { data: all } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', yearFrom)
        .lte('transaction_date', yearTo)
      setAllTx(all || [])

      // Fetch unique uploaded files
      const { data: filesData, error: filesError } = await supabase
        .from('transactions')
        .select('source_file')
        .eq('user_id', user.id)
        .not('source_file', 'is', null)

      if (!filesError && filesData) {
        const counts = {}
        filesData.forEach(t => {
          if (t.source_file && t.source_file !== 'uploaded') {
            counts[t.source_file] = (counts[t.source_file] || 0) + 1
          }
        })
        setUploadedFiles(Object.entries(counts).map(([name, count]) => ({ name, count })))
      }
    } catch (e) {
      setError('שגיאה בטעינת הנתונים. ודא שיצרת את טבלת transactions ב-Supabase.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // ── Navigate months ─────────────────────────
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    const now = new Date()
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth())) return
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  const isFutureDisabled = year > today.getFullYear() ||
    (year === today.getFullYear() && month >= today.getMonth())

  // ── Derived numbers ──────────────────────────
  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense  = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance  = income - expense

  // ── Bar chart: 12 months (Calendar-based) ─────────────────────
  const barData = HEBREW_MONTHS.map((name, i) => {
    const from = `${year}-${String(i + 1).padStart(2, '0')}-01`
    const toDate = new Date(year, i + 1, 0)
    const to = `${year}-${String(i + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`
    const monthTx = allTx.filter(t => t.transaction_date >= from && t.transaction_date <= to)
    return {
      name: name.slice(0,3),
      הכנסות: monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      הוצאות: monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    }
  })

  // ── Pie chart: expenses by name ──────────────
  const expenseMap = {}
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => { expenseMap[t.name] = (expenseMap[t.name] || 0) + Number(t.amount) })
  const pieData = Object.entries(expenseMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // ── Save transaction ─────────────────────────
  const handleSave = async (form) => {
    if (!form.name.trim() || !form.amount) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: e } = await supabase.from('transactions').upsert({
        user_id: user.id,
        type: modal,
        name: form.name.trim(),
        amount: Math.abs(parseFloat(form.amount)),
        transaction_date: form.transaction_date,
      }, { onConflict: 'user_id,name,amount,transaction_date' })
      if (e) throw e
      setModal(null)
      await fetchTransactions()
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירת הנתונים: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete transaction ───────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('למחוק רשומה זו?')) return
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
    setAllTx(prev => prev.filter(t => t.id !== id))
  }

  // ── File upload — Step 1: Parse file and show wizard ──
  const handleFileSelected = async (file) => {
    setUploadMsg(null)
    setWizardParsing(true)
    setShowUploadWizard(true)
    setPendingFile(file)
    setWizardTargetMonth(month)
    setWizardTargetYear(year)

    try {
      let rows = []

      if (file.name.endsWith('.csv')) {
        const text = await file.text()
        rows = parseCSV(text)
      } else if (file.name.endsWith('.pdf')) {
        const rawText = await extractTextFromPdf(file)
        if (!rawText.trim()) {
          throw new Error('לא הצלחנו לחלץ טקסט מקובץ ה-PDF. ייתכן והוא סרוק או ריק.')
        }
        rows = await parseTextToTransactions(rawText)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const rawText = await extractTextFromXlsx(file)
        rows = await parseTextToTransactions(rawText)
      } else {
        setUploadMsg({ type: 'error', text: 'סיומת קובץ לא נתמכת. יש להעלות קובצי CSV, XLSX או PDF.' })
        setShowUploadWizard(false)
        setPendingFile(null)
        setWizardParsing(false)
        return
      }

      if (rows.length === 0) {
        setUploadMsg({ type: 'error', text: 'לא נמצאו עסקאות תקינות לפענוח בקובץ.' })
        setShowUploadWizard(false)
        setPendingFile(null)
        setWizardParsing(false)
        return
      }

      // Map rows to raw fields for dynamic adjustment in wizard
      const rawRows = rows.map(row => {
        return {
          name: row.name.trim(),
          amount: parseFloat(row.amount) || 0,
          transaction_date: row.transaction_date,
          original_date: row.transaction_date,
          type: row.type || 'expense'
        }
      })

      setPendingRows(rawRows)
    } catch (e) {
      console.error(e)
      setUploadMsg({ type: 'error', text: 'שגיאה בפענוח הקובץ: ' + e.message })
      setShowUploadWizard(false)
      setPendingFile(null)
    } finally {
      setWizardParsing(false)
    }
  }

  // ── File upload — Step 2: Confirm and import ──
  const confirmUpload = async ({ rows, month: chosenMonth, year: chosenYear }) => {
    setUploading(true)
    setShowUploadWizard(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const toUpsert = []
      let duplicatesCount = 0

      for (const row of rows) {
        // Check local year's transaction list for exact duplicates
        const isDuplicate = allTx.some(t =>
          t.transaction_date === row.transaction_date &&
          t.name.trim().toLowerCase() === row.name.trim().toLowerCase() &&
          Math.abs(Number(t.amount) - row.amount) < 0.01
        )

        if (isDuplicate) {
          duplicatesCount++
          continue
        }

        toUpsert.push({
          user_id: user.id,
          type: row.type,
          name: row.name,
          amount: row.amount,
          transaction_date: row.transaction_date,
          source_file: pendingFile?.name || 'uploaded',
        })
      }

      let imported = 0
      if (toUpsert.length > 0) {
        const { error: e } = await supabase
          .from('transactions')
          .upsert(toUpsert, { onConflict: 'user_id,name,amount,transaction_date', ignoreDuplicates: true })

        if (e) throw e
        imported = toUpsert.length
      }

      if (imported === 0 && duplicatesCount > 0) {
        setUploadMsg({ type: 'success', text: `כל ${duplicatesCount} העסקאות בקובץ כבר קיימות במערכת (הכפילויות דולגו).` })
      } else if (duplicatesCount > 0) {
        setUploadMsg({ type: 'success', text: `יובאו בהצלחה ${imported} עסקאות חדשות. ${duplicatesCount} כפילויות דולגו אוטומטית.` })
      } else {
        setUploadMsg({ type: 'success', text: `יובאו בהצלחה ${imported} עסקאות מתוך ${rows.length}.` })
      }

      // Navigate to target billing cycle month/year
      setMonth(chosenMonth)
      setYear(chosenYear)

      await fetchTransactions()
    } catch (e) {
      console.error(e)
      setUploadMsg({ type: 'error', text: 'שגיאה בעיבוד הקובץ: ' + e.message })
    } finally {
      setUploading(false)
      setPendingFile(null)
      setPendingRows([])
    }
  }

  const cancelUpload = () => {
    setShowUploadWizard(false)
    setPendingFile(null)
    setPendingRows([])
  }

  // ── Delete uploaded file ─────────────────────
  const handleDeleteFile = async (fileName, count) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את כל ${count} העסקאות שיובאו מהקובץ "${fileName}"?`)) return
    try {
      setLoading(true)
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('source_file', fileName)

      if (error) throw error

      // Reload data
      await fetchTransactions()
    } catch (e) {
      console.error(e)
      alert('שגיאה במחיקת הקובץ: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelected(file)
  }

  // ── AI Chat ──────────────────────────────────
  const buildContext = () => {
    const ctx = `הנה נתוני המשתמש לחודש ${HEBREW_MONTHS[month]} ${year}:\n` +
      `סך הכנסות: ${fmt(income)}\n` +
      `סך הוצאות: ${fmt(expense)}\n` +
      `מאזן: ${fmt(balance)}\n\n` +
      `הכנסות:\n${transactions.filter(t=>t.type==='income').map(t=>`- ${t.name}: ${fmt(t.amount)}`).join('\n') || 'אין'}\n\n` +
      `הוצאות:\n${transactions.filter(t=>t.type==='expense').map(t=>`- ${t.name}: ${fmt(t.amount)}`).join('\n') || 'אין'}`
    return ctx
  }

  const sendMessage = async (msg) => {
    const text = msg || chatInput.trim()
    if (!text) return
    const userMsg = { role: 'user', text }
    setChatHistory(h => [...h, userMsg])
    setChatInput('')
    setChatLoading(true)
    try {
      const contextMsg = { role: 'user', text: `[הקשר נתונים]\n${buildContext()}` }
      const response = await askGeminiAgent(text, [contextMsg, ...chatHistory.slice(-6)])
      setChatHistory(h => [...h, { role: 'model', text: response }])
    } catch (e) {
      setChatHistory(h => [...h, { role: 'model', text: '❌ שגיאה בחיבור לסוכן ה-AI. נסה שוב.' }])
    } finally {
      setChatLoading(false)
    }
  }

  // ── Render ───────────────────────────────────
  return (
    <div className="space-y-6 pb-8" dir="rtl">

      {/* ── Header + Month Nav ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <TrendingUp size={22} className="text-pp-mint" />
            מעקב פיננסי
          </h1>
          <p className="text-pp-text-secondary text-sm mt-0.5">ניהול הכנסות, הוצאות ותנועות כספיות</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* Month navigator */}
          <div className="flex items-center gap-2 pp-glass rounded-2xl px-4 py-2.5">
            <button
              onClick={nextMonth}
              disabled={isFutureDisabled}
              aria-label="חודש הבא"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} className="text-pp-text-secondary" />
            </button>
            <span className="text-white font-semibold text-sm min-w-[120px] text-center">
              {HEBREW_MONTHS[month]} {year}
            </span>
            <button
              onClick={prevMonth}
              aria-label="חודש קודם"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            >
              <ChevronRight size={16} className="text-pp-text-secondary" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="pp-glass border border-pp-coral/30 rounded-2xl px-4 py-3 flex items-center gap-3 text-pp-coral text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp}   label="סך הכנסות" value={fmt(income)}  color="var(--pp-mint)"  delay={0}   />
        <StatCard icon={TrendingDown} label="סך הוצאות" value={fmt(expense)} color="var(--pp-coral)" delay={80}  />
        <StatCard icon={Scale}        label="מאזן חודשי" value={fmt(balance)} color={balance >= 0 ? 'var(--pp-cyan)' : 'var(--pp-amber)'} delay={160} />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar Chart */}
        <div className="lg:col-span-2 pp-glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-pp-cyan" />
            <h2 className="text-sm font-semibold text-white">הכנסות vs הוצאות — {year}</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barGap={4} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₪${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="הכנסות" fill="#00E5A0" radius={[4,4,0,0]} maxBarSize={24} />
              <Bar dataKey="הוצאות" fill="#FF6B6B" radius={[4,4,0,0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="pp-glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-pp-amber" />
            <h2 className="text-sm font-semibold text-white">פילוח הוצאות</h2>
          </div>
          {pieData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-pp-text-muted text-sm">
              אין הוצאות החודש
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="40%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span style={{ color: '#94A3B8', fontSize: 11 }}>{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Income + Expense Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Income */}
        <div className="pp-glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pp-mint shadow-glow-mint" />
              <h2 className="text-sm font-semibold text-white">הכנסות</h2>
              <span className="text-xs text-pp-text-muted ml-1">({transactions.filter(t=>t.type==='income').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-pp-mint text-sm font-bold font-numeric">{fmt(income)}</span>
              <button
                onClick={() => setModal('income')}
                className="pp-btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                style={{ background: 'linear-gradient(135deg, rgba(0,229,160,0.7), rgba(0,229,160,0.4))' }}
                aria-label="הוסף הכנסה"
              >
                <Plus size={12} /> הוסף
              </button>
            </div>
          </div>
          <div className="p-3 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-pp-text-muted" />
              </div>
            ) : transactions.filter(t => t.type === 'income').length === 0 ? (
              <div className="text-center py-8 text-pp-text-muted text-sm">
                <TrendingUp size={28} className="mx-auto mb-2 opacity-30" />
                אין הכנסות החודש
              </div>
            ) : (
              transactions.filter(t => t.type === 'income').map(tx => (
                <TxRow key={tx.id} tx={tx} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>

        {/* Expense */}
        <div className="pp-glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pp-coral" style={{ boxShadow: '0 0 6px var(--pp-coral)' }} />
              <h2 className="text-sm font-semibold text-white">הוצאות</h2>
              <span className="text-xs text-pp-text-muted ml-1">({transactions.filter(t=>t.type==='expense').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-pp-coral text-sm font-bold font-numeric">{fmt(expense)}</span>
              <button
                onClick={() => setModal('expense')}
                className="pp-btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                style={{ background: 'linear-gradient(135deg, rgba(255,107,107,0.7), rgba(255,107,107,0.4))' }}
                aria-label="הוסף הוצאה"
              >
                <Plus size={12} /> הוסף
              </button>
            </div>
          </div>
          <div className="p-3 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-pp-text-muted" />
              </div>
            ) : transactions.filter(t => t.type === 'expense').length === 0 ? (
              <div className="text-center py-8 text-pp-text-muted text-sm">
                <TrendingDown size={28} className="mx-auto mb-2 opacity-30" />
                אין הוצאות החודש
              </div>
            ) : (
              transactions.filter(t => t.type === 'expense').map(tx => (
                <TxRow key={tx.id} tx={tx} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── File Upload Zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`pp-glass rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer border-2 border-dashed ${
          dragging
            ? 'border-pp-cyan bg-pp-cyan/5 scale-[1.01]'
            : 'border-white/10 hover:border-white/20'
        }`}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="העלה קובץ"
        onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.pdf"
          className="hidden"
          onChange={e => { if (e.target.files[0]) { handleFileSelected(e.target.files[0]); e.target.value = '' } }}
          aria-hidden="true"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-pp-cyan" />
            <p className="text-pp-text-secondary text-sm">מעבד קובץ...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pp-cyan/10 border border-pp-cyan/20 flex items-center justify-center mx-auto">
              <Upload size={22} className="text-pp-cyan" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">גרור קובץ לכאן או לחץ לבחירה</p>
              <p className="text-pp-text-muted text-xs mt-1">תמיכה ב-CSV (ו-XLSX, PDF בקרוב)</p>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {['.CSV', '.XLSX', '.PDF'].map(ext => (
                <span
                  key={ext}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--pp-cyan)', border: '1px solid rgba(0,212,255,0.2)' }}
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Upload result message */}
        {uploadMsg && (
          <div
            className={`mt-4 flex items-center gap-2 justify-center text-sm rounded-xl px-4 py-2.5 ${
              uploadMsg.type === 'success'
                ? 'bg-pp-mint/10 text-pp-mint border border-pp-mint/20'
                : 'bg-pp-coral/10 text-pp-coral border border-pp-coral/20'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {uploadMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {uploadMsg.text}
          </div>
        )}
      </div>

      {/* ── Uploaded Files List ── */}
      {uploadedFiles.length > 0 && (
        <div className="pp-glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-pp-cyan animate-pulse" />
            <h2 className="text-sm font-semibold text-white">קבצים מרוכזים שהועלו</h2>
          </div>
          <p className="text-[11px] text-pp-text-muted">באפשרותך למחוק קובץ שלם כדי להסיר את כל העסקאות שייובאו ממנו בבת אחת.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {uploadedFiles.map(file => (
              <div key={file.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-pp-cyan/70 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate" title={file.name}>{file.name}</p>
                    <p className="text-[10px] text-pp-text-muted mt-0.5">{file.count} עסקאות</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFile(file.name, file.count)}
                  aria-label={`מחק קובץ ${file.name}`}
                  className="p-1.5 rounded-lg text-pp-text-muted hover:text-pp-coral hover:bg-pp-coral/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Financial Advisor ── */}
      <div className="pp-glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(124,111,255,0.2)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5" style={{ background: 'rgba(124,111,255,0.05)' }}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pp-violet to-pp-cyan flex items-center justify-center shrink-0">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
              יועץ AI פיננסי
              <Sparkles size={13} className="text-pp-amber" />
            </h2>
            <p className="text-[11px] text-pp-text-muted">מבוסס על נתוני החודש שלך</p>
          </div>
        </div>

        {/* Suggestion chips */}
        {chatHistory.length === 0 && (
          <div className="px-5 pt-4 pb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer hover:scale-105"
                style={{
                  background: 'rgba(124,111,255,0.08)',
                  border: '1px solid rgba(124,111,255,0.2)',
                  color: 'var(--pp-violet)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Chat messages */}
        <div className="px-5 py-4 max-h-72 overflow-y-auto space-y-3">
          {chatHistory.length === 0 && (
            <div className="text-center py-6 text-pp-text-muted text-sm">
              <Bot size={28} className="mx-auto mb-2 opacity-30" />
              שאל אותי כל שאלה פיננסית
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'text-white rounded-tr-sm'
                    : 'text-white rounded-tl-sm'
                }`}
                style={msg.role === 'user'
                  ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }
                  : { background: 'linear-gradient(135deg, rgba(124,111,255,0.25), rgba(0,212,255,0.15))', border: '1px solid rgba(124,111,255,0.2)' }
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-end">
              <div
                className="px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, rgba(124,111,255,0.2), rgba(0,212,255,0.1))', border: '1px solid rgba(124,111,255,0.2)' }}
              >
                <Loader2 size={13} className="animate-spin text-pp-violet" />
                <span className="text-pp-text-muted text-xs">חושב...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 pp-glass rounded-xl px-3 py-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="שאל שאלה פיננסית..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-pp-text-muted outline-none"
              disabled={chatLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!chatInput.trim() || chatLoading}
              aria-label="שלח"
              className="p-2 rounded-lg transition-all duration-200 cursor-pointer hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={15} className="text-pp-violet" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Add Modal ── */}
      {modal && (
        <AddModal
          type={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          loading={saving}
          existingTransactions={transactions}
        />
      )}

      {/* ── Upload Wizard Modal ── */}
      {showUploadWizard && (
        <UploadWizardModal
          file={pendingFile}
          rows={pendingRows}
          onClose={cancelUpload}
          onConfirm={confirmUpload}
          loading={uploading}
          parsing={wizardParsing}
          month={month}
          year={year}
          existingTransactions={allTx}
        />
      )}
    </div>
  )
}
