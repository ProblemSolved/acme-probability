export type AssetType = 'Truck' | 'Drill' | 'Dragline';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
}

export type MetricType = 'Individual' | 'Calculated';
export type VolumeType = 'Availability' | 'Utilisation' | 'Rate' | 'None';

export interface Metric {
  id: string;
  name: string;
  type: MetricType;
  volumeType?: VolumeType; // Only if volume is yes
}

export interface MetricGroup {
  id: string;
  name: string;
  metrics: string[]; // IDs of metrics
}

export type Aggregation = 'Day' | 'Week' | 'Month';
export type PeriodFrequency = 'Week' | 'Month' | 'FinancialYear' | 'Range';

export interface ActualsConfig {
  aggregation: Aggregation;
  startDate: string;
  endDate: string;
  periodFrequency: PeriodFrequency;
}

export interface PlannedConfig {
  startDate: string; // Forces 1st of picked month
  months: number;
  periodFrequency: 'Month' | 'FinancialYear';
}

// The core data structure for the Analysis step
export interface DistributionParams {
  min: number;  // A
  mode: number; // B
  max: number;  // C (or N for specific dists)
  mean: number;
  stdDev: number;
}

export type AnalysisStatus = 'OK' | 'Warning' | 'Error';

export type DistributionType = 'Auto' | 'Normal' | 'LogNormal' | 'Triangular' | 'PERT' | 'Weibull';

export interface AnalysisDataPoint {
  id: string; // Unique ID for tracking
  assetId: string;
  metricId: string;
  monthIndex: number; // 0 to PlannedConfig.months - 1
  label: string; // e.g., "Jan 2024"
  
  // Historical Fit
  rawHistory: number[]; // The mock actuals
  filteredHistory: number[]; // After outlier removal
  
  // Advanced Filter Controls
  filterConfig: {
    trimBottomPct: number; // 0-25%
    trimTopPct: number; // 0-25%
    sigmaFilter: number; // 0 = off, 1, 2, 3
    absoluteMin?: number;
    absoluteMax?: number;
  };

  // Visual Controls
  chartBinCount?: number;
  chartYScale?: number; // 1.0 is default
  
  // Distribution Params (calculated from filteredHistory)
  distribution: DistributionParams;
  
  // Fit Selection
  selectedDistribution: DistributionType;
  bestFitType: DistributionType;

  // Planned Values (User editable P-values)
  plannedP10: number;
  plannedP50: number;
  plannedP90: number;

  // Analysis Flags
  ignored: boolean;
  status: AnalysisStatus;
  statusMessage?: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  site: string;
  department: string;
  user: string;
  lastModified: string;
  status: 'Draft' | 'Completed';
  paramCount: number;
}

export interface AppState {
  view: 'DASHBOARD' | 'WIZARD';
  currentStep: number;
  assets: Asset[];
  selectedAssetIds: string[];
  actualsConfig: ActualsConfig;
  metrics: Metric[];
  selectedMetricIds: string[];
  metricGroups: MetricGroup[];
  plannedConfig: PlannedConfig;
  analysisData: AnalysisDataPoint[]; 
  savedQueries: SavedQuery[];
}