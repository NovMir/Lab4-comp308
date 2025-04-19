// scripts/generateEmbeddings.js
import dotenv from 'dotenv';
dotenv.config();
const mongoose = require('mongoose');
const { generateEmbeddingsForPosts } = require('../services/aiAgent');

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Generate embeddings for all posts that don't have them
    console.log('Starting to generate embeddings for posts...');
    await generateEmbeddingsForPosts();
    
    console.log('Embedding generation completed successfully');
  } catch (error) {
    console.error('Error generating embeddings:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
main();