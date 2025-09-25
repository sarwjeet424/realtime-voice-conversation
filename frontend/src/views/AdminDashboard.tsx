import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../AdminPanel.css';

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

export default function AdminDashboard() {
  const [credentials, setCredentials] = useState<UserCredentials[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [activeTab, setActiveTab] = useState<'credentials' | 'sessions'>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [credentialForm, setCredentialForm] = useState({ email: '', password: '', isActive: true, sessionLimit: 1 });
  const [editingCredential, setEditingCredential] = useState<UserCredentials | null>(null);
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

  const authFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const accessToken = localStorage.getItem('adminAccessToken');
    const headers = new Headers(init?.headers || {});
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('Content-Type', 'application/json');
    const doFetch = () => fetch(input, { ...init, headers });
    let res = await doFetch();
    if (res.status !== 401) return res;
    const cached = { input, init: { ...init, headers: Object.fromEntries(headers as any) } };
    const refreshed = await refreshTokens();
    if (!refreshed) return res;
    const newAccess = localStorage.getItem('adminAccessToken');
    const h2 = new Headers(cached.init?.headers as any);
    if (newAccess) h2.set('Authorization', `Bearer ${newAccess}`);
    return fetch(cached.input, { ...(cached.init || {}), headers: h2 });
  };

  const refreshTokens = async () => {
    const rt = localStorage.getItem('adminRefreshToken');
    if (!rt) return false;
    try {
      const res = await fetch(`${API_BASE}/admin/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('adminAccessToken', data.accessToken);
        localStorage.setItem('adminRefreshToken', data.refreshToken);
        return true;
      }
    } catch (_e) {}
    logout();
    return false;
  };

  useEffect(() => {
    fetchCredentials();
    fetchSessions();
  }, []);

  const logout = () => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    navigate('/admin/login', { replace: true });
  };

  const fetchCredentials = async () => {
    try {
      const response = await authFetch(`${API_BASE}/admin/credentials`);
      const data = await response.json();
      if (data.success) setCredentials(data.data);
    } catch (_err) {}
  };

  const fetchSessions = async () => {
    try {
      const response = await authFetch(`${API_BASE}/admin/sessions`);
      const data = await response.json();
      if (data.success) setSessions(data.data);
    } catch (_err) {}
  };

  const handleCreateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`${API_BASE}/admin/credentials`, {
        method: 'POST',
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
    } catch (_err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredential) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`${API_BASE}/admin/credentials/${editingCredential.email}`, {
        method: 'PUT',
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
    } catch (_err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCredential = async (email: string) => {
    if (!window.confirm(`Are you sure you want to delete credentials for ${email}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`${API_BASE}/admin/credentials/${email}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setSuccess('Credential deleted successfully');
        fetchCredentials();
      } else {
        setError(data.message || 'Failed to delete credential');
      }
    } catch (_err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSessions = async (email: string) => {
    if (!window.confirm(`Are you sure you want to reset sessions for ${email}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`${API_BASE}/admin/credentials/${email}/reset-sessions`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSuccess('Sessions reset successfully');
        fetchCredentials();
      } else {
        setError(data.message || 'Failed to reset sessions');
      }
    } catch (_err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSessionStatus = async (email: string, isActive: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`${API_BASE}/admin/sessions/${email}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(`Session ${isActive ? 'activated' : 'deactivated'} successfully`);
        fetchSessions();
      } else {
        setError(data.message || 'Failed to update session status');
      }
    } catch (_err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (email: string) => {
    if (!window.confirm(`Are you sure you want to delete session for ${email}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`${API_BASE}/admin/sessions/${email}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setSuccess('Session deleted successfully');
        fetchSessions();
      } else {
        setError(data.message || 'Failed to delete session');
      }
    } catch (_err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditingCredential = (credential: UserCredentials) => {
    setEditingCredential(credential);
    setCredentialForm({
      email: credential.email,
      password: credential.password,
      isActive: credential.isActive,
      sessionLimit: credential.sessionLimit,
    });
  };

  const cancelEditing = () => {
    setEditingCredential(null);
    setCredentialForm({ email: '', password: '', isActive: true, sessionLimit: 1 });
  };

  const formatDate = (date?: string | Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const formatTimestamp = (timestamp: number) => new Date(timestamp).toLocaleString();

  const getTimeRemaining = (startTime: number) => {
    const now = Date.now();
    const sessionDuration = 5 * 60 * 1000;
    const remaining = Math.max(0, startTime + sessionDuration - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <button onClick={logout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === 'credentials' ? 'active' : ''} onClick={() => setActiveTab('credentials')}>
          User Credentials
        </button>
        <button className={activeTab === 'sessions' ? 'active' : ''} onClick={() => setActiveTab('sessions')}>
          Active Sessions
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {activeTab === 'credentials' && (
        <div className="credentials-section">
          <div className="section-header">
            <h2>User Credentials</h2>
            <button onClick={() => setEditingCredential(null)} className="add-btn">Add New Credential</button>
          </div>

          <form onSubmit={editingCredential ? handleUpdateCredential : handleCreateCredential} className="credential-form">
            <div className="form-row">
              <div className="form-group">
                <label>Username:</label>
                <input type="text" value={credentialForm.email} onChange={(e) => setCredentialForm({ ...credentialForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Password:</label>
                <input type="password" value={credentialForm.password} onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Session Limit:</label>
                <input type="number" value={credentialForm.sessionLimit} onChange={(e) => setCredentialForm({ ...credentialForm, sessionLimit: parseInt(e.target.value) || 1 })} min="1" required />
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" checked={credentialForm.isActive} onChange={(e) => setCredentialForm({ ...credentialForm, isActive: e.target.checked })} />
                  Active
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={loading}>{editingCredential ? 'Update' : 'Create'}</button>
                {editingCredential && (<button type="button" onClick={cancelEditing}>Cancel</button>)}
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
                      <button onClick={() => startEditingCredential(cred)} className="edit-btn">Edit</button>
                      <button onClick={() => handleResetSessions(cred.email)} className="reset-btn">Reset Sessions</button>
                      <button onClick={() => handleDeleteCredential(cred.email)} className="delete-btn">Delete</button>
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
            <button onClick={fetchSessions} className="refresh-btn">Refresh</button>
          </div>

          <div className="sessions-table">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
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
                        <button onClick={() => handleUpdateSessionStatus(session.email, !session.isActive)} className={session.isActive ? 'deactivate-btn' : 'activate-btn'}>
                          {session.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDeleteSession(session.email)} className="delete-btn">Delete</button>
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
}


