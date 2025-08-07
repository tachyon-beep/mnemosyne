/**
 * Advanced Size Estimation Utilities
 * 
 * Provides accurate memory size calculation for JavaScript objects,
 * accounting for object overhead, circular references, and complex structures.
 */

export interface SizeEstimate {
  /** Total estimated size in bytes */
  totalBytes: number;
  /** Breakdown by data type */
  breakdown: {
    primitives: number;
    objects: number;
    arrays: number;
    strings: number;
    functions: number;
    overhead: number;
  };
  /** Detailed analysis */
  analysis: {
    objectCount: number;
    arrayCount: number;
    stringCount: number;
    circularReferences: number;
    maxDepth: number;
    averageKeyLength: number;
  };
}

export interface SizeOptions {
  /** Include object overhead in calculations */
  includeOverhead?: boolean;
  /** Maximum depth to traverse (prevents infinite recursion) */
  maxDepth?: number;
  /** Include function sizes */
  includeFunctions?: boolean;
  /** Use precise string size calculation */
  preciseStrings?: boolean;
  /** Account for V8 internal structures */
  includeV8Overhead?: boolean;
}

/**
 * Advanced size estimator with object overhead calculation
 */
export class SizeEstimator {
  private static readonly DEFAULT_OPTIONS: Required<SizeOptions> = {
    includeOverhead: true,
    maxDepth: 10,
    includeFunctions: false,
    preciseStrings: true,
    includeV8Overhead: true
  };

  // V8 object overhead constants (approximate)
  private static readonly V8_OVERHEAD = {
    OBJECT_HEADER: 24,      // Object header size
    PROPERTY_DESCRIPTOR: 16, // Per property
    HIDDEN_CLASS: 40,       // Hidden class overhead
    ARRAY_HEADER: 32,       // Array header
    STRING_HEADER: 20,      // String object header
    FUNCTION_HEADER: 64     // Function object header
  };

  /**
   * Estimate the memory size of a JavaScript value
   */
  static estimate(value: any, options: SizeOptions = {}): SizeEstimate {
    const opts = { ...SizeEstimator.DEFAULT_OPTIONS, ...options };
    const visited = new WeakSet<object>();
    const context = {
      breakdown: {
        primitives: 0,
        objects: 0,
        arrays: 0,
        strings: 0,
        functions: 0,
        overhead: 0
      },
      analysis: {
        objectCount: 0,
        arrayCount: 0,
        stringCount: 0,
        circularReferences: 0,
        maxDepth: 0,
        averageKeyLength: 0,
        totalKeyLength: 0,
        keyCount: 0
      }
    };

    const totalBytes = SizeEstimator.estimateValue(value, opts, visited, context, 0);

    // Calculate average key length
    context.analysis.averageKeyLength = context.analysis.keyCount > 0 
      ? context.analysis.totalKeyLength / context.analysis.keyCount 
      : 0;

    return {
      totalBytes,
      breakdown: context.breakdown,
      analysis: {
        objectCount: context.analysis.objectCount,
        arrayCount: context.analysis.arrayCount,
        stringCount: context.analysis.stringCount,
        circularReferences: context.analysis.circularReferences,
        maxDepth: context.analysis.maxDepth,
        averageKeyLength: context.analysis.averageKeyLength
      }
    };
  }

  /**
   * Quick size estimate for cache operations
   */
  static quickEstimate(value: any): number {
    try {
      // Fast path for simple values
      if (value === null || value === undefined) return 0;
      
      const type = typeof value;
      switch (type) {
        case 'boolean':
        case 'number':
          return 8;
        case 'string':
          return SizeEstimator.getStringSize(value);
        case 'bigint':
          return Math.ceil(value.toString(2).length / 8) + 8; // Approximate
        default:
          // For complex objects, use a simplified estimation
          return SizeEstimator.simplifiedEstimate(value);
      }
    } catch (error) {
      // Fallback to a reasonable default
      return 1024;
    }
  }

