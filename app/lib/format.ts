import { ResourceBasis } from '../types/kubernetes';

// Extract a numeric value (cores for CPU, bytes for memory) from a formatted
// Kubernetes value string like "100m", "1.5", "256Mi", "4Gi". Used for sorting
// mixed-unit columns correctly.
export const parseNumericValue = (valueStr: string): number => {
  if (!valueStr) return 0;
  valueStr = String(valueStr);

  const directParse = parseFloat(valueStr);
  if (!isNaN(directParse) && !/[a-zA-Z]/.test(valueStr)) {
    return directParse;
  }

  // CPU units
  if (/^[\d.]+m$/.test(valueStr)) return parseFloat(valueStr) / 1000; // millicores -> cores
  if (/^[\d.]+n$/.test(valueStr)) return parseFloat(valueStr) / 1e9; // nanocores
  if (/^[\d.]+µ$/.test(valueStr)) return parseFloat(valueStr) / 1e6; // microcores

  // Memory units (binary)
  if (/^[\d.]+Ki$/.test(valueStr)) return parseFloat(valueStr) * 1024;
  if (/^[\d.]+Mi$/.test(valueStr)) return parseFloat(valueStr) * 1024 ** 2;
  if (/^[\d.]+Gi$/.test(valueStr)) return parseFloat(valueStr) * 1024 ** 3;
  if (/^[\d.]+Ti$/.test(valueStr)) return parseFloat(valueStr) * 1024 ** 4;

  // Memory units (decimal)
  if (/^[\d.]+K$/.test(valueStr)) return parseFloat(valueStr) * 1e3;
  if (/^[\d.]+M$/.test(valueStr)) return parseFloat(valueStr) * 1e6;
  if (/^[\d.]+G$/.test(valueStr)) return parseFloat(valueStr) * 1e9;
  if (/^[\d.]+KB$/.test(valueStr)) return parseFloat(valueStr) * 1e3;
  if (/^[\d.]+MB$/.test(valueStr)) return parseFloat(valueStr) * 1e6;
  if (/^[\d.]+GB$/.test(valueStr)) return parseFloat(valueStr) * 1e9;

  const numMatches = valueStr.match(/[\d.]+/);
  return numMatches ? parseFloat(numMatches[0]) : 0;
};

// Threshold color for usage bars — shared by node and pod bars.
export type UsageColor = 'error' | 'warning' | 'primary';
export const getUsageColor = (percent: number): UsageColor => {
  if (percent > 80) return 'error';
  if (percent > 60) return 'warning';
  return 'primary';
};

// Human-readable label for the denominator a percentage is measured against.
export const basisLabel = (basis?: ResourceBasis): string => {
  switch (basis) {
    case 'limit':
      return 'limit';
    case 'request':
      return 'request';
    case 'allocatable':
      return 'node allocatable';
    default:
      return '';
  }
};

// Relative age string from an ISO timestamp: "45s", "12m", "3h", "5d".
export const formatAge = (iso?: string): string => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return '—';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return `${Math.max(0, secs)}s`;
};

// Full local timestamp for tooltips.
export const formatFullTimestamp = (iso?: string): string => {
  if (!iso) return 'unknown';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};
