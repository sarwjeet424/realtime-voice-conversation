import React, { useState, useEffect } from "react";

export default function Login() {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

  // Socket will be established later only on conversation start

  useEffect(() => {
    if (authenticated) {
      window.location.href = "/conversation";
    }
  }, [authenticated]);

  const handleAuthenticate = async () => {
    if (!email.trim() || !password.trim()) return;
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (data.success && data.accessToken) {
        localStorage.setItem('userAccessToken', data.accessToken);
        // store credentials for socket authentication on conversation start
        sessionStorage.setItem('userEmail', email.trim());
        sessionStorage.setItem('userPassword', password.trim());
        setAuthenticated(true);
      } else {
        setAuthError(data.message || 'Login failed');
      }
    } catch (_e) {
      setAuthError('Network error');
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Voice Assistant</h1>
      </header>
      <section className="auth-section">
        <div className="auth-container">
          <h2>Authentication Required</h2>
          {authError && (
            <div className="auth-error">
              <p>❌ {authError}</p>
            </div>
          )}
          <div className="auth-form">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="email-input"
            />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAuthenticate()}
              className="password-input"
            />
            <button
              onClick={handleAuthenticate}
              className="auth-button"
            >
              Start Session
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}


