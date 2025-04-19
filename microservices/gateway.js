// gateway/index.js
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } = require('@apollo/gateway');
const cors = require('cors');
require('dotenv').config();

// Custom data source that forwards the authorization header
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (context.token) {
      // Ensure the token is properly formatted as a Bearer token
      const formattedToken = context.token.startsWith('Bearer ') ? context.token : `Bearer ${context.token}`;
      request.http.headers.set('authorization', formattedToken);
    }
  }
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'auth', url: process.env.AUTH_URL || 'http://localhost:4000/graphql' },
      { name: 'community', url: process.env.COMMUNITY_URL || 'http://localhost:4001/graphql' },

    ],
  }),
  buildService({ name, url }) {
    return new AuthenticatedDataSource({ url });
  },
});

async function startGateway() {
  const app = express();

  app.use(express.json());
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002','https://studio.apollographql.com'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
  // Create the Apollo Server instance with your gateway
  const server = new ApolloServer({
    gateway,
    subscriptions: false,
    context: ({ req }) => {
      return { token: req.headers.authorization || '' };
    },
  });

  // Start the Apollo Server
  await server.start();
  // Apply Apollo middleware to the Express app
  server.applyMiddleware({ app, path: '/graphql', cors: false });

  const port = process.env.GATEWAY_PORT || 4002;
  app.listen(port, () => {
    console.log(`🚀 Gateway ready at http://localhost:${port}${server.graphqlPath}`);
  });
}

startGateway().catch((error) => {
  console.error('Error starting gateway:', error);
});
