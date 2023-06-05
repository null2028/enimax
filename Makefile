cordova:
	cd /usr/src/
	cordova platform add android@9.0.0

build-cordova:
	make ts
	JAVA_HOME=/usr/src/java ANDROID_HOME=/usr/lib/android-sdk  cordova build --release --device --no-telemetry

build:
	make build-cordova || sed -i 's/--illegal-access=permit//' ./platforms/android/gradlew && make build-cordova

docker-build:
	docker build --tag=enimaxanime/anime:v1.0.0 .

docker-run:
	docker run -i -t b440a27ea6b4

ts:
	npm install typescript -g
	-rm www -rf
	cp src www -r
	-cd src && tsc -p tsconfig.json
	cd www/extensions && printf "\n" >> index.js && cat wco.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat animixplay.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat fmovies.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat zoro.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat twitch.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat 9anime.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat fmoviesto.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat gogo.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat mangadex.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat mangafire.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat viewasian.js >> index.js
	cd www/extensions && printf "\n" >> index.js && cat export.js >> index.js
