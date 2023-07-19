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

String.prototype["substringAfter"] = function (toFind: string) {
    let str = this;
    let index = str.indexOf(toFind);
    return index == -1 ? "" : str.substring(index + toFind.length);
}

String.prototype["substringBefore"] = function (toFind: string) {
    let str = this;
    let index = str.indexOf(toFind);
    return index == -1 ? "" : str.substring(0, index);
}

String.prototype["substringAfterLast"] = function (toFind: string) {
    let str = this;
    let index = str.lastIndexOf(toFind);
    return index == -1 ? "" : str.substring(index + toFind.length);
}

String.prototype["substringBeforeLast"] = function (toFind: string) {
    let str = this;
    let index = str.lastIndexOf(toFind);
    return index == -1 ? "" : str.substring(0, index);
}

String.prototype["onlyOnce"] = function (substring: string) {
    let str = this;
    return str.lastIndexOf(substring) == str.indexOf(substring);
}

function extractKey(id: number, url = null, useCached = false): Promise<string> {
    return (new Promise(async function (resolve, reject) {
        try {
            let gitHTML = (await MakeFetch(`https://github.com/enimax-anime/key/blob/e${id}/key.txt`)) as unknown as modifiedString;
            let key = gitHTML.substringAfter('"blob-code blob-code-inner js-file-line">').substringBefore("</td>");
            if (!key) {
                key = gitHTML.substringAfter('"rawBlob":"').substringBefore("\"");
            }

            if (!key) {
                key = (await MakeFetch(`https://raw.githubusercontent.com/enimax-anime/key/e${id}/key.txt`)) as unknown as modifiedString;
            }
            resolve(key);
        } catch (err) {
            reject(err);
        }
    }));
}

// @ts-ignore
async function MakeFetch(url: string, options = {}): Promise<string> {
    return new Promise(function (resolve, reject) {
        fetch(url, options).then(response => response.text()).then((response: string) => {
            resolve(response);
        }).catch(function (err) {
            reject(new Error(`${err.message}: ${url}`));
        });
    });
}

async function MakeFetchTimeout(url, options = {}, timeout = 5000): Promise<string> {
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
var MakeCusReqFmovies = async function (url: string, options: { [key: string]: string | object }): Promise<string> {
    return new Promise(function (resolve, reject) {
        // @ts-ignore
        cordova.plugin.http.sendRequest(url, options, function (response) {
            resolve(response.data);
        }, function (response) {
            reject(response.error);
        });
    });
}

// for v2
if (config && config.chrome) {

    if (config.manifest === "v2") {
        // @ts-ignore
        chrome.webRequest.onBeforeSendHeaders.addListener(
            function (details) {
                details.requestHeaders.push({
                    "name": "referer",
                    "value": wcoRef
                });

                details.requestHeaders.push({
                    "name": "x-requested-with",
                    "value": "XMLHttpRequest"
                });
                return { requestHeaders: details.requestHeaders };
            },
            { urls: ['https://*.watchanimesub.net/*'] },
            ['blocking', 'requestHeaders', 'extraHeaders']
        );

        // @ts-ignore
        chrome.webRequest.onBeforeSendHeaders.addListener(
            function (details) {

                if (details.url.includes("vidstream.") || details.url.includes("vizcloud.")) {
                    details.requestHeaders.push({
                        "name": "Referer",
                        "value": "https://vidstream.pro/"
                    });

                    details.requestHeaders.push({
                        "name": "x-requested-with",
                        "value": "XMLHttpRequest"
                    });
                } else if (details.url.includes("mcloud.")) {
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
            },
            { urls: ["<all_urls>"] },
            ['blocking', 'requestHeaders', 'extraHeaders']
        );
    }

    MakeCusReqFmovies = async function (url: string, options: { [key: string]: string | object }): Promise<string> {
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
    }
}


function getWebviewHTML(url = "https://www.zoro.to", hidden = false, timeout: number | undefined = 15000, code: boolean | string = false, isAnilist = false) {
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
                    const shouldUpdate = await (window.parent as cordovaWindow).Dialogs.confirm("Logged in! Do you want to import your library? if you don't want to do that right now, you can do that later by going to the menu");
                    if (shouldUpdate) {
                        AnilistHelper.getAllItems();
                    }
                    resolve("Done");
                } else if ((new URL(event.url)).hostname === "anilist.co") {
                    inappRef.show();
                }
            } else {
                inappRef.executeScript({
                    'code': code === false ? `let resultInApp={'status':200,'data':document.body.innerText};
                        webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(resultInApp));` : code
                });
            }
        });

        inappRef.addEventListener('loaderror', (err: Error) => {
            inappRef.show();
            reject(new Error("Error"));
        });

        inappRef.addEventListener('message', (result: string) => {
            inappRef.close();
            resolve(result);
        });

        inappRef.addEventListener('exit', (result: string) => {
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

async function MakeFetchZoro(url: string, options = {}): Promise<string> {
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

function removeDOM(domElem: HTMLElement) {
    try {
        domElem.innerHTML = "";
        domElem.remove();
    } catch (err) {

    }
}


function getCurrentSeason(type: "current" | "next") {
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

function getCurrentYear(type: "current" | "next") {
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

async function anilistAPI(query: string, variables = {}) {

    const url = 'https://graphql.anilist.co',
        options = {
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

async function getAnilistInfo(type: anilistType, id: string, mediaType: "ANIME" | "MANGA" = "ANIME") {
    let anilistID;

    try {
        anilistID = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/bal-mackup/mal-backup/master/page/${type}/${id}.json`)).aniId;
    } catch (err) {
        anilistID = JSON.parse(await MakeFetch(`https://api.malsync.moe/page/${type}/${id}`)).aniId;
    }

    return (await anilistAPI(anilistQueries.info, { id: anilistID, type: mediaType })).data.Media;
}

async function anilistToMal(anilistID: string, type: "ANIME" | "MANGA") {
    return (await anilistAPI(anilistQueries.anilistToMal, { id: anilistID, type })).data.Media.idMal;
}

async function getMetaByAniID(anilistID: string, mediaType: "ANIME" | "MANGA" = "ANIME") {
    return (await anilistAPI(anilistQueries.info, { id: anilistID, type: mediaType })).data.Media;
}

async function getAnilistTrending(type: "current" | "next") {

    return (await anilistAPI(anilistQueries.trending, {
        page: 1,
        perPage: 25,
        season: getCurrentSeason(type),
        seasonYear: getCurrentYear(type)
    })).data.Page.media;
}

function secondsToHuman(seconds: number, abbreviated: boolean = false) {
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

function batchConstructor(ids: Array<string>, isMalIdReq = false, type?: "ANIME" | "MANGA") {
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
        } else {
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

async function sendBatchReqs(ids: Array<string>) {
    const queries = batchConstructor(ids);
    const promises = [];

    for (const query of queries) {
        promises.push(anilistAPI(query));
    }

    const responses = await Promise.all(promises);
    const result = {};

    for (let i = 0; i < responses.length; i++) {
        for (const id in responses[i].data) {
            result[id] = responses[i]?.data[id].media[0];
        }
    }

    return result;
}

async function getBatchMalIds(ids: Array<string>, type: "ANIME" | "MANGA") {
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

            result[id] = responses[i]?.data[tempId]?.media[0]?.idMal;
            if(isNaN(parseInt(result[id]))){
                delete result[id];
            }
        }
    }

    return result;
}

function loadImage(url: string): Promise<HTMLImageElement> {
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