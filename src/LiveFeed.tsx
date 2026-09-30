import React from 'react';

// This is a "Mock" (fake) list of safety incidents to show on your feed
const MOCK_INCIDENTS = [
  {
    id: 1,
    type: '🔴 Urgent',
    location: 'Main St & 5th Ave',
    description: 'Report of a heavy water leak blocking traffic.',
    time: '2 mins ago'
  },
  {
    id: 2,
    type: '🟡 Warning',
    location: 'Oak Park',
    description: 'Streetlight is flickering and dim. Be careful walking after dark.',
    time: '15 mins ago'
  },
  {
    id: 3,
    type: '🟢 Update',
    location: 'Community Center',
    description: 'Safety meeting starting at 6 PM tonight.',
    time: '1 hour ago'
  }
];

const LiveFeed = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Live Safety Feed</h1>
      
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        {MOCK_INCIDENTS.map((incident) => (
          <div key={incident.id} style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '15px',
            marginBottom: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: incident.type.includes('🔴') ? '5px solid red' : '5px solid #ffcc00'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold' }}>{incident.type}</span>
              <span style={{ fontSize: '0.8rem', color: '#888' }}>{incident.time}</span>
            </div>
            <p style={{ margin: '5px 0', fontWeight: 'bold' }}>📍 {incident.location}</p>
            <p style={{ margin: '0', color: '#555' }}>{incident.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed;