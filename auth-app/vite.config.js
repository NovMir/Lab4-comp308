import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    federation({
      name: 'auth',
      filename: 'remoteEntry.js',
      exposes: {
        './LoginComponent': './src/LoginComponent.jsx',
        './RegisterComponent': './src/RegisterComponent.jsx',
        './AuthContext': './src/AuthContext.jsx',
        './AuthenticationWrapper': './src/AuthenticationWrapper.jsx',
        './App': './src/App.jsx',
      },
      shared:[
        'react',
        'react-dom',
        '@apollo/client',
        'graphql',
        'react-router-dom',
      
      ],
    }),
  ],
      server:{
        port: 3001,
        origin: 'http://localhost:3001',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
      },
        build: {
          target: 'esnext',
          minify: false,
          cssCodeSplit: false,
          modulePreload: false,
        },
      
    });
