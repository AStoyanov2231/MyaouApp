# Project Rules

## Workflow Rules

**After writing or modifying code, follow this order:**
1. Run type verification: `/type-verifier` or `npx tsc --noEmit`. Fix errors before proceeding.
2. Run the `code-reviewer` agent as the final step. Pass changed file paths as context.

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
```

## File Navigation

| Task | Path |
|------|------|
| Auth actions | `src/app/(auth)/actions.ts` |
| API routes | `src/app/api/[domain]/route.ts` |
| Components | `src/components/[domain]/` |
| Hooks | `src/hooks/use[Name].ts` |
| Store | `src/stores/appStore.ts` |
| Selectors | `src/stores/selectors.ts` |
| Types | `src/types/database.ts` |
| Supabase clients | `src/lib/supabase/` |
| Utilities | `src/lib/utils.ts` |

## Coding Conventions

### RSC Pattern
- **Pages** = Server Components (fetch data, no `"use client"`)
- **`*Client.tsx`** = Client islands (interactivity only)
- Use `"use client"` only for: events, hooks, realtime, browser APIs, Leaflet

### Supabase Clients
- **Browser**: `createBrowserClient()` - singleton, respects RLS
- **Server**: `createClient()` - respects RLS
- **Server privileged**: `createServiceClient()` - bypasses RLS

### Zustand Store
Use `useAppStore.getState()` inside useEffect to avoid infinite re-renders:
```tsx
useEffect(() => {
  const { setThreadMessages } = useAppStore.getState();
  // fetch and call setThreadMessages
}, [threadId]); // Don't include store actions as dependency
```

### Styling
- Use `cn()` from `src/lib/utils.ts` for class merging
- Tailwind utilities: `gradient-brand`, `gradient-brand-text`, `custom-scrollbar`

## Security Rules

- Validate inputs server-side (type checks, length validation)
- Use DB constraints for uniqueness (not pre-checks, avoids race conditions)
- Server-side filtering for private data (never trust client)
- Payment status from webhook only (not redirect URL)

## Reference

See `project_overview.md` for full project documentation including:
- Tech stack and architecture
- Database schema
- API endpoints
- Hooks and components
- Authentication and payment flows
- Not-yet-implemented features
