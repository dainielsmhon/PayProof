import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getDaysRemaining, getStatusColor, formatDate } from '../utils/dateUtils'
import { AlertCircle, TrendingUp, Bell, CreditCard, Sparkles, Send, Loader2 } from 'lucide-react'
import { askGeminiAgent } from '../lib/gemini'

const Dashboard = () => {
  /* Refactor: LocalStorage for Subscriptions, Supabase for Warranties */
  const [subscriptions] = useLocalStorage('subscriptions', [])

  // Replace LocalStorage warranties with Supabase state
  const [warranties, setWarranties] = useState([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  // State for AI Agent Chat
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isSendingChat, setIsSendingChat] = useState(false)
  const chatEndRef = useRef(null)

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedChat = localStorage.getItem('payproof_agent_chat')
    if (savedChat) {
      try {
        setChatMessages(JSON.parse(savedChat))
      } catch (e) {
        console.error('Failed to parse saved chat', e)
      }
    }
  }, [])

  // Save chat to localStorage helper
  const saveChatHistory = (messages) => {
    localStorage.setItem('payproof_agent_chat', JSON.stringify(messages))
  }

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isSendingChat])

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch User Name (Proof of Profile creation)
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single();
        if (profile) setUserName(profile.first_name);

        const { data } = await supabase
          .from('warranties')
          .select('*')
          .eq('user_id', user.id); // Filter by user
        setWarranties(data || []);
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, [])

  const handleSendChatMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || isSendingChat) return

    const userMessage = {
      role: 'user',
      text: chatInput.trim()
    }

    const updatedMessages = [...chatMessages, userMessage]
    setChatMessages(updatedMessages)
    saveChatHistory(updatedMessages)
    setChatInput('')
    setIsSendingChat(true)

    try {
      // Map history to the required format for Gemini
      const apiHistory = updatedMessages.map(msg => ({
        role: msg.role,
        text: msg.text
      }))
      const lastQuestion = apiHistory.pop().text

      const responseText = await askGeminiAgent(lastQuestion, apiHistory)

      const agentMessage = {
        role: 'model',
        text: responseText
      }

      const finalMessages = [...updatedMessages, agentMessage]
      setChatMessages(finalMessages)
      saveChatHistory(finalMessages)
    } catch (err) {
      console.error('Error in agent chat:', err)
      const errorMessage = {
        role: 'model',
        text: `⚠️ אירעה שגיאה בחיבור לסוכן: ${err.message}. אנא נסה שוב.`
      }
      setChatMessages(prev => [...prev, errorMessage])
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calculate statistics
  const activeSubscriptions = subscriptions.filter(s => s.status === 'Active').length
  const expiredSubscriptions = subscriptions.filter(s => {
    const days = getDaysRemaining(s.renewalDate)
    return days !== null && days < 0
  }).length
  const expiringSoonSubscriptions = subscriptions.filter(s => {
    const days = getDaysRemaining(s.renewalDate)
    return days !== null && days > 0 && days <= 30
  }).length

  const expiredWarranties = warranties.filter(w => {
    const days = getDaysRemaining(w.expiry_date) // Note: Snake case from DB
    return days !== null && days < 0
  }).length
  const expiringSoonWarranties = warranties.filter(w => {
    const days = getDaysRemaining(w.expiry_date)
    return days !== null && days > 0 && days <= 30
  }).length

  const totalAlerts = expiredSubscriptions + expiredWarranties + expiringSoonSubscriptions + expiringSoonWarranties

  // Get items ending soon
  const warrantiesEndingSoon = warranties
    .map(w => ({
      ...w,
      daysRemaining: getDaysRemaining(w.expiry_date),
      productName: w.product_name, // Map Snake Case DB to Component
      category: w.category || 'כללי'
    }))
    .filter(w => w.daysRemaining !== null && w.daysRemaining <= 30)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5)

  const subscriptionsEndingSoon = subscriptions
    .filter(s => s.status === 'Active')
    .map(s => ({
      ...s,
      daysRemaining: getDaysRemaining(s.renewalDate)
    }))
    .filter(s => s.daysRemaining !== null && s.daysRemaining <= 30)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5)

  const getStatusBadge = (daysRemaining) => {
    const color = getStatusColor(daysRemaining)
    const colorClasses = {
      red: 'bg-red-500/20 text-red-400 border-red-500/50',
      yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      green: 'bg-green-500/20 text-green-400 border-green-500/50'
    }
    return `px-2 py-1 rounded-full text-xs font-medium border ${colorClasses[color]}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">לוח בקרה {userName && <span className="text-blue-500">• שלום, {userName}</span>}</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">סיכום היום</p>
              <p className="text-2xl font-bold">{activeSubscriptions + warranties.length}</p>
              <p className="text-xs text-gray-500 mt-1">פריטים פעילים</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <TrendingUp className="text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">דורש תשומת לב</p>
              <p className="text-2xl font-bold text-red-400">{expiredSubscriptions + expiredWarranties}</p>
              <p className="text-xs text-gray-500 mt-1">פריטים שפגו</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <AlertCircle className="text-red-400" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">התראות חדשות</p>
              <p className="text-2xl font-bold text-yellow-400">{totalAlerts}</p>
              <p className="text-xs text-gray-500 mt-1">סה"כ התראות</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Bell className="text-yellow-400" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">מנויים פעילים</p>
              <p className="text-2xl font-bold text-green-400">{activeSubscriptions}</p>
              <p className="text-xs text-gray-500 mt-1">מנויים פעילים</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CreditCard className="text-green-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Grid Layout for Main Content & AI Agent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Upcoming items (Warranties & Subscriptions) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Warranties Ending Soon */}
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-4">אחריות שפוגות בקרוב</h2>
            {warrantiesEndingSoon.length === 0 ? (
              <p className="text-gray-400">אין אחריות שפוגות בקרוב</p>
            ) : (
              <div className="space-y-3">
                {warrantiesEndingSoon.map((warranty) => (
                  <div
                    key={warranty.id}
                    className="flex items-center justify-between p-4 bg-dark-card/50 rounded-lg border border-white/5"
                  >
                    <div className="flex-1 text-right">
                      <p className="font-medium">{warranty.productName}</p>
                      <p className="text-sm text-gray-400">{warranty.category} • {formatDate(warranty.expiryDate)}</p>
                    </div>
                    <div className={getStatusBadge(warranty.daysRemaining)}>
                      {warranty.daysRemaining < 0
                        ? `פג לפני ${Math.abs(warranty.daysRemaining)} ימים`
                        : `נותרו ${warranty.daysRemaining} ימים`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subscriptions Ending Soon */}
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-4">מנויים שפוגים בקרוב</h2>
            {subscriptionsEndingSoon.length === 0 ? (
              <p className="text-gray-400">אין מנויים שפוגים בקרוב</p>
            ) : (
              <div className="space-y-3">
                {subscriptionsEndingSoon.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="flex items-center justify-between p-4 bg-dark-card/50 rounded-lg border border-white/5"
                  >
                    <div className="flex-1 text-right">
                      <p className="font-medium">{subscription.name}</p>
                      <p className="text-sm text-gray-400">₪{subscription.price} • {formatDate(subscription.renewalDate)}</p>
                    </div>
                    <div className={getStatusBadge(subscription.daysRemaining)}>
                      {subscription.daysRemaining < 0
                        ? `פג לפני ${Math.abs(subscription.daysRemaining)} ימים`
                        : `נותרו ${subscription.daysRemaining} ימים`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: AI Agent Chat */}
        <div className="lg:col-span-1">
          <div className="glass-card flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="text-blue-400 animate-pulse" size={20} />
                <h2 className="text-xl font-bold">התייעצות עם סוכן AI</h2>
              </div>
              {chatMessages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  איפוס
                </button>
              )}
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4 text-right text-sm">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <span className="text-3xl mb-2">🤖</span>
                  <h4 className="font-bold text-gray-200 mb-2">שלום {userName || 'אורח'}!</h4>
                  <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
                    שאל אותי הכל על המנויים שלך, תאריכי אחריות, או איך לחסוך בהוצאות.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-dark-surface/80 border border-white/10 text-gray-200 rounded-tl-none'
                    }`}>
                      <p className="font-bold text-[10px] mb-1 text-gray-400">
                        {msg.role === 'user' ? 'אתה' : 'סוכן PayProof'}
                      </p>
                      <p className="whitespace-pre-line leading-relaxed text-xs">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              {isSendingChat && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-dark-surface/80 border border-white/10 text-gray-300 rounded-2xl rounded-tl-none p-3 flex items-center gap-2">
                    <Loader2 className="animate-spin text-blue-400" size={14} />
                    <span className="text-xs text-gray-400">הסוכן חושב...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isSendingChat}
                placeholder="שאל את הסוכן..."
                className="input-field flex-1 text-xs py-2 px-3 text-right"
                dir="rtl"
              />
              <button
                type="submit"
                disabled={isSendingChat || !chatInput.trim()}
                className="btn-primary p-2 flex items-center justify-center shrink-0 disabled:bg-gray-600/50 disabled:text-gray-400/50"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

