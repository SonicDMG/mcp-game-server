module.exports = {
  preset: 'ts-jest',
  testMatch: [
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  // Default to jsdom for React/Next.js; override with @jest-environment node in API tests
  testEnvironment: 'jsdom',
}; 