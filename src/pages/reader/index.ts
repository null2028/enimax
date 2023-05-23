const parentWindow = window.parent as cordovaWindow;
const extensionListReader = parentWindow.returnExtensionList();
const container = document.getElementById("chapterCon");
const spotlight = document.getElementById("spotlight");
const topNav = document.getElementById("topNav");
const bottomNav = document.getElementById("bottomNav");
const backDOM = document.getElementById("back");
const slider = document.getElementById("sliderInput") as HTMLInputElement;
const mainCon = document.getElementById("con_11");

let params: URLSearchParams;
let totalPages = 0;
let pagesDOM: HTMLElement[] = [];
let pagesURL: MangaPage[] = [];
let panZooms: any = [];
let pagesDescrambled = {};
let currentMangaData: extensionMangaSource = undefined;
let dirty = false;
let menuOpen = false;
let menuTimeout;
let lastErrorClick = 0;
let reversed = true;
let touchStart = 0;
let mangaEngine;
let rootDir: string;
let readerDownloaded = localStorage.getItem("offline") === 'true';
let loadLocally = false;
// @ts-ignore
let hasLoadedEpList = false;
function loadNext() {
    if (currentMangaData.next) {
        history.replaceState({ page: 1 }, "", currentMangaData.next);
        ini();
    }
}

function loadPrev() {
    if (currentMangaData.prev) {
        history.replaceState({ page: 1 }, "", currentMangaData.prev);
        ini();
    }
}

function normalizePage(num: number) {
    num = Math.min(num, totalPages);
    num = Math.max(1, num);

    return num;
}

function handleMenu() {
    if (!menuOpen) {
        topNav.classList.replace("close", "open");
        bottomNav.classList.replace("close", "open");

        spotlight.style.display = "block";

        clearTimeout(menuTimeout);
        menuTimeout = setTimeout(function () {
            menuOpen = true;
            handleMenu();
        }, 3000);
    } else {
        topNav.classList.replace("open", "close");
        bottomNav.classList.replace("open", "close");
        spotlight.style.display = "none";
    }

    menuOpen = !menuOpen;
}

async function loadPage(elem: HTMLImageElement, index: number) {
    const i = index;

    try {
        if (readerDownloaded || loadLocally) {
            const image = await parentWindow.makeLocalRequest("GET", `/manga/${rootDir}/${index}.jpg`, "blob");
            pagesURL[i].img = URL.createObjectURL(image);
        }

        if (pagesURL[i].needsDescrambling) {
            if (i in pagesDescrambled) {
                elem.src = pagesDescrambled[i];
            } else {
                extensionListReader[mangaEngine].descramble(pagesURL[i].img, pagesURL[i].key).then((url: string) => {
                    pagesDescrambled[i] = url;
                    elem.src = url;
                }).catch(() => {
                    elem.onerror(new Event("error"));
                });
            }
        } else {
            elem.src = pagesURL[i].img;
        }
    } catch (err) {
        elem.onerror(new Event("error"));
    }
}

function setSliderValue(num: number) {
    slider.value = normalizePage(num).toString();
}

// @ts-ignore
function checkIfExists(localURL: string): Promise<string> {
    return (new Promise(function (resolve, reject) {
        let timeout = setTimeout(function () {
            reject(new Error("timeout"));
        }, 1000);

        (<cordovaWindow>window.parent).makeLocalRequest("GET", `${localURL}`).then(function () {
            clearTimeout(timeout);
            resolve("yes");
        }).catch(function (err: Error) {
            clearTimeout(timeout);
            reject(err);
        });
    }));
}

