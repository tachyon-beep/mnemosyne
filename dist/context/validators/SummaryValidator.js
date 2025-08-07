/**
 * Summary Validator - Quality validation and scoring for conversation summaries
 *
 * This module provides comprehensive validation of generated summaries to ensure
 * they meet quality standards, preserve important information, and maintain
 * consistency with the original conversation.
 */
/**
 * Summary quality validator
 */
export class SummaryValidator {
    config;
    constructor(_tokenCounter, config = {}) {
        // Default configuration
        this.config = {
            minScore: 0.7,
            enableEntityExtraction: true,
            enableContentAnalysis: true,
            enableFactualChecks: true,
            tokenTolerance: 0.2, // 20% tolerance
            weights: {
                informationCoverage: 0.3,
                entityPreservation: 0.25,
                consistency: 0.25,
                tokenCompliance: 0.1,
                factualAccuracy: 0.1
            },
            ...config
        };
    }
    /**
     * Validate a conversation summary
     */
    async validateSummary(summary, originalMessages) {
        const startTime = Date.now();
        const warnings = [];
        const errors = [];
        // Extract entities and analyze content
        const entityAnalysis = this.config.enableEntityExtraction
            ? await this.analyzeEntities(summary, originalMessages)
            : this.createEmptyEntityAnalysis();
        const contentAnalysis = this.config.enableContentAnalysis
            ? await this.analyzeContent(summary, originalMessages)
            : this.createEmptyContentAnalysis();
        // Calculate individual metrics
        const metrics = {
            informationCoverage: await this.calculateInformationCoverage(summary, originalMessages, contentAnalysis),
            entityPreservation: this.calculateEntityPreservation(entityAnalysis),
            consistency: await this.calculateConsistency(summary, originalMessages),
            tokenCompliance: this.calculateTokenCompliance(summary),
            factualAccuracy: this.config.enableFactualChecks
                ? await this.calculateFactualAccuracy(summary, originalMessages)
                : 1.0
        };
        // Check for errors and warnings
        this.checkValidationIssues(summary, originalMessages, metrics, warnings, errors);
        // Calculate weighted overall score
        const score = this.calculateOverallScore(metrics);
        const validationTime = Date.now() - startTime;
        return {
            score,
            metrics,
            warnings,
            errors,
            metadata: {
                validationTime,
                detectedEntities: entityAnalysis,
                contentAnalysis
            }
        };
    }
    /**
     * Analyze entities in summary vs original messages
     */
    async analyzeEntities(summary, originalMessages) {
        const originalText = originalMessages.map(m => m.content).join(' ');
        const summaryText = summary.summaryText;
        // Extract entities using simple regex patterns
        const entities = {
            people: this.extractPeople(originalText),
            dates: this.extractDates(originalText),
            numbers: this.extractNumbers(originalText),
            technicalTerms: this.extractTechnicalTerms(originalText),
            projects: this.extractProjects(originalText)
        };
        const summaryEntities = {
            people: this.extractPeople(summaryText),
            dates: this.extractDates(summaryText),
            numbers: this.extractNumbers(summaryText),
            technicalTerms: this.extractTechnicalTerms(summaryText),
            projects: this.extractProjects(summaryText)
        };
        // Calculate preservation rate
        const totalOriginal = Object.values(entities).reduce((sum, arr) => sum + arr.length, 0);
        const totalPreserved = Object.keys(entities).reduce((sum, key) => {
            const originalSet = new Set(entities[key]);
            const summarySet = new Set(summaryEntities[key]);
            const preserved = [...originalSet].filter(entity => summarySet.has(entity));
            return sum + preserved.length;
        }, 0);
        const preservationRate = totalOriginal > 0 ? totalPreserved / totalOriginal : 1.0;
        return {
            people: entities.people,
            dates: entities.dates,
            numbers: entities.numbers,
            technicalTerms: entities.technicalTerms,
            projects: entities.projects,
            preservationRate
        };
    }
    /**
     * Analyze content quality and structure
     */
    async analyzeContent(summary, originalMessages) {
        const originalText = originalMessages.map(m => m.content).join(' ');
        const summaryText = summary.summaryText;
        return {
            keyTopics: this.extractKeyTopics(originalText),
            sentimentPreserved: this.checkSentimentPreservation(originalText, summaryText),
            structureQuality: this.assessStructureQuality(summaryText),
            redundancyLevel: this.calculateRedundancy(summaryText),
            completenessScore: this.assessCompleteness(originalText, summaryText, summary.level)
        };
    }
    /**
     * Calculate information coverage score
     */
    async calculateInformationCoverage(summary, originalMessages, contentAnalysis) {
        // Base score from completeness
        let score = contentAnalysis.completenessScore;
        // Adjust based on summary level expectations
        const expectedCoverage = this.getExpectedCoverage(summary.level);
        const actualCoverage = this.estimateCoverage(summary, originalMessages);
        const coverageRatio = Math.min(actualCoverage / expectedCoverage, 1.0);
        score = (score + coverageRatio) / 2;
        // Penalty for too much redundancy
        if (contentAnalysis.redundancyLevel > 0.3) {
            score *= (1 - contentAnalysis.redundancyLevel * 0.5);
        }
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Calculate entity preservation score
     */
    calculateEntityPreservation(entityAnalysis) {
        return entityAnalysis.preservationRate;
    }
    /**
     * Calculate consistency score
     */
    async calculateConsistency(summary, originalMessages) {
        const originalText = originalMessages.map(m => m.content).join(' ');
        const summaryText = summary.summaryText;
        // Check for contradictions
        const contradictions = this.detectContradictions(originalText, summaryText);
        const contradictionPenalty = contradictions.length * 0.2;
        // Check temporal consistency
        const temporalConsistency = this.checkTemporalConsistency(originalMessages, summaryText);
        // Check factual consistency (simple keyword matching)
        const factualConsistency = this.checkFactualConsistency(originalText, summaryText);
        const score = Math.max(0, 1 - contradictionPenalty) * temporalConsistency * factualConsistency;
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Calculate token compliance score
     */
    calculateTokenCompliance(summary) {
        const targetTokens = this.getTargetTokenCount(summary.level);
        const actualTokens = summary.tokenCount;
        const tolerance = targetTokens * this.config.tokenTolerance;
        const minTokens = targetTokens - tolerance;
        const maxTokens = targetTokens + tolerance;
        if (actualTokens >= minTokens && actualTokens <= maxTokens) {
            return 1.0;
        }
        else if (actualTokens < minTokens) {
            // Penalty for being too short
            const shortfall = minTokens - actualTokens;
            return Math.max(0, 1 - (shortfall / targetTokens));
        }
        else {
            // Penalty for being too long
            const excess = actualTokens - maxTokens;
            return Math.max(0, 1 - (excess / targetTokens));
        }
    }
    /**
     * Calculate factual accuracy score
     */
    async calculateFactualAccuracy(summary, originalMessages) {
        const originalText = originalMessages.map(m => m.content).join(' ');
        const summaryText = summary.summaryText;
        // Check for hallucinations (content not in original)
        const hallucinationScore = this.detectHallucinations(originalText, summaryText);
        // Check factual statements
        const factualScore = this.verifyFactualStatements(originalText, summaryText);
        return (hallucinationScore + factualScore) / 2;
    }
    /**
     * Calculate overall weighted score
     */
    calculateOverallScore(metrics) {
        const weights = this.config.weights;
        return (metrics.informationCoverage * weights.informationCoverage +
            metrics.entityPreservation * weights.entityPreservation +
            metrics.consistency * weights.consistency +
            metrics.tokenCompliance * weights.tokenCompliance +
            metrics.factualAccuracy * weights.factualAccuracy);
    }
    /**
     * Check for validation warnings and errors
     */
    checkValidationIssues(summary, originalMessages, metrics, warnings, errors) {
        // Token count issues
        const targetTokens = this.getTargetTokenCount(summary.level);
        if (summary.tokenCount < targetTokens * 0.5) {
            warnings.push(`Summary is significantly shorter than expected (${summary.tokenCount} vs ~${targetTokens} tokens)`);
        }
        else if (summary.tokenCount > targetTokens * 1.5) {
            warnings.push(`Summary is significantly longer than expected (${summary.tokenCount} vs ~${targetTokens} tokens)`);
        }
        // Quality issues
        if (metrics.informationCoverage < 0.6) {
            warnings.push('Low information coverage - summary may be missing important content');
        }
        if (metrics.entityPreservation < 0.7) {
            warnings.push('Poor entity preservation - important names, dates, or numbers may be missing');
        }
        if (metrics.consistency < 0.7) {
            errors.push('Consistency issues detected - summary may contradict original content');
        }
        if (metrics.factualAccuracy < 0.8) {
            errors.push('Factual accuracy concerns - summary may contain hallucinated information');
        }
        // Content length check
        if (originalMessages.length === 0) {
            errors.push('No original messages provided for validation');
        }
        if (summary.summaryText.trim().length === 0) {
            errors.push('Summary is empty');
        }
    }
    // Entity extraction methods
    extractPeople(text) {
        // Simple regex for names (capitalized words, common patterns)
        const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
        const matches = text.match(namePattern) || [];
        // Filter out common false positives
        const commonWords = new Set(['The', 'This', 'That', 'Then', 'When', 'Where', 'What', 'Why', 'How']);
        return [...new Set(matches.filter(match => !commonWords.has(match)))];
    }
    extractDates(text) {
        const datePatterns = [
            /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // MM/DD/YYYY
            /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g, // MM-DD-YYYY
            /\b\d{4}-\d{1,2}-\d{1,2}\b/g, // YYYY-MM-DD
            /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
            /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi
        ];
        const dates = [];
        datePatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            dates.push(...matches);
        });
        return [...new Set(dates)];
    }
    extractNumbers(text) {
        const numberPattern = /\b\d+(?:\.\d+)?(?:\s*%|\s*percent|k|K|M|B)?\b/g;
        const matches = text.match(numberPattern) || [];
        return [...new Set(matches)];
    }
    extractTechnicalTerms(text) {
        // Common technical patterns
        const patterns = [
            /\b[a-zA-Z]+\.[a-zA-Z]+\b/g, // file.extension
            /\b[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*\b/g, // CamelCase
            /\b[a-z]+_[a-z_]+\b/g, // snake_case
            /\b[A-Z]{2,}\b/g, // ACRONYMS
            /\b(?:API|SDK|URL|HTTP|JSON|XML|SQL|HTML|CSS|JS)\b/gi
        ];
        const terms = [];
        patterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            terms.push(...matches);
        });
        return [...new Set(terms)];
    }
    extractProjects(text) {
        // Look for project-like patterns
        const projectPattern = /\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*(?:\s+(?:Project|System|App|Service|Tool|Platform))\b/g;
        const matches = text.match(projectPattern) || [];
        return [...new Set(matches)];
    }
    extractKeyTopics(text) {
        // Simple topic extraction using frequency analysis
        const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
        const frequency = {};
        words.forEach(word => {
            if (!this.isStopWord(word)) {
                frequency[word] = (frequency[word] || 0) + 1;
            }
        });
        return Object.entries(frequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }
    isStopWord(word) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        ]);
        return stopWords.has(word);
    }
    // Analysis methods
    checkSentimentPreservation(original, summary) {
        // Simple sentiment check based on positive/negative word counts
        const getScore = (text) => {
            const positive = (text.match(/\b(good|great|excellent|positive|success|achieve|complete)\b/gi) || []).length;
            const negative = (text.match(/\b(bad|terrible|negative|fail|problem|error|issue)\b/gi) || []).length;
            return positive - negative;
        };
        const originalScore = getScore(original);
        const summaryScore = getScore(summary);
        // Allow some tolerance
        return Math.abs(originalScore - summaryScore) <= Math.max(1, Math.abs(originalScore) * 0.5);
    }
    assessStructureQuality(text) {
        let score = 0.5; // Base score
        // Check for paragraph structure
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        if (paragraphs.length > 1)
            score += 0.2;
        // Check for logical flow indicators
        const flowIndicators = /\b(first|second|then|next|finally|however|therefore|additionally|furthermore)\b/gi;
        const flowMatches = text.match(flowIndicators) || [];
        score += Math.min(0.2, flowMatches.length * 0.05);
        // Check for bullet points or numbered lists
        if (/^\s*[-•*]\s+/m.test(text) || /^\s*\d+\.\s+/m.test(text)) {
            score += 0.1;
        }
        return Math.min(1, score);
    }
    calculateRedundancy(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length < 2)
            return 0;
        let redundantPairs = 0;
        for (let i = 0; i < sentences.length; i++) {
            for (let j = i + 1; j < sentences.length; j++) {
                const similarity = this.calculateSimilarity(sentences[i], sentences[j]);
                if (similarity > 0.7)
                    redundantPairs++;
            }
        }
        return redundantPairs / (sentences.length * (sentences.length - 1) / 2);
    }
    calculateSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
        const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }
    assessCompleteness(original, summary, level) {
        const originalWords = new Set(original.toLowerCase().match(/\b\w+\b/g) || []);
        const summaryWords = new Set(summary.toLowerCase().match(/\b\w+\b/g) || []);
        const coverage = [...originalWords].filter(word => summaryWords.has(word)).length / originalWords.size;
        // Adjust expectations based on summary level
        const expectedCoverage = {
            brief: 0.2,
            standard: 0.4,
            detailed: 0.6
        };
        return Math.min(1, coverage / expectedCoverage[level]);
    }
    // Validation helper methods
    detectContradictions(_original, _summary) {
        // Simple contradiction detection - this would need more sophisticated NLP in practice
        const contradictions = [];
        // This is a simplified approach - real implementation would need semantic analysis
        // For now, return empty array as placeholder
        return contradictions;
    }
    checkTemporalConsistency(_messages, summary) {
        // Look for temporal indicators in summary
        const temporalWords = summary.match(/\b(first|then|next|later|finally|before|after)\b/gi) || [];
        // If no temporal words, assume consistency
        if (temporalWords.length === 0)
            return 1.0;
        // More sophisticated temporal analysis would be needed for a complete implementation
        return 0.9; // Placeholder
    }
    checkFactualConsistency(original, summary) {
        const originalFacts = this.extractFactualStatements(original);
        const summaryFacts = this.extractFactualStatements(summary);
        if (summaryFacts.length === 0)
            return 1.0;
        const consistentFacts = summaryFacts.filter(fact => originalFacts.some(originalFact => this.factsAreConsistent(fact, originalFact)));
        return consistentFacts.length / summaryFacts.length;
    }
    extractFactualStatements(text) {
        // Extract statements that look like facts
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        return sentences.filter(sentence => {
            // Look for factual indicators
            return /\b(is|was|has|have|will|can|did|does|are|were)\b/i.test(sentence);
        });
    }
    factsAreConsistent(fact1, fact2) {
        // Simple consistency check based on word overlap
        return this.calculateSimilarity(fact1, fact2) > 0.3;
    }
    detectHallucinations(original, summary) {
        const originalWords = new Set(original.toLowerCase().match(/\b\w+\b/g) || []);
        const summaryWords = summary.toLowerCase().match(/\b\w+\b/g) || [];
        const uniqueSummaryWords = summaryWords.filter(word => !originalWords.has(word));
        const hallucinationRate = uniqueSummaryWords.length / summaryWords.length;
        // Allow some hallucination for natural language generation
        return Math.max(0, 1 - Math.max(0, hallucinationRate - 0.3) * 2);
    }
    verifyFactualStatements(_original, _summary) {
        // Placeholder for factual verification
        return 0.9;
    }
    // Helper methods
    getExpectedCoverage(level) {
        switch (level) {
            case 'brief': return 0.3;
            case 'standard': return 0.6;
            case 'detailed': return 0.8;
            default: return 0.6;
        }
    }
    estimateCoverage(summary, messages) {
        const originalText = messages.map(m => m.content).join(' ');
        const originalWords = new Set(originalText.toLowerCase().match(/\b\w+\b/g) || []);
        const summaryWords = new Set(summary.summaryText.toLowerCase().match(/\b\w+\b/g) || []);
        const coveredWords = [...originalWords].filter(word => summaryWords.has(word));
        return coveredWords.length / originalWords.size;
    }
    getTargetTokenCount(level) {
        switch (level) {
            case 'brief': return 75;
            case 'standard': return 250;
            case 'detailed': return 750;
            default: return 250;
        }
    }
    createEmptyEntityAnalysis() {
        return {
            people: [],
            dates: [],
            numbers: [],
            technicalTerms: [],
            projects: [],
            preservationRate: 1.0
        };
    }
    createEmptyContentAnalysis() {
        return {
            keyTopics: [],
            sentimentPreserved: true,
            structureQuality: 1.0,
            redundancyLevel: 0,
            completenessScore: 1.0
        };
    }
}
//# sourceMappingURL=SummaryValidator.js.map