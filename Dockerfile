FROM alpine

RUN apk add --update nodejs

ADD package.json *.js node_modules /opt/src/

WORKDIR /opt/src

RUN npm install
RUN mkdir -p temp

CMD xvfb-run -a node server.js
