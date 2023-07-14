const anilistStatus = ["CURRENT", "PLANNING", "COMPLETED", "DROPPED", "PAUSED", "REPEATING"];

function returnAnilistStatus() {
    return anilistStatus;
}

async function makeAnilistReq(query: string, variables: any, accessToken: string) {
    try {
        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        });

        if (response.status === 400) {
            throw Error("It seems like you are not logged in to anilist, or the session expired. Log in again to get rid of this error.");
        } else {
            return await response.text();
        }

    } catch (err) {

        if ("mediaId" in variables && "progress" in variables) {
            const variablesString = JSON.stringify(variables);

            if (variablesString !== localStorage.getItem("anilist-last-error")) {
                thisWindow.Dialogs.alert(err);
                localStorage.setItem("anilist-last-error", variablesString);
            }
        } else {
            thisWindow.Dialogs.alert(err);
        }
        throw Error("Could not update");
    }
}

async function updateEpWatched(anilistID: any, epNum: any) {
    if (localStorage.getItem("anon-anilist") === "true") {
        return;
    }

    const accessToken = localStorage.getItem("anilist-token");

    if (!accessToken || isNaN(parseInt(anilistID)) || isNaN(parseInt(epNum))) {
        return;
    }

    const mediaId = anilistID;
    const progress = parseInt(epNum);   // Anilist can't take float values

    const query = `mutation ($mediaId: Int, $progress: Int) {
                        SaveMediaListEntry (mediaId: $mediaId, progress: $progress) {
                            id
                            status
                            progress
                        }
                    }`;

    const variables = {
        mediaId: mediaId,
        progress: progress
    };

    await makeAnilistReq(query, variables, accessToken);
}

async function deleteAnilistShow(anilistID: any) {
    try {
        const accessToken = localStorage.getItem("anilist-token");

        if (!accessToken || isNaN(parseInt(anilistID))) {
            return;
        }

        const query = `query($mediaId:Int){
                            Media(id:$mediaId){
                                mediaListEntry{
                                    id
                                }
                            }
                    }`;

        const getIDvariables = {
            mediaId: anilistID
        };

        const listID = JSON.parse(await makeAnilistReq(query, getIDvariables, accessToken))?.data?.Media?.mediaListEntry?.id;

        if (listID) {
            const deleteQuery = `mutation ($id: Int) {
                        DeleteMediaListEntry (id: $id) {
                            deleted
                        }
                   }`;

            const variables = {
                id: listID
            };

            await makeAnilistReq(deleteQuery, variables, accessToken);
        } else {
            throw Error("Could not find the show on your anilist account");
        }

        sendNoti([4, null, "Alert", "Deleted the show from your anilist account"]);
    } catch (err) {
        sendNoti([4, "red", "Alert", err])
    }
}

async function getUserID() {
    const accessToken = localStorage.getItem("anilist-token");

    if (!accessToken) {
        return;
    }


    const query = `query {
                        Viewer {
                            id
                        }
                    }`;

    return JSON.parse(await makeAnilistReq(query, {}, accessToken)).data.Viewer.id;
}

function addRoom(roomName: string): Promise<any> {
    return new Promise((resolve, reject) => {

        setTimeout(() => {
            reject(new Error("timeout"));
        }, 5000);

        (<cordovaWindow>window.parent).apiCall("POST", {
            "action": 10,
            "username": "",
            "room": roomName
        }, (response) => {
            resolve(response);
        });
    });
}

function getUserData() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error("timeout"));
        }, 5000);

        (<cordovaWindow>window.parent).apiCall("POST", {
            "action": 4,
            "username": "",
        }, (response) => {
            resolve(response);
        });
    });
}

async function addShowToLib(data: { name: string, img: string, url: string, currentURL: string, currentEp: number, categoryID: number }) {
    apiCall("POST", {
        "username": "",
        "action": 5,
        "name": data.name,
        "img": data.img,
        "url": data.url
    }, () => {
        apiCall("POST",
            {
                "username": "",
                "action": 2,
                "name": data.name,
                "cur": data.currentURL,
                "ep": data.currentEp
            }, () => { });

        if (!isNaN(data.categoryID)) {
            apiCall("POST",
                {
                    "username": "",
                    "action": 7,
                    "name": data.name,
                    "state": data.categoryID
                }, () => { });
        }

    });
}

