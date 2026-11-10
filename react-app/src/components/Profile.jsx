import { useState, useEffect } from 'react';

export default function Profile() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [loginData, setLoginData] = useState({ usernameOrEmail: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [profileDetails, setProfileDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch full profile data whenever currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setProfileDetails(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profile?username=${encodeURIComponent(currentUser.name)}`);
        const data = await res.json();
        setProfileDetails(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: 'info', text: 'Signing in...' });
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: 'Signed in successfully!' });
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setLoginData({ usernameOrEmail: '', password: '' });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Invalid credentials.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Unable to connect to server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: 'info', text: 'Creating student account...' });
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: 'Account created successfully!' });
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setRegisterData({ name: '', email: '', password: '' });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Registration failed.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Unable to connect to server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setProfileDetails(null);
    setStatusMsg({ type: '', text: '' });
  };

  const handleDemoFill = () => {
    setLoginData({
      usernameOrEmail: 'Raghava',
      password: 'password123'
    });
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase())
      .join('')
      .slice(0, 2) || 'ST';
  };

  return (
    <section>
      <h2>Profile</h2>

      {!currentUser ? (
        <div className="auth-container">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('login');
                setStatusMsg({ type: '', text: '' });
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register');
                setStatusMsg({ type: '', text: '' });
              }}
            >
              Register
            </button>
          </div>

          {authMode === 'login' ? (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <h3>Student Sign In</h3>
              <p className="auth-subtitle">
                Sign in to manage your profile, offered skills, and learning requests.
              </p>

              <div className="form-group">
                <label htmlFor="react-login-username">Username or Email</label>
                <input
                  id="react-login-username"
                  type="text"
                  placeholder="e.g. Raghava or raghava@campus.edu"
                  value={loginData.usernameOrEmail}
                  onChange={(e) => setLoginData({ ...loginData, usernameOrEmail: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="react-login-password">Password</label>
                <input
                  id="react-login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>

              <div className="auth-demo-box">
                <p>
                  <strong>Demo Account:</strong> User: <code>Raghava</code> | Pass: <code>password123</code>
                </p>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleDemoFill}
                >
                  Fill Demo Credentials
                </button>
              </div>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              {statusMsg.text && (
                <p
                  className="status-msg"
                  style={{
                    color: statusMsg.type === 'error' ? '#dc2626' : statusMsg.type === 'info' ? '#1e3a8a' : '#16a34a'
                  }}
                >
                  {statusMsg.text}
                </p>
              )}

              <p className="auth-switch-text">
                Don't have an account yet?{' '}
                <a
                  href="#register"
                  onClick={(e) => {
                    e.preventDefault();
                    setAuthMode('register');
                    setStatusMsg({ type: '', text: '' });
                  }}
                >
                  Create one here
                </a>
              </p>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              <h3>Create Student Account</h3>
              <p className="auth-subtitle">
                Join the Campus Skill Exchange community today.
              </p>

              <div className="form-group">
                <label htmlFor="react-register-name">Full Name</label>
                <input
                  id="react-register-name"
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="react-register-email">Student Email</label>
                <input
                  id="react-register-email"
                  type="email"
                  placeholder="e.g. alex@campus.edu"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="react-register-password">Password</label>
                <input
                  id="react-register-password"
                  type="password"
                  placeholder="Create a password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              {statusMsg.text && (
                <p
                  className="status-msg"
                  style={{
                    color: statusMsg.type === 'error' ? '#dc2626' : statusMsg.type === 'info' ? '#1e3a8a' : '#16a34a'
                  }}
                >
                  {statusMsg.text}
                </p>
              )}

              <p className="auth-switch-text">
                Already have an account?{' '}
                <a
                  href="#login"
                  onClick={(e) => {
                    e.preventDefault();
                    setAuthMode('login');
                    setStatusMsg({ type: '', text: '' });
                  }}
                >
                  Sign in
                </a>
              </p>
            </form>
          )}
        </div>
      ) : (
        <div className="profile-card">
          <div className="profile-header-bar">
            <div className="profile-avatar-block">
              <div className="avatar-badge">{getInitials(profileDetails?.name || currentUser.name)}</div>
              <div>
                <h3>{profileDetails?.name || currentUser.name}</h3>
                <p className="profile-email-text">
                  {profileDetails?.email || currentUser.email || `${(currentUser.name || 'student').toLowerCase()}@campus.edu`}
                </p>
                <span className="user-role-badge">Student Member</span>
              </div>
            </div>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stat-box">
              <span className="stat-number">{profileDetails?.skillsOffered ?? currentUser.skillsOffered ?? 0}</span>
              <span className="stat-label">Skills Offered</span>
            </div>
            <div className="profile-stat-box">
              <span className="stat-number">{profileDetails?.skillsLearning ?? currentUser.skillsLearning ?? 0}</span>
              <span className="stat-label">Skills Learning</span>
            </div>
          </div>

          <div className="profile-sections">
            <div className="profile-sub-section">
              <h4>Skills You Teach</h4>
              <div className="user-items-list">
                {profileDetails?.mySkills && profileDetails.mySkills.length > 0 ? (
                  profileDetails.mySkills.map((skill) => (
                    <div key={skill.id} className="user-item-pill">
                      <strong>{skill.skillName}</strong> ({skill.level})
                      <span className="user-pill-tag">{skill.category}</span>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">You haven't offered any skills yet.</p>
                )}
              </div>
            </div>

            <div className="profile-sub-section">
              <h4>Your Learning Requests</h4>
              <div className="user-items-list">
                {profileDetails?.myRequests && profileDetails.myRequests.length > 0 ? (
                  profileDetails.myRequests.map((req) => (
                    <div key={req.id} className="user-item-pill">
                      <strong>{req.skillNeeded}</strong>
                      <span className="user-pill-date">{req.createdAt || 'Recent'}</span>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">You haven't posted any learning requests yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
