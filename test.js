const k8s = require('@kubernetes/client-node');
const fs = require('fs');

console.log('Testing Kubernetes connection...');
console.log('Environment variables:');
console.log('KUBECONFIG =', process.env.KUBECONFIG);
console.log('AWS_REGION =', process.env.AWS_REGION);

const kc = new k8s.KubeConfig();
try {
  const kubeconfigPath = process.env.KUBECONFIG || '/root/.kube/config';
  console.log('Looking for kubeconfig at:', kubeconfigPath);
  
  if (fs.existsSync(kubeconfigPath)) {
    console.log('Kubeconfig file exists!');
    kc.loadFromFile(kubeconfigPath);
    
    const cluster = kc.getCurrentCluster();
    console.log('Current cluster:', cluster?.name);
    console.log('Cluster server:', cluster?.server);
    
    const coreClient = kc.makeApiClient(k8s.CoreV1Api);
    console.log('Attempting to list pods...');
    
    coreClient.listPodForAllNamespaces()
      .then(res => {
        console.log('Success! Found', res.body.items.length, 'pods');
        process.exit(0);
      })
      .catch(err => {
        console.error('Error listing pods:', err.message);
        process.exit(1);
      });
  } else {
    console.error('Kubeconfig file not found!');
    process.exit(1);
  }
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}