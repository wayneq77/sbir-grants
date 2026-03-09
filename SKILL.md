---
name: sbir-grants
description: |
  SBIR 計畫申請助手。當用戶說以下內容時觸發：
  - 申請 SBIR
  - 寫 SBIR 計畫書
  - SBIR 補助
  - 經濟部創新研發
  - 台北市 SITI
  - 地方型 SBIR
  - 詢問 SBIR 資格、經費、流程
  
  提供：資格評估、計畫書撰寫指導、知識庫搜尋、檢核清單
---

# SBIR 計畫申請助手

## Overview

本 Skill 整合 SBIR 知識庫，幫助台灣中小企業申請經濟部 SBIR / 地方型 SBIR 計畫。

**知識庫位置**：`~/.openclaw/workspace/skills/sbir-grants/sbir-grants/`

## 觸發關鍵字

- 申請 SBIR
- 寫 SBIR 計畫書
- SBIR 補助
- 經濟部創新研發
- 台北市 SITI
- 地方型 SBIR
- 詢問資格、經費、流程

## 使用方式

### 1. 資格評估
請提供以下資訊，我會幫你評估是否符合資格：
- 公司產業類別
- 實收資本額
- 員工人數
- 是否曾申請過 SBIR

### 2. 知識庫搜尋
我會自動搜尋知識庫中的：
- 6 個方法論
- 122 個 FAQ
- 200+ 檢核項目
- 7 個產業案例

### 3. 計畫書撰寫
指導你完成：
- 問題陳述
- 創新構想
- 市場分析
- 技術可行性
- 團隊組成
- 經費編列
- 預期效益

## 知識庫目錄結構

```
sbir-grants/
├── README.md              # 總覽
├── SKILL.md              # Claude Desktop Skill 定義
├── FAQ.md                # 常見問題
├── checklists/           # 檢核清單
│   ├── pre_application_checklist.md
│   ├── writing_checklist_phase1.md
│   ├── writing_checklist_phase2.md
│   ├── budget_checklist.md
│   └── submission_checklist.md
├── references/           # 參考指南
│   ├── methodology_*.md  # 6 個方法論
│   ├── phase1_strategy.md
│   ├── phase2_strategy.md
│   ├── local_sbir_*.md   # 地方型 SBIR
│   ├── review_criteria.md
│   └── ...
├── faq/                 # FAQ 分類
│   ├── faq_eligibility.md
│   ├── faq_application_process.md
│   └── ...
├── examples/            # 案例研究
└── templates/           # 範本
```

## 查詢指令

### 搜尋知識庫
```bash
# 搜尋特定主題
grep -r "關鍵字" ~/.openclaw/workspace/skills/sbir-grants/sbir-grants/

# 查詢方法論
cat ~/.openclaw/workspace/skills/sbir-grants/sbir-grants/references/methodology_innovation.md
```

### 常用查詢
| 需求 | 檔案 |
|------|------|
| 資格條件 | `faq/faq_eligibility.md` |
| 申請流程 | `faq/faq_application_process.md` |
| 創新構想怎麼寫 | `references/methodology_innovation.md` |
| 市場分析怎麼寫 | `references/methodology_market_analysis.md` |
| 經費編列 | `references/methodology_budget_planning.md` |
| Phase 1 寫作檢核 | `checklists/writing_checklist_phase1.md` |
| Phase 2 寫作檢核 | `checklists/writing_checklist_phase2.md` |
| 送件前檢核 | `checklists/submission_checklist.md` |
| 地方型 SBIR | `references/local_sbir_overview.md` |

## 2026 年最新資訊

### 可申請的計畫

| 縣市 | 狀態 | 說明 |
|------|------|------|
| **台北市 SITI** | ✅ 可申請 | 隨到隨審 |
| 基隆市 | 📋 籌備中 | 預計 2026 |
| 宜蘭縣 | 📋 籌備中 | 預計 2026 |
| 台南市 | 📋 籌備中 | 預計 2026 |
| 高雄市 | 📅 待公告 | 往年 4-6 月 |
| 屏東縣 | 📅 待公告 | 往年 4-6 月 |

### 補助經費（2026）

| 階段 | 補助上限 |
|------|----------|
| Phase 1 | 最高 150 萬 |
| Phase 2 | 最高 1,200 萬 |

## 資格條件（地方型 SBIR）

| 項目 | 條件 |
|------|------|
| 實收資本額 | < 1 億 |
| 員工人數 | < 200 人 |
| 公司類型 | 依法登記之本國公司 |
| 無欠稅 | 無欠稅紀錄 |

## 工作流程

1. **資格評估** → 確認是否符合資格
2. **選擇計畫** → Phase 1 / Phase 2
3. **收集資料** → 公司介紹、技術說明、市場資料
4. **撰寫計畫書** → 按章節逐步完成
5. **檢核** → 使用檢核清單確認完整性
6. **送件** → 提交申請

## 範例對話

**用戶**：我想申請 SBIR，但我不知道從哪裡開始

**我**：
1. 請問您的公司產業是什麼？
2. 實收資本額大約多少？
3. 員工人數？

（根據答案評估資格，然後引導後續步驟）

---

**用戶**：創新構想要怎麼寫？

**我**：讓我查詢知識庫...
（搜尋 methodology_innovation.md 並給出指導）

---

**用戶**：我的計畫書寫完了，請幫我檢查

**我**：好的，請問是 Phase 1 還是 Phase 2？
（使用對應的檢核清單進行檢查）
