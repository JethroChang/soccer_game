# Soccer Game 需求規格書專區 (Specs Directory)

本目錄 (`soccer_game/specs/`) 參考 `stock_dash` 之架構模式，用於存放**足球遊戲各功能模組之需求規格書 (Requirements / Specifications / PRD)**，並依領域模組分類管理，與 `docs/` 文件目錄對齊。

## 📁 模組規格目錄結構

- 📂 `soccer_gameplay/`：網頁版 2D 足球對戰遊戲核心系統規格 ([soccer_gameplay/spec.md](file:///c:/Users/Rayla/Desktop/workspace/soccer_game/specs/soccer_gameplay/spec.md))
  - 核心物理引擎 (球體彈性、滾動摩擦、碰撞檢測)
  - 球員操控與 AI 決策系統 (移動、帶球、蓄力射門、滑鏟、門將守備)
  - 規則判定與賽事流程 (計時器、記分板、進球判定、開球重置)
  - 網站系統架構 (Django 後端 API、戰績持久化、Leaderboard、原生現代前端)
  - 聲光特效與遊戲感 (Web Audio 音效合成、螢幕震動、慢動作重播、慶祝彩帶)

---

## 💡 使用與協作流程

1. **規格審閱與確認**：
   使用者與開發者在開始實作前，共同確認 `specs/soccer_gameplay/spec.md` 的功能範疇與分階段計畫 (Phases)。

2. **依階段推進開發 (Phases)**：
   - **Phase 1**：專案架構建立 (Django 後端 + 靜態目錄 + 基礎頁面與路由)。
   - **Phase 2**：核心物理與球場渲染 (Canvas 2D 綠茵球場、足球運動物理、邊界與球門反彈)。
   - **Phase 3**：球員控制與 AI 對手 (玩家輸入響應、帶球射門機制、智慧門將與電腦防守 AI)。
   - **Phase 4**：比賽流程與 UI/HUD (計時、比分、勝負判定、暫停選單、音效合成)。
   - **Phase 5**：後端數據庫整合與儀表板 (比賽紀錄儲存、勝率統計、排行榜 API)。
   - **Phase 6**：進球慢動作重播與特效 (Juice & Polish, 震動、慢鏡頭、煙花彩帶)。

3. **同步更新文件**：
   實作過程中同步將成果同步對齊至 `docs/` 現代深色科技風 HTML 文檔中心與根目錄 `README.md`。
