# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy all source code first
COPY . .

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "run", "start:prod"]
