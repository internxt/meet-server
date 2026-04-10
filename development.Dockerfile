FROM node:22.17.0

ENV YARN_CACHE_FOLDER=/usr/app/.yarn-cache
ENV YARN_GLOBAL_FOLDER=/usr/app/.yarn-global

USER 1234:1234

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn
COPY --chown=1234:1234 . ./

RUN rm -rf dist && yarn build

CMD ["sh", "-c", "yarn migrate && yarn start:dev"]

EXPOSE 3006
