'use client';

import { useMemo, useState } from "react";
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { BRANCH, DEPTS, PLATFORMS, STAFF, feedPosts, jobListings, marketItems, messages, seedVisitors } from "@/data/demoData";
import { demoIconMap, type DemoIconName } from "./demoIcons";
import "./demoStyles.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Screen = "landing" | "login" | "reg" | "security" | "admin" | "coo" | "platform";
type Role = "security" | "admin" | "coo" | "platform";
type VisitorStatus = "Pending" | "Approved" | "In" | "Out" | "Rejected";

type Visitor = (typeof seedVisitors)[number] & { status: VisitorStatus };

const NavIcon = ({ name, className }: { name: DemoIconName; className?: string }) => {
  const Icon = demoIconMap[name];
  return <Icon className={cn("h-4 w-4", className)} />;
};

function Landing({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="demo-flow-root">
      <div className="demo-hero flex min-h-screen flex-col items-center justify-center px-6">
        <h1 className="text-5xl font-extrabold tracking-tight">conn<span className="text-teal-300">inter</span></h1>
        <p className="mt-2 text-white/70">Where Healthcare Connects and Collaborates</p>
        <Card className="demo-card mt-10 w-full max-w-md rounded-2xl bg-white/90 backdrop-blur">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-slate-500">Selected branch</p>
            <h2 className="mt-1 text-lg font-bold text-[#001B71]">{BRANCH.name}</h2>
            <p className="mt-2 text-sm text-slate-500">{BRANCH.address}</p>
            <div className="mt-6 space-y-2">
              <Button className="w-full" variant="brand" onClick={() => go("reg")}>Start Registration</Button>
              <Button className="w-full" variant="outline" onClick={() => go("login")}>Security / Admin Login</Button>
              <Button className="w-full" variant="ghost" asChild>
                <Link href="/">Back to Marketing Site</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Login({ go }: { go: (s: Screen) => void }) {
  const roles: { id: Role; title: string; desc: string }[] = [
    { id: "security", title: "Security Dashboard", desc: "Check-ins, approvals, gate-pass flow" },
    { id: "admin", title: "Branch Admin", desc: "Branch analytics, staff, settings" },
    { id: "coo", title: "COO Dashboard", desc: "Multi-branch executive overview" },
    { id: "platform", title: "Conninter Platform", desc: "Feed, network, marketplace, jobs" },
  ];
  const [phone, setPhone] = useState("9883578111");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  return (
    <div className="demo-flow-root">
      <div className="mx-auto max-w-2xl p-6">
        <Button variant="ghost" onClick={() => go("landing")} className="mb-4"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Card className="demo-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Dashboard Login (Mock)</CardTitle>
            <p className="text-sm text-muted-foreground">UI-only flow. Test OTP: <strong>123456</strong>.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
              <div className="grid gap-2 md:grid-cols-2">
                {roles.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      selectedRole === r.id ? "border-[#001B71] bg-[#001B71]/5" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-xs text-slate-500">{r.desc}</p>
                  </button>
                ))}
              </div>
              <Button variant="brand" className="w-full" disabled={!selectedRole} onClick={() => selectedRole && go(selectedRole)}>
                Enter Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Registration({ go }: { go: (s: Screen) => void }) {
  const [purpose, setPurpose] = useState<"meeting" | "delivery">("meeting");
  const [approved, setApproved] = useState(false);
  return (
    <div className="demo-flow-root">
      <div className="mx-auto max-w-xl p-6">
        <Button variant="ghost" onClick={() => go("landing")} className="mb-4"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Card className="demo-card rounded-2xl">
          <CardHeader>
            <CardTitle>Visitor Registration (Mock)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={purpose === "meeting" ? "brand" : "outline"} onClick={() => setPurpose("meeting")}>Meeting</Button>
              <Button variant={purpose === "delivery" ? "brand" : "outline"} onClick={() => setPurpose("delivery")}>Delivery</Button>
            </div>
            <Input placeholder="Full name" defaultValue="Rahul Mehta" />
            <Input placeholder="Phone" defaultValue="9876543210" />
            {purpose === "meeting" ? (
              <>
                <Input placeholder="Department" defaultValue={DEPTS[0]} />
                <Input placeholder="Host" defaultValue={STAFF[0].name} />
                <Textarea placeholder="Purpose" defaultValue="Cardiac checkup consultation" />
              </>
            ) : (
              <>
                <Input placeholder="Platform" defaultValue={PLATFORMS[0]} />
                <Input placeholder="Recipient" defaultValue="Front Desk" />
              </>
            )}
            {!approved ? (
              <Button className="w-full" variant="brand" onClick={() => setApproved(true)}>Submit & Simulate Approval</Button>
            ) : (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
                <p className="mt-2 font-semibold text-green-700">Approved! Gate pass OTP: 654321</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardShell({
  role,
  nav,
  setNav,
  go,
  children,
}: {
  role: Role;
  nav: string;
  setNav: (n: string) => void;
  go: (s: Screen) => void;
  children: React.ReactNode;
}) {
  const byRole: Record<Role, { id: string; icon: DemoIconName; label: string }[]> = {
    security: [{ id: "checkin", icon: "qr", label: "Check-In" }, { id: "logs", icon: "users", label: "Visitor Logs" }],
    admin: [{ id: "overview", icon: "chart", label: "Dashboard" }, { id: "staff", icon: "users", label: "Staff & Hosts" }],
    coo: [{ id: "overview", icon: "chart", label: "Executive Overview" }, { id: "branches", icon: "building", label: "Branches" }],
    platform: [{ id: "feed", icon: "home", label: "Feed" }, { id: "marketplace", icon: "store", label: "Marketplace" }, { id: "messages", icon: "chat", label: "Messages" }],
  };
  return (
    <div className="demo-flow-root demo-shell">
      <aside className="demo-sidebar p-4">
        <h2 className="px-2 text-2xl font-extrabold">conn<span className="text-teal-300">inter</span></h2>
        <div className="mt-6 space-y-1">
          {byRole[role].map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setNav(item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                nav === item.id ? "bg-white/10 text-teal-200" : "text-white/70 hover:bg-white/10",
              )}
            >
              <NavIcon name={item.icon} /> {item.label}
            </button>
          ))}
        </div>
        <Button className="mt-6 w-full" variant="outline" onClick={() => go("landing")}>Exit Demo</Button>
      </aside>
      <main className="demo-main">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-6 py-3">
          <h1 className="text-lg font-bold capitalize">{role} Dashboard</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
              <NavIcon name="search" className="text-slate-400" />
              <span className="text-slate-400">Search...</span>
            </div>
            <button className="rounded-full border p-2"><NavIcon name="bell" className="text-slate-600" /></button>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

function SecurityDashboard({ go }: { go: (s: Screen) => void }) {
  const [nav, setNav] = useState("checkin");
  const [statusFilter, setStatusFilter] = useState<VisitorStatus | "All">("All");
  const [visitors, setVisitors] = useState<Visitor[]>(seedVisitors as Visitor[]);
  const shown = useMemo(() => (statusFilter === "All" ? visitors : visitors.filter((v) => v.status === statusFilter)), [statusFilter, visitors]);
  return (
    <DashboardShell role="security" nav={nav} setNav={setNav} go={go}>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["All", "Pending", "Approved", "In", "Out"] as const).map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "brand" : "outline"} onClick={() => setStatusFilter(s)}>{s}</Button>
        ))}
      </div>
      <div className="space-y-3">
        {shown.map((v) => (
          <Card key={v.id} className="demo-card">
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="h-9 w-9 rounded-full bg-[#001B71]/10 text-[#001B71] grid place-content-center font-bold">{v.ini}</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{v.fn} {v.ln}</p>
                <p className="text-xs text-muted-foreground">{v.type === "Meeting" ? `${v.host} · ${v.dept}` : `${v.platform} · ${v.recipient}`}</p>
              </div>
              <Badge variant="outline">{v.status}</Badge>
              {v.status === "Pending" && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => setVisitors((prev) => prev.map((x) => (x.id === v.id ? { ...x, status: "Approved" } : x)))}>Approve</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}

function AdminDashboard({ go }: { go: (s: Screen) => void }) {
  const [nav, setNav] = useState("overview");
  return (
    <DashboardShell role="admin" nav={nav} setNav={setNav} go={go}>
      <div className="grid gap-4 md:grid-cols-4">
        {["Total Visitors 1247", "Meetings 672", "Deliveries 575", "Avg Check-In 3.2m"].map((x) => (
          <Card key={x} className="demo-card"><CardContent className="pt-5 font-semibold">{x}</CardContent></Card>
        ))}
      </div>
      <Card className="demo-card mt-4">
        <CardHeader><CardTitle>Hospital Staff</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {STAFF.map((s) => <div key={s.name} className="rounded-lg border p-3 text-sm">{s.name} — {s.dept} (Room {s.room})</div>)}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

function CooDashboard({ go }: { go: (s: Screen) => void }) {
  const [nav, setNav] = useState("overview");
  return (
    <DashboardShell role="coo" nav={nav} setNav={setNav} go={go}>
      <Card className="demo-card">
        <CardHeader><CardTitle>Executive Snapshot</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-4">Total Visitors (All Branches): <strong>6,058</strong></div>
          <div className="rounded-lg border p-4">Active Branches: <strong>5</strong></div>
          <div className="rounded-lg border p-4">Avg Efficiency: <strong>91%</strong></div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

function PlatformDashboard({ go }: { go: (s: Screen) => void }) {
  const [nav, setNav] = useState("feed");
  return (
    <DashboardShell role="platform" nav={nav} setNav={setNav} go={go}>
      {nav === "feed" && (
        <div className="space-y-3">
          {feedPosts.map((p) => (
            <Card key={p.id} className="demo-card">
              <CardContent className="pt-4">
                <p className="font-semibold">{p.author}</p>
                <p className="text-xs text-muted-foreground">{p.role} · {p.time}</p>
                <p className="mt-2 text-sm">{p.content}</p>
                <div className="mt-3 flex items-center gap-3 text-sm text-slate-500">
                  <span>{p.likes} likes</span>
                  <span>{p.comments} comments</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {nav === "marketplace" && (
        <div className="grid gap-3 md:grid-cols-3">
          {marketItems.map((i) => (
            <Card key={i.id} className="demo-card"><CardContent className="pt-4"><p className="font-semibold">{i.name}</p><p className="text-xs text-muted-foreground">{i.vendor}</p><Badge className="mt-2" variant="secondary">{i.cat}</Badge><p className="mt-2 text-sm font-semibold text-[#001B71]">{i.price}</p></CardContent></Card>
          ))}
        </div>
      )}
      {nav === "messages" && (
        <Card className="demo-card">
          <CardHeader><CardTitle>Inbox</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="h-8 w-8 rounded-full bg-[#001B71]/10 grid place-content-center text-xs font-bold text-[#001B71]">{m.ini}</div>
                <div className="flex-1 min-w-0"><p className="font-medium">{m.from}</p><p className="truncate text-xs text-muted-foreground">{m.last}</p></div>
                {m.unread > 0 && <Badge>{m.unread}</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card className="demo-card mt-4">
        <CardHeader><CardTitle>Jobs Snapshot</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {jobListings.map((j) => <div key={j.id} className="rounded-lg border p-3 text-sm"><strong>{j.title}</strong> · {j.org} · {j.loc} · {j.posted}</div>)}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

export default function DemoFlowApp() {
  const [screen, setScreen] = useState<Screen>("landing");
  if (screen === "landing") return <Landing go={setScreen} />;
  if (screen === "login") return <Login go={setScreen} />;
  if (screen === "reg") return <Registration go={setScreen} />;
  if (screen === "security") return <SecurityDashboard go={setScreen} />;
  if (screen === "admin") return <AdminDashboard go={setScreen} />;
  if (screen === "coo") return <CooDashboard go={setScreen} />;
  return <PlatformDashboard go={setScreen} />;
}
