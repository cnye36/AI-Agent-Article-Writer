# Testing Guide

This directory contains the test suite for the AI Article Writer application.

## Test Structure

- `setup.ts` - Global test configuration and mocks
- `mocks/` - Mock implementations for external dependencies
  - `supabase.ts` - Supabase client mocks
  - `openai.ts` - OpenAI API mocks
  - `langchain.ts` - LangChain library mocks
- `fixtures/` - Test data and fixtures
  - `test-data.ts` - Mock data for topics, outlines, and articles
- `utils/` - Testing utilities
  - `test-utils.tsx` - Custom render functions and helpers

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## Writing Tests

### Testing Hooks

```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { useArticleGeneration } from './use-article-generation';

it('should do something', async () => {
  const { result } = renderHook(() => useArticleGeneration());

  await act(async () => {
    await result.current.startResearch(config);
  });

  await waitFor(() => {
    expect(result.current.topics).toHaveLength(1);
  });
});
```

### Testing Components

```typescript
import { render, screen } from '../tests/utils/test-utils';

it('should render component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Testing API Routes

```typescript
import { POST } from './route';
import { NextRequest } from 'next/server';

it('should handle request', async () => {
  const request = new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    body: JSON.stringify({ data: 'test' }),
  });

  const response = await POST(request);
  expect(response.status).toBe(200);
});
```

## Coverage

Coverage reports are generated in the `coverage/` directory when running `pnpm test:coverage`.

Target coverage goals:
- Hooks: 80%+
- Agents: 70%+
- API Routes: 75%+
- Utils: 90%+
