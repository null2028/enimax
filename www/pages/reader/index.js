const parentWindow = window.parent;
const extensionListReader = parentWindow.returnExtensionList();
const container = document.getElementById("chapterCon");
const spotlight = document.getElementById("spotlight");
const topNav = document.getElementById("topNav");
const bottomNav = document.getElementById("bottomNav");
const backDOM = document.getElementById("back");
const slider = document.getElementById("sliderInput");
const mainCon = document.getElementById("con_11");
let params;
let totalPages = 0;
let pagesDOM = [];
let pagesURL = [];
let panZooms = [];
let pagesDescrambled = {};
let currentMangaData = undefined;
let dirty = false;
let menuOpen = false;
let menuTimeout;
let lastErrorClick = 0;
let reversed = true;
let touchStart = 0;
let mangaEngine;
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
function normalizePage(num) {
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
    }
    else {
        topNav.classList.replace("open", "close");
        bottomNav.classList.replace("open", "close");
        spotlight.style.display = "none";
    }
    menuOpen = !menuOpen;
}
function loadPage(elem, index) {
    console.log(index);
    const i = index;
    if (pagesURL[i].needsDescrambling) {
        if (i in pagesDescrambled) {
            elem.src = pagesDescrambled[i];
        }
        else {
            extensionListReader[mangaEngine].descramble(pagesURL[i].img, pagesURL[i].key).then((url) => {
                pagesDescrambled[i] = url;
                elem.src = url;
            }).catch(() => {
                elem.onerror(new Event("error"));
            });
        }
    }
    else {
        elem.src = pagesURL[i].img;
    }
}
function setSliderValue(num) {
    slider.value = normalizePage(num).toString();
}
async function ini() {
    var _a;
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
    currentMangaData = await extensionListReader[mangaEngine].getLinkFromUrl(params.get("watch"));
    if (hasLoadedEpList === false) {
        hasLoadedEpList = true;
        extensionListReader[mangaEngine].getAnimeInfo(localStorage.getItem("epURL").replace("?watch=/", "")).then((data) => {
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
        }).catch((err) => {
            console.error(err);
        });
    }
    document.getElementById("name").textContent = currentMangaData.name;
    document.getElementById("chapterNum").textContent = `Chapter ${params.get("chap")} ${currentMangaData.title ? ` - ${currentMangaData.title}` : ""}`;
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
                        }
                        else {
                            setSliderValue(currentPage - 1 * sign);
                        }
                        openPage(currentPage - 1 * sign);
                    }
                    else if (xCoord < 2 * window.innerWidth / 3) {
                        handleMenu();
                    }
                    else {
                        if (reversed) {
                            setSliderValue(normalizePage(totalPages - (currentPage + 1 * sign)));
                        }
                        else {
                            setSliderValue(currentPage + 1 * sign);
                        }
                        openPage(currentPage + 1 * sign);
                    }
                }
            }
        });
        panZooms.push(panZoomInstance);
    }
    let apiRes = await window.parent.apiCall("POST", {
        "username": "",
        "action": 2,
        "name": localStorage.mainName,
        "nameUm": localStorage.mainName,
        "ep": params.get("chap"),
        "cur": location.search
    }, () => { });
    window.parent.apiCall("POST", {
        "username": "",
        "action": 2,
        "name": localStorage.mainName,
        "nameUm": localStorage.mainName,
        "ep": params.get("chap"),
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
        }
        else {
            unRoundedIndex = (container.offsetWidth - container.scrollLeft) / container.offsetWidth;
        }
        let index = Math.round(unRoundedIndex);
        if (reversed) {
            index--;
        }
        if (index != scrollLastIndex) {
            if (reversed) {
                setSliderValue(totalPages - index);
            }
            else {
                setSliderValue(index + 1);
            }
            if (index === totalPages) {
                dirty = true;
                container.onscroll = () => { };
                return loadNext();
            }
            window.parent.apiCall("POST", {
                "username": "",
                "action": 1,
                "time": index,
                "ep": params.get("chap"),
                "name": localStorage.mainName,
                "nameUm": localStorage.mainName,
                "prog": totalPages
            }, () => { });
            for (let i = 0; i < pagesDOM.length; i++) {
                if (Math.abs(index - i) <= 3) {
                    const con = pagesDOM[i];
                    const elem = con.querySelector(".page");
                    const hasBeenLoaded = elem === null || elem === void 0 ? void 0 : elem.getAttribute("data-loaded");
                    if (elem && hasBeenLoaded !== "true") {
                        const index = i;
                        elem.onload = function () {
                            var _a;
                            (_a = con.querySelector("#errorPageCon")) === null || _a === void 0 ? void 0 : _a.remove();
                        };
                        elem.onerror = function () {
                            var _a;
                            let tries = parseInt(elem.getAttribute("data-retry"));
                            if (isNaN(tries)) {
                                tries = 0;
                            }
                            elem.setAttribute("data-retry", (++tries).toString());
                            if (tries <= 5) {
                                elem.removeAttribute("src");
                                loadPage(elem, parseInt(elem.getAttribute("data-index")));
                            }
                            else {
                                (_a = con.querySelector("#errorPageCon")) === null || _a === void 0 ? void 0 : _a.remove();
                                constructErrorPage(con, `Could not load the image`, {
                                    hasLink: false,
                                    hasReload: true,
                                    customConClass: "absolute",
                                    isError: false,
                                    reloadFunc: (event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        lastErrorClick = Date.now();
                                        elem.removeAttribute("src");
                                        loadPage(elem, parseInt(elem.getAttribute("data-index")));
                                    }
                                });
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
        scrollSnapFunc(true);
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
    }
    else {
        setSliderValue(currentPage);
    }
    (_a = pagesDOM[currentPage]) === null || _a === void 0 ? void 0 : _a.scrollIntoView({});
    scrollSnapFunc(false);
}
function openPage(num) {
    var _a;
    (_a = pagesDOM[num]) === null || _a === void 0 ? void 0 : _a.scrollIntoView();
}
function closeSettings() {
    let settingCon = document.querySelector(".menuCon");
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
function openSettingsSemi(translateY) {
    let settingCon = document.querySelector(".menuCon");
    settingCon.style.display = "block";
    settingCon.style.pointerEvents = "auto";
    settingCon.style.opacity = "1";
    if (translateY == -1) {
        settingCon.style.transform = "translateY(0px)";
    }
    else if (translateY == 0) {
        settingCon.style.transform = "translateY(100%)";
    }
    else {
        settingCon.style.transform = `translateY(calc(100% + ${-translateY + 50}px))`;
    }
}
document.getElementById("next").onclick = function () {
    if (reversed) {
        loadPrev();
    }
    else {
        loadNext();
    }
};
document.getElementById("prev").onclick = function () {
    if (reversed) {
        loadNext();
    }
    else {
        loadPrev();
    }
};
backDOM.addEventListener("click", function () {
    if (config.chrome) {
        history.back();
    }
    else {
        window.parent.back();
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
const mangaMenu = new dropDownMenu([
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
        "items": []
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
