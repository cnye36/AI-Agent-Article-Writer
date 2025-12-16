import { vi } from 'vitest';

// Mock ChatOpenAI from LangChain
export const mockChatOpenAI = vi.fn().mockImplementation(() => ({
  invoke: vi.fn().mockResolvedValue({
    content: JSON.stringify([
      {
        title: 'Test Topic',
        summary: 'This is a test topic summary',
        angle: 'Unique test angle',
        relevanceScore: 0.85,
        sources: [
          {
            url: 'https://example.com/test',
            title: 'Test Source',
            snippet: 'Test snippet',
            domain: 'example.com',
          },
        ],
      },
    ]),
  }),
}));

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: mockChatOpenAI,
}));

// Mock LangGraph
export const mockStateGraph = {
  addNode: vi.fn().mockReturnThis(),
  addEdge: vi.fn().mockReturnThis(),
  compile: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({}),
  }),
};

vi.mock('@langchain/langgraph', () => ({
  StateGraph: vi.fn(() => mockStateGraph),
  Annotation: {
    Root: vi.fn((schema) => schema),
  },
}));
