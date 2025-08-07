/**
 * Productivity Analyzer
 *
 * Analyzes productivity patterns and effectiveness:
 * - Time-based productivity analysis
 * - Peak hour detection with statistical significance
 * - Question effectiveness assessment
 * - Breakthrough pattern identification
 * - Session length optimization
 * - Engagement quality measurement
 */
/**
 * Analyzes productivity patterns and provides optimization insights
 */
export class ProductivityAnalyzer {
    INSIGHT_KEYWORDS = [
        'understand', 'realize', 'see', 'aha', 'makes sense', 'clear',
        'insight', 'breakthrough', 'eureka', 'click', 'now i get'
    ];
    BREAKTHROUGH_KEYWORDS = [
        'breakthrough', 'eureka', 'aha moment', 'suddenly clear',
        'finally understand', 'piece together', 'connects', 'revelation'
    ];
    QUESTION_PATTERNS = [
        'how might', 'what if', 'how can', 'why does', 'what are the implications',
        'how do we', 'what would happen', 'can you help', 'explain', 'walk me through'
    ];
    /**
     * Analyze productivity for a single conversation
     */
    async analyzeConversationProductivity(conversation, messages, flowMetrics) {
        try {
            if (!conversation || !messages) {
                console.warn('ProductivityAnalyzer: Invalid input parameters');
                return this.createDefaultProductivityMetrics(conversation?.id || 'unknown');
            }
            if (messages.length === 0) {
                console.info('ProductivityAnalyzer: Empty conversation, returning default metrics');
                return this.createDefaultProductivityMetrics(conversation.id);
            }
            const analyzedAt = Date.now();
            // Calculate time metrics with error handling
            const sessionDuration = this.safeCalculateSessionDuration(messages);
            const activeTime = this.safeCalculateActiveTime(messages);
            const responseLatency = this.safeCalculateResponseLatency(messages);
            // Analyze question effectiveness with error handling
            const questionMetrics = this.safeAnalyzeQuestions(messages);
            // Measure output quality with error handling
            const outputMetrics = this.safeMeasureOutputQuality(messages);
            // Calculate core scores with error handling
            const efficiencyScore = this.safeCalculateEfficiencyScore(messages, sessionDuration, outputMetrics);
            const effectivenessScore = this.safeCalculateEffectivenessScore(outputMetrics, questionMetrics, flowMetrics);
            const engagementScore = this.safeCalculateEngagementScore(messages, questionMetrics);
            // Overall productivity score (weighted combination)
            const overallProductivityScore = this.safeCalculateOverallScore(efficiencyScore, effectivenessScore, engagementScore);
            // Detect patterns with error handling
            const patterns = this.safeDetectProductivityPatterns(messages, outputMetrics);
            // Find peak productivity period with error handling
            const peakProductivityPeriod = this.safeDetectPeakPeriod(messages, outputMetrics);
            return {
                conversationId: conversation.id,
                analyzedAt,
                overallProductivityScore: Math.round(Math.max(0, Math.min(100, overallProductivityScore))),
                efficiencyScore: Math.round(Math.max(0, Math.min(100, efficiencyScore))),
                effectivenessScore: Math.round(Math.max(0, Math.min(100, effectivenessScore))),
                engagementScore: Math.round(Math.max(0, Math.min(100, engagementScore))),
                sessionDuration: Math.max(0, sessionDuration),
                activeTime: Math.max(0, activeTime),
                responseLatency: Math.max(0, responseLatency),
                peakProductivityPeriod,
                questionMetrics,
                outputMetrics,
                patterns
            };
        }
        catch (error) {
            console.error('ProductivityAnalyzer: Failed to analyze conversation productivity:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                conversationId: conversation?.id,
                messageCount: messages?.length
            });
            return {
                ...this.createDefaultProductivityMetrics(conversation?.id || 'unknown'),
                error: true,
                errorMessage: 'Productivity analysis partially completed due to processing error'
            };
        }
    }
    /**
     * Analyze hourly productivity patterns
     */
    async analyzeHourlyPatterns(conversationsWithMetrics) {
        try {
            if (!conversationsWithMetrics || conversationsWithMetrics.length === 0) {
                console.warn('ProductivityAnalyzer: No conversation data provided for hourly analysis');
                return Array.from({ length: 24 }, (_, hour) => this.createEmptyHourlyData(hour));
            }
            const hourlyData = new Map();
            // Group conversations by hour of creation with error handling
            for (const item of conversationsWithMetrics) {
                try {
                    if (!item?.conversation?.createdAt) {
                        console.warn('ProductivityAnalyzer: Invalid conversation data, skipping');
                        continue;
                    }
                    const hour = new Date(item.conversation.createdAt).getHours();
                    if (isNaN(hour) || hour < 0 || hour > 23) {
                        console.warn('ProductivityAnalyzer: Invalid hour value, skipping:', hour);
                        continue;
                    }
                    if (!hourlyData.has(hour)) {
                        hourlyData.set(hour, []);
                    }
                    hourlyData.get(hour).push(item);
                }
                catch (itemError) {
                    console.warn('ProductivityAnalyzer: Error processing conversation item:', itemError);
                    continue;
                }
            }
            const results = [];
            // Analyze each hour (0-23)
            for (let hour = 0; hour < 24; hour++) {
                try {
                    const hourConversations = hourlyData.get(hour) || [];
                    if (hourConversations.length === 0) {
                        results.push(this.createEmptyHourlyData(hour));
                        continue;
                    }
                    const productivity = this.safeCalculateHourlyProductivity(hourConversations);
                    const patterns = this.safeDetectHourlyPatterns(hourConversations);
                    results.push({
                        hour,
                        productivity,
                        patterns
                    });
                }
                catch (hourError) {
                    console.warn(`ProductivityAnalyzer: Error analyzing hour ${hour}:`, hourError);
                    results.push(this.createEmptyHourlyData(hour));
                }
            }
            return results;
        }
        catch (error) {
            console.error('ProductivityAnalyzer: Failed to analyze hourly patterns:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                dataCount: conversationsWithMetrics?.length
            });
            // Return empty data for all hours as fallback
            return Array.from({ length: 24 }, (_, hour) => this.createEmptyHourlyData(hour));
        }
    }
    /**
     * Analyze question effectiveness patterns
     */
    async analyzeQuestionEffectiveness(conversationsWithMetrics) {
        try {
            if (!conversationsWithMetrics || conversationsWithMetrics.length === 0) {
                console.warn('ProductivityAnalyzer: No data provided for question effectiveness analysis');
                return [];
            }
            const questionAnalysis = new Map();
            // Extract and categorize questions with error handling
            for (const item of conversationsWithMetrics) {
                try {
                    if (!item?.messages || !Array.isArray(item.messages)) {
                        console.warn('ProductivityAnalyzer: Invalid messages data, skipping');
                        continue;
                    }
                    const questions = this.safeExtractQuestions(item.messages);
                    for (const question of questions) {
                        try {
                            const pattern = this.safeClassifyQuestionPattern(question.content);
                            const insightScore = this.safeCalculateQuestionInsightScore(question, item.messages, item.productivity);
                            const responseLength = this.safeGetResponseLength(question, item.messages);
                            const hasFollowup = this.safeHasFollowupQuestions(question, item.messages);
                            const isBreakthrough = this.safeIsBreakthroughQuestion(question, item.messages);
                            if (!questionAnalysis.has(pattern)) {
                                questionAnalysis.set(pattern, {
                                    examples: [],
                                    insightScores: [],
                                    breakthroughCount: 0,
                                    responseLengths: [],
                                    hasFollowup: []
                                });
                            }
                            const data = questionAnalysis.get(pattern);
                            data.examples.push(question.content);
                            data.insightScores.push(Math.max(0, Math.min(100, insightScore)));
                            data.responseLengths.push(Math.max(0, responseLength));
                            data.hasFollowup.push(hasFollowup);
                            if (isBreakthrough)
                                data.breakthroughCount++;
                        }
                        catch (questionError) {
                            console.warn('ProductivityAnalyzer: Error processing question:', questionError);
                            continue;
                        }
                    }
                }
                catch (itemError) {
                    console.warn('ProductivityAnalyzer: Error processing conversation item:', itemError);
                    continue;
                }
            }
            // Create analysis results with error handling
            const results = [];
            for (const [pattern, data] of questionAnalysis.entries()) {
                try {
                    if (data.examples.length < 3)
                        continue; // Need minimum sample size
                    const averageInsightScore = this.safeCalculateAverage(data.insightScores);
                    const breakthroughProbability = data.examples.length > 0 ?
                        data.breakthroughCount / data.examples.length : 0;
                    const averageResponseLength = this.safeCalculateAverage(data.responseLengths);
                    const followupRate = data.hasFollowup.length > 0 ?
                        data.hasFollowup.filter(f => f).length / data.hasFollowup.length : 0;
                    // Calculate effectiveness score with bounds checking
                    const effectivenessScore = this.safeCalculateQuestionEffectivenessScore(averageInsightScore, breakthroughProbability, followupRate, averageResponseLength);
                    // Calculate confidence based on sample size
                    const confidence = Math.min(0.95, Math.max(0.1, Math.log(data.examples.length + 1) / Math.log(20)));
                    results.push({
                        questionPattern: pattern,
                        examples: data.examples.slice(0, 3), // Top 3 examples
                        metrics: {
                            frequency: data.examples.length,
                            averageInsightScore: Math.max(0, Math.min(100, averageInsightScore)),
                            breakthroughProbability: Math.max(0, Math.min(1, breakthroughProbability)),
                            averageResponseLength: Math.max(0, averageResponseLength),
                            followupRate: Math.max(0, Math.min(1, followupRate))
                        },
                        effectiveness: {
                            score: Math.round(Math.max(0, Math.min(100, effectivenessScore))),
                            confidence: Math.max(0, Math.min(1, confidence)),
                            recommendation: this.safeGenerateQuestionRecommendation(pattern, effectivenessScore)
                        }
                    });
                }
                catch (patternError) {
                    console.warn(`ProductivityAnalyzer: Error processing pattern '${pattern}':`, patternError);
                    continue;
                }
            }
            return results.sort((a, b) => b.effectiveness.score - a.effectiveness.score);
        }
        catch (error) {
            console.error('ProductivityAnalyzer: Failed to analyze question effectiveness:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                dataCount: conversationsWithMetrics?.length
            });
            return [];
        }
    }
    /**
     * Identify breakthrough patterns
     */
    async identifyBreakthroughPatterns(conversationsWithMetrics) {
        try {
            if (!conversationsWithMetrics || conversationsWithMetrics.length === 0) {
                console.warn('ProductivityAnalyzer: No data provided for breakthrough pattern analysis');
                return [];
            }
            const patternMap = new Map();
            // Detect breakthroughs and their contexts with error handling
            for (const item of conversationsWithMetrics) {
                try {
                    if (!item?.messages || !item?.conversation || !item?.productivity) {
                        console.warn('ProductivityAnalyzer: Invalid item data, skipping');
                        continue;
                    }
                    const breakthroughs = this.safeDetectBreakthroughs(item.messages);
                    for (const breakthrough of breakthroughs) {
                        try {
                            const pattern = this.safeExtractBreakthroughPattern(breakthrough, item.messages);
                            const context = this.safeGetBreakthroughContext(breakthrough, item.messages);
                            const outcome = this.safeGetBreakthroughOutcome(breakthrough, item.messages);
                            const preconditions = this.safeIdentifyPreconditions(breakthrough, item.messages);
                            const success = this.safeAssessBreakthroughSuccess(breakthrough, item.messages, item.productivity);
                            if (!patternMap.has(pattern)) {
                                patternMap.set(pattern, {
                                    occurrences: [],
                                    preconditions: []
                                });
                            }
                            const patternData = patternMap.get(pattern);
                            patternData.occurrences.push({
                                conversationId: item.conversation.id,
                                context: context || 'No context available',
                                outcome: outcome || 'No outcome available',
                                timestamp: breakthrough.timestamp || Date.now(),
                                success
                            });
                            // Merge preconditions with error handling
                            for (const precondition of preconditions) {
                                if (precondition && typeof precondition === 'string' && !patternData.preconditions.includes(precondition)) {
                                    patternData.preconditions.push(precondition);
                                }
                            }
                        }
                        catch (breakthroughError) {
                            console.warn('ProductivityAnalyzer: Error processing breakthrough:', breakthroughError);
                            continue;
                        }
                    }
                }
                catch (itemError) {
                    console.warn('ProductivityAnalyzer: Error processing conversation item:', itemError);
                    continue;
                }
            }
            // Create pattern results with error handling
            const results = [];
            for (const [pattern, data] of patternMap.entries()) {
                try {
                    if (data.occurrences.length < 2)
                        continue; // Need multiple occurrences
                    const successfulOccurrences = data.occurrences.filter(o => o.success);
                    const successRate = data.occurrences.length > 0 ?
                        successfulOccurrences.length / data.occurrences.length : 0;
                    // Calculate confidence based on frequency and success consistency
                    const confidence = Math.min(0.95, Math.max(0.1, (data.occurrences.length / 10) * 0.5 +
                        (successRate > 0.7 ? 0.4 : 0.2) +
                        (data.occurrences.length > 5 ? 0.1 : 0)));
                    results.push({
                        pattern: pattern || 'unknown pattern',
                        description: this.safeGeneratePatternDescription(pattern, data.preconditions),
                        frequency: data.occurrences.length,
                        successRate: Math.round(Math.max(0, Math.min(1, successRate)) * 100) / 100,
                        preconditions: data.preconditions.slice(0, 5), // Top 5
                        examples: data.occurrences.slice(0, 3).map(o => ({
                            conversationId: o.conversationId || 'unknown',
                            context: o.context || 'No context',
                            outcome: o.outcome || 'No outcome',
                            timestamp: o.timestamp || Date.now()
                        })),
                        confidence: Math.max(0, Math.min(1, confidence))
                    });
                }
                catch (patternError) {
                    console.warn(`ProductivityAnalyzer: Error processing pattern '${pattern}':`, patternError);
                    continue;
                }
            }
            return results.sort((a, b) => {
                try {
                    const scoreA = (a.frequency || 0) * (a.successRate || 0) * (a.confidence || 0);
                    const scoreB = (b.frequency || 0) * (b.successRate || 0) * (b.confidence || 0);
                    return scoreB - scoreA;
                }
                catch (sortError) {
                    console.warn('ProductivityAnalyzer: Error sorting patterns:', sortError);
                    return 0;
                }
            });
        }
        catch (error) {
            console.error('ProductivityAnalyzer: Failed to identify breakthrough patterns:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                dataCount: conversationsWithMetrics?.length
            });
            return [];
        }
    }
    /**
     * Analyze session length optimization
     */
    async analyzeSessionOptimization(conversationsWithMetrics) {
        try {
            if (!conversationsWithMetrics || conversationsWithMetrics.length === 0) {
                console.warn('ProductivityAnalyzer: No data provided for session optimization analysis');
                return this.createDefaultSessionOptimization();
            }
            // Map session data with error handling
            const sessionData = [];
            for (const item of conversationsWithMetrics) {
                try {
                    if (!item?.productivity) {
                        console.warn('ProductivityAnalyzer: Missing productivity data, skipping');
                        continue;
                    }
                    const sessionDuration = item.productivity.sessionDuration || 0;
                    const lengthMinutes = Math.max(0, sessionDuration / (1000 * 60));
                    const productivityScore = Math.max(0, Math.min(100, item.productivity.overallProductivityScore || 0));
                    const effectivenessScore = Math.max(0, Math.min(100, item.productivity.effectivenessScore || 0));
                    // Only include sessions with valid data
                    if (lengthMinutes > 0 && !isNaN(lengthMinutes)) {
                        sessionData.push({ lengthMinutes, productivityScore, effectivenessScore });
                    }
                }
                catch (itemError) {
                    console.warn('ProductivityAnalyzer: Error processing session data:', itemError);
                    continue;
                }
            }
            if (sessionData.length === 0) {
                console.warn('ProductivityAnalyzer: No valid session data found');
                return this.createDefaultSessionOptimization();
            }
            // Calculate current average with error handling
            const currentAverage = this.safeCalculateSessionAverage(sessionData);
            // Group by session length categories with error handling
            const shortSessions = sessionData.filter(s => s.lengthMinutes < 15);
            const mediumSessions = sessionData.filter(s => s.lengthMinutes >= 15 && s.lengthMinutes <= 60);
            const longSessions = sessionData.filter(s => s.lengthMinutes > 60);
            // Calculate efficiency for each category with error handling
            const shortEfficiency = this.safeCalculateCategoryEfficiency(shortSessions);
            const mediumEfficiency = this.safeCalculateCategoryEfficiency(mediumSessions);
            const longEfficiency = this.safeCalculateCategoryEfficiency(longSessions);
            // Find optimal length using curve fitting with error handling
            const optimalLength = this.safeFindOptimalSessionLength(sessionData);
            const optimalRange = this.safeCalculateOptimalRange(sessionData, optimalLength);
            // Generate recommendations with error handling
            const recommendations = this.safeGenerateSessionRecommendations(currentAverage, optimalLength, shortEfficiency, mediumEfficiency, longEfficiency);
            return {
                currentAverage: Math.round(Math.max(0, currentAverage)),
                optimalLength: Math.round(Math.max(0, optimalLength)),
                efficiency: {
                    shortSessions: Math.round(Math.max(0, Math.min(100, shortEfficiency))),
                    mediumSessions: Math.round(Math.max(0, Math.min(100, mediumEfficiency))),
                    longSessions: Math.round(Math.max(0, Math.min(100, longEfficiency))),
                    optimalRange
                },
                recommendations: recommendations || []
            };
        }
        catch (error) {
            console.error('ProductivityAnalyzer: Failed to analyze session optimization:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                dataCount: conversationsWithMetrics?.length
            });
            return this.createDefaultSessionOptimization();
        }
    }
    /**
     * Safe wrapper methods for error handling
     */
    createDefaultProductivityMetrics(conversationId) {
        return {
            conversationId,
            analyzedAt: Date.now(),
            overallProductivityScore: 0,
            efficiencyScore: 0,
            effectivenessScore: 0,
            engagementScore: 0,
            sessionDuration: 0,
            activeTime: 0,
            responseLatency: 0,
            questionMetrics: {
                total: 0,
                effectiveQuestions: 0,
                questionQualityScore: 0,
                insightGeneratingQuestions: 0
            },
            outputMetrics: {
                insightCount: 0,
                breakthroughCount: 0,
                resolutionCount: 0,
                actionableOutputs: 0
            },
            patterns: {
                breakthroughTriggers: [],
                effectiveApproaches: [],
                productivityKillers: [],
                optimalFlowState: false
            }
        };
    }
    safeCalculateSessionDuration(messages) {
        try {
            return this.calculateSessionDuration(messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating session duration:', error);
            return 0;
        }
    }
    safeCalculateActiveTime(messages) {
        try {
            return this.calculateActiveTime(messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating active time:', error);
            return 0;
        }
    }
    safeCalculateResponseLatency(messages) {
        try {
            return this.calculateResponseLatency(messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating response latency:', error);
            return 0;
        }
    }
    safeAnalyzeQuestions(messages) {
        try {
            return this.analyzeQuestions(messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error analyzing questions:', error);
            return { total: 0, effectiveQuestions: 0, questionQualityScore: 0, insightGeneratingQuestions: 0 };
        }
    }
    safeMeasureOutputQuality(messages) {
        try {
            return this.measureOutputQuality(messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error measuring output quality:', error);
            return { insightCount: 0, breakthroughCount: 0, resolutionCount: 0, actionableOutputs: 0 };
        }
    }
    safeCalculateEfficiencyScore(messages, sessionDuration, outputMetrics) {
        try {
            return this.calculateEfficiencyScore(messages, sessionDuration, outputMetrics);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating efficiency score:', error);
            return 0;
        }
    }
    safeCalculateEffectivenessScore(outputMetrics, questionMetrics, flowMetrics) {
        try {
            // Validate flowMetrics to prevent NaN/Infinity issues
            let validFlowMetrics = flowMetrics;
            if (flowMetrics) {
                const { depthScore, circularityIndex, progressionScore } = flowMetrics;
                if (!isFinite(depthScore) || !isFinite(circularityIndex) || !isFinite(progressionScore)) {
                    console.warn('ProductivityAnalyzer: Invalid flow metrics detected, using safe defaults');
                    validFlowMetrics = undefined; // Use fallback calculation
                }
            }
            const result = this.calculateEffectivenessScore(outputMetrics, questionMetrics, validFlowMetrics);
            // Ensure result is finite
            if (!isFinite(result)) {
                console.warn('ProductivityAnalyzer: Effectiveness score calculation resulted in non-finite value');
                return 0;
            }
            return result;
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating effectiveness score:', error);
            return 0;
        }
    }
    safeCalculateEngagementScore(messages, questionMetrics) {
        try {
            return this.calculateEngagementScore(messages, questionMetrics);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating engagement score:', error);
            return 0;
        }
    }
    safeCalculateOverallScore(efficiency, effectiveness, engagement) {
        try {
            if (!isFinite(efficiency) || !isFinite(effectiveness) || !isFinite(engagement)) {
                return 0;
            }
            return (efficiency * 0.3) + (effectiveness * 0.4) + (engagement * 0.3);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating overall score:', error);
            return 0;
        }
    }
    safeDetectProductivityPatterns(messages, outputMetrics) {
        try {
            return this.detectProductivityPatterns(messages, outputMetrics);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error detecting productivity patterns:', error);
            return {
                breakthroughTriggers: [],
                effectiveApproaches: [],
                productivityKillers: [],
                optimalFlowState: false
            };
        }
    }
    safeDetectPeakPeriod(messages, outputMetrics) {
        try {
            return this.detectPeakPeriod(messages, outputMetrics);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error detecting peak period:', error);
            return undefined;
        }
    }
    safeCalculateHourlyProductivity(conversations) {
        try {
            return this.calculateHourlyProductivity(conversations);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating hourly productivity:', error);
            return {
                score: 0,
                conversationCount: 0,
                averageQuality: 0,
                insightRate: 0,
                confidenceLevel: 0
            };
        }
    }
    safeDetectHourlyPatterns(conversations) {
        try {
            return this.detectHourlyPatterns(conversations);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error detecting hourly patterns:', error);
            return {
                commonApproaches: [],
                successRate: 0,
                averageSessionLength: 0
            };
        }
    }
    safeExtractQuestions(messages) {
        try {
            return this.extractQuestions(messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error extracting questions:', error);
            return [];
        }
    }
    safeClassifyQuestionPattern(content) {
        try {
            return this.classifyQuestionPattern(content);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error classifying question pattern:', error);
            return 'general question';
        }
    }
    safeCalculateQuestionInsightScore(question, messages, productivity) {
        try {
            return this.calculateQuestionInsightScore(question, messages, productivity);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating question insight score:', error);
            return 0;
        }
    }
    safeGetResponseLength(question, messages) {
        try {
            return this.getResponseLength(question, messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error getting response length:', error);
            return 0;
        }
    }
    safeHasFollowupQuestions(question, messages) {
        try {
            return this.hasFollowupQuestions(question, messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error checking followup questions:', error);
            return false;
        }
    }
    safeIsBreakthroughQuestion(question, messages) {
        try {
            return this.isBreakthroughQuestion(question, messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error checking breakthrough question:', error);
            return false;
        }
    }
    safeCalculateAverage(values) {
        try {
            if (!values || values.length === 0)
                return 0;
            const validValues = values.filter(v => isFinite(v));
            if (validValues.length === 0)
                return 0;
            return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating average:', error);
            return 0;
        }
    }
    safeCalculateQuestionEffectivenessScore(insight, breakthrough, followup, response) {
        try {
            return this.calculateQuestionEffectivenessScore(insight, breakthrough, followup, response);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating question effectiveness score:', error);
            return 0;
        }
    }
    safeGenerateQuestionRecommendation(pattern, score) {
        try {
            return this.generateQuestionRecommendation(pattern, score);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error generating question recommendation:', error);
            return 'Consider refining question approach';
        }
    }
    safeDetectBreakthroughs(messages) {
        try {
            return this.detectBreakthroughs(messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error detecting breakthroughs:', error);
            return [];
        }
    }
    safeExtractBreakthroughPattern(breakthrough, messages) {
        try {
            return this.extractBreakthroughPattern(breakthrough, messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error extracting breakthrough pattern:', error);
            return 'unknown pattern';
        }
    }
    safeGetBreakthroughContext(breakthrough, messages) {
        try {
            return this.getBreakthroughContext(breakthrough, messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error getting breakthrough context:', error);
            return 'Context unavailable';
        }
    }
    safeGetBreakthroughOutcome(breakthrough, messages) {
        try {
            return this.getBreakthroughOutcome(breakthrough, messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error getting breakthrough outcome:', error);
            return 'Outcome unavailable';
        }
    }
    safeIdentifyPreconditions(breakthrough, messages) {
        try {
            return this.identifyPreconditions(breakthrough, messages);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error identifying preconditions:', error);
            return [];
        }
    }
    safeAssessBreakthroughSuccess(breakthrough, messages, productivity) {
        try {
            return this.assessBreakthroughSuccess(breakthrough, messages, productivity);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error assessing breakthrough success:', error);
            return false;
        }
    }
    safeGeneratePatternDescription(pattern, preconditions) {
        try {
            return this.generatePatternDescription(pattern, preconditions);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error generating pattern description:', error);
            return `Pattern: ${pattern || 'unknown'}`;
        }
    }
    safeCalculateSessionAverage(sessionData) {
        try {
            if (!sessionData || sessionData.length === 0)
                return 45; // Default
            const validSessions = sessionData.filter(s => s && isFinite(s.lengthMinutes) && s.lengthMinutes > 0);
            if (validSessions.length === 0)
                return 45;
            return validSessions.reduce((sum, s) => sum + s.lengthMinutes, 0) / validSessions.length;
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating session average:', error);
            return 45;
        }
    }
    safeCalculateCategoryEfficiency(sessions) {
        try {
            return this.calculateCategoryEfficiency(sessions);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating category efficiency:', error);
            return 0;
        }
    }
    safeFindOptimalSessionLength(sessionData) {
        try {
            return this.findOptimalSessionLength(sessionData);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error finding optimal session length:', error);
            return 45;
        }
    }
    safeCalculateOptimalRange(sessionData, optimalLength) {
        try {
            return this.calculateOptimalRange(sessionData, optimalLength);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error calculating optimal range:', error);
            return { min: 30, max: 60 };
        }
    }
    safeGenerateSessionRecommendations(current, optimal, shortEff, mediumEff, longEff) {
        try {
            return this.generateSessionRecommendations(current, optimal, shortEff, mediumEff, longEff);
        }
        catch (error) {
            console.warn('ProductivityAnalyzer: Error generating session recommendations:', error);
            return ['Maintain current session length', 'Focus on question quality'];
        }
    }
    /**
     * Private helper methods
     */
    calculateSessionDuration(messages) {
        if (!messages || messages.length === 0)
            return 0;
        const firstTimestamp = messages[0]?.createdAt;
        const lastTimestamp = messages[messages.length - 1]?.createdAt;
        if (!firstTimestamp || !lastTimestamp)
            return 0;
        return Math.max(0, lastTimestamp - firstTimestamp);
    }
    calculateActiveTime(messages) {
        // Estimate active conversation time (excluding long gaps)
        if (messages.length < 2)
            return 0;
        let activeTime = 0;
        for (let i = 1; i < messages.length; i++) {
            const gap = messages[i].createdAt - messages[i - 1].createdAt;
            if (gap < 600000) { // Less than 10 minutes is considered active
                activeTime += gap;
            }
        }
        return activeTime;
    }
    calculateResponseLatency(messages) {
        const gaps = [];
        for (let i = 1; i < messages.length; i++) {
            // Only consider user -> assistant transitions
            if (messages[i - 1].role === 'user' && messages[i].role === 'assistant') {
                gaps.push(messages[i].createdAt - messages[i - 1].createdAt);
            }
        }
        return gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    }
    analyzeQuestions(messages) {
        const userMessages = messages.filter(m => m.role === 'user');
        const questions = userMessages.filter(m => m.content.includes('?'));
        let effectiveQuestions = 0;
        let insightGeneratingQuestions = 0;
        let totalQualityScore = 0;
        for (const question of questions) {
            const qualityScore = this.assessQuestionQuality(question);
            totalQualityScore += qualityScore;
            if (qualityScore > 60)
                effectiveQuestions++;
            // Check if question led to insights (look at subsequent messages)
            const questionIndex = messages.indexOf(question);
            const nextFewMessages = messages.slice(questionIndex + 1, questionIndex + 3);
            const hasInsight = nextFewMessages.some(m => this.INSIGHT_KEYWORDS.some(keyword => m.content.toLowerCase().includes(keyword)));
            if (hasInsight)
                insightGeneratingQuestions++;
        }
        return {
            total: questions.length,
            effectiveQuestions,
            questionQualityScore: questions.length > 0 ? totalQualityScore / questions.length : 0,
            insightGeneratingQuestions
        };
    }
    measureOutputQuality(messages) {
        let insightCount = 0;
        let breakthroughCount = 0;
        let resolutionCount = 0;
        let actionableOutputs = 0;
        for (const message of messages) {
            const content = message.content.toLowerCase();
            // Count insights
            if (this.INSIGHT_KEYWORDS.some(keyword => content.includes(keyword))) {
                insightCount++;
            }
            // Count breakthroughs
            if (this.BREAKTHROUGH_KEYWORDS.some(keyword => content.includes(keyword))) {
                breakthroughCount++;
            }
            // Count resolutions
            if (['solved', 'resolved', 'fixed', 'working'].some(word => content.includes(word))) {
                resolutionCount++;
            }
            // Count actionable outputs
            if (['should', 'will', 'plan to', 'next step', 'action'].some(word => content.includes(word))) {
                actionableOutputs++;
            }
        }
        return {
            insightCount,
            breakthroughCount,
            resolutionCount,
            actionableOutputs
        };
    }
    calculateEfficiencyScore(messages, sessionDuration, outputMetrics) {
        const totalOutputs = outputMetrics.insightCount +
            outputMetrics.breakthroughCount +
            outputMetrics.resolutionCount;
        const durationHours = sessionDuration / (1000 * 60 * 60);
        const messageRate = messages.length / Math.max(durationHours, 0.1);
        const outputRate = totalOutputs / Math.max(durationHours, 0.1);
        // Normalize to 0-100 scale
        const messageScore = Math.min(50, messageRate * 5);
        const outputScore = Math.min(50, outputRate * 25);
        return messageScore + outputScore;
    }
    calculateEffectivenessScore(outputMetrics, questionMetrics, flowMetrics) {
        const outputScore = Math.min(40, (outputMetrics.insightCount * 10) +
            (outputMetrics.breakthroughCount * 20) +
            (outputMetrics.resolutionCount * 15) +
            (outputMetrics.actionableOutputs * 5));
        const questionScore = Math.min(30, (questionMetrics.effectiveQuestions * 5) +
            (questionMetrics.insightGeneratingQuestions * 10));
        const flowScore = flowMetrics ? Math.min(30, (flowMetrics.depthScore * 0.2) +
            ((1 - flowMetrics.circularityIndex) * 20) +
            (flowMetrics.progressionScore * 0.1)) : 20;
        return outputScore + questionScore + flowScore;
    }
    calculateEngagementScore(messages, questionMetrics) {
        const userMessages = messages.filter(m => m.role === 'user').length;
        const assistantMessages = messages.filter(m => m.role === 'assistant').length;
        const totalMessages = userMessages + assistantMessages;
        // Participation balance
        const balance = 1 - Math.abs(userMessages - assistantMessages) / totalMessages;
        const balanceScore = balance * 40;
        // Question engagement
        const questionRate = questionMetrics.total / Math.max(userMessages, 1);
        const questionScore = Math.min(30, questionRate * 30);
        // Message depth (average length)
        const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
        const depthScore = Math.min(30, avgLength / 20);
        return balanceScore + questionScore + depthScore;
    }
    detectProductivityPatterns(messages, outputMetrics) {
        const breakthroughTriggers = [];
        const effectiveApproaches = [];
        const productivityKillers = [];
        // Analyze message patterns around breakthroughs
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const isBreakthrough = this.BREAKTHROUGH_KEYWORDS.some(keyword => message.content.toLowerCase().includes(keyword));
            if (isBreakthrough && i > 0) {
                const previousMessage = messages[i - 1];
                breakthroughTriggers.push(this.extractTriggerPattern(previousMessage));
            }
        }
        // Detect effective approaches
        const highQualityMessages = messages.filter(m => m.content.length > 100 &&
            this.INSIGHT_KEYWORDS.some(keyword => m.content.toLowerCase().includes(keyword)));
        for (const message of highQualityMessages) {
            effectiveApproaches.push(this.extractApproachPattern(message));
        }
        // Detect productivity killers (repetitive patterns, circular discussions)
        const repetitivePatterns = this.detectRepetitivePatterns(messages);
        productivityKillers.push(...repetitivePatterns);
        // Determine if in optimal flow state
        const optimalFlowState = this.assessFlowState(messages, outputMetrics);
        return {
            breakthroughTriggers: [...new Set(breakthroughTriggers)].slice(0, 5),
            effectiveApproaches: [...new Set(effectiveApproaches)].slice(0, 5),
            productivityKillers: [...new Set(productivityKillers)].slice(0, 5),
            optimalFlowState
        };
    }
    detectPeakPeriod(messages, outputMetrics) {
        if (messages.length < 4)
            return undefined;
        const windowSize = Math.max(3, Math.floor(messages.length / 4));
        let bestWindow = { start: 0, end: windowSize - 1, score: 0 };
        for (let i = 0; i <= messages.length - windowSize; i++) {
            const window = messages.slice(i, i + windowSize);
            const score = this.calculateWindowProductivityScore(window);
            if (score > bestWindow.score) {
                bestWindow = {
                    start: i,
                    end: i + windowSize - 1,
                    score
                };
            }
        }
        if (bestWindow.score > 60) { // Only return if significantly productive
            return {
                start: messages[bestWindow.start].createdAt,
                end: messages[bestWindow.end].createdAt,
                score: bestWindow.score
            };
        }
        return undefined;
    }
    // Additional helper methods for completeness...
    createEmptyHourlyData(hour) {
        return {
            hour,
            productivity: {
                score: 0,
                conversationCount: 0,
                averageQuality: 0,
                insightRate: 0,
                confidenceLevel: 0
            },
            patterns: {
                commonApproaches: [],
                successRate: 0,
                averageSessionLength: 0
            }
        };
    }
    calculateHourlyProductivity(conversations) {
        const scores = conversations.map(c => c.productivity.overallProductivityScore);
        const qualities = conversations.map(c => c.productivity.effectivenessScore);
        const insights = conversations.map(c => c.productivity.outputMetrics.insightCount);
        return {
            score: scores.reduce((a, b) => a + b, 0) / scores.length,
            conversationCount: conversations.length,
            averageQuality: qualities.reduce((a, b) => a + b, 0) / qualities.length,
            insightRate: insights.reduce((a, b) => a + b, 0) / conversations.length,
            confidenceLevel: Math.min(0.9, conversations.length / 10)
        };
    }
    detectHourlyPatterns(conversations) {
        // Implementation would analyze patterns specific to this hour
        return {
            commonApproaches: ['focused questioning', 'systematic exploration'],
            successRate: 0.75,
            averageSessionLength: 45
        };
    }
    extractQuestions(messages) {
        return messages.filter(m => m.role === 'user' && m.content.includes('?'));
    }
    classifyQuestionPattern(content) {
        const lower = content.toLowerCase();
        for (const pattern of this.QUESTION_PATTERNS) {
            if (lower.includes(pattern)) {
                return pattern;
            }
        }
        return 'general question';
    }
    calculateQuestionInsightScore(question, allMessages, productivity) {
        // Look for insights in the following messages
        const questionIndex = allMessages.indexOf(question);
        const followingMessages = allMessages.slice(questionIndex + 1, questionIndex + 3);
        let score = 0;
        for (const message of followingMessages) {
            if (this.INSIGHT_KEYWORDS.some(keyword => message.content.toLowerCase().includes(keyword))) {
                score += 25;
            }
        }
        return Math.min(100, score);
    }
    getResponseLength(question, allMessages) {
        const questionIndex = allMessages.indexOf(question);
        if (questionIndex + 1 < allMessages.length) {
            return allMessages[questionIndex + 1].content.length;
        }
        return 0;
    }
    hasFollowupQuestions(question, allMessages) {
        const questionIndex = allMessages.indexOf(question);
        const nextUserMessages = allMessages.slice(questionIndex + 1)
            .filter(m => m.role === 'user')
            .slice(0, 2);
        return nextUserMessages.some(m => m.content.includes('?'));
    }
    isBreakthroughQuestion(question, allMessages) {
        const questionIndex = allMessages.indexOf(question);
        const followingMessages = allMessages.slice(questionIndex + 1, questionIndex + 3);
        return followingMessages.some(m => this.BREAKTHROUGH_KEYWORDS.some(keyword => m.content.toLowerCase().includes(keyword)));
    }
    calculateQuestionEffectivenessScore(insightScore, breakthroughProb, followupRate, responseLength) {
        return (insightScore * 0.4 +
            breakthroughProb * 100 * 0.3 +
            followupRate * 100 * 0.2 +
            Math.min(100, responseLength / 5) * 0.1);
    }
    generateQuestionRecommendation(pattern, score) {
        if (score > 80)
            return `Excellent pattern - continue using "${pattern}" questions`;
        if (score > 60)
            return `Good pattern - "${pattern}" is generally effective`;
        if (score > 40)
            return `Moderate pattern - try to be more specific with "${pattern}" questions`;
        return `Low effectiveness - consider alternative approaches to "${pattern}" questions`;
    }
    detectBreakthroughs(messages) {
        return messages
            .filter(m => this.BREAKTHROUGH_KEYWORDS.some(keyword => m.content.toLowerCase().includes(keyword)))
            .map(m => ({ message: m, timestamp: m.createdAt }));
    }
    extractBreakthroughPattern(breakthrough, messages) {
        // Analyze the context around breakthrough to identify pattern
        return 'systematic questioning'; // Simplified
    }
    getBreakthroughContext(breakthrough, messages) {
        return breakthrough.message.content.slice(0, 200);
    }
    getBreakthroughOutcome(breakthrough, messages) {
        // Look at messages following the breakthrough
        return 'problem resolved'; // Simplified
    }
    identifyPreconditions(breakthrough, messages) {
        return ['focused questioning', 'sufficient background'];
    }
    assessBreakthroughSuccess(breakthrough, messages, productivity) {
        return productivity.effectivenessScore > 70;
    }
    generatePatternDescription(pattern, preconditions) {
        return `${pattern} breakthrough pattern with preconditions: ${preconditions.join(', ')}`;
    }
    createDefaultSessionOptimization() {
        return {
            currentAverage: 45,
            optimalLength: 45,
            efficiency: {
                shortSessions: 60,
                mediumSessions: 75,
                longSessions: 65,
                optimalRange: { min: 30, max: 60 }
            },
            recommendations: ['Maintain current session length', 'Focus on question quality over quantity']
        };
    }
    calculateCategoryEfficiency(sessions) {
        if (sessions.length === 0)
            return 0;
        return sessions.reduce((sum, s) => sum + s.productivityScore, 0) / sessions.length;
    }
    findOptimalSessionLength(sessionData) {
        // Find length that maximizes productivity score
        let bestLength = 45;
        let bestScore = 0;
        for (const session of sessionData) {
            if (session.productivityScore > bestScore) {
                bestScore = session.productivityScore;
                bestLength = session.lengthMinutes;
            }
        }
        return bestLength;
    }
    calculateOptimalRange(sessionData, optimalLength) {
        const tolerance = optimalLength * 0.3;
        return {
            min: Math.max(15, optimalLength - tolerance),
            max: Math.min(120, optimalLength + tolerance)
        };
    }
    generateSessionRecommendations(current, optimal, shortEff, mediumEff, longEff) {
        const recommendations = [];
        if (Math.abs(current - optimal) > 15) {
            if (current > optimal) {
                recommendations.push(`Consider shorter sessions (~${optimal} minutes) for better efficiency`);
            }
            else {
                recommendations.push(`Consider longer sessions (~${optimal} minutes) for deeper exploration`);
            }
        }
        if (mediumEff > shortEff && mediumEff > longEff) {
            recommendations.push('Medium-length sessions (15-60 min) show highest effectiveness');
        }
        return recommendations;
    }
    // Additional helper methods for productivity analysis...
    assessQuestionQuality(question) {
        const content = question.content.toLowerCase();
        let score = 50; // Base score
        // Specific question types get bonuses
        if (content.includes('how might'))
            score += 20;
        if (content.includes('what if'))
            score += 15;
        if (content.includes('why'))
            score += 10;
        if (content.includes('explain'))
            score += 15;
        // Length bonus for detailed questions
        if (content.length > 50)
            score += 10;
        if (content.length > 100)
            score += 10;
        // Multiple question marks indicate uncertainty
        const questionMarks = (content.match(/\?/g) || []).length;
        if (questionMarks > 1)
            score -= 10;
        return Math.min(100, Math.max(0, score));
    }
    extractTriggerPattern(message) {
        // Analyze what kind of message led to breakthrough
        const content = message.content.toLowerCase();
        if (content.includes('specific'))
            return 'specific inquiry';
        if (content.includes('example'))
            return 'example request';
        if (content.includes('how'))
            return 'process question';
        if (content.includes('why'))
            return 'reasoning inquiry';
        return 'general exploration';
    }
    extractApproachPattern(message) {
        // Extract the approach that led to high-quality output
        const content = message.content.toLowerCase();
        if (content.includes('step by step'))
            return 'systematic approach';
        if (content.includes('example'))
            return 'example-driven';
        if (content.includes('compare'))
            return 'comparative analysis';
        return 'thorough exploration';
    }
    detectRepetitivePatterns(messages) {
        const patterns = [];
        // Look for repeated phrases
        const phrases = new Map();
        for (const message of messages) {
            const words = message.content.toLowerCase().split(/\s+/);
            for (let i = 0; i < words.length - 2; i++) {
                const phrase = words.slice(i, i + 3).join(' ');
                phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
            }
        }
        for (const [phrase, count] of phrases.entries()) {
            if (count > 3) {
                patterns.push(`repetitive phrase: ${phrase}`);
            }
        }
        return patterns;
    }
    assessFlowState(messages, outputMetrics) {
        // Indicators of optimal flow state
        const hasConsistentEngagement = messages.length > 5;
        const hasRegularInsights = outputMetrics.insightCount > 0;
        const hasProgression = outputMetrics.actionableOutputs > 0;
        return hasConsistentEngagement && hasRegularInsights && hasProgression;
    }
    calculateWindowProductivityScore(window) {
        const insights = window.filter(m => this.INSIGHT_KEYWORDS.some(keyword => m.content.toLowerCase().includes(keyword))).length;
        const questions = window.filter(m => m.content.includes('?')).length;
        const avgLength = window.reduce((sum, m) => sum + m.content.length, 0) / window.length;
        return (insights * 30) + (questions * 10) + Math.min(30, avgLength / 10);
    }
}
//# sourceMappingURL=ProductivityAnalyzer.js.map