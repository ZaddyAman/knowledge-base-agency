import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Database,
  FileSearch,
  FileText,
  Menu,
  MessageSquareText,
  PanelRight,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
type UploadItem = { id: string; file: File; progress: number; state: "selected" | "uploading" | "processing" | "pending" | "error"; valid: boolean; error?: string; passages?: number };

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

function Sidebar({ workspace, setWorkspace }: { workspace: Workspace; setWorkspace: (workspace: Workspace) => void }) {
  return <aside className="hidden h-dvh w-[264px] shrink-0 flex-col border-r bg-sidebar lg:flex">
    <div className="flex h-16 items-center px-5"><AppLogo /></div>
    <div className="space-y-1 px-3">
      <Button variant={workspace === "ask" ? "secondary" : "ghost"} className="w-full justify-start gap-3" onClick={() => setWorkspace("ask")}><MessageSquareText className="size-4" />Ask Atlas</Button>
      <Button variant={workspace === "knowledge" ? "secondary" : "ghost"} className="w-full justify-start gap-3" onClick={() => setWorkspace("knowledge")}><Database className="size-4" />Knowledge</Button>
    </div>
    <Separator className="my-4" />
    <div className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Recent</div>
    <div className="mx-3 rounded-lg border border-dashed px-3 py-5 text-center text-xs leading-5 text-muted-foreground">No saved conversations yet.<br />Your demo runs will appear here.</div>
    <div className="mt-auto p-3"><Card className="border-dashed bg-background/70 shadow-none"><CardContent className="p-3"><div className="flex items-center gap-2 text-xs font-medium"><span className="size-2 rounded-full bg-emerald-500" />Hermes online</div><p className="mt-1 text-[11px] text-muted-foreground">llm-wiki · 12 sources</p></CardContent></Card></div>
  </aside>;
}

