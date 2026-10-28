// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock global de axios para evitar SyntaxError de ESM en Jest (react-scripts / Node 22 en CI)
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };

  return {
    __esModule: true,
    default: {
      ...mockAxiosInstance,
      create: jest.fn(() => mockAxiosInstance),
      isAxiosError: (error: any) => Boolean(error && error.isAxiosError),
    },
    ...mockAxiosInstance,
    create: jest.fn(() => mockAxiosInstance),
    isAxiosError: (error: any) => Boolean(error && error.isAxiosError),
  };
});
