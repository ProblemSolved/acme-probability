import { AnalysisDataPoint, Asset, Metric, PlannedConfig, DistributionParams, AnalysisStatus, DistributionType } from '../types';

// Helper to generate normal distribution randoms
function randn_bm() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); 
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function calculateMode(data: number[], min: number, max: number): number {
    if (data.length === 0) return 0;
    if (data.length < 5) return data.reduce((a,b) => a+b)/data.length; // Use mean for tiny samples

    const binCount = Math.max(5, Math.floor(Math.sqrt(data.length)));
    const range = max - min;
    const binWidth = range / binCount || 1;
    
    const bins = new Array(binCount).fill(0);
    data.forEach(v => {
        let idx = Math.floor((v - min) / binWidth);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        bins[idx]++;
    });
    
    const maxBinIdx = bins.indexOf(Math.max(...bins));
    const mode = min + (maxBinIdx * binWidth) + (binWidth / 2);
    return mode;
}

function calculateDistribution(data: number[]): DistributionParams {
    if (data.length === 0) return { min: 0, mode: 0, max: 0, mean: 0, stdDev: 0 };
    
    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / data.length;
    
    const squareDiffs = data.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    const mode = calculateMode(sorted, min, max);

    return { min, max, mean, stdDev, mode };
}

// Factorial helper for Gamma approximation
function gamma(n: number): number {
    // Stirling's approximation
    return Math.sqrt(2 * Math.PI / n) * Math.pow((n / Math.E), n);
}

