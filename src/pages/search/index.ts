// @ts-ignore
const extensionNames = (<cordovaWindow>window.parent).returnExtensionNames();
// @ts-ignore
const extensionList = (<cordovaWindow>window.parent).returnExtensionList();
// @ts-ignore
const extensionDisabled = (<cordovaWindow>window.parent).returnExtensionDisabled();

let sourcesNames = extensionNames;
const queries = (new URLSearchParams(location.search));

// @ts-ignore
let pullTabArray: Array<pullToRefresh> = [];
let engineID = queries.get("engine") || localStorage.getItem("currentEngine");
const searchQuery = queries.get("search");


pullTabArray.push(new pullToRefresh(document.getElementById("mainConSearch")));

for (var i = 0; i < extensionList.length; i++) {
    if (extensionDisabled[i]) {
        continue;
    }
    let atr: any = {
        "value": i.toString(),
    };

    if (i == parseInt(engineID) || (isNaN(parseInt(engineID)) && i == 0)) {
        atr["selected"] = "";
    }
    let tempDiv = createElement(<createElementConfig>{
        "element": "option",
        "attributes": atr,
        "innerHTML": sourcesNames[i]
    });

    document.getElementById("sources").append(tempDiv);
}

let searchInput = document.querySelector('.searchInput') as HTMLInputElement;
let searchBox = document.querySelector('.searchBox') as HTMLInputElement;
let searchButton = document.querySelector('.searchButton') as HTMLInputElement;
let searchClose = document.getElementById('s_c') as HTMLInputElement;


document.getElementById("sources").onchange = function () {
    engineID = (this as HTMLInputElement).value;
    localStorage.setItem("currentEngine", engineID);
};

document.getElementById("back").onclick = function () {
    window.parent.postMessage({ "action": 500, data: `pages/homepage/index.html` }, "*");
};

searchBox.onclick = function () {
    openSearch();
}

searchClose.onclick = function (event) {
    close_search(event);
}

constructErrorPage(
    document.getElementById("mainConSearch"),
    "Start searching by clicking on the search icon above!",
    {
        hasLink: false,
        hasReload: false,
        isError: false,
        customConClass: "absolute",
        positive: true
    }
)

function openSearch() {
    searchInput.style.width = 'calc(100% - 50px)';
    searchBox.style.width = 'calc(100% - 70px)';
    searchClose.style.display = 'flex';
    searchInput.style.paddingLeft = '40px';
    searchButton.onclick = function () { search(); }
}

function close_search(event: Event) {
    searchClose.style.display = 'none';
    searchInput.style.width = '0';
    searchInput.style.paddingLeft = '0';
    searchBox.style.width = '40px';
    searchButton.onclick = function () { };
    event.stopPropagation();
}


document.getElementById("searchForm").onsubmit = function (event) {
    event.preventDefault();
    window.parent.postMessage({ "action": 500, data: `pages/search/index.html?search=${searchInput.value}&engine=${engineID}` }, "*");
};

