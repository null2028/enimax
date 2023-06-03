const parentWindow = window.parent as cordovaWindow;
const extensionListReader = parentWindow.returnExtensionList();
const container = document.getElementById("chapterCon");
const spotlight = document.getElementById("spotlight");
const topNav = document.getElementById("topNav");
const bottomNav = document.getElementById("bottomNav");
const backDOM = document.getElementById("back");
const slider = document.getElementById("sliderInput") as HTMLInputElement;
const mainCon = document.getElementById("con_11");
const currentPageDOM = document.getElementById("currentPage");
const totalPageDOM = document.getElementById("totalPage");
const settingCon = document.querySelector<HTMLElement>(".menuCon");
const mainLoading = document.getElementById("mainLoading");
const pageNumDOM = document.getElementById("pageNum");

const modes = {
    NORMAL: 0,
    REVERSED: 1
};

let params: URLSearchParams;
let totalPages = 0;
let pagesDOM: HTMLElement[] = [];
let paddingDOM: HTMLElement[] = [];
let pagesURL: MangaPage[] = [];
let panZooms: any = [];
let pagesDescrambled = {};
let currentMangaData: extensionMangaSource = undefined;
let dirty = false;
let menuOpen = false;
let menuTimeout;
let lastErrorClick = 0;
let reversed = localStorage.getItem("manga-reversed") === "true";
let webcomic = false;
let touchStart = 0;
let mangaEngine;
let rootDir: string;
let readerDownloaded = localStorage.getItem("offline") === 'true';
let loadLocally = false;
let pagePadding = { left: 2 };

// @ts-ignore
let scrollSnapFunc: Function;
// @ts-ignore
let hasLoadedEpList = false;
function loadNext() {
    if (currentMangaData.next) {
        history.replaceState({ page: 1 }, "", currentMangaData.next);
        ini();
    }
}

