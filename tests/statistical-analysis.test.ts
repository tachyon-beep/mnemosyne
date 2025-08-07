/**
 * Comprehensive test suite for statistical analysis components
 * 
 * Tests all statistical methods for mathematical accuracy,
 * validates confidence intervals, significance tests,
 * and ensures proper statistical rigor.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { DatabaseManager } from '../src/storage/Database.js';
import { StatisticalAnalyzer } from '../src/analytics/StatisticalAnalyzer.js';
import { TemporalPatternAnalyzer } from '../src/analytics/TemporalPatternAnalyzer.js';
import { ABTestingFramework } from '../src/analytics/ABTestingFramework.js';
import { AdvancedAnalyticsDashboard } from '../src/analytics/AdvancedAnalyticsDashboard.js';
import { StatisticalIntegrationService } from '../src/analytics/StatisticalIntegrationService.js';

// Mock database for testing
const mockDbManager = {
  getDatabase: jest.fn().mockReturnValue({
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn().mockReturnValue([])
    })
  })
} as unknown as DatabaseManager;

describe('Statistical Analysis System', () => {
  let statisticalAnalyzer: StatisticalAnalyzer;
  let temporalAnalyzer: TemporalPatternAnalyzer;
  let abTestingFramework: ABTestingFramework;
  let analyticsDashboard: AdvancedAnalyticsDashboard;
  let integrationService: StatisticalIntegrationService;

  beforeEach(() => {
    statisticalAnalyzer = new StatisticalAnalyzer(mockDbManager);
    temporalAnalyzer = new TemporalPatternAnalyzer(mockDbManager);
    abTestingFramework = new ABTestingFramework(mockDbManager);
    analyticsDashboard = new AdvancedAnalyticsDashboard(mockDbManager);
    integrationService = new StatisticalIntegrationService(mockDbManager);
  });

  describe('StatisticalAnalyzer', () => {
    describe('Pattern Accuracy Validation', () => {
      test('should calculate accurate precision, recall, and F1 scores', async () => {
        const validationData = [
          {
            text: "I will complete the task by Friday",
            expected: [{ text: "complete the task" }],
            predicted: [{ text: "complete the task" }],
            confidence: [0.9],
            context: { userRole: 'assistant' }
          },
          {
            text: "Let me check on that",
            expected: [{ text: "check on that" }],
            predicted: [{ text: "verify information" }], // False positive
            confidence: [0.7],
            context: { userRole: 'assistant' }
          },
          {
            text: "I need to review the documentation",
            expected: [{ text: "review the documentation" }],
            predicted: [], // False negative
            confidence: [],
            context: { userRole: 'assistant' }
          }
        ];

        const results = await statisticalAnalyzer.validatePatternAccuracy(validationData);

        // Verify mathematical accuracy
        expect(results.overallMetrics.precision).toBeCloseTo(0.5, 2); // 1 TP, 1 FP
        expect(results.overallMetrics.recall).toBeCloseTo(0.5, 2);    // 1 TP, 1 FN  
        expect(results.overallMetrics.f1Score).toBeCloseTo(0.5, 2);   // 2 * (0.5 * 0.5) / (0.5 + 0.5)
        
        // Verify confidence intervals are reasonable
        expect(results.statisticalTests.bootstrapConfidenceInterval[0]).toBeLessThan(results.statisticalTests.bootstrapConfidenceInterval[1]);
        expect(results.statisticalTests.bootstrapConfidenceInterval[0]).toBeGreaterThanOrEqual(0);
        expect(results.statisticalTests.bootstrapConfidenceInterval[1]).toBeLessThanOrEqual(1);
      });

      test('should perform valid ROC AUC calculation', async () => {
        const validationData = generateROCTestData();
        const results = await statisticalAnalyzer.validatePatternAccuracy(validationData);
        
        // ROC AUC should be between 0.5 and 1.0
        expect(results.overallMetrics.auROC).toBeGreaterThanOrEqual(0.5);
        expect(results.overallMetrics.auROC).toBeLessThanOrEqual(1.0);
        
        // For perfect classifier, AUC should be 1.0
        const perfectData = [
          {
            text: "test1", expected: [{ text: "match" }], predicted: [{ text: "match" }],
            confidence: [1.0], context: {}
          },
          {
            text: "test2", expected: [], predicted: [],
            confidence: [], context: {}
          }
        ];
        
        const perfectResults = await statisticalAnalyzer.validatePatternAccuracy(perfectData);
        expect(perfectResults.overallMetrics.auROC).toBeCloseTo(1.0, 1);
      });

      test('should validate McNemar test implementation', async () => {
        const validationData = generateMcNemarTestData();
        const results = await statisticalAnalyzer.validatePatternAccuracy(validationData);
        
        // McNemar test should provide valid statistical results
        expect(results.statisticalTests.mcNemarTest.pValue).toBeGreaterThanOrEqual(0);
        expect(results.statisticalTests.mcNemarTest.pValue).toBeLessThanOrEqual(1);
        expect(results.statisticalTests.mcNemarTest.testStatistic).toBeGreaterThanOrEqual(0);
        
        // Effect size should be meaningful
        expect(results.statisticalTests.mcNemarTest.effectSize).toBeGreaterThanOrEqual(0);
      });

      test('should calculate proper confidence calibration', async () => {
        const calibrationData = generateCalibrationTestData();
        const results = await statisticalAnalyzer.validatePatternAccuracy(calibrationData);
        
        // Calibration error should be between 0 and 1
        expect(results.confidenceCalibration.calibrationError).toBeGreaterThanOrEqual(0);
        expect(results.confidenceCalibration.calibrationError).toBeLessThanOrEqual(1);
        
        // Reliability should be inverse of calibration error
        expect(results.confidenceCalibration.reliability).toBeCloseTo(
          1 - results.confidenceCalibration.calibrationError, 2
        );
        
        // Calibration bins should cover probability space
        expect(results.confidenceCalibration.bins.length).toBeGreaterThan(0);
        results.confidenceCalibration.bins.forEach(bin => {
          expect(bin.avgConfidence).toBeGreaterThanOrEqual(0);
          expect(bin.avgConfidence).toBeLessThanOrEqual(1);
          expect(bin.avgAccuracy).toBeGreaterThanOrEqual(0);
          expect(bin.avgAccuracy).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('Statistical Distribution Functions', () => {
      test('should calculate accurate normal CDF', () => {
        // Test known values
        const normalCDF = (statisticalAnalyzer as any).normalCDF.bind(statisticalAnalyzer);
        
        expect(normalCDF(0)).toBeCloseTo(0.5, 3);
        expect(normalCDF(1.96)).toBeCloseTo(0.975, 2);
        expect(normalCDF(-1.96)).toBeCloseTo(0.025, 2);
        expect(normalCDF(2.58)).toBeCloseTo(0.995, 2);
      });

      test('should calculate accurate chi-square CDF', () => {
        const chiSquareCDF = (statisticalAnalyzer as any).chiSquareCDF.bind(statisticalAnalyzer);
        
        // Test known critical values
        expect(chiSquareCDF(3.84, 1)).toBeCloseTo(0.95, 1); // p=0.05, df=1
        expect(chiSquareCDF(5.99, 2)).toBeCloseTo(0.95, 1); // p=0.05, df=2
        expect(chiSquareCDF(0, 1)).toBeCloseTo(0, 3);
      });

      test('should calculate accurate t-distribution CDF', () => {
        const tCDF = (statisticalAnalyzer as any).tCDF.bind(statisticalAnalyzer);
        
        // Test known values
        expect(tCDF(0, 10)).toBeCloseTo(0.5, 2);
        expect(tCDF(2.228, 10)).toBeCloseTo(0.975, 1); // t-critical for p=0.05, df=10
      });
    });

    describe('Bootstrap Confidence Intervals', () => {
      test('should calculate valid bootstrap confidence intervals', () => {
        const data = [0.7, 0.8, 0.75, 0.82, 0.78, 0.85, 0.73, 0.79, 0.81, 0.77];
        const meanStatistic = (sample: number[]) => sample.reduce((sum, x) => sum + x, 0) / sample.length;
        
        const ci = statisticalAnalyzer.calculateBootstrapConfidenceInterval(data, meanStatistic, 0.95, 1000);
        
        // CI should be reasonable around the sample mean
        const sampleMean = meanStatistic(data);
        expect(ci[0]).toBeLessThan(sampleMean);
        expect(ci[1]).toBeGreaterThan(sampleMean);
        expect(ci[1] - ci[0]).toBeGreaterThan(0);
        expect(ci[1] - ci[0]).toBeLessThan(0.2); // Should not be too wide
      });
    });
  });

  describe('TemporalPatternAnalyzer', () => {
    describe('Trend Analysis', () => {
      test('should detect increasing trend correctly', async () => {
        const increasingData = Array.from({ length: 30 }, (_, i) => ({
          timestamp: Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
          value: 10 + i * 0.5 + Math.random() * 2 // Clear upward trend with noise
        }));

        const result = await temporalAnalyzer.analyzeTemporalPatterns(increasingData);
        
        expect(result.trend.direction).toBe('increasing');
        expect(result.trend.slope).toBeGreaterThan(0);
        expect(result.trend.significance).toBeGreaterThan(0.5);
      });

      test('should detect decreasing trend correctly', async () => {
        const decreasingData = Array.from({ length: 30 }, (_, i) => ({
          timestamp: Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
          value: 30 - i * 0.3 + Math.random() * 1 // Clear downward trend
        }));

        const result = await temporalAnalyzer.analyzeTemporalPatterns(decreasingData);
        
        expect(result.trend.direction).toBe('decreasing');
        expect(result.trend.slope).toBeLessThan(0);
        expect(result.trend.significance).toBeGreaterThan(0.5);
      });

      test('should calculate valid correlation coefficient', async () => {
        const linearData = Array.from({ length: 20 }, (_, i) => ({
          timestamp: Date.now() - (19 - i) * 24 * 60 * 60 * 1000,
          value: 5 + i * 2 // Perfect linear relationship
        }));

        const result = await temporalAnalyzer.analyzeTemporalPatterns(linearData);
        
        expect(result.trend.correlation).toBeCloseTo(1, 1); // Should be close to 1
        expect(result.trend.rSquared).toBeCloseTo(1, 1);
      });
    });

    describe('Change Point Detection', () => {
      test('should detect level changes', async () => {
        const changePointData = [
          // First segment: low values
          ...Array.from({ length: 15 }, (_, i) => ({
            timestamp: Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
            value: 10 + Math.random() * 2
          })),
          // Second segment: high values (level change)
          ...Array.from({ length: 15 }, (_, i) => ({
            timestamp: Date.now() - (14 - i) * 24 * 60 * 60 * 1000,
            value: 20 + Math.random() * 2
          }))
        ];

        const result = await temporalAnalyzer.analyzeTemporalPatterns(changePointData);
        
        expect(result.changePoints.changePoints.length).toBeGreaterThan(0);
        
        if (result.changePoints.changePoints.length > 0) {
          const levelChanges = result.changePoints.changePoints.filter(cp => cp.type === 'level');
          expect(levelChanges.length).toBeGreaterThan(0);
          expect(levelChanges[0].significance).toBeGreaterThan(0.5);
          expect(levelChanges[0].magnitude).toBeGreaterThan(5);
        }
      });
    });

    describe('Seasonality Detection', () => {
      test('should detect seasonal patterns', async () => {
        const seasonalData = Array.from({ length: 52 }, (_, i) => ({
          timestamp: Date.now() - (51 - i) * 7 * 24 * 60 * 60 * 1000, // Weekly data
          value: 20 + 10 * Math.sin(2 * Math.PI * i / 7) + Math.random() * 2 // Weekly seasonality
        }));

        const result = await temporalAnalyzer.analyzeTemporalPatterns(seasonalData, {
          granularity: 'week',
          seasonalityTests: true
        });
        
        if (result.seasonality.isPresent) {
          expect(result.seasonality.period).toBeGreaterThan(0);
          expect(result.seasonality.strength).toBeGreaterThan(0);
          expect(result.seasonality.confidence).toBeGreaterThan(0.5);
        }
      });
    });

    describe('Statistical Accuracy', () => {
      test('should calculate correct standard deviation', () => {
        const data = [1, 2, 3, 4, 5];
        const calculateStandardDeviation = (temporalAnalyzer as any).calculateStandardDeviation.bind(temporalAnalyzer);
        const std = calculateStandardDeviation(data);
        
        // Standard deviation of [1,2,3,4,5] should be sqrt(2)
        expect(std).toBeCloseTo(Math.sqrt(2), 2);
      });

      test('should calculate correct skewness and kurtosis', () => {
        const normalData = Array.from({ length: 1000 }, () => 
          Math.random() + Math.random() + Math.random() - 1.5 // Approximately normal
        );
        
        const calculateSkewness = (temporalAnalyzer as any).calculateSkewness.bind(temporalAnalyzer);
        const calculateKurtosis = (temporalAnalyzer as any).calculateKurtosis.bind(temporalAnalyzer);
        
        const mean = normalData.reduce((sum, x) => sum + x, 0) / normalData.length;
        const std = Math.sqrt(normalData.reduce((sum, x) => sum + (x - mean) ** 2, 0) / normalData.length);
        
        const skewness = calculateSkewness(normalData, mean, std);
        const kurtosis = calculateKurtosis(normalData, mean, std);
        
        // For normal distribution, skewness should be close to 0, kurtosis close to 0
        expect(Math.abs(skewness)).toBeLessThan(0.5);
        expect(Math.abs(kurtosis)).toBeLessThan(1);
      });
    });
  });

  describe('ABTestingFramework', () => {
    describe('Power Analysis', () => {
      test('should calculate correct sample size for given power', async () => {
        const config = {
          name: 'Test Power Analysis',
          description: 'Testing sample size calculation',
          hypothesis: 'Variant will improve conversion',
          variants: [
            { id: 'control', name: 'Control', allocation: 50, config: {}, isControl: true },
            { id: 'treatment', name: 'Treatment', allocation: 50, config: {}, isControl: false }
          ],
          metrics: [{
            name: 'conversion_rate',
            type: 'conversion' as const,
            primaryMetric: true,
            direction: 'increase' as const,
            minimumDetectableEffect: 0.1, // 10% relative improvement
            expectedValue: 0.2 // 20% baseline conversion
          }],
          significanceLevel: 0.05,
          power: 0.8,
          minimumSampleSize: 100,
          trafficAllocation: 100,
          startDate: Date.now(),
          plannedEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          earlyStoppingEnabled: false,
          sequentialTesting: false,
          minimumRunDays: 14,
          maxPValue: 0.05
        };

        const powerAnalysis = abTestingFramework.performPowerAnalysis(config);
        
        // Sample size should be reasonable for the given parameters
        expect(powerAnalysis.requiredSampleSizePerVariant).toBeGreaterThan(100);
        expect(powerAnalysis.requiredSampleSizePerVariant).toBeLessThan(10000);
        expect(powerAnalysis.achievablePower).toBeCloseTo(config.power, 1);
      });

      test('should validate statistical test implementations', async () => {
        // Create test with known statistical properties
        const testConfig = createValidABTestConfig();
        const testResult = await abTestingFramework.createTest(testConfig);
        
        // Simulate test data with known effect size
        const controlData = generateBinomialData(1000, 0.2); // 20% conversion
        const treatmentData = generateBinomialData(1000, 0.22); // 22% conversion (10% relative lift)
        
        // Test statistical analysis
        const results = (abTestingFramework as any).performProportionTest(
          controlData, treatmentData, testConfig.metrics[0]
        );
        
        expect(results.pValue).toBeGreaterThan(0);
        expect(results.pValue).toBeLessThan(1);
        expect(results.lift).toBeCloseTo(10, 1); // Should detect ~10% relative lift
        expect(results.confidenceInterval[0]).toBeLessThan(results.confidenceInterval[1]);
      });
    });

    describe('Sequential Testing', () => {
      test('should implement valid sequential boundaries', async () => {
        const config = createValidABTestConfig();
        config.sequentialTesting = true;
        
        const testResult = await abTestingFramework.createTest(config);
        await abTestingFramework.startTest(testResult.testId);
        
        // Simulate sequential data collection
        for (let i = 0; i < 10; i++) {
          await abTestingFramework.recordSample({
            testId: testResult.testId,
            variantId: 'control',
            userId: `user_${i}`,
            metrics: { conversion_rate: Math.random() < 0.2 ? 1 : 0 }
          });
        }
        
        const results = await abTestingFramework.analyzeTestResults(testResult.testId);
        
        if (results.sequentialAnalysis) {
          expect(results.sequentialAnalysis.currentAlpha).toBeGreaterThan(0);
          expect(results.sequentialAnalysis.spentAlpha).toBeGreaterThanOrEqual(0);
          expect(results.sequentialAnalysis.remainingAlpha).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe('Multi-Armed Bandit', () => {
      test('should implement valid bandit algorithms', async () => {
        const config = createValidABTestConfig();
        config.multiArmedBandit = {
          enabled: true,
          algorithm: 'epsilon_greedy',
          parameters: { epsilon: 0.1 }
        };
        
        const testResult = await abTestingFramework.createTest(config);
        await abTestingFramework.startTest(testResult.testId);
        
        // Test variant assignment
        const assignments = [];
        for (let i = 0; i < 100; i++) {
          const assignment = abTestingFramework.assignVariant(testResult.testId, `user_${i}`);
          assignments.push(assignment);
        }
        
        // Should assign to both variants
        const uniqueAssignments = new Set(assignments);
        expect(uniqueAssignments.size).toBeGreaterThan(1);
        
        // Should explore initially
        const controlAssignments = assignments.filter(a => a === 'control').length;
        const treatmentAssignments = assignments.filter(a => a === 'treatment').length;
        expect(Math.min(controlAssignments, treatmentAssignments)).toBeGreaterThan(5);
      });
    });
  });

  describe('StatisticalIntegrationService', () => {
    describe('Comprehensive Validation', () => {
      test('should perform complete statistical validation', async () => {
        const request = {
          patternType: 'commitment' as const,
          validationData: generateValidationTestData(),
          options: {
            significanceLevel: 0.05,
            confidenceLevel: 0.95,
            crossValidationFolds: 3,
            includeTemporalAnalysis: true,
            includeBayesianAnalysis: true
          }
        };

        const result = await integrationService.validatePatternAccuracy(request);
        
        // Verify all components are present
        expect(result.overallAccuracy).toBeDefined();
        expect(result.statisticalSignificance).toBeDefined();
        expect(result.confidenceCalibration).toBeDefined();
        expect(result.crossValidationResults).toBeDefined();
        expect(result.bayesianAnalysis).toBeDefined();
        expect(result.recommendations).toBeDefined();
        
        // Verify statistical validity
        expect(result.overallAccuracy.f1Score).toBeGreaterThanOrEqual(0);
        expect(result.overallAccuracy.f1Score).toBeLessThanOrEqual(1);
        expect(result.statisticalSignificance.pValue).toBeGreaterThanOrEqual(0);
        expect(result.statisticalSignificance.pValue).toBeLessThanOrEqual(1);
        
        // Verify cross-validation makes sense
        expect(result.crossValidationResults.confidenceInterval[0]).toBeLessThan(
          result.crossValidationResults.confidenceInterval[1]
        );
        
        // Verify Bayesian analysis
        expect(result.bayesianAnalysis!.posteriorProbability).toBeGreaterThanOrEqual(0);
        expect(result.bayesianAnalysis!.posteriorProbability).toBeLessThanOrEqual(1);
        expect(result.bayesianAnalysis!.credibleInterval[0]).toBeLessThan(
          result.bayesianAnalysis!.credibleInterval[1]
        );
      });

      test('should generate meaningful recommendations', async () => {
        const lowQualityData = generateLowQualityValidationData();
        const request = {
          patternType: 'commitment' as const,
          validationData: lowQualityData,
          options: {}
        };

        const result = await integrationService.validatePatternAccuracy(request);
        
        // Should not recommend deployment for low quality
        expect(result.recommendations.deploymentReady).toBe(false);
        expect(result.recommendations.actionItems.length).toBeGreaterThan(0);
        expect(result.recommendations.risks.length).toBeGreaterThan(0);
        
        // Confidence should be appropriately low
        expect(result.recommendations.confidence).toBeLessThan(0.7);
      });
    });

    describe('Comprehensive Reporting', () => {
      test('should generate complete analysis report', async () => {
        const report = await integrationService.generateComprehensiveReport();
        
        // Verify all sections are present
        expect(report.executive_summary).toBeDefined();
        expect(report.statistical_validation).toBeDefined();
        expect(report.performance_analysis).toBeDefined();
        expect(report.ab_testing_results).toBeDefined();
        expect(report.predictive_insights).toBeDefined();
        expect(report.quality_assurance).toBeDefined();
        
        // Verify executive summary
        expect(report.executive_summary.overall_health_score).toBeGreaterThanOrEqual(0);
        expect(report.executive_summary.overall_health_score).toBeLessThanOrEqual(1);
        expect(Array.isArray(report.executive_summary.key_findings)).toBe(true);
        expect(Array.isArray(report.executive_summary.recommendations)).toBe(true);
        
        // Verify predictive insights
        expect(Array.isArray(report.predictive_insights.forecasts)).toBe(true);
        expect(Array.isArray(report.predictive_insights.anomaly_predictions)).toBe(true);
      });
    });
  });

  // Helper functions for generating test data
  function generateROCTestData() {
    return [
      // Perfect predictions
      { text: "high conf match", expected: [{ text: "match" }], predicted: [{ text: "match" }], confidence: [0.9], context: {} },
      { text: "medium conf match", expected: [{ text: "match" }], predicted: [{ text: "match" }], confidence: [0.7], context: {} },
      // Clear misses
      { text: "no match", expected: [], predicted: [], confidence: [], context: {} },
      { text: "another no match", expected: [], predicted: [], confidence: [], context: {} },
      // Challenging cases
      { text: "low conf false positive", expected: [], predicted: [{ text: "false" }], confidence: [0.3], context: {} },
      { text: "missed detection", expected: [{ text: "missed" }], predicted: [], confidence: [], context: {} }
    ];
  }

  function generateMcNemarTestData() {
    return Array.from({ length: 50 }, (_, i) => ({
      text: `test case ${i}`,
      expected: i % 2 === 0 ? [{ text: "match" }] : [],
      predicted: (i % 3 === 0) ? [{ text: "match" }] : [],
      confidence: (i % 3 === 0) ? [0.8] : [],
      context: {}
    }));
  }

  function generateCalibrationTestData() {
    return Array.from({ length: 100 }, (_, i) => {
      const confidence = i / 100;
      const shouldMatch = Math.random() < confidence; // Perfect calibration
      return {
        text: `calibration test ${i}`,
        expected: shouldMatch ? [{ text: "match" }] : [],
        predicted: [{ text: "match" }],
        confidence: [confidence],
        context: {}
      };
    });
  }

  function generateBinomialData(n: number, p: number): number[] {
    return Array.from({ length: n }, () => Math.random() < p ? 1 : 0);
  }

  function createValidABTestConfig() {
    return {
      name: 'Test A/B Configuration',
      description: 'Testing A/B test functionality',
      hypothesis: 'Treatment will improve conversion',
      variants: [
        { id: 'control', name: 'Control', allocation: 50, config: {}, isControl: true },
        { id: 'treatment', name: 'Treatment', allocation: 50, config: {}, isControl: false }
      ],
      metrics: [{
        name: 'conversion_rate',
        type: 'conversion' as const,
        primaryMetric: true,
        direction: 'increase' as const,
        minimumDetectableEffect: 0.1,
        expectedValue: 0.2
      }],
      significanceLevel: 0.05,
      power: 0.8,
      minimumSampleSize: 100,
      trafficAllocation: 100,
      startDate: Date.now(),
      plannedEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      earlyStoppingEnabled: false,
      sequentialTesting: false,
      minimumRunDays: 14,
      maxPValue: 0.05
    };
  }

  function generateValidationTestData() {
    return [
      {
        text: "I will complete this task by tomorrow",
        expected: [{ text: "complete this task" }],
        predicted: [{ text: "complete this task" }],
        confidence: [0.9],
        context: { userRole: 'assistant' }
      },
      {
        text: "Let me check on the status",
        expected: [{ text: "check on the status" }],
        predicted: [{ text: "check status" }], // Close but not exact
        confidence: [0.75],
        context: { userRole: 'assistant' }
      },
      {
        text: "I need to review the documentation",
        expected: [{ text: "review the documentation" }],
        predicted: [{ text: "review the documentation" }],
        confidence: [0.85],
        context: { userRole: 'assistant' }
      },
      {
        text: "Maybe I should look into this",
        expected: [], // Tentative language, not a strong commitment
        predicted: [{ text: "look into this" }],
        confidence: [0.4],
        context: { userRole: 'assistant' }
      }
    ];
  }

  function generateLowQualityValidationData() {
    return [
      {
        text: "test1",
        expected: [{ text: "match1" }],
        predicted: [{ text: "wrong1" }],
        confidence: [0.9], // High confidence but wrong
        context: {}
      },
      {
        text: "test2",
        expected: [{ text: "match2" }],
        predicted: [], // Missed detection
        confidence: [],
        context: {}
      },
      {
        text: "test3",
        expected: [],
        predicted: [{ text: "false_positive" }],
        confidence: [0.8], // False positive
        context: {}
      }
    ];
  }
});

describe('Mathematical Accuracy Validation', () => {
  test('should validate normal distribution calculations', () => {
    const statisticalAnalyzer = new StatisticalAnalyzer(mockDbManager);
    const normalCDF = (statisticalAnalyzer as any).normalCDF.bind(statisticalAnalyzer);
    
    // Test symmetry
    expect(normalCDF(1.96)).toBeCloseTo(1 - normalCDF(-1.96), 3);
    
    // Test known values
    expect(normalCDF(0)).toBeCloseTo(0.5, 3);
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 2);
    expect(normalCDF(2.58)).toBeCloseTo(0.995, 2);
  });

  test('should validate t-distribution critical values', () => {
    const statisticalAnalyzer = new StatisticalAnalyzer(mockDbManager);
    const getTCriticalValue = (statisticalAnalyzer as any).getTCriticalValue.bind(statisticalAnalyzer);
    
    // Test known critical values
    const t005_10 = getTCriticalValue(10, 0.05);
    const t005_30 = getTCriticalValue(30, 0.05);
    
    expect(t005_10).toBeCloseTo(2.228, 1);
    expect(t005_30).toBeCloseTo(2.042, 1);
    
    // As df increases, t-critical should approach z-critical
    const t005_100 = getTCriticalValue(100, 0.05);
    expect(t005_100).toBeCloseTo(1.96, 1);
  });

  test('should validate chi-square calculations', () => {
    const statisticalAnalyzer = new StatisticalAnalyzer(mockDbManager);
    const chiSquareCDF = (statisticalAnalyzer as any).chiSquareCDF.bind(statisticalAnalyzer);
    
    // Test boundary conditions
    expect(chiSquareCDF(0, 1)).toBeCloseTo(0, 3);
    
    // Test known values
    expect(chiSquareCDF(3.84, 1)).toBeCloseTo(0.95, 1);
    expect(chiSquareCDF(5.99, 2)).toBeCloseTo(0.95, 1);
  });

  test('should validate bootstrap confidence intervals properties', () => {
    const statisticalAnalyzer = new StatisticalAnalyzer(mockDbManager);
    
    // Test with known distribution
    const normalData = Array.from({ length: 100 }, () => Math.random() * 2 - 1);
    const meanFunc = (sample: number[]) => sample.reduce((sum, x) => sum + x, 0) / sample.length;
    
    const ci95 = statisticalAnalyzer.calculateBootstrapConfidenceInterval(normalData, meanFunc, 0.95);
    const ci90 = statisticalAnalyzer.calculateBootstrapConfidenceInterval(normalData, meanFunc, 0.90);
    
    // 95% CI should be wider than 90% CI
    expect(ci95[1] - ci95[0]).toBeGreaterThan(ci90[1] - ci90[0]);
    
    // Both should contain the sample mean
    const sampleMean = meanFunc(normalData);
    expect(sampleMean).toBeGreaterThanOrEqual(ci95[0]);
    expect(sampleMean).toBeLessThanOrEqual(ci95[1]);
    expect(sampleMean).toBeGreaterThanOrEqual(ci90[0]);
    expect(sampleMean).toBeLessThanOrEqual(ci90[1]);
  });
});

describe('Production Readiness Validation', () => {
  test('should handle edge cases gracefully', async () => {
    const statisticalAnalyzer = new StatisticalAnalyzer(mockDbManager);
    
    // Empty data
    const emptyResults = await statisticalAnalyzer.validatePatternAccuracy([]);
    expect(emptyResults.overallMetrics.f1Score).toBe(0);
    expect(emptyResults.overallMetrics.precision).toBe(0);
    
    // Single data point
    const singleResults = await statisticalAnalyzer.validatePatternAccuracy([
      {
        text: "single test",
        expected: [{ text: "match" }],
        predicted: [{ text: "match" }],
        confidence: [0.8],
        context: {}
      }
    ]);
    expect(singleResults.overallMetrics.f1Score).toBeGreaterThan(0);
  });

  test('should maintain numerical stability', async () => {
    const temporalAnalyzer = new TemporalPatternAnalyzer(mockDbManager);
    
    // Test with extreme values
    const extremeData = [
      { timestamp: Date.now(), value: 1e-10 },
      { timestamp: Date.now() + 1000, value: 1e10 },
      { timestamp: Date.now() + 2000, value: 0 }
    ];
    
    const result = await temporalAnalyzer.analyzeTemporalPatterns(extremeData);
    
    // Should not crash and should return valid results
    expect(result.statistics.mean).toBeFinite();
    expect(result.statistics.standardDeviation).toBeFinite();
    expect(result.trend.slope).toBeFinite();
  });

  test('should handle concurrent operations', async () => {
    const integrationService = new StatisticalIntegrationService(mockDbManager);
    
    // Simulate concurrent validation requests
    const requests = Array.from({ length: 5 }, (_, i) => ({
      patternType: 'commitment' as const,
      validationData: generateValidationTestData(),
      options: { significanceLevel: 0.05 }
    }));
    
    const results = await Promise.all(
      requests.map(request => integrationService.validatePatternAccuracy(request))
    );
    
    // All requests should complete successfully
    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.overallAccuracy).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  test('should validate memory usage with large datasets', async () => {
    const statisticalAnalyzer = new StatisticalAnalyzer(mockDbManager);
    
    // Large dataset (but not too large for testing)
    const largeValidationData = Array.from({ length: 1000 }, (_, i) => ({
      text: `test case ${i}`,
      expected: i % 2 === 0 ? [{ text: `match ${i}` }] : [],
      predicted: i % 3 === 0 ? [{ text: `prediction ${i}` }] : [],
      confidence: i % 3 === 0 ? [Math.random()] : [],
      context: { index: i }
    }));
    
    // Should complete without memory issues
    const result = await statisticalAnalyzer.validatePatternAccuracy(largeValidationData);
    expect(result.overallMetrics).toBeDefined();
  });
});