function search() {
    document.getElementById("mainConSearch").innerHTML = "<div style='margin:auto;'>Loading...</div>";

    let currentEngine;
    if (!engineID) {
        localStorage.setItem("currentEngine", "0");
        currentEngine = extensionList[0];
    } else {
        currentEngine = parseInt(engineID);
        if (currentEngine == 0 || isNaN(currentEngine)) {
            currentEngine = extensionList[0];
        }
        else{
            currentEngine = extensionList[currentEngine];
        }
    }
    if (searchInput.value === "devmode") {
        localStorage.setItem("devmode", "true");
    }
    currentEngine.searchApi(searchInput.value).then(function (x) {
        searchInput.value = searchQuery;
        (document.getElementById("sources") as HTMLInputElement).value = engineID;

        let main_div = x.data;

        if (main_div.length == 0) {
            document.getElementById("mainConSearch").innerHTML = "";
            constructErrorPage(
                document.getElementById("mainConSearch"),
                "No results",
                {
                    hasLink: false,
                    hasReload: false,
                    isError: false,
                    customConClass: "absolute"
                }
            )
        } else {
            document.getElementById("mainConSearch").innerHTML = "";
        }

        for (var i = 0; i < main_div.length; i++) {
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
                        window.parent.postMessage({ "action": 500, data: this.getAttribute("data-href") }, "*");

                    }
                }
            });
            let tempDiv6 = createElement({ "class": "s_card_img_search", "style": { "backgroundImage": `url("${main_div[i].image}")` } });
            tempDiv3.append(tempDiv4);
            tempDiv2.append(tempDiv3);
            tempDiv2.append(tempDiv5);
            tempDiv1.append(tempDiv6);
            tempDiv1.append(tempDiv2);

            document.getElementById("mainConSearch").append(tempDiv1);

        }

    }).catch(function (error: searchError) {
        document.getElementById("mainConSearch").innerHTML = "";

        constructErrorPage(
            document.getElementById("mainConSearch"),
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

applyTheme();


if (searchQuery) {
    searchInput.value = searchQuery;
    openSearch();
    search();
}

let conElem = document.getElementById("con_11");

new menuPull(conElem, () => {
    window.parent.postMessage({ "action": 500, data: "pages/homepage/index.html" }, "*");
    conElem.style.transform = `translateX(100px)`;
}, document.getElementById("mainConSearch"));



// let catCon = createElement({
//     id: "categoriesCon",
//     style: {
//         position: "sticky",
//         top: "0",
//         zIndex: "2",
//         margin: "0",
//         boxSizing: "border-box",
//         backgroundColor: "black"
//     },
//     innerHTML: `<div id="catActive">
//                     <div style="position: absolute;background: red;" id="catActiveMain"></div>
//                 <div>`
// });

// let catDataCon = createElement({
//     style: {
//         width: "100%",
//         whiteSpace: "nowrap"
//     },
//     id: "custom_rooms",
//     class: "snappedCustomRooms"
// });


// const catDataCons = [];
// const cats = ["Anime", "TV/Movies", "K-Drama", "Others"];
// const catIDs = ["anime", "tv", "kdrama", "others"];

// for (let i = 0; i < cats.length; i++) {
//     catCon.append(createCat(`room_${catIDs[i]}`, cats[i], 1));
//     catDataCons.push(createElement({
//         "class": `categoriesDataMain snappedCategoriesDataMain`,
//         style: {
//             "min-width": "100%"
//         },
//         "id": `room_${catIDs[i]}`
//     }));

//     catDataCon.append(catDataCons[catDataCons.length - 1]);
// }


// let scrollLastIndex;
// let tempCatDOM = document.getElementsByClassName("categories");
// let cusRoomDOM = document.getElementById("custom_rooms");
// scrollSnapFunc = function (shouldScroll = true) {
//     let unRoundedIndex = cusRoomDOM.scrollLeft / cusRoomDOM.offsetWidth;
//     let index = Math.round(unRoundedIndex);

//     if (index != scrollLastIndex) {
//         for (let i = 0; i < tempCatDOM.length; i++) {
//             if (i == index) {
//                 tempCatDOM[i].classList.add("activeCat");
//                 if (shouldScroll) {
//                     tempCatDOM[i].scrollIntoView();
//                 }
//                 lastScrollElem = document.getElementById(tempCatDOM[i].getAttribute("data-id"));
//             } else {
//                 tempCatDOM[i].classList.remove("activeCat");
//             }
//         }

//         let activeCatDOM = document.querySelector(".categories.activeCat") as HTMLElement;
//         let temp = document.getElementById("catActiveMain") as HTMLElement;
//         window.requestAnimationFrame(function () {
//             window.requestAnimationFrame(function () {
//                 if (temp && activeCatDOM) {
//                     temp.style.left = (parseFloat(activeCatDOM.offsetLeft.toString()) - 10) + "px";
//                     temp.style.height = activeCatDOM.offsetHeight.toString();
//                     temp.style.width = activeCatDOM.offsetWidth.toString();
//                 }

//                 clearTimeout(displayTimeout);
//                 displayTimeout = setTimeout(() => {
//                     let foundCurrentCon = false;
//                     for (let i = 0; i < tempCatDOM.length; i++) {
//                         const dataCon = document.getElementById(tempCatDOM[i].getAttribute("data-id"));
//                         const prevCon = document.getElementById(tempCatDOM[i - 1]?.getAttribute("data-id"));

//                         if (i == index) {
//                             foundCurrentCon = true;
//                             prevCon?.classList.remove("closed");
//                             dataCon.classList.remove("closed");
//                         } else {

//                             if (foundCurrentCon) {
//                                 dataCon.classList.remove("closed");
//                                 foundCurrentCon = false;
//                             }
//                             else if (dataCon) {
//                                 dataCon.classList.add("closed");
//                             }
//                         }
//                     }

//                 }, 250);
//             });
//         });
//     }
//     scrollLastIndex = index;
// };
// conElem.addEventListener("scroll", () => { scrollSnapFunc() }, { "passive": true });


// conElem.append(catCon);
// conElem.append(catDataCon);