// SUPABASE_READY: profiles, warranties
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getDaysRemaining, getStatusColor, formatDate } from '../utils/dateUtils'
import {
  AlertCircle, TrendingUp, Bell, CreditCard, Sparkles,
  Send, Loader2, Shield, FileText, ArrowLeft, ChevronLeft,
  Sun, Moon, Coffee, Zap, RotateCcw, Scale
} from 'lucide-react'
import { askGeminiAgent } from '../lib/gemini'

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
]

// Helper: greeting based on time
const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 5)  return { text: 'לילה טוב',   icon: Moon }
  if (h < 12) return { text: 'בוקר טוב',   icon: Sun }
  if (h < 17) return { text: 'צהריים טובים', icon: Coffee }
  return          { text: 'ערב טוב',    icon: Moon }
}

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, sub, color, delay = 0 }) => (
  <div
    className="pp-glass p-5 flex flex-col gap-3 animate-slide-up relative overflow-hidden cursor-default"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Background glow */}
    <div
      className="absolute top-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
      style={{ background: color, transform: 'translate(-30%, -30%)' }}
      aria-hidden="true"
    />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-pp-text-secondary text-xs font-medium mb-1">{label}</p>
        <p className="text-3xl font-display font-bold font-numeric" style={{ color }}>{value}</p>
        {sub && <p className="text-pp-text-muted text-[11px] mt-1 font-medium">{sub}</p>}
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

// Monthly Balance Card Component
const BalanceCard = ({ income, expense, balance, monthName, delay = 0 }) => {
  const isPositive = balance >= 0
  const balanceColor = isPositive ? 'var(--pp-mint)' : 'var(--pp-coral)'
  
  return (
    <div
      className="pp-glass p-5 flex flex-col justify-between animate-slide-up relative overflow-hidden cursor-default col-span-2 min-h-[126px]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: balanceColor, transform: 'translate(-20%, -20%)' }}
        aria-hidden="true"
      />
      
      <div className="relative z-10 flex flex-col h-full justify-between gap-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-pp-text-secondary text-xs font-medium mb-1">מאזן חודשי ({monthName})</p>
            <p className="text-3xl font-display font-bold font-numeric" style={{ color: balanceColor }}>
              {isPositive ? '+' : ''}₪{Number(balance).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${balanceColor}18`, border: `1px solid ${balanceColor}30` }}
            aria-hidden="true"
          >
            <Scale size={18} style={{ color: balanceColor }} />
          </div>
        </div>
        
        {/* Income / Expense details */}
        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pp-mint" />
            <div>
              <p className="text-[10px] text-pp-text-muted">הכנסות</p>
              <p className="text-xs font-bold text-white font-numeric">
                +₪{Number(income).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pp-coral" />
            <div>
              <p className="text-[10px] text-pp-text-muted">הוצאות</p>
              <p className="text-xs font-bold text-white font-numeric">
                -₪{Number(expense).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Status badge helper
const getStatusBadge = (daysRemaining) => {
  if (daysRemaining === null) return null
  if (daysRemaining < 0)   return <span className="pp-badge-danger">פג תוקף</span>
  if (daysRemaining <= 7)  return <span className="pp-badge-danger">נותרו {daysRemaining} ימים</span>
  if (daysRemaining <= 30) return <span className="pp-badge-warning">נותרו {daysRemaining} ימים</span>
  return <span className="pp-badge-success">בתוקף</span>
}

// Upcoming Item Row
const UpcomingRow = ({ title, sub, daysRemaining, icon: Icon, iconColor }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 gap-3 group">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}25` }}
        aria-hidden="true"
      >
        <Icon size={15} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">{title}</p>
        {sub && <p className="text-[11px] text-pp-text-muted truncate">{sub}</p>}
      </div>
    </div>
    <div className="shrink-0">{getStatusBadge(daysRemaining)}</div>
  </div>
)

