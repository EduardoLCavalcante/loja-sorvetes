"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { Loader2, MapPinned, Pencil, Plus, Power, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { parsePrice } from "@/lib/utils/pricing"
import type { AdminDeliveryZone } from "@/types/delivery-zone"

type DeliveryZoneDraft = {
  id?: number
  name: string
  fee: string
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

function emptyDraft(): DeliveryZoneDraft {
  return { name: "", fee: "" }
}

export default function AdminDeliveryZones({ accessToken, onAuthError }: { accessToken: string; onAuthError: () => void }) {
  const [deliveryZones, setDeliveryZones] = useState<AdminDeliveryZone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [draft, setDraft] = useState<DeliveryZoneDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const handleResponse = useCallback((response: Response) => {
    if (response.status === 401) {
      onAuthError()
      return true
    }
    return false
  }, [onAuthError])

  const loadDeliveryZones = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/delivery-zones", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const payload = await response.json().catch(() => ({}))
      if (handleResponse(response)) return
      if (!response.ok) throw new Error(payload?.error || "Não foi possível carregar os bairros de entrega.")
      setDeliveryZones(Array.isArray(payload?.deliveryZones) ? payload.deliveryZones : [])
    } catch (requestError: any) {
      setError(requestError?.message || "Não foi possível carregar os bairros de entrega.")
    } finally {
      setLoading(false)
    }
  }, [accessToken, handleResponse])

  useEffect(() => { void loadDeliveryZones() }, [loadDeliveryZones])

  const saveDeliveryZone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft) return

    const fee = parsePrice(draft.fee)
    if (!draft.name.trim() || fee === null || fee < 0) {
      setError("Informe um bairro e uma taxa válida.")
      return
    }

    try {
      setSaving(true)
      setError(null)
      setNotice(null)
      const isEditing = Boolean(draft.id)
      const response = await fetch("/api/admin/delivery-zones", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(isEditing ? { id: draft.id, name: draft.name, fee } : { name: draft.name, fee }),
      })
      const payload = await response.json().catch(() => ({}))
      if (handleResponse(response)) return
      if (!response.ok) throw new Error(payload?.error || "Não foi possível salvar o bairro.")

      const saved = payload?.deliveryZone as AdminDeliveryZone
      setDeliveryZones((current) => {
        const next = isEditing ? current.map((zone) => zone.id === saved.id ? saved : zone) : [...current, saved]
        return next.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      })
      setDraft(null)
      setNotice(isEditing ? "Bairro atualizado com sucesso." : "Bairro cadastrado com sucesso.")
    } catch (requestError: any) {
      setError(requestError?.message || "Não foi possível salvar o bairro.")
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (zone: AdminDeliveryZone) => {
    try {
      setUpdatingId(zone.id)
      setError(null)
      setNotice(null)
      const response = await fetch("/api/admin/delivery-zones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id: zone.id, isActive: !zone.isActive }),
      })
      const payload = await response.json().catch(() => ({}))
      if (handleResponse(response)) return
      if (!response.ok) throw new Error(payload?.error || "Não foi possível atualizar o bairro.")

      const saved = payload?.deliveryZone as AdminDeliveryZone
      setDeliveryZones((current) => current.map((item) => item.id === saved.id ? saved : item))
      setNotice(saved.isActive ? "Bairro reativado para entregas." : "Bairro desativado para novos pedidos.")
    } catch (requestError: any) {
      setError(requestError?.message || "Não foi possível atualizar o bairro.")
    } finally {
      setUpdatingId(null)
    }
  }

  const openEdit = (zone: AdminDeliveryZone) => setDraft({ id: zone.id, name: zone.name, fee: zone.fee.toFixed(2) })

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-[-0.045em] text-[#2a1638] sm:text-4xl">Entregas</h1>
          <p className="mt-2 max-w-xl text-sm text-[#746d7b]">Defina os bairros atendidos e a taxa exibida no checkout.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button type="button" variant="outline" size="icon" onClick={() => void loadDeliveryZones()} disabled={loading} aria-label="Atualizar bairros de entrega" className="border-[#ded9e1] bg-white text-[#4e3b57] hover:bg-[#fff1f5]">
            <RefreshCw className={loading ? "animate-spin" : undefined} />
          </Button>
          <Button type="button" onClick={() => { setError(null); setNotice(null); setDraft(emptyDraft()) }} className="flex-1 bg-[#c83b70] text-white hover:bg-[#a92d5d] sm:flex-none">
            <Plus data-icon="inline-start" />Adicionar bairro
          </Button>
        </div>
      </div>

      {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {notice ? <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p> : null}

      <Card className="mt-6 border-[#e8e5eb] bg-white sm:mt-8">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl text-[#2a1638]">Bairros cadastrados</h2>
              <p className="mt-1 text-sm text-[#746d7b]">Bairros desativados ficam fora da lista de entrega.</p>
            </div>
            <Badge variant="secondary">{deliveryZones.length}</Badge>
          </div>

          {loading ? <div className="grid min-h-48 place-items-center"><Loader2 className="animate-spin text-[#c83b70]" /></div> : null}
          {!loading && deliveryZones.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center"><MapPinned className="text-[#c83b70]" /><p className="text-sm text-[#746d7b]">Nenhum bairro cadastrado.</p></div> : null}

          {!loading && deliveryZones.length > 0 ? <>
            <div className="mt-5 divide-y divide-[#eeeaf0] md:hidden">
              {deliveryZones.map((zone) => <article key={zone.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff1f5] text-[#c83b70]"><MapPinned /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#2a1638]">{zone.name}</p><p className="mt-0.5 text-xs text-[#746d7b]">{currencyFormatter.format(zone.fee)}</p></div>
                <div className="flex shrink-0 items-center gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openEdit(zone)} aria-label={`Editar ${zone.name}`}><Pencil /></Button><Button type="button" variant="ghost" size="icon" onClick={() => void updateStatus(zone)} disabled={updatingId === zone.id} aria-label={`${zone.isActive ? "Desativar" : "Reativar"} ${zone.name}`}><Power className={zone.isActive ? "text-emerald-600" : "text-[#746d7b]"} /></Button></div>
              </article>)}
            </div>
            <Table className="mt-5 hidden md:table"><TableHeader><TableRow><TableHead>Bairro</TableHead><TableHead>Taxa</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{deliveryZones.map((zone) => <TableRow key={zone.id}><TableCell className="font-semibold text-[#2a1638]">{zone.name}</TableCell><TableCell>{currencyFormatter.format(zone.fee)}</TableCell><TableCell><Badge variant={zone.isActive ? "default" : "secondary"}>{zone.isActive ? "Ativo" : "Desativado"}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => openEdit(zone)}><Pencil data-icon="inline-start" />Editar</Button><Button type="button" variant="outline" size="sm" onClick={() => void updateStatus(zone)} disabled={updatingId === zone.id}>{updatingId === zone.id ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Power data-icon="inline-start" />}{zone.isActive ? "Desativar" : "Reativar"}</Button></div></TableCell></TableRow>)}</TableBody></Table>
          </> : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(draft)} onOpenChange={(open) => { if (!open && !saving) setDraft(null) }}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-xl border-[#e8e5eb] bg-white p-5 sm:p-6">
          <DialogHeader className="pr-8 text-left"><DialogTitle className="font-serif text-2xl text-[#2a1638]">{draft?.id ? "Editar bairro" : "Adicionar bairro"}</DialogTitle><DialogDescription>{draft?.id ? "Atualize o nome ou a taxa de entrega." : "O novo bairro ficará disponível para entrega assim que for salvo."}</DialogDescription></DialogHeader>
          <form onSubmit={saveDeliveryZone} className="mt-2 flex flex-col gap-4">
            <div className="flex flex-col gap-2"><Label htmlFor="delivery-zone-name">Bairro</Label><Input id="delivery-zone-name" value={draft?.name || ""} onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)} placeholder="Ex.: Centro" autoFocus disabled={saving} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="delivery-zone-fee">Taxa de entrega</Label><Input id="delivery-zone-fee" value={draft?.fee || ""} onChange={(event) => setDraft((current) => current ? { ...current, fee: event.target.value } : current)} inputMode="decimal" placeholder="Ex.: 4,00" disabled={saving} /></div>
            <div className="mt-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}{draft?.id ? "Salvar alterações" : "Cadastrar bairro"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
