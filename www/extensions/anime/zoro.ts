var zoro: extension = {
    baseURL: "https://kaido.to",
    type: "anime",
    supportsMalsync: true,
    disableAutoDownload: false,
    nonV2URLs: ["https://9animetv.to", "https://kaido.to"],
    disabled: false,
    name: "Zoro",
    shortenedName: "Zoro",
    searchApi: async function (query: string): Promise<extensionSearch> {
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
        } catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url, aniID): Promise<extensionInfo> {
        const settled = "allSettled" in Promise;
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch").split("-").pop();

        let response: extensionInfo = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };

        try {
            if (settled) {
                let anilistID: number;

                if (!isNaN(parseInt(aniID))) {
                    anilistID = parseInt(aniID);
                }

                if (!anilistID) {
                    try {
                        anilistID = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/bal-mackup/mal-backup/master/page/Zoro/${id}.json`)).aniId;
                    } catch (err) {
                        try {
                            anilistID = JSON.parse(await MakeFetch(`https://api.malsync.moe/page/Zoro/${id}`)).aniId;
                        } catch (err) {
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

                                    currentResponseEp.description = currentEp?.description;
                                    currentResponseEp.thumbnail = currentEp?.image;
                                    currentResponseEp.date = new Date(currentEp?.airedAt);
                                    currentResponseEp.title += ` - ${currentEp?.title}`;
                                }
                            } catch (err) {
                                console.error(err);
                            }
                        }

                        return response;

                    } else {
                        throw promiseResponses[0].reason;
                    }
                } else {
                    return await this.getAnimeInfoInter(url);
                }

            } else {
                return await this.getAnimeInfoInter(url);
            }
        } catch (err) {
            console.error(err);
            throw err;
        }

    },
    getAnimeInfoInter: async function (url: string): Promise<extensionInfo> {
        url = url.split("&engine")[0];

        const is9animeTv = this.baseURL === "https://9animetv.to";
        const rawURL = `${this.baseURL}${is9animeTv ? "/watch/" : "/"}${url}`;
        const animeDOM = new DOMHandler();;
        const dom = new DOMHandler();;
        const type = this.nonV2URLs.includes(this.baseURL);

        try {
            let idSplit = url.replace("?watch=/", "").split("-");
            let id = idSplit[idSplit.length - 1].split("?")[0];
            let response: extensionInfo = {
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
            response.name = (animeDOM.document.querySelector(".film-name.dynamic-name") as HTMLElement).innerText;
            response.image = (animeDOM.document.querySelector(is9animeTv ? ".anime-detail" : ".layout-page.layout-page-detail") as HTMLElement).querySelector("img").src;
            response.description = (animeDOM.document.querySelector(".film-description") as HTMLElement).innerText;

            try {
                response.genres = [];
                const metaCon = animeDOM.document.querySelector(".item.item-list");
                for (const genreAnchor of metaCon.querySelectorAll("a")) {
                    response.genres.push(genreAnchor.innerText);
                }
            } catch (err) {
                console.error(err);
            }

            let episodeHTML = JSON.parse(await MakeFetchZoro(`${this.baseURL}/ajax/${type ? "" : "v2/"}episode/list/${id}`, {})).html;
            dom.innerHTML = DOMPurify.sanitize(episodeHTML);

            let episodeListDOM = dom.document.querySelectorAll('.ep-item');
            let data = [];

            for (var i = 0; i < episodeListDOM.length; i++) {
                let tempEp: extensionInfoEpisode = {
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
        } catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    getEpisodeListFromAnimeId: async function getEpisodeListFromAnimeId(showID: string, episodeId: string) {

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
        } catch (err) {
            throw err;
        }
    },
    addSource: async function addSource(type: string, id: string, subtitlesArray: Array<videoSubtitle>, sourceURLs: Array<videoSource>) {
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
            } catch (err) {

            }
            try {
                if (sourceJSON.encrypted && typeof sourceJSON.sources == "string") {
                    let encryptedURL = sourceJSON.sources;
                    let decryptKey, tempFile;
                    try {
                        decryptKey = await extractKey(baseType ? 0 : 6, null, true);
                        try{
                            decryptKey = JSON.parse(decryptKey);
                        }catch(err){

                        }

                        console.log(decryptKey);

                        if(typeof decryptKey === "string"){
                            sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                        }else{
                            console.log(decryptKey, encryptedURL);
                            const encryptedURLTemp = encryptedURL.split("");
                            let key = "";

                            for(const index of decryptKey){
                                for(let i = index[0]; i < index[1]; i++){
                                    key += encryptedURLTemp[i];
                                    encryptedURLTemp[i] = null;
                                }
                            }

                            decryptKey = key;
                            encryptedURL = encryptedURLTemp.filter((x) => x !== null).join("");

                            console.log(encryptedURL, decryptKey);


                            sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                        }

                    } catch (err) {
                        if (err.message == "Malformed UTF-8 data") {
                            decryptKey = await extractKey(baseType ? 0 : 6);
                            try {
                                sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                            } catch (err) {

                            }
                        }
                    }
                }
                let tempSrc: videoSource = { "url": sourceJSON.sources[0].file, "name": "HLS#" + type, "type": "hls" };
                if ("intro" in sourceJSON && "start" in sourceJSON.intro && "end" in sourceJSON.intro) {
                    tempSrc.skipIntro = sourceJSON.intro;
                }
                sourceURLs.push(tempSrc);
            } catch (err) {
                console.error(err);
            }
        } catch (err) {
            console.error(err);
        }

        if (shouldThrow) {
            throw new Error("Token not found");
        }
    },
    getVideoTitle: async function (url: string): Promise<string> {
        let showURL = new URLSearchParams(url);

        try {
            const response = await this.getAnimeInfo(showURL.get("watch")) as extensionInfo;
            const ep = showURL.get("ep");

            for (let i = 0; i < response.episodes.length; i++) {
                if (response.episodes[i].sourceID === ep) {
                    const titleTemp = response.episodes[i].title.split("-");
                    titleTemp.shift();
                    const title = titleTemp.join("-");

                    if (title) {
                        return title?.trim();
                    }
                    return "";
                }
            }
            return "";
        } catch (err) {
            return "";
        }
    },
    getLinkFromUrl: async function (url: string): Promise<extensionVidSource> {
        const sourceURLs: Array<videoSource> = [];
        let subtitles: Array<videoSubtitle> = [];

        const resp: extensionVidSource = {
            sources: sourceURLs,
            name: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null,
        };

        let episodeId: string, animeId;

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
            } catch (err) {
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
        } catch (err) {
            throw err;
        }

    },
    discover: async function (): Promise<Array<extensionDiscoverData>> {
        let temp = new DOMHandler()
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
        } catch (err) {
            throw err;
        }
    },
    genToken: async function genToken() {

        await getWebviewHTML("https://rapid-cloud.co/", false, 15000, `let resultInApp={'status':200,'data':localStorage.setItem("v1.1_getSourcesCount", "40")};webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(resultInApp));`) as any;

        await new Promise(r => setTimeout(r, 500));

        try {
            await thisWindow.Dialogs.alert("Close the inAppBrowser when the video has started playing.")
            await getWebviewHTML("https://zoro.to/watch/eighty-six-2nd-season-17760?ep=84960", false, 120000, '');
        } catch (err) {

        }

        await new Promise(r => setTimeout(r, 500));

        try {
            const token = await getWebviewHTML("https://rapid-cloud.co/", false, 15000, `let resultInApp={'status':200,'data':localStorage.getItem("v1.1_token")};webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(resultInApp));`) as any;

            localStorage.setItem("rapidToken", token.data.data);

            await thisWindow.Dialogs.alert("Token extracted. You can now refresh the page.")
        } catch (err) {
            await thisWindow.Dialogs.alert("Could not extract the token. Try again or Contact the developer.");
        }

    },
    getMetaData: async function (search: URLSearchParams) {
        const id = search.get("watch").split("-").pop()
        return await getAnilistInfo("Zoro", id);
    },
    rawURLtoInfo: function (url: URL) {
        // https://zoro.to/kimetsu-no-yaiba-movie-mugen-ressha-hen-15763
        return `?watch=${url.pathname}&engine=3`;
    }
};

try {
    (async function () {
        const keys: Array<string> = JSON.parse(await MakeFetchZoro(`https://raw.githubusercontent.com/enimax-anime/gogo/main/zoro.json`));
        zoro.baseURL = keys[0];
    })();
} catch (err) {
    console.error(err);
}