import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { supabase } from './supabaseClient'
import Layout from './components/Layout'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Subscriptions from './pages/Subscriptions'
import Warranties from './pages/Warranties'
import Receipts from './pages/Receipts'
import UserManagement from './pages/UserManagement'
import ResetPassword from './pages/ResetPassword'
import Transactions from './pages/Transactions'
import SettingsPage from './pages/Settings'

function App() {

  // Keep-Alive Mechanism to prevent project pausing
  useEffect(() => {
    const keepAlive = async () => {
      try {
        // Simple lightweight query just to touch the DB
        await supabase.from('warranties').select('id', { count: 'exact', head: true });
        console.log('Keep-Alive ping sent.');
      } catch (error) {
        console.error('Keep-Alive ping failed:', error);
      }
    };

    // Run once on mount
    keepAlive();

    // Run every few days if the app stays open (though uncommon for web apps, useful if PWA)
    const interval = setInterval(keepAlive, 1000 * 60 * 60 * 24); // 24 hours
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/subscriptions" element={
          <ProtectedRoute>
            <Layout>
              <Subscriptions />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/transactions" element={
          <ProtectedRoute>
            <Layout>
              <Transactions />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/warranties" element={
          <ProtectedRoute>
            <Layout>
              <Warranties />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/receipts" element={
          <ProtectedRoute>
            <Layout>
              <Receipts />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute>
            <Layout>
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/reset-password" element={
          <ProtectedRoute>
            <ResetPassword />
          </ProtectedRoute>
        } />

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
