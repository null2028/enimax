var mangaDex = {
    baseURL: "https://api.mangadex.org",
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
                prev: null,
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
                    response.chapter = chapter.number;
                    currentIndex = i;
                    break;
                }
            }
            if (allChapters[currentIndex - 1]) {
                const prevChap = allChapters[currentIndex - 1];
                response.prev = `?watch=${prevChap.id}&chap=${prevChap.number}&engine=8`;
            }
            if (allChapters[currentIndex + 1]) {
                const nextChap = allChapters[currentIndex + 1];
                response.next = `?watch=${nextChap.id}&chap=${nextChap.number}&engine=8`;
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
