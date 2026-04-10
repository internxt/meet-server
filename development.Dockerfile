FROM node:22.17.0

USER 1234:1234

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn
COPY --chown=1234:1234 . ./

RUN rm -rf dist && yarn build

CMD yarn migrate && yarn start:dev

EXPOSE 3006
