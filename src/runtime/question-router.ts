export type QuestionRoute =
  | { kind: "conversation"; answer: string }
  | { kind: "out_of_scope"; answer: string }
  | { kind: "knowledge" }
  | { kind: "classify" };

const greetingPattern = /^(?:hi|hello|hey|hiya|howdy|good\s+(?:morning|afternoon|evening))(?:\s+(?:atlas|there|team))?[!.?\s]*$/i;
const thanksPattern = /^(?:thanks|thank\s+you|thx|cheers)[!.?\s]*$/i;
const capabilityPattern = /^(?:help|what can you do|who are you)[!.?\s]*$/i;

// The demo workspace is intentionally bounded to its twelve handbook sources.
// Keeping the vocabulary explicit makes routing predictable and prevents an
// unrelated prompt from spending a full Hermes retrieval run.
const unrelatedTopicPattern = /\b(?:weather|forecast|sports?\s+(?:score|result)|stock\s+price|crypto(?:currency)?\s+price|recipe|cook(?:ing)?|programming|write\s+(?:code|a\s+function)|debug\s+(?:code|javascript|python)|solve\s+(?:this\s+)?(?:equation|math)|translate\s+(?:this|to|into)|capital\s+of|latest\s+news|tell\s+me\s+(?:a\s+)?(?:joke|story)|write\s+(?:a\s+)?(?:poem|song)|movie\s+recommendation|medical\s+(?:advice|diagnosis)|symptoms?)\b/i;
const organizationIntentPattern = /\b(?:handbook|policy|policies|people\s+ops|manager|meeting|offsite|communication|slack|security|phishing|password|device|equipment|benefit|insurance|expense|expenses|spend|spending|reimburse|reimbursement|finance|invoice|company\s+card|purchase|approval|approve|onboard|onboarding|side\s+gig|time\s+off|vacation|holiday|leave|sick|customer\s+support|support\s+(?:ticket|incident)|incident\s+response|escalation|remote\s+work|home\s+office|work\s+travel|cross-border|work\s+from\s+(?:another|a)\s+country|work\s+abroad)\b/i;

export function routeQuestion(question: string): QuestionRoute {
  const normalized = question.trim();

  if (greetingPattern.test(normalized)) {
    return {
      kind: "conversation",
      answer: "Hi! Ask me anything about the PostHog team handbook, policies, or operations.",
    };
  }

  if (thanksPattern.test(normalized)) {
    return { kind: "conversation", answer: "You’re welcome! What else would you like to know about the workspace?" };
  }

  if (capabilityPattern.test(normalized)) {
    return {
      kind: "conversation",
      answer: "I answer questions from this workspace’s company handbook and show the exact source for every supported answer.",
    };
  }

  if (organizationIntentPattern.test(normalized)) {
    return { kind: "knowledge" };
  }

  if (unrelatedTopicPattern.test(normalized)) {
    return {
      kind: "out_of_scope",
      answer: "I can only answer questions about this workspace's company handbook, policies, and operations.",
    };
  }

  return { kind: "classify" };
}
