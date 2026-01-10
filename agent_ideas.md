# Agent & Skill Ideas

Ideas for improving AI workflow consistency and reducing coding mistakes.

## Agents

| Agent | Purpose |
|-------|---------|
| **type-checker** | Verify TypeScript types match Supabase schema, catch type mismatches before runtime |
| **api-consistency** | Ensure all API routes follow same patterns (error handling, response format, status codes) |
| **security-scanner** | Check for exposed secrets, XSS, SQL injection, auth bypasses |
| **test-generator** | Generate test cases for new/modified functions |

## Skills

| Skill | Purpose |
|-------|---------|
| **api-route-template** | Template for creating consistent API routes with error handling |
| **component-patterns** | Project conventions for React components (hooks, props, state) |
| **supabase-patterns** | Standard patterns for Supabase queries, RLS, realtime subscriptions |
| **error-handling** | Consistent error handling patterns across client/server |

## High-Impact Combos

1. **type-checker + supabase-patterns** - Catch DB/type mismatches early
2. **api-consistency + api-route-template** - All APIs look the same
3. **code-reviewer + security-scanner** - Run both after changes

## Priority

The most impactful for reducing mistakes: **type-checker agent** that validates TypeScript types against actual Supabase schema (`src/types/database.ts`).
