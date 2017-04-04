default:
	@echo "Maybe you want to 'make run-tests' or 'make run-server'?"

docker_image_id = $(shell cat docker-image-id)

.DELETE_ON_ERROR: \
	docker-image-id
.PHONY: \
	clean \
	run-tests \
	run-server \
	docker-image

clean:
	rm -rf node_modules hello.pdf

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
	docker run ${docker_image_id}

run-tests-in-docker: docker-image-id
	docker run ${docker_image_id} npm test
