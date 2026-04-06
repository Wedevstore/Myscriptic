"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ChevronLeft, Percent, Save, Info, CheckCircle2, ShoppingBag, Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { taxStore, seedStore, type TaxConfig } from "@/lib/store"

// ── helpers ───────────────────────────────────────────────────────────────────

function useTaxConfigs() {
  const [configs, setConfigs] = React.useState<TaxConfig[]>([])
  const reload = React.useCallback(() => {
    seedStore()
    setConfigs(taxStore.getAll())
  }, [])
  React.useEffect(() => { reload() }, [reload])
  return { configs, reload }
}

// ── sub-components ─────────────────────────────────────────────────────────────

function TaxRow({
  config,
  onUpdate,
}: {
  config: TaxConfig
  onUpdate: (id: string, patch: Partial<TaxConfig>) => void
}) {
  const [rate, setRate] = React.useState(String((config.rate * 100).toFixed(2)))
  const [dirty, setDirty] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  const handleRateChange = (v: string) => {
    setRate(v)
    setDirty(true)
    setSaved(false)
  }

  const handleSave = () => {
    const parsed = parseFloat(rate)
    if (isNaN(parsed) || parsed < 0 || parsed > 100) return
    onUpdate(config.id, { rate: parsed / 100 })
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const exampleOrder  = 50
  const taxAmount     = config.isEnabled ? exampleOrder * config.rate : 0
  const withTax       = exampleOrder + taxAmount

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            config.isEnabled ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
          )}>
            <Percent size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-foreground">{config.name}</h3>
              <Badge className={cn(
                "text-[10px] border-0",
                config.isEnabled
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}>
                {config.isEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Applies to: <span className="font-medium text-foreground capitalize">{config.appliesTo === "all" ? "all purchases" : "paid books only"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor={`toggle-${config.id}`} className="text-sm text-muted-foreground cursor-pointer">
            {config.isEnabled ? "On" : "Off"}
          </Label>
          <Switch
            id={`toggle-${config.id}`}
            checked={config.isEnabled}
            onCheckedChange={v => onUpdate(config.id, { isEnabled: v })}
          />
        </div>
      </div>

      <Separator className="mb-5" />

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Rate input */}
        <div>
          <Label htmlFor={`rate-${config.id}`} className="text-sm font-semibold">
            Tax Rate (%)
          </Label>
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <Input
                id={`rate-${config.id}`}
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={rate}
                onChange={e => handleRateChange(e.target.value)}
                className={cn("pr-8", dirty && "border-brand focus-visible:ring-brand")}
              />
              <Percent size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <Button
              onClick={handleSave}
              disabled={!dirty}
              className={cn(
                "shrink-0 gap-1.5 transition-all",
                saved
                  ? "bg-green-500 text-white hover:bg-green-500"
                  : "bg-brand hover:bg-brand-dark text-primary-foreground"
              )}
            >
              {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Enter a value between 0 and 100.
          </p>
        </div>

        {/* Live preview */}
        <div className="bg-muted/40 rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Live Calculation Preview
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Example order</span>
              <span className="font-medium text-foreground">${exampleOrder.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{config.name} ({(parseFloat(rate) || 0).toFixed(2)}%)</span>
              <span className={cn("font-medium", config.isEnabled ? "text-foreground" : "text-muted-foreground")}>
                {config.isEnabled ? `+$${(exampleOrder * (parseFloat(rate) || 0) / 100).toFixed(2)}` : "Disabled"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span className="text-foreground">Total charged</span>
              <span className="text-brand">
                ${config.isEnabled
                  ? (exampleOrder + exampleOrder * (parseFloat(rate) || 0) / 100).toFixed(2)
                  : exampleOrder.toFixed(2)
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Applies-to toggle */}
      <div className="mt-5 flex flex-wrap gap-3">
        {(["all", "paid"] as const).map(scope => (
          <button
            key={scope}
            onClick={() => onUpdate(config.id, { appliesTo: scope })}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm transition-all",
              config.appliesTo === scope
                ? "border-brand bg-brand/5 text-brand font-semibold"
                : "border-border text-muted-foreground hover:border-brand/30"
            )}
          >
            {scope === "all" ? <Globe size={14} /> : <ShoppingBag size={14} />}
            {scope === "all" ? "All purchases" : "Paid books only"}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

function TaxContent() {
  const { configs, reload } = useTaxConfigs()

  const handleUpdate = (id: string, patch: Partial<TaxConfig>) => {
    taxStore.update(id, patch)
    reload()
  }

  const activeCount = configs.filter(c => c.isEnabled).length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/admin">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ChevronLeft size={15} /> Admin
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-serif text-2xl font-bold text-foreground">Tax Configuration</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Configure VAT, GST, and other tax rates applied at checkout.
        <span className="text-brand font-medium"> {activeCount} of {configs.length} enabled.</span>
      </p>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-brand/5 border border-brand/20 rounded-xl mb-8">
        <Info size={15} className="text-brand shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground leading-relaxed">
          Only <strong className="text-foreground">one tax rule</strong> is applied per order at checkout — the first enabled rule in the list.
          Tax is calculated on <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">(subtotal - discount) * rate</code> and
          shown transparently to the customer before payment.
        </div>
      </div>

      {/* Tax rule cards */}
      <div className="space-y-5">
        {configs.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <Percent size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold text-foreground">No tax configurations found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Seed the store to load the default VAT and GST settings.
            </p>
          </div>
        ) : (
          configs.map(config => (
            <TaxRow key={config.id} config={config} onUpdate={handleUpdate} />
          ))
        )}
      </div>

      {/* Active formula summary */}
      {activeCount > 0 && (
        <div className="mt-8 bg-card border border-border rounded-2xl p-6">
          <h2 className="font-serif font-bold text-foreground mb-4">Applied Formula (active rules)</h2>
          <div className="bg-muted rounded-xl p-4 font-mono text-sm space-y-1">
            {configs.filter(c => c.isEnabled).map(c => (
              <p key={c.id} className="text-foreground">
                <span className="text-brand">{c.name}</span>{" "}
                = (subtotal - discount) &times; <span className="text-brand">{(c.rate * 100).toFixed(2)}%</span>
                <span className="text-muted-foreground ml-2">// applies to {c.appliesTo === "all" ? "all purchases" : "paid books"}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminTaxPage() {
  return <TaxContent />
}
