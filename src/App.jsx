import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Subscriptions from './pages/Subscriptions'
import Warranties from './pages/Warranties'
import Receipts from './pages/Receipts'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/warranties" element={<Warranties />} />
          <Route path="/receipts" element={<Receipts />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

