'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, DollarSign, Building2, AlertTriangle,
  Activity, Zap, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight,
  Clock, Layers, BarChart3, PieChart as PieIcon, Brain, Shield,
  HelpCircle, Wallet, Scale, Percent, Banknote, Briefcase, Flame, Droplets,
  Factory, HeartPulse, GraduationCap, ShieldCheck, Truck, Lightbulb, Home
} from 'lucide-react'

// ============================================================
// API — detect base URL
// ============================================================
const getAPIBase = () => {
  if (typeof window !== 'undefined') {
    // Если на hexus.sbs — API через nginx /api/
    if (window.location.hostname !== 'localhost' && window.location.port === '') {
      return `${window.location.origin}/api`
    }
    // Прямой доступ — порт 8010
    return `${window.location.protocol}//${window.location.hostname}:8010/api`
  }
  return 'http://localhost:8010/api'
}

const API = getAPIBase()

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

// ============================================================
// I18N — EN / ZH / AR / RU  (word-for-word)
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
    avgExpenses: 'Avg Expenses',
    medianWealth: 'Median Wealth',
    giniIndex: 'Gini Index',
    inflation: 'Inflation',
    unemployment: 'Unemployment',
    transactions: 'Transactions',
    txPerTick: 'Tx/Tick',
    wealthGap: 'Wealth Gap (P90/P10)',
    wealthDistribution: 'Wealth Distribution',
    gdpOverTime: 'GDP Over Time',
    giniOverTime: 'Gini Coefficient',
    markets: 'Market Prices',
    events: 'Recent Events',
    topAgents: 'Top Agents by Capital',
    bottomAgents: 'Bottom Agents by Capital',
    macroIndicators: 'Macro Indicators',
    timeRange: 'Time Range',
    last1h: '1h', last6h: '6h', last24h: '24h', last7d: '7d', all: 'All',
    agent: 'Agent', capital: 'Capital', role: 'Role', sector: 'Sector',
    details: 'Details',
    noEvents: 'No events yet',
    noData: 'Waiting for data...',
    aiModels: 'AI Models',
    percentiles: 'Wealth Percentiles',
    incomeVsExpenses: 'Income vs Expenses',
    incomeExpDesc: 'Average income and expenses per tick',
    sectorPerformance: 'Sector Performance',
    tooltip_gdp: 'Gross Domestic Product — total value of all goods and services produced. Higher = stronger economy.',
    tooltip_totalCapital: 'Sum of all money held by all agents. Shows total wealth in the system.',
    tooltip_avgIncome: 'Average income per agent. Higher = agents earn more.',
    tooltip_avgExpenses: 'Average spending per agent. If higher than income — agents are losing money.',
    tooltip_medianWealth: 'Middle value of wealth. Half of agents have more, half have less. Better measure than average.',
    tooltip_gini: '0 = perfect equality (everyone has same money), 1 = perfect inequality (one person has everything). 0.3-0.4 is healthy.',
    tooltip_inflation: 'Rate at which prices increase. 2-3%/year is normal. Too high = money loses value fast.',
    tooltip_unemployment: 'Percentage of agents without active income. Lower is better.',
    tooltip_bankrupt: 'Agents who ran out of money and went bankrupt. High number = economic crisis.',
    tooltip_transactions: 'Total number of trades, salaries, investments. More transactions = more active economy.',
    tooltip_txPerTick: 'Average transactions per simulation tick. Shows economic activity level.',
    tooltip_wealthGap: 'Ratio of richest 10% to poorest 10%. Higher = more inequality. 5-15 is typical.',
    tooltip_companies: 'Number of active businesses created by entrepreneurs. More = more diverse economy.',
    worker: 'Worker', entrepreneur: 'Entrepreneur', investor: 'Investor',
    banker: 'Banker', government: 'Government', researcher: 'Researcher',
    innovation: 'Innovation', crisis: 'Crisis', bankruptcy: 'Bankruptcy', trade: 'Trade',
    priceIndex: 'Price Index', share: 'Share', count: 'Count',
    p10: 'P10 (Poorest 10%)', p25: 'P25', p50: 'P50 (Median)', p75: 'P75', p90: 'P90 (Richest 10%)',
  },
  zh: {
    title: 'AI经济模拟器',
    subtitle: '1,000个自主AI智能体实时模拟经济',
    tick: '周期', status: '状态', running: '运行中', paused: '已暂停',
    totalAgents: '智能体总数', activeAgents: '活跃智能体', bankruptAgents: '破产',
    companies: '公司', gdp: 'GDP', totalCapital: '总资本',
    avgIncome: '平均收入', avgExpenses: '平均支出', medianWealth: '财富中位数',
    giniIndex: '基尼系数', inflation: '通胀率', unemployment: '失业率',
    transactions: '交易数', txPerTick: '交易/周期',
    wealthGap: '贫富差距(P90/P10)',
    wealthDistribution: '财富分配',
    gdpOverTime: 'GDP变化趋势', giniOverTime: '基尼系数',
    markets: '市场价格', events: '最新事件',
    topAgents: '最富有智能体', bottomAgents: '最贫穷智能体',
    macroIndicators: '宏观经济指标',
    timeRange: '时间范围',
    last1h: '1小时', last6h: '6小时', last24h: '24小时', last7d: '7天', all: '全部',
    agent: '智能体', capital: '资本', role: '角色', sector: '行业',
    details: '详情',
    noEvents: '暂无事件', noData: '等待数据...',
    aiModels: 'AI模型',
    percentiles: '财富百分位数',
    incomeVsExpenses: '收入与支出',
    incomeExpDesc: '每个周期的平均收入和支出',
    sectorPerformance: '行业表现',
    tooltip_gdp: '国内生产总值 — 所有商品和服务的总价值。越高 = 经济越强。',
    tooltip_totalCapital: '所有智能体持有的货币总和。显示系统中的总财富。',
    tooltip_avgIncome: '每个智能体的平均收入。越高 = 智能体赚得越多。',
    tooltip_avgExpenses: '每个智能体的平均支出。如果高于收入 — 智能体正在亏损。',
    tooltip_medianWealth: '财富的中间值。一半智能体拥有更多，一半拥有更少。比平均值更好的衡量指标。',
    tooltip_gini: '0 = 完全平等（每个人拥有相同金额），1 = 完全不平等（一个人拥有一切）。0.3-0.4是健康的。',
    tooltip_inflation: '价格上涨的速度。每年2-3%是正常的。太高 = 货币快速贬值。',
    tooltip_unemployment: '没有活跃收入的智能体百分比。越低越好。',
    tooltip_bankrupt: '资金耗尽并破产的智能体。数量高 = 经济危机。',
    tooltip_transactions: '交易、工资、投资的总数。更多交易 = 更活跃的经济。',
    tooltip_txPerTick: '每个模拟周期的平均交易数。显示经济活动水平。',
    tooltip_wealthGap: '最富有10%与最贫穷10%的比率。越高 = 越不平等。5-15是典型的。',
    tooltip_companies: '企业家创建的活跃企业数量。越多 = 经济越多样化。',
    worker: '工人', entrepreneur: '企业家', investor: '投资者',
    banker: '银行家', government: '政府', researcher: '研究员',
    innovation: '创新', crisis: '危机', bankruptcy: '破产', trade: '贸易',
    priceIndex: '价格指数', share: '占比', count: '数量',
    p10: 'P10（最穷10%）', p25: 'P25', p50: 'P50（中位数）', p75: 'P75', p90: 'P90（最富10%）',
  },
  ar: {
    title: 'محاكي الاقتصاد بالذكاء الاصطناعي',
    subtitle: '1,000 وكيل ذكاء اصطناعي مستقل يحاكون اقتصادًا في الوقت الفعلي',
    tick: 'دورة', status: 'الحالة', running: 'قيد التشغيل', paused: 'متوقف',
    totalAgents: 'إجمالي الوكلاء', activeAgents: 'الوكلاء النشطون', bankruptAgents: 'مفلس',
    companies: 'الشركات', gdp: 'الناتج المحلي', totalCapital: 'إجمالي رأس المال',
    avgIncome: 'متوسط الدخل', avgExpenses: 'متوسط الإنفاق', medianWealth: 'الثراء الوسيط',
    giniIndex: 'معامل جيني', inflation: 'التضخم', unemployment: 'البطالة',
    transactions: 'المعاملات', txPerTick: 'معاملات/دورة',
    wealthGap: 'فجوة الثروة (P90/P10)',
    wealthDistribution: 'توزيع الثروة',
    gdpOverTime: 'الناتج المحلي عبر الزمن', giniOverTime: 'معامل جيني',
    markets: 'أسعار السوق', events: 'الأحداث الأخيرة',
    topAgents: 'أغنى الوكلاء', bottomAgents: 'أفقر الوكلاء',
    macroIndicators: 'المؤشرات الكلية',
    timeRange: 'النطاق الزمني',
    last1h: '1س', last6h: '6س', last24h: '24س', last7d: '7ي', all: 'الكل',
    agent: 'الوكيل', capital: 'رأس المال', role: 'الدور', sector: 'القطاع',
    details: 'التفاصيل',
    noEvents: 'لا توجد أحداث بعد', noData: 'في انتظار البيانات...',
    aiModels: 'نماذج الذكاء الاصطناعي',
    percentiles: 'درجات الثروة',
    incomeVsExpenses: 'الدخل مقابل الإنفاق',
    incomeExpDesc: 'متوسط الدخل والإنفاق لكل دورة',
    sectorPerformance: 'أداء القطاع',
    tooltip_gdp: 'إجمالي الناتج المحلي — القيمة الإجمالية لجميع السلع والخدمات المنتجة. أعلى = اقتصاد أقوى.',
    tooltip_totalCapital: 'مجموع جميع الأموال التي يحتفظ بها جميع الوكلاء. يظهر الثروة الكلية في النظام.',
    tooltip_avgIncome: 'متوسط الدخل لكل وكيل. أعلى = الوكلاء يكسبون أكثر.',
    tooltip_avgExpenses: 'متوسط الإنفاق لكل وكيل. إذا كان أعلى من الدخل — الوكلاء يخسرون المال.',
    tooltip_medianWealth: 'القيمة الوسطى للثروة. نصف الوكلاء لديهم أكثر والنصف الآخر أقل. مقياس أفضل من المتوسط.',
    tooltip_gini: '0 = مساواة تامة (الجميع لديهم نفس المال)، 1 = عدم مساواة تام (شخص واحد يملك كل شيء). 0.3-0.4 صحي.',
    tooltip_inflation: 'معدل ارتفاع الأسعار. 2-3٪ سنويًا طبيعي. مرتفع جدًا = المال يفقد قيمته بسرعة.',
    tooltip_unemployment: 'نسبة الوكلاء بدون دخل نشط. أقل = أفضل.',
    tooltip_bankrupt: 'الوكلاء الذين نفد أموالهم وأعلنوا إفلاسهم. عدد مرتفع = أزمة اقتصادية.',
    tooltip_transactions: 'إجمالي عدد الصفقات والرواتب والاستثمارات. معاملات أكثر = اقتصاد أكثر نشاطًا.',
    tooltip_txPerTick: 'متوسط المعاملات لكل دورة محاكاة. يظهر مستوى النشاط الاقتصادي.',
    tooltip_wealthGap: 'نسبة أغنى 10٪ إلى أفقر 10٪. أعلى = عدم مساواة أكبر. 5-15 نموذجي.',
    tooltip_companies: 'عدد الشركات النشطة التي أنشأها رواد الأعمال. أكثر = اقتصاد أكثر تنوعًا.',
    worker: 'عامل', entrepreneur: 'رائد أعمال', investor: 'مستثمر',
    banker: 'مصرفي', government: 'حكومة', researcher: 'باحث',
    innovation: 'ابتكار', crisis: 'أزمة', bankruptcy: 'إفلاس', trade: 'تجارة',
    priceIndex: 'مؤشر السعر', share: 'الحصة', count: 'العدد',
    p10: 'P10 (أفقر 10%)', p25: 'P25', p50: 'P50 (الوسيط)', p75: 'P75', p90: 'P90 (أغنى 10%)',
  },
  ru: {
    title: 'ИИ-Симулятор Экономики',
    subtitle: '1000 автономных ИИ-агентов моделируют экономику в реальном времени',
    tick: 'Тик', status: 'Статус', running: 'Работает', paused: 'Приостановлен',
    totalAgents: 'Всего агентов', activeAgents: 'Активных', bankruptAgents: 'Банкротов',
    companies: 'Компаний', gdp: 'ВВП', totalCapital: 'Общий капитал',
    avgIncome: 'Средний доход', avgExpenses: 'Средние расходы', medianWealth: 'Медиана богатства',
    giniIndex: 'Индекс Джини', inflation: 'Инфляция', unemployment: 'Безработица',
    transactions: 'Транзакций', txPerTick: 'Транзакций/тик',
    wealthGap: 'Разрыв богатства (P90/P10)',
    wealthDistribution: 'Распределение богатства',
    gdpOverTime: 'ВВП во времени', giniOverTime: 'Коэффициент Джини',
    markets: 'Рыночные цены', events: 'Последние события',
    topAgents: 'Самые богатые', bottomAgents: 'Самые бедные',
    macroIndicators: 'Макроиндикаторы',
    timeRange: 'Временной промежуток',
    last1h: '1ч', last6h: '6ч', last24h: '24ч', last7d: '7д', all: 'Всё',
    agent: 'Агент', capital: 'Капитал', role: 'Роль', sector: 'Сектор',
    details: 'Подробности',
    noEvents: 'Событий пока нет', noData: 'Ожидание данных...',
    aiModels: 'ИИ-модели',
    percentiles: 'Процентили богатства',
    incomeVsExpenses: 'Доходы vs Расходы',
    incomeExpDesc: 'Средний доход и расходы за тик',
    sectorPerformance: 'Динамика секторов',
    tooltip_gdp: 'Валовой внутренний продукт — сумма всех товаров и услуг. Выше = экономика сильнее.',
    tooltip_totalCapital: 'Сумма всех денег всех агентов. Показывает общее богатство в системе.',
    tooltip_avgIncome: 'Средний заработок агента. Выше = агенты богатеют.',
    tooltip_avgExpenses: 'Средние траты агента. Если больше дохода — агенты беднеют.',
    tooltip_medianWealth: 'Срединное значение богатства. Половина агентов богаче, половина беднее. Точнее среднего.',
    tooltip_gini: '0 = полное равенство (у всех одинаково), 1 = полное неравенство (у одного всё). 0.3–0.4 — норма.',
    tooltip_inflation: 'Скорость роста цен. 2–3% в год — норма. Слишком высокая = деньги обесцениваются.',
    tooltip_unemployment: 'Доля агентов без дохода. Ниже = лучше.',
    tooltip_bankrupt: 'Агенты, чьи деньги закончились. Много = экономический кризис.',
    tooltip_transactions: 'Общее число сделок, зарплат, инвестиций. Больше = экономика активнее.',
    tooltip_txPerTick: 'Среднее число транзакций за один тик. Показатель активности экономики.',
    tooltip_wealthGap: 'Отношение богатства верхних 10% к нижним 10%. Выше = больше неравенство. 5–15 — типично.',
    tooltip_companies: 'Количество активных бизнесов. Больше = разнообразнее экономика.',
    worker: 'Рабочий', entrepreneur: 'Предприниматель', investor: 'Инвестор',
    banker: 'Банкир', government: 'Госслужащий', researcher: 'Исследователь',
    innovation: 'Инновация', crisis: 'Кризис', bankruptcy: 'Банкротство', trade: 'Сделка',
    priceIndex: 'Индекс цен', share: 'Доля', count: 'Кол-во',
    p10: 'P10 (беднейшие 10%)', p25: 'P25', p50: 'P50 (медиана)', p75: 'P75', p90: 'P90 (богатейшие 10%)',
  },
}

