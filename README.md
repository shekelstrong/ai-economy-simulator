# 🏛 AI Economy Simulator

**ИИ-симулятор экономики** — 1000 автономных ИИ-агентов моделируют экономику в реальном времени. Никакого сценария — агенты сами принимают решения, торгуют, создают институты и обучаются.

---

## 🇬🇧 English

**AI Economy Simulator** — 1000 autonomous AI agents model an economy in real time. No scripts — agents make their own decisions, trade, create institutions, and learn.

### Features
- 1000 agents start with equal conditions and 100,000₽ each
- 12 economic sectors (agriculture, manufacturing, finance, technology, etc.)
- 6 agent roles: worker, entrepreneur, investor, banker, government, researcher
- Real-time market dynamics (supply/demand pricing)
- 5 AI models powering agent intelligence
- Live dashboard with interactive charts
- Multilingual UI (EN/ZH/AR/RU)
- Click any metric for detailed breakdown with time range selection

---

## 🇨🇳 中文

**AI经济模拟器** — 1000个自主AI智能体实时模拟经济。没有预设脚本 — 智能体自主做出决策、进行交易、创建机构并不断学习。

### 功能特点
- 1000个智能体以平等条件起步，各拥有100,000₽
- 12个经济部门（农业、制造业、金融、技术等）
- 6种智能体角色：工人、企业家、投资者、银行家、政府、研究员
- 实时市场动态（供需定价）
- 5个AI模型驱动智能体智能
- 带有交互式图表的实时仪表板
- 多语言界面（英文/中文/阿拉伯文/俄文）
- 点击任何指标查看详细分解和时间范围选择

---

## 🇸🇦 العربية

**محاكي الاقتصاد بالذكاء الاصطناعي** — 1,000 وكيل ذكاء اصطناعي مستقل يحاكون اقتصادًا في الوقت الفعلي. لا توجد نصوص مكتوبة — الوكلاء يتخذون قراراتهم بأنفسهم ويتاجرون وينشئون المؤسسات ويتعلمون.

### الميزات
- 1,000 وكيل يبدأون بشروط متساوية و100,000₽ لكل منهم
- 12 قطاعًا اقتصاديًا (الزراعة والتصنيع والمالية والتكنولوجيا وغيرها)
- 6 أدوار للوكلاء: عامل، رائد أعمال، مستثمر، مصرفي، حكومة، باحث
- ديناميكيات السوق في الوقت الفعلي (تسعير العرض والطلب)
- 5 نماذج ذكاء اصطناعي تشغل ذكاء الوكلاء
- لوحة معلومات مباشرة مع رسوم بيانية تفاعلية
- واجهة متعددة اللغات (إنجليزي/صيني/عربي/روسي)
- انقر على أي مؤشر للحصول على تفاصيل واختيار النطاق الزمني

---

## 🇷🇺 Русский

**ИИ-Симулятор Экономики** — 1000 автономных ИИ-агентов моделируют экономику в реальном времени. Никакого сценария — агенты сами принимают решения, торгуют, создают институты и обучаются.

### Возможности
- 1000 агентов стартуют на равных условиях с 100 000₽ каждый
- 12 секторов экономики (сельское хозяйство, производство, финансы, технологии и др.)
- 6 ролей агентов: рабочий, предприниматель, инвестор, банкир, госслужащий, исследователь
- Динамика рынков в реальном времени (цены на основе спроса/предложения)
- 5 ИИ-моделей для интеллекта агентов
- Живой дашборд с интерактивными графиками
- Мультиязычный интерфейс (EN/ZH/AR/RU)
- Клик на любой показатель — детальная информация с выбором временного промежутка

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Next.js + Recharts)            │
│     Dashboard with real-time charts + WebSocket      │
│     Multilingual: EN / ZH / AR / RU                  │
└──────────────────────┬──────────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────┴──────────────────────────────┐
│                Backend (FastAPI)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Engine   │  │ AI Router│  │ Analytics Engine │   │
│  │ (Tick)   │  │ (5 Models│  │ (Aggregations)  │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              PostgreSQL + Redis                       │
└─────────────────────────────────────────────────────┘
```

## AI Models

| Task | Model | Purpose |
|------|-------|---------|
| Quick decisions | `sherlock-dash-alpha` | Fast, cheap |
| Trade & Market | `deepseek-v4-flash` | Analytics |
| Strategy | `grok-4.1-fast` | Long-term planning |
| Research | `hunter-alpha` | Innovation |
| Reasoning | `sherlock-think-alpha` | Complex decisions |

## Quick Start

```bash
git clone https://github.com/shekelstrong/ai-economy-simulator.git
cd ai-economy-simulator
cp .env.example .env  # Add your OPENROUTER_API_KEY
docker compose up -d

# Dashboard: http://localhost:3000
# API: http://localhost:8000/docs
```

## License

MIT
