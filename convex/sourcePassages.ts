import { v } from "convex/values";
import { query } from "./_generated/server";

export const forWorkspace = query({
  args: { viewerId: v.string(), workspaceId: v.id("workspaces"), search: v.string() },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.ownerViewerId !== args.viewerId) throw new Error("Workspace not found");
    const search = args.search.trim().slice(0, 500);
    if (!search) return [];
    const passages = await ctx.db.query("sourcePassages").withSearchIndex("search_text", (q) => q.search("text", search).eq("workspaceId", args.workspaceId).eq("published", true)).take(24);
    return Promise.all(passages.map(async (passage) => {
      const document = await ctx.db.get(passage.documentId);
      if (!document || document.status !== "published") throw new Error("Published passage is missing its document");
      return { path: `convex/${passage.documentId}/${document.originalName}#passage-${passage.ordinal}`, hash: `convex:${passage.documentId}`, text: passage.text, startLine: passage.startLine, endLine: passage.endLine };
    }));
  },
});
