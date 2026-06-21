# 沉浸式海景倒计时网站实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个支持邮箱验证码与微信登录、专注/休闲计时、海景背景、第三方音乐适配及专注统计的响应式公开网站。

**Architecture:** 使用 Next.js App Router 构建前后端一体应用，PostgreSQL/Prisma 持久化业务数据，浏览器使用目标结束时间驱动计时并通过本地队列补同步。认证、音乐平台和媒体资源均通过明确接口隔离，首版音乐使用模拟适配器。

**Tech Stack:** Next.js、React、TypeScript、Tailwind CSS、PostgreSQL、Prisma、Auth.js、Zod、Vitest、Testing Library、Playwright、pnpm

## Global Constraints

- 公开多用户网站，兼容手机、平板和电脑。
- 登录方式必须包含邮箱验证码与微信扫码。
- 默认采用极简沉浸布局、清晨蓝调静态海景，可切换循环视频。
- 专注模式默认 25 分钟专注、5 分钟休息、4 轮循环；休闲模式使用自由倒计时。
- 计时以目标结束时间为准，不能依赖固定间隔累加。
- 网络中断时继续本地计时，恢复后幂等同步。
- 音乐使用统一适配接口；未取得授权前只启用模拟适配器，不抓取或绕过平台限制。
- 首版不包含好友、排行榜、社区、付费订阅和用户媒体上传。

## 文件结构

```text
src/
  app/                 路由、页面与 Route Handlers
  auth/                Auth.js 配置、验证码与微信提供方
  components/          页面级可复用视觉组件
  features/timer/      计时领域模型、hook 和计时器 UI
  features/music/      音乐契约、模拟适配器与播放器状态
  features/settings/   用户模式及背景设置
  features/stats/      专注汇总查询与图表视图
  lib/                 数据库、校验、错误和通用基础设施
prisma/                数据模型与迁移
public/backgrounds/    已授权的静态及视频海景资源
tests/e2e/             Playwright 核心流程
```

---

### Task 1: 应用骨架与测试基线

**Files:**
- Create: `package.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `vitest.config.ts`
- Create: `src/app/page.test.tsx`
- Create: `playwright.config.ts`

**Interfaces:**
- Produces: 可运行的 Next.js App Router 应用以及 `pnpm test`、`pnpm test:e2e` 命令。

- [ ] **Step 1: 使用 create-next-app 创建 TypeScript、App Router、Tailwind、ESLint 项目**

Run: `pnpm create next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm`

Expected: 生成可由 `pnpm dev` 启动的项目；保留已有 `docs/` 和 `.gitignore` 内容。

- [ ] **Step 2: 安装测试依赖并定义测试脚本**

Run: `pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom @vitejs/plugin-react playwright @playwright/test`

在 `package.json` 中加入：

```json
{"scripts":{"test":"vitest run","test:watch":"vitest","test:e2e":"playwright test"}}
```

- [ ] **Step 3: 先写首页失败测试**

```tsx
// src/app/page.test.tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Page from "./page";

test("renders the product name", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { name: "潮汐时光" })).toBeTruthy();
});
```

Run: `pnpm test src/app/page.test.tsx`

Expected: FAIL，页面尚未包含“潮汐时光”。

- [ ] **Step 4: 实现最小首页并验证**

```tsx
// src/app/page.tsx
export default function Page() {
  return <main><h1>潮汐时光</h1></main>;
}
```

Run: `pnpm test && pnpm lint && pnpm build`

Expected: 全部通过。

- [ ] **Step 5: 提交**

Run: `git add package.json pnpm-lock.yaml src vitest.config.ts playwright.config.ts && git commit -m "chore: scaffold countdown application"`

---

### Task 2: 可校准的计时领域引擎

**Files:**
- Create: `src/features/timer/types.ts`
- Create: `src/features/timer/timer-engine.ts`
- Create: `src/features/timer/timer-engine.test.ts`

**Interfaces:**
- Produces: `createTimer(config, now)`, `pauseTimer(state, now)`, `resumeTimer(state, now)`, `remainingMs(state, now)`。

- [ ] **Step 1: 定义类型并写失败测试**

```ts
// src/features/timer/types.ts
export type TimerStatus = "idle" | "running" | "paused" | "completed";
export type TimerState = { status: TimerStatus; durationMs: number; endsAt: number | null; remainingOnPauseMs: number | null };
```

```ts
// src/features/timer/timer-engine.test.ts
import { expect, test } from "vitest";
import { createTimer, pauseTimer, remainingMs, resumeTimer } from "./timer-engine";

