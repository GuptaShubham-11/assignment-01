## Export Software Frontend

Built on top of [fe-zen-arch](git@github.com:shivamkj/fe-zen-arch.git) — the core shared architecture for B2B SaaS frontends.

### Libraries

- **React** [Docs](https://react.dev/reference/react)
- **Tailwind CSS** [Docs](https://tailwindcss.com/docs/installation)
- **React Query** [Docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- **React Hook Form** [Docs](https://www.react-hook-form.com/get-started)
- **Zustand** [Docs](https://zustand.docs.pmnd.rs/)

### Setup

```bash
pnpm install   # fe-zen-arch is included as a git submodule, init it first if missing
pnpm dev       # dev server on port 5173
pnpm lint      # prettier + tsc + eslint (fe-zen-arch lint pipeline)
pnpm build     # production build
```

### Notes

- `core`, `ui`, `auth`, `icons` are fe-zen-arch workspace packages, aliased via tsconfig paths & vite aliases.
- Forms are built directly with `useForm` from `core/form` + `Form` / `SubmitButton` from `core/form/components` — no generic form templates.
- Routing uses fe-zen-arch's zustand router: routes defined in `src/shared/routes.tsx`, paths in `src/shared/route-paths.ts`.
- Auth uses the fe-zen-arch auth module (routes, interceptors, login pages) out of the box.
- API base URL comes from `PUBLIC_API_URL` (`.env`).
- Don't use react-query mutation for react-hook-form submit handler.
- For HMR (hot refresh), the file must export only react component, and not any other constant or object.
- While most input elements use `...register('name')`, custom elements like select require `<Select<T> name="name" />` instead.

# AI Coding Guidelines

- **Understand first:** Review the existing codebase, architecture, Git submodules, and form flow before making changes.
- **Refactor, don’t overengineer:** Improve readability, reuse, naming, and separation of UI, business logic, and data access while preserving existing functionality.
- **Keep services API-ready:** Use asynchronous, Promise-based mock services for fetching options and submitting Shipping Bills. Keep mock data outside UI components.
- **Handle edge cases:** Support loading, success, empty, and error states. Add sensible form validation and document domain assumptions.
- **Respect constraints:** Do not add dependencies or build unnecessary infrastructure. Follow the existing project architecture where practical.
- **Use AI responsibly:** Review, understand, test, and refine all AI-generated code. Prefer simple, maintainable solutions over large rewrites.
- **Validate before submission:** Run available lint/build checks, verify the form works, and update the README with a short **AI Usage & Approach** section.
- **Prepare to explain:** Be ready to justify architectural choices, trade-offs, service design, and testing decisions in the technical interview.

**Guiding principle:** Deliver a working, focused refactor that another engineer can easily understand, maintain, and extend.
