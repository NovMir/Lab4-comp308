import React, { lazy, Suspense, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import { AuthContext } from 'auth/AuthContext';

// Import auth-app remote components
const Login = lazy(() => import('auth/LoginComponent'));
const Register = lazy(() => import('auth/RegisterComponent'));

// Import community-app remote components
const PostsList = lazy(() => import('community/PostsList'));
const CreatePost = lazy(() => import('community/CreatePost'));
const CreateHelpRequest = lazy(() => import('community/CreateHelpRequest'));
const HelpRequestsList = lazy(() => import('community/HelpRequestsList'));
const AIAssistantPage = lazy(() => import('community/AIAssistantPage'));

function App() {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div>Loading authentication state...</div>;
  
  // Check if user has permission to create posts
  const canCreatePosts = user && ['business_owner', 'community_organizer'].includes(user.role);
    
  console.log('User information:', user);
  console.log('User role:', user?.role);
  console.log('Can create posts:', canCreatePosts);
  
  return (
    <div>
      <NavBar canCreatePosts={canCreatePosts} />
      <Suspense fallback={<div>Loading view...</div>}>
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/posts" element={<PostsList />} />
              <Route path="/help-requests" element={<HelpRequestsList />} />
              <Route path="/create-help-request" element={<CreateHelpRequest />} />
              <Route path="/ai-assistant" element={<AIAssistantPage />} />
              
              {/* Conditionally render create-post route based on role */}
              {canCreatePosts && (
                <Route path="/create-post" element={<CreatePost user={user} canCreatePosts={canCreatePosts} />} />
              )}
              
              {/* Redirect to posts as default page */}
              <Route path="*" element={<Navigate to="/posts" replace />} />
            </>
          )}
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;