import { useState, useEffect } from 'react';
import { getStops, createStop, updateStop, deleteStop, Stop } from '../api/client';

export default function Stops() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Stop | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchStops = async () => {
    try {
      const data = await getStops();
      setStops(data);
    } catch (err) {
      setError('Failed to load stops');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStops();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stop?')) return;
    try {
      await deleteStop(id);
      await fetchStops();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete stop');
    }
  };

  const handleSubmit = async (data: Omit<Stop, 'id'>) => {
    try {
      await createStop(data);
      await fetchStops();
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to create:', err);
      alert('Failed to create stop');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div className="page-header">
        <h2>Stops</h2>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          + Add Stop
        </button>
      </div>

      {isCreating && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Add New Stop</h3>
          <StopForm
            onSubmit={handleSubmit}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Commune</th>
                <th>Type</th>
                <th>Coordinates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{s.commune}</td>
                  <td>{s.type.replace('_', ' ')}</td>
                  <td>
                    <small>
                      {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                    </small>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(s.id)}
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

interface StopFormProps {
  onSubmit: (data: Omit<Stop, 'id'>) => void;
  onCancel: () => void;
}

function StopForm({ onSubmit, onCancel }: StopFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    commune: '',
    latitude: 0,
    longitude: 0,
    type: 'taxi_stop',
    zoneId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label>Commune</label>
        <input
          type="text"
          value={formData.commune}
          onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label>Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
        >
          <option value="taxi_stop">Taxi Stop</option>
          <option value="gbaka_station">Gbaka Station</option>
          <option value="landmark">Landmark</option>
          <option value="zone_boundary">Zone Boundary</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group">
          <label>Latitude</label>
          <input
            type="number"
            step="0.0001"
            value={formData.latitude}
            onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
            required
          />
        </div>
        <div className="form-group">
          <label>Longitude</label>
          <input
            type="number"
            step="0.0001"
            value={formData.longitude}
            onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
            required
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="submit" className="btn btn-primary">Create Stop</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
