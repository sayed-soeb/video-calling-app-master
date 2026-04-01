import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  };
  const mockIo = jest.fn(() => mockSocket);

  mockIo.connect = mockIo;
  mockIo.io = mockIo;

  return mockIo;
});

test('renders the redesigned app headline', () => {
  render(<App />);
  expect(screen.getByText(/Hello-Friend/i)).toBeInTheDocument();
  expect(screen.getByText(/Start your first random call/i)).toBeInTheDocument();
});
