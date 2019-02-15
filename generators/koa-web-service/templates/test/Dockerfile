FROM node:8.11.2-alpine

# Install curl and mysql-client
RUN apk add -U curl && rm -rf /var/cache/apk/*

# Create Working Directory
WORKDIR /opt/test

COPY src/package*.json ./

RUN mkdir -p ./logs

RUN npm config set @simplisafe:registry https://artifactory.tools.simplisafe.com/artifactory/api/npm/npmjs/
RUN npm install

COPY src/ ./
COPY wait-for-services.sh .
