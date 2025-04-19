// auth-app/src/AuthenticationWrapper.jsx
import React from 'react';
import { ApolloProvider } from '@apollo/client';
import client from './apolloClient';
 import { AuthProvider } from './AuthContext';

const AuthenticationWrapper = ({ children }) => {
  return (
    <ApolloProvider client={client}>
       <AuthProvider>{children}</AuthProvider>
    
    </ApolloProvider>
  );
};

export default AuthenticationWrapper;
