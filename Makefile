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
