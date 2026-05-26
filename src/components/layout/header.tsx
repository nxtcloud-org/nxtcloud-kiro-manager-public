"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Menu } from "lucide-react";
import { ChangePasswordDialog } from "./change-password-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarNav } from "./sidebar";

interface HeaderProps {
  user: {
    displayName: string;
    role: string;
    username: string;
  };
}

export function Header({ user, role }: HeaderProps & { role?: string }) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = user.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      {/* 모바일: 햄버거 + 타이틀 */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-accent">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b px-4 py-4">
              <SheetTitle className="flex items-center gap-2 text-left text-lg">
                <img src="/nxtcloud-logo.png" alt="NxtCloud" width={24} height={24} />
                KIRO Manager
              </SheetTitle>
            </SheetHeader>
            <SidebarNav onNavigate={() => setSheetOpen(false)} role={role} />
          </SheetContent>
        </Sheet>
        <img src="/nxtcloud-logo.png" alt="NxtCloud" width={24} height={24} />
        <span className="text-lg font-semibold">KIRO Manager</span>
      </div>

      <div className="flex-1" />

      {/* 유저 메뉴 */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent outline-none cursor-pointer">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user.displayName}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {user.role} · {user.username}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPwOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            비밀번호 변경
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </header>
  );
}
