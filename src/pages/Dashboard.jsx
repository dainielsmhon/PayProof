import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getDaysRemaining, getStatusColor, formatDate } from '../utils/dateUtils'
import { AlertCircle, TrendingUp, Bell, CreditCard } from 'lucide-react'

const Dashboard = () => {
  /* Refactor: LocalStorage for Subscriptions, Supabase for Warranties */
  const [subscriptions] = useLocalStorage('subscriptions', [])

  // Replace LocalStorage warranties with Supabase state
  const [warranties, setWarranties] = useState([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

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
                <div className="flex-1">
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
                <div className="flex-1">
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
  )
}

export default Dashboard