// Probability Density Functions
const PDF = {
    Normal: (x: number, mean: number, stdDev: number) => {
        if (stdDev <= 0) return 0;
        return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    },
    LogNormal: (x: number, mean: number, stdDev: number) => {
        if (x <= 0 || stdDev <= 0 || mean <= 0) return 0;
        const sigma2 = Math.log(1 + (stdDev*stdDev)/(mean*mean));
        const mu = Math.log(mean) - 0.5 * sigma2;
        const sigma = Math.sqrt(sigma2);
        return (1 / (x * sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(Math.log(x) - mu, 2) / (2 * sigma2));
    },
    Triangular: (x: number, min: number, max: number, mode: number) => {
        if (x < min || x > max) return 0;
        if (x === mode) return 2 / (max - min); 
        if (x < mode) return (2 * (x - min)) / ((max - min) * (mode - min));
        return (2 * (max - x)) / ((max - min) * (max - mode));
    },
    PERT: (x: number, min: number, max: number, mode: number) => {
        if (x <= min || x >= max) return 0;
        const range = max - min;
        const alpha = 1 + 4 * (mode - min) / range;
        const beta = 1 + 4 * (max - mode) / range;
        
        // Scaled Beta PDF: f(x) = BetaPDF((x-min)/range, alpha, beta) / range
        const z = (x - min) / range;
        // Simplified Beta PDF approximation (ignoring normalizer for relative fit or using basic version)
        // For actual PDF we need Beta function B(alpha, beta)
        const betaFunc = (gamma(alpha) * gamma(beta)) / gamma(alpha + beta);
        return (Math.pow(z, alpha - 1) * Math.pow(1 - z, beta - 1)) / (betaFunc * range);
    },
    Weibull: (x: number, mean: number, stdDev: number) => {
        if (x <= 0) return 0;
        // Simple Estimation of k (shape) and lambda (scale) from mean/stdDev
        // (Approximation: k ~= (stdDev/mean)^-1.086)
        const k = Math.pow(stdDev / mean, -1.086);
        const lambda = mean / gamma(1 + 1/k);
        return (k / lambda) * Math.pow(x / lambda, k - 1) * Math.exp(-Math.pow(x / lambda, k));
    }
};

export function calculateGoodnessOfFit(data: number[], params: DistributionParams, type: DistributionType): number {
    if (data.length < 5) return 0;

    const binCount = Math.min(20, Math.max(5, Math.floor(Math.sqrt(data.length))));
    const range = params.max - params.min;
    if (range <= 0) return 0;
    
    const binWidth = range / binCount;
    const histogram = new Array(binCount).fill(0);
    
    data.forEach(v => {
        let idx = Math.floor((v - params.min) / binWidth);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        histogram[idx]++;
    });

    const histPdf = histogram.map(count => count / (data.length * binWidth));
    const meanHeight = histPdf.reduce((a, b) => a + b, 0) / binCount;

    let ssRes = 0; 
    let ssTot = 0; 

    for (let i = 0; i < binCount; i++) {
        const x = params.min + (i + 0.5) * binWidth;
        let y = 0;
        
        if (type === 'Normal') y = PDF.Normal(x, params.mean, params.stdDev);
        else if (type === 'LogNormal') y = PDF.LogNormal(x, params.mean, params.stdDev);
        else if (type === 'Triangular') y = PDF.Triangular(x, params.min, params.max, params.mode);
        else if (type === 'PERT') y = PDF.PERT(x, params.min, params.max, params.mode);
        else if (type === 'Weibull') y = PDF.Weibull(x, params.mean, params.stdDev);
        
        ssRes += Math.pow(histPdf[i] - y, 2);
        ssTot += Math.pow(histPdf[i] - meanHeight, 2);
    }

    if (ssTot === 0) return 0;
    const r2 = 1 - (ssRes / ssTot);
    return Math.max(0, Math.min(1, r2));
}

function determineBestFit(data: number[], params: DistributionParams): DistributionType {
    if (data.length < 5) return 'Normal';

    const types: DistributionType[] = ['Normal', 'LogNormal', 'Triangular', 'PERT', 'Weibull'];
    let bestScore = -Infinity;
    let bestType: DistributionType = 'Normal';

    types.forEach(type => {
        const score = calculateGoodnessOfFit(data, params, type);
        if (score > bestScore) {
            bestScore = score;
            bestType = type;
        }
    });

    return bestType;
}

function evaluateStatus(dist: DistributionParams, p50: number, dataCount: number): { status: AnalysisStatus, msg?: string } {
    if (dataCount < 5) {
        return { status: 'Error', msg: 'Insufficient Data (< 5 samples)' };
    }
    
    const deviation = Math.abs(dist.mean - p50);
    const deviationThreshold = dist.stdDev * 1.5; 

    if (deviation > deviationThreshold) {
        return { status: 'Warning', msg: 'Plan Deviation (> 1.5σ)' };
    }

    if (dist.mean !== 0 && dist.stdDev > Math.abs(dist.mean) * 0.4) {
         return { status: 'Warning', msg: 'High Variance / Outliers (> 40%)' };
    }

    return { status: 'OK' };
}

export const generateAnalysisData = (
    selectedAssets: string[],
    selectedMetrics: string[],
    assets: Asset[],
    metrics: Metric[],
    plannedConfig: PlannedConfig
): AnalysisDataPoint[] => {
    const data: AnalysisDataPoint[] = [];
    const metricMap = new Map(metrics.map(m => [m.id, m]));
    const monthsToGenerate = plannedConfig.months || 12;
    const startDate = new Date(plannedConfig.startDate);

    selectedAssets.forEach(assetId => {
        selectedMetrics.forEach(metricId => {
            for (let i = 0; i < monthsToGenerate; i++) {
                const currentDate = new Date(startDate);
                currentDate.setMonth(startDate.getMonth() + i);
                const label = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                const id = `${assetId}-${metricId}-${i}`;

                const mockHistory: number[] = [];
                const metricName = metricMap.get(metricId)?.name || '';
                
                const isEmptyScenario = Math.random() < 0.05; 
                const isHighVariance = Math.random() < 0.1;

                let baseMean = 100; 
                let baseStd = 15;

                const isLogNormal = Math.random() < 0.3;

                if (metricName.includes('Delay') || metricName.includes('Break')) {
                    baseMean = 30; 
                    baseStd = 10;
                } else if (metricName.includes('Availability')) {
                    baseMean = 85; 
                    baseStd = 5;
                }

                if (isHighVariance) baseStd *= 3;

                const count = isEmptyScenario ? 0 : 50;

                for(let j=0; j<count; j++) {
                    let val = 0;
                    if (isLogNormal) {
                         val = Math.exp(Math.log(baseMean) + (randn_bm() * 0.2)); 
                    } else {
                         val = (randn_bm() * baseStd) + baseMean;
                    }
                    if (Math.random() < 0.05) val = val * (Math.random() > 0.5 ? 2.5 : 0.1); 
                    if(val < 0) val = 0;
                    mockHistory.push(Number(val.toFixed(2)));
                }

                const dist = calculateDistribution(mockHistory);
                const bestFit = determineBestFit(mockHistory, dist);
                
                const deviationFactor = (Math.random() * 0.4) - 0.2; 
                const plannedP50 = count > 0 ? dist.mean * (1 + deviationFactor) : baseMean;
                const plannedStd = count > 0 ? dist.stdDev : baseStd;

                const statusObj = evaluateStatus(dist, plannedP50, count);

                data.push({
                    id,
                    assetId,
                    metricId,
                    monthIndex: i,
                    label,
                    rawHistory: mockHistory,
                    filteredHistory: mockHistory,
                    filterConfig: {
                        trimBottomPct: 0,
                        trimTopPct: 0,
                        sigmaFilter: 0,
                        absoluteMin: undefined,
                        absoluteMax: undefined
                    },
                    distribution: dist,
                    selectedDistribution: 'Auto',
                    bestFitType: bestFit,
                    plannedP10: Number((plannedP50 - plannedStd).toFixed(2)),
                    plannedP50: Number(plannedP50.toFixed(2)),
                    plannedP90: Number((plannedP50 + plannedStd).toFixed(2)),
                    ignored: false,
                    status: statusObj.status,
                    statusMessage: statusObj.msg
                });
            }
        });
    });

    return data;
};

export const recalculateDistributionWithOutliers = (
    point: AnalysisDataPoint, 
    newConfig: Partial<AnalysisDataPoint['filterConfig']>
): AnalysisDataPoint => {
    
    const config = { ...point.filterConfig, ...newConfig };
    
    let processed = [...point.rawHistory];

    if (config.absoluteMin !== undefined && !isNaN(config.absoluteMin)) {
        processed = processed.filter(v => v >= config.absoluteMin!);
    }
    if (config.absoluteMax !== undefined && !isNaN(config.absoluteMax)) {
        processed = processed.filter(v => v <= config.absoluteMax!);
    }

    if (config.sigmaFilter > 0 && processed.length > 2) {
        const tempDist = calculateDistribution(processed);
        const lowerBound = tempDist.mean - (config.sigmaFilter * tempDist.stdDev);
        const upperBound = tempDist.mean + (config.sigmaFilter * tempDist.stdDev);
        processed = processed.filter(v => v >= lowerBound && v <= upperBound);
    }

    processed.sort((a, b) => a - b);
    if (processed.length > 0) {
        const removeBottom = Math.floor(processed.length * (config.trimBottomPct / 100));
        const removeTop = Math.floor(processed.length * (config.trimTopPct / 100));
        
        if (removeBottom + removeTop < processed.length) {
            processed = processed.slice(removeBottom, processed.length - removeTop);
        }
    }

    const newDist = calculateDistribution(processed);
    const bestFit = determineBestFit(processed, newDist);
    
    const statusObj = evaluateStatus(newDist, point.plannedP50, processed.length);

    return {
        ...point,
        filteredHistory: processed,
        filterConfig: config,
        distribution: newDist,
        bestFitType: bestFit,
        status: statusObj.status,
        statusMessage: statusObj.msg
    };
};