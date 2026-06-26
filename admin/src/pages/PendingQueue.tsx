import { useState, useEffect } from 'react';
import { getPendingSuggestions, approveSuggestion, rejectSuggestion, SuggestedConnection } from '../api/client';

const TRANSPORT_LABELS: Record<string, string> = {
  communal_taxi: '🚕 Taxi',
  gbaka: '🚌 Gbaka',
  sotra_bus: '🚍 SOTRA',
  walking: '🚶 Walking',
};

export default function PendingQueue() {
  const [suggestions, setSuggestions] = useState<SuggestedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    try {
      const data = await getPendingSuggestions();
      setSuggestions(data);
    } catch (err) {
      setError('Failed to load suggestions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await approveSuggestion(id);
      await fetchSuggestions();
    } catch (err) {
      console.error('Failed to approve:', err);
      alert('Failed to approve suggestion');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection (optional):');
    setProcessing(id);
    try {
      await rejectSuggestion(id, reason || undefined);
      await fetchSuggestions();
    } catch (err) {
      console.error('Failed to reject:', err);
      alert('Failed to reject suggestion');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div className="page-header">
        <h2>Pending Suggestions</h2>
        <span className="badge">{suggestions.length} pending</span>
      </div>

      {suggestions.length === 0 ? (
        <div className="empty-state">
          <p>🎉 No pending suggestions to review!</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Submitted</th>
                  <th>Confirmations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.fromStop.name}</strong>
                      <br />
                      <small style={{ color: '#888' }}>{s.fromStop.commune}</small>
                    </td>
                    <td>
                      <strong>{s.toStop.name}</strong>
                      <br />
                      <small style={{ color: '#888' }}>{s.toStop.commune}</small>
                    </td>
                    <td>{TRANSPORT_LABELS[s.transportType] || s.transportType}</td>
                    <td>{s.basePrice} CFA</td>
                    <td>{s.durationMinutes} min</td>
                    <td>
                      <small>{new Date(s.submittedAt).toLocaleDateString()}</small>
                    </td>
                    <td>
                      <span className="badge-status pending">
                        {s.confirmations}/{s.confirmationThreshold}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApprove(s.id)}
                          disabled={processing === s.id}
                        >
                          {processing === s.id ? '...' : '✅ Approve'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleReject(s.id)}
                          disabled={processing === s.id}
                        >
                          {processing === s.id ? '...' : '❌ Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
