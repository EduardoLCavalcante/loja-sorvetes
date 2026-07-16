"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  IceCreamBowl,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  RefreshCw,
  Users,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import AdminInventory from "./admin-inventory"

type Range = "today" | "7d" | "30d" | "month"
type View = "overview" | "catalog" | "customers" | "conflicts"
type DetailMetric = "revenue" | "averageTicket"

type DashboardData = {
  summary: { orders: number; revenue: number; customers: number; newCustomers: number; recurringCustomers: number; averageTicket: number; itemsSold: number }
  salesSeries: Array<{ date: string; label: string; revenue: number; orders: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  topCustomers: Array<{ id: string; name: string; phone: string; orders: number; total: number; ticket: number }>
  recentOrders: Array<{ id: string; number: number; customerName: string; status: string; paymentMethod: string; total: number; createdAt: string; items: string }>
  conflicts: Array<{ id: string; customerId: string; registeredName: string; submittedName: string; phone: string; createdAt: string; createdAtLabel: string }>
  conflictsCount: number
}

type CustomerDetail = {
  customer: { id: string; name: string; phone: string; isSharedPhone: boolean; totalOrders: number; total: number; ticket: number; firstOrder: string | null; lastOrder: string | null; favorites: Array<{ name: string; quantity: number }> }
  orders: Array<{ id: string; number: number; status: string; total: number; paymentMethod: string; createdAt: string; items: string }>
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const numberFormatter = new Intl.NumberFormat("pt-BR")
const rangeLabels: Record<Range, string> = { today: "Hoje", "7d": "Últimos 7 dias", "30d": "Últimos 30 dias", month: "Este mês" }
const statusLabels: Record<string, string> = { received: "Recebido", confirmed: "Confirmado", preparing: "Em preparo", out_for_delivery: "Saiu para entrega", delivered: "Entregue", cancelled: "Cancelado" }
const navigation = [
  { id: "overview" as const, label: "Visão geral", shortLabel: "Início", icon: LayoutDashboard },
  { id: "catalog" as const, label: "Produtos", shortLabel: "Produtos", icon: Package },
  { id: "customers" as const, label: "Clientes", shortLabel: "Clientes", icon: Users },
  { id: "conflicts" as const, label: "Revisar", shortLabel: "Revisar", icon: AlertTriangle },
]

function formatCurrency(value: number) { return currencyFormatter.format(value || 0) }

function statusClass(status: string) {
  if (status === "cancelled") return "border-zinc-200 bg-zinc-100 text-zinc-600"
  if (status === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "out_for_delivery") return "border-sky-200 bg-sky-50 text-sky-700"
  if (status === "preparing") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
}

function EmptyState({ children }: { children: ReactNode }) { return <p className="py-10 text-center text-sm text-[#746d7b]">{children}</p> }

function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.025em] text-[#2a1638] sm:text-[1.45rem]">{title}</h2>{action}</div>
}

function MetricCard({ label, value, detail, icon: Icon, onViewValue }: { label: string; value: string; detail: string; icon: typeof ClipboardList; onViewValue?: () => void }) {
  return (
    <article className="min-w-0 rounded-xl border border-[#e8e5eb] bg-white p-4 shadow-[0_1px_2px_rgba(42,22,56,0.03)] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#746d7b] sm:text-xs">{label}</p><p className="mt-2 truncate font-serif text-[1.7rem] leading-none tracking-[-0.035em] text-[#241a2a] sm:mt-3 sm:text-[2rem]">{value}</p><p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#746d7b] sm:text-xs">{detail}</p>{onViewValue ? <button type="button" onClick={onViewValue} className="mt-3 min-h-11 text-left text-xs font-semibold text-[#9e2555] underline underline-offset-4 transition hover:text-[#6f183c] focus:outline-none focus:ring-2 focus:ring-[#c83b70] focus:ring-offset-2">Ver valor completo</button> : null}</div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff1f5] text-[#c83b70] sm:h-10 sm:w-10"><Icon className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
      </div>
    </article>
  )
}

function MetricDetailDialog({ metric, onClose }: { metric: { title: string; value: string; period: string; calculation: string; icon: typeof ClipboardList } | null; onClose: () => void }) {
  if (!metric) return null

  const Icon = metric.icon
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-xl border-[#e8e5eb] bg-white p-5 sm:p-6"><DialogHeader className="pr-8 text-left"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff1f5] text-[#c83b70]"><Icon className="h-5 w-5" strokeWidth={1.8} /></span><div><DialogTitle className="font-serif text-2xl tracking-[-0.03em] text-[#2a1638]">{metric.title}</DialogTitle><DialogDescription className="mt-1 text-[#746d7b]">{metric.period}</DialogDescription></div></div></DialogHeader><div className="mt-2 rounded-xl bg-[#fff8fa] p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#746d7b]">Valor completo</p><p className="mt-2 max-w-full break-words font-serif text-[clamp(2rem,10vw,3.5rem)] leading-none tracking-[-0.05em] text-[#2a1638]">{metric.value}</p></div><div className="border-t border-[#eeeaf0] pt-4"><p className="text-sm font-semibold text-[#2a1638]">Como calculamos</p><p className="mt-1.5 text-sm leading-6 text-[#746d7b]">{metric.calculation}</p></div><div className="flex justify-end"><Button type="button" variant="outline" onClick={onClose} className="min-h-11 border-[#ded9e1] bg-white text-[#4e3b57] hover:bg-[#fff1f5]">Fechar</Button></div></DialogContent></Dialog>
}

function SideNavigation({ currentView, onNavigate, onSignOut, signingOut, conflictsCount }: { currentView: View; onNavigate: (view: View) => void; onSignOut: () => void; signingOut: boolean; conflictsCount: number }) {
  return (
    <>
      <aside className="hidden fixed inset-y-0 left-0 z-30 w-64 flex-col bg-[#2a1638] text-white lg:flex">
        <div className="flex items-center gap-3 px-7 py-8"><span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white/10 text-[#ffb8d2]"><IceCreamBowl className="h-6 w-6" strokeWidth={1.8} /></span><span className="font-serif text-[1.45rem] leading-[0.9] tracking-[-0.04em]">D&apos;lice<br />Sorvetes</span></div>
        <nav className="space-y-1 px-4">
          {navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onNavigate(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${currentView === id ? "bg-[#c83b70] text-white shadow-[0_8px_20px_rgba(200,59,112,0.25)]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon className="h-[18px] w-[18px]" strokeWidth={1.8} /><span>{label}</span>{id === "conflicts" && conflictsCount > 0 ? <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px]">{conflictsCount}</span> : null}</button>)}
        </nav>
        <div className="mt-auto border-t border-white/15 p-4"><button type="button" onClick={onSignOut} disabled={signingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50">{signingOut ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <LogOut className="h-[18px] w-[18px]" />}Sair</button></div>
      </aside>
      <div className="flex h-16 items-center justify-between bg-[#2a1638] px-4 text-white lg:hidden"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-[#ffb8d2]"><IceCreamBowl className="h-5 w-5" /></span><span className="font-serif text-lg tracking-[-0.04em]">D&apos;lice Sorvetes</span></div><button type="button" onClick={onSignOut} disabled={signingOut} className="min-h-11 px-2 text-sm font-medium text-white/85">Sair</button></div>
      <nav aria-label="Navegação administrativa" className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(4.5rem+env(safe-area-inset-bottom))] grid-cols-4 border-t border-[#e8e5eb] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(42,22,56,0.08)] lg:hidden">
        {navigation.map(({ id, shortLabel, icon: Icon }) => <button key={id} type="button" onClick={() => onNavigate(id)} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${currentView === id ? "text-[#c83b70]" : "text-[#746d7b]"}`}><Icon className="h-5 w-5" strokeWidth={currentView === id ? 2.3 : 1.8} /><span>{shortLabel}</span>{id === "conflicts" && conflictsCount > 0 ? <span className="absolute top-1 right-[calc(50%-1.5rem)] grid h-4 min-w-4 place-items-center rounded-full bg-[#c83b70] px-1 text-[9px] text-white">{conflictsCount > 9 ? "9+" : conflictsCount}</span> : null}</button>)}
      </nav>
    </>
  )
}

function CustomerDialog({ detail, loading, onClose }: { detail: CustomerDetail | null; loading: boolean; onClose: () => void }) {
  return <Dialog open={Boolean(detail) || loading} onOpenChange={(open) => !open && onClose()}><DialogContent className="h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto rounded-none border-[#e8e5eb] bg-white p-0 sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-xl">
    {loading || !detail ? <div className="grid min-h-56 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#c83b70]" /></div> : <div className="p-5 pb-10 sm:p-8"><DialogHeader className="pr-8"><DialogTitle className="font-serif text-3xl tracking-[-0.035em] text-[#2a1638]">{detail.customer.name}</DialogTitle><DialogDescription className="mt-2 text-[#746d7b]">{detail.customer.phone}</DialogDescription></DialogHeader>
      {detail.customer.isSharedPhone ? <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#fff1f5] px-3 py-1 text-xs font-semibold text-[#9e2555]"><Users className="h-3.5 w-3.5" />Telefone compartilhado</p> : null}
      <div className="mt-6 grid grid-cols-3 divide-x divide-[#e8e5eb] rounded-xl border border-[#e8e5eb]"><div className="p-3 sm:p-4"><p className="text-[11px] text-[#746d7b]">Pedidos</p><p className="mt-1 text-base font-semibold text-[#2a1638] sm:text-lg">{detail.customer.totalOrders}</p></div><div className="p-3 sm:p-4"><p className="text-[11px] text-[#746d7b]">Total gasto</p><p className="mt-1 truncate text-sm font-semibold text-[#2a1638] sm:text-lg">{formatCurrency(detail.customer.total)}</p></div><div className="p-3 sm:p-4"><p className="text-[11px] text-[#746d7b]">Ticket médio</p><p className="mt-1 truncate text-sm font-semibold text-[#2a1638] sm:text-lg">{formatCurrency(detail.customer.ticket)}</p></div></div>
      <div className="mt-7 grid gap-6 sm:grid-cols-2"><section><h3 className="text-sm font-semibold text-[#2a1638]">Produtos preferidos</h3>{detail.customer.favorites.length ? <ul className="mt-3 space-y-2 text-sm text-[#5f5866]">{detail.customer.favorites.map((favorite) => <li key={favorite.name} className="flex justify-between gap-3"><span className="truncate">{favorite.name}</span><span className="shrink-0 font-semibold text-[#2a1638]">{favorite.quantity} un.</span></li>)}</ul> : <p className="mt-3 text-sm text-[#746d7b]">Ainda não há itens contabilizados.</p>}</section><section><h3 className="text-sm font-semibold text-[#2a1638]">Histórico</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-[#746d7b]">Primeiro pedido</dt><dd className="text-right font-medium text-[#2a1638]">{detail.customer.firstOrder || "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#746d7b]">Último pedido</dt><dd className="text-right font-medium text-[#2a1638]">{detail.customer.lastOrder || "—"}</dd></div></dl></section></div>
      <section className="mt-8 border-t border-[#eeeaf0] pt-6"><h3 className="text-sm font-semibold text-[#2a1638]">Pedidos recentes</h3><div className="mt-3 overflow-hidden rounded-xl border border-[#e8e5eb]">{detail.orders.length ? detail.orders.map((order) => <div key={order.id} className="border-b border-[#eeeaf0] px-4 py-3 last:border-0"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-[#2a1638]">#{order.number}</span><span className="text-sm font-semibold text-[#2a1638]">{formatCurrency(order.total)}</span></div><p className="mt-1 truncate text-xs text-[#746d7b]">{order.items || "Sem itens"}</p><p className="mt-1 text-xs text-[#746d7b]">{order.createdAt} · {statusLabels[order.status] || order.status}</p></div>) : <EmptyState>Nenhum pedido encontrado.</EmptyState>}</div></section>
    </div>}</DialogContent></Dialog>
}

function DashboardSkeleton() { return <div className="mt-7 animate-pulse space-y-5"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 rounded-xl bg-[#eeeaf0]" />)}</div><div className="h-64 rounded-xl bg-[#eeeaf0]" /><div className="h-48 rounded-xl bg-[#eeeaf0]" /></div> }

export default function AdminDashboard({ accessToken, userEmail, onAuthError, onSignOut, signingOut }: { accessToken: string; userEmail?: string; onAuthError: () => void; onSignOut: () => void; signingOut: boolean }) {
  const [view, setView] = useState<View>("overview")
  const [range, setRange] = useState<Range>("month")
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [conflictIndex, setConflictIndex] = useState(0)
  const [detailMetric, setDetailMetric] = useState<DetailMetric | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const response = await fetch(`/api/admin/analytics?range=${range}`, { cache: "no-store", headers: { Authorization: `Bearer ${accessToken}` } })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) { onAuthError(); return }
      if (!response.ok) throw new Error(payload?.error || "Não foi possível carregar a dashboard.")
      setDashboard(payload)
    } catch (requestError: any) { setError(requestError?.message || "Não foi possível carregar a dashboard.") } finally { setLoading(false) }
  }, [accessToken, onAuthError, range])

  useEffect(() => { void loadDashboard() }, [loadDashboard])
  useEffect(() => { setConflictIndex((current) => Math.max(0, Math.min(current, Math.max(0, (dashboard?.conflicts.length || 1) - 1)))) }, [dashboard?.conflicts.length])

  const openCustomer = useCallback(async (customerId: string) => {
    setCustomerLoading(true); setCustomerDetail(null)
    try {
      const response = await fetch(`/api/admin/customers?id=${customerId}`, { cache: "no-store", headers: { Authorization: `Bearer ${accessToken}` } })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) { onAuthError(); return }
      if (!response.ok) throw new Error(payload?.error || "Não foi possível carregar este cliente.")
      setCustomerDetail(payload)
    } catch (requestError: any) { setError(requestError?.message || "Não foi possível carregar este cliente.") } finally { setCustomerLoading(false) }
  }, [accessToken, onAuthError])

  const resolveConflict = useCallback(async (conflictId: string, action: "keep" | "rename" | "shared", customerName?: string) => {
    setResolvingId(conflictId); setError(null)
    try {
      const response = await fetch("/api/admin/customer-name-conflicts", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ conflictId, action, customerName }) })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) { onAuthError(); return }
      if (!response.ok) throw new Error(payload?.error || "Não foi possível salvar a correção.")
      await loadDashboard()
    } catch (requestError: any) { setError(requestError?.message || "Não foi possível salvar a correção.") } finally { setResolvingId(null) }
  }, [accessToken, loadDashboard, onAuthError])

  const currentConflict = dashboard?.conflicts[conflictIndex]
  const hasConflicts = Boolean(dashboard?.conflictsCount)
  const pageTitle = useMemo(() => ({ overview: "Visão geral", catalog: "Catálogo", customers: "Clientes", conflicts: "Revisar nomes" }[view]), [view])
  const selectedMetric = detailMetric && dashboard ? {
    revenue: {
      title: "Faturamento",
      value: formatCurrency(dashboard.summary.revenue),
      period: rangeLabels[range],
      calculation: "É a soma do total de todos os pedidos válidos no período, incluindo a taxa de entrega.",
      icon: CircleDollarSign,
    },
    averageTicket: {
      title: "Ticket médio",
      value: formatCurrency(dashboard.summary.averageTicket),
      period: rangeLabels[range],
      calculation: `É o faturamento dividido por ${numberFormatter.format(dashboard.summary.orders)} pedido${dashboard.summary.orders === 1 ? " válido" : "s válidos"} no período.`,
      icon: BarChart3,
    },
  }[detailMetric] : null

  return <div className="min-h-screen bg-[#f8f7f9] text-[#241a2a] lg:pl-64">
    <SideNavigation currentView={view} onNavigate={setView} onSignOut={onSignOut} signingOut={signingOut} conflictsCount={dashboard?.conflictsCount || 0} />
    <main className="min-h-screen pb-24 lg:pb-0">
      <header className="sticky top-0 z-20 hidden min-h-16 items-center justify-between border-b border-[#e8e5eb] bg-white/95 px-8 backdrop-blur lg:flex lg:px-10"><p className="text-sm text-[#746d7b]">{userEmail || "Área administrativa"}</p><div className="flex items-center gap-3"><span className="text-sm font-medium text-[#4e3b57]">{pageTitle}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#2a1638] text-xs font-semibold text-white">{(userEmail || "AD").slice(0, 2).toUpperCase()}</span></div></header>
      <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        {error ? <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><Button size="sm" variant="outline" onClick={() => void loadDashboard()} className="border-red-200 bg-white text-red-800 hover:bg-red-100">Tentar novamente</Button></div> : null}
        {view === "catalog" ? <section><div className="mb-6 flex items-end justify-between gap-4"><div><h1 className="font-serif text-3xl tracking-[-0.045em] text-[#2a1638] sm:text-4xl">Catálogo</h1><p className="mt-2 text-sm text-[#746d7b]">Edite produtos, preços, categorias e disponibilidade.</p></div><Button variant="outline" onClick={() => setView("overview")} className="hidden border-[#e2dbe5] bg-white text-[#4e3b57] hover:bg-[#fff1f5] sm:flex">Voltar à visão geral</Button></div><AdminInventory onAuthError={onAuthError} /></section> : null}
        {view === "overview" ? <section><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-serif text-3xl tracking-[-0.045em] text-[#2a1638] sm:text-5xl">Visão geral</h1><p className="mt-1.5 max-w-xl text-sm text-[#746d7b] sm:mt-2">Acompanhe vendas, clientes e pedidos recebidos pelo aplicativo.</p></div><div className="flex w-full items-center gap-2 sm:w-auto"><label className="sr-only" htmlFor="dashboard-range">Período</label><div className="relative min-w-0 flex-1 sm:flex-none"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#746d7b]" /><select id="dashboard-range" value={range} onChange={(event) => setRange(event.target.value as Range)} className="h-11 w-full appearance-none rounded-lg border border-[#ded9e1] bg-white py-2 pl-9 pr-8 text-sm font-medium text-[#3c3043] outline-none transition focus:border-[#c83b70] focus:ring-2 focus:ring-[#f9c8d9] sm:w-auto">{Object.entries(rangeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><Button variant="outline" size="icon" onClick={() => void loadDashboard()} disabled={loading} className="h-11 w-11 shrink-0 border-[#ded9e1] bg-white text-[#4e3b57] hover:bg-[#fff1f5]" aria-label="Atualizar indicadores"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button></div></div>
          {loading && !dashboard ? <DashboardSkeleton /> : dashboard ? <><div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 xl:grid-cols-4"><MetricCard label="Pedidos" value={numberFormatter.format(dashboard.summary.orders)} detail={`Válidos em ${rangeLabels[range].toLowerCase()}`} icon={ClipboardList} /><MetricCard label="Faturamento" value={formatCurrency(dashboard.summary.revenue)} detail="Inclui taxa de entrega" icon={CircleDollarSign} onViewValue={() => setDetailMetric("revenue")} /><MetricCard label="Clientes únicos" value={numberFormatter.format(dashboard.summary.customers)} detail={`${dashboard.summary.newCustomers} novos no período`} icon={Users} /><MetricCard label="Ticket médio" value={formatCurrency(dashboard.summary.averageTicket)} detail={`${numberFormatter.format(dashboard.summary.itemsSold)} itens vendidos`} icon={BarChart3} onViewValue={() => setDetailMetric("averageTicket")} /></div>
            <button type="button" onClick={() => setView("conflicts")} className="mt-4 flex w-full items-center gap-3 rounded-xl border border-[#f4cad8] bg-[#fff8fa] p-4 text-left transition hover:bg-[#fff1f5]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffe1eb] text-[#c83b70]"><AlertTriangle className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#54243b]">{hasConflicts ? `${dashboard.conflictsCount} nome${dashboard.conflictsCount === 1 ? " para revisar" : "s para revisar"}` : "Cadastros em dia"}</span><span className="mt-0.5 block truncate text-xs text-[#7b6070]">{hasConflicts ? "Verifique nomes diferentes associados ao mesmo telefone." : "Não há divergências de nome pendentes."}</span></span>{hasConflicts ? <ChevronRight className="h-5 w-5 shrink-0 text-[#c83b70]" /> : <Check className="h-5 w-5 shrink-0 text-emerald-600" />}</button>
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.8fr)]"><section className="rounded-xl border border-[#e8e5eb] bg-white p-4 sm:p-6"><SectionHeading title="Vendas ao longo do tempo" action={<span className="text-xs font-medium text-[#746d7b]">Faturamento</span>} />{dashboard.salesSeries.length ? <div className="mt-4 h-52 sm:mt-6 sm:h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard.salesSeries} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}><defs><linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e74f85" stopOpacity={0.25} /><stop offset="100%" stopColor="#e74f85" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#eeeaf0" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#746d7b", fontSize: 10 }} minTickGap={28} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#746d7b", fontSize: 10 }} tickFormatter={(value) => `R$ ${value}`} width={44} hide={false} /><Tooltip formatter={(value: number | undefined) => [formatCurrency(value || 0), "Faturamento"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ""} contentStyle={{ borderRadius: 10, borderColor: "#e8e5eb", boxShadow: "0 12px 30px rgba(42,22,56,.08)" }} /><Area type="monotone" dataKey="revenue" stroke="#c83b70" strokeWidth={2.4} fill="url(#salesGradient)" dot={{ r: 2.5, fill: "#fff", stroke: "#c83b70", strokeWidth: 2 }} activeDot={{ r: 4 }} /></AreaChart></ResponsiveContainer></div> : <EmptyState>Os pedidos deste período aparecerão aqui.</EmptyState>}</section><section className="rounded-xl border border-[#e8e5eb] bg-white p-4 sm:p-6"><SectionHeading title="Produtos mais pedidos" />{dashboard.topProducts.length ? <ol className="mt-4 divide-y divide-[#eeeaf0]">{dashboard.topProducts.map((product, index) => <li key={product.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#fff1f5] text-xs font-bold text-[#b52d61]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-[#3a3041]">{product.name}</span><span className="text-right text-sm font-semibold text-[#2a1638]"><span className="block">{product.quantity} un.</span><span className="text-xs font-normal text-[#746d7b]">{formatCurrency(product.revenue)}</span></span></li>)}</ol> : <EmptyState>Os itens vendidos aparecerão aqui.</EmptyState>}</section></div>
            <RecentOrders orders={dashboard.recentOrders} /></> : null}
        </section> : null}
        {view === "customers" ? <CustomerList customers={dashboard?.topCustomers || []} loading={loading} onOpenCustomer={openCustomer} /> : null}
        {view === "conflicts" ? <ConflictReview conflict={currentConflict} total={dashboard?.conflictsCount || 0} visibleTotal={dashboard?.conflicts.length || 0} index={conflictIndex} resolvingId={resolvingId} onBack={() => setView("overview")} onPrevious={() => setConflictIndex((index) => Math.max(0, index - 1))} onNext={() => setConflictIndex((index) => Math.min((dashboard?.conflicts.length || 1) - 1, index + 1))} onOpenCustomer={openCustomer} onResolve={resolveConflict} /> : null}
      </div>
    </main>
    <CustomerDialog detail={customerDetail} loading={customerLoading} onClose={() => { setCustomerDetail(null); setCustomerLoading(false) }} />
    <MetricDetailDialog metric={selectedMetric} onClose={() => setDetailMetric(null)} />
  </div>
}

function CustomerList({ customers, loading, onOpenCustomer }: { customers: DashboardData["topCustomers"]; loading: boolean; onOpenCustomer: (id: string) => void }) {
  return <section><div><h1 className="font-serif text-3xl tracking-[-0.045em] text-[#2a1638] sm:text-5xl">Clientes</h1><p className="mt-1.5 text-sm text-[#746d7b] sm:mt-2">Quem mais fez pedidos no período selecionado.</p></div><div className="mt-6 rounded-xl border border-[#e8e5eb] bg-white p-4 sm:mt-8 sm:p-6"><SectionHeading title="Clientes que mais pedem" />{loading ? <DashboardSkeleton /> : customers.length ? <><div className="mt-4 divide-y divide-[#eeeaf0] md:hidden">{customers.map((customer) => <button key={customer.id} type="button" onClick={() => void onOpenCustomer(customer.id)} className="flex w-full items-center gap-3 py-4 text-left first:pt-0 last:pb-0"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff1f5] text-sm font-semibold text-[#b52d61]">{customer.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#2a1638]">{customer.name}</span><span className="mt-0.5 block text-xs text-[#746d7b]">{customer.orders} pedido{customer.orders === 1 ? "" : "s"} · {customer.phone}</span></span><span className="shrink-0 text-right"><span className="block text-sm font-semibold text-[#2a1638]">{formatCurrency(customer.total)}</span><span className="text-xs text-[#746d7b]">{formatCurrency(customer.ticket)} médio</span></span><ChevronRight className="h-4 w-4 shrink-0 text-[#c83b70]" /></button>)}</div><div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full text-left"><thead className="border-b border-[#e8e5eb] text-xs font-semibold uppercase tracking-[0.08em] text-[#746d7b]"><tr><th className="pb-3">Cliente</th><th className="pb-3">Telefone</th><th className="pb-3 text-right">Pedidos</th><th className="pb-3 text-right">Total gasto</th><th className="pb-3 text-right">Ticket</th></tr></thead><tbody className="divide-y divide-[#eeeaf0]">{customers.map((customer) => <tr key={customer.id} className="cursor-pointer transition hover:bg-[#fff8fa]" onClick={() => void onOpenCustomer(customer.id)}><td className="py-3.5 text-sm font-semibold text-[#2a1638]">{customer.name}</td><td className="py-3.5 text-sm text-[#746d7b]">{customer.phone}</td><td className="py-3.5 text-right text-sm font-medium text-[#3a3041]">{customer.orders}</td><td className="py-3.5 text-right text-sm font-semibold text-[#2a1638]">{formatCurrency(customer.total)}</td><td className="py-3.5 text-right text-sm text-[#3a3041]">{formatCurrency(customer.ticket)}</td></tr>)}</tbody></table></div></> : <EmptyState>Os clientes que fizerem pedidos aparecerão aqui.</EmptyState>}</div></section>
}

function RecentOrders({ orders }: { orders: DashboardData["recentOrders"] }) {
  return <section className="mt-4 rounded-xl border border-[#e8e5eb] bg-white p-4 sm:mt-5 sm:p-6"><SectionHeading title="Pedidos recentes" />{orders.length ? <><div className="mt-4 divide-y divide-[#eeeaf0] md:hidden">{orders.map((order) => <article key={order.id} className="py-4 first:pt-0 last:pb-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#2a1638]">#{order.number} · {order.customerName}</p><p className="mt-1 text-xs text-[#746d7b]">{order.createdAt}</p></div><p className="shrink-0 text-sm font-semibold text-[#2a1638]">{formatCurrency(order.total)}</p></div><p className="mt-2 truncate text-xs text-[#746d7b]">{order.items || "Sem itens"}</p><span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(order.status)}`}>{statusLabels[order.status] || order.status}</span></article>)}</div><div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full text-left"><thead className="border-b border-[#e8e5eb] text-xs font-semibold uppercase tracking-[0.08em] text-[#746d7b]"><tr><th className="pb-3">Pedido</th><th className="pb-3">Data</th><th className="pb-3">Cliente</th><th className="pb-3">Itens</th><th className="pb-3 text-right">Total</th><th className="pb-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-[#eeeaf0]">{orders.map((order) => <tr key={order.id}><td className="py-3.5 text-sm font-semibold text-[#2a1638]">#{order.number}</td><td className="py-3.5 text-sm text-[#746d7b]">{order.createdAt}</td><td className="py-3.5 text-sm font-medium text-[#3a3041]">{order.customerName}</td><td className="max-w-[320px] truncate py-3.5 text-sm text-[#746d7b]">{order.items || "Sem itens"}</td><td className="py-3.5 text-right text-sm font-semibold text-[#2a1638]">{formatCurrency(order.total)}</td><td className="py-3.5 text-right"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(order.status)}`}>{statusLabels[order.status] || order.status}</span></td></tr>)}</tbody></table></div></> : <EmptyState>Os pedidos mais recentes aparecerão aqui.</EmptyState>}</section>
}

function ConflictReview({ conflict, total, visibleTotal, index, resolvingId, onBack, onPrevious, onNext, onOpenCustomer, onResolve }: { conflict?: DashboardData["conflicts"][number]; total: number; visibleTotal: number; index: number; resolvingId: string | null; onBack: () => void; onPrevious: () => void; onNext: () => void; onOpenCustomer: (id: string) => void; onResolve: (id: string, action: "keep" | "rename" | "shared", name?: string) => void }) {
  if (!conflict) return <section><button type="button" onClick={onBack} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#746d7b] hover:text-[#2a1638]"><ArrowLeft className="h-4 w-4" />Voltar</button><div className="rounded-xl border border-[#e8e5eb] bg-white p-6"><EmptyState>{total ? "Carregue mais pendências para continuar a revisão." : "Não há divergências de nomes pendentes."}</EmptyState></div></section>
  const pendingLabel = visibleTotal ? `${index + 1} de ${visibleTotal}${total > visibleTotal ? ` carregadas de ${total}` : ""}` : ""
  return <section className="mx-auto max-w-2xl"><button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#746d7b] hover:text-[#2a1638]"><ArrowLeft className="h-4 w-4" />Voltar à visão geral</button><div className="rounded-xl border border-[#f4cad8] bg-white p-5 shadow-[0_1px_2px_rgba(42,22,56,0.03)] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#c83b70]">Revisar nomes</p><h1 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#2a1638] sm:text-4xl">Este nome está correto?</h1><p className="mt-2 text-sm text-[#746d7b]">{pendingLabel}</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff1f5] text-[#c83b70]"><AlertTriangle className="h-5 w-5" /></span></div><div className="mt-7 rounded-xl border border-[#e8e5eb] bg-[#fff8fa] p-4"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#746d7b]">Cadastro atual</p><p className="mt-2 text-lg font-semibold text-[#2a1638]">{conflict.registeredName}</p><p className="mt-1 text-sm text-[#746d7b]">{conflict.phone}</p><div className="my-4 border-t border-[#f0d9e1]" /><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#746d7b]">Nome informado no pedido</p><p className="mt-2 text-lg font-semibold text-[#c83b70]">{conflict.submittedName}</p><p className="mt-1 text-xs text-[#746d7b]">Ocorrência em {conflict.createdAtLabel}</p></div><button type="button" onClick={() => void onOpenCustomer(conflict.customerId)} className="mt-4 min-h-11 text-sm font-semibold text-[#9e2555] underline underline-offset-4">Ver pedidos relacionados</button><div className="mt-6 grid gap-2"><Button disabled={resolvingId === conflict.id} onClick={() => void onResolve(conflict.id, "rename", conflict.submittedName)} className="min-h-11 bg-[#c83b70] text-white hover:bg-[#ad2e5f]">{resolvingId === conflict.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Usar “{conflict.submittedName}”</Button><Button variant="outline" disabled={resolvingId === conflict.id} onClick={() => void onResolve(conflict.id, "keep")} className="min-h-11 border-[#decbd3] bg-white text-[#5a4652] hover:bg-[#fff1f5]">Manter “{conflict.registeredName}”</Button><Button variant="ghost" disabled={resolvingId === conflict.id} onClick={() => void onResolve(conflict.id, "shared")} className="min-h-11 text-[#7b6070] hover:bg-[#fcecf1]">Telefone compartilhado</Button></div><div className="mt-6 flex items-center justify-between border-t border-[#eeeaf0] pt-4"><Button variant="ghost" size="sm" disabled={index === 0} onClick={onPrevious} className="min-h-10 gap-1 text-[#746d7b]"><ChevronLeft className="h-4 w-4" />Anterior</Button><Button variant="ghost" size="sm" disabled={index >= visibleTotal - 1} onClick={onNext} className="min-h-10 gap-1 text-[#746d7b]">Próxima<ChevronRight className="h-4 w-4" /></Button></div></div></section>
}
