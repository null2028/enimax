var zoro = {
    baseURL: "https://zoro.to",
    searchApi: async function (query) {
        let dom = document.createElement("div");
        try {
            let searchHTML = await MakeFetchZoro(`https://zoro.to/search?keyword=${query}`, {});
            dom.innerHTML = DOMPurify.sanitize(searchHTML);
            let itemsDOM = dom.querySelectorAll('.flw-item');
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
        finally {
            removeDOM(dom);
        }
    },
    getAnimeInfo: async function (url) {
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
                try {
                    anilistID = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/MALSync/MAL-Sync-Backup/master/data/pages/Zoro/${id}.json`)).aniId;
                }
                catch (err) {
                    // anilistID will be undefined
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
        const rawURL = `https://zoro.to/${url}`;
        const animeDOM = document.createElement("div");
        const dom = document.createElement("div");
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
            let animeHTML = await MakeFetchZoro(`https://zoro.to/${url}`, {});
            animeDOM.innerHTML = DOMPurify.sanitize(animeHTML);
            let name = (new URLSearchParams(`?watch=${url}`)).get("watch");
            const nameSplit = name.split("-");
            nameSplit.pop();
            name = nameSplit.join("-");
            response.mainName = name;
            response.name = animeDOM.querySelector(".film-name.dynamic-name").innerText;
            response.image = animeDOM.querySelector(".layout-page.layout-page-detail").querySelector("img").src;
            response.description = animeDOM.querySelector(".film-description.m-hide").innerText;
            try {
                response.genres = [];
                const metaCon = animeDOM.querySelector(".item.item-list");
                for (const genreAnchor of metaCon.querySelectorAll("a")) {
                    response.genres.push(genreAnchor.innerText);
                }
            }
            catch (err) {
                console.error(err);
            }
            let episodeHTML = JSON.parse(await MakeFetchZoro(`https://zoro.to/ajax/v2/episode/list/${id}`, {})).html;
            dom.innerHTML = DOMPurify.sanitize(episodeHTML);
            let episodeListDOM = dom.querySelectorAll('.ep-item');
            let data = [];
            for (var i = 0; i < episodeListDOM.length; i++) {
                let tempEp = {
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
        finally {
            removeDOM(animeDOM);
            removeDOM(dom);
        }
    },
    getEpisodeListFromAnimeId: async function getEpisodeListFromAnimeId(showID, episodeId) {
        let dom = document.createElement("div");
        try {
            let res = JSON.parse((await MakeFetchZoro(`https://zoro.to/ajax/v2/episode/list/${showID}`, {})));
            res = res.html;
            let ogDOM = dom;
            dom.innerHTML = DOMPurify.sanitize(res);
            let epItemsDOM = dom.querySelectorAll('.ep-item');
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
        finally {
            removeDOM(dom);
        }
    },
    addSource: async function addSource(type, id, subtitlesArray, sourceURLs) {
        let shouldThrow = false;
        try {
            let sources = await MakeFetchZoro(`https://zoro.to/ajax/v2/episode/sources?id=${id}`, {});
            sources = JSON.parse(sources).link;
            let urlHost = (new URL(sources)).origin;
            let sourceIdArray = sources.split("/");
            let sourceId = sourceIdArray[sourceIdArray.length - 1];
            sourceId = sourceId.split("?")[0];
            let token = localStorage.getItem("rapidToken");
            let sourceJSON = JSON.parse((await MakeFetchZoro(`${urlHost}/ajax/embed-6/getSources?id=${sourceId}&token=${token}`, {})));
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
                        decryptKey = await extractKey(6, null, true);
                        sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                    }
                    catch (err) {
                        if (err.message == "Malformed UTF-8 data") {
                            decryptKey = await extractKey(6);
                            try {
                                sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                            }
                            catch (err) {
                            }
                        }
                    }
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
        const dom = document.createElement("div");
        try {
            episodeId = parseFloat(url.split("&ep=")[1]).toString();
            animeId = url.replace("?watch=", "").split("-");
            animeId = animeId[animeId.length - 1].split("&")[0];
            let a = await MakeFetchZoro(`https://zoro.to/ajax/v2/episode/servers?episodeId=${episodeId}`, {});
            let domIn = JSON.parse(a).html;
            dom.innerHTML = DOMPurify.sanitize(domIn);
            let promises = [];
            promises.push(this.getEpisodeListFromAnimeId(animeId, episodeId));
            let tempDom = dom.querySelectorAll('[data-server-id="4"]');
            let hasSource = false;
            for (var i = 0; i < tempDom.length; i++) {
                hasSource = true;
                promises.push(this.addSource(tempDom[i].getAttribute("data-type"), tempDom[i].getAttribute('data-id'), subtitles, sourceURLs));
            }
            tempDom = dom.querySelectorAll('[data-server-id="1"]');
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
            resp["episode"] = epNum.toString();
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
        finally {
            removeDOM(dom);
        }
    },
    discover: async function () {
        let temp = document.createElement("div");
        try {
            temp.innerHTML = DOMPurify.sanitize(await MakeFetchZoro(`https://zoro.to/top-airing`, {}));
            let data = [];
            for (let elem of temp.querySelectorAll(".flw-item")) {
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
        finally {
            removeDOM(temp);
        }
    },
    genToken: async function genToken() {
        await getWebviewHTML("https://rapid-cloud.co/", false, 15000, `let resultInApp={'status':200,'data':localStorage.setItem("v1.1_getSourcesCount", "40")};webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(resultInApp));`);
        await new Promise(r => setTimeout(r, 500));
        try {
            alert("Close the inAppBrowser when the video has started playing.");
            await getWebviewHTML("https://zoro.to/watch/eighty-six-2nd-season-17760?ep=84960", false, 120000, '');
        }
        catch (err) {
        }
        await new Promise(r => setTimeout(r, 500));
        try {
            const token = await getWebviewHTML("https://rapid-cloud.co/", false, 15000, `let resultInApp={'status':200,'data':localStorage.getItem("v1.1_token")};webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(resultInApp));`);
            localStorage.setItem("rapidToken", token.data.data);
            alert("Token extracted. You can now refresh the page.");
        }
        catch (err) {
            alert("Could not extract the token. Try again or Contact the developer.");
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