// ============================================================
// Colors
// ============================================================
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#a855f7']
const SEVERITY_COLORS: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444' }

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
// Tooltip Component
// ============================================================
function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-500 hover:text-blue-400 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs leading-relaxed bg-[#1a1a2e] border border-[#2e2e4e] rounded-lg shadow-xl whitespace-normal w-56 text-gray-300 pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1a2e]" />
        </span>
      )}
    </span>
  )
}

// ============================================================
// Main Dashboard
// ============================================================
export default function Dashboard() {
  const [lang, setLang] = useState<'en' | 'zh' | 'ar' | 'ru'>('ru')
  const t = translations[lang]
  const isRTL = lang === 'ar'

  const [status, setStatus] = useState<SimStatus | null>(null)
  const [macro, setMacro] = useState<Macro[]>([])
  const [topAgents, setTopAgents] = useState<AgentInfo[]>([])
  const [bottomAgents, setBottomAgents] = useState<AgentInfo[]>([])
  const [events, setEvents] = useState<EventInfo[]>([])
  const [markets, setMarkets] = useState<MarketInfo[]>([])
  const [wealth, setWealth] = useState<{ buckets: WealthBucket[]; total_agents: number; total_capital: number } | null>(null)
  const [timeRange, setTimeRange] = useState<number>(200)
  const [detailModal, setDetailModal] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setLoading(false)
      setError(null)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const iv = setInterval(refresh, 3000)
    return () => clearInterval(iv)
  }, [refresh])

  const latest = macro.length > 0 ? macro[macro.length - 1] : null
  const prev = macro.length > 1 ? macro[macro.length - 2] : null

  const fmt = (n: number | undefined | null) => {
    if (n == null) return '—'
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
    return n.toFixed(0)
  }

  const TrendIcon = ({ c, p }: { c: number; p?: number }) => {
    if (p == null) return null
    return c > p ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : c < p ? <ArrowDownRight className="w-3 h-3 text-red-500" /> : null
  }

  const roleLabels: Record<string, string> = { worker: t.worker, entrepreneur: t.entrepreneur, investor: t.investor, banker: t.banker, government: t.government, researcher: t.researcher }

  // Avg expenses from agents data (approximation from macro)
  const avgExpenses = latest && latest.avg_income > 0 ? latest.total_capital / (status?.active_agents || 1) : 0
  const wealthGap = latest?.wealth_p90 && latest?.wealth_p10 && latest.wealth_p10 > 0 ? (latest.wealth_p90 / latest.wealth_p10) : null
  const txPerTick = macro.length > 1 ? Math.round(macro.reduce((s, m) => s + m.total_transactions, 0) / macro.length) : 0

  return (
    <div className={`min-h-screen bg-[#0a0a0f] ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-[#1e1e2e] px-4 py-3 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-40">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{t.title}</h1>
              <p className="text-[10px] text-gray-500">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className={`w-2 h-2 rounded-full ${status.is_running ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                {t.tick}: <span className="text-white font-mono">{status.tick}</span>
              </div>
            )}
            <div className="flex gap-1">
              {(['en', 'zh', 'ar', 'ru'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2.5 py-1 text-[10px] rounded-lg border transition-all font-medium ${lang === l ? 'border-accent text-accent bg-accent/10' : 'border-[#1e1e2e] text-gray-500 hover:border-[#2e2e4e]'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Loading / Error */}
        {loading && !status && (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400">{t.noData}</span>
          </div>
        )}

        {error && !status && (
          <div className="card border-red-900/50 text-center py-8">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
            <button onClick={refresh} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-all">
              Retry
            </button>
          </div>
        )}

        {status && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2">
              {[
                { label: t.gdp, value: latest?.gdp, prev: prev?.gdp, icon: DollarSign, color: 'text-blue-400', tip: t.tooltip_gdp },
                { label: t.totalAgents, value: status.total_agents, icon: Users, color: 'text-green-400', tip: t.tooltip_totalCapital },
                { label: t.activeAgents, value: status.active_agents, icon: Activity, color: 'text-emerald-400', tip: t.tooltip_totalCapital },
                { label: t.bankruptAgents, value: status.bankrupt_agents, icon: AlertTriangle, color: 'text-red-400', tip: t.tooltip_bankrupt },
                { label: t.companies, value: latest?.active_companies ?? 0, icon: Building2, color: 'text-purple-400', tip: t.tooltip_companies },
                { label: t.avgIncome, value: latest?.avg_income, prev: prev?.avg_income, icon: Wallet, color: 'text-green-400', tip: t.tooltip_avgIncome },
                { label: t.medianWealth, value: latest?.wealth_p50, icon: Banknote, color: 'text-teal-400', tip: t.tooltip_medianWealth },
                { label: t.giniIndex, value: latest?.gini_coefficient?.toFixed(3), icon: Scale, color: 'text-yellow-400', tip: t.tooltip_gini },
                { label: t.inflation, value: latest?.inflation_rate != null ? `${latest.inflation_rate.toFixed(2)}%` : null, icon: Percent, color: 'text-orange-400', tip: t.tooltip_inflation },
                { label: t.transactions, value: latest?.total_transactions, icon: Zap, color: 'text-cyan-400', tip: t.tooltip_transactions },
                { label: t.txPerTick, value: txPerTick, icon: Activity, color: 'text-indigo-400', tip: t.tooltip_txPerTick },
                { label: t.wealthGap, value: wealthGap?.toFixed(1) + 'x', icon: TrendingUp, color: 'text-pink-400', tip: t.tooltip_wealthGap },
              ].map((card, i) => (
                <div key={i} className="card cursor-pointer group !p-3" onClick={() => setDetailModal(card.label)}>
                  <div className="flex items-center justify-between mb-1.5">
                    <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                    <TrendIcon c={Number(card.value) || 0} p={Number(card.prev) || 0} />
                  </div>
                  <div className="text-lg font-bold text-white">{card.value != null && card.value !== '—' ? fmt(Number(card.value)) : '—'}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 flex items-center">
                    {card.label}
                    <InfoTip text={card.tip} />
                  </div>
                </div>
              ))}
            </div>

            {/* Time Range */}
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500">{t.timeRange}:</span>
              {[
                { label: t.last1h, ticks: 60 },
                { label: t.last6h, ticks: 360 },
                { label: t.last24h, ticks: 1440 },
                { label: t.last7d, ticks: 10080 },
                { label: t.all, ticks: 99999 },
              ].map(opt => (
                <button key={opt.ticks} onClick={() => setTimeRange(opt.ticks)}
                  className={`px-2.5 py-1 text-[10px] rounded-lg border transition-all ${timeRange === opt.ticks ? 'border-accent text-accent bg-accent/10' : 'border-[#1e1e2e] text-gray-500 hover:border-[#2e2e4e]'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Row 1: GDP + Gini */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold text-sm mb-3">{t.gdpOverTime}</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={macro}>
                    <defs><linearGradient id="gdpG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                    <XAxis dataKey="tick" stroke="#4a4a6a" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#4a4a6a" tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} />
                    <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="gdp" stroke="#3b82f6" fill="url(#gdpG)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3 className="font-semibold text-sm mb-3 flex items-center">
                  {t.giniOverTime} <InfoTip text={t.tooltip_gini} />
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={macro}>
                    <defs><linearGradient id="giniG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                    <XAxis dataKey="tick" stroke="#4a4a6a" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#4a4a6a" tick={{ fontSize: 10 }} domain={[0, 1]} />
                    <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="gini_coefficient" stroke="#f59e0b" fill="url(#giniG)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 2: Markets + Wealth Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold text-sm mb-3">{t.markets}</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={markets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                    <XAxis dataKey="sector" stroke="#4a4a6a" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={55} />
                    <YAxis stroke="#4a4a6a" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="price_index" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3 className="font-semibold text-sm mb-3">{t.wealthDistribution}</h3>
                {wealth && wealth.buckets.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={wealth.buckets} dataKey="share_of_total" nameKey="range" cx="50%" cy="50%" outerRadius={90}
                        label={({ range, share_of_total }) => `${range}: ${share_of_total.toFixed(1)}%`} labelLine={{ stroke: '#4a4a6a' }}>
                        {wealth.buckets.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-gray-500 text-sm">{t.noData}</div>
                )}
              </div>
            </div>

            {/* Row 3: Percentiles + Income/Expenses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold text-sm mb-3 flex items-center">
                  {t.percentiles} <InfoTip text={t.tooltip_wealthGap} />
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={macro}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                    <XAxis dataKey="tick" stroke="#4a4a6a" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#4a4a6a" tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} />
                    <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="wealth_p10" name={t.p10} stroke="#ef4444" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="wealth_p50" name={t.p50} stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="wealth_p90" name={t.p90} stroke="#22c55e" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3 className="font-semibold text-sm mb-3">{t.incomeVsExpenses}</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={macro}>
                    <defs>
                      <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                    <XAxis dataKey="tick" stroke="#4a4a6a" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#4a4a6a" tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} />
                    <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="avg_income" name={t.avgIncome} stroke="#22c55e" fill="url(#incG)" strokeWidth={2} />
                    <Line type="monotone" dataKey="total_capital" name={t.totalCapital} stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 4: Top/Bottom Agents + Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" /> {t.topAgents}
                </h3>
                <div className="space-y-1">
                  {topAgents.map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-[#1a1a2e] transition-all cursor-pointer text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600 w-3">{i + 1}</span>
                        <span>{a.name}</span>
                        <span className="text-gray-600">({roleLabels[a.role] || a.role})</span>
                      </div>
                      <span className="font-mono text-green-400">₽{fmt(a.capital)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" /> {t.bottomAgents}
                </h3>
                <div className="space-y-1">
                  {bottomAgents.map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-[#1a1a2e] transition-all cursor-pointer text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600 w-3">{i + 1}</span>
                        <span>{a.name}</span>
                        <span className="text-gray-600">({roleLabels[a.role] || a.role})</span>
                      </div>
                      <span className="font-mono text-red-400">₽{fmt(a.capital)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" /> {t.events}
                </h3>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {events.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">{t.noEvents}</p>
                  ) : events.map(e => (
                    <div key={e.id} className="flex items-start gap-2 py-1 px-2 rounded-lg hover:bg-[#1a1a2e]">
                      <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: SEVERITY_COLORS[e.severity] || '#4a4a6a' }} />
                      <div>
                        <p className="text-xs">{e.title}</p>
                        <p className="text-[10px] text-gray-600">{t.tick} {e.tick}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Models */}
            <div className="card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-400" /> {t.aiModels}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { name: 'Sherlock Dash', task: 'Quick decisions', model: 'sherlock-dash-alpha' },
                  { name: 'DeepSeek v4', task: 'Trade & Market', model: 'deepseek-v4-flash' },
                  { name: 'Grok 4.1', task: 'Strategy', model: 'grok-4.1-fast' },
                  { name: 'Hunter Alpha', task: 'Research', model: 'hunter-alpha' },
                  { name: 'Sherlock Think', task: 'Complex reasoning', model: 'sherlock-think-alpha' },
                ].map((m, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs font-medium">{m.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{m.task}</p>
                    <p className="text-[9px] font-mono text-gray-600 mt-1">{m.model}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail Modal */}
            {detailModal && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDetailModal(null)}>
                <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-5 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold">{detailModal}</h2>
                    <button onClick={() => setDetailModal(null)} className="text-gray-500 hover:text-white text-xl">&times;</button>
                  </div>
                  {macro.length > 0 && (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={macro}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                        <XAxis dataKey="tick" stroke="#4a4a6a" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#4a4a6a" tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} />
                        <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area type="monotone" dataKey="wealth_p10" name="P10" fill="#ef444422" stroke="#ef4444" strokeWidth={1} />
                        <Area type="monotone" dataKey="wealth_p50" name="P50" fill="#3b82f622" stroke="#3b82f6" strokeWidth={1} />
                        <Area type="monotone" dataKey="wealth_p90" name="P90" fill="#22c55e22" stroke="#22c55e" strokeWidth={1} />
                        <Line type="monotone" dataKey="avg_income" name="Avg Income" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="gdp" name="GDP" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
