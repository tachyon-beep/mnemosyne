/**
 * Decision Tracker
 *
 * Tracks and analyzes decision-making patterns in conversations:
 * - Decision identification and extraction
 * - Timeline tracking (problem -> decision -> outcome)
 * - Quality assessment and factor analysis
 * - Outcome tracking and effectiveness measurement
 * - Decision pattern recognition
 * - Recommendation generation for improvement
 */
/**
 * Tracks decisions and analyzes decision-making effectiveness
 */
export class DecisionTracker {
    DECISION_KEYWORDS = [
        'decide', 'decided', 'decision', 'choose', 'chose', 'choice',
        'select', 'selected', 'pick', 'picked', 'go with', 'opt for'
    ];
    PROBLEM_KEYWORDS = [
        'problem', 'issue', 'challenge', 'difficulty', 'question',
        'dilemma', 'situation', 'need to', 'how to', 'what should'
    ];
    OPTION_KEYWORDS = [
        'option', 'alternative', 'possibility', 'choice', 'approach',
        'way', 'method', 'solution', 'either', 'or', 'versus', 'vs'
    ];
    OUTCOME_KEYWORDS = [
        'result', 'outcome', 'consequence', 'worked', 'failed',
        'successful', 'effective', 'didn\'t work', 'backfired'
    ];
    /**
     * Track decisions in a conversation
     */
    async trackDecisions(conversation, messages) {
        try {
            if (!conversation || !messages) {
                console.warn('DecisionTracker: Invalid input parameters');
                return [];
            }
            if (messages.length === 0) {
                return [];
            }
            // Step 1: Identify decision points in the conversation
            const decisionCandidates = this.safeIdentifyDecisionCandidates(messages);
            // Step 2: Analyze each decision with error handling
            const decisions = [];
            for (const candidate of decisionCandidates) {
                try {
                    if (!candidate) {
                        continue;
                    }
                    const decision = await this.safeAnalyzeDecision(conversation, messages, candidate);
                    if (decision) {
                        decisions.push(decision);
                    }
                }
                catch (candidateError) {
                    console.warn('DecisionTracker: Error analyzing decision candidate:', candidateError);
                    continue;
                }
            }
            return decisions;
        }
        catch (error) {
            console.error('DecisionTracker: Failed to track decisions:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                conversationId: conversation?.id,
                messageCount: messages?.length
            });
            return [];
        }
    }
    /**
     * Analyze decision quality for a conversation
     */
    async analyzeDecisionQuality(conversation, messages, decisions) {
        try {
            if (!conversation || !messages) {
                console.warn('DecisionTracker: Invalid input parameters for quality analysis');
                return this.createEmptyQualityMetrics(conversation?.id || 'unknown');
            }
            const trackedDecisions = decisions || await this.safeTrackDecisions(conversation, messages);
            if (trackedDecisions.length === 0) {
                return this.createEmptyQualityMetrics(conversation.id);
            }
            // Calculate quality metrics with error handling
            const averageClarityScore = this.safeCalculateAverage(trackedDecisions.map(d => d.clarityScore));
            const averageConfidenceLevel = this.safeCalculateAverage(trackedDecisions.map(d => d.confidenceLevel));
            const averageInformationCompleteness = this.safeCalculateAverage(trackedDecisions.map(d => d.informationCompleteness));
            // Calculate timing metrics with error handling
            const decisionTimes = this.safeCalculateDecisionTimes(trackedDecisions);
            const implementationTimes = this.safeCalculateImplementationTimes(trackedDecisions);
            // Calculate outcome metrics with error handling
            const successRate = this.safeCalculateSuccessRate(trackedDecisions);
            const reversalRate = this.safeCalculateReversalRate(trackedDecisions);
            const modificationRate = this.safeCalculateModificationRate(trackedDecisions);
            // Analyze factors with error handling
            const { importantFactors, riskFactors } = this.safeAnalyzeDecisionFactors(trackedDecisions);
            return {
                conversationId: conversation.id,
                totalDecisions: Math.max(0, trackedDecisions.length),
                averageClarityScore: Math.max(0, Math.min(100, averageClarityScore)),
                averageConfidenceLevel: Math.max(0, Math.min(100, averageConfidenceLevel)),
                averageInformationCompleteness: Math.max(0, Math.min(100, averageInformationCompleteness)),
                averageDecisionTime: Math.max(0, decisionTimes.average),
                averageImplementationTime: Math.max(0, implementationTimes.average),
                successRate: Math.max(0, Math.min(100, successRate)),
                reversalRate: Math.max(0, Math.min(100, reversalRate)),
                modificationRate: Math.max(0, Math.min(100, modificationRate)),
                mostImportantFactors: importantFactors || [],
                biggestRiskFactors: riskFactors || []
            };
        }
        catch (error) {
            console.error('DecisionTracker: Failed to analyze decision quality:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                conversationId: conversation?.id,
                messageCount: messages?.length
            });
            return this.createEmptyQualityMetrics(conversation?.id || 'unknown');
        }
    }
    /**
     * Detect decision patterns across conversations
     */
    async detectDecisionPatterns(conversationsWithDecisions) {
        try {
            if (!conversationsWithDecisions || conversationsWithDecisions.length === 0) {
                console.warn('DecisionTracker: No conversation data provided for pattern detection');
                return [];
            }
            // Safely extract decisions with error handling
            const allDecisions = [];
            for (const item of conversationsWithDecisions) {
                try {
                    if (item?.decisions && Array.isArray(item.decisions)) {
                        allDecisions.push(...item.decisions.filter(d => d && typeof d === 'object'));
                    }
                }
                catch (itemError) {
                    console.warn('DecisionTracker: Error processing conversation decisions:', itemError);
                    continue;
                }
            }
            if (allDecisions.length < 5) {
                console.info('DecisionTracker: Insufficient decisions for pattern detection');
                return []; // Need minimum decisions for pattern detection
            }
            // Group decisions by similar characteristics with error handling
            const patternGroups = this.safeGroupDecisionsByPattern(allDecisions);
            const patterns = [];
            for (const [patternKey, decisions] of patternGroups.entries()) {
                try {
                    if (!patternKey || !decisions || decisions.length < 3) {
                        continue; // Minimum for a pattern
                    }
                    const pattern = this.safeAnalyzeDecisionPattern(patternKey, decisions);
                    if (pattern) {
                        patterns.push(pattern);
                    }
                }
                catch (patternError) {
                    console.warn(`DecisionTracker: Error analyzing pattern '${patternKey}':`, patternError);
                    continue;
                }
            }
            return patterns.sort((a, b) => {
                try {
                    const scoreA = (a.frequency || 0) * (a.successRate || 0);
                    const scoreB = (b.frequency || 0) * (b.successRate || 0);
                    return scoreB - scoreA;
                }
                catch (sortError) {
                    return 0;
                }
            });
        }
        catch (error) {
            console.error('DecisionTracker: Failed to detect decision patterns:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                dataCount: conversationsWithDecisions?.length
            });
            return [];
        }
    }
    /**
     * Generate decision timeline analysis
     */
    async generateDecisionTimeline(conversation, messages, decision) {
        try {
            if (!conversation || !messages || !decision) {
                console.warn('DecisionTracker: Invalid input parameters for timeline generation');
                return this.createEmptyDecisionTimeline(decision?.id || 'unknown');
            }
            const phases = [];
            // Find messages related to each phase with error handling
            const phaseMessages = this.safeMapMessagesToPhases(messages, decision);
            // Analyze each phase with error handling
            for (const [phase, msgs] of Object.entries(phaseMessages)) {
                try {
                    if (msgs && msgs.length > 0) {
                        const phaseAnalysis = this.safeAnalyzeDecisionPhase(phase, msgs);
                        if (phaseAnalysis) {
                            phases.push(phaseAnalysis);
                        }
                    }
                }
                catch (phaseError) {
                    console.warn(`DecisionTracker: Error analyzing phase '${phase}':`, phaseError);
                    continue;
                }
            }
            // Sort phases by timestamp with error handling
            phases.sort((a, b) => {
                try {
                    return (a.timestamp || 0) - (b.timestamp || 0);
                }
                catch (sortError) {
                    return 0;
                }
            });
            // Calculate timeline metrics with error handling
            const totalDuration = this.safeCalculateTotalDuration(phases);
            const efficiency = this.safeCalculateTimelineEfficiency(phases);
            const completeness = this.safeCalculateTimelineCompleteness(phases);
            return {
                decisionId: decision.id || 'unknown',
                phases,
                totalDuration: Math.max(0, totalDuration),
                efficiency: Math.max(0, Math.min(100, efficiency)),
                completeness: Math.max(0, Math.min(100, completeness))
            };
        }
        catch (error) {
            console.error('DecisionTracker: Failed to generate decision timeline:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                conversationId: conversation?.id,
                decisionId: decision?.id
            });
            return this.createEmptyDecisionTimeline(decision?.id || 'unknown');
        }
    }
    /**
     * Safe wrapper methods for error handling
     */
    async safeTrackDecisions(conversation, messages) {
        try {
            return await this.trackDecisions(conversation, messages);
        }
        catch (error) {
            console.warn('DecisionTracker: Error tracking decisions:', error);
            return [];
        }
    }
    safeIdentifyDecisionCandidates(messages) {
        try {
            return this.identifyDecisionCandidates(messages);
        }
        catch (error) {
            console.warn('DecisionTracker: Error identifying decision candidates:', error);
            return [];
        }
    }
    async safeAnalyzeDecision(conversation, messages, candidate) {
        try {
            return await this.analyzeDecision(conversation, messages, candidate);
        }
        catch (error) {
            console.warn('DecisionTracker: Error analyzing decision:', error);
            return null;
        }
    }
    safeCalculateAverage(values) {
        try {
            return this.calculateAverage(values);
        }
        catch (error) {
            console.warn('DecisionTracker: Error calculating average:', error);
            return 0;
        }
    }
    safeCalculateDecisionTimes(decisions) {
        try {
            return this.calculateDecisionTimes(decisions);
        }
        catch (error) {
            console.warn('DecisionTracker: Error calculating decision times:', error);
            return { average: 0, median: 0 };
        }
    }
    safeCalculateImplementationTimes(decisions) {
        try {
            return this.calculateImplementationTimes(decisions);
        }
        catch (error) {
            console.warn('DecisionTracker: Error calculating implementation times:', error);
            return { average: 0, median: 0 };
        }
    }
    safeCalculateSuccessRate(decisions) {
        try {
            return this.calculateSuccessRate(decisions);
        }
        catch (error) {
            console.warn('DecisionTracker: Error calculating success rate:', error);
            return 0;
        }
    }
    safeCalculateReversalRate(decisions) {
        try {
            return this.calculateReversalRate(decisions);
        }
        catch (error) {
            console.warn('DecisionTracker: Error calculating reversal rate:', error);
            return 0;
        }
    }
    safeCalculateModificationRate(decisions) {
        try {
            return this.calculateModificationRate(decisions);
        }
        catch (error) {
            console.warn('DecisionTracker: Error calculating modification rate:', error);
            return 0;
        }
    }
    safeAnalyzeDecisionFactors(decisions) {
        try {
            return this.analyzeDecisionFactors(decisions);
        }
        catch (error) {
            console.warn('DecisionTracker: Error analyzing decision factors:', error);
            return { importantFactors: [], riskFactors: [] };
        }
    }
    safeGroupDecisionsByPattern(decisions) {
        try {
            return this.groupDecisionsByPattern(decisions);
        }
        catch (error) {
            console.warn('DecisionTracker: Error grouping decisions by pattern:', error);
            return new Map();
        }
    }
    safeAnalyzeDecisionPattern(patternKey, decisions) {
        try {
            return this.analyzeDecisionPattern(patternKey, decisions);
        }
        catch (error) {
            console.warn(`DecisionTracker: Error analyzing pattern '${patternKey}':`, error);
            return null;
        }
    }
    safeMapMessagesToPhases(messages, decision) {
        try {
            return this.mapMessagesToPhases(messages, decision);
        }
        catch (error) {
            console.warn('DecisionTracker: Error mapping messages to phases:', error);
            return {};
        }
    }
    safeAnalyzeDecisionPhase(phase, messages) {
        try {
            return this.analyzeDecisionPhase(phase, messages);
        }
        catch (error) {
            console.warn(`DecisionTracker: Error analyzing phase '${phase}':`, error);
            return null;
        }
    }
    safeCalculateTotalDuration(phases) {
        try {
            if (!phases || phases.length === 0) {
                return 0;
            }
            const validPhases = phases.filter(p => p && isFinite(p.timestamp));
            if (validPhases.length === 0) {
                return 0;
            }
            const firstTimestamp = Math.min(...validPhases.map(p => p.timestamp));
            const lastTimestamp = Math.max(...validPhases.map(p => p.timestamp));
            return Math.max(0, lastTimestamp - firstTimestamp);
        }
        catch (error) {
            console.warn('DecisionTracker: Error calculating total duration:', error);
            return 0;
        }
    }
    safeCalculateTimelineEfficiency(phases) {
        try {
            return this.calculateTimelineEfficiency(phases);
        }
        catch (error) {
            console.warn('DecisionTracker: Error calculating timeline efficiency:', error);
            return 0;
        }
    }
    safeCalculateTimelineCompleteness(phases) {
        try {
            return this.calculateTimelineCompleteness(phases);
        }
        catch (error) {
            console.warn('DecisionTracker: Error calculating timeline completeness:', error);
            return 0;
        }
    }
    createEmptyDecisionTimeline(decisionId) {
        return {
            decisionId,
            phases: [],
            totalDuration: 0,
            efficiency: 0,
            completeness: 0
        };
    }
    /**
     * Private helper methods
     */
    identifyDecisionCandidates(messages) {
        if (!messages || !Array.isArray(messages)) {
            return [];
        }
        const candidates = [];
        for (let i = 0; i < messages.length; i++) {
            try {
                const message = messages[i];
                if (!message || !message.content || typeof message.content !== 'string') {
                    continue;
                }
                const decisionIndicators = this.safeFindDecisionIndicators(message.content);
                if (decisionIndicators.length > 0) {
                    for (const indicator of decisionIndicators) {
                        try {
                            if (indicator && isFinite(indicator.confidence) && indicator.text) {
                                candidates.push({
                                    messageIndex: i,
                                    message,
                                    confidence: Math.max(0, Math.min(1, indicator.confidence)),
                                    decisionText: indicator.text
                                });
                            }
                        }
                        catch (indicatorError) {
                            console.warn('DecisionTracker: Error processing decision indicator:', indicatorError);
                            continue;
                        }
                    }
                }
            }
            catch (messageError) {
                console.warn('DecisionTracker: Error processing message for decision candidates:', messageError);
                continue;
            }
        }
        // Filter out low-confidence candidates with error handling
        return candidates.filter(c => {
            try {
                return c && c.confidence > 0.6;
            }
            catch (filterError) {
                return false;
            }
        });
    }
    safeFindDecisionIndicators(content) {
        try {
            return this.findDecisionIndicators(content);
        }
        catch (error) {
            console.warn('DecisionTracker: Error finding decision indicators:', error);
            return [];
        }
    }
    findDecisionIndicators(content) {
        try {
            if (!content || typeof content !== 'string') {
                return [];
            }
            const indicators = [];
            const sentences = content.split(/[.!?]+/);
            for (const sentence of sentences) {
                try {
                    const trimmed = sentence.trim();
                    if (trimmed.length < 10)
                        continue;
                    const hasDecisionKeyword = this.DECISION_KEYWORDS.some(keyword => {
                        try {
                            return keyword && trimmed.toLowerCase().includes(keyword);
                        }
                        catch (keywordError) {
                            return false;
                        }
                    });
                    if (hasDecisionKeyword) {
                        let confidence = 0.5;
                        try {
                            // Boost confidence for explicit decision language
                            if (/\b(decided|decision|choose|chose)\b/i.test(trimmed)) {
                                confidence += 0.3;
                            }
                            // Boost confidence for comparative language (options being weighed)
                            if (/(better|worse|prefer|rather|instead)/.test(trimmed.toLowerCase())) {
                                confidence += 0.2;
                            }
                            // Boost confidence for definitive language
                            if (/(will|going to|plan to|definitely)/.test(trimmed.toLowerCase())) {
                                confidence += 0.2;
                            }
                            // Reduce confidence for questions
                            if (trimmed.includes('?')) {
                                confidence -= 0.3;
                            }
                        }
                        catch (confidenceError) {
                            console.warn('DecisionTracker: Error calculating confidence:', confidenceError);
                            confidence = 0.5; // Default confidence
                        }
                        if (confidence > 0.4) {
                            indicators.push({
                                text: trimmed,
                                confidence: Math.min(1, Math.max(0, confidence))
                            });
                        }
                    }
                }
                catch (sentenceError) {
                    console.warn('DecisionTracker: Error processing sentence for indicators:', sentenceError);
                    continue;
                }
            }
            return indicators;
        }
        catch (error) {
            console.warn('DecisionTracker: Error finding decision indicators:', error);
            return [];
        }
    }
    async analyzeDecision(conversation, messages, candidate) {
        const decisionMessage = candidate.message;
        const messageIndex = candidate.messageIndex;
        // Get context messages around the decision
        const contextStart = Math.max(0, messageIndex - 5);
        const contextEnd = Math.min(messages.length, messageIndex + 5);
        const contextMessages = messages.slice(contextStart, contextEnd);
        // Extract decision details
        const decisionSummary = this.extractDecisionSummary(candidate.decisionText, contextMessages);
        const decisionType = this.classifyDecisionType(decisionSummary, contextMessages);
        // Analyze timeline
        const timeline = this.extractDecisionTimeline(messages, messageIndex);
        // Assess quality factors
        const clarityScore = this.assessDecisionClarity(candidate.decisionText, contextMessages);
        const confidenceLevel = this.assessConfidenceLevel(candidate.decisionText, contextMessages);
        const informationCompleteness = this.assessInformationCompleteness(contextMessages);
        // Analyze decision factors
        const factors = this.analyzeDecisionContext(contextMessages);
        // Look for outcomes
        const outcome = this.findDecisionOutcome(messages, messageIndex);
        const decision = {
            id: this.generateDecisionId(conversation.id, messageIndex),
            conversationId: conversation.id,
            decisionSummary,
            decisionType,
            context: this.extractContext(contextMessages),
            ...timeline,
            decisionMadeAt: decisionMessage.createdAt,
            clarityScore,
            confidenceLevel,
            consensusLevel: 100, // Assume single-person decision for now
            informationCompleteness,
            alternativesConsidered: factors.alternatives,
            stakeholderCount: factors.stakeholders,
            riskAssessment: factors.riskAssessed,
            timeConstraints: factors.timeConstraints,
            resourceConstraints: factors.resourceConstraints,
            outcomeScore: outcome.score,
            reversalCount: outcome.reversals,
            modificationCount: outcome.modifications,
            successFactors: this.extractSuccessFactors(contextMessages),
            failureFactors: this.extractFailureFactors(contextMessages),
            lessonsLearned: this.extractLessonsLearned(contextMessages),
            tags: this.generateDecisionTags(decisionSummary, contextMessages),
            priority: this.assessDecisionPriority(decisionSummary, contextMessages),
            complexity: this.assessDecisionComplexity(decisionSummary, contextMessages, factors)
        };
        return decision;
    }
    extractDecisionSummary(decisionText, contextMessages) {
        // Extract a concise summary of what was decided
        let summary = decisionText.trim();
        // Clean up the text
        summary = summary.replace(/^(i've?|we've?|i'm|we're)/i, '').trim();
        summary = summary.replace(/^(decided|decision|choose|chose|selected)/i, '').trim();
        // If too short, look for more context
        if (summary.length < 20) {
            for (const message of contextMessages) {
                if (message.content.includes(decisionText.substring(0, 10))) {
                    const sentences = message.content.split(/[.!?]+/);
                    for (const sentence of sentences) {
                        if (sentence.length > 20 && sentence.length < 200) {
                            summary = sentence.trim();
                            break;
                        }
                    }
                    if (summary.length >= 20)
                        break;
                }
            }
        }
        return summary.length > 150 ? summary.substring(0, 150) + '...' : summary;
    }
    classifyDecisionType(summary, contextMessages) {
        const content = summary + ' ' + contextMessages.map(m => m.content).join(' ');
        const lower = content.toLowerCase();
        // Strategic indicators
        if (/(long.term|strategy|vision|direction|future|goal)/.test(lower)) {
            return 'strategic';
        }
        // Tactical indicators
        if (/(approach|method|technique|plan|tactic)/.test(lower)) {
            return 'tactical';
        }
        // Operational indicators
        if (/(process|procedure|workflow|implementation|execution)/.test(lower)) {
            return 'operational';
        }
        // Default to personal for individual decisions
        return 'personal';
    }
    extractDecisionTimeline(messages, decisionIndex) {
        const timeline = {};
        // Look backwards for problem identification
        for (let i = Math.max(0, decisionIndex - 10); i < decisionIndex; i++) {
            const message = messages[i];
            if (this.PROBLEM_KEYWORDS.some(keyword => message.content.toLowerCase().includes(keyword))) {
                timeline.problemIdentifiedAt = message.createdAt;
                break;
            }
        }
        // Look backwards for option consideration
        for (let i = Math.max(0, decisionIndex - 5); i < decisionIndex; i++) {
            const message = messages[i];
            if (this.OPTION_KEYWORDS.some(keyword => message.content.toLowerCase().includes(keyword))) {
                timeline.optionsConsideredAt = message.createdAt;
                break;
            }
        }
        return timeline;
    }
    assessDecisionClarity(decisionText, contextMessages) {
        let clarity = 50; // Base score
        // Clear decision language
        if (/\b(will|going to|decided to)\b/.test(decisionText.toLowerCase())) {
            clarity += 20;
        }
        // Specific actions mentioned
        if (/(implement|use|choose|select|go with)/.test(decisionText.toLowerCase())) {
            clarity += 15;
        }
        // Vague language reduces clarity
        if (/(maybe|perhaps|might|possibly|probably)/.test(decisionText.toLowerCase())) {
            clarity -= 20;
        }
        // Questions reduce clarity
        if (decisionText.includes('?')) {
            clarity -= 15;
        }
        // Context consistency
        const contextClarity = this.assessContextualClarity(contextMessages);
        clarity += contextClarity * 0.3;
        return Math.max(0, Math.min(100, clarity));
    }
    assessConfidenceLevel(decisionText, contextMessages) {
        let confidence = 50;
        // Strong confidence indicators
        const strongConfidence = ['definitely', 'certainly', 'absolutely', 'confident', 'sure'];
        if (strongConfidence.some(word => decisionText.toLowerCase().includes(word))) {
            confidence += 25;
        }
        // Weak confidence indicators
        const weakConfidence = ['maybe', 'perhaps', 'not sure', 'uncertain', 'doubt'];
        if (weakConfidence.some(word => decisionText.toLowerCase().includes(word))) {
            confidence -= 25;
        }
        // Evidence of thorough consideration
        const considerationEvidence = contextMessages.filter(m => this.OPTION_KEYWORDS.some(keyword => m.content.toLowerCase().includes(keyword))).length;
        confidence += Math.min(20, considerationEvidence * 5);
        return Math.max(0, Math.min(100, confidence));
    }
    assessInformationCompleteness(contextMessages) {
        let completeness = 30; // Base score
        // Information gathering indicators
        const infoKeywords = ['research', 'investigate', 'analyze', 'consider', 'evaluate'];
        const infoGathering = contextMessages.filter(m => infoKeywords.some(keyword => m.content.toLowerCase().includes(keyword))).length;
        completeness += Math.min(30, infoGathering * 6);
        // Questions asked (information seeking)
        const questions = contextMessages.filter(m => m.content.includes('?')).length;
        completeness += Math.min(25, questions * 3);
        // Detailed analysis
        const longMessages = contextMessages.filter(m => m.content.length > 200).length;
        completeness += Math.min(15, longMessages * 5);
        return Math.max(0, Math.min(100, completeness));
    }
    analyzeDecisionContext(contextMessages) {
        const allContent = contextMessages.map(m => m.content).join(' ').toLowerCase();
        // Count alternatives mentioned
        const alternativeIndicators = ['option', 'alternative', 'choice', 'either', 'or'];
        const alternatives = alternativeIndicators.reduce((count, indicator) => {
            const matches = (allContent.match(new RegExp(indicator, 'g')) || []).length;
            return count + matches;
        }, 0);
        // Count stakeholders mentioned
        const stakeholderIndicators = ['team', 'client', 'user', 'manager', 'stakeholder'];
        const stakeholders = stakeholderIndicators.reduce((count, indicator) => {
            return count + (allContent.includes(indicator) ? 1 : 0);
        }, 0);
        // Risk assessment
        const riskKeywords = ['risk', 'danger', 'problem', 'issue', 'concern', 'downside'];
        const riskAssessed = riskKeywords.some(keyword => allContent.includes(keyword));
        // Time constraints
        const timeKeywords = ['deadline', 'urgent', 'quickly', 'asap', 'time constraint'];
        const timeConstraints = timeKeywords.some(keyword => allContent.includes(keyword));
        // Resource constraints
        const resourceKeywords = ['budget', 'cost', 'resource', 'limitation', 'constraint'];
        const resourceConstraints = resourceKeywords.some(keyword => allContent.includes(keyword));
        return {
            alternatives: Math.min(10, alternatives),
            stakeholders: Math.min(10, stakeholders),
            riskAssessed,
            timeConstraints,
            resourceConstraints
        };
    }
    findDecisionOutcome(messages, decisionIndex) {
        const outcome = { score: undefined, reversals: 0, modifications: 0 };
        // Look forward for outcome indicators
        const laterMessages = messages.slice(decisionIndex + 1);
        for (const message of laterMessages) {
            const lower = message.content.toLowerCase();
            // Success indicators
            if (['worked', 'successful', 'effective', 'good result'].some(indicator => lower.includes(indicator))) {
                outcome.score = Math.max(outcome.score || 0, 75);
            }
            // Failure indicators
            if (['failed', 'didn\'t work', 'unsuccessful', 'bad result', 'mistake'].some(indicator => lower.includes(indicator))) {
                outcome.score = Math.min(outcome.score || 100, 25);
            }
            // Reversal indicators
            if (['changed mind', 'reversed', 'different decision', 'wrong choice'].some(indicator => lower.includes(indicator))) {
                outcome.reversals++;
                outcome.score = Math.min(outcome.score || 50, 40);
            }
            // Modification indicators
            if (['modified', 'adjusted', 'tweaked', 'refined'].some(indicator => lower.includes(indicator))) {
                outcome.modifications++;
            }
        }
        return outcome;
    }
    // Additional helper methods...
    generateDecisionId(conversationId, messageIndex) {
        return `decision_${conversationId}_${messageIndex}`;
    }
    extractContext(messages) {
        return messages.map(m => m.content).join(' ').substring(0, 500);
    }
    extractSuccessFactors(messages) {
        const factors = [];
        const content = messages.map(m => m.content).join(' ').toLowerCase();
        if (content.includes('thorough'))
            factors.push('thorough analysis');
        if (content.includes('research'))
            factors.push('research conducted');
        if (content.includes('option') || content.includes('alternative'))
            factors.push('alternatives considered');
        if (content.includes('risk'))
            factors.push('risk assessment');
        return factors;
    }
    extractFailureFactors(messages) {
        const factors = [];
        const content = messages.map(m => m.content).join(' ').toLowerCase();
        if (content.includes('rush'))
            factors.push('rushed decision');
        if (content.includes('incomplete'))
            factors.push('incomplete information');
        if (content.includes('pressure'))
            factors.push('external pressure');
        return factors;
    }
    extractLessonsLearned(messages) {
        // Look for explicit learning statements
        const learningKeywords = ['learned', 'lesson', 'next time', 'should have'];
        for (const message of messages) {
            if (learningKeywords.some(keyword => message.content.toLowerCase().includes(keyword))) {
                return message.content.substring(0, 200);
            }
        }
        return '';
    }
    generateDecisionTags(summary, messages) {
        const tags = [];
        const content = summary + ' ' + messages.map(m => m.content).join(' ');
        const lower = content.toLowerCase();
        if (lower.includes('technical'))
            tags.push('technical');
        if (lower.includes('business'))
            tags.push('business');
        if (lower.includes('design'))
            tags.push('design');
        if (lower.includes('process'))
            tags.push('process');
        return tags;
    }
    assessDecisionPriority(summary, messages) {
        const content = summary + ' ' + messages.map(m => m.content).join(' ');
        const lower = content.toLowerCase();
        if (lower.includes('critical') || lower.includes('urgent'))
            return 'critical';
        if (lower.includes('important') || lower.includes('high priority'))
            return 'high';
        if (lower.includes('minor') || lower.includes('low priority'))
            return 'low';
        return 'medium';
    }
    assessDecisionComplexity(summary, messages, factors) {
        let complexity = 3; // Base complexity
        complexity += Math.min(3, factors.alternatives);
        complexity += Math.min(2, factors.stakeholders);
        if (factors.riskAssessed)
            complexity += 1;
        if (factors.timeConstraints)
            complexity += 1;
        if (factors.resourceConstraints)
            complexity += 1;
        const technicalContent = (summary + ' ' + messages.map(m => m.content).join(' ')).toLowerCase();
        if (/(algorithm|architecture|system|framework)/.test(technicalContent)) {
            complexity += 2;
        }
        return Math.min(10, complexity);
    }
    assessContextualClarity(messages) {
        // Assess how clear the overall context is
        let clarity = 50;
        const hasBackground = messages.some(m => m.content.toLowerCase().includes('background'));
        if (hasBackground)
            clarity += 15;
        const hasObjectives = messages.some(m => /(goal|objective|aim)/.test(m.content.toLowerCase()));
        if (hasObjectives)
            clarity += 15;
        const hasConstraints = messages.some(m => /(constraint|limitation|requirement)/.test(m.content.toLowerCase()));
        if (hasConstraints)
            clarity += 10;
        return clarity;
    }
    // Quality metrics calculation methods
    createEmptyQualityMetrics(conversationId) {
        return {
            conversationId,
            totalDecisions: 0,
            averageClarityScore: 0,
            averageConfidenceLevel: 0,
            averageInformationCompleteness: 0,
            averageDecisionTime: 0,
            averageImplementationTime: 0,
            successRate: 0,
            reversalRate: 0,
            modificationRate: 0,
            mostImportantFactors: [],
            biggestRiskFactors: []
        };
    }
    calculateAverage(values) {
        try {
            if (!values || !Array.isArray(values) || values.length === 0) {
                return 0;
            }
            const validValues = values.filter(v => v !== null && v !== undefined && isFinite(v));
            if (validValues.length === 0) {
                return 0;
            }
            const sum = validValues.reduce((acc, val) => acc + val, 0);
            return sum / validValues.length;
        }
        catch (error) {
            console.warn('DecisionTracker: Error calculating average:', error);
            return 0;
        }
    }
    calculateDecisionTimes(decisions) {
        const times = decisions
            .filter(d => d.problemIdentifiedAt && d.decisionMadeAt)
            .map(d => (d.decisionMadeAt - d.problemIdentifiedAt) / (1000 * 60 * 60)); // hours
        if (times.length === 0)
            return { average: 0, median: 0 };
        const average = times.reduce((sum, time) => sum + time, 0) / times.length;
        const sorted = [...times].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        return { average, median };
    }
    calculateImplementationTimes(decisions) {
        const times = decisions
            .filter(d => d.implementationStartedAt && d.decisionMadeAt)
            .map(d => (d.implementationStartedAt - d.decisionMadeAt) / (1000 * 60 * 60)); // hours
        if (times.length === 0)
            return { average: 0, median: 0 };
        const average = times.reduce((sum, time) => sum + time, 0) / times.length;
        return { average, median: average }; // Simplified
    }
    calculateSuccessRate(decisions) {
        const withOutcomes = decisions.filter(d => d.outcomeScore !== undefined);
        if (withOutcomes.length === 0)
            return 0;
        const successful = withOutcomes.filter(d => d.outcomeScore > 60).length;
        return (successful / withOutcomes.length) * 100;
    }
    calculateReversalRate(decisions) {
        if (decisions.length === 0)
            return 0;
        const reversed = decisions.filter(d => d.reversalCount > 0).length;
        return (reversed / decisions.length) * 100;
    }
    calculateModificationRate(decisions) {
        if (decisions.length === 0)
            return 0;
        const modified = decisions.filter(d => d.modificationCount > 0).length;
        return (modified / decisions.length) * 100;
    }
    analyzeDecisionFactors(decisions) {
        // Analyze what factors lead to successful decisions
        const successful = decisions.filter(d => d.outcomeScore && d.outcomeScore > 70);
        const failed = decisions.filter(d => d.outcomeScore && d.outcomeScore < 40);
        const importantFactors = [
            ...new Set(successful.flatMap(d => d.successFactors))
        ].slice(0, 5);
        const riskFactors = [
            ...new Set(failed.flatMap(d => d.failureFactors))
        ].slice(0, 5);
        return { importantFactors, riskFactors };
    }
    // Pattern detection methods
    groupDecisionsByPattern(decisions) {
        const groups = new Map();
        for (const decision of decisions) {
            const pattern = this.extractDecisionPattern(decision);
            if (!groups.has(pattern)) {
                groups.set(pattern, []);
            }
            groups.get(pattern).push(decision);
        }
        return groups;
    }
    extractDecisionPattern(decision) {
        // Extract pattern based on decision characteristics
        let pattern = decision.decisionType;
        if (decision.alternativesConsidered > 3) {
            pattern += '_analytical';
        }
        if (decision.timeConstraints) {
            pattern += '_time_constrained';
        }
        if (decision.complexity > 7) {
            pattern += '_complex';
        }
        return pattern;
    }
    analyzeDecisionPattern(patternKey, decisions) {
        const successfulDecisions = decisions.filter(d => d.outcomeScore && d.outcomeScore > 60);
        const successRate = decisions.length > 0 ? successfulDecisions.length / decisions.length : 0;
        const averageQuality = this.calculateAverage(decisions.map(d => d.clarityScore));
        const averageOutcome = this.calculateAverage(decisions.filter(d => d.outcomeScore !== undefined).map(d => d.outcomeScore));
        const allFactors = decisions.flatMap(d => d.successFactors);
        const factorCounts = new Map();
        for (const factor of allFactors) {
            factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
        }
        const commonFactors = Array.from(factorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([factor]) => factor);
        return {
            pattern: patternKey,
            description: this.generatePatternDescription(patternKey, decisions),
            frequency: decisions.length,
            successRate: Math.round(successRate * 100) / 100,
            averageQuality: Math.round(averageQuality),
            averageOutcome: averageOutcome > 0 ? Math.round(averageOutcome) : undefined,
            commonFactors,
            successIndicators: this.identifySuccessIndicators(successfulDecisions),
            riskFactors: this.identifyRiskFactors(decisions.filter(d => d.outcomeScore !== undefined && d.outcomeScore < 40)),
            typicalContext: this.extractTypicalContext(decisions),
            optimalConditions: this.identifyOptimalConditions(successfulDecisions),
            confidence: Math.min(0.95, Math.log(decisions.length) / Math.log(10))
        };
    }
    generatePatternDescription(patternKey, decisions) {
        return `Decision pattern: ${patternKey.replace(/_/g, ' ')} (${decisions.length} occurrences)`;
    }
    identifySuccessIndicators(successfulDecisions) {
        const indicators = new Set();
        for (const decision of successfulDecisions) {
            if (decision.informationCompleteness > 70)
                indicators.add('thorough information gathering');
            if (decision.alternativesConsidered > 2)
                indicators.add('multiple alternatives considered');
            if (decision.riskAssessment)
                indicators.add('risk assessment conducted');
        }
        return Array.from(indicators);
    }
    identifyRiskFactors(failedDecisions) {
        const riskFactors = new Set();
        for (const decision of failedDecisions) {
            if (decision.timeConstraints)
                riskFactors.add('time pressure');
            if (decision.informationCompleteness < 40)
                riskFactors.add('insufficient information');
            if (decision.alternativesConsidered < 2)
                riskFactors.add('limited alternatives');
        }
        return Array.from(riskFactors);
    }
    extractTypicalContext(decisions) {
        const contexts = decisions.map(d => d.context);
        // In practice, would use NLP to find common themes
        return 'typical decision context'; // Simplified
    }
    identifyOptimalConditions(successfulDecisions) {
        const conditions = [];
        const avgInfo = this.calculateAverage(successfulDecisions.map(d => d.informationCompleteness));
        if (avgInfo > 70)
            conditions.push('thorough information gathering');
        const avgAlternatives = this.calculateAverage(successfulDecisions.map(d => d.alternativesConsidered));
        if (avgAlternatives > 2)
            conditions.push('consider multiple alternatives');
        return conditions;
    }
    // Timeline analysis methods
    mapMessagesToPhases(messages, decision) {
        const phases = {
            problem_identification: [],
            option_consideration: [],
            decision_making: [],
            implementation: [],
            outcome_assessment: []
        };
        for (const message of messages) {
            const messageTime = message.createdAt;
            const content = message.content.toLowerCase();
            // Classify message by phase
            if (this.PROBLEM_KEYWORDS.some(keyword => content.includes(keyword))) {
                phases.problem_identification.push(message);
            }
            else if (this.OPTION_KEYWORDS.some(keyword => content.includes(keyword))) {
                phases.option_consideration.push(message);
            }
            else if (this.DECISION_KEYWORDS.some(keyword => content.includes(keyword))) {
                phases.decision_making.push(message);
            }
            else if (this.OUTCOME_KEYWORDS.some(keyword => content.includes(keyword))) {
                phases.outcome_assessment.push(message);
            }
            // Also classify by timing relative to decision
            if (decision.implementationStartedAt && messageTime > decision.implementationStartedAt) {
                phases.implementation.push(message);
            }
        }
        return phases;
    }
    analyzeDecisionPhase(phase, messages) {
        if (messages.length === 0) {
            throw new Error(`No messages for phase ${phase}`);
        }
        const timestamps = messages.map(m => m.createdAt);
        const startTime = Math.min(...timestamps);
        const endTime = Math.max(...timestamps);
        const duration = endTime - startTime;
        // Assess phase quality
        let quality = 50;
        const totalContent = messages.map(m => m.content).join(' ');
        switch (phase) {
            case 'problem_identification':
                if (totalContent.length > 200)
                    quality += 20;
                if (messages.some(m => m.content.includes('?')))
                    quality += 15;
                break;
            case 'option_consideration':
                const alternatives = (totalContent.match(/option|alternative|choice/gi) || []).length;
                quality += Math.min(30, alternatives * 10);
                break;
            case 'decision_making':
                if (/decided|decision|choose/i.test(totalContent))
                    quality += 25;
                break;
        }
        // Extract evidence
        const evidence = messages.map(m => m.content.substring(0, 100));
        return {
            phase,
            timestamp: startTime,
            duration,
            quality: Math.min(100, quality),
            evidence
        };
    }
    calculateTimelineEfficiency(phases) {
        if (phases.length === 0)
            return 0;
        // Efficiency based on appropriate time spent in each phase
        let efficiency = 50;
        // Bonus for having all key phases
        const phaseTypes = new Set(phases.map(p => p.phase));
        efficiency += phaseTypes.size * 5;
        // Penalty for excessive duration in any phase
        for (const phase of phases) {
            if (phase.duration && phase.duration > 24 * 60 * 60 * 1000) { // > 24 hours
                efficiency -= 10;
            }
        }
        return Math.max(0, Math.min(100, efficiency));
    }
    calculateTimelineCompleteness(phases) {
        const expectedPhases = ['problem_identification', 'option_consideration', 'decision_making'];
        const presentPhases = new Set(phases.map(p => p.phase));
        const completeness = (presentPhases.size / expectedPhases.length) * 100;
        return Math.min(100, completeness);
    }
}
//# sourceMappingURL=DecisionTracker.js.map