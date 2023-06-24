var anna = {
    baseURL: "https://annas-archive.org",
    type: "manga",
    disabled: false,
    disableAutoDownload: true,
    name: "Anna's Archive",
    shortenedName: "Anna",
    searchApi: async function (query) {
        var _a, _b, _c;
        const searchDOM = document.createElement("div");
        try {
            const searchHTML = await MakeFetch(`${this.baseURL}/search?q=${query}`);
            searchDOM.innerHTML = DOMPurify.sanitize(searchHTML, {
                ADD_TAGS: ["#comment"]
            });
            const itemsDOM = searchDOM.querySelectorAll(".h-\\[125\\]");
            const data = [];
            for (let i = 0; i < itemsDOM.length; i++) {
                const con = itemsDOM[i];
                if (con.classList.contains("js-scroll-hidden")) {
                    con.innerHTML = con.innerHTML.replace('<' + '!--', '').replace('-' + '->', '');
                }
                data.push({
                    "name": (_a = con.querySelector(".font-bold")) === null || _a === void 0 ? void 0 : _a.innerText,
                    "image": (_b = con.querySelector("img")) === null || _b === void 0 ? void 0 : _b.getAttribute("src"),
                    "link": ((_c = con.querySelector("a")) === null || _c === void 0 ? void 0 : _c.getAttribute("href")) + "&engine=12"
                });
            }
            return ({ data, "status": 200 });
        }
        catch (err) {
            throw err;
        }
        finally {
            // removeDOM(searchDOM);
        }
    },
    getAnimeInfo: async function (url) {
        var _a, _b, _c, _d, _e, _f, _g;
        const infoDOM = document.createElement("div");
        try {
            const response = {
                "name": "",
                "image": "",
                "description": "",
                "episodes": [],
                "mainName": "",
                "isManga": true,
            };
            const searchParam = new URLSearchParams(`?watch=${url}`);
            const identifier = searchParam.get("watch");
            const infoHTML = await MakeFetch(`${this.baseURL}/${identifier}`);
            infoDOM.innerHTML = DOMPurify.sanitize(infoHTML);
            response.mainName = identifier.replace("md5/", "anna-");
            response.image = (_b = (_a = infoDOM.querySelector("main")) === null || _a === void 0 ? void 0 : _a.querySelector("img")) === null || _b === void 0 ? void 0 : _b.getAttribute("src");
            response.name = (_d = (_c = infoDOM.querySelector("main")) === null || _c === void 0 ? void 0 : _c.querySelector(".font-bold")) === null || _d === void 0 ? void 0 : _d.innerText;
            response.description = (_e = infoDOM.querySelector(".js-md5-top-box-description")) === null || _e === void 0 ? void 0 : _e.innerText;
            response.mainName = `${response.mainName}-${(_f = window.btoa(response.name.replace(/[^\x00-\x7F]/g, ""))) === null || _f === void 0 ? void 0 : _f.trim()}`;
            response.episodes = [
                {
                    link: `?watch=${identifier}&engine=12`,
                    title: (_g = infoDOM.querySelector(".text-sm")) === null || _g === void 0 ? void 0 : _g.innerText
                }
            ];
            return response;
        }
        catch (err) {
            throw err;
        }
        finally {
            removeDOM(infoDOM);
        }
    },
    getLinkFromUrl: async function (url) {
        var _a, _b, _c, _d;
        const linkDOM = document.createElement("div");
        try {
            const response = {
                sources: [],
                pages: [],
                nextTitle: "",
                prevTitle: "",
                name: "",
                chapter: 1,
                next: null,
                prev: null,
                type: "manga",
                readerType: "epub"
            };
            const searchParam = new URLSearchParams(`?watch=${url}`);
            const identifier = searchParam.get("watch");
            const linkHTML = await MakeFetch(`${this.baseURL}/${identifier}`);
            linkDOM.innerHTML = DOMPurify.sanitize(linkHTML);
            response.name = (_b = (_a = linkDOM.querySelector("main")) === null || _a === void 0 ? void 0 : _a.querySelector(".font-bold")) === null || _b === void 0 ? void 0 : _b.innerText;
            response.sources = [];
            let sourceCount = 0;
            const downloadLinks = linkDOM.querySelectorAll(".js-download-link");
            for (const elem of downloadLinks) {
                if ((_c = elem.getAttribute("href")) === null || _c === void 0 ? void 0 : _c.endsWith(".epub")) {
                    response.sources.push({
                        name: `Epub${++sourceCount}`,
                        url: elem.getAttribute("href"),
                        type: "epub"
                    });
                }
                else if ((_d = elem.getAttribute("href")) === null || _d === void 0 ? void 0 : _d.endsWith(".pdf")) {
                    response.sources.push({
                        name: `PDF${++sourceCount}`,
                        url: elem.getAttribute("href"),
                        type: "pdf"
                    });
                }
            }
            console.log(response);
            return response;
        }
        catch (err) {
            throw err;
        }
        finally {
            removeDOM(linkDOM);
        }
    },
    fixTitle(title) {
        const tempTitle = title.split("-");
        tempTitle.shift();
        tempTitle.shift();
        try {
            title = window.atob(tempTitle.join("-"));
        }
        catch (err) {
            console.warn(err);
        }
        finally {
            return title;
        }
    }
};
