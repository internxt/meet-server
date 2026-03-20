FROM node:22.17.0
LABEL author="internxt"

RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser
USER nodeuser

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn
COPY --chown=nodeuser:nodeuser . ./

RUN yarn build

CMD yarn start:prod
