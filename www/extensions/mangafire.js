var mangaFire = {
    baseURL: "https://mangafire.to",
    searchApi: async function (query) {
        var _a, _b;
        const searchDOM = document.createElement("div");
        try {
            const searchHTML = await MakeFetchZoro(`${this.baseURL}/filter?keyword=${encodeURIComponent(query)}`);
            const results = {
                status: 200,
                data: []
            };
            searchDOM.innerHTML = DOMPurify.sanitize(searchHTML);
            for (const mangaCard of searchDOM.querySelectorAll(".item")) {
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
        finally {
            removeDOM(searchDOM);
        }
    },
    getAnimeInfo: async function (url) {
        var _a, _b, _c, _d, _e;
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch");
        const infoDOM = document.createElement("div");
        let response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": "",
            "isManga": true,
        };
        try {
            const infoHTML = await MakeFetch(`${this.baseURL}/${id.replace("mangafire-", "manga/")}`);
            infoDOM.innerHTML = DOMPurify.sanitize(infoHTML);
            response.name = ((_a = infoDOM === null || infoDOM === void 0 ? void 0 : infoDOM.querySelector(".info")) === null || _a === void 0 ? void 0 : _a.querySelector(".name")).innerText;
            response.image = (_c = (_b = infoDOM.querySelector(".poster")) === null || _b === void 0 ? void 0 : _b.querySelector("img")) === null || _c === void 0 ? void 0 : _c.getAttribute("src");
            response.description = (_d = infoDOM.querySelector(".summary")) === null || _d === void 0 ? void 0 : _d.innerText;
            response.mainName = id;
            const episodeListDOM = (_e = infoDOM.querySelector(".chapter-list[data-name=\"EN\"]")) === null || _e === void 0 ? void 0 : _e.querySelectorAll("li.item");
            for (let i = episodeListDOM.length - 1; i >= 0; i--) {
                const episodeLI = episodeListDOM[i];
                const linkSplit = episodeLI.querySelector("a").getAttribute("href").split("/read/");
                linkSplit.shift();
                response.episodes.push({
                    title: episodeLI.querySelector("a").querySelector("span").innerText,
                    link: `?watch=/read/${linkSplit.join("/read/")}&chap=${episodeLI.getAttribute("data-number")}&engine=9`,
                });
            }
            return response;
        }
        catch (err) {
            throw err;
        }
        finally {
            removeDOM(infoDOM);
        }
    },
    descramble: async function (imageURL, key) {
        const s = key;
        const image = await loadImage(imageURL);
        try {
            const canvas = new OffscreenCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            var x = Math.min(200, Math.ceil(image.height / 5));
            var C = Math.ceil(image.height / x);
            var W = C - 1;
            var a = Math.min(200, Math.ceil(image.width / 5));
            var v = Math.ceil(image.width / a);
            var l = v - 1;
            for (var q = 0; q <= W; q++) {
                for (var R = 0; R <= l; R++) {
                    let h = R, k = q;
                    R < l && (h = (l - R + s) % l),
                        q < W && (k = (W - q + s) % (W)),
                        ctx.drawImage(image, h * a, k * x, Math.min(a, image.width - R * a), Math.min(x, image.height - q * x), R * a, q * x, Math.min(a, image.width - R * a), Math.min(x, image.height - q * x));
                }
            }
            return window.URL.createObjectURL(await canvas.convertToBlob());
        }
        catch (err) {
            throw err;
        }
        finally {
        }
    },
    getLinkFromUrl: async function (url) {
        var _a;
        const chapterId = (new URLSearchParams("?watch=" + url)).get("watch");
        const chapterSplit = chapterId.split(".");
        const identifier = chapterSplit.pop().split("/")[0];
        const name = fix_title(chapterSplit.join(".").replace("/read/", ""));
        const chapterListDOM = document.createElement("div");
        try {
            const chapterListHTML = JSON.parse(await MakeFetch(`${this.baseURL}/ajax/read/${identifier}/list?viewby=chapter`)).result.html;
            const response = {
                pages: [],
                next: null,
                prev: null,
                name: name,
                chapter: 0,
                title: "",
                type: "manga"
            };
            chapterListDOM.innerHTML = DOMPurify.sanitize(chapterListHTML);
            const chapterList = (_a = chapterListDOM.querySelector(".numberlist[data-lang=\"en\"]")) === null || _a === void 0 ? void 0 : _a.querySelectorAll("a");
            let currentIndex = -1;
            let chapterMainID = "";
            for (let i = 0; i < chapterList.length; i++) {
                const anchorTag = chapterList[i];
                const linkSplit = anchorTag.getAttribute("href").split("/read/");
                linkSplit.shift();
                if (chapterId === "/read/" + linkSplit.join("/read/")) {
                    currentIndex = i;
                    response.chapter = parseFloat(anchorTag.getAttribute("data-number"));
                    chapterMainID = anchorTag.getAttribute("data-id");
                }
            }
            if (chapterList[currentIndex + 1]) {
                const nextChap = chapterList[currentIndex + 1];
                const linkSplit = nextChap.getAttribute("href").split("/read/");
                linkSplit.shift();
                response.prev = `?watch=${"/read/" + linkSplit.join("/read/")}&chap=${nextChap.getAttribute("data-number")}&engine=9`;
            }
            if (chapterList[currentIndex - 1]) {
                const prevChap = chapterList[currentIndex - 1];
                const linkSplit = prevChap.getAttribute("href").split("/read/");
                linkSplit.shift();
                response.next = `?watch=${"/read/" + linkSplit.join("/read/")}&chap=${prevChap.getAttribute("data-number")}&engine=9`;
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
        finally {
            removeDOM(chapterListDOM);
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
