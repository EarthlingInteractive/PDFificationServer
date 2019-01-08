## Running via Docker

I publish a docker image called ```togos/pdficate:<git-commit-id>```.

```docker run -p 127.0.0.1:8056:8056 togos/pdficate``` should do the job.

## Using the web service

To create a PDF from an uploaded file:

```
POST /pdfify HTTP/1.0
Content-Type: <whatever>
Content-Length: <whatever>

<file content>
```

To create a PDF from an arbitrary web page by URL:

```
GET /pdfify?url=<url>&waitForDomSelector=body HTTP/1.0
```

You can replace 'body' with some other selector
in case you need to wait for some javascript to run before PDFifying.

In either case, assuming no errors, the resulting PDF file will be returned in the response body.

## Building and running the Docker container

```sh
make docker-image-id
docker run -p 127.0.0.1:8058:8056 `cat docker-image-id`
```

Then go to http://127.0.0.1:8058/pdfify?....

In this example, 8056 is the server port as it appears inside the docker container,
and 127.0.0.1:8058 is the port we want to bind to on the host machine
so that we can use the service.  I used different numbers in this example
but normally I just use 8056 for the externally published port, too.

## Running without the Docker container

```make run-server``` will do the job, assuming your system has the needed packages.
See the Dockerfile for what those are.

## Running from the command-line

Probably possible, but the current Dockerfile doesn't make it easy.
