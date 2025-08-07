/**
 * Unit tests for GenerateAnalyticsReportTool
 */

import { GenerateAnalyticsReportTool } from '../../../src/tools/GenerateAnalyticsReportTool.js';
import { AnalyticsEngine } from '../../../src/analytics/services/AnalyticsEngine.js';
import { DatabaseManager } from '../../../src/storage/DatabaseManager.js';

// Mock dependencies
jest.mock('../../../src/analytics/services/AnalyticsEngine.js');
jest.mock('../../../src/storage/DatabaseManager.js');

describe('GenerateAnalyticsReportTool', () => {
  let tool: GenerateAnalyticsReportTool;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;
  let mockAnalyticsEngine: jest.Mocked<AnalyticsEngine>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDatabaseManager = new DatabaseManager('./test.db') as jest.Mocked<DatabaseManager>;
    mockAnalyticsEngine = new AnalyticsEngine(mockDatabaseManager) as jest.Mocked<AnalyticsEngine>;

    // Mock the AnalyticsEngine constructor to return our mock
    (AnalyticsEngine as jest.MockedClass<typeof AnalyticsEngine>).mockImplementation(() => mockAnalyticsEngine);

    tool = new GenerateAnalyticsReportTool(mockDatabaseManager);
  });

  describe('execute', () => {
    const mockReport = {
      generatedAt: Date.now(),
      timeRange: {
        start: Date.now() - 7 * 24 * 60 * 60 * 1000,
        end: Date.now()
      },
      conversationMetrics: {
        totalConversations: 50,
        averageProductivity: 72,
        averageDepth: 0.65,
        averageCircularity: 0.15,
        totalInsights: 125
      },
      productivityInsights: {
        peakHours: [14, 15, 16],
        optimalSessionLength: 45,
        topQuestionPatterns: ['how to', 'what is', 'why does'],
        weeklyTrend: 0.12
      },
      knowledgeGaps: {
        totalUnresolved: 8,
        criticalGaps: 2,
        averageResolutionTime: 172800000,
        topicCoverage: 0.78
      },
      decisionQuality: {
        totalDecisions: 23,
        averageQuality: 0.81,
        averageOutcome: 0.75,
        reversalRate: 0.08
      },
      recommendations: [
        'Focus on resolving critical knowledge gaps',
        'Maintain current productivity patterns',
        'Reduce conversation circularity'
      ],
      insights: [
        'Productivity peaks during afternoon hours',
        'Decision quality is above average',
        'Knowledge coverage is improving'
      ]
    };

    it('should generate a summary report for default time range', async () => {
      mockAnalyticsEngine.generateReport = jest.fn().mockResolvedValue(mockReport);

      const result = await tool.execute({
        format: 'summary'
      });

      expect(mockAnalyticsEngine.generateReport).toHaveBeenCalledWith(
        undefined,
        'summary'
      );

      expect(result).toHaveProperty('report');
      expect(result).toHaveProperty('format', 'summary');
      expect(result).toHaveProperty('exportPath', null);
      expect(result.report).toEqual(mockReport);
    });

    it('should generate a detailed report with custom time range', async () => {
      mockAnalyticsEngine.generateReport = jest.fn().mockResolvedValue(mockReport);

      const timeRange = {
        start: Date.now() - 30 * 24 * 60 * 60 * 1000,
        end: Date.now()
      };

      const result = await tool.execute({
        format: 'detailed',
        timeRange
      });

      expect(mockAnalyticsEngine.generateReport).toHaveBeenCalledWith(
        timeRange,
        'detailed'
      );

      expect(result.format).toBe('detailed');
      expect(result.report.timeRange).toEqual(timeRange);
    });

    it('should export report to JSON when exportPath is provided', async () => {
      mockAnalyticsEngine.generateReport = jest.fn().mockResolvedValue(mockReport);

      // Mock fs operations
      const fs = require('fs').promises;
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

      const result = await tool.execute({
        format: 'summary',
        exportPath: '/tmp/report.json'
      });

      expect(result.exportPath).toBe('/tmp/report.json');
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/report.json',
        JSON.stringify(mockReport, null, 2),
        'utf-8'
      );
    });

    it('should generate executive format report', async () => {
      const executiveReport = {
        ...mockReport,
        executiveSummary: {
          keyMetrics: {
            productivity: 72,
            engagement: 85,
            knowledgeGrowth: 0.12
          },
          trends: {
            productivity: 'improving',
            engagement: 'stable',
            knowledgeGaps: 'decreasing'
          },
          actionItems: [
            'Address critical knowledge gaps',
            'Maintain afternoon productivity schedule'
          ]
        }
      };

      mockAnalyticsEngine.generateReport = jest.fn().mockResolvedValue(executiveReport);

      const result = await tool.execute({
        format: 'executive'
      });

      expect(mockAnalyticsEngine.generateReport).toHaveBeenCalledWith(
        undefined,
        'executive'
      );

      expect(result.format).toBe('executive');
      expect(result.report).toHaveProperty('executiveSummary');
    });

    it('should handle time range validation', async () => {
      const invalidTimeRange = {
        start: Date.now(),
        end: Date.now() - 24 * 60 * 60 * 1000 // End before start
      };

      await expect(tool.execute({
        format: 'summary',
        timeRange: invalidTimeRange
      })).rejects.toThrow('Invalid time range');
    });

    it('should handle analytics engine errors', async () => {
      mockAnalyticsEngine.generateReport = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(tool.execute({
        format: 'summary'
      })).rejects.toThrow('Failed to generate analytics report');
    });

    it('should validate format parameter', async () => {
      await expect(tool.execute({
        format: 'invalid' as any
      })).rejects.toThrow();
    });

    it('should handle export errors gracefully', async () => {
      mockAnalyticsEngine.generateReport = jest.fn().mockResolvedValue(mockReport);

      const fs = require('fs').promises;
      jest.spyOn(fs, 'writeFile').mockRejectedValue(new Error('Permission denied'));

      const result = await tool.execute({
        format: 'summary',
        exportPath: '/root/report.json' // Likely to fail
      });

      // Should still return the report even if export fails
      expect(result.report).toEqual(mockReport);
      expect(result.exportPath).toBe(null);
    });
  });

  describe('formatReport', () => {
    it('should format report for human readability', async () => {
      const mockReport = {
        generatedAt: Date.now(),
        conversationMetrics: {
          totalConversations: 10,
          averageProductivity: 65
        },
        recommendations: ['Improve focus', 'Reduce context switching']
      };

      mockAnalyticsEngine.generateReport = jest.fn().mockResolvedValue(mockReport);

      const result = await tool.execute({
        format: 'summary',
        humanReadable: true
      });

      // Should have formatted strings instead of raw numbers
      expect(result).toHaveProperty('formattedReport');
      expect(typeof result.formattedReport).toBe('string');
      expect(result.formattedReport).toContain('Total Conversations: 10');
      expect(result.formattedReport).toContain('Average Productivity: 65%');
    });
  });
});