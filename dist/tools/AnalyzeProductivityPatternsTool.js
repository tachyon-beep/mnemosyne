/**
 * Analyze Productivity Patterns Tool Implementation
 *
 * This tool analyzes productivity patterns across conversations to identify:
 * - Peak productivity hours and time-based patterns
 * - Optimal session length and timing
 * - Most effective question patterns and types
 * - Productivity trends over time
 * - Correlation between conversation characteristics and outcomes
 */
import { AnalyzeProductivityPatternsToolDef as AnalyzeProductivityPatternsToolDef } from '../types/mcp.js';
import { AnalyzeProductivityPatternsSchema } from '../types/schemas.js';
import { BaseTool, wrapDatabaseOperation } from './BaseTool.js';
import { validateDateRange, validateConversationIds, validateGranularity, ValidationError, formatValidationError, withEnhancedValidation } from '../utils/validation.js';
/**
 * Implementation of the analyze_productivity_patterns MCP tool
 */
export class AnalyzeProductivityPatternsTool extends BaseTool {
    analyticsEngine;
    conversationRepository;
    messageRepository;
    productivityAnalyzer;
    productivityPatternsRepository;
    constructor(dependencies) {
        super(AnalyzeProductivityPatternsToolDef, AnalyzeProductivityPatternsSchema);
        this.analyticsEngine = dependencies.analyticsEngine;
        this.conversationRepository = dependencies.conversationRepository;
        this.messageRepository = dependencies.messageRepository;
        this.productivityAnalyzer = dependencies.productivityAnalyzer;
        this.productivityPatternsRepository = dependencies.productivityPatternsRepository;
    }
    /**
     * Execute the analyze_productivity_patterns tool
     */
    async executeImpl(input, _context) {
        const startTime = Date.now();
        const componentsIncluded = [];
        try {
            // Step 1: Enhanced validation with comprehensive input checking
            const validatedInput = withEnhancedValidation(() => {
                // Validate time range with 30-day default for productivity analysis
                const timeRange = validateDateRange(input.startDate, input.endDate, '', {
                    maxDays: 180, // Allow up to 6 months for productivity pattern analysis
                    defaultDays: 30 // Default to 30 days for focused analysis
                });
                // Calculate time range in days for granularity validation
                const rangeDays = (timeRange.end - timeRange.start) / (1000 * 60 * 60 * 24);
                // Validate conversation IDs if provided
                const conversationIds = validateConversationIds(input.conversationIds, 'conversationIds', 100); // Limit to 100 for performance
                // Validate granularity with business rules
                const granularity = validateGranularity(input.granularity, rangeDays);
                return {
                    timeRange,
                    conversationIds,
                    granularity,
                    includePeakHours: input.includePeakHours,
                    includeSessionAnalysis: input.includeSessionAnalysis,
                    includeQuestionPatterns: input.includeQuestionPatterns
                };
            }, 'productivity patterns input validation');
            // Step 2: Get conversations and messages for analysis
            const { conversations, messages } = await this.getAnalysisData(validatedInput.conversationIds, validatedInput.timeRange);
            if (conversations.length === 0) {
                // Return empty analysis if no conversations found
                return this.createEmptyResponse(validatedInput.timeRange, validatedInput.granularity, startTime);
            }
            // Step 3: Run analysis components based on input flags
            const [peakHours, sessionAnalysis, questionPatterns, patterns, trends] = await Promise.all([
                validatedInput.includePeakHours ? this.analyzePeakHours(validatedInput.timeRange, componentsIncluded) : Promise.resolve([]),
                validatedInput.includeSessionAnalysis ? this.analyzeSessionPatterns(conversations, messages, componentsIncluded) : Promise.resolve(this.createEmptySessionAnalysis()),
                validatedInput.includeQuestionPatterns ? this.analyzeQuestionPatterns(conversations, messages, componentsIncluded) : Promise.resolve(this.createEmptyQuestionPatterns()),
                this.identifyProductivityPatterns(conversations, messages, validatedInput.timeRange),
                this.analyzeTrends(validatedInput.timeRange, validatedInput.granularity)
            ]);
            // Step 4: Generate insights and recommendations
            const insights = this.generateInsights(peakHours, sessionAnalysis, questionPatterns, patterns, trends);
            // Step 5: Build response metadata
            const analysisDuration = Date.now() - startTime;
            const metadata = {
                conversationCount: conversations.length,
                messageCount: messages.length,
                analysisDuration,
                granularity: validatedInput.granularity,
                componentsIncluded
            };
            return {
                timeRange: validatedInput.timeRange,
                analyzedAt: Date.now(),
                peakHours,
                sessionAnalysis,
                questionPatterns,
                patterns,
                trends,
                insights,
                metadata
            };
        }
        catch (error) {
            // Enhanced error handling with user-friendly messages
            if (error instanceof ValidationError) {
                throw new Error(JSON.stringify(formatValidationError(error)));
            }
            // Re-throw other errors with context
            throw new Error(`Productivity patterns analysis failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get conversations and messages for analysis
     */
    async getAnalysisData(conversationIds, timeRange) {
        return wrapDatabaseOperation(async () => {
            let conversations;
            if (conversationIds && conversationIds.length > 0) {
                // Get specific conversations
                conversations = await Promise.all(conversationIds.map(id => this.conversationRepository.findById(id)));
                conversations = conversations.filter(c => c !== null);
            }
            else {
                // Get all conversations in time range
                const conversationsResult = await this.conversationRepository.findByDateRange(timeRange.start, timeRange.end, 1000, // Large limit
                0);
                conversations = conversationsResult.data;
            }
            // Get messages for all conversations
            const messages = [];
            for (const conversation of conversations) {
                const conversationMessages = await this.messageRepository.findByConversationId(conversation.id);
                messages.push(...conversationMessages);
            }
            return { conversations, messages };
        }, 'Failed to retrieve analysis data');
    }
    /**
     * Analyze peak productivity hours
     */
    async analyzePeakHours(timeRange, componentsIncluded) {
        componentsIncluded.push('peak_hours');
        return wrapDatabaseOperation(async () => {
            return await this.productivityPatternsRepository.getPeakHours(timeRange);
        }, 'Failed to analyze peak hours');
    }
    /**
     * Analyze session patterns and optimal lengths
     */
    async analyzeSessionPatterns(conversations, messages, componentsIncluded) {
        componentsIncluded.push('session_analysis');
        return wrapDatabaseOperation(async () => {
            // Calculate session lengths and productivity correlations
            const sessions = this.calculateSessionMetrics(conversations, messages);
            return {
                optimalLength: this.findOptimalSessionLength(sessions),
                averageLength: sessions.reduce((sum, s) => sum + s.length, 0) / sessions.length || 0,
                lengthDistribution: this.calculateLengthDistribution(sessions),
                productivityByLength: this.calculateProductivityByLength(sessions)
            };
        }, 'Failed to analyze session patterns');
    }
    /**
     * Analyze question patterns and effectiveness
     */
    async analyzeQuestionPatterns(conversations, messages, componentsIncluded) {
        componentsIncluded.push('question_patterns');
        return wrapDatabaseOperation(async () => {
            const questionMessages = messages.filter(m => m.role === 'user' && m.content.includes('?'));
            // Analyze question patterns
            const patterns = this.extractQuestionPatterns(questionMessages);
            const types = this.categorizeQuestions(questionMessages);
            const bestPractices = this.identifyQuestionBestPractices(patterns, types);
            return {
                topPatterns: patterns.slice(0, 10), // Top 10 patterns
                questionTypes: types,
                bestPractices
            };
        }, 'Failed to analyze question patterns');
    }
    /**
     * Identify productivity patterns
     */
    async identifyProductivityPatterns(conversations, messages, timeRange) {
        return wrapDatabaseOperation(async () => {
            const patterns = [];
            // Pattern 1: Time-based productivity variations
            const hourlyProductivity = this.calculateHourlyProductivity(conversations, messages);
            if (hourlyProductivity.variance > 20) {
                patterns.push({
                    id: 'hourly_variation',
                    type: 'peak_hour',
                    description: 'Significant productivity variations throughout the day',
                    confidence: 0.8,
                    data: hourlyProductivity,
                    impact: 75
                });
            }
            // Pattern 2: Session length correlation
            const sessionLengthCorrelation = this.calculateSessionLengthCorrelation(conversations, messages);
            if (Math.abs(sessionLengthCorrelation) > 0.5) {
                patterns.push({
                    id: 'session_length_correlation',
                    type: 'session_length',
                    description: `${sessionLengthCorrelation > 0 ? 'Longer' : 'Shorter'} sessions tend to be more productive`,
                    confidence: Math.abs(sessionLengthCorrelation),
                    data: { correlation: sessionLengthCorrelation },
                    impact: 60
                });
            }
            return patterns;
        }, 'Failed to identify productivity patterns');
    }
    /**
     * Analyze temporal trends
     */
    async analyzeTrends(timeRange, granularity) {
        return wrapDatabaseOperation(async () => {
            return {
                weeklyTrend: await this.calculateWeeklyTrend(timeRange),
                monthlyTrend: await this.calculateMonthlyTrend(timeRange),
                byDayOfWeek: await this.calculateProductivityByDayOfWeek(timeRange),
                byHourOfDay: await this.calculateProductivityByHourOfDay(timeRange)
            };
        }, 'Failed to analyze trends');
    }
    /**
     * Generate insights and recommendations
     */
    generateInsights(peakHours, sessionAnalysis, questionPatterns, patterns, trends) {
        const keyInsights = [];
        const recommendations = [];
        const concerns = [];
        // Peak hours insights
        if (peakHours.length > 0) {
            keyInsights.push(`Peak productivity occurs at ${peakHours.join(', ')} hours`);
            recommendations.push(`Schedule important conversations during peak hours: ${peakHours.join(', ')}`);
        }
        // Session length insights
        if (sessionAnalysis.optimalLength > 0) {
            keyInsights.push(`Optimal session length is ${Math.round(sessionAnalysis.optimalLength)} minutes`);
            if (sessionAnalysis.optimalLength > 90) {
                concerns.push('Very long optimal session length may indicate inefficient conversations');
            }
            else if (sessionAnalysis.optimalLength < 15) {
                concerns.push('Very short optimal session length may indicate insufficient depth');
            }
        }
        // Question pattern insights
        if (questionPatterns.topPatterns.length > 0) {
            const bestPattern = questionPatterns.topPatterns[0];
            keyInsights.push(`Most effective question pattern: "${bestPattern.pattern}" (${Math.round(bestPattern.effectiveness * 100)}% effectiveness)`);
        }
        // Pattern-specific insights
        patterns.forEach(pattern => {
            if (pattern.impact > 70) {
                keyInsights.push(pattern.description);
            }
        });
        // Trend insights
        if (trends.weeklyTrend > 10) {
            keyInsights.push('Productivity is improving week over week');
        }
        else if (trends.weeklyTrend < -10) {
            concerns.push('Declining weekly productivity trend detected');
            recommendations.push('Review and adjust conversation approach to reverse declining trend');
        }
        // Default recommendations if none generated
        if (recommendations.length === 0) {
            recommendations.push('Continue monitoring productivity patterns for optimization opportunities');
        }
        return { keyInsights, recommendations, concerns };
    }
    // Helper methods for calculations
    calculateSessionMetrics(conversations, messages) {
        return conversations.map(conv => {
            const convMessages = messages.filter(m => m.conversationId === conv.id);
            const duration = convMessages.length > 0 ?
                new Date(convMessages[convMessages.length - 1].timestamp).getTime() -
                    new Date(convMessages[0].timestamp).getTime() : 0;
            return {
                conversationId: conv.id,
                length: Math.round(duration / (1000 * 60)), // Convert to minutes
                messageCount: convMessages.length,
                productivity: this.estimateConversationProductivity(convMessages)
            };
        });
    }
    findOptimalSessionLength(sessions) {
        // Simple implementation: find length range with highest average productivity
        const lengthRanges = this.groupSessionsByLength(sessions);
        let optimalLength = 0;
        let maxProductivity = 0;
        for (const [range, rangeSessions] of Object.entries(lengthRanges)) {
            const avgProductivity = rangeSessions.reduce((sum, s) => sum + s.productivity, 0) / rangeSessions.length;
            if (avgProductivity > maxProductivity) {
                maxProductivity = avgProductivity;
                optimalLength = parseInt(range);
            }
        }
        return optimalLength;
    }
    calculateLengthDistribution(sessions) {
        const distribution = {};
        const ranges = ['0-15', '15-30', '30-60', '60-120', '120+'];
        ranges.forEach(range => distribution[range] = 0);
        sessions.forEach(session => {
            if (session.length <= 15)
                distribution['0-15']++;
            else if (session.length <= 30)
                distribution['15-30']++;
            else if (session.length <= 60)
                distribution['30-60']++;
            else if (session.length <= 120)
                distribution['60-120']++;
            else
                distribution['120+']++;
        });
        return distribution;
    }
    calculateProductivityByLength(sessions) {
        const grouped = this.groupSessionsByLength(sessions);
        return Object.entries(grouped).map(([length, sessions]) => ({
            length: parseInt(length),
            productivity: sessions.reduce((sum, s) => sum + s.productivity, 0) / sessions.length
        }));
    }
    groupSessionsByLength(sessions) {
        const groups = {};
        sessions.forEach(session => {
            const bucketSize = 15; // 15-minute buckets
            const bucket = Math.floor(session.length / bucketSize) * bucketSize;
            const key = bucket.toString();
            if (!groups[key])
                groups[key] = [];
            groups[key].push(session);
        });
        return groups;
    }
    extractQuestionPatterns(questionMessages) {
        // Simple pattern extraction based on question starters
        const patterns = new Map();
        questionMessages.forEach(msg => {
            const content = msg.content.toLowerCase();
            let pattern = 'Other';
            if (content.startsWith('how'))
                pattern = 'How questions';
            else if (content.startsWith('what'))
                pattern = 'What questions';
            else if (content.startsWith('why'))
                pattern = 'Why questions';
            else if (content.startsWith('when'))
                pattern = 'When questions';
            else if (content.startsWith('where'))
                pattern = 'Where questions';
            else if (content.startsWith('can'))
                pattern = 'Can questions';
            else if (content.startsWith('would'))
                pattern = 'Would questions';
            else if (content.startsWith('should'))
                pattern = 'Should questions';
            if (!patterns.has(pattern)) {
                patterns.set(pattern, { count: 0, effectiveness: 0.5, examples: [] });
            }
            const p = patterns.get(pattern);
            p.count++;
            if (p.examples.length < 3) {
                p.examples.push(msg.content);
            }
        });
        return Array.from(patterns.entries()).map(([pattern, data]) => ({
            pattern,
            frequency: data.count,
            effectiveness: data.effectiveness,
            examples: data.examples
        }));
    }
    categorizeQuestions(questionMessages) {
        const categories = [
            { type: 'Information seeking', count: 0, totalProductivity: 0 },
            { type: 'Clarification', count: 0, totalProductivity: 0 },
            { type: 'Problem solving', count: 0, totalProductivity: 0 },
            { type: 'Brainstorming', count: 0, totalProductivity: 0 }
        ];
        questionMessages.forEach(msg => {
            // Simple categorization logic
            const content = msg.content.toLowerCase();
            let categoryIndex = 0;
            if (content.includes('what is') || content.includes('explain'))
                categoryIndex = 0;
            else if (content.includes('clarify') || content.includes('mean by'))
                categoryIndex = 1;
            else if (content.includes('how to') || content.includes('solve'))
                categoryIndex = 2;
            else if (content.includes('ideas') || content.includes('suggestions'))
                categoryIndex = 3;
            categories[categoryIndex].count++;
            categories[categoryIndex].totalProductivity += 50; // Default productivity estimate
        });
        return categories.map(cat => ({
            type: cat.type,
            count: cat.count,
            avgProductivity: cat.count > 0 ? cat.totalProductivity / cat.count : 0
        }));
    }
    identifyQuestionBestPractices(patterns, types) {
        const practices = [];
        // Find most effective pattern
        const mostEffective = patterns.reduce((prev, current) => (current.effectiveness > prev.effectiveness) ? current : prev);
        if (mostEffective) {
            practices.push(`Use "${mostEffective.pattern}" for higher engagement`);
        }
        // Check for balance in question types
        const typeBalance = types.filter(t => t.count > 0).length;
        if (typeBalance >= 3) {
            practices.push('Good variety in question types maintains engagement');
        }
        return practices;
    }
    estimateConversationProductivity(messages) {
        // Simple productivity estimation based on message length and count
        const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length || 0;
        const questionCount = messages.filter(m => m.content.includes('?')).length;
        // Basic formula: consider message quality and engagement
        return Math.min(100, Math.max(0, (avgLength / 100) +
            (questionCount * 5) +
            (messages.length * 2)));
    }
    calculateHourlyProductivity(conversations, messages) {
        const hourlyData = new Array(24).fill(0).map(() => ({
            count: 0,
            totalProductivity: 0,
            messageCount: 0,
            avgMessageLength: 0,
            engagementScore: 0
        }));
        // First pass: collect conversation data by hour
        conversations.forEach(conversation => {
            const convMessages = messages.filter(m => m.conversationId === conversation.id);
            if (convMessages.length === 0)
                return;
            const startTime = new Date(convMessages[0].timestamp);
            const hour = startTime.getHours();
            // Calculate conversation productivity metrics
            const productivity = this.estimateConversationProductivity(convMessages);
            const avgLength = convMessages.reduce((sum, m) => sum + m.content.length, 0) / convMessages.length;
            const engagement = this.calculateEngagementScore(convMessages);
            hourlyData[hour].count++;
            hourlyData[hour].totalProductivity += productivity;
            hourlyData[hour].messageCount += convMessages.length;
            hourlyData[hour].avgMessageLength += avgLength;
            hourlyData[hour].engagementScore += engagement;
        });
        // Calculate averages and productivity scores
        const hourlyAvg = hourlyData.map((h, hour) => {
            if (h.count === 0)
                return { hour, productivity: 0 };
            const avgProductivity = h.totalProductivity / h.count;
            const avgMsgLength = h.avgMessageLength / h.count;
            const avgEngagement = h.engagementScore / h.count;
            // Weighted productivity score
            const weightedProductivity = (avgProductivity * 0.5 +
                Math.min(100, avgMsgLength / 10) * 0.3 + // Message quality factor
                avgEngagement * 0.2);
            return {
                hour,
                productivity: Math.round(weightedProductivity)
            };
        });
        // Calculate variance
        const avgProductivity = hourlyAvg.reduce((sum, h) => sum + h.productivity, 0) / 24;
        const variance = hourlyAvg.reduce((sum, h) => sum + Math.pow(h.productivity - avgProductivity, 2), 0) / 24;
        return { hourlyAvg, variance: Math.round(variance) };
    }
    calculateEngagementScore(messages) {
        if (messages.length === 0)
            return 0;
        let engagementScore = 0;
        // Question engagement
        const questionCount = messages.filter(m => m.content.includes('?')).length;
        engagementScore += (questionCount / messages.length) * 30;
        // Response depth (longer responses indicate engagement)
        const avgResponseLength = messages
            .filter(m => m.role === 'assistant')
            .reduce((sum, m) => sum + m.content.length, 0) /
            messages.filter(m => m.role === 'assistant').length || 0;
        engagementScore += Math.min(30, avgResponseLength / 100);
        // Conversation flow (back-and-forth exchanges)
        let exchanges = 0;
        for (let i = 1; i < messages.length; i++) {
            if (messages[i].role !== messages[i - 1].role) {
                exchanges++;
            }
        }
        const exchangeRate = exchanges / Math.max(1, messages.length - 1);
        engagementScore += exchangeRate * 40;
        return Math.min(100, Math.max(0, engagementScore));
    }
    calculateSessionLengthCorrelation(conversations, messages) {
        const sessions = this.calculateSessionMetrics(conversations, messages);
        if (sessions.length < 2)
            return 0;
        // Calculate Pearson correlation coefficient
        const n = sessions.length;
        const sumX = sessions.reduce((sum, s) => sum + s.length, 0);
        const sumY = sessions.reduce((sum, s) => sum + s.productivity, 0);
        const sumXY = sessions.reduce((sum, s) => sum + (s.length * s.productivity), 0);
        const sumXX = sessions.reduce((sum, s) => sum + (s.length * s.length), 0);
        const sumYY = sessions.reduce((sum, s) => sum + (s.productivity * s.productivity), 0);
        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt(((n * sumXX) - (sumX * sumX)) * ((n * sumYY) - (sumY * sumY)));
        if (denominator === 0)
            return 0;
        const correlation = numerator / denominator;
        // Ensure correlation is between -1 and 1
        return Math.max(-1, Math.min(1, correlation));
    }
    async calculateWeeklyTrend(timeRange) {
        return wrapDatabaseOperation(async () => {
            // Get productivity data by week
            const weeklyData = await this.calculateWeeklyProductivityData(timeRange);
            if (weeklyData.length < 2)
                return 0;
            // Calculate linear regression for trend
            const n = weeklyData.length;
            const sumX = weeklyData.reduce((sum, _, i) => sum + i, 0);
            const sumY = weeklyData.reduce((sum, data) => sum + data.productivity, 0);
            const sumXY = weeklyData.reduce((sum, data, i) => sum + (i * data.productivity), 0);
            const sumXX = weeklyData.reduce((sum, _, i) => sum + (i * i), 0);
            // Calculate slope (trend)
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            // Convert slope to percentage change per week
            const avgProductivity = sumY / n;
            const trendPercentage = avgProductivity > 0 ? (slope / avgProductivity) * 100 : 0;
            return Math.round(trendPercentage * 10) / 10; // Round to 1 decimal place
        }, 'Failed to calculate weekly trend');
    }
    async calculateWeeklyProductivityData(timeRange) {
        const weekLength = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
        const weeks = [];
        for (let weekStart = timeRange.start; weekStart < timeRange.end; weekStart += weekLength) {
            const weekEnd = Math.min(weekStart + weekLength, timeRange.end);
            const weekNumber = Math.floor((weekStart - timeRange.start) / weekLength);
            // Get productivity data for this week (would come from repository in practice)
            const productivity = await this.productivityPatternsRepository.getWeeklyProductivity({
                start: weekStart,
                end: weekEnd
            });
            weeks.push({ week: weekNumber, productivity });
        }
        return weeks;
    }
    async calculateMonthlyTrend(timeRange) {
        return wrapDatabaseOperation(async () => {
            const monthlyData = await this.calculateMonthlyProductivityData(timeRange);
            if (monthlyData.length < 2)
                return 0;
            // Calculate trend using linear regression
            const n = monthlyData.length;
            const sumX = monthlyData.reduce((sum, _, i) => sum + i, 0);
            const sumY = monthlyData.reduce((sum, data) => sum + data.productivity, 0);
            const sumXY = monthlyData.reduce((sum, data, i) => sum + (i * data.productivity), 0);
            const sumXX = monthlyData.reduce((sum, _, i) => sum + (i * i), 0);
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const avgProductivity = sumY / n;
            const trendPercentage = avgProductivity > 0 ? (slope / avgProductivity) * 100 : 0;
            return Math.round(trendPercentage * 10) / 10;
        }, 'Failed to calculate monthly trend');
    }
    async calculateMonthlyProductivityData(timeRange) {
        const monthLength = 30 * 24 * 60 * 60 * 1000; // Approximate month
        const months = [];
        for (let monthStart = timeRange.start; monthStart < timeRange.end; monthStart += monthLength) {
            const monthEnd = Math.min(monthStart + monthLength, timeRange.end);
            const monthNumber = Math.floor((monthStart - timeRange.start) / monthLength);
            const productivity = await this.productivityPatternsRepository.getMonthlyProductivity({
                start: monthStart,
                end: monthEnd
            });
            months.push({ month: monthNumber, productivity });
        }
        return months;
    }
    async calculateProductivityByDayOfWeek(timeRange) {
        return wrapDatabaseOperation(async () => {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const productivityByDay = {};
            // Get productivity data from repository
            const dailyData = await this.productivityPatternsRepository.getDailyProductivity(timeRange);
            // Group by day of week and calculate averages
            const dayGroups = new Map();
            dailyData.forEach(entry => {
                const date = new Date(entry.timestamp);
                const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
                if (!dayGroups.has(dayOfWeek)) {
                    dayGroups.set(dayOfWeek, []);
                }
                dayGroups.get(dayOfWeek).push(entry.productivity);
            });
            // Calculate averages for each day
            dayNames.forEach((dayName, index) => {
                const dayScores = dayGroups.get(index) || [];
                if (dayScores.length > 0) {
                    const average = dayScores.reduce((sum, score) => sum + score, 0) / dayScores.length;
                    productivityByDay[dayName] = Math.round(average);
                }
                else {
                    productivityByDay[dayName] = 50; // Default if no data
                }
            });
            return productivityByDay;
        }, 'Failed to calculate productivity by day of week');
    }
    async calculateProductivityByHourOfDay(timeRange) {
        return wrapDatabaseOperation(async () => {
            const hourlyData = {};
            // Get hourly productivity data from repository
            const data = await this.productivityPatternsRepository.getHourlyProductivity(timeRange);
            // Group data by hour and calculate averages
            const hourGroups = new Map();
            data.forEach(entry => {
                const hour = entry.hour;
                if (!hourGroups.has(hour)) {
                    hourGroups.set(hour, []);
                }
                hourGroups.get(hour).push(entry.avgScore);
            });
            // Calculate average for each hour
            for (let hour = 0; hour < 24; hour++) {
                const hourScores = hourGroups.get(hour) || [];
                if (hourScores.length > 0) {
                    const average = hourScores.reduce((sum, score) => sum + score, 0) / hourScores.length;
                    hourlyData[hour] = Math.round(average);
                }
                else {
                    // Use reasonable defaults for hours with no data
                    if (hour >= 9 && hour <= 11)
                        hourlyData[hour] = 70; // Morning
                    else if (hour >= 14 && hour <= 16)
                        hourlyData[hour] = 65; // Afternoon
                    else if (hour >= 19 && hour <= 21)
                        hourlyData[hour] = 60; // Evening
                    else if (hour >= 22 || hour <= 6)
                        hourlyData[hour] = 30; // Night
                    else
                        hourlyData[hour] = 50; // Other times
                }
            }
            return hourlyData;
        }, 'Failed to calculate productivity by hour of day');
    }
    createEmptyResponse(timeRange, granularity, startTime) {
        return {
            timeRange,
            analyzedAt: Date.now(),
            peakHours: [],
            sessionAnalysis: this.createEmptySessionAnalysis(),
            questionPatterns: this.createEmptyQuestionPatterns(),
            patterns: [],
            trends: {
                weeklyTrend: 0,
                monthlyTrend: 0,
                byDayOfWeek: {},
                byHourOfDay: {}
            },
            insights: {
                keyInsights: ['No conversations found in the specified time range'],
                recommendations: ['Start conversations to begin productivity analysis'],
                concerns: []
            },
            metadata: {
                conversationCount: 0,
                messageCount: 0,
                analysisDuration: Date.now() - startTime,
                granularity,
                componentsIncluded: []
            }
        };
    }
    createEmptySessionAnalysis() {
        return {
            optimalLength: 0,
            averageLength: 0,
            lengthDistribution: {},
            productivityByLength: []
        };
    }
    createEmptyQuestionPatterns() {
        return {
            topPatterns: [],
            questionTypes: [],
            bestPractices: []
        };
    }
    /**
     * Static factory method to create an AnalyzeProductivityPatternsTool instance
     */
    static create(dependencies) {
        return new AnalyzeProductivityPatternsTool(dependencies);
    }
}
//# sourceMappingURL=AnalyzeProductivityPatternsTool.js.map