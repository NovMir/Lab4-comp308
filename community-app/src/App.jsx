// community-app/src/App.jsx
import React from 'react';
import CreateHelpRequest from './components/CreateHelpRequest';
import Navbar from './components/Navbar';
import PostsList from './components/PostsList';
import CreatePost from './components/CreatePost';
import AIChatBot from './components/AIChatBot';
import AIAssistantPage from './components/AIAssistantPage';

// Export each component individually for the shell to consume
export { 
  CreateHelpRequest, 
  Navbar, 
  PostsList, 
  CreatePost,
  AIChatBot,
  AIAssistantPage
};

// Optionally provide a default export that renders them all for local testing:
const App = () => {
  return (
    <div>
      <Navbar />
      <PostsList />
      <CreateHelpRequest />
      <CreatePost />
      <AIChatBot />
    </div>
  );
};

export default App;