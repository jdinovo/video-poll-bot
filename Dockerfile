FROM node:latest

WORKDIR /usr/src/bot

COPY package.json /usr/src/bot

RUN npm install

COPY . /usr/src/bot

CMD ["node", "index.js"]