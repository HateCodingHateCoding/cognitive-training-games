# 认知训练游戏平台 — 打包与安装指南

## 目录

- [方案一：PWA 安装（推荐，最简单）](#方案一pwa-安装推荐最简单)
- [方案二：Capacitor 打包 Android APK](#方案二capacitor-打包-android-apk)
- [方案三：Capacitor 打包 iOS App](#方案三capacitor-打包-ios-app)
- [常见问题](#常见问题)

---

## 方案一：PWA 安装（推荐，最简单）

项目已配置为 **Progressive Web App (PWA)**，具备以下能力：
- ✅ **离线可用** — Service Worker 缓存所有游戏资源
- ✅ **可安装到桌面/主屏幕** — 通过浏览器安装，像原生 App 一样运行
- ✅ **自动更新** — 检测到新版本时提示更新

### 安装步骤

#### Android 手机
1. 用 **Chrome 浏览器** 打开游戏网址
2. 浏览器地址栏或底部会弹出 **"添加到主屏幕"** / **"安装应用"** 提示
3. 点击安装即可
4. 如没有自动弹出，点击 Chrome 右上角 `⋮` 菜单 → **"安装应用"** 或 **"添加到主屏幕"**

#### iPhone / iPad
1. 用 **Safari 浏览器** 打开游戏网址
2. 点击底部 **分享按钮**（方框+箭头图标）
3. 选择 **"添加到主屏幕"**
4. 确认名称后点击 **"添加"**

#### Windows / Mac / ChromeOS
1. 用 **Chrome / Edge** 打开游戏网址
2. 地址栏右侧出现 **安装图标** 📥，点击即可
3. 或从菜单中选择 **"安装 认知训练游戏"**

### 本地部署（局域网访问）

```bash
# 需要先安装依赖
npm install

# 启动本地服务器（局域网内其他设备可通过 IP 访问）
npm run serve
# 访问 http://电脑IP:8080
```

> ⚠️ **PWA 安装要求 HTTPS 或 localhost**。局域网部署如需安装功能，需要配置 HTTPS 证书，或使用 `ngrok` 等工具做隧道。仅仅浏览和游玩不需要 HTTPS。

---

## 方案二：Capacitor 打包 Android APK

使用 [Capacitor](https://capacitorjs.com/) 将纯前端代码包装成原生 Android App。

### 环境准备

1. **Node.js** ≥ 18（已安装）
2. **Android Studio**（必需）
   - 下载：https://developer.android.com/studio
   - 安装后打开，根据引导下载 Android SDK
   - 建议安装 SDK 34（Android 14）
3. **Java JDK 17+** — Android Studio 自带

### 打包步骤

```bash
# 1. 安装依赖（如未安装）
npm install

# 2. 同步前端文件到 www/ 目录
npm run sync

# 3. 同步到 Android 项目
npx cap sync android

# 4. 打开 Android Studio 编辑项目
npx cap open android
```

在 Android Studio 中：
1. 等待 Gradle 同步完成
2. 连接 Android 手机（开启 USB 调试）或创建模拟器
3. 点击 **Run ▶** 运行到设备
4. 打包 APK：**Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. APK 生成在 `android/app/build/outputs/apk/debug/app-debug.apk`

### 命令行直接构建 APK

```bash
# 一键打包（需要 Android SDK 环境变量已配置）
npm run cap:build:android

# APK 位置
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 安装到手机

- 将 APK 文件传输到手机，打开安装即可
- 首次安装需在手机设置中允许 **"安装未知来源应用"**

---

## 方案三：Capacitor 打包 iOS App

### 环境准备

> ⚠️ iOS 打包 **必须在 macOS** 上进行（Apple 的限制）

1. **Xcode** 15+（从 App Store 安装）
2. **Apple 开发者账号**（个人测试免费，上架需 ¥688/年）

### 打包步骤

```bash
# 1. 安装 iOS 平台（在 Mac 上执行）
npm install @capacitor/ios
npx cap add ios

# 2. 同步文件
npm run sync
npx cap sync ios

# 3. 打开 Xcode
npx cap open ios
```

在 Xcode 中：
1. 选择目标设备（模拟器或连接的 iPhone）
2. 设置 **Signing & Capabilities** 中的开发团队
3. 点击 **Run ▶** 运行

---

## 项目结构说明

```
项目根目录/
├── index.html              ← 主入口
├── app.js                  ← 平台逻辑
├── sw.js                   ← Service Worker（离线缓存）
├── manifest.webmanifest    ← PWA 清单（可安装配置）
├── games-manifest.json     ← 游戏列表
├── icons/                  ← 应用图标
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   └── icon-maskable-512.png
├── capacitor.config.json   ← Capacitor 配置
├── package.json            ← npm 项目配置
├── scripts/
│   ├── generate-icons.js   ← 图标生成脚本
│   └── sync-www.js         ← 文件同步脚本
├── www/                    ← Capacitor 打包用（自动同步）
├── android/                ← Android 原生项目（自动生成）
├── 路径回溯游戏——胡一凡/
├── 颜色匹配大师游戏——胡一凡/
├── 记忆翻牌配对游戏——杨健舒/
├── 干扰词辨识游戏——杨健舒/
├── 节奏跟随游戏——王淞鹤/
└── 空间定位记忆游戏——王淞鹤/
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run sync` | 同步前端文件到 www/ |
| `npm run cap:sync` | 同步文件 + 更新原生项目 |
| `npm run cap:open:android` | 用 Android Studio 打开项目 |
| `npm run cap:build:android` | 命令行构建 Android APK |
| `npm run serve` | 启动本地 HTTP 服务器 |
| `npm run generate-icons` | 重新生成应用图标 |

---

## 常见问题

### Q: PWA 安装按钮没出现？
- 确保通过 **HTTPS** 或 **localhost** 访问
- 确保使用 Chrome 89+ 或 Edge 89+
- 检查 DevTools → Application → Manifest 是否有错误

### Q: Android Studio 打开后 Gradle 报错？
- 确保已安装 Android SDK 34
- File → Sync Project with Gradle Files
- 如果是网络问题，配置 Gradle 代理或使用国内镜像

### Q: 中文路径导致构建失败？
- Capacitor 已处理中文路径的复制
- 如仍有问题，可将游戏文件夹改为英文名，并更新 `games-manifest.json` 中的 `entry` 字段

### Q: 如何更新 App 内的游戏内容？
1. 修改游戏文件
2. `npm run cap:sync` 同步到原生项目
3. 重新构建 APK

### Q: 三种方案怎么选？

| | PWA | Android APK | iOS App |
|--|-----|------------|---------|
| 难度 | ⭐ 最简单 | ⭐⭐ 需要 Android Studio | ⭐⭐⭐ 需要 Mac + Xcode |
| 离线 | ✅ | ✅ | ✅ |
| 安装体验 | 浏览器安装 | APK 直接安装 | 需要开发者账号 |
| 自动更新 | ✅ 自动 | ❌ 需重新安装 | ❌ 需重新安装 |
| 推荐场景 | 日常使用 | 分发给不方便上网的用户 | iOS 用户 |
