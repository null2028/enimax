let localVal = localStorage.getItem("local");
if (localVal != "true" && localVal != "false") {
    localStorage.setItem("local", "true");
    config.local = true;
}
let wcoRef;
let fmoviesBaseURL = !localStorage.getItem("fmoviesBaseURL") ? "fmovies.ink" : localStorage.getItem("fmoviesBaseURL");
function setFmoviesBase() {
    fmoviesBaseURL = !localStorage.getItem("fmoviesBaseURL") ? "fmovies.ink" : localStorage.getItem("fmoviesBaseURL");
}
String.prototype["substringAfter"] = function (toFind) {
    let str = this;
    let index = str.indexOf(toFind);
    return index == -1 ? "" : str.substring(index + toFind.length);
};
String.prototype["substringBefore"] = function (toFind) {
    let str = this;
    let index = str.indexOf(toFind);
    return index == -1 ? "" : str.substring(0, index);
};
String.prototype["substringAfterLast"] = function (toFind) {
    let str = this;
    let index = str.lastIndexOf(toFind);
    return index == -1 ? "" : str.substring(index + toFind.length);
};
String.prototype["substringBeforeLast"] = function (toFind) {
    let str = this;
    let index = str.lastIndexOf(toFind);
    return index == -1 ? "" : str.substring(0, index);
};
String.prototype["onlyOnce"] = function (substring) {
    let str = this;
    return str.lastIndexOf(substring) == str.indexOf(substring);
};
function extractKey(id, url = null, useCached = false) {
    return (new Promise(async function (resolve, reject) {
        try {
            let gitHTML = (await MakeFetch(`https://github.com/enimax-anime/key/blob/e${id}/key.txt`));
            let key = gitHTML.substringAfter('"blob-code blob-code-inner js-file-line">').substringBefore("</td>");
            if (!key) {
                key = gitHTML.substringAfter('"rawBlob":"').substringBefore("\"");
            }
            if (!key) {
                key = (await MakeFetch(`https://raw.githubusercontent.com/enimax-anime/key/e${id}/key.txt`));
            }
            resolve(key);
        }
        catch (err) {
            reject(err);
        }
    }));
}
// @ts-ignore
async function MakeFetch(url, options = {}) {
    return new Promise(function (resolve, reject) {
        fetch(url, options).then(response => response.text()).then((response) => {
            resolve(response);
        }).catch(function (err) {
            reject(new Error(`${err.message}: ${url}`));
        });
    });
}
async function MakeFetchTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const signal = controller.signal;
    options["signal"] = signal;
    return new Promise(function (resolve, reject) {
        fetch(url, options).then(response => response.text()).then((response) => {
            resolve(response);
        }).catch(function (err) {
            reject(new Error(`${err.message}: ${url}`));
        });
        setTimeout(function () {
            controller.abort();
            reject(new Error("timeout"));
        }, timeout);
    });
}
let customHeaders = {};
var MakeCusReqFmovies = async function (url, options) {
    return new Promise(function (resolve, reject) {
        // @ts-ignore
        cordova.plugin.http.sendRequest(url, options, function (response) {
            resolve(response.data);
        }, function (response) {
            reject(response.error);
        });
    });
};
// for v2
if (config && config.chrome) {
    if (config.manifest === "v2") {
        // @ts-ignore
        chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
            details.requestHeaders.push({
                "name": "referer",
                "value": wcoRef
            });
            details.requestHeaders.push({
                "name": "x-requested-with",
                "value": "XMLHttpRequest"
            });
            return { requestHeaders: details.requestHeaders };
        }, { urls: ['https://*.watchanimesub.net/*'] }, ['blocking', 'requestHeaders', 'extraHeaders']);
        // @ts-ignore
        chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
            if (details.url.includes("vidstream.") || details.url.includes("vizcloud.")) {
                details.requestHeaders.push({
                    "name": "Referer",
                    "value": "https://vidstream.pro/"
                });
                details.requestHeaders.push({
                    "name": "x-requested-with",
                    "value": "XMLHttpRequest"
                });
            }
            else if (details.url.includes("mcloud.")) {
                details.requestHeaders.push({
                    "name": "Referer",
                    "value": "https://mcloud.to/"
                });
                details.requestHeaders.push({
                    "name": "x-requested-with",
                    "value": "XMLHttpRequest"
                });
            }
            return { requestHeaders: details.requestHeaders };
        }, { urls: ["<all_urls>"] }, ['blocking', 'requestHeaders', 'extraHeaders']);
    }
    MakeCusReqFmovies = async function (url, options) {
        if ("headers" in options) {
            customHeaders = options["headers"];
        }
        return new Promise(function (resolve, reject) {
            fetch(url, options).then(response => response.text()).then((response) => {
                customHeaders = {};
                resolve(response);
            }).catch(function (err) {
                reject(err);
            });
        });
    };
}
function getWebviewHTML(url = "https://www.zoro.to", hidden = false, timeout = 15000, code = false, isAnilist = false) {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        const inappRef = cordova.InAppBrowser.open(url, '_blank', hidden ? "hidden=true" : "");
        if (isAnilist) {
            inappRef.show();
        }
        inappRef.addEventListener('loadstop', async (event) => {
            if (isAnilist) {
                if (event.url.includes("enimax-anime.github.io/anilist")) {
                    const accessToken = new URLSearchParams((new URL(event.url)).hash.substring(1)).get("access_token");
                    localStorage.setItem("anilist-token", accessToken);
                    inappRef.close();
                    const shouldUpdate = await window.parent.Dialogs.confirm("Logged in! Do you want to import your library? if you don't want to do that right now, you can do that later by going to the menu");
                    if (shouldUpdate) {
                        AnilistHelper.getAllItems();
                    }
                    resolve("Done");
                }
                else if ((new URL(event.url)).hostname === "anilist.co") {
                    inappRef.show();
                }
            }
            else {
                inappRef.executeScript({
                    'code': code === false ? `let resultInApp={'status':200,'data':document.body.innerText};
                        webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(resultInApp));` : code
                });
            }
        });
        inappRef.addEventListener('loaderror', (err) => {
            inappRef.show();
            reject(new Error("Error"));
        });
        inappRef.addEventListener('message', (result) => {
            inappRef.close();
            resolve(result);
        });
        inappRef.addEventListener('exit', (result) => {
            setTimeout(() => {
                resolve("closed");
            }, 500);
        });
        if (timeout) {
            setTimeout(function () {
                inappRef.close();
                reject("Timeout");
            }, timeout);
        }
    });
}
async function MakeFetchZoro(url, options = {}) {
    return new Promise(function (resolve, reject) {
        fetch(url, options).then(response => response.text()).then((response) => {
            if ((response.includes("if the site connection is secure") || response.includes("Security checking...")) && !config.chrome) {
                getWebviewHTML(url);
            }
            resolve(response);
        }).catch(function (err) {
            reject(new Error(`${err.message}: ${url}`));
        });
    });
}
function removeDOM(domElem) {
    try {
        domElem.innerHTML = "";
        domElem.remove();
    }
    catch (err) {
    }
}
function getCurrentSeason(type) {
    const seasons = ["WINTER", "SPRING", "SUMMER", "FALL"];
    let season = "";
    const month = new Date().getMonth();
    switch (month) {
        case 0:
        case 1:
        case 2:
            season = "WINTER";
            break;
        case 3:
        case 4:
        case 5:
            season = "SPRING";
            break;
        case 6:
        case 7:
        case 8:
            season = "SUMMER";
            break;
        case 9:
        case 10:
        case 11:
            season = "FALL";
            break;
    }
    if (type === "next") {
        season = seasons[(seasons.indexOf(season) + 1) % 4];
    }
    return season;
}
function getCurrentYear(type) {
    let year = new Date().getFullYear();
    if (type == "next" && getCurrentSeason(type) === "WINTER") {
        year++;
    }
    return year;
}
const anilistQueries = {
    "info": `query ($id: Int, $type: MediaType) {
                Media (id: $id, type: $type) { 
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    coverImage { 
                        extraLarge 
                        large 
                        color 
                    }
                    bannerImage
                    averageScore
                    status(version: 2)
                    idMal
                    genres
                    season
                    seasonYear
                    averageScore
                    nextAiringEpisode { airingAt timeUntilAiring episode }
                    relations {
                        edges{
                            relationType
                        }
                        nodes{
                            id
                            idMal
                            coverImage{
                                large
                                extraLarge
                            }
                            title{
                                english
                                native
                            }
                            type
                        }
                    }
                    recommendations { 
                        edges { 
                            node { 
                                id 
                                mediaRecommendation 
                                { 
                                    id
                                    idMal
                                    coverImage{
                                        large
                                        extraLarge
                                    }
                                    title{
                                        english
                                        native
                                    }
                                    type
                                    seasonYear
                                } 
                            } 
                        } 
                    }
                }
            }`,
    "trending": `query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
                    Page(page: $page, perPage: $perPage) {
                        media(sort: POPULARITY_DESC, type: ANIME, season: $season, seasonYear: $seasonYear) {
                            id
                            idMal
                            coverImage{
                                large
                                extraLarge
                            }
                            bannerImage
                            description(asHtml: false)
                            title{
                                english
                                native
                            }
                            type
                            genres
                            startDate{
                                day
                                month
                                year
                            }
                            seasonYear
                        }
                    }
                }`,
    "search": `query($type: MediaType, $title: String){
                    search: Page(page: 1, perPage: 100){
                        media (search: $title, type: $type) { 
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage { 
                                extraLarge 
                                large 
                            }
                        }
                    }
                }`,
    "anilistToMal": `query ($id: Int, $type: MediaType) {
                        Media(id: $id, type: $type) {
                            id
                            idMal
                        }
                    }`
};
async function anilistAPI(query, variables = {}) {
    const url = 'https://graphql.anilist.co', options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    };
    return JSON.parse(await MakeFetch(url, options));
}
async function getAnilistInfo(type, id, mediaType = "ANIME") {
    let anilistID;
    try {
        anilistID = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/bal-mackup/mal-backup/master/page/${type}/${id}.json`)).aniId;
    }
    catch (err) {
        anilistID = JSON.parse(await MakeFetch(`https://api.malsync.moe/page/${type}/${id}`)).aniId;
    }
    return (await anilistAPI(anilistQueries.info, { id: anilistID, type: mediaType })).data.Media;
}
async function anilistToMal(anilistID, type) {
    return (await anilistAPI(anilistQueries.anilistToMal, { id: anilistID, type })).data.Media.idMal;
}
async function getMetaByAniID(anilistID, mediaType = "ANIME") {
    return (await anilistAPI(anilistQueries.info, { id: anilistID, type: mediaType })).data.Media;
}
async function getAnilistTrending(type) {
    return (await anilistAPI(anilistQueries.trending, {
        page: 1,
        perPage: 25,
        season: getCurrentSeason(type),
        seasonYear: getCurrentYear(type)
    })).data.Page.media;
}
function secondsToHuman(seconds, abbreviated = false) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + (abbreviated ? "D" : (d == 1 ? " day" : " days ")) : "";
    const hDisplay = h > 0 ? h + (abbreviated ? "H" : (h == 1 ? " hour" : " hours ")) : "";
    const mDisplay = m > 0 ? m + (abbreviated ? "M" : (m == 1 ? " minute" : " minutes ")) : "";
    const sDisplay = s > 0 ? s + (abbreviated ? "s" : (s == 1 ? " second" : " seconds")) : "";
    if (dDisplay) {
        return dDisplay;
    }
    if (hDisplay) {
        return hDisplay;
    }
    if (mDisplay) {
        return mDisplay;
    }
    if (sDisplay) {
        return sDisplay;
    }
}
function batchConstructor(ids, isMalIdReq = false, type) {
    let subQueries = "";
    const batchReqs = [];
    let count = 0;
    for (let i = 0; i < ids.length; i++) {
        const id = parseInt(ids[i]);
        if (isNaN(id)) {
            if (i == ids.length - 1) {
                batchReqs.push(`query{
                    ${subQueries}
                }`);
            }
            continue;
        }
        count++;
        if (isMalIdReq === true) {
            subQueries += `anime${id}: Page(page: 1, perPage: 1) {
                media(type: ${type}, id: ${id}) {
                    idMal
                }
            }`;
        }
        else {
            subQueries += `anime${id}: Page(page: 1, perPage: 1) {
                            media(type: ANIME, id: ${id}) {
                                nextAiringEpisode { airingAt timeUntilAiring episode }
                            }
                        }`;
        }
        if (count >= 82 || i == ids.length - 1) {
            batchReqs.push(`query{
                ${subQueries}
            }`);
            count = 0;
            subQueries = "";
        }
    }
    return batchReqs;
}
async function sendBatchReqs(ids) {
    var _a;
    const queries = batchConstructor(ids);
    const promises = [];
    for (const query of queries) {
        promises.push(anilistAPI(query));
    }
    const responses = await Promise.all(promises);
    const result = {};
    for (let i = 0; i < responses.length; i++) {
        for (const id in responses[i].data) {
            result[id] = (_a = responses[i]) === null || _a === void 0 ? void 0 : _a.data[id].media[0];
        }
    }
    return result;
}
async function getBatchMalIds(ids, type) {
    var _a, _b, _c;
    const queries = batchConstructor(ids, true, type);
    console.log(queries);
    const promises = [];
    for (const query of queries) {
        promises.push(anilistAPI(query));
    }
    const responses = await Promise.all(promises);
    const result = {};
    for (let i = 0; i < responses.length; i++) {
        for (const tempId in responses[i].data) {
            const id = tempId.replace("anime", "");
            result[id] = (_c = (_b = (_a = responses[i]) === null || _a === void 0 ? void 0 : _a.data[tempId]) === null || _b === void 0 ? void 0 : _b.media[0]) === null || _c === void 0 ? void 0 : _c.idMal;
            if (isNaN(parseInt(result[id]))) {
                delete result[id];
            }
        }
    }
    return result;
}
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener("load", () => {
            resolve(img);
        }, false);
        img.addEventListener("error", (err) => {
            reject(err);
        }, false);
        img.src = url;
    });
}
var wco = {
    baseURL: "https://www.wcoforever.org",
    type: "anime",
    disableAutoDownload: false,
    disabled: false,
    name: "WCOForever",
    shortenedName: "WCO",
    searchApi: async function (query) {
        const baseURL = this.baseURL;
        const tempDiv = new DOMHandler();
        const formData = new FormData();
        formData.append('catara', query);
        formData.append('konuara', 'series');
        try {
            const searchHTML = await MakeFetchZoro(`${baseURL}/search`, {
                method: 'POST', body: formData
            });
            tempDiv.innerHTML = DOMPurify.sanitize(searchHTML);
            const conDIV = tempDiv.document.querySelector(".items").children;
            const searchData = [];
            for (var i = 0; i < conDIV.length; i++) {
                searchData.push({
                    "image": conDIV[i].getElementsByTagName("img")[0].getAttribute("src"),
                    "name": conDIV[i].getElementsByTagName("a")[1].innerText,
                    "link": conDIV[i].getElementsByTagName("a")[1].getAttribute("href").replace(baseURL, "") + "&engine=0",
                });
            }
            return {
                "status": 200,
                "data": searchData
            };
        }
        catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url) {
        url = new URLSearchParams(`?watch=${url}`).get("watch");
        const baseURL = this.baseURL;
        const rawURL = baseURL + "/" + url;
        const infoDOM = new DOMHandler();
        try {
            const infoHTML = await MakeFetchZoro(rawURL);
            infoDOM.innerHTML = DOMPurify.sanitize(infoHTML);
            let infoData = {
                name: infoDOM.document.querySelectorAll(".video-title")[0].innerText,
                image: infoDOM.document.querySelector("#sidebar_cat").querySelectorAll(".img5")[0].getAttribute("src"),
                description: infoDOM.document.querySelector("#sidebar_cat").querySelectorAll("p")[0].innerText,
                episodes: [],
                mainName: "",
                totalPages: 1,
                pageInfo: [{
                        pageName: "Season 1",
                        pageSize: 0
                    }]
            };
            if (infoData.image.indexOf("//") == 0) {
                infoData.image = "https:" + infoData.image;
            }
            let lastSeason = "1";
            let episodesDOM = infoDOM.document.querySelector("#sidebar_right3");
            let animeEps = infoData.episodes;
            let animeDOM = episodesDOM.querySelectorAll("a");
            let animeName;
            for (var i = animeDOM.length - 1; i >= 0; i--) {
                let season = lastSeason;
                try {
                    let hasSeason = parseInt(animeDOM[i].innerText.toLowerCase().split("season")[1]);
                    if (!isNaN(hasSeason)) {
                        season = hasSeason.toString();
                    }
                    else {
                        season = "1";
                    }
                }
                catch (err) {
                }
                if (season != lastSeason) {
                    lastSeason = season;
                    infoData.totalPages++;
                    infoData.pageInfo[infoData.totalPages - 1] = {
                        "pageSize": 0,
                        "pageName": `Season ${season}`
                    };
                }
                infoData.pageInfo[infoData.totalPages - 1].pageSize++;
                const title = animeDOM[i].innerText;
                const episodeNumTemp = title === null || title === void 0 ? void 0 : title.toLowerCase().split("episode");
                let epNum = 1;
                try {
                    if (episodeNumTemp && episodeNumTemp.length >= 2) {
                        epNum = parseFloat(episodeNumTemp[1]);
                    }
                }
                catch (err) {
                    console.warn(err);
                }
                animeEps.push({
                    link: animeDOM[i].href.replace(baseURL, "?watch=") + "&engine=0",
                    title: title,
                    altTitle: `Season ${season} Episode ${epNum}`,
                    altTruncatedTitle: `S${season} E${epNum}`
                });
            }
            // Very convoluted but it works
            try {
                let animeNameMain = animeEps[0].link.replace(baseURL, "?watch=").split("?watch=/")[1];
                animeName = animeNameMain.trim();
                animeName = animeName.split("episode")[0];
                if (animeNameMain.split("episode").length == 1) {
                    animeName = animeName.split("?id=")[0];
                    animeName = animeName.trim();
                    animeName = animeName + "-";
                    animeName = animeName.trim();
                }
                try {
                    if (animeName.indexOf("season") > -1) {
                        animeName = animeName.split("season")[0];
                    }
                }
                catch (err) {
                }
            }
            catch (err) {
                animeName = animeName + "-";
            }
            infoData.episodes = animeEps;
            try {
                infoData.mainName = (new URL(rawURL)).pathname.replace("/anime/", "") + "-";
            }
            catch (err) {
                infoData.mainName = rawURL.split("/anime/")[1] + "-";
            }
            return infoData;
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    getLinkFromUrl: async function (url) {
        let baseURL = this.baseURL;
        url = url.split("&engine")[0];
        url = `${baseURL}${url}`;
        let animeNameMain = decodeURIComponent(url.split(`${baseURL}/`)[1].split("/")[0]);
        let animeEp;
        let animeName = animeNameMain.split("episode")[0];
        animeName = animeName.trim();
        if (animeNameMain.split("episode").length == 1) {
            animeName = animeName.split("?id=")[0];
            animeName = animeName.trim();
            animeName = animeName + "-";
            animeName = animeName.trim();
        }
        try {
            if (animeName.indexOf("season") > -1) {
                animeName = animeName.split("season")[0];
            }
        }
        catch (err) {
        }
        try {
            let animeEpTemp = animeNameMain.split("episode")[1];
            if (animeEpTemp.substring(0, 1) == "-") {
                animeEpTemp = animeEpTemp.substring(1);
                animeEpTemp = animeEpTemp.replace("-", ".");
            }
            animeEp = Math.abs(parseFloat(animeEpTemp));
        }
        catch (err) {
        }
        if (isNaN(parseFloat(animeEp))) {
            animeEp = 1;
        }
        else if (animeEp < 1) {
            animeEp = 0.1;
        }
        const data = {
            sources: [],
            name: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null,
        };
        let dom = new DOMHandler();
        try {
            let reqOption = {
                'headers': {
                    'x-requested-with': 'XMLHttpRequest'
                },
                "method": "GET",
            };
            let pageHTML = await MakeFetch(url, {});
            let sources = data.sources;
            dom.innerHTML = DOMPurify.sanitize(pageHTML);
            try {
                let tmpName = dom.document.querySelector('[rel="category tag"]').getAttribute("href").replace(`${baseURL}/anime/`, "");
                if (tmpName != "") {
                    animeName = tmpName + "-";
                }
            }
            catch (err) {
            }
            let nextPrev = dom.document.getElementsByClassName("prev-next");
            for (let npi = 0; npi < nextPrev.length; npi++) {
                try {
                    let tempData = nextPrev[npi].children[0].getAttribute("rel").trim().toLowerCase();
                    if (tempData == "next" || tempData == "prev") {
                        data[tempData] = (nextPrev[npi].children[0].getAttribute("href").replace(baseURL, "")) + "&engine=0";
                    }
                }
                catch (err) {
                }
            }
            let tempReg = /<script>var.+?document\.write\(decodeURIComponent\(escape.+?<\/script>/gis;
            let tempRegOut = tempReg.exec(pageHTML)[0];
            let arrayReg = /\[.+\]/gis;
            let mainVidLink = "";
            let arrayRegOut = JSON.parse(arrayReg.exec(tempRegOut)[0]);
            let num = parseInt(tempRegOut.split(`.replace(\/\\D\/g,'')) -`)[1]);
            arrayRegOut.forEach(function (value) {
                mainVidLink += String.fromCharCode(parseInt(atob(value).replace(/\D/g, '')) - num);
            });
            mainVidLink = mainVidLink.split("src=\"")[1].split("\" ")[0];
            wcoRef = mainVidLink;
            reqOption.headers["referer"] = mainVidLink;
            let domain;
            try {
                domain = new URL(mainVidLink).origin;
            }
            catch (err) {
                domain = "https://embed.watchanimesub.net";
            }
            let videoHTML;
            if (config.chrome) {
                videoHTML = await MakeFetch(mainVidLink, {});
            }
            else {
                videoHTML = await MakeCusReqFmovies(mainVidLink, reqOption);
            }
            let vidLink = domain + videoHTML.split("$.getJSON(\"")[1].split("\"")[0];
            try {
                let vidLink2 = (vidLink.split("v=cizgi").join('v=')).split('&embed=cizgi').join('&embed=anime');
                let vidLink2HTML;
                if (config.chrome) {
                    vidLink2HTML = await MakeFetch(vidLink2, {});
                }
                else {
                    vidLink2HTML = await MakeCusReqFmovies(vidLink2, reqOption);
                }
                let vidLink2Data = JSON.parse(vidLink2HTML);
                if (vidLink2Data.hd != "") {
                    sources.push({
                        "url": vidLink2Data.cdn + "/getvid?evid=" + vidLink2Data.hd,
                        "name": "HD#2",
                        "type": "mp4"
                    });
                }
                if (vidLink2Data.enc != "") {
                    sources.push({
                        "url": vidLink2Data.cdn + "/getvid?evid=" + vidLink2Data.enc,
                        "name": "SD#2",
                        "type": "mp4"
                    });
                }
                if (vidLink2Data.fhd != "") {
                    sources.push({
                        "url": vidLink2Data.cdn + "/getvid?evid=" + vidLink2Data.fhd,
                        "name": "FHD#2",
                        "type": "mp4"
                    });
                }
            }
            catch (err) {
                console.error(err);
            }
            let vidLinkHTML;
            if (config.chrome) {
                vidLinkHTML = await MakeFetch(vidLink, {});
            }
            else {
                vidLinkHTML = await MakeCusReqFmovies(vidLink, reqOption);
            }
            let vidLinkData = JSON.parse(vidLinkHTML);
            if (vidLinkData.enc != "") {
                sources.unshift({
                    "url": vidLinkData.cdn + "/getvid?evid=" + vidLinkData.enc,
                    "name": "SD",
                    "type": "mp4",
                });
            }
            if (vidLinkData.hd != "") {
                sources.unshift({
                    "url": vidLinkData.cdn + "/getvid?evid=" + vidLinkData.hd,
                    "name": "HD",
                    "type": "mp4"
                });
            }
            if (vidLinkData.fhd != "") {
                sources.unshift({
                    "url": vidLinkData.cdn + "/getvid?evid=" + vidLinkData.fhd,
                    "name": "FHD",
                    "type": "mp4"
                });
            }
            data.sources = sources;
            data.name = animeName;
            data.nameWSeason = animeName;
            data.episode = animeEp;
            data.status = 200;
            data.message = "done";
            return data;
        }
        catch (err) {
            console.error(err);
            data.message = "Couldn't get the link";
            return data;
        }
    },
    discover: async function () {
        let baseURL = this.baseURL;
        let temp = new DOMHandler();
        try {
            temp.innerHTML = DOMPurify.sanitize(await MakeFetch(baseURL, {}));
            let data = [];
            for (let elem of temp.document.querySelectorAll(".items")[1].querySelectorAll("li")) {
                let image = "https:" + elem.querySelector("img").getAttribute("src");
                let tempAnchor = elem.querySelectorAll("a")[1];
                let name = tempAnchor.innerText;
                let link = tempAnchor.getAttribute("href");
                if (link == "") {
                    link = null;
                }
                data.push({
                    image,
                    name,
                    link,
                    "getLink": true
                });
            }
            return data;
        }
        catch (err) {
            throw err;
        }
    },
    getDiscoverLink: async function (mainLink) {
        let baseURL = this.baseURL;
        let temp = new DOMHandler();
        try {
            temp.innerHTML = DOMPurify.sanitize(await MakeFetch(`${baseURL}${mainLink}`, {}));
            mainLink = temp.document.querySelector('[rel="category tag"]').getAttribute("href").replace(baseURL, "");
            return mainLink;
        }
        catch (err) {
            throw err;
        }
    }
};
// RIP
var animixplay = {
    baseURL: "https://animixplay.to",
    type: "anime",
    disableAutoDownload: false,
    disabled: true,
    name: "Animixplay",
    shortenedName: "Animix",
    searchApi: async function (query) {
        const response = [];
        thisWindow.Dialogs.alert("Animixplay has been shut down.");
        return { status: 400, data: response };
    },
    getAnimeInfo: async function (url) {
        thisWindow.Dialogs.alert("Animixplay has been shut down.");
        return {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
    },
    getLinkFromUrl: async function (url) {
        thisWindow.Dialogs.alert("Animixplay has been shut down.");
        return {
            sources: [],
            name: "",
            title: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null
        };
    }
};
var fmovies = {
    baseURL: fmoviesBaseURL,
    type: "tv",
    disableAutoDownload: false,
    disabled: false,
    name: "FlixHQ",
    shortenedName: "Flix",
    searchApi: async function (query) {
        let tempDOM = new DOMHandler();
        try {
            query = decodeURIComponent(query);
            let response = await MakeFetchZoro(`https://${fmoviesBaseURL}/search/${query.replace(" ", "-")}`, {});
            tempDOM.innerHTML = DOMPurify.sanitize(response);
            let data = [];
            let section = tempDOM.document.querySelectorAll(".flw-item");
            for (var i = 0; i < section.length; i++) {
                let current = section[i];
                let dataCur = {
                    "image": "",
                    "link": "",
                    "name": "",
                };
                let poster = current.querySelector(".film-poster");
                let detail = current.querySelector(".film-detail");
                let temlLink = poster.querySelector("a").getAttribute("href");
                if (temlLink.includes("http")) {
                    temlLink = (new URL(temlLink)).pathname;
                }
                dataCur.image = poster.querySelector("img").getAttribute("data-src");
                dataCur.link = temlLink + "&engine=2";
                dataCur.name = detail.querySelector(".film-name").innerText.trim();
                data.push(dataCur);
            }
            return {
                "status": 200,
                "data": data
            };
        }
        catch (err) {
            throw err;
        }
    },
    getSeason: async function getSeason(showID, showURL) {
        let tempSeasonDIV = new DOMHandler();
        let tempMetaDataDIV = new DOMHandler();
        try {
            const isInk = fmoviesBaseURL.includes(".ink");
            let seasonHTML = await MakeFetch(`https://${fmoviesBaseURL}/ajax/v2/tv/seasons/${showID}`);
            tempSeasonDIV.innerHTML = DOMPurify.sanitize(seasonHTML);
            let tempDOM = tempSeasonDIV.document.getElementsByClassName("dropdown-item ss-item");
            let seasonInfo = {};
            for (var i = 0; i < tempDOM.length; i++) {
                seasonInfo[tempDOM[i].innerText] = tempDOM[i].getAttribute("data-id");
            }
            let showMetaData = await MakeFetch(`https://${fmoviesBaseURL}/${showURL}`);
            tempMetaDataDIV.innerHTML = DOMPurify.sanitize(showMetaData);
            let metaData;
            if (isInk) {
                metaData = {
                    "name": tempMetaDataDIV.document.querySelector(".detail_page-infor").querySelector(".heading-name").innerText,
                    "image": tempMetaDataDIV.document.querySelector(".detail_page-infor").querySelector(".film-poster-img").src,
                    "des": tempMetaDataDIV.document.querySelector(".detail_page-infor").querySelector(".description").innerText,
                };
            }
            else {
                metaData = {
                    "name": tempMetaDataDIV.document.querySelector(".movie_information").querySelector(".heading-name").innerText,
                    "image": tempMetaDataDIV.document.querySelector(".movie_information").querySelector(".film-poster-img").src,
                    "des": tempMetaDataDIV.document.querySelector(".m_i-d-content").querySelector(".description").innerText,
                };
            }
            try {
                metaData.genres = [];
                const metaCon = tempMetaDataDIV.document.querySelector(".elements");
                for (const genreAnchor of metaCon.querySelectorAll("a")) {
                    const href = genreAnchor.getAttribute("href");
                    if (href && href.includes("/genre/")) {
                        metaData.genres.push(genreAnchor.innerText);
                    }
                }
            }
            catch (err) {
                console.error(err);
            }
            return { "status": 200, "data": { "seasons": seasonInfo, "meta": metaData } };
        }
        catch (error) {
            return { "status": 400, "data": error.toString() };
        }
    },
    getEpisode: async function getEpisode(seasonID) {
        let temp = new DOMHandler();
        try {
            let r = await MakeFetch(`https://${fmoviesBaseURL}/ajax/v2/season/episodes/${seasonID}`);
            temp.innerHTML = DOMPurify.sanitize(r);
            let tempDOM = temp.document.getElementsByClassName("nav-link btn btn-sm btn-secondary eps-item");
            let data = [];
            for (var i = 0; i < tempDOM.length; i++) {
                let episodeData = {
                    title: tempDOM[i].getAttribute("title"),
                    id: tempDOM[i].getAttribute("data-id"),
                };
                data.push(episodeData);
            }
            return { "status": 200, "data": data };
        }
        catch (error) {
            return { "status": 400, "data": error.toString() };
        }
    },
    getAnimeInfo: async function (url) {
        const isInk = url.includes("-full-");
        // For backwards compatibility
        if (!url.includes("-online-") && !fmoviesBaseURL.includes(".ink")) {
            url = url.replace("-full-", "-online-");
        }
        else if (url.includes("-online-") && fmoviesBaseURL.includes(".ink")) {
            url = url.replace("-online-", "-full-");
        }
        let self = this;
        let urlSplit = url.split("&engine");
        if (urlSplit.length >= 2) {
            url = urlSplit[0];
        }
        let data = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
        let showIdSplit = url.split("-");
        let showId = showIdSplit[showIdSplit.length - 1].split(".")[0];
        const rawURL = `https://${fmoviesBaseURL}/${url}`;
        try {
            let response = await self.getSeason(showId, url);
            if (response.status == 200) {
                data.name = response.data.meta.name;
                data.image = response.data.meta.image;
                data.description = response.data.meta.des;
                data.mainName = url.split("/watch-")[1].split(isInk ? "-full" : "-online")[0] + "-" + showId + "-";
                data.episodes = [];
                if (response.data.meta.genres && response.data.meta.genres.length > 0) {
                    data.genres = response.data.meta.genres;
                }
                let allAwaits = [];
                let seasonNames = [];
                let metaDataPromises = [];
                let metaData = {};
                for (let season in response.data.seasons) {
                    seasonNames.push(season);
                    try {
                        // metaDataPromises.push(await MakeFetchTimeout(`https://ink-fork-carpenter.glitch.me/tv/season?id=${showId}&season=${season.split(" ")[1].trim()}`, {}, 1000));
                    }
                    catch (err) {
                    }
                    allAwaits.push(self.getEpisode(response.data.seasons[season]));
                }
                let values;
                let tempMetaData = [];
                let isSettleSupported = "allSettled" in Promise;
                if (!isSettleSupported) {
                    try {
                        tempMetaData = await Promise.all(metaDataPromises);
                    }
                    catch (err) {
                    }
                    values = await Promise.all(allAwaits);
                }
                else {
                    let allReponses = await Promise.allSettled([Promise.all(allAwaits), Promise.all(metaDataPromises)]);
                    if (allReponses[0].status === "fulfilled") {
                        values = allReponses[0].value;
                    }
                    else {
                        throw Error("Could not get the seasons. Try again.");
                    }
                    if (allReponses[1].status === "fulfilled") {
                        tempMetaData = allReponses[1].value;
                    }
                }
                try {
                    for (let i = 0; i < tempMetaData.length; i++) {
                        let metaJSON = JSON.parse(tempMetaData[i]);
                        let episodeData = {};
                        for (let j = 0; j < metaJSON.episodes.length; j++) {
                            let curEpisode = metaJSON.episodes[j];
                            episodeData[curEpisode.episode_number] = {};
                            episodeData[curEpisode.episode_number].thumbnail = `https://image.tmdb.org/t/p/w300${curEpisode.still_path}`,
                                episodeData[curEpisode.episode_number].description = curEpisode.overview;
                        }
                        metaData[metaJSON.season_number] = episodeData;
                    }
                }
                catch (err) {
                    console.error(err);
                }
                data.totalPages = values.length;
                data.pageInfo = [];
                for (let key = 0; key < values.length; key++) {
                    let seasonData = values[key];
                    data.pageInfo.push({
                        "pageName": seasonNames[key],
                        "pageSize": seasonData.data.length
                    });
                    for (let i = 0; i < seasonData.data.length; i++) {
                        let tempData = {
                            title: `${seasonNames[key]} | ${seasonData.data[i].title}`,
                            link: `?watch=${url}.${seasonData.data[i].id}&engine=2`,
                        };
                        try {
                            let ep = parseInt(seasonData.data[i].title.split("Eps ")[1]);
                            let season = seasonNames[key].split(" ")[1].trim();
                            tempData.altTitle = `Season ${season} Episode ${ep}`;
                            tempData.altTruncatedTitle = `S${season} E${ep}`;
                            if (season in metaData && ep in metaData[season]) {
                                tempData.thumbnail = metaData[season][ep].thumbnail;
                                tempData.description = metaData[season][ep].description;
                            }
                        }
                        catch (err) {
                            console.error(err);
                        }
                        data.episodes.push(tempData);
                    }
                }
                if (Object.keys(response.data.seasons).length === 0) {
                    let thumbnail = null;
                    try {
                        // thumbnail = `https://image.tmdb.org/t/p/w300${JSON.parse(await MakeFetchTimeout(`https://ink-fork-carpenter.glitch.me/movies?id=${showId}`, {}, 1000)).backdrop_path}`;
                    }
                    catch (err) {
                    }
                    let tempData = {
                        title: `Watch`,
                        link: `?watch=${url}&engine=2`
                    };
                    if (thumbnail) {
                        tempData.thumbnail = thumbnail;
                    }
                    data.episodes.push(tempData);
                    data.totalPages = 1;
                    data.pageInfo = [{
                            "pageName": "Movie",
                            "pageSize": 1
                        }];
                }
                return data;
            }
            else {
                throw Error("Could not get the seasons.");
            }
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    getLinkFromStream: async function getLinkFromStream(url) {
        try {
            var option = {
                'headers': {
                    'x-requested-with': 'XMLHttpRequest',
                }
            };
            let host = (new URL(url)).origin;
            let linkSplit = url.split("/");
            let link = linkSplit[linkSplit.length - 1];
            link = link.split("?")[0];
            let sourceJSON = JSON.parse(await MakeCusReqFmovies(`${host}/ajax/embed-4/getSources?id=${link}&_token=3&_number=${6}`, option));
            return (sourceJSON);
        }
        catch (err) {
            throw err;
        }
    },
    getLinkFromUrl: async function (url) {
        const isInk = fmoviesBaseURL.includes(".ink");
        let self = this;
        if (!url.includes("-online-") && !fmoviesBaseURL.includes(".ink")) {
            url = url.replace("-full-", "-online-");
        }
        else if (url.includes("-online-") && fmoviesBaseURL.includes(".ink")) {
            url = url.replace("-online-", "-full-");
        }
        url = url.split("&engine")[0];
        const data = {
            sources: [],
            name: "",
            title: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null
        };
        let showIdSplit = url.split("-");
        let showId = showIdSplit[showIdSplit.length - 1].split(".")[0];
        const infoDOM = new DOMHandler();
        const tempGetDom = new DOMHandler();
        const temp = new DOMHandler();
        try {
            const option = {
                'headers': {
                    'referer': 'https://fmovies.ps/',
                    'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36 Edg/98.0.1108.43",
                }
            };
            let split = url.split("-");
            split = split[split.length - 1].split(".");
            let isShow = split.length == 1;
            let server;
            let ep;
            let responseAPI;
            if (isShow) {
                ep = split[0];
                responseAPI = await MakeCusReqFmovies(`https://${fmoviesBaseURL}/ajax/movie/episodes/${ep}`, option);
            }
            else {
                ep = split[1];
                responseAPI = await MakeCusReqFmovies(`https://${fmoviesBaseURL}/ajax/v2/episode/servers/${ep}`, option);
            }
            if (isShow) {
                let getLink2 = responseAPI;
                infoDOM.innerHTML = DOMPurify.sanitize(getLink2);
                let tempDOM = infoDOM.document.getElementsByClassName("nav-link btn btn-sm btn-secondary");
                for (var i = 0; i < tempDOM.length; i++) {
                    if (tempDOM[i].getAttribute("title").toLowerCase().indexOf("vidcloud") > -1) {
                        server = tempDOM[i].getAttribute("data-linkid");
                        break;
                    }
                }
            }
            else {
                let getLink2 = responseAPI;
                infoDOM.innerHTML = DOMPurify.sanitize(getLink2);
                let tempDOM = infoDOM.document.getElementsByClassName("nav-link btn btn-sm btn-secondary");
                for (var i = 0; i < tempDOM.length; i++) {
                    if (tempDOM[i].getAttribute("title").toLowerCase().indexOf("vidcloud") > -1) {
                        server = tempDOM[i].getAttribute("data-id");
                        break;
                    }
                }
            }
            let seasonLinkPromises = [
                MakeFetch(`https://${fmoviesBaseURL}/watch-${url.split(".")[0]}.${server}`),
                MakeCusReqFmovies(`https://${fmoviesBaseURL}/ajax/get_link/${server}`, option)
            ];
            let seasonLinkData = await Promise.all(seasonLinkPromises);
            let getSeason = seasonLinkData[0];
            tempGetDom.innerHTML = DOMPurify.sanitize(getSeason);
            let currentSeason = tempGetDom.document.querySelector(".detail_page-watch").getAttribute("data-season");
            let getLink = seasonLinkData[1];
            let title = JSON.parse(getLink).title;
            let link = JSON.parse(getLink).link;
            let promises = [self.getLinkFromStream(link)];
            let seasonNotEmpty = false;
            if (currentSeason != "") {
                seasonNotEmpty = true;
                promises.push(MakeFetch(`https://${fmoviesBaseURL}/ajax/v2/season/episodes/${currentSeason}`));
            }
            let parallelReqs = await Promise.all(promises);
            if (seasonNotEmpty) {
                let r = parallelReqs[1];
                temp.innerHTML = DOMPurify.sanitize(r);
                let tempDOM = temp.document.getElementsByClassName("nav-link btn btn-sm btn-secondary eps-item");
                for (var i = 0; i < tempDOM.length; i++) {
                    if (ep == tempDOM[i].getAttribute("data-id")) {
                        if (i != 0) {
                            data.prev = url.split(".")[0] + "." + tempDOM[i - 1].getAttribute("data-id") + "&engine=2";
                        }
                        if (i != (tempDOM.length - 1)) {
                            data.next = url.split(".")[0] + "." + tempDOM[i + 1].getAttribute("data-id") + "&engine=2";
                        }
                    }
                }
            }
            let sourceJSON = parallelReqs[0];
            let encryptedURL = sourceJSON.sources;
            let decryptKey;
            if (typeof encryptedURL == "string") {
                try {
                    decryptKey = await extractKey(4, null, true);
                    sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                }
                catch (err) {
                    if (err.message == "Malformed UTF-8 data") {
                        decryptKey = await extractKey(4);
                        try {
                            sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                        }
                        catch (err) {
                        }
                    }
                }
            }
            data.status = 200;
            data.message = "done";
            if (title == "") {
                data.episode = (1).toString();
            }
            else {
                data.episode = parseFloat(title.split(" ")[1]).toString();
            }
            data.name = url.split("/watch-")[1].split(isInk ? "-full" : "-online")[0] + "-" + showId + "-";
            data.nameWSeason = url.split("/watch-")[1].split(isInk ? "-full" : "-online")[0] + "-" + currentSeason;
            data.sources = [{
                    "url": sourceJSON.sources[0].file,
                    "name": "HLS",
                    "type": "hls",
                }];
            try {
                title = title.split(":");
                title.shift();
                title = title.join(":").trim();
            }
            catch (err) {
            }
            data.title = title;
            data.subtitles = sourceJSON.tracks;
            if (parseFloat(data.episode) === 0) {
                data.episode = "0.1";
            }
            return (data);
        }
        catch (err) {
            console.error(err);
            throw (new Error("Couldn't get the link"));
        }
    },
    discover: async function () {
        let temp = new DOMHandler();
        try {
            temp.innerHTML = DOMPurify.sanitize(await MakeFetch(`https://fmovies.ink/tv-show`, {}));
            let data = [];
            for (const elem of temp.document.querySelectorAll(".flw-item")) {
                let image = elem.querySelector("img").getAttribute("data-src");
                let tempAnchor = elem.querySelector(".film-name");
                let name = tempAnchor.innerText.trim();
                let link = tempAnchor.querySelector("a").getAttribute("href");
                try {
                    link = (new URL(link)).pathname;
                }
                catch (err) {
                }
                data.push({
                    image,
                    name,
                    link
                });
            }
            return data;
        }
        catch (err) {
            throw err;
        }
    },
    fixTitle: function (title) {
        try {
            const tempTitle = title.split("-");
            if (tempTitle.length > 2) {
                tempTitle.pop();
                if (title[title.length - 1] == "-") {
                    tempTitle.pop();
                }
                title = tempTitle.join("-");
                return title;
            }
            else {
                return title;
            }
        }
        catch (err) {
            return title;
        }
    }
};
var zoro = {
    baseURL: "https://kaido.to",
    type: "anime",
    supportsMalsync: true,
    disableAutoDownload: false,
    nonV2URLs: ["https://9animetv.to", "https://kaido.to"],
    disabled: false,
    name: "Zoro",
    shortenedName: "Zoro",
    searchApi: async function (query) {
        let dom = new DOMHandler();
        try {
            let searchHTML = await MakeFetchZoro(`${this.baseURL}/search?keyword=${query}`, {});
            dom.innerHTML = DOMPurify.sanitize(searchHTML);
            let itemsDOM = dom.document.querySelectorAll('.flw-item');
            let data = [];
            for (var i = 0; i < itemsDOM.length; i++) {
                let con = itemsDOM[i];
                let src = con.querySelector("img").getAttribute("data-src");
                let aTag = con.querySelector("a");
                let animeName = aTag.getAttribute("title");
                let animeId = aTag.getAttribute("data-id");
                let animeHref = aTag.getAttribute("href").split("?")[0] + "&engine=3";
                data.push({ "name": animeName, "id": animeId, "image": src, "link": animeHref });
            }
            return ({ data, "status": 200 });
        }
        catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url, aniID) {
        const settled = "allSettled" in Promise;
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch").split("-").pop();
        let response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
        try {
            if (settled) {
                let anilistID;
                if (!isNaN(parseInt(aniID))) {
                    anilistID = parseInt(aniID);
                }
                if (!anilistID) {
                    try {
                        anilistID = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/bal-mackup/mal-backup/master/page/Zoro/${id}.json`)).aniId;
                    }
                    catch (err) {
                        try {
                            anilistID = JSON.parse(await MakeFetch(`https://api.malsync.moe/page/Zoro/${id}`)).aniId;
                        }
                        catch (err) {
                            // anilistID will be undefined
                        }
                    }
                }
                if (anilistID) {
                    const promises = [
                        this.getAnimeInfoInter(url),
                        MakeFetchTimeout(`https://api.enime.moe/mapping/anilist/${anilistID}`, {}, 2000)
                    ];
                    const promiseResponses = await Promise.allSettled(promises);
                    if (promiseResponses[0].status === "fulfilled") {
                        response = promiseResponses[0].value;
                        if (promiseResponses[1].status === "fulfilled") {
                            try {
                                const metaData = JSON.parse(promiseResponses[1].value).episodes;
                                const metaDataMap = {};
                                for (let i = 0; i < metaData.length; i++) {
                                    metaDataMap[metaData[i].number] = metaData[i];
                                }
                                for (let i = 0; i < response.episodes.length; i++) {
                                    const currentEp = metaDataMap[response.episodes[i].id];
                                    const currentResponseEp = response.episodes[i];
                                    currentResponseEp.description = currentEp === null || currentEp === void 0 ? void 0 : currentEp.description;
                                    currentResponseEp.thumbnail = currentEp === null || currentEp === void 0 ? void 0 : currentEp.image;
                                    currentResponseEp.date = new Date(currentEp === null || currentEp === void 0 ? void 0 : currentEp.airedAt);
                                    currentResponseEp.title += ` - ${currentEp === null || currentEp === void 0 ? void 0 : currentEp.title}`;
                                }
                            }
                            catch (err) {
                                console.error(err);
                            }
                        }
                        return response;
                    }
                    else {
                        throw promiseResponses[0].reason;
                    }
                }
                else {
                    return await this.getAnimeInfoInter(url);
                }
            }
            else {
                return await this.getAnimeInfoInter(url);
            }
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    },
    getAnimeInfoInter: async function (url) {
        url = url.split("&engine")[0];
        const is9animeTv = this.baseURL === "https://9animetv.to";
        const rawURL = `${this.baseURL}${is9animeTv ? "/watch/" : "/"}${url}`;
        const animeDOM = new DOMHandler();
        ;
        const dom = new DOMHandler();
        ;
        const type = this.nonV2URLs.includes(this.baseURL);
        try {
            let idSplit = url.replace("?watch=/", "").split("-");
            let id = idSplit[idSplit.length - 1].split("?")[0];
            let response = {
                "name": "",
                "image": "",
                "description": "",
                "episodes": [],
                "mainName": ""
            };
            let animeHTML = await MakeFetchZoro(rawURL, {});
            animeDOM.innerHTML = DOMPurify.sanitize(animeHTML);
            let name = (new URLSearchParams(`?watch=${url}`)).get("watch");
            const nameSplit = name.split("-");
            nameSplit.pop();
            name = nameSplit.join("-");
            response.mainName = name;
            response.name = animeDOM.document.querySelector(".film-name.dynamic-name").innerText;
            response.image = animeDOM.document.querySelector(is9animeTv ? ".anime-detail" : ".layout-page.layout-page-detail").querySelector("img").src;
            response.description = animeDOM.document.querySelector(".film-description").innerText;
            try {
                response.genres = [];
                const metaCon = animeDOM.document.querySelector(".item.item-list");
                for (const genreAnchor of metaCon.querySelectorAll("a")) {
                    response.genres.push(genreAnchor.innerText);
                }
            }
            catch (err) {
                console.error(err);
            }
            let episodeHTML = JSON.parse(await MakeFetchZoro(`${this.baseURL}/ajax/${type ? "" : "v2/"}episode/list/${id}`, {})).html;
            dom.innerHTML = DOMPurify.sanitize(episodeHTML);
            let episodeListDOM = dom.document.querySelectorAll('.ep-item');
            let data = [];
            for (var i = 0; i < episodeListDOM.length; i++) {
                let tempEp = {
                    "isFiller": episodeListDOM[i].getAttribute("class").includes("ssl-item-filler"),
                    "link": episodeListDOM[i].getAttribute("href").replace("/watch/", "?watch=").replace("?ep=", "&ep=") + "&engine=3",
                    "id": episodeListDOM[i].getAttribute("data-number"),
                    "sourceID": episodeListDOM[i].getAttribute("data-id"),
                    "title": "Episode " + episodeListDOM[i].getAttribute("data-number"),
                    "altTitle": "Episode " + episodeListDOM[i].getAttribute("data-number"),
                };
                data.push(tempEp);
            }
            response.episodes = data;
            return response;
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    getEpisodeListFromAnimeId: async function getEpisodeListFromAnimeId(showID, episodeId) {
        let dom = new DOMHandler();
        const type = this.nonV2URLs.includes(this.baseURL);
        try {
            let res = JSON.parse((await MakeFetchZoro(`${this.baseURL}/ajax/${type ? "" : "v2/"}episode/list/${showID}`, {})));
            res = res.html;
            let ogDOM = dom;
            dom.innerHTML = DOMPurify.sanitize(res);
            let epItemsDOM = dom.document.querySelectorAll('.ep-item');
            let data = [];
            for (var i = 0; i < epItemsDOM.length; i++) {
                let temp = {
                    "link": epItemsDOM[i].getAttribute("href").replace("/watch/", "").replace("?ep=", "&ep=") + "&engine=3",
                    "id": epItemsDOM[i].getAttribute("data-id"),
                    "title": parseFloat(epItemsDOM[i].getAttribute("data-number")),
                    "current": 0
                };
                if (parseFloat(epItemsDOM[i].getAttribute("data-id")) == parseFloat(episodeId)) {
                    temp.current = 1;
                }
                data.push(temp);
            }
            return data;
        }
        catch (err) {
            throw err;
        }
    },
    addSource: async function addSource(type, id, subtitlesArray, sourceURLs) {
        let shouldThrow = false;
        const baseType = this.nonV2URLs.includes(this.baseURL);
        try {
            let sources = await MakeFetchZoro(`${this.baseURL}/ajax/${baseType ? "" : "v2/"}episode/sources?id=${id}`, {});
            sources = JSON.parse(sources).link;
            let urlHost = (new URL(sources)).origin;
            let sourceIdArray = sources.split("/");
            let sourceId = sourceIdArray[sourceIdArray.length - 1];
            sourceId = sourceId.split("?")[0];
            let token = localStorage.getItem("rapidToken");
            let sourceJSON = JSON.parse((await MakeFetchZoro(`${urlHost}${baseType ? "/ajax/embed-6/getSources?id=" : "/embed-2/ajax/e-1/getSources?id="}${sourceId}&token=${token}`, {})));
            if (sourceJSON.status === false) {
                shouldThrow = true;
            }
            try {
                for (let j = 0; j < sourceJSON.tracks.length; j++) {
                    sourceJSON.tracks[j].label += " - " + type;
                    if (sourceJSON.tracks[j].kind == "captions") {
                        subtitlesArray.push(sourceJSON.tracks[j]);
                    }
                }
            }
            catch (err) {
            }
            try {
                if (sourceJSON.encrypted && typeof sourceJSON.sources == "string") {
                    let encryptedURL = sourceJSON.sources;
                    let decryptKey, tempFile;
                    try {
                        decryptKey = (await extractKey(baseType ? 0 : 6, null, true)).trim();
                        sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                    }
                    catch (err) {
                        if (err.message == "Malformed UTF-8 data") {
                            decryptKey = (await extractKey(baseType ? 0 : 6)).trim();
                            try {
                                sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                            }
                            catch (err) {
                            }
                        }
                    }
                    console.log([encryptedURL, decryptKey]);
                    console.log(JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8)));
                }
                let tempSrc = { "url": sourceJSON.sources[0].file, "name": "HLS#" + type, "type": "hls" };
                if ("intro" in sourceJSON && "start" in sourceJSON.intro && "end" in sourceJSON.intro) {
                    tempSrc.skipIntro = sourceJSON.intro;
                }
                sourceURLs.push(tempSrc);
            }
            catch (err) {
                console.error(err);
            }
        }
        catch (err) {
            console.error(err);
        }
        if (shouldThrow) {
            throw new Error("Token not found");
        }
    },
    getVideoTitle: async function (url) {
        let showURL = new URLSearchParams(url);
        try {
            const response = await this.getAnimeInfo(showURL.get("watch"));
            const ep = showURL.get("ep");
            for (let i = 0; i < response.episodes.length; i++) {
                if (response.episodes[i].sourceID === ep) {
                    const titleTemp = response.episodes[i].title.split("-");
                    titleTemp.shift();
                    const title = titleTemp.join("-");
                    if (title) {
                        return title === null || title === void 0 ? void 0 : title.trim();
                    }
                    return "";
                }
            }
            return "";
        }
        catch (err) {
            return "";
        }
    },
    getLinkFromUrl: async function (url) {
        const sourceURLs = [];
        let subtitles = [];
        const resp = {
            sources: sourceURLs,
            name: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null,
        };
        let episodeId, animeId;
        const dom = new DOMHandler();
        const baseType = this.nonV2URLs.includes(this.baseURL);
        try {
            episodeId = parseFloat(url.split("&ep=")[1]).toString();
            animeId = url.replace("?watch=", "").split("-");
            animeId = animeId[animeId.length - 1].split("&")[0];
            let a = await MakeFetchZoro(`${this.baseURL}/ajax/${baseType ? "" : "v2/"}episode/servers?episodeId=${episodeId}`, {});
            let domIn = JSON.parse(a).html;
            dom.innerHTML = DOMPurify.sanitize(domIn);
            let promises = [];
            promises.push(this.getEpisodeListFromAnimeId(animeId, episodeId));
            let tempDom = dom.document.querySelectorAll('[data-server-id="4"]');
            let hasSource = false;
            for (var i = 0; i < tempDom.length; i++) {
                hasSource = true;
                promises.push(this.addSource(tempDom[i].getAttribute("data-type"), tempDom[i].getAttribute('data-id'), subtitles, sourceURLs));
            }
            tempDom = dom.document.querySelectorAll('[data-server-id="1"]');
            for (var i = 0; i < tempDom.length; i++) {
                promises.push(this.addSource(tempDom[i].getAttribute("data-type"), tempDom[i].getAttribute('data-id'), subtitles, sourceURLs));
            }
            let promRes;
            try {
                promRes = await Promise.all(promises);
            }
            catch (err) {
                this.genToken();
            }
            let links = promRes[0];
            let prev = null;
            let next = null;
            let check = false;
            let epNum = 1;
            for (var i = 0; i < (links).length; i++) {
                if (check === true) {
                    next = links[i].link;
                    break;
                }
                if (parseFloat(links[i].id) == parseFloat(episodeId)) {
                    check = true;
                    epNum = links[i].title;
                }
                if (check === false) {
                    prev = links[i].link;
                }
            }
            resp["sources"] = sourceURLs;
            resp["episode"] = (epNum === 0 ? 0.1 : epNum).toString();
            if (next != null) {
                resp.next = next;
            }
            if (prev != null) {
                resp.prev = prev;
            }
            let name = url;
            let nameSplit = name.replace("?watch=", "").split("&ep=")[0].split("-");
            nameSplit.pop();
            name = nameSplit.join("-");
            resp.name = name;
            resp.nameWSeason = name;
            resp.subtitles = subtitles;
            resp.status = 200;
            return resp;
        }
        catch (err) {
            throw err;
        }
    },
    discover: async function () {
        let temp = new DOMHandler();
        try {
            temp.innerHTML = DOMPurify.sanitize(await MakeFetchZoro(`${this.baseURL}/top-airing`, {}));
            let data = [];
            for (let elem of temp.document.querySelectorAll(".flw-item")) {
                let image = elem.querySelector("img").getAttribute("data-src");
                let tempAnchor = elem.querySelector("a");
                let name = tempAnchor.getAttribute("title");
                let link = tempAnchor.getAttribute("href");
                data.push({
                    image,
                    name,
                    link
                });
            }
            return data;
        }
        catch (err) {
            throw err;
        }
    },
    genToken: async function genToken() {
        await getWebviewHTML("https://rapid-cloud.co/", false, 15000, `let resultInApp={'status':200,'data':localStorage.setItem("v1.1_getSourcesCount", "40")};webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(resultInApp));`);
        await new Promise(r => setTimeout(r, 500));
        try {
            await thisWindow.Dialogs.alert("Close the inAppBrowser when the video has started playing.");
            await getWebviewHTML("https://zoro.to/watch/eighty-six-2nd-season-17760?ep=84960", false, 120000, '');
        }
        catch (err) {
        }
        await new Promise(r => setTimeout(r, 500));
        try {
            const token = await getWebviewHTML("https://rapid-cloud.co/", false, 15000, `let resultInApp={'status':200,'data':localStorage.getItem("v1.1_token")};webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(resultInApp));`);
            localStorage.setItem("rapidToken", token.data.data);
            await thisWindow.Dialogs.alert("Token extracted. You can now refresh the page.");
        }
        catch (err) {
            await thisWindow.Dialogs.alert("Could not extract the token. Try again or Contact the developer.");
        }
    },
    getMetaData: async function (search) {
        const id = search.get("watch").split("-").pop();
        return await getAnilistInfo("Zoro", id);
    },
    rawURLtoInfo: function (url) {
        // https://zoro.to/kimetsu-no-yaiba-movie-mugen-ressha-hen-15763
        return `?watch=${url.pathname}&engine=3`;
    }
};
try {
    (async function () {
        const keys = JSON.parse(await MakeFetchZoro(`https://raw.githubusercontent.com/enimax-anime/gogo/main/zoro.json`));
        zoro.baseURL = keys[0];
    })();
}
catch (err) {
    console.error(err);
}
var twitch = {
    baseURL: "https://twitch.tv",
    type: "others",
    disabled: false,
    disableAutoDownload: true,
    name: "Twitch",
    shortenedName: "Twitch",
    searchApi: async function (query) {
        try {
            const clientId = "kimne78kx3ncx6brgo4mv6wki5h1ko";
            const response = await MakeFetch("https://gql.twitch.tv/gql", {
                "headers": {
                    'Client-id': clientId,
                    'Content-Type': 'application/json',
                },
                "method": "POST",
                "body": JSON.stringify({
                    "operationName": "SearchResultsPage_SearchResults",
                    "variables": { "query": query, "options": null },
                    "extensions": {
                        "persistedQuery": {
                            "version": 1,
                            "sha256Hash": "6ea6e6f66006485e41dbe3ebd69d5674c5b22896ce7b595d7fce6411a3790138"
                        }
                    }
                })
            });
            const responseJSON = JSON.parse(response);
            const data = [];
            for (let channels of responseJSON.data.searchFor.channels.edges) {
                data.push({
                    "name": channels.item.login,
                    "id": channels.item.login,
                    "image": channels.item.profileImageURL.replace("150x150.png", "300x300.png"),
                    "link": "/" + encodeURIComponent(channels.item.login) + "&engine=4"
                });
            }
            return { data, "status": 200 };
        }
        catch (err) {
            return {
                data: err.toString(),
                status: 400
            };
        }
    },
    // @ts-ignore
    getAnimeInfo: function (url, sibling = false, currentID = -1) {
        url = url.split("&engine")[0];
        let id = url.replace("?watch=/", "");
        const rawURL = `${this.baseURL}/${url}`;
        let response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
        response.name = id;
        response.image = "https://wallpaperaccess.com/full/4487013.jpg";
        response.description = "Twitch VOD";
        response.mainName = id;
        const clientId = "kimne78kx3ncx6brgo4mv6wki5h1ko";
        return new Promise((resolve, reject) => {
            fetch("https://gql.twitch.tv/gql", {
                "headers": {
                    'Client-id': clientId,
                    'Content-Type': 'application/json',
                },
                "method": "POST",
                "body": JSON.stringify([
                    { "operationName": "StreamRefetchManager", "variables": { "channel": id }, "extensions": { "persistedQuery": { "version": 1, "sha256Hash": "ecdcb724b0559d49689e6a32795e6a43bba4b2071b5e762a4d1edf2bb42a6789" } } },
                    { "operationName": "FilterableVideoTower_Videos", "variables": { "limit": 50, "channelOwnerLogin": id, "broadcastType": "ARCHIVE", "videoSort": "TIME" }, "extensions": { "persistedQuery": { "version": 1, "sha256Hash": "a937f1d22e269e39a03b509f65a7490f9fc247d7f83d6ac1421523e3b68042cb" } } }
                ])
            }).then((x) => x.json()).then((resData) => {
                let isLive = resData[0].data.user.stream !== null;
                let items = resData[1].data.user.videos.edges;
                let data = [];
                response.totalPages = 2;
                response.pageInfo = [{
                        pageName: "VODs",
                        pageSize: items.length,
                    }];
                if (sibling) {
                    data = [null, null, null];
                    for (let i = 0; i < items.length; i++) {
                        let which = -1;
                        if (currentID == items[i].node.id) {
                            which = 1;
                        }
                        else if (i != 0 && currentID == items[i - 1].node.id) {
                            which = 0;
                        }
                        else if (i != (items.length - 1) && currentID == items[i + 1].node.id) {
                            which = 2;
                        }
                        if (which != -1) {
                            data[which] = {
                                "link": encodeURIComponent(id) + "&id=" + items[i].node.id + "&engine=4",
                                "id": id,
                                "title": items[i].node.title,
                            };
                        }
                    }
                }
                else {
                    for (let vod of items) {
                        response.image = vod.node.owner.profileImageURL.replace("50x50.png", "300x300.png");
                        data.unshift({
                            "link": "?watch=" + encodeURIComponent(id) + "&id=" + vod.node.id + "&engine=4",
                            "id": id,
                            "title": vod.node.title,
                            "thumbnail": vod.node.previewThumbnailURL,
                            "date": new Date(vod.node.publishedAt)
                        });
                    }
                }
                if (isLive && !sibling) {
                    data.unshift({
                        "link": "?watch=" + encodeURIComponent(id) + "&id=" + "live" + "&engine=4",
                        "id": id,
                        "title": `${id} is Live!`,
                    });
                    response.pageInfo.unshift({
                        pageName: "Live",
                        pageSize: 1,
                    });
                }
                response.episodes = data;
                resolve(response);
            }).catch((error) => {
                error.url = rawURL;
                reject(error);
            });
        });
    },
    'getLinkFromUrl': async function (url) {
        url = "?watch=" + url;
        const params = new URLSearchParams(url);
        const name = params.get("watch");
        const ep = params.get("id");
        const isLive = (ep == "live");
        const clientId = "kimne78kx3ncx6brgo4mv6wki5h1ko";
        let title = "";
        function getAccessToken(id, isVod) {
            const data = JSON.stringify({
                operationName: "PlaybackAccessToken",
                extensions: {
                    persistedQuery: {
                        version: 1,
                        sha256Hash: "0828119ded1c13477966434e15800ff57ddacf13ba1911c129dc2200705b0712"
                    }
                },
                variables: {
                    isLive: !isVod,
                    login: (isVod ? "" : id),
                    isVod: isVod,
                    vodID: (isVod ? id : ""),
                    playerType: "embed"
                }
            });
            return new Promise((resolve, reject) => {
                fetch("https://gql.twitch.tv/gql", {
                    "headers": {
                        'Client-id': clientId,
                        'Content-Type': 'application/json',
                    },
                    "method": "POST",
                    "body": data
                }).then((x) => x.json()).then((resData) => {
                    if (isVod) {
                        resolve(resData.data.videoPlaybackAccessToken);
                    }
                    else {
                        resolve(resData.data.streamPlaybackAccessToken);
                    }
                }).catch((error) => reject(error));
            });
        }
        function getPlaylist(id, accessToken, vod) {
            return `https://usher.ttvnw.net/${vod ? 'vod' : 'api/channel/hls'}/${id}.m3u8?client_id=${clientId}&token=${accessToken.value}&sig=${accessToken.signature}&allow_source=true&allow_audio_only=true`;
        }
        function getStream(channel) {
            return new Promise((resolve, reject) => {
                getAccessToken(channel, false)
                    .then((accessToken) => getPlaylist(channel, accessToken, false))
                    .then((playlist) => resolve(playlist))
                    .catch(error => reject(error));
            });
        }
        function getVod(vid) {
            return new Promise((resolve, reject) => {
                getAccessToken(vid, true)
                    .then((accessToken) => getPlaylist(vid, accessToken, true))
                    .then((playlist) => resolve(playlist))
                    .catch(error => reject(error));
            });
        }
        const resp = {
            sources: [],
            name: "",
            title: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null
        };
        if (!isLive) {
            try {
                const epList = await this.getAnimeInfo(name, true, parseInt(ep));
                if (epList.episodes[0]) {
                    resp.prev = epList.episodes[0].link;
                }
                if (epList.episodes[2]) {
                    resp.next = epList.episodes[2].link;
                }
                try {
                    if (epList.episodes[1]) {
                        title = epList.episodes[1].title;
                    }
                }
                catch (err) {
                    title = "";
                }
            }
            catch (err) {
            }
        }
        else {
            title = "Live";
        }
        resp.sources = [
            {
                "url": isLive ? (await getStream(name)) : (await getVod(ep)),
                "name": "VOD",
                "type": "hls"
            }
        ];
        resp.name = name;
        resp.episode = "1";
        resp.nameWSeason = name + ep;
        resp.subtitles = [];
        resp.status = 200;
        resp.title = title;
        return resp;
    },
    getChat: async function (lastTime, lastCursor, videoID) {
        const clientId = "kimne78kx3ncx6brgo4mv6wki5h1ko";
        const response = JSON.parse(await MakeFetch("https://gql.twitch.tv/gql", {
            "headers": {
                'Client-id': clientId,
                'Content-Type': 'application/json',
            },
            "method": "POST",
            "body": JSON.stringify([{
                    "operationName": "VideoCommentsByOffsetOrCursor",
                    "variables": {
                        "videoID": videoID,
                        "contentOffsetSeconds": lastTime
                    },
                    "extensions": {
                        "persistedQuery": {
                            "version": 1,
                            "sha256Hash": "b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a"
                        }
                    }
                }])
        }));
        const edges = response[0].data.video.comments.edges;
        const index = edges.findIndex((edge) => {
            return edge.cursor == lastCursor;
        });
        if (index != -1) {
            edges.splice(index);
        }
        console.log(edges);
    }
};
var anna = {
    baseURL: "https://annas-archive.org",
    type: "manga",
    disabled: false,
    disableAutoDownload: true,
    name: "Anna's Archive",
    shortenedName: "Anna",
    searchApi: async function (query) {
        var _a, _b, _c;
        const searchDOM = new DOMHandler();
        try {
            const searchHTML = await MakeFetch(`${this.baseURL}/search?q=${query}`);
            searchDOM.innerHTML = DOMPurify.sanitize(searchHTML, {
                ADD_TAGS: ["#comment"]
            });
            const itemsDOM = searchDOM.document.querySelectorAll(".h-\\[125\\]");
            const data = [];
            for (let i = 0; i < itemsDOM.length; i++) {
                const con = itemsDOM[i];
                if (con.classList.contains("js-scroll-hidden")) {
                    con.innerHTML = con.innerHTML.replace('<' + '!--', '').replace('-' + '->', '');
                }
                data.push({
                    "name": (_a = con.querySelector(".font-bold")) === null || _a === void 0 ? void 0 : _a.innerText,
                    "image": (_b = con.querySelector("img")) === null || _b === void 0 ? void 0 : _b.getAttribute("src"),
                    "link": ((_c = con.querySelector("a")) === null || _c === void 0 ? void 0 : _c.getAttribute("href")) + "&engine=12"
                });
            }
            return ({ data, "status": 200 });
        }
        catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url) {
        var _a, _b, _c, _d, _e, _f, _g;
        const infoDOM = new DOMHandler();
        try {
            const response = {
                "name": "",
                "image": "",
                "description": "",
                "episodes": [],
                "mainName": "",
                "isManga": true,
            };
            const searchParam = new URLSearchParams(`?watch=${url}`);
            const identifier = searchParam.get("watch");
            const infoHTML = await MakeFetch(`${this.baseURL}/${identifier}`);
            infoDOM.innerHTML = DOMPurify.sanitize(infoHTML);
            response.mainName = identifier.replace("md5/", "anna-");
            response.image = (_b = (_a = infoDOM.document.querySelector("main")) === null || _a === void 0 ? void 0 : _a.querySelector("img")) === null || _b === void 0 ? void 0 : _b.getAttribute("src");
            response.name = (_d = (_c = infoDOM.document.querySelector("main")) === null || _c === void 0 ? void 0 : _c.querySelector(".font-bold")) === null || _d === void 0 ? void 0 : _d.innerText;
            response.description = (_e = infoDOM.document.querySelector(".js-md5-top-box-description")) === null || _e === void 0 ? void 0 : _e.innerText;
            response.mainName = `${response.mainName}-${(_f = window.btoa(response.name.replace(/[^\x00-\x7F]/g, ""))) === null || _f === void 0 ? void 0 : _f.trim()}`;
            response.episodes = [
                {
                    link: `?watch=${identifier}&engine=12`,
                    title: (_g = infoDOM.document.querySelector(".text-sm")) === null || _g === void 0 ? void 0 : _g.innerText
                }
            ];
            return response;
        }
        catch (err) {
            throw err;
        }
    },
    getLinkFromUrl: async function (url) {
        var _a, _b, _c, _d;
        const linkDOM = new DOMHandler();
        try {
            const response = {
                sources: [],
                pages: [],
                nextTitle: "",
                prevTitle: "",
                name: "",
                chapter: 1,
                next: null,
                prev: null,
                type: "manga",
                readerType: "epub"
            };
            const searchParam = new URLSearchParams(`?watch=${url}`);
            const identifier = searchParam.get("watch");
            const linkHTML = await MakeFetch(`${this.baseURL}/${identifier}`);
            linkDOM.innerHTML = DOMPurify.sanitize(linkHTML);
            response.name = (_b = (_a = linkDOM.document.querySelector("main")) === null || _a === void 0 ? void 0 : _a.querySelector(".font-bold")) === null || _b === void 0 ? void 0 : _b.innerText;
            response.sources = [];
            let sourceCount = 0;
            const downloadLinks = linkDOM.document.querySelectorAll(".js-download-link");
            for (const elem of downloadLinks) {
                if ((_c = elem.getAttribute("href")) === null || _c === void 0 ? void 0 : _c.endsWith(".epub")) {
                    response.sources.push({
                        name: `Epub${++sourceCount}`,
                        url: elem.getAttribute("href"),
                        type: "epub"
                    });
                }
                else if ((_d = elem.getAttribute("href")) === null || _d === void 0 ? void 0 : _d.endsWith(".pdf")) {
                    response.sources.push({
                        name: `PDF${++sourceCount}`,
                        url: elem.getAttribute("href"),
                        type: "pdf"
                    });
                }
            }
            console.log(response);
            return response;
        }
        catch (err) {
            throw err;
        }
    },
    fixTitle(title) {
        const tempTitle = title.split("-");
        tempTitle.shift();
        tempTitle.shift();
        try {
            title = window.atob(tempTitle.join("-"));
        }
        catch (err) {
            console.warn(err);
        }
        finally {
            return title;
        }
    }
};
var anilist = {
    baseURL: "https://graphql.anilist.co",
    type: "anime",
    disableAutoDownload: false,
    disabled: false,
    name: "Anilist",
    shortenedName: "Ani",
    searchApi: async function (query, params) {
        var _a;
        let gqlQuery = `query($type: MediaType`;
        let mediaQuery = `media(type: $type`;
        let values = {};
        if (!params.type) {
            params.type = "ANIME";
        }
        values["type"] = params.type.toUpperCase();
        if (params.genres) {
            gqlQuery += ", $genre: String";
            mediaQuery += ", genre: $genre";
            values["genre"] = params.genres;
        }
        if (params.season) {
            gqlQuery += ", $season: MediaSeason";
            mediaQuery += ", season: $season";
            values["season"] = params.season.toUpperCase();
        }
        if (params.year) {
            gqlQuery += ", $year: Int";
            mediaQuery += ", seasonYear: $year";
            values["year"] = params.year;
        }
        if (params.status) {
            gqlQuery += ", $status: MediaStatus";
            mediaQuery += ", status: $status";
            values["status"] = params.status.toUpperCase().split(" ").join("_");
        }
        if (params.sort) {
            gqlQuery += ", $sort: [MediaSort]";
            mediaQuery += ", sort: $sort";
            values["sort"] = this.sortMap[params.sort];
        }
        if (params.tags) {
            gqlQuery += ", $tags: [String]";
            mediaQuery += ", tag_in: $tags";
            values["tags"] = [params.tags];
        }
        if (query) {
            gqlQuery += ", $title: String";
            mediaQuery += ", search: $title";
            values["title"] = query;
        }
        gqlQuery += "){";
        mediaQuery += "){";
        try {
            const response = await anilistAPI(`${gqlQuery}
                    search: Page(page: 1, perPage: 100){
                        ${mediaQuery}
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage { 
                                extraLarge 
                                large 
                            }
                        }
                    }
                }`, values);
            const data = [];
            for (const anime of response.data.search.media) {
                data.push({
                    "name": (_a = anime.title.english) !== null && _a !== void 0 ? _a : (Object.keys(anime.title).length > 0 ? anime.title[Object.keys(anime.title)[0]] : ""),
                    "id": anime.id,
                    "image": anime.coverImage.large,
                    "link": "anilist"
                });
            }
            return {
                data,
                "status": 200,
                type: values["type"],
            };
        }
        catch (err) {
            return {
                data: err.toString(),
                status: 400
            };
        }
    },
    getAnimeInfo: async function () {
        let response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
        return response;
    },
    getLinkFromUrl: async function (url) {
        const resp = {
            sources: [],
            name: "",
            title: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null
        };
        return resp;
    },
    genres: [
        "Any",
        "Action",
        "Adventure",
        "Comedy",
        "Drama",
        "Ecchi",
        "Fantasy",
        "Horror",
        "Mahou Shoujo",
        "Mecha",
        "Music",
        "Mystery",
        "Psychological",
        "Romance",
        "Sci-Fi",
        "Slice of Life",
        "Sports",
        "Supernatural",
        "Thriller",
    ],
    seasons: [
        "Any",
        "Winter",
        "Spring",
        "Summer",
        "Fall"
    ],
    status: [
        "Any",
        "Cancelled",
        "Finished",
        "Releasing",
        "Not Yet Released"
    ],
    mediaType: [
        "Anime",
        "Manga"
    ],
    sortBy: [
        "Title",
        "Popularity",
        "Score",
        "Trending",
        "Release Date"
    ],
    sortMap: {
        "Title": "TITLE_ROMAJI",
        "Popularity": "POPULARITY_DESC",
        "Score": "SCORE_DESC",
        "Trending": ["TRENDING_DESC", "POPULARITY_DESC"],
        "Release Date": "START_DATE_DESC"
    },
    tags: [
        "Any",
        "4-koma",
        "Achromatic",
        "Achronological Order",
        "Acting",
        "Adoption",
        "Advertisement",
        "Afterlife",
        "Age Gap",
        "Age Regression",
        "Agender",
        "Agriculture",
        "Airsoft",
        "Alchemy",
        "Aliens",
        "Alternate Universe",
        "American Football",
        "Amnesia",
        "Anachronism",
        "Angels",
        "Animals",
        "Anthology",
        "Anthropomorphism",
        "Anti-Hero",
        "Archery",
        "Artificial Intelligence",
        "Asexual",
        "Assassins",
        "Astronomy",
        "Athletics",
        "Augmented Reality",
        "Autobiographical",
        "Aviation",
        "Badminton",
        "Band",
        "Bar",
        "Baseball",
        "Basketball",
        "Battle Royale",
        "Biographical",
        "Bisexual",
        "Body Horror",
        "Body Swapping",
        "Boxing",
        "Boys' Love",
        "Bullying",
        "Butler",
        "Calligraphy",
        "Cannibalism",
        "Card Battle",
        "Cars",
        "Centaur",
        "CGI",
        "Cheerleading",
        "Chibi",
        "Chimera",
        "Chuunibyou",
        "Circus",
        "Classic Literature",
        "Clone",
        "College",
        "Coming of Age",
        "Conspiracy",
        "Cosmic Horror",
        "Cosplay",
        "Crime",
        "Crossdressing",
        "Crossover",
        "Cult",
        "Cultivation",
        "Cute Boys Doing Cute Things",
        "Cute Girls Doing Cute Things",
        "Cyberpunk",
        "Cyborg",
        "Cycling",
        "Dancing",
        "Death Game",
        "Delinquents",
        "Demons",
        "Denpa",
        "Desert",
        "Detective",
        "Dinosaurs",
        "Disability",
        "Dissociative Identities",
        "Dragons",
        "Drawing",
        "Drugs",
        "Dullahan",
        "Dungeon",
        "Dystopian",
        "E-Sports",
        "Economics",
        "Educational",
        "Elf",
        "Ensemble Cast",
        "Environmental",
        "Episodic",
        "Ero Guro",
        "Espionage",
        "Fairy",
        "Fairy Tale",
        "Family Life",
        "Fashion",
        "Female Harem",
        "Female Protagonist",
        "Femboy",
        "Fencing",
        "Firefighters",
        "Fishing",
        "Fitness",
        "Flash",
        "Food",
        "Football",
        "Foreign",
        "Found Family",
        "Fugitive",
        "Full CGI",
        "Full Color",
        "Gambling",
        "Gangs",
        "Gender Bending",
        "Ghost",
        "Go",
        "Goblin",
        "Gods",
        "Golf",
        "Gore",
        "Guns",
        "Gyaru",
        "Handball",
        "Henshin",
        "Heterosexual",
        "Hikikomori",
        "Historical",
        "Homeless",
        "Ice Skating",
        "Idol",
        "Isekai",
        "Iyashikei",
        "Josei",
        "Judo",
        "Kaiju",
        "Karuta",
        "Kemonomimi",
        "Kids",
        "Kuudere",
        "Lacrosse",
        "Language Barrier",
        "LGBTQ+ Themes",
        "Lost Civilization",
        "Love Triangle",
        "Mafia",
        "Magic",
        "Mahjong",
        "Maids",
        "Makeup",
        "Male Harem",
        "Male Protagonist",
        "Marriage",
        "Martial Arts",
        "Medicine",
        "Memory Manipulation",
        "Mermaid",
        "Meta",
        "Military",
        "Mixed Gender Harem",
        "Monster Boy",
        "Monster Girl",
        "Mopeds",
        "Motorcycles",
        "Musical",
        "Mythology",
        "Necromancy",
        "Nekomimi",
        "Ninja",
        "No Dialogue",
        "Noir",
        "Non-fiction",
        "Nudity",
        "Nun",
        "Office Lady",
        "Oiran",
        "Ojou-sama",
        "Orphan",
        "Otaku Culture",
        "Outdoor",
        "Pandemic",
        "Parkour",
        "Parody",
        "Philosophy",
        "Photography",
        "Pirates",
        "Poker",
        "Police",
        "Politics",
        "Post-Apocalyptic",
        "POV",
        "Primarily Adult Cast",
        "Primarily Child Cast",
        "Primarily Female Cast",
        "Primarily Male Cast",
        "Primarily Teen Cast",
        "Prison",
        "Puppetry",
        "Rakugo",
        "Real Robot",
        "Rehabilitation",
        "Reincarnation",
        "Religion",
        "Revenge",
        "Robots",
        "Rotoscoping",
        "Rugby",
        "Rural",
        "Samurai",
        "Satire",
        "School",
        "School Club",
        "Scuba Diving",
        "Seinen",
        "Shapeshifting",
        "Ships",
        "Shogi",
        "Shoujo",
        "Shounen",
        "Shrine Maiden",
        "Skateboarding",
        "Skeleton",
        "Slapstick",
        "Slavery",
        "Software Development",
        "Space",
        "Space Opera",
        "Spearplay",
        "Steampunk",
        "Stop Motion",
        "Succubus",
        "Suicide",
        "Sumo",
        "Super Power",
        "Super Robot",
        "Superhero",
        "Surfing",
        "Surreal Comedy",
        "Survival",
        "Swimming",
        "Swordplay",
        "Table Tennis",
        "Tanks",
        "Tanned Skin",
        "Teacher",
        "Teens' Love",
        "Tennis",
        "Terrorism",
        "Time Manipulation",
        "Time Skip",
        "Tokusatsu",
        "Tomboy",
        "Torture",
        "Tragedy",
        "Trains",
        "Transgender",
        "Travel",
        "Triads",
        "Tsundere",
        "Twins",
        "Urban",
        "Urban Fantasy",
        "Vampire",
        "Video Games",
        "Vikings",
        "Villainess",
        "Virtual World",
        "Volleyball",
        "VTuber",
        "War",
        "Werewolf",
        "Witch",
        "Work",
        "Wrestling",
        "Writing",
        "Wuxia",
        "Yakuza",
        "Yandere",
        "Youkai",
        "Yuri",
        "Zombie"
    ]
};
var nineAnime = {
    baseURL: "https://9anime.to",
    type: "anime",
    supportsMalsync: true,
    disableAutoDownload: false,
    disabled: false,
    name: "9anime",
    shortenedName: "9anime",
    searchApi: async function (query) {
        const searchDOM = new DOMHandler();
        try {
            const vrf = await this.getVRF(query, "9anime-search");
            const searchHTML = await MakeFetchZoro(`https://9anime.to/filter?keyword=${encodeURIComponent(query)}&${vrf[1]}=${vrf[0]}`);
            searchDOM.innerHTML = DOMPurify.sanitize(searchHTML);
            const searchElem = searchDOM.document.querySelector("#list-items");
            const searchItems = searchElem.querySelectorAll(".item");
            const response = [];
            if (searchItems.length === 0) {
                throw new Error("No results found.");
            }
            for (let i = 0; i < searchItems.length; i++) {
                const currentElem = searchItems[i];
                response.push({
                    "name": currentElem.querySelector(".name").innerText,
                    "id": currentElem.querySelector(".name").getAttribute("href").replace("/watch/", ""),
                    "image": currentElem.querySelector("img").src,
                    "link": "/" + currentElem.querySelector(".name").getAttribute("href").replace("/watch/", "") + "&engine=5"
                });
            }
            return { "data": response, "status": 200 };
        }
        catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url, aniID) {
        const settled = "allSettled" in Promise;
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch").split(".").pop();
        let response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
        try {
            if (settled) {
                let anilistID;
                if (!isNaN(parseInt(aniID))) {
                    anilistID = parseInt(aniID);
                }
                if (!anilistID) {
                    try {
                        anilistID = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/bal-mackup/mal-backup/master/page/9anime/${id}.json`)).aniId;
                    }
                    catch (err) {
                        try {
                            anilistID = JSON.parse(await MakeFetch(`https://api.malsync.moe/page/9anime/${id}`)).aniId;
                        }
                        catch (err) {
                            // anilistID will be undefined
                        }
                    }
                }
                if (anilistID) {
                    const promises = [
                        this.getAnimeInfoInter(url),
                        MakeFetchTimeout(`https://api.enime.moe/mapping/anilist/${anilistID}`, {}, 2000)
                    ];
                    const promiseResponses = await Promise.allSettled(promises);
                    if (promiseResponses[0].status === "fulfilled") {
                        response = promiseResponses[0].value;
                        if (promiseResponses[1].status === "fulfilled") {
                            try {
                                const metaData = JSON.parse(promiseResponses[1].value).episodes;
                                const metaDataMap = {};
                                for (let i = 0; i < metaData.length; i++) {
                                    metaDataMap[metaData[i].number] = metaData[i];
                                }
                                for (let i = 0; i < response.episodes.length; i++) {
                                    const currentEp = metaDataMap[response.episodes[i].id];
                                    const currentResponseEp = response.episodes[i];
                                    currentResponseEp.description = currentEp === null || currentEp === void 0 ? void 0 : currentEp.description;
                                    currentResponseEp.thumbnail = currentEp === null || currentEp === void 0 ? void 0 : currentEp.image;
                                    currentResponseEp.date = new Date(currentEp === null || currentEp === void 0 ? void 0 : currentEp.airedAt);
                                    currentResponseEp.title = `Episode ${currentResponseEp.id} - ${currentEp === null || currentEp === void 0 ? void 0 : currentEp.title}`;
                                }
                            }
                            catch (err) {
                                console.error(err);
                            }
                        }
                        return response;
                    }
                    else {
                        throw promiseResponses[0].reason;
                    }
                }
                else {
                    return await this.getAnimeInfoInter(url);
                }
            }
            else {
                return await this.getAnimeInfoInter(url);
            }
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    },
    getAnimeInfoInter: async function (url, nextPrev = false) {
        url = url.split("&engine")[0];
        const response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
        let id = url.replace("?watch=/", "");
        const rawURL = `https://9anime.to/watch/${id}`;
        const episodesDOM = new DOMHandler();
        const infoDOM = new DOMHandler();
        try {
            let infoHTML = await MakeFetchZoro(`https://9anime.to/watch/${id}`);
            infoDOM.innerHTML = DOMPurify.sanitize(infoHTML);
            let nineAnimeID = infoDOM.document.querySelector("#watch-main").getAttribute("data-id");
            let infoMainDOM = infoDOM.document.querySelector("#w-info").querySelector(".info");
            response.mainName = id;
            response.name = infoMainDOM.querySelector(".title").innerText;
            response.description = infoMainDOM.querySelector(".content").innerText;
            response.image = infoDOM.document.querySelector("#w-info").querySelector("img").getAttribute("src");
            try {
                response.genres = [];
                const metaCon = infoDOM.document.querySelector(".bmeta").querySelector(".meta");
                for (const genreAnchor of metaCon.querySelectorAll("a")) {
                    const href = genreAnchor.getAttribute("href");
                    if (href && href.includes("/genre/")) {
                        response.genres.push(genreAnchor.innerText);
                    }
                }
            }
            catch (err) {
                console.error(err);
            }
            let episodes = [];
            let IDVRF = await this.getVRF(nineAnimeID, "ajax-episode-list");
            let episodesHTML = "";
            try {
                const tempResponse = JSON.parse(await MakeFetchZoro(`https://9anime.to/ajax/episode/list/${nineAnimeID}?${IDVRF[1]}=${IDVRF[0]}`));
                if (tempResponse.result) {
                    episodesHTML = tempResponse.result;
                }
                else {
                    throw new Error("Couldn't find the result");
                }
            }
            catch (err) {
                throw new Error(`Error 9ANIME_INFO_JSON: The JSON could be be parsed. ${err.message}`);
            }
            episodesDOM.innerHTML = DOMPurify.sanitize(episodesHTML);
            let episodeElem = episodesDOM.document.querySelectorAll("li");
            for (let i = 0; i < episodeElem.length; i++) {
                let curElem = episodeElem[i];
                let title = "";
                try {
                    title = curElem.querySelector("span").innerText;
                }
                catch (err) {
                    console.warn("Could not find the title");
                }
                episodes.push({
                    "isFiller": curElem.querySelector("a").getAttribute("class").includes("filler"),
                    "link": (nextPrev ? "" : "?watch=") + encodeURIComponent(id) + "&ep=" + curElem.querySelector("a").getAttribute("data-ids") + "&engine=5",
                    "id": curElem.querySelector("a").getAttribute("data-num"),
                    "sourceID": curElem.querySelector("a").getAttribute("data-ids"),
                    "title": nextPrev ? title : `Episode ${curElem.querySelector("a").getAttribute("data-num")} - ${title}`,
                    "altTitle": `Episode ${curElem.querySelector("a").getAttribute("data-num")}`
                });
            }
            response.episodes = episodes;
            return response;
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    getLinkFromUrl: async function (url) {
        url = "watch=" + url;
        const response = {
            sources: [],
            name: "",
            title: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null
        };
        const serverDOM = new DOMHandler();
        try {
            const searchParams = new URLSearchParams(url);
            const sourceEp = searchParams.get("ep");
            const sourceEpVRF = await this.getVRF(sourceEp, "ajax-server-list");
            const promises = [];
            const serverHTML = JSON.parse(await MakeFetchZoro(`https://9anime.to/ajax/server/list/${sourceEp}?${sourceEpVRF[1]}=${sourceEpVRF[0]}`)).result;
            serverDOM.innerHTML = DOMPurify.sanitize(serverHTML);
            const allServers = serverDOM.document.querySelectorAll("li");
            try {
                response.episode = serverDOM.document.querySelector("b").innerText.split("Episode")[1];
            }
            catch (err) {
                response.episode = serverDOM.document.querySelector("b").innerText;
            }
            response.name = searchParams.get("watch");
            response.nameWSeason = searchParams.get("watch");
            response.status = 200;
            let sources = [];
            let vidstreamIDs = [];
            let mCloudIDs = [];
            let filemoonIDs = [];
            for (let i = 0; i < allServers.length; i++) {
                let currentServer = allServers[i];
                let type = i.toString();
                try {
                    const tempType = currentServer.parentElement.previousElementSibling
                        .innerText
                        .trim();
                    if (tempType) {
                        type = tempType;
                    }
                }
                catch (err) {
                    console.warn(err);
                }
                if (currentServer.innerText.toLowerCase() == "vidstream") {
                    vidstreamIDs.push({
                        id: currentServer.getAttribute("data-link-id"),
                        type
                    });
                }
                else if (currentServer.innerText.toLowerCase() == "filemoon") {
                    filemoonIDs.push({
                        id: currentServer.getAttribute("data-link-id"),
                        type
                    });
                }
                else if (currentServer.innerText.toLowerCase() == "mycloud") {
                    mCloudIDs.push({
                        id: currentServer.getAttribute("data-link-id"),
                        type
                    });
                }
            }
            async function addSource(ID, self, index, extractor = "vidstream") {
                try {
                    const serverVRF = await self.getVRF(ID, "ajax-server");
                    const serverData = JSON.parse(await MakeFetchZoro(`https://9anime.to/ajax/server/${ID}?${serverVRF[1]}=${serverVRF[0]}`)).result;
                    const serverURL = serverData.url;
                    const sourceDecrypted = await self.decryptSource(serverURL);
                    let source = {
                        "name": "",
                        "type": "",
                        "url": "",
                    };
                    if (extractor == "vidstream") {
                        const vidstreamID = sourceDecrypted.split("/").pop();
                        const m3u8File = await self.getVidstreamLink(vidstreamID);
                        source = {
                            "name": "HLS#" + index,
                            "type": "hls",
                            "url": m3u8File,
                        };
                        sources.push(source);
                    }
                    else if (extractor == "filemoon") {
                        const filemoonHTML = await MakeFetch(sourceDecrypted);
                        const m3u8File = await self.getFilemoonLink(filemoonHTML);
                        source = {
                            "name": "Filemoon#" + index,
                            "type": m3u8File.includes(".m3u8") ? "hls" : "mp4",
                            "url": m3u8File,
                        };
                        sources.push(source);
                    }
                    else {
                        const mCloudID = sourceDecrypted.split("/").pop();
                        const m3u8File = await self.getVidstreamLink(mCloudID, false);
                        source = {
                            "name": "Mycloud#" + index,
                            "type": m3u8File.includes(".m3u8") ? "hls" : "mp4",
                            "url": m3u8File,
                        };
                        sources.push(source);
                    }
                    if ("skip_data" in serverData) {
                        serverData.skip_data = JSON.parse(await self.decryptSource(serverData.skip_data));
                        source.skipIntro = {
                            start: serverData.skip_data.intro[0],
                            end: serverData.skip_data.intro[1]
                        };
                    }
                }
                catch (err) {
                    console.warn(err);
                }
            }
            for (let i = 0; i < vidstreamIDs.length; i++) {
                promises.push(addSource(vidstreamIDs[i].id, this, vidstreamIDs[i].type));
            }
            for (let i = 0; i < filemoonIDs.length; i++) {
                promises.push(addSource(filemoonIDs[i].id, this, filemoonIDs[i].type, "filemoon"));
            }
            for (let i = 0; i < mCloudIDs.length; i++) {
                promises.push(addSource(mCloudIDs[i].id, this, mCloudIDs[i].type, "mycloud"));
            }
            let settledSupported = "allSettled" in Promise;
            let epList = [];
            if (settledSupported) {
                promises.unshift(this.getAnimeInfoInter(`?watch=/${searchParams.get("watch")}`, true));
                const promiseResult = await Promise.allSettled(promises);
                if (promiseResult[0].status === "fulfilled") {
                    epList = promiseResult[0].value.episodes;
                }
            }
            else {
                try {
                    await Promise.all(promises);
                    epList = (await this.getAnimeInfoInter(`?watch=/${searchParams.get("watch")}`, true)).episodes;
                }
                catch (err) {
                    console.error(err);
                }
            }
            let check = false;
            for (var i = 0; i < epList.length; i++) {
                if (check === true) {
                    response.next = epList[i].link;
                    break;
                }
                if (epList[i].sourceID == sourceEp) {
                    check = true;
                    response.title = epList[i].title;
                }
                if (check === false) {
                    response.prev = epList[i].link;
                }
            }
            if (!sources.length) {
                throw new Error("No sources were found. Try again later or contact the developer.");
            }
            if (parseFloat(response.episode) === 0) {
                response.episode = "0.1";
            }
            response.sources = sources;
            return response;
        }
        catch (err) {
            throw err;
        }
    },
    checkConfig: function () {
        if (!localStorage.getItem("9anime")) {
            throw new Error("9anime URL not set");
        }
        if (!localStorage.getItem("apikey")) {
            throw new Error("API keynot set");
        }
    },
    getVRF: async function (query, action) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/${action}?query=${encodeURIComponent(query)}&apikey=${apiKey}`;
        if (fallbackAPI) {
            reqURL = `https://${nineAnimeURL}?query=${encodeURIComponent(query)}&action=${action}`;
        }
        const source = await MakeFetch(reqURL);
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.url) {
                return [encodeURIComponent(parsedJSON.url), parsedJSON.vrfQuery];
            }
            else {
                throw new Error(`${action}-VRF1: Received an empty URL or the URL was not found.`);
            }
        }
        catch (err) {
            throw new Error(`${action}-VRF1: Could not parse the JSON correctly.`);
        }
    },
    decryptSource: async function (query) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/decrypt?query=${encodeURIComponent(query)}&apikey=${apiKey}`;
        if (fallbackAPI) {
            reqURL = `https://${nineAnimeURL}?query=${encodeURIComponent(query)}&action=decrypt`;
        }
        const source = await MakeFetch(reqURL);
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.url) {
                return parsedJSON.url;
            }
            else {
                throw new Error("DECRYPT1: Received an empty URL or the URL was not found.");
            }
        }
        catch (err) {
            throw new Error("DECRYPT0: Could not parse the JSON correctly.");
        }
    },
    getVidstreamLink: async function (query, isViz = true) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/raw${isViz ? "Vizcloud" : "Mcloud"}?query=${encodeURIComponent(query)}&apikey=${apiKey}`;
        if (fallbackAPI) {
            reqURL = `https://${nineAnimeURL}?query=${encodeURIComponent(query)}&action=${isViz ? "vizcloud" : "mcloud"}`;
        }
        const rawSource = JSON.parse(await MakeFetch(reqURL)).rawURL;
        const fetchFunc = config.chrome ? MakeFetch : MakeCusReq;
        const source = await fetchFunc(rawSource, {
            headers: {
                "referer": isViz ? "https://vidstream.pro/" : "https://mcloud.to/",
                "x-requested-with": "XMLHttpRequest"
            }
        });
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.data &&
                parsedJSON.data.media &&
                parsedJSON.data.media.sources &&
                parsedJSON.data.media.sources[0] &&
                parsedJSON.data.media.sources[0].file) {
                return parsedJSON.data.media.sources[0].file;
            }
            else {
                throw new Error("VIZCLOUD1: Received an empty URL or the URL was not found.");
            }
        }
        catch (err) {
            throw new Error("VIZCLOUD0: Could not parse the JSON correctly.");
        }
    },
    getFilemoonLink: async function (filemoonHTML) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/filemoon?apikey=${apiKey}`;
        if (fallbackAPI) {
            throw new Error("Not supported");
        }
        const source = await MakeFetch(reqURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                "query": filemoonHTML
            })
        });
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.url) {
                return parsedJSON.url;
            }
            else {
                throw new Error("FILEMOON1: Received an empty URL or the URL was not found.");
            }
        }
        catch (err) {
            throw new Error("FILEMOON0: Could not parse the JSON correctly.");
        }
    },
    fixTitle: function (title) {
        try {
            const tempTitle = title.split(".");
            if (tempTitle.length > 1) {
                tempTitle.pop();
                title = tempTitle.join(".");
                return title;
            }
            else {
                return title;
            }
        }
        catch (err) {
            return title;
        }
    },
    discover: async function () {
        let temp = new DOMHandler();
        temp.innerHTML = DOMPurify.sanitize(await MakeFetchZoro(`https://9anime.to/home`, {}));
        temp = temp.document.querySelector(".ani.items");
        let data = [];
        for (const elem of temp.document.querySelectorAll(".item")) {
            let image = elem.querySelector("img").getAttribute("src");
            let name = elem.querySelector(".name.d-title").innerText.trim();
            let link = elem.querySelector(".name.d-title").getAttribute("href");
            const splitLink = link.split("/");
            splitLink.pop();
            link = splitLink.join("/").replace("/watch", "");
            data.push({
                image,
                name,
                link
            });
        }
        return data;
    },
    config: {
        "referer": "https://9anime.to",
    },
    getConfig: function (url) {
        if (url.includes("mcloud.to")) {
            return {
                "referer": "https://mcloud.to/"
            };
        }
        else {
            return this.config;
        }
    },
    getMetaData: async function (search) {
        const id = search.get("watch").split(".").pop();
        return await getAnilistInfo("9anime", id);
    },
    rawURLtoInfo: function (url) {
        // https://9anime.pl/watch/demon-slayer-kimetsu-no-yaiba-the-movie-mugen-train.lj5q
        return `?watch=${url.pathname.replace("/watch", "")}&engine=5`;
    }
};
var kaa = {
    baseURL: "https://kickassanime.am",
    type: "anime",
    supportsMalsync: false,
    disableAutoDownload: false,
    disabled: false,
    name: "Kickass",
    shortenedName: "KAA",
    getImageURL: function (posterData) {
        var _a;
        try {
            return `${this.baseURL}/image/poster/${(_a = posterData.hq) !== null && _a !== void 0 ? _a : posterData.sm}.${posterData.formats.includes("webp") ? "webp" : posterData.formats[0]}`;
        }
        catch (err) {
            return "";
        }
    },
    searchApi: async function (query) {
        var _a;
        const self = this;
        try {
            const searchJSON = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/search`, {
                method: "POST",
                body: JSON.stringify({
                    query
                }),
                headers: {
                    "Content-type": "application/json",
                    "referer": `${this.baseURL}/`,
                    "origin": this.baseURL
                },
            }));
            const searchData = [];
            for (const searchItem of searchJSON) {
                searchData.push({
                    name: (_a = searchItem.title_en) !== null && _a !== void 0 ? _a : searchItem.title,
                    image: self.getImageURL(searchItem.poster),
                    link: `/${searchItem.slug}&engine=13`
                });
            }
            return ({ data: searchData, "status": 200 });
        }
        catch (err) {
            throw err;
        }
    },
    loadAllEps: async function (episodeJSONs, key, url) {
        try {
            const promises = [];
            for (let i = 0; i < episodeJSONs[key].pages.length; i++) {
                if (i == 0) {
                    continue;
                }
                promises.push(MakeFetchZoro(`${url}&page=${episodeJSONs[key].pages[i].number}`));
            }
            const results = await Promise.all(promises);
            for (const result of results) {
                try {
                    const resultJSON = JSON.parse(result);
                    episodeJSONs[key].result.push(...resultJSON.result);
                }
                catch (err) {
                    console.warn(err);
                }
            }
        }
        catch (err) {
            console.warn(err);
        }
    },
    getAnimeInfo: async function (url) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch");
        const rawURL = `${this.baseURL}/${id}`;
        const self = this;
        try {
            const response = {
                "name": "",
                "image": "",
                "description": "",
                "episodes": [],
                "mainName": ""
            };
            // https://kickassanime.am/api/show/odd-taxi-8b25
            const infoJSON = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}`, {}));
            response.mainName = id;
            response.image = this.getImageURL(infoJSON.poster);
            response.name = (_a = infoJSON.title_en) !== null && _a !== void 0 ? _a : infoJSON.title;
            response.description = infoJSON.synopsis;
            // https://kickassanime.am/api/show/odd-taxi-8b25/episodes?ep=1&lang=ja-JP
            const episodeJSONs = { "dub": undefined, "sub": undefined };
            try {
                episodeJSONs.sub = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episodes?lang=ja-JP`));
                await this.loadAllEps(episodeJSONs, "sub", `${this.baseURL}/api/show/${id}/episodes?lang=ja-JP`);
            }
            catch (err) {
                episodeJSONs.dub = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episodes?lang=en-US`));
                await this.loadAllEps(episodeJSONs, "dub", `${this.baseURL}/api/show/${id}/episodes?lang=en-US`);
            }
            if (!episodeJSONs.dub) {
                try {
                    episodeJSONs.dub = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episodes?lang=en-US`));
                    await this.loadAllEps(episodeJSONs, "dub", `${this.baseURL}/api/show/${id}/episodes?lang=en-US`);
                }
                catch (err) {
                }
            }
            if (((_c = (_b = episodeJSONs.sub) === null || _b === void 0 ? void 0 : _b.pages) === null || _c === void 0 ? void 0 : _c.length) === 0) {
                episodeJSONs.sub = undefined;
            }
            if (((_e = (_d = episodeJSONs.dub) === null || _d === void 0 ? void 0 : _d.pages) === null || _e === void 0 ? void 0 : _e.length) === 0) {
                episodeJSONs.dub = undefined;
            }
            const episodeJSON = (_f = episodeJSONs.sub) !== null && _f !== void 0 ? _f : episodeJSONs.dub;
            const dubData = {};
            if (episodeJSONs.sub && episodeJSONs.dub) {
                for (let i = 0; i < ((_h = (_g = episodeJSONs.dub) === null || _g === void 0 ? void 0 : _g.result) === null || _h === void 0 ? void 0 : _h.length); i++) {
                    const el = episodeJSONs.dub.result[i];
                    let epNum = el.episode_number;
                    if (epNum == 0) {
                        epNum = 0.1;
                    }
                    dubData[epNum] = el;
                }
            }
            const epData = [];
            for (let i = 0; i < episodeJSON.result.length; i++) {
                const el = episodeJSON.result[i];
                const isSub = episodeJSON === episodeJSONs.sub;
                let epNum = el.episode_number;
                if (epNum == 0) {
                    epNum = 0.1;
                }
                // https://kickassanime.am/image/thumbnail/642602459d33f3e832423995/ep-1-fbe2-sm.webp
                let sourceID = {};
                sourceID[isSub ? "sub" : "dub"] = `ep-${el.episode_string}-${el.slug}`;
                if (dubData[epNum] && isSub) {
                    sourceID["dub"] = `ep-${dubData[epNum].episode_string}-${dubData[epNum].slug}`;
                }
                epData.push({
                    title: `Episode ${epNum} - ${el.title}`,
                    link: `?watch=${id}&ep=${epNum}&engine=13`,
                    id: el.slug,
                    number: parseFloat(epNum),
                    sourceID: JSON.stringify(sourceID),
                    thumbnail: `${this.baseURL}/image/thumbnail/${(_j = el.thumbnail.sm) !== null && _j !== void 0 ? _j : el.thumbnail.sm}.${el.thumbnail.formats.includes("webp") ? "webp" : el.thumbnail.formats[0]}`,
                    altTitle: `Episode ${epNum}`,
                });
            }
            response.episodes = epData;
            return response;
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    addSource: async function (server, sourceURLs, type, response) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            const url = new URL(server.src);
            const shortName = server.shortName.toLowerCase();
            const order = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/enimax-anime/gogo/main/KAA.json`))[shortName];
            const playerHTML = await MakeFetch(url.toString());
            const isBirb = shortName === "bird";
            const usesMid = shortName === "duck";
            const cid = playerHTML.split("cid:")[1].split("'")[1].trim();
            const metaData = CryptoJS.enc.Hex.parse(cid).toString(CryptoJS.enc.Utf8);
            const sigArray = [];
            let key = "";
            try {
                const res = await fetch(`https://raw.githubusercontent.com/enimax-anime/kaas/${shortName}/key.txt`);
                if (res.status === 404) {
                    throw new Error("Not found");
                }
                else {
                    key = await res.text();
                }
            }
            catch (err) {
                key = await MakeFetch(`https://raw.githubusercontent.com/enimax-anime/kaas/duck/key.txt`);
            }
            const signatureItems = {
                SIG: playerHTML.split("signature:")[1].split("'")[1].trim(),
                USERAGENT: navigator.userAgent,
                IP: metaData.split("|")[0],
                ROUTE: metaData.split("|")[1].replace("player.php", "source.php"),
                KEY: key,
                TIMESTAMP: Math.floor(Date.now() / 1000),
                MID: url.searchParams.get(usesMid ? "mid" : "id")
            };
            for (const item of order) {
                sigArray.push(signatureItems[item]);
            }
            const sig = CryptoJS.SHA1(sigArray.join("")).toString(CryptoJS.enc.Hex);
            const result = JSON.parse(await MakeFetch(`${url.origin}${signatureItems.ROUTE}?${!usesMid ? "id" : "mid"}=${signatureItems.MID}${isBirb ? "" : "&e=" + signatureItems.TIMESTAMP}&s=${sig}`, {
                headers: {
                    "referer": `${url.origin}${signatureItems.ROUTE.replace("source.php", "player.php")}?${!usesMid ? "id" : "mid"}=${signatureItems.MID}`
                }
            })).data;
            const finalResult = JSON.parse(CryptoJS.AES.decrypt(result.split(":")[0], CryptoJS.enc.Utf8.parse(signatureItems.KEY), {
                mode: CryptoJS.mode.CBC,
                iv: CryptoJS.enc.Hex.parse(result.split(":")[1]),
                keySize: 256
            }).toString(CryptoJS.enc.Utf8));
            let hlsURL = "", dashURL = "";
            if (finalResult.hls) {
                hlsURL = finalResult.hls.startsWith("//") ? `https:${finalResult.hls}` : finalResult.hls;
                sourceURLs.push({
                    type: "hls",
                    name: `${server.name}#${type}`,
                    url: hlsURL,
                    skipIntro: {
                        start: (_b = (_a = finalResult.skip) === null || _a === void 0 ? void 0 : _a.intro) === null || _b === void 0 ? void 0 : _b.start,
                        end: (_d = (_c = finalResult.skip) === null || _c === void 0 ? void 0 : _c.intro) === null || _d === void 0 ? void 0 : _d.end
                    }
                });
            }
            if (finalResult.dash) {
                dashURL = finalResult.dash.startsWith("//") ? `https:${finalResult.dash}` : finalResult.dash;
                sourceURLs.push({
                    type: "dash",
                    name: `${server.name}-DASH#${type}`,
                    url: dashURL,
                    skipIntro: {
                        start: (_f = (_e = finalResult.skip) === null || _e === void 0 ? void 0 : _e.intro) === null || _f === void 0 ? void 0 : _f.start,
                        end: (_h = (_g = finalResult.skip) === null || _g === void 0 ? void 0 : _g.intro) === null || _h === void 0 ? void 0 : _h.end
                    }
                });
            }
            if (finalResult.subtitles) {
                const url = dashURL === "" ? hlsURL : dashURL;
                finalResult.subtitles.map((sub) => {
                    response.subtitles.push({
                        label: `${sub.name} - ${shortName}`,
                        file: sub.src.startsWith("//") ? `https:${sub.src}` : new URL(sub.src, url).href
                    });
                });
            }
        }
        catch (err) {
            console.warn(err);
        }
    },
    getLinkFromUrl: async function (url) {
        var _a, _b, _c, _d;
        try {
            const params = new URLSearchParams("?watch=" + url);
            const id = params.get("watch");
            const sourceURLs = [];
            const resp = {
                sources: sourceURLs,
                name: "",
                nameWSeason: "",
                episode: "",
                status: 400,
                message: "",
                next: null,
                prev: null,
                subtitles: [],
            };
            const epNum = params.get("ep");
            const epList = await this.getAnimeInfo(id);
            const currentEp = epList.episodes.find((ep) => ep.number === parseFloat(epNum));
            const currentIndex = epList.episodes.indexOf(currentEp);
            const links = JSON.parse(currentEp.sourceID);
            const promises = [];
            resp.next = (_b = (_a = epList.episodes[currentIndex + 1]) === null || _a === void 0 ? void 0 : _a.link.replace("?watch=", "")) !== null && _b !== void 0 ? _b : null;
            resp.prev = (_d = (_c = epList.episodes[currentIndex - 1]) === null || _c === void 0 ? void 0 : _c.link.replace("?watch=", "")) !== null && _d !== void 0 ? _d : null;
            for (const type in links) {
                // https://kickassanime.am/api/show/odd-taxi-8b25/episode/ep-2-a601c5
                const slug = links[type];
                const videoJSON = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episode/${slug}`));
                const servers = videoJSON.servers;
                for (const server of servers) {
                    promises.push(this.addSource(server, sourceURLs, type, resp));
                }
            }
            await Promise.all(promises);
            resp.name = params.get("watch");
            resp.nameWSeason = params.get("watch");
            resp.episode = params.get("ep");
            return resp;
        }
        catch (err) {
            throw err;
        }
    },
    fixTitle(title) {
        try {
            const titleTemp = title.split("-");
            titleTemp.pop();
            title = titleTemp.join("-");
        }
        catch (err) {
            console.error(err);
        }
        finally {
            return title;
        }
    },
};
var fmoviesto = {
    baseURL: "https://fmovies.to",
    type: "tv",
    disableAutoDownload: false,
    disabled: false,
    name: "Fmovies.to",
    shortenedName: "Fmovies",
    searchApi: async function (query) {
        let rawURL = "";
        let searchDOM = new DOMHandler();
        try {
            query = query.replace(" ", "+");
            const vrf = await this.getVRF(query, "fmovies-vrf");
            rawURL = `https://fmovies.to/filter?keyword=${encodeURIComponent(query)}&vrf=${vrf[0]}&sort=most_relevance`;
            const searchHTML = await MakeFetchZoro(`https://fmovies.to/filter?keyword=${encodeURIComponent(query)}&vrf=${vrf[0]}&sort=most_relevance`);
            searchDOM.innerHTML = DOMPurify.sanitize(searchHTML);
            const searchElem = searchDOM.document.querySelector(".movies.items");
            if (!searchElem) {
                throw new Error("No results found.");
            }
            console.log(searchDOM);
            const searchItems = searchElem.querySelectorAll(".item");
            const response = [];
            if (searchItems.length === 0) {
                throw new Error("No results found.");
            }
            for (let i = 0; i < searchItems.length; i++) {
                const currentElem = searchItems[i];
                const anchor = currentElem.querySelector(".meta").querySelector("a");
                response.push({
                    "name": anchor.innerText,
                    "image": currentElem.querySelector("img").getAttribute("data-src"),
                    "link": "/" + anchor.getAttribute("href").slice(1).replace("/watch/", "") + "&engine=6"
                });
            }
            return { "data": response, "status": 200 };
        }
        catch (err) {
            err.rawURL = rawURL;
            throw err;
        }
    },
    // @ts-ignore
    getAnimeInfo: async function (url, nextPrev = false) {
        url = url.split("&engine")[0];
        const response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
        let id = url.replace("?watch=/", "");
        const rawURL = `https://fmovies.to/${id}`;
        let episodesDOM = new DOMHandler();
        let infoDOM = new DOMHandler();
        try {
            let infoHTML = await MakeFetchZoro(`https://fmovies.to/${id}`);
            infoDOM.innerHTML = DOMPurify.sanitize(infoHTML, {
                "ADD_ATTR": ["itemprop"]
            });
            const container = infoDOM.document.querySelector("#w-info");
            response.mainName = id.replace("series/", "").replace("movie/", "").replace("tv/", "");
            response.name = container.querySelector(`.name`).innerText;
            response.image = container.querySelector(`img`).getAttribute("src");
            response.description = container.querySelector(".description").innerText.trim();
            const isMovie = id.split('/')[0] !== "series" && id.split('/')[0] !== "tv";
            try {
                response.genres = [];
                const metaCon = infoDOM.document.querySelector(".bmeta").querySelector(".meta");
                for (const genreAnchor of metaCon.querySelectorAll("a")) {
                    const href = genreAnchor.getAttribute("href");
                    if (href && href.includes("/genre/")) {
                        response.genres.push(genreAnchor.innerText);
                    }
                }
            }
            catch (err) {
                console.error(err);
            }
            let episodes = [];
            const uid = infoDOM.document.querySelector(".watch").getAttribute("data-id");
            let IDVRF = await this.getVRF(uid, "fmovies-vrf");
            let episodesHTML = "";
            try {
                const tempResponse = JSON.parse(await MakeFetchZoro(`https://fmovies.to/ajax/episode/list/${uid}?vrf=${IDVRF[0]}`));
                if (tempResponse.result) {
                    episodesHTML = tempResponse.result;
                }
                else {
                    throw new Error("Couldn't find the result");
                }
            }
            catch (err) {
                throw new Error(`Error 9ANIME_INFO_JSON: The JSON could be be parsed. ${err.message}`);
            }
            episodesDOM.innerHTML = DOMPurify.sanitize(episodesHTML);
            let episodeElem = episodesDOM.document.querySelectorAll(".episodes a");
            console.log(episodesDOM, episodeElem);
            response.totalPages = 0;
            response.pageInfo = [];
            if (isMovie) {
                response.totalPages = 1;
                response.pageInfo.push({
                    pageName: `Movie`,
                    pageSize: 0
                });
            }
            let lastSeason = -1;
            for (let i = 0; i < episodeElem.length; i++) {
                let curElem = episodeElem[i];
                let title = "";
                let episodeNum;
                let season;
                let epID;
                let sourceID;
                try {
                    if (isMovie) {
                        title = (curElem).innerText;
                    }
                    else {
                        title = curElem.getAttribute("title");
                    }
                }
                catch (err) {
                    console.warn("Could not find the title");
                }
                sourceID = curElem.getAttribute("data-id");
                const num = curElem.getAttribute('href').split('/').pop();
                epID = num;
                if (!isMovie) {
                    episodeNum = parseInt(num.split("-")[1]);
                    season = parseInt(num.split("-")[0]);
                    if (response.totalPages == 0 || season != lastSeason) {
                        response.pageInfo.push({
                            pageName: `Season ${season}`,
                            pageSize: 1
                        });
                        response.totalPages++;
                    }
                    else {
                        response.pageInfo[response.pageInfo.length - 1].pageSize++;
                    }
                    lastSeason = season;
                }
                else {
                    response.pageInfo[response.pageInfo.length - 1].pageSize++;
                }
                episodes.push({
                    "link": (nextPrev ? "" : "?watch=") + encodeURIComponent(id) + "&ep=" + epID + "&engine=6",
                    "id": sourceID,
                    "season": season,
                    "sourceID": epID,
                    "title": (nextPrev || isMovie) ? title : `Season ${season} | Episode ${episodeNum} - ${title}`,
                    "altTruncatedTitle": `S${season} E${episodeNum}`,
                    "altTitle": `Season ${season} Episode ${episodeNum}`
                });
            }
            response.episodes = episodes;
            return response;
        }
        catch (err) {
            console.log(err);
            err.url = rawURL;
            throw err;
        }
    },
    getLinkFromUrl: async function (url) {
        url = "watch=" + url;
        const response = {
            sources: [],
            name: "",
            title: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null
        };
        const infoDOM = new DOMHandler();
        const serverDOM = new DOMHandler();
        try {
            const searchParams = new URLSearchParams(url);
            const sourceEp = searchParams.get("ep");
            const isMovie = searchParams.get("watch").split('/')[0] !== "series" && searchParams.get("watch").split('/')[0] !== "tv";
            const promises = [];
            const infoHTML = await MakeFetchZoro(`https://fmovies.to/${searchParams.get("watch")}`);
            infoDOM.innerHTML = DOMPurify.sanitize(infoHTML);
            const uid = infoDOM.document.querySelector(".watch").getAttribute("data-id");
            const epsiodeServers = [];
            const servers = {};
            let epList = [];
            epList = (await this.getAnimeInfo(`?watch=/${searchParams.get("watch")}`, true)).episodes;
            const epData = epList.find((x) => x.sourceID === sourceEp);
            const season = isNaN(epData.season) ? 1 : epData.season;
            const serverID = epData.id;
            const serverVRF = await this.getVRF(serverID, "fmovies-vrf");
            // https://fmovies.to/ajax/server/list/29303?vrf=O2F%2FYF1JRHg%3D
            const serverHTML = JSON.parse(await MakeFetchZoro(`https://fmovies.to/ajax/server/list/${serverID}?vrf=${serverVRF[0]}`)).result;
            serverDOM.innerHTML = DOMPurify.sanitize(serverHTML, {
                "ADD_ATTR": ["data-kname", "data-id"]
            });
            const serverDIVs = serverDOM.document.querySelectorAll(".server");
            for (let i = 0; i < serverDIVs.length; i++) {
                const curServer = serverDIVs[i];
                const serverId = curServer.getAttribute("data-link-id");
                let serverName = curServer.innerText.toLowerCase().trim();
                epsiodeServers.push({
                    id: serverId,
                    type: serverName
                });
            }
            try {
                const epTemp = sourceEp.split('-');
                let ep = epTemp[epTemp.length - 1];
                if (!isMovie) {
                    response.episode = ep;
                }
                else {
                    if (ep == "full") {
                        response.episode = "1";
                    }
                    else {
                        response.episode = Math.max(1, ep.charCodeAt(0) - "a".charCodeAt(0) + 1).toString();
                    }
                    if (isNaN(parseInt(response.episode))) {
                        response.episode = "1";
                    }
                }
            }
            catch (err) {
                response.episode = "1";
            }
            response.name = searchParams.get("watch").replace("series/", "").replace("movie/", "").replace("tv/", "");
            response.nameWSeason = response.name + "-" + season;
            response.status = 200;
            let sources = [];
            async function addSource(ID, self, index, extractor) {
                try {
                    const serverVRF = await self.getVRF(ID, "fmovies-vrf");
                    const serverData = JSON.parse(await MakeFetchZoro(` https://fmovies.to/ajax/server/${ID}?vrf=${serverVRF[0]}`)).result;
                    const serverURL = serverData.url;
                    const sourceDecrypted = await self.decryptSource(serverURL);
                    let source = {
                        "name": "",
                        "type": "",
                        "url": "",
                    };
                    if (extractor == "vidstream") {
                        const vidstreamID = sourceDecrypted.split("/").pop();
                        const m3u8File = await self.getVidstreamLink(vidstreamID);
                        source = {
                            "name": "HLS#" + index,
                            "type": "hls",
                            "url": m3u8File,
                        };
                        sources.push(source);
                    }
                    else if (extractor == "filemoon") {
                        console.log(sourceDecrypted);
                        const filemoonHTML = await MakeFetch(sourceDecrypted);
                        const m3u8File = await self.getFilemoonLink(filemoonHTML);
                        source = {
                            "name": "Filemoon#" + index,
                            "type": m3u8File.includes(".m3u8") ? "hls" : "mp4",
                            "url": m3u8File,
                        };
                        sources.push(source);
                    }
                    else {
                        const mCloudID = sourceDecrypted.split("/").pop();
                        const m3u8File = await self.getVidstreamLink(mCloudID, false);
                        source = {
                            "name": "Mycloud#" + index,
                            "type": m3u8File.includes(".m3u8") ? "hls" : "mp4",
                            "url": m3u8File,
                        };
                        sources.push(source);
                    }
                    if ("skip_data" in serverData) {
                        serverData.skip_data = JSON.parse(await self.decryptSource(serverData.skip_data));
                        source.skipIntro = {
                            start: serverData.skip_data.intro[0],
                            end: serverData.skip_data.intro[1]
                        };
                    }
                }
                catch (err) {
                    console.warn(err);
                }
            }
            for (let i = 0; i < epsiodeServers.length; i++) {
                const type = epsiodeServers[i].type;
                if (type == "vidstream" || type == "mycloud" || type == "filemoon") {
                    promises.push(addSource(epsiodeServers[i].id, this, epsiodeServers[i].type, epsiodeServers[i].type));
                }
            }
            let check = false;
            let sourceID = null;
            for (var i = 0; i < epList.length; i++) {
                if (check === true) {
                    response.next = epList[i].link;
                    break;
                }
                if (epList[i].sourceID == sourceEp) {
                    check = true;
                    sourceID = epList[i].id;
                    response.title = epList[i].title ? epList[i].title.trim() : "";
                }
                if (check === false) {
                    response.prev = epList[i].link;
                }
            }
            await Promise.all(promises);
            if (!sources.length) {
                throw new Error("No sources were found. Try again later or contact the developer.");
            }
            if (!response.subtitles) {
                try {
                    const subURL = `https://fmovies.to/ajax/episode/subtitles/${sourceID}`;
                    response.subtitles = JSON.parse(await MakeFetchZoro(subURL));
                }
                catch (err) {
                    console.warn(err);
                }
            }
            response.sources = sources;
            if (parseFloat(response.episode) === 0) {
                response.episode = "0.1";
            }
            return response;
        }
        catch (err) {
            throw err;
        }
    },
    checkConfig: function () {
        if (!localStorage.getItem("9anime")) {
            throw new Error("9anime URL not set");
        }
        if (!localStorage.getItem("apikey")) {
            throw new Error("API keynot set");
        }
    },
    getVRF: async function (query, action) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/${action}?query=${encodeURIComponent(query)}&apikey=${apiKey}`;
        if (fallbackAPI) {
            reqURL = `https://${nineAnimeURL}?query=${encodeURIComponent(query)}&action=${action}`;
        }
        const source = await MakeFetch(reqURL);
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.url) {
                return [encodeURIComponent(parsedJSON.url), parsedJSON.vrfQuery];
            }
            else {
                throw new Error(`${action}-VRF1: Received an empty URL or the URL was not found.`);
            }
        }
        catch (err) {
            throw new Error(`${action}-VRF1: Could not parse the JSON correctly.`);
        }
    },
    decryptSource: async function (query) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/fmovies-decrypt?query=${encodeURIComponent(query)}&apikey=${apiKey}`;
        if (fallbackAPI) {
            reqURL = `https://${nineAnimeURL}?query=${encodeURIComponent(query)}&action=fmovies-decrypt`;
        }
        const source = await MakeFetch(reqURL);
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.url) {
                return parsedJSON.url;
            }
            else {
                throw new Error("DECRYPT1: Received an empty URL or the URL was not found.");
            }
        }
        catch (err) {
            throw new Error("DECRYPT0: Could not parse the JSON correctly.");
        }
    },
    getVidstreamLink: async function (query, isViz = true) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/raw${isViz ? "Vizcloud" : "Mcloud"}?query=${encodeURIComponent(query)}&apikey=${apiKey}`;
        if (fallbackAPI) {
            reqURL = `https://${nineAnimeURL}?query=${encodeURIComponent(query)}&action=${isViz ? "vizcloud" : "mcloud"}`;
        }
        const rawSource = JSON.parse(await MakeFetch(reqURL)).rawURL;
        const fetchFunc = config.chrome ? MakeFetch : MakeCusReq;
        const source = await fetchFunc(rawSource, {
            headers: {
                "referer": isViz ? "https://vidstream.pro/" : "https://mcloud.to/",
                "x-requested-with": "XMLHttpRequest"
            }
        });
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.data &&
                parsedJSON.data.media &&
                parsedJSON.data.media.sources &&
                parsedJSON.data.media.sources[0] &&
                parsedJSON.data.media.sources[0].file) {
                return parsedJSON.data.media.sources[0].file;
            }
            else {
                throw new Error("VIZCLOUD1: Received an empty URL or the URL was not found.");
            }
        }
        catch (err) {
            throw new Error("VIZCLOUD0: Could not parse the JSON correctly.");
        }
    },
    getFilemoonLink: async function (filemoonHTML) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/filemoon?apikey=${apiKey}`;
        if (fallbackAPI) {
            throw new Error("Not supported");
        }
        const source = await MakeFetch(reqURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                "query": filemoonHTML
            })
        });
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.url) {
                return parsedJSON.url;
            }
            else {
                throw new Error("FILEMOON1: Received an empty URL or the URL was not found.");
            }
        }
        catch (err) {
            throw new Error("FILEMOON0: Could not parse the JSON correctly.");
        }
    },
    fixTitle: function (title) {
        try {
            const tempTitle = title.split("-");
            if (tempTitle.length > 1) {
                tempTitle.pop();
                title = tempTitle.join("-").toLowerCase().replace("series/", "").replace("movie/", "").replace("tv/", "");
                return title;
            }
            else {
                return title;
            }
        }
        catch (err) {
            return title;
        }
    },
    config: {
        "referer": "https://fmovies.to",
    },
    getConfig(url) {
        if (url.includes("mcloud.to")) {
            return {
                "referer": "https://mcloud.to/"
            };
        }
        else {
            return this.config;
        }
    }
};
var gogo = {
    baseURL: "https://gogoanime.gr",
    ajaxURL: "https://ajax.gogo-load.com/ajax",
    type: "anime",
    supportsMalsync: true,
    disableAutoDownload: false,
    disabled: false,
    name: "GogoAnime",
    shortenedName: "Gogo",
    keys: [
        CryptoJS.enc.Utf8.parse("37911490979715163134003223491201"),
        CryptoJS.enc.Utf8.parse("54674138327930866480207815084989"),
        CryptoJS.enc.Utf8.parse("3134003223491201")
    ],
    searchApi: async function (query) {
        var _a, _b;
        let dom = new DOMHandler();
        try {
            let searchHTML = await MakeFetchZoro(`${this.baseURL}/search.html?keyword=${encodeURIComponent(query)}`, {});
            dom.innerHTML = DOMPurify.sanitize(searchHTML);
            let itemsDOM = dom.document.querySelectorAll("ul.items li");
            let data = [];
            for (var i = 0; i < itemsDOM.length; i++) {
                let con = itemsDOM[i];
                let src = con.querySelector("img").getAttribute("src");
                let aTag = con.querySelector("a");
                let animeName = (_b = (_a = con.querySelector(".name")) === null || _a === void 0 ? void 0 : _a.innerText) === null || _b === void 0 ? void 0 : _b.trim();
                let animeHref = aTag.getAttribute("href") + "&engine=7";
                data.push({ "name": animeName, "image": src, "link": animeHref });
            }
            return ({ data, "status": 200 });
        }
        catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url, aniID) {
        const settled = "allSettled" in Promise;
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch").replace("category/", "");
        let response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
        try {
            if (settled) {
                let anilistID;
                if (!isNaN(parseInt(aniID))) {
                    anilistID = parseInt(aniID);
                }
                if (!anilistID) {
                    try {
                        anilistID = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/bal-mackup/mal-backup/master/page/Gogoanime/${id}.json`)).aniId;
                    }
                    catch (err) {
                        try {
                            anilistID = JSON.parse(await MakeFetch(`https://api.malsync.moe/page/Gogoanime/${id}`)).aniId;
                        }
                        catch (err) {
                            // anilistID will be undefined
                        }
                    }
                }
                if (anilistID) {
                    const promises = [
                        this.getAnimeInfoInter(url),
                        MakeFetchTimeout(`https://api.enime.moe/mapping/anilist/${anilistID}`, {}, 2000)
                    ];
                    const promiseResponses = await Promise.allSettled(promises);
                    if (promiseResponses[0].status === "fulfilled") {
                        response = promiseResponses[0].value;
                        if (promiseResponses[1].status === "fulfilled") {
                            try {
                                const metaData = JSON.parse(promiseResponses[1].value).episodes;
                                const metaDataMap = {};
                                for (let i = 0; i < metaData.length; i++) {
                                    metaDataMap[metaData[i].number] = metaData[i];
                                }
                                for (let i = 0; i < response.episodes.length; i++) {
                                    const currentEp = metaDataMap[response.episodes[i].id];
                                    const currentResponseEp = response.episodes[i];
                                    currentResponseEp.description = currentEp === null || currentEp === void 0 ? void 0 : currentEp.description;
                                    currentResponseEp.thumbnail = currentEp === null || currentEp === void 0 ? void 0 : currentEp.image;
                                    currentResponseEp.date = new Date(currentEp === null || currentEp === void 0 ? void 0 : currentEp.airedAt);
                                    currentResponseEp.title += ` - ${currentEp === null || currentEp === void 0 ? void 0 : currentEp.title}`;
                                }
                            }
                            catch (err) {
                                console.error(err);
                            }
                        }
                        return response;
                    }
                    else {
                        throw promiseResponses[0].reason;
                    }
                }
                else {
                    return await this.getAnimeInfoInter(url);
                }
            }
            else {
                return await this.getAnimeInfoInter(url);
            }
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    },
    getAnimeInfoInter: async function (url) {
        var _a;
        url = url.split("&engine")[0];
        const rawURL = `${this.baseURL}/${url}`;
        const animeDOM = new DOMHandler();
        const episodeDOM = new DOMHandler();
        try {
            const response = {
                "name": "",
                "image": "",
                "description": "",
                "episodes": [],
                "mainName": ""
            };
            const animeHTML = await MakeFetchZoro(`${this.baseURL}/${url}`, {});
            const id = url.replace("category/", "gogo-");
            animeDOM.innerHTML = DOMPurify.sanitize(animeHTML, { ADD_ATTR: ["ep_start", "ep_end"] });
            response.mainName = id;
            response.image = animeDOM.document.querySelector(".anime_info_body_bg img").getAttribute("src");
            response.name = animeDOM.document.querySelector(".anime_info_body_bg h1").innerText.trim();
            response.description = animeDOM.document.querySelectorAll(".anime_info_body_bg p.type")[1].innerText.trim();
            const episodeCon = animeDOM.document.querySelector("#episode_page").children;
            const epStart = episodeCon[0].querySelector("a").getAttribute("ep_start");
            const epEnd = episodeCon[episodeCon.length - 1].querySelector("a").getAttribute("ep_end");
            const movieID = animeDOM.document.querySelector("#movie_id").getAttribute("value");
            const alias = animeDOM.document.querySelector("#alias_anime").getAttribute("value");
            const epData = [];
            const episodeHTML = await MakeFetchZoro(`${this.ajaxURL}/load-list-episode?ep_start=${epStart}&ep_end=${epEnd}&id=${movieID}&default_ep=${0}&alias=${alias}`);
            episodeDOM.innerHTML = DOMPurify.sanitize(episodeHTML);
            const episodesLI = episodeDOM.document.querySelectorAll("#episode_related li");
            for (let i = 0; i < episodesLI.length; i++) {
                const el = episodesLI[i];
                let epNum = parseFloat(el.querySelector(`div.name`).innerText.replace('EP ', ''));
                if (epNum == 0) {
                    epNum = 0.1;
                }
                epData.unshift({
                    title: `Episode ${epNum}`,
                    link: `?watch=${id}&ep=${epNum}&engine=7`,
                    id: epNum.toString(),
                    altTitle: `Episode ${epNum}`,
                    sourceID: (_a = el.querySelector("a")) === null || _a === void 0 ? void 0 : _a.getAttribute("href")
                });
            }
            response.episodes = epData;
            return response;
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    getLinkFromUrl: async function (url) {
        var _a;
        const watchDOM = new DOMHandler();
        const embedDOM = new DOMHandler();
        try {
            const params = new URLSearchParams("?watch=" + url);
            const sourceURLs = [];
            const resp = {
                sources: sourceURLs,
                name: "",
                nameWSeason: "",
                episode: "",
                status: 400,
                message: "",
                next: null,
                prev: null,
            };
            const epNum = params.get("ep");
            const epList = await this.getAnimeInfo(params.get("watch").replace("gogo-", "category/"));
            const link = epList.episodes.find((ep) => ep.id === epNum).sourceID;
            const watchHTML = await MakeFetchZoro(`${this.baseURL}/${link}`);
            watchDOM.innerHTML = DOMPurify.sanitize(watchHTML, { ADD_TAGS: ["iframe"] });
            try {
                const prevTemp = watchDOM.document.querySelector(".anime_video_body_episodes_l a").getAttribute("href");
                let ep = parseFloat(prevTemp.split("-episode-")[1]);
                if (ep == 0) {
                    ep = 0.1;
                }
                resp.prev = `${params.get("watch")}&ep=${ep}&engine=7`;
            }
            catch (err) {
                console.error(err);
            }
            try {
                const nextTemp = watchDOM.document.querySelector(".anime_video_body_episodes_r a").getAttribute("href");
                let ep = parseFloat(nextTemp.split("-episode-")[1]);
                if (ep == 0) {
                    ep = 0.1;
                }
                resp.next = `${params.get("watch")}&ep=${ep}&engine=7`;
            }
            catch (err) {
                console.error(err);
            }
            let videoURLTemp = watchDOM.document.querySelector("#load_anime iframe").getAttribute("src");
            if (videoURLTemp.substring(0, 2) === "//") {
                videoURLTemp = "https:" + videoURLTemp;
            }
            const embedHTML = await MakeFetchZoro(videoURLTemp);
            const videoURL = new URL(videoURLTemp);
            embedDOM.innerHTML = DOMPurify.sanitize(embedHTML);
            const encyptedParams = this.generateEncryptedAjaxParams(embedHTML.split("data-value")[1].split("\"")[1], (_a = videoURL.searchParams.get('id')) !== null && _a !== void 0 ? _a : '', this.keys);
            const encryptedData = JSON.parse(await MakeFetch(`${videoURL.protocol}//${videoURL.hostname}/encrypt-ajax.php?${encyptedParams}`, {
                "headers": {
                    "X-Requested-With": "XMLHttpRequest"
                }
            }));
            const decryptedData = await this.decryptAjaxData(encryptedData.data, this.keys);
            if (!decryptedData.source)
                throw new Error('No source found.');
            for (const source of decryptedData.source) {
                sourceURLs.push({
                    url: source.file,
                    type: "hls",
                    name: "HLS"
                });
            }
            resp.name = params.get("watch");
            resp.nameWSeason = params.get("watch");
            resp.episode = params.get("ep");
            if (parseFloat(resp.episode) === 0) {
                resp.episode = "0.1";
            }
            return resp;
        }
        catch (err) {
            throw err;
        }
    },
    fixTitle(title) {
        try {
            title = title.replace("gogo-", "");
        }
        catch (err) {
            console.error(err);
        }
        finally {
            return title;
        }
    },
    generateEncryptedAjaxParams: function (scriptValue, id, keys) {
        const encryptedKey = CryptoJS.AES.encrypt(id, keys[0], {
            iv: keys[2],
        });
        const decryptedToken = CryptoJS.AES.decrypt(scriptValue, keys[0], {
            iv: keys[2],
        }).toString(CryptoJS.enc.Utf8);
        return `id=${encryptedKey}&alias=${id}&${decryptedToken}`;
    },
    decryptAjaxData: function (encryptedData, keys) {
        const decryptedData = CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(encryptedData, keys[1], {
            iv: keys[2],
        }));
        return JSON.parse(decryptedData);
    },
    getMetaData: async function (search) {
        const id = search.get("watch").replace("/category/", "");
        return await getAnilistInfo("Gogoanime", id);
    },
    rawURLtoInfo: function (url) {
        // https://gogoanime.bid/category/kimetsu-no-yaiba-movie-mugen-ressha-hen-dub
        return `?watch=${url.pathname}&engine=7`;
    }
};
try {
    (async function () {
        const keys = JSON.parse(await MakeFetchZoro(`https://raw.githubusercontent.com/enimax-anime/gogo/main/index.json`));
        for (let i = 0; i <= 2; i++) {
            keys[i] = CryptoJS.enc.Utf8.parse(keys[i]);
        }
        gogo.baseURL = keys[3];
        gogo.ajaxURL = keys[4];
        gogo.keys = keys;
    })();
}
catch (err) {
    console.error(err);
}
var mangaDex = {
    baseURL: "https://api.mangadex.org",
    type: "manga",
    supportsMalsync: true,
    disableAutoDownload: false,
    disabled: false,
    name: "MangaDex",
    shortenedName: "MDex",
    searchApi: async function (query) {
        var _a, _b;
        try {
            const res = JSON.parse(await MakeFetchZoro(`${this.baseURL}/manga?limit=${50}&title=${encodeURIComponent(query)}&offset=${0}&order[relevance]=desc&includes[]=cover_art`));
            if (res.result == "ok") {
                const results = {
                    status: 200,
                    data: []
                };
                for (const manga of res.data) {
                    const coverImage = (_b = (_a = manga === null || manga === void 0 ? void 0 : manga.relationships.filter((x) => x.type === "cover_art")[0]) === null || _a === void 0 ? void 0 : _a.attributes) === null || _b === void 0 ? void 0 : _b.fileName;
                    results.data.push({
                        link: "/" + manga.id + "&engine=8",
                        name: Object.values(manga.attributes.title)[0],
                        image: `https://mangadex.org/covers/${manga.id}/${coverImage}.256.jpg`
                    });
                }
                return results;
            }
            else {
                throw new Error(res.message);
            }
        }
        catch (err) {
            throw err;
        }
    },
    fetchAllChapters: async function (mangaId, offset, res) {
        if ((res === null || res === void 0 ? void 0 : res.offset) + 96 >= (res === null || res === void 0 ? void 0 : res.total)) {
            return [];
        }
        const response = JSON.parse(await MakeFetch(`${this.baseURL}/manga/${mangaId}/feed?offset=${offset}&limit=96&order[volume]=desc&order[chapter]=desc&translatedLanguage[]=en&includeFuturePublishAt=0&includeEmptyPages=0`));
        return [...response.data, ...(await this.fetchAllChapters(mangaId, offset + 96, response))];
    },
    getAnimeInfo: async function (url) {
        var _a, _b, _c, _d, _e;
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch");
        let response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": "",
            "isManga": true,
        };
        try {
            const data = JSON.parse(await MakeFetch(`${this.baseURL}/manga/${id}?includes[]=cover_art&hasAvailableChapters=1`));
            const coverImage = (_c = (_b = (_a = data.data) === null || _a === void 0 ? void 0 : _a.relationships.filter((x) => x.type === "cover_art")[0]) === null || _b === void 0 ? void 0 : _b.attributes) === null || _c === void 0 ? void 0 : _c.fileName;
            response.name = Object.values(data.data.attributes.title)[0];
            response.mainName = `${data.data.id}@${response.name.toLowerCase().replace(/\ /g, "-").replace(/[^a-z0-9\-]+/gi, "")}`;
            response.image = `https://mangadex.org/covers/${data.data.id}/${coverImage}.256.jpg`;
            response.description = (_d = data.data.attributes.description.en) !== null && _d !== void 0 ? _d : "";
            const allChapters = await this.fetchAllChapters(id, 0);
            let lastChap = 0;
            const hasBeenAdded = {};
            for (let i = allChapters.length - 1; i >= 0; i--) {
                const chapter = allChapters[i];
                const nextChap = allChapters[i - 1];
                const unmodifiedNum = chapter.attributes.chapter;
                const unmodifiedVol = chapter.attributes.volume;
                if (hasBeenAdded[`${unmodifiedVol}-${unmodifiedNum}`] === true) {
                    continue;
                }
                hasBeenAdded[`${unmodifiedVol}-${unmodifiedNum}`] = true;
                let chapNum = parseFloat(unmodifiedNum);
                if (isNaN(chapNum)) {
                    const nextChapNum = parseFloat((_e = nextChap === null || nextChap === void 0 ? void 0 : nextChap.attributes) === null || _e === void 0 ? void 0 : _e.chapter);
                    if (isNaN(nextChapNum)) {
                        chapNum = 0.1;
                    }
                    else {
                        chapNum = nextChapNum - 0.1;
                    }
                }
                response.episodes.push({
                    link: `?watch=${chapter.id}&chap=${chapNum}&engine=8`,
                    title: chapter.attributes.title ? `Chapter ${chapNum} - ${chapter.attributes.title}` : `Chapter ${chapNum}`,
                    id: chapter.id,
                    number: chapNum,
                    altTruncatedTitle: `Chapter ${chapNum}`
                });
            }
            return response;
        }
        catch (err) {
            throw err;
        }
    },
    getLinkFromUrl: async function (url) {
        function substringBefore(str, toFind) {
            let index = str.indexOf(toFind);
            return index == -1 ? "" : str.substring(0, index);
        }
        const chapterId = (new URLSearchParams("?watch=" + url)).get("watch");
        try {
            const promisesRes = await Promise.all([
                MakeFetch(`${this.baseURL}/at-home/server/${chapterId}`),
                MakeFetch(`https://api.mangadex.org/chapter/${chapterId}?includes[]=scanlation_group&includes[]=manga&includes[]=user`)
            ]);
            const response = {
                pages: [],
                next: null,
                nextTitle: null,
                prev: null,
                prevTitle: null,
                name: "",
                chapter: 0,
                title: "",
                type: "manga",
            };
            const res = JSON.parse(promisesRes[0]);
            const mangaInfo = JSON.parse(promisesRes[1]);
            const mangaData = mangaInfo.data.relationships.find((x) => x.type === "manga");
            const allChapters = (await this.getAnimeInfo(mangaData.id)).episodes;
            response.title = mangaInfo.data.attributes.title;
            response.name = Object.values(mangaData.attributes.title)[0];
            let currentIndex = -1;
            for (let i = 0; i < allChapters.length; i++) {
                const chapter = allChapters[i];
                if (chapter.id === chapterId) {
                    response.chapter = (chapter.number === 0) ? 0.1 : chapter.number;
                    currentIndex = i;
                    break;
                }
            }
            if (allChapters[currentIndex - 1]) {
                const prevChap = allChapters[currentIndex - 1];
                response.prev = `?watch=${prevChap.id}&chap=${prevChap.number}&engine=8`;
                response.prevTitle = prevChap.title;
            }
            if (allChapters[currentIndex + 1]) {
                const nextChap = allChapters[currentIndex + 1];
                response.next = `?watch=${nextChap.id}&chap=${nextChap.number}&engine=8`;
                response.nextTitle = nextChap.title;
            }
            for (const id of res.chapter.data) {
                response.pages.push({
                    img: `${res.baseUrl}/data/${res.chapter.hash}/${id}`,
                });
            }
            console.log(response);
            return response;
        }
        catch (err) {
            throw new Error(err.message);
        }
    },
    fixTitle(title) {
        try {
            const titleTemp = title.split("@");
            titleTemp.shift();
            title = titleTemp.join("@");
        }
        catch (err) {
            console.error(err);
        }
        finally {
            return title;
        }
    },
    getMetaData: async function (search) {
        const id = search.get("watch");
        return await getAnilistInfo("Mangadex", id, "MANGA");
    },
    rawURLtoInfo: function (url) {
        // https://mangadex.org/title/296cbc31-af1a-4b5b-a34b-fee2b4cad542
        return `?watch=/${url.pathname.replace("/title/", "")}&engine=8`;
    }
};
var mangaFire = {
    baseURL: "https://mangafire.to",
    type: "manga",
    supportsMalsync: true,
    disableAutoDownload: false,
    disabled: false,
    name: "MangaFire",
    shortenedName: "MFire",
    searchApi: async function (query) {
        var _a, _b;
        const searchDOM = new DOMHandler();
        try {
            const searchHTML = await MakeFetchZoro(`${this.baseURL}/filter?keyword=${encodeURIComponent(query)}`);
            const results = {
                status: 200,
                data: []
            };
            searchDOM.innerHTML = DOMPurify.sanitize(searchHTML);
            for (const mangaCard of searchDOM.document.querySelectorAll(".item")) {
                const nameDOM = (_a = mangaCard.querySelector(".name")) === null || _a === void 0 ? void 0 : _a.querySelector("a");
                results.data.push({
                    link: (nameDOM === null || nameDOM === void 0 ? void 0 : nameDOM.getAttribute("href").replace("manga/", "mangafire-")) + "&engine=9",
                    name: nameDOM === null || nameDOM === void 0 ? void 0 : nameDOM.getAttribute("title"),
                    image: (_b = mangaCard === null || mangaCard === void 0 ? void 0 : mangaCard.querySelector("img")) === null || _b === void 0 ? void 0 : _b.getAttribute("src")
                });
            }
            return results;
        }
        catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url) {
        var _a, _b, _c, _d, _e;
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch");
        const infoDOM = new DOMHandler();
        const rawURL = `${this.baseURL}/${id.replace("mangafire-", "manga/")}`;
        let response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": "",
            "isManga": true,
        };
        try {
            const infoHTML = await MakeFetch(rawURL);
            infoDOM.innerHTML = DOMPurify.sanitize(infoHTML);
            response.name = ((_a = infoDOM === null || infoDOM === void 0 ? void 0 : infoDOM.document.querySelector(".info")) === null || _a === void 0 ? void 0 : _a.querySelector(".name")).innerText;
            response.image = (_c = (_b = infoDOM.document.querySelector(".poster")) === null || _b === void 0 ? void 0 : _b.querySelector("img")) === null || _c === void 0 ? void 0 : _c.getAttribute("src");
            response.description = (_d = infoDOM.document.querySelector(".summary")) === null || _d === void 0 ? void 0 : _d.innerText;
            response.mainName = id;
            const episodeListDOM = (_e = infoDOM.document.querySelector(".chapter-list[data-name=\"EN\"]")) === null || _e === void 0 ? void 0 : _e.querySelectorAll("li.item");
            for (let i = episodeListDOM.length - 1; i >= 0; i--) {
                const episodeLI = episodeListDOM[i];
                const linkSplit = episodeLI.querySelector("a").getAttribute("href").split("/read/");
                linkSplit.shift();
                response.episodes.push({
                    title: episodeLI.querySelector("a").querySelector("span").innerText,
                    number: parseFloat(episodeLI.getAttribute("data-number")),
                    link: `?watch=/read/${linkSplit.join("/read/")}&chap=${episodeLI.getAttribute("data-number")}&engine=9`,
                });
            }
            return response;
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    descramble: function (imageURL, key) {
        return new Promise(async function (resolve, reject) {
            // const image = await loadImage(imageURL);
            const worker = new Worker("./extensions/utils/mangafireDecrambler.js");
            // const bitmap = await createImageBitmap(image);
            const timeout = setTimeout(function () {
                try {
                    worker.terminate();
                    reject(new Error("Timeout"));
                }
                catch (err) {
                    console.error(err);
                }
            }, 20000);
            try {
                worker.onmessage = (message) => {
                    const data = message.data;
                    if (data instanceof Blob) {
                        clearTimeout(timeout);
                        resolve(window.URL.createObjectURL(data));
                    }
                    else {
                        clearTimeout(timeout);
                        reject(new Error("Unexpected message"));
                    }
                    worker.terminate();
                };
                worker.onerror = (err) => {
                    clearTimeout(timeout);
                    reject(err);
                };
                worker.postMessage([key, imageURL]);
            }
            catch (err) {
                console.error(err);
                clearTimeout(timeout);
                reject(err);
            }
        });
    },
    getLinkFromUrl: async function (url) {
        var _a;
        const chapterId = (new URLSearchParams("?watch=" + url)).get("watch");
        const chapterSplit = chapterId.split(".");
        const identifier = chapterSplit[1].split("/")[0];
        const name = fix_title(chapterSplit[0].replace("/read/", ""));
        const chapterListDOM = new DOMHandler();
        try {
            const chapterListHTML = JSON.parse(await MakeFetch(`${this.baseURL}/ajax/read/${identifier}/list?viewby=chapter`)).result.html;
            const response = {
                pages: [],
                next: null,
                nextTitle: null,
                prev: null,
                prevTitle: null,
                name: name,
                chapter: 0,
                title: "",
                type: "manga"
            };
            chapterListDOM.innerHTML = DOMPurify.sanitize(chapterListHTML);
            const chapterList = (_a = chapterListDOM.document.querySelector(".numberlist[data-lang=\"en\"]")) === null || _a === void 0 ? void 0 : _a.querySelectorAll("a");
            let currentIndex = -1;
            let chapterMainID = "";
            for (let i = 0; i < chapterList.length; i++) {
                const anchorTag = chapterList[i];
                const linkSplit = anchorTag.getAttribute("href").split("/read/");
                linkSplit.shift();
                if (chapterId === "/read/" + linkSplit.join("/read/")) {
                    currentIndex = i;
                    response.chapter = parseFloat(anchorTag.getAttribute("data-number"));
                    if (response.chapter === 0) {
                        response.chapter = 0.1;
                    }
                    chapterMainID = anchorTag.getAttribute("data-id");
                    response.title = anchorTag.innerText.replace(`Chapter ${anchorTag.getAttribute("data-number")}:`, "");
                }
            }
            if (chapterList[currentIndex + 1]) {
                const nextChap = chapterList[currentIndex + 1];
                const linkSplit = nextChap.getAttribute("href").split("/read/");
                linkSplit.shift();
                response.prev = `?watch=${"/read/" + linkSplit.join("/read/")}&chap=${nextChap.getAttribute("data-number")}&engine=9`;
                response.prevTitle = nextChap.innerText;
            }
            if (chapterList[currentIndex - 1]) {
                const prevChap = chapterList[currentIndex - 1];
                const linkSplit = prevChap.getAttribute("href").split("/read/");
                linkSplit.shift();
                response.next = `?watch=${"/read/" + linkSplit.join("/read/")}&chap=${prevChap.getAttribute("data-number")}&engine=9`;
                response.nextTitle = prevChap.innerText;
            }
            for (const page of JSON.parse(await MakeFetch(`https://mangafire.to/ajax/read/chapter/${chapterMainID}`)).result.images) {
                response.pages.push({
                    img: page[0],
                    needsDescrambling: page[2] !== 0,
                    key: page[2],
                });
            }
            return response;
        }
        catch (err) {
            throw new Error(err.message);
        }
    },
    fixTitle(title) {
        try {
            const titleTemp = title.replace("mangafire-", "").split(".");
            titleTemp.pop();
            title = titleTemp.join(".");
        }
        catch (err) {
            console.error(err);
        }
        finally {
            return title;
        }
    },
    getMetaData: async function (search) {
        const id = search.get("watch").replace("mangafire-", "");
        return await getAnilistInfo("MangaFire", id, "MANGA");
    },
    rawURLtoInfo: function (url) {
        // https://mangafire.to/manga/dr-stone.qkm13/
        let path = url.pathname.replace("manga/", "mangafire-");
        if (path[path.length - 1] === "/") {
            path = path.substring(0, path.length - 1);
        }
        return `?watch=${path}&engine=9`;
    }
};
var viewAsian = {
    baseURL: "https://viewasian.co",
    type: "tv",
    disabled: false,
    disableAutoDownload: false,
    name: "viewAsian",
    shortenedName: "viewAsian",
    keys: [
        CryptoJS.enc.Utf8.parse("93422192433952489752342908585752"),
        CryptoJS.enc.Utf8.parse("9262859232435825"),
    ],
    searchApi: async function (query) {
        var _a, _b;
        let dom = new DOMHandler();
        try {
            let searchHTML = await MakeFetchZoro(`${this.baseURL}/movie/search/${query.replace(/[\W_]+/g, '-')}`, {});
            dom.innerHTML = DOMPurify.sanitize(searchHTML);
            let itemsDOM = dom.document.querySelectorAll(".movies-list-full .ml-item");
            let data = [];
            for (var i = 0; i < itemsDOM.length; i++) {
                let con = itemsDOM[i];
                let src = con.querySelector("img").getAttribute("data-original");
                let aTag = con.querySelector("a");
                let animeName = (_b = (_a = con.querySelector(".mli-info")) === null || _a === void 0 ? void 0 : _a.innerText) === null || _b === void 0 ? void 0 : _b.trim();
                let animeHref = aTag.getAttribute("href") + "&engine=10";
                data.push({ "name": animeName, "image": src, "link": animeHref });
            }
            return ({ data, "status": 200 });
        }
        catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url) {
        url = url.split("&engine")[0];
        const rawURL = `${this.baseURL}/${url}`;
        const animeDOM = new DOMHandler();
        const episodeDOM = new DOMHandler();
        try {
            const response = {
                "name": "",
                "image": "",
                "description": "",
                "episodes": [],
                "mainName": ""
            };
            const animeHTML = await MakeFetchZoro(rawURL, {});
            const identifier = url.split("/")[0] + "/";
            const id = url.replace(identifier, "viewasian-");
            animeDOM.innerHTML = DOMPurify.sanitize(animeHTML);
            response.mainName = id;
            response.image = animeDOM.document.querySelector(".detail-mod img").getAttribute("src");
            response.name = animeDOM.document.querySelector(".detail-mod h3").innerText.trim();
            response.description = animeDOM.document.querySelector(".desc").innerText.trim();
            const epData = [];
            const episodeHTML = await MakeFetchZoro(`${this.baseURL}/${animeDOM.document.querySelector(".bwac-btn").getAttribute("href")}`);
            episodeDOM.innerHTML = DOMPurify.sanitize(episodeHTML, {
                ADD_ATTR: ["episode-data"]
            });
            const episodeCon = episodeDOM.document.querySelectorAll("ul#episodes-sv-1 li");
            for (let i = 0; i < episodeCon.length; i++) {
                const el = episodeCon[i];
                const anchorTag = el.querySelector("a");
                let epNum = parseInt(anchorTag.getAttribute("episode-data"));
                const epParam = new URL(`${this.baseURL}${anchorTag.getAttribute("href")}`).searchParams.get("ep");
                if (epNum == 0) {
                    epNum = 0.1;
                }
                epData.unshift({
                    title: `Episode ${epNum}`,
                    link: `?watch=${id}&ep=${epParam}&engine=10`,
                    id: epNum.toString(),
                    altTitle: `Episode ${epNum}`
                });
            }
            response.episodes = epData;
            return response;
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    getLinkFromUrl: async function (url) {
        var _a, _b;
        const watchDOM = new DOMHandler();
        const embedDOM = new DOMHandler();
        try {
            const params = new URLSearchParams("?watch=" + url);
            const sourceURLs = [];
            const resp = {
                sources: sourceURLs,
                name: "",
                nameWSeason: "",
                episode: "",
                status: 400,
                message: "",
                next: null,
                prev: null,
            };
            const watchHTML = await MakeFetchZoro(`${this.baseURL}/watch/${params.get("watch").replace("viewasian-", "")}/watching.html?ep=${params.get("ep")}`);
            watchDOM.innerHTML = DOMPurify.sanitize(watchHTML, { ADD_TAGS: ["iframe"] });
            const episodeCon = watchDOM.document.querySelectorAll("ul#episodes-sv-1 li");
            let foundCurrentEp = false;
            for (let i = episodeCon.length - 1; i >= 0; i--) {
                const el = episodeCon[i];
                const anchorTag = el.querySelector("a");
                const epParam = new URL(`${this.baseURL}${anchorTag.getAttribute("href")}`).searchParams.get("ep");
                if (foundCurrentEp) {
                    resp.next = `${params.get("watch")}&ep=${epParam}&engine=10`;
                    break;
                }
                if (params.get("ep") === epParam) {
                    foundCurrentEp = true;
                }
                else {
                    resp.prev = `${params.get("watch")}&ep=${epParam}&engine=10`;
                }
            }
            if (!foundCurrentEp) {
                resp.prev = undefined;
            }
            let asianLoadURL = "";
            const links = watchDOM.document.querySelectorAll('.anime_muti_link li');
            for (let i = 0; i < links.length; i++) {
                const curElem = links[i];
                const isAsianLoad = curElem.innerText.toLowerCase().includes("asianload");
                if (isAsianLoad) {
                    asianLoadURL = curElem.getAttribute("data-video");
                }
            }
            if (asianLoadURL.substring(0, 2) === "//") {
                asianLoadURL = "https:" + asianLoadURL;
            }
            const embedHTML = await MakeFetchZoro(asianLoadURL);
            const videoURL = new URL(asianLoadURL);
            embedDOM.innerHTML = DOMPurify.sanitize(embedHTML);
            const encyptedParams = this.generateEncryptedAjaxParams(embedHTML.split("data-value")[1].split("\"")[1], (_a = videoURL.searchParams.get('id')) !== null && _a !== void 0 ? _a : '', this.keys);
            const encryptedData = JSON.parse(await MakeFetch(`${videoURL.protocol}//${videoURL.hostname}/encrypt-ajax.php?${encyptedParams}`, {
                "headers": {
                    "X-Requested-With": "XMLHttpRequest"
                }
            }));
            const decryptedData = await this.decryptAjaxData(encryptedData.data, this.keys);
            if (!decryptedData.source)
                throw new Error('No source found.');
            for (const source of decryptedData.source) {
                sourceURLs.push({
                    url: source.file,
                    type: "hls",
                    name: "HLS"
                });
            }
            if (decryptedData.source_bk && ((_b = decryptedData.source_bk) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                for (const source of decryptedData.source_bk) {
                    sourceURLs.push({
                        url: source.file,
                        type: "hls",
                        name: "HLS"
                    });
                }
            }
            resp.name = params.get("watch");
            resp.nameWSeason = params.get("watch");
            resp.episode = params.get("ep");
            if (parseFloat(resp.episode) === 0) {
                resp.episode = "0.1";
            }
            return resp;
        }
        catch (err) {
            throw err;
        }
    },
    fixTitle(title) {
        try {
            title = title.replace("viewasian-", "");
        }
        catch (err) {
            console.error(err);
        }
        finally {
            return title;
        }
    },
    generateEncryptedAjaxParams: function (scriptValue, id, keys) {
        const encryptedKey = CryptoJS.AES.encrypt(id, keys[0], {
            iv: keys[1],
        });
        const decryptedToken = CryptoJS.AES.decrypt(scriptValue, keys[0], {
            iv: keys[1],
        }).toString(CryptoJS.enc.Utf8);
        return `id=${encryptedKey}&alias=${id}&${decryptedToken}`;
    },
    decryptAjaxData: function (encryptedData, keys) {
        const decryptedData = CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(encryptedData, keys[0], {
            iv: keys[1],
        }));
        return JSON.parse(decryptedData);
    }
};
try {
    (async function () {
        const keys = JSON.parse(await MakeFetchZoro(`https://raw.githubusercontent.com/enimax-anime/gogo/main/viewasian.json`));
        for (let i = 0; i <= 1; i++) {
            keys[i] = CryptoJS.enc.Utf8.parse(keys[i]);
        }
        viewAsian.keys = keys;
    })();
}
catch (err) {
    console.error(err);
}

// @ts-ignore
const extensionList = [wco, animixplay, fmovies, zoro, twitch, nineAnime, fmoviesto, gogo, mangaDex, mangaFire, viewAsian, anilist, anna, kaa];
// @ts-ignore   
const extensionNames = [];
// @ts-ignore
const extensionDisabled = [];
// @ts-ignore
const extensionTypes = [];
for (const extension of extensionList) {
    extensionNames.push(extension.name);
    extensionDisabled.push(extension.disabled);
    extensionTypes.push(extension.type);
}
