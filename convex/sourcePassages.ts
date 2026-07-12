import { v } from "convex/values";
import { query } from "./_generated/server";

export const forWorkspace = query({
  args: { viewerId: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.ownerViewerId !== args.viewerId) throw new Error("Workspace not found");
    const passages = await ctx.db.query("sourcePassages").withIndex("by_workspace_created", (q) => q.eq("workspaceId", args.workspaceId)).order("desc").take(200);
    return Promise.all(passages.map(async (passage) => {
      const document = await ctx.db.get(passage.documentId);
      return { path: `convex/${passage.documentId}/${document?.originalName ?? "document"}#passage-${passage.ordinal}`, hash: `convex:${passage.documentId}`, text: passage.text, startLine: passage.startLine, endLine: passage.endLine };
    }));
  },
});
