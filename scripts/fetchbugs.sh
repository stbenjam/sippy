#!/bin/sh

echo "Doing initial sleep before fetching bugzilla data"
sleep 600 # 10 minutes
while [ true ]; do
  echo "Fetching new bugzilla data"
  /bin/sippy -v 4 --load-database --local-data /data --skip-test-grid --arch amd64 --arch arm64 --arch s390x --arch ppc64le --release 3.11 --release 4.6 --release 4.7 --release 4.8 --release 4.9 --release 4.10 --release 4.11
  echo "Done fetching data"
  sleep 3600  # 1 hour
done