  /**
   * Compare size estimates for cache efficiency analysis
   */
  static compareEstimates(estimate1: SizeEstimate, estimate2: SizeEstimate): {
    sizeDifference: number;
    percentageDifference: number;
    moreEfficient: 'first' | 'second' | 'equal';
    recommendations: string[];
  } {
    const sizeDiff = estimate1.totalBytes - estimate2.totalBytes;
    const percentDiff = estimate2.totalBytes > 0 
      ? (sizeDiff / estimate2.totalBytes) * 100 
      : 0;

    const recommendations: string[] = [];
    
    // Analyze structure efficiency
    if (estimate1.analysis.objectCount > estimate2.analysis.objectCount * 1.5) {
      recommendations.push('First structure has significantly more objects - consider flattening');
    }

    if (estimate1.breakdown.overhead > estimate1.totalBytes * 0.3) {
      recommendations.push('High overhead ratio - consider using more primitive types');
    }

    if (estimate1.analysis.maxDepth > 8) {
      recommendations.push('Deep nesting detected - consider flattening the structure');
    }

    return {
      sizeDifference: sizeDiff,
      percentageDifference: percentDiff,
      moreEfficient: sizeDiff < 0 ? 'first' : sizeDiff > 0 ? 'second' : 'equal',
      recommendations
    };
  }

  /**
   * Estimate size with caching for repeated structures
   */
  static estimateWithCache(value: any, cache: Map<any, number> = new Map(), options: SizeOptions = {}): number {
    if (cache.has(value)) {
      return cache.get(value)!;
    }

    const estimate = SizeEstimator.estimate(value, options);
    cache.set(value, estimate.totalBytes);
    return estimate.totalBytes;
  }

  /**
   * Monitor size trends over time
   */
  static createSizeMonitor(): {
    record: (key: string, value: any) => void;
    getStats: () => {
      averageSize: number;
      maxSize: number;
      minSize: number;
      totalSamples: number;
      sizeByKey: Map<string, number[]>;
      trends: Array<{ key: string; trend: 'growing' | 'shrinking' | 'stable' }>;
    };
    clear: () => void;
  } {
    const sizeHistory = new Map<string, number[]>();

    return {
      record: (key: string, value: any): void => {
        const size = SizeEstimator.quickEstimate(value);
        
        if (!sizeHistory.has(key)) {
          sizeHistory.set(key, []);
        }
        
        const history = sizeHistory.get(key)!;
        history.push(size);
        
        // Keep only recent samples
        if (history.length > 50) {
          history.splice(0, history.length - 50);
        }
      },

      getStats: () => {
        let totalSize = 0;
        let maxSize = 0;
        let minSize = Infinity;
        let sampleCount = 0;

        const trends: Array<{ key: string; trend: 'growing' | 'shrinking' | 'stable' }> = [];

        for (const [key, sizes] of sizeHistory.entries()) {
          if (sizes.length === 0) continue;

          const keyMax = Math.max(...sizes);
          const keyMin = Math.min(...sizes);
          const keyAvg = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;

          totalSize += keyAvg * sizes.length;
          maxSize = Math.max(maxSize, keyMax);
          minSize = Math.min(minSize, keyMin);
          sampleCount += sizes.length;

          // Determine trend
          if (sizes.length >= 3) {
            const recent = sizes.slice(-3);
            const isGrowing = recent.every((size, i) => i === 0 || size >= recent[i - 1]);
            const isShrinking = recent.every((size, i) => i === 0 || size <= recent[i - 1]);

            trends.push({
              key,
              trend: isGrowing ? 'growing' : isShrinking ? 'shrinking' : 'stable'
            });
          }
        }

        return {
          averageSize: sampleCount > 0 ? totalSize / sampleCount : 0,
          maxSize: maxSize === 0 ? 0 : maxSize,
          minSize: minSize === Infinity ? 0 : minSize,
          totalSamples: sampleCount,
          sizeByKey: new Map(sizeHistory),
          trends
        };
      },

      clear: (): void => {
        sizeHistory.clear();
      }
    };
  }

