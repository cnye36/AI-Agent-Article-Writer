import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { vi } from "vitest";

// Add providers if needed in the future
function AllProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Helper to wait for async updates
export const waitForNextUpdate = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Helper to create mock fetch responses
export const createMockFetchResponse = <T,>(data: T, ok = true) => ({
  ok,
  status: ok ? 200 : 400,
  json: async () => data,
  text: async () => JSON.stringify(data),
  body: null,
  headers: new Headers(),
});

// Helper to mock fetch with a specific response
export const mockFetch = <T,>(response: T, ok = true) => {
  global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(response, ok));
};

// Helper to mock fetch with an error
export const mockFetchError = (error: Error) => {
  global.fetch = vi.fn().mockRejectedValue(error);
};
