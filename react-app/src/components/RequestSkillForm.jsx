import { useState, useEffect } from 'react';

export default function RequestSkillForm({ onRequestAdded }) {
  const [formData, setFormData] = useState(() => {
    let studentName = '';
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) studentName = JSON.parse(saved).name || '';
    } catch (e) {}
    return { studentName, skillNeeded: '' };
  });
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');

  const fetchRequests = async () => {
    const res = await fetch('/api/requests');
    const data = await res.json();
    setRequests(data || []);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setStatus('Request posted successfully!');
      setFormData({ studentName: '', skillNeeded: '' });
      fetchRequests();
      if (onRequestAdded) onRequestAdded();
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <section>
      <h2>Learning Requests</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="studentName"
          placeholder="Your Name"
          value={formData.studentName}
          onChange={handleChange}
          required
        />
        <input
          name="skillNeeded"
          placeholder="Skill You Want to Learn (e.g. React.js, UI Design)"
          value={formData.skillNeeded}
          onChange={handleChange}
          required
        />
        <button type="submit">Create Request</button>
        {status && <p className="status-msg">{status}</p>}
      </form>

      <h3 style={{ marginTop: '35px' }}>Recent Learning Requests</h3>
      <div className="requests-list">
        {requests.length === 0 ? (
          <p style={{ color: '#666', marginTop: '10px' }}>No requests yet.</p>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="request-card">
              <h4>{req.skillNeeded}</h4>
              <p><strong>Requested by:</strong> {req.studentName}</p>
              <p style={{ fontSize: '13px', color: '#777', marginTop: '4px' }}>
                Date: {req.createdAt || 'Recent'}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