async function ini() {
    container.onscroll = () => { };
    dirty = true;
    params = new URLSearchParams(location.search);
    pagesURL = [];
    pagesDescrambled = {};
    while (pagesDOM.length) {
        pagesDOM[0].remove();
        pagesDOM.shift();
    }

    while (panZooms.length) {
        panZooms[0].dispose();
        panZooms.shift();
    }

    mangaEngine = params.get("engine");

    loadLocally = false;

    if (readerDownloaded) {
        rootDir = decodeURIComponent(location.search.replace("?watch=", "").split("&")[0]);

        // Getting the meta data
        currentMangaData = JSON.parse(await parentWindow.makeLocalRequest("GET", `/manga/${rootDir}/viddata.json`)).data;
        for (let i = 0; i < currentMangaData.pages.length; i++) {
            const page = currentMangaData.pages[i];
            page.img = `${i}.jpg`;
        }

        try {
            currentMangaData.next = "?watch=" + encodeURIComponent(`/${rootDir.split("/")[1]}/${btoa(parentWindow.normalise(currentMangaData.next))}`) + "&isManga=true";
            currentMangaData.prev = "?watch=" + encodeURIComponent(`/${rootDir.split("/")[1]}/${btoa(parentWindow.normalise(currentMangaData.prev))}`) + "&isManga=true";
        } catch (err) {
            console.warn(err);
        }

        mangaEngine = (currentMangaData as mangaData).engine;
    } else {
        currentMangaData = await extensionListReader[mangaEngine].getLinkFromUrl(params.get("watch"));
    }


    const mainName = localStorage.getItem("mainName");
    const rootDirCheck = `${mainName}/${btoa(parentWindow.normalise(location.search))}`;
    const localURL = `/manga/${rootDirCheck}/.downloaded`;

    if (!readerDownloaded) {
        try {
            await checkIfExists(localURL);
            rootDir = rootDirCheck;
            let res: boolean;
            if (localStorage.getItem("alwaysDown") === "true") {
                res = true;
            } else {
                res = confirm("Want to open the downloaded version?");
            }
            if (res) {
                let vidString = (await (<cordovaWindow>window.parent).makeLocalRequest("GET", `/manga/${rootDirCheck}/viddata.json`));
                let viddata: mangaData = JSON.parse(vidString).data;

                currentMangaData.pages = viddata.pages;
                loadLocally = true;
            }
        } catch (err) {
            console.error(err);
        }
    }

    if (hasLoadedEpList === false && !readerDownloaded) {
        hasLoadedEpList = true;
        extensionListReader[mangaEngine].getAnimeInfo(localStorage.getItem("epURL").replace("?watch=/", "")).then((data: extensionInfo) => {
            const episodes = data.episodes;

            for (let i = episodes.length - 1; i >= 0; i--) {
                const ep = episodes[i];

                let truncatedTitle = ep.title.substring(0, 30);
                if (ep.title.length >= 30) {
                    truncatedTitle += "...";
                }

                const epNum = parseFloat(ep.title.toLowerCase().replace("episode", ""));

                if (!isNaN(epNum)) {
                    ep.title = `Episode ${epNum}`;
                    truncatedTitle = ep.title;
                }

                if (ep.altTitle) {
                    ep.title = ep.altTitle;
                    truncatedTitle = ep.altTitle;
                }

                if (ep.altTruncatedTitle) {
                    truncatedTitle = ep.altTruncatedTitle;
                }

                mangaMenu.getScene("episodes").addItem({
                    highlightable: true,
                    html: ep.title + (ep.date ? `<div class="menuDate">${ep.date.toLocaleString()}</div>` : ""),
                    altText: truncatedTitle,
                    selected: location.search === ep.link,
                    id: ep.link,
                    callback: function () {
                        history.replaceState({ page: 1 }, "", ep.link);
                        ini();
                    }
                }, false);
            }
        }).catch((err: Error) => {
            console.error(err);
        });
    }

    document.getElementById("name").textContent = currentMangaData.name;
    document.getElementById("chapterNum").textContent = `Chapter ${currentMangaData.chapter} ${currentMangaData.title ? ` - ${currentMangaData.title}` : ""}`;

    const pages = currentMangaData.pages;
    totalPages = pages.length;

    slider.setAttribute("max", totalPages.toString());

    if (totalPages == 0) {
        alert("No pages could be found");
    }

    for (const page of pages) {
        const pageDOM = createElement({
            class: "pageCon snappedCategoriesDataMain",
        });

        const imageDOM = createElement({
            element: "img",
            class: "page",
        });

        pagesURL.push(page);
        pagesDOM.push(pageDOM);

        pageDOM.append(imageDOM);
        container.append(pageDOM);

        // @ts-ignore
        const panZoomInstance = panzoom(imageDOM, {
            bounds: true,
            boundsPadding: 1,
            minZoom: 1,
            onClick: (event) => {
                if (Date.now() - lastErrorClick > 500) {
                    let currentPage = parseInt(slider.value) - 1;
                    const sign = reversed ? -1 : 1;
                    const xCoord = event.type === "touchend" ? event.changedTouches[0].clientX : event.clientX;

                    if (reversed) {
                        currentPage = totalPages - currentPage - 1;
                    }

                    // Divide the screen into thirds
                    if (xCoord < window.innerWidth / 3) {
                        if (reversed) {
                            setSliderValue(normalizePage(totalPages - (currentPage - 1 * sign)));
                        } else {
                            setSliderValue(currentPage - 1 * sign);
                        }
                        openPage(currentPage - 1 * sign);
                    } else if (xCoord < 2 * window.innerWidth / 3) {
                        handleMenu();
                    } else {
                        if (reversed) {
                            setSliderValue(normalizePage(totalPages - (currentPage + 1 * sign)));
                        } else {
                            setSliderValue(currentPage + 1 * sign);
                        }
                        openPage(currentPage + 1 * sign);
                    }
                }
            }
        });

        panZooms.push(panZoomInstance);
    }

    let apiRes = await (<cordovaWindow>window.parent).apiCall("POST",
        {
            "username": "",
            "action": 2,
            "name": localStorage.mainName,
            "nameUm": localStorage.mainName,
            "ep": currentMangaData.chapter,
            "cur": location.search
        }, () => { });


    (<cordovaWindow>window.parent).apiCall("POST",
        {
            "username": "",
            "action": 2,
            "name": localStorage.mainName,
            "nameUm": localStorage.mainName,
            "ep": currentMangaData.chapter,
            "duration": totalPages,
            "cur": location.search
        }, () => { });


    let scrollLastIndex = -1;

    const scrollSnapFunc = function (isEvent = false) {
        if (isEvent && dirty) {
            return;
        }

        let unRoundedIndex = 0;
        if (!reversed) {
            unRoundedIndex = container.scrollLeft / container.offsetWidth;
        } else {
            unRoundedIndex = (container.offsetWidth - container.scrollLeft) / container.offsetWidth;
        }

        let index = Math.round(unRoundedIndex);

        if(isNaN(index)){
            return;
        }

        if (reversed) {
            index--;
        }

        if (index != scrollLastIndex) {

            if (reversed) {
                setSliderValue(totalPages - index);
            } else {
                setSliderValue(index + 1);
            }

            if (index === totalPages) {
                dirty = true;
                container.onscroll = () => { };
                return loadNext();
            }

            (<cordovaWindow>window.parent).apiCall("POST", {
                "username": "",
                "action": 1,
                "time": index,
                "ep": currentMangaData.chapter,
                "name": localStorage.mainName,
                "nameUm": localStorage.mainName,
                "prog": totalPages
            }, () => { });

            for (let i = 0; i < pagesDOM.length; i++) {
                if (Math.abs(index - i) <= 3) {
                    const con = pagesDOM[i]
                    const elem = con.querySelector(".page") as HTMLImageElement;
                    const hasBeenLoaded = elem?.getAttribute("data-loaded");
                    if (elem && hasBeenLoaded !== "true") {
                        const index = i;
                        elem.onload = function () {
                            con.querySelector("#errorPageCon")?.remove();
                        }

                        elem.onerror = function () {
                            let tries = parseInt(elem.getAttribute("data-retry"));

                            if (isNaN(tries)) {
                                tries = 0;
                            }

                            elem.setAttribute("data-retry", (++tries).toString());

                            if (tries <= 5) {
                                elem.removeAttribute("src");
                                loadPage(elem, parseInt(elem.getAttribute("data-index")));
                            } else {

                                con.querySelector("#errorPageCon")?.remove();

                                constructErrorPage(
                                    con,
                                    `Could not load the image`,
                                    {
                                        hasLink: false,
                                        hasReload: true,
                                        customConClass: "absolute",
                                        isError: false,
                                        reloadFunc: (event: Event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            lastErrorClick = Date.now();
                                            elem.removeAttribute("src");
                                            loadPage(elem, parseInt(elem.getAttribute("data-index")));
                                        }
                                    }
                                );
                            }

                        };

                        loadPage(elem, index);
                        elem.setAttribute("data-index", index.toString());
                        elem.setAttribute("data-loaded", "true");
                    }
                }
            }
        }

        scrollLastIndex = index;
    };

    container.onscroll = function () {
        scrollSnapFunc(true)
    };

    const nextDOM = createElement({
        class: "pageCon snappedCategoriesDataMain",
        style: {
            backgroundColor: "#121212"
        }
    });

    pagesDOM.push(nextDOM);
    container.append(nextDOM);
    dirty = false;

    const currentPage = Math.min(apiRes.data.time, totalPages - 1);

    if (reversed) {
        setSliderValue(totalPages - currentPage + 1);
    } else {
        setSliderValue(currentPage);
    }

    pagesDOM[currentPage]?.scrollIntoView({});

    scrollSnapFunc(false);
}

