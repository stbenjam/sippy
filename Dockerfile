FROM registry.access.redhat.com/ubi8/ubi:latest AS builder
WORKDIR /go/src/sippy
COPY . .
ENV PATH="/go/bin:${PATH}"
ENV GOPATH="/go"
RUN dnf install -y go make npm && make build

FROM registry.access.redhat.com/ubi8/ubi:latest AS base
RUN mkdir -p /historical-data
COPY --from=builder /go/src/sippy/sippy /bin/sippy
COPY --from=builder /go/src/sippy/scripts/fetchbugs.sh /bin/fetchbugs.sh
COPY --from=builder /go/src/sippy/scripts/fetchdata.sh /bin/fetchdata.sh
COPY --from=builder /go/src/sippy/scripts/fetchdata-kube.sh /bin/fetchdata-kube.sh
COPY --from=builder /go/src/sippy/historical-data /historical-data/
ENTRYPOINT ["/bin/sippy"]
EXPOSE 8080
