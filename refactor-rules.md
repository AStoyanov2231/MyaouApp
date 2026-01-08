# shadcn Refactor Rules

Standards for refactoring PlaceChat to use shadcn/ui consistently.

---

## 1. Brand Color Mapping

| Brand Color | CSS Variable | Tailwind Class | HSL Value |
|-------------|--------------|----------------|-----------|
| #6867B0 (Primary Purple) | `--primary` | `bg-primary`, `text-primary` | `244 30% 55%` |
| #22d3ee (Accent Cyan) | `--accent` | `bg-accent`, `text-accent` | `187 71% 55%` |

### CSS Variable Update (globals.css)

```css
:root {
  --primary: 244 30% 55%;  /* Exact #6867B0 */
  --ring: 244 30% 55%;     /* Match primary for focus rings */
}

.dark {
  --primary: 244 30% 65%;  /* Lighter for dark mode */
  --ring: 244 30% 65%;
}
```

### Rules

- NEVER use hardcoded `#6867B0` or `[#6867B0]` - use `primary` classes
- NEVER use hardcoded `cyan-400`/`cyan-500` - use `accent` classes
- Use gradient utility classes for brand gradients (see Section 6)

---

## 2. View Component Structure

**Card Wrapping Rule**: Only modal/overlay views get Card wrapping. Full-page views remain div-based.

### Modal/Overlay Views (Card-wrapped)

Use for: SearchView, DetailsView, dialogs, popovers, floating panels

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

