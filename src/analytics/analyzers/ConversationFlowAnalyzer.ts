/**
 * Conversation Flow Analyzer
 * 
 * Analyzes conversation flow patterns and dynamics:
 * - Topic extraction from messages
 * - Topic transition analysis
 * - Conversation depth measurement
 * - Circularity detection using graph algorithms
 * - Resolution velocity tracking
 * - Discussion quality assessment
 */

import { Message, Conversation } from '../../types/interfaces.js';

export interface Topic {
  id: string;
  content: string;
  normalizedContent: string;
  timestamp: number;
  messageId: string;
  confidence: number;
  weight: number;
  embedding?: number[]; // Optional semantic embedding
}

export interface TopicTransition {
  fromTopic: string;
  toTopic: string;
  timestamp: number;
  transitionType: 'natural' | 'abrupt' | 'return' | 'tangent';
  confidence: number;
  timeGap: number; // milliseconds
}

export interface ConversationFlowMetrics {
  conversationId: string;
  analyzedAt: number;
  
  // Topic metrics
  topics: Topic[];
  topicTransitions: TopicTransition[];
  topicCount: number;
  transitionCount: number;
  
  // Flow quality metrics
  depthScore: number; // 0-100
  circularityIndex: number; // 0-1 (0 = linear, 1 = highly circular)
  coherenceScore: number; // 0-100
  progressionScore: number; // 0-100
  
  // Timing metrics
  resolutionTime?: number; // milliseconds to resolution
  averageTopicDuration: number; // milliseconds
  fastestTransition: number; // milliseconds
  slowestTransition: number; // milliseconds
  
  // Engagement metrics
  questionDensity: number; // questions per message
  insightDensity: number; // insights per message
  participationBalance: number; // 0-1 (0 = unbalanced, 1 = balanced)
  
  // Metadata
  messageCount: number;
  averageMessageLength: number;
  vocabularyRichness: number;
}

export interface CircularityAnalysis {
  stronglyConnectedComponents: string[][];
  cycleCount: number;
  averageCycleLength: number;
  maxCycleLength: number;
  nodesInCycles: number;
  circularityIndex: number;
}

/**
 * Analyzes conversation flow patterns using NLP and graph algorithms
 */
export class ConversationFlowAnalyzer {
  private readonly MIN_TOPIC_LENGTH = 2;
  private readonly MAX_TOPIC_LENGTH = 5;
  private readonly TOPIC_CONFIDENCE_THRESHOLD = 0.6;
  private readonly TRANSITION_TIME_THRESHOLD = 300000; // 5 minutes

