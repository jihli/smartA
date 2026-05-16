# Technical Learnings — SplitPro

> 来源项目：[SplitPro](https://github.com/oss-apps/split-pro) — 开源分账应用（Splitwise 替代品）
> 学习日期：2026-05-14
> 后续可继续往此文档追加内容。

---

## 目录

1. [PWA 安装到移动端的实现](#1-pwa-安装到移动端的实现)
2. [收据/图片上传与预览](#2-收据图片上传与预览)
3. [分账拆分的多种方式及数学逻辑](#3-分账拆分的多种方式及数学逻辑)

---

## 1. PWA 安装到移动端的实现

### 整体架构

```
┌──────────────────────────────────────────────────┐
│                   构建时                          │
│  worker/index.ts ──→ @serwist/next ──→ public/sw.js  │
│  public/manifest.json  ←────── 完整的 Web App Manifest │
│  public/icons/*             ←────── iOS/Android/Win 图标│
└──────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────┐
│                   运行时                          │
│  _app.tsx → <Head> PWA meta tags + manifest 链接  │
│  useIsPwa hook → 检测 standalone 模式             │
│  SubscribeNotification → 推送订阅管理             │
│  service worker → push/notificationclick 处理     │
└──────────────────────────────────────────────────┘
```

### 1.1 核心技术栈

**依赖包：**

| 包名            | 用途                                           |
| --------------- | ---------------------------------------------- |
| `@serwist/next` | Next.js 插件，编译时生成 service worker        |
| `serwist`       | Service worker 运行时（替代 Workbox/next-pwa） |
| `web-push`      | 服务端 Web Push 协议（VAPID）                  |

### 1.2 Service Worker 生成

**配置文件：** `next.config.js`

```js
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'worker/index.ts', // TS 源码入口
  swDest: 'public/sw.js', // 编译输出
  disable: process.env.NODE_ENV === 'development', // 开发模式禁用
});
```

开发模式下禁用是因为 Turbopack 与 Serwist 不兼容。生产构建时，Serwist 自动注入预缓存清单。

### 1.3 Service Worker 源码

**文件：** `worker/index.ts`

Service Worker 做了三件事：

1. **预缓存 & 运行时缓存** — 使用 `Serwist` 类，注入 `self.__SW_MANIFEST` 预缓存清单，启用 `defaultCache` 运行时策略
2. **`push` 事件** — 解析推送 payload 中的 title、message、data.url，调用 `self.registration.showNotification()` 弹出通知
3. **`notificationclick` 事件** — 关闭通知后，聚焦已有窗口并导航，或打开新窗口

```ts
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

self.addEventListener('push', function (event) {
  const { title, message, data } = JSON.parse(event?.data?.text() ?? '{}');
  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: '/icons/android-chrome-192x192.png',
      data,
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(/* 聚焦已有窗口或打开新窗口，导航到 data.url */);
});

serwist.addEventListeners();
```

### 1.4 Web App Manifest

**文件：** `public/manifest.json`

关键配置决定了 PWA 的安装体验：

| 字段                               | 值                     | 效果                        |
| ---------------------------------- | ---------------------- | --------------------------- |
| `display`                          | `standalone`           | 全屏运行，无浏览器 chrome   |
| `orientation`                      | `portrait`             | 锁定竖屏                    |
| `start_url`                        | `/balances`            | 启动后的首页                |
| `theme_color` / `background_color` | `#030711`              | 启动屏和状态栏颜色          |
| `icons`                            | 72/192/256/512 px      | 各场景图标（含 `maskable`） |
| `shortcuts`                        | "Add expense" → `/add` | 长按图标弹出快捷方式        |
| `screenshots`                      | desktop + mobile       | 应用商店安装对话框中的截图  |

### 1.5 HTML Meta 标签

**文件：** `src/pages/_app.tsx`

```tsx
<Head>
  {/* Apple 移动端 */}
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="SplitPro" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/ios/180.png" />

  {/* 通用 */}
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#030711" />
  <link rel="manifest" href="/manifest.json" />

  {/* Windows */}
  <meta name="msapplication-config" content="/icons/browserconfig.xml" />
  <meta name="msapplication-TileColor" content="#2B5797" />
</Head>
```

### 1.6 PWA 模式检测

**文件：** `src/hooks/useIsPwa.ts`

```ts
export function useIsPwa(): boolean {
  const [isPwa, setIsPwa] = useState(false);
  useEffect(() => {
    const isIOSStandalone = navigator.standalone ?? false; // Safari
    const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches; // Android/Chrome
    setIsPwa(isIOSStandalone || isDisplayModeStandalone);
  }, []);
  return isPwa;
}
```

用于：隐藏"下载 App"引导（`DownloadAppDrawer`，已在 PWA 模式下不显示）、条件渲染 UI 文案。

### 1.7 Push 通知全链路

```
客户端                             服务端                        数据库
───────                            ──────                        ──────
1. 请求通知权限
   Notification.requestPermission()
2. 获取 VAPID public key
   api.user.getWebPushPublicKey ──→ 返回 env.WEB_PUSH_PUBLIC_KEY
3. 订阅 Push
   pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: VAPID_PubKey
   })
   → 得到 PushSubscription JSON
4. 保存订阅
   api.user.updatePushNotification ────────────────────────────→ PushNotification 表
        (subscription JSON)                                       (userId + endpoint)
5. 触发推送 (当有 expense 变更时)
   sendExpensePushNotification() ←── splitService.ts
        ↓
   webpush.sendNotification()     ←── web-push 库 (node)
        ↓
   Push Service (浏览器厂商)       → 唤醒 Service Worker
        ↓
   sw.js: 'push' event           → showNotification()
6. 用户点击通知
   sw.js: 'notificationclick'    → 导航到指定 URL
```

**关键点：**

- 每个用户可以有**多个设备订阅**（复合主键 `userId + endpoint`）
- 失效订阅（HTTP 404/410）会被**自动清理**
- 定期费用提醒：`checkRecurrenceNotifications()` 每 60 秒轮询一次
- VAPID 密钥来自环境变量，可在 `Web Push` 面板生成

---

## 2. 收据/图片上传与预览

### 整体架构

```
用户选择图片
    │
    ▼
[客户端压缩] browser-image-compression (maxSizeMB, 1920px, JPEG)
    │
    ▼
[客户端校验] validateUploadSize (≤ maxUploadFileSizeMB, 默认 10MB)
    │
    ▼
POST /api/upload (FormData) → formidable 解析
    │
    ▼
[服务端处理] sharp resample + 转 WebP
    ├── 全尺寸: 1200px, WebP q:80 → uploads/{userId}/{uuid}.webp
    └── 缩略图: 200px, WebP q:60  → uploads/{userId}/{uuid}-thumb.webp
    │
    ▼
返回 JSON { key: "{userId}/{uuid}.webp" }
    │
    ▼
存入 Zustand store → fileKey
    │
    ▼
tRPC mutation (addOrEditExpense) → Prisma → 写入 Expense.fileKey
    │
    ▼
展示: ExpenseDetails → Receipt 组件 → GET /api/files/{key}
                                    ├── 缩略图 56x56 (点击)
                                    └── AppDrawer 全屏大图
```

### 2.1 客户端 — 图片选择和压缩

**文件：** `src/components/AddExpense/UploadFile.tsx`

```tsx
// 隐藏的 file input
<input type="file" accept="image/*" hidden />;

// 选择文件后的处理流
const handleFileSelect = async (file: File) => {
  // 1. 客户端压缩
  const compressedFile = await prepareImageForUpload(file, maxUploadFileSizeMB);
  // 2. 大小校验
  validateUploadSize(compressedFile, maxUploadFileSizeMB);
  // 3. 上传
  const { key } = await uploadImage(compressedFile);
  // 4. 存入 store
  setFileKey(key);
};
```

**文件：** `src/utils/imageUpload.ts`

| 函数                                     | 用途         | 关键参数                                                 |
| ---------------------------------------- | ------------ | -------------------------------------------------------- |
| `prepareImageForUpload(file, maxSizeMB)` | 压缩图片     | `browser-image-compression`: 1920px max, JPEG, maxSizeMB |
| `validateUploadSize(file, maxSizeMB)`    | 大小校验     | 比较 `file.size` 和 `maxSizeMB * 1024 * 1024`            |
| `uploadImage(file)`                      | 上传到服务端 | POST `/api/upload`, FormData, 返回 `{ key }`             |

### 2.2 服务端 — 接收和处理

**文件：** `src/pages/api/upload.ts`

```ts
export const config = { api: { bodyParser: false } }; // 让 formidable 处理原始数据

// 鉴权
const session = await getServerAuthSession({ req, res });

// 解析上传
const form = formidable({
  keepExtensions: true,
  maxFileSize: maxUploadFileSizeMB * 1024 * 1024, // 默认 10MB
});

// 存储路径: uploads/{userId}/{uuid}.webp
const outputDir = path.join(UPLOAD_DIR, session.user.id.toString());
const outputPath = path.join(outputDir, `${fileUUID}.webp`);

// Sharp 处理 — 全尺寸
await sharp(file.filepath)
  .resize(1200, undefined, { withoutEnlargement: true }) // 最大宽度 1200px, 不放大
  .webp({ quality: 80 })
  .toFile(outputPath);

// Sharp 处理 — 缩略图
await sharp(file.filepath)
  .resize(200, undefined, { withoutEnlargement: true })
  .webp({ quality: 60 })
  .toFile(path.join(outputDir, `${fileUUID}-thumb.webp`));

// 返回 key
res.json({ key: `${session.user.id}/${fileUUID}.webp` });
```

### 2.3 文件服务

**文件：** `src/pages/api/files/[...path].ts`

```ts
// GET /api/files/1/dcc912e4-e86b-4713-ad79-78bbcd7c1ed6.webp
// 1. 鉴权
// 2. 防路径穿越 (resolve 后必须仍在 UPLOAD_DIR 内)
// 3. 返回文件: Content-Type: image/webp, Cache-Control: private, max-age=31536000, immutable
```

### 2.4 前端预览组件

**文件：** `src/components/Expense/Receipt.tsx`

```tsx
// 输入: fileKey = "1/dcc912e4-e86b-4713-ad79-78bbcd7c1ed6.webp"
// 缩略图 key: 替换 ".webp" → "-thumb.webp"
const thumbKey = fileKey.replace('.webp', '-thumb.webp');

// 渲染缩略图 (56x56), 点击打开 AppDrawer 显示全尺寸
<img src={`/api/files/${thumbKey}`} />;
// 点击 → <AppDrawer> → <img src={`/api/files/${fileKey}`} />
```

**文件：** `src/components/Expense/ExpenseDetails.tsx`

```tsx
{
  expense.fileKey ? <Receipt fileKey={expense.fileKey} /> : null;
}
```

### 2.5 存储总结

| 问题             | 答案                                                           |
| ---------------- | -------------------------------------------------------------- |
| 存储在哪里？     | **本地磁盘** `uploads/{userId}/{uuid}.webp`，不是数据库        |
| 数据库存什么？   | `Expense.fileKey` 字段，只存文件路径字符串（如 `1/uuid.webp`） |
| 为什么这样设计？ | 避免数据库膨胀，文件直接用 nginx/CDN 代理更高效                |
| 有 CDN 支持吗？  | 目前没有，生产部署建议在 nginx 层面直接代理 `uploads/` 目录    |

---

## 3. 分账拆分的多种方式及数学逻辑

### 3.1 七种拆分类型总览

| SplitType               | 含义        | 计算公式（每个参与者）                     | UI 输入           |
| ----------------------- | ----------- | ------------------------------------------ | ----------------- |
| **EQUAL**               | 均分        | `amount / 参与人数`                        | 勾选/取消参与者   |
| **PERCENTAGE**          | 按百分比    | `(百分比 × amount) / 10000` (万分之一精度) | % 数字输入        |
| **SHARE**               | 按权重比    | `(份额 × amount) / 总份额`                 | 份额数字输入      |
| **EXACT**               | 精确金额    | `amount = 输入的金额`                      | 每个参与者金额    |
| **ADJUSTMENT**          | 均分 + 调差 | `(amount - Σ调差) / n + 调差`              | 每人调差金额      |
| **SETTLEMENT**          | 两人转账    | sender: `+amount`, receiver: `-amount`     | 无 UI（专用组件） |
| **CURRENCY_CONVERSION** | 跨币种转账  | 按汇率转换                                 | 无 UI（专用组件） |

### 3.2 核心数据结构

**金额存储：** 所有金额统一用 ECMAScript `BigInt` 存储在数据库中，单位是最小货币单位（如分）。零浮点数，避免精度问题。

**参与者模型：**

```ts
interface Participant {
  userId: number;
  amount: bigint; // 负数 = 欠款 (owe)，正数 = 应收 (is owed)
}
```

**paidBy（付款人）的语义：**

付款人先垫付了全部金额。最终计算时：

- **付款人**: `amount = -(其分摊额) + 总金额` → 表示其他参与者欠他多少
- **非付款人**: `amount = -(其分摊额)` → 表示他欠付款人多少

### 3.3 各类型详细案例

#### 3.3.1 EQUAL — 均分

**场景：** 总金额 $100，3 人分，A 是付款人。

**存储层（shares）：** 每个参与者的 EQUAL share 为 `1n`（被选中）或 `0n`（排除）

**计算过程：**

```
总金额: 10000 (单位: 分 = $100.00)
参与者: A (paid), B, C

分摊: 10000 / 3 = 3333 (每人)
余数: 10000 - 3333*3 = 1 → 按确定性规则分给一个人 (如 B)

最终:
  A (付款人): -(3333) + 10000 = 6667 (B和C共欠A $66.67)
  B: -(3334) = -3334 (B欠A $33.34)
  C: -(3333) = -3333 (C欠A $33.33)
总和: 6667 + (-3334) + (-3333) = 0 ✓
```

#### 3.3.2 PERCENTAGE — 百分比

**场景：** 总金额 $100，A 付了，B 承担 30%，C 承担 70%。

**存储层（shares）：** 万分之一精度 → B 的 PERCENTAGE share = `3000` (30.00%)，C = `7000` (70.00%)

**计算过程：**

```
总金额: 10000 (分)
B 的分摊: (3000 * 10000) / 10000 = 3000
C 的分摊: (7000 * 10000) / 10000 = 7000

最终:
  A (付款人): -(0) + 10000 = 10000 (全额被欠)
  B: -(3000) = -3000 (欠 A $30.00)
  C: -(7000) = -7000 (欠 A $70.00)
总和: 10000 + (-3000) + (-7000) = 0 ✓
```

#### 3.3.3 SHARE — 权重比

**场景：** 总金额 $100，A 付了，B 出 2 份，C 出 3 份。

**存储层（shares）：** B 的 SHARE = `2n`，C = `3n`，总份额 = 5

**计算过程：**

```
总份额: 2 + 3 = 5
B 的分摊: (2 * 10000) / 5 = 4000
C 的分摊: (3 * 10000) / 5 = 6000

最终:
  A (付款人): -(0) + 10000 = 10000
  B: -(4000) = -4000 (欠 A $40.00)
  C: -(6000) = -6000 (欠 A $60.00)
总和: 10000 + (-4000) + (-6000) = 0 ✓
```

#### 3.3.4 EXACT — 精确金额

**场景：** 总金额 $100，A 付了，B 应付 $23.50，C 应付 $76.50。

**存储层（shares）：** B 的 EXACT share = `2350`，C = `7650`

**计算过程：**

```
B 的分摊: 2350 (直接使用输入的金额)
C 的分摊: 7650
验证: 2350 + 7650 = 10000 = 总金额 ✓

最终:
  A (付款人): -(0) + 10000 = 10000
  B: -(2350) = -2350
  C: -(7650) = -7650
总和: 10000 + (-2350) + (-7650) = 0 ✓
```

#### 3.3.5 ADJUSTMENT — 均分 + 调差

**场景：** 总金额 $100，A 付款，3 个人本来该均分但 B 应该多出 $5（因为他点了更贵的菜）。

**存储层（shares）：** B 的 ADJUSTMENT share = `500`（比别人多出 $5.00），C = `0`

**计算过程：**

```
总金额: 10000
调差总和: 500 + 0 = 500
剩余金额: 10000 - 500 = 9500
均分: 9500 / 3 = 3166 (每人)
余数: 9500 - 3166*3 = 2 → 分出去

分摊:
  A: 3166 + 0 = 3166
  B: 3166 + 500 + 1(余数) = 3667
  C: 3166 + 0 + 1(余数) = 3167

最终 (A 是付款人):
  A (付款人): -(3166) + 10000 = 6834
  B: -(3667) = -3667
  C: -(3167) = -3167
总和: 6834 + (-3667) + (-3167) = 0 ✓
```

#### 3.3.6 SETTLEMENT — 简单结算

**场景：** C 欠 A $25，直接还款（无实际消费）。

**不经过拆分计算引擎**，直接设定两个参与者：

```
participants: [
  { userId: A, amount: 2500 },   // A 收到 $25
  { userId: C, amount: -2500 },  // C 支付 $25
]
paidBy: C  // C 是付款人
```

这个没有 UI 表单，由 `Settleup.tsx` 和 `GroupSettleup.tsx` 组件直接构造数据。

#### 3.3.7 CURRENCY_CONVERSION — 跨币种转账

**场景：** A 用 USD 还 C 的 EUR，汇率 1 EUR = 1.08 USD。

**创建两笔关联的 expense：**

```
Expense 1 (源): CURRENCY_CONVERSION, 金额 2500 (EUR 25.00)
  participants: [C: +2500, A: -2500]
  paidBy: C

Expense 2 (目标): CURRENCY_CONVERSION, 金额 2700 (USD 27.00, = 25 * 1.08)
  participants: [A: +2700, C: -2700]
  paidBy: A
```

由 `addOrEditCurrencyConversion` mutation 在服务端处理。

### 3.4 分尾数（Penny Rounding）算法

**文件：** `src/store/addStore.ts` (`calculateParticipantSplit`)

当总金额不能被参与人数整除时（尤其 EQUAL 拆分），产生余数需要分配：

```
1. 计算每个参与者的 base = done(amount / n)
2. 计算余数 penniesLeft = amount - base * n (通常为 1-3 个单位)
3. 对 penniesLeft 个 "美分"，每次分配给不同的人：
   - 用确定性伪随机数（种子 = 排序后的金额 + 日期）决定本轮谁多得 1 个单位
   - 这保证了相同输入总是相同分配，不是真随机
```

### 3.5 债务简化算法

**文件：** `src/lib/simplify.ts`

当群组有多个人、多笔费用时，如果直接按照每笔费用去结算会很复杂。债务简化使用 **最小现金流算法**（Minimum Cash Flow）：

```
1. 计算群组中每个人的净余额 (net balance = 应收 - 应付)
2. 贪心法：每一步找净余额最大（最被欠）和最小（最欠钱）的两个人
3. 结算两者中绝对值较小的金额
4. 重复直到所有人净余额为 0

例子：
  A 净 +$50 (被欠), B 净 -$20 (欠), C 净 -$30 (欠)
  步骤 1: A 给 C 结算 $30 → A 净 +$20, C 净 $0
  步骤 2: A 给 B 结算 $20 → A 净 $0, B 净 $0
  完成！原本需要多笔结算，简化后只需 2 笔
```

### 3.6 关键数值工具

**文件：** `src/utils/numbers.ts`

| 函数                           | 用途                                       |
| ------------------------------ | ------------------------------------------ |
| `BigMath.abs(n)`               | BigInt 绝对值                              |
| `BigMath.sign(n)`              | BigInt 符号（-1, 0, 1）                    |
| `BigMath.min/max(a, b)`        | BigInt 比较                                |
| `BigMath.gcd(a, b)`            | BigInt 最大公约数（用于 SHARE 反向计算）   |
| `BigMath.roundDiv(num, denom)` | 银行家舍入（四舍六入五成双），用于汇率换算 |

---

## 附录：关键文件索引

### PWA

| 文件                                               | 作用                |
| -------------------------------------------------- | ------------------- |
| `next.config.js`                                   | Serwist 插件配置    |
| `worker/index.ts`                                  | Service Worker 源码 |
| `public/manifest.json`                             | Web App Manifest    |
| `public/icons/`                                    | 全平台图标集        |
| `src/pages/_app.tsx`                               | PWA meta 标签       |
| `src/hooks/useIsPwa.ts`                            | PWA 模式检测        |
| `src/server/notification.ts`                       | web-push 发送       |
| `src/server/api/services/notificationService.ts`   | 推送通知业务        |
| `src/components/Account/SubscribeNotification.tsx` | 推送订阅 UI         |
| `src/components/NotificationModal.tsx`             | 通知订阅引导弹窗    |

### 图片上传

| 文件                                       | 作用                    |
| ------------------------------------------ | ----------------------- |
| `src/components/AddExpense/UploadFile.tsx` | 文件选择 & 上传触发     |
| `src/utils/imageUpload.ts`                 | 客户端压缩、校验、上传  |
| `src/pages/api/upload.ts`                  | 服务端接收 & Sharp 处理 |
| `src/pages/api/files/[...path].ts`         | 文件服务                |
| `src/components/Expense/Receipt.tsx`       | 缩略图 + 大图抽屉预览   |
| `prisma/schema.prisma` (Expense.fileKey)   | 数据库存储字段          |

### 分账逻辑

| 文件                                             | 作用                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `src/store/addStore.ts`                          | 核心计算引擎 (`calculateParticipantSplit`, `calculateSplitShareBasedOnAmount`) |
| `src/types/expense.types.ts`                     | 费用 Zod schema                                                                |
| `src/components/AddExpense/SplitTypeSection.tsx` | 拆分 UI                                                                        |
| `src/lib/simplify.ts`                            | 债务简化算法                                                                   |
| `src/utils/numbers.ts`                           | BigInt 工具函数                                                                |
| `src/tests/addStore.test.ts`                     | 拆分逻辑测试                                                                   |
| `src/lib/defaultSplit.ts`                        | 默认拆分预设                                                                   |
| `prisma/schema.prisma` (SplitType enum)          | 数据库枚举                                                                     |
