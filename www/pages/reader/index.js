var _a, _b, _c, _d, _e, _f;
const parentWindow = window.parent;
const extensionListReader = parentWindow.returnExtensionList();
const container = document.getElementById("chapterCon");
const spotlight = document.getElementById("spotlight");
const topNav = document.getElementById("topNav");
const bottomNav = document.getElementById("bottomNav");
const backDOM = document.getElementById("back");
const slider = document.getElementById("sliderInput");
const mainCon = document.getElementById("con_11");
const currentPageDOM = document.getElementById("currentPage");
const totalPageDOM = document.getElementById("totalPage");
const settingCon = document.querySelector(".menuCon");
const mainLoading = document.getElementById("mainLoading");
const pageNumDOM = document.getElementById("pageNum");
const epubNext = document.querySelector("#epubNext");
const epubPrev = document.querySelector("#epubPrev");
const modes = {
    NORMAL: 0,
    REVERSED: 1
};
let params;
let totalPages = 0;
let pagesDOM = [];
let paddingDOM = [];
let pagesURL = [];
let panZooms = [];
let pagesDescrambled = {};
let currentMangaData = undefined;
let dirty = false;
let menuOpen = false;
let menuTimeout;
let lastErrorClick = 0;
let reversed = localStorage.getItem("manga-reversed") === "true";
let webcomic = false;
let touchStart = 0;
let mangaEngine;
let rootDir;
let readerDownloaded = localStorage.getItem("offline") === 'true';
let loadLocally = false;
let pagePadding = { left: 2 };
// Epub reader's variables
let mainLink = "";
let rendition;
let epubSettingsIcon = document.querySelector("#epubSettings");
// @ts-ignore
var CustomXMLHttpRequest = XMLHttpRequest;
let lastCfi = undefined;
let loadingCfi = false;
// @ts-ignore
let scrollSnapFunc;
// @ts-ignore
let hasLoadedEpList = false;
function loadNext() {
    if (currentMangaData.next) {
        history.replaceState({ page: 1 }, "", currentMangaData.next);
        ini();
    }
}
function updateChapterListSelected() {
    var _a;
    (_a = mangaMenu === null || mangaMenu === void 0 ? void 0 : mangaMenu.selections[location.search]) === null || _a === void 0 ? void 0 : _a.select();
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
        closeSettings();
        topNav.classList.replace("open", "close");
        bottomNav.classList.replace("open", "close");
        spotlight.style.display = "none";
    }
    menuOpen = !menuOpen;
}
async function loadPage(elem, index) {
    const i = index;
    try {
        if (readerDownloaded || loadLocally) {
            const image = await parentWindow.makeLocalRequest("GET", `/manga/${rootDir}/${index}.jpg`, "blob");
            pagesURL[i].img = URL.createObjectURL(image);
        }
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
    catch (err) {
        elem.onerror(new Event("error"));
    }
}
function setSliderValue(num) {
    if (reversed) {
        currentPageDOM.textContent = normalizePage(totalPages - (num + 2) + 1).toString();
    }
    else {
        currentPageDOM.textContent = normalizePage(num - 2).toString();
    }
    slider.value = normalizePage((num) - (reversed ? -1 : 1) * pagePadding.left).toString();
}
// @ts-ignore
function checkIfExists(localURL) {
    return (new Promise(function (resolve, reject) {
        let timeout = setTimeout(function () {
            reject(new Error("timeout"));
        }, 1000);
        window.parent.makeLocalRequest("GET", `${localURL}`).then(function () {
            clearTimeout(timeout);
            resolve("yes");
        }).catch(function (err) {
            clearTimeout(timeout);
            reject(err);
        });
    }));
}
function readerMakeLocalRequest(method, url, responseType = "blob") {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        if (responseType) {
            // @ts-ignore
            xhr.responseType = responseType;
        }
        xhr.open(method, url);
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            }
            else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: xhr.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}
