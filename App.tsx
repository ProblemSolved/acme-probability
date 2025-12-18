import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { SelectionStep, ConfigurationStep } from './components/Steps';
import { AnalysisStep } from './components/AnalysisStep';
import { Dashboard } from './components/Dashboard';
import { AppState, AnalysisDataPoint, SavedQuery } from './types';
import { MOCK_ASSETS, MOCK_METRICS } from './constants';
import { generateAnalysisData } from './services/dataService';
import { FileDown, CheckCircle } from 'lucide-react';

// Mock Saved Data
const MOCK_QUERIES: SavedQuery[] = [
    { id: 'q1', name: 'Q1 FY24 Haul Truck Performance', site: 'Pilbara Region', department: 'Mining Ops', user: 'John Doe', lastModified: '2 days ago', status: 'Completed', paramCount: 24 },
    { id: 'q2', name: 'Drill Availability Analysis', site: 'Bowen Basin', department: 'Asset Mgmt', user: 'Sarah Smith', lastModified: '5 days ago', status: 'Draft', paramCount: 12 },
    { id: 'q3', name: 'Dragline Shutdown Review', site: 'Hunter Valley', department: 'Reliability', user: 'Mike Jones', lastModified: '1 week ago', status: 'Completed', paramCount: 8 },
];

const INITIAL_STATE: AppState = {
  view: 'DASHBOARD',
  savedQueries: MOCK_QUERIES,
  currentStep: 1,
  assets: MOCK_ASSETS,
  selectedAssetIds: [],
  actualsConfig: {
    aggregation: 'Week',
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    periodFrequency: 'Month'
  },
  metrics: MOCK_METRICS,
  selectedMetricIds: [],
  metricGroups: [],
  plannedConfig: {
    startDate: new Date().toISOString().split('T')[0],
    months: 12,
    periodFrequency: 'Month'
  },
  analysisData: []
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  const startNewAnalysis = () => {
      setState(prev => ({
          ...prev,
          view: 'WIZARD',
          currentStep: 1,
          selectedAssetIds: [],
          selectedMetricIds: [],
          analysisData: []
      }));
  };

  const openAnalysis = (id: string) => {
      setState(prev => ({
          ...prev,
          view: 'WIZARD',
          currentStep: 3, // Merged Analysis Step
          selectedAssetIds: ['t1', 't2'],
          selectedMetricIds: ['m1', 'c1'],
          analysisData: generateAnalysisData(['t1', 't2'], ['m1', 'c1'], prev.assets, prev.metrics, prev.plannedConfig)
      }));
  };

  const exitWizard = () => {
      setState(prev => ({ ...prev, view: 'DASHBOARD' }));
  };

  // Validation Logic for Step Progression
  const canProceed = () => {
    switch(state.currentStep) {
        case 1: return state.selectedAssetIds.length > 0 && state.selectedMetricIds.length > 0;
        case 2: return !!state.actualsConfig.startDate && !!state.actualsConfig.endDate && state.plannedConfig.months > 0;
        case 3: return true; // Analysis
        case 4: return true; // Export
        default: return false;
    }
  };

  const handleNext = () => {
    if (state.currentStep === 2) {
        // Generate Data when moving from configuration to analysis
        const data = generateAnalysisData(
            state.selectedAssetIds,
            state.selectedMetricIds,
            state.assets,
            state.metrics,
            state.plannedConfig
        );
        setState(prev => ({ ...prev, analysisData: data, currentStep: 3 }));
    } else if (state.currentStep === 4) {
        downloadCSV();
    } else {
        setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const handleBack = () => {
    if (state.currentStep === 1) {
        exitWizard();
    } else {
        setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const goToStep = (stepId: number) => {
    // Only allow clicking steps that the user has already reached/completed
    if (stepId <= state.currentStep) {
        setState(prev => ({ ...prev, currentStep: stepId }));
    }
  };

  const updateAnalysisPoint = (updated: AnalysisDataPoint) => {
      setState(prev => ({
          ...prev,
          analysisData: prev.analysisData.map(p => 
            p.id === updated.id ? updated : p
          )
      }));
  };

  const handleBulkUpdate = (newData: AnalysisDataPoint[]) => {
      setState(prev => ({
          ...prev,
          analysisData: newData
      }));
  };

  const downloadCSV = () => {
    const headers = [
        "Asset", "Metric", "Period", "A (Min)", "B (Mode)", "C (Max)", "Mean", "StdDev", "P10", "P50", "P90"
    ];
    
    const rows = state.analysisData
        .filter(d => !d.ignored)
        .map(d => {
            const assetName = state.assets.find(a => a.id === d.assetId)?.name || d.assetId;
            const metricName = state.metrics.find(m => m.id === d.metricId)?.name || d.metricId;
            return [
                assetName,
                metricName,
                d.label,
                d.distribution.min.toFixed(4),
                d.distribution.mode.toFixed(4),
                d.distribution.max.toFixed(4),
                d.distribution.mean.toFixed(4),
                d.distribution.stdDev.toFixed(4),
                d.plannedP10.toFixed(4),
                d.plannedP50.toFixed(4),
                d.plannedP90.toFixed(4)
            ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "acme_analytics_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (state.view === 'DASHBOARD') {
      return (
          <Dashboard 
            queries={state.savedQueries} 
            onCreate={startNewAnalysis}
            onOpen={openAnalysis}
          />
      );
  }

  return (
    <Layout 
        currentStep={state.currentStep} 
        onNext={handleNext} 
        onBack={handleBack} 
        onStepClick={goToStep}
        canNext={canProceed()}
        onExit={exitWizard}
    >
        {state.currentStep === 1 && (
            <SelectionStep 
                selectedAssets={state.selectedAssetIds}
                onAssetsChange={ids => setState(s => ({ ...s, selectedAssetIds: ids }))}
                selectedMetrics={state.selectedMetricIds}
                onMetricsChange={ids => setState(s => ({ ...s, selectedMetricIds: ids }))}
            />
        )}
        {state.currentStep === 2 && (
            <ConfigurationStep 
                actuals={state.actualsConfig}
                onActualsChange={cfg => setState(s => ({ ...s, actualsConfig: cfg }))}
                planned={state.plannedConfig}
                onPlannedChange={cfg => setState(s => ({ ...s, plannedConfig: cfg }))}
            />
        )}
        {state.currentStep === 3 && (
            <AnalysisStep 
                data={state.analysisData}
                assets={state.assets}
                metrics={state.metrics}
                onDataUpdate={updateAnalysisPoint}
                onBulkUpdate={handleBulkUpdate}
            />
        )}
        {state.currentStep === 4 && (
             <div className="flex flex-col items-center justify-center h-full animate-fade-in text-center">
                <div className="bg-emerald-100 p-6 rounded-full mb-6 ring-8 ring-emerald-50">
                    <CheckCircle className="w-16 h-16 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Analysis Complete</h2>
                <p className="text-slate-500 max-w-md mb-8">
                    Your distribution parameters and P-values are ready for Monte Carlo simulation. 
                    Click below to download the Excel-compatible CSV file.
                    <br/><br/>
                    <span className="text-xs text-slate-400">({state.analysisData.filter(d => d.ignored).length} items ignored)</span>
                </p>
                
                <button 
                    onClick={downloadCSV}
                    className="flex items-center px-8 py-4 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all font-medium text-lg"
                >
                    <FileDown className="w-6 h-6 mr-3" />
                    Download ABNC Parameters
                </button>
             </div>
        )}
    </Layout>
  );
};

export default App;