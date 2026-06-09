import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import {
  LayoutDashboard,
  CreditCard,
  Shield,
  FileText,
  Users,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Zap,
  Bell,
  Settings,
  Menu,
  X
} from 'lucide-react'

const menuItems = [
  { path: '/',              icon: LayoutDashboard, label: 'לוח בקרה',        color: 'var(--pp-violet)' },
  { path: '/subscriptions', icon: CreditCard,      label: 'מנויים',          color: 'var(--pp-cyan)' },
  { path: '/warranties',    icon: Shield,          label: 'אחריות',          color: 'var(--pp-mint)' },
  { path: '/receipts',      icon: FileText,        label: 'קבלות',           color: 'var(--pp-amber)' },
  { path: '/users',         icon: Users,           label: 'ניהול משתמשים',   color: 'var(--pp-coral)' },
]

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [hovered, setHovered] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const sidebarRef = useRef(null)

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()
        setUserProfile(profile || { first_name: 'דניאל', last_name: '' })
      }
    }
    fetchProfile()
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close mobile sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const initials = userProfile
    ? `${(userProfile.first_name || '')[0] || ''}${(userProfile.last_name || '')[0] || ''}`.toUpperCase()
    : '??'

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full" dir="rtl">

      {/* Logo / Branding */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}>
        {/* Zap Icon as Logo */}
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pp-violet to-pp-cyan flex items-center justify-center shadow-glow-violet">
            <Zap size={18} className="text-white" fill="white" />
          </div>
          {/* Live dot */}
          <span className="absolute -top-0.5 -left-0.5 pp-live-dot" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="overflow-hidden">
            <span className="font-display font-800 text-lg pp-gradient-text block leading-none">PayProof</span>
            <span className="text-[10px] text-pp-text-muted font-medium block mt-0.5">ניהול פיננסי חכם</span>
          </div>
        )}
        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'הרחב תפריט' : 'צמצם תפריט'}
            className={`mr-auto p-1.5 rounded-lg text-pp-text-muted hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer pp-focus ${collapsed ? 'rotate-180 mr-0' : ''}`}
          >
            <ChevronRight size={16} />
          </button>
        )}
        {/* Close button — mobile only */}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="סגור תפריט"
            className="mr-auto p-1.5 rounded-lg text-pp-text-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" role="navigation" aria-label="ניווט ראשי">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          const isHovered = hovered === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onMouseEnter={() => setHovered(item.path)}
              onMouseLeave={() => setHovered(null)}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer pp-focus
                ${collapsed && !isMobile ? 'justify-center px-2' : ''}
                ${isActive
                  ? 'text-white'
                  : 'text-pp-text-secondary hover:text-white'
                }
              `}
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${item.color}20, ${item.color}10)`
                  : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: isActive
                  ? `1px solid ${item.color}30`
                  : '1px solid transparent',
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
                />
              )}

              {/* Icon with dynamic color */}
              <span
                className="shrink-0 transition-colors duration-200"
                style={{ color: isActive ? item.color : undefined }}
              >
                <Icon size={18} />
              </span>

              {/* Label */}
              {(!collapsed || isMobile) && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}

              {/* Tooltip for collapsed mode */}
              {collapsed && !isMobile && (
                <span className="
                  absolute right-full mr-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                  bg-pp-card border border-white/10 text-white shadow-xl
                  opacity-0 pointer-events-none transition-opacity duration-150
                  group-hover:opacity-100
                " style={{ zIndex: 100 }}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: User Profile + Logout */}
      <div className="px-3 pb-4 border-t border-white/5 pt-3 space-y-2">

        {/* Settings */}
        {(!collapsed || isMobile) && (
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-pp-text-secondary hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer pp-focus text-sm font-medium"
            aria-label="הגדרות"
          >
            <Settings size={18} className="shrink-0" />
            <span>הגדרות</span>
          </button>
        )}

        {/* User Avatar + Info */}
        <div className={`flex items-center gap-3 px-2 py-2 rounded-xl ${collapsed && !isMobile ? 'justify-center' : ''}`}>
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C6FFF, #00D4FF)' }}
            aria-label={`משתמש: ${userProfile?.first_name || ''}`}
          >
            {initials}
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'טוען...'}
              </p>
              <p className="text-[10px] text-pp-text-muted">מנהל מערכת</p>
            </div>
          )}
          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            aria-label="התנתק"
            title="התנתק"
            className="p-1.5 rounded-lg text-pp-text-muted hover:text-pp-coral hover:bg-pp-coral/10 transition-all duration-200 cursor-pointer pp-focus shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-pp-bg" dir="rtl">

      {/* Aurora Background */}
      <div className="pp-aurora" aria-hidden="true" />

      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={`
          hidden lg:flex flex-col shrink-0 relative z-20
          border-l border-white/5
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-60'}
        `}
        style={{ background: 'rgba(10, 22, 40, 0.85)', backdropFilter: 'blur(20px)' }}
        aria-label="תפריט ניווט"
      >
        <SidebarContent />
      </aside>

      {/* ─── Mobile Sidebar Overlay ─── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" aria-modal="true" role="dialog" aria-label="תפריט ניווט">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-pp-bg/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Sidebar Panel */}
          <aside
            ref={sidebarRef}
            className="absolute right-0 top-0 bottom-0 w-64 border-l border-white/5 animate-slide-in-right"
            style={{ background: 'rgba(10, 22, 40, 0.98)', backdropFilter: 'blur(20px)' }}
          >
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">

        {/* Mobile Top Bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5" style={{ background: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pp-violet to-pp-cyan flex items-center justify-center">
              <Zap size={14} className="text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-base pp-gradient-text">PayProof</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="פתח תפריט"
            className="p-2 rounded-lg text-pp-text-secondary hover:text-white hover:bg-white/5 transition-all cursor-pointer pp-focus"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-fade-in" role="main">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
