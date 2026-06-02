# PayProof
 - מנהל מנויים ואחריות

Personal Subscription & Warranty Manager application built with React, Vite, and Tailwind CSS.

## Features

- 📊 **Dashboard**: Summary cards with color-coded alerts
- 💳 **Subscriptions**: Full CRUD operations for managing subscriptions
- 🛡️ **Warranties**: Track product warranties with expiry dates
- 📄 **Receipts**: View and manage uploaded receipts (mock functionality)

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)
- React Router
- LocalStorage (data persistence)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## Design

- **Theme**: Dark mode with Deep Blue/Navy background
- **Style**: Glassmorphism with subtle transparency and glowing borders
- **Layout**: Responsive RTL (Right-to-Left) sidebar for Hebrew interface
- **Language**: Hebrew (RTL support)

## Project Structure

```
src/
├── components/
│   └── Layout.jsx          # Main layout with sidebar
├── hooks/
│   └── useLocalStorage.js  # Custom hook for localStorage
├── pages/
│   ├── Dashboard.jsx       # Dashboard with summary cards
│   ├── Subscriptions.jsx   # Subscriptions CRUD
│   ├── Warranties.jsx      # Warranties CRUD
│   └── Receipts.jsx        # Receipts view
├── utils/
│   └── dateUtils.js        # Date formatting utilities
├── App.jsx                 # Main app component
├── main.jsx               # Entry point
└── index.css              # Global styles
```

## Features Details

### Dashboard
- Summary cards showing active subscriptions, expired items, alerts
- Lists warranties and subscriptions ending soon
- Color-coded status indicators (Red/Yellow/Green)

### Subscriptions
- Create, edit, delete subscriptions
- Track price, start date, renewal date, status
- Visual "Days remaining" calculation with dynamic badges

### Warranties
- Manage product warranties
- Track category, store, purchase/expiry dates, serial numbers
- "View Receipt" button (mock functionality)

### Receipts
- List uploaded receipts (mock data)
- Upload, download, delete functionality (mock)

## Data Persistence

All data is stored in browser's LocalStorage. No external database required.

