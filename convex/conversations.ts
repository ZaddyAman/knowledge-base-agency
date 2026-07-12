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
    return ctx.db.query("conversations").withIndex("by_workspace_updated", (q) => q.eq("workspaceId", args.workspaceId)).order("desc").take(50);
  },
});

export const create = mutation({
  args: { viewerId: v.string(), workspaceId: v.id("workspaces"), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await assertWorkspace(ctx, args.workspaceId, args.viewerId);
    const now = Date.now();
    return ctx.db.insert("conversations", { workspaceId: args.workspaceId, createdByViewerId: args.viewerId, title: args.title?.trim().slice(0, 80) || "New conversation", createdAt: now, updatedAt: now });
  },
});

export const rename = mutation({
  args: { viewerId: v.string(), conversationId: v.id("conversations"), title: v.string() },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    await assertWorkspace(ctx, conversation.workspaceId, args.viewerId);
    await ctx.db.patch(args.conversationId, { title: args.title.trim().slice(0, 80) || "New conversation", updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { viewerId: v.string(), conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;
    await assertWorkspace(ctx, conversation.workspaceId, args.viewerId);
    const messages = await ctx.db.query("messages").withIndex("by_conversation_created", (q) => q.eq("conversationId", args.conversationId)).collect();
    for (const message of messages) await ctx.db.delete(message._id);
    await ctx.db.delete(args.conversationId);
  },
});