function openPage(num: number) {
    pagesDOM[num]?.scrollIntoView();
}


function closeSettings() {
    let settingCon = document.querySelector<HTMLElement>(".menuCon");
    settingCon.style.transitionDuration = "0.2s";
    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            settingCon.style.transform = "translateY(100%)";
            settingCon.style.opacity = "0";
            settingCon.style.pointerEvents = "none";
            setTimeout(function () {
                settingCon.style.transitionDuration = "0s";
            }, 200);
        });
    });
}

function openSettingsSemi(translateY: number) {
    let settingCon = document.querySelector<HTMLElement>(".menuCon");
    settingCon.style.display = "block";
    settingCon.style.pointerEvents = "auto";
    settingCon.style.opacity = "1";
    if (translateY == -1) {
        settingCon.style.transform = "translateY(0px)";
    } else if (translateY == 0) {
        settingCon.style.transform = "translateY(100%)";

    } else {
        settingCon.style.transform = `translateY(calc(100% + ${-translateY + 50}px))`;
    }

}

document.getElementById("next").onclick = function () {
    if (reversed) {
        loadPrev();
    } else {
        loadNext();
    }
};

document.getElementById("prev").onclick = function () {
    if (reversed) {
        loadNext();
    } else {
        loadPrev();
    }
};


