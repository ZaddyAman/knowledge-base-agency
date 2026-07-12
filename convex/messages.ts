import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { viewerId: v.string(), conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];
    const workspace = await ctx.db.get(conversation.workspaceId);
    if (!workspace || workspace.ownerViewerId !== args.viewerId) throw new Error("Conversation not found");
    return ctx.db.query("messages").withIndex("by_conversation_created", (q) => q.eq("conversationId", args.conversationId)).order("asc").take(200);
  },
});

export const append = mutation({
  args: {
    viewerId: v.string(), conversationId: v.id("conversations"), role: v.union(v.literal("user"), v.literal("assistant")), content: v.string(), status: v.string(),
    citations: v.optional(v.array(v.object({ sourceId: v.string(), startLine: v.number(), endLine: v.number(), excerpt: v.optional(v.string()) }))),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const workspace = await ctx.db.get(conversation.workspaceId);
    if (!workspace || workspace.ownerViewerId !== args.viewerId) throw new Error("Conversation not found");
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", { workspaceId: conversation.workspaceId, conversationId: args.conversationId, role: args.role, content: args.content.slice(0, 20_000), status: args.status, citations: args.citations, createdAt: now });
    const nextTitle = conversation.title === "New conversation" && args.role === "user" ? args.content.trim().slice(0, 58) || conversation.title : conversation.title;
    await ctx.db.patch(args.conversationId, { title: nextTitle, updatedAt: now });
    return messageId;
  },
});
