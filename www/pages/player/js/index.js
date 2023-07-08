var _a;
var CustomXMLHttpRequest = XMLHttpRequest;
var shouldReplace = false;
var engine;
const isChrome = config.chrome;
var username = "hi";
// @ts-ignore
const extensionList = window.parent.returnExtensionList();
let hls;
let doubleTapTime = isNaN(parseInt(localStorage.getItem("doubleTapTime"))) ? 5 : parseInt(localStorage.getItem("doubleTapTime"));
let skipButTime = isNaN(parseInt(localStorage.getItem("skipButTime"))) ? 30 : parseInt(localStorage.getItem("skipButTime"));
let currentVidData;
let skipIntroInfo = {
    start: 0,
    end: 0
};
let selectedMain = null;
let curTrack = undefined;
let marginApplied = false;
let updateCurrentTime, getEpCheck, lastUpdate, updateCheck, int_up;
let isPlayingLocally = false;
let engineTemp = location.search.split("engine=");
let nextTrackTime;
let downloaded = localStorage.getItem("offline") === 'true';
let fMode = parseInt(localStorage.getItem("fillMode"));
let errorCount = 0;
let vidInstance;
let subtitleConfig = {
    backgroundColor: localStorage.getItem("subtitle-bgColor"),
    backgroundOpacity: parseInt(localStorage.getItem("subtitle-bgOpacity")),
    fontSize: parseInt(localStorage.getItem("subtitle-fontSize")),
    color: localStorage.getItem("subtitle-color"),
    lineHeight: parseInt(localStorage.getItem("subtitle-lineHeight")),
    shadowColor: localStorage.getItem("subtitle-shadowColor")
};
let lastFragError = -10;
let lastFragDuration = 0;
let fragErrorCount = 0;
let hasLoadedEpList = false;
let loadsLocally = false;
let remoteInterval = null;
let castingMode = false;
let shouldUpdateSlider = true;
function applySubtitleConfig() {
    let subtitleStyle = document.getElementById("subtitleStyle");
    while (subtitleStyle.sheet.cssRules.length > 0) {
        subtitleStyle.sheet.deleteRule(0);
    }
    let subtitleStyleString = ``;
    let opacity = 255;
    if (!isNaN(subtitleConfig.backgroundOpacity)) {
        opacity = subtitleConfig.backgroundOpacity;
    }
    let opacityHex = opacity.toString(16);
    if (opacityHex.length == 1) {
        opacityHex = `0${opacityHex}`;
    }
    if (subtitleConfig.backgroundColor) {
        subtitleStyleString += `background-color: ${subtitleConfig.backgroundColor}${opacityHex};`;
    }
    else if (!isNaN(subtitleConfig.backgroundOpacity)) {
        subtitleStyleString += `background-color: #000000${opacityHex};`;
    }
    if (subtitleConfig.shadowColor) {
        subtitleStyleString += `text-shadow: 2px 2px ${subtitleConfig.shadowColor};`;
    }
    if (!isNaN(subtitleConfig.fontSize)) {
        subtitleStyleString += `font-size: ${subtitleConfig.fontSize}px;`;
    }
    if (!isNaN(subtitleConfig.lineHeight)) {
        subtitleStyleString += `line-height: ${subtitleConfig.lineHeight}px;`;
    }
    if (subtitleConfig.color) {
        subtitleStyleString += `color: ${subtitleConfig.color};`;
    }
    subtitleStyle.sheet.insertRule(`::cue{
		${subtitleStyleString}
	}`);
}
let DMenu = new dropDownMenu([
    {
        "id": "initial",
        "heading": {
            "text": "Settings",
        },
        "items": [
            {
                "text": "Quality",
                "iconID": "qualIcon",
                "open": "quality"
            },
            {
                "text": "Sources",
                "iconID": "sourceIcon",
                "open": "source"
            },
            {
                "text": "Subtitles",
                "iconID": "subIcon",
                "open": "subtitles"
            },
            {
                "text": "Subtitle options",
                "iconID": "subIcon",
                "open": "subtitlesOptions"
            },
            {
                "text": "Episodes",
                "iconID": "episodesIcon",
                "open": "episodes"
            },
            {
                "text": "Fill Mode",
                "iconID": "fillIcon",
                "open": "fillmode"
            },
            {
                "text": "Config",
                "iconID": "configIcon",
                "open": "config"
            }
        ]
    },
    {
        "id": "quality",
        "selectableScene": true,
        "heading": {
            "text": "Quality",
        },
        "items": []
    },
    {
        "id": "episodes",
        "selectableScene": true,
        "scrollIntoView": true,
        "heading": {
            "text": "Episodes",
        },
        "items": []
    },
    {
        "id": "subtitles",
        "selectableScene": true,
        "heading": {
            "text": "Subtitles",
        },
        "items": []
    },
    {
        "id": "subtitlesOptions",
        "selectableScene": true,
        "heading": {
            "text": "Subtitle Options",
        },
        "items": [
            {
                "text": "Background Color",
                "attributes": {
                    style: "width: 100%"
                },
                "classes": ["inputItem"],
                "color": true,
                "value": localStorage.getItem("subtitle-bgColor"),
                "onInput": function (event) {
                    let target = event.target;
                    localStorage.setItem("subtitle-bgColor", target.value);
                    subtitleConfig.backgroundColor = target.value;
                    applySubtitleConfig();
                }
            },
            {
                "text": "Shadow Color",
                "attributes": {
                    style: "width: 100%"
                },
                "classes": ["inputItem"],
                "color": true,
                "value": (_a = localStorage.getItem("subtitle-shadowColor")) !== null && _a !== void 0 ? _a : "transparent",
                "onInput": function (event) {
                    let target = event.target;
                    localStorage.setItem("subtitle-shadowColor", target.value);
                    subtitleConfig.shadowColor = target.value;
                    applySubtitleConfig();
                }
            },
            {
                "text": "Background Transparency",
                "slider": true,
                "sliderConfig": {
                    "max": 255,
                    "min": 0,
                    "step": 1
                },
                "classes": ["inputItem", "sliderMenu"],
                "value": localStorage.getItem("subtitle-bgOpacity"),
                "onInput": function (event) {
                    let target = event.target;
                    localStorage.setItem("subtitle-bgOpacity", target.value);
                    subtitleConfig.backgroundOpacity = parseInt(target.value);
                    applySubtitleConfig();
                }
            },
            {
                "text": "Font Size",
                "textBox": true,
                "classes": ["inputItem"],
                "value": localStorage.getItem("subtitle-fontSize"),
                "onInput": function (event) {
                    let target = event.target;
                    localStorage.setItem("subtitle-fontSize", target.value);
                    subtitleConfig.fontSize = parseInt(target.value);
                    applySubtitleConfig();
                }
            },
            {
                "text": "Font Color",
                "color": true,
                "classes": ["inputItem"],
                "attributes": {
                    style: "width: 100%"
                },
                "value": localStorage.getItem("subtitle-color"),
                "onInput": function (event) {
                    let target = event.target;
                    localStorage.setItem("subtitle-color", target.value);
                    subtitleConfig.color = (target.value);
                    applySubtitleConfig();
                }
            },
            {
                "text": "Spacing",
                "textBox": true,
                "classes": ["inputItem"],
                "attributes": {
                    style: "width: 100%"
                },
                "value": localStorage.getItem("subtitle-lineHeight"),
                "onInput": function (event) {
                    let target = event.target;
                    localStorage.setItem("subtitle-lineHeight", target.value);
                    subtitleConfig.lineHeight = parseInt(target.value);
                    applySubtitleConfig();
                }
            },
            {
                "text": "Subtitle Margin",
                "textBox": true,
                "classes": ["inputItem"],
                "value": isNaN(parseInt(localStorage.getItem("sub-margin"))) ? "0" : parseInt(localStorage.getItem("sub-margin")).toString(),
                "onInput": function (event) {
                    let target = event.target;
                    localStorage.setItem("sub-margin", target.value);
                    setSubtitleMargin(curTrack);
                }
            }
        ]
    },
    {
        "id": "source",
        "selectableScene": true,
        "heading": {
            "text": "Sources",
        },
        "items": []
    },
    {
        "id": "fillmode",
        "selectableScene": true,
        "heading": {
            "text": "Fill Mode",
        },
        "items": [
            {
                "text": "Normal",
                "highlightable": true,
                "selected": fMode == 0,
                "id": "fMode0",
                "callback": () => {
                    vidInstance.setObjectSettings(0);
                }
            },
            {
                "text": "Stretch",
                "highlightable": true,
                "selected": fMode == 1,
                "id": "fMode1",
                "callback": () => {
                    vidInstance.setObjectSettings(1);
                }
            },
            {
                "text": "Subtitles",
                "highlightable": true,
                "selected": fMode == 2,
                "id": "fMode2",
                "callback": () => {
                    vidInstance.setObjectSettings(2);
                }
            },
            {
                "text": "Fill",
                "highlightable": true,
                "selected": fMode == 3,
                "id": "fMode3",
                "callback": () => {
                    vidInstance.setObjectSettings(3);
                }
            }
        ]
    },
    {
        "id": "config",
        "heading": {
            "text": "Configuration",
        },
        "items": [
            {
                "html": "Playback speed <div id=\"playbackDOM\" ></div>",
                "slider": true,
                "sliderConfig": {
                    "max": 5,
                    "min": 0,
                    "step": 0.1
                },
                "classes": ["inputItem", "sliderMenu"],
                "value": localStorage.getItem("playback-speed") ? localStorage.getItem("playback-speed") : "1",
                "onInput": function (event) {
                    const rate = event.target.value;
                    playerDOM.innerText = `(${rate})`;
                    vidInstance.vid.playbackRate = isNaN(parseFloat(rate)) ? 1 : parseFloat(rate);
                    localStorage.setItem("playback-speed", rate);
                }
            },
            {
                "text": "Autoplay",
                "toggle": true,
                "on": localStorage.getItem("autoplay") === "true",
                "toggleOn": function () {
                    localStorage.setItem("autoplay", "true");
                },
                "toggleOff": function () {
                    localStorage.setItem("autoplay", "false");
                }
            },
            {
                "text": "Skip broken segments",
                "toggle": true,
                "on": localStorage.getItem("skipBroken") === "true",
                "toggleOn": function () {
                    localStorage.setItem("skipBroken", "true");
                },
                "toggleOff": function () {
                    localStorage.setItem("skipBroken", "false");
                }
            },
            {
                "text": "Rewatch Mode",
                "toggle": true,
                "on": localStorage.getItem("rewatch") === "true",
                "toggleOn": function () {
                    localStorage.setItem("rewatch", "true");
                },
                "toggleOff": function () {
                    localStorage.setItem("rewatch", "false");
                }
            },
            {
                "text": "Hide Skip Intro",
                "toggle": true,
                "on": localStorage.getItem("showIntro") === "true",
                "toggleOn": function () {
                    localStorage.setItem("showIntro", "true");
                },
                "toggleOff": function () {
                    localStorage.setItem("showIntro", "false");
                }
            },
            {
                "text": "Automatically Skip Intro",
                "toggle": true,
                "on": localStorage.getItem("autoIntro") === "true",
                "toggleOn": function () {
                    localStorage.setItem("autoIntro", "true");
                },
                "toggleOff": function () {
                    localStorage.setItem("autoIntro", "false");
                }
            },
            {
                "text": "Enable PIP when app is minimised",
                "toggle": true,
                "on": localStorage.getItem("autopip") === "true",
                "toggleOn": function () {
                    localStorage.setItem("autopip", "true");
                },
                "toggleOff": function () {
                    localStorage.setItem("autopip", "false");
                }
            },
            {
                "text": "Double Tap Time",
                "textBox": true,
                "value": doubleTapTime.toString(),
                "onInput": function (event) {
                    let target = event.target;
                    if (isNaN(parseInt(target.value))) {
                        target.value = "";
                    }
                    else {
                        localStorage.setItem("doubleTapTime", target.value);
                        doubleTapTime = isNaN(parseInt(localStorage.getItem("doubleTapTime"))) ? 5 : parseInt(localStorage.getItem("doubleTapTime"));
                    }
                }
            },
            {
                "text": "Skip Button Time",
                "textBox": true,
                "value": skipButTime.toString(),
                "onInput": function (event) {
                    let target = event.target;
                    if (isNaN(parseInt(target.value))) {
                        target.value = "";
                    }
                    else {
                        localStorage.setItem("skipButTime", target.value);
                        skipButTime = isNaN(parseInt(localStorage.getItem("skipButTime"))) ? 5 : parseInt(localStorage.getItem("skipButTime"));
                    }
                }
            }
        ]
    }
], document.querySelector(".menuCon"));
function setSubtitleMarginMain(track) {
    let success = -1;
    try {
        let subMargin = parseInt(localStorage.getItem("sub-margin"));
        if (track && "cues" in track) {
            if (!isNaN(subMargin)) {
                for (let j = 0; j < track.cues.length; j++) {
                    success = 1;
                    track.cues[j].line = -subMargin;
                }
            }
            else {
                success = -2;
            }
        }
    }
    catch (err) {
        success = -1;
    }
    return success;
}
function setSubtitleMargin(track, count = 0) {
    let status = setSubtitleMarginMain(track);
    if (status === -1 && count < 20) {
        setTimeout(function () {
            setSubtitleMargin(track, ++count);
        }, 400);
    }
}
// Should be declared before vidInstance is initialised
window.addEventListener("videoStartInterval", () => {
    setInterval(function () {
        if (config.beta) {
            window.parent.postMessage({ "action": 301, "elapsed": vidInstance.vid.currentTime, "isPlaying": !vidInstance.vid.paused }, "*");
        }
        try {
            if (skipIntroInfo && vidInstance.vid.currentTime > skipIntroInfo.start && vidInstance.vid.currentTime < skipIntroInfo.end) {
                if (localStorage.getItem("autoIntro") === "true") {
                    vidInstance.vid.currentTime = skipIntroInfo.end;
                }
                if (localStorage.getItem("showIntro") !== "true") {
                    document.getElementById("skipIntroDOM").style.display = "block";
                }
                else {
                    document.getElementById("skipIntroDOM").style.display = "none";
                }
            }
            else {
                document.getElementById("skipIntroDOM").style.display = "none";
            }
        }
        catch (err) {
        }
        if (((new Date()).getTime() - vidInstance.lastTime) > 3000 && vidInstance.open == 1) {
            vidInstance.close_controls();
        }
    }, 1000);
});
function normalise(url) {
    let engine = 0;
    try {
        const params = new URLSearchParams(url);
        engine = parseInt(params.get("engine"));
        if (engine === 12) {
            url = url.split("&current=")[0];
        }
    }
    catch (err) {
        console.warn(err);
    }
    url = url.replace("?watch=", "");
    url = url.split("&engine=")[0];
    url = url.split("&isManga=")[0];
    return url;
}
// @ts-ignore
function checkIfExists(localURL) {
    return (new Promise(function (resolve, reject) {
        let timeout = setTimeout(function () {
            reject(new Error("timeout"));
        }, 1000);
        window.parent.makeLocalRequest("GET", `${localURL}`).then(function () {
            clearTimeout(timeout);
            resolve("yes");
        }).catch(function (err) {
            clearTimeout(timeout);
            reject(err);
        });
    }));
}
function sendNoti(notiConfig) {
    return new notification(document.getElementById("noti_con"), {
        "perm": notiConfig[0],
        "color": notiConfig[1],
        "head": notiConfig[2],
        "notiData": notiConfig[3]
    });
}
function nextTrack() {
    let curTime = vidInstance.vid.currentTime;
    let check = false;
    for (let i = 0; i < curTrack.cues.length; i++) {
        if (curTrack.cues[i].startTime > curTime) {
            nextTrackTime = curTrack.cues[i].startTime;
            check = true;
            break;
        }
    }
    if (check === false) {
        nextTrackTime = vidInstance.vid.duration;
    }
}
function skipToNextTrack() {
    if (curTrack instanceof TextTrack && !isNaN(Math.floor(nextTrackTime))) {
        vidInstance.vid.currentTime = nextTrackTime - 2;
    }
}
function backToNormal() {
    window.parent.postMessage({ "action": 401 }, "*");
    document.getElementById('pop').style.display = "block";
    document.getElementById('popOut').style.display = "none";
    document.getElementById('bar_con').style.display = "block";
    vidInstance.metaData.style.display = "block";
    vidInstance.popControls.style.display = "block";
    vidInstance.back.style.display = "block";
}
async function getEpIni() {
    vidInstance.setObjectSettings(1, false);
    loadsLocally = false;
    selectedMain = null;
    let param = decodeURIComponent(location.search.replace("?watch=", ""));
    if (downloaded) {
        let rootDir = decodeURIComponent(location.search.replace("?watch=", "").split("&")[0]);
        try {
            // Getting the meta data
            const vidString = await window.parent.makeLocalRequest("GET", `${rootDir}/viddata.json`);
            let viddata = JSON.parse(vidString).data;
            currentVidData = viddata;
            if ("next" in currentVidData && currentVidData.next) {
                let tempData = currentVidData.next.split("&");
                tempData.pop();
                let temp = tempData.join("&");
                delete currentVidData["next"];
                try {
                    await window.parent.makeLocalRequest("GET", `/${rootDir.split("/")[1]}/${btoa(temp)}/.downloaded`);
                    currentVidData.next = encodeURIComponent(`/${rootDir.split("/")[1]}/${btoa(temp)}`);
                    document.getElementById("next_ep").style.display = "table-cell";
                }
                catch (err) {
                }
            }
            if ("prev" in currentVidData && currentVidData.prev) {
                let tempData = currentVidData.prev.split("&");
                tempData.pop();
                let temp = tempData.join("&");
                delete currentVidData["prev"];
                try {
                    await window.parent.makeLocalRequest("GET", `/${rootDir.split("/")[1]}/${btoa(temp)}/.downloaded`);
                    currentVidData.prev = encodeURIComponent(`/${rootDir.split("/")[1]}/${btoa(temp)}`);
                    document.getElementById("prev_ep").style.display = "table-cell";
                }
                catch (err) {
                }
            }
            let skipIntro;
            if ("skipIntro" in viddata.sources[0]) {
                skipIntro = viddata.sources[0].skipIntro;
            }
            currentVidData.sources = [{
                    "name": viddata.sources[0].name,
                    "type": viddata.sources[0].type,
                    "url": viddata.sources[0].type == 'hls' ? `${rootDir}/master.m3u8` : `${window.parent.cordova.file.externalDataDirectory}${rootDir}/master.m3u8`,
                    "castURL": `${rootDir}/master.mp4`
                }];
            if (skipIntro) {
                currentVidData.sources[0].skipIntro = skipIntro;
            }
            engine = currentVidData.engine;
            getEp();
        }
        catch (err) {
            alert(err);
        }
    }
    else {
        window.parent.postMessage({ "action": 5, "data": `${param}` }, "*");
    }
}
function changeEp(nextOrPrev, msg = null) {
    // Discarding all text tracks
    for (var i = 0; i < vidInstance.vid.textTracks.length; i++) {
        vidInstance.vid.textTracks[i].mode = "hidden";
    }
    let newLocation = "";
    if (nextOrPrev == 1 && currentVidData.next) {
        newLocation = "?watch=" + (currentVidData.next);
    }
    else if (nextOrPrev == -1 && currentVidData.prev) {
        newLocation = "?watch=" + (currentVidData.prev);
    }
    else if (nextOrPrev == 0) {
        newLocation = msg;
    }
    if (newLocation) {
        history.replaceState({ page: 1 }, "", newLocation);
        currentVidData = null;
        vidInstance.vid.pause();
        vidInstance.vid.src = "";
        vidInstance.vid.load();
        clearInterval(updateCurrentTime);
        document.getElementById("ep_dis").innerHTML = "loading...";
        document.getElementById("total").innerHTML = "";
        updateEpListSelected();
        ini_main();
    }
}
function ini_main() {
    if (getEpCheck != 1) {
        clearInterval(updateCurrentTime);
        curTrack = undefined;
        document.getElementById("fastFor").style.display = "none";
        updateCurrentTime = 0;
        getEpCheck = 0;
        lastUpdate = 0;
        updateCheck = 0;
        int_up = 3000;
        vidInstance.vid.currentTime = 0;
        getEpIni();
        try {
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                changeEp(1);
            });
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                changeEp(-1);
            });
        }
        catch (error) {
        }
    }
}
async function update(shouldCheck, altCurrentTime, altDuration) {
    let currentTime;
    let currentDuration;
    if (!isNaN(parseFloat(altCurrentTime))) {
        currentTime = parseFloat(altCurrentTime);
    }
    else {
        currentTime = vidInstance.vid.currentTime;
    }
    if (!isNaN(parseInt(altDuration))) {
        currentDuration = parseInt(altDuration);
    }
    else {
        currentDuration = Math.floor(vidInstance.vid.duration);
    }
    if (isNaN(currentDuration) || isNaN(currentTime) || currentTime <= 1) {
        return;
    }
    if (updateCheck == 1 && (currentTime - lastUpdate) > 60 && shouldCheck != 19) {
        alert("Could not sync time with the server.");
    }
    if ((updateCheck == 1 || getEpCheck == 1 || lastUpdate == currentTime) && shouldCheck != 19) {
        return;
    }
    updateCheck = 1;
    if (!downloaded) {
        try {
            const aniID = new URLSearchParams(localStorage.getItem("epURL")).get("aniID");
            const identifier = `${aniID}-${currentVidData.episode}`;
            if (aniID &&
                vidInstance.vid.duration > 0 &&
                (currentTime + 120) > vidInstance.vid.duration &&
                localStorage.getItem("anilist-last") != identifier) {
                await window.parent.updateEpWatched(aniID, currentVidData.episode);
                localStorage.setItem("anilist-last", identifier);
            }
        }
        catch (err) {
            console.warn(err);
        }
    }
    window.parent.apiCall("POST", { "username": username, "action": 1, "time": currentTime, "ep": currentVidData.episode, "name": currentVidData.nameWSeason, "nameUm": currentVidData.name, "prog": currentDuration }, () => { }, [], true, false).then(function (response) {
        try {
            if (response.status == 200) {
                lastUpdate = currentTime;
            }
            else if ("errorCode" in response && response["errorCode"] == 70001) {
                window.parent.postMessage({ "action": 21, data: "" }, "*");
            }
        }
        catch (err) {
        }
    }).catch(function (error) {
        console.error(error);
    }).finally(function () {
        updateCheck = 0;
        if (currentTime != lastUpdate) {
            errorCount++;
        }
        else {
            errorCount = 0;
        }
        if (errorCount > 10) {
            errorCount = 0;
            alert("Time could not be synced with the server.");
        }
        else if (errorCount == 5) {
            lastUpdate = currentTime;
        }
    });
}
function chooseQualHls(x, type, elem) {
    hls.loadLevel = parseInt(x);
    localStorage.setItem("hlsqual", x);
    localStorage.setItem("hlsqualnum", parseInt(elem.innerText).toString());
}
function loadSubs(sourceName) {
    let vidDom = document.getElementById("v").children;
    while (vidDom.length > 0) {
        vidDom[0].remove();
    }
    DMenu.getScene("subtitles").deleteItems();
    DMenu.getScene("subtitles").addItem({
        "text": "Subtitles",
    }, true);
    if ("subtitles" in currentVidData && currentVidData["subtitles"].length > 0) {
        let selectFunc = function () {
            let value = this.getAttribute("value");
            if (value == "off") {
                localStorage.setItem(`${engine}-${sourceName}-subtitle`, "off");
                curTrack = undefined;
                document.getElementById("fastFor").style.display = "none";
            }
            for (let i = 0; i < vidInstance.vid.textTracks.length; i++) {
                if (i == parseInt(value)) {
                    vidInstance.vid.textTracks[i].mode = "showing";
                    curTrack = vidInstance.vid.textTracks[i];
                    setSubtitleMargin(curTrack);
                    document.getElementById("fastFor").style.display = "block";
                    localStorage.setItem(`${engine}-${sourceName}-subtitle`, vidInstance.vid.textTracks[i].label);
                }
                else {
                    vidInstance.vid.textTracks[i].mode = "hidden";
                }
            }
        };
        DMenu.getScene("subtitles").addItem({
            "text": "off",
            "callback": selectFunc,
            "attributes": {
                "value": "off",
            },
            "highlightable": true,
            "id": `subtitle-off`,
        });
        for (var i = 0; i < currentVidData.subtitles.length; i++) {
            DMenu.getScene("subtitles").addItem({
                "text": currentVidData.subtitles[i].label,
                "callback": selectFunc,
                "attributes": {
                    "value": i.toString(),
                },
                "highlightable": true,
                "id": `subtitle-${i}`
            });
            let trackDOM = createElement({
                "element": "track",
                "attributes": {
                    "kind": "subtitles",
                    "label": currentVidData.subtitles[i].label,
                    "src": currentVidData.subtitles[i].file
                },
                "innerText": currentVidData.subtitles[i].label
            });
            document.getElementById("v").append(trackDOM);
        }
        let check = true;
        for (var i = 0; i < vidInstance.vid.textTracks.length; i++) {
            if (vidInstance.vid.textTracks[i].label == localStorage.getItem(`${engine}-${sourceName}-subtitle`) && check) {
                let subDOM = DMenu.selections[`subtitle-${i}`];
                if (subDOM) {
                    subDOM.select();
                }
                curTrack = vidInstance.vid.textTracks[i];
                setSubtitleMargin(curTrack);
                document.getElementById("fastFor").style.display = "block";
                vidInstance.vid.textTracks[i].mode = "showing";
                check = false;
            }
            else {
                vidInstance.vid.textTracks[i].mode = "hidden";
            }
        }
        if (check) {
            DMenu.selections["subtitle-off"].selectWithCallback();
        }
    }
}
function chooseQual(config) {
    let skipTo = 0;
    let defURL = "";
    let selectedSourceName;
    if (config.clicked) {
        selectedSourceName = config.name;
        skipTo = vidInstance.vid.currentTime;
        if (config.element.getAttribute("data-intro") === "true") {
            skipIntroInfo.start = parseInt(config.element.getAttribute("data-start"));
            skipIntroInfo.end = parseInt(config.element.getAttribute("data-end"));
        }
        else {
            skipIntroInfo = {
                start: 0,
                end: 0
            };
        }
    }
    else {
        skipTo = config.skipTo;
        defURL = currentVidData.sources[0].url;
        let sName = localStorage.getItem(`${engine}-sourceName`);
        let qCon = DMenu.getScene("source").element.querySelectorAll(".menuItem");
        selectedSourceName = sName;
        for (let i = 0; i < qCon.length; i++) {
            if (sName == qCon[i].getAttribute("data-name")) {
                defURL = currentVidData.sources[i].url;
                if (qCon[i].getAttribute("data-intro") === "true") {
                    skipIntroInfo.start = parseInt(qCon[i].getAttribute("data-start"));
                    skipIntroInfo.end = parseInt(qCon[i].getAttribute("data-end"));
                }
                else {
                    skipIntroInfo = {
                        start: 0,
                        end: 0
                    };
                }
                let sourceItem = DMenu.selections[`source-${qCon[i].getAttribute("data-name")}`];
                if (sourceItem) {
                    sourceItem.select();
                }
                break;
            }
        }
    }
    loadSubs(selectedSourceName);
    if (hls) {
        hls.destroy();
    }
    if (config.type == "hls") {
        //@ts-ignore
        if (Hls.isSupported()) {
            if (typeof engine === "number" &&
                extensionList[engine] &&
                extensionList[engine].config &&
                !isChrome &&
                CustomXMLHttpRequest != window.parent.XMLHttpRequest) {
                // @ts-ignore
                // todo
                CustomXMLHttpRequest = XMLHttpRequest2;
            }
            //@ts-ignore
            hls = new Hls({});
            if (localStorage.getItem("skipBroken") === "true") {
                lastFragError = -10;
                fragErrorCount = 0;
                //@ts-ignore
                hls.on(Hls.Events.BUFFER_APPENDING, function (event, data) {
                    if (localStorage.getItem("skipBroken") !== "true") {
                        return;
                    }
                    fragErrorCount = 0;
                });
                // @ts-ignore
                hls.on(Hls.Events.ERROR, function (event, data) {
                    if (localStorage.getItem("skipBroken") !== "true") {
                        return;
                    }
                    const errorFatal = data.fatal;
                    if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR ||
                        data.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT ||
                        data.details === Hls.ErrorDetails.FRAG_PARSING_ERROR) {
                        lastFragError = data.frag.start;
                        lastFragDuration = data.frag.duration;
                        if ((errorFatal || (data.frag.start - vidInstance.vid.currentTime) < 0.3) && fragErrorCount < 10) {
                            vidInstance.vid.currentTime = data.frag.start + data.frag.duration + 0.3;
                            fragErrorCount++;
                            hls.startLoad();
                        }
                    }
                    else if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
                        if ((Math.abs(lastFragError - vidInstance.vid.currentTime) < 0.3) && fragErrorCount < 10) {
                            vidInstance.vid.currentTime = lastFragError + lastFragDuration + 0.3;
                            fragErrorCount++;
                            hls.startLoad();
                        }
                    }
                });
            }
            if (!config.clicked) {
                hls.loadSource(defURL);
                selectedMain = [config.type, defURL];
            }
            else {
                hls.loadSource(config.url);
                selectedMain = [config.type, config.url];
            }
            hls.attachMedia(vidInstance.vid);
            //@ts-ignore
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
                // If it's 0, then hls.js will automatically skip to the end
                // so we increment it by 0.1
                if (skipTo === 0 && shouldReplace) {
                    skipTo += 0.1;
                }
                vidInstance.vid.currentTime = skipTo;
                updatePlaybackSpeed();
                vidInstance.vid.play();
                loadHLSsource();
            });
        }
    }
    else {
        try {
            if (!config.clicked) {
                vidInstance.vid.src = defURL;
            }
            else {
                vidInstance.vid.src = config.url;
            }
            vidInstance.vid.currentTime = skipTo;
            updatePlaybackSpeed();
            vidInstance.vid.load();
            vidInstance.vid.play();
        }
        catch (err) {
            console.error(err);
            sendNoti([0, null, "Error", "Wait until the episode is being loaded."]);
        }
    }
}
function loadHLSsource() {
    try {
        DMenu.getScene("quality").deleteItems();
        DMenu.getScene("quality").addItem({
            "text": "Quality",
        }, true);
        let hlsqualnum = parseInt(localStorage.getItem("hlsqualnum"));
        let hslLevel = -1;
        if (isNaN(hlsqualnum)) {
            hslLevel = -1;
        }
        else {
            let differences = [];
            for (let i = 0; i < hls.levels.length; i++) {
                differences.push(Math.abs(hlsqualnum - hls.levels[i].height));
            }
            let min = differences[0];
            let minIndex = 0;
            for (let i = 0; i < differences.length; i++) {
                if (min > differences[i]) {
                    minIndex = i;
                    min = differences[i];
                }
            }
            hslLevel = minIndex;
        }
        hls.loadLevel = hslLevel;
        for (var i = -1; i < hls.levels.length; i++) {
            let selected = false;
            if (i == hslLevel) {
                selected = true;
            }
            DMenu.getScene("quality").addItem({
                "text": (i == -1) ? "Auto" : hls.levels[i].height + "p",
                "attributes": {
                    "data-url": i.toString(),
                    "data-type": "hls",
                },
                "callback": function () {
                    chooseQualHls(this.getAttribute("data-url"), this.getAttribute("data-type"), this);
                },
                "highlightable": true,
                "selected": selected,
            }, false);
        }
    }
    catch (err) {
        console.error(err);
    }
}
async function getEp(x = 0) {
    if (getEpCheck == 1) {
        return;
    }
    if (castingMode) {
        startCasting(true);
        return;
    }
    getEpCheck = 1;
    try {
        DMenu.getScene("source").deleteItems();
        DMenu.getScene("source").addItem({
            "text": "Sources",
        }, true);
        for (var i = 0; i < currentVidData.sources.length; i++) {
            let curAttributes = {
                "data-url": currentVidData.sources[i].url,
                "data-type": currentVidData.sources[i].type,
                "data-name": currentVidData.sources[i].name,
            };
            if ("skipIntro" in currentVidData.sources[i] && "start" in currentVidData.sources[i].skipIntro && "end" in currentVidData.sources[i].skipIntro) {
                curAttributes["data-intro"] = "true";
                curAttributes["data-start"] = currentVidData.sources[i].skipIntro.start;
                curAttributes["data-end"] = currentVidData.sources[i].skipIntro.end;
                if (i == 0) {
                    skipIntroInfo.start = currentVidData.sources[i].skipIntro.start;
                    skipIntroInfo.end = currentVidData.sources[i].skipIntro.end;
                }
            }
            DMenu.getScene("source").addItem({
                "text": currentVidData.sources[i].name,
                "highlightable": true,
                "attributes": curAttributes,
                "id": `source-${currentVidData.sources[i].name}`,
                "callback": function () {
                    localStorage.setItem(`${engine}-sourceName`, this.getAttribute("data-name"));
                    chooseQual({
                        url: this.getAttribute("data-url"),
                        type: this.getAttribute("data-type"),
                        name: this.getAttribute("data-name"),
                        element: this,
                        clicked: true,
                    });
                },
                "selected": i == 0
            });
        }
        if (typeof currentVidData.prev == "undefined" || currentVidData.prev == null) {
            document.getElementById("prev_ep").style.display = "none";
        }
        else {
            document.getElementById("prev_ep").style.display = "table-cell";
        }
        if (typeof currentVidData.next == "undefined" || currentVidData.next == null) {
            document.getElementById("next_ep").style.display = "none";
        }
        else {
            document.getElementById("next_ep").style.display = "table-cell";
        }
        let response = await window.parent.apiCall("POST", {
            "username": username,
            "action": 2,
            "name": currentVidData.nameWSeason,
            "nameUm": currentVidData.name,
            "ep": currentVidData.episode,
            "cur": location.search
        }, () => { });
        document.getElementById("ep_dis").innerHTML = currentVidData.episode.toString();
        clearInterval(updateCurrentTime);
        localStorage.removeItem("anilist-last-error");
        updateCurrentTime = window.setInterval(update, int_up);
        let skipTo = 0;
        if (localStorage.getItem("rewatch") == "true") {
        }
        else {
            skipTo = response.data.time;
        }
        chooseQual({
            type: currentVidData.sources[0].type,
            skipTo,
            clicked: false,
        });
        getEpCheck = 0;
    }
    catch (error) {
        console.error(error);
        sendNoti([0, null, "Error", error]);
    }
}
function openSettingsSemi(translateY) {
    let settingCon = document.querySelector(".menuCon");
    settingCon.style.display = "block";
    settingCon.style.pointerEvents = "auto";
    settingCon.style.opacity = "1";
    if (translateY == -1) {
        settingCon.style.transform = "translateY(0px)";
    }
    else if (translateY == 0) {
        settingCon.style.transform = "translateY(100%)";
    }
    else {
        settingCon.style.transform = `translateY(calc(100% + ${-translateY + 50}px))`;
    }
}
function updatePlaybackSpeed() {
    const localRate = localStorage.getItem("playback-speed");
    const rate = isNaN(parseFloat(localRate)) ? 1 : parseFloat(localRate);
    vidInstance.vid.playbackRate = rate;
    playerDOM.innerText = `(${rate})`;
}
function closeSettings() {
    let settingCon = document.querySelector(".menuCon");
    settingCon.style.transitionDuration = "0.2s";
    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            settingCon.style.transform = "translateY(100%)";
            settingCon.style.opacity = "0";
            settingCon.style.pointerEvents = "none";
            setTimeout(function () {
                settingCon.style.transitionDuration = "0s";
            }, 200);
        });
    });
}
function updateCasting(casting) {
    if (window.parent.isCasting() || casting === true) {
        document.getElementById("cast").className = "casting";
    }
    else {
        document.getElementById("cast").className = "notCasting";
    }
}
function isLocked() {
    return vidInstance.locked;
}
document.querySelector("#repBack").onclick = function () {
    vidInstance.vid.currentTime -= skipButTime;
    vidInstance.updateTime();
};
document.querySelector("#popOut").onclick = function () {
    backToNormal();
};
document.querySelector("#repForward").onclick = function () {
    vidInstance.vid.currentTime += skipButTime;
    vidInstance.updateTime();
};
document.getElementById("fullscreenToggle").onclick = function () {
    vidInstance.goFullScreen();
};
document.getElementById("skipIntroDOM").onclick = function () {
    if ("end" in skipIntroInfo && !isNaN(skipIntroInfo.end)) {
        vidInstance.vid.currentTime = skipIntroInfo.end;
        document.getElementById("skipIntroDOM").style.display = "none";
    }
};
document.getElementById("fastFor").addEventListener("click", function () {
    skipToNextTrack();
});
document.querySelector("#next_ep").onclick = function () {
    changeEp(1);
};
document.querySelector("#prev_ep").onclick = function () {
    changeEp(-1);
};
document.querySelector("#setting_icon").addEventListener("click", function () {
    openSettingsSemi(-1);
});
document.querySelector("#episodeList").addEventListener("click", function () {
    openSettingsSemi(-1);
    DMenu.open("episodes");
});
function updateEpListSelected() {
    var _a;
    (_a = DMenu === null || DMenu === void 0 ? void 0 : DMenu.selections[location.search]) === null || _a === void 0 ? void 0 : _a.select();
}
function enableRemote(time) {
    const currentTime = time;
    const duration = 86400;
    const remoteDOM = document.querySelector("#remote");
    const hasPrev = !!currentVidData.prev;
    const hasNext = !!currentVidData.next;
    vidInstance.setObjectSettings(1, false);
    if (hls) {
        hls.destroy();
    }
    console.log(JSON.parse(JSON.stringify(currentVidData)), hasNext, hasPrev);
    vidInstance.vid.src = "";
    clearInterval(updateCurrentTime);
    clearInterval(remoteInterval);
    remoteDOM.innerHTML = "";
    remoteDOM.style.display = "flex";
    remoteDOM.appendChild(createElement({
        style: {
            width: "100%",
        },
        children: [
            {
                id: "remoteTitle",
                innerText: window.parent.fixTitle(localStorage.getItem("mainName"), extensionList[engine])
            },
            {
                id: "remoteEpisode",
                innerText: `Epsiode ${currentVidData.episode}`
            },
            {
                style: {
                    textAlign: "center",
                    margin: "30px 0"
                },
                children: [
                    {
                        element: "div",
                        class: "remoteIcon remotePrev",
                        style: {
                            opacity: hasPrev ? "1" : "0",
                            pointerEvents: hasPrev ? "auto" : "none"
                        },
                        listeners: {
                            click: function () {
                                destroyRemote();
                                changeEp(-1);
                            }
                        }
                    },
                    {
                        element: "div",
                        id: "remotePlay",
                        class: "remoteIcon remotePlay",
                        listeners: {
                            click: function () {
                                window.parent.toggleCastState();
                            }
                        }
                    },
                    {
                        element: "div",
                        class: "remoteIcon remoteNext",
                        style: {
                            opacity: hasNext ? "1" : "0",
                            pointerEvents: hasNext ? "auto" : "none"
                        },
                        listeners: {
                            click: function () {
                                destroyRemote();
                                changeEp(1);
                            }
                        }
                    },
                ]
            },
            {
                element: "range-slider",
                id: "remoteSlider",
                attributes: {
                    tyle: "range",
                    max: duration.toString(),
                    min: "0",
                    value: currentTime.toString(),
                },
                listeners: {
                    change: function () {
                        window.parent.updateCastTime(this.getAttribute("value"));
                    }
                }
            }
        ]
    }));
    // sendNoti([5, "red", "red", currentTime]);
    shouldUpdateSlider = true;
    window.parent.updateCastTime(currentTime);
    updateRemoteState({ paused: true, currentTime, duration, hasFinished: false });
}
function destroyRemote() {
    clearInterval(remoteInterval);
    shouldUpdateSlider = false;
    remoteInterval = null;
    const remoteDOM = document.querySelector("#remote");
    remoteDOM.style.display = "none";
    remoteDOM.innerHTML = "";
}
function updateRemoteState(castState) {
    if (shouldUpdateSlider === false) {
        return;
    }
    if (castState.hasFinished === true && localStorage.getItem("autoplay") === "true") {
        changeEp(1);
        return;
    }
    const slider = document.getElementById("remoteSlider");
    slider.value = castState.currentTime.toString();
    slider.setAttribute("max", castState.duration.toString());
    if (parseInt(slider.getAttribute("value")) >= 1 && castState.paused === false) {
        update(19, slider.getAttribute("value"), slider.getAttribute("max"));
    }
    if (castState.paused) {
        document.getElementById("remotePlay").className = "remoteIcon remotePlay";
    }
    else {
        document.getElementById("remotePlay").className = "remoteIcon remotePause";
    }
    if (remoteInterval === null && castState.paused === false) {
        remoteInterval = setInterval(function () {
            try {
                const state = window.parent.getEstimatedState();
                if (state) {
                    updateRemoteState(state);
                }
            }
            catch (err) {
                console.error(err);
            }
        }, 1000);
    }
}
async function startCasting(shouldDestroy = false) {
    var _a;
    shouldUpdateSlider = false;
    let classname;
    let requiresWebServer = false;
    if (window.parent.isCasting() && shouldDestroy === false) {
        const changed = (await window.parent.destroySession());
        console.log("DESTROY", changed);
        if (changed === true) {
            classname = "notCasting";
        }
    }
    else {
        let type, url;
        if (selectedMain) {
            url = selectedMain[1];
            type = selectedMain[0];
        }
        else {
            url = currentVidData.sources[0].url;
            type = currentVidData.sources[0].type;
        }
        if (type == "hls") {
            type = "application/x-mpegURL";
        }
        else {
            type = "video/mp4";
            url = currentVidData.sources[0].castURL;
        }
        if (downloaded || loadsLocally) {
            requiresWebServer = true;
            const localIP = (_a = (await window.parent.getLocalIP())) === null || _a === void 0 ? void 0 : _a.ip;
            if (!localIP) {
                alert("Could not get the LAN address");
            }
            url = `http://${localIP}:56565${url}`;
        }
        let response = await window.parent.apiCall("POST", {
            "username": username,
            "action": 2,
            "name": currentVidData.nameWSeason,
            "nameUm": currentVidData.name,
            "ep": currentVidData.episode,
            "cur": location.search
        }, () => { });
        const changed = await window.parent.castVid({
            url,
            type,
            currentTime: response.data.time
        }, requiresWebServer);
        if (changed === true) {
            classname = "casting";
            castingMode = true;
            enableRemote(response.data.time);
        }
    }
    if (classname) {
        document.getElementById("cast").className = classname;
    }
}
window.onmessage = async function (message) {
    if (message.data.action == 1) {
        currentVidData = message.data;
        if (hasLoadedEpList === false) {
            hasLoadedEpList = true;
            extensionList[engine].getAnimeInfo(localStorage.getItem("epURL").replace("?watch=/", "")).then((data) => {
                const episodes = data.episodes;
                for (let i = episodes.length - 1; i >= 0; i--) {
                    const ep = episodes[i];
                    let truncatedTitle = ep.title.substring(0, 30);
                    if (ep.title.length >= 30) {
                        truncatedTitle += "...";
                    }
                    const epNum = parseFloat(ep.title.toLowerCase().replace("episode", ""));
                    if (!isNaN(epNum)) {
                        ep.title = `Episode ${epNum}`;
                        truncatedTitle = ep.title;
                    }
                    if (ep.altTitle) {
                        ep.title = ep.altTitle;
                        truncatedTitle = ep.altTitle;
                    }
                    if (ep.altTruncatedTitle) {
                        truncatedTitle = ep.altTruncatedTitle;
                    }
                    DMenu.getScene("episodes").addItem({
                        highlightable: true,
                        html: (ep.isFiller ? `<div class="filler">Filler</div>` : "") + ep.title + (ep.date ? `<div class="menuDate">${ep.date.toLocaleString()}</div>` : ""),
                        altText: truncatedTitle,
                        selected: location.search === ep.link,
                        id: ep.link,
                        callback: function () {
                            changeEp(0, ep.link);
                        }
                    }, false);
                }
            }).catch((err) => {
                console.error(err);
            });
        }
        if ("title" in currentVidData) {
            if (engine === 4) {
                shouldReplace = true;
            }
            document.getElementById("titleCon").innerText = currentVidData.title;
        }
        else {
            document.getElementById("titleCon").innerText = "";
            try {
                extensionList[engine].getVideoTitle(window.location.search).then((title) => {
                    document.getElementById("titleCon").innerText = title;
                }).catch((err) => {
                    console.error(err);
                    document.getElementById("titleCon").innerText = "";
                });
            }
            catch (err) {
            }
        }
        if (config.chrome) {
            getEp();
        }
        else {
            let mainName = localStorage.getItem("mainName");
            let rootDir = `/${mainName}/${btoa(normalise(location.search))}`;
            let localURL = `${rootDir}/.downloaded`;
            try {
                await checkIfExists(localURL);
                let res;
                if (localStorage.getItem("alwaysDown") === "true") {
                    res = true;
                }
                else {
                    res = confirm("Want to open the downloaded version?");
                }
                if (res) {
                    loadsLocally = true;
                    let vidString = (await window.parent.makeLocalRequest("GET", `${rootDir}/viddata.json`));
                    let viddata = JSON.parse(vidString).data;
                    currentVidData.sources = [{
                            "name": viddata.sources[0].name,
                            "type": viddata.sources[0].type,
                            "url": viddata.sources[0].type == 'hls' ? `${rootDir}/master.m3u8` : `${window.parent.cordova.file.externalDataDirectory}${rootDir}/master.m3u8`,
                            "castURL": `${rootDir}/master.mp4`
                        }];
                    CustomXMLHttpRequest = window.parent.XMLHttpRequest;
                }
            }
            catch (err) {
                console.error(err);
            }
            finally {
                getEp();
            }
        }
    }
    else if (message.data.action == "play") {
        vidInstance.vid.play();
    }
    else if (message.data.action == "pause") {
        vidInstance.vid.pause();
    }
    else if (message.data.action == "toggle") {
        vidInstance.togglePlay();
    }
    else if (message.data.action == "next") {
        changeEp(1);
    }
    else if (message.data.action == "previous") {
        changeEp(-1);
    }
    else if (message.data.action == "elapsed") {
        vidInstance.vid.currentTime = message.data.elapsed;
    }
    else if (parseInt(message.data.action) == 200) {
        let token = message.data.data;
        if (config.chrome == false && token.indexOf("connect.sid") == -1) {
            window.parent.postMessage({ "action": 21, data: "" }, "*");
        }
        else {
            ini_main();
        }
    }
    else if (message.data.action == 4) {
        changeEp(0, message.data.data);
    }
    else if (message.data.action == "pip") {
        if (localStorage.getItem("autopip") === "true" &&
            !vidInstance.vid.paused) {
            vidInstance.togglePictureInPicture();
        }
    }
    else if (message.data.action == "pipout") {
        if (localStorage.getItem("autopip") === "true") {
            if (vidInstance.wasLocked) {
                vidInstance.lockVid();
            }
            else {
                vidInstance.lockVid2();
            }
        }
    }
    else if (message.data.action == "castStateUpdated") {
        updateRemoteState(message.data.data);
    }
};
window.parent.postMessage({ "action": 401, data: "landscape" }, "*");
window.addEventListener("keydown", function (event) {
    if (event.keyCode == 32) {
        vidInstance.togglePlay();
    }
    else if (event.keyCode == 38 || event.keyCode == 40) {
        vidInstance.updateTimeout();
    }
    else if (event.keyCode == 39) {
        if (vidInstance.seekMode || config.chrome) {
            vidInstance.vid.currentTime += 30;
            vidInstance.updateTime();
            event.preventDefault();
        }
        else {
            vidInstance.updateTimeout();
        }
    }
    else if (event.keyCode == 37) {
        if (vidInstance.seekMode || config.chrome) {
            vidInstance.vid.currentTime -= 30;
            vidInstance.updateTime();
            event.preventDefault();
        }
        else {
            vidInstance.updateTimeout();
        }
    }
    else if (event.keyCode == 77) {
        vidInstance.toggleMute();
    }
    else if (event.keyCode == 70) {
        vidInstance.goFullScreen();
    }
    else if (event.keyCode == 76) {
        vidInstance.toggleLock();
    }
    else if (event.keyCode == 80) {
        vidInstance.togglePictureInPicture();
    }
});
window.addEventListener("videoDurationChanged", () => {
    try {
        window.parent.apiCall("POST", {
            "username": username,
            "action": 2,
            "name": currentVidData.nameWSeason,
            "nameUm": currentVidData.name,
            "ep": currentVidData.episode,
            "duration": Math.floor(vidInstance.vid.duration),
            "cur": location.search
        }, () => { });
    }
    catch (err) {
        console.error(err);
    }
});
window.addEventListener("videoTimeUpdated", () => {
    if (curTrack instanceof TextTrack) {
        nextTrack();
    }
});
window.addEventListener("videoLoadedMetaData", () => {
    window.parent.postMessage({
        "action": 12,
        nameShow: currentVidData.name,
        episode: currentVidData.episode,
        prev: true,
        next: true,
        "duration": vidInstance.vid.duration,
        "elapsed": vidInstance.vid.currentTime
    }, "*");
    vidInstance.total.innerText = vidInstance.timeToString(vidInstance.vid.duration);
    let whichFit = parseInt(localStorage.getItem("fillMode")) || 0;
    vidInstance.setObjectSettings(whichFit);
});
window.addEventListener("videoEnded", () => {
    if (localStorage.getItem("autoplay") == "true") {
        changeEp(1);
    }
});
window.addEventListener("videoChangedFillMode", (event) => {
    DMenu.selections[`fMode${event.detail.fillMode}`].select();
});
window.addEventListener("videoOpenSettings", (event) => {
    openSettingsSemi(event.detail.translate);
});
window.addEventListener("videoCloseSettings", (event) => {
    closeSettings();
});
window.addEventListener("videoDoubleTap", (event) => {
    let type = event.detail.DTType;
    if (type == "plus") {
        vidInstance.vid.currentTime += doubleTapTime;
    }
    else {
        vidInstance.vid.currentTime -= doubleTapTime;
    }
});
window.addEventListener("videoSeeked", (event) => {
    try {
        update(19);
        lastUpdate = vidInstance.vid.currentTime;
    }
    catch (err) {
    }
});
vidInstance = new vid(config);
if (downloaded) {
    CustomXMLHttpRequest = window.parent.XMLHttpRequest;
}
if (engineTemp.length == 1) {
    engine = 0;
}
else {
    engine = parseInt(engineTemp[1]);
}
DMenu.open("initial");
DMenu.closeMenu();
if (config.chrome) {
    document.getElementById("fullscreenToggle").style.display = "block";
    const chromeDOM = document.getElementsByClassName("notChrome");
    for (let i = 0; i < chromeDOM.length; i++) {
        chromeDOM[i].style.display = "none";
    }
}
if (config.local || downloaded) {
    ini_main();
}
else {
    window.parent.postMessage({ "action": 20, data: "" }, "*");
}
document.getElementById("back").onclick = function () {
    if (config.chrome) {
        history.back();
    }
    else {
        window.parent.back();
    }
};
let settingsPullInstance = new settingsPull(document.getElementById("settingHandlePadding"), closeSettings);
let settingsPullInstanceTT = new settingsPull(document.querySelector(".menuCon"), closeSettings, true);
const playerDOM = document.querySelector("#playbackDOM");
applyTheme();
applySubtitleConfig();
document.getElementById("cast").onclick = function () {
    startCasting();
};
updateCasting(false);
