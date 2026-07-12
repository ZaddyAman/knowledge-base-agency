# Knowledge Operations

This context describes the organizational knowledge lifecycle: evidence enters the agency, becomes navigable knowledge, supports answers, and exposes what the organization has not documented.

## Language

**Knowledge Base Agency**:
The managed agent organization that structures evidence, answers questions, identifies missing knowledge, and prepares approved additions to the knowledge base.
_Avoid_: Chatbot, PDF chat, RAG app

**Source Document**:
An original uploaded file or pasted transcript treated as immutable organizational evidence.
_Avoid_: Wiki page, generated document

**Source Passage**:
A location-addressable excerpt from a Source Document that can directly support an answer or Knowledge Article statement.
_Avoid_: Chunk, context blob

**Supersession**:
An explicit, Knowledge Owner-approved declaration that a Source Document replaces another Source Document within a stated scope. Without Supersession, newer or generated material cannot silently override existing evidence.
_Avoid_: Latest wins, automatic override

**Evidence Conflict**:
A disagreement between active Source Documents that cannot be resolved by an explicit Supersession. The conflicting evidence remains visible until a Knowledge Owner resolves it.
_Avoid_: Newest source wins, retrieval error

**Freshness Warning**:
A notice that active evidence may need owner review because of age. Age alone does not revoke authority; an explicit passed expiry does.
_Avoid_: Invalid source, automatic expiry

**Knowledge Article**:
A canonical, organized view of organizational knowledge whose statements retain provenance to Source Passages.
_Avoid_: Source of truth, generated source

**Interview-backed Knowledge Article**:
An approved Knowledge Article whose organizational facts originate in a Gap Interview rather than an uploaded Source Document. Answers cite the article while its source details preserve a link to the interview and Approval.
_Avoid_: Synthetic source, AI policy

**Knowledge Gap**:
A question or policy area that the available Source Passages cannot support reliably.
_Avoid_: Hallucination, search miss

**Gap Interview**:
A structured exchange with an authorized Knowledge Owner that supplies missing organizational facts for a proposed Knowledge Article.
_Avoid_: User prompt, chat

**Knowledge Owner**:
The authorized person responsible for clarifying and approving knowledge in a specific organizational area.
_Avoid_: Any user, administrator

**Knowledge Consumer**:
A person who asks questions and submits answer feedback but cannot answer Gap Interviews, approve Knowledge Articles, or declare Supersession.
_Avoid_: Knowledge Owner, editor

**Approval**:
An explicit Knowledge Owner action that authorizes a reviewed draft for publication validation while preserving its Gap Interview, edits, owner, and timestamp as provenance. Approval alone does not make the draft active.
_Avoid_: Generated, saved, completed

**Publication**:
The validation-gated transition that makes an approved Knowledge Article active for retrieval after indexing, citation resolution, and affected evaluations pass without regression.
_Avoid_: Approval, save, index

**Supported Answer**:
An answer whose factual claims are each traceable to one or more displayed Source Passages.
_Avoid_: Confident answer, likely answer

**Partially Supported Answer**:
An answer that includes only the claims supported by Source Passages, explicitly names the unanswered portion, and records that portion as a Knowledge Gap.
_Avoid_: Best-effort answer, inferred answer

**Valid Citation**:
A claim-to-evidence reference that resolves to an active Source Document or approved Knowledge Article, identifies an exact location and matching excerpt, and supports the associated factual claim.
_Avoid_: Source-shaped output, related link

**Safe Refusal**:
A response that declines to invent an answer and records a Knowledge Gap when evidence is absent, insufficient, or conflicting.
_Avoid_: Error, failed answer

**Sources Reviewed**:
Evidence inspected while producing a Safe Refusal but insufficient to support the requested claim. Sources Reviewed are displayed separately and never count as Valid Citations.
_Avoid_: Supporting citations, answer sources

**Answer Coverage**:
The share of a fixed evaluation set that receives correct Supported Answers while unsupported cases receive correct Safe Refusals.
_Avoid_: Accuracy, answer rate

**Answer Challenge**:
A Knowledge Consumer's negative feedback linked to the exact question, answer, and citations for Retrieval QA review. It does not change evidence authority by itself.
_Avoid_: Knowledge Gap, source rejection