function MobileNav({ workspace, setWorkspace }: { workspace: Workspace; setWorkspace: (workspace: Workspace) => void }) {
  return <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden"><Menu className="size-5" /><span className="sr-only">Open navigation</span></Button></SheetTrigger><SheetContent side="left" className="w-[300px] p-4"><SheetHeader><SheetTitle><AppLogo /></SheetTitle></SheetHeader><div className="mt-8 grid gap-2"><Button variant={workspace === "ask" ? "secondary" : "ghost"} className="justify-start gap-3" onClick={() => setWorkspace("ask")}><MessageSquareText className="size-4" />Ask Atlas</Button><Button variant={workspace === "knowledge" ? "secondary" : "ghost"} className="justify-start gap-3" onClick={() => setWorkspace("knowledge")}><Database className="size-4" />Knowledge</Button></div></SheetContent></Sheet>;
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

function ChatWorkspace({ onKnowledge }: { onKnowledge: () => void }) {
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

  useEffect(() => { if (following) bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [answer, stages, following]);

  const updateStage = (stage: Stage) => setStages((current) => [...current.filter((item) => item.id !== stage.id), stage]);

  async function submit(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || status === "routing" || status === "streaming") return;
    const abortController = new AbortController();
    abortRef.current = abortController;
    setQuestion(""); setSubmittedQuestion(trimmed); setAnswer(""); setCitations([]); setStages([]); setFinal(null); setStatus("routing");
    try {
      const response = await fetch("/api/chat/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: trimmed }), signal: abortController.signal });
      if (!response.body) throw new Error("Streaming is unavailable in this browser.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
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
          if (event === "done" && data) { const result = data as FinalResult; setFinal(result); setCitations(result.citations ?? []); setStatus(result.answer.status === "SYSTEM_UNAVAILABLE" ? "error" : "complete"); }
        }
        if (done) break;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("complete");
        setAnswer("Run stopped.");
        setStages((current) => current.map((stage) => stage.state === "running" ? { ...stage, state: "skipped" } : stage));
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
  return <div className="flex min-w-0 flex-1">
    <main className="relative flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6"><div className="flex items-center gap-3"><MobileNav workspace="ask" setWorkspace={(value) => value === "knowledge" && onKnowledge()} /><div><p className="text-sm font-semibold">Team Q&A</p><p className="text-xs text-muted-foreground">PostHog demo workspace</p></div></div><div className="flex items-center gap-2"><Badge variant="outline" className="hidden gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 sm:flex"><span className="size-1.5 rounded-full bg-emerald-500" />Hermes online</Badge><Sheet open={evidenceOpen} onOpenChange={setEvidenceOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="xl:hidden"><PanelRight className="size-4" /><span className="sr-only">Open evidence</span></Button></SheetTrigger><SheetContent className="w-full p-0 sm:max-w-md"><SheetHeader className="sr-only"><SheetTitle>Evidence and trace</SheetTitle></SheetHeader><EvidencePanel citations={citations} stages={stages} status={status} final={final} /></SheetContent></Sheet></div></header>
      <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto" role="log" aria-busy={isActive} onScroll={(event) => { const element = event.currentTarget; setFollowing(element.scrollHeight - element.scrollTop - element.clientHeight < 80); }}>
        {!submittedQuestion ? <EmptyChat onSuggestion={(value) => submit(value)} onKnowledge={onKnowledge} /> : <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
          <div className="flex justify-end"><div className="max-w-[82%] rounded-2xl rounded-br-md bg-slate-950 px-4 py-3 text-sm leading-6 text-white">{submittedQuestion}</div></div>
          <div className="mt-8 flex gap-3"><Avatar className="size-8 border"><AvatarFallback className="bg-blue-50 text-xs font-semibold text-blue-700">A</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Atlas</span>{final?.decision.publishable && <Badge className="border-blue-200 bg-blue-50 text-blue-700" variant="outline"><ShieldCheck className="size-3" />Supported</Badge>}{final?.answer.status === "OUT_OF_SCOPE" && <Badge variant="secondary">Outside workspace</Badge>}{isActive && <Badge variant="outline"><span className="size-1.5 rounded-full bg-blue-500" />{hermesActive ? "Hermes running" : renderActive ? "Rendering answer" : "Atlas routing"}</Badge>}</div>
            {isActive && !answer && <Card className="mb-4 border-blue-100 bg-blue-50/40 py-0 shadow-none"><CardContent className="p-4"><StageTimeline stages={stages} status={status} /></CardContent></Card>}
            {answer && <div className="text-[15px] leading-7 text-foreground">{answer}<span className={cn("ml-0.5 inline-block h-4 w-0.5 bg-blue-600 align-middle", !isActive && "hidden")} /></div>}
            {status === "error" && <p className="text-sm text-destructive">{final?.decision.reason ?? "The run did not complete."}</p>}
            {citations.length > 0 && <details className="mt-5 rounded-xl border bg-muted/25 p-1" open><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium"><BookOpen className="size-4 text-blue-600" />{citations.length} validated source{citations.length === 1 ? "" : "s"}<ChevronDown className="ml-auto size-4 text-muted-foreground" /></summary><div className="grid gap-2 p-2">{citations.map((citation, index) => <CitationCard key={`${citation.sourceId}-${citation.startLine}`} citation={citation} index={index} />)}</div></details>}
          </div></div><div ref={bottomRef} /></div>}
      </div>
      {!following && <Button variant="outline" size="sm" className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 gap-2 rounded-full bg-background shadow-md" onClick={() => { setFollowing(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}><ChevronDown className="size-4" />Jump to latest</Button>}
      <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-2 sm:px-6 sm:pb-6"><div className="mx-auto max-w-3xl"><div className="rounded-2xl border bg-card p-2 shadow-[0_8px_30px_rgb(15_23_42/0.08)] focus-within:ring-2 focus-within:ring-ring/20"><Textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask about policies, operations, or support…" className="min-h-12 resize-none border-0 bg-transparent px-3 py-3 shadow-none focus-visible:ring-0" /><div className="flex items-center justify-between px-1 pb-1"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onKnowledge}><Plus className="size-4" /><span className="sr-only">Upload knowledge</span></Button></TooltipTrigger><TooltipContent>Upload knowledge</TooltipContent></Tooltip><div className="flex items-center gap-2"><span className="hidden text-[11px] text-muted-foreground sm:block">Enter to send · Shift+Enter for a new line</span><Button size="icon" className="rounded-xl" onClick={() => isActive ? abortRef.current?.abort() : void submit()} disabled={!isActive && !question.trim()}>{isActive ? <X className="size-4" /> : <Send className="size-4" />}<span className="sr-only">{isActive ? "Stop run" : "Send question"}</span></Button></div></div></div><p className="mt-2 text-center text-[11px] text-muted-foreground">No evidence, no answer. Atlas validates citations before publishing.</p></div></div>
    </main>
    <aside className="hidden h-dvh w-[340px] shrink-0 border-l xl:block"><EvidencePanel citations={citations} stages={stages} status={status} final={final} /></aside>
  </div>;
}

function formatBytes(bytes: number) { return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

function KnowledgeWorkspace({ onAsk }: { onAsk: () => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sourceCount, setSourceCount] = useState(12);
  const [pendingCount, setPendingCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { fetch("/api/knowledge").then((response) => response.json()).then((data: { sources: number; pending: number }) => { setSourceCount(data.sources); setPendingCount(data.pending); }).catch(() => undefined); }, []);

  function selectFiles(files: FileList | File[]) {
    setItems((current) => {
      const selected = Array.from(files).map((file, index): UploadItem => {
        const extension = file.name.split(".").pop()?.toLowerCase();
        const error = current.length + index >= 5
          ? "Only five files can be uploaded per batch."
          : extension !== "md" && extension !== "txt"
            ? "Only Markdown (.md) and text (.txt) files are supported."
            : file.size > 2 * 1024 * 1024 ? "File exceeds the 2 MB limit." : undefined;
        return { id: crypto.randomUUID(), file, progress: 0, state: error ? "error" : "selected", valid: !error, error };
      });
      return [...current, ...selected];
    });
  }

  function upload() {
    const ready = items.filter((item) => item.valid && (item.state === "selected" || item.state === "error"));
    if (!ready.length) return;
    const form = new FormData(); ready.forEach((item) => form.append("files", item.file));
    setItems((current) => current.map((item) => ready.some((entry) => entry.id === item.id) ? { ...item, state: "uploading", progress: 0, error: undefined } : item));
    const request = new XMLHttpRequest();
    request.open("POST", "/api/knowledge/ingest");
    request.upload.onprogress = (event) => { if (event.lengthComputable) setItems((current) => current.map((item) => ready.some((entry) => entry.id === item.id) ? { ...item, progress: Math.round((event.loaded / event.total) * 100) } : item)); };
    request.upload.onload = () => setItems((current) => current.map((item) => ready.some((entry) => entry.id === item.id) ? { ...item, state: "processing", progress: 100 } : item));
    request.onload = () => {
      const result = JSON.parse(request.responseText || "{}");
      if (request.status >= 200 && request.status < 300) {
        setPendingCount(result.corpus.pending); setItems((current) => current.map((item) => { const accepted = result.accepted.find((entry: { name: string; passages: number }) => entry.name === item.file.name); return accepted ? { ...item, state: "pending", passages: accepted.passages } : item; }));
      } else setItems((current) => current.map((item) => ready.some((entry) => entry.id === item.id) ? { ...item, state: "error", error: result.error ?? "Upload failed." } : item));
    };
    request.onerror = () => setItems((current) => current.map((item) => ready.some((entry) => entry.id === item.id) ? { ...item, state: "error", error: "Network error. Try again." } : item));
    request.send(form);
  }

  const addedCount = items.filter((item) => item.state === "pending").length;
  return <main className="min-w-0 flex-1 overflow-y-auto bg-muted/20">
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6"><div className="flex items-center gap-3"><MobileNav workspace="knowledge" setWorkspace={(value) => value === "ask" && onAsk()} /><div><p className="text-sm font-semibold">Knowledge</p><p className="text-xs text-muted-foreground">Ingest and manage source documents</p></div></div><Button variant="outline" className="gap-2" onClick={onAsk}><MessageSquareText className="size-4" />Ask Atlas</Button></header>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Badge variant="outline" className="mb-3 border-blue-200 bg-blue-50 text-blue-700">Knowledge intake</Badge><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Submit source material</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Upload Markdown or plain-text policies, transcripts, and FAQs. Atlas preserves the raw file in a bounded quarantine queue until a Knowledge Owner reviews and publishes it.</p></div><div className="flex gap-3"><Card className="gap-1 px-4 py-3 shadow-none"><p className="text-2xl font-semibold">{sourceCount}</p><p className="text-xs text-muted-foreground">Active sources</p></Card><Card className="gap-1 px-4 py-3 shadow-none"><p className="text-2xl font-semibold">{pendingCount}</p><p className="text-xs text-muted-foreground">Pending review</p></Card></div></div>
      <Card className="mt-8 overflow-hidden border-dashed shadow-none"><CardContent className="p-3"><div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFiles(event.dataTransfer.files); }} className={cn("grid min-h-64 place-items-center rounded-xl border border-dashed p-8 text-center transition-colors", dragging ? "border-blue-400 bg-blue-50" : "border-border bg-muted/20")}>
        <input ref={inputRef} className="sr-only" type="file" multiple accept=".md,.txt,text/markdown,text/plain" onChange={(event) => event.target.files && selectFiles(event.target.files)} />
        <div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><UploadCloud className="size-6" /></div><h2 className="mt-4 text-base font-semibold">Drop knowledge files here</h2><p className="mt-1 text-sm text-muted-foreground">Markdown or TXT · up to 2 MB each · maximum 5 files</p><Button className="mt-5 gap-2" onClick={() => inputRef.current?.click()}><Plus className="size-4" />Choose files</Button></div>
      </div></CardContent></Card>
      {items.length > 0 && <Card className="mt-6 shadow-none"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Upload queue</CardTitle><CardDescription>{items.length} selected file{items.length === 1 ? "" : "s"} · {addedCount} submitted</CardDescription></div><Button onClick={upload} disabled={!items.some((item) => item.valid && (item.state === "selected" || item.state === "error"))}><UploadCloud className="size-4" />Submit for review</Button></CardHeader><CardContent className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border p-3"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted"><FileText className="size-5 text-muted-foreground" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{item.file.name}</p><Badge variant={item.state === "pending" ? "outline" : item.state === "error" ? "destructive" : "secondary"} className={cn("capitalize", item.state === "pending" && "border-amber-200 bg-amber-50 text-amber-700")}>{item.state === "pending" ? "pending review" : item.state}</Badge></div><p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(item.file.size)}{item.passages ? ` · ${item.passages} candidate passages` : ""}</p>{(item.state === "uploading" || item.state === "processing") && <Progress className="mt-2 h-1.5" value={item.progress} />}{item.error && <p className="mt-1 text-xs text-destructive">{item.error}</p>}</div><Button variant="ghost" size="icon" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} disabled={item.state === "uploading" || item.state === "processing"}><X className="size-4" /><span className="sr-only">Remove {item.file.name}</span></Button></div>)}</CardContent></Card>}
      <div className="mt-8 grid gap-4 md:grid-cols-3"><Card className="shadow-none"><CardHeader><div className="mb-2 grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-700"><FileSearch className="size-4" /></div><CardTitle className="text-sm">1. Validate</CardTitle><CardDescription>Enforce file type, batch, size, duplicate, and corpus quota rules.</CardDescription></CardHeader></Card><Card className="shadow-none"><CardHeader><div className="mb-2 grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700"><UploadCloud className="size-4" /></div><CardTitle className="text-sm">2. Quarantine</CardTitle><CardDescription>Preserve the raw file and content hash without granting retrieval authority.</CardDescription></CardHeader></Card><Card className="shadow-none"><CardHeader><div className="mb-2 grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><ShieldCheck className="size-4" /></div><CardTitle className="text-sm">3. Owner review</CardTitle><CardDescription>A Knowledge Owner must approve and publish before Atlas can cite it.</CardDescription></CardHeader></Card></div>
    </div>
  </main>;
}

export function App() {
  const [workspace, setWorkspace] = useState<Workspace>("ask");
  return <TooltipProvider><div className="flex h-dvh overflow-hidden"><Sidebar workspace={workspace} setWorkspace={setWorkspace} />{workspace === "ask" ? <ChatWorkspace onKnowledge={() => setWorkspace("knowledge")} /> : <KnowledgeWorkspace onAsk={() => setWorkspace("ask")} />}</div></TooltipProvider>;
}
