import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import {
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  CircleDot,
  Database,
  FileSearch,
  FileText,
  Menu,
  MoreHorizontal,
  MessageSquareText,
  PanelRight,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Workspace = "ask" | "knowledge";
type StreamStatus = "idle" | "routing" | "streaming" | "complete" | "error";
type Stage = { id: string; label: string; state: "running" | "complete" | "skipped" };
type Citation = { id?: string; sourceId: string; startLine: number; endLine: number; excerpt?: string };
type FinalResult = {
  answer: { status: string; answer: string };
  citations: Citation[];
  decision: { publishable: boolean; status: string; reason: string | null };
  run?: { durationMs: number; runtime: string; skipped?: boolean };
};
type UploadItem = { id: string; file: File; progress: number; state: "selected" | "uploading" | "processing" | "pending" | "ready" | "error"; valid: boolean; error?: string; passages?: number };

function getViewerId() {
  const existing = localStorage.getItem("atlas.viewerId");
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem("atlas.viewerId", created);
  return created;
}

const suggestions = [
  "How do I report a phishing message?",
  "What can I expense for my home office?",
  "How does time off work?",
  "Can I take on a side gig?",
];

function parseEventBlock(block: string) {
  let event = "message";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  return { event, data: data ? JSON.parse(data) as unknown : null };
}

function AppLogo() {
  return <div className="flex items-center gap-3">
    <div className="grid size-9 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm">A</div>
    <div><div className="text-[15px] font-semibold leading-tight">Atlas</div><div className="text-[10px] font-medium uppercase tracking-[.18em] text-muted-foreground">Knowledge agency</div></div>
  </div>;
}

type SidebarProps = {
  view: Workspace; setView: (view: Workspace) => void; activeWorkspace?: Doc<"workspaces">; workspaces: Doc<"workspaces">[]; conversations: Doc<"conversations">[];
  selectedConversationId: Id<"conversations"> | null; onSelectWorkspace: (id: Id<"workspaces">) => void; onCreateWorkspace: (name: string) => Promise<void>;
  onNewConversation: () => Promise<void>; onSelectConversation: (id: Id<"conversations">) => void; onDeleteConversation: (id: Id<"conversations">) => Promise<void>;
};

function Sidebar(props: SidebarProps) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  return <aside className="hidden h-dvh w-[280px] shrink-0 flex-col border-r bg-sidebar/95 lg:flex">
    <div className="flex h-16 items-center px-5"><AppLogo /></div>
    <div className="px-3"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-auto w-full justify-between bg-background px-3 py-2 text-left"><span className="min-w-0"><span className="block truncate text-sm font-medium">{props.activeWorkspace?.name ?? "Loading workspace…"}</span><span className="block text-[11px] font-normal text-muted-foreground">Knowledge workspace</span></span><ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" /></Button></DropdownMenuTrigger><DropdownMenuContent className="w-[252px]" align="start"><DropdownMenuLabel>Workspaces</DropdownMenuLabel>{props.workspaces.map((item) => <DropdownMenuItem key={item._id} onClick={() => props.onSelectWorkspace(item._id)}><span className="mr-2 size-2 rounded-full bg-blue-500" />{item.name}</DropdownMenuItem>)}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => setCreateOpen(true)}><Plus className="size-4" />Create workspace</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Create a knowledge workspace</DialogTitle><DialogDescription>Documents and conversations stay isolated inside each workspace.</DialogDescription></DialogHeader><Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="e.g. Acme operations" /><DialogFooter><Button disabled={!workspaceName.trim()} onClick={async () => { await props.onCreateWorkspace(workspaceName); setWorkspaceName(""); setCreateOpen(false); }}>Create workspace</Button></DialogFooter></DialogContent></Dialog>
    <div className="mt-3 space-y-1 px-3"><Button variant={props.view === "ask" ? "secondary" : "ghost"} className="w-full justify-start gap-3" onClick={() => props.setView("ask")}><MessageSquareText className="size-4" />Ask Atlas</Button><Button variant={props.view === "knowledge" ? "secondary" : "ghost"} className="w-full justify-start gap-3" onClick={() => props.setView("knowledge")}><Database className="size-4" />Knowledge</Button></div>
    <Separator className="my-4" />
    <div className="flex items-center justify-between px-4 pb-2"><span className="text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Conversations</span><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => void props.onNewConversation()}><Plus className="size-4" /><span className="sr-only">New conversation</span></Button></TooltipTrigger><TooltipContent>New conversation</TooltipContent></Tooltip></div>
    <ScrollArea className="min-h-0 flex-1"><div className="space-y-1 px-3">{props.conversations.length === 0 && <div className="rounded-lg border border-dashed px-3 py-5 text-center text-xs leading-5 text-muted-foreground">No conversations yet.<br />Start by asking a question.</div>}{props.conversations.map((conversation) => <div key={conversation._id} className={cn("group flex items-center rounded-lg pr-1 transition-colors hover:bg-sidebar-accent", props.selectedConversationId === conversation._id && "bg-sidebar-accent")}><button className="min-w-0 flex-1 px-3 py-2.5 text-left" onClick={() => props.onSelectConversation(conversation._id)}><span className="block truncate text-sm font-medium">{conversation.title}</span><span className="block text-[11px] text-muted-foreground">{new Date(conversation.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100"><Trash2 className="size-3.5" /><span className="sr-only">Delete {conversation.title}</span></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this conversation?</AlertDialogTitle><AlertDialogDescription>This permanently removes the conversation and all messages.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void props.onDeleteConversation(conversation._id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>)}</div></ScrollArea>
    <div className="p-3"><Card className="border-dashed bg-background/70 shadow-none"><CardContent className="p-3"><div className="flex items-center gap-2 text-xs font-medium"><span className="size-2 rounded-full bg-emerald-500" />Convex synced</div><p className="mt-1 text-[11px] text-muted-foreground">Hermes runtime connected</p></CardContent></Card></div>
  </aside>;
}

function MobileNav({ navigation }: { navigation: SidebarProps }) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const navigate = (action: () => void) => { action(); setOpen(false); };
  return <>
    <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden"><Menu className="size-5" /><span className="sr-only">Open navigation</span></Button></SheetTrigger><SheetContent side="left" className="flex w-[320px] flex-col p-4"><SheetHeader><SheetTitle><AppLogo /></SheetTitle></SheetHeader>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="mt-7 h-auto w-full justify-between px-3 py-2 text-left"><span className="min-w-0"><span className="block truncate text-sm font-medium">{navigation.activeWorkspace?.name}</span><span className="block text-[11px] font-normal text-muted-foreground">Knowledge workspace</span></span><ChevronsUpDown className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent className="w-[286px]" align="start"><DropdownMenuLabel>Workspaces</DropdownMenuLabel>{navigation.workspaces.map((item) => <DropdownMenuItem key={item._id} onClick={() => navigate(() => navigation.onSelectWorkspace(item._id))}>{item.name}</DropdownMenuItem>)}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => setCreateOpen(true)}><Plus className="size-4" />Create workspace</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      <div className="mt-4 grid gap-1"><Button variant={navigation.view === "ask" ? "secondary" : "ghost"} className="justify-start gap-3" onClick={() => navigate(() => navigation.setView("ask"))}><MessageSquareText className="size-4" />Ask Atlas</Button><Button variant={navigation.view === "knowledge" ? "secondary" : "ghost"} className="justify-start gap-3" onClick={() => navigate(() => navigation.setView("knowledge"))}><Database className="size-4" />Knowledge</Button></div>
      <Separator className="my-4" /><div className="flex items-center justify-between pb-2"><span className="text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Conversations</span><Button variant="ghost" size="icon-sm" onClick={() => { setOpen(false); void navigation.onNewConversation(); }}><Plus className="size-4" /><span className="sr-only">New conversation</span></Button></div>
      <ScrollArea className="min-h-0 flex-1"><div className="space-y-1">{navigation.conversations.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">No conversations yet.</p>}{navigation.conversations.map((conversation) => <div key={conversation._id} className={cn("flex items-center rounded-lg", navigation.selectedConversationId === conversation._id && "bg-secondary")}><button className="min-w-0 flex-1 px-3 py-2.5 text-left" onClick={() => navigate(() => navigation.onSelectConversation(conversation._id))}><span className="block truncate text-sm font-medium">{conversation.title}</span><span className="text-[11px] text-muted-foreground">{new Date(conversation.updatedAt).toLocaleDateString()}</span></button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon-sm"><Trash2 className="size-3.5" /><span className="sr-only">Delete {conversation.title}</span></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this conversation?</AlertDialogTitle><AlertDialogDescription>This permanently removes the conversation and all messages.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void navigation.onDeleteConversation(conversation._id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>)}</div></ScrollArea>
    </SheetContent></Sheet>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Create a knowledge workspace</DialogTitle><DialogDescription>Documents and conversations stay isolated inside each workspace.</DialogDescription></DialogHeader><Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="e.g. Acme operations" /><DialogFooter><Button disabled={!workspaceName.trim()} onClick={async () => { await navigation.onCreateWorkspace(workspaceName); setWorkspaceName(""); setCreateOpen(false); setOpen(false); }}>Create workspace</Button></DialogFooter></DialogContent></Dialog>
  </>;
}

function StageTimeline({ stages, status }: { stages: Stage[]; status: StreamStatus }) {
  const icons: Record<string, typeof Search> = { route: CircleDot, search: FileSearch, validate: ShieldCheck, render: Sparkles };
  return <div className="space-y-1.5" role="status" aria-live="polite">
    {stages.length === 0 && <p className="py-4 text-sm text-muted-foreground">Workflow steps will appear here during a run.</p>}
    {stages.map((stage) => { const Icon = icons[stage.id] ?? CircleDot; return <div key={stage.id} className="flex items-start gap-3 rounded-lg px-2 py-2">
      <div className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border", stage.state === "complete" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700")}>
        {stage.state === "complete" ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
      </div>
      <div className="min-w-0"><p className="text-sm font-medium leading-5">{stage.label}</p><p className="text-xs capitalize text-muted-foreground">{stage.state}</p></div>
    </div>; })}
    {(status === "routing" || status === "streaming") && <div className="flex items-center gap-1 px-3 py-2"><span className="stream-dot size-1.5 rounded-full bg-blue-500" /><span className="stream-dot size-1.5 rounded-full bg-blue-500" /><span className="stream-dot size-1.5 rounded-full bg-blue-500" /></div>}
  </div>;
}

function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  return <Card className="gap-0 border-border/80 py-0 shadow-none transition-colors hover:border-blue-300 hover:bg-blue-50/30"><CardContent className="flex items-start gap-3 p-3">
    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-700">{index + 1}</div>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{citation.sourceId}</p><p className="text-xs text-muted-foreground">Lines {citation.startLine}–{citation.endLine}</p>{citation.excerpt && <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{citation.excerpt}</p>}</div>
    <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
  </CardContent></Card>;
}

