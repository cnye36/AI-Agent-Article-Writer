import { vi } from 'vitest';

export const mockOpenAIResponse = {
  id: 'chatcmpl-test',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a test response from OpenAI',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  },
};

export const mockOpenAIClient = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue(mockOpenAIResponse),
    },
  },
  embeddings: {
    create: vi.fn().mockResolvedValue({
      data: [
        {
          embedding: new Array(1536).fill(0.1),
          index: 0,
        },
      ],
      model: 'text-embedding-3-small',
      usage: {
        prompt_tokens: 10,
        total_tokens: 10,
      },
    }),
  },
};

// Mock the OpenAI SDK completely to avoid browser checks
vi.mock('openai', () => {
  return {
    default: vi.fn(() => mockOpenAIClient),
  };
});

// Mock the OpenAI client
vi.mock('@/lib/ai/openai', () => ({
  openai: mockOpenAIClient,
}));

// Mock embeddings
vi.mock('@/lib/ai/embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));
