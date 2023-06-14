// @ts-ignore
const extensionNames = [...(<cordovaWindow>window.parent).returnExtensionNames()];
// @ts-ignore
const extensionList = [...(<cordovaWindow>window.parent).returnExtensionList()];
// @ts-ignore
const extensionDisabled = [...(<cordovaWindow>window.parent).returnExtensionDisabled()];

const queries = (new URLSearchParams(location.search));
const conElem = document.getElementById("con_11");
const searchQuery = queries.get("search");

const anilistExtension = (<cordovaWindow>window.parent).anilist;
// @ts-ignore
const backdrop = document.getElementsByClassName("backdrop")[0] as HTMLImageElement;
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
    } else {
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
        tags: undefined,
    };

    if (currentEngine === anilistExtension) {
        const year = parseInt((document.querySelector(".numberBox") as HTMLInputElement).value);

        params.genres = DMenu.selectedValues["genres"] ? DMenu.selectedValues["genres"] : undefined;
        params.season = DMenu.selectedValues["season"] ? DMenu.selectedValues["season"] : undefined;
        params.status = DMenu.selectedValues["status"] ? DMenu.selectedValues["status"] : undefined;
        params.type = DMenu.selectedValues["type"] ? DMenu.selectedValues["type"] : undefined;
        params.sort = DMenu.selectedValues["sort"] ? DMenu.selectedValues["sort"] : undefined;
        params.tags = DMenu.selectedValues["tags"] ? DMenu.selectedValues["tags"] : undefined;
        params.year = isNaN(year) ? undefined : year;

        for (const key in params) {
            if (params[key] === "Any") {
                params[key] = undefined;
            }
        }
    }

    currentEngine.searchApi(searchInput.value, params).then(function (x) {
        searchInput.value = searchQuery;

        // Freaking chrome
        select.querySelector(`option[value="${engineID}"]`)?.removeAttribute("selected");
        select.querySelector(`option[value="${engineID}"]`)?.setAttribute("selected", "");

        let main_div = x.data;

        if (main_div.length == 0) {
            document.getElementById(conID).innerHTML = "";
            constructErrorPage(
                document.getElementById(conID),
                "No results",
                {
                    hasLink: false,
                    hasReload: false,
                    isError: false,
                    customConClass: "absolute"
                }
            )
        } else {
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
                        } else {
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

    }).catch(function (error: searchError) {
        document.getElementById(conID).innerHTML = "";

        constructErrorPage(
            document.getElementById(conID),
            error.toString(),
            {
                hasLink: false,
                hasReload: false,
                isError: false,             // It already has the "Error:" prefix, so this is not needed
                customConClass: "absolute",
            }
        );
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
                        submit: function (event: SubmitEvent) {
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
                            openSettingsSemi(-1);
                        }
                    }
                }
            ]
        },
    ]
}));


