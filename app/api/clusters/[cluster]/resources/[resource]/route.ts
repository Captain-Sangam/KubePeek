import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthError,
  listCronJobs,
  listDaemonSets,
  listDeployments,
  listHpas,
  listIngresses,
  listJobs,
  listPdbs,
  listStatefulSets,
} from '../../../../../lib/kubernetes-server';

// Namespace-scoped list views served by NamespacedResourceTable. Add a lister
// here to expose a new one at /api/clusters/<cluster>/resources/<key>?namespace=<ns>.
const LISTERS: Record<string, (cluster: string, namespace: string) => Promise<unknown[]>> = {
  deployments: listDeployments,
  statefulsets: listStatefulSets,
  daemonsets: listDaemonSets,
  jobs: listJobs,
  cronjobs: listCronJobs,
  hpa: listHpas,
  pdbs: listPdbs,
  ingresses: listIngresses,
};

export async function GET(request: NextRequest, props: { params: Promise<{ cluster: string; resource: string }> }) {
  const { cluster, resource } = await props.params;
  // hasOwn so inherited keys like "constructor" don't resolve to a function.
  if (!Object.hasOwn(LISTERS, resource)) {
    return NextResponse.json({ success: false, message: `Unknown resource "${resource}"` }, { status: 404 });
  }
  const namespace = new URL(request.url).searchParams.get('namespace');
  if (!cluster || !namespace) {
    return NextResponse.json(
      { success: false, message: 'Missing cluster or namespace parameter' },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await LISTERS[resource](cluster, namespace));
  } catch (error: any) {
    console.error(`Error in ${resource} API:`, error);
    // Auth first, so a 401 always reaches the Reconnect banner. A 403 can't
    // match isAuthError's message check: client-node's HttpError message is
    // always "HTTP request failed"; Kubernetes' reason is in error.body.
    if (isAuthError(error)) {
      return NextResponse.json({ error: 'auth_expired' }, { status: 401 });
    }
    if (typeof error?.statusCode === 'number') {
      let message = error.body?.message || error.message;
      // Listing a namespace that doesn't exist returns an empty list, so a 404
      // here means the API group/version isn't served (e.g. Kubernetes < 1.21).
      if (error.statusCode === 404) {
        message += ' — this cluster may not serve this API (CronJobs and PDBs need Kubernetes ≥ 1.21)';
      }
      return NextResponse.json({ success: false, message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
