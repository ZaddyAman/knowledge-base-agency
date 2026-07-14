import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function assertWorkspace(ctx: QueryCtx | MutationCtx, workspaceId: Id<"workspaces">, viewerId: string) {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace || workspace.ownerViewerId !== viewerId) throw new Error("Workspace not found");
}

export const list = query({
  args: { viewerId: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await assertWorkspace(ctx, args.workspaceId, args.viewerId);
    return ctx.db.query("documents").withIndex("by_workspace_updated", (q) => q.eq("workspaceId", args.workspaceId)).order("desc").take(100);
  },
});

export const generateUploadUrl = mutation({
  args: { viewerId: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await assertWorkspace(ctx, args.workspaceId, args.viewerId);
    const documents = await ctx.db.query("documents").withIndex("by_workspace_updated", (q) => q.eq("workspaceId", args.workspaceId)).take(101);
    if (documents.length >= 100) throw new Error("Workspace document quota reached");
    return ctx.storage.generateUploadUrl();
  },
});

export const completeUpload = mutation({
  args: { viewerId: v.string(), workspaceId: v.id("workspaces"), storageId: v.id("_storage"), originalName: v.string(), contentType: v.string(), size: v.number() },
  handler: async (ctx, args) => {
    await assertWorkspace(ctx, args.workspaceId, args.viewerId);
    const storedFile = await ctx.db.system.get(args.storageId);
    if (!storedFile) throw new Error("Stored document not found");
    if (storedFile.size > 256 * 1024) throw new Error("File exceeds the 256 KB limit");
    const extension = args.originalName.split(".").pop()?.toLowerCase();
    if (extension !== "md" && extension !== "txt") throw new Error("Unsupported document type");
    const now = Date.now();
    const documentId = await ctx.db.insert("documents", { workspaceId: args.workspaceId, uploadedByViewerId: args.viewerId, storageId: args.storageId, originalName: args.originalName.slice(0, 180), contentType: storedFile.contentType ?? args.contentType, size: storedFile.size, status: "queued", createdAt: now, updatedAt: now });
    const jobId = await ctx.db.insert("ingestionJobs", { workspaceId: args.workspaceId, documentId, state: "queued", stage: "Awaiting Hermes", progress: 0, createdAt: now, updatedAt: now });
    return { documentId, jobId };
  },
});

export const publish = mutation({
  args: { viewerId: v.string(), documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");
    await assertWorkspace(ctx, document.workspaceId, args.viewerId);
    if (document.status !== "review" && document.status !== "ready") throw new Error("Document is not ready for owner review");
    const passages = await ctx.db.query("sourcePassages").withIndex("by_document_ordinal", (q) => q.eq("documentId", document._id)).take(100);
    for (const passage of passages) await ctx.db.patch(passage._id, { published: true });
    await ctx.db.patch(document._id, { status: "published", publishedAt: Date.now(), updatedAt: Date.now() });
  },
});
