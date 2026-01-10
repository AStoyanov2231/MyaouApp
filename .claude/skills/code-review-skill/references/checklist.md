# Review Checklist

## Logic Flaws

### Null/Undefined Handling
- [ ] API responses checked for null/undefined before access
- [ ] Optional chaining used where data may be missing
- [ ] Default values provided for potentially undefined variables
- [ ] Array access bounds checked

### Off-by-One Errors
- [ ] Loop boundaries correct (< vs <=)
- [ ] Array indices start at correct position
- [ ] Slice/substring end indices inclusive vs exclusive
- [ ] Pagination offset calculations

### Async/Concurrency
- [ ] Promises awaited before using results
- [ ] Race conditions in shared state
- [ ] Proper error handling in async functions
- [ ] No floating promises (missing await)

### Type Coercion
- [ ] Strict equality (===) used instead of loose (==)
- [ ] Number parsing handles NaN
- [ ] Boolean coercion explicit where needed
- [ ] String to number conversions validated

### Conditional Logic
- [ ] All branches of if/else covered
- [ ] Switch statements have default case
- [ ] Negation logic correct (! placement)
- [ ] Short-circuit evaluation side effects

## Pattern Violations

### Naming Conventions
- [ ] Variables match codebase style (camelCase, snake_case, etc.)
- [ ] Functions describe their action (verb + noun)
- [ ] Boolean variables prefixed appropriately (is, has, should)
- [ ] Constants in UPPER_CASE where expected

### Architecture
- [ ] New code placed in appropriate directory
- [ ] Follows existing module boundaries
- [ ] Uses established patterns (hooks, services, utils)
- [ ] Imports follow project conventions

### Error Handling
- [ ] Matches existing error handling patterns
- [ ] Uses project's error types/classes
- [ ] Logging follows established format
- [ ] User-facing errors match existing UX

### State Management
- [ ] State updates follow existing patterns
- [ ] Side effects in appropriate lifecycle
- [ ] Derived state computed consistently
- [ ] State shape matches existing conventions

## Dumb Logic

### Hardcoded Values
- [ ] URLs should be environment variables
- [ ] API keys/secrets not in code
- [ ] Feature flags not hardcoded booleans
- [ ] Timeouts/limits should be configurable

### Redundant Code
- [ ] No duplicate logic that should be extracted
- [ ] No unnecessary re-computation
- [ ] No fetch/query inside loops
- [ ] No repeated string literals (use constants)

### Magic Numbers
- [ ] Numeric literals named as constants
- [ ] Array indices explained or named
- [ ] Timeout values documented
- [ ] Retry counts configurable

### Dead Code
- [ ] No commented-out code blocks
- [ ] No unreachable code paths
- [ ] No unused imports
- [ ] No unused variables

### Inefficiencies
- [ ] No O(n^2) where O(n) possible
- [ ] No unnecessary array copies
- [ ] No repeated DOM queries
- [ ] No synchronous operations that should be async

## Breaking Changes

### API Contracts
- [ ] Function signatures backward compatible
- [ ] Return types unchanged or extended
- [ ] Required parameters not added to existing functions
- [ ] Default values preserve existing behavior

### Data Structures
- [ ] Database schema changes have migrations
- [ ] API response shapes unchanged for existing clients
- [ ] Local storage keys not renamed without migration
- [ ] Props/args types only extended, not modified

### Dependencies
- [ ] No removed exports that others may use
- [ ] Shared utilities still work for all callers
- [ ] Event names/types unchanged
- [ ] Hook contracts maintained

### Side Effects
- [ ] Existing tests still pass
- [ ] No new required environment variables without docs
- [ ] No changed file paths without updates to references
- [ ] No modified configs that affect other features
