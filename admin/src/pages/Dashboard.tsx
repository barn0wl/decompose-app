import { useState, useEffect } from 'react';
import { getPendingSuggestions, getConnections, getStops } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({
    pendingSuggestions: 0,
    totalConnections: 0,
    totalStops: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [suggestions, connections, stops] = await Promise.all([
          getPendingSuggestions(),
          getConnections(),
          getStops(),
        ]);
        setStats({
          pendingSuggestions: suggestions.length,
          totalConnections: connections.length,
          totalStops: stops.length,
        });
      } catch (err) {
        setError('Failed to load stats');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Pending Suggestions</div>
          <div className="value">{stats.pendingSuggestions}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Connections</div>
          <div className="value">{stats.totalConnections}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Stops</div>
          <div className="value">{stats.totalStops}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="#pending" className="btn btn-primary">
            Review Suggestions
          </a>
          <a href="#connections" className="btn btn-secondary">
            View Connections
          </a>
          <a href="#stops" className="btn btn-secondary">
            Manage Stops
          </a>
        </div>
      </div>
    </>
  );
}