async function updateAnilistStatus(aniID: any) {
    const statuses = anilistStatus as anilistStatus[];
    let promptObj = [];

    for (let i = 0; i < statuses.length; i++) {
        promptObj.push({
            value: statuses[i],
            realValue: statuses[i]
        });
    }

    let status: anilistStatus = await (window.parent as cordovaWindow).Dialogs.prompt("Select the status", "", "select", promptObj) as anilistStatus;
    let permNoti: notification;

    if (status) {
        try {
            permNoti = sendNoti([0, null, "Alert", "Trying to update the status..."]);
            await (window.parent as cordovaWindow).changeShowStatus(aniID, status);
            permNoti.updateBody("Updated!");
            permNoti.notiTimeout(4000);
        } catch (err) {
            permNoti.remove();
            sendNoti([4, "red", "Alert", err]);
        }
    } else {
        await (window.parent as cordovaWindow).Dialogs.alert("Aborting");
    }
}

async function changeShowStatus(anilistID: any, status: anilistStatus) {
    const accessToken = localStorage.getItem("anilist-token");

    if (!accessToken || isNaN(parseInt(anilistID))) {
        return;
    }

    const query = `mutation($mediaId: Int, $status: MediaListStatus) {
                        SaveMediaListEntry (mediaId: $mediaId, status: $status) {
                            id
                            status
                        }
                    }`;

    const variables = {
        mediaId: anilistID,
        status
    };

    await makeAnilistReq(query, variables, accessToken);
}

async function infoPromise(showURL: string, engine: extension, index: number) {
    const result = await engine.getAnimeInfo(showURL.replace("?watch=/", ""));

    return {
        index,
        result
    };
}

async function batchPromises(showURLs: { showURL: string, engine: extension }[], batchSize: number, links: AnilistLinks, permNoti: notification) {
    const allSettled = "allSettled" in Promise;
    const promises: Array<Promise<{ index: number, result: extensionInfo }>> = [];

    for (let i = 0; i < showURLs.length; i++) {
        const showURL = showURLs[i].showURL;

        permNoti.updateBody(showURL);
        promises.push(infoPromise(showURL, showURLs[i].engine, i));

        if (promises.length >= batchSize || i == showURLs.length - 1) {
            if (allSettled) {
                const res = await Promise.allSettled(promises);

                for (const promise of res) {
                    if (promise.status === "fulfilled") {
                        links[promise.value.index].result = promise.value.result;
                    }
                }
            } else {
                try {
                    const res = await Promise.all(promises);

                    for (const result of res) {
                        links[result.index].result = result.result;
                    }
                } catch (err) {
                    console.warn(err);
                }
            }

            promises.splice(0);
        }
    }
}

async function malsyncPromise(url: string, id: number) {
    const result = await MakeFetch(url);

    return {
        id,
        result
    };
}

async function batchPromisesMalSync(URLs: { id: number, url: string }[], batchSize: number, anilistData: { [key: number]: string }, permNoti: notification) {
    const allSettled = "allSettled" in Promise;
    const promises: Array<Promise<{ id: number, result: string }>> = [];

    for (let i = 0; i < URLs.length; i++) {
        promises.push(malsyncPromise(URLs[i].url, URLs[i].id));
        permNoti.updateBody(`Getting link for anilist ID: ${URLs[i].id}`);

        if (promises.length >= batchSize || i == URLs.length - 1) {

            if (allSettled) {
                const res = await Promise.allSettled(promises);

                for (const promise of res) {
                    if (promise.status === "fulfilled") {
                        anilistData[promise.value.id] = promise.value.result;
                    }
                }
            } else {
                try {
                    const res = await Promise.all(promises);

                    for (const result of res) {
                        anilistData[result.id] = result.result;
                    }
                } catch (err) {
                    console.warn(err);
                }
            }

            promises.splice(0);
        }
    }
}

async function getAllItems() {
    const accessToken = localStorage.getItem("anilist-token");
    if (!accessToken) {
        return;
    }

    const permNoti = sendNoti([0, null, "Alert", "Importing your anilist library. This may take a few minutes"]);

    try {
        for (let typeIndex = 0; typeIndex <= 1; typeIndex++) {

            const type = typeIndex === 0 ? "manga" : "anime";
            let currentExtension = extensionList[3];
            let pageKey = "Zoro";
            let numberKey = "id";

            if (type === "manga") {
                currentExtension = extensionList[9];
                pageKey = "MangaFire";
                numberKey = "number";
            }

            const userId = await getUserID();
            const query = `query ($userId: Int) {
                                MediaListCollection (userId: $userId, type: ${type.toUpperCase()}) {
                                    lists {
                                        name
                                        entries {
                                            progress
                                            media {
                                                id
                                            }
                                        }
                                    }
                                }
                            }`;

            const variables = {
                userId
            };

            permNoti.updateBody(`Getting your ${type} library`);
            const data = JSON.parse(await makeAnilistReq(query, variables, accessToken)).data;
            const anilistIDs = [];
            const anilistProgress = [];
            const anilistCategory = [];
            const anilistAllCats = [];
            const categories = {};
            const lists = data.MediaListCollection.lists;

            for (let i = 0; i < lists.length; i++) {
                const entries = lists[i].entries;

                for (let j = 0; j < entries.length; j++) {
                    anilistIDs.push(entries[j].media.id);
                    anilistProgress.push(entries[j].progress);

                    if (!anilistCategory.includes(lists[i].name)) {
                        anilistCategory.push(lists[i].name);
                    }

                    anilistAllCats.push(lists[i].name);
                }
            }

            const makeRooms = await (window.parent as cordovaWindow).Dialogs.confirm("Do you want to put the shows in their respective categories?");

            if (makeRooms) {
                try {
                    const userData = await getUserData() as any;
                    const categoryNames = [];
                    const categoryIDs = [];

                    for (let i = 0; i < userData.data[1].length; i++) {
                        if (i % 2 === 0) {
                            categoryNames.push(userData.data[1][i]);
                        } else {
                            categoryIDs.push(userData.data[1][i]);
                        }
                    }

                    for (let i = 0; i < anilistCategory.length; i++) {
                        try {
                            const catName = anilistCategory[i];
                            const catIndex = categoryNames.indexOf(catName);
                            if (catIndex > -1) {
                                categories[catName] = categoryIDs[catIndex];
                            } else {
                                const response = await addRoom(catName);
                                const roomID = response.data.lastId;
                                categories[catName] = roomID;
                            }
                        } catch (err) {
                            console.warn(err);
                        }

                    }
                } catch (err) {
                    console.warn(err);
                }
            }

            const links: AnilistLinks = [];
            const anilistData = {};
            const malsyncURLs: { id: number, url: string }[] = [];

            for (let i = 0; i < anilistIDs.length; i++) {
                const id = anilistIDs[i];
                malsyncURLs.push({
                    url: `https://raw.githubusercontent.com/MALSync/MAL-Sync-Backup/master/data/anilist/${type.toLowerCase()}/${id}.json`,
                    id: parseInt(id)
                });
            }

            await batchPromisesMalSync(malsyncURLs, 5, anilistData, permNoti);

            for (let i = 0; i < anilistIDs.length; i++) {
                const id = anilistIDs[i];

                try {
                    const page = JSON.parse(
                        anilistData[parseInt(id)]
                    ).Pages[pageKey];

                    links.push({
                        link: currentExtension.rawURLtoInfo(new URL(page[Object.keys(page)[0]].url)),
                        progress: anilistProgress[i],
                        aniID: id,
                        anilistCategory: anilistAllCats[i]
                    });
                } catch (err) {
                    console.warn(err);
                }
            }

            const promiseInput: { showURL: string, engine: extension }[] = [];
            for (const link of links) {
                promiseInput.push({
                    showURL: link.link,
                    engine: currentExtension,
                });
            }

            await batchPromises(promiseInput, 5, links, permNoti);

            for (const link of links) {
                try {

                    if (!link.result) {
                        continue;
                    }

                    permNoti.updateBody(`Trying to get the info for ${link.link}`);

                    const currentInfo = link.result;

                    let currentEp: extensionInfoEpisode = currentInfo.episodes.find((ep) => {
                        return parseFloat(ep[numberKey]) >= link.progress;
                    });

                    if (!currentEp) {
                        currentEp = currentInfo.episodes[0];
                    }

                    if (currentInfo.episodes[currentInfo.episodes.length - 1][numberKey] < link.progress) {
                        currentEp = currentInfo.episodes[currentInfo.episodes.length - 1];
                    }

                    addShowToLib({
                        name: currentInfo.mainName,
                        img: currentInfo.image,
                        url: link.link + "&aniID=" + link.aniID,
                        currentURL: currentEp.link,
                        currentEp: parseFloat(currentEp[numberKey]) === 0 ? 0.1 : parseFloat(currentEp[numberKey]),
                        categoryID: (link.anilistCategory in categories && makeRooms) ? parseInt(categories[link.anilistCategory]) : NaN,
                    });
                } catch (err) {
                    console.warn(err);
                }
            }

        }

        permNoti.updateBody("Your library has been successfully imported. You can now refresh your page.");

    } catch (err) {
        permNoti.remove();
        sendNoti([0, "Red", "Alert", "An unexpected error has occurred: " + err]);
        console.error(err);
    }
}
