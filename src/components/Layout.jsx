import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CreditCard,
  Shield,
  FileText,
  Menu,
  X,
  Users
} from 'lucide-react'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Open sidebar by default on desktop
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true)
    }
  }, [])

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'לוח בקרה' },
    { path: '/subscriptions', icon: CreditCard, label: 'מנויים' },
    { path: '/warranties', icon: Shield, label: 'אחריות' },
    { path: '/receipts', icon: FileText, label: 'קבלות' },
    { path: '/users', icon: Users, label: 'ניהול משתמשים' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-dark-bg flex-row-reverse">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-0'
          } transition-all duration-300 overflow-hidden glass border-r border-white/10`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">מערכת הניהול של דניאל </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                    ? 'bg-blue-600/30 text-blue-300 border-l-4 border-blue-500'
                    : 'text-gray-300 hover:bg-dark-card/50 hover:text-white'
                    }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden glass border-b border-white/10 p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white hover:text-gray-300"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout

