import { Asset, Metric } from './types';

export const MOCK_ASSETS: Asset[] = [
  { id: 't1', name: 'Truck 001', type: 'Truck' },
  { id: 't2', name: 'Truck 002', type: 'Truck' },
  { id: 't3', name: 'Truck 003', type: 'Truck' },
  { id: 'd1', name: 'Drill 101', type: 'Drill' },
  { id: 'd2', name: 'Drill 102', type: 'Drill' },
  { id: 'dl1', name: 'Dragline Alpha', type: 'Dragline' },
];

export const MOCK_METRICS: Metric[] = [
  { id: 'm1', name: 'Meal Break', type: 'Individual' },
  { id: 'm2', name: 'Shift Change', type: 'Individual' },
  { id: 'm3', name: 'Refuel', type: 'Individual' },
  { id: 'm4', name: 'Weather Delay', type: 'Individual' },
  { id: 'c1', name: 'Availability', type: 'Calculated', volumeType: 'Availability' },
  { id: 'c2', name: 'Utilisation', type: 'Calculated', volumeType: 'Utilisation' },
  { id: 'c3', name: 'Production Rate', type: 'Calculated', volumeType: 'Rate' },
];

export const STEPS = [
  { id: 1, title: 'Scope Selection' },
  { id: 2, title: 'Timeline & Configuration' },
  { id: 3, title: 'Analysis' },
  { id: 4, title: 'Export' },
];