  /**
   * Estimate value size recursively
   */
  private static estimateValue(
    value: any,
    options: Required<SizeOptions>,
    visited: WeakSet<object>,
    context: any,
    depth: number
  ): number {
    // Track maximum depth
    context.analysis.maxDepth = Math.max(context.analysis.maxDepth, depth);

    // Prevent infinite recursion
    if (depth >= options.maxDepth) {
      return 0;
    }

    // Handle null and undefined
    if (value === null || value === undefined) {
      return 4; // Pointer size
    }

    const type = typeof value;

    switch (type) {
      case 'boolean':
        context.breakdown.primitives += 1;
        return 1;

      case 'number':
        context.breakdown.primitives += 8;
        return 8; // 64-bit number

      case 'bigint':
        context.breakdown.primitives += Math.ceil(value.toString(2).length / 8);
        return Math.ceil(value.toString(2).length / 8) + 8;

      case 'string':
        return SizeEstimator.estimateString(value, options, context);

      case 'function':
        return SizeEstimator.estimateFunction(value, options, context);

      case 'object':
        return SizeEstimator.estimateObject(value, options, visited, context, depth);

      default:
        return 8; // Default size for unknown types
    }
  }

  /**
   * Estimate string size with encoding considerations
   */
  private static estimateString(str: string, options: Required<SizeOptions>, context: any): number {
    context.breakdown.strings += str.length;
    context.analysis.stringCount++;

    if (!options.preciseStrings) {
      return str.length * 2; // Rough estimate
    }

    let byteLength = 0;
    
    // Calculate UTF-16 byte length
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode < 0x80) {
        byteLength += 1; // ASCII
      } else if (charCode < 0x800) {
        byteLength += 2;
      } else if (charCode < 0xD800 || charCode >= 0xE000) {
        byteLength += 3;
      } else {
        // Surrogate pair
        byteLength += 4;
        i++; // Skip next char as it's part of the pair
      }
    }

    // Add string object overhead
    if (options.includeOverhead) {
      byteLength += SizeEstimator.V8_OVERHEAD.STRING_HEADER;
    }

    return byteLength;
  }

  /**
   * Estimate function size
   */
  private static estimateFunction(func: Function, options: Required<SizeOptions>, context: any): number {
    if (!options.includeFunctions) {
      return 0;
    }

    const funcStr = func.toString();
    let size = funcStr.length * 2; // Source code size

    context.breakdown.functions += size;

    if (options.includeOverhead) {
      size += SizeEstimator.V8_OVERHEAD.FUNCTION_HEADER;
      context.breakdown.overhead += SizeEstimator.V8_OVERHEAD.FUNCTION_HEADER;
    }

    return size;
  }

  /**
   * Estimate object size with circular reference detection
   */
  private static estimateObject(
    obj: object,
    options: Required<SizeOptions>,
    visited: WeakSet<object>,
    context: any,
    depth: number
  ): number {
    // Check for circular references
    if (visited.has(obj)) {
      context.analysis.circularReferences++;
      return 4; // Just a reference
    }

    visited.add(obj);
    let size = 0;

    try {
      if (Array.isArray(obj)) {
        return SizeEstimator.estimateArray(obj, options, visited, context, depth);
      }

      // Handle special object types
      if (obj instanceof Date) {
        return 24; // Date object size
      }

      if (obj instanceof RegExp) {
        return obj.toString().length * 2 + 32;
      }

      if (obj instanceof Map) {
        return SizeEstimator.estimateMap(obj, options, visited, context, depth);
      }

      if (obj instanceof Set) {
        return SizeEstimator.estimateSet(obj, options, visited, context, depth);
      }

      if (obj instanceof ArrayBuffer) {
        return obj.byteLength + 24; // Buffer + header
      }

      // Regular object
      context.analysis.objectCount++;

      if (options.includeOverhead) {
        size += SizeEstimator.V8_OVERHEAD.OBJECT_HEADER;
        context.breakdown.overhead += SizeEstimator.V8_OVERHEAD.OBJECT_HEADER;
      }

      // Estimate properties
      const keys = Object.keys(obj);
      for (const key of keys) {
        // Key size
        const keySize = SizeEstimator.getStringSize(key);
        size += keySize;
        context.analysis.totalKeyLength += key.length;
        context.analysis.keyCount++;

        // Property descriptor overhead
        if (options.includeOverhead) {
          size += SizeEstimator.V8_OVERHEAD.PROPERTY_DESCRIPTOR;
          context.breakdown.overhead += SizeEstimator.V8_OVERHEAD.PROPERTY_DESCRIPTOR;
        }

        // Property value
        try {
          const propValue = (obj as any)[key];
          const propSize = SizeEstimator.estimateValue(propValue, options, visited, context, depth + 1);
          size += propSize;
        } catch (error) {
          // Handle getter errors or inaccessible properties
          size += 8; // Estimated size
        }
      }

      context.breakdown.objects += size;

      // Hidden class overhead for objects with many properties
      if (options.includeV8Overhead && keys.length > 5) {
        const hiddenClassSize = SizeEstimator.V8_OVERHEAD.HIDDEN_CLASS;
        size += hiddenClassSize;
        context.breakdown.overhead += hiddenClassSize;
      }

    } finally {
      visited.delete(obj);
    }

    return size;
  }

  /**
   * Estimate array size
   */
  private static estimateArray(
    arr: any[],
    options: Required<SizeOptions>,
    visited: WeakSet<object>,
    context: any,
    depth: number
  ): number {
    context.analysis.arrayCount++;
    let size = 0;

    if (options.includeOverhead) {
      size += SizeEstimator.V8_OVERHEAD.ARRAY_HEADER;
      context.breakdown.overhead += SizeEstimator.V8_OVERHEAD.ARRAY_HEADER;
    }

    // Array elements
    for (let i = 0; i < arr.length; i++) {
      const elementSize = SizeEstimator.estimateValue(arr[i], options, visited, context, depth + 1);
      size += elementSize;
    }

    // Array hole overhead (sparse arrays)
    if (arr.length > 0 && Object.keys(arr).length < arr.length) {
      size += (arr.length - Object.keys(arr).length) * 4; // Holes
    }

    context.breakdown.arrays += size;
    return size;
  }

  /**
   * Estimate Map size
   */
  private static estimateMap(
    map: Map<any, any>,
    options: Required<SizeOptions>,
    visited: WeakSet<object>,
    context: any,
    depth: number
  ): number {
    let size = 40; // Map object overhead

    for (const [key, value] of map) {
      size += SizeEstimator.estimateValue(key, options, visited, context, depth + 1);
      size += SizeEstimator.estimateValue(value, options, visited, context, depth + 1);
      size += 16; // Map entry overhead
    }

    return size;
  }

  /**
   * Estimate Set size
   */
  private static estimateSet(
    set: Set<any>,
    options: Required<SizeOptions>,
    visited: WeakSet<object>,
    context: any,
    depth: number
  ): number {
    let size = 32; // Set object overhead

    for (const value of set) {
      size += SizeEstimator.estimateValue(value, options, visited, context, depth + 1);
      size += 8; // Set entry overhead
    }

    return size;
  }

  /**
   * Get accurate string size in bytes
   */
  private static getStringSize(str: string): number {
    return str.length * 2; // UTF-16 encoding
  }

  /**
   * Simplified estimation for quick operations
   */
  private static simplifiedEstimate(value: any): number {
    try {
      const json = JSON.stringify(value);
      return json.length * 2 + 64; // JSON size + overhead
    } catch (error) {
      // Handle circular references or non-serializable objects
      if (Array.isArray(value)) {
        return value.length * 32 + 64; // Rough array estimate
      }
      
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length * 64 + 128; // Rough object estimate
      }
      
      return 64; // Default fallback
    }
  }
}

/**
 * Utility functions for common size operations
 */
export class SizeUtils {
  /**
   * Format bytes in human-readable format
   */
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Check if size is within reasonable cache limits
   */
  static isReasonableCacheSize(bytes: number, maxBytes: number = 10 * 1024 * 1024): boolean {
    return bytes > 0 && bytes <= maxBytes;
  }

  /**
   * Calculate cache efficiency ratio
   */
  static calculateCacheEfficiency(dataSize: number, cacheSize: number): number {
    if (cacheSize <= 0) return 0;
    return Math.min(1, dataSize / cacheSize);
  }

  /**
   * Estimate serialization overhead
   */
  static estimateSerializationOverhead(value: any): number {
    try {
      const original = SizeEstimator.quickEstimate(value);
      const serialized = JSON.stringify(value).length * 2;
      return Math.max(0, serialized - original);
    } catch {
      return 0;
    }
  }
}