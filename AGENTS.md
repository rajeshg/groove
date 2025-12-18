# AGENTS.md

## Project Overview

Simplified Trello-like kanban board app with boards, columns, and cards. Features authentication, board management, drag-and-drop columns/cards.

## Commands

### Build

npm run build

### Lint

npm run lint

### Typecheck

npm run typecheck

### Format

npm run format

### Test

No test suite configured. Add tests using Vitest or similar: npm install --save-dev vitest

## Code Style

- **Framework**: React Router v7 with loaders/actions, React 19
- **TypeScript**: Strict mode enabled, target ES2022
- **Imports**: Group external (react-router), then local; use path aliases (~/\*)
- **Naming**: camelCase for functions/variables, PascalCase for components/types
- **Components**: Functional with TypeScript props; use forwardRef for refs
- **Styling**: Tailwind CSS classes; variant patterns for buttons
- **Error Handling**: Throw badRequest for invalid inputs; use ErrorBoundary
- **Database**: Prisma with SQLite, camelCase fields, UUID/autoincrement IDs
- **Formatting**: oxfmt (no semicolons, specific indentation)
- **Linting**: oxlint recommended rules, warn on any types
- **File Structure**: Routes in app/routes/, loaders/actions for data
- **Patterns**: Intent-based form actions, fetcher for optimistic updates, requireAuthCookie for auth</content>
  <parameter name="filePath">AGENTS.md
