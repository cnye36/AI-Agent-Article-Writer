import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useArticleGeneration } from './use-article-generation';
import { mockTopic, mockOutline, mockArticle, mockGenerationConfig } from '../tests/fixtures/test-data';

describe('useArticleGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should initialize with default config state', () => {
    const { result } = renderHook(() => useArticleGeneration());

    expect(result.current.stage).toBe('config');
    expect(result.current.config).toEqual({
      industry: '',
      articleType: 'blog',
      targetLength: 'medium',
      tone: 'professional',
    });
    expect(result.current.topics).toEqual([]);
    expect(result.current.selectedTopic).toBeNull();
    expect(result.current.outline).toBeNull();
    expect(result.current.article).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should update config when setConfig is called', () => {
    const { result } = renderHook(() => useArticleGeneration());

    act(() => {
      result.current.setConfig({ industry: 'AI', tone: 'casual' });
    });

    expect(result.current.config.industry).toBe('AI');
    expect(result.current.config.tone).toBe('casual');
    expect(result.current.config.articleType).toBe('blog'); // unchanged
  });

  it('should start research and fetch topics', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        topics: [mockTopic],
        metadata: { duplicatesFiltered: 2 },
      }),
    });

    const { result } = renderHook(() => useArticleGeneration());

    await act(async () => {
      await result.current.startResearch(mockGenerationConfig);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/agents/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        industry: 'AI',
        keywords: mockGenerationConfig.keywords,
        articleType: 'blog',
        maxTopics: 5,
      }),
    });

    await waitFor(() => {
      expect(result.current.stage).toBe('topics');
      expect(result.current.topics).toHaveLength(1);
      expect(result.current.topics[0]).toEqual(mockTopic);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle research error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Research failed' }),
    });

    const { result } = renderHook(() => useArticleGeneration());

    await act(async () => {
      await result.current.startResearch(mockGenerationConfig);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Research failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should reject topic with temporary ID', async () => {
    const { result } = renderHook(() => useArticleGeneration());
    const tempTopic = { ...mockTopic, id: 'temp-123' };

    await act(async () => {
      await result.current.selectTopic(tempTopic);
    });

    expect(result.current.error).toContain('could not be saved to the database');
  });

  it('should select topic and generate outline with streaming', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"outline_created","outlineId":"test-outline-id"}\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"complete","outline":' + JSON.stringify(mockOutline) + '}\n'),
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined,
        }),
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ outline: mockOutline }),
      });

    const { result } = renderHook(() => useArticleGeneration());

    act(() => {
      result.current.setConfig(mockGenerationConfig);
    });

    await act(async () => {
      await result.current.selectTopic(mockTopic);
    });

    await waitFor(() => {
      expect(result.current.selectedTopic).toEqual(mockTopic);
      expect(result.current.outline).toEqual(mockOutline);
      expect(result.current.stage).toBe('outline');
    });
  });

  it('should approve outline and start article generation', async () => {
    // Setup mocks for the entire flow:
    // 1. selectTopic -> PUT /api/agents/outline (stream)
    // 2. selectTopic -> GET /api/agents/outline?id=... (fetch full outline)
    // 3. approveOutline -> PATCH /api/agents/outline (approve)
    // 4. approveOutline -> POST /api/agents/writer (generate)

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"outline_created","outlineId":"test-outline-id"}\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"complete","outline":' + JSON.stringify(mockOutline) + '}\n'),
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined,
        }),
    };

    global.fetch = vi.fn()
      // 1. PUT /api/agents/outline (start stream)
      .mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      })
      // 2. GET /api/agents/outline?id=... (fetch created outline)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ outline: mockOutline }),
      })
      // 3. PATCH /api/agents/outline (approve)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ outline: { ...mockOutline, approved: true } }),
      })
      // 4. POST /api/agents/writer (write)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ article: mockArticle }),
      });

    const { result } = renderHook(() => useArticleGeneration());

    // Initial config
    act(() => {
      result.current.setConfig(mockGenerationConfig);
    });

    // 1. Select topic to get outline state
    await act(async () => {
      await result.current.selectTopic(mockTopic);
    });

    await waitFor(() => {
      expect(result.current.outline).toEqual(mockOutline);
    });

    // 2. Approve outline
    await act(async () => {
      await result.current.approveOutline();
    });

    // 3. Verify final state
    await waitFor(() => {
      expect(result.current.article).toEqual(mockArticle);
      expect(result.current.stage).toBe('content');
    });

    // Verify calls
    const fetchCalls = (global.fetch as any).mock.calls;
    
    // Check PATCH call
    const patchCall = fetchCalls.find((call: any[]) => 
      call[0] === '/api/agents/outline' && call[1].method === 'PATCH'
    );
    expect(patchCall).toBeDefined();
    expect(JSON.parse(patchCall[1].body)).toEqual({
      outlineId: mockOutline.id,
      approved: true
    });

    // Check POST call
    const postCall = fetchCalls.find((call: any[]) => 
      call[0] === '/api/agents/writer' && call[1].method === 'POST'
    );
    expect(postCall).toBeDefined();
    expect(JSON.parse(postCall[1].body)).toEqual({
      outlineId: mockOutline.id,
      useBackgroundJob: false
    });
  });

  it('should reset all state', () => {
    const { result } = renderHook(() => useArticleGeneration());

    // Set some state first
    act(() => {
      result.current.setConfig({ industry: 'AI' });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.stage).toBe('config');
    expect(result.current.config.industry).toBe('');
    expect(result.current.topics).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should navigate between stages with goToStage', () => {
    const { result } = renderHook(() => useArticleGeneration());

    act(() => {
      result.current.goToStage('topics');
    });

    expect(result.current.stage).toBe('topics');

    act(() => {
      result.current.goToStage('outline');
    });

    expect(result.current.stage).toBe('outline');
  });

  it('should clear downstream state when going back to topics', () => {
    const { result } = renderHook(() => useArticleGeneration());

    // Manually set state for testing
    act(() => {
      (result.current as any).selectedTopic = mockTopic;
      (result.current as any).outline = mockOutline;
      (result.current as any).article = mockArticle;
    });

    act(() => {
      result.current.goToStage('topics');
    });

    expect(result.current.selectedTopic).toBeNull();
    expect(result.current.outline).toBeNull();
    expect(result.current.article).toBeNull();
  });

  it('should select different topic and reset outline/article', () => {
    const { result } = renderHook(() => useArticleGeneration());

    // Set state
    act(() => {
      (result.current as any).selectedTopic = mockTopic;
      (result.current as any).outline = mockOutline;
      (result.current as any).article = mockArticle;
    });

    act(() => {
      result.current.selectDifferentTopic();
    });

    expect(result.current.stage).toBe('topics');
    expect(result.current.selectedTopic).toBeNull();
    expect(result.current.outline).toBeNull();
    expect(result.current.article).toBeNull();
  });
});
