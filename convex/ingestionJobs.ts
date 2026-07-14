import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export const list = query({
  args: { viewerId: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.ownerViewerId !== args.viewerId) throw new Error("Workspace not found");
    return ctx.db.query("ingestionJobs").withIndex("by_workspace_updated", (q) => q.eq("workspaceId", args.workspaceId)).order("desc").take(100);
  },
});

async function ownedJob(ctx: MutationCtx, jobId: Id<"ingestionJobs">, viewerId: string): Promise<Doc<"ingestionJobs">> {
  const job = await ctx.db.get(jobId);
  if (!job) throw new Error("Ingestion job not found");
  const workspace = await ctx.db.get(job.workspaceId);
  if (!workspace || workspace.ownerViewerId !== viewerId) throw new Error("Ingestion job not found");
  return job;
}

function assertWorker(workerToken: string) {
  if (!process.env.INGESTION_WORKER_TOKEN || workerToken !== process.env.INGESTION_WORKER_TOKEN) throw new Error("Worker authorization failed");
}

export const start = mutation({
  args: { viewerId: v.string(), jobId: v.id("ingestionJobs"), workerToken: v.string() },
  handler: async (ctx, args) => {
    assertWorker(args.workerToken);
    const job = await ownedJob(ctx, args.jobId, args.viewerId);
    if (job.state !== "queued") return null;
    const document = await ctx.db.get(job.documentId);
    if (!document) throw new Error("Document not found");
    const storageUrl = await ctx.storage.getUrl(document.storageId);
    if (!storageUrl) throw new Error("Stored document not found");
    const now = Date.now();
    await ctx.db.patch(job._id, { state: "running", stage: "Hermes structuring", progress: 15, errorCode: undefined, warningCode: undefined, updatedAt: now });
    await ctx.db.patch(document._id, { status: "ingesting", updatedAt: now });
    return { storageUrl, documentId: document._id, name: document.originalName, workspaceId: document.workspaceId };
  },
});

export const progress = mutation({
  args: { viewerId: v.string(), jobId: v.id("ingestionJobs"), workerToken: v.string(), stage: v.string(), progress: v.number() },
  handler: async (ctx, args) => { assertWorker(args.workerToken); const job = await ownedJob(ctx, args.jobId, args.viewerId); if (job.state !== "running") throw new Error("Ingestion job is not running"); await ctx.db.patch(job._id, { stage: args.stage, progress: Math.max(0, Math.min(100, args.progress)), updatedAt: Date.now() }); },
});

export const complete = mutation({
  args: { viewerId: v.string(), jobId: v.id("ingestionJobs"), workerToken: v.string(), warningCode: v.optional(v.string()), structureReceipt: v.optional(v.string()), passages: v.array(v.object({ text: v.string(), startLine: v.number(), endLine: v.number() })) },
  handler: async (ctx, args) => {
    assertWorker(args.workerToken);
    const job = await ownedJob(ctx, args.jobId, args.viewerId);
    if (job.state !== "running") throw new Error("Ingestion job is not running");
    const existing = await ctx.db.query("sourcePassages").withIndex("by_document_ordinal", (q) => q.eq("documentId", job.documentId)).collect();
    for (const passage of existing) await ctx.db.delete(passage._id);
    const now = Date.now();
    for (const [ordinal, passage] of args.passages.slice(0, 100).entries()) await ctx.db.insert("sourcePassages", { workspaceId: job.workspaceId, documentId: job.documentId, ordinal, text: passage.text.slice(0, 4000), startLine: passage.startLine, endLine: passage.endLine, published: false, createdAt: now });
    await ctx.db.patch(job.documentId, { status: "review", structureReceipt: args.structureReceipt?.slice(0, 8_000), updatedAt: now });
    await ctx.db.patch(job._id, {
      state: "complete",
      stage: args.warningCode ? "Owner review · Hermes receipt unavailable" : "Awaiting owner publication",
      progress: 100,
      errorCode: undefined,
      warningCode: args.warningCode,
      updatedAt: now,
    });
  },
});

export const fail = mutation({
  args: { viewerId: v.string(), jobId: v.id("ingestionJobs"), workerToken: v.string(), errorCode: v.string() },
  handler: async (ctx, args) => { assertWorker(args.workerToken); const job = await ownedJob(ctx, args.jobId, args.viewerId); const now = Date.now(); await ctx.db.patch(job.documentId, { status: "failed", updatedAt: now }); await ctx.db.patch(job._id, { state: "failed", stage: "Ingestion failed", errorCode: args.errorCode, updatedAt: now }); },
});

export const retry = mutation({
  args: { viewerId: v.string(), jobId: v.id("ingestionJobs") },
  handler: async (ctx, args) => {
    const job = await ownedJob(ctx, args.jobId, args.viewerId);
    if (job.state !== "failed") return;
    const now = Date.now();
    await ctx.db.patch(job.documentId, { status: "queued", updatedAt: now });
    await ctx.db.patch(job._id, { state: "queued", stage: "Awaiting Hermes", progress: 0, errorCode: undefined, warningCode: undefined, updatedAt: now });
  },
});
