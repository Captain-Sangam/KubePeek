FROM node:18-alpine

WORKDIR /app

# Install required system dependencies
RUN apk add --no-cache curl python3 bash aws-cli kubectl

# Copy package.json and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the application code
COPY . .

# Build the project
RUN npm run build

# Prepare for production
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV KUBECONFIG /root/.kube/config

# Verify tools are available
RUN which aws && which kubectl

# Create the start script
RUN chmod +x start.sh

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]