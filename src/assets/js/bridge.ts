let playerIFrame = document.getElementById("player") as HTMLIFrameElement;
let mainIFrame = document.getElementById("frame") as HTMLIFrameElement;
let thisWindow = (window as unknown as cordovaWindow);
var socket;
let frameHistory: Array<string> = [];
var token;
let seekCheck = true;
let backFunction: Function;
let castSession = null;
let lastRequestTime = 0;
function isCasting() {
    try {
        if (castSession && "status" in castSession) {
            return castSession.status == "connected";
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
}

function updateCastTime(time: string) {
    try {
        const currentTime = parseFloat(time);
        const seekObj = new thisWindow.chrome.cast.media.SeekRequest;
        seekObj.currentTime = currentTime;
        castSession.media[0].seek(seekObj);
    } catch (err) {
        console.error(err);
    }
}

function getCurrentCastState() {
    return {
        paused: castSession.media[0].playerState === thisWindow.chrome.cast.media.PlayerState.PAUSED,
        currentTime: castSession.media[0].currentTime,
        duration: castSession.media[0].media.duration,
        hasFinished: castSession.media[0].idleReason === thisWindow.chrome.cast.media.IdleReason.FINISHED
    };
}

function castStateUpdated() {
    try {
        const currentState = getCurrentCastState();
        playerIFrame.contentWindow.postMessage({
            action: "castStateUpdated",
            data: currentState
        }, "*");
    } catch (err) {
        console.error(err);
    }
}

function getEstimatedState() {
    try {
        return {
            paused: castSession.media[0].playerState === thisWindow.chrome.cast.media.PlayerState.PAUSED,
            currentTime: castSession.media[0].getEstimatedTime(),
            duration: castSession.media[0].media.duration
        };
    } catch (err) {
        return undefined;
    }
}

function toggleCastState() {
    const media = castSession.media[0];
    if (media.playerState === thisWindow.chrome.cast.media.PlayerState.PAUSED) {
        media.play();
    } else {
        media.pause();
    }
}

function fixTitle(title: string, extension?: extension) {
    try {
        if (extension && "fixTitle" in extension) {
            title = extension.fixTitle(title);
        }

        let titleArray = title.split("-");
        let temp = "";
        for (var i = 0; i < titleArray.length; i++) {
            temp = temp + titleArray[i].substring(0, 1).toUpperCase() + titleArray[i].substring(1) + " ";
        }
        return temp;
    } catch (err) {
        return title;
    }
}

function destroySession() {
    return new Promise((resolve, reject) => {
        try {
            if (castSession && "stop" in castSession) {
                castSession.stop(() => {
                    resolve(true);
                }, () => {
                    resolve(false);
                });
            } else {
                resolve(false);
            }
        } catch (err) {
            resolve(false);
        }
    });
}
function startServer() {
    return new Promise((resolve, reject) => {
        thisWindow.webserver.start((x) => {
            resolve(x);
        }, (err) => {
            if (err === "Server already running") {
                resolve("running");
            } else {
                reject(err);
            }
        }, 56565);
    });
}

async function setUpWebServer() {
    await startServer();

    thisWindow.webserver.onRequest(async (request: cordovaServerRequest) => {

        console.log(request);

        lastRequestTime = Date.now();
        const requestResponse = {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": "*"
            }
        }

        try {
            const isMP4 = request.path.endsWith(".mp4");

            if (isMP4) {
                requestResponse.headers["Content-Type"] = "video/mp4";
            }

            requestResponse["path"] = `${thisWindow.cordova.file.externalDataDirectory}${request.path}`.replace("file://", "");
            if (isMP4) {
                requestResponse["path"] = requestResponse["path"].substring(
                    0,
                    requestResponse["path"].length - 4
                ) + ".m3u8";
            }

        } catch (err) {
            requestResponse.status = 400;
            requestResponse["body"] = "An unexpected error has occurred.";
        }

        thisWindow.webserver.sendResponse(request.requestId, requestResponse, () => { }, () => { })
    });
}

function killServer() {
    return new Promise((resolve, reject) => {
        thisWindow.webserver.stop((x) => {
            resolve(x);
        }, (x) => {
            reject(x);
        });
    });
}


function castVid(data, requiresWebServer: boolean) {
    console.log(data, requiresWebServer);

    return new Promise(async (resolve, reject) => {
        try {
            if (requiresWebServer) {
                await setUpWebServer();
            }
        } catch (err) {
            sendNoti([3, "red", "Alert", "Could not start the webserver, or the webserver wasn't killed. The video may not play."]);
        }

        try {
            if (castSession?.status === thisWindow.chrome.cast.SessionStatus.CONNECTED) {
                onSessionRequestSuccess(castSession, data);
                resolve(true);
            } else {
                thisWindow.chrome.cast.requestSession((session) => {
                    onSessionRequestSuccess(session, data);
                    resolve(true);
                }, () => {
                    alert("Could not cast the video. Try again.");
                    resolve(false);
                });
            }

        } catch (err) {
            resolve(false);
        }
    });
}


function returnExtensionList() {
    return extensionList;
}

function returnExtensionDisabled() {
    return extensionDisabled;
}

function returnExtensionNames() {
    return extensionNames;
}

function returnExtensionTypes() {
    return extensionTypes;
}

function setGradient() {
    let bgGradient = parseInt(localStorage.getItem("themegradient"));
    if (bgGradient) {
        document.documentElement.style.setProperty('--theme-gradient', backgroundGradients[bgGradient]);
    } else {
        document.documentElement.style.setProperty('--theme-gradient', backgroundGradients[0]);
    }
}

function updateGradient(index: string) {
    localStorage.setItem("themegradient", index);
    setGradient();
}

function setOpacity() {
    let bgOpacity = parseFloat(localStorage.getItem("bgOpacity"));
    if (bgOpacity == 0 || bgOpacity) {
        document.getElementById("bgOpacity").style.backgroundColor = `rgba(0,0,0, ${bgOpacity})`;
    } else {
        document.getElementById("bgOpacity").style.backgroundColor = `rgba(0,0,0,0.6)`;
    }
}

function updateOpacity(value: string) {
    localStorage.setItem("bgOpacity", value);
    setOpacity();
}

// todo
// @ts-ignore
function updateImage() {
    if (localStorage.getItem("useImageBack") === "true") {
        let backgroundBlur = parseInt(localStorage.getItem("backgroundBlur"));
        document.getElementById("bgGrad").style.filter = `blur(${isNaN(backgroundBlur) ? 0 : backgroundBlur}px)`;
        document.getElementById("bgGrad").style.backgroundImage = `url("${thisWindow.cordova.file.externalDataDirectory}background.png?v=${(new Date()).getTime()}")`;
    } else {
        document.getElementById("bgGrad").style.backgroundImage = `var(--theme-gradient)`;
        document.getElementById("bgGrad").style.filter = `none`;
        setGradient();
    }
}

function updateBackgroundBlur() {
    if (localStorage.getItem("useImageBack") === "true") {
        let backgroundBlur = parseInt(localStorage.getItem("backgroundBlur"));
        document.getElementById("bgGrad").style.filter = `blur(${isNaN(backgroundBlur) ? 0 : backgroundBlur}px)`;
    } else {
        document.getElementById("bgGrad").style.filter = `none`;
    }
}

function findLastNotEpisode() {
    let isSearch = false;
    let searchParams = "";

    for (let i = frameHistory.length - 1; i >= 0; i--) {
        const url = frameHistory[i];
        if (!url.includes("pages/episode/index.html")) {
            if (url.includes("pages/search/index.html")) {
                isSearch = true;

                try {
                    searchParams = (new URL(url)).search;
                } catch (err) {
                    console.warn(err);
                }
            }
            break;
        }
    }

    return [isSearch, searchParams];
}

function setURL(url: string) {
    const isHome = url.includes("pages/homepage/index.html");

    if (isHome) {
        frameHistory = [];
    }

    mainIFrame.style.opacity = "0";
    mainIFrame.style.transform = "scale(0.95, 0.95)";
    setTimeout(function () {
        mainIFrame.contentWindow.location = url;
        mainIFrame.style.transform = "scale(1.05, 1.05)";
        setTimeout(function () {
            mainIFrame.style.transform = "scale(1, 1)";
            mainIFrame.style.opacity = "1";
        }, 200);
    }, 200);
}


function saveAsImport(arrayInt: ArrayBuffer) {
    try {
        let blob = new Blob([arrayInt]);
        db.close(async function () {
            thisWindow.resolveLocalFileSystemURL(`${thisWindow.cordova.file.applicationStorageDirectory}${"databases"}`, function (fileSystem: DirectoryEntry) {

                fileSystem.getFile("data4.db", { create: true, exclusive: false }, function (file: FileEntry) {

                    file.createWriter(function (fileWriter) {

                        fileWriter.onwriteend = function (e) {
                            alert("Done!");
                            window.location.reload();

                        };

                        fileWriter.onerror = function (e) {
                            alert("Couldn't write to the file - 2.");
                            window.location.reload();

                        };


                        fileWriter.write(blob);

                    }, (err: Error) => {
                        alert("Couldn't write to the file.");
                        window.location.reload();

                    });


                }, function (error: Error) {
                    alert("Error opening the database file.");

                    window.location.reload();



                });

            }, function (error: Error) {
                alert("Error opening the database folder.");
                window.location.reload();

            });
        }, function (error: Error) {
            alert("Error closing the database.");
            window.location.reload();

        });
    } catch (err) {
        alert("Error getting the database variable.");
        window.location.reload();

    }

}

function saveImage(arrayInt: ArrayBuffer) {
    let blob = new Blob([arrayInt]);
    thisWindow.resolveLocalFileSystemURL(`${thisWindow.cordova.file.externalDataDirectory}`, function (fileSystem: DirectoryEntry) {

        fileSystem.getFile("background.png", { create: true, exclusive: false }, function (file: FileEntry) {

            file.createWriter(function (fileWriter: FileWriter) {

                fileWriter.onwriteend = function (e) {
                    thisWindow.updateImage();
                    alert("Done!");

                };

                fileWriter.onerror = function (e) {
                    alert("Couldn't write to the file - 2.");

                };


                fileWriter.write(blob);

            }, (err) => {
                alert("Couldn't write to the file.");

            });


        }, function (x) {
            alert("Error opening the database file.");

        });

    }, function (error: Error) {
        alert("Error opening the database folder.");

    });
}

function listDir(path: string) {

    return (new Promise((resolve, reject) => {
        thisWindow.resolveLocalFileSystemURL(`${thisWindow.cordova.file.externalDataDirectory}${path}`,
            function (fileSystem: DirectoryEntry) {
                var reader = fileSystem.createReader();
                reader.readEntries(
                    function (entries) {
                        resolve(entries);
                    },
                    function (err) {
                        reject(err);

                    }
                );
            }, function (err: Error) {
                reject(err);
            }
        );
    }));

}

async function saveAs(fileSys: DirectoryEntry, fileName: string, blob: Blob) {
    fileSys.getFile(fileName, { create: true, exclusive: false }, function (file) {

        file.createWriter(function (fileWriter) {

            fileWriter.onerror = function (e) {
                console.error(e);
            };

            fileWriter.write(blob);

        }, (err) => {
            console.error(err);
        });

    }, function (x) {
        console.error(x);
    });
}


let downloadQueueInstance: downloadQueue;

function returnDownloadQueue(): downloadQueue {
    return downloadQueueInstance;
}

let notiCount = 0;
mainIFrame.onload = function () {
    mainIFrame.style.opacity = "1";

    if (frameHistory.length === 0) {
        frameHistory.push(mainIFrame.contentWindow.location.href);
    }
    else if (frameHistory[frameHistory.length - 1] != mainIFrame.contentWindow.location.href) {
        frameHistory.push(mainIFrame.contentWindow.location.href);

    }
};

// todo
// @ts-ignore
function sendNoti(x) {
    return new notification(document.getElementById("noti_con"), {
        "perm": x[0],
        "color": x[1],
        "head": x[2],
        "notiData": x[3]
    });
}

async function MakeCusReq(url: string, options: RequestOption) {
    return new Promise(function (resolve, reject) {
        (thisWindow.cordova.plugin.http as HTTP).sendRequest(url, options, function (response) {
            resolve(response.data);
        }, function (response) {
            reject(response.error);
        });
    });
}

// @ts-ignore
// todo
async function MakeFetch(url: string, options = {}): Promise<string> {
    return new Promise(function (resolve, reject) {
        fetch(url, options).then(response => response.text()).then((response: string) => {
            resolve(response);
        }).catch(function (err) {
            reject(new Error(`${err.message}: ${url}`));
        });
    });
}

if (config.chrome) {
    playerIFrame.onload = function () {
        if ((playerIFrame as HTMLIFrameElement).contentWindow.location.href.includes("www/fallback.html")) {
            playerIFrame.style.display = "none";
            mainIFrame.style.height = "100%";
            mainIFrame.style.display = "block";
        }
    };
}


function updateTheme() {
    try {
        document.querySelector(`meta[name="theme-color"]`).setAttribute("content", localStorage.getItem("themecolor"));
    } catch (err) {
        console.error(err);
    }
}

function makeLocalRequest(method: string, url: string, responseType?: "blob"): Promise<string> {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();

        if (responseType) {
            xhr.responseType = responseType;
        }

        xhr.open(method, url);

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: xhr.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}

function removeDirectory(url: string) {
    return new Promise(function (resolve, reject) {
        thisWindow.resolveLocalFileSystemURL(thisWindow.cordova.file.externalDataDirectory, function (fs: DirectoryEntry) {
            fs.getDirectory(url, { create: false, exclusive: false }, function (directory: DirectoryEntry) {
                directory.removeRecursively(function () {
                    resolve("done");
                },
                    function (err: Error) {
                        reject(err);
                    });
            }, function (err: Error) {
                reject(err);
            })
        }, function (err: Error) {
            reject(err);
        });
    });
}

function executeAction(message: MessageAction, reqSource: Window) {

    if (message.action == 1) {
        screen.orientation.lock(message.data).then(() => { }).catch(() => { });
    }
    else if (message.action == 3) {
        window.location = message.data;
    }
    else if (message.action == 5) {

        let currentEngine;
        let temp3 = message.data.split("&engine=");
        if (temp3.length == 1) {
            currentEngine = wco;
        } else {
            currentEngine = parseInt(temp3[1]);
            if (currentEngine == 0) {
                currentEngine = extensionList[0];
            } else {
                currentEngine = extensionList[currentEngine];
            }
        }
        currentEngine.getLinkFromUrl(temp3[0]).then(function (x) {
            x.action = 1;
            reqSource.postMessage(x, "*");
        }).catch(function (err) {
            sendNoti([0, null, "Message", err.message]);
            message.action = 1;
            console.error(err);
            reqSource.postMessage(err, "*");
        });

    }
    else if (message.action == 11) {
        // @ts-ignore
        PictureInPicture.enter(480, 270, function () { });
    }
    else if (message.action == 15) {
        if (!config.chrome) {
            // @ts-ignore
            MusicControls.updateIsPlaying(true);
        }
    }
    else if (message.action == 400) {
        screen.orientation.lock("any").then(() => { }).catch(() => { });
        playerIFrame.classList.add("pop");
        mainIFrame.style.height = "calc(100% - 200px)";
        mainIFrame.style.display = "block";
        playerIFrame.style.display = "block";
    }
    else if (message.action == 401) {
        screen.orientation.lock("landscape").then(() => { }).catch(() => { });
        playerIFrame.classList.remove("pop");
        mainIFrame.style.height = "100%";
        mainIFrame.style.display = "none";
        playerIFrame.style.display = "block";

    }
    else if (message.action == 16) {
        if (!config.chrome) {
            // @ts-ignore
            MusicControls.updateIsPlaying(false);
        }
    }
    else if (message.action == 20) {
        let toSend;

        if (config.chrome) {
            toSend = "";
        } else {
            toSend = thisWindow.cordova.plugin.http.getCookieString(config.remoteWOport);
        }
        reqSource.postMessage({
            "action": 200,
            "data": toSend
        }, "*");
    }
    else if (message.action == 403) {
        downloadQueueInstance.add(
            message.data,
            message.anime,
            message.mainUrl,
            message.title,
            downloadQueueInstance
        );
    }
    else if (message.action == 21) {
        window.location.href = "pages/login/index.html";
    }
    else if (message.action == 402) {
        updateTheme();
    }
    else if (message.action == 500) {
        setURL(message.data);
    }
    else if (message.action == 501) {
        if (frameHistory[frameHistory.length - 1] != mainIFrame.contentWindow.location.href) {
            frameHistory.push(mainIFrame.contentWindow.location.href);
        }
    }
    else if (message.action == 22) {
        window.location.href = "pages/reset/index.html";
    }
    else if (message.action == 26) {
        window.location.href = "pages/settings/index.html";
    }
    else if (message.action == 301 && config.beta && seekCheck) {
        // @ts-ignore
        MusicControls.updateElapsed({
            elapsed: message.elapsed * 1000,
            isPlaying: message.isPlaying
        });
    }
    else if (message.action == 12) {
        if (!config.chrome) {

            let showName = message.nameShow.split("-");

            for (let i = 0; i < showName.length; i++) {
                let temp = showName[i];
                temp = temp.charAt(0).toUpperCase() + temp.slice(1);
                showName[i] = temp;

            }
            seekCheck = true;
            message.nameShow = showName.join(" ");
            const controlOption = {
                track: message.nameShow,
                artist: "Episode " + message.episode,
                cover: 'assets/images/anime.png',
                isPlaying: true,							// optional, default : true
                dismissable: true,							// optional, default : false
                hasPrev: message.prev,
                hasNext: message.next,
                hasClose: true,
                playIcon: 'media_play',
                pauseIcon: 'media_pause',
                prevIcon: 'media_prev',
                nextIcon: 'media_next',
                closeIcon: 'media_close',
                notificationIcon: 'notification'
            };

            if (config.beta) {
                controlOption["hasScrubbing"] = true;
                controlOption["duration"] = message.duration ? message.duration * 1000 : 0;
                controlOption["elapsed"] = message.elapsed ? message.elapsed : 0;
            }

            // @ts-ignore
            MusicControls.create(controlOption, () => { }, () => { });

            function events(action) {

                const message = JSON.parse(action).message;
                switch (message) {
                    case 'music-controls-next':
                        playerIFrame.contentWindow.postMessage({ "action": "next" }, "*");
                        break;
                    case 'music-controls-previous':
                        playerIFrame.contentWindow.postMessage({ "action": "previous" }, "*");
                        break;
                    case 'music-controls-pause':
                        playerIFrame.contentWindow.postMessage({ "action": "pause" }, "*");
                        break;
                    case 'music-controls-play':
                        playerIFrame.contentWindow.postMessage({ "action": "play" }, "*");
                        break;
                    case 'music-controls-media-button-play':
                        playerIFrame.contentWindow.postMessage({ "action": "play" }, "*");
                        break;
                    case 'music-controls-media-button-pause':
                        playerIFrame.contentWindow.postMessage({ "action": "pause" }, "*");
                        break;
                    case 'music-controls-media-button-previous':
                        playerIFrame.contentWindow.postMessage({ "action": "previous" }, "*");
                        break;
                    case 'music-controls-media-button-next':
                        playerIFrame.contentWindow.postMessage({ "action": "next" }, "*");
                        break;
                    case 'music-controls-destroy':
                        seekCheck = false;
                        break;
                    case 'music-controls-toggle-play-pause':
                        playerIFrame.contentWindow.postMessage({ "action": "toggle" }, "*");
                        break;
                    case 'music-controls-media-button':
                        break;
                    case 'music-controls-headset-unplugged':
                        playerIFrame.contentWindow.postMessage({ "action": "pause" }, "*");
                        break;
                    case 'music-controls-headset-plugged':
                        break;
                    case 'music-controls-seek-to':
                        playerIFrame.contentWindow.postMessage({ "action": "elapsed", "elapsed": (JSON.parse(action).position) / 1000 }, "*");
                        break;
                    default:
                        break;
                }
            }

            // @ts-ignore
            MusicControls.subscribe(events);

            // @ts-ignore
            MusicControls.listen();

            // @ts-ignore
            MusicControls.updateIsPlaying(true);
        }
    }
    else if (message.action == 4) {
        let isManga = false;
        let pageName = "player";

        console.log(message.data);
        try {
            const search = new URLSearchParams(message.data);
            const engine = search.get("engine");
            const paramManga = search.get("isManga");
            isManga = paramManga === "true";

            if (extensionTypes[engine] === "manga") {
                isManga = true;
            }
        } catch (err) {
            console.warn(err);
        }

        if (isManga) {
            pageName = "reader";
        }

        if (config.chrome && playerIFrame.contentWindow.location.href.includes("/www/fallback.html")) {
            playerIFrame.contentWindow.location = (`pages/${pageName}/index.html` + message.data);
        } else if (config.chrome) {
            playerIFrame.contentWindow.location.replace(`pages/${pageName}/index.html` + message.data);
        }

        if (!config.chrome) {

            enableFullScreen();

            let checkLock = 0;

            setTimeout(function () {
                if (checkLock == 0) {
                    playerIFrame.contentWindow.location.replace(`pages/${pageName}/index.html` + message.data);
                }
            }, 100);

            if (!isManga) {
                screen.orientation.lock("landscape")
                    .then(() => { })
                    .catch(() => { })
                    .finally(function () {
                        checkLock = 1;
                        (playerIFrame as HTMLIFrameElement).contentWindow.location.replace(`pages/${pageName}/index.html` + message.data);
                    });
            } else {
                checkLock = 1;
                (playerIFrame as HTMLIFrameElement).contentWindow.location.replace(`pages/${pageName}/index.html` + message.data);
            }
        }

        mainIFrame.style.display = "none";
        mainIFrame.style.height = "100%";
        playerIFrame.style.display = "block";
        playerIFrame.classList.remove("pop");
    }
    else if (message.action == "updateGrad") {
        updateGradient(parseInt(message.data).toString());
    }
    else if (message.action == "updateOpacity") {
        updateOpacity(parseFloat(message.data).toString());
    }
    else if (message.action == "updateImage") {
        updateImage();
    }
}

window.addEventListener('message', function (x) {
    executeAction(x.data, x.source as WindowProxy);
});


function onPause() {
    let frameLocation = playerIFrame.contentWindow.location.pathname;

    if (frameLocation.includes("pages/player")) {
        playerIFrame.contentWindow.postMessage({ action: "pip" }, "*");
    }
}

function onResume() {
    let frameLocation = playerIFrame.contentWindow.location.pathname;

    if (frameLocation.includes("pages/player")) {
        playerIFrame.contentWindow.postMessage({ action: "pipout" }, "*");
    }

    if (localStorage.getItem("fullscreenMode") === "true") {
        // disableFullScreen(10);
    }

}


function back() {
    backFunction();
}

function disableFullScreen(count = 1) {
    // @ts-ignore
    AndroidFullScreen.showSystemUI(() => { }, () => { });
}

function enableFullScreen() {
    // @ts-ignore
    AndroidFullScreen.immersiveMode(() => { }, () => { });
}

function handleFullscreen() {
    if (config.chrome) {
        return;
    }

    if (localStorage.getItem("fullscreenMode") === "true") {
        // @ts-ignore
        disableFullScreen();
    } else {
        // @ts-ignore
        enableFullScreen();
    }
}

function getLocalIP() {
    return new Promise(function (resolve, reject) {
        // @ts-ignore
        networkinterface.getWiFiIPAddress(resolve, reject);
    });
}


function onSessionRequestSuccess(session, data) {


    castSession = session;

    const mediaInfo = new thisWindow.chrome.cast.media.MediaInfo(
        data.url,
        data.type
    );

    const request = new thisWindow.chrome.cast.media.LoadRequest(mediaInfo);
    session.loadMedia(request, () => {
        try {
            castSession._getMedia().seek({ currentTime: data.currentTime });
            castSession.media[0].addUpdateListener(castStateUpdated);
        } catch (err) {
            console.error(err);
            alert("Could not seek");
        }
    }, (err) => {
        console.error(err);
        alert("Could not load the video");
    });
}

async function onDeviceReady() {

    handleFullscreen();

    await SQLInit();
    await SQLInitDownloaded();

    updateImage();
    updateBackgroundBlur();

    thisWindow.cordova.plugins.backgroundMode.on('activate', function () {
        thisWindow.cordova.plugins.backgroundMode.disableWebViewOptimizations();
        thisWindow.cordova.plugins.backgroundMode.disableBatteryOptimizations();
    });


    const initializeCastApi = function () {

        const sessionRequest = new thisWindow.chrome.cast.SessionRequest(
            thisWindow.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
        );

        const apiConfig = new thisWindow.chrome.cast.ApiConfig(
            sessionRequest,
            () => { },
            receiverListener
        );

        thisWindow.chrome.cast.initialize(apiConfig, () => { }, () => { });
    };

    function receiverListener(availability) {
        console.log('receiverListener', availability);

        if (availability === thisWindow.chrome.cast.ReceiverAvailability.AVAILABLE) {

        }
    }

    initializeCastApi();


    token = thisWindow.cordova.plugin.http.getCookieString(config.remoteWOport);
    downloadQueueInstance = new downloadQueue();
    mainIFrame.src = "pages/homepage/index.html";

    backFunction = function onBackKeyDown() {
        try {
            // @ts-ignore
            if (playerIFrame.contentWindow.isLocked() === true) {
                return;
            }
        } catch (err) {
            console.error(err);
        }

        let frameLocation = mainIFrame.contentWindow.location;

        const frameWasOpen = playerIFrame.className.indexOf("pop") == -1
            && ((playerIFrame as HTMLIFrameElement).contentWindow.location.pathname.includes("www/pages/player/index.html")
                || (playerIFrame as HTMLIFrameElement).contentWindow.location.pathname.includes("www/pages/reader/index.html"));

        const homePageOpen = frameLocation.pathname.indexOf("www/pages/homepage/index.html") > -1;
        if (homePageOpen || frameWasOpen) {

            if (!config.chrome && localStorage.getItem("fullscreenMode") === "true") {
                disableFullScreen();
            }

            playerIFrame.contentWindow.location.replace("fallback.html");
            playerIFrame.classList.remove("pop");
            playerIFrame.style.display = "none";
            mainIFrame.style.display = "block";
            mainIFrame.style.height = "100%";

            if (frameWasOpen) {
                if (homePageOpen) {
                    (mainIFrame as HTMLIFrameElement).contentWindow.location.reload();
                }
            } else {
                if (frameLocation.pathname.indexOf("www/pages/homepage/index.html") > -1) {

                    if (frameLocation.search.includes("action=")) {
                        history.back();
                    } else if (!(playerIFrame as HTMLIFrameElement).contentWindow.location.pathname.includes("www/pages/player/index.html")) {
                        // @ts-ignore
                        navigator.app.exitApp();
                    }
                }
            }


            // @ts-ignore
            MusicControls.destroy(() => { }, () => { });

            screen.orientation.lock("any").then(() => { }).catch(() => { });
        } else {
            if (frameHistory.length > 1) {
                frameHistory.pop();
                setURL(frameHistory[frameHistory.length - 1]);
            }
        }
    }

    if (thisWindow.cordova.plugin.http.getCookieString(config.remoteWOport).indexOf("connect.sid") == -1
        && config.local == false && localStorage.getItem("offline") === 'false') {
        window.location.href = "pages/login/index.html";
    }

    document.addEventListener("backbutton", () => { backFunction() }, false);
    document.addEventListener("pause", onPause, false);
    document.addEventListener("resume", onResume, false);

    setInterval(async function () {
        if (!isCasting() || (Date.now() - lastRequestTime) > 3600000) {
            try {
                await killServer();
                console.log("Killed the server");
            } catch (err) {
                console.error(err);
            }
        }
    }, 120000); // 2 minutes
}

document.addEventListener("deviceready", onDeviceReady, false);

if (config.chrome) {
    (mainIFrame as HTMLIFrameElement).src = "pages/homepage/index.html";
}

localStorage.removeItem("pdfjs.history");
updateTheme();
setGradient();
setOpacity();
applyTheme();