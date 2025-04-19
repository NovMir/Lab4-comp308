import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { gql } from '@apollo/client';
import { AuthContext } from 'auth/AuthContext'; // Import AuthContext from auth-app remote

const CREATE_POST = gql`
  mutation createPost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
      category
      createdAt
    }
  }
`;

function CreatePost() {
// Use AuthContext to get the user
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'news',
  });

  const [createPost, { loading, error }] = useMutation(CREATE_POST, {
    onCompleted: () => {
      navigate('/posts');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createPost({
      variables: {
        input: {
          ...formData,
        
        },
      },
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Container>
      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Create New Post</Card.Title>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="news">News</option>
                <option value="discussion">Discussion</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Post'}
            </Button>

            {error && (
              <div className="mt-3 text-danger">
                {error.message}
              </div>
            )}
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default CreatePost;