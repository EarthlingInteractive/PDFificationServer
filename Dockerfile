FROM alpine:latest

RUN apk add --update --no-cache bash nodejs xvfb

ADD package.json *.js /opt/src/

WORKDIR /opt/src

RUN npm install
RUN mkdir -p temp

CMD Xvfb -a node server.js
