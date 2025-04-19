// auth-app/src/Login.jsx
import React, { useState, useContext } from 'react';
import { useMutation, gql } from '@apollo/client';
import { AuthContext } from './AuthContext';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        username
        email
        role
      }
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

const Login = () => {
  const { user, login, logout } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Login mutation hook
  const [executeLogin, { loading: loginLoading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      login(data.login.user, data.login.token);
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  // Logout mutation hook
  const [executeLogout, { loading: logoutLoading }] = useMutation(LOGOUT_MUTATION, {
    onCompleted: () => {
      logout();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    executeLogin({ variables: { email, password } });
  };

  const handleLogout = () => {
    executeLogout();
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      {!user ? (
        <>
          <h2>Login</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label>Email:</label>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Password:</label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required 
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            <button 
              type="submit"
              disabled={loginLoading}
              style={{
                padding: '10px 15px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </>
      ) : (
        <>
          <h2>Welcome, {user.username}</h2>
          <button 
            onClick={handleLogout}
            disabled={logoutLoading}
            style={{
              padding: '10px 15px',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            {logoutLoading ? 'Logging out...' : 'Logout'}
          </button>
        </>
      )}
    </div>
  );
};

export default Login;
