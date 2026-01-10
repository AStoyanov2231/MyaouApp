---
name: code-review-skill
description: >
  Senior developer PR review simulation for self-critique of code changes.
  Scans modified files for logic flaws, pattern violations, dumb logic, and breaking changes.
  Use this skill: (1) After completing code modifications to verify quality before commit,
  (2) When asked to "review changes", "sanity check", or "self-critique" code,
  (3) When modifying 3+ files to ensure consistency,
  (4) Before presenting finished implementation to user.
  Produces structured review summary with severity ratings, edge case analysis, and pass/fail status.
---

# Code Sanity Check

Self-review workflow simulating a senior developer PR review.

## Workflow

### 1. Gather Changes

```bash
git diff --name-only HEAD  # Modified files
git diff HEAD              # Actual changes
```

If no staged changes, check unstaged: `git diff --name-only`

### 2. Review Each File

For each modified file, check against [checklist.md](references/checklist.md):

- **Logic Flaws**: Off-by-one, null handling, race conditions
- **Pattern Violations**: Naming, architecture, existing conventions
- **Dumb Logic**: Hardcoded values, redundant code, magic numbers
- **Breaking Changes**: API contracts, dependency impacts

### 3. Analyze Edge Cases

For each significant code path, identify:
- What happens with empty/null input?
- What happens with boundary values?
- What happens if external calls fail?

### 4. Generate Review Summary

Output in this exact format:

```
## Review Summary

| File | Issue | Severity | Line |
|------|-------|----------|------|
| src/foo.ts | Unhandled null from API response | High | 42 |
| src/bar.ts | Magic number should be constant | Low | 15 |

## Edge Cases to Consider

- [ ] `getUserData()` - What if user ID doesn't exist? Returns undefined, not handled at line 23
- [ ] `processItems()` - Empty array causes silent failure

## Suggested Fixes

### src/foo.ts:42 - Add null check
```typescript
// Before
const name = response.data.name;

// After
const name = response.data?.name ?? 'Unknown';
```

## Validation Score

**Status: PASS / NEEDS REVISION**

- Logic Flaws: X found
- Pattern Violations: X found
- Dumb Logic: X found
- Breaking Changes: X found

**Recommendation**: [Ready for commit / Address high-severity issues first]
```

## Severity Guidelines

| Severity | Criteria |
|----------|----------|
| **High** | Will cause runtime errors, security issues, or data corruption |
| **Medium** | May cause bugs in edge cases, violates important patterns |
| **Low** | Code smell, minor inconsistency, could be cleaner |

## When to PASS

- No High severity issues
- Medium issues acknowledged or justified
- Code follows existing codebase patterns
- Edge cases either handled or documented

## When to Flag NEEDS REVISION

- Any High severity issue
- Multiple Medium issues in same file
- Clear pattern violations without justification
- Missing error handling on external calls
