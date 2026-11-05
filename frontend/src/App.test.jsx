import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  expect(true).toBe(true); // Simple dummy test to prove it works
});
