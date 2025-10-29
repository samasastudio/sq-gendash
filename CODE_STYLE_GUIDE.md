# Code Style Guide

## Naming Conventions

### Components
- Use PascalCase for both the component symbol and the file name.
- Store UI components directly under `components/` (or its subfolders) using matching PascalCase names.
- **Example:** `RoleToggle` component lives in `components/RoleToggle.tsx` and is imported as `import { RoleToggle } from "@/components/RoleToggle";`.

### Hooks
- Name React hooks with a `use` prefix followed by PascalCase.
- Keep hook file names aligned with the exported hook.
- **Example:** `usePlanWorkspace` is defined in `hooks/usePlanWorkspace.ts` and imported as `import { usePlanWorkspace } from "@/hooks/usePlanWorkspace";`.

### Helpers and Utilities
- Use camelCase file names for helpers and utilities.
- Export camelCased helpers to mirror their file names.
- **Example:** Dashboard grid helpers live in `helpers/dashboardGrid.ts` and expose functions such as `toChartData`.
- **Example:** Number formatting utilities live in `utilities/formatNumber.ts` and export `formatNumber`.

## Reviewer Feedback Application
- Apply reviewer feedback consistently across the codebase, not only on the commented line.
- When a naming or structural change is requested, audit other affected files to keep conventions uniform.

## Functional Programming Practices
- Favor pure functions and declarative data flows whenever possible.
- Prefer immutable data handling—avoid mutating inputs directly.
- Clone or map collections before transforming them (e.g., `const next = items.map(...)`).
- Use React state setters with functional updates when deriving new state from previous values.
- Avoid type assertions unless absolutely necessary for third-party interop; prefer refining types through guards instead.
- Never rely on in-place mutations except when reducing collections via `Array.prototype.reduce` with a returned accumulator.
- Replace `for`/`while` loops with array combinators such as `map`, `filter`, `flatMap`, and `reduce`—never reach for explicit loop keywords.
- Opt for flat, readable control flow over deeply nested logic structures—extract helper functions to keep components review-friendly.
- Avoid `else`, `else if`, and nested `if` statements; return early or extract helpers to keep each condition isolated.

## Constants and Schemas
- Co-locate shared constants inside the `constants/` directory and import them where needed.
- Place runtime validation helpers and request/response schemas inside the `schemas/` directory.
- Keep constants and schema modules free of side effects so they can be consumed across server and client code.

### Examples
- ✅ `const nextPlans = plans.map(derivePlan);` keeps state immutable.
- ✅ `if (!isValidPlan(plan)) return null;` guards early to avoid nested `if` blocks.
- ✅ `import { PLAN_SAMPLE_PROMPTS } from "@/constants/plan";` centralizes shared configuration in the constants directory.
- ✅ `const body = parsePlanRequestBody(payload);` demonstrates using a schema helper instead of ad-hoc parsing.
- ✅ `return allocations.reduce((acc, allocation) => acc.concat(normalize(allocation)), [] as Allocation[]);` confines mutation to the reducer accumulator.
- ✅ `const totals = rows.flatMap(toValues).reduce(sumValues, initialTotals);` keeps iteration declarative without `for` loops.
- ❌ `const result = plans as any;` uses a type assertion instead of safe refinement.
- ❌ `plan.items.push(newItem);` mutates existing arrays outside of a reducer context.
- ❌ `for (let index = 0; index < rows.length; index += 1) { /* ... */ }` relies on a loop instead of array utilities.

