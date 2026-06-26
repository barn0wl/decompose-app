interface SidebarProps {
  currentPage: string;
  onPageChange: (page: 'dashboard' | 'pending' | 'connections' | 'stops') => void;
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>🚌 Décompose</h1>
        <p>Admin Panel</p>
      </div>
      <nav className="sidebar-nav">
        <button
          className={currentPage === 'dashboard' ? 'active' : ''}
          onClick={() => onPageChange('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={currentPage === 'pending' ? 'active' : ''}
          onClick={() => onPageChange('pending')}
        >
          ⏳ Pending Review
        </button>
        <button
          className={currentPage === 'connections' ? 'active' : ''}
          onClick={() => onPageChange('connections')}
        >
          🔗 Connections
        </button>
        <button
          className={currentPage === 'stops' ? 'active' : ''}
          onClick={() => onPageChange('stops')}
        >
          📍 Stops
        </button>
      </nav>
    </aside>
  );
}
