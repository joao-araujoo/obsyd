FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV HOST=0.0.0.0
ENV PORT=8000
EXPOSE 8000
CMD ["npm", "start"]
