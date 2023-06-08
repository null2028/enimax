// @ts-ignore
const extensionNames = [...window.parent.returnExtensionNames()];
// @ts-ignore
const extensionList = [...window.parent.returnExtensionList()];
// @ts-ignore
const extensionDisabled = [...window.parent.returnExtensionDisabled()];
const queries = (new URLSearchParams(location.search));
const conElem = document.getElementById("con_11");
const searchQuery = queries.get("search");
const anilistExtension = window.parent.anilist;
// @ts-ignore
const backdrop = document.getElementsByClassName("backdrop")[0];
// @ts-ignore
const sourceChoiceDOM = document.getElementById("sourceChoice");
// @ts-ignore
const relationsCon = document.getElementById("relationsCon");
// @ts-ignore
const recomCon = document.getElementById("recomCon");
// @ts-ignore
const sourceCardsDOM = document.getElementById("sourceCards");
let engineID = queries.get("engine") || parseInt(localStorage.getItem("currentEngine"));
let currentCatIndex = 0;
// new menuPull(conElem, () => {
//     window.parent.postMessage({ "action": 500, data: "pages/homepage/index.html" }, "*");
//     conElem.style.transform = `translateX(100px)`;
// }, document.getElementById("mainConSearch"));
function sendNoti() {
    return document.createElement("div");
}
function search() {
    const conID = `room_${catIDs[currentCatIndex]}`;
    document.getElementById(conID).innerHTML = "<div style='margin:auto;'>Loading...</div>";
    let currentEngine;
    if (!engineID) {
        localStorage.setItem("currentEngine", "0");
        engineID = 0;
        localStorage.setItem(`search-current-${currentCatIndex}`, "0");
        currentEngine = extensionList[0];
    }
    else {
        currentEngine = engineID;
        if (currentEngine == 0 || isNaN(currentEngine)) {
            currentEngine = extensionList[0];
        }
        else {
            currentEngine = extensionList[currentEngine];
        }
    }
    if (searchInput.value === "devmode") {
        localStorage.setItem("devmode", "true");
    }
    const params = {
        genres: undefined,
        year: undefined,
        season: undefined,
        status: undefined,
        type: undefined,
        sort: undefined,
    };
    if (currentEngine === anilistExtension) {
        const year = parseInt(document.querySelector(".numberBox").value);
        params.genres = DMenu.selectedValues["genres"] ? DMenu.selectedValues["genres"] : undefined;
        params.season = DMenu.selectedValues["season"] ? DMenu.selectedValues["season"] : undefined;
        params.status = DMenu.selectedValues["status"] ? DMenu.selectedValues["status"] : undefined;
        params.type = DMenu.selectedValues["type"] ? DMenu.selectedValues["type"] : undefined;
        params.sort = DMenu.selectedValues["sort"] ? DMenu.selectedValues["sort"] : undefined;
        params.year = isNaN(year) ? undefined : year;
        for (const key in params) {
            if (params[key] === "Any") {
                params[key] = undefined;
            }
        }
    }
    currentEngine.searchApi(searchInput.value, params).then(function (x) {
        var _a, _b;
        searchInput.value = searchQuery;
        // Freaking chrome
        (_a = select.querySelector(`option[value="${engineID}"]`)) === null || _a === void 0 ? void 0 : _a.removeAttribute("selected");
        (_b = select.querySelector(`option[value="${engineID}"]`)) === null || _b === void 0 ? void 0 : _b.setAttribute("selected", "");
        let main_div = x.data;
        if (main_div.length == 0) {
            document.getElementById(conID).innerHTML = "";
            constructErrorPage(document.getElementById(conID), "No results", {
                hasLink: false,
                hasReload: false,
                isError: false,
                customConClass: "absolute"
            });
        }
        else {
            document.getElementById(conID).innerHTML = "";
        }
        for (var i = 0; i < main_div.length; i++) {
            const currentIndex = i;
            let tempDiv1 = createElement({ "class": "s_card" });
            let tempDiv2 = createElement({ "class": "s_card_bg" });
            let tempDiv3 = createElement({ "class": "s_card_title" });
            let tempDiv4 = createElement({ "class": "s_card_title_main", "innerText": main_div[i].name });
            let tempDiv5 = createElement({
                "element": "div", "class": "s_card_play",
                "attributes": {
                    "data-href": `pages/episode/index.html?watch=${main_div[i].link}`
                },
                "listeners": {
                    "click": function () {
                        if (anilistExtension === currentEngine) {
                            console.log(x.type);
                            fetchMapping(main_div[currentIndex].id, x.type);
                            openCon(sourceChoiceDOM, "flex");
                        }
                        else {
                            window.parent.postMessage({ "action": 500, data: this.getAttribute("data-href") }, "*");
                        }
                    }
                }
            });
            let tempDiv6 = createElement({ "class": "s_card_img_search", "style": { "backgroundImage": `url("${main_div[i].image}")` } });
            tempDiv3.append(tempDiv4);
            tempDiv2.append(tempDiv3);
            tempDiv2.append(tempDiv5);
            tempDiv1.append(tempDiv6);
            tempDiv1.append(tempDiv2);
            document.getElementById(conID).append(tempDiv1);
        }
    }).catch(function (error) {
        document.getElementById(conID).innerHTML = "";
        constructErrorPage(document.getElementById(conID), error.toString(), {
            hasLink: false,
            hasReload: false,
            isError: false,
            customConClass: "absolute",
        });
    });
}
let catCon = createElement({
    id: "categoriesCon",
    style: {
        position: "sticky",
        top: "0",
        zIndex: "2",
        margin: "0",
        boxSizing: "border-box",
        backgroundColor: "black"
    },
    innerHTML: `<div id="catActive">
                    <div style="position: absolute;" id="catActiveMain"></div>
                <div>`
});
let catDataCon = createElement({
    style: {
        width: "100%",
        whiteSpace: "nowrap"
    },
    id: "custom_rooms",
    class: "snappedCustomRooms"
});
const catDataCons = [];
const cats = ["Anime", "Manga", "TV/Movies", "Others"];
const catIDs = ["anime", "manga", "tv", "others"];
conElem.append(createElement({
    style: {
        marginTop: "15px",
        marginBottom: "10px"
    },
    children: [
        {
            class: "searchCon",
            children: [
                {
                    id: "back",
                    listeners: {
                        click: function () {
                            window.parent.postMessage({ "action": 500, data: `pages/homepage/index.html` }, "*");
                        }
                    }
                },
                {
                    element: "form",
                    listeners: {
                        submit: function (event) {
                            event.preventDefault();
                            window.parent.postMessage({ "action": 500, data: `pages/search/index.html?search=${searchInput.value}&engine=${engineID}` }, "*");
                        }
                    },
                    children: [
                        {
                            element: "input",
                            class: "searchInput",
                            attributes: {
                                type: "text",
                                placeholder: "Search sources"
                            }
                        }
                    ]
                },
                {
                    class: "searchButton",
                    listeners: {
                        click: function () {
                            window.parent.postMessage({ "action": 500, data: `pages/search/index.html?search=${searchInput.value}&engine=${engineID}` }, "*");
                        }
                    }
                },
                {
                    id: "filterIcon",
                    class: "hasBackground",
                    style: {
                        height: "40px",
                        width: "40px",
                        display: "none",
                        verticalAlign: "middle",
                        marginLeft: "15px"
                    },
                    listeners: {
                        click: function () {
                            DMenu.open("initial");
                            DMenu.openMenu();
                        }
                    }
                }
            ]
        },
    ]
}));
const DMenu = new dropDownMenu([
    {
        "id": "initial",
        "heading": {
            "text": "Filters",
        },
        "items": [
            {
                "text": "Genres",
                "iconID": "genreIcon",
                "open": "genres"
            },
            {
                "text": "Season",
                "iconID": "seasonIcon",
                "open": "season"
            },
            {
                "iconID": "yearIcon",
                "text": "Year",
                "numberBox": true,
                "value": localStorage.getItem("search-anilist-year"),
                "onInput": function (event) {
                    localStorage.setItem("search-anilist-year", event.target.value);
                }
            },
            {
                "text": "Status",
                "iconID": "statusIcon",
                "open": "status"
            },
            {
                "text": "Type",
                "iconID": "typeIcon",
                "open": "type"
            },
            {
                "text": "Sort by",
                "iconID": "sortIcon",
                "open": "sort"
            }
        ]
    },
    {
        "id": "genres",
        "heading": {
            "text": "Genres",
        },
        "selectableScene": true,
        "items": window.parent.anilist.genres.map((genre) => {
            return {
                "highlightable": true,
                "text": genre,
            };
        })
    },
    {
        "id": "genres",
        "heading": {
            "text": "Genres",
        },
        "selectableScene": true,
        "items": window.parent.anilist.genres.map((genre) => {
            return {
                "highlightable": true,
                "text": genre,
                "attributes": {
                    "data-value": genre
                },
                "selected": localStorage.getItem("search-anilist-genre") === genre,
                "callback": function () {
                    const val = this.getAttribute("data-value");
                    localStorage.setItem("search-anilist-genre", val);
                },
            };
        })
    },
    {
        "id": "season",
        "heading": {
            "text": "Seasons",
        },
        "selectableScene": true,
        "items": window.parent.anilist.seasons.map((season) => {
            return {
                "highlightable": true,
                "text": season,
                "attributes": {
                    "data-value": season
                },
                "selected": localStorage.getItem("search-anilist-season") === season,
                "callback": function () {
                    const val = this.getAttribute("data-value");
                    localStorage.setItem("search-anilist-season", val);
                },
            };
        })
    },
    {
        "id": "status",
        "heading": {
            "text": "Status",
        },
        "selectableScene": true,
        "items": window.parent.anilist.status.map((status) => {
            return {
                "highlightable": true,
                "text": status,
                "attributes": {
                    "data-value": status
                },
                "selected": localStorage.getItem("search-anilist-status") === status,
                "callback": function () {
                    const val = this.getAttribute("data-value");
                    localStorage.setItem("search-anilist-status", val);
                },
            };
        })
    },
    {
        "id": "type",
        "heading": {
            "text": "Type",
        },
        "selectableScene": true,
        "items": window.parent.anilist.mediaType.map((type) => {
            return {
                "highlightable": true,
                "text": type,
                "attributes": {
                    "data-value": type
                },
                "selected": localStorage.getItem("search-anilist-type") ? localStorage.getItem("search-anilist-type") === type : type === "Anime",
                "callback": function () {
                    const val = this.getAttribute("data-value");
                    localStorage.setItem("search-anilist-type", val);
                },
            };
        })
    },
    {
        "id": "sort",
        "heading": {
            "text": "Sort By",
        },
        "selectableScene": true,
        "items": window.parent.anilist.sortBy.map((sort) => {
            return {
                "highlightable": true,
                "text": sort,
                "attributes": {
                    "data-value": sort
                },
                "selected": localStorage.getItem("search-anilist-sort") === sort,
                "callback": function () {
                    const val = this.getAttribute("data-value");
                    localStorage.setItem("search-anilist-sort", val);
                },
            };
        })
    },
], document.querySelector(".menuCon"));
conElem.append(createElement({
    style: {
        textAlign: "center"
    },
    children: [
        {
            element: "select",
            style: {
                display: "inline-block",
                verticalAlign: "middle",
                margin: "0"
            }
        }
    ]
}));
for (let i = 0; i < cats.length; i++) {
    catCon.append(createCat(`room_${catIDs[i]}`, cats[i], 1));
    catDataCons.push(createElement({
        class: `categoriesDataMain snappedCategoriesDataMain`,
        style: {
            minWidth: "100%",
        },
        id: `room_${catIDs[i]}`,
        children: [
            {
                style: {
                    height: "100%",
                    width: "100%"
                }
            }
        ]
    }));
    catDataCon.append(catDataCons[catDataCons.length - 1]);
}
let scrollLastIndex;
let tempCatDOM = catCon.querySelectorAll(".categories");
let cusRoomDOM = catDataCon;
const select = document.querySelector("select");
const filterIcon = document.querySelector("#filterIcon");
select.onchange = function () {
    engineID = parseInt(this.value);
    if (engineID !== 11) {
        DMenu.closeMenu();
        filterIcon.style.display = "none";
    }
    else {
        filterIcon.style.display = "inline-block";
    }
    localStorage.setItem("currentEngine", engineID.toString());
    localStorage.setItem(`search-current-${currentCatIndex}`, engineID.toString());
};
scrollSnapFunc = function (shouldScroll = true, customIndex = null) {
    let unRoundedIndex = cusRoomDOM.scrollLeft / cusRoomDOM.offsetWidth;
    let index = Math.round(unRoundedIndex);
    if (customIndex !== null) {
        index = customIndex;
    }
    if (index != scrollLastIndex || customIndex !== null) {
        currentCatIndex = index;
        for (let i = 0; i < tempCatDOM.length; i++) {
            if (i == index) {
                tempCatDOM[i].classList.add("activeCat");
                if (shouldScroll) {
                    tempCatDOM[i].scrollIntoView();
                }
                if (customIndex !== null) {
                    catDataCons[i].scrollIntoView();
                }
                select.innerHTML = "";
                let check = false;
                let firstIndex = -1;
                for (let i = 0; i < extensionList.length; i++) {
                    if (extensionDisabled[i] || extensionList[i].type != catIDs[index]) {
                        continue;
                    }
                    if (firstIndex == -1) {
                        firstIndex = i;
                    }
                    let atr = {
                        "value": i.toString(),
                    };
                    if (i == parseInt(localStorage.getItem(`search-current-${currentCatIndex}`))) {
                        localStorage.setItem("currentEngine", i.toString());
                        localStorage.setItem(`search-current-${currentCatIndex}`, i.toString());
                        engineID = i;
                        atr["selected"] = "";
                        check = true;
                        if (engineID === 11) {
                            filterIcon.style.display = "inline-block";
                        }
                        else {
                            filterIcon.style.display = "none";
                        }
                    }
                    let tempDiv = createElement({
                        "element": "option",
                        "attributes": atr,
                        "innerHTML": extensionNames[i]
                    });
                    select.append(tempDiv);
                }
                if (check === false && customIndex === null && firstIndex != -1) {
                    engineID = firstIndex;
                    localStorage.setItem("currentEngine", firstIndex.toString());
                    localStorage.setItem(`search-current-${currentCatIndex}`, firstIndex.toString());
                }
                lastScrollElem = document.getElementById(tempCatDOM[i].getAttribute("data-id"));
            }
            else {
                tempCatDOM[i].classList.remove("activeCat");
            }
        }
        let activeCatDOM = document.querySelector(".categories.activeCat");
        let temp = document.getElementById("catActiveMain");
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                if (temp && activeCatDOM) {
                    temp.style.left = (parseFloat(activeCatDOM.offsetLeft.toString())) + "px";
                    temp.style.height = activeCatDOM.offsetHeight.toString();
                    temp.style.width = activeCatDOM.offsetWidth.toString();
                }
            });
        });
    }
    scrollLastIndex = index;
};
catDataCon.addEventListener("scroll", () => { scrollSnapFunc(); }, { "passive": true });
conElem.append(catDataCon);
conElem.append(catCon);
engineID = parseInt(localStorage.getItem("currentEngine"));
if (searchQuery) {
    engineID = parseInt(queries.get("engine"));
}
for (let i = 0; i < catIDs.length; i++) {
    constructErrorPage(document.getElementById(`room_${catIDs[i]}`), "Start searching by clicking on the search icon above!", {
        hasLink: false,
        hasReload: false,
        isError: false,
        customConClass: "absolute",
        positive: true
    });
    new pullToRefresh(document.getElementById(`room_${catIDs[i]}`));
}
const searchInput = document.querySelector(".searchInput");
scrollSnapFunc(true, catIDs.indexOf(extensionList[engineID].type));
new menuPull(conElem, () => {
    window.parent.postMessage({ "action": 500, data: "pages/homepage/index.html" }, "*");
    conElem.style.transform = `translateX(100px)`;
}, document.getElementById("custom_rooms"));
if (searchQuery || searchQuery === "") {
    engineID = parseInt(queries.get("engine"));
    searchInput.value = searchQuery;
    search();
}
iniChoiceDOM(130);
