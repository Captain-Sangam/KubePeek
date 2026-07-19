import { gunzipSync } from 'zlib';
import { getClientForCluster } from './kubernetes-server';
import { HelmReleaseSummary, HelmReleaseDetail } from '../types/kubernetes';

// Shape of the decoded Helm release payload we care about.
interface HelmReleasePayload {
  name: string;
  namespace: string;
  version: number;
  info?: {
    status?: string;
    last_deployed?: string;
    description?: string;
    notes?: string;
  };
  chart?: {
    metadata?: {
      name?: string;
      version?: string;
      appVersion?: string;
    };
    values?: Record<string, unknown>;
  };
  config?: Record<string, unknown>;
  manifest?: string;
}

// Helm stores releases as Secrets of type helm.sh/release.v1. The `release`
// data key is base64(K8s API) -> base64(Helm) -> gzip -> JSON.
const decodeHelmRelease = (secretData: string): HelmReleasePayload => {
  const outer = Buffer.from(secretData, 'base64'); // K8s API base64 layer
  const inner = Buffer.from(outer.toString('utf8'), 'base64'); // Helm's base64 layer
  const json = inner[0] === 0x1f && inner[1] === 0x8b ? gunzipSync(inner) : inner; // gzip magic
  return JSON.parse(json.toString('utf8'));
};

// Deep-merge helper for computing effective values (chart defaults <- user config).
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const deepMerge = (
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (isObject(v) && isObject(out[k])) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v);
    } else {
      out[k] = v;
    }
  }
  return out;
};

const toIso = (s?: string): string => (s ? new Date(s).toISOString() : '');

// List helm releases (latest revision of each) by reading release secrets.
export const listHelmReleases = async (clusterName: string): Promise<HelmReleaseSummary[]> => {
  const { coreClient } = getClientForCluster(clusterName);

  // fieldSelector is the 3rd positional arg on listSecretForAllNamespaces.
  const { body } = await coreClient.listSecretForAllNamespaces(
    undefined, // allowWatchBookmarks
    undefined, // _continue
    'type=helm.sh/release.v1'
  );

  // Group secrets by release name + namespace, keeping the highest version.
  const latestByRelease = new Map<string, { version: number; secret: (typeof body.items)[0] }>();
  for (const secret of body.items) {
    const relName = secret.metadata?.labels?.['name'];
    const ns = secret.metadata?.namespace;
    if (!relName || !ns) continue;
    const version = parseInt(secret.metadata?.labels?.['version'] || '0', 10);
    const key = `${ns}/${relName}`;
    const existing = latestByRelease.get(key);
    if (!existing || version > existing.version) {
      latestByRelease.set(key, { version, secret });
    }
  }

  const summaries: HelmReleaseSummary[] = [];
  for (const { secret } of latestByRelease.values()) {
    try {
      const raw = secret.data?.['release'];
      if (!raw) continue;
      const payload = decodeHelmRelease(raw);
      summaries.push({
        name: payload.name,
        namespace: payload.namespace,
        revision: payload.version,
        status: payload.info?.status || secret.metadata?.labels?.['status'] || 'unknown',
        chart: payload.chart?.metadata?.name || '',
        chartVersion: payload.chart?.metadata?.version || '',
        appVersion: payload.chart?.metadata?.appVersion || '',
        updated: toIso(payload.info?.last_deployed)
      });
    } catch (err) {
      console.error('Error decoding helm release secret:', err);
    }
  }

  return summaries.sort((a, b) => a.name.localeCompare(b.name));
};

// Get full detail for a single release: computed values, manifest, notes, history.
export const getHelmRelease = async (
  clusterName: string,
  namespace: string,
  name: string
): Promise<{ success: boolean; release?: HelmReleaseDetail; message?: string }> => {
  try {
    const { coreClient } = getClientForCluster(clusterName);

    // labelSelector is the 5th positional arg on listNamespacedSecret.
    const { body } = await coreClient.listNamespacedSecret(
      namespace,
      undefined, // pretty
      undefined, // allowWatchBookmarks
      undefined, // _continue
      undefined, // fieldSelector
      `name=${name},owner=helm`
    );

    if (body.items.length === 0) {
      return { success: false, message: `Helm release ${namespace}/${name} not found` };
    }

    const revisions = body.items
      .map(secret => {
        const raw = secret.data?.['release'];
        return raw ? decodeHelmRelease(raw) : null;
      })
      .filter((p): p is HelmReleasePayload => p !== null)
      .sort((a, b) => b.version - a.version);

    if (revisions.length === 0) {
      return { success: false, message: `Could not decode helm release ${namespace}/${name}` };
    }

    const latest = revisions[0];
    const chartDefaults = latest.chart?.values || {};
    const userValues = latest.config || {};

    const release: HelmReleaseDetail = {
      name: latest.name,
      namespace: latest.namespace,
      revision: latest.version,
      status: latest.info?.status || 'unknown',
      chart: latest.chart?.metadata?.name || '',
      chartVersion: latest.chart?.metadata?.version || '',
      appVersion: latest.chart?.metadata?.appVersion || '',
      updated: toIso(latest.info?.last_deployed),
      values: deepMerge(chartDefaults, userValues),
      userValues,
      manifest: latest.manifest || '',
      notes: latest.info?.notes || '',
      history: revisions.map(r => ({
        revision: r.version,
        status: r.info?.status || 'unknown',
        chartVersion: r.chart?.metadata?.version || '',
        appVersion: r.chart?.metadata?.appVersion || '',
        updated: toIso(r.info?.last_deployed),
        description: r.info?.description
      }))
    };

    return { success: true, release };
  } catch (error) {
    console.error(`Error getting helm release ${namespace}/${name}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error fetching helm release'
    };
  }
};
