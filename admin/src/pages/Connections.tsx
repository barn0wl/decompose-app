import { useState, useEffect } from 'react';
import { getConnections, deleteConnection, Connection } from '../api/client';

const TRANSPORT_LABELS: Record<string, string> = {
  communal_taxi: '🚕 Taxi',
  gbaka: '🚌 Gbaka',
  sotra_bus: '🚍 SOTRA',
  walking: '🚶 Walking',
};

export default function Connections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = async () => {
    try {
      const data = await getConnections();
      setConnections(data);
    } catch (err) {
      setError('Failed to load connections');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    try {
      await deleteConnection(id);
      await fetchConnections();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete connection');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div className="page-header">
        <h2>Connections</h2>
        <span className="badge">{connections.length} total</span>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>From → To</th>
                <th>Type</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Votes</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.fromStop?.name || 'N/A'}</strong>
                    <br />
                    <small style={{ color: '#888' }}>→ {c.toStop?.name || 'N/A'}</small>
                  </td>
                  <td>{TRANSPORT_LABELS[c.transportType] || c.transportType}</td>
                  <td>{c.basePrice} CFA</td>
                  <td>{c.durationMinutes} min</td>
                  <td>
                    <span style={{ color: '#4CAF50' }}>↑{c.upvotes}</span>
                    {' '}
                    <span style={{ color: '#f44336' }}>↓{c.downvotes}</span>
                  </td>
                  <td>
                    <span style={{
                      color: c.voteScore > 0 ? '#4CAF50' : c.voteScore < 0 ? '#f44336' : '#888',
                      fontWeight: 'bold',
                    }}>
                      {c.voteScore}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(c.id)}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
