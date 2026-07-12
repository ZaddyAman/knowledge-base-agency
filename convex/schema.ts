import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaces: defineTable({
    ownerViewerId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    accent: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner_updated", ["ownerViewerId", "updatedAt"]),

  conversations: defineTable({
    workspaceId: v.id("workspaces"),
    createdByViewerId: v.string(),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workspace_updated", ["workspaceId", "updatedAt"]),

  messages: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    status: v.string(),
    citations: v.optional(v.array(v.object({
      sourceId: v.string(),
      startLine: v.number(),
      endLine: v.number(),
      excerpt: v.optional(v.string()),
    }))),
    createdAt: v.number(),
  }).index("by_conversation_created", ["conversationId", "createdAt"]),

  documents: defineTable({
    workspaceId: v.id("workspaces"),
    uploadedByViewerId: v.string(),
    storageId: v.id("_storage"),
    originalName: v.string(),
    contentType: v.string(),
    size: v.number(),
    status: v.union(v.literal("queued"), v.literal("ingesting"), v.literal("ready"), v.literal("failed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workspace_updated", ["workspaceId", "updatedAt"]),

  ingestionJobs: defineTable({
    workspaceId: v.id("workspaces"),
    documentId: v.id("documents"),
    state: v.union(v.literal("queued"), v.literal("running"), v.literal("complete"), v.literal("failed")),
    stage: v.string(),
    progress: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    errorCode: v.optional(v.string()),
    warningCode: v.optional(v.string()),
  })
    .index("by_workspace_updated", ["workspaceId", "updatedAt"])
    .index("by_state_created", ["state", "createdAt"])
    .index("by_document", ["documentId"]),

  sourcePassages: defineTable({
    workspaceId: v.id("workspaces"),
    documentId: v.id("documents"),
    ordinal: v.number(),
    text: v.string(),
    startLine: v.number(),
    endLine: v.number(),
    createdAt: v.number(),
  })
    .index("by_workspace_created", ["workspaceId", "createdAt"])
    .index("by_document_ordinal", ["documentId", "ordinal"]),

  runEvents: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.optional(v.id("conversations")),
    runId: v.string(),
    type: v.string(),
    label: v.string(),
    state: v.string(),
    createdAt: v.number(),
  })
    .index("by_conversation_created", ["conversationId", "createdAt"])
    .index("by_run_created", ["runId", "createdAt"]),
});
