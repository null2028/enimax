node ./helper/updateVersion.js $1
make ts

make chrome3
cd enimax-chrome-extension
git update-ref -d HEAD
git add . && git commit -m "Updated to $1" && git push --force
cd ..

make chrome2
cd enimax-chrome-extension-v2
git update-ref -d HEAD
git add . && git commit -m "Updated to $1" && git push --force
cd ..

make firefox
cd enimax-firefox-extension
git update-ref -d HEAD
git add . && git commit -m "Updated to $1" && git push --force
../build.sh
cd ..
node ./helper/release-firefox.js