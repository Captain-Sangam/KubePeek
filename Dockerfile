FROM node:18-alpine

WORKDIR /app

# Install required system dependencies
RUN apk add --no-cache curl python3 bash
RUN apk add --no-cache aws-cli
RUN apk add --no-cache kubectl

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

# Verify tools are available
RUN which aws && which kubectl

# Set up proper file structure for Next.js standalone output
RUN cp -R .next/static ./.next/standalone/.next/static
RUN cp -R public ./.next/standalone/public

EXPOSE 3000

WORKDIR /app/.next/standalone

# Start the server
CMD ["npm", "start"]