backDOM.addEventListener("click", function () {
    if (config.chrome) {
        history.back();
    } else {
        (window.parent as cordovaWindow).back();
    }
});

slider.addEventListener("input", function () {
    let pageNum = parseInt(this.value) - 1;
    if (reversed) {
        pageNum = totalPages - pageNum - 1;
    }
    openPage(pageNum);

    clearTimeout(menuTimeout);
    menuTimeout = setTimeout(function () {
        menuOpen = true;
        handleMenu();
    }, 3000);
});

const mangaMenu = new dropDownMenu(
    [
        {
            "id": "initial",
            "heading": {
                "text": "Settings",
            },
            "items": [
                {
                    "text": "Episodes",
                    "iconID": "episodesIcon",
                    "open": "episodes"
                },
            ]
        },
        {
            "id": "episodes",
            "selectableScene": true,
            "scrollIntoView": true,
            "heading": {
                "text": "Episodes",
            },
            "items": [

            ]
        },
    ], document.querySelector(".menuCon"));


document.getElementById("name").addEventListener("click", function () {
    openSettingsSemi(-1);
});

if (reversed) {
    slider.classList.add("reversed");
}

let mangeSettingsPullInstance = new settingsPull(document.getElementById("settingHandlePadding"), closeSettings);
let mangaSettingsPullInstanceTT = new settingsPull(document.querySelector(".menuCon"), closeSettings, true);

mangaMenu.open("initial");

ini();