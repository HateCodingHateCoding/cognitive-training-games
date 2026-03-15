# 认知训练游戏平台

阿尔茨海默症认知功能训练游戏平台，支持 Android 和 iOS 设备。

## 快速开始

双击 start.bat，窗口会显示工作目录和端口，然后在浏览器打开：http://localhost:8080

## 功能特性

- 🎮 多种认知训练游戏
- 📱 支持手机和平板设备
- 🔄 跨平台支持（Android/iOS）
- 🎨 适配状态栏和安全区域

## 游戏列表

1. **路径回溯游戏** - 训练空间记忆能力
2. **记忆翻牌配对游戏** - 提升短期记忆
3. **干扰词辨识游戏** - 增强注意力和抑制控制
4. **节奏跟随游戏** - 训练反应速度
5. **空间定位记忆游戏** - 提升空间认知
6. **颜色匹配大师游戏** - 训练视觉识别

## 技术栈

- Capacitor 8.x
- Android SDK
- iOS SDK
- HTML5/CSS3/JavaScript

## 开发环境

### 前置要求

- Node.js 14+
- Android Studio（Android 开发）
- Xcode（iOS 开发）

### 安装依赖

```bash
npm install
```

### 同步资源

```bash
npm run sync
```

### 运行项目

#### Android
```bash
npm run cap:run:android
```

#### iOS
```bash
npm run cap:open:ios
```

## 构建说明

### Android 构建
```bash
npm run cap:build:android
```

### iOS 构建
在 Xcode 中打开项目并构建

## 设备支持

- ✅ Android 手机（API 24+）
- ✅ Android 平板（sw600dp+）
- ✅ iPhone（iOS 13+）
- ✅ iPad（iOS 13+）

## 适配说明

### Android
- 自动适配状态栏和导航栏
- 平板设备优化布局（sw600dp）
- 支持沉浸式显示

### iOS
- 自动适配安全区域
- 支持 iPhone 和 iPad 横竖屏
- 状态栏样式自适应

## 许可证

MIT