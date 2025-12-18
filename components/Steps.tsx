import React from 'react';
import { Asset, Metric, ActualsConfig, PlannedConfig, Aggregation, PeriodFrequency, AssetType, MetricType } from '../types';
import { MOCK_ASSETS, MOCK_METRICS } from '../constants';
import { Database, Activity, Calendar, TrendingUp, Info, Check, HardDrive, Cpu, Layers, Briefcase, CalendarDays, Clock } from 'lucide-react';
import { CustomDatePicker } from './ui/CustomDatePicker';

// --- Reusable Widget Card ---
const ConfigCard = ({ title, icon: Icon, children, className = '' }: any) => (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full ${className}`}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center uppercase tracking-widest">
                <Icon className="w-4 h-4 mr-2.5 text-blue-600" />
                {title}
            </h3>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
            {children}
        </div>
    </div>
);

// --- Reusable List Selector ---
interface SelectableListProps<T> {
    label: string;
    options: { value: T; label: string; description: string; icon: any }[];
    value: T;
    onChange: (value: T) => void;
}

const SelectableList = <T extends string>({ label, options, value, onChange }: SelectableListProps<T>) => (
    <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</label>
        <div className="space-y-2">
            {options.map((option) => {
                const isSelected = value === option.value;
                const Icon = option.icon;
                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`w-full flex items-center p-3 rounded-xl border transition-all text-left group
                            ${isSelected 
                                ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' 
                                : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 transition-colors
                            ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className={`text-sm font-bold tracking-tight ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                {option.label}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                                {option.description}
                            </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                            ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white group-hover:border-blue-200'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white stroke-[4]" />}
                        </div>
                    </button>
                );
            })}
        </div>
    </div>
);

// --- Merged Step 1: Selection (Assets & Metrics) ---
interface SelectionStepProps {
    selectedAssets: string[];
    onAssetsChange: (ids: string[]) => void;
    selectedMetrics: string[];
    onMetricsChange: (ids: string[]) => void;
}

export const SelectionStep: React.FC<SelectionStepProps> = ({ 
    selectedAssets, onAssetsChange, 
    selectedMetrics, onMetricsChange 
}) => {
    const toggleAsset = (id: string) => {
        if (selectedAssets.includes(id)) onAssetsChange(selectedAssets.filter(x => x !== id));
        else onAssetsChange([...selectedAssets, id]);
    };

    const toggleMetric = (id: string) => {
        if (selectedMetrics.includes(id)) onMetricsChange(selectedMetrics.filter(x => x !== id));
        else onMetricsChange([...selectedMetrics, id]);
    };

    const groupedAssets = MOCK_ASSETS.reduce((acc, curr) => {
        acc[curr.type] = acc[curr.type] || [];
        acc[curr.type].push(curr);
        return acc;
    }, {} as Record<AssetType, Asset[]>);

    const groupedMetrics = MOCK_METRICS.reduce((acc, curr) => {
        acc[curr.type] = acc[curr.type] || [];
        acc[curr.type].push(curr);
        return acc;
    }, {} as Record<MetricType, Metric[]>);

    return (
        <div className="max-w-[1400px] mx-auto animate-fade-in space-y-6">
            <div className="text-center mb-8">
                 <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Define Analysis Scope</h2>
                 <p className="text-slate-500 text-lg mt-2">Identify the assets and key performance metrics you wish to evaluate.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <ConfigCard title="Physical Assets" icon={Database}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {Object.entries(groupedAssets).map(([type, assets]) => (
                            <div key={type} className="space-y-4">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center">
                                    {type === 'Truck' ? <Cpu className="w-3 h-3 mr-1.5" /> : <HardDrive className="w-3 h-3 mr-1.5" />}
                                    {type}s
                                </h4>
                                <div className="space-y-2">
                                    {assets.map(asset => {
                                        const isSelected = selectedAssets.includes(asset.id);
                                        return (
                                            <button 
                                                key={asset.id}
                                                onClick={() => toggleAsset(asset.id)}
                                                className={`w-full flex items-center p-3 rounded-xl border transition-all duration-200 group text-left
                                                    ${isSelected 
                                                        ? 'bg-blue-600 border-blue-600 shadow-md text-white' 
                                                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center mr-3 transition-all
                                                    ${isSelected ? 'bg-white border-white' : 'border-slate-300 group-hover:border-blue-400'}`}>
                                                    {isSelected && <Check className="w-3 h-3 text-blue-600 stroke-[4]" />}
                                                </div>
                                                <span className={`text-sm font-semibold tracking-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                                    {asset.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ConfigCard>

                <ConfigCard title="Performance Metrics" icon={Activity}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {Object.entries(groupedMetrics).map(([type, metrics]) => (
                            <div key={type} className="space-y-4">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center">
                                    {type === 'Individual' ? <Activity className="w-3 h-3 mr-1.5" /> : <TrendingUp className="w-3 h-3 mr-1.5" />}
                                    {type}
                                </h4>
                                <div className="space-y-2">
                                    {metrics.map(metric => {
                                        const isSelected = selectedMetrics.includes(metric.id);
                                        return (
                                            <button 
                                                key={metric.id}
                                                onClick={() => toggleMetric(metric.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group text-left
                                                    ${isSelected 
                                                        ? 'bg-blue-600 border-blue-600 shadow-md text-white' 
                                                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'}`}
                                            >
                                                <div className="flex items-center">
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 transition-all
                                                        ${isSelected ? 'bg-white border-white' : 'border-slate-300 group-hover:border-blue-400'}`}>
                                                        {isSelected && <Check className="w-3 h-3 text-blue-600 stroke-[4]" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-semibold tracking-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                                            {metric.name}
                                                        </span>
                                                    </div>
                                                </div>
                                                {!isSelected && metric.type === 'Calculated' && (
                                                    <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-tighter group-hover:bg-blue-100 group-hover:text-blue-600">
                                                        Calc
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ConfigCard>
            </div>
            
            <div className="flex justify-center pt-4">
                <div className="bg-blue-50 px-6 py-2.5 rounded-full border border-blue-100 flex items-center text-sm font-medium text-blue-700 shadow-sm">
                    <Info className="w-4 h-4 mr-2 text-blue-500" />
                    Currently mapping <span className="mx-1 font-bold">{selectedAssets.length} assets</span> to <span className="mx-1 font-bold">{selectedMetrics.length} metrics</span>.
                </div>
            </div>
        </div>
    );
};

// --- Merged Step 2: Configuration (Actuals & Planned) ---
interface ConfigurationStepProps {
    actuals: ActualsConfig;
    onActualsChange: (cfg: ActualsConfig) => void;
    planned: PlannedConfig;
    onPlannedChange: (cfg: PlannedConfig) => void;
}

export const ConfigurationStep: React.FC<ConfigurationStepProps> = ({
    actuals, onActualsChange,
    planned, onPlannedChange
}) => {
    return (
        <div className="max-w-[1200px] mx-auto animate-fade-in space-y-6">
            <div className="text-center mb-8">
                 <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Timeline & Parameters</h2>
                 <p className="text-slate-500 text-lg mt-2">Configure historical data windows and future planning horizons.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Historical Configuration */}
                <ConfigCard title="Historical Window" icon={Calendar}>
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <CustomDatePicker 
                                label="From" 
                                value={actuals.startDate} 
                                onChange={(d) => onActualsChange({...actuals, startDate: d})} 
                            />
                            <CustomDatePicker 
                                label="To" 
                                value={actuals.endDate} 
                                onChange={(d) => onActualsChange({...actuals, endDate: d})} 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Historical Resolution</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                                {['Day', 'Week', 'Month'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => onActualsChange({...actuals, aggregation: opt as Aggregation})}
                                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all
                                            ${actuals.aggregation === opt 
                                                ? 'bg-white text-blue-700 shadow-md border border-slate-100' 
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}
                                        `}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <SelectableList 
                            label="Aggregation Period"
                            value={actuals.periodFrequency}
                            onChange={(v) => onActualsChange({...actuals, periodFrequency: v as PeriodFrequency})}
                            options={[
                                { value: 'Week', label: 'Rolling Week', description: '7-day sliding window analysis', icon: Clock },
                                { value: 'Month', label: 'Calendar Month', description: 'Monthly actuals alignment', icon: CalendarDays },
                                { value: 'FinancialYear', label: 'Financial Year', description: 'Annual cumulative reporting', icon: Briefcase },
                            ]}
                        />
                    </div>
                </ConfigCard>

                {/* Planned Parameters */}
                <ConfigCard title="Planning Horizon" icon={TrendingUp}>
                    <div className="space-y-8">
                        <CustomDatePicker 
                            label="Projection Starts" 
                            value={planned.startDate} 
                            onChange={(d) => {
                                const date = new Date(d);
                                date.setDate(1);
                                onPlannedChange({...planned, startDate: date.toISOString().split('T')[0]});
                            }} 
                        />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">Simulation Span (Months)</label>
                                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                    {planned.months} Months
                                </span>
                            </div>
                            <div className="relative pt-2">
                                <input 
                                    type="range" 
                                    min="1" max="12"
                                    step="1"
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
                                    value={planned.months}
                                    onChange={(e) => onPlannedChange({...planned, months: parseInt(e.target.value)})}
                                />
                                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                    <span>1 Mo</span>
                                    <span>3 Mo</span>
                                    <span>6 Mo</span>
                                    <span>9 Mo</span>
                                    <span>12 Mo</span>
                                </div>
                            </div>
                        </div>

                        <SelectableList 
                            label="Target Reporting Frequency"
                            value={planned.periodFrequency}
                            onChange={(v) => onPlannedChange({...planned, periodFrequency: v as any})}
                            options={[
                                { value: 'Month', label: 'Monthly Reporting', description: 'Granular month-by-month results', icon: CalendarDays },
                                { value: 'FinancialYear', label: 'Full Year Summary', description: 'Consolidated annual projection', icon: Layers },
                            ]}
                        />
                    </div>
                </ConfigCard>
            </div>
        </div>
    );
};