function constructTheme() {
    var _a;
    const tags = ["h1", "h2", "h3", "h4", "h5", "h6"];
    const themeVal = {
        p: {}
    };
    for (const tag of tags) {
        themeVal[tag] = {};
    }
    const fontColor = (_a = localStorage.getItem("epub-fontColor")) !== null && _a !== void 0 ? _a : "#ffffff";
    themeVal["p"]["color"] = fontColor;
    for (const tag of tags) {
        themeVal[tag]["color"] = fontColor;
    }
    if (localStorage.getItem("epub-fontSize")) {
        themeVal["p"]["font-size"] = `${localStorage.getItem("epub-fontSize")}px`;
    }
    if (localStorage.getItem("epub-lineHeight")) {
        themeVal["p"]["line-height"] = `${localStorage.getItem("epub-lineHeight")}px`;
    }
    return themeVal;
}
window.addEventListener("epubProgress", function (event) {
    mainLoading.textContent = `${((event.loaded / event.total) * 100).toFixed(2)}% done`;
});
function handleEpubMenu(elem) {
    if (epubMenu.menuCon.getAttribute("data-open") !== "true") {
        epubMenu.open("initial");
        epubMenu.openMenu();
    }
    else {
        epubMenu.closeMenu();
    }
}
window.onmessage = function (event) {
    if (typeof event.data === "object" && "pageNumber" in event.data) {
        window.parent.apiCall("POST", {
            "username": "",
            "action": 1,
            "time": event.data.pageNumber,
            "ep": 1,
            "name": localStorage.getItem("mainName"),
            "nameUm": localStorage.getItem("mainName"),
            "prog": event.data.totalPages
        }, () => { });
    }
};
async function setupEpubReader(data, readerDownloaded) {
    var _a, _b, _c;
    try {
        const apiRes = await window.parent.apiCall("POST", {
            "username": "",
            "action": 2,
            "name": localStorage.mainName,
            "nameUm": localStorage.mainName,
            "ep": 1,
            "cur": location.search
        }, () => { });
        console.log("=========================");
        console.log(data);
        console.log(data.sources[0].type == "pdf");
        if (data.sources[0].type == "pdf") {
            const iframe = createElement({
                element: "iframe",
            });
            console.log(iframe);
            container.append(iframe);
            iframe.onload = function () {
                mainLoading.style.display = "none";
                iframe.contentWindow.postMessage({
                    url: data.sources[0].url,
                    pageNum: apiRes.data.time
                }, "*");
            };
            pageNumDOM.querySelector("#slash").style.display = "none";
            iframe.src = "../pdf/index.html";
            return;
        }
        epubSettingsIcon.style.display = "block";
        epubSettingsIcon.onclick = function () {
            handleEpubMenu(this);
        };
        const mainLink = new URLSearchParams(apiRes.data.mainLink);
        pageNumDOM.style.fontSize = "13px";
        pageNumDOM.querySelector("#slash").style.display = "none";
        totalPageDOM.textContent = "pages until next chapter";
        let currentSection = undefined;
        try {
            currentSection = window.atob(mainLink.get("current"));
        }
        catch (err) {
            console.warn(err);
        }
        // @ts-ignore
        const book = ePub(data.sources[0].url);
        rendition = book.renderTo("chapterCon", { width: "calc(100% - 60px)", height: "calc(100% - 40px)" });
        rendition.on("displayed", (event) => {
            changed();
        });
        rendition.on("displayError", (event) => {
            console.log("error", event);
        });
        container.style.backgroundColor = (_a = localStorage.getItem("epub-background")) !== null && _a !== void 0 ? _a : "#121212";
        rendition.themes.default(constructTheme());
        try {
            console.log(await rendition.display(currentSection));
        }
        catch (err) {
            console.log(await rendition.display());
        }
        console.log(rendition);
        mainLoading.style.display = "none";
        function changed() {
            var _a, _b;
            rendition.reportLocation();
            (_a = epubMenu.selections[`section-${rendition.currentLocation().start.href}`]) === null || _a === void 0 ? void 0 : _a.select();
            (_b = epubMenu.selections[`toc-${rendition.currentLocation().start.href}`]) === null || _b === void 0 ? void 0 : _b.select();
            mainLink.set("current", window.btoa(rendition.currentLocation().start.cfi));
            lastCfi = rendition.currentLocation().start.cfi;
            const displayed = rendition.currentLocation().start.displayed;
            currentPageDOM.textContent = `${displayed.total - displayed.page}`;
            window.parent.apiCall("POST", {
                "username": "",
                "action": 14,
                "name": localStorage.mainName,
                "url": "?" + decodeURIComponent(mainLink.toString())
            }, () => { });
        }
        container.onclick = async function (event) {
            const xCoord = event.clientX;
            if (xCoord < window.innerWidth / 3) {
                await rendition.prev();
                changed();
            }
            else if (xCoord < 2 * window.innerWidth / 3) {
                handleMenu();
            }
            else {
                await rendition.next();
                changed();
            }
        };
        const sections = rendition.book.spine.spineItems;
        const tocItems = rendition.book.navigation.toc;
        for (const toc of tocItems) {
            epubMenu.getScene("toc").addItem({
                highlightable: true,
                text: toc.label,
                id: `toc-${toc.href}`,
                callback: () => {
                    rendition.display(toc.href);
                }
            });
        }
        ;
        for (const section of sections) {
            epubMenu.getScene("sections").addItem({
                highlightable: true,
                text: section.idref,
                id: `section-${section.href}`,
                callback: () => {
                    rendition.display(section.href);
                }
            });
        }
        try {
            (_b = epubMenu.selections[`section-${rendition.currentLocation().start.href}`]) === null || _b === void 0 ? void 0 : _b.select();
            (_c = epubMenu.selections[`toc-${rendition.currentLocation().start.href}`]) === null || _c === void 0 ? void 0 : _c.select();
        }
        catch (err) {
            console.warn(err);
        }
    }
    catch (err) {
        alert(err);
    }
}
async function ini() {
    var _a;
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
            if (currentMangaData.readerType === "epub") {
                currentMangaData.sources[0].url = `${window.parent.cordova.file.externalDataDirectory}manga${rootDir}/main.${currentMangaData.sources[0].type}`;
            }
            for (let i = 0; i < currentMangaData.pages.length; i++) {
                const page = currentMangaData.pages[i];
                page.img = `${i}.jpg`;
            }
            try {
                currentMangaData.next = "?watch=" + encodeURIComponent(`/${rootDir.split("/")[1]}/${btoa(parentWindow.normalise(currentMangaData.next))}`) + "&isManga=true";
                currentMangaData.prev = "?watch=" + encodeURIComponent(`/${rootDir.split("/")[1]}/${btoa(parentWindow.normalise(currentMangaData.prev))}`) + "&isManga=true";
            }
            catch (err) {
                console.warn(err);
            }
            mangaEngine = currentMangaData.engine;
        }
        else {
            currentMangaData = await extensionListReader[mangaEngine].getLinkFromUrl(params.get("watch"));
        }
        const mainName = localStorage.getItem("mainName");
        const rootDirCheck = `${mainName}/${btoa(parentWindow.normalise(location.search))}`;
        const localURL = `/manga/${rootDirCheck}/.downloaded`;
        if (!readerDownloaded && !config.chrome) {
            try {
                await checkIfExists(localURL);
                rootDir = rootDirCheck;
                let res;
                if (localStorage.getItem("alwaysDown") === "true") {
                    res = true;
                }
                else {
                    res = await window.parent.Dialogs.confirm("Want to open the downloaded version?");
                }
                if (res) {
                    let vidString = (await window.parent.makeLocalRequest("GET", `/manga/${rootDirCheck}/viddata.json`));
                    let viddata = JSON.parse(vidString).data;
                    currentMangaData.pages = viddata.pages;
                    if (currentMangaData.readerType === "epub") {
                        currentMangaData.sources[0].url = `${window.parent.cordova.file.externalDataDirectory}manga/${rootDirCheck}/main.${currentMangaData.sources[0].type}`;
                    }
                    loadLocally = true;
                }
            }
            catch (err) {
                console.error(err);
            }
        }
        if (currentMangaData.readerType === "epub") {
            changeMode(modes.NORMAL);
            toggleArrows();
            // Close the manga menu if it's open
            menuOpen = true;
            handleMenu();
            setupEpubReader(currentMangaData, (readerDownloaded || loadLocally));
            return;
        }
        mainLoading === null || mainLoading === void 0 ? void 0 : mainLoading.addEventListener("click", handleMenu);
        if (hasLoadedEpList === false && !readerDownloaded) {
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
                            }
                            else if (!reversed && currentPage != 0) {
                                setSliderValue(currentPage - 1 * sign);
                            }
                            openPage(currentPage - 1 * sign);
                        }
                        else if (xCoord < 2 * window.innerWidth / 3) {
                            handleMenu();
                        }
                        else {
                            if (reversed && currentPage != 0) {
                                setSliderValue(normalizePage(totalPages - (currentPage + 1 * sign)));
                            }
                            else if (!reversed && (currentPage + 1) != totalPages) {
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
            "ep": currentMangaData.chapter,
            "cur": location.search
        }, () => { });
        window.parent.apiCall("POST", {
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
            }
            else {
                unRoundedIndex = (container.offsetWidth - container.scrollLeft) / container.offsetWidth;
            }
            let index = Math.round(unRoundedIndex);
            if (webcomic) {
                if (indexToScrollTo != -1) {
                    index = indexToScrollTo;
                }
                else {
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
                }
                else {
                    setSliderValue(index + 1);
                }
                const pageIndex = normalizePage(index - pagePadding.left + 1) - 1;
                if (index === totalPages + 1 + pagePadding.left && currentMangaData.next) {
                    dirty = true;
                    container.onscroll = () => { };
                    return loadNext();
                }
                else if (index == 0 && currentMangaData.prev) {
                    dirty = true;
                    container.onscroll = () => { };
                    return loadPrev();
                }
                window.parent.apiCall("POST", {
                    "username": "",
                    "action": 1,
                    "time": pageIndex,
                    "ep": currentMangaData.chapter,
                    "name": localStorage.mainName,
                    "nameUm": localStorage.mainName,
                    "prog": totalPages - 1
                }, () => { });
                if (!readerDownloaded) {
                    (async function () {
                        try {
                            const aniID = new URLSearchParams(localStorage.getItem("epURL")).get("aniID");
                            const identifier = `${aniID}-${currentMangaData.chapter}`;
                            console.log(aniID, identifier, totalPages - 1, (currentMangaData.chapter + 3));
                            if (aniID &&
                                totalPages - 1 > 0 &&
                                (pageIndex + 3) > totalPages - 1 &&
                                localStorage.getItem("anilist-last") != identifier) {
                                await window.parent.updateEpWatched(aniID, currentMangaData.chapter);
                                localStorage.setItem("anilist-last", identifier);
                            }
                        }
                        catch (err) {
                            console.warn(err);
                        }
                    })();
                }
                for (let i = 0; i < pagesDOM.length; i++) {
                    if (Math.abs(index - i) <= 3) {
                        const con = pagesDOM[i];
                        const elem = con.querySelector(".page");
                        const hasBeenLoaded = elem === null || elem === void 0 ? void 0 : elem.getAttribute("data-loaded");
                        if (elem && hasBeenLoaded !== "true") {
                            const index = i;
                            elem.onload = function () {
                                var _a, _b;
                                (_a = con.querySelector("#errorPageCon")) === null || _a === void 0 ? void 0 : _a.remove();
                                (_b = con.querySelector(".nextPrevPage")) === null || _b === void 0 ? void 0 : _b.remove();
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
            }
            else {
                container.prepend(padding);
            }
        }
        dirty = false;
        const currentPage = Math.max(Math.min(apiRes.data.time, totalPages - 1), 0);
        if (reversed) {
            setSliderValue(totalPages - currentPage + 1);
        }
        else {
            setSliderValue(currentPage);
        }
        (_a = pagesDOM[currentPage]) === null || _a === void 0 ? void 0 : _a.scrollIntoView({});
        updateChapterListSelected();
        scrollSnapFunc(false, currentPage);
        mainLoading.style.display = "none";
    }
    catch (err) {
        const errorPage = constructErrorPage(container, err === null || err === void 0 ? void 0 : err.toString(), {
            hasLink: false,
            hasReload: true,
            customConClass: "absolute",
            isError: false,
            reloadFunc: (event) => {
                window.location.reload();
            }
        });
        errorPage.addEventListener("click", handleMenu);
    }
}
function openPage(num) {
    var _a;
    (_a = pagesDOM[num]) === null || _a === void 0 ? void 0 : _a.scrollIntoView();
}
function closeSettings() {
    settingCon.style.display = "none";
    settingCon.setAttribute("data-open", "false");
}
function openSettings() {
    settingCon.style.display = "block";
    settingCon.setAttribute("data-open", "true");
}
function changeMode(mode) {
    if (mode === modes.NORMAL) {
        slider.classList.remove("reversed");
        container.classList.remove("reversed");
        reversed = false;
        const realPageNum = -parseInt(slider.value) + totalPages + 2 - 1;
        setSliderValue(realPageNum + 2);
    }
    else if (mode === modes.REVERSED) {
        slider.classList.add("reversed");
        container.classList.add("reversed");
        reversed = true;
        setSliderValue(totalPages - parseInt(slider.value) - 1);
    }
    if (scrollSnapFunc) {
        scrollSnapFunc(true);
    }
}
function togglePageNum(shouldShow) {
    if (shouldShow) {
        pageNumDOM.style.display = "block";
    }
    else {
        pageNumDOM.style.display = "none";
    }
}
function toggleArrows() {
    const shouldShow = localStorage.getItem("epub-hideArrows") === "true";
    if (shouldShow) {
        epubNext.style.display = "none";
        epubPrev.style.display = "none";
    }
    else {
        epubNext.style.display = "flex";
        epubPrev.style.display = "flex";
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
        "id": "episodes",
        "selectableScene": true,
        "scrollIntoView": true,
        "scrollOffset": 0,
        "heading": {
            "text": "Episodes",
        },
        "items": []
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
                "value": (_a = localStorage.getItem("manga-background")) !== null && _a !== void 0 ? _a : "#121212",
                "onInput": function (event) {
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
const epubMenu = new dropDownMenu([
    {
        "id": "initial",
        "heading": {
            "text": "Settings",
        },
        "items": [
            {
                "text": "Sections",
                "iconID": "epubSection",
                "open": "sections"
            },
            {
                "text": "Table of Contents",
                "iconID": "tocIcon",
                "open": "toc"
            },
            {
                "text": "Config",
                "iconID": "epubConfig",
                "open": "config"
            }
        ]
    },
    {
        "id": "sections",
        "heading": {
            "text": "Sections",
        },
        "selectableScene": true,
        "scrollIntoView": true,
        "scrollOffset": 0,
        "items": []
    },
    {
        "id": "toc",
        "heading": {
            "text": "Table of Contents",
        },
        "selectableScene": true,
        "scrollIntoView": true,
        "scrollOffset": 0,
        "items": []
    },
    {
        "id": "config",
        "heading": {
            "text": "Config",
        },
        "items": [
            {
                "toggle": true,
                "on": localStorage.getItem("epub-pageNum") === "false",
                "toggleOn": () => {
                    localStorage.setItem("epub-pageNum", "false");
                    togglePageNum(false);
                },
                "toggleOff": () => {
                    localStorage.setItem("epub-pageNum", "true");
                    togglePageNum(true);
                },
                "text": "Hide page number"
            },
            {
                "toggle": true,
                "on": localStorage.getItem("epub-hideArrows") === "false",
                "toggleOn": () => {
                    localStorage.setItem("epub-hideArrows", "true");
                    toggleArrows();
                },
                "toggleOff": () => {
                    localStorage.setItem("epub-hideArrows", "false");
                    toggleArrows();
                },
                "text": "Hide the arrows"
            },
            {
                "color": true,
                "value": (_b = localStorage.getItem("epub-background")) !== null && _b !== void 0 ? _b : "#121212",
                "onInput": function (event) {
                    container.style.backgroundColor = this.value;
                    localStorage.setItem("epub-background", this.value);
                },
                "text": "Background color",
                "attributes": {
                    "style": "display: flex; justify-content: space-between;"
                }
            },
            {
                "numberBox": true,
                "value": (_c = localStorage.getItem("epub-lineHeight")) !== null && _c !== void 0 ? _c : "",
                "text": "Line height",
                "attributes": {
                    "style": "display: flex; justify-content: space-between;"
                },
                "onInput": async function () {
                    if (loadingCfi)
                        return;
                    loadingCfi = true;
                    try {
                        localStorage.setItem("epub-lineHeight", this.value);
                        rendition.themes.default(constructTheme());
                        const currentCfi = rendition.currentLocation().start.cfi;
                        if (currentCfi) {
                            await rendition.display();
                            await rendition.display(currentCfi);
                        }
                    }
                    catch (err) {
                        console.warn(err);
                    }
                    finally {
                        loadingCfi = false;
                    }
                }
            },
            {
                "numberBox": true,
                "value": (_d = localStorage.getItem("epub-fontSize")) !== null && _d !== void 0 ? _d : "",
                "text": "Font size",
                "attributes": {
                    "style": "display: flex; justify-content: space-between;"
                },
                "onInput": async function () {
                    if (loadingCfi)
                        return;
                    loadingCfi = true;
                    try {
                        localStorage.setItem("epub-fontSize", this.value);
                        rendition.themes.default(constructTheme());
                        const currentCfi = rendition.currentLocation().start.cfi;
                        if (currentCfi) {
                            await rendition.display();
                            await rendition.display(currentCfi);
                        }
                    }
                    catch (err) {
                        console.warn(err);
                    }
                    finally {
                        loadingCfi = false;
                    }
                }
            },
            {
                "color": true,
                "value": (_e = localStorage.getItem("epub-fontColor")) !== null && _e !== void 0 ? _e : "",
                "text": "Font color",
                "attributes": {
                    "style": "display: flex; justify-content: space-between;"
                },
                "onInput": async function () {
                    if (loadingCfi)
                        return;
                    loadingCfi = true;
                    try {
                        localStorage.setItem("epub-fontColor", this.value);
                        rendition.themes.default(constructTheme());
                        const currentCfi = rendition.currentLocation().start.cfi;
                        if (currentCfi) {
                            await rendition.display();
                            await rendition.display(currentCfi);
                        }
                    }
                    catch (err) {
                        console.warn(err);
                    }
                    finally {
                        loadingCfi = false;
                    }
                }
            }
        ]
    },
], document.querySelector(".epubMenu"));
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
    }
    else {
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
    }
    else {
        closeSettings();
    }
});
document.querySelector(".bottomNavMenuItem.reloadIcon").addEventListener("click", function () {
    window.location.reload();
});
if (reversed) {
    changeMode(modes.REVERSED);
}
if (webcomic) {
    container.classList.replace("snappedCustomRooms", "webcomics");
}
container.style.backgroundColor = (_f = localStorage.getItem("manga-background")) !== null && _f !== void 0 ? _f : "#121212";
togglePageNum(localStorage.getItem("manga-pageNum") !== "false");
closeSettings();
ini();
