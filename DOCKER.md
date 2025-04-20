# Running KubePeek with Docker

This guide explains how to run KubePeek using Docker, which allows you to containerize the application.

## Prerequisites

- Docker installed on your system
- Kubernetes configuration file (`~/.kube/config`) with valid clusters

## Building the Docker Image

1. Clone the repository and navigate to the project directory
```bash
git clone https://github.com/yourusername/kubepeek.git
cd kubepeek
```

2. Build the Docker image
```bash
docker build -t kubepeek .
```

## Running the Container

To run the application, you need to mount your Kubernetes configuration into the container:

```bash
docker run -p 3000:3000 -v $HOME/.kube:/home/nextjs/.kube kubepeek
```

This command:
- Maps port 3000 from the container to port 3000 on your host
- Mounts your local Kubernetes configuration directory to the container
- Uses the `kubepeek` image we built earlier

## Using with a Different Kubernetes Config

If your Kubernetes configuration is stored elsewhere, update the path accordingly:

```bash
docker run -p 3000:3000 -v /path/to/your/kube/config:/root/.kube/config kubepeek
```

## Accessing the Dashboard

Once the container is running, you can access the dashboard by navigating to:

[http://localhost:3000](http://localhost:3000)

## Troubleshooting

- If you encounter permission issues, make sure your Kubernetes configuration is readable by the container
- For API access issues, ensure your kubeconfig has valid credentials and can access your clusters from your local machine 