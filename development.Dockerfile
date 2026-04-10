FROM node:22.17.0

RUN groupadd -g 1234 -r nodeuser && useradd  -u 1234 -r -g nodeuser nodeuser
USER nodeuser
WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn
COPY --chown=nodeuser:nodeuser . ./

RUN rm -rf dist && yarn build

CMD yarn migrate && yarn start:dev

EXPOSE 3006
