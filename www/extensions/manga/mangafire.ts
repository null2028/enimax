var mangaFire: extension = {
    baseURL: "https://mangafire.to",
    type: "manga",
    supportsMalsync: true,
    disableAutoDownload: false,
    disabled: false,
    name: "MangaFire",
    shortenedName: "MFire",
    searchApi: async function (query: string): Promise<extensionSearch> {
        const searchDOM = new DOMHandler();

        try {
            const searchHTML = await MakeFetchZoro(
                `${this.baseURL}/filter?keyword=${encodeURIComponent(query)}`
            );
            const results: extensionSearch = {
                status: 200,
                data: []
            };

            searchDOM.innerHTML = DOMPurify.sanitize(searchHTML);

            for (const mangaCard of searchDOM.document.querySelectorAll(".item")) {

                const nameDOM = mangaCard.querySelector(".name")?.querySelector("a");
                results.data.push({
                    link: nameDOM?.getAttribute("href").replace("manga/", "mangafire-") + "&engine=9",
                    name: nameDOM?.getAttribute("title"),
                    image: mangaCard?.querySelector("img")?.getAttribute("src")
                });
            }

            return results;
        } catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url): Promise<extensionInfo> {
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch");
        const infoDOM = new DOMHandler();
        const rawURL = `${this.baseURL}/${id.replace("mangafire-", "manga/")}`;
        let response: extensionInfo = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [] as extensionInfoEpisode[],
            "mainName": "",
            "isManga": true,
        };

        try {
            const infoHTML = await MakeFetch(rawURL);
            infoDOM.innerHTML = DOMPurify.sanitize(infoHTML);

            response.name = (infoDOM?.document.querySelector(".info")?.querySelector(".name") as HTMLElement).innerText;
            response.image = infoDOM.document.querySelector(".poster")?.querySelector("img")?.getAttribute("src");
            response.description = (infoDOM.document.querySelector(".summary") as HTMLElement)?.innerText;
            response.mainName = id;

            const episodeListDOM = infoDOM.document.querySelector(".chapter-list[data-name=\"EN\"]")?.querySelectorAll("li.item");

            for (let i = episodeListDOM.length - 1; i >= 0; i--) {
                const episodeLI = episodeListDOM[i];
                const linkSplit = episodeLI.querySelector("a").getAttribute("href").split("/read/");
                linkSplit.shift();

                response.episodes.push({
                    title: episodeLI.querySelector("a").querySelector("span").innerText,
                    number: parseFloat(episodeLI.getAttribute("data-number")),
                    link: `?watch=/read/${linkSplit.join("/read/")}&chap=${episodeLI.getAttribute("data-number")}&engine=9`,
                })
            }

            return response;
        } catch (err) {
            err.url = rawURL;
            throw err;
        }
    },

    descramble: function (imageURL: string, key: number) {
        return new Promise(async function (resolve, reject) {
            // const image = await loadImage(imageURL);
            const worker = new Worker("./extensions/utils/mangafireDecrambler.js");
            // const bitmap = await createImageBitmap(image);

            const timeout = setTimeout(function () {
                try {
                    worker.terminate();
                    reject(new Error("Timeout"));
                } catch (err) {
                    console.error(err);
                }
            }, 20000);

            try {
                worker.onmessage = (message) => {
                    const data = message.data;
                    if (data instanceof Blob) {
                        clearTimeout(timeout);
                        resolve(window.URL.createObjectURL(data));
                    } else {
                        clearTimeout(timeout);
                        reject(new Error("Unexpected message"));
                    }

                    worker.terminate();
                };

                worker.onerror = (err) => {
                    clearTimeout(timeout);
                    reject(err);
                };

                worker.postMessage([key, imageURL]);

            } catch (err) {
                console.error(err);
                clearTimeout(timeout);
                reject(err);
            }
        });
    },
    getLinkFromUrl: async function (url: string): Promise<extensionMangaSource> {

        const chapterId = (new URLSearchParams("?watch=" + url)).get("watch");
        const chapterSplit = chapterId.split(".");
        const identifier = chapterSplit[1].split("/")[0];
        const name = fix_title(chapterSplit[0].replace("/read/", ""));
        const chapterListDOM = new DOMHandler();

        try {
            const chapterListHTML = JSON.parse(await MakeFetch(`${this.baseURL}/ajax/read/${identifier}/list?viewby=chapter`)).result.html;
            const response: extensionMangaSource = {
                pages: [],
                next: null,
                nextTitle: null,
                prev: null,
                prevTitle: null,
                name: name,
                chapter: 0,
                title: "",
                type: "manga"
            };

            chapterListDOM.innerHTML = DOMPurify.sanitize(chapterListHTML);

            const chapterList = chapterListDOM.document.querySelector(".numberlist[data-lang=\"en\"]")?.querySelectorAll("a");
            let currentIndex = -1;
            let chapterMainID = "";

            for (let i = 0; i < chapterList.length; i++) {
                const anchorTag = chapterList[i];
                const linkSplit = anchorTag.getAttribute("href").split("/read/");
                linkSplit.shift();

                if (chapterId === "/read/" + linkSplit.join("/read/")) {
                    currentIndex = i;
                    response.chapter = parseFloat(anchorTag.getAttribute("data-number"));
                    if (response.chapter === 0) {
                        response.chapter = 0.1;
                    }
                    chapterMainID = anchorTag.getAttribute("data-id");
                    response.title = anchorTag.innerText.replace(`Chapter ${anchorTag.getAttribute("data-number")}:`, "");
                }
            }

            if (chapterList[currentIndex + 1]) {
                const nextChap = chapterList[currentIndex + 1];
                const linkSplit = nextChap.getAttribute("href").split("/read/");
                linkSplit.shift();
                response.prev = `?watch=${"/read/" + linkSplit.join("/read/")}&chap=${nextChap.getAttribute("data-number")}&engine=9`;
                response.prevTitle = nextChap.innerText;

            }


            if (chapterList[currentIndex - 1]) {
                const prevChap = chapterList[currentIndex - 1];
                const linkSplit = prevChap.getAttribute("href").split("/read/");
                linkSplit.shift();
                response.next = `?watch=${"/read/" + linkSplit.join("/read/")}&chap=${prevChap.getAttribute("data-number")}&engine=9`;
                response.nextTitle = prevChap.innerText;
            }

            for (const page of JSON.parse(await MakeFetch(`https://mangafire.to/ajax/read/chapter/${chapterMainID}`)).result.images) {
                response.pages.push({
                    img: page[0],
                    needsDescrambling: page[2] !== 0,
                    key: page[2],
                });
            }

            return response;
        } catch (err) {
            throw new Error((err as Error).message);
        }
    },
    fixTitle(title: string) {
        try {
            const titleTemp = title.replace("mangafire-", "").split(".");
            titleTemp.pop();

            title = titleTemp.join(".");
        } catch (err) {
            console.error(err);
        } finally {
            return title;
        }
    },
    getMetaData: async function (search: URLSearchParams) {
        const id = search.get("watch").replace("mangafire-", "");
        return await getAnilistInfo("MangaFire", id, "MANGA");
    },
    rawURLtoInfo: function (url: URL) {
        // https://mangafire.to/manga/dr-stone.qkm13/

        let path = url.pathname.replace("manga/", "mangafire-");
        if (path[path.length - 1] === "/") {
            path = path.substring(0, path.length - 1);
        }
        return `?watch=${path}&engine=9`;
    }
};