'use client';

import { Pod, Cluster } from '../types/kubernetes';

interface PodDetailPanelProps {
  pod: Pod | null;
  cluster: Cluster;
  open: boolean;
  onClose: () => void;
}

// This component is intentionally empty and not used anymore.
// It exists to maintain compatibility with any imports that might reference it.
export default function PodDetailPanel({
  pod,
  cluster,
  open,
  onClose
}: PodDetailPanelProps) {
  return null;
} 