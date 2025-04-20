FROM node:18-alpine

WORKDIR /app

# Install required system dependencies
RUN apk add --no-cache curl python3 bash aws-cli kubectl

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the application code
COPY . .

# Set environment variables
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV KUBECONFIG /root/.kube/config

# Create necessary directories
RUN mkdir -p /root/.kube /root/.aws

# Expose the application port
EXPOSE 3000

# Start the development server
CMD ["npm", "run", "dev"]

# There are some issue with build process, so we are using dev mode for now