#!/bin/sh

cd /usr/src

# Install packages
apt update
apt install wget -y
apt install npm -y
apt install android-sdk -y
npm install n -g
n install 18
hash -r
npm install cordova -g

# Set up android SDK and sdkmanager
export ANDROID_HOME=/usr/lib/android-sdk
wget https://dl.google.com/android/repository/commandlinetools-linux-6609375_latest.zip
unzip commandlinetools-linux-6609375_latest.zip -d cmdline-tools
mkdir --parents "$ANDROID_HOME/cmdline-tools/latest"
mv cmdline-tools/* "$ANDROID_HOME/cmdline-tools/latest/"
export PATH=$ANDROID_HOME/cmdline-tools/latest/tools/bin:$PATH

# Cordova detects java 11 for some reason, even though JAVA_HOME points to java 8
cd /usr/lib/jvm/
rm * -rf

# Install Java, build tools and accept licenses
cd /usr/src
wget https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u372-b07/OpenJDK8U-jdk_x64_linux_hotspot_8u372b07.tar.gz
tar -xf OpenJDK8U-jdk_x64_linux_hotspot_8u372b07.tar.gz
mv jdk8u372-b07 java
export JAVA_HOME=/usr/src/java
sdkmanager --install "build-tools;29.0.3" --sdk_root=/usr/lib/android-sdk
yes | sdkmanager --licenses --sdk_root=/usr/lib/android-sdk

# Start building
git clone https://github.com/enimax-anime/enimax
cd enimax
cordova platform add android@9
cordova build android || sed -i 's/--illegal-access=permit//' ./platforms/android/gradlew && cordova build android

# Why tf is it corrupted
sdkmanager --uninstall "build-tools;29.0.3" --sdk_root=/usr/lib/android-sdk
sdkmanager --install "build-tools;29.0.3" --sdk_root=/usr/lib/android-sdk
yes | sdkmanager --licenses --sdk_root=/usr/lib/android-sdk


# Build again
cordova build android || sed -i 's/--illegal-access=permit//' ./platforms/android/gradlew && cordova build android

# Cleaning up
cd /usr/src
rm OpenJDK8U-jdk_x64_linux_hotspot_8u372b07.tar.gz -f
rm commandlinetools-linux-6609375_latest.zip -f