function EvidencePanel({ citations, stages, status, final }: { citations: Citation[]; stages: Stage[]; status: StreamStatus; final: FinalResult | null }) {
  return <div className="flex h-full flex-col bg-muted/25">
    <div className="border-b px-5 py-4"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Evidence & trace</p><p className="mt-0.5 text-xs text-muted-foreground">Live run inspection</p></div>{final?.decision.publishable && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline"><Check className="size-3" />Validated</Badge>}</div></div>
    <Tabs defaultValue="sources" className="flex min-h-0 flex-1 flex-col"><TabsList className="mx-4 mt-3 grid grid-cols-2"><TabsTrigger value="sources">Sources {citations.length ? `(${citations.length})` : ""}</TabsTrigger><TabsTrigger value="trace">Trace</TabsTrigger></TabsList>
      <TabsContent value="sources" className="min-h-0 flex-1"><ScrollArea className="h-full"><div className="space-y-3 p-4">{citations.length ? citations.map((citation, index) => <CitationCard key={`${citation.sourceId}-${citation.startLine}`} citation={citation} index={index} />) : <div className="grid place-items-center rounded-xl border border-dashed px-5 py-12 text-center"><BookOpen className="mb-3 size-7 text-muted-foreground/60" /><p className="text-sm font-medium">No evidence yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Source passages appear here as Atlas resolves them.</p></div>}</div></ScrollArea></TabsContent>
      <TabsContent value="trace" className="min-h-0 flex-1"><ScrollArea className="h-full"><div className="p-3"><StageTimeline stages={stages} status={status} /></div></ScrollArea></TabsContent>
    </Tabs>
  </div>;
}

function EmptyChat({ onSuggestion, onKnowledge }: { onSuggestion: (question: string) => void; onKnowledge: () => void }) {
  return <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center px-5 py-16 text-center">
    <div className="mb-5 grid size-14 place-items-center rounded-2xl border bg-card shadow-sm"><Sparkles className="size-6 text-blue-600" /></div>
    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ask your company knowledge</h1>
    <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Atlas searches your source documents, streams the evidence it uses, and validates every citation before publishing an answer.</p>
    <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">{suggestions.map((question) => <Button key={question} variant="outline" className="h-auto justify-start whitespace-normal px-4 py-3 text-left text-sm font-normal" onClick={() => onSuggestion(question)}>{question}<ArrowUp className="ml-auto size-3.5 rotate-45 text-muted-foreground" /></Button>)}</div>
    <Button variant="ghost" className="mt-5 gap-2 text-muted-foreground" onClick={onKnowledge}><UploadCloud className="size-4" />Upload knowledge instead</Button>
  </div>;
}

function WorkspaceBanner({ workspace }: { workspace: Doc<"workspaces"> }) {
  return <div className="relative mx-auto mt-6 max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-5 py-5 text-white shadow-[0_20px_70px_-35px_rgba(15,23,42,.8)] sm:px-6">
    <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_0%,rgba(59,130,246,.35),transparent_35%),radial-gradient(circle_at_90%_100%,rgba(249,115,22,.20),transparent_30%),linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:auto,auto,28px_28px,28px_28px]" />
    <div className="relative flex items-start justify-between gap-4"><div><Badge className="mb-3 border-white/10 bg-white/10 text-white" variant="outline"><Sparkles className="size-3" />Active workspace</Badge><h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{workspace.name}</h1><p className="mt-1 text-sm text-slate-300">{workspace.description ?? "Your team knowledge, cited and continuously improved."}</p></div><div className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right sm:block"><p className="text-[10px] uppercase tracking-[.15em] text-slate-400">Runtime</p><p className="mt-1 text-xs font-medium text-emerald-300">Hermes connected</p></div></div>
  </div>;
}