test("uses an absolute end time and survives delayed ticks", () => {
  const running = createTimer({ durationMs: 60_000 }, 1_000);
  expect(remainingMs(running, 31_000)).toBe(30_000);
  expect(remainingMs(running, 70_000)).toBe(0);
});

test("preserves remaining time while paused", () => {
  const paused = pauseTimer(createTimer({ durationMs: 60_000 }, 0), 20_000);
  expect(remainingMs(paused, 50_000)).toBe(40_000);
  expect(remainingMs(resumeTimer(paused, 50_000), 60_000)).toBe(30_000);
});
```

Run: `pnpm test src/features/timer/timer-engine.test.ts`

Expected: FAIL，`timer-engine` 不存在。

- [ ] **Step 2: 实现纯函数引擎**

```ts
// src/features/timer/timer-engine.ts
import type { TimerState } from "./types";

export function createTimer(config: { durationMs: number }, now: number): TimerState {
  return { status: "running", durationMs: config.durationMs, endsAt: now + config.durationMs, remainingOnPauseMs: null };
}
export function remainingMs(state: TimerState, now: number): number {
  if (state.status === "paused") return state.remainingOnPauseMs ?? 0;
  if (state.endsAt === null) return state.durationMs;
  return Math.max(0, state.endsAt - now);
}
export function pauseTimer(state: TimerState, now: number): TimerState {
  return { ...state, status: "paused", endsAt: null, remainingOnPauseMs: remainingMs(state, now) };
}
export function resumeTimer(state: TimerState, now: number): TimerState {
  const remaining = state.remainingOnPauseMs ?? state.durationMs;
  return { ...state, status: "running", endsAt: now + remaining, remainingOnPauseMs: null };
}
```

- [ ] **Step 3: 验证并提交**

Run: `pnpm test src/features/timer/timer-engine.test.ts && git add src/features/timer && git commit -m "feat: add drift-resistant timer engine"`

Expected: 2 tests PASS，提交成功。

---

### Task 3: 专注与休闲模式状态机

**Files:**
- Create: `src/features/timer/mode-machine.ts`
- Create: `src/features/timer/mode-machine.test.ts`
- Create: `src/features/timer/use-countdown.ts`
- Create: `src/features/timer/local-timer-store.ts`

**Interfaces:**
- Consumes: Task 2 的计时引擎。
- Produces: `advanceFocusPhase(session)` 以及供 UI 使用的 `useCountdown()`。

- [ ] **Step 1: 写默认配置与阶段推进失败测试**

```ts
import { expect, test } from "vitest";
import { advanceFocusPhase, defaultFocusConfig } from "./mode-machine";

test("defaults to 25/5 minutes and four rounds", () => {
  expect(defaultFocusConfig).toEqual({ focusMs: 1_500_000, breakMs: 300_000, rounds: 4 });
});
test("moves focus to break without incrementing the round", () => {
  expect(advanceFocusPhase({ phase: "focus", round: 1, rounds: 4 })).toEqual({ phase: "break", round: 1, rounds: 4, done: false });
});
```

Run: `pnpm test src/features/timer/mode-machine.test.ts`

Expected: FAIL。

- [ ] **Step 2: 实现模式状态机**

```ts
export const defaultFocusConfig = { focusMs: 25 * 60_000, breakMs: 5 * 60_000, rounds: 4 } as const;
type FocusSession = { phase: "focus" | "break"; round: number; rounds: number; done?: boolean };
export function advanceFocusPhase(s: FocusSession): FocusSession {
  if (s.phase === "focus") return { ...s, phase: "break", done: false };
  const nextRound = s.round + 1;
  return { ...s, phase: "focus", round: nextRound, done: nextRound > s.rounds };
}
```

- [ ] **Step 3: 在 hook 中每 250ms 用 `Date.now()` 重新计算剩余时间，不累加 tick**

```ts
const [now, setNow] = useState(() => Date.now());
useEffect(() => {
  const id = window.setInterval(() => setNow(Date.now()), 250);
  return () => window.clearInterval(id);
}, []);
const remaining = remainingMs(state, now);
```

每次状态变化时把 `TimerState` 写入 `localStorage`；初始化时读取并用当前时间重新计算剩余时间，已到期的计时恢复为完成确认状态。

- [ ] **Step 4: 验证并提交**

Run: `pnpm test src/features/timer && git add src/features/timer && git commit -m "feat: add focus and leisure mode state"`

Expected: 所有 timer tests PASS。

---

### Task 4: 沉浸式计时器界面与背景降级

**Files:**
- Create: `src/components/app-shell.tsx`
- Create: `src/components/ocean-background.tsx`
- Create: `src/features/timer/timer-face.tsx`
- Create: `src/features/timer/timer-face.test.tsx`
- Modify: `src/app/page.tsx`
- Add: `public/backgrounds/morning-ocean.webp`
- Add: `public/backgrounds/morning-ocean-loop.mp4`

**Interfaces:**
- Consumes: `useCountdown()`。
- Produces: 响应式首页和 `OceanBackground({ motionEnabled })`。

- [ ] **Step 1: 写可访问性失败测试**

```tsx
test("exposes mode and timer controls by name", () => {
  render(<TimerFace />);
  expect(screen.getByRole("button", { name: "开始专注" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "休闲模式" })).toBeTruthy();
});
```

Run: `pnpm test src/features/timer/timer-face.test.tsx`

Expected: FAIL。

- [ ] **Step 2: 实现极简界面**

```tsx
export function TimerFace() {
  return <section aria-label="倒计时">
    <div role="tablist" aria-label="计时模式"><button role="tab" aria-selected>专注模式</button><button role="tab">休闲模式</button></div>
    <output aria-live="polite" className="text-7xl tabular-nums">25:00</output>
    <button>开始专注</button>
  </section>;
}
```

- [ ] **Step 3: 实现视频失败回退和减少动态效果支持**

```tsx
const [videoFailed, setVideoFailed] = useState(false);
return <div className="absolute inset-0 bg-[url('/backgrounds/morning-ocean.webp')] bg-cover">
  {motionEnabled && !videoFailed ? <video className="motion-reduce:hidden" autoPlay muted loop playsInline onError={() => setVideoFailed(true)} src="/backgrounds/morning-ocean-loop.mp4" /> : null}
