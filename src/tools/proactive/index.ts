/**
 * Proactive Assistance Tools
 * 
 * This module exports all proactive assistance tools that provide intelligent
 * insights and recommendations based on conversation patterns and entity analysis.
 */

export { 
  GetProactiveInsightsTool,
  GetProactiveInsightsSchema,
  type GetProactiveInsightsInput,
  type GetProactiveInsightsResponse,
  type GetProactiveInsightsDependencies
} from './GetProactiveInsightsTool.js';

export { 
  CheckForConflictsTool,
  CheckForConflictsSchema,
  type CheckForConflictsInput,
  type CheckForConflictsResponse,
  type CheckForConflictsDependencies
} from './CheckForConflictsTool.js';

export { 
  SuggestRelevantContextTool,
  SuggestRelevantContextSchema,
  type SuggestRelevantContextInput,
  type SuggestRelevantContextResponse,
  type SuggestRelevantContextDependencies
} from './SuggestRelevantContextTool.js';

export { 
  AutoTagConversationTool,
  AutoTagConversationSchema,
  type AutoTagConversationInput,
  type AutoTagConversationResponse,
  type AutoTagConversationDependencies
} from './AutoTagConversationTool.js';