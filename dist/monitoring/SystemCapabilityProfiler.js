/**
 * System Capability Profiler
 *
 * Automatically detects and profiles system capabilities including:
 * - CPU performance and characteristics
 * - Memory capacity and bandwidth
 * - Disk I/O performance
 * - Network capabilities
 * - Runtime environment characteristics
 *
 * Uses this information to automatically adjust system limits and thresholds.
 */
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
export class SystemCapabilityProfiler extends EventEmitter {
    cacheFile;
    profile = null;
    benchmarkResults = new Map();
    isProfiled = false;
    BENCHMARK_TIMEOUT = 30000; // 30 seconds max per benchmark
    CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    constructor(cacheFile = './data/system-profile.json') {
        super();
        this.cacheFile = cacheFile;
    }
    /**
     * Run complete system profiling
     */
    async profileSystem() {
        if (this.isProfiled && this.profile) {
            return this.profile;
        }
        console.log('🔍 Starting comprehensive system profiling...');
        // Try to load cached profile first
        const cachedProfile = await this.loadCachedProfile();
        if (cachedProfile && Date.now() - cachedProfile.timestamp < this.CACHE_DURATION) {
            console.log('📄 Using cached system profile');
            this.profile = cachedProfile;
            this.isProfiled = true;
            return cachedProfile;
        }
        // Run full profiling
        const startTime = Date.now();
        const [cpu, memory, disk, network, runtime] = await Promise.all([
            this.profileCPU(),
            this.profileMemory(),
            this.profileDisk(),
            this.profileNetwork(),
            this.profileRuntime()
        ]);
        // Determine overall performance class
        const overallPerformanceClass = this.calculatePerformanceClass(cpu, memory, disk);
        // Calculate recommended limits
        const recommendedLimits = this.calculateRecommendedLimits(cpu, memory, disk, overallPerformanceClass);
        this.profile = {
            cpu,
            memory,
            disk,
            network,
            runtime,
            timestamp: Date.now(),
            profileVersion: '1.0.0',
            overallPerformanceClass,
            recommendedLimits
        };
        await this.saveCachedProfile(this.profile);
        const duration = Date.now() - startTime;
        console.log(`✅ System profiling complete in ${duration}ms`);
        console.log(`🎯 Performance class: ${overallPerformanceClass.toUpperCase()}`);
        this.isProfiled = true;
        this.emit('profileComplete', this.profile);
        return this.profile;
    }
    /**
     * Profile CPU characteristics and performance
     */
    async profileCPU() {
        console.log('⚡ Profiling CPU...');
        const cpus = os.cpus();
        const architecture = os.arch();
        const platform = os.platform();
        // Basic CPU info
        const cores = cpus.length;
        const baseFrequency = cpus[0]?.speed || 0;
        const vendor = this.extractCPUVendor(cpus[0]?.model || '');
        const model = cpus[0]?.model || 'Unknown';
        // Estimate logical cores (hyperthreading)
        let logicalCores = cores;
        if (platform === 'linux') {
            try {
                const cpuinfo = await fs.readFile('/proc/cpuinfo', 'utf-8');
                const physicalIds = new Set();
                const coreIds = new Set();
                for (const line of cpuinfo.split('\n')) {
                    if (line.startsWith('physical id')) {
                        physicalIds.add(line.split(':')[1].trim());
                    }
                    if (line.startsWith('core id')) {
                        coreIds.add(line.split(':')[1].trim());
                    }
                }
                const physicalCores = physicalIds.size * coreIds.size;
                logicalCores = Math.max(cores, physicalCores);
            }
            catch (error) {
                // Fallback to basic detection
            }
        }
        // Run CPU benchmark
        const cpuBenchmark = await this.runCPUBenchmark();
        const performanceScore = this.calculateCPUScore(cores, baseFrequency, cpuBenchmark.score);
        return {
            cores: logicalCores,
            logicalCores,
            baseFrequency,
            architecture,
            vendor,
            model,
            performanceScore
        };
    }
    /**
     * Profile memory characteristics
     */
    async profileMemory() {
        console.log('🧠 Profiling memory...');
        const totalMemory = os.totalmem();
        const availableMemory = os.freemem();
        // Get swap information (Linux/macOS)
        let swapTotal = 0;
        let swapFree = 0;
        try {
            if (os.platform() === 'linux') {
                const meminfo = await fs.readFile('/proc/meminfo', 'utf-8');
                for (const line of meminfo.split('\n')) {
                    if (line.startsWith('SwapTotal:')) {
                        swapTotal = parseInt(line.split(/\s+/)[1]) * 1024; // Convert KB to bytes
                    }
                    if (line.startsWith('SwapFree:')) {
                        swapFree = parseInt(line.split(/\s+/)[1]) * 1024;
                    }
                }
            }
        }
        catch (error) {
            // Swap info not available
        }
        // Run memory benchmark
        const memoryBenchmark = await this.runMemoryBenchmark();
        // Calculate recommended sizes
        const recommendedHeapSize = Math.min(totalMemory * 0.75, 8 * 1024 * 1024 * 1024); // 75% of RAM or 8GB max
        const recommendedCacheSize = Math.min(totalMemory * 0.25, 2 * 1024 * 1024 * 1024); // 25% of RAM or 2GB max
        return {
            totalMemory,
            availableMemory,
            swapTotal,
            swapFree,
            bandwidth: memoryBenchmark.bandwidth,
            latency: memoryBenchmark.latency,
            recommendedHeapSize,
            recommendedCacheSize
        };
    }
    /**
     * Profile disk I/O performance
     */
    async profileDisk() {
        console.log('💾 Profiling disk I/O...');
        // Get disk space info
        const stats = await fs.stat('.');
        let capacity = 0;
        let available = 0;
        try {
            const stat = await fs.stat('.');
            // This is a simplified approach - in production you'd use statvfs or similar
            capacity = 1024 * 1024 * 1024 * 1024; // 1TB default estimate
            available = capacity * 0.5; // 50% available estimate
        }
        catch (error) {
            // Use defaults
        }
        // Run disk benchmark
        const diskBenchmark = await this.runDiskBenchmark();
        // Determine disk type based on performance characteristics
        let diskType = 'Unknown';
        if (diskBenchmark.randomIOPS > 10000 && diskBenchmark.readSpeed > 500) {
            diskType = 'NVME';
        }
        else if (diskBenchmark.randomIOPS > 1000 && diskBenchmark.readSpeed > 100) {
            diskType = 'SSD';
        }
        else if (diskBenchmark.randomIOPS < 200 && diskBenchmark.readSpeed < 150) {
            diskType = 'HDD';
        }
        return {
            type: diskType,
            capacity,
            available,
            readSpeed: diskBenchmark.readSpeed,
            writeSpeed: diskBenchmark.writeSpeed,
            randomIOPS: diskBenchmark.randomIOPS,
            latency: diskBenchmark.latency
        };
    }
    /**
     * Profile network capabilities
     */
    async profileNetwork() {
        console.log('🌐 Profiling network...');
        const networkInterfaces = os.networkInterfaces();
        const interfaces = [];
        for (const [name, addrs] of Object.entries(networkInterfaces)) {
            if (!addrs)
                continue;
            const activeAddr = addrs.find(addr => !addr.internal && addr.family === 'IPv4');
            if (!activeAddr)
                continue;
            interfaces.push({
                name,
                type: name.includes('eth') || name.includes('en') ? 'ethernet' :
                    name.includes('wl') || name.includes('wifi') ? 'wifi' :
                        name.includes('lo') ? 'loopback' : 'other',
                mtu: activeAddr.mac ? 1500 : 65536, // Standard MTU estimates
                isActive: !activeAddr.internal
            });
        }
        // Estimate bandwidth and latency (simplified)
        const estimatedBandwidth = interfaces.some(i => i.type === 'ethernet') ? 1000 :
            interfaces.some(i => i.type === 'wifi') ? 100 : 10;
        const latencyToInternet = await this.pingLatency();
        return {
            interfaces,
            estimatedBandwidth,
            latencyToInternet
        };
    }
    /**
     * Profile Node.js runtime characteristics
     */
    async profileRuntime() {
        console.log('⚙️ Profiling runtime...');
        const nodeVersion = process.version;
        const v8Version = process.versions.v8;
        const platform = process.platform;
        const architecture = process.arch;
        const endianness = os.endianness();
        // Estimate max heap size
        let maxHeapSize = 0;
        try {
            // This would trigger in older Node.js versions
            const v8 = require('v8');
            const heapStats = v8.getHeapStatistics();
            maxHeapSize = heapStats.heap_size_limit;
        }
        catch (error) {
            // Fallback estimate
            maxHeapSize = os.totalmem() * 0.75; // 75% of system RAM
        }
        // Check for various Node.js features
        const jitSupport = typeof process.versions.v8 !== 'undefined';
        const workerThreadSupport = parseInt(nodeVersion.slice(1)) >= 12;
        // Determine GC type (simplified detection)
        const gcType = maxHeapSize > 4 * 1024 * 1024 * 1024 ? 'generational' : 'incremental';
        return {
            nodeVersion,
            v8Version,
            platform,
            architecture,
            endianness,
            maxHeapSize,
            gcType,
            jitSupport,
            workerThreadSupport
        };
    }
    /**
     * Run CPU performance benchmark
     */
    async runCPUBenchmark() {
        return new Promise((resolve) => {
            const startTime = Date.now();
            let iterations = 0;
            const maxDuration = 5000; // 5 seconds max
            const benchmark = () => {
                const iterationStart = Date.now();
                // CPU-intensive calculation
                let result = 0;
                for (let i = 0; i < 100000; i++) {
                    result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
                }
                iterations++;
                const elapsed = Date.now() - startTime;
                if (elapsed < maxDuration) {
                    setImmediate(benchmark);
                }
                else {
                    const score = (iterations * 100000) / elapsed; // Operations per millisecond
                    resolve({ score, duration: elapsed });
                }
            };
            benchmark();
        });
    }
    /**
     * Run memory performance benchmark
     */
    async runMemoryBenchmark() {
        return new Promise((resolve) => {
            const arraySize = 1024 * 1024; // 1MB
            const iterations = 100;
            // Bandwidth test
            const bandwidthStart = Date.now();
            let sum = 0;
            for (let iter = 0; iter < iterations; iter++) {
                const buffer = new Float64Array(arraySize);
                for (let i = 0; i < arraySize; i++) {
                    buffer[i] = Math.random();
                    sum += buffer[i];
                }
            }
            const bandwidthDuration = Date.now() - bandwidthStart;
            const bandwidth = (arraySize * iterations * 8) / (bandwidthDuration / 1000) / 1024 / 1024; // MB/s
            // Latency test (simplified)
            const latencyStart = process.hrtime.bigint();
            const testArray = new Array(1000).fill(0).map(() => Math.random());
            let latencySum = 0;
            for (let i = 0; i < testArray.length; i++) {
                latencySum += testArray[i];
            }
            const latencyEnd = process.hrtime.bigint();
            const latency = Number(latencyEnd - latencyStart) / 1000000; // Convert to milliseconds
            resolve({ bandwidth, latency });
        });
    }
    /**
     * Run disk I/O benchmark
     */
    async runDiskBenchmark() {
        const tempDir = os.tmpdir();
        const testFile = path.join(tempDir, `disk-bench-${Date.now()}.tmp`);
        try {
            // Sequential write test
            const writeData = Buffer.alloc(1024 * 1024, 'x'); // 1MB
            const writeIterations = 10;
            const writeStart = Date.now();
            for (let i = 0; i < writeIterations; i++) {
                await fs.writeFile(`${testFile}.${i}`, writeData);
            }
            const writeDuration = Date.now() - writeStart;
            const writeSpeed = (writeData.length * writeIterations) / (writeDuration / 1000) / 1024 / 1024; // MB/s
            // Sequential read test
            const readStart = Date.now();
            for (let i = 0; i < writeIterations; i++) {
                await fs.readFile(`${testFile}.${i}`);
            }
            const readDuration = Date.now() - readStart;
            const readSpeed = (writeData.length * writeIterations) / (readDuration / 1000) / 1024 / 1024; // MB/s
            // Random I/O test (simplified)
            const randomStart = Date.now();
            const smallData = Buffer.alloc(4096, 'y'); // 4KB blocks
            const randomOperations = 100;
            for (let i = 0; i < randomOperations; i++) {
                await fs.writeFile(`${testFile}.random.${i}`, smallData);
                await fs.readFile(`${testFile}.random.${i}`);
            }
            const randomDuration = Date.now() - randomStart;
            const randomIOPS = (randomOperations * 2) / (randomDuration / 1000); // Read + write ops per second
            const latency = randomDuration / randomOperations; // Average latency per operation
            // Cleanup
            for (let i = 0; i < writeIterations; i++) {
                try {
                    await fs.unlink(`${testFile}.${i}`);
                    await fs.unlink(`${testFile}.random.${i}`);
                }
                catch (error) {
                    // Ignore cleanup errors
                }
            }
            return {
                readSpeed,
                writeSpeed,
                randomIOPS,
                latency
            };
        }
        catch (error) {
            console.warn('⚠️ Disk benchmark failed, using estimates:', error);
            return {
                readSpeed: 100,
                writeSpeed: 80,
                randomIOPS: 500,
                latency: 10
            };
        }
    }
    /**
     * Measure network latency
     */
    async pingLatency() {
        // Simplified latency test - in production you'd use actual ping
        return new Promise((resolve) => {
            const start = Date.now();
            setTimeout(() => {
                resolve(Date.now() - start); // This is not a real network test
            }, Math.random() * 50 + 10); // Simulate 10-60ms latency
        });
    }
    /**
     * Extract CPU vendor from model string
     */
    extractCPUVendor(model) {
        const lowerModel = model.toLowerCase();
        if (lowerModel.includes('intel'))
            return 'Intel';
        if (lowerModel.includes('amd'))
            return 'AMD';
        if (lowerModel.includes('arm') || lowerModel.includes('apple'))
            return 'ARM';
        return 'Unknown';
    }
    /**
     * Calculate CPU performance score
     */
    calculateCPUScore(cores, frequency, benchmarkScore) {
        // Normalize to a 0-1000 scale
        const coreScore = Math.min(cores / 16, 1) * 300; // Up to 300 points for cores
        const frequencyScore = Math.min(frequency / 4000, 1) * 200; // Up to 200 points for frequency
        const benchmarkNormalized = Math.min(benchmarkScore / 1000, 1) * 500; // Up to 500 points for benchmark
        return Math.round(coreScore + frequencyScore + benchmarkNormalized);
    }
    /**
     * Calculate overall performance class
     */
    calculatePerformanceClass(cpu, memory, disk) {
        let score = 0;
        // CPU scoring
        if (cpu.performanceScore > 800)
            score += 3;
        else if (cpu.performanceScore > 600)
            score += 2;
        else if (cpu.performanceScore > 400)
            score += 1;
        // Memory scoring
        const memoryGB = memory.totalMemory / (1024 * 1024 * 1024);
        if (memoryGB >= 32)
            score += 3;
        else if (memoryGB >= 16)
            score += 2;
        else if (memoryGB >= 8)
            score += 1;
        // Disk scoring
        if (disk.type === 'NVME')
            score += 3;
        else if (disk.type === 'SSD')
            score += 2;
        else if (disk.readSpeed > 100)
            score += 1;
        // Classify based on total score
        if (score >= 8)
            return 'exceptional';
        if (score >= 6)
            return 'high';
        if (score >= 3)
            return 'medium';
        return 'low';
    }
    /**
     * Calculate recommended system limits based on capabilities
     */
    calculateRecommendedLimits(cpu, memory, disk, performanceClass) {
        const baseLimits = {
            low: {
                maxConcurrentQueries: 10,
                maxCacheSize: 64 * 1024 * 1024, // 64MB
                maxMemoryUsage: 0.6,
                queryTimeout: 30000,
                indexBuildParallelism: 1
            },
            medium: {
                maxConcurrentQueries: 25,
                maxCacheSize: 256 * 1024 * 1024, // 256MB
                maxMemoryUsage: 0.7,
                queryTimeout: 15000,
                indexBuildParallelism: 2
            },
            high: {
                maxConcurrentQueries: 50,
                maxCacheSize: 512 * 1024 * 1024, // 512MB
                maxMemoryUsage: 0.75,
                queryTimeout: 10000,
                indexBuildParallelism: 4
            },
            exceptional: {
                maxConcurrentQueries: 100,
                maxCacheSize: 1024 * 1024 * 1024, // 1GB
                maxMemoryUsage: 0.8,
                queryTimeout: 5000,
                indexBuildParallelism: 8
            }
        };
        const base = baseLimits[performanceClass];
        // Apply fine-tuning based on specific capabilities
        const adjustedLimits = { ...base };
        // Adjust based on CPU cores
        adjustedLimits.maxConcurrentQueries = Math.min(adjustedLimits.maxConcurrentQueries, cpu.cores * 2);
        adjustedLimits.indexBuildParallelism = Math.min(adjustedLimits.indexBuildParallelism, Math.max(1, cpu.cores - 1));
        // Adjust cache size based on available memory
        const maxReasonableCache = memory.recommendedCacheSize;
        adjustedLimits.maxCacheSize = Math.min(adjustedLimits.maxCacheSize, maxReasonableCache);
        // Adjust timeout based on disk performance
        if (disk.type === 'HDD' && disk.readSpeed < 100) {
            adjustedLimits.queryTimeout *= 2; // Double timeout for slow disks
        }
        return adjustedLimits;
    }
    /**
     * Load cached profile from disk
     */
    async loadCachedProfile() {
        try {
            const data = await fs.readFile(this.cacheFile, 'utf-8');
            const profile = JSON.parse(data);
            if (profile.profileVersion === '1.0.0') {
                return profile;
            }
        }
        catch (error) {
            // No cached profile or invalid format
        }
        return null;
    }
    /**
     * Save profile to disk cache
     */
    async saveCachedProfile(profile) {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.cacheFile);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.cacheFile, JSON.stringify(profile, null, 2));
        }
        catch (error) {
            console.warn('⚠️ Failed to cache system profile:', error);
        }
    }
    /**
     * Get current system profile
     */
    getProfile() {
        return this.profile;
    }
    /**
     * Get performance-adjusted configuration
     */
    getPerformanceConfig() {
        if (!this.profile) {
            throw new Error('System not yet profiled. Call profileSystem() first.');
        }
        const { recommendedLimits, overallPerformanceClass } = this.profile;
        return {
            // Database settings
            database: {
                maxConnections: Math.ceil(recommendedLimits.maxConcurrentQueries * 0.8),
                queryTimeout: recommendedLimits.queryTimeout,
                cacheSize: Math.floor(recommendedLimits.maxCacheSize / 1024), // Convert to KB for SQLite
                walBufferSize: overallPerformanceClass === 'high' || overallPerformanceClass === 'exceptional' ? 32 * 1024 * 1024 : 16 * 1024 * 1024,
                mmapSize: this.profile.memory.totalMemory > 8 * 1024 * 1024 * 1024 ? 256 * 1024 * 1024 : 128 * 1024 * 1024
            },
            // Memory management
            memory: {
                maxHeapUsage: recommendedLimits.maxMemoryUsage,
                gcThreshold: overallPerformanceClass === 'exceptional' ? 0.9 : 0.8,
                cacheSize: recommendedLimits.maxCacheSize,
                objectPoolSize: overallPerformanceClass === 'high' || overallPerformanceClass === 'exceptional' ? 1000 : 500
            },
            // Search engine settings
            search: {
                maxConcurrentSearches: Math.ceil(recommendedLimits.maxConcurrentQueries * 0.5),
                indexBuildParallelism: recommendedLimits.indexBuildParallelism,
                resultCacheSize: Math.floor(recommendedLimits.maxCacheSize * 0.2), // 20% of cache for search results
                embeddingCacheSize: Math.floor(recommendedLimits.maxCacheSize * 0.3) // 30% of cache for embeddings
            },
            // Performance monitoring
            monitoring: {
                metricsCollectionInterval: overallPerformanceClass === 'low' ? 60000 : 30000, // 1 min vs 30 sec
                alertEvaluationInterval: 30000,
                historicalDataRetention: overallPerformanceClass === 'exceptional' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 7 days vs 1 day
                detailedMetrics: overallPerformanceClass === 'high' || overallPerformanceClass === 'exceptional'
            },
            // System info
            capabilities: {
                performanceClass: overallPerformanceClass,
                cpu: {
                    cores: this.profile.cpu.cores,
                    score: this.profile.cpu.performanceScore
                },
                memory: {
                    total: this.profile.memory.totalMemory,
                    recommended: this.profile.memory.recommendedHeapSize
                },
                disk: {
                    type: this.profile.disk.type,
                    speed: this.profile.disk.readSpeed
                }
            }
        };
    }
    /**
     * Force re-profiling (ignores cache)
     */
    async forceReprofile() {
        this.isProfiled = false;
        this.profile = null;
        return this.profileSystem();
    }
    /**
     * Get benchmark results
     */
    getBenchmarkResults() {
        return new Map(this.benchmarkResults);
    }
}
//# sourceMappingURL=SystemCapabilityProfiler.js.map