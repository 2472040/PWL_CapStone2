FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies needed for compiling packages
RUN apk add --no-cache make gcc g++ python3

# Copy package config files
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy source code
COPY . .

# Expose ports: 3000 for backend API, 5173 for Vite frontend
EXPOSE 3000
EXPOSE 5173

# Start the concurrent development server
CMD ["npm", "run", "dev:all"]