const DMenu = new dropDownMenu(
    [
        {
            "id": "initial",
            "heading": {
                "text": "Filters",
            },
            "items": [
                {
                    "text": "Reset",
                    "callback": () => {
                        DMenu.selections["genre-Any"].selectWithCallback();
                        DMenu.selections["season-Any"].selectWithCallback();
                        DMenu.selections["status-Any"].selectWithCallback();
                        DMenu.selections["tags-Any"].selectWithCallback();
                        DMenu.selections["type-Anime"].selectWithCallback();
                        DMenu.selections["sort-Popularity"].selectWithCallback();
                        (document.querySelector(".numberBox") as HTMLInputElement).value = "";
                    },
                    "classes": ["menuCenter"]
                },
                {
                    "text": "Genres",
                    "iconID": "genreIcon",
                    "open": "genres"
                },
                {
                    "text": "Tags",
                    "iconID": "genreIcon",
                    "open": "tags"
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
                    "onInput": function (event: InputEvent) {
                        localStorage.setItem("search-anilist-year", (event.target as HTMLInputElement).value);
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
            "items": (window.parent as cordovaWindow).anilist.genres.map((genre: string) => {
                return {
                    "highlightable": true,
                    "text": genre,
                }
            })
        },
        {
            "id": "genres",
            "heading": {
                "text": "Genres",
            },
            "selectableScene": true,
            "items": (window.parent as cordovaWindow).anilist.genres.map((genre: string) => {
                return {
                    "highlightable": true,
                    "id": genre === "Any" ? `genre-${genre}` : undefined,
                    "text": genre,
                    "attributes": {
                        "data-value": genre
                    },
                    "selected": localStorage.getItem("search-anilist-genre") === genre,
                    "callback": function () {
                        const val = this.getAttribute("data-value");
                        localStorage.setItem("search-anilist-genre", val);
                    },
                } as menuItemConfig
            })
        },
        {
            "id": "season",
            "heading": {
                "text": "Seasons",
            },
            "selectableScene": true,
            "items": (window.parent as cordovaWindow).anilist.seasons.map((season: string) => {
                return {
                    "highlightable": true,
                    "id": season === "Any" ? `season-${season}` : undefined,
                    "text": season,
                    "attributes": {
                        "data-value": season
                    },
                    "selected": localStorage.getItem("search-anilist-season") === season,
                    "callback": function () {
                        const val = this.getAttribute("data-value");
                        localStorage.setItem("search-anilist-season", val);
                    },
                } as menuItemConfig
            })
        },
        {
            "id": "status",
            "heading": {
                "text": "Status",
            },
            "selectableScene": true,
            "items": (window.parent as cordovaWindow).anilist.status.map((status: string) => {
                return {
                    "highlightable": true,
                    "id": status === "Any" ? `status-${status}` : undefined,
                    "text": status,
                    "attributes": {
                        "data-value": status
                    },
                    "selected": localStorage.getItem("search-anilist-status") === status,
                    "callback": function () {
                        const val = this.getAttribute("data-value");
                        localStorage.setItem("search-anilist-status", val);
                    },
                } as menuItemConfig
            })
        },
        {
            "id": "type",
            "heading": {
                "text": "Type",
            },
            "selectableScene": true,
            "items": (window.parent as cordovaWindow).anilist.mediaType.map((type: string) => {
                return {
                    "highlightable": true,
                    "id": type === "Anime" ? `type-${type}` : undefined,
                    "text": type,
                    "attributes": {
                        "data-value": type
                    },
                    "selected": localStorage.getItem("search-anilist-type") ? localStorage.getItem("search-anilist-type") === type : type === "Anime",
                    "callback": function () {
                        const val = this.getAttribute("data-value");
                        localStorage.setItem("search-anilist-type", val);
                    },
                } as menuItemConfig
            })
        },
        {
            "id": "sort",
            "heading": {
                "text": "Sort By",
            },
            "selectableScene": true,
            "items": (window.parent as cordovaWindow).anilist.sortBy.map((sort: string) => {
                return {
                    "highlightable": true,
                    "id": sort === "Popularity" ? `sort-${sort}` : undefined,
                    "text": sort,
                    "attributes": {
                        "data-value": sort
                    },
                    "selected": localStorage.getItem("search-anilist-sort") === sort,
                    "callback": function () {
                        const val = this.getAttribute("data-value");
                        localStorage.setItem("search-anilist-sort", val);
                    },
                } as menuItemConfig
            })
        },
        {
            "id": "tags",
            "heading": {
                "text": "Tags",
            },
            "selectableScene": true,
            "items": (window.parent as cordovaWindow).anilist.tags.map((tags: string) => {
                return {
                    "highlightable": true,
                    "id": tags === "Any" ? `tags-${tags}` : undefined,
                    "text": tags,
                    "attributes": {
                        "data-value": tags
                    },
                    "selected": localStorage.getItem("search-anilist-tags") === tags,
                    "callback": function () {
                        const val = this.getAttribute("data-value");
                        localStorage.setItem("search-anilist-tags", val);
                    },
                } as menuItemConfig
            })
        },

    ], document.querySelector(".menuCon"));


conElem.append(
    createElement({
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
    })
);




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
const filterIcon = document.querySelector("#filterIcon") as HTMLElement;

select.onchange = function () {
    engineID = parseInt((this as HTMLInputElement).value);

    if (engineID !== 11) {
        DMenu.closeMenu();
        filterIcon.style.display = "none";
    } else {
        filterIcon.style.display = "inline-block";
    }

    localStorage.setItem("currentEngine", engineID.toString());
    localStorage.setItem(`search-current-${currentCatIndex}`, engineID.toString());
};


scrollSnapFunc = function (shouldScroll = true, customIndex: number | null = null) {
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

                    let atr: any = {
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
                        } else {
                            filterIcon.style.display = "none";
                        }
                    }

                    let tempDiv = createElement(<createElementConfig>{
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
            } else {
                tempCatDOM[i].classList.remove("activeCat");
            }
        }

        let activeCatDOM = document.querySelector(".categories.activeCat") as HTMLElement;
        let temp = document.getElementById("catActiveMain") as HTMLElement;

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

catDataCon.addEventListener("scroll", () => { scrollSnapFunc() }, { "passive": true });
conElem.append(catDataCon);
conElem.append(catCon);
engineID = parseInt(localStorage.getItem("currentEngine"));

if (searchQuery) {
    engineID = parseInt(queries.get("engine"));
}

for (let i = 0; i < catIDs.length; i++) {
    constructErrorPage(
        document.getElementById(`room_${catIDs[i]}`),
        "Start searching by clicking on the search icon above!",
        {
            hasLink: false,
            hasReload: false,
            isError: false,
            customConClass: "absolute",
            positive: true
        }
    );

    new pullToRefresh(document.getElementById(`room_${catIDs[i]}`));
}

const searchInput = (document.querySelector(".searchInput") as HTMLInputElement);

if(isNaN(engineID)){
    engineID = 0;
}

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

function openSettingsSemi(translateY: number) {
    let settingCon = document.querySelector<HTMLElement>(".menuCon");
    settingCon.style.display = "block";
    settingCon.style.pointerEvents = "auto";
    settingCon.style.opacity = "1";
    if (translateY == -1) {
        settingCon.style.transform = "translate(-50%, 0px)";
    } else if (translateY == 0) {
        settingCon.style.transform = "translate(-50%, 100%)";

    } else {
        settingCon.style.transform = `translate(-50%, calc(100% + ${-translateY + 50}px))`;
    }

}

function closeSettings() {
    let settingCon = document.querySelector<HTMLElement>(".menuCon");
    settingCon.style.transitionDuration = "0.2s";
    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            settingCon.style.transform = "translate(-50%, 100%)";
            settingCon.style.opacity = "0";
            settingCon.style.pointerEvents = "none";
            setTimeout(function () {
                settingCon.style.transitionDuration = "0s";
            }, 200);
        });
    });
}

new settingsPull(document.getElementById("settingHandlePadding"), closeSettings);
new settingsPull(document.querySelector(".menuCon"), closeSettings, true);

iniChoiceDOM(130);