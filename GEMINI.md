# Soccer Game (soccer_game) 專案技術規範

## 1. 規格與文件工作流
- **需求規格 (PRD)**：
  - 實作新功能或調整遊戲機制前，優先確認或參考 `specs/` 目錄下的需求規格書。
  - **規格目錄規範**：`specs/` 必須依功能模組劃分子資料夾存放（例如 `specs/soccer_gameplay/`），與 `docs/` 文件目錄對齊，嚴禁將規格檔案直接散落在 `specs/` 根目錄。
- **文檔格式一律強制為 HTML（高可讀性原則）**：
  - 所有在 `docs/` 目錄下的技術文件、遊戲邏輯說明、物理計算手冊與架構指南，**一律強制採用獨立且現代深色科技風 (Dark Mode) 的 HTML 格式撰寫**（統一路徑為 `docs/<模組名稱>/index.html`），嚴禁在 `docs/` 內撰寫陽春 Markdown (`.md`)。
  - 設計風格對齊 Slate 暗色背景 (`#0f172a`)、Cyan 亮眼標題 (`#38bdf8`)、Emerald 綠色標籤 (`#4ade80`)、Amber 程式碼與警示 Callout 方塊、以及頂部返回總目錄之連結。
  - 這能確保開發者或使用者可隨時在瀏覽器中雙擊開啟獲得最佳排版閱讀體驗，並保持全系統文檔中心的一致性。
- **文檔同步與導覽掛載義務**：凡涉及物理引擎公式變更、新功能模式或新 API，實作完成後必須同步更新：
  1. `docs/<模組名稱>/index.html` 內之詳細說明。
  2. 將該模組卡片同步掛載至 `docs/index.html` 總覽首頁中。
  3. 根目錄的 `README.md`。

## 2. 技術棧與架構規範
- **後端架構**：Python + Django，資料庫預設為輕量 SQLite，負責提供頁面路由、遊戲紀錄儲存與戰績 API。
- **路由命名習慣**：AJAX 請求路由一律維持 `ajax/<action_name>/` 命名格式，並在 `mysite/urls.py` 與 `game/urls.py` 清楚分類註解。
- **前端遊戲技術**：原生 HTML5 Canvas 2D + 模組化 JavaScript (ES6) + 原生 CSS，不額外引入大型臃腫前端框架以維持 60 FPS 極致效能與架構輕量。
- **音效架構**：使用 Web Audio API 原生振盪器合成音效，確保免外部下載資源且零延遲響應。
- **系統環境**：Windows 環境，確保本機開發伺服器與檔案路徑處理皆相容於 Windows。

## 3. 專案驗證與交付原則
- **程式碼檢查**：每次修改 Python/Django 程式碼後，需確認 Django 無語法錯誤 (`python manage.py check`)。
- **自動化測試**：新後端功能或 API 需於 `game/tests.py` 撰寫單元或整合測試，並執行 `python manage.py test game` 確認全數通過。
- **瀏覽器效能驗收**：遊戲必須於主畫面維持穩定 60 FPS，無記憶體洩漏或碰撞穿透 Bug。
