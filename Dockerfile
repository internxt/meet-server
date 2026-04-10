FROM node:22.17.0
LABEL author="internxt"

USER 1234:1234

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn
COPY --chown=1234:1234 . ./

RUN yarn build

CMD yarn start:prod
