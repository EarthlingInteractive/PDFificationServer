FROM alpine

RUN apk add --update nodejs

RUN npm install

ADD package.json *.js ./

CMD mkdir -p temp

ENTRYPOINT node server.js