// Skeleton Loader
const SkeletonCard = () => (
  <div className="pp-glass p-5 flex flex-col gap-3">
    <div className="pp-skeleton h-3 w-20 rounded" />
    <div className="pp-skeleton h-8 w-16 rounded" />
    <div className="pp-skeleton h-2 w-24 rounded" />
  </div>
)

const Dashboard = () => {
  const [subscriptions, setSubscriptions] = useState([])
  const [warranties, setWarranties] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('דניאל')

  // AI Chat state
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isSendingChat, setIsSendingChat] = useState(false)
  const chatEndRef = useRef(null)

  const greeting = getGreeting()
  const GreetIcon = greeting.icon

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('payproof_agent_chat')
    if (saved) {
      try { setChatMessages(JSON.parse(saved)) } catch { /* ignore */ }
    }
  }, [])

  const saveChatHistory = (msgs) => localStorage.setItem('payproof_agent_chat', JSON.stringify(msgs))

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isSendingChat])

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('first_name').eq('id', user.id).single()
        if (profile) setUserName(profile.first_name)

        const { data: wData } = await supabase
          .from('warranties').select('*').eq('user_id', user.id)
        setWarranties(wData || [])

        const { data: sData } = await supabase
          .from('subscriptions').select('*').eq('user_id', user.id)
        const formatted = (sData || []).map(s => ({
          ...s,
          renewalDate: s.renewal_date,
          startDate: s.start_date
        }))
        setSubscriptions(formatted)

        try {
          const today = new Date()
          const currentYear = today.getFullYear()
          const currentMonth = today.getMonth()
          const fromDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
          const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
          const toDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

          const { data: txData } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .gte('transaction_date', fromDate)
            .lte('transaction_date', toDate)
          setTransactions(txData || [])
        } catch (err) {
          console.error('Error fetching transactions in dashboard:', err)
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleSendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || isSendingChat) return

    const userMsg = { role: 'user', text: chatInput.trim() }
    const updated = [...chatMessages, userMsg]
    setChatMessages(updated)
    saveChatHistory(updated)
    setChatInput('')
    setIsSendingChat(true)

    try {
      const history = updated.map(m => ({ role: m.role, text: m.text }))
      const question = history.pop().text
      const response = await askGeminiAgent(question, history)
      const agentMsg = { role: 'model', text: response }
      const final = [...updated, agentMsg]
      setChatMessages(final)
      saveChatHistory(final)
    } catch (err) {
      const errMsg = { role: 'model', text: `⚠️ שגיאה: ${err.message}` }
      setChatMessages(prev => [...prev, errMsg])
    } finally {
      setIsSendingChat(false)
    }
  }

  const handleClearChat = () => {
    if (window.confirm('האם לאפס את שיחת הייעוץ?')) {
      setChatMessages([])
      localStorage.removeItem('payproof_agent_chat')
    }
  }

  // Statistics
  const activeSubscriptions = subscriptions.filter(s => s.status === 'Active').length
  const expiredSubscriptions = subscriptions.filter(s => {
    const d = getDaysRemaining(s.renewalDate); return d !== null && d < 0
  }).length
  const expiringSoonSubs = subscriptions.filter(s => {
    const d = getDaysRemaining(s.renewalDate); return d !== null && d >= 0 && d <= 30
  }).length
  const expiredWarranties = warranties.filter(w => {
    const d = getDaysRemaining(w.expiry_date); return d !== null && d < 0
  }).length
  const expiringSoonWarranties = warranties.filter(w => {
    const d = getDaysRemaining(w.expiry_date); return d !== null && d >= 0 && d <= 30
  }).length
  const totalAlerts = expiredSubscriptions + expiredWarranties + expiringSoonSubs + expiringSoonWarranties
  const totalActive = activeSubscriptions + warranties.filter(w => {
    const d = getDaysRemaining(w.expiry_date); return d === null || d >= 0
  }).length

  // Monthly balance statistics
  const monthlyIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const monthlyExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const monthlyBalance = monthlyIncome - monthlyExpense

  // Upcoming items
  const upcomingWarranties = warranties
    .map(w => ({ ...w, daysRemaining: getDaysRemaining(w.expiry_date) }))
    .filter(w => w.daysRemaining !== null && w.daysRemaining <= 30)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 4)

  const upcomingSubs = subscriptions
    .filter(s => s.status === 'Active')
    .map(s => ({ ...s, daysRemaining: getDaysRemaining(s.renewalDate) }))
    .filter(s => s.daysRemaining !== null && s.daysRemaining <= 30)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 4)

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir="rtl">

      {/* ─── Hero Header ─── */}
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GreetIcon size={16} className="text-pp-amber" aria-hidden="true" />
            <span className="text-pp-text-secondary text-sm font-medium">{greeting.text}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {userName ? (
              <>שלום, <span className="pp-gradient-text">{userName}</span> 👋</>
            ) : (
              <span className="pp-gradient-text">PayProof</span>
            )}
          </h1>
          <p className="text-pp-text-secondary text-sm mt-1">
            {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2 pp-glass px-4 py-2 self-start sm:self-auto">
          <span className="pp-live-dot" aria-hidden="true" />
          <span className="text-xs font-medium text-pp-text-secondary">מחובר לאחסון בענן</span>
        </div>
      </div>

      {/* ─── Bento Stats Grid ─── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="פריטים פעילים"
            value={totalActive}
            sub="סה״כ במעקב"
            color="var(--pp-violet)"
            delay={0}
          />
          <StatCard
            icon={CreditCard}
            label="מנויים פעילים"
            value={activeSubscriptions}
            sub="חודשי / שנתי"
            color="var(--pp-cyan)"
            delay={80}
          />
          <StatCard
            icon={AlertCircle}
            label="דורש תשומת לב"
            value={expiredSubscriptions + expiredWarranties}
            sub="פריטים פגי תוקף"
            color="var(--pp-coral)"
            delay={160}
          />
          <StatCard
            icon={Bell}
            label="התראות קרובות"
            value={totalAlerts}
            sub="ב-30 הימים הקרובים"
            color="var(--pp-amber)"
            delay={240}
          />
        </div>
      )}

      {/* ─── Main Bento Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Upcoming Items (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Warranties Ending Soon */}
          <div className="pp-glass-card animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pp-mint/15 border border-pp-mint/25 flex items-center justify-center" aria-hidden="true">
                  <Shield size={14} className="text-pp-mint" />
                </div>
                <h2 className="font-display font-semibold text-base text-white">אחריות שפוגות בקרוב</h2>
              </div>
              {upcomingWarranties.length > 0 && (
                <span className="pp-badge-warning">{upcomingWarranties.length} פריטים</span>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0,1,2].map(i => <div key={i} className="pp-skeleton h-12 rounded-lg" />)}
              </div>
            ) : upcomingWarranties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-pp-mint/10 flex items-center justify-center mb-3" aria-hidden="true">
                  <Shield size={24} className="text-pp-mint" />
                </div>
                <p className="text-pp-text-secondary text-sm font-medium">אין אחריות שפוגות בקרוב</p>
                <p className="text-pp-text-muted text-xs mt-1">כל האחריות שלך בתוקף 🎉</p>
              </div>
            ) : (
              <div>
                {upcomingWarranties.map((w) => (
                  <UpcomingRow
                    key={w.id}
                    title={w.product_name}
                    sub={`${w.store || 'כללי'} • ${w.expiry_date ? new Date(w.expiry_date).toLocaleDateString('he-IL') : ''}`}
                    daysRemaining={w.daysRemaining}
                    icon={Shield}
                    iconColor="var(--pp-mint)"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Subscriptions Ending Soon */}
          <div className="pp-glass-card animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pp-cyan/15 border border-pp-cyan/25 flex items-center justify-center" aria-hidden="true">
                  <CreditCard size={14} className="text-pp-cyan" />
                </div>
                <h2 className="font-display font-semibold text-base text-white">מנויים שפוגים בקרוב</h2>
              </div>
              {upcomingSubs.length > 0 && (
                <span className="pp-badge-info">{upcomingSubs.length} פריטים</span>
              )}
            </div>

            {upcomingSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-pp-cyan/10 flex items-center justify-center mb-3" aria-hidden="true">
                  <CreditCard size={24} className="text-pp-cyan" />
                </div>
                <p className="text-pp-text-secondary text-sm font-medium">אין מנויים שפוגים בקרוב</p>
                <p className="text-pp-text-muted text-xs mt-1">כל המנויים שלך תקינים ✅</p>
              </div>
            ) : (
              <div>
                {upcomingSubs.map((s) => (
                  <UpcomingRow
                    key={s.id}
                    title={s.name}
                    sub={`₪${s.price} • ${formatDate(s.renewalDate)}`}
                    daysRemaining={s.daysRemaining}
                    icon={CreditCard}
                    iconColor="var(--pp-cyan)"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── AI Agent Chat (1 col) ─── */}
        <div className="lg:col-span-1">
          <div
            className="pp-glass flex flex-col animate-slide-up"
            style={{ height: '480px', animationDelay: '150ms' }}
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pp-violet/20 border border-pp-violet/30 flex items-center justify-center" aria-hidden="true">
                  <Sparkles size={14} className="text-pp-violet" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-sm text-white">סוכן AI</h2>
                  <p className="text-[10px] text-pp-text-muted">Powered by Gemini</p>
                </div>
              </div>
              {chatMessages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  aria-label="אפס שיחה"
                  title="אפס שיחה"
                  className="p-1.5 rounded-lg text-pp-text-muted hover:text-pp-coral hover:bg-pp-coral/10 transition-all cursor-pointer pp-focus"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-3 space-y-2"
              dir="rtl"
              role="log"
              aria-live="polite"
              aria-label="שיחה עם סוכן AI"
            >
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-pp-violet/10 border border-pp-violet/20 flex items-center justify-center animate-float" aria-hidden="true">
                    <Sparkles size={26} className="text-pp-violet" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm mb-1">שלום {userName || 'אורח'}!</h4>
                    <p className="text-xs text-pp-text-muted leading-relaxed max-w-[180px] mx-auto">
                      שאל אותי הכל על המנויים, האחריות, או איך לחסוך בהוצאות.
                    </p>
                  </div>
                  {/* Suggestion chips */}
                  <div className="flex flex-col gap-1.5 w-full">
                    {['מה הסטטוס שלי?', 'איך לחסוך כסף?', 'מה פג תוקף?'].map(s => (
                      <button
                        key={s}
                        onClick={() => setChatInput(s)}
                        className="w-full text-right text-xs py-2 px-3 rounded-lg bg-white/4 border border-white/8 text-pp-text-secondary hover:bg-white/8 hover:text-white transition-all cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    aria-label={msg.role === 'user' ? 'הודעה שלך' : 'תשובת סוכן'}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-pp-violet/30 border border-pp-violet/30 text-white rounded-tl-sm'
                          : 'bg-white/5 border border-white/8 text-pp-text-secondary rounded-tr-sm'
                      }`}
                    >
                      <p className="font-bold text-[9px] mb-1 opacity-60">
                        {msg.role === 'user' ? 'אתה' : 'סוכן PayProof'}
                      </p>
                      <p className="whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              {isSendingChat && (
                <div className="flex justify-end" aria-live="polite">
                  <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tr-sm px-3 py-2 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-pp-violet" />
                    <span className="text-[10px] text-pp-text-muted">הסוכן חושב...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 flex gap-2 shrink-0">
              <input
                id="ai-chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isSendingChat}
                placeholder="שאל את הסוכן..."
                className="pp-input flex-1 text-xs py-2 px-3 text-right pp-focus"
                dir="rtl"
                aria-label="הכנס שאלה לסוכן"
              />
              <button
                id="ai-chat-submit"
                type="submit"
                disabled={isSendingChat || !chatInput.trim()}
                aria-label="שלח הודעה"
                className="pp-btn-primary px-3 py-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard
