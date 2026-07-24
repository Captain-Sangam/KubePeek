import { NextRequest, NextResponse } from 'next/server';
import { listNamespaces, isAuthError } from '../../../../lib/kubernetes-server';
import { getDefaultContext, getDefaultContextName } from '../../../../lib/default-context';

export async function GET(request: NextRequest, props: { params: Promise<{ cluster: string }> }) {
  const params = await props.params;
  let cluster = decodeURIComponent(params.cluster);

  const defaultContextName = await getDefaultContextName();
  if (cluster === defaultContextName) {
    cluster = await getDefaultContext();
  }

  try {
    const namespaces = await listNamespaces(cluster);
    return NextResponse.json(namespaces, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    console.error(`Error fetching namespaces for cluster ${cluster}:`, error);
    const auth = isAuthError(error);
    return NextResponse.json(
      { error: auth ? 'auth_expired' : error.message || 'Failed to fetch namespaces' },
      { status: auth ? 401 : 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
