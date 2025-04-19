import React from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { Container, Card, Button, Row, Col, Badge } from 'react-bootstrap';
import { gql } from '@apollo/client';

const GET_HELP_REQUESTS = gql`
  query GetHelpRequests {
    helpRequests {
      id
      description
      location
      isResolved
      createdAt
      author {
        id
        username
      }
      volunteers {
        id
        username
      }
    }
  }
`;

function HelpRequestsList() {
  const { loading, error, data } = useQuery(GET_HELP_REQUESTS);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Help Requests</h2>
        <Button as={Link} to="/create-help-request" variant="primary">
          Create New Help Request
        </Button>
      </div>
      <Row>
        {data.helpRequests.map((request) => (
          <Col key={request.id} xs={12} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>Help Request</Card.Title>
                <Badge bg={request.isResolved ? 'success' : 'primary'} className="mb-2">
                  {request.isResolved ? 'Resolved' : 'Open'}
                </Badge>
                <Card.Subtitle className="mb-2 text-muted">
                  By {request.author.username} • {new Date(request.createdAt).toLocaleDateString()}
                </Card.Subtitle>
                <Card.Text>{request.description}</Card.Text>
                {request.location && (
                  <Card.Text className="text-muted">
                    Location: {request.location}
                  </Card.Text>
                )}
                <Card.Text>
                  <small>Volunteers: {request.volunteers.length}</small>
                </Card.Text>
                <div className="d-flex gap-2">
                  <Button
                    as={Link}
                    to={`/help-requests/${request.id}`}
                    variant="outline-primary"
                    size="sm"
                  >
                    View Details
                  </Button>
                  <Button variant="outline-success" size="sm">
                    Volunteer
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default HelpRequestsList; 