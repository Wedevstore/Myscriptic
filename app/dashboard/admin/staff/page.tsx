"use client"

import * as React from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  STAFF_PERMISSIONS, ALL_PERMISSIONS, getPermissionGroups,
  loadStaffMembers, saveStaffMembers,
  type StaffMember, type StaffPermission,
} from "@/lib/staff-permissions"
import { cn } from "@/lib/utils"
import {
  Plus, Search, Shield, ShieldCheck, Trash2,
  Pencil, ToggleLeft, ToggleRight, CheckCircle, Users,
  ChevronDown, ChevronRight, Loader2,
} from "lucide-react"

function PermissionToggle({
  permission,
  checked,
  onChange,
}: {
  permission: StaffPermission
  checked: boolean
  onChange: (p: StaffPermission, v: boolean) => void
}) {
  const meta = STAFF_PERMISSIONS[permission]
  return (
    <button
      type="button"
      onClick={() => onChange(permission, !checked)}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all w-full",
        checked
          ? "border-brand/40 bg-brand/5"
          : "border-border hover:border-brand/20"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors",
        checked ? "bg-brand text-white" : "bg-muted"
      )}>
        {checked && <CheckCircle size={12} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{meta.label}</p>
        <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
      </div>
    </button>
  )
}

function StaffDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: StaffMember | null
  onSave: (member: StaffMember) => void
}) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [perms, setPerms] = React.useState<Set<StaffPermission>>(new Set())
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setEmail(initial?.email ?? "")
      setPerms(new Set(initial?.permissions ?? []))
    }
  }, [open, initial])

  function togglePerm(p: StaffPermission, v: boolean) {
    setPerms(prev => {
      const next = new Set(prev)
      v ? next.add(p) : next.delete(p)
      return next
    })
  }

  function toggleGroup(groupPerms: StaffPermission[], allChecked: boolean) {
    setPerms(prev => {
      const next = new Set(prev)
      for (const p of groupPerms) {
        allChecked ? next.delete(p) : next.add(p)
      }
      return next
    })
  }

  function selectAll() { setPerms(new Set(ALL_PERMISSIONS)) }
  function clearAll() { setPerms(new Set()) }

  async function handleSave() {
    if (!name.trim() || !email.trim()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    onSave({
      id: initial?.id ?? `staff_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      permissions: Array.from(perms),
      active: initial?.active ?? true,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    setSaving(false)
    onOpenChange(false)
  }

  const groups = getPermissionGroups()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Update this staff member's details and permissions."
              : "Add a new staff member and assign their permissions. They will only see the sections you enable."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="staff-name" className="text-sm font-medium">Full Name</label>
              <Input id="staff-name" value={name} onChange={e => setName(e.target.value)} placeholder="Staff member name" required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="staff-email" className="text-sm font-medium">Email Address</label>
              <Input id="staff-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@myscriptic.com" required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Permissions</p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
                  Select All
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={clearAll}>
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {groups.map(({ group, permissions: groupPerms }) => {
                const allChecked = groupPerms.every(p => perms.has(p))
                const someChecked = groupPerms.some(p => perms.has(p))
                return (
                  <div key={group} className="border border-border rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupPerms, allChecked)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center",
                        allChecked ? "bg-brand border-brand text-white" : someChecked ? "bg-brand/30 border-brand/50" : "border-border"
                      )}>
                        {allChecked && <CheckCircle size={10} />}
                        {someChecked && !allChecked && <div className="w-2 h-2 bg-brand rounded-sm" />}
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {groupPerms.filter(p => perms.has(p)).length}/{groupPerms.length}
                      </span>
                    </button>
                    <div className="grid sm:grid-cols-2 gap-2 p-3">
                      {groupPerms.map(p => (
                        <PermissionToggle key={p} permission={p} checked={perms.has(p)} onChange={togglePerm} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            className="bg-brand text-primary-foreground hover:bg-brand-dark"
            disabled={saving || !name.trim() || !email.trim() || perms.size === 0}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? "Save Changes" : "Add Staff Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function StaffPage() {
  const { user } = useAuth()
  const [members, setMembers] = React.useState<StaffMember[]>([])
  const [search, setSearch] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<StaffMember | null>(null)

  React.useEffect(() => {
    setMembers(loadStaffMembers())
  }, [])

  function persist(next: StaffMember[]) {
    setMembers(next)
    saveStaffMembers(next)
  }

  function handleSave(member: StaffMember) {
    const exists = members.find(m => m.id === member.id)
    if (exists) {
      persist(members.map(m => m.id === member.id ? member : m))
    } else {
      persist([...members, member])
    }
  }

  function handleToggleActive(id: string) {
    persist(members.map(m => m.id === id ? { ...m, active: !m.active } : m))
  }

  function handleDelete(id: string) {
    if (!window.confirm("Remove this staff member? They will lose access immediately.")) return
    persist(members.filter(m => m.id !== id))
  }

  const isAdmin = user?.role === "admin"
  const filtered = members.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add team members and control which dashboard sections they can access.
          </p>
        </div>
        {isAdmin && (
          <Button
            className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2"
            onClick={() => { setEditing(null); setDialogOpen(true) }}
          >
            <Plus size={16} />
            Add Staff
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Staff", value: members.length, icon: Users },
          { label: "Active", value: members.filter(m => m.active).length, icon: ShieldCheck },
          { label: "Inactive", value: members.filter(m => !m.active).length, icon: Shield },
          { label: "Avg Permissions", value: members.length > 0 ? Math.round(members.reduce((a, m) => a + m.permissions.length, 0) / members.length) : 0, icon: Shield },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <s.icon size={14} className="text-muted-foreground" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search staff members..."
          className="pl-9"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">{members.length === 0 ? "No staff members yet" : "No results"}</p>
          <p className="text-sm mt-1">
            {members.length === 0
              ? "Add your first staff member to delegate dashboard access."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Permissions</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(member => (
                <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-brand">
                          {member.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground sm:hidden truncate">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{member.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {member.permissions.length === ALL_PERMISSIONS.length ? (
                        <Badge className="bg-brand/10 text-brand border-brand/20 text-[10px]">All Access</Badge>
                      ) : (
                        <>
                          {member.permissions.slice(0, 3).map(p => (
                            <Badge key={p} variant="secondary" className="text-[10px]">
                              {STAFF_PERMISSIONS[p].label}
                            </Badge>
                          ))}
                          {member.permissions.length > 3 && (
                            <Badge variant="secondary" className="text-[10px]">+{member.permissions.length - 3}</Badge>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "text-[10px]",
                        member.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {member.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => { setEditing(member); setDialogOpen(true) }}
                          aria-label={`Edit ${member.name}`}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleToggleActive(member.id)}
                          aria-label={member.active ? `Deactivate ${member.name}` : `Activate ${member.name}`}
                        >
                          {member.active ? <ToggleRight size={15} className="text-green-600" /> : <ToggleLeft size={15} className="text-muted-foreground" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(member.id)}
                          aria-label={`Remove ${member.name}`}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StaffDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSave={handleSave} />
    </div>
  )
}
