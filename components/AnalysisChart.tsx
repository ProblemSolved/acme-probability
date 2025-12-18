import React, { useMemo } from 'react';
import { ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { AnalysisDataPoint, DistributionType } from '../types';

interface Props {
    dataPoint: AnalysisDataPoint;
    minimal?: boolean;
}

// Gamma approximation helper
function gamma(n: number): number {
    return Math.sqrt(2 * Math.PI / n) * Math.pow((n / Math.E), n);
}

export const AnalysisChart: React.FC<Props> = ({ dataPoint, minimal = false }) => {
    
    const chartData = useMemo(() => {
        const { filteredHistory, distribution, selectedDistribution, bestFitType, chartBinCount } = dataPoint;
        const { mean, stdDev, min, max, mode } = distribution;
        
        if (filteredHistory.length === 0) return [];

        const activeDistribution = selectedDistribution === 'Auto' ? bestFitType : selectedDistribution;

        // 1. Create Histogram Bins
        // Tripled the resolution as requested: min 15, max 60
        const binCount = chartBinCount || Math.min(60, Math.max(15, Math.floor(Math.sqrt(filteredHistory.length) * 3)));
        const totalRange = max - min;
        const range = totalRange === 0 ? 1 : totalRange;
        const binWidth = range / binCount;
        
        const bins: { x: number, count: number, pdf: number }[] = [];
        for (let i = 0; i < binCount; i++) {
            const binStart = min + (i * binWidth);
            const binCenter = binStart + (binWidth / 2);
            bins.push({ x: Number(binCenter.toFixed(2)), count: 0, pdf: 0 });
        }

        filteredHistory.forEach(val => {
            let binIdx = Math.floor((val - min) / binWidth);
            if (binIdx >= binCount) binIdx = binCount - 1;
            if (binIdx < 0) binIdx = 0;
            bins[binIdx].count++;
        });

        // 2. Generate PDF Curve scaled to histogram
        const scaleFactor = filteredHistory.length * binWidth;

        // PDF Functions
        const getNormalPdf = (x: number) => {
             if (stdDev <= 0) return 0;
             return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
        };

        const getLogNormalPdf = (x: number) => {
             if (x <= 0 || stdDev <= 0 || mean <= 0) return 0;
             const sigma2 = Math.log(1 + (stdDev*stdDev)/(mean*mean));
             const mu = Math.log(mean) - 0.5 * sigma2;
             const sigma = Math.sqrt(sigma2);
             return (1 / (x * sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(Math.log(x) - mu, 2) / (2 * sigma2));
        };

        const getTriangularPdf = (x: number) => {
            if (x < min || x > max) return 0;
            if (x === mode) return 2 / (max - min);
            if (x < mode) return (2 * (x - min)) / ((max - min) * (mode - min));
            return (2 * (max - x)) / ((max - min) * (max - mode));
        };

        const getPertPdf = (x: number) => {
            if (x <= min || x >= max) return 0;
            const r = max - min;
            const alpha = 1 + 4 * (mode - min) / r;
            const betaValue = 1 + 4 * (max - mode) / r;
            const z = (x - min) / r;
            const bFunc = (gamma(alpha) * gamma(betaValue)) / gamma(alpha + betaValue);
            return (Math.pow(z, alpha - 1) * Math.pow(1 - z, betaValue - 1)) / (bFunc * r);
        };

        const getWeibullPdf = (x: number) => {
            if (x <= 0) return 0;
            const k = Math.pow(stdDev / mean, -1.086);
            const lambda = mean / gamma(1 + 1/k);
            return (k / lambda) * Math.pow(x / lambda, k - 1) * Math.exp(-Math.pow(x / lambda, k));
        };

        bins.forEach(bin => {
            const x = bin.x;
            let pdfVal = 0;
            
            if (activeDistribution === 'Normal') pdfVal = getNormalPdf(x);
            else if (activeDistribution === 'LogNormal') pdfVal = getLogNormalPdf(x);
            else if (activeDistribution === 'Triangular') pdfVal = getTriangularPdf(x);
            else if (activeDistribution === 'PERT') pdfVal = getPertPdf(x);
            else if (activeDistribution === 'Weibull') pdfVal = getWeibullPdf(x);

            bin.pdf = pdfVal * scaleFactor;
        });

        return bins;
    }, [dataPoint.filteredHistory, dataPoint.distribution, dataPoint.selectedDistribution, dataPoint.bestFitType, dataPoint.chartBinCount]);

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-[10px] font-black uppercase tracking-widest">
                No Data Distribution
            </div>
        );
    }

    const activeDistribution = dataPoint.selectedDistribution === 'Auto' ? dataPoint.bestFitType : dataPoint.selectedDistribution;
    const visualZoom = dataPoint.chartYScale || 1.1; 
    
    return (
        <div className={minimal ? "h-full w-full" : "h-full w-full flex flex-col"}>
            <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                        key={`${dataPoint.id}-${dataPoint.chartBinCount}-${visualZoom}`} 
                        data={chartData} 
                        margin={minimal ? {top:5, right:0, left:0, bottom:0} : { top: 20, right: 30, left: 10, bottom: 0 }}
                    >
                        {!minimal && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
                        {!minimal && (
                            <XAxis 
                                dataKey="x" 
                                type="number" 
                                domain={['dataMin', 'dataMax']}
                                tickCount={7}
                                tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}}
                                axisLine={{ stroke: '#f1f5f9' }}
                                tickLine={false}
                            />
                        )}
                        <YAxis 
                            hide={true} 
                            domain={[0, (dataMax: number) => dataMax / (visualZoom === 1.1 ? 1 : visualZoom)]} 
                        />
                        {!minimal && (
                            <Tooltip 
                                cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-slate-900/95 backdrop-blur-md text-white text-[10px] p-2.5 rounded-lg shadow-2xl z-50 border border-slate-700">
                                                <p className="font-bold mb-1.5 border-b border-slate-700 pb-1 flex justify-between">
                                                    <span>Value:</span>
                                                    <span className="font-mono">{data.x}</span>
                                                </p>
                                                <div className="space-y-1">
                                                    <p className="flex justify-between space-x-4">
                                                        <span className="text-slate-400">Actual Count:</span>
                                                        <span className="font-mono font-bold text-blue-300">{data.count}</span>
                                                    </p>
                                                    <p className="flex justify-between space-x-4">
                                                        <span className="text-slate-400">{activeDistribution} Fit:</span>
                                                        <span className="font-mono font-bold text-emerald-300">{data.pdf.toFixed(3)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        )}
                        
                        <Bar 
                            dataKey="count" 
                            fill={dataPoint.ignored ? "#e2e8f0" : "#dbeafe"} 
                            radius={[1, 1, 0, 0]}
                            isAnimationActive={!minimal}
                        />

                        <Area 
                            type="monotone" 
                            dataKey="pdf" 
                            stroke={dataPoint.ignored ? "#94a3b8" : "#2563eb"} 
                            strokeWidth={2}
                            fill="none" // Removed the blue-ish gradient shadow
                            dot={false}
                            isAnimationActive={!minimal}
                        />
                        
                        {!minimal && (
                            <>
                                <ReferenceLine x={dataPoint.plannedP10} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'P10', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
                                <ReferenceLine x={dataPoint.plannedP50} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: 'P50', fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} />
                                <ReferenceLine x={dataPoint.plannedP90} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'P90', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                                <Label value={`${activeDistribution} Fit`} offset={25} position="insideBottom" fill="#2563eb" fontSize={10} fontWeight="black" className="opacity-60 uppercase tracking-widest" />
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            
            {!minimal && (
                <div className="flex items-center justify-center space-x-8 pb-2 pt-4 border-t border-slate-50 bg-slate-50/30 rounded-b-xl">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                        <span className="text-[10px] font-bold text-slate-500">P10: <span className="text-slate-900 font-mono ml-0.5">{dataPoint.plannedP10.toFixed(1)}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />
                        <span className="text-[10px] font-bold text-slate-500">P50: <span className="text-slate-900 font-mono ml-0.5">{dataPoint.plannedP50.toFixed(1)}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
                        <span className="text-[10px] font-bold text-slate-500">P90: <span className="text-slate-900 font-mono ml-0.5">{dataPoint.plannedP90.toFixed(1)}</span></span>
                    </div>
                </div>
            )}
        </div>
    );
};