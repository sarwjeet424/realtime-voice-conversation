import React, { useState } from 'react';
import './AdminPanel.css';

interface UserCredentials {
  id?: number;
  email: string;
  password: string;
  isActive: boolean;
  sessionLimit: number;
  sessionsUsed: number;
  lastUsed?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface UserSession {
  email: string;
  startTime: number;
  lastActivity: number;
  messageCount: number;
  isActive: boolean;
}

const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState<UserCredentials[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [activeTab, setActiveTab] = useState<'credentials' | 'sessions'>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [credentialForm, setCredentialForm] = useState({
    email: '',
    password: '',
    isActive: true,
    sessionLimit: 1
  });
  const [editingCredential, setEditingCredential] = useState<UserCredentials | null>(null);

  const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

  // Admin login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();
      
      if (data.success && data.isAdmin) {
        setIsAuthenticated(true);
        setSuccess('Admin login successful');
        fetchCredentials();
        fetchSessions();
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch credentials
  const fetchCredentials = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/credentials`);
      const data = await response.json();
      if (data.success) {
        setCredentials(data.data);
      } else {
        console.error('Failed to fetch credentials:', data);
      }
    } catch (err) {
      console.error('Error fetching credentials:', err);
    }
  };

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/sessions`);
      const data = await response.json();
      console.log('Fetched sessions data:', data);
      if (data.success) {
        setSessions(data.data);
        console.log('Set sessions:', data.data);
      } else {
        console.error('Failed to fetch sessions:', data);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  // Create credential
  const handleCreateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentialForm),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Credential created successfully');
        setCredentialForm({ email: '', password: '', isActive: true, sessionLimit: 1 });
        fetchCredentials();
      } else {
        setError(data.message || 'Failed to create credential');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update credential
  const handleUpdateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredential) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/credentials/${editingCredential.email}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentialForm),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Credential updated successfully');
        setEditingCredential(null);
        setCredentialForm({ email: '', password: '', isActive: true, sessionLimit: 1 });
        fetchCredentials();
      } else {
        setError(data.message || 'Failed to update credential');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete credential
  const handleDeleteCredential = async (email: string) => {
    if (!window.confirm(`Are you sure you want to delete credentials for ${email}?`)) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/credentials/${email}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Credential deleted successfully');
        fetchCredentials();
      } else {
        setError(data.message || 'Failed to delete credential');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset sessions
  const handleResetSessions = async (email: string) => {
    if (!window.confirm(`Are you sure you want to reset sessions for ${email}?`)) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/credentials/${email}/reset-sessions`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Sessions reset successfully');
        fetchCredentials();
      } else {
        setError(data.message || 'Failed to reset sessions');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update session status
  const handleUpdateSessionStatus = async (email: string, isActive: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/sessions/${email}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Session ${isActive ? 'activated' : 'deactivated'} successfully`);
        fetchSessions();
      } else {
        setError(data.message || 'Failed to update session status');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (email: string) => {
    if (!window.confirm(`Are you sure you want to delete session for ${email}?`)) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/sessions/${email}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Session deleted successfully');
        fetchSessions();
      } else {
        setError(data.message || 'Failed to delete session');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start editing credential
  const startEditingCredential = (credential: UserCredentials) => {
    setEditingCredential(credential);
    setCredentialForm({
      email: credential.email,
      password: credential.password,
      isActive: credential.isActive,
      sessionLimit: credential.sessionLimit
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCredential(null);
    setCredentialForm({ email: '', password: '', isActive: true, sessionLimit: 1 });
  };

  // Format date
  const formatDate = (date?: string | Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Calculate time remaining
  const getTimeRemaining = (startTime: number) => {
    const now = Date.now();
    const sessionDuration = 5 * 60 * 1000; // 5 minutes
    const remaining = Math.max(0, startTime + sessionDuration - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-login-container">
          <h1>Admin Panel</h1>
          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <button onClick={() => setIsAuthenticated(false)} className="logout-btn">
          Logout
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={activeTab === 'credentials' ? 'active' : ''}
          onClick={() => setActiveTab('credentials')}
        >
          User Credentials
        </button>
        <button
          className={activeTab === 'sessions' ? 'active' : ''}
          onClick={() => setActiveTab('sessions')}
        >
          Active Sessions
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {activeTab === 'credentials' && (
        <div className="credentials-section">
          <div className="section-header">
            <h2>User Credentials</h2>
            <button onClick={() => setEditingCredential(null)} className="add-btn">
              Add New Credential
            </button>
          </div>

          <form onSubmit={editingCredential ? handleUpdateCredential : handleCreateCredential} className="credential-form">
            <div className="form-row">
              <div className="form-group">
              <label>Username:</label>
                <input
                type="text"
                  value={credentialForm.email}
                  onChange={(e) => setCredentialForm({ ...credentialForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={credentialForm.password}
                  onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Session Limit:</label>
                <input
                  type="number"
                  value={credentialForm.sessionLimit}
                  onChange={(e) => setCredentialForm({ ...credentialForm, sessionLimit: parseInt(e.target.value) || 1 })}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={credentialForm.isActive}
                    onChange={(e) => setCredentialForm({ ...credentialForm, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={loading}>
                  {editingCredential ? 'Update' : 'Create'}
                </button>
                {editingCredential && (
                  <button type="button" onClick={cancelEditing}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="credentials-table">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Active</th>
                  <th>Session Limit</th>
                  <th>Sessions Used</th>
                  <th>Last Used</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred: UserCredentials) => (
                  <tr key={cred.email}>
                    <td>{cred.email}</td>
                    <td>{cred.password}</td>
                    <td>
                      <span className={`status ${cred.isActive ? 'active' : 'inactive'}`}>
                        {cred.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{cred.sessionLimit}</td>
                    <td>{cred.sessionsUsed}</td>
                    <td>{formatDate(cred.lastUsed)}</td>
                    <td>{formatDate(cred.createdAt)}</td>
                    <td>
                      <button onClick={() => startEditingCredential(cred)} className="edit-btn">
                        Edit
                      </button>
                      <button onClick={() => handleResetSessions(cred.email)} className="reset-btn">
                        Reset Sessions
                      </button>
                      <button onClick={() => handleDeleteCredential(cred.email)} className="delete-btn">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="sessions-section">
          <div className="section-header">
            <h2>All Sessions (Previous & Current)</h2>
            <button onClick={fetchSessions} className="refresh-btn">
              Refresh
            </button>
          </div>

          <div className="sessions-table">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Start Time</th>
                  <th>Last Activity</th>
                  <th>Message Count</th>
                  <th>Time Remaining</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                      No sessions found. Sessions will appear here when users start conversations.
                    </td>
                  </tr>
                ) : (
                  sessions.map((session: UserSession, index: number) => (
                    <tr key={`${session.email}-${index}`}>
                      <td>{session.email}</td>
                      <td>{formatTimestamp(session.startTime)}</td>
                      <td>{formatTimestamp(session.lastActivity)}</td>
                      <td>{session.messageCount}</td>
                      <td>{getTimeRemaining(session.startTime)}</td>
                      <td>
                        <span className={`status ${session.isActive ? 'active' : 'inactive'}`}>
                          {session.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleUpdateSessionStatus(session.email, !session.isActive)}
                          className={session.isActive ? 'deactivate-btn' : 'activate-btn'}
                        >
                          {session.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDeleteSession(session.email)} className="delete-btn">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;