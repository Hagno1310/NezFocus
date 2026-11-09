This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

This repo uses pnpm: run these from `apps/mobile` with `pnpm exec` in place of `npx`.

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
pnpm lint                   # lint (oxlint, config at repo root)
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **React Navigation** (SRS ADR-03): native stack, bottom tabs, nested left/right drawers; deep links via the `linking` config. Not Expo Router.
- Layered architecture (SRS 7.3.1): `src/features/*` (screens, hooks) → `src/domain` (pure TS use cases, no React/RN imports) → `src/data` (repositories, ApiClient, GatewayClient, op-sqlite). Screens never call `fetch`/WebSocket/LiveKit directly.
- State: Zustand for client state, TanStack Query for backend data — one place per datum.
- Docs: https://reactnavigation.org/docs/getting-started

## Gotchas (đã gặp trên máy thật)

- **Thanh trạng thái:** `ScreenHeader` tự nhận safe area trên. Màn có `ScreenHeader` không thêm `paddingTop: top`; màn không có header (drawer, placeholder, màn toàn khung) tự lấy `useSafeAreaInsets().top`. Màn mới: chụp màn trên máy thật, xem ‹ và tiêu đề không đè thanh trạng thái.
- **Màn đang đóng (react-native-screens, Fabric):** khi một màn bị pop, react-native-screens giữ view của nó cho hiệu ứng thoát (`startViewTransition`). Nếu lúc đó cây view của màn đổi hình — một `View` chỉ có style bố cục được bật/tắt `opacity`, `backgroundColor`… nên lúc bị Fabric gộp (flatten), lúc không — thì view con phải đổi cha và app crash: "addViewAt … The specified child already has a parent". View nào có style đổi theo state mà có thể vừa đóng màn vừa đổi (nút loading, overlay) thì đặt `collapsable={false}`. Đọc log bằng `adb logcat`: dòng "Views created for surface" cho biết tag nào thuộc component nào.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If the `android/` directory does not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `pnpm android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
