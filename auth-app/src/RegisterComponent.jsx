// src/components/Register.jsx
import React, { useState, useContext } from 'react';
import { useMutation, gql } from '@apollo/client';
import { AuthContext } from './AuthContext';

const REGISTER_MUTATION = gql`
  mutation register($username: String!, $email: String!, $password: String!, $role: String!) {
    register(username: $username, email: $email, password: $password, role: $role) {
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

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'resident'
  });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  
  const [executeRegister, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: (data) => {
      login(data.signup.user, data.signup.token);
      // Optionally, redirect after signup
    },
    onError: (error) => {
      setError(error.message);
    }
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    executeRegister({ variables: formData });
  };
  
  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Username:</label>
          <input 
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input 
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input 
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Role:</label>
          <select name="role" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
            <option value="resident">Resident</option>
            <option value="business_owner">Business Owner</option>
            <option value="community_organizer">Community Organizer</option>
          </select>
        </div>
        <button 
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;
