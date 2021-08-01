all: build test

build: clean
	cd sippy-ng; npm install; npm run build
	go build -mod=vendor .
	rice append -i . --exec sippy

test:
	go test -v ./...

lint:
	golangci-lint run ./...

clean:
	rm -f sippy
