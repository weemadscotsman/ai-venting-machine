## 2024-05-18 - Missing Standard Scripts
**Learning:** The project does not currently have `test` or `lint` scripts configured in `package.json`.
**Action:** When required to run `pnpm lint` or `pnpm test`, ensure these commands actually exist before attempting to run them. Rely on `pnpm tsc --noEmit && pnpm run build` as the primary verification mechanism.