</div>;
```

- [ ] **Step 4: 验证响应式布局并提交**

Run: `pnpm test && pnpm lint && pnpm build`

Expected: 全部通过。

Run: `git add src public/backgrounds && git commit -m "feat: build immersive ocean timer interface"`

---

### Task 5: 数据模型与用户设置

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `src/features/settings/schema.ts`
- Create: `src/features/settings/schema.test.ts`
- Create: `src/app/api/settings/route.ts`

**Interfaces:**
- Produces: Prisma `User`、`UserSettings`、`TimerSession` 模型及 `settingsSchema`。

- [ ] **Step 1: 安装数据库依赖并写设置校验测试**

Run: `pnpm add @prisma/client zod && pnpm add -D prisma`

```ts
test("rejects focus durations below one minute", () => {
  expect(settingsSchema.safeParse({ focusMinutes: 0, breakMinutes: 5, rounds: 4, motionBackground: false }).success).toBe(false);
});
```

- [ ] **Step 2: 定义校验契约**

```ts
export const settingsSchema = z.object({
  focusMinutes: z.number().int().min(1).max(180),
  breakMinutes: z.number().int().min(1).max(60),
  rounds: z.number().int().min(1).max(12),
  motionBackground: z.boolean(),
});
```

- [ ] **Step 3: 创建 Prisma 模型**

```prisma
model User { id String @id @default(cuid()) email String? @unique wechatOpenId String? @unique settings UserSettings? sessions TimerSession[] createdAt DateTime @default(now()) }
model UserSettings { id String @id @default(cuid()) userId String @unique focusMinutes Int @default(25) breakMinutes Int @default(5) rounds Int @default(4) motionBackground Boolean @default(false) user User @relation(fields:[userId], references:[id], onDelete:Cascade) }
model TimerSession { id String @id userId String mode String startedAt DateTime endedAt DateTime? durationMs Int interrupted Boolean @default(false) syncKey String @unique user User @relation(fields:[userId], references:[id], onDelete:Cascade) }
```

- [ ] **Step 4: 迁移、测试并提交**

Run: `pnpm prisma format && pnpm prisma migrate dev --name init && pnpm test src/features/settings`

Expected: migration 和 tests PASS。

Run: `git add prisma src/lib src/features/settings src/app/api/settings && git commit -m "feat: persist user timer settings"`

---

### Task 6: 邮箱验证码与微信扫码登录

**Files:**
- Create: `src/auth/config.ts`
- Create: `src/auth/wechat-provider.ts`
- Create: `src/auth/otp.ts`
- Create: `src/auth/otp.test.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Produces: `auth()`, `signIn()`, `signOut()`；邮箱 OTP 发送限流；微信 OAuth provider。

