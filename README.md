# 人生 Online

一款以日常選擇為核心的互動人生模擬遊戲。網站已設定為純靜態 Vite 應用程式，可直接由 GitHub Pages 發布。

## 本機執行

需要 Node.js 22 或更新版本。

```bash
npm ci
npm run dev
```

正式建置與預覽：

```bash
npm run build
npm run preview
```

## 發布到 GitHub Pages

1. 將專案推送到 GitHub 的 `main` 分支。
2. 前往儲存庫的 **Settings → Pages**。
3. 在 **Build and deployment** 的 Source 選擇 **GitHub Actions**。
4. 之後每次推送到 `main`，GitHub 都會自動建置並發布網站。

網站資源使用相對路徑，因此同時支援 `使用者名稱.github.io` 與 `使用者名稱.github.io/儲存庫名稱/`。

## 可用指令

- `npm run dev`：啟動本機開發環境。
- `npm run build`：產生 GitHub Pages 使用的靜態網站。
- `npm run preview`：預覽正式建置結果。
- `npm test`：建置並檢查靜態輸出是否完整。
