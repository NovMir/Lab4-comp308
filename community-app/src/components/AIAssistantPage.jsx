// community-app/src/components/AIAssistantPage.jsx
import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import AIChatBot from './AIChatBot';

const AIAssistantPage = () => {
  return (
    <Container className="mt-4">
      <Row>
        <Col md={8} className="mx-auto">
          <Card>
            <Card.Header className="bg-primary text-white">
              <h4>Community AI Assistant</h4>
            </Card.Header>
            <Card.Body>
              <p className="lead">
                Welcome to the Community AI Assistant! This intelligent chatbot can help you:
              </p>
              <ul>
                <li>Find relevant discussions in the community</li>
                <li>Answer questions about community topics</li>
                <li>Suggest related topics you might be interested in</li>
              </ul>
              <p>
                Try asking questions like:
              </p>
              <ul>
                <li>"What are people discussing about safety?"</li>
                <li>"Tell me about recent community events"</li>
                <li>"What topics are popular in the discussions?"</li>
              </ul>
              <p className="text-muted mt-4">
                <small>
                  The AI Assistant uses advanced language processing to retrieve relevant information
                  from community discussions and provide helpful responses. It's powered by LangChain and
                  Gemini AI to give you the most accurate and contextual information.
                </small>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* The AIChatBot component will appear as a floating chat icon */}
      <AIChatBot />
    </Container>
  );
};

export default AIAssistantPage;