function updateChapterListSelected() {
    mangaMenu?.selections[location.search]?.select();
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
        closeSettings();
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
    if (reversed) {
        currentPageDOM.textContent = normalizePage(totalPages - (num + 2) + 1).toString();
    } else {
        currentPageDOM.textContent = normalizePage(num - 2).toString();
    }
    slider.value = normalizePage((num) - (reversed ? -1 : 1) * pagePadding.left).toString();
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
    try {
        mainLoading.style.display = "flex";
        container.onscroll = () => { };
        dirty = true;
        params = new URLSearchParams(location.search);
        pagesURL = [];
        pagesDescrambled = {};
        while (pagesDOM.length) {
            pagesDOM[0].remove();
            pagesDOM.shift();
        }

        while (paddingDOM.length) {
            paddingDOM[0].remove();
            paddingDOM.shift();
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

        if (!readerDownloaded && !config.chrome) {
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
        totalPageDOM.textContent = pages.length.toString();

        slider.setAttribute("max", totalPages.toString());

        if (totalPages == 0) {
            alert("No pages could be found");
        }

        for (const page of pages) {
            const pageDOM = createElement({
                class: `pageCon${webcomic ? "" : " snappedCategoriesDataMain"}`,
                children: [{
                    class: "nextPrevPage",
                    innerText: "Loading...",
                }]
            });

            const imageDOM = createElement({
                element: "img",
                class: "page",
                attributes: {
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"
                }
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
                maxZoom: 6,
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
                            if (reversed && (currentPage + 1) != totalPages) {
                                setSliderValue(normalizePage(totalPages - (currentPage - 1 * sign)));
                            } else if (!reversed && currentPage != 0) {
                                setSliderValue(currentPage - 1 * sign);
                            }
                            openPage(currentPage - 1 * sign);
                        } else if (xCoord < 2 * window.innerWidth / 3) {
                            handleMenu();
                        } else {
                            if (reversed && currentPage != 0) {
                                setSliderValue(normalizePage(totalPages - (currentPage + 1 * sign)));
                            } else if (!reversed && (currentPage + 1) != totalPages) {
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

        scrollSnapFunc = function (isEvent = false, indexToScrollTo = -1) {
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

            if (webcomic) {
                if (indexToScrollTo != -1) {
                    index = indexToScrollTo;
                } else {
                    let i = 0;
                    let didBreak = false;
                    for (; i < pagesDOM.length; i++) {
                        if (pagesDOM[i].getBoundingClientRect().bottom > 0) {
                            didBreak = true;
                            break;
                        }
                    }

                    index = didBreak ? i : 0;
                }
            }



            if (isNaN(index)) {
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

                const pageIndex = normalizePage(index - pagePadding.left + 1) - 1;

                if (index === totalPages + 1 + pagePadding.left && currentMangaData.next) {
                    dirty = true;
                    container.onscroll = () => { };
                    return loadNext();
                } else if (index == 0 && currentMangaData.prev) {
                    dirty = true;
                    container.onscroll = () => { };
                    return loadPrev();
                }

                (<cordovaWindow>window.parent).apiCall("POST", {
                    "username": "",
                    "action": 1,
                    "time": pageIndex,
                    "ep": currentMangaData.chapter,
                    "name": localStorage.mainName,
                    "nameUm": localStorage.mainName,
                    "prog": totalPages - 1
                }, () => { });

                for (let i = 0; i < pagesDOM.length; i++) {
                    if (Math.abs(index - i) <= 3) {
                        const con = pagesDOM[i];
                        const elem = con.querySelector(".page") as HTMLImageElement;
                        const hasBeenLoaded = elem?.getAttribute("data-loaded");
                        if (elem && hasBeenLoaded !== "true") {
                            const index = i;
                            elem.onload = function () {
                                con.querySelector("#errorPageCon")?.remove();
                                con.querySelector(".nextPrevPage")?.remove();
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


        paddingDOM.push(createElement({
            class: "pageCon snappedCategoriesDataMain nextPrevPage",
            attributes: {
                "data-side": "right"
            },
            innerText: `Next: ${currentMangaData.nextTitle}`,
            listeners: {
                click: function () {
                    handleMenu();
                }
            }
        }));

        paddingDOM.push(createElement({
            class: "pageCon snappedCategoriesDataMain",
            style: {
                backgroundColor: "#000000"
            },
            attributes: {
                "data-side": "right"
            },
            listeners: {
                click: function () {
                    handleMenu();
                }
            }
        }));

        paddingDOM.push(createElement({
            class: "pageCon snappedCategoriesDataMain nextPrevPage",
            innerText: `Previous: ${currentMangaData.prevTitle}`,
            listeners: {
                click: function () {
                    handleMenu();
                }
            }
        }));

        paddingDOM.push(createElement({
            class: "pageCon snappedCategoriesDataMain",
            style: {
                backgroundColor: "#000000"
            },
            listeners: {
                click: function () {
                    handleMenu();
                }
            }
        }));

        for (const padding of paddingDOM) {
            if (padding.getAttribute("data-side") === "right") {
                container.append(padding);
            } else {
                container.prepend(padding);
            }
        }

        dirty = false;

        const currentPage = Math.max(Math.min(apiRes.data.time, totalPages - 1), 0);
        if (reversed) {
            setSliderValue(totalPages - currentPage + 1);
        } else {
            setSliderValue(currentPage);
        }

        pagesDOM[currentPage]?.scrollIntoView({});
        updateChapterListSelected();
        scrollSnapFunc(false, currentPage);

        mainLoading.style.display = "none";
    } catch (err) {
        const errorPage = constructErrorPage(
            container,
            err?.toString(),
            {
                hasLink: false,
                hasReload: true,
                customConClass: "absolute",
                isError: false,
                reloadFunc: (event: Event) => {
                    window.location.reload();
                }
            }
        );

        errorPage.addEventListener("click", handleMenu);
    }
}

function openPage(num: number) {
    pagesDOM[num]?.scrollIntoView();
}


function closeSettings() {
    settingCon.style.display = "none";
    settingCon.setAttribute("data-open", "false");
}

function openSettings() {
    settingCon.style.display = "block";
    settingCon.setAttribute("data-open", "true");
}

function changeMode(mode: number) {
    if (mode === modes.NORMAL) {
        slider.classList.remove("reversed");
        container.classList.remove("reversed");
        reversed = false;

        const realPageNum = -parseInt(slider.value) + totalPages + 2 - 1;
        setSliderValue(realPageNum + 2);
    } else if (mode === modes.REVERSED) {
        slider.classList.add("reversed");
        container.classList.add("reversed");
        reversed = true;

        setSliderValue(totalPages - parseInt(slider.value) - 1);
    }

    if (scrollSnapFunc) {
        scrollSnapFunc(true);
    }
}

function togglePageNum(shouldShow: boolean) {
    if (shouldShow) {
        pageNumDOM.style.display = "block";
    } else {
        pageNumDOM.style.display = "none";
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
            "id": "episodes",
            "selectableScene": true,
            "scrollIntoView": true,
            "scrollOffset": 0,
            "heading": {
                "text": "Episodes",
            },
            "items": [

            ]
        },
        {
            "id": "settings",
            "heading": {
                "text": "Settings",
            },
            "items": [
                {
                    "toggle": true,
                    "on": localStorage.getItem("manga-reversed") === "true",
                    "toggleOff": () => {
                        localStorage.setItem("manga-reversed", "false");
                        changeMode(modes.NORMAL);
                    },
                    "toggleOn": () => {
                        localStorage.setItem("manga-reversed", "true");
                        changeMode(modes.REVERSED);
                    },
                    "text": "Read from left to right"
                },
                {
                    "toggle": true,
                    "on": localStorage.getItem("manga-pageNum") === "false",
                    "toggleOn": () => {
                        localStorage.setItem("manga-pageNum", "false");
                        togglePageNum(false);
                    },
                    "toggleOff": () => {
                        localStorage.setItem("manga-pageNum", "true");
                        togglePageNum(true);
                    },
                    "text": "Hide page number"
                },
                {
                    "color": true,
                    "value": localStorage.getItem("manga-background") ?? "#121212",
                    "onInput": function (event: Event) {
                        container.style.backgroundColor = this.value;
                        localStorage.setItem("manga-background", this.value);
                    },
                    "text": "Background color",
                    "attributes": {
                        "style": "display: flex; justify-content: space-between;"
                    }
                }
            ]
        },
    ], document.querySelector(".menuCon"));

mangaMenu.closeMenu = closeSettings;

document.getElementById("name").addEventListener("click", function () {
    openSettingsSemi(-1);
});

document.querySelector(".bottomNavMenuItem.epListIcon").addEventListener("click", function () {
    const isOpen = settingCon.getAttribute("data-open") === "true";
    const isListOpen = settingCon.getAttribute("data-type") === "list";

    if (!isOpen || !isListOpen) {
        openSettings();
        mangaMenu.openMenu();
        mangaMenu.history = [];
        mangaMenu.open("episodes");
        clearTimeout(menuTimeout);

        settingCon.setAttribute("data-type", "list");
    } else {
        closeSettings();
    }
});

document.querySelector(".bottomNavMenuItem.settingsIcon").addEventListener("click", function () {
    const isOpen = settingCon.getAttribute("data-open") === "true";
    const isSettingsOpen = settingCon.getAttribute("data-type") === "settings";

    if (!isOpen || !isSettingsOpen) {
        openSettings();
        mangaMenu.openMenu();
        mangaMenu.history = [];
        mangaMenu.open("settings");
        clearTimeout(menuTimeout);

        settingCon.setAttribute("data-type", "settings");
    } else {
        closeSettings();
    }
});

mainLoading?.addEventListener("click", handleMenu);

document.querySelector(".bottomNavMenuItem.reloadIcon").addEventListener("click", function () {
    window.location.reload();
});

if (reversed) {
    changeMode(modes.REVERSED);
}

if (webcomic) {
    container.classList.replace("snappedCustomRooms", "webcomics");
}

container.style.backgroundColor = localStorage.getItem("manga-background") ?? "#121212";
togglePageNum(localStorage.getItem("manga-pageNum") !== "false");
closeSettings();
ini();