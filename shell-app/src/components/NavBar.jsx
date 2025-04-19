// shell-app/src/components/NavBar.jsx
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from 'auth/AuthContext';

function NavBar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if user can create posts - removing role check
  // const canCreatePosts = user && ['business_owner', 'community_organizer'].includes(user.role);
  
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
        <Link className="navbar-brand" to="/">Community Platform</Link>
        <div className="navbar-nav">
          {user ? (
            <>
              <Link className="nav-link" to="/posts">Posts</Link>
              <Link className="nav-link" to="/help-requests">Help Requests</Link>
              <Link className="nav-link" to="/ai-assistant">AI Assistant</Link>
              
              {/* Show "Create Post" for all users */}
              <Link className="nav-link" to="/create-post">Create Post</Link>
              
              {/* Any user can create help requests */}
              <Link className="nav-link" to="/create-help-request">Request Help</Link>
              
              <span className="nav-link">Welcome, {user.username} ({user.role})</span>
              <button onClick={handleLogout} className="nav-link">Logout</button>
            </>
          ) : (
            <>
              <Link className="nav-link" to="/login">Login</Link>
              <Link className="nav-link" to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;