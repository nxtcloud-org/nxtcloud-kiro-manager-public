"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Activity,
  Users,
  GraduationCap,
  UsersRound,
  Building2,
  DatabaseZap,
  Shield,
  BookOpen,
  type LucideIcon,
  FileBarChart,
} from "lucide-react";

interface NavItem { href: string; label: string; icon: LucideIcon; adminOnly?: boolean; section?: string }

const navItems: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/weekly-insight", label: "주간 인사이트", icon: FileBarChart },
  { href: "/usage", label: "사용량 분석", icon: Activity },
  { href: "/users", label: "사용자", icon: Users },
  { href: "/groups", label: "그룹", icon: GraduationCap },
  { href: "/teams", label: "팀", icon: UsersRound },
  // 관리 섹션
  { href: "/organizations", label: "조직 관리", icon: Building2, adminOnly: true, section: "관리" },
  { href: "/admin/groups", label: "그룹 관리", icon: BookOpen, adminOnly: true },
  { href: "/admin/accounts", label: "계정 · 권한", icon: Shield, adminOnly: true },
  { href: "/collection", label: "수집 상태", icon: DatabaseZap, adminOnly: true },
];

export function SidebarNav({ onNavigate, role }: { onNavigate?: () => void; role?: string }) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";
  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  let lastSection: string | undefined;

  return (
    <nav className="space-y-1 p-2">
      {items.map((item) => {
        const showSection = item.section && item.section !== lastSection;
        if (item.section) lastSection = item.section;
        return (
          <div key={item.href}>
            {showSection && (
              <div className="mt-4 mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {item.section}
              </div>
            )}
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role }: { role?: string }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <img src="/nxtcloud-logo.png" alt="NxtCloud" width={28} height={28} />
        <Link href="/dashboard" className="text-base font-semibold">
          KIRO Manager
        </Link>
      </div>
      <SidebarNav role={role} />
    </aside>
  );
}
