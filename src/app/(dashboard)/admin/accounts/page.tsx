"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { Plus, Trash2, Shield, Pencil, X } from "lucide-react";
import { useState, useMemo } from "react";

interface AccountItem {
  id: string;
  username: string;
  role: string;
  displayName: string;
  groups: string[];
  organizationId: string | null;
}

interface PolicyItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { accountPolicies: number };
}

interface GroupItem {
  id: string;
  code: string;
  name: string;
  organization: { name: string; code: string };
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  SALES: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  SCHOOL: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  DEMO: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const ROLES = ["ADMIN", "SALES", "SCHOOL", "DEMO"] as const;

interface GroupPickerProps {
  groups: GroupItem[] | undefined;
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

function GroupPicker({ groups, selected, onChange, disabled }: GroupPickerProps) {
  const groupByCode = useMemo(() => {
    const map = new Map<string, GroupItem>();
    groups?.forEach((g) => map.set(g.code, g));
    return map;
  }, [groups]);

  const available = useMemo(() => {
    if (!groups) return [];
    return groups.filter((g) => !selected.includes(g.code));
  }, [groups, selected]);

  function add(code: string) {
    if (!code || selected.includes(code)) return;
    onChange([...selected, code]);
  }
  function remove(code: string) {
    onChange(selected.filter((c) => c !== code));
  }

  return (
    <div className={`space-y-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex flex-wrap gap-1.5 min-h-8 rounded-md border bg-muted/30 px-2 py-1.5">
        {selected.length === 0 ? (
          <span className="text-xs text-muted-foreground self-center">선택된 그룹이 없습니다</span>
        ) : (
          selected.map((code) => {
            const group = groupByCode.get(code);
            return (
              <Badge key={code} variant="secondary" className="gap-1 pr-1">
                <span>{code}</span>
                {group && <span className="text-muted-foreground text-[10px]">· {group.name}</span>}
                <button
                  type="button"
                  onClick={() => remove(code)}
                  className="ml-0.5 rounded-sm hover:bg-background/50 p-0.5"
                  aria-label={`${code} 제거`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })
        )}
      </div>
      <Select value="" onValueChange={(v) => v && add(v)} disabled={disabled || available.length === 0}>
        <SelectTrigger>
          <SelectValue placeholder={available.length === 0 ? "추가 가능한 그룹이 없습니다" : "그룹 추가..."} />
        </SelectTrigger>
        <SelectContent>
          {available.map((g) => (
            <SelectItem key={g.id} value={g.code}>
              <span className="font-mono text-xs">{g.code}</span>
              <span className="text-muted-foreground ml-2">{g.name} · {g.organization.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface AccountFormState {
  displayName: string;
  role: string;
  groups: string[];
}

export default function AdminAccountsPage() {
  const { data: accounts, isLoading, mutate } = useApi<AccountItem[]>("/api/accounts");
  const { data: policies } = useApi<PolicyItem[]>("/api/policies");
  const { data: groups } = useApi<GroupItem[]>("/api/admin/groups");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ username: string; password: string } & AccountFormState>({
    username: "",
    password: "",
    displayName: "",
    role: "SCHOOL",
    groups: [],
  });
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [accountPolicies, setAccountPolicies] = useState<PolicyItem[]>([]);
  const [editing, setEditing] = useState<AccountItem | null>(null);
  const [editForm, setEditForm] = useState<AccountFormState>({ displayName: "", role: "SCHOOL", groups: [] });

  const groupsDisabled = (role: string) => role === "ADMIN";

  function openEdit(account: AccountItem) {
    setEditing(account);
    setEditForm({
      displayName: account.displayName,
      role: account.role,
      groups: [...account.groups],
    });
  }

  async function handleUpdate() {
    if (!editing) return;
    const body = {
      displayName: editForm.displayName,
      role: editForm.role,
      groups: groupsDisabled(editForm.role) ? [] : editForm.groups,
    };
    const res = await fetch(`/api/accounts/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditing(null);
      mutate();
    }
  }

  async function handleCreate() {
    const body = {
      username: form.username,
      password: form.password,
      displayName: form.displayName,
      role: form.role,
      groups: groupsDisabled(form.role) ? [] : form.groups,
    };
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setCreating(false);
      setForm({ username: "", password: "", displayName: "", role: "SCHOOL", groups: [] });
      mutate();
    }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`"${username}" 계정을 삭제하시겠습니까?`)) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    mutate();
  }

  async function loadAccountPolicies(accountId: string) {
    setSelectedAccount(accountId);
    const res = await fetch(`/api/accounts/${accountId}/policies`);
    if (res.ok) setAccountPolicies(await res.json());
  }

  async function attachPolicy(policyId: string) {
    if (!selectedAccount) return;
    await fetch(`/api/accounts/${selectedAccount}/policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyId }),
    });
    loadAccountPolicies(selectedAccount);
  }

  async function detachPolicy(policyId: string) {
    if (!selectedAccount) return;
    await fetch(`/api/accounts/${selectedAccount}/policies?policyId=${policyId}`, { method: "DELETE" });
    loadAccountPolicies(selectedAccount);
  }

  const groupHelperText = (role: string) =>
    groupsDisabled(role)
      ? "ADMIN 역할은 모든 그룹에 자동 접근합니다. 그룹 선택은 비활성화됩니다."
      : "선택한 그룹에 한해 접근이 허용됩니다 (SALES/SCHOOL/DEMO).";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">계정 · 권한</h1>
          <p className="text-muted-foreground">대시보드 관리자 계정 및 IAM 정책 관리</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer">
            <Plus className="h-4 w-4" />계정 생성
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>새 계정 생성</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input type="email" placeholder="name@example.com" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>비밀번호</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>이름</Label>
                <Input placeholder="홍길동" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>역할</Label>
                <Select value={form.role} onValueChange={(v) => v && setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>접근 그룹</Label>
                <GroupPicker
                  groups={groups}
                  selected={form.groups}
                  onChange={(next) => setForm({ ...form, groups: next })}
                  disabled={groupsDisabled(form.role)}
                />
                <p className="text-[11px] text-muted-foreground">{groupHelperText(form.role)}</p>
              </div>
              <Button onClick={handleCreate} disabled={!form.username || !form.password || !form.displayName} className="w-full">생성</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 계정 목록 */}
        <Card>
          <CardHeader><CardTitle className="text-base">계정 목록</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)
            ) : accounts?.map((account) => (
              <div
                key={account.id}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${selectedAccount === account.id ? "border-primary bg-accent/50" : "hover:bg-accent/30"}`}
                onClick={() => loadAccountPolicies(account.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{account.displayName}</p>
                  <p className="text-xs text-muted-foreground">{account.username}</p>
                  {account.role === "ADMIN" ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">전체 그룹 접근</p>
                  ) : account.groups.length > 0 ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">그룹: {account.groups.join(", ")}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-0.5">그룹 미지정</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={ROLE_COLORS[account.role]}>{account.role}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(account); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDelete(account.id, account.username); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 정책 관리 */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />정책 배정</CardTitle></CardHeader>
          <CardContent>
            {!selectedAccount ? (
              <p className="text-sm text-muted-foreground py-8 text-center">왼쪽에서 계정을 선택하세요</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">부착된 정책</p>
                  {accountPolicies.length === 0 ? (
                    <p className="text-xs text-muted-foreground">부착된 정책이 없습니다</p>
                  ) : (
                    <div className="space-y-1.5">
                      {accountPolicies.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded border px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {p.isSystem && <Badge variant="outline" className="text-[10px]">시스템</Badge>}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => detachPolicy(p.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">사용 가능한 정책</p>
                  <div className="space-y-1.5">
                    {policies?.filter((p) => !accountPolicies.some((ap) => ap.id === p.id)).map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded border px-3 py-2">
                        <div>
                          <p className="text-sm">{p.name}</p>
                          {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => attachPolicy(p.id)}>부착</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>계정 수정 — {editing?.username}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>이름</Label>
              <Input value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>역할</Label>
              <Select value={editForm.role} onValueChange={(v) => v && setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>접근 그룹</Label>
              <GroupPicker
                groups={groups}
                selected={editForm.groups}
                onChange={(next) => setEditForm({ ...editForm, groups: next })}
                disabled={groupsDisabled(editForm.role)}
              />
              <p className="text-[11px] text-muted-foreground">{groupHelperText(editForm.role)}</p>
            </div>
            <Button onClick={handleUpdate} disabled={!editForm.displayName} className="w-full">저장</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
