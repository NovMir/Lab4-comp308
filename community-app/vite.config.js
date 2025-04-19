// community-app/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    
    federation({
      name: 'community-app',
      filename: 'remoteEntry.js',
      remotes: {
        auth: 'http://localhost:3001/assets/remoteEntry.js',
      },
      exposes: {
        './CommunityApp': './src/App.jsx',
        './Navbar': './src/components/Navbar.jsx',
        './PostsList': './src/components/PostsList.jsx',
        './HelpRequestsList': './src/components/HelpRequestsList.jsx',
        './CreatePost': './src/components/CreatePost.jsx',
        './CreateHelpRequest': './src/components/CreateHelpRequest.jsx',
        './AIChatBot': './src/components/AIChatBot.jsx',
        './AIAssistantPage': './src/components/AIAssistantPage.jsx',
      },
      shared: ['react', 'react-dom', 'react-router-dom', '@apollo/client', 'graphql'],
    }),
  ],
  server: {
    port: 3002,
    strictPort: true,
  },
  preview: {
    port: 3002,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions:{
      external:['auth/AuthContext']
    }
  },
});