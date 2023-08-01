var animepahe = {
    baseURL: "https://animepahe.ru",
    type: "anime",
    supportsMalsync: true,
    disableAutoDownload: false,
    disabled: false,
    name: "animepahe",
    shortenedName: "Pahe",
    searchApi: async function (query) {
        try {
            let searchJSON = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api?m=search&q=${encodeURIComponent(query)}`, {}));
            return {
                data: searchJSON.data.map((item) => ({
                    link: `/animepahe-${item.id}&engine=14`,
                    name: item.title,
                    image: item.poster,
                })),
                status: 200
            };
        }
        catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url, aniID) {
        const settled = "allSettled" in Promise;
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch").split("-")[1];
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
                        anilistID = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/bal-mackup/mal-backup/master/page/animepahe/${id}.json`)).aniId;
                    }
                    catch (err) {
                        try {
                            anilistID = JSON.parse(await MakeFetch(`https://api.malsync.moe/page/animepahe/${id}`)).aniId;
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
        var _a, _b, _c, _d, _e, _f;
        url = url.split("&engine")[0].split("-")[1];
        const rawURL = `${this.baseURL}/a/${url}`;
        const animeDOM = new DOMHandler();
        try {
            const response = {
                "name": "",
                "image": "",
                "description": "",
                "episodes": [],
                "mainName": ""
            };
            const animeHTMLRequest = await fetch(rawURL);
            const sessionID = (new URL(animeHTMLRequest.url)).pathname.replace("/anime/", "");
            const animeHTML = await animeHTMLRequest.text();
            animeDOM.innerHTML = DOMPurify.sanitize(animeHTML);
            response.name = (_a = animeDOM.document.querySelector("div.title-wrapper span")) === null || _a === void 0 ? void 0 : _a.innerText;
            response.mainName = `animepahe-${url}-${(_c = (_b = response.name) === null || _b === void 0 ? void 0 : _b.replace(/\ /g, "-")) === null || _c === void 0 ? void 0 : _c.replace(/[^a-z0-9\-]+/gi, "")}`;
            response.image = (_d = animeDOM.document.querySelector("div.anime-poster a")) === null || _d === void 0 ? void 0 : _d.getAttribute("href");
            response.description = (_f = (_e = animeDOM.document.querySelector("div.anime-summary")) === null || _e === void 0 ? void 0 : _e.innerText) === null || _f === void 0 ? void 0 : _f.trim();
            const batchSize = 5;
            let epResponse = [];
            let promises = [];
            const firstPage = JSON.parse(await MakeFetch(`${this.baseURL}/api?m=release&id=${sessionID}&sort=episode_asc&page=${1}`));
            const totalPages = firstPage.last_page;
            epResponse.push(firstPage.data);
            firstPage;
            for (let i = 2; i <= totalPages; i++) {
                promises.push(MakeFetch(`${this.baseURL}/api?m=release&id=${sessionID}&sort=episode_asc&page=${i}`));
                if (promises.length >= batchSize || i == totalPages) {
                    const response = await Promise.all(promises);
                    epResponse.push(...response.map((elem) => (JSON.parse(elem).data)));
                    promises = [];
                }
            }
            epResponse = epResponse.flat();
            const epData = epResponse.map((elem) => {
                var _a;
                return {
                    date: new Date(elem.created_at),
                    isFiller: elem.filler === 1,
                    id: (_a = elem.episode) === null || _a === void 0 ? void 0 : _a.toString(),
                    title: `Episode ${elem.episode}`,
                    link: `?watch=animepahe-${url}&ep=${elem.id === 0 ? 0.1 : elem.id}&engine=14`,
                    sourceID: JSON.stringify({
                        epID: elem.session,
                        animeID: sessionID
                    }),
                    number: elem.id
                };
            });
            response.episodes = epData;
            return response;
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    addSource: async function (response, url, type, resolution, watchURL) {
        try {
            const fetchFunc = config.chrome ? MakeCusReqFmovies : MakeCusReq;
            const html = await fetchFunc(url, {
                headers: {
                    "Referer": watchURL
                }
            });
            const unpackedJS = unpack("eval(function(" + html.substringAfterLast("eval(function(").substringBefore("}))") + "}))");
            let sourceURL = unpackedJS.split("'")[1];
            if (sourceURL[sourceURL.length - 1] === "/" || sourceURL[sourceURL.length - 1] === "\\") {
                sourceURL = sourceURL.substring(0, sourceURL.length - 1);
            }
            response.sources.push({
                name: `${type} - ${resolution}`,
                url: sourceURL,
                type: "hls"
            });
        }
        catch (err) {
            console.log(err);
        }
    },
    getLinkFromUrl: async function (url) {
        var _a, _b, _c, _d;
        const watchDOM = new DOMHandler();
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
            // https://animepahe.ru/play/e0d43e1f-8e95-0674-3e1d-5bffdaff763a/303df9da6dbac5d0c8be1f0e9dbaf89ceae91f5e6951be087c7a88c0bb2cd060
            const epNum = params.get("ep");
            const animeID = params.get("watch").split("-")[1];
            const epList = await this.getAnimeInfo(`animepahe-${animeID}`);
            const currentEp = epList.episodes.find((ep) => ep.number === parseInt(epNum));
            const currentIndex = epList.episodes.indexOf(currentEp);
            const sourceID = JSON.parse(currentEp.sourceID);
            const watchURL = `${this.baseURL}/play/${sourceID.animeID}/${sourceID.epID}`;
            const watchHTML = await MakeFetchZoro(watchURL);
            watchDOM.innerHTML = DOMPurify.sanitize(watchHTML);
            resp.next = (_b = (_a = epList.episodes[currentIndex + 1]) === null || _a === void 0 ? void 0 : _a.link.replace("?watch=", "")) !== null && _b !== void 0 ? _b : null;
            resp.prev = (_d = (_c = epList.episodes[currentIndex - 1]) === null || _c === void 0 ? void 0 : _c.link.replace("?watch=", "")) !== null && _d !== void 0 ? _d : null;
            const buttons = watchDOM.document.querySelector("#resolutionMenu").querySelectorAll("button");
            for (let i = 0; i < buttons.length; i++) {
                const currentButton = buttons[i];
                await this.addSource(resp, currentButton.getAttribute("data-src"), currentButton.getAttribute("data-audio"), currentButton.getAttribute("data-resolution"), watchURL);
            }
            resp.name = params.get("watch");
            resp.nameWSeason = params.get("watch");
            resp.episode = currentEp.id;
            return resp;
        }
        catch (err) {
            throw err;
        }
    },
    fixTitle(title) {
        try {
            const titleTemp = title.split("-");
            titleTemp.shift();
            titleTemp.shift();
            title = titleTemp.join("-");
        }
        catch (err) {
            console.error(err);
        }
        finally {
            return title;
        }
    },
    getMetaData: async function (search) {
        const id = search.get("watch").split("-")[1];
        return await getAnilistInfo("animepahe", id);
    },
    rawURLtoInfo: function (url) {
        // https://gogoanime.bid/category/kimetsu-no-yaiba-movie-mugen-ressha-hen-dub
        return `?watch=/animepahe-${url.pathname.replace("/a/", "")}&engine=14`;
    },
    config: {
        "referer": "https://animepahe.ru/",
    },
    getConfig: function (url) {
        if (url.includes("nextcdn")) {
            return {
                "referer": "https://kwik.cx/e/01EKd7CWZ3Te"
            };
        }
        else {
            return this.config;
        }
    },
};
