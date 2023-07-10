
var anna: extension = {
    baseURL: "https://annas-archive.org",
    type: "manga",
    disabled: false,
    disableAutoDownload: true,
    name: "Anna's Archive",
    shortenedName: "Anna",
    searchApi: async function (query) {
        const searchDOM = new DOMHandler();

        try {
            const searchHTML = await MakeFetch(`${this.baseURL}/search?q=${query}`);
            searchDOM.innerHTML = DOMPurify.sanitize(searchHTML, {
                ADD_TAGS: ["#comment"]
            });

            const itemsDOM = searchDOM.document.querySelectorAll(".h-\\[125\\]");
            const data = [];

            for (let i = 0; i < itemsDOM.length; i++) {
                const con = itemsDOM[i];
                
                if (con.classList.contains("js-scroll-hidden")) {
                    con.innerHTML = con.innerHTML.replace('<' + '!--', '').replace('-' + '->', '');
                }

                data.push({
                    "name": con.querySelector<HTMLElement>(".font-bold")?.innerText,
                    "image": con.querySelector("img")?.getAttribute("src"),
                    "link": con.querySelector("a")?.getAttribute("href") + "&engine=12"
                });
            }

            return ({ data, "status": 200 });
        } catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url): Promise<extensionInfo> {
        const infoDOM = new DOMHandler();

        try {

            const response: extensionInfo = {
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
            response.image = infoDOM.document.querySelector("main")?.querySelector("img")?.getAttribute("src");
            response.name = infoDOM.document.querySelector("main")?.querySelector<HTMLElement>(".font-bold")?.innerText;
            response.description = infoDOM.document.querySelector<HTMLElement>(".js-md5-top-box-description")?.innerText;
            response.mainName = `${response.mainName}-${window.btoa(response.name.replace(/[^\x00-\x7F]/g, ""))?.trim()}`;

            response.episodes = [
                {
                    link: `?watch=${identifier}&engine=12`,
                    title: infoDOM.document.querySelector<HTMLElement>(".text-sm")?.innerText
                }
            ];

            return response;
        } catch (err) {
            throw err;
        }
    },

    getLinkFromUrl: async function (url): Promise<extensionMangaSource> {
        const linkDOM = new DOMHandler();

        try {

            const response: extensionMangaSource = {
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

            response.name = linkDOM.document.querySelector("main")?.querySelector<HTMLElement>(".font-bold")?.innerText;
            response.sources = [];

            let sourceCount = 0;
            const downloadLinks = linkDOM.document.querySelectorAll(".js-download-link");
            for (const elem of downloadLinks) {
                if (elem.getAttribute("href")?.endsWith(".epub")) {
                    response.sources.push({
                        name: `Epub${++sourceCount}`,
                        url: elem.getAttribute("href"),
                        type: "epub"
                    })
                } else if (elem.getAttribute("href")?.endsWith(".pdf")) {
                    response.sources.push({
                        name: `PDF${++sourceCount}`,
                        url: elem.getAttribute("href"),
                        type: "pdf"
                    })
                }
            }

            console.log(response);


            return response;
        } catch (err) {
            throw err;
        }
    },
    fixTitle(title: string) {
        const tempTitle = title.split("-");
        
        tempTitle.shift();
        tempTitle.shift();

        try{
            title = window.atob(tempTitle.join("-"));
        }catch(err){
            console.warn(err);
        }finally{
            return title;
        }
    }
};