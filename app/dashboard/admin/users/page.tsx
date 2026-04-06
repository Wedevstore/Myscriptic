"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { seedP4, userActivityStore, activityLogStore } from "@/lib/store-p4"
import {
  Search, Shield, UserX, UserCheck, Download, Filter,
  MoreHorizontal, Mail, Eye, Clock, Globe,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ── Mock user data — representative seed data ─────────────────────────────────
const MOCK_USERS = [
  { id: "u01", name: "Chimamanda A.",  email: "chimamanda@example.com", role: "author", status: "active",   plan: "Pro Annual",  joined: "Jan 2024", lastLogin: "2h ago",  books: 12, ip: "197.210.4.2" },
  { id: "u02", name: "Tunde Balogun",  email: "tunde@example.com",      role: "author", status: "active",   plan: "Pro Annual",  joined: "Feb 2024", lastLogin: "5h ago",  books: 8,  ip: "41.203.64.1" },
  { id: "u03", name: "Amara Obi",      email: "amara@example.com",      role: "user",   status: "active",   plan: "Pro Monthly", joined: "Mar 2024", lastLogin: "1d ago",  books: 0,  ip: "105.112.1.4" },
  { id: "u04", name: "Yemi Adeyemi",   email: "yemi@example.com",       role: "user",   status: "blocked",  plan: "—",           joined: "Apr 2024", lastLogin: "14d ago", books: 0,  ip: "105.112.8.9" },
  { id: "u05", name: "Kofi Mensah",    email: "kofi@example.com",       role: "author", status: "active",   plan: "Pro Annual",  joined: "May 2024", lastLogin: "3h ago",  books: 6,  ip: "154.120.4.1" },
  { id: "u06", name: "Fatima Garba",   email: "fatima@example.com",     role: "user",   status: "active",   plan: "Pro Monthly", joined: "Jun 2024", lastLogin: "12h ago", books: 0,  ip: "197.210.1.2" },
  { id: "u07", name: "Seun Williams",  email: "seun@example.com",       role: "author", status: "pending",  plan: "—",           joined: "Jul 2024", lastLogin: "6h ago",  books: 2,  ip: "41.203.4.12" },
  { id: "u08", name: "Bisi Olatunji",  email: "bisi@example.com",       role: "admin",  status: "active",   plan: "—",           joined: "Jan 2024", lastLogin: "1h ago",  books: 0,  ip: "192.168.1.1" },
  { id: "u09", name: "Ngozi Eze",      email: "ngozi@example.com",      role: "user",   status: "active",   plan: "Pro Annual",  joined: "Aug 2024", lastLogin: "30m ago", books: 0,  ip: "197.211.3.8" },
  { id: "u10", name: "Emeka Obi",      email: "emeka@example.com",      role: "user",   status: "inactive", plan: "—",           joined: "Sep 2024", lastLogin: "60d ago", books: 0,  ip: "41.203.12.1" },
]

const ROLE_CLS: Record<string, string> = {
  admin:  "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
  author: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  user:   "bg-muted text-muted-foreground",
}
const STATUS_CLS: Record<string, string> = {
  active:   "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  inactive: "bg-muted text-muted-foreground",
  blocked:  "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  pending:  "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
}

type StatusFilter = "ALL" | "active" | "inactive" | "blocked" | "pending"
type RoleFilter   = "ALL" | "admin" | "author" | "user"

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState(MOCK_USERS)
  const [query,  setQuery]  = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("ALL")
  const [role,   setRole]   = React.useState<RoleFilter>("ALL")

  React.useEffect(() => { seedP4() }, [])

  const filtered = users.filter(u => {
    const q = query.toLowerCase()
    return (
      (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (status === "ALL" || u.status === status) &&
      (role   === "ALL" || u.role   === role)
    )
  })

  function toggleBlock(id: string) {
    setUsers(prev => prev.map(u => {
      if (u.id !== id) return u
      const next = u.status === "blocked" ? "active" : "blocked"
      activityLogStore.log({
        userId: id, userName: u.name,
        action: next === "blocked" ? "Account blocked by admin" : "Account unblocked by admin",
        category: "admin", metadata: {},
      })
      return { ...u, status: next }
    }))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length.toLocaleString()} total registered users</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Download size={12} /> Export CSV
        </Button>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["ALL","active","inactive","blocked","pending"] as StatusFilter[]).map(s => {
          const count = s === "ALL" ? users.length : users.filter(u => u.status === s).length
          return (
            <button key={s} onClick={() => setStatus(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                status === s
                  ? "bg-brand border-brand text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground"
              )}>
              {s === "ALL" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          )
        })}
        <div className="ml-auto flex items-center gap-2">
          {(["ALL","admin","author","user"] as RoleFilter[]).map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                role === r ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
              )}>
              {r === "ALL" ? "All Roles" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or email…" className="pl-8 h-9 text-sm" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["User","Role","Status","Plan","Last Login","IP","Books","Actions"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-brand">{u.name[0]}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-tight">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn("border-0 text-[10px] py-0", ROLE_CLS[u.role])}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn("border-0 text-[10px] py-0", STATUS_CLS[u.status])}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.plan}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock size={10} />{u.lastLogin}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                      <Globe size={10} />{u.ip}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-foreground">{u.books > 0 ? u.books : "—"}</td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal size={13} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem className="text-xs gap-2 cursor-pointer"><Eye size={12} /> View Profile</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 cursor-pointer"><Mail size={12} /> Send Email</DropdownMenuItem>
                        <DropdownMenuItem
                          className={cn("text-xs gap-2 cursor-pointer", u.status === "blocked" ? "text-green-600" : "text-destructive")}
                          onClick={() => toggleBlock(u.id)}
                        >
                          {u.status === "blocked"
                            ? <><UserCheck size={12} /> Unblock</>
                            : <><UserX size={12} /> Block User</>}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-xs text-muted-foreground">No users match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/30 text-[11px] text-muted-foreground">
          Showing {filtered.length} of {users.length} users
        </div>
      </div>
    </div>
  )
}
