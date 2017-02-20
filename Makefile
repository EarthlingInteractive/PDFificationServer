default:
	@echo "Maybe you want to 'make run-tests' or 'make run-server'?"

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
	npm start
