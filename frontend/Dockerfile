# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL=/api
ARG VITE_OFFICE_LAT=-6.200000
ARG VITE_OFFICE_LNG=106.816666
ARG VITE_GEOFENCE_RADIUS=200

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_OFFICE_LAT=$VITE_OFFICE_LAT
ENV VITE_OFFICE_LNG=$VITE_OFFICE_LNG
ENV VITE_GEOFENCE_RADIUS=$VITE_GEOFENCE_RADIUS

RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
