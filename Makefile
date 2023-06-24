cordova:
	cd /usr/src/
	cordova platform add android@9.0.0

release:
	make ts
	JAVA_HOME=/usr/src/java cordova run android --release --device

emu:
	make ts
	JAVA_HOME=/usr/src/java cordova run android --release --emulator

build-cordova:
	npm install typescript -g
	make ts
	JAVA_HOME=/usr/src/java ANDROID_HOME=/usr/lib/android-sdk  cordova build --release --device --no-telemetry

build:
	make build-cordova || sed -i 's/--illegal-access=permit//' ./platforms/android/gradlew && make build-cordova

docker-build:
	docker build --tag=enimaxanime/anime:v1.0.0 .

docker-run:
	docker run -i -t b440a27ea6b4

chrome2:
	make ts
	rm enimax-chrome-extension-v2/www -rf
	cp www enimax-chrome-extension-v2 -r
	touch enimax-chrome-extension-v2/www/cordova.js
	-rm enimax-chrome-extension-v2/www/assets/config.js
	-cp enimax-chrome-extension-v2/manifest-v2.json enimax-chrome-extension-v2/manifest.json
	echo 'var config = {"local": localStorage.getItem("local") === "true", "remote": localStorage.getItem("remote"),"remoteWOport": localStorage.getItem("remoteWOport"), "chrome": true, "manifest": "v2", "firefox": false, "beta": false, "sockets": false}; localStorage.setItem("version", "1.3.0");if (localStorage.getItem("lastUpdate") === null) { localStorage.setItem("lastUpdate", "0");}' > enimax-chrome-extension-v2/www/assets/js/config.js

chrome3:
	make ts
	rm enimax-chrome-extension/www -rf
	cp www enimax-chrome-extension -r
	touch enimax-chrome-extension/www/cordova.js
	-rm enimax-chrome-extension/www/assets/config.js
	-cp enimax-chrome-extension/manifest-v3.json enimax-chrome-extension/manifest.json
	echo 'var config = {"local": localStorage.getItem("local") === "true", "remote": localStorage.getItem("remote"),"remoteWOport": localStorage.getItem("remoteWOport"), "chrome": true, "manifest": "v3", "firefox": false, "beta": false, "sockets": false}; localStorage.setItem("version", "1.3.0");if (localStorage.getItem("lastUpdate") === null) {localStorage.setItem("lastUpdate", "0");}' > enimax-chrome-extension/www/assets/js/config.js

firefox:
	make ts
	rm enimax-firefox-extension/www -rf
	cp www enimax-firefox-extension -r
	touch enimax-firefox-extension/www/cordova.js
	-rm enimax-firefox-extension/www/assets/config.js
	echo 'var config = {"local": localStorage.getItem("local") === "true", "remote": localStorage.getItem("remote"),"remoteWOport": localStorage.getItem("remoteWOport"), "chrome": true, "manifest": "v3", "firefox": true, "beta": false, "sockets": false}; localStorage.setItem("version", "1.3.0");if (localStorage.getItem("lastUpdate") === null) {localStorage.setItem("lastUpdate", "0");}' > enimax-firefox-extension/www/assets/js/config.js
	rm enimax-firefox-extension/www/tsconfig.json

ts:
	-rm www -rf
	cp src www -r
	-cd src && tsc -p tsconfig.json
	cd www/extensions/anime && printf "\n" >> index.js && cat wco.js >> ../index.js
	cd www/extensions/anime && printf "\n" >> index.js && cat animixplay.js >> ../index.js
	cd www/extensions/tv && printf "\n" >> index.js && cat fmovies.js >> ../index.js
	cd www/extensions/anime && printf "\n" >> index.js && cat zoro.js >> ../index.js
	cd www/extensions/others && printf "\n" >> index.js && cat twitch.js >> ../index.js
	cd www/extensions/others && printf "\n" >> index.js && cat anna.js >> ../index.js
	cd www/extensions/others && printf "\n" >> index.js && cat anilist.js >> ../index.js
	cd www/extensions/anime && printf "\n" >> index.js && cat 9anime.js >> ../index.js
	cd www/extensions/tv && printf "\n" >> index.js && cat fmoviesto.js >> ../index.js
	cd www/extensions/anime && printf "\n" >> index.js && cat gogo.js >> ../index.js
	cd www/extensions/manga && printf "\n" >> index.js && cat mangadex.js >> ../index.js
	cd www/extensions/manga && printf "\n" >> index.js && cat mangafire.js >> ../index.js
	cd www/extensions/tv && printf "\n" >> index.js && cat viewasian.js >> ../index.js
	cd www/extensions && printf "\n" >> index.js && cat export.js >> index.js
