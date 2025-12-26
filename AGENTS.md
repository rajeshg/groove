# Agent Guidelines for TanStack Kanban App

## Project Overview

Full-stack Kanban application built with **TanStack Start**, **TanStack DB**, **Drizzle ORM**, and **SQLite**. Read `ARCHITECTURE.md` and `DATABASE.md` for detailed architecture patterns.

## ⚠️ CRITICAL: TanStack DB vs TanStack Query

**This project uses TanStack DB (`@tanstack/react-db`) for ALL client-side data fetching and mutations.**

### ❌ DO NOT USE

- `useQuery` from `@tanstack/react-query`
- `useMutation` from `@tanstack/react-query`
- `queryClient.setQueryData()` for mutations
- Direct API calls with `fetch()` in components

### ✅ ALWAYS USE

- `useLiveQuery()` from `@tanstack/react-db` for data fetching
- Collections from `~/db/collections.ts` (e.g., `boardsCollection`, `itemsCollection`)
- Collection methods for mutations: `.insert()`, `.update()`, `.delete()`
- `queryClient.getQueryData()` to read cache in mutation handlers
- prefer routes/separate pages over modals

### Why TanStack DB?

- **Optimistic updates**: UI updates instantly before server confirms
- **Automatic rollback**: Failed mutations automatically revert changes
- **Live queries**: Data automatically refreshes when mutations occur
- **Type-safe**: Collections enforce schema at compile time
- **Local-first**: Better UX with client-side state management

---

## Build, Lint & Test Commands

### Development

```bash
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Production build + type check
pnpm preview                # Preview production build
pnpm start                  # Run production server
```

### Code Quality

```bash
pnpm lint                   # Run oxlint (fast linting)
pnpm lint:fix               # Auto-fix linting issues
pnpm format                 # Format code with oxfmt
pnpm format:check           # Check formatting without changes
pnpm type-check             # TypeScript type checking
pnpm validate               # Run all checks (lint + types + format)
```

### Database

```bash
pnpm db:generate            # Generate migration from schema changes
pnpm db:migrate             # Apply migrations to database
pnpm db:push                # Push schema changes directly (dev only)
pnpm db:studio              # Open Drizzle Studio GUI
pnpm db:drop                # Drop migration files (destructive)
```

### Testing

**Note**: No test framework currently configured. To add tests, install Vitest:

```bash
pnpm add -D vitest @vitest/ui
# Add to package.json: "test": "vitest", "test:ui": "vitest --ui"
# Run single test: pnpm test path/to/file.test.ts
```

---

## Code Style Guidelines

### Imports Organization

```typescript
// 1. External dependencies (React, TanStack, third-party)
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db"; // ✅ Use this, NOT useQuery
import { eq } from "@tanstack/db";

// 2. Internal collections/actions (~/db, ~/server)
import { boardsCollection, columnsCollection } from "~/db/collections";
import { getBoards, createBoard } from "~/server/actions/boards";

// 3. Components (UI, custom)
import { Button } from "~/components/ui/button";
import { KanbanBoard } from "~/components/KanbanBoard";

// 4. Utils, types, constants
import { cn } from "~/lib/utils";
import { toast } from "sonner";

// ❌ NEVER import these:
// import { useQuery, useMutation } from "@tanstack/react-query"; // WRONG!
```

### Formatting (oxfmt)

- **Indentation**: 2 spaces
- **Line width**: 100 characters
- **Semicolons**: Required
- **Trailing commas**: ES5 style (objects, arrays)
- **JSX quotes**: Double quotes
- **Arrow functions**: Always use parentheses `(x) => x`
- **Bracket spacing**: `{ foo: bar }` not `{foo: bar}`

### TypeScript & Types

```typescript
// ✅ Use explicit types for props and returns
interface BoardDetailPageProps {
  boardId: string;
}

export function BoardDetailPage({ boardId }: BoardDetailPageProps) {
  // Function return types inferred, but can be explicit for complex functions
}

// ✅ Use `any` with comment when necessary for TanStack DB
const columns = (columnsData || []).sort((a: any, b: any) => a.order - b.order);

// ✅ Prefer type inference for simple variables
const [showForm, setShowForm] = useState(false); // boolean inferred

// ✅ Use z.infer for Zod schemas
type CreateBoardInput = z.infer<typeof CreateBoardSchema>;

// ❌ Avoid explicit types when inference works
const columns: any[] = columnsData || []; // Unnecessary
```

### Naming Conventions

- **Components**: PascalCase (`BoardDetailPage.tsx`, `KanbanCard.tsx`)
- **Files**: Match component name (`BoardDetailPage.tsx`)
- **Functions**: camelCase (`handleCreateBoard`, `getAllColumns`)
- **Server functions**: Descriptive verbs (`getBoards`, `createColumn`, `updateItem`)
- **Hooks**: Custom hooks start with `use` (`useAuth`, `useLiveQuery`)
- **Constants**: UPPER_SNAKE_CASE or camelCase for objects (`MAX_COLUMNS`, `boardTemplates`)
- **Collections**: camelCase with `Collection` suffix (`boardsCollection`, `itemsCollection`)

### Server Functions Pattern

```typescript
// Always use createServerFn with method, validator, and handler
export const getBoards = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accountId: z.string() }))
  .handler(async ({ data: { accountId } }) => {
    const db = getDb();
    // Business logic here
    return result;
  });
```

### TanStack DB Collection Pattern

```typescript
export const itemsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["items"],
    queryFn: async () => {
      const accountId = getAccountId();
      if (!accountId) return [];
      return await getAllItems({ data: { accountId } });
    },
    queryClient,
    getKey: (item: any) => item.id,
    onUpdate: async ({ transaction }: any) => {
      // Get data from cache using queryClient.getQueryData()
      const cachedData = queryClient.getQueryData(["items"]) as any[];
      const item = cachedData?.find((i: any) => i.id === key);
      // Always throw errors instead of silent returns
      if (!item) throw new Error("Item not found in cache");
    },
  })
);
```

### Error Handling

```typescript
// ✅ Use try-catch in async functions with toast notifications
try {
  await createBoard(data);
  toast.success("Board created!");
} catch (error) {
  console.error("Failed to create board:", error);
  toast.error("Failed to create board");
}

// ✅ Throw errors in server functions for proper rollback
if (!accountId) {
  throw new Error("Account ID is required");
}

// ❌ Avoid silent failures in mutation handlers
if (!item) return; // BAD - silent failure, no rollback
if (!item) throw new Error("Item not found"); // GOOD
```

### Console Logging

```typescript
// ✅ Use descriptive prefixed logs for debugging
console.log("[BoardDetailPage] Columns order:", columns);
console.error("[itemsCollection.onUpdate] Failed:", error);

// ✅ Allow console.log, console.warn, console.error (see .oxlintrc.json)
```

### React Patterns

```typescript
// ✅ Use "use client" for client components
"use client";

// ✅ Destructure props inline
export function KanbanBoard({ columns, items, onMoveItem }: KanbanBoardProps) {}

// ✅ Sort data defensively when order matters
const sortedColumns = (columnsData || []).sort((a, b) => a.order - b.order);

// ✅ Use optional chaining
const board = boardData?.[0];

// ✅ Provide fallbacks for arrays
const columns = columnsData || [];
```

### Data Fetching Pattern (TanStack DB)

```typescript
// ✅ CORRECT: Use useLiveQuery with collections
const { data: itemsData } = useLiveQuery((q) =>
  q
    .from({ item: itemsCollection })
    .where(({ item }) => eq(item.boardId, boardId))
    .orderBy(({ item }) => [{ by: item.order, direction: "asc" }])
);

const items = itemsData || [];

// ❌ WRONG: Do not use useQuery
const { data: items } = useQuery({
  queryKey: ["items", boardId],
  queryFn: () => fetch(`/api/items?boardId=${boardId}`).then(r => r.json())
});
```