function StoredMessage({ message }: { message: Doc<"messages"> }) {
  if (message.role === "user") return <div className="flex justify-end"><div className="max-w-[82%] rounded-2xl rounded-br-md bg-slate-950 px-4 py-3 text-sm leading-6 text-white">{message.content}</div></div>;
  const messageCitations = message.citations ?? [];
  return <div className="flex gap-3"><Avatar className="size-8 border"><AvatarFallback className="bg-blue-50 text-xs font-semibold text-blue-700">A</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-2"><span className="text-sm font-semibold">Atlas</span>{message.status === "SUPPORTED" && <Badge className="border-blue-200 bg-blue-50 text-blue-700" variant="outline"><ShieldCheck className="size-3" />Supported</Badge>}</div><div className="text-[15px] leading-7">{message.content}</div>{messageCitations.length > 0 && <details className="mt-4 rounded-xl border bg-muted/25 p-1"><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium"><BookOpen className="size-4 text-blue-600" />{messageCitations.length} validated source{messageCitations.length === 1 ? "" : "s"}<ChevronDown className="ml-auto size-4" /></summary><div className="grid gap-2 p-2">{messageCitations.map((citation, index) => <CitationCard key={`${citation.sourceId}-${citation.startLine}`} citation={citation} index={index} />)}</div></details>}</div></div>;
}

