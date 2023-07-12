var kaa: extension = {
    baseURL: "https://kickassanime.am",
    ajaxURL: "https://kickassanime.am/api/",
    type: "anime",
    supportsMalsync: true,
    disableAutoDownload: false,
    disabled: false,
    name: "Kickass",
    shortenedName: "KAA",
    keys: [
        CryptoJS.enc.Utf8.parse("37911490979715163134003223491201"),
        CryptoJS.enc.Utf8.parse("54674138327930866480207815084989"),
        CryptoJS.enc.Utf8.parse("3134003223491201")
    ],
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
    // getAnimeInfo: async function (url): Promise<extensionInfo> {
    //     const settled = "allSettled" in Promise;
    //     const id = (new URLSearchParams(`?watch=${url}`)).get("watch").replace("category/", "");
    //     let response: extensionInfo = {
    //         "name": "",
    //         "image": "",
    //         "description": "",
    //         "episodes": [],
    //         "mainName": ""
    //     };

    //     try {
    //         if (settled) {
    //             let anilistID: number;

    //             try {
    //                 anilistID = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/MALSync/MAL-Sync-Backup/master/data/pages/Gogoanime/${id}.json`)).aniId;
    //             } catch (err) {
    //                 // anilistID will be undefined
    //             }

    //             if (anilistID) {
    //                 const promises = [
    //                     this.getAnimeInfoInter(url),
    //                     MakeFetchTimeout(`https://api.enime.moe/mapping/anilist/${anilistID}`, {}, 2000)
    //                 ];

    //                 const promiseResponses = await Promise.allSettled(promises);
    //                 if (promiseResponses[0].status === "fulfilled") {

    //                     response = promiseResponses[0].value;

    //                     if (promiseResponses[1].status === "fulfilled") {
    //                         try {
    //                             const metaData = JSON.parse(promiseResponses[1].value).episodes;
    //                             const metaDataMap = {};
    //                             for (let i = 0; i < metaData.length; i++) {
    //                                 metaDataMap[metaData[i].number] = metaData[i];
    //                             }

    //                             for (let i = 0; i < response.episodes.length; i++) {
    //                                 const currentEp = metaDataMap[response.episodes[i].id];
    //                                 const currentResponseEp = response.episodes[i];

    //                                 currentResponseEp.description = currentEp?.description;
    //                                 currentResponseEp.thumbnail = currentEp?.image;
    //                                 currentResponseEp.date = new Date(currentEp?.airedAt);
    //                                 currentResponseEp.title += ` - ${currentEp?.title}`;
    //                             }
    //                         } catch (err) {
    //                             console.error(err);
    //                         }
    //                     }

    //                     return response;

    //                 } else {
    //                     throw promiseResponses[0].reason;
    //                 }
    //             } else {
    //                 return await this.getAnimeInfoInter(url);
    //             }

    //         } else {
    //             return await this.getAnimeInfoInter(url);
    //         }
    //     } catch (err) {
    //         console.error(err);
    //         throw err;
    //     }

    // },
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
            } catch (err) {
                episodeJSONs.dub = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episodes?lang=en-US`));
            }

            if (!episodeJSONs.dub) {
                try {
                    episodeJSONs.dub = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episodes?lang=en-US`));
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
            console.log(episodeJSON, episodeJSONs);

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
                        thumbnail: `${this.baseURL}/image/thumbnail/${el.thumbnail.sm ?? el.thumbnail.sm}.${el.thumbnail.formats.includes("webp") ? "webp" : el.thumbnail.formats[0]}`,
                        altTitle: `Episode ${epNum}`,
                    }
                );
            }

            console.log(epData);

            response.episodes = epData;
            return response;
        } catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    addSource: async function (server, sourceURLs: videoSource[], type: string) {
        try {
            const url = new URL(server.src);
            const shortName = server.shortName.toLowerCase();
            const order = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/enimax-anime/gogo/main/KAA.json`))[shortName];
            const playerHTML = await MakeFetch(url.toString());
            const isBirb = shortName === "bird";
            const cid = playerHTML.split("cid:")[1].split("'")[1].trim();
            const metaData = CryptoJS.enc.Hex.parse(cid).toString(CryptoJS.enc.Utf8);
            const sigArray = [];
            const signatureItems = {
                SIG: playerHTML.split("signature:")[1].split("'")[1].trim(),
                USERAGENT: navigator.userAgent,
                IP: metaData.split("|")[0],
                ROUTE: metaData.split("|")[1].replace("player.php", "source.php"),
                KEY: await MakeFetch(`https://raw.githubusercontent.com/enimax-anime/kaas/${shortName}/key.txt`),
                TIMESTAMP: Math.floor(Date.now() / 1000),
                MID: url.searchParams.get(isBirb ? "id" : "mid")
            };

            for (const item of order) {
                sigArray.push(signatureItems[item]);
            }

            console.log(sigArray);

            const sig = CryptoJS.SHA1(sigArray.join("")).toString(CryptoJS.enc.Hex);

            const result = JSON.parse(await MakeFetch(`${url.origin}${signatureItems.ROUTE}?${isBirb ? "id" : "mid"}=${signatureItems.MID}${isBirb ? "" : "&e=" + signatureItems.TIMESTAMP}&s=${sig}`, {
                headers: {
                    "referer": `${url.origin}${signatureItems.ROUTE.replace("source.php", "player.php")}?${isBirb ? "id" : "mid"}=${signatureItems.MID}`
                }
            })).data;

            console.log(result);

            const finalResult = JSON.parse(CryptoJS.AES.decrypt(result.split(":")[0], CryptoJS.enc.Utf8.parse(signatureItems.KEY), {
                mode: CryptoJS.mode.CBC,
                iv: CryptoJS.enc.Hex.parse(result.split(":")[1]),
                keySize: 256
            }).toString(CryptoJS.enc.Utf8));

            console.log(finalResult);

            if (finalResult.hls) {
                sourceURLs.push({
                    type: "hls",
                    name: `${server.name}#${type}`,
                    url: finalResult.hls.startsWith("//") ? `https:${finalResult.hls}` : finalResult.hls,
                    skipIntro: {
                        start: finalResult.skip?.intro?.start,
                        end: finalResult.skip?.intro?.end
                    }
                });
            }

            if (finalResult.dash) {
                sourceURLs.push({
                    type: "dash",
                    name: `${server.name}-DASH#${type}`,
                    url: finalResult.dash.startsWith("//") ? `https:${finalResult.dash}` : finalResult.dash,
                    skipIntro: {
                        start: finalResult.skip?.intro?.start,
                        end: finalResult.skip?.intro?.end
                    }
                });
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
            };

            const epNum = params.get("ep");
            const epList: extensionInfo = await this.getAnimeInfo(id);
            const links = JSON.parse(epList.episodes.find((ep) => ep.number === parseFloat(epNum)).sourceID);
            const promises = [];

            for (const type in links) {
                // https://kickassanime.am/api/show/odd-taxi-8b25/episode/ep-2-a601c5
                const slug = links[type];
                const videoJSON = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episode/${slug}`));
                const servers = videoJSON.servers.filter((server) => server.shortName === "Duck" || server.shortName === "Bird");

                for (const server of servers) {
                    promises.push(this.addSource(server, sourceURLs, type));
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
    generateEncryptedAjaxParams: function (scriptValue: string, id: string, keys: Array<string>) {
        const encryptedKey = CryptoJS.AES.encrypt(id, keys[0], {
            iv: keys[2] as any,
        });

        const decryptedToken = CryptoJS.AES.decrypt(scriptValue, keys[0], {
            iv: keys[2] as any,
        }).toString(CryptoJS.enc.Utf8);

        return `id=${encryptedKey}&alias=${id}&${decryptedToken}`;
    },
    decryptAjaxData: function (encryptedData: string, keys: Array<string>) {
        const decryptedData = CryptoJS.enc.Utf8.stringify(
            CryptoJS.AES.decrypt(encryptedData, keys[1], {
                iv: keys[2] as any,
            })
        );
        return JSON.parse(decryptedData);
    },
    getMetaData: async function (search: URLSearchParams) {
        const id = search.get("watch").replace("/category/", "");
        return await getAnilistInfo("Gogoanime", id);
    },
    rawURLtoInfo: function (url: URL) {
        // https://gogoanime.bid/category/kimetsu-no-yaiba-movie-mugen-ressha-hen-dub
        return `?watch=${url.pathname}&engine=7`;
    }
};