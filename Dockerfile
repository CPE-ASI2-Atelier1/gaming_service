# BUILD
FROM node:22-alpine AS build
WORKDIR /home/node/app
COPY package*.json tsconfig.json ./
RUN npm install --only=dev
COPY ./src ./src/
RUN npx tsc

# RUN
FROM node:22-alpine
WORKDIR /home/node/app
COPY --from=build /home/node/app/dist/ ./src/
COPY package*.json ./

RUN chown -R node:node /home/node/app
USER node
RUN npm install
COPY --chown=node:node . .
EXPOSE 3000
CMD ["node", "./src/index.js"]