function ChatWorkspace({ onKnowledge, viewerId, workspace, conversationId, onConversationSelected, navigation }: { onKnowledge: () => void; viewerId: string; workspace: Doc<"workspaces">; conversationId: Id<"conversations"> | null; onConversationSelected: (id: Id<"conversations">) => void; navigation: SidebarProps }) {
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [stages, setStages] = useState<Stage[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [final, setFinal] = useState<FinalResult | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [following, setFollowing] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const storedMessages = useQuery(api.messages.list, conversationId ? { viewerId, conversationId } : "skip") ?? [];
  const createConversation = useMutation(api.conversations.create);
  const appendMessage = useMutation(api.messages.append);

  useEffect(() => { if (following) bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [answer, stages, following]);
  useEffect(() => {
    if (!abortRef.current) { setSubmittedQuestion(""); setAnswer(""); setCitations([]); setStages([]); setFinal(null); setStatus("idle"); }
  }, [conversationId]);

  const updateStage = (stage: Stage) => setStages((current) => [...current.filter((item) => item.id !== stage.id), stage]);

  async function submit(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || status === "routing" || status === "streaming") return;
    const abortController = new AbortController();
    abortRef.current = abortController;
    setQuestion(""); setSubmittedQuestion(trimmed); setAnswer(""); setCitations([]); setStages([]); setFinal(null); setStatus("routing");
    let targetConversationId = conversationId;
    try {
      if (!targetConversationId) {
        targetConversationId = await createConversation({ viewerId, workspaceId: workspace._id, title: trimmed.slice(0, 58) });
        onConversationSelected(targetConversationId);
      }
      await appendMessage({ viewerId, conversationId: targetConversationId, role: "user", content: trimmed, status: "complete" });
      const response = await fetch("/api/chat/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: trimmed, viewerId, workspaceId: workspace._id }), signal: abortController.signal });
      if (!response.body) throw new Error("Streaming is unavailable in this browser.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completedResult: FinalResult | null = null;
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done }).replace(/\r\n/g, "\n");
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks.filter(Boolean)) {
          const { event, data } = parseEventBlock(block);
          if ((event === "route" || event === "stage") && data) { const stage = data as Stage; updateStage(stage); if (stage.id !== "route") setStatus("streaming"); }
          if (event === "retrieval" && data) setCitations((current) => [...current, data as Citation]);
          if (event === "text-delta" && data) setAnswer((current) => current + (data as { delta: string }).delta);
          if (event === "done" && data) { const result = data as FinalResult; completedResult = result; setFinal(result); setCitations(result.citations ?? []); setStatus(result.answer.status === "SYSTEM_UNAVAILABLE" ? "error" : "complete"); }
        }
        if (done) break;
      }
      if (completedResult && targetConversationId) {
        await appendMessage({ viewerId, conversationId: targetConversationId, role: "assistant", content: completedResult.answer.answer, status: completedResult.answer.status, citations: completedResult.citations.map((citation) => ({ sourceId: citation.sourceId, startLine: citation.startLine, endLine: citation.endLine, excerpt: citation.excerpt })) });
        setSubmittedQuestion(""); setAnswer("");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("complete");
        setAnswer("Run stopped.");
        setStages((current) => current.map((stage) => stage.state === "running" ? { ...stage, state: "skipped" } : stage));
        if (targetConversationId) await appendMessage({ viewerId, conversationId: targetConversationId, role: "assistant", content: "Run stopped.", status: "STOPPED" });
      } else {
        setStatus("error");
        setAnswer(error instanceof Error ? error.message : "Atlas could not complete this run.");
      }
    } finally {
      abortRef.current = null;
    }
  }

  const isActive = status === "routing" || status === "streaming";
  const hermesActive = stages.some((stage) => (stage.id === "search" || stage.id === "validate") && stage.state === "running");
  const renderActive = stages.some((stage) => stage.id === "render" && stage.state === "running");
  const showOptimisticUser = Boolean(submittedQuestion) && !storedMessages.some((message) => message.role === "user" && message.content === submittedQuestion);
  return <div className="flex min-w-0 flex-1">
    <main className="relative flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6"><div className="flex items-center gap-3"><MobileNav navigation={navigation} /><div><p className="text-sm font-semibold">Ask Atlas</p><p className="max-w-52 truncate text-xs text-muted-foreground">{workspace.name}</p></div></div><div className="flex items-center gap-2"><Badge variant="outline" className="hidden gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 sm:flex"><span className="size-1.5 rounded-full bg-emerald-500" />Hermes online</Badge><Sheet open={evidenceOpen} onOpenChange={setEvidenceOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="xl:hidden"><PanelRight className="size-4" /><span className="sr-only">Open evidence</span></Button></SheetTrigger><SheetContent className="w-full p-0 sm:max-w-md"><SheetHeader className="sr-only"><SheetTitle>Evidence and trace</SheetTitle></SheetHeader><EvidencePanel citations={citations} stages={stages} status={status} final={final} /></SheetContent></Sheet></div></header>
      <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto" role="log" aria-busy={isActive} onScroll={(event) => { const element = event.currentTarget; setFollowing(element.scrollHeight - element.scrollTop - element.clientHeight < 80); }}>
        <div className="px-4 sm:px-6"><WorkspaceBanner workspace={workspace} />{storedMessages.length === 0 && !submittedQuestion ? <EmptyChat onSuggestion={(value) => submit(value)} onKnowledge={onKnowledge} /> : <div className="mx-auto w-full max-w-3xl space-y-8 py-8">{storedMessages.map((message) => <StoredMessage key={message._id} message={message} />)}{showOptimisticUser && <div className="flex justify-end"><div className="max-w-[82%] rounded-2xl rounded-br-md bg-slate-950 px-4 py-3 text-sm leading-6 text-white">{submittedQuestion}</div></div>}{(isActive || answer) && <div className="flex gap-3"><Avatar className="size-8 border"><AvatarFallback className="bg-blue-50 text-xs font-semibold text-blue-700">A</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Atlas</span>{final?.decision.publishable && <Badge className="border-blue-200 bg-blue-50 text-blue-700" variant="outline"><ShieldCheck className="size-3" />Supported</Badge>}{isActive && <Badge variant="outline"><span className="size-1.5 rounded-full bg-blue-500" />{hermesActive ? "Hermes running" : renderActive ? "Rendering answer" : "Atlas routing"}</Badge>}</div>{isActive && !answer && <Card className="mb-4 border-blue-100 bg-blue-50/40 py-0 shadow-none"><CardContent className="p-4"><StageTimeline stages={stages} status={status} /></CardContent></Card>}{answer && <div className="text-[15px] leading-7">{answer}<span className={cn("ml-0.5 inline-block h-4 w-0.5 bg-blue-600 align-middle", !isActive && "hidden")} /></div>}{status === "error" && <p className="text-sm text-destructive">The run did not complete.</p>}{citations.length > 0 && <details className="mt-5 rounded-xl border bg-muted/25 p-1" open><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium"><BookOpen className="size-4 text-blue-600" />{citations.length} validated source{citations.length === 1 ? "" : "s"}<ChevronDown className="ml-auto size-4" /></summary><div className="grid gap-2 p-2">{citations.map((citation, index) => <CitationCard key={`${citation.sourceId}-${citation.startLine}`} citation={citation} index={index} />)}</div></details>}</div></div>}</div>}<div ref={bottomRef} /></div>
      </div>
      {!following && <Button variant="outline" size="sm" className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 gap-2 rounded-full bg-background shadow-md" onClick={() => { setFollowing(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}><ChevronDown className="size-4" />Jump to latest</Button>}
      <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-2 sm:px-6 sm:pb-6"><div className="mx-auto max-w-3xl"><div className="rounded-2xl border bg-card p-2 shadow-[0_8px_30px_rgb(15_23_42/0.08)] focus-within:ring-2 focus-within:ring-ring/20"><Textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask about policies, operations, or support…" className="min-h-12 resize-none border-0 bg-transparent px-3 py-3 shadow-none focus-visible:ring-0" /><div className="flex items-center justify-between px-1 pb-1"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onKnowledge}><Plus className="size-4" /><span className="sr-only">Upload knowledge</span></Button></TooltipTrigger><TooltipContent>Upload knowledge</TooltipContent></Tooltip><div className="flex items-center gap-2"><span className="hidden text-[11px] text-muted-foreground sm:block">Enter to send · Shift+Enter for a new line</span><Button size="icon" className="rounded-xl" onClick={() => isActive ? abortRef.current?.abort() : void submit()} disabled={!isActive && !question.trim()}>{isActive ? <X className="size-4" /> : <Send className="size-4" />}<span className="sr-only">{isActive ? "Stop run" : "Send question"}</span></Button></div></div></div><p className="mt-2 text-center text-[11px] text-muted-foreground">No evidence, no answer. Atlas validates citations before publishing.</p></div></div>
    </main>
    <aside className="hidden h-dvh w-[340px] shrink-0 border-l xl:block"><EvidencePanel citations={citations} stages={stages} status={status} final={final} /></aside>
  </div>;
}

function formatBytes(bytes: number) { return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

function KnowledgeWorkspace({ onAsk, viewerId, workspace, navigation }: { onAsk: () => void; viewerId: string; workspace: Doc<"workspaces">; navigation: SidebarProps }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [ingestionError, setIngestionError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const documents = useQuery(api.documents.list, { viewerId, workspaceId: workspace._id }) ?? [];
  const jobs = useQuery(api.ingestionJobs.list, { viewerId, workspaceId: workspace._id }) ?? [];
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const completeUpload = useMutation(api.documents.completeUpload);
  const publishDocument = useMutation(api.documents.publish);
  const retryIngestion = useMutation(api.ingestionJobs.retry);
  useEffect(() => { setItems((current) => current.map((item) => {
    const document = documents.find((candidate) => candidate.originalName === item.file.name);
    return document?.status === "published" ? { ...item, state: "ready" } : document?.status === "review" ? { ...item, state: "pending" } : item;
  })); }, [documents]);

  function selectFiles(files: FileList | File[]) {
    setItems((current) => {
      const selected = Array.from(files).map((file, index): UploadItem => {
        const extension = file.name.split(".").pop()?.toLowerCase();
        const error = current.length + index >= 5
          ? "Only five files can be uploaded per batch."
          : extension !== "md" && extension !== "txt"
            ? "Only Markdown (.md) and text (.txt) files are supported."
            : file.size > 256 * 1024 ? "File exceeds the 256 KB limit." : undefined;
        return { id: crypto.randomUUID(), file, progress: 0, state: error ? "error" : "selected", valid: !error, error };
      });
      return [...current, ...selected];
    });
  }

  async function startIngestion(jobId: Id<"ingestionJobs">, retry = false) {
    setIngestionError("");
    if (retry) await retryIngestion({ viewerId, jobId });
    const response = await fetch("/api/ingestion/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ viewerId, jobId }) });
    if (!response.ok) throw new Error("Hermes ingestion could not be started");
  }

  async function upload() {
    const ready = items.filter((item) => item.valid && (item.state === "selected" || item.state === "error"));
    if (!ready.length) return;
    setItems((current) => current.map((item) => ready.some((entry) => entry.id === item.id) ? { ...item, state: "uploading", progress: 0, error: undefined } : item));
    for (const item of ready) {
      try {
        const uploadUrl = await generateUploadUrl({ viewerId, workspaceId: workspace._id });
        const storageId = await new Promise<Id<"_storage">>((resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open("POST", uploadUrl);
          request.setRequestHeader("Content-Type", item.file.type || "text/plain");
          request.upload.onprogress = (event) => { if (event.lengthComputable) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, progress: Math.round((event.loaded / event.total) * 100) } : entry)); };
          request.onload = () => request.status >= 200 && request.status < 300 ? resolve((JSON.parse(request.responseText) as { storageId: Id<"_storage"> }).storageId) : reject(new Error("Storage upload failed"));
          request.onerror = () => reject(new Error("Network error while uploading"));
          request.send(item.file);
        });
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, state: "processing", progress: 100 } : entry));
        const created = await completeUpload({ viewerId, workspaceId: workspace._id, storageId, originalName: item.file.name, contentType: item.file.type || "text/plain", size: item.file.size });
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, state: "processing" } : entry));
        await startIngestion(created.jobId);
      } catch (error) {
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, state: "error", error: error instanceof Error ? error.message : "Upload failed" } : entry));
      }
    }
  }

  const addedCount = items.filter((item) => item.state === "pending" || item.state === "processing" || item.state === "ready").length;
  return <main className="min-w-0 flex-1 overflow-y-auto bg-muted/20">
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6"><div className="flex items-center gap-3"><MobileNav navigation={navigation} /><div><p className="text-sm font-semibold">Knowledge</p><p className="max-w-52 truncate text-xs text-muted-foreground">{workspace.name}</p></div></div><Button variant="outline" className="gap-2" onClick={onAsk}><MessageSquareText className="size-4" />Ask Atlas</Button></header>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <WorkspaceBanner workspace={workspace} />
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Badge variant="outline" className="mb-3 border-blue-200 bg-blue-50 text-blue-700">Convex Storage intake</Badge><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Submit source material</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Files are stored in Convex Storage and create an ingestion job for Hermes. They remain non-authoritative until a Knowledge Owner publishes them.</p></div><div className="flex gap-3"><Card className="gap-1 px-4 py-3 shadow-none"><p className="text-2xl font-semibold">{documents.filter((document) => document.status === "published").length}</p><p className="text-xs text-muted-foreground">Published sources</p></Card><Card className="gap-1 px-4 py-3 shadow-none"><p className="text-2xl font-semibold">{jobs.filter((job) => job.state === "queued" || job.state === "running").length}</p><p className="text-xs text-muted-foreground">Ingestion jobs</p></Card></div></div>
      <Card className="mt-8 overflow-hidden border-dashed shadow-none"><CardContent className="p-3"><div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFiles(event.dataTransfer.files); }} className={cn("grid min-h-64 place-items-center rounded-xl border border-dashed p-8 text-center transition-colors", dragging ? "border-blue-400 bg-blue-50" : "border-border bg-muted/20")}>
        <input ref={inputRef} className="sr-only" type="file" multiple accept=".md,.txt,text/markdown,text/plain" onChange={(event) => event.target.files && selectFiles(event.target.files)} />
        <div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><UploadCloud className="size-6" /></div><h2 className="mt-4 text-base font-semibold">Drop knowledge files here</h2><p className="mt-1 text-sm text-muted-foreground">Markdown or TXT · up to 256 KB each · maximum 5 files</p><Button className="mt-5 gap-2" onClick={() => inputRef.current?.click()}><Plus className="size-4" />Choose files</Button></div>
      </div></CardContent></Card>
      {ingestionError && <p className="mt-3 text-sm text-destructive">{ingestionError}</p>}
      {items.length > 0 && <Card className="mt-6 shadow-none"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Upload queue</CardTitle><CardDescription>{items.length} selected file{items.length === 1 ? "" : "s"} · {addedCount} submitted</CardDescription></div><Button onClick={upload} disabled={!items.some((item) => item.valid && (item.state === "selected" || item.state === "error"))}><UploadCloud className="size-4" />Submit for ingestion</Button></CardHeader><CardContent className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border p-3"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted"><FileText className="size-5 text-muted-foreground" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{item.file.name}</p><Badge variant={item.state === "ready" || item.state === "pending" ? "outline" : item.state === "error" ? "destructive" : "secondary"} className={cn("capitalize", item.state === "ready" && "border-emerald-200 bg-emerald-50 text-emerald-700", item.state === "pending" && "border-amber-200 bg-amber-50 text-amber-700")}>{item.state === "pending" ? "pending review" : item.state}</Badge></div><p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(item.file.size)}{item.passages ? ` · ${item.passages} candidate passages` : ""}</p>{(item.state === "uploading" || item.state === "processing") && <Progress className="mt-2 h-1.5" value={item.progress} />}{item.error && <p className="mt-1 text-xs text-destructive">{item.error}</p>}</div><Button variant="ghost" size="icon" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} disabled={item.state === "uploading" || item.state === "processing"}><X className="size-4" /><span className="sr-only">Remove {item.file.name}</span></Button></div>)}</CardContent></Card>}
      {documents.length > 0 && <Card className="mt-6 shadow-none"><CardHeader><CardTitle>Workspace documents</CardTitle><CardDescription>Durable files and their current ingestion state from Convex.</CardDescription></CardHeader><CardContent className="space-y-2">{documents.map((document) => { const job = jobs.find((candidate) => candidate.documentId === document._id); return <div key={document._id} className="flex items-center gap-3 rounded-xl border p-3"><div className="grid size-10 place-items-center rounded-lg bg-muted"><FileText className="size-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{document.originalName}</p><p className="text-xs text-muted-foreground">{formatBytes(document.size)} · {job?.stage ?? "Job queued"}</p>{job && <Progress className="mt-2 h-1.5" value={job.progress} />}</div>{document.status === "review" || document.status === "ready" ? <Button size="sm" onClick={() => void publishDocument({ viewerId, documentId: document._id })}><ShieldCheck className="size-4" />Publish</Button> : job && (job.state === "failed" || job.state === "queued") ? <Button variant="outline" size="sm" onClick={() => void startIngestion(job._id, job.state === "failed").catch((error) => setIngestionError(error instanceof Error ? error.message : "Retry failed"))}>Retry ingestion</Button> : <Badge variant="outline" className="capitalize">{document.status}</Badge>}</div>; })}</CardContent></Card>}
      <div className="mt-8 grid gap-4 md:grid-cols-3"><Card className="shadow-none"><CardHeader><div className="mb-2 grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-700"><FileSearch className="size-4" /></div><CardTitle className="text-sm">1. Validate</CardTitle><CardDescription>Enforce file type, batch, size, duplicate, and corpus quota rules.</CardDescription></CardHeader></Card><Card className="shadow-none"><CardHeader><div className="mb-2 grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700"><UploadCloud className="size-4" /></div><CardTitle className="text-sm">2. Quarantine</CardTitle><CardDescription>Preserve the raw file and content hash without granting retrieval authority.</CardDescription></CardHeader></Card><Card className="shadow-none"><CardHeader><div className="mb-2 grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><ShieldCheck className="size-4" /></div><CardTitle className="text-sm">3. Owner review</CardTitle><CardDescription>A Knowledge Owner must approve and publish before Atlas can cite it.</CardDescription></CardHeader></Card></div>
    </div>
  </main>;
}

export function App() {
  const [viewerId] = useState(getViewerId);
  const [view, setView] = useState<Workspace>("ask");
  const [workspaceId, setWorkspaceId] = useState<Id<"workspaces"> | null>(null);
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const initializing = useRef(false);
  const workspaces = useQuery(api.workspaces.list, { viewerId }) ?? [];
  const ensureDefaultWorkspace = useMutation(api.workspaces.ensureDefault);
  const createWorkspace = useMutation(api.workspaces.create);
  const createConversation = useMutation(api.conversations.create);
  const deleteConversation = useMutation(api.conversations.remove);
  const conversations = useQuery(api.conversations.list, workspaceId ? { viewerId, workspaceId } : "skip") ?? [];
  const activeWorkspace = workspaces.find((workspace) => workspace._id === workspaceId) ?? workspaces[0];

  useEffect(() => {
    const firstWorkspace = workspaces[0];
    if (firstWorkspace) { if (!workspaceId || !workspaces.some((workspace) => workspace._id === workspaceId)) setWorkspaceId(firstWorkspace._id); return; }
    if (!initializing.current) { initializing.current = true; void ensureDefaultWorkspace({ viewerId }).then(setWorkspaceId).finally(() => { initializing.current = false; }); }
  }, [ensureDefaultWorkspace, viewerId, workspaceId, workspaces]);

  if (!activeWorkspace) return <div className="grid h-dvh place-items-center bg-background"><div className="text-center"><div className="mx-auto mb-4 grid size-11 place-items-center rounded-xl bg-slate-950 font-bold text-white">A</div><p className="text-sm font-medium">Creating your knowledge workspace…</p></div></div>;

  const sidebarProps: SidebarProps = {
    view, setView, activeWorkspace, workspaces, conversations, selectedConversationId: conversationId,
    onSelectWorkspace: (id) => { setWorkspaceId(id); setConversationId(null); },
    onCreateWorkspace: async (name) => { const id = await createWorkspace({ viewerId, name }); setWorkspaceId(id); setConversationId(null); setView("knowledge"); },
    onNewConversation: async () => { const id = await createConversation({ viewerId, workspaceId: activeWorkspace._id }); setConversationId(id); setView("ask"); },
    onSelectConversation: (id) => { setConversationId(id); setView("ask"); },
    onDeleteConversation: async (id) => { await deleteConversation({ viewerId, conversationId: id }); if (conversationId === id) setConversationId(null); },
  };

  return <TooltipProvider><div className="flex h-dvh overflow-hidden bg-[#f7f8fa]"><Sidebar {...sidebarProps} />{view === "ask" ? <ChatWorkspace viewerId={viewerId} workspace={activeWorkspace} conversationId={conversationId} onConversationSelected={setConversationId} onKnowledge={() => setView("knowledge")} navigation={sidebarProps} /> : <KnowledgeWorkspace viewerId={viewerId} workspace={activeWorkspace} onAsk={() => setView("ask")} navigation={sidebarProps} />}</div></TooltipProvider>;
}