export function DetailsView({ data, onAction }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Subtitle or description</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {/* Main content */}
      </CardContent>
      <CardFooter>
        <Button disabled={loading} className="w-full">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Action
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### Full-Page Views (div-based)

Use for: /friends, /profile, /messages pages

```tsx
export function FriendsPage() {
  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>
      {/* Individual items use Cards */}
      {friends.map(friend => (
        <Card key={friend.id}>...</Card>
      ))}
    </div>
  );
}
```

---

## 3. Error Handling (Alert-Based)

### Before (current pattern)

```tsx
{error && (
  <div className="bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200 rounded-2xl p-4">
    <p className="text-destructive text-sm font-semibold">{error}</p>
  </div>
)}
```

### After (shadcn pattern)

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

### Installation

```bash
npx shadcn@latest add alert
```

---

## 4. Icon Standards (Lucide)

| Context | Size Class | strokeWidth | Example |
|---------|------------|-------------|---------|
| Button icon | `h-4 w-4` | default (2) | `<Loader2 className="h-4 w-4" />` |
| Card/stat icon | `h-5 w-5` | 2 | `<Users className="h-5 w-5" />` |
| Empty state | `h-8 w-8` | 1.5 | `<Search className="h-8 w-8" strokeWidth={1.5} />` |
| Input prefix | `h-5 w-5` | 2 | `<Mail className="h-5 w-5" />` |
| Navigation | `h-5 w-5` | 2 | `<Home className="h-5 w-5" />` |

### Rules

- Use Tailwind `h-X w-X` classes, NOT the `size={N}` prop
- Default strokeWidth (2) unless intentionally thinner for large decorative icons
- Always import from `lucide-react`
- Icons in buttons: place before text, use `gap-2` on parent

### Example

```tsx
// Before
<Users size={20} strokeWidth={2.5} />

// After
<Users className="h-5 w-5" />
```

---

## 5. Animation Standards

### Available Keyframes (globals.css)

| Animation | Usage |
|-----------|-------|
| `animate-[fadeIn_0.3s_ease-out]` | General fade in |
| `animate-[slideUp_0.4s_ease-out]` | Content appearing from below |
| `animate-[slideDown_0.4s_ease-out]` | Content appearing from above |
| `animate-[slideRight_0.4s_ease-out]` | Content appearing from left |
| `animate-[scaleIn_0.5s_ease-out]` | Scale + fade effect |
| `animate-[shake_0.5s_ease-out]` | Error shake |

### Built-in Tailwind Animations

| Class | Usage |
|-------|-------|
| `animate-spin` | Loading spinners (Loader2 icon) |
| `animate-pulse` | Skeleton loading states |

### Rules

- Keep durations between 0.3s-0.6s for micro-interactions
- Stagger list animations with inline delay: `style={{ animationDelay: '0.1s' }}`
- Use `animate-spin` for all loader icons
- Use `animate-pulse` for skeleton placeholders

### Example

```tsx
// Staggered list animation
{items.map((item, index) => (
  <div
    key={item.id}
    className="animate-[slideUp_0.4s_ease-out]"
    style={{ animationDelay: `${index * 0.05}s` }}
  >
    {item.name}
  </div>
))}
```

---

## 6. Gradient Utility Classes

### Add to globals.css

```css
@layer utilities {
  .gradient-brand {
    @apply bg-gradient-to-r from-primary to-accent;
  }

  .gradient-brand-vertical {
    @apply bg-gradient-to-b from-primary to-accent;
  }

  .gradient-brand-text {
    @apply bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent;
  }

  .gradient-brand-border {
    @apply bg-gradient-to-br from-primary via-accent to-primary;
  }

  .gradient-brand-subtle {
    @apply bg-gradient-to-br from-primary/10 to-accent/10;
  }
}
```

### Usage

```tsx
// Gradient button
<Button className="gradient-brand text-white hover:opacity-90">
  Join Place
</Button>

// Gradient text heading
<h2 className="text-3xl font-bold gradient-brand-text">
  Discover Places
</h2>

// Gradient border wrapper
<div className="p-[2px] rounded-3xl gradient-brand-border">
  <div className="bg-card rounded-3xl p-6">
    {children}
  </div>
</div>

// Subtle background for stats
<div className="gradient-brand-subtle rounded-xl p-4">
  <Users className="h-5 w-5 text-primary" />
  <span>42 members</span>
</div>
```

### Migration Examples

| Before | After |
|--------|-------|
| `from-[#6867B0] to-cyan-400` | `gradient-brand` or `from-primary to-accent` |
| `text-[#6867B0]` | `text-primary` |
| `bg-[#6867B0]/10` | `bg-primary/10` |
| `border-[#6867B0]/20` | `border-primary/20` |
| `shadow-[#6867B0]/30` | `shadow-primary/30` |

---

## 7. Component Import Conventions

### Standard Import Order

```tsx
// 1. React
import { useState, useEffect } from "react";

// 2. Next.js
import { useRouter } from "next/navigation";

// 3. shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 4. Icons
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

// 5. Local types/utils
import { cn } from "@/lib/utils";
import { Place } from "@/types/database";
```

### shadcn Component Checklist

- [x] Button (installed)
- [x] Card (installed)
- [x] Input (installed)
- [x] Label (installed)
- [x] Skeleton (installed)
- [x] Tabs (installed)
- [x] Badge (installed)
- [x] Textarea (installed)
- [ ] Alert (needs install: `npx shadcn@latest add alert`)

---

## Quick Reference

| Pattern | Before | After |
|---------|--------|-------|
| Primary color | `#6867B0`, `[#6867B0]` | `primary` |
| Accent color | `cyan-400`, `cyan-500` | `accent` |
| Gradient bg | `from-[#6867B0] to-cyan-400` | `gradient-brand` |
| Gradient text | manual clip-text | `gradient-brand-text` |
| Error display | custom div | `<Alert variant="destructive">` |
| Icon sizing | `size={20}` | `className="h-5 w-5"` |
| Loading spinner | various | `<Loader2 className="h-4 w-4 animate-spin" />` |


  1. Brand Color Mapping - --primary updated to exact #6867B0 (HSL 244 30% 55%), with migration table from hardcoded colors to CSS variables
  2. View Component Structure - Card wrapping only for modal/overlay views (SearchView, DetailsView), full-page views remain div-based
  3. Error Handling - Migrate from custom div styling to shadcn Alert component (requires npx shadcn@latest add alert)
  4. Icon Standards - Use h-X w-X Tailwind classes instead of size={N} prop, with size table by context
  5. Animation Standards - Reference for existing keyframes and usage rules
  6. Gradient Utility Classes - Five reusable classes (.gradient-brand, .gradient-brand-text, etc.) to replace hardcoded gradient patterns
  7. Quick Reference Table - At-a-glance migration patterns

  Next step when ready to refactor: install the Alert component with npx shadcn@latest add alert.
