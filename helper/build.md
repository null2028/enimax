## Download the docker image and then start it
```
docker run -t -d --name "enimax-build" -d enimaxanime/anime
docker start enimax-build
```

## Interactive shell
```
docker exec -it enimax-build bash
```

## Wait for docker to attach your command line to the container's shell. Then run the following command to update the old repo that comes with the image
```
rm enimax -rf
git clone https://github.com/enimax-anime/enimax/
cd enimax
git checkout v1.3.0
```

## Run this to finish setting up the dev environment
```
make cordova
```

## Run this to build
```
make build
```