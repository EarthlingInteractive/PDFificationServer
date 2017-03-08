FROM alpine

RUN apk add --update \
    nodejs \
    xfvb

ADD package.json *.js /opt/src/

WORKDIR /opt/src

RUN npm install
RUN mkdir -p temp

CMD xvfb-run -a node server.js
