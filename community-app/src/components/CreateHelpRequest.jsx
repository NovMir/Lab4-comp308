import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Card } from 'react-bootstrap';
import { gql } from '@apollo/client';

const CREATE_HELP_REQUEST = gql`
  mutation CreateHelpRequest($input: CreateHelpRequestInput!) {
    createHelpRequest(input: $input) {
      id
      description
      location
      isResolved
      createdAt
    }
  }
`;

function CreateHelpRequest() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    description: '',
    location: '',
  });

  const [createHelpRequest, { loading, error }] = useMutation(CREATE_HELP_REQUEST, {
    onCompleted: () => {
      navigate('/help-requests');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createHelpRequest({
      variables: {
        input: formData,
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
          <Card.Title>Create Help Request</Card.Title>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Describe what kind of help you need"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Control
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Where do you need help? (Optional)"
              />
            </Form.Group>

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Help Request'}
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

export default CreateHelpRequest; 