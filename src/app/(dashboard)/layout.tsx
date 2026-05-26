import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, type JWTPayload } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("kiro-token")?.value;

  if (!token) redirect("/login");

  const session = await verifyToken(token);
  if (!session) redirect("/login");

  const user = {
    displayName: session.displayName,
    role: session.role,
    username: session.username,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={session.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} role={session.role} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
