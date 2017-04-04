default:
	@echo "Maybe you want to 'make run-tests' or 'make run-server'?"

docker_image_id = $(shell cat docker-image-id)

.DELETE_ON_ERROR: \
	docker-image-id
.PHONY: \
	clean \
	docker-image \
	run-server \
	run-server-in-docker
	run-tests \
	run-tests-in-docker \
	run-web-tests

clean:
	rm -rf node_modules docker-image-id temp/*

node_modules: package.json
	npm install
	touch "$@"

run-tests: node_modules
	npm test

run-server: node_modules
	node server.js

docker-image-id: Dockerfile package.json *.js test-data/*
	docker build . | tee .docker-build.log
	tail -n 1 .docker-build.log | sed -e 's/Successfully built //' > "$@"

docker-image: docker-image-id

run-server-in-docker: docker-image-id
	docker run -p 127.0.0.1:8056:8056 ${docker_image_id}

run-tests-in-docker: docker-image-id
	docker run ${docker_image_id} npm test

# Run this after you have started the server
# either locally or in a docker container with :8056 published
run-web-tests:
	mkdir -p temp
	curl -f -X POST -H 'Content-Type: text/html' --data-binary @test-data/hello.html http://localhost:8056/pdfify -o temp/hello.pdf
	curl -f 'http://localhost:8056/pdfify?uri=http://www.nuke24.net/' -o temp/nuke24.pdf