### Mutations Pattern (TanStack DB)

```typescript
// ✅ CORRECT: Use collection methods
const handleCreateItem = () => {
  itemsCollection.insert({
    id: crypto.randomUUID(),
    boardId,
    columnId,
    title: "New item",
    order: items.length,
    // ...
  } as any);
  toast.success("Item created!");
};

const handleUpdateItem = (itemId: string) => {
  itemsCollection.update(itemId, (draft) => {
    draft.title = "Updated title";
  });
};

const handleDeleteItem = (itemId: string) => {
  itemsCollection.delete(itemId);
};

// ❌ WRONG: Do not use useMutation
const mutation = useMutation({
  mutationFn: (data) => fetch('/api/items', { method: 'POST', body: JSON.stringify(data) }),
  onSuccess: () => queryClient.invalidateQueries(['items'])
});
```

---

## Key Patterns & Best Practices

### 1. TanStack DB Usage (MANDATORY)

- **Data fetching**: Use `useLiveQuery()` with collections, NOT `useQuery()`
- **Mutations**: Use collection methods (`.insert()`, `.update()`, `.delete()`), NOT `useMutation()`
- **Cache access**: Use `queryClient.getQueryData()` in mutation handlers to read current data
- **Optimistic updates**: Automatic - collection methods update UI before server confirms
- **Error handling**: Always `throw` errors in mutation handlers for automatic rollback

### 2. DRY Principle

- Business logic in `src/server/actions/*` (reusable server functions)
- API routes in `src/routes/api/*` are thin wrappers that delegate to server functions
- Collections defined once in `src/db/collections.ts`

### 3. Type Safety

- Zod schemas in `src/server/validation.ts` and `src/server/db/schema.ts`
- Use `z.infer<typeof Schema>` to extract TypeScript types
- Validate at boundaries (API routes, server functions)

### 4. Database Changes

1. Update schema in `src/server/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Review generated SQL in `drizzle/` folder
4. Restart app (migrations run automatically on startup)

### 5. Adding New Features

- Follow existing patterns in `ARCHITECTURE.md` (see "Scalability: Adding New Models")
- Always add schema → server functions → collection → UI components
- Use board sharing system: query via `boardMembers` table for multi-tenant access

### 6. Debugging

- Check `localStorage.getItem("accountId")` for authentication issues
- Use browser console to inspect collection data: `queryClient.getQueryData(["items"])`
- Database inspection: `sqlite3 todos.db` then run SQL queries

---

## File Structure Reference

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components (auto-generated)
│   ├── auth/           # Authentication (AuthProvider, LoginForm, etc.)
│   └── *.tsx           # Feature components (BoardDetailPage, KanbanBoard, etc.)
├── db/
│   └── collections.ts  # TanStack DB collections + hooks
├── routes/             # File-based routing (TanStack Start)
│   ├── api/           # API routes (thin wrappers)
│   └── *.tsx          # Page routes
├── server/
│   ├── actions/       # Server functions (business logic)
│   ├── db/            # Database client, schema, migrations
│   └── validation.ts  # Zod schemas
└── lib/
    └── utils.ts       # Utility functions (cn, etc.)
```

---

## Important Notes

- **TanStack DB ONLY**: This project uses `@tanstack/react-db` exclusively. Never use `@tanstack/react-query` hooks (`useQuery`, `useMutation`) in components. Always use `useLiveQuery()` and collection methods.
- **React 19**: Uses new features, ensure compatibility
- **Cache Access**: Use `queryClient.getQueryData()` in mutation handlers (not `transaction.state`)
- **Optimistic Updates**: Always throw errors in handlers for proper rollback
- **Multi-tenant**: All queries must filter by `accountId` and respect `boardMembers`
- **File-based routing**: Routes auto-generated from `src/routes/` folder structure
- **Auto-generated files**: Never edit `routeTree.gen.ts` or `drizzle/` migrations directly
