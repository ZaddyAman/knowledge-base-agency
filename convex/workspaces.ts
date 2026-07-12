import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { viewerId: v.string() },
  handler: async (ctx, { viewerId }) => ctx.db.query("workspaces")
    .withIndex("by_owner_updated", (q) => q.eq("ownerViewerId", viewerId))
    .order("desc")
    .take(25),
});

export const ensureDefault = mutation({
  args: { viewerId: v.string() },
  handler: async (ctx, { viewerId }) => {
    const existing = await ctx.db.query("workspaces")
      .withIndex("by_owner_updated", (q) => q.eq("ownerViewerId", viewerId))
      .order("desc")
      .first();
    if (existing) return existing._id;
    const now = Date.now();
    return ctx.db.insert("workspaces", { ownerViewerId: viewerId, name: "My knowledge base", description: "Company policies and operating knowledge", accent: "blue", createdAt: now, updatedAt: now });
  },
});

export const create = mutation({
  args: { viewerId: v.string(), name: v.string() },
  handler: async (ctx, { viewerId, name }) => {
    const trimmed = name.trim().slice(0, 80);
    if (!trimmed) throw new Error("Workspace name is required");
    const now = Date.now();
    return ctx.db.insert("workspaces", { ownerViewerId: viewerId, name: trimmed, description: "Knowledge workspace", accent: "blue", createdAt: now, updatedAt: now });
  },
});

export const rename = mutation({
  args: { viewerId: v.string(), workspaceId: v.id("workspaces"), name: v.string() },
  handler: async (ctx, { viewerId, workspaceId, name }) => {
    const workspace = await ctx.db.get(workspaceId);
    if (!workspace || workspace.ownerViewerId !== viewerId) throw new Error("Workspace not found");
    const trimmed = name.trim().slice(0, 80);
    if (!trimmed) throw new Error("Workspace name is required");
    await ctx.db.patch(workspaceId, { name: trimmed, updatedAt: Date.now() });
  },
});
