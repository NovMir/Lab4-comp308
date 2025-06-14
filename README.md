# Lab4-comp308

## Features

### Auth App
- User registration and login
- Role-based access control
- JWT-based authentication

### Community App
- Create, update, and delete community posts
- Manage help requests
- AI-powered chatbot for community assistance using LangChain and Gemini AI

### Microservices
- Authentication microservice
- Community engagement microservice
- Gateway for federated GraphQL schema

### Shell App
- Integrates `auth-app` and `community-app` using module federation
- Provides a unified user interface

## Getting Started

### Prerequisites
- Node.js (v16 or later)
- MongoDB (for backend services)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd community-engagement

### Install dependencies for each app
cd auth-app && npm install
cd ../community-app && npm install
cd ../microservices && npm install
cd ../shell-app && npm install

## Running the application
cd microservices
npm run start:auth
npm run start:community
npm run start:gateway

## Start the apps
cd auth-app && npm run deploy
cd ../community-app && npm run deploy
cd ../shell-app && npm run dev