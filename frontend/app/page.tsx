'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, DollarSign, Building2, AlertTriangle,
  Activity, Zap, Globe, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight,
  Eye, Clock, Layers, BarChart3, PieChart as PieIcon, Brain, Shield
} from 'lucide-react'

// ============================================================
// I18N — Переводы (EN / ZH / AR / RU)
// ============================================================
const translations: Record<string, Record<string, string>> = {
  en: {
    title: 'AI Economy Simulator',
    subtitle: '1,000 autonomous AI agents modeling a real-time economy',
    tick: 'Tick',
    status: 'Status',
    running: 'Running',
    paused: 'Paused',
    totalAgents: 'Total Agents',
    activeAgents: 'Active Agents',
    bankruptAgents: 'Bankrupt',
    companies: 'Companies',
    gdp: 'GDP',
    totalCapital: 'Total Capital',
    avgIncome: 'Avg Income',
    giniIndex: 'Gini Index',
    inflation: 'Inflation',
    transactions: 'Transactions',
    wealthDistribution: 'Wealth Distribution',
    wealthDistributionDesc: 'Capital distribution across population deciles',
    gdpOverTime: 'GDP Over Time',
    gdpDesc: 'Total economic output per tick',
    giniOverTime: 'Gini Coefficient',
    giniDesc: 'Income inequality measure (0=equal, 1=unequal)',
    markets: 'Market Prices',
    marketsDesc: 'Price indices by sector',
    events: 'Recent Events',
    topAgents: 'Top Agents by Capital',
    bottomAgents: 'Bottom Agents by Capital',
    sectorDistribution: 'Sector Distribution',
    roles: 'Agent Roles',
    macroIndicators: 'Macro Indicators',
    timeRange: 'Time Range',
    last1h: 'Last 1h',
    last6h: 'Last 6h',
    last24h: 'Last 24h',
    last7d: 'Last 7d',
    all: 'All',
    agent: 'Agent',
    capital: 'Capital',
    role: 'Role',
    sector: 'Sector',
    details: 'Details',
    clickForDetails: 'Click any metric card for detailed breakdown',
    innovation: 'Innovation',
    crisis: 'Crisis',
    bankruptcy: 'Bankruptcy',
    trade: 'Trade',
    noEvents: 'No events recorded yet',
    noData: 'Waiting for simulation data...',
    priceIndex: 'Price Index',
    share: 'Share',
    count: 'Count',
    percentile: 'Percentile',
    aiModels: 'AI Models',
    aiModelsDesc: 'Models powering agent intelligence',
    modelsActive: 'Active Models',
    requestsPerTick: 'Requests/Tick',
    worker: 'Worker',
    entrepreneur: 'Entrepreneur',
    investor: 'Investor',
    banker: 'Banker',
    government: 'Government',
    researcher: 'Researcher',
  },
  zh: {
    title: 'AI经济模拟器',
    subtitle: '1,000个自主AI智能体实时模拟经济',
    tick: '周期',
    status: '状态',
    running: '运行中',
    paused: '已暂停',
    totalAgents: '智能体总数',
    activeAgents: '活跃智能体',
    bankruptAgents: '破产',
    companies: '公司',
    gdp: 'GDP',
    totalCapital: '总资本',
    avgIncome: '平均收入',
    giniIndex: '基尼系数',
    inflation: '通胀率',
    transactions: '交易数',
    wealthDistribution: '财富分配',
    wealthDistributionDesc: '人口十分位数的资本分配',
    gdpOverTime: 'GDP变化趋势',
    gdpDesc: '每个周期的经济总产出',
    giniOverTime: '基尼系数',
    giniDesc: '收入不平等指标（0=平等，1=不平等）',
    markets: '市场价格',
    marketsDesc: '各行业价格指数',
    events: '最新事件',
    topAgents: '最富有智能体',
    bottomAgents: '最贫穷智能体',
    sectorDistribution: '行业分布',
    roles: '智能体角色',
    macroIndicators: '宏观经济指标',
    timeRange: '时间范围',
    last1h: '最近1小时',
    last6h: '最近6小时',
    last24h: '最近24小时',
    last7d: '最近7天',
    all: '全部',
    agent: '智能体',
    capital: '资本',
    role: '角色',
    sector: '行业',
    details: '详情',
    clickForDetails: '点击任何指标卡片查看详细分解',
    innovation: '创新',
    crisis: '危机',
    bankruptcy: '破产',
    trade: '贸易',
    noEvents: '暂无事件记录',
    noData: '等待模拟数据...',
    priceIndex: '价格指数',
    share: '占比',
    count: '数量',
    percentile: '百分位',
    aiModels: 'AI模型',
    aiModelsDesc: '驱动智能体决策的AI模型',
    modelsActive: '活跃模型',
    requestsPerTick: '请求/周期',
    worker: '工人',
    entrepreneur: '企业家',
    investor: '投资者',
    banker: '银行家',
    government: '政府',
    researcher: '研究员',
  },
  ar: {
    title: 'محاكي الاقتصاد بالذكاء الاصطناعي',
    subtitle: '1,000 وكيل ذكاء اصطناعي مستقل يحاكون اقتصادًا في الوقت الفعلي',
    tick: 'دورة',
    status: 'الحالة',
    running: 'قيد التشغيل',
    paused: 'متوقف',
    totalAgents: 'إجمالي الوكلاء',
    activeAgents: 'الوكلاء النشطون',
    bankruptAgents: 'مفلس',
    companies: 'الشركات',
    gdp: 'الناتج المحلي',
    totalCapital: 'إجمالي رأس المال',
    avgIncome: 'متوسط الدخل',
    giniIndex: 'معامل جيني',
    inflation: 'التضخم',
    transactions: 'المعاملات',
    wealthDistribution: 'توزيع الثروة',
    wealthDistributionDesc: 'توزيع رأس المال عبر عشر السكان',
    gdpOverTime: 'الناتج المحلي عبر الزمن',
    gdpDesc: 'إجمالي الإنتاج الاقتصادي لكل دورة',
    giniOverTime: 'معامل جيني',
    giniDesc: 'مقياس عدم المساواة في الدخل (0=متساوٍ، 1=غير متساوٍ)',
    markets: 'أسعار السوق',
    marketsDesc: 'مؤشرات الأسعار حسب القطاع',
    events: 'الأحداث الأخيرة',
    topAgents: 'أغنى الوكلاء',
    bottomAgents: 'أفقر الوكلاء',
    sectorDistribution: 'التوزيع القطاعي',
    roles: 'أدوار الوكلاء',
    macroIndicators: 'المؤشرات الكلية',
    timeRange: 'النطاق الزمني',
    last1h: 'آخر ساعة',
    last6h: 'آخر 6 ساعات',
    last24h: 'آخر 24 ساعة',
    last7d: 'آخر 7 أيام',
    all: 'الكل',
    agent: 'الوكيل',
    capital: 'رأس المال',
    role: 'الدور',
    sector: 'القطاع',
    details: 'التفاصيل',
    clickForDetails: 'انقر على أي بطاقة指标 للحصول على تفاصيل',
    innovation: 'ابتكار',
    crisis: 'أزمة',
    bankruptcy: 'إفلاس',
    trade: 'تجارة',
    noEvents: 'لا توجد أحداث مسجلة بعد',
    noData: 'في انتظار بيانات المحاكاة...',
    priceIndex: 'مؤشر السعر',
    share: 'الحصة',
    count: 'العدد',
    percentile: 'الPercentile',
    aiModels: 'نماذج الذكاء الاصطناعي',
    aiModelsDesc: 'النماذج التي تشغل ذكاء الوكلاء',
    modelsActive: 'النماذج النشطة',
    requestsPerTick: 'طلبات/دورة',
    worker: 'عامل',
    entrepreneur: 'رائد أعمال',
    investor: 'مستثمر',
    banker: 'مصرفي',
    government: 'حكومة',
    researcher: 'باحث',
  },
  ru: {
    title: 'ИИ-Симулятор Экономики',
    subtitle: '1000 автономных ИИ-агентов моделируют экономику в реальном времени',
    tick: 'Тик',
    status: 'Статус',
    running: 'Работает',
    paused: 'Приостановлен',
    totalAgents: 'Всего агентов',
    activeAgents: 'Активных',
    bankruptAgents: 'Банкротов',
    companies: 'Компаний',
    gdp: 'ВВП',
    totalCapital: 'Общий капитал',
    avgIncome: 'Средний доход',
    giniIndex: 'Индекс Джини',
    inflation: 'Инфляция',
    transactions: 'Транзакций',
    wealthDistribution: 'Распределение богатства',
    wealthDistributionDesc: 'Распределение капитала по децилям населения',
    gdpOverTime: 'ВВП во времени',
    gdpDesc: 'Общий экономический выпуск за тик',
    giniOverTime: 'Коэффициент Джини',
    giniDesc: 'Мера неравенства доходов (0=равенство, 1=неравенство)',
    markets: 'Рыночные цены',
    marketsDesc: 'Индексы цен по секторам',
    events: 'Последние события',
    topAgents: 'Самые богатые агенты',
    bottomAgents: 'Самые бедные агенты',
    sectorDistribution: 'Распределение по секторам',
    roles: 'Роли агентов',
    macroIndicators: 'Макроиндикаторы',
    timeRange: 'Временной промежуток',
    last1h: 'Последний 1ч',
    last6h: 'Последние 6ч',
    last24h: 'Последние 24ч',
    last7d: 'Последние 7д',
    all: 'Всё время',
    agent: 'Агент',
    capital: 'Капитал',
    role: 'Роль',
    sector: 'Сектор',
    details: 'Подробности',
    clickForDetails: 'Нажмите на карточку показателя для детальной информации',
    innovation: 'Инновация',
    crisis: 'Кризис',
    bankruptcy: 'Банкротство',
    trade: 'Сделка',
    noEvents: 'Событий пока нет',
    noData: 'Ожидание данных симуляции...',
    priceIndex: 'Индекс цен',
    share: 'Доля',
    count: 'Кол-во',
    percentile: 'Процентиль',
    aiModels: 'ИИ-модели',
    aiModelsDesc: 'Модели, обеспечивающие интеллект агентов',
    modelsActive: 'Активных моделей',
    requestsPerTick: 'Запросов/тик',
    worker: 'Рабочий',
    entrepreneur: 'Предприниматель',
    investor: 'Инвестор',
    banker: 'Банкир',
    government: 'Госслужащий',
    researcher: 'Исследователь',
  },
}

// ============================================================
// API Client
// ============================================================
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

// ============================================================
// Types
// ============================================================
interface SimStatus { tick: number; is_running: boolean; total_agents: number; active_agents: number; bankrupt_agents: number; total_companies: number }
interface Macro { tick: number; gdp: number; total_capital: number; avg_income: number; gini_coefficient: number; unemployment_rate: number; inflation_rate: number; total_transactions: number; active_companies: number; bankruptcies: number; wealth_p10: number | null; wealth_p25: number | null; wealth_p50: number | null; wealth_p75: number | null; wealth_p90: number | null }
interface AgentInfo { id: number; name: string; role: string; capital: number; sector: string | null }
interface EventInfo { id: number; event_type: string; severity: string; title: string; description: string | null; tick: number }
interface MarketInfo { sector: string; price_index: number; supply: number; demand: number; tick: number }
interface WealthBucket { range: string; count: number; total_capital: number; avg_capital: number; share_of_total: number }

// ============================================================
// Colors
// ============================================================
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16']
const SEVERITY_COLORS: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444' }

// ============================================================
// Component
// ============================================================
export default function Dashboard() {
  const [lang, setLang] = useState<'en' | 'zh' | 'ar' | 'ru'>('en')
  const t = translations[lang]
  const isRTL = lang === 'ar'

  const [status, setStatus] = useState<SimStatus | null>(null)
  const [macro, setMacro] = useState<Macro[]>([])
  const [topAgents, setTopAgents] = useState<AgentInfo[]>([])
  const [bottomAgents, setBottomAgents] = useState<AgentInfo[]>([])
  const [events, setEvents] = useState<EventInfo[]>([])
  const [markets, setMarkets] = useState<MarketInfo[]>([])
  const [wealth, setWealth] = useState<{ buckets: WealthBucket[]; total_agents: number; total_capital: number } | null>(null)
  const [timeRange, setTimeRange] = useState<number>(100)
  const [detailModal, setDetailModal] = useState<string | null>(null)
  const [roleDistribution, setRoleDistribution] = useState<{ role: string; count: number }[]>([])

  const refresh = useCallback(async () => {
    try {
      const [s, m, top, bot, ev, mk, w] = await Promise.all([
        fetchAPI<SimStatus>('/status'),
        fetchAPI<Macro[]>(`/macro?limit=${timeRange}`),
        fetchAPI<AgentInfo[]>('/agents?sort=capital&order=desc&limit=10'),
        fetchAPI<AgentInfo[]>('/agents?sort=capital&order=asc&limit=10'),
        fetchAPI<EventInfo[]>('/events?limit=20'),
        fetchAPI<MarketInfo[]>('/markets'),
        fetchAPI<any>('/wealth-distribution'),
      ])
      setStatus(s)
      setMacro(m)
      setTopAgents(top)
      setBottomAgents(bot)
      setEvents(ev)
      setMarkets(mk)
      setWealth(w)
    } catch (e) {
      console.error('Refresh error:', e)
    }
  }, [timeRange])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  const latestMacro = macro.length > 0 ? macro[macro.length - 1] : null
  const prevMacro = macro.length > 1 ? macro[macro.length - 2] : null

  const fmt = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
    return n.toFixed(0)
  }

  const TrendIcon = ({ current, prev }: { current: number; prev?: number }) => {
    if (!prev) return null
    return current > prev ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : current < prev ? <ArrowDownRight className="w-3 h-3 text-red-500" /> : null
  }

  const roleLabels: Record<string, string> = { worker: t.worker, entrepreneur: t.entrepreneur, investor: t.investor, banker: t.banker, government: t.government, researcher: t.researcher }

  // ===================== RENDER =====================
  return (
    <div className={`min-h-screen bg-[#0a0a0f] ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-[#1e1e2e] px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t.title}</h1>
              <p className="text-xs text-gray-500">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className={`w-2 h-2 rounded-full ${status.is_running ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                {t.tick}: <span className="text-white font-mono">{status.tick}</span>
              </div>
            )}
            <div className="flex gap-1">
              {(['en', 'zh', 'ar', 'ru'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} className={`lang-btn ${lang === l ? 'active' : ''}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: t.gdp, value: latestMacro?.gdp, prev: prevMacro?.gdp, icon: DollarSign, color: 'text-blue-400' },
            { label: t.totalAgents, value: status?.total_agents, icon: Users, color: 'text-green-400' },
            { label: t.activeAgents, value: status?.active_agents, icon: Activity, color: 'text-emerald-400' },
            { label: t.bankruptAgents, value: status?.bankrupt_agents, prev: prevMacro?.bankruptcies, icon: AlertTriangle, color: 'text-red-400' },
            { label: t.companies, value: latestMacro?.active_companies, icon: Building2, color: 'text-purple-400' },
            { label: t.giniIndex, value: latestMacro?.gini_coefficient ? latestMacro.gini_coefficient.toFixed(3) : '—', icon: PieIcon, color: 'text-yellow-400' },
            { label: t.inflation, value: latestMacro?.inflation_rate ? `${latestMacro.inflation_rate.toFixed(2)}%` : '—', icon: TrendingUp, color: 'text-orange-400' },
            { label: t.transactions, value: latestMacro?.total_transactions, icon: Zap, color: 'text-cyan-400' },
          ].map((card, i) => (
            <div key={i} className="card cursor-pointer group" onClick={() => setDetailModal(card.label)}>
              <div className="flex items-center justify-between mb-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <TrendIcon current={Number(card.value) || 0} prev={Number(card.prev) || 0} />
              </div>
              <div className="metric-value text-white">{card.value != null ? fmt(Number(card.value)) : '—'}</div>
              <div className="text-xs text-gray-500 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-500">{t.timeRange}:</span>
          {[
            { label: t.last1h, ticks: 60 },
            { label: t.last6h, ticks: 360 },
            { label: t.last24h, ticks: 1440 },
            { label: t.last7d, ticks: 10080 },
            { label: t.all, ticks: 99999 },
          ].map(opt => (
            <button key={opt.ticks} onClick={() => setTimeRange(opt.ticks)}
              className={`px-3 py-1 text-xs rounded-lg border transition-all ${timeRange === opt.ticks ? 'border-accent text-accent bg-accent/10' : 'border-[#1e1e2e] text-gray-500 hover:border-[#2e2e4e]'}`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Charts Row 1: GDP + Gini */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* GDP Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{t.gdpOverTime}</h3>
                <p className="text-xs text-gray-500">{t.gdpDesc}</p>
              </div>
              <Layers className="w-4 h-4 text-gray-500" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={macro}>
                <defs>
                  <linearGradient id="gdpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="tick" stroke="#4a4a6a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#4a4a6a" tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8 }} />
                <Area type="monotone" dataKey="gdp" stroke="#3b82f6" fill="url(#gdpGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Gini Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{t.giniOverTime}</h3>
                <p className="text-xs text-gray-500">{t.giniDesc}</p>
              </div>
              <Shield className="w-4 h-4 text-gray-500" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={macro}>
                <defs>
                  <linearGradient id="giniGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="tick" stroke="#4a4a6a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#4a4a6a" tick={{ fontSize: 11 }} domain={[0, 1]} />
                <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8 }} />
                <Area type="monotone" dataKey="gini_coefficient" stroke="#f59e0b" fill="url(#giniGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2: Markets + Wealth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Market Prices */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{t.markets}</h3>
                <p className="text-xs text-gray-500">{t.marketsDesc}</p>
              </div>
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={markets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="sector" stroke="#4a4a6a" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#4a4a6a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8 }} />
                <Bar dataKey="price_index" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Wealth Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{t.wealthDistribution}</h3>
                <p className="text-xs text-gray-500">{t.wealthDistributionDesc}</p>
              </div>
              <PieIcon className="w-4 h-4 text-gray-500" />
            </div>
            {wealth && (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={wealth.buckets} dataKey="share_of_total" nameKey="range" cx="50%" cy="50%" outerRadius={100} label={({ range, share_of_total }) => `${range}: ${share_of_total.toFixed(1)}%`}>
                    {wealth.buckets.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row 3: Top/Bottom Agents + Events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Agents */}
          <div className="card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" /> {t.topAgents}
            </h3>
            <div className="space-y-2">
              {topAgents.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#1a1a2e] transition-all cursor-pointer"
                     onClick={() => setDetailModal(`agent-${a.id}`)}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                    <span className="text-sm">{a.name}</span>
                    <span className="text-xs text-gray-500">({roleLabels[a.role] || a.role})</span>
                  </div>
                  <span className="text-sm font-mono text-green-400">₽{fmt(a.capital)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Agents */}
          <div className="card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" /> {t.bottomAgents}
            </h3>
            <div className="space-y-2">
              {bottomAgents.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#1a1a2e] transition-all cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                    <span className="text-sm">{a.name}</span>
                    <span className="text-xs text-gray-500">({roleLabels[a.role] || a.role})</span>
                  </div>
                  <span className="text-sm font-mono text-red-400">₽{fmt(a.capital)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Events */}
          <div className="card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> {t.events}
            </h3>
            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-gray-500">{t.noEvents}</p>
              ) : events.map(e => (
                <div key={e.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-[#1a1a2e]">
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: SEVERITY_COLORS[e.severity] || '#4a4a6a' }} />
                  <div>
                    <p className="text-sm">{e.title}</p>
                    <p className="text-xs text-gray-500">{t.tick} {e.tick}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: AI Models Info */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">{t.aiModels}</h3>
              <p className="text-xs text-gray-500">{t.aiModelsDesc}</p>
            </div>
            <Brain className="w-4 h-4 text-gray-500" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { name: 'Sherlock Dash', task: 'Quick decisions', model: 'openrouter/sherlock-dash-alpha' },
              { name: 'DeepSeek v4', task: 'Trade & Market', model: 'deepseek/deepseek-v4-flash' },
              { name: 'Grok 4.1', task: 'Strategy', model: 'x-ai/grok-4.1-fast' },
              { name: 'Hunter Alpha', task: 'Research', model: 'openrouter/hunter-alpha' },
              { name: 'Sherlock Think', task: 'Complex reasoning', model: 'openrouter/sherlock-think-alpha' },
            ].map((m, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">{m.name}</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{m.task}</p>
                <p className="text-[10px] font-mono text-gray-600">{m.model}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Modal */}
        {detailModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDetailModal(null)}>
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{detailModal}</h2>
                <button onClick={() => setDetailModal(null)} className="text-gray-500 hover:text-white text-xl">&times;</button>
              </div>
              <p className="text-sm text-gray-400">{t.clickForDetails}</p>
              {/* Detailed chart for selected metric */}
              {macro.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={macro}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                    <XAxis dataKey="tick" stroke="#4a4a6a" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#4a4a6a" tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
                    <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8 }} />
                    <Legend />
                    <Area type="monotone" dataKey="wealth_p10" name="P10" fill="#ef444433" stroke="#ef4444" strokeWidth={1} />
                    <Area type="monotone" dataKey="wealth_p50" name="P50" fill="#3b82f633" stroke="#3b82f6" strokeWidth={1} />
                    <Area type="monotone" dataKey="wealth_p90" name="P90" fill="#22c55e33" stroke="#22c55e" strokeWidth={1} />
                    <Line type="monotone" dataKey="avg_income" name="Avg" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
