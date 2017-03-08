FROM alpine:latest

RUN apk add --update --no-cache bash nodejs xvfb

ADD package.json *.js /opt/src/
ADD xvfb-run /bin/xvfb-run

RUN chmod +x /bin/xvfb-run

WORKDIR /opt/src

RUN npm install
RUN mkdir -p temp

CMD xvfb-run -a node server.js
