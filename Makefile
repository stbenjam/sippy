DEPS = npm go
CHECK := $(foreach dep,$(DEPS),\
        $(if $(shell which $(dep)),"$(dep) found",$(error "Missing $(exec) in PATH")))

all: build test

build: clean
	go get -u github.com/GeertJohan/go.rice/rice
	cd sippy-ng; npm install; npm run build
	go build -mod=vendor .
	rice append -i . --exec sippy

test:
	go test -v ./...

lint:
	golangci-lint run ./...

clean:
	rm -f sippy