- [ ] **Step 1: 安装认证依赖并写验证码测试**

Run: `pnpm add next-auth @auth/prisma-adapter`

```ts
test("expires an otp after ten minutes", () => {
  expect(isOtpValid({ createdAt: 0, codeHash: hashOtp("123456") }, "123456", 600_001)).toBe(false);
});
```

- [ ] **Step 2: 实现 OTP 哈希与有效期**

```ts
export const hashOtp = (code: string) => createHash("sha256").update(code).digest("hex");
export const isOtpValid = (record: { createdAt: number; codeHash: string }, code: string, now: number) => now - record.createdAt <= 600_000 && timingSafeEqual(Buffer.from(record.codeHash), Buffer.from(hashOtp(code)));
```

- [ ] **Step 3: 配置 Auth.js provider**

```ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [emailOtpProvider, wechatProvider],
});
```

微信 provider 必须使用已审核应用的 `WECHAT_CLIENT_ID`、`WECHAT_CLIENT_SECRET` 和备案域名回调地址；测试环境使用 provider mock，不保存真实密钥。

- [ ] **Step 4: 验证登录失败、过期、取消和回退路径并提交**

Run: `pnpm test src/auth && pnpm lint && pnpm build`

Expected: 全部通过，缺少生产密钥时构建不泄露值。

Run: `git add src/auth src/app/api/auth src/app/login && git commit -m "feat: add email otp and wechat authentication"`

---

### Task 7: 离线会话与幂等同步

**Files:**
- Create: `src/features/timer/sync-queue.ts`
- Create: `src/features/timer/sync-queue.test.ts`
- Create: `src/app/api/timer-sessions/route.ts`
- Create: `src/lib/session-repository.ts`

**Interfaces:**
- Produces: `enqueueSession(record)`, `flushSessions(send)` 和 `POST /api/timer-sessions`。

- [ ] **Step 1: 写离线保留及成功移除测试**

```ts
test("keeps failed records and removes acknowledged records", async () => {
  const queue = createMemoryQueue([{ syncKey: "a" }, { syncKey: "b" }]);
  await flushSessions(queue, async (r) => r.syncKey === "a");
  expect(queue.items()).toEqual([{ syncKey: "b" }]);
});
```

- [ ] **Step 2: 实现队列契约并用 IndexedDB 作为浏览器存储**

```ts
export async function flushSessions(queue: Queue, send: (r: PendingSession) => Promise<boolean>) {
  for (const record of await queue.items()) if (await send(record)) await queue.remove(record.syncKey);
}
```

其中队列契约固定为：

```ts
export type PendingSession = { syncKey: string; mode: "focus" | "leisure"; startedAt: string; endedAt: string; durationMs: number; interrupted: boolean };
export interface Queue { items(): Promise<PendingSession[]>; remove(syncKey: string): Promise<void>; put(record: PendingSession): Promise<void> }
```

- [ ] **Step 3: 服务端按 `syncKey` 幂等 upsert**

```ts
await prisma.timerSession.upsert({ where: { syncKey: input.syncKey }, create: { ...input, userId }, update: {} });
return Response.json({ acknowledged: true });
```

- [ ] **Step 4: 验证并提交**

Run: `pnpm test src/features/timer/sync-queue.test.ts && git add src/features/timer src/app/api/timer-sessions src/lib/session-repository.ts && git commit -m "feat: sync timer sessions after reconnect"`

---

### Task 8: 音乐平台契约与模拟适配器

**Files:**
- Create: `src/features/music/types.ts`
- Create: `src/features/music/adapter.ts`
- Create: `src/features/music/mock-adapter.ts`
- Create: `src/features/music/mock-adapter.test.ts`
- Create: `src/app/api/music/search/route.ts`
- Create: `src/components/music-drawer.tsx`

**Interfaces:**
- Produces: `MusicAdapter.capabilities()`, `search(query)`, `resolvePlayback(trackId)`。

- [ ] **Step 1: 定义并测试适配器契约**

```ts
export interface MusicAdapter {
  capabilities(): { search: boolean; playback: boolean };
  search(query: string): Promise<Track[]>;
  resolvePlayback(trackId: string): Promise<{ url: string; expiresAt: number } | null>;
}
```

```ts
export type Track = { id: string; title: string; artist: string; source: string };
export const demoTracks: Track[] = [{ id: "coast-piano", title: "海岸钢琴", artist: "Demo", source: "mock" }];
```

```ts
test("mock adapter returns licensed demo tracks", async () => {
  expect((await mockMusicAdapter.search("海岸"))[0]).toMatchObject({ title: "海岸钢琴", source: "mock" });
});
```