  /**
   * Analyze complete conversation flow
   */
  async analyzeFlow(
    conversation: Conversation, 
    messages: Message[]
  ): Promise<ConversationFlowMetrics> {
    try {
      if (!conversation || !messages) {
        console.warn('ConversationFlowAnalyzer: Invalid input parameters');
        return this.createDefaultFlowMetrics(conversation?.id || 'unknown');
      }

      if (messages.length === 0) {
        console.info('ConversationFlowAnalyzer: Empty conversation, returning default metrics');
        return this.createDefaultFlowMetrics(conversation.id);
      }

      const startTime = Date.now();
      
      // Step 1: Extract topics from messages with error handling
      const topics = this.safeExtractTopics(messages);
      
      // Step 2: Build topic transition graph with error handling
      const transitions = this.safeBuildTransitionGraph(topics, messages);
      
      // Step 3: Calculate flow metrics with error handling
      const depthScore = this.safeCalculateDepthScore(messages, topics);
      const circularityAnalysis = this.safeAnalyzeCircularity(topics, transitions);
      const coherenceScore = this.safeCalculateCoherence(topics, transitions);
      const progressionScore = this.safeCalculateProgression(topics, transitions);
      
      // Step 4: Analyze timing patterns with error handling
      const timingMetrics = this.safeAnalyzeTimingPatterns(messages, topics, transitions);
      
      // Step 5: Calculate engagement metrics with error handling
      const engagementMetrics = this.safeCalculateEngagementMetrics(messages);
      
      // Step 6: Calculate vocabulary and content metrics with error handling
      const contentMetrics = this.safeCalculateContentMetrics(messages);

      return {
        conversationId: conversation.id,
        analyzedAt: startTime,
        
        topics: topics || [],
        topicTransitions: transitions || [],
        topicCount: Math.max(0, (topics || []).length),
        transitionCount: Math.max(0, (transitions || []).length),
        
        depthScore: Math.max(0, Math.min(100, depthScore)),
        circularityIndex: Math.max(0, Math.min(1, circularityAnalysis.circularityIndex)),
        coherenceScore: Math.max(0, Math.min(100, coherenceScore)),
        progressionScore: Math.max(0, Math.min(100, progressionScore)),
        
        resolutionTime: this.safeDetectResolutionTime(messages),
        averageTopicDuration: Math.max(0, timingMetrics.averageTopicDuration),
        fastestTransition: Math.max(0, timingMetrics.fastestTransition),
        slowestTransition: Math.max(0, timingMetrics.slowestTransition),
        
        questionDensity: Math.max(0, Math.min(1, engagementMetrics.questionDensity)),
        insightDensity: Math.max(0, Math.min(1, engagementMetrics.insightDensity)),
        participationBalance: Math.max(0, Math.min(1, engagementMetrics.participationBalance)),
        
        messageCount: Math.max(0, messages.length),
        averageMessageLength: Math.max(0, contentMetrics.averageLength),
        vocabularyRichness: Math.max(0, contentMetrics.vocabularyRichness)
      };
    } catch (error) {
      console.error('ConversationFlowAnalyzer: Failed to analyze conversation flow:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: conversation?.id,
        messageCount: messages?.length
      });
      
      return {
        ...this.createDefaultFlowMetrics(conversation?.id || 'unknown'),
        error: true,
        errorMessage: 'Flow analysis partially completed due to processing error'
      } as any;
    }
  }

  /**
   * Safe wrapper methods for error handling
   */

  private createDefaultFlowMetrics(conversationId: string): ConversationFlowMetrics {
    return {
      conversationId,
      analyzedAt: Date.now(),
      topics: [],
      topicTransitions: [],
      topicCount: 0,
      transitionCount: 0,
      depthScore: 0,
      circularityIndex: 0,
      coherenceScore: 0,
      progressionScore: 0,
      averageTopicDuration: 0,
      fastestTransition: 0,
      slowestTransition: 0,
      questionDensity: 0,
      insightDensity: 0,
      participationBalance: 0,
      messageCount: 0,
      averageMessageLength: 0,
      vocabularyRichness: 0
    };
  }

  private safeExtractTopics(messages: Message[]): Topic[] {
    try {
      return this.extractTopics(messages);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error extracting topics:', error);
      return [];
    }
  }

  private safeBuildTransitionGraph(topics: Topic[], messages: Message[]): TopicTransition[] {
    try {
      return this.buildTransitionGraph(topics, messages);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error building transition graph:', error);
      return [];
    }
  }

  private safeCalculateDepthScore(messages: Message[], topics: Topic[]): number {
    try {
      return this.calculateDepthScore(messages, topics);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating depth score:', error);
      return 0;
    }
  }

  private safeAnalyzeCircularity(topics: Topic[], transitions: TopicTransition[]): CircularityAnalysis {
    try {
      return this.analyzeCircularity(topics, transitions);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error analyzing circularity:', error);
      return {
        stronglyConnectedComponents: [],
        cycleCount: 0,
        averageCycleLength: 0,
        maxCycleLength: 0,
        nodesInCycles: 0,
        circularityIndex: 0
      };
    }
  }

  private safeCalculateCoherence(topics: Topic[], transitions: TopicTransition[]): number {
    try {
      return this.calculateCoherence(topics, transitions);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating coherence:', error);
      return 0;
    }
  }

  private safeCalculateProgression(topics: Topic[], transitions: TopicTransition[]): number {
    try {
      return this.calculateProgression(topics, transitions);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating progression:', error);
      return 0;
    }
  }

  private safeAnalyzeTimingPatterns(messages: Message[], topics: Topic[], transitions: TopicTransition[]): {
    averageTopicDuration: number;
    fastestTransition: number;
    slowestTransition: number;
  } {
    try {
      return this.analyzeTimingPatterns(messages, topics, transitions);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error analyzing timing patterns:', error);
      return {
        averageTopicDuration: 0,
        fastestTransition: 0,
        slowestTransition: 0
      };
    }
  }

  private safeCalculateEngagementMetrics(messages: Message[]): {
    questionDensity: number;
    insightDensity: number;
    participationBalance: number;
  } {
    try {
      return this.calculateEngagementMetrics(messages);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating engagement metrics:', error);
      return {
        questionDensity: 0,
        insightDensity: 0,
        participationBalance: 0
      };
    }
  }

  private safeCalculateContentMetrics(messages: Message[]): {
    averageLength: number;
    vocabularyRichness: number;
  } {
    try {
      return this.calculateContentMetrics(messages);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating content metrics:', error);
      return {
        averageLength: 0,
        vocabularyRichness: 0
      };
    }
  }

  private safeDetectResolutionTime(messages: Message[]): number | undefined {
    try {
      return this.detectResolutionTime(messages);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error detecting resolution time:', error);
      return undefined;
    }
  }

  /**
   * Extract topics from messages using NLP techniques
   */
  private extractTopics(messages: Message[]): Topic[] {
    if (!messages || messages.length === 0) {
      return [];
    }

    const topics: Topic[] = [];
    const topicMap = new Map<string, Topic>();

    for (const message of messages) {
      try {
        if (!message || !message.content) {
          continue;
        }
        
        const messageTopics = this.safeExtractMessageTopics(message);
        
        for (const topic of messageTopics) {
          try {
            if (!topic || !topic.normalizedContent) {
              continue;
            }
            
            const existing = topicMap.get(topic.normalizedContent);
            
            if (existing) {
              // Merge with existing topic (increase weight/confidence)
              existing.weight = Math.max(0, existing.weight + (topic.weight || 0));
              existing.confidence = Math.min(1, Math.max(0, existing.confidence + (topic.confidence || 0) * 0.1));
            } else {
              topicMap.set(topic.normalizedContent, topic);
            }
          } catch (topicError) {
            console.warn('ConversationFlowAnalyzer: Error processing topic:', topicError);
            continue;
          }
        }
      } catch (messageError) {
        console.warn('ConversationFlowAnalyzer: Error processing message for topics:', messageError);
        continue;
      }
    }

    // Filter topics by confidence and convert to array
    try {
      for (const topic of topicMap.values()) {
        if (topic && topic.confidence >= this.TOPIC_CONFIDENCE_THRESHOLD) {
          topics.push(topic);
        }
      }
    } catch (filterError) {
      console.warn('ConversationFlowAnalyzer: Error filtering topics:', filterError);
    }

    return topics.sort((a, b) => {
      try {
        return (b.weight || 0) - (a.weight || 0);
      } catch (sortError) {
        return 0;
      }
    });
  }

  private safeExtractMessageTopics(message: Message): Topic[] {
    try {
      return this.extractMessageTopics(message);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error extracting message topics:', error);
      return [];
    }
  }

  /**
   * Extract topics from a single message
   */
  private extractMessageTopics(message: Message): Topic[] {
    const topics: Topic[] = [];
    const tokens = this.tokenize(message.content);
    
    if (tokens.length === 0) {
      return topics;
    }

    // Extract n-grams as potential topics
    for (let n = this.MIN_TOPIC_LENGTH; n <= this.MAX_TOPIC_LENGTH; n++) {
      const ngrams = this.generateNgrams(tokens, n);
      
      for (const ngram of ngrams) {
        const content = ngram.join(' ');
        const normalizedContent = this.normalizeTopicContent(content);
        
        // Filter out common phrases and low-value n-grams
        if (this.isValidTopic(normalizedContent)) {
          const confidence = this.calculateTopicConfidence(ngram, tokens);
          
          topics.push({
            id: this.generateTopicId(normalizedContent, message.id),
            content,
            normalizedContent,
            timestamp: message.createdAt,
            messageId: message.id,
            confidence,
            weight: confidence * n // Longer topics get higher weight
          });
        }
      }
    }

    // Detect question topics
    if (message.role === 'user' && message.content.includes('?')) {
      const questionTopic = this.extractQuestionTopic(message.content);
      if (questionTopic) {
        topics.push({
          id: this.generateTopicId(questionTopic, message.id),
          content: questionTopic,
          normalizedContent: this.normalizeTopicContent(questionTopic),
          timestamp: message.createdAt,
          messageId: message.id,
          confidence: 0.8, // Questions are high-confidence topics
          weight: 1.5
        });
      }
    }

    return topics;
  }

  /**
   * Build topic transition graph
   */
  private buildTransitionGraph(topics: Topic[], messages: Message[]): TopicTransition[] {
    try {
      if (!topics || !messages || topics.length < 2) {
        return [];
      }

      const transitions: TopicTransition[] = [];
      
      // Sort topics by timestamp with error handling
      let sortedTopics: Topic[];
      try {
        sortedTopics = [...topics].sort((a, b) => {
          const timestampA = a?.timestamp || 0;
          const timestampB = b?.timestamp || 0;
          return timestampA - timestampB;
        });
      } catch (sortError) {
        console.warn('ConversationFlowAnalyzer: Error sorting topics:', sortError);
        return [];
      }
      
      for (let i = 0; i < sortedTopics.length - 1; i++) {
        try {
          const fromTopic = sortedTopics[i];
          const toTopic = sortedTopics[i + 1];
          
          if (!fromTopic || !toTopic || !fromTopic.id || !toTopic.id) {
            continue;
          }
          
          const timeGap = Math.max(0, (toTopic.timestamp || 0) - (fromTopic.timestamp || 0));
          const transitionType = this.safeClassifyTransition(fromTopic, toTopic, timeGap, messages);
          const confidence = this.safeCalculateTransitionConfidence(fromTopic, toTopic, timeGap);
          
          transitions.push({
            fromTopic: fromTopic.id,
            toTopic: toTopic.id,
            timestamp: toTopic.timestamp || Date.now(),
            transitionType,
            confidence: Math.max(0, Math.min(1, confidence)),
            timeGap
          });
        } catch (transitionError) {
          console.warn('ConversationFlowAnalyzer: Error creating transition:', transitionError);
          continue;
        }
      }

      return transitions;
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error building transition graph:', error);
      return [];
    }
  }

  private safeClassifyTransition(
    fromTopic: Topic, 
    toTopic: Topic, 
    timeGap: number,
    messages: Message[]
  ): 'natural' | 'abrupt' | 'return' | 'tangent' {
    try {
      return this.classifyTransition(fromTopic, toTopic, timeGap, messages);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error classifying transition:', error);
      return 'natural';
    }
  }

  private safeCalculateTransitionConfidence(fromTopic: Topic, toTopic: Topic, timeGap: number): number {
    try {
      return this.calculateTransitionConfidence(fromTopic, toTopic, timeGap);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating transition confidence:', error);
      return 0.5;
    }
  }

  /**
   * Analyze circularity using Tarjan's strongly connected components algorithm
   */
  private analyzeCircularity(topics: Topic[], transitions: TopicTransition[]): CircularityAnalysis {
    try {
      if (!topics || topics.length === 0) {
        return {
          stronglyConnectedComponents: [],
          cycleCount: 0,
          averageCycleLength: 0,
          maxCycleLength: 0,
          nodesInCycles: 0,
          circularityIndex: 0
        };
      }

      // Build adjacency list with error handling
      const graph = new Map<string, Set<string>>();
      const nodeSet = new Set<string>();
      
      try {
        for (const topic of topics) {
          if (topic && topic.id) {
            graph.set(topic.id, new Set());
            nodeSet.add(topic.id);
          }
        }
        
        if (transitions) {
          for (const transition of transitions) {
            if (transition && transition.fromTopic && transition.toTopic &&
                nodeSet.has(transition.fromTopic) && nodeSet.has(transition.toTopic)) {
              graph.get(transition.fromTopic)!.add(transition.toTopic);
            }
          }
        }
      } catch (graphError) {
        console.warn('ConversationFlowAnalyzer: Error building graph:', graphError);
        return this.getDefaultCircularityAnalysis();
      }

      // Find strongly connected components using Tarjan's algorithm
      let sccs: string[][];
      try {
        sccs = this.safeFindStronglyConnectedComponents(graph);
      } catch (sccError) {
        console.warn('ConversationFlowAnalyzer: Error finding SCCs:', sccError);
        return this.getDefaultCircularityAnalysis();
      }
      
      // Calculate circularity metrics with error handling
      try {
        const cycles = sccs.filter(scc => scc && scc.length > 1);
        const nodesInCycles = cycles.reduce((sum, cycle) => sum + (cycle?.length || 0), 0);
        const averageCycleLength = cycles.length > 0 
          ? nodesInCycles / cycles.length 
          : 0;
        const maxCycleLength = cycles.length > 0 
          ? Math.max(...cycles.map(cycle => cycle?.length || 0))
          : 0;

        // Calculate circularity index with bounds checking
        const totalNodes = topics.length;
        const circularityIndex = totalNodes > 0 && isFinite(nodesInCycles) && isFinite(cycles.length)
          ? Math.min(1, Math.max(0, (nodesInCycles / totalNodes) * (1 + Math.log(cycles.length + 1))))
          : 0;

        return {
          stronglyConnectedComponents: sccs || [],
          cycleCount: Math.max(0, cycles.length),
          averageCycleLength: Math.max(0, averageCycleLength),
          maxCycleLength: Math.max(0, maxCycleLength),
          nodesInCycles: Math.max(0, nodesInCycles),
          circularityIndex: Math.max(0, Math.min(1, circularityIndex))
        };
      } catch (metricsError) {
        console.warn('ConversationFlowAnalyzer: Error calculating circularity metrics:', metricsError);
        return this.getDefaultCircularityAnalysis();
      }
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error analyzing circularity:', error);
      return this.getDefaultCircularityAnalysis();
    }
  }

  private getDefaultCircularityAnalysis(): CircularityAnalysis {
    return {
      stronglyConnectedComponents: [],
      cycleCount: 0,
      averageCycleLength: 0,
      maxCycleLength: 0,
      nodesInCycles: 0,
      circularityIndex: 0
    };
  }

  private safeFindStronglyConnectedComponents(graph: Map<string, Set<string>>): string[][] {
    try {
      return this.findStronglyConnectedComponents(graph);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error in SCC algorithm:', error);
      return [];
    }
  }

  /**
   * Tarjan's algorithm for finding strongly connected components
   */
  private findStronglyConnectedComponents(graph: Map<string, Set<string>>): string[][] {
    if (!graph || graph.size === 0) {
      return [];
    }

    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];
    let currentIndex = 0;

    const strongConnect = (node: string) => {
      try {
        if (!node || index.has(node)) {
          return;
        }

        index.set(node, currentIndex);
        lowlink.set(node, currentIndex);
        currentIndex++;
        stack.push(node);
        onStack.add(node);

        const neighbors = graph.get(node) || new Set();
        for (const neighbor of neighbors) {
          try {
            if (!neighbor || typeof neighbor !== 'string') {
              continue;
            }

            if (!index.has(neighbor)) {
              strongConnect(neighbor);
              const nodeLowlink = lowlink.get(node);
              const neighborLowlink = lowlink.get(neighbor);
              if (nodeLowlink !== undefined && neighborLowlink !== undefined) {
                lowlink.set(node, Math.min(nodeLowlink, neighborLowlink));
              }
            } else if (onStack.has(neighbor)) {
              const nodeLowlink = lowlink.get(node);
              const neighborIndex = index.get(neighbor);
              if (nodeLowlink !== undefined && neighborIndex !== undefined) {
                lowlink.set(node, Math.min(nodeLowlink, neighborIndex));
              }
            }
          } catch (neighborError) {
            console.warn('ConversationFlowAnalyzer: Error processing neighbor in SCC:', neighborError);
            continue;
          }
        }

        const nodeLowlink = lowlink.get(node);
        const nodeIndex = index.get(node);
        if (nodeLowlink === nodeIndex) {
          const scc: string[] = [];
          let w: string;
          do {
            w = stack.pop()!;
            if (w) {
              onStack.delete(w);
              scc.push(w);
            }
          } while (w && w !== node && stack.length > 0);
          
          if (scc.length > 0) {
            sccs.push(scc);
          }
        }
      } catch (nodeError) {
        console.warn('ConversationFlowAnalyzer: Error in strongConnect for node:', node, nodeError);
      }
    };

    try {
      for (const node of graph.keys()) {
        if (node && !index.has(node)) {
          strongConnect(node);
        }
      }
    } catch (iterationError) {
      console.warn('ConversationFlowAnalyzer: Error iterating graph nodes:', iterationError);
    }

    return sccs;
  }

  /**
   * Calculate conversation depth score
   */
  private calculateDepthScore(messages: Message[], topics: Topic[]): number {
    try {
      if (!messages || messages.length === 0) {
        return 0;
      }

      let totalScore = 0;
      let scoreComponents = 0;

      // Factor 1: Message length and complexity (0-25 points)
      try {
        const validMessages = messages.filter(m => m && m.content && typeof m.content === 'string');
        if (validMessages.length > 0) {
          const avgMessageLength = validMessages.reduce((sum, m) => sum + m.content.length, 0) / validMessages.length;
          const lengthScore = Math.min(25, Math.max(0, avgMessageLength / 20));
          totalScore += lengthScore;
          scoreComponents++;
        }
      } catch (lengthError) {
        console.warn('ConversationFlowAnalyzer: Error calculating length score:', lengthError);
      }

      // Factor 2: Vocabulary richness (0-25 points)
      try {
        const vocabularyRichness = this.safeCalculateVocabularyRichness(messages);
        const vocabularyScore = Math.min(25, Math.max(0, vocabularyRichness * 2.5));
        totalScore += vocabularyScore;
        scoreComponents++;
      } catch (vocabError) {
        console.warn('ConversationFlowAnalyzer: Error calculating vocabulary score:', vocabError);
      }

      // Factor 3: Topic depth and progression (0-30 points)
      try {
        const topicDepthScore = this.safeCalculateTopicDepth(topics);
        totalScore += topicDepthScore;
        scoreComponents++;
      } catch (topicError) {
        console.warn('ConversationFlowAnalyzer: Error calculating topic depth score:', topicError);
      }

      // Factor 4: Question complexity (0-20 points)
      try {
        const questionScore = this.safeCalculateQuestionComplexity(messages);
        totalScore += questionScore;
        scoreComponents++;
      } catch (questionError) {
        console.warn('ConversationFlowAnalyzer: Error calculating question score:', questionError);
      }

      // Return proportional score if some components failed
      if (scoreComponents === 0) {
        return 0;
      }

      const normalizedScore = (totalScore / scoreComponents) * (scoreComponents / 4); // Adjust for missing components
      return Math.min(100, Math.max(0, normalizedScore));
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating depth score:', error);
      return 0;
    }
  }

  private safeCalculateVocabularyRichness(messages: Message[]): number {
    try {
      return this.calculateVocabularyRichness(messages);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating vocabulary richness:', error);
      return 0;
    }
  }

  private safeCalculateTopicDepth(topics: Topic[]): number {
    try {
      return this.calculateTopicDepth(topics);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating topic depth:', error);
      return 0;
    }
  }

  private safeCalculateQuestionComplexity(messages: Message[]): number {
    try {
      return this.calculateQuestionComplexity(messages);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating question complexity:', error);
      return 0;
    }
  }

  /**
   * Calculate coherence score (how well topics flow together)
   */
  private calculateCoherence(topics: Topic[], transitions: TopicTransition[]): number {
    try {
      if (!transitions || transitions.length === 0) {
        return (topics && topics.length <= 1) ? 100 : 50;
      }

      let coherenceScore = 0;
      let factorCount = 0;

      // Calculate average transition confidence
      try {
        const validTransitions = transitions.filter(t => t && isFinite(t.confidence));
        if (validTransitions.length > 0) {
          const avgTransitionConfidence = validTransitions.reduce((sum, t) => sum + t.confidence, 0) / validTransitions.length;
          coherenceScore += Math.max(0, Math.min(1, avgTransitionConfidence)) * 40;
          factorCount++;
        }
      } catch (confidenceError) {
        console.warn('ConversationFlowAnalyzer: Error calculating transition confidence:', confidenceError);
      }
      
      // Calculate natural transition ratio
      try {
        const naturalTransitions = transitions.filter(t => t && t.transitionType === 'natural').length;
        const naturalRatio = transitions.length > 0 ? naturalTransitions / transitions.length : 0;
        coherenceScore += Math.max(0, Math.min(1, naturalRatio)) * 35;
        factorCount++;
      } catch (naturalError) {
        console.warn('ConversationFlowAnalyzer: Error calculating natural transitions:', naturalError);
      }

      // Calculate time gap consistency
      try {
        const validTimeGaps = transitions
          .filter(t => t && isFinite(t.timeGap) && t.timeGap >= 0)
          .map(t => t.timeGap);
          
        if (validTimeGaps.length > 1) {
          const avgTimeGap = validTimeGaps.reduce((sum, gap) => sum + gap, 0) / validTimeGaps.length;
          
          if (avgTimeGap > 0) {
            const timeGapVariance = validTimeGaps.reduce((sum, gap) => sum + Math.pow(gap - avgTimeGap, 2), 0) / validTimeGaps.length;
            const timeConsistency = Math.max(0, Math.min(1, 1 - (Math.sqrt(timeGapVariance) / avgTimeGap)));
            coherenceScore += timeConsistency * 25;
            factorCount++;
          }
        }
      } catch (timeError) {
        console.warn('ConversationFlowAnalyzer: Error calculating time consistency:', timeError);
      }

      // Return proportional score if some factors failed
      if (factorCount === 0) {
        return 50; // Default coherence score
      }

      const normalizedScore = (coherenceScore / factorCount) * (factorCount / 3); // Adjust for missing factors
      return Math.min(100, Math.max(0, normalizedScore));
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating coherence:', error);
      return 50; // Default coherence score
    }
  }

  /**
   * Calculate progression score (how topics build upon each other)
   */
  private calculateProgression(topics: Topic[], transitions: TopicTransition[]): number {
    try {
      if (!topics || topics.length < 2) {
        return 50;
      }

      let totalScore = 0;
      let factorCount = 0;

      // Factor 1: Topic weight progression (topics should generally increase in weight/complexity)
      try {
        const validTopics = topics.filter(t => t && isFinite(t.timestamp) && isFinite(t.weight));
        const sortedTopics = [...validTopics].sort((a, b) => a.timestamp - b.timestamp);
        
        if (sortedTopics.length >= 2) {
          let progressionScore = 0;
          let comparisons = 0;

          for (let i = 1; i < sortedTopics.length; i++) {
            const prev = sortedTopics[i - 1];
            const curr = sortedTopics[i];
            
            if (curr.weight >= prev.weight) {
              progressionScore += 1;
            } else if (curr.weight >= prev.weight * 0.8) {
              progressionScore += 0.5; // Slight decline is acceptable
            }
            comparisons++;
          }

          const weightProgression = comparisons > 0 ? (progressionScore / comparisons) * 50 : 25;
          totalScore += weightProgression;
          factorCount++;
        }
      } catch (weightError) {
        console.warn('ConversationFlowAnalyzer: Error calculating weight progression:', weightError);
      }

      // Factor 2: Return transitions (going back to earlier topics can indicate building)
      try {
        if (transitions && transitions.length > 0) {
          const returnTransitions = transitions.filter(t => t && t.transitionType === 'return').length;
          const returnScore = Math.min(25, Math.max(0, returnTransitions * 5));
          totalScore += returnScore;
          factorCount++;
        }
      } catch (returnError) {
        console.warn('ConversationFlowAnalyzer: Error calculating return transitions:', returnError);
      }

      // Factor 3: Topic evolution (similar topics appearing with higher confidence)
      try {
        const evolutionScore = this.safeCalculateTopicEvolution(topics);
        totalScore += evolutionScore;
        factorCount++;
      } catch (evolutionError) {
        console.warn('ConversationFlowAnalyzer: Error calculating topic evolution:', evolutionError);
      }

      // Return proportional score if some factors failed
      if (factorCount === 0) {
        return 50; // Default progression score
      }

      const normalizedScore = (totalScore / factorCount) * (factorCount / 3); // Adjust for missing factors
      return Math.min(100, Math.max(0, normalizedScore));
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating progression:', error);
      return 50; // Default progression score
    }
  }

  private safeCalculateTopicEvolution(topics: Topic[]): number {
    try {
      return this.calculateTopicEvolution(topics);
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating topic evolution:', error);
      return 0;
    }
  }

  /**
   * Analyze timing patterns in conversation
   */
  private analyzeTimingPatterns(messages: Message[], topics: Topic[], transitions: TopicTransition[]) {
    if (topics.length === 0) {
      return {
        averageTopicDuration: 0,
        fastestTransition: 0,
        slowestTransition: 0
      };
    }

    // Calculate average topic duration (time between topic switches)
    const topicDurations: number[] = [];
    for (let i = 0; i < topics.length - 1; i++) {
      const duration = topics[i + 1].timestamp - topics[i].timestamp;
      topicDurations.push(duration);
    }

    const averageTopicDuration = topicDurations.length > 0
      ? topicDurations.reduce((sum, d) => sum + d, 0) / topicDurations.length
      : 0;

    // Find fastest and slowest transitions
    const transitionTimes = transitions.map(t => t.timeGap);
    const fastestTransition = transitionTimes.length > 0 ? Math.min(...transitionTimes) : 0;
    const slowestTransition = transitionTimes.length > 0 ? Math.max(...transitionTimes) : 0;

    return {
      averageTopicDuration,
      fastestTransition,
      slowestTransition
    };
  }

  /**
   * Calculate engagement metrics
   */
  private calculateEngagementMetrics(messages: Message[]) {
    if (messages.length === 0) {
      return {
        questionDensity: 0,
        insightDensity: 0,
        participationBalance: 0
      };
    }

    // Question density
    const questionCount = messages.filter(m => m.content.includes('?')).length;
    const questionDensity = questionCount / messages.length;

    // Insight density (messages with insight indicators)
    const insightIndicators = ['understand', 'realize', 'see', 'aha', 'makes sense', 'insight'];
    const insightCount = messages.filter(m =>
      insightIndicators.some(indicator => 
        m.content.toLowerCase().includes(indicator)
      )
    ).length;
    const insightDensity = insightCount / messages.length;

    // Participation balance
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const totalMessages = userMessages + assistantMessages;
    
    const participationBalance = totalMessages > 0
      ? 1 - Math.abs(userMessages - assistantMessages) / totalMessages
      : 0;

    return {
      questionDensity,
      insightDensity,
      participationBalance
    };
  }

  /**
   * Calculate content metrics
   */
  private calculateContentMetrics(messages: Message[]) {
    if (messages.length === 0) {
      return {
        averageLength: 0,
        vocabularyRichness: 0
      };
    }

    const averageLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    const vocabularyRichness = this.calculateVocabularyRichness(messages);

    return {
      averageLength,
      vocabularyRichness
    };
  }

  /**
   * Helper methods
   */

  private tokenize(text: string): string[] {
    try {
      if (!text || typeof text !== 'string') {
        return [];
      }
      
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token && token.length > 2 && !this.isStopWord(token));
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error tokenizing text:', error);
      return [];
    }
  }

  private generateNgrams(tokens: string[], n: number): string[][] {
    const ngrams: string[][] = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n));
    }
    return ngrams;
  }

  private isStopWord(word: string): boolean {
    try {
      if (!word || typeof word !== 'string') {
        return true;
      }
      
      const stopWords = new Set([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
        'for', 'not', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
        'but', 'his', 'by', 'from', 'they', 'she', 'or', 'an', 'will',
        'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so',
        'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'
      ]);
      return stopWords.has(word.toLowerCase());
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error checking stop word:', error);
      return true;
    }
  }

  private normalizeTopicContent(content: string): string {
    return content.toLowerCase().trim();
  }

  private isValidTopic(normalizedContent: string): boolean {
    // Filter out single letters, numbers only, or very common phrases
    if (normalizedContent.length < 3) return false;
    if (/^\d+$/.test(normalizedContent)) return false;
    if (/^[a-z]$/.test(normalizedContent)) return false;
    
    const commonPhrases = ['i think', 'you know', 'i mean', 'you can', 'i want'];
    return !commonPhrases.includes(normalizedContent);
  }

  private calculateTopicConfidence(ngram: string[], allTokens: string[]): number {
    // Simple TF-IDF-like scoring
    const termFreq = ngram.length;
    const docFreq = allTokens.filter(token => ngram.includes(token)).length;
    const score = termFreq / Math.log(docFreq + 1);
    return Math.min(1, score / 10);
  }

  private generateTopicId(normalizedContent: string, messageId: string): string {
    return `${normalizedContent.replace(/\s+/g, '_')}_${messageId.slice(-8)}`;
  }

  private extractQuestionTopic(content: string): string | null {
    // Extract the main subject of a question
    const questionPrefixes = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
    const words = content.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      if (questionPrefixes.includes(words[i]) && i + 1 < words.length) {
        const topicWords = words.slice(i + 1, Math.min(i + 4, words.length));
        return topicWords.join(' ').replace(/[^\w\s]/g, '').trim();
      }
    }
    
    return null;
  }

  private classifyTransition(
    fromTopic: Topic, 
    toTopic: Topic, 
    timeGap: number,
    messages: Message[]
  ): 'natural' | 'abrupt' | 'return' | 'tangent' {
    // Return transition: going back to a previously discussed topic
    if (fromTopic.timestamp > toTopic.timestamp) {
      return 'return';
    }

    // Abrupt transition: very quick time gap
    if (timeGap < 10000) { // Less than 10 seconds
      return 'abrupt';
    }

    // Natural transition: similar topics or logical progression
    const similarity = this.calculateTopicSimilarity(fromTopic, toTopic);
    if (similarity > 0.5) {
      return 'natural';
    }

    // Tangent: unrelated topics
    return 'tangent';
  }

  private calculateTransitionConfidence(fromTopic: Topic, toTopic: Topic, timeGap: number): number {
    const similarity = this.calculateTopicSimilarity(fromTopic, toTopic);
    const timeScore = Math.exp(-timeGap / this.TRANSITION_TIME_THRESHOLD);
    const confidenceScore = fromTopic.confidence * toTopic.confidence;
    
    return (similarity * 0.4 + timeScore * 0.3 + confidenceScore * 0.3);
  }

  private calculateTopicSimilarity(topic1: Topic, topic2: Topic): number {
    // Simple word overlap similarity
    const words1 = new Set(topic1.normalizedContent.split(' '));
    const words2 = new Set(topic2.normalizedContent.split(' '));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateVocabularyRichness(messages: Message[]): number {
    try {
      if (!messages || messages.length === 0) {
        return 0;
      }
      
      const allWords = messages
        .filter(m => m && m.content && typeof m.content === 'string')
        .flatMap(m => {
          try {
            return this.tokenize(m.content);
          } catch (tokenizeError) {
            console.warn('ConversationFlowAnalyzer: Error tokenizing message:', tokenizeError);
            return [];
          }
        });
        
      if (allWords.length === 0) return 0;
      
      const uniqueWords = new Set(allWords.filter(word => word && typeof word === 'string'));
      const logValue = Math.log(allWords.length + 1);
      
      if (logValue === 0) return 0;
      
      return uniqueWords.size / logValue;
    } catch (error) {
      console.warn('ConversationFlowAnalyzer: Error calculating vocabulary richness:', error);
      return 0;
    }
  }

  private calculateTopicDepth(topics: Topic[]): number {
    if (topics.length === 0) return 0;
    
    const avgWeight = topics.reduce((sum, t) => sum + t.weight, 0) / topics.length;
    const avgConfidence = topics.reduce((sum, t) => sum + t.confidence, 0) / topics.length;
    
    return Math.min(30, (avgWeight * 10) + (avgConfidence * 20));
  }

  private calculateQuestionComplexity(messages: Message[]): number {
    const questions = messages.filter(m => m.role === 'user' && m.content.includes('?'));
    if (questions.length === 0) return 0;
    
    let complexitySum = 0;
    for (const question of questions) {
      const words = question.content.split(/\s+/).length;
      const complexity = Math.min(10, words / 3); // Longer questions are more complex
      complexitySum += complexity;
    }
    
    return Math.min(20, complexitySum / questions.length * 4);
  }

  private calculateTopicEvolution(topics: Topic[]): number {
    // Look for topics that appear multiple times with increasing confidence
    const topicGroups = new Map<string, Topic[]>();
    
    for (const topic of topics) {
      const baseContent = topic.normalizedContent.split(' ').slice(0, 2).join(' ');
      if (!topicGroups.has(baseContent)) {
        topicGroups.set(baseContent, []);
      }
      topicGroups.get(baseContent)!.push(topic);
    }
    
    let evolutionScore = 0;
    let groupCount = 0;
    
    for (const group of topicGroups.values()) {
      if (group.length > 1) {
        group.sort((a, b) => a.timestamp - b.timestamp);
        const firstConfidence = group[0].confidence;
        const lastConfidence = group[group.length - 1].confidence;
        
        if (lastConfidence > firstConfidence) {
          evolutionScore += (lastConfidence - firstConfidence) * 25;
        }
        groupCount++;
      }
    }
    
    return groupCount > 0 ? Math.min(25, evolutionScore / groupCount) : 0;
  }

  private detectResolutionTime(messages: Message[]): number | undefined {
    // Look for resolution indicators in the conversation
    const resolutionIndicators = [
      'solved', 'resolved', 'fixed', 'working', 'done',
      'thanks', 'perfect', 'exactly', 'got it'
    ];
    
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const hasResolution = resolutionIndicators.some(indicator =>
        message.content.toLowerCase().includes(indicator)
      );
      
      if (hasResolution) {
        return message.createdAt - messages[0].createdAt;
      }
    }
    
    return undefined;
  }
}