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

**Knowledge Article**:
A canonical, organized view of organizational knowledge whose statements retain provenance to Source Passages.
_Avoid_: Source of truth, generated source

**Knowledge Gap**:
A question or policy area that the available Source Passages cannot support reliably.
_Avoid_: Hallucination, search miss

**Gap Interview**:
A structured exchange with an authorized Knowledge Owner that supplies missing organizational facts for a proposed Knowledge Article.
_Avoid_: User prompt, chat

**Knowledge Owner**:
The authorized person responsible for clarifying and approving knowledge in a specific organizational area.
_Avoid_: Any user, administrator

**Supported Answer**:
An answer whose factual claims are each traceable to one or more displayed Source Passages.
_Avoid_: Confident answer, likely answer

**Safe Refusal**:
A response that declines to invent an answer and records a Knowledge Gap when evidence is absent, insufficient, or conflicting.
_Avoid_: Error, failed answer

**Answer Coverage**:
The share of a fixed evaluation set that receives correct Supported Answers while unsupported cases receive correct Safe Refusals.
_Avoid_: Accuracy, answer rate
