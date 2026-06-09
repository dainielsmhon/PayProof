import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  Settings, User, Phone, Mail, Shield, Save, Loader2, CheckCircle2,
  AlertCircle, Smartphone, Key, Monitor, Compass, Sparkles, Check
} from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    email: '',
  })

  // Mock layout / visual settings
  const [activeTheme, setActiveTheme] = useState('space-black')

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true)
      setError(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error: e } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (e && e.code !== 'PGRST116') throw e // ignore not found, just use empty fields
        if (data) {
          setProfile({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            mobile: data.mobile || '',
            email: data.email || user.email || '',
          })
        } else {
          setProfile(p => ({ ...p, email: user.email || '' }))
        }
      } catch (e) {
        console.error(e)
        setError('שגיאה בטעינת פרטי הפרופיל.')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('משתמש לא מחובר')

      const { error: e } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          mobile: profile.mobile.trim(),
          email: profile.email.trim(),
          updated_at: new Date().toISOString(),
        })

      if (e) throw e
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (e) {
      console.error(e)
      setError('שגיאה בשמירת השינויים: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const initials = `${(profile.first_name || '')[0] || ''}${(profile.last_name || '')[0] || ''}`.toUpperCase()

  return (
    <div className="space-y-6 pb-8" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <Settings size={22} className="text-pp-violet" />
          הגדרות מערכת
        </h1>
        <p className="text-pp-text-secondary text-sm mt-0.5">ניהול הפרופיל האישי, הגדרות עיצוב ואבטחה</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="pp-glass border border-pp-coral/30 rounded-2xl px-4 py-3 flex items-center gap-3 text-pp-coral text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="pp-glass border border-pp-mint/30 rounded-2xl px-4 py-3 flex items-center gap-3 text-pp-mint text-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          השינויים נשמרו בהצלחה!
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-pp-violet" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Form Card */}
          <div className="lg:col-span-2 pp-glass rounded-2xl p-6 relative overflow-hidden">
            {/* Glow decoration */}
            <div
              className="absolute top-0 left-0 w-36 h-36 rounded-full blur-3xl opacity-10 pointer-events-none"
              style={{ background: 'var(--pp-violet)', transform: 'translate(-30%, -30%)' }}
              aria-hidden="true"
            />

            <h2 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <User size={16} className="text-pp-violet" />
              פרטים אישיים
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-pp-text-secondary">שם פרטי</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={15} />
                    <input
                      type="text"
                      required
                      value={profile.first_name}
                      onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                      className="pp-input pp-input-icon-right pp-focus text-sm"
                      placeholder="הזן שם פרטי"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-pp-text-secondary">שם משפחה</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={15} />
                    <input
                      type="text"
                      required
                      value={profile.last_name}
                      onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                      className="pp-input pp-input-icon-right pp-focus text-sm"
                      placeholder="הזן שם משפחה"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-pp-text-secondary">טלפון נייד</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={15} />
                    <input
                      type="tel"
                      required
                      value={profile.mobile}
                      onChange={e => setProfile(p => ({ ...p, mobile: e.target.value }))}
                      className="pp-input pp-input-icon-right pp-focus text-sm"
                      placeholder="050-0000000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-pp-text-secondary">אימייל (לקריאה בלבד)</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={15} />
                    <input
                      type="email"
                      disabled
                      value={profile.email}
                      className="pp-input pp-input-icon-right text-sm opacity-50 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="pp-btn-primary px-6 py-2.5 text-sm flex items-center justify-center gap-2 shadow-glow-violet"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'שומר שינויים...' : 'שמור שינויים'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Custom Visuals / Brand Card */}
          <div className="space-y-6">

            {/* Logo Custom Display Card */}
            <div className="pp-glass rounded-2xl p-6 relative overflow-hidden flex flex-col items-center text-center">
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ background: 'var(--pp-cyan)', transform: 'translate(30%, -30%)' }}
                aria-hidden="true"
              />

              {/* Holographic Avatar with custom 3D Logo */}
              <div className="relative w-24 h-24 mb-4">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pp-violet to-pp-cyan animate-pulse blur-md opacity-35" />
                <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-white/20 bg-pp-bg shadow-2xl flex items-center justify-center">
                  <img src="/apple-touch-icon.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-pp-mint border-2 border-pp-bg flex items-center justify-center shadow-glow-mint">
                  <Check size={10} className="text-white font-bold" />
                </span>
              </div>

              <h3 className="text-white font-bold text-base mb-1">PayProof Mobile</h3>
              <p className="text-pp-text-muted text-xs font-medium mb-3">מותקן כאפליקציית PWA בנייד שלך</p>

              <div className="w-full bg-white/5 rounded-xl p-3 text-right space-y-2 border border-white/5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-pp-text-secondary">לוגו מותקן:</span>
                  <span className="text-white flex items-center gap-1">
                    <Sparkles size={11} className="text-pp-amber animate-pulse" />
                    כרטיס ומגן הולוגרפי (3D)
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-pp-text-secondary">גרסת אפליקציה:</span>
                  <span className="text-pp-cyan font-numeric">v1.2.0 (Premium)</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-pp-text-secondary">סטטוס סנכרון:</span>
                  <span className="text-pp-mint">פעיל ומאובטח</span>
                </div>
              </div>
            </div>

            {/* Preferences Selection */}
            <div className="pp-glass rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Monitor size={15} className="text-pp-cyan" />
                ערכת נושא
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTheme('space-black')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    activeTheme === 'space-black'
                      ? 'border-pp-violet/50 bg-pp-violet/10 text-white font-semibold'
                      : 'border-white/5 bg-transparent text-pp-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  <p className="text-xs">שחור חלל עמוק</p>
                  <p className="text-[10px] text-pp-text-muted mt-1 font-numeric">Default HSL theme</p>
                </button>
                <button
                  disabled
                  title="בקרוב"
                  className="p-3 rounded-xl border border-white/5 bg-transparent text-pp-text-muted text-right opacity-40 cursor-not-allowed"
                >
                  <p className="text-xs">אור הולוגרפי</p>
                  <p className="text-[10px] mt-1">Light theme (Soon)</p>
                </button>
              </div>

              <div className="pt-2 border-t border-white/5 text-[11px] text-pp-text-muted flex items-center gap-2">
                <Shield size={12} className="text-pp-violet shrink-0" />
                <span>כל הנתונים וההגדרות נשמרים בענן המאובטח של Supabase.</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
