/**
 * Summary Validator - Quality validation and scoring for conversation summaries
 *
 * This module provides comprehensive validation of generated summaries to ensure
 * they meet quality standards, preserve important information, and maintain
 * consistency with the original conversation.
 */
import { Message, ConversationSummary } from '../../types/interfaces.js';
import { TokenCounter } from '../TokenCounter.js';
/**
 * Validation result with detailed scoring
 */
export interface ValidationResult {
    /** Overall quality score (0-1) */
    score: number;
    /** Individual metric scores */
    metrics: {
        /** Information coverage score (0-1) */
        informationCoverage: number;
        /** Entity preservation score (0-1) */
        entityPreservation: number;
        /** Consistency score (0-1) */
        consistency: number;
        /** Token count compliance (0-1) */
        tokenCompliance: number;
        /** Factual accuracy (0-1) */
        factualAccuracy: number;
    };
    /** Validation warnings */
    warnings: string[];
    /** Validation errors */
    errors: string[];
    /** Additional metadata */
    metadata: {
        /** Total validation time in ms */
        validationTime: number;
        /** Detected entities */
        detectedEntities: EntityAnalysis;
        /** Content analysis */
        contentAnalysis: ContentAnalysis;
    };
}
/**
 * Entity analysis results
 */
export interface EntityAnalysis {
    /** People mentioned */
    people: string[];
    /** Dates mentioned */
    dates: string[];
    /** Numbers/quantities */
    numbers: string[];
    /** Technical terms */
    technicalTerms: string[];
    /** Projects/systems */
    projects: string[];
    /** Preservation rate (0-1) */
    preservationRate: number;
}
/**
 * Content analysis results
 */
export interface ContentAnalysis {
    /** Key topics identified */
    keyTopics: string[];
    /** Sentiment preservation */
    sentimentPreserved: boolean;
    /** Structure quality */
    structureQuality: number;
    /** Redundancy level */
    redundancyLevel: number;
    /** Completeness score */
    completenessScore: number;
}
/**
 * Validation configuration
 */
export interface ValidationConfig {
    /** Minimum acceptable score */
    minScore: number;
    /** Enable entity extraction */
    enableEntityExtraction: boolean;
    /** Enable content analysis */
    enableContentAnalysis: boolean;
    /** Enable factual accuracy checks */
    enableFactualChecks: boolean;
    /** Token tolerance (±percentage) */
    tokenTolerance: number;
    /** Weights for different metrics */
    weights: {
        informationCoverage: number;
        entityPreservation: number;
        consistency: number;
        tokenCompliance: number;
        factualAccuracy: number;
    };
}
/**
 * Summary quality validator
 */
export declare class SummaryValidator {
    private readonly config;
    constructor(_tokenCounter: TokenCounter, config?: Partial<ValidationConfig>);
    /**
     * Validate a conversation summary
     */
    validateSummary(summary: ConversationSummary, originalMessages: Message[]): Promise<ValidationResult>;
    /**
     * Analyze entities in summary vs original messages
     */
    private analyzeEntities;
    /**
     * Analyze content quality and structure
     */
    private analyzeContent;
    /**
     * Calculate information coverage score
     */
    private calculateInformationCoverage;
    /**
     * Calculate entity preservation score
     */
    private calculateEntityPreservation;
    /**
     * Calculate consistency score
     */
    private calculateConsistency;
    /**
     * Calculate token compliance score
     */
    private calculateTokenCompliance;
    /**
     * Calculate factual accuracy score
     */
    private calculateFactualAccuracy;
    /**
     * Calculate overall weighted score
     */
    private calculateOverallScore;
    /**
     * Check for validation warnings and errors
     */
    private checkValidationIssues;
    private extractPeople;
    private extractDates;
    private extractNumbers;
    private extractTechnicalTerms;
    private extractProjects;
    private extractKeyTopics;
    private isStopWord;
    private checkSentimentPreservation;
    private assessStructureQuality;
    private calculateRedundancy;
    private calculateSimilarity;
    private assessCompleteness;
    private detectContradictions;
    private checkTemporalConsistency;
    private checkFactualConsistency;
    private extractFactualStatements;
    private factsAreConsistent;
    private detectHallucinations;
    private verifyFactualStatements;
    private getExpectedCoverage;
    private estimateCoverage;
    private getTargetTokenCount;
    private createEmptyEntityAnalysis;
    private createEmptyContentAnalysis;
}
//# sourceMappingURL=SummaryValidator.d.ts.map