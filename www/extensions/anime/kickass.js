var kaa = {
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
            }
            catch (err) {
                episodeJSONs.dub = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episodes?lang=en-US`));
            }
            if (!episodeJSONs.dub) {
                try {
                    episodeJSONs.dub = JSON.parse(await MakeFetchZoro(`${this.baseURL}/api/show/${id}/episodes?lang=en-US`));
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
            console.log(episodeJSON, episodeJSONs);
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
            console.log(epData);
            response.episodes = epData;
            return response;
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    addSource: async function (server, sourceURLs, type) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
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
                        start: (_b = (_a = finalResult.skip) === null || _a === void 0 ? void 0 : _a.intro) === null || _b === void 0 ? void 0 : _b.start,
                        end: (_d = (_c = finalResult.skip) === null || _c === void 0 ? void 0 : _c.intro) === null || _d === void 0 ? void 0 : _d.end
                    }
                });
            }
            if (finalResult.dash) {
                sourceURLs.push({
                    type: "dash",
                    name: `${server.name}-DASH#${type}`,
                    url: finalResult.dash.startsWith("//") ? `https:${finalResult.dash}` : finalResult.dash,
                    skipIntro: {
                        start: (_f = (_e = finalResult.skip) === null || _e === void 0 ? void 0 : _e.intro) === null || _f === void 0 ? void 0 : _f.start,
                        end: (_h = (_g = finalResult.skip) === null || _g === void 0 ? void 0 : _g.intro) === null || _h === void 0 ? void 0 : _h.end
                    }
                });
            }
        }
        catch (err) {
            console.warn(err);
        }
    },
    getLinkFromUrl: async function (url) {
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
            };
            const epNum = params.get("ep");
            const epList = await this.getAnimeInfo(id);
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
