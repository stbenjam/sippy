all: build test

build:
	go build -mod=vendor .
	rice append -i . --exec sippy

test:
	go test -v ./...

lint:
	golangci-lint run ./...
