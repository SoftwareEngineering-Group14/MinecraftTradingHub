# Unit Testing Guide

## Setup

### 1. Install Dependencies

```bash
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## What's Included

### Configuration Files

- **`jest.config.js`** - Main Jest configuration
- **`jest.setup.js`** - Setup file for environment variables and global mocks

### Test Files Created

1. **`src/app/api/v1/store/__tests__/route.test.js`** - Tests for the store API route
   - Tests authentication (401 errors)
   - Tests origin validation (403 errors)
   - Tests limit query parameter validation
   - Tests successful store retrieval
   - Tests database error handling

2. **`src/app/api/signin/__tests__/route.test.js`** - Tests for the signin API route
   - Tests CORS preflight requests
   - Tests missing credentials validation
   - Tests invalid credentials
   - Tests successful signin
   - Tests error handling

3. **`src/app/lib/__tests__/serverFunctions.test.js`** - Tests for utility functions
   - Tests `isOriginAllowed` function
   - Tests `corsHeaders` function

## Writing Your Own Tests

### Test Structure

```javascript
describe('Feature or Component', () => {
  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something specific', () => {
    // Arrange: Set up test data and mocks
    // Act: Call the function/endpoint
    // Assert: Check the results
  });
});
```

### Testing API Routes

```javascript
import { NextRequest } from 'next/server';
import { GET } from '../route';

it('should return data', async () => {
  const request = new NextRequest('http://localhost:3000/api/endpoint', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const response = await GET(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data).toMatchObject({ /* expected data */ });
});
```

### Mocking Supabase

```javascript
jest.mock('@/app/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(),
      })),
    })),
  },
}));

// In your test
supabase.auth.getUser.mockResolvedValueOnce({
  data: { user: mockUser },
  error: null,
});
```

### Common Assertions

```javascript
// Status codes
expect(response.status).toBe(200);

// Response data
expect(data.error).toBe('Unauthorized');
expect(data.stores).toEqual(mockStores);

// Function calls
expect(mockFunction).toHaveBeenCalledWith('expected', 'arguments');
expect(mockFunction).toHaveBeenCalledTimes(1);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
```

## Test Coverage

After running `npm run test:coverage`, you'll see:

- **Statements**: % of code statements executed
- **Branches**: % of conditional branches tested
- **Functions**: % of functions called
- **Lines**: % of code lines executed

Aim for:
- 80%+ coverage for critical paths (auth, API routes)
- 60%+ coverage overall
- 100% for utility functions

## Best Practices

1. **Test behavior, not implementation**
   - Test what the function does, not how it does it

2. **Keep tests isolated**
   - Each test should be independent
   - Use `beforeEach` to reset state

3. **Use descriptive test names**
   - "should return 401 when token is invalid"
   - Not "test1" or "works"

4. **Mock external dependencies**
   - Database calls
   - API requests
   - Authentication services

5. **Test edge cases**
   - Empty inputs
   - Invalid data types
   - Maximum/minimum values
   - Error conditions

## Example: Adding a New Test

```javascript
// src/app/api/signup/__tests__/route.test.js
import { POST } from '../route';
import { signUp } from '@/app/lib/auth';

jest.mock('@/app/lib/auth');

describe('/api/signup', () => {
  it('should create a new user successfully', async () => {
    const mockUser = { id: '123', email: 'new@example.com' };

    signUp.mockResolvedValueOnce({
      user: mockUser,
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'new@example.com',
        password: 'password123',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user).toEqual(mockUser);
  });
});
```

## Debugging Tests

```bash
# Run a specific test file
npm test -- route.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should return 401"

# Run with verbose output
npm test -- --verbose

# Update snapshots (if using snapshot testing)
npm test -- --updateSnapshot
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
