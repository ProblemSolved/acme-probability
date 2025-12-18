import React, { useState, useMemo } from 'react';
import { AnalysisDataPoint, Asset, Metric, DistributionType } from '../types';
import { AnalysisChart } from './AnalysisChart';
import { Filter, AlertTriangle, AlertCircle, CheckCircle, Search, ArrowLeft, Sliders, EyeOff, XCircle, TrendingUp, Settings, X, Info, Maximize2, Activity, Target, Table as TableIcon, Check, Hash, RotateCcw } from 'lucide-react';
import { recalculateDistributionWithOutliers, calculateGoodnessOfFit } from '../services/dataService';

interface Props {
    data: AnalysisDataPoint[];
    onDataUpdate: (updatedPoint: AnalysisDataPoint) => void;
    onBulkUpdate: (newData: AnalysisDataPoint[]) => void;
    assets: Asset[];
    metrics: Metric[];
}

interface GlobalConfigState {
    distributionType: DistributionType;
    sigmaFilter: number;
    trimBottomPct: number;
    trimTopPct: number;
    absoluteMin?: number;
    absoluteMax?: number;
}

// Internal component for the raw data table
const RawDataTable: React.FC<{ point: AnalysisDataPoint }> = ({ point }) => {
    const { rawHistory, filterConfig, distribution } = point;

    // Logic to determine exclusion reason for each point to match the service logic sequence
    const dataWithStatus = useMemo(() => {
        const results = rawHistory.map((val, idx) => {
            // Generate mock date/time
            const date = new Date();
            date.setDate(date.getDate() - idx);
            const time = idx % 2 === 0 ? "18:00" : "06:00";
            const dateStr = `${date.toISOString().split('T')[0]} ${time}`;

            return {
                id: idx,
                value: val,
                date: dateStr,
                isExcluded: false,
                reason: '' as 'Limit' | 'Sigma' | 'Tail' | ''
            };
        });

        // 1. Check Absolute Limits
        results.forEach(item => {
            if (filterConfig.absoluteMin !== undefined && !isNaN(filterConfig.absoluteMin) && item.value < filterConfig.absoluteMin) {
                item.isExcluded = true;
                item.reason = 'Limit';
            }
            if (filterConfig.absoluteMax !== undefined && !isNaN(filterConfig.absoluteMax) && item.value > filterConfig.absoluteMax) {
                item.isExcluded = true;
                item.reason = 'Limit';
            }
        });

        // 2. Check Sigma (among those not excluded by limits)
        if (filterConfig.sigmaFilter > 0) {
            const validForSigma = results.filter(r => r.reason !== 'Limit');
            if (validForSigma.length > 2) {
                const lowerBound = distribution.mean - (filterConfig.sigmaFilter * distribution.stdDev);
                const upperBound = distribution.mean + (filterConfig.sigmaFilter * distribution.stdDev);
                results.forEach(item => {
                    if (!item.isExcluded) {
                        if (item.value < lowerBound || item.value > upperBound) {
                            item.isExcluded = true;
                            item.reason = 'Sigma';
                        }
                    }
                });
            }
        }

        // 3. Tail Trimming
        const currentValidItems = results
            .filter(r => !r.isExcluded)
            .sort((a, b) => a.value - b.value);

        if (currentValidItems.length > 0) {
            const removeBottomCount = Math.floor(currentValidItems.length * (filterConfig.trimBottomPct / 100));
            const removeTopCount = Math.floor(currentValidItems.length * (filterConfig.trimTopPct / 100));
            
            // Mark items in the bottom tail
            for (let i = 0; i < removeBottomCount; i++) {
                const itemToMark = results.find(r => r.id === currentValidItems[i].id);
                if (itemToMark) {
                    itemToMark.isExcluded = true;
                    itemToMark.reason = 'Tail';
                }
            }
            
            // Mark items in the top tail
            for (let i = 0; i < removeTopCount; i++) {
                const itemToMark = results.find(r => r.id === currentValidItems[currentValidItems.length - 1 - i].id);
                if (itemToMark) {
                    itemToMark.isExcluded = true;
                    itemToMark.reason = 'Tail';
                }
            }
        }

        return results;
    }, [rawHistory, filterConfig, distribution]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                    <TableIcon className="w-4 h-4 text-slate-500" />
                    <h4 className="text-[11px] font-semibold text-slate-700 uppercase tracking-widest">Historical Observation Data</h4>
                </div>
                <div className="flex space-x-4">
                    <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Included</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Excluded</span>
                    </div>
                </div>
            </div>
            <div className="overflow-y-auto flex-grow custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 shadow-sm z-10 border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-20">ID</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-40">Date</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Value</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Exclusion Note</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {dataWithStatus.map((item, i) => (
                            <tr key={i} className={`group transition-colors ${item.isExcluded ? 'bg-slate-50/40 opacity-70' : 'hover:bg-blue-50/30'}`}>
                                <td className="px-5 py-2 text-xs font-mono text-slate-400">#{String(i + 1).padStart(3, '0')}</td>
                                <td className="px-5 py-2 text-xs font-mono text-slate-600">{item.date}</td>
                                <td className={`px-5 py-2 text-sm font-semibold ${item.isExcluded ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'}`}>
                                    {item.value.toFixed(2)}
                                </td>
                                <td className="px-5 py-2">
                                    {item.isExcluded ? (
                                        <span className="inline-flex items-center text-[9px] font-semibold text-slate-400 tracking-wider">
                                            <X className="w-3 h-3 mr-1" /> EXCLUDED
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 tracking-wider">
                                            <Check className="w-3 h-3 mr-1" /> VALID
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-2 text-[10px] font-semibold uppercase tracking-tight">
                                    {item.reason && (
                                        <span className={`px-2 py-0.5 rounded-md border shadow-sm ${
                                            item.reason === 'Limit' ? 'bg-red-50 text-red-700 border-red-100' :
                                            item.reason === 'Sigma' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {item.reason === 'Tail' ? 'Trimmed (Tail)' : `Outlier (${item.reason})`}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                <div className="flex space-x-6">
                    <span>Total Observations: <span className="text-slate-900 ml-1">{rawHistory.length}</span></span>
                    <span>Clean Samples: <span className="text-emerald-600 ml-1">{point.filteredHistory.length}</span></span>
                </div>
                <div className="text-slate-300">
                    Acme Precision Analysis v4.2
                </div>
            </div>
        </div>
    );
};

export const AnalysisStep: React.FC<Props> = ({ data, onDataUpdate, onBulkUpdate, assets, metrics }) => {
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);

    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATTENTION'>('ALL');
    const [assetFilter, setAssetFilter] = useState<string>('ALL');
    const [metricFilter, setMetricFilter] = useState<string>('ALL');

    const [globalConfig, setGlobalConfig] = useState<GlobalConfigState>({
        distributionType: 'Auto',
        sigmaFilter: 0,
        trimBottomPct: 0,
        trimTopPct: 0
    });

    const getAssetName = (id: string) => assets.find(a => a.id === id)?.name || id;
    const getMetricName = (id: string) => metrics.find(m => m.id === id)?.name || id;

    const filteredData = useMemo(() => {
        return data.filter(d => {
            const matchesStatus = statusFilter === 'ALL' || (d.status === 'Warning' || d.status === 'Error');
            const matchesAsset = assetFilter === 'ALL' || d.assetId === assetFilter;
            const matchesMetric = metricFilter === 'ALL' || d.metricId === metricFilter;
            return matchesStatus && matchesAsset && matchesMetric;
        });
    }, [data, statusFilter, assetFilter, metricFilter]);

    const attentionCount = data.filter(d => d.status === 'Warning' || d.status === 'Error').length;

    const handleApplyGlobal = () => {
        const newData = data.map(point => {
            const updatedConfig = {
                ...point.filterConfig,
                sigmaFilter: globalConfig.sigmaFilter,
                trimBottomPct: globalConfig.trimBottomPct,
                trimTopPct: globalConfig.trimTopPct,
                absoluteMin: globalConfig.absoluteMin,
                absoluteMax: globalConfig.absoluteMax
            };
            
            let updatedPoint = { 
                ...point, 
                selectedDistribution: globalConfig.distributionType 
            };
            
            return recalculateDistributionWithOutliers(updatedPoint, updatedConfig);
        });
        
        onBulkUpdate(newData);
        setIsGlobalModalOpen(false);
    };

    const activePoint = data.find(d => d.id === selectedPointId);

    const updateFilter = (partialConfig: Partial<AnalysisDataPoint['filterConfig']>) => {
        if (!activePoint) return;
        const updated = recalculateDistributionWithOutliers(activePoint, partialConfig);
        onDataUpdate(updated);
    };

    const updateVisuals = (partial: Partial<{ chartBinCount: number, chartYScale: number }>) => {
        if (!activePoint) return;
        onDataUpdate({ ...activePoint, ...partial });
    };

    const handleDistributionChange = (type: DistributionType) => {
        if (!activePoint) return;
        onDataUpdate({ ...activePoint, selectedDistribution: type });
    };

    const handleParamChange = (key: 'plannedP10' | 'plannedP50' | 'plannedP90', val: string) => {
        if (!activePoint) return;
        const num = parseFloat(val);
        onDataUpdate({ ...activePoint, [key]: isNaN(num) ? 0 : num });
    };

    const handleIgnoreToggle = (point: AnalysisDataPoint) => {
        onDataUpdate({ ...point, ignored: !point.ignored });
    };

    if (selectedPointId && activePoint) {
        const currentFitType = activePoint.selectedDistribution === 'Auto' ? activePoint.bestFitType : activePoint.selectedDistribution;
        const fitScore = calculateGoodnessOfFit(activePoint.filteredHistory, activePoint.distribution, currentFitType);
        
        // Tripled default resolution: min 15, max 60
        const autoBinCount = Math.min(60, Math.max(15, Math.floor(Math.sqrt(activePoint.filteredHistory.length) * 3)));

        // Pre-calculate fit scores for all types for the visual selector
        const fitScores = [
            { type: 'Normal', score: calculateGoodnessOfFit(activePoint.filteredHistory, activePoint.distribution, 'Normal') },
            { type: 'LogNormal', score: calculateGoodnessOfFit(activePoint.filteredHistory, activePoint.distribution, 'LogNormal') },
            { type: 'Triangular', score: calculateGoodnessOfFit(activePoint.filteredHistory, activePoint.distribution, 'Triangular') },
            { type: 'PERT', score: calculateGoodnessOfFit(activePoint.filteredHistory, activePoint.distribution, 'PERT') },
            { type: 'Weibull', score: calculateGoodnessOfFit(activePoint.filteredHistory, activePoint.distribution, 'Weibull') },
        ].sort((a, b) => b.score - a.score);

        // Helper for subtle sliders
        const minVal = activePoint.distribution.min;
        const maxVal = activePoint.distribution.max;
        const sliderRange = maxVal - minVal || 100;
        const sMin = Math.max(0, minVal - sliderRange * 0.2);
        const sMax = maxVal + sliderRange * 0.2;

        return (
            <div className="h-full flex flex-col animate-fade-in space-y-4">
                {/* Header Section - Constant Height */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0">
                    <div className="flex items-center">
                        <button 
                            onClick={() => setSelectedPointId(null)}
                            className="mr-6 p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                            title="Back to Grid"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center space-x-3">
                                <h2 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">{getAssetName(activePoint.assetId)}</h2>
                                <span className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-sm ${activePoint.status === 'OK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (activePoint.status === 'Error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200')}`}>
                                    {activePoint.status}
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm font-medium">{getMetricName(activePoint.metricId)} • {activePoint.label}</p>
                        </div>
                    </div>

                    <div className="flex bg-white border border-slate-200 rounded-xl divide-x divide-slate-100 shadow-sm overflow-hidden">
                        {[
                            { label: 'Mean', value: activePoint.distribution.mean, color: 'text-slate-900' },
                            { label: 'Std Dev', value: activePoint.distribution.stdDev, color: 'text-slate-600' },
                            { label: 'Min', value: activePoint.distribution.min, color: 'text-slate-600' },
                            { label: 'Max', value: activePoint.distribution.max, color: 'text-slate-600' }
                        ].map((stat, i) => (
                            <div key={i} className="px-6 py-2.5 flex flex-col items-center bg-white hover:bg-slate-50 transition-colors">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</span>
                                <span className={`font-mono text-base font-semibold ${stat.color}`}>{stat.value.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area - Full Flex Growing */}
                <div className="flex flex-col lg:flex-row gap-6 flex-grow min-h-0">
                    {/* Left Column: Data Visuals & Table - Expanded */}
                    <div className="flex-[3] flex flex-col min-w-0 space-y-4 h-full">
                        {/* Chart Area - Proportional share of height */}
                        <div className={`flex-[3] min-h-[340px] bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative overflow-hidden ${activePoint.ignored ? 'opacity-75' : ''}`}>
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                <h3 className="text-sm font-semibold text-slate-800 flex items-center">
                                    <Activity className="w-4 h-4 mr-2 text-blue-600" />
                                    Frequency Distribution & Probabilistic Density
                                </h3>
                                <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tracking-tighter">n={activePoint.filteredHistory.length}</span>
                                </div>
                            </div>

                            <div className="flex-grow relative overflow-hidden rounded-xl border border-slate-50">
                                {activePoint.ignored && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                                        <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center shadow-xl text-sm font-semibold transform -rotate-1 border border-slate-700">
                                            <EyeOff className="w-4 h-4 mr-2.5 text-blue-400" /> Distribution Ignored
                                        </div>
                                    </div>
                                )}
                                <AnalysisChart dataPoint={activePoint} />
                            </div>
                        </div>

                        {/* Raw Data Table - Proportional share of height */}
                        <div className="flex-[4] min-h-[300px] overflow-hidden">
                            <RawDataTable point={activePoint} />
                        </div>

                        {activePoint.status !== 'OK' && (
                            <div className={`rounded-xl border p-4 flex items-center shadow-sm flex-shrink-0 ${activePoint.status === 'Error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                                {activePoint.status === 'Error' ? <XCircle className="w-5 h-5 mr-4 text-red-600 shadow-sm" /> : <AlertTriangle className="w-5 h-5 mr-4 text-amber-600 shadow-sm" />}
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider">{activePoint.status === 'Error' ? 'Critical Data Issue: ' : 'Attention Required: '}</span>
                                    <span className="text-sm font-medium ml-1">{activePoint.statusMessage}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Controls Sidebar - Independent Scroll */}
                    <div className="w-full lg:w-96 flex-shrink-0 flex flex-col space-y-4 h-full overflow-y-auto custom-scrollbar pr-1 pb-4">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                            <label className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-white transition-all group shadow-sm">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Ignore in Export</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Exclude this point from final CSV</p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={activePoint.ignored} 
                                    onChange={() => handleIgnoreToggle(activePoint)}
                                    className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 border-slate-300 shadow-sm" 
                                />
                            </label>

                            <div className="space-y-3 pt-2">
                                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Distribution Fitment</h4>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleDistributionChange('Auto')}
                                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                                            activePoint.selectedDistribution === 'Auto'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-100'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold uppercase tracking-tight">Auto-detect</span>
                                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${
                                                activePoint.selectedDistribution === 'Auto' ? 'bg-blue-500 text-white border-blue-400' : 'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}>
                                                BEST FIT: {activePoint.bestFitType}
                                            </span>
                                        </div>
                                    </button>

                                    <div className="grid grid-cols-1 gap-2 mt-4">
                                        {fitScores.map(({ type, score }) => (
                                            <button
                                                key={type}
                                                onClick={() => handleDistributionChange(type as DistributionType)}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${
                                                    activePoint.selectedDistribution === type
                                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-blue-400'
                                                }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-semibold uppercase tracking-tight">{type}</span>
                                                    <div className="flex items-center mt-1">
                                                        <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${score > 0.85 ? 'bg-emerald-500' : (score > 0.6 ? 'bg-amber-500' : 'bg-red-500')}`}
                                                                style={{ width: `${score * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="ml-2 text-[9px] font-semibold text-slate-400">{(score * 100).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                                {activePoint.selectedDistribution === type && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center">
                                    <Maximize2 className="w-4 h-4 mr-2 text-blue-600" />
                                    Chart Appearance
                                </h3>
                                {(activePoint.chartBinCount || activePoint.chartYScale) && (
                                    <button 
                                        onClick={() => updateVisuals({ chartBinCount: undefined, chartYScale: undefined })}
                                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center uppercase tracking-widest"
                                    >
                                        <RotateCcw className="w-3 h-3 mr-1" /> Reset
                                    </button>
                                )}
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2.5">
                                    <div className="flex justify-between text-[11px] font-semibold">
                                        <span className={`uppercase tracking-wider ${activePoint.chartBinCount ? 'text-blue-700 font-semibold' : 'text-slate-500'}`}>
                                            Bin Resolution {activePoint.chartBinCount ? '(Fixed)' : ''}
                                        </span>
                                        <span className="text-blue-700 font-semibold">
                                            {activePoint.chartBinCount || autoBinCount}
                                        </span>
                                    </div>
                                    <input 
                                        type="range" min="5" max="100" step="1"
                                        value={activePoint.chartBinCount || autoBinCount} 
                                        onChange={(e) => updateVisuals({ chartBinCount: Number(e.target.value) })}
                                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all" 
                                    />
                                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold uppercase tracking-tighter">
                                        <span>Coarse</span>
                                        <span>High Density</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-2.5">
                                    <div className="flex justify-between text-[11px] font-semibold">
                                        <span className={`uppercase tracking-wider ${activePoint.chartYScale ? 'text-blue-700 font-semibold' : 'text-slate-500'}`}>
                                            Vertical Zoom
                                        </span>
                                        <span className="text-blue-700 font-semibold">
                                            {(activePoint.chartYScale || 1.1).toFixed(1)}x
                                        </span>
                                    </div>
                                    <input 
                                        type="range" min="0.5" max="4.0" step="0.1"
                                        value={activePoint.chartYScale || 1.1} 
                                        onChange={(e) => updateVisuals({ chartYScale: Number(e.target.value) })}
                                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 flex items-center">
                                <Sliders className="w-4 h-4 mr-2 text-blue-600" />
                                Outlier Management
                            </h3>
                            
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Standard Deviation Cut-off</p>
                                    <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/50">
                                        {[0, 2, 3].map(sigma => (
                                            <button
                                                key={sigma}
                                                onClick={() => updateFilter({ sigmaFilter: sigma })}
                                                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all
                                                    ${activePoint.filterConfig.sigmaFilter === sigma 
                                                        ? 'bg-white text-blue-700 shadow-md border border-slate-100' 
                                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
                                            >
                                                {sigma === 0 ? 'Off' : `${sigma} Sigma`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Fixed Tail Trimming</p>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-semibold">
                                                <span className="text-slate-500 uppercase tracking-wider">Bottom Tail %</span>
                                                <span className="text-blue-700 font-semibold">{activePoint.filterConfig.trimBottomPct}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="25" step="1"
                                                value={activePoint.filterConfig.trimBottomPct} 
                                                onChange={(e) => updateFilter({ trimBottomPct: Number(e.target.value) })}
                                                className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-semibold">
                                                <span className="text-slate-500 uppercase tracking-wider">Top Tail %</span>
                                                <span className="text-blue-700 font-semibold">{activePoint.filterConfig.trimTopPct}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="25" step="1"
                                                value={activePoint.filterConfig.trimTopPct} 
                                                onChange={(e) => updateFilter({ trimTopPct: Number(e.target.value) })}
                                                className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Hard Bound Limits</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-[9px] font-semibold text-slate-300 tracking-tighter">MIN</span>
                                            <input 
                                                type="number" 
                                                className="w-full pl-10 pr-3 py-2 text-sm font-semibold bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm outline-none"
                                                value={activePoint.filterConfig.absoluteMin ?? ''}
                                                onChange={e => updateFilter({ absoluteMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                                            />
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-[9px] font-semibold text-slate-300 tracking-tighter">MAX</span>
                                            <input 
                                                type="number" 
                                                className="w-full pl-10 pr-3 py-2 text-sm font-semibold bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm outline-none"
                                                value={activePoint.filterConfig.absoluteMax ?? ''}
                                                onChange={e => updateFilter({ absoluteMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6 flex-shrink-0 mb-4">
                            <h3 className="text-sm font-semibold text-slate-900 flex items-center">
                                <Target className="w-4 h-4 mr-2 text-blue-600" />
                                Export Parameters
                            </h3>
                            <div className="space-y-8">
                                <div className="space-y-3 group">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest transition-colors group-hover:text-emerald-500">P10 Target (Optimistic)</label>
                                        <input 
                                            type="number" step="0.1" 
                                            className="w-20 text-right text-xs font-mono font-semibold text-emerald-700 bg-emerald-50/50 rounded-md px-2 py-0.5 border border-emerald-100 focus:ring-1 focus:ring-emerald-300 outline-none"
                                            value={activePoint.plannedP10} 
                                            onChange={e => handleParamChange('plannedP10', e.target.value)} 
                                        />
                                    </div>
                                    <input 
                                        type="range" min={sMin} max={sMax} step="0.1"
                                        className="w-full h-1 bg-emerald-100/50 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all hover:bg-emerald-200/50"
                                        value={activePoint.plannedP10} 
                                        onChange={e => handleParamChange('plannedP10', e.target.value)} 
                                    />
                                </div>

                                <div className="space-y-3 group">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest transition-colors group-hover:text-amber-500">P50 Target (Realistic)</label>
                                        <input 
                                            type="number" step="0.1" 
                                            className="w-20 text-right text-xs font-mono font-semibold text-amber-700 bg-amber-50/50 rounded-md px-2 py-0.5 border border-amber-100 focus:ring-1 focus:ring-amber-300 outline-none"
                                            value={activePoint.plannedP50} 
                                            onChange={e => handleParamChange('plannedP50', e.target.value)} 
                                        />
                                    </div>
                                    <input 
                                        type="range" min={sMin} max={sMax} step="0.1"
                                        className="w-full h-1 bg-amber-100/50 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-all hover:bg-amber-200/50"
                                        value={activePoint.plannedP50} 
                                        onChange={e => handleParamChange('plannedP50', e.target.value)} 
                                    />
                                </div>

                                <div className="space-y-3 group">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-[10px] font-semibold text-red-600 uppercase tracking-widest transition-colors group-hover:text-red-500">P90 Target (Pessimistic)</label>
                                        <input 
                                            type="number" step="0.1" 
                                            className="w-20 text-right text-xs font-mono font-semibold text-red-700 bg-red-50/50 rounded-md px-2 py-0.5 border border-red-100 focus:ring-1 focus:ring-red-300 outline-none"
                                            value={activePoint.plannedP90} 
                                            onChange={e => handleParamChange('plannedP90', e.target.value)} 
                                        />
                                    </div>
                                    <input 
                                        type="range" min={sMin} max={sMax} step="0.1"
                                        className="w-full h-1 bg-red-100/50 rounded-lg appearance-none cursor-pointer accent-red-500 transition-all hover:bg-red-200/50"
                                        value={activePoint.plannedP90} 
                                        onChange={e => handleParamChange('plannedP90', e.target.value)} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-6">
            <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 h-full flex flex-col">
                 <div className="p-5 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Filters</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Health Status</label>
                             <button
                                onClick={() => setStatusFilter('ALL')}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${statusFilter === 'ALL' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <span>All Items</span>
                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{data.length}</span>
                            </button>
                            <button
                                onClick={() => setStatusFilter('ATTENTION')}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${statusFilter === 'ATTENTION' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <span>Attention</span>
                                <span className="text-xs bg-amber-100 px-2 py-0.5 rounded-full">{attentionCount}</span>
                            </button>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block text-[10px]">Asset Filter</label>
                            <select 
                                className="w-full text-sm border-slate-300 rounded-md focus:ring-1 focus:ring-blue-600 focus:border-blue-600 p-2 bg-white"
                                value={assetFilter}
                                onChange={(e) => setAssetFilter(e.target.value)}
                            >
                                <option value="ALL">All Assets</option>
                                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block text-[10px]">Metric Filter</label>
                            <select 
                                className="w-full text-sm border-slate-300 rounded-md focus:ring-1 focus:ring-blue-600 focus:border-blue-600 p-2 bg-white"
                                value={metricFilter}
                                onChange={(e) => setMetricFilter(e.target.value)}
                            >
                                <option value="ALL">All Metrics</option>
                                {metrics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                    </div>
                 </div>

                 <div className="p-5 mt-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Bulk Actions</h3>
                    <button 
                        onClick={() => setIsGlobalModalOpen(true)}
                        className="w-full flex items-center justify-center px-4 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm group"
                    >
                        <Settings className="w-4 h-4 mr-2.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        Global Configuration
                    </button>
                 </div>
            </div>

            <div className="flex-grow p-8 overflow-y-auto bg-[#faf9f8]">
                {filteredData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <div className="bg-white p-4 rounded-full mb-3 shadow-sm border border-slate-200">
                            <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="font-medium text-sm">No data matches filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 pb-10">
                        {filteredData.map(point => {
                            const sampleCount = point.filteredHistory.length;
                            const isLowSample = sampleCount < 5;

                            return (
                                <div 
                                    key={point.id} 
                                    className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col group
                                        ${point.ignored ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-200'}
                                        ${!point.ignored && point.status === 'Warning' ? 'border-amber-300' : ''}
                                        ${!point.ignored && point.status === 'Error' ? 'border-red-300' : ''}
                                    `}
                                >
                                    <div className="p-5 flex-grow cursor-pointer" onClick={() => setSelectedPointId(point.id)}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="pr-4">
                                                <h4 className="font-semibold text-slate-900 text-sm truncate w-40 group-hover:text-blue-700 transition-colors">{getAssetName(point.assetId)}</h4>
                                                <p className="text-xs text-slate-500 truncate w-40 mt-0.5">{getMetricName(point.metricId)}</p>
                                            </div>
                                            <div className="flex items-center space-x-1 flex-shrink-0">
                                                {point.status === 'Error' && !point.ignored && <AlertCircle className="w-4 h-4 text-red-600" />}
                                                {point.status === 'Warning' && !point.ignored && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                                
                                                <span className="text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-medium ml-1">
                                                    {point.label}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="h-24 bg-slate-50/50 rounded border border-slate-100 overflow-hidden mb-3 pointer-events-none relative">
                                            <AnalysisChart dataPoint={point} minimal />
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-xs mt-1">
                                            <span className={`font-mono font-medium ${isLowSample ? 'text-red-600' : 'text-slate-400'}`}>n={sampleCount}</span>
                                            {point.statusMessage && !point.ignored && (
                                                <span className={`font-semibold ${point.status === 'Error' ? 'text-red-700' : 'text-amber-700'}`}>
                                                    {point.status === 'Error' ? 'Critical' : 'Attention'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-lg flex justify-between items-center">
                                         <label className="flex items-center cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={point.ignored} 
                                                onChange={() => handleIgnoreToggle(point)}
                                                className="w-3.5 h-3.5 rounded-sm text-blue-600 focus:ring-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-xs font-medium text-slate-600">Ignore</span>
                                         </label>
                                         <button 
                                            onClick={() => setSelectedPointId(point.id)}
                                            className="text-xs font-semibold text-blue-700 hover:underline"
                                         >
                                            Edit
                                         </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Global Settings Modal */}
            {isGlobalModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center">
                                <Settings className="w-5 h-5 mr-3 text-blue-600" />
                                Global Analysis Configuration
                            </h2>
                            <button onClick={() => setIsGlobalModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start">
                                <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-800 leading-relaxed">
                                    Changes applied here will overwrite distribution types and cleaning rules for <strong>all {data.length} items</strong>. Specific asset/metric targets will not be affected.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-900 flex items-center">
                                        <TrendingUp className="w-4 h-4 mr-2 text-slate-400" />
                                        Distribution Type
                                    </h4>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <select 
                                            className="w-full text-sm border-slate-300 rounded-md focus:ring-1 focus:ring-blue-600 focus:border-blue-600 p-2.5 bg-white"
                                            value={globalConfig.distributionType}
                                            onChange={(e) => setGlobalConfig({ ...globalConfig, distributionType: e.target.value as DistributionType })}
                                        >
                                            <option value="Auto">Auto-detect Best Fit</option>
                                            <option value="Normal">Normal (Gaussian)</option>
                                            <option value="LogNormal">Log-Normal</option>
                                            <option value="Triangular">Triangular (Min/Mode/Max)</option>
                                            <option value="PERT">PERT</option>
                                            <option value="Weibull">Weibull</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-900 flex items-center">
                                        <Sliders className="w-4 h-4 mr-2 text-blue-600" />
                                        Statistical Filter
                                    </h4>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <div className="flex gap-2">
                                            {[0, 2, 3].map(sigma => (
                                                <button
                                                    key={sigma}
                                                    onClick={() => setGlobalConfig({ ...globalConfig, sigmaFilter: sigma })}
                                                    className={`flex-1 py-2 text-sm font-semibold rounded-md border transition-all
                                                        ${globalConfig.sigmaFilter === sigma 
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                                >
                                                    {sigma === 0 ? 'None' : `${sigma}σ`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-900">Tail Trimming</h4>
                                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-slate-600 font-semibold">Trim Bottom Tail</span>
                                                <span className="font-semibold text-blue-700">{globalConfig.trimBottomPct}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="25" step="1"
                                                value={globalConfig.trimBottomPct} 
                                                onChange={(e) => setGlobalConfig({ ...globalConfig, trimBottomPct: Number(e.target.value) })}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-slate-600 font-semibold">Trim Top Tail</span>
                                                <span className="font-semibold text-blue-700">{globalConfig.trimTopPct}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="25" step="1"
                                                value={globalConfig.trimTopPct} 
                                                onChange={(e) => setGlobalConfig({ ...globalConfig, trimTopPct: Number(e.target.value) })}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="md:col-span-2 space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-900">Global Absolute Limits (Caution)</h4>
                                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-600 font-semibold mb-1 block">Min Value</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="None"
                                                    className="w-full text-sm border-slate-300 rounded-md focus:ring-1 focus:ring-blue-600 focus:border-blue-600 p-2.5 bg-white"
                                                    value={globalConfig.absoluteMin ?? ''}
                                                    onChange={e => setGlobalConfig({ ...globalConfig, absoluteMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-600 font-semibold mb-1 block">Max Value</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="None"
                                                    className="w-full text-sm border-slate-300 rounded-md focus:ring-1 focus:ring-blue-600 focus:border-blue-600 p-2.5 bg-white"
                                                    value={globalConfig.absoluteMax ?? ''}
                                                    onChange={e => setGlobalConfig({ ...globalConfig, absoluteMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
                            <button 
                                onClick={() => setIsGlobalModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleApplyGlobal}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition-all font-semibold text-sm active:scale-95"
                            >
                                Apply to All Items
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};