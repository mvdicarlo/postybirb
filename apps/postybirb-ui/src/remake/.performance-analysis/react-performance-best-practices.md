# React Performance & Memory Best Practices

A comprehensive reference of well-known rules and patterns for optimizing React application performance, reducing unnecessary re-renders, and preventing memory leaks.

---

## Table of Contents

1. [Rendering & Re-render Prevention](#1-rendering--re-render-prevention)
2. [Memoization](#2-memoization)
3. [State Management](#3-state-management)
4. [Component Architecture](#4-component-architecture)
5. [Lists & Virtualization](#5-lists--virtualization)
6. [Effects & Subscriptions](#6-effects--subscriptions)
7. [Memory Leak Prevention](#7-memory-leak-prevention)
8. [Bundle Size & Code Splitting](#8-bundle-size--code-splitting)
9. [Event Handlers](#9-event-handlers)
10. [Context API](#10-context-api)
11. [Refs & DOM Access](#11-refs--dom-access)
12. [Images & Media](#12-images--media)
13. [Forms](#13-forms)
14. [Profiling & Measurement](#14-profiling--measurement)
15. [Anti-Patterns to Avoid](#15-anti-patterns-to-avoid)

---

## 1. Rendering & Re-render Prevention

### 1.1 Understand What Triggers Re-renders

A component re-renders when:
- Its **state** changes
- Its **props** change (by reference)
- Its **parent re-renders** (unless memoized)
- A **context value** it consumes changes

### 1.2 Use `React.memo` for Pure Functional Components

Wrap components that receive the same props frequently to skip unnecessary re-renders.

```tsx
const ExpensiveList = React.memo(({ items }: { items: Item[] }) => {
  return items.map(item => <ListItem key={item.id} item={item} />);
});
```

> **Rule:** Only use `React.memo` when profiling shows the component re-renders unnecessarily with the same props. Don't wrap everything blindly.

### 1.3 Avoid Inline Object/Array/Function Creation in JSX

Every render creates a new reference, defeating `React.memo` and causing child re-renders.

```tsx
// ❌ Bad – new object every render
<Component style={{ color: 'red' }} />

// ✅ Good – stable reference
const style = useMemo(() => ({ color: 'red' }), []);
<Component style={style} />
```

### 1.4 Move Static Data Outside Components

Constants, configuration objects, and default values that never change should be declared outside the component body.

```tsx
// ✅ Good – defined once, never re-created
const DEFAULT_FILTERS = { status: 'all', sort: 'date' };
const COLUMNS = ['Name', 'Date', 'Status'];

function Dashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  // ...
}
```

---

## 2. Memoization

### 2.1 `useMemo` – Memoize Expensive Computations

Use for derived data, filtered/sorted lists, or complex calculations.

```tsx
const sortedItems = useMemo(
  () => items.slice().sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

> **Rule:** The cost of the computation should exceed the cost of the memoization itself. Don't memoize trivial operations.

### 2.2 `useCallback` – Memoize Function References

Use when passing callbacks to memoized children or as effect dependencies.

```tsx
const handleClick = useCallback((id: string) => {
  setSelected(id);
}, []);
```

> **Rule:** `useCallback` is only useful when the function is passed to a child wrapped in `React.memo`, used in a dependency array, or passed to a third-party library that checks reference equality.

### 2.3 Dependency Arrays Must Be Correct

- Include **all** values from the component scope that change over time and are used inside the hook.
- Never lie about dependencies to "fix" infinite loops — restructure the code instead.
- Use the `react-hooks/exhaustive-deps` ESLint rule.

### 2.4 Avoid Over-Memoization

Memoization has a cost (memory for cached values, comparison overhead). Only memoize when:
- The computation is genuinely expensive
- The component re-renders frequently with the same inputs
- Profiling confirms a performance benefit

---

## 3. State Management

### 3.1 Keep State as Local as Possible

State should live in the lowest common ancestor that needs it. Lifting state too high causes unnecessary re-renders of the entire subtree.

### 3.2 Split State by Update Frequency

```tsx
// ❌ Bad – one state object, any field change re-renders everything
const [form, setForm] = useState({ name: '', email: '', bio: '' });

// ✅ Good – independent state for independently updating values
const [name, setName] = useState('');
const [email, setEmail] = useState('');
```

### 3.3 Use Functional Updates for State Derived from Previous State

```tsx
// ❌ Bad – stale closure risk, unnecessary dependency
setCount(count + 1);

// ✅ Good – always uses latest state
setCount(prev => prev + 1);
```

### 3.4 Batch State Updates

React 18+ automatically batches state updates in event handlers, promises, timeouts, and native events. In older versions, use `unstable_batchedUpdates` or consolidate into a single state object/`useReducer`.

### 3.5 Use `useReducer` for Complex State Logic

When state transitions are complex or interdependent, `useReducer` provides a single dispatch function (stable reference) and co-locates logic.

### 3.6 Prefer External Stores for Global State

Libraries like Zustand, Jotai, or Valtio provide fine-grained subscriptions, preventing re-renders of components that don't consume the changed slice.

```tsx
// Zustand – component only re-renders when `count` changes
const count = useStore(state => state.count);
```

---

## 4. Component Architecture

### 4.1 Composition Over Configuration

Break large components into smaller, focused ones. Each component should have a single responsibility.

### 4.2 Push State Down, Lift Content Up

```tsx
// ✅ Pattern: children don't re-render when parent's state changes
function ScrollTracker({ children }: { children: React.ReactNode }) {
  const [scrollY, setScrollY] = useState(0);
  // ...
  return <div onScroll={handleScroll}>{children}</div>;
}
```

Since `children` is created by the grandparent, it won't re-render when `ScrollTracker`'s state changes.

### 4.3 Avoid Deeply Nested Component Trees

Deep trees increase reconciliation cost. Flatten where possible using composition patterns.

### 4.4 Never Define Components Inside Other Components

```tsx
// ❌ Bad – new component type every render, destroys all child state
function Parent() {
  const Child = () => <div>Hi</div>; // Remounts every render!
  return <Child />;
}

// ✅ Good – stable component identity
const Child = () => <div>Hi</div>;
function Parent() {
  return <Child />;
}
```

---

## 5. Lists & Virtualization

### 5.1 Use Stable, Unique Keys

```tsx
// ❌ Bad – index as key causes reconciliation issues on reorder/insert/delete
items.map((item, index) => <Item key={index} />);

// ✅ Good – stable identity
items.map(item => <Item key={item.id} />);
```

### 5.2 Virtualize Long Lists

For lists exceeding ~100 items, use virtualization to render only visible items:
- **react-window** (lightweight)
- **react-virtuoso** (feature-rich)
- **@tanstack/react-virtual** (headless)

### 5.3 Memoize List Item Components

```tsx
const ListItem = React.memo(({ item }: { item: Item }) => {
  return <div>{item.name}</div>;
});
```

### 5.4 Avoid Spreading New Objects as Props in Loops

```tsx
// ❌ Bad – new object per render per item
items.map(item => <Item key={item.id} {...{ ...item, extra: true }} />);

// ✅ Good – pass the item directly
items.map(item => <Item key={item.id} item={item} />);
```

---

## 6. Effects & Subscriptions

### 6.1 Always Clean Up Side Effects

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(setData);

  return () => controller.abort(); // ✅ Cleanup
}, []);
```

### 6.2 Avoid Unnecessary Effects

Effects are for **synchronizing with external systems**. Don't use them for:
- Deriving state from props → use `useMemo` or compute during render
- Responding to events → handle in the event handler
- Resetting state on prop change → use a `key` on the component

```tsx
// ❌ Bad – unnecessary effect
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ Good – derived during render
const fullName = `${firstName} ${lastName}`;
```

### 6.3 Use `AbortController` for Fetch Requests

Prevent state updates on unmounted components and race conditions.

### 6.4 Debounce/Throttle Expensive Effects

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    performSearch(query);
  }, 300);
  return () => clearTimeout(timer);
}, [query]);
```

---

## 7. Memory Leak Prevention

### 7.1 Common Sources of Memory Leaks

| Source | Fix |
|--------|-----|
| Uncleared `setInterval` / `setTimeout` | Clear in cleanup function |
| Unremoved event listeners | Remove in cleanup function |
| Unaborted fetch requests | Use `AbortController` |
| Unsubscribed WebSocket / EventSource | Close/unsubscribe in cleanup |
| Closures capturing stale references | Use refs or functional updates |
| Storing component references globally | Use `WeakRef` or clear on unmount |
| Detached DOM nodes in refs | Set ref to `null` in cleanup |
| Large data cached in state | Implement eviction / limit cache size |

### 7.2 Unsubscribe from External Stores

```tsx
useEffect(() => {
  const unsubscribe = store.subscribe(handleChange);
  return () => unsubscribe();
}, []);
```

### 7.3 Avoid Closures Over Large Data

Closures in callbacks, effects, and memoized values can inadvertently retain large objects in memory.

```tsx
// ❌ Bad – entire largeDataSet retained in closure
useEffect(() => {
  const id = largeDataSet[0].id;
  fetchDetails(id);
}, [largeDataSet]);

// ✅ Good – extract only what's needed
const firstId = largeDataSet[0].id;
useEffect(() => {
  fetchDetails(firstId);
}, [firstId]);
```

### 7.4 Use `WeakRef` / `WeakMap` for Caches

When caching objects that should be garbage-collected when no longer in use elsewhere.

### 7.5 Avoid Growing Unbounded State

```tsx
// ❌ Bad – history grows forever
const [history, setHistory] = useState<Entry[]>([]);
const addEntry = (entry: Entry) => setHistory(prev => [...prev, entry]);

// ✅ Good – bounded history
const MAX_HISTORY = 100;
const addEntry = (entry: Entry) =>
  setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), entry]);
```

---

## 8. Bundle Size & Code Splitting

### 8.1 Lazy Load Routes and Heavy Components

```tsx
const Settings = React.lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Settings />
    </Suspense>
  );
}
```

### 8.2 Dynamic Import Heavy Libraries

```tsx
const handleExport = async () => {
  const { exportToCSV } = await import('./utils/csv-export');
  exportToCSV(data);
};
```

### 8.3 Tree-Shake Imports

```tsx
// ❌ Bad – imports entire library
import _ from 'lodash';

// ✅ Good – imports only used function
import debounce from 'lodash/debounce';
```

### 8.4 Analyze Bundle Size Regularly

Use `webpack-bundle-analyzer`, `source-map-explorer`, or `vite-plugin-inspect` to identify large dependencies.

---

## 9. Event Handlers

### 9.1 Use Event Delegation for Many Similar Elements

Instead of attaching handlers to each list item, attach one to the parent.

```tsx
const handleClick = (e: React.MouseEvent<HTMLUListElement>) => {
  const id = (e.target as HTMLElement).closest('[data-id]')?.dataset.id;
  if (id) selectItem(id);
};

<ul onClick={handleClick}>
  {items.map(item => <li key={item.id} data-id={item.id}>{item.name}</li>)}
</ul>
```

### 9.2 Debounce Input Handlers

```tsx
const handleSearch = useMemo(
  () => debounce((value: string) => search(value), 300),
  []
);

useEffect(() => () => handleSearch.cancel(), [handleSearch]);
```

### 9.3 Use `passive` Event Listeners for Scroll/Touch

```tsx
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('scroll', handler, { passive: true });
  return () => window.removeEventListener('scroll', handler);
}, []);
```

---

## 10. Context API

### 10.1 Split Contexts by Update Frequency

```tsx
// ❌ Bad – one context for everything, all consumers re-render on any change
const AppContext = createContext({ theme: 'light', user: null, locale: 'en' });

// ✅ Good – separate contexts
const ThemeContext = createContext('light');
const UserContext = createContext(null);
const LocaleContext = createContext('en');
```

### 10.2 Memoize Context Values

```tsx
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light');

  // ✅ Stable reference – children only re-render when theme actually changes
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

### 10.3 Consider `useSyncExternalStore` for External State

For integrating non-React state, `useSyncExternalStore` provides tear-free reads and better performance than Context.

### 10.4 Use Selector Patterns to Avoid Unnecessary Re-renders

Libraries like `use-context-selector` or external stores (Zustand) allow subscribing to a slice of state.

---

## 11. Refs & DOM Access

### 11.1 Use Refs for Values That Don't Trigger Re-renders

```tsx
const renderCount = useRef(0);
renderCount.current++; // Doesn't cause re-render
```

### 11.2 Use `useRef` to Store Latest Callback in Effects

```tsx
const callbackRef = useRef(callback);
callbackRef.current = callback;

useEffect(() => {
  const id = setInterval(() => callbackRef.current(), 1000);
  return () => clearInterval(id);
}, []); // No dependency on callback – stable effect
```

### 11.3 Prefer Callback Refs Over `useRef` for DOM Measurement

```tsx
const measureRef = useCallback((node: HTMLDivElement | null) => {
  if (node) {
    setHeight(node.getBoundingClientRect().height);
  }
}, []);
```

---

## 12. Images & Media

### 12.1 Lazy Load Off-Screen Images

```tsx
<img loading="lazy" src={url} alt={alt} />
```

### 12.2 Use Appropriate Image Formats and Sizes

Serve WebP/AVIF, use `srcSet` for responsive images, and specify `width`/`height` to prevent layout shifts.

### 12.3 Clean Up Object URLs

```tsx
useEffect(() => {
  const url = URL.createObjectURL(blob);
  setSrc(url);
  return () => URL.revokeObjectURL(url); // ✅ Prevent memory leak
}, [blob]);
```

---

## 13. Forms

### 13.1 Use Uncontrolled Components for Simple Forms

```tsx
function SimpleForm() {
  const nameRef = useRef<HTMLInputElement>(null);
  const handleSubmit = () => console.log(nameRef.current?.value);
  return <input ref={nameRef} defaultValue="" />;
}
```

### 13.2 Isolate Frequently Updating Inputs

Wrap individual form fields in their own components to prevent re-rendering the entire form on every keystroke.

### 13.3 Avoid Storing Derived Validation State

```tsx
// ❌ Bad
const [email, setEmail] = useState('');
const [isValid, setIsValid] = useState(false);
useEffect(() => setIsValid(email.includes('@')), [email]);

// ✅ Good – derive during render
const [email, setEmail] = useState('');
const isValid = email.includes('@');
```

---

## 14. Profiling & Measurement

### 14.1 Use React DevTools Profiler

- Record interactions and identify components that re-render unnecessarily
- Look for "wasted renders" (renders that produce the same output)
- Check render durations and commit frequencies

### 14.2 Use `<Profiler>` Component Programmatically

```tsx
<Profiler id="Navigation" onRender={(id, phase, actualDuration) => {
  if (actualDuration > 16) {
    console.warn(`Slow render: ${id} took ${actualDuration}ms`);
  }
}}>
  <Navigation />
</Profiler>
```

### 14.3 Use `why-did-you-render` in Development

Automatically logs unnecessary re-renders and their causes.

### 14.4 Use Browser Performance Tools

- **Performance tab** – identify long tasks, layout thrashing, forced reflows
- **Memory tab** – take heap snapshots, identify detached DOM nodes and growing allocations
- **Lighthouse** – overall performance scoring

### 14.5 Measure, Don't Guess

Always profile before optimizing. Premature optimization adds complexity without measurable benefit.

---

## 15. Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Fix |
|---|---|---|
| Defining components inside render | Remounts on every render, destroys state | Move to module scope |
| `useEffect` for derived state | Extra render cycle, sync bugs | Compute during render or `useMemo` |
| Spreading `{...props}` carelessly | Passes unknown props, causes re-renders | Destructure and pass explicitly |
| Index as key in dynamic lists | Incorrect reconciliation, state bugs | Use stable unique IDs |
| Giant monolithic components | Hard to optimize, everything re-renders | Split into focused components |
| State for everything | Unnecessary re-renders | Use refs for non-visual values |
| Fetching in `useEffect` without cleanup | Race conditions, memory leaks | Use `AbortController` or data library |
| `JSON.stringify` in dependency arrays | Expensive, fragile | Use individual primitive deps |
| New `RegExp` / `Date` in render | New object reference each render | Memoize or move outside component |
| Inline `reducer` in `useReducer` | New function reference each render | Define outside component |
| Sync external state via `useEffect` | Tearing, extra renders | Use `useSyncExternalStore` |

---

## Quick Checklist

- [ ] Components don't re-render without prop/state changes (verify with Profiler)
- [ ] No inline object/array/function creation in JSX for memoized children
- [ ] All `useEffect` hooks have proper cleanup
- [ ] Long lists are virtualized
- [ ] Heavy routes/components are lazy-loaded
- [ ] Context is split by update frequency
- [ ] Context values are memoized
- [ ] No components defined inside other components
- [ ] State lives as close to where it's used as possible
- [ ] No unbounded state growth (caches, histories, logs)
- [ ] Object URLs are revoked on cleanup
- [ ] Event listeners are removed on cleanup
- [ ] Bundle size is analyzed and tree-shaking is working
- [ ] Performance is measured with real data, not guessed
- [ ] Zustand selectors returning object literals always use `useShallow`

---

## 16. Zustand Selector Rules

**Never remove `useShallow` from a selector that returns an object literal**, even if all values inside are stable references. Without `useShallow`, Zustand uses `Object.is` on the selector result — a new `{}` fails every time → infinite re-render loop.

```tsx
// ❌ CRASHES — new object every render, Object.is always false
const useActions = () => useStore((s) => ({ load: s.load, clear: s.clear }));

// ✅ Safe — useShallow compares values inside the object
const useActions = () => useStore(useShallow((s) => ({ load: s.load, clear: s.clear })));

// ✅ Also safe — single primitive/ref, no wrapper object
const useLoad = () => useStore((s) => s.load);
```

You can only skip `useShallow` when the selector returns a **single value** (primitive, function ref, or stable object reference from the store).
