FROM node:22.13.1-alpine

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn
COPY . ./

RUN rm -rf dist && yarn build

CMD yarn migrate && yarn start:dev

EXPOSE 3006
