## Project Structure
```
content-studio/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── article/
│   │   └── [id]/
│   │       └── page.tsx
│   └── api/
│       ├── agents/
│       │   ├── research/route.ts
│       │   ├── outline/route.ts
│       │   └── write/route.ts
│       ├── ai/
│       │   └── edit/route.ts
│       └── articles/
│           └── route.ts
├── agents/
│   ├── research-agent.ts
│   ├── outline-agent.ts
│   ├── writer-agent.ts
│   └── orchestrator.ts
├── components/
│   ├── canvas-editor.tsx
│   ├── topic-feed.tsx
│   ├── article-library.tsx
│   ├── create-article-flow.tsx
│   └── ui/
├── hooks/
│   ├── use-article-generation.ts
│   └── use-editor.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── ai/
│   │   └── anthropic.ts
│   └── utils.ts
├── types/
│   └── index.ts
├── package.json
└── .env.local