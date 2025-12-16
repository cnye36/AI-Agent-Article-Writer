# Quick Testing Guide

## Getting Started

All tests are configured and ready to run. Simply use:

```bash
pnpm test
```

## Current Test Status ✅

```
✓ 3 test files passing
✓ 15 tests passing
✓ All mocks configured
✓ Coverage reporting enabled
```

## Adding New Tests

### 1. Testing a Hook

Create a file named `your-hook.test.ts` next to your hook:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useYourHook } from './your-hook';

describe('useYourHook', () => {
  it('should do something', async () => {
    const { result } = renderHook(() => useYourHook());

    await act(async () => {
      await result.current.someAction();
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

### 2. Testing a Component

```typescript
import { render, screen } from '@/tests/utils/test-utils';
import { YourComponent } from './your-component';

describe('YourComponent', () => {
  it('should render', () => {
    render(<YourComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### 3. Testing an API Route

```typescript
import { describe, it, expect } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

describe('POST /api/your-endpoint', () => {
  it('should handle request', async () => {
    const request = new NextRequest('http://localhost:3000/api/your-endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

## Mocking

All external dependencies are already mocked:
- ✓ Supabase client
- ✓ OpenAI API
- ✓ LangChain
- ✓ Next.js router
- ✓ fetch

Just import your module and test!

## Useful Commands

```bash
# Watch mode (re-runs on file changes)
pnpm test --watch

# UI mode (visual test runner)
pnpm test:ui

# Coverage report
pnpm test:coverage

# Run specific test file
pnpm test hooks/use-article-generation.test.ts

# Run tests matching pattern
pnpm test -t "should start research"
```

## Common Patterns

### Testing Async Operations

```typescript
await act(async () => {
  await result.current.asyncAction();
});

await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

### Mocking fetch

```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' }),
});
```

### Checking Error States

```typescript
await act(async () => {
  await result.current.action();
});

expect(result.current.error).toBe('Error message');
```

## Tips

1. **Run tests before pushing** - Ensure all tests pass
2. **Write tests as you code** - Don't wait until the end
3. **Test edge cases** - Invalid input, errors, loading states
4. **Keep tests simple** - One concept per test
5. **Use descriptive names** - Tests are documentation

## Need Help?

- Check `tests/README.md` for detailed testing guide
- Look at existing tests for examples
- Review `TESTING_SUMMARY.md` for architecture overview
