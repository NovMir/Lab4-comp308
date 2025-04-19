// community-app/src/components/PostsList.jsx
import React from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { Container, Card, Button, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { gql } from '@apollo/client';

// Keep the same query to get all posts
const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      title
      content
      category
      createdAt
      author {
        id
        username
      }
    }
  }
`;

function PostsList() {
  const { loading, error, data } = useQuery(GET_POSTS);

  // Show loading spinner while data is being fetched
  if (loading) return (
    <Container className="text-center my-5">
      <Spinner animation="border" variant="primary" />
      <p className="mt-2">Loading posts...</p>
    </Container>
  );

  // Show error message if something went wrong
  if (error) return (
    <Container className="text-center my-5">
      <div className="alert alert-danger">
        Error loading posts: {error.message}
      </div>
    </Container>
  );

  // Show empty state if no posts are available
  if (!data?.posts || data.posts.length === 0) {
    return (
      <Container className="text-center my-5">
        <div className="alert alert-info">
          No community posts available yet.
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Community Posts</h2>
        
      
      </div>
      <Row>
        {data.posts.map((post) => (
          <Col key={post.id} xs={12} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>{post.title}</Card.Title>
                <Badge bg="primary" className="mb-2">
                  {post.category}
                </Badge>
                <Card.Subtitle className="mb-2 text-muted">
                  By {post.author.username} • {new Date(post.createdAt).toLocaleDateString()}
                </Card.Subtitle>
                <Card.Text>{post.content}</Card.Text>
                <Button
                  as={Link}
                  to={`/posts/${post.id}`}
                  variant="outline-primary"
                  size="sm"
                >
                  View Details
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default PostsList;