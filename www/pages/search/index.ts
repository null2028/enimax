// @ts-ignore
const extensionNames = (<cordovaWindow>window.parent).returnExtensionNames();
// @ts-ignore
const extensionList = (<cordovaWindow>window.parent).returnExtensionList();
// @ts-ignore
const extensionDisabled = (<cordovaWindow>window.parent).returnExtensionDisabled();
const queries = (new URLSearchParams(location.search));
const conElem = document.getElementById("con_11");
const searchQuery = queries.get("search");

let engineID = queries.get("engine") || parseInt(localStorage.getItem("currentEngine"));
let currentCatIndex = 0;

// new menuPull(conElem, () => {
//     window.parent.postMessage({ "action": 500, data: "pages/homepage/index.html" }, "*");
//     conElem.style.transform = `translateX(100px)`;
// }, document.getElementById("mainConSearch"));

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
    currentEngine.searchApi(searchInput.value).then(function (x) {
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
                }
            ]
        },
    ]
}));

conElem.append(
    createElement({
        element: "select"
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

select.onchange = function () {
    engineID = parseInt((this as HTMLInputElement).value);
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

                    if(firstIndex == -1){
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
                    }

                    let tempDiv = createElement(<createElementConfig>{
                        "element": "option",
                        "attributes": atr,
                        "innerHTML": extensionNames[i]
                    });
                    

                    select.append(tempDiv);
                }

                console.log(firstIndex, check, customIndex, engineID);

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

    new pullToRefresh(document.getElementById(`room_${catIDs[i]}`)));
}

const searchInput = (document.querySelector(".searchInput") as HTMLInputElement);
scrollSnapFunc(true, catIDs.indexOf(extensionList[engineID].type));

new menuPull(conElem, () => {
    window.parent.postMessage({ "action": 500, data: "pages/homepage/index.html" }, "*");
    conElem.style.transform = `translateX(100px)`;
}, document.getElementById("custom_rooms"));


if (searchQuery) {
    engineID = parseInt(queries.get("engine"));
    searchInput.value = searchQuery;
    search();
}