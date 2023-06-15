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
                alert(err);
                localStorage.setItem("anilist-last-error", variablesString);
            }
        } else {
            alert(err);
        }
        throw Error("Could not update");
    }
}

async function updateEpWatched(anilistID: any, epNum: any) {
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
    console.log(data);
    
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

                    if(!anilistCategory.includes(lists[i].name)){
                        anilistCategory.push(lists[i].name);
                    }

                    anilistAllCats.push(lists[i].name);
                }
            }


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

                console.log(categoryNames);
                console.log(categoryIDs);

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

            const links: { link: string, progress: number, aniID: number, anilistCategory: string }[] = [];

            for (let i = 0; i < anilistIDs.length; i++) {
                const id = anilistIDs[i];

                try {
                    permNoti.updateBody(`Getting link for anilist ID: ${id}`);

                    const page = JSON.parse(
                        await MakeFetch(`https://raw.githubusercontent.com/MALSync/MAL-Sync-Backup/master/data/anilist/${type.toLowerCase()}/${id}.json`)
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

            console.log(categories);

            for (const link of links) {

                console.log(link.anilistCategory);
                try {
                    permNoti.updateBody(`Trying to get the info for ${link.link}`);

                    const currentInfo = await currentExtension.getAnimeInfo(link.link.replace("?watch=/", ""));
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
                        categoryID: (link.anilistCategory in categories) ? parseInt(categories[link.anilistCategory]) : NaN,
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
