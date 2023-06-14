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

async function addShowToLib(data: { name: string, img: string, url: string, currentURL: string, currentEp: number }) {

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
    });
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
            const lists = data.MediaListCollection.lists;

            for (let i = 0; i < lists.length; i++) {
                const entries = lists[i].entries;

                for (let j = 0; j < entries.length; j++) {
                    anilistIDs.push(entries[j].media.id);
                    anilistProgress.push(entries[j].progress);
                }
            }

            const links: { link: string, progress: number, aniID: number }[] = [];

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
                        aniID: id
                    });
                } catch (err) {
                    console.warn(err);
                }
            }

            for (const link of links) {
                try {
                    permNoti.updateBody(`Trying to get the info for ${link.link}`);

                    const currentInfo = await currentExtension.getAnimeInfo(link.link.replace("?watch=/", ""));
                    let currentEp: extensionInfoEpisode = currentInfo.episodes.find((ep) => {
                        return parseFloat(ep[numberKey]) === link.progress;
                    });


                    if (!currentEp) {
                        currentEp = currentInfo.episodes[0];
                    }

                    addShowToLib({
                        name: currentInfo.mainName,
                        img: currentInfo.image,
                        url: link.link + "&aniID=" + link.aniID,
                        currentURL: currentEp.link,
                        currentEp: parseFloat(currentEp[numberKey]) === 0 ? 0.1 : parseFloat(currentEp[numberKey])
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
