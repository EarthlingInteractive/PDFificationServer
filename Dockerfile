FROM alpine

RUN apk add --update nodejs

RUN npm install

ADD package.json *.js node_modules /opt/src/

WORKDIR /opt/src

CMD mkdir -p temp

ENTRYPOINT xvfb-run -a node server.js