- [ ] **Step 2: 实现固定演示曲目和不支持能力返回值**

```ts
export const mockMusicAdapter: MusicAdapter = {
  capabilities: () => ({ search: true, playback: true }),
  search: async (q) => demoTracks.filter((t) => t.title.includes(q)),
  resolvePlayback: async (id) => ({ url: `/demo-music/${id}.mp3`, expiresAt: Date.now() + 3_600_000 }),
};
```

- [ ] **Step 3: 增加服务端搜索入口和抽屉 UI；平台故障不得停止计时**

Run: `pnpm test src/features/music && pnpm lint && pnpm build`

Expected: 全部通过。

- [ ] **Step 4: 提交**

Run: `git add src/features/music src/app/api/music src/components/music-drawer.tsx && git commit -m "feat: add pluggable music adapter"`

---

### Task 9: 专注统计与账户设置

**Files:**
- Create: `src/features/stats/aggregate.ts`
- Create: `src/features/stats/aggregate.test.ts`
- Create: `src/app/stats/page.tsx`
- Create: `src/app/settings/page.tsx`
- Create: `src/app/api/account/route.ts`

**Interfaces:**
- Produces: `aggregateDailySessions(sessions, zone)`，统计页面和账户数据删除入口。

- [ ] **Step 1: 写跨午夜与中断统计测试**

```ts
test("counts completed focus time but keeps interruption count", () => {
  const result = aggregateDailySessions([{ mode: "focus", durationMs: 1_500_000, interrupted: false }, { mode: "focus", durationMs: 300_000, interrupted: true }], "Asia/Shanghai");
  expect(result).toMatchObject({ completedMs: 1_500_000, interruptions: 1 });
});
```

- [ ] **Step 2: 实现纯聚合函数，休闲模式不计入专注统计**

```ts
export function aggregateDailySessions(rows: SessionRow[], zone: string) {
  return rows.filter((r) => r.mode === "focus").reduce((a, r) => ({ completedMs: a.completedMs + (r.interrupted ? 0 : r.durationMs), interruptions: a.interruptions + Number(r.interrupted) }), { completedMs: 0, interruptions: 0, zone });
}
```

`SessionRow` 定义为：

```ts
export type SessionRow = { mode: "focus" | "leisure"; durationMs: number; interrupted: boolean; endedAt: Date };
```

- [ ] **Step 3: 实现统计页面与设置页面**

统计页展示今日时长、完成轮数、连续天数和最近七天数据；设置页编辑模式、背景、提醒、音乐偏好，并提供退出登录及删除个人数据入口。

- [ ] **Step 4: 验证并提交**

Run: `pnpm test src/features/stats && pnpm build`

Expected: 全部通过。

Run: `git add src/features/stats src/app/stats src/app/settings src/app/api/account && git commit -m "feat: add focus statistics and account settings"`

---

### Task 10: 端到端验收、性能与上线检查

**Files:**
- Create: `tests/e2e/timer.spec.ts`
- Create: `tests/e2e/offline-sync.spec.ts`
- Create: `tests/e2e/auth.spec.ts`
- Create: `docs/deployment.md`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: Tasks 1–9 的完整应用。
- Produces: 可重复执行的首版验收套件与部署说明。

- [ ] **Step 1: 写计时恢复端到端测试**

```ts
test("restores an active timer after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始专注" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "暂停" })).toBeVisible();
});
```

- [ ] **Step 2: 写断网同步和认证模拟流程**

```ts
await context.setOffline(true);
await page.getByRole("button", { name: "结束本次专注" }).click();
await context.setOffline(false);
await expect(page.getByText("记录已同步")).toBeVisible();
```

- [ ] **Step 3: 在桌面和手机视口运行验收**

Run: `pnpm exec playwright test --project=chromium`

Expected: 登录模拟、计时恢复、视频回退、音乐故障和离线补同步全部 PASS。

- [ ] **Step 4: 执行完整质量门禁**

Run: `pnpm test && pnpm lint && pnpm build && pnpm test:e2e`

Expected: 所有命令退出码为 0，无跳过的核心流程。

- [ ] **Step 5: 编写部署说明并提交**

`docs/deployment.md` 必须列出 PostgreSQL、邮件服务、微信审核应用、备案域名、CDN、环境变量、数据库迁移、回滚步骤和隐私政策检查项。

Run: `git add tests docs/deployment.md next.config.ts && git commit -m "test: add production acceptance coverage"`
