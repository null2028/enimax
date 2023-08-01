var kaa: extension = {
    baseURL: "https://kickassanime.am",
    type: "anime",
    supportsMalsync: false,
    disableAutoDownload: false,
    disabled: false,
    name: "Kickass",
    shortenedName: "KAA",
    getImageURL: function (posterData) {
        try {
            return `${this.baseURL}/image/poster/${posterData.hq ?? posterData.sm}.${posterData.formats.includes("webp") ? "webp" : posterData.formats[0]}`;
        } catch (err) {
            return "";
        }
    },
    searchApi: async function (query: string): Promise<extensionSearch> {
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

            const searchData: extensionSearchData[] = [];

            for (const searchItem of searchJSON) {
                searchData.push({
                    name: searchItem.title_en ?? searchItem.title,
                    image: self.getImageURL(searchItem.poster),
                    link: `/${searchItem.slug}&engine=13`
                })
            }

            return ({ data: searchData, "status": 200 });
        } catch (err) {
            throw err;
        }
    },

    loadAllEps: async function (episodeJSONs, key: string, url: string) {
        try {
            const promises = [];

            for (let i = 0; i < episodeJSONs[key].pages.length; i++) {
                if(i == 0){
                    continue;
                }

                promises.push(MakeFetchZoro(`${url}&page=${episodeJSONs[key].pages[i].number}`));
            }

            const results = await Promise.all(promises);

            for (const result of results) {
                try {
                    const resultJSON = JSON.parse(result);
                    episodeJSONs[key].result.push(...resultJSON.result);
                } catch (err) {
                    console.warn(err);
                }
            }
        } catch (err) {
            console.warn(err);
        }
    },
    getAnimeInfo: async function (url: string): Promise<extensionInfo> {
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch");
        const rawURL = `${this.baseURL}/${id}`;
        const self = this;

        try {
            const response: extensionInfo = {
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
            response.name = infoJSON.title_en ?? infoJSON.title;
            response.description = infoJSON.synopsis;

            // https://kickassanime.am/api/show/odd-taxi-8b25/episodes?ep=1&lang=ja-JP
            const episodeJSONs = { "dub": undefined, "sub": undefined };

            try {
                episodeJSONs.sub = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episodes?lang=ja-JP`));
                await this.loadAllEps(episodeJSONs, "sub", `${this.baseURL}/api/show/${id}/episodes?lang=ja-JP`);
            } catch (err) {
                episodeJSONs.dub = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episodes?lang=en-US`));
                await this.loadAllEps(episodeJSONs, "dub", `${this.baseURL}/api/show/${id}/episodes?lang=en-US`);
            }

            if (!episodeJSONs.dub) {
                try {
                    episodeJSONs.dub = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episodes?lang=en-US`));
                    await this.loadAllEps(episodeJSONs, "dub", `${this.baseURL}/api/show/${id}/episodes?lang=en-US`);
                } catch (err) {

                }
            }

            if (episodeJSONs.sub?.pages?.length === 0) {
                episodeJSONs.sub = undefined;
            }

            if (episodeJSONs.dub?.pages?.length === 0) {
                episodeJSONs.dub = undefined;
            }

            const episodeJSON = episodeJSONs.sub ?? episodeJSONs.dub;
            const dubData = {};

            if (episodeJSONs.sub && episodeJSONs.dub) {
                for (let i = 0; i < episodeJSONs.dub?.result?.length; i++) {
                    const el = episodeJSONs.dub.result[i];
                    let epNum = el.episode_number;

                    if (epNum == 0) {
                        epNum = 0.1;
                    }

                    dubData[epNum] = el;
                }
            }



            const epData: extensionInfoEpisode[] = [];

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

                epData.push(
                    {
                        title: `Episode ${epNum} - ${el.title}`,
                        link: `?watch=${id}&ep=${epNum}&engine=13`,
                        id: el.slug,
                        number: parseFloat(epNum),
                        sourceID: JSON.stringify(sourceID),
                        thumbnail: `${this.baseURL}/image/thumbnail/${el?.thumbnail?.sm ?? el?.thumbnail?.sm}.${el?.thumbnail?.formats?.includes("webp") ? "webp" : el?.thumbnail?.formats[0]}`,
                        altTitle: `Episode ${epNum}`,
                    }
                );
            }

            response.episodes = epData;
            return response;
        } catch (err) {
            console.error(err);
            err.url = rawURL;
            throw err;
        }
    },
    addSource: async function (server, sourceURLs: videoSource[], type: string, response: extensionVidSource) {
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

            try{
                const res = await fetch(`https://raw.githubusercontent.com/enimax-anime/kaas/${shortName}/key.txt`);
                if(res.status === 404){
                    throw new Error("Not found");
                }else{
                    key = await res.text(); 
                }
            }catch(err){
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
                        start: finalResult.skip?.intro?.start,
                        end: finalResult.skip?.intro?.end
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
                        start: finalResult.skip?.intro?.start,
                        end: finalResult.skip?.intro?.end
                    }
                });
            }

            

            if(finalResult.subtitles){
                const url = dashURL === "" ? hlsURL : dashURL;

                finalResult.subtitles.map((sub) => {
                    response.subtitles.push({
                        label: `${sub.name} - ${shortName}`,
                        file: sub.src.startsWith("//") ? `https:${sub.src}` : new URL(sub.src, url).href
                    })
                })
            }

        } catch (err) {
            console.warn(err);
        }
    },
    getLinkFromUrl: async function (url: string): Promise<extensionVidSource> {

        try {
            const params = new URLSearchParams("?watch=" + url);
            const id = params.get("watch");
            const sourceURLs: Array<videoSource> = [];
            const resp: extensionVidSource = {
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
            const epList: extensionInfo = await this.getAnimeInfo(id);
            const currentEp = epList.episodes.find((ep) => ep.number === parseFloat(epNum));
            const currentIndex = epList.episodes.indexOf(currentEp);
            const links = JSON.parse(currentEp.sourceID);
            const promises = [];

            resp.next = epList.episodes[currentIndex + 1]?.link.replace("?watch=", "") ?? null;
            resp.prev = epList.episodes[currentIndex - 1]?.link.replace("?watch=", "") ?? null;

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
        } catch (err) {
            throw err;
        }

    },
    config: {
        "Origin": "https://vidnethub.net",
    },
    getConfig: function (url: string) {
        return this.config;
    },
    subConfig: {
        "Origin": "https://vidnethub.net",
    },
    getSubConfig: function (url: string, name: string) {
        if(name.includes("- vid")){
            return this.subConfig;
        }

        return null;
    },
    fixTitle(title: string) {
        try {
            const titleTemp = title.split("-");
            titleTemp.pop();
            title = titleTemp.join("-");
        } catch (err) {
            console.error(err);
        } finally {
            return title;
        }
    },
};