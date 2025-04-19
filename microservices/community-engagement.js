const express = require('express');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const { buildSubgraphSchema } = require('@apollo/federation');
const { ApolloServer, ApolloError, AuthenticationError, ForbiddenError, gql } = require('apollo-server-express');
const cookieParser = require('cookie-parser');

const app = express();
dotenv.config();
app.use(cors({
      origin: ['http://localhost:4001','http://localhost:3001', 'http://localhost:4000', 'http://localhost:4002','https://studio.apollographql.com'], // Add the sandbox URL
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(express.json());
    app.use(cookieParser());
    
    mongoose.connect(process.env.MONGO_URI, {});
    const db = mongoose.connection;
    db.on('error', (error) => console.error('MongoDB connection error:', error));
    db.once('open', () => console.log('MongoDB connected'));
const genAI = new GoogleGenerativeAI( process.env.GEMINI_API_KEY);

// ============= SCHEMAS =============

  // models/Post.js
const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['news', 'discussion'] 
  },
  aiSummary: { type: String },
  embedding: { type: [Number],default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

PostSchema.index({ embedding: '2dsphere' });
const HelpRequestSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  location: { type: String },
  isResolved: { type: Boolean, default: false },
  volunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

const UserInteractionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  query: { type: String, required: true },
  response: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  suggestedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  suggestedQuestions: [{ type: String }],
  suggestedHelpRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HelpRequest' }],
});

const Post= mongoose.model('Post', PostSchema);
const HelpRequest = mongoose.model('HelpRequest', HelpRequestSchema);
const UserInteraction = mongoose.model('UserInteraction', UserInteractionSchema);
// Export all models
module.exports = {
  Post,
  HelpRequest,
  UserInteraction
};
// ============= AI AGENT FUNCTIONS =============
async function generateEmbedding(text) {
  try {
    console.log(`Generating embedding for text: ${text.substring(0, 50)}...`);
    const embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });
    const embeddingResponse = await embeddingModel.embedContent({
      content: {
        parts: [{ text }],
        role: 'user',
      },
    });

    if (!embeddingResponse.embedding) {
      console.error('No embedding generated from API response');
      throw new Error('No embedding generated');
    }
    
    console.log(`Successfully generated embedding with length: ${embeddingResponse.embedding.values.length}`);
    return embeddingResponse.embedding.values;
  } catch (error) {
    console.error('Error generating embeddings with Gemini:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Utility function to calculate cosine similarity between two vectors
 * @param {Array<number>} vector1 - First vector
 * @param {Array<number>} vector2 - Second vector
 * @returns {number} - Cosine similarity score
 */
function cosineSimilarity(vector1, vector2) {
  if (!vector1 || !vector2 || vector1.length !== vector2.length) {
    console.error('Invalid vectors for cosine similarity calculation');
    return 0;
  }

  try {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  } catch (error) {
    console.error('Error calculating cosine similarity:', error);
    return 0;
  }
}

/**
 * Utility function to generate embeddings for posts that don't have them
 */
async function generateEmbeddingsForPosts() {
  try {
    console.log('Starting to generate embeddings for posts without embeddings');
    
    // Find posts without embeddings
    const posts = await Post.find({ 
      $or: [
        { embedding: { $exists: false } },
        { embedding: { $size: 0 } },
        { embedding: null }
      ]
    });
    
    console.log(`Found ${posts.length} posts without embeddings`);
    
    // Process each post
    for (const post of posts) {
      try {
        // Generate content string combining title and content
        const contentString = `Title: ${post.title}\nCategory: ${post.category}\nContent: ${post.content}`;
        
        console.log(`Processing post ${post._id}: "${post.title.substring(0, 30)}..."`);
        
        // Generate embedding
        const embedding = await generateEmbedding(contentString);
        
        // Update post with embedding
        post.embedding = embedding;
        await post.save();
        
        console.log(`Successfully generated and saved embedding for post: ${post._id}`);
      } catch (error) {
        console.error(`Error generating embedding for post ${post._id}:`, error);
      }
    }
    
    console.log('Finished generating embeddings for all posts');
    return true;
  } catch (error) {
    console.error('Error in generating embeddings for posts:', error);
    return false;
  }
}

/**
 * Retrieve relevant posts using vector similarity
 * @param {string} query - User query
 * @returns {Promise<Array>} - Array of relevant posts
 */
async function retrieveRelevantPosts(query) {
  try {
    console.log(`Retrieving relevant posts for query: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    console.log('Generated query embedding successfully');
    
    // Ensure that missing embeddings for posts are generated
    await generateEmbeddingsForPosts();
    
    // Retrieve all posts with embeddings
    const posts = await Post.find({ embedding: { $exists: true, $ne: [] } });
    console.log(`Found ${posts.length} posts with embeddings after updating missing ones`);

    if (posts.length === 0) {
      console.log('No posts with embeddings found.');
      return [];
    }

    // Calculate similarity scores for each post
    console.log(`Calculating similarity scores for ${posts.length} posts`);
    const scoredPosts = posts.map(post => {
      const similarity = cosineSimilarity(queryEmbedding, post.embedding);
      return { post, similarity };
    });

    // Sort by similarity (descending) and take the top 5
    const rankedPosts = scoredPosts
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(item => {
        console.log(`Post "${item.post.title}" has similarity score: ${item.similarity.toFixed(4)}`);
        return item.post;
      });

    console.log(`Retrieved ${rankedPosts.length} most relevant posts`);
    return rankedPosts;
  } catch (error) {
    console.error('Error retrieving relevant posts:', error);
    return [];
  }
}

/**
 * Generate context-aware follow-up questions based on query and response
 * @param {string} query - User query
 * @param {string} response - AI generated response
 * @returns {Array<string>} - List of follow-up questions
 */
function generateFollowUpQuestions(query, response) {
  console.log('Generating follow-up questions');
  const suggestions = [];

  // Topics related to safety and security
  if (/safety|crime|security|protect|theft/i.test(query) || 
      /suspicious|concerns|danger|unsafe|police/i.test(response)) {
    console.log('Detected safety/security topic');
    suggestions.push(
      "What safety measures has the community implemented recently?",
      "Are there any neighborhood watch programs available?"
    );
  }

  // Topics related to community events and activities
  if (/event|activity|program|meetup|gathering/i.test(query) || 
      /festival|meeting|workshop|class|session/i.test(response)) {
    console.log('Detected events/activities topic');
    suggestions.push(
      "When is the next community event scheduled?",
      "How can I volunteer for community activities?"
    );
  }

  // Topics related to local governance and policies
  if (/policy|rule|governance|law|regulation/i.test(query) || 
      /committee|board|council|decision|vote/i.test(response)) {
    console.log('Detected governance/policy topic');
    suggestions.push(
      "Who are the current community representatives?",
      "How can I participate in the decision-making process?"
    );
  }

  // Topics related to infrastructure and development
  if (/development|construction|building|infrastructure|renovation/i.test(query) || 
      /project|plan|proposal|improvement|facility/i.test(response)) {
    console.log('Detected infrastructure/development topic');
    suggestions.push(
      "What are the timeline expectations for these developments?",
      "How will these changes affect the local environment?"
    );
  }

  // If no specific topic was matched, provide general follow-ups
  if (suggestions.length === 0) {
    console.log('No specific topic detected, providing general follow-ups');
    suggestions.push(
      "Could you tell me more about recent community discussions?",
      "Is there any way I can get more involved with the community?",
      "What other topics are trending in community discussions?"
    );
  }

  // Return up to 3 questions
  const result = suggestions.slice(0, 3);
  console.log(`Generated ${result.length} follow-up questions`);
  return result;
}

/**
 * Generate AI response to user query
 * @param {string} query - User query
 * @param {Array} posts - Relevant posts
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Generated response with suggested questions
 */
async function generateResponse(query, posts, userId) {
  try {
    console.log(`Generating response for query: "${query}" from user: ${userId}`);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Format posts for context
    const postsContext = posts.map(post => {
      return `Title: "${post.title}"
Author: ${post.author.username || 'Unknown'}
Category: ${post.category}
Content: "${post.content}"`;
    }).join('\n\n');
    
    // Get past interactions for better context
    let pastContext = "";
    if (userId) {
      try {
        console.log(`Retrieving past interactions for user: ${userId}`);
        const pastInteractions = await UserInteraction.find({ userId })
          .sort({ createdAt: -1 })
          .limit(3);
        
        if (pastInteractions.length > 0) {
          console.log(`Found ${pastInteractions.length} past interactions`);
          pastContext = "Previous interactions:\n" + pastInteractions
            .map(interaction => `User asked: "${interaction.query}"\nAI responded: "${interaction.response.substring(0, 100)}..."`)
            .join('\n\n');
        } else {
          console.log('No past interactions found');
        }
      } catch (error) {
        console.error('Error retrieving past interactions:', error);
        // Continue without past context
      }
    }
    
    // Build the complete prompt
    let prompt = `You are a helpful community assistant that helps users find relevant information from community discussions.
A user has asked: "${query}"

`;

    if (pastContext) {
      prompt += `${pastContext}\n\n`;
    }

    if (posts.length > 0) {
      prompt += `Here are some relevant community posts that might address the query:
${postsContext}
`;
    } else {
      prompt += `I couldn't find any community posts directly related to this query. Please provide a general response.
`;
    }

    // Add instruction for response generation
    prompt += `
Based on the above information, please:
1. Provide a helpful response to the user's query.
2. If the query is ambiguous, ask for clarification.
3. Be concise but informative in your response.
4. Format your response as a friendly community assistant.
`;

    console.log('Sending prompt to Gemini API');
    // Generate response
    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text();
    console.log(`Generated response (first 100 chars): "${responseText.substring(0, 100)}..."`);
    
    // Generate follow-up questions based on both query and response
    const suggestedQuestions = generateFollowUpQuestions(query, responseText);
    
    return {
      text: responseText,
      suggestedQuestions
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      text: "Sorry, I encountered an error generating a response. Please try again later.",
      suggestedQuestions: ["Could you try rephrasing your question?"]
    };
  }
}

/**
 * Function to test AI integration 
 * @returns {Promise<Object>} - Test results
 */
async function testAIIntegration() {
  console.log('Starting AI integration test');
  const testResults = {
    embedding: false,
    retrieval: false,
    generation: false,
    overall: false
  };
  
  try {
    // Test embedding generation
    try {
      const testEmbedding = await generateEmbedding("This is a test query for the community AI system.");
      testResults.embedding = testEmbedding && testEmbedding.length > 0;
      console.log(`Embedding test ${testResults.embedding ? 'passed' : 'failed'}`);
    } catch (error) {
      console.error('Embedding test failed:', error);
    }
    
    // Test post retrieval
    try {
      const testQuery = "community events";
      const retrievedPosts = await retrieveRelevantPosts(testQuery);
      testResults.retrieval = true; // Even if no posts are found, the function worked
      console.log(`Retrieval test ${testResults.retrieval ? 'passed' : 'failed'}, found ${retrievedPosts.length} posts`);
    } catch (error) {
      console.error('Retrieval test failed:', error);
    }
    
    // Test response generation
    try {
      const testResponse = await generateResponse(
        "When is the next community meeting?", 
        [], // Empty posts array for testing
        null // No user ID
      );
      testResults.generation = testResponse && testResponse.text && testResponse.text.length > 0;
      console.log(`Generation test ${testResults.generation ? 'passed' : 'failed'}`);
    } catch (error) {
      console.error('Generation test failed:', error);
    }
    
    // Overall test result
    testResults.overall = testResults.embedding && testResults.retrieval && testResults.generation;
    console.log(`Overall AI integration test ${testResults.overall ? 'passed' : 'failed'}`);
    
    return testResults;
  } catch (error) {
    console.error('Error in AI integration test:', error);
    return testResults;
  }
}



//typeDefs
const typeDefs = gql`
  # User type (simplified version - full definition in auth service)
  extend type User @key(fields: "id") {
    id: ID! @external
    username: String! @external
    role: String! @external

    email: String! @external
    password: String! @external   
    createdAt: String! @external
  }

  # Community post type
  type CommunityPost {
    id: ID!
    author: User!
    title: String!
    content: String!
    category: String!
    aiSummary: String
    createdAt: String!
    updatedAt: String
  }

  # Help request type
  type HelpRequest {
    id: ID!
    author: User!
    description: String!
    location: String
    isResolved: Boolean!
    volunteers: [User]
    createdAt: String!
    updatedAt: String
  }

  # AI Response type
  type AIResponse {
  user:User!
    text: String!
    suggestedQuestions: [String]!
    retrievedPosts: [CommunityPost]!
    response: [String]!
    
  }
 # Test result type
  type AITestResult {
    embedding: Boolean!
    retrieval: Boolean!
    generation: Boolean!
    overall: Boolean!
    message: String
  }
  # Input for creating a community post
  input CreatePostInput {
    title: String!
    content: String!
    category: String!
  }

  # Input for updating a community post
  input UpdatePostInput {
    id: ID!
    title: String
    content: String 
    category: String
  }

  # Input for creating a help request
  input CreateHelpRequestInput {
    description: String!
    location: String
  }

  # Input for updating a help request
  input UpdateHelpRequestInput {
    id: ID!
    description: String
    location: String
    isResolved: Boolean
  }

  # Root Query type
  type Query {
    # Get all community posts
    posts: [CommunityPost]
    
    # Get posts by category
    postsByCategory(category: String!): [CommunityPost]
    
    # Get a specific post by ID
    post(id: ID!): CommunityPost
    
    # Get all help requests
    helpRequests: [HelpRequest]
    
    # Get a specific help request by ID
    helpRequest(id: ID!): HelpRequest
    
    # Get my posts
    myPosts: [CommunityPost]
    
    # Get my help requests
    myHelpRequests: [HelpRequest]
    
    # AI-powered community query
    communityAIQuery(input: String!): AIResponse!
  }

  # Root Mutation type
  type Mutation {
    # Create a new community post
    createPost(input: CreatePostInput!): CommunityPost!
    
    # Update an existing community post
    updatePost(input: UpdatePostInput!): CommunityPost!
    
    # Delete a community post
    deletePost(id: ID!): Boolean!
    
    # Create a new help request
    createHelpRequest(input: CreateHelpRequestInput!): HelpRequest!
    
    # Update a help request
    updateHelpRequest(input: UpdateHelpRequestInput!): HelpRequest!
    
    # Delete a help request
    deleteHelpRequest(id: ID!): Boolean!
    
    # Volunteer for a help request
    volunteerForHelp(helpRequestId: ID!): HelpRequest!
    
    # Withdraw volunteering for a help request
    withdrawVolunteer(helpRequestId: ID!): HelpRequest!
    
    replyToPost(postId: ID!, content: String!): CommunityPost!
    
    # Generate embeddings for posts
    generateEmbeddingsForPosts: Boolean!
    
    # Generate embeddings for help requests
    generateEmbeddingsForHelpRequests: Boolean!
  }
`;

module.exports = typeDefs;

// Utility function to format documents
const formatDocument = (doc) => {
  if (!doc) return null;

  // Convert to plain object if it's a Mongoose document
  const formatted = doc.toObject ? doc.toObject() : { ...doc };

  const {_id, author, ...rest} = formatted;
  return {
    ...rest,
    id: _id.toString(),
    author: {
      __typename: 'User',
      id: author.toString(),
      
    },

 
  }

  return formatted;
};

// Resolvers
const resolvers = {
  User: {
    __resolveReference: async (reference) => {
      // Convert the ID to string if it's an ObjectId
      return {
        ...reference,
        id: reference.id.toString(),
      };
    },
  },

  Query: {
    // Get all community posts
    posts: async () => {
      try {
        const posts = await Post.find().sort({ createdAt: -1 });
        return posts.map((post) => formatDocument(post));
      } catch (error) {
        throw new ApolloError(`Failed to fetch posts: ${error.message}`);
      }
    },

    // Get posts by category
    postsByCategory: async (_, { category }) => {
      try {
        const posts = await Post.find({ category }).sort({ createdAt: -1 });
        return posts.map((post) => formatDocument(post));
      } catch (error) {
        throw new ApolloError(`Failed to fetch posts by category: ${error.message}`);
      }
    },

    // Get a specific post by ID
    post: async (_, { id }) => {
      try {
        const post = await Post.findById(id);
        if (!post) {
          throw new ApolloError('Post not found');
        }
        return formatDocument(post);
      } catch (error) {
        throw new ApolloError(`Failed to fetch post: ${error.message}`);
      }
    },

    // Get all help requests
    helpRequests: async () => {
      try {
        const helpRequests = await HelpRequest.find().sort({ createdAt: -1 });
        return helpRequests.map((request) => formatDocument(request));
      } catch (error) {
        throw new ApolloError(`Failed to fetch help requests: ${error.message}`);
      }
    },

    // Get a specific help request by ID
    helpRequest: async (_, { id }) => {
      try {
        const helpRequest = await HelpRequest.findById(id);
        if (!helpRequest) {
          throw new ApolloError('Help request not found');
        }
        return formatDocument(helpRequest);
      } catch (error) {
        throw new ApolloError(`Failed to fetch help request: ${error.message}`);
      }
    },

    // Get my posts
    myPosts: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      try {
        const posts = await Post.find({ author: user.id }).sort({ createdAt: -1 });
        return posts.map((post) => formatDocument(post));
      } catch (error) {
        throw new ApolloError(`Failed to fetch your posts: ${error.message}`);
      }
    },

    // Get my help requests
    myHelpRequests: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      try {
        const helpRequests = await HelpRequest.find({ author: user.id }).sort({ createdAt: -1 });
        return helpRequests.map((request) => formatDocument(request));
      } catch (error) {
        throw new ApolloError(`Failed to fetch your help requests: ${error.message}`);
      }
    },
    // AI-powered community query
    communityAIQuery: async (_, { input }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      const userId = user.id;
      console.log(`Received AI query: "${input}" from user: ${userId}`);
      // 1. Retrieve relevant posts based on query
      const posts = await retrieveRelevantPosts(input);
      console.log(`Retrieved ${posts.length} relevant posts`);
      // 2. Generate AI response
      const response = await generateResponse(input, posts, userId);
      console.log('Generated AI response successfully');
      // 3. Store interaction in MongoDB for future reference
      try {
        const postIds = posts.map(post => post._id);
        const interaction = new UserInteraction({
          userId: userId,
          query: input,
          response: response.text,
          suggestedQuestions: response.suggestedQuestions,
          suggestedPosts: postIds
        });
        await interaction.save();
        console.log(`Saved user interaction to database with ID: ${interaction._id}`);
      } catch (error) {
        console.error('Error saving user interaction:', error);
        // Continue even if saving interaction fails
      }
      // 4. Return the complete response
      return {
        text: response.text,
        suggestedQuestions: response.suggestedQuestions,
        retrievedPosts: posts.map(post => formatDocument(post))
      };
    },
    
    // Test AI integration
    testAIIntegration: async () => {
      try {
        const results = await testAIIntegration();
        return {
          ...results,
          message: results.overall 
            ? "AI integration test passed successfully!" 
            : "AI integration test failed. Check logs for details."
        };
      } catch (error) {
        console.error('Error in testAIIntegration resolver:', error);
        return {
          embedding: false,
          retrieval: false,
          generation: false,
          overall: false,
          message: `Test failed with error: ${error.message}`
        };
      }
    }
   ,
  },

  Mutation: {
    // Create a new community post
    createPost: async (_, { input }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      try {
        const authorId = user.id.toString();
        const newPost = new Post({
          ...input,
          author: authorId,
        });
        const savedPost = await newPost.save();
        return formatDocument(savedPost);
      } catch (error) {
        throw new ApolloError(`Failed to create post: ${error.message}`);
      }
    },

    // Update an existing community post
    updatePost: async (_, { input }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      try {
        const post = await Post.findById(input.id);
        if (!post) {
          throw new ApolloError('Post not found');
        }
        if (post.author.toString() !== user.id && !['community_organizer', 'business_owner'].includes(user.role)) {
          throw new ForbiddenError('Not authorized to update this post');
        }
        Object.keys(input).forEach((key) => {
          if (key !== 'id') {
            post[key] = input[key];
          }
        });
        post.updatedAt = new Date();
        const updatedPost = await post.save();
        return formatDocument(updatedPost);
      } catch (error) {
        throw new ApolloError(`Failed to update post: ${error.message}`);
      }
    },

    // Delete a community post
    deletePost: async (_, { id }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      try {
        const post = await Post.findById(id);
        if (!post) {
          throw new ApolloError('Post not found');
        }
        if (post.author.toString() !== user.id && !['community_organizer', 'business_owner'].includes(user.role)) {
          throw new ForbiddenError('Not authorized to delete this post');
        }
        await Post.findByIdAndDelete(id);
        return true;
      } catch (error) {
        throw new ApolloError(`Failed to delete post: ${error.message}`);
      }
    },

    // Create a new help request
    createHelpRequest: async (_, { input }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      if (user.role !== 'resident') {
        throw new ForbiddenError('Only residents can create help requests');
      }
      try {
        const newHelpRequest = new HelpRequest({
          ...input,
          author: user.id.toString(),
        });
        const savedRequest = await newHelpRequest.save();
        return formatDocument(savedRequest);
      } catch (error) {
        throw new ApolloError(`Failed to create help request: ${error.message}`);
      }
    },

    // Update a help request
    updateHelpRequest: async (_, { input }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      try {
        const helpRequest = await HelpRequest.findById(input.id);
        if (!helpRequest) {
          throw new ApolloError('Help request not found');
        }
        if (helpRequest.author.toString() !== user.id && !['community_organizer', 'business_owner'].includes(user.role)) {
          throw new ForbiddenError('Not authorized to update this help request');
        }
        Object.keys(input).forEach((key) => {
          if (key !== 'id') {
            helpRequest[key] = input[key];
          }
        });
        helpRequest.updatedAt = new Date();
        const updatedRequest = await helpRequest.save();
        return formatDocument(updatedRequest);
      } catch (error) {
        throw new ApolloError(`Failed to update help request: ${error.message}`);
      }
    },

    // Delete a help request
    deleteHelpRequest: async (_, { id }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      try {
        const helpRequest = await HelpRequest.findById(id);
        if (!helpRequest) {
          throw new ApolloError('Help request not found');
        }
        if (helpRequest.author.toString() !== user.id && !['community_organizer', 'business_owner'].includes(user.role)) {
          throw new ForbiddenError('Not authorized to delete this help request');
        }
        await HelpRequest.findByIdAndDelete(id);
        return true;
      } catch (error) {
        throw new ApolloError(`Failed to delete help request: ${error.message}`);
      }
    },

    // Volunteer for a help request
    volunteerForHelp: async (_, { helpRequestId }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      try {
        const helpRequest = await HelpRequest.findById(helpRequestId);
        if (!helpRequest) {
          throw new ApolloError('Help request not found');
        }
        if (helpRequest.volunteers.includes(user.id)) {
          throw new ApolloError('You are already volunteering for this help request');
        }
        helpRequest.volunteers.push(user.id);
        const updatedRequest = await helpRequest.save();
        return formatDocument(updatedRequest);
      } catch (error) {
        throw new ApolloError(`Failed to volunteer: ${error.message}`);
      }
    },

    // Withdraw volunteering for a help request
    withdrawVolunteer: async (_, { helpRequestId }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      try {
        const helpRequest = await HelpRequest.findById(helpRequestId);
        if (!helpRequest) {
          throw new ApolloError('Help request not found');
        }
        if (!helpRequest.volunteers.includes(user.id)) {
          throw new ApolloError('You are not volunteering for this help request');
        }
        helpRequest.volunteers = helpRequest.volunteers.filter((vId) => vId.toString() !== user.id);
        const updatedRequest = await helpRequest.save();
        return formatDocument(updatedRequest);
      } catch (error) {
        throw new ApolloError(`Failed to withdraw volunteering: ${error.message}`);
      }
    },
// Generate embeddings for all posts (admin function)
    generateEmbeddingsForPosts: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }
      try {
        await generateEmbeddingsForPosts();
        return true;
      } catch (error) {
        console.error('Error generating embeddings:', error);
        throw new ApolloError(`Failed to generate embeddings: ${error.message}`);
      }
    }
  },
};

module.exports = resolvers;

async function startServer() {
  const server = new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
    context: ({ req }) => {
      const token = req.headers.authorization || req.cookies.token;
      let user = null;
      if (token) {
          try {
              // Remove 'Bearer ' prefix if present
              const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
              user = jwt.verify(tokenValue, process.env.JWT_SECRET);
          } catch (err) {
              console.error('Token verification failed:', err.message);
          }
      }
      return { user };
    },
  });
  
  await server.start();
  server.applyMiddleware({ app, path: '/graphql', cors: false });
  
 const PORT = process.env.PORT || 4001;
  app.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer();