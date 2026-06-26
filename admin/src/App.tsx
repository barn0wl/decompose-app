import { useState, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PendingQueue from './pages/PendingQueue';
import Connections from './pages/Connections';
import Stops from './pages/Stops';

type Page = 'dashboard' | 'pending' | 'connections' | 'stops';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'pending':
        return <PendingQueue />;
      case 'connections':
        return <Connections />;
      case 'stops':
        return <Stops />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
