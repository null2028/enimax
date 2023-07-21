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
