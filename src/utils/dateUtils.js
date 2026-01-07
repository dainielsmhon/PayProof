export const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export const getDaysRemaining = (dateString) => {
  if (!dateString) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(dateString)
  targetDate.setHours(0, 0, 0, 0)
  const diffTime = targetDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export const getStatusColor = (daysRemaining) => {
  if (daysRemaining === null) return 'gray'
  if (daysRemaining < 0) return 'red'
  if (daysRemaining <= 7) return 'red'
  if (daysRemaining <= 30) return 'yellow'
  return 'green'
}

export const getStatusBadgeClass = (daysRemaining) => {
  const color = getStatusColor(daysRemaining)
  const colorClasses = {
    red: 'bg-red-500/20 text-red-400 border-red-500/50',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    green: 'bg-green-500/20 text-green-400 border-green-500/50',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/50'
  }
  return `px-3 py-1 rounded-full text-sm font-medium border ${colorClasses[color]}`
}

