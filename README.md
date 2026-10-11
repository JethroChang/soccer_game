# 網頁版 2D 足球對戰遊戲 (Soccer Game)

現代電競風格網頁版 2D 足球遊戲 — 基於 Python Django 與原生 HTML5 Canvas 2D 物理引擎，支援單人對戰電腦 AI、本機雙人對戰、Web Audio 原生音效合成與歷史戰績排行榜。

專案架構與工作流程全面參考 `stock_dash` 之成熟設計模式。

---

## 🎮 遊戲核心特色

| 功能特色 | 說明 |
| :--- | :--- |
| **真實 2D 物理引擎** | 足球滾動摩擦、邊界彈性、門柱圓柱碰撞反彈與球網吸附阻尼 |
| **流暢操控與帶球機制** | 八方向平滑跑動、衝刺體力條 (Stamina)、磁吸帶球、長按蓄力射門與滑鏟搶斷 |
| **智慧電腦 AI & 守門員** | 分層狀態機 (FSM)，具備角平分線動態站位門將與會追截、帶球與死角射門的電腦對手 |
| **零依賴 Web Audio 音效** | 瀏覽器原生振盪器合成踢球聲、哨聲、撞柱清脆響聲與進球觀眾歡呼，免下載任何音檔 |
| **進球慢動作重播 (Slow-Mo)** | 進球瞬間觸發畫面震動、0.3x 慢動作重播特寫、GOAL 橫幅與彩色紙屑慶祝粒子 |
| **戰績資料庫與排行榜** | 後端 Django + SQLite 持久化儲存比賽數據（比分、控球率、射門次數、連勝紀錄） |

---

## 📁 專案目錄結構

```
soccer_game/
├── docs/                      # 系統開發邏輯文檔 (現代深色科技風 HTML)
│   ├── index.html             # 文檔中心入口
│   └── soccer_gameplay/       # 遊戲核心技術說明文件
│       └── index.html
├── specs/                     # 需求規格書專區 (PRD)
│   ├── README.md              # 規格目錄說明
│   └── soccer_gameplay/
│       └── spec.md            # 完整功能與物理引擎規格書
├── mysite/                    # Django 專案主目錄
│   ├── manage.py
│   ├── mysite/                # Django 設定檔 (settings, urls)
│   ├── game/                  # 遊戲應用 App (views, models, urls, tests)
│   ├── templates/             # HTML 模板 (game.html, leaderboard.html, base.html)
│   └── static/                # 靜態資源 (CSS, Canvas 遊戲引擎 JS, 音效合成)
├── GEMINI.md                  # 專案技術規範與工作流程準則
├── README.md                  # 專案概覽與快速啟動
├── requirements.txt           # Python 套件依賴
└── .gitignore
```

---

## 🚀 快速啟動指南

### 1. 安裝環境依賴

```bash
# 建議於虛擬環境中執行
pip install -r requirements.txt
```

### 2. 資料庫遷移與初始化

```bash
cd mysite
python manage.py makemigrations
python manage.py migrate
```

### 3. 啟動 Django 開發伺服器

```bash
python manage.py runserver
```

在瀏覽器中開啟 `http://127.0.0.1:8000` 即可開始踢球！

---

## 📖 文件與規格專區

- 📄 [需求規格書專區](specs/README.md)
- 🌐 [開發邏輯與架構文檔中心 (雙擊直接瀏覽)](docs/index.html)
- 📋 [專案開發規範 (GEMINI.md)](GEMINI.md)
