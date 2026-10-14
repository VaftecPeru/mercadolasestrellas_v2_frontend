import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeInTheDocument();
});
