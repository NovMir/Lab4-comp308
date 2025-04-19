const express = require('express');
const mongoose = require ('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');    
const cors = require('cors');
const dotenv = require('dotenv');
const{ApolloServer, gql} = require('apollo-server-express');
const { buildSubgraphSchema } = require('@apollo/federation');
const cookieParser = require('cookie-parser');

const app = express();
dotenv.config();

app.use(cors({
      origin: ['http://localhost:3001', 'http://localhost:4000','http://localhost:4001','http://localhost:4002', 'https://studio.apollographql.com'], // Add the sandbox URL
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

//userschema
const UserSchema = new mongoose.Schema({
    username:{type:String, required:true,},
    email:{type:String, required:true, unique:true},
    password:{type:String, required:true},
    role:{type:String, default:'resident',enum:['resident', 'business_owner','community_organizer']},
    createdAt:{type:Date, default:Date.now}
})
// Hash the password before saving if it is new or modified
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  });
  
  // Instance method to compare candidate password with stored hash
  UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };
const User = mongoose.model('User', UserSchema);
module.exports = User;

//graphql schema
const typeDefs = gql`
    type User @key(fields: "id") {
        id: ID!
        username: String
        email: String!
        password: String!
        role: String!
        createdAt: String!
    }
        type AuthPayload {
        token: String!
        user: User!
    }
    type Query{
    me: User
    }
    type Mutation {
        register(username: String, email: String!, password: String!,role: String!): AuthPayload!
        login(email: String!, password: String!): AuthPayload!
        logout: Boolean!
    }
`;
module.exports = typeDefs;
const resolvers = {
    User: {
        __resolveReference: async (reference) => {
          // This resolver is called when another service references a User
          try {
            const userId = reference.id;
            const user = await User.findById(userId);
            if (!user) {
              console.error(`User with ID ${userId} not found`);
              return null;
            }
            return {
              id: user._id.toString(),
              username: user.username,
              email: user.email,
              role: user.role,
              password: user.password, // Be careful with this in production!
              createdAt: user.createdAt.toISOString()
            };
          } catch (error) {
            console.error(`Error resolving user reference: ${error.message}`);
            return {
                id: user._id,
                username: "Error User",
                email: "error@example.com",
                role: "unknown"  
            };
          }
        },
      },

    Query: {
        me: async (_, __, { user }) => {
            if (!user) throw new Error('Not authenticated');
            return await User.findById(user.id);
        },
    },
    Mutation: {
        register: async (_, { username, email, password, role }) => {
            const user = new User({ username, email, password,role });
            await user.save();
            const token = jwt.sign({ id: user._id,role:user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return { token, user };
            
        },
        login: async (_, { email, password }, { res }) => {
            const user = await User.findOne({ email });
            if (!user) throw new Error('User not found');
            const isMatch = await user.comparePassword(password);
            if (!isMatch) throw new Error('Invalid credentials');
            
            const token = jwt.sign({ id: user._id ,role:user.role}, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.cookie('token', token, { httpOnly: true, secure: false }); // Set secure to true in production
            
            return { token, user };
        },
        logout: (_, __, { res }) => {
            res.clearCookie('token');
            return true;
        },
    },
};

module.exports = resolvers;
const server = new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
    context: ({ req, res }) => {
        const token = req.cookies.token;
        let user = null;
        if (token) {
            try {
                user = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                console.error('Token verification failed:', err.message);
            }
        }
        return { user, res };
    },
});
server.start().then(() => {
    server.applyMiddleware({ app, path: '/graphql' });
    app.listen({ port: 4000 }, () => {
        console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
    });
}
).catch((error) => {
    console.error('Error starting server:', error);
});