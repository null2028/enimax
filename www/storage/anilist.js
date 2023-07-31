class AnilistHelper {
    static async makeAnilistReq(query, variables, accessToken, showAlert = true) {
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
            }
            else {
                return await response.text();
            }
        }
        catch (err) {
            if ("mediaId" in variables && "progress" in variables) {
                const variablesString = JSON.stringify(variables);
                if (variablesString !== localStorage.getItem("anilist-last-error")) {
                    thisWindow.Dialogs.alert(err);
                    localStorage.setItem("anilist-last-error", variablesString);
                }
            }
            else if (showAlert) {
                thisWindow.Dialogs.alert(err);
            }
            throw Error("Could not update");
        }
    }
    static async getAvatar() {
        const accessToken = localStorage.getItem("anilist-token");
        if (!accessToken) {
            return;
        }
        const query = `query {
                        Viewer {
                            avatar {
                                medium
                            }
                        }
                    }`;
        const variables = {};
        let url = undefined;
        try {
            url = JSON.parse(await AnilistHelper.makeAnilistReq(query, variables, accessToken, false)).data.Viewer.avatar.medium;
        }
        catch (err) {
            console.warn(err);
        }
        finally {
            return url;
        }
    }
    static async updateEpWatched(anilistID, epNum) {
        if (localStorage.getItem("anon-anilist") === "true") {
            return;
        }
        const accessToken = localStorage.getItem("anilist-token");
        if (!accessToken || isNaN(parseInt(anilistID)) || isNaN(parseInt(epNum))) {
            return;
        }
        const mediaId = anilistID;
        const progress = parseInt(epNum); // Anilist can't take float values
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
        await AnilistHelper.makeAnilistReq(query, variables, accessToken);
    }
    static async deleteAnilistShow(anilistID) {
        var _a, _b, _c, _d;
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
            const listID = (_d = (_c = (_b = (_a = JSON.parse(await AnilistHelper.makeAnilistReq(query, getIDvariables, accessToken))) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.Media) === null || _c === void 0 ? void 0 : _c.mediaListEntry) === null || _d === void 0 ? void 0 : _d.id;
            if (listID) {
                const deleteQuery = `mutation ($id: Int) {
                        DeleteMediaListEntry (id: $id) {
                            deleted
                        }
                   }`;
                const variables = {
                    id: listID
                };
                await AnilistHelper.makeAnilistReq(deleteQuery, variables, accessToken);
            }
            else {
                throw Error("Could not find the show on your anilist account");
            }
            sendNoti([4, null, "Alert", "Deleted the show from your anilist account"]);
        }
        catch (err) {
            sendNoti([4, "red", "Alert", err]);
        }
    }
    static async getUserID() {
        const accessToken = localStorage.getItem("anilist-token");
        if (!accessToken) {
            return;
        }
        const query = `query {
                        Viewer {
                            id
                        }
                    }`;
        return JSON.parse(await AnilistHelper.makeAnilistReq(query, {}, accessToken)).data.Viewer.id;
    }
    static addRoom(roomName) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("timeout"));
            }, 5000);
            window.parent.apiCall("POST", {
                "action": 10,
                "username": "",
                "room": roomName
            }, (response) => {
                resolve(response);
            });
        });
    }
    static getUserData() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("timeout"));
            }, 5000);
            window.parent.apiCall("POST", {
                "action": 4,
                "username": "",
            }, (response) => {
                resolve(response);
            });
        });
    }
    static async addShowToLib(data) {
        try {
            await apiCall("POST", {
                "username": "",
                "action": 5,
                "name": data.name,
                "img": data.img,
                "url": data.url
            }, () => { });
            await apiCall("POST", {
                "username": "",
                "action": 2,
                "name": data.name,
                "cur": data.currentURL,
                "ep": data.currentEp
            }, () => { });
            if (!isNaN(data.categoryID)) {
                await apiCall("POST", {
                    "username": "",
                    "action": 7,
                    "name": data.name,
                    "state": data.categoryID
                }, () => { });
            }
        }
        catch (err) {
            console.warn(err);
        }
    }
    static async updateAnilistStatus(aniID) {
        const statuses = AnilistHelper.anilistStatus;
        let promptObj = [];
        for (let i = 0; i < statuses.length; i++) {
            promptObj.push({
                value: statuses[i],
                realValue: statuses[i]
            });
        }
        let status = await window.parent.Dialogs.prompt("Select the status", "", "select", promptObj);
        let permNoti;
        if (status) {
            try {
                permNoti = sendNoti([0, null, "Alert", "Trying to update the status..."]);
                await window.parent.AnilistHelperFunctions.changeShowStatus(aniID, status);
                permNoti.updateBody("Updated!");
                permNoti.notiTimeout(4000);
            }
            catch (err) {
                permNoti.remove();
                sendNoti([4, "red", "Alert", err]);
            }
        }
        else {
            await window.parent.Dialogs.alert("Aborting");
        }
    }
    static async changeShowStatus(anilistID, status) {
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
        await AnilistHelper.makeAnilistReq(query, variables, accessToken);
    }
    static async infoPromise(showURL, engine, index) {
        const result = await engine.getAnimeInfo(showURL.replace("?watch=/", ""));
        return {
            index,
            result
        };
    }
    static async batchPromises(showURLs, batchSize, links, permNoti) {
        const allSettled = "allSettled" in Promise;
        const promises = [];
        for (let i = 0; i < showURLs.length; i++) {
            const showURL = showURLs[i].showURL;
            permNoti.updateBody(showURL);
            promises.push(AnilistHelper.infoPromise(showURL, showURLs[i].engine, i));
            if (promises.length >= batchSize || i == showURLs.length - 1) {
                if (allSettled) {
                    const res = await Promise.allSettled(promises);
                    for (const promise of res) {
                        if (promise.status === "fulfilled") {
                            links[promise.value.index].result = promise.value.result;
                        }
                    }
                }
                else {
                    try {
                        const res = await Promise.all(promises);
                        for (const result of res) {
                            links[result.index].result = result.result;
                        }
                    }
                    catch (err) {
                        console.warn(err);
                    }
                }
                promises.splice(0);
            }
        }
    }
    static async malsyncPromise(url, id) {
        const result = await MakeFetch(url);
        return {
            id,
            result
        };
    }
    static async malsyncApiPromise(type, id, aniToMal) {
        let malId;
        if (id.toString() in aniToMal) {
            malId = aniToMal[id.toString()];
        }
        else {
            malId = await window.parent.anilistToMal(id.toString(), type.toUpperCase());
        }
        const result = await fetch(`https://api.malsync.moe/mal/${type}/${malId}`);
        return {
            id,
            result
        };
    }
    static async batchPromisesMalSyncApi(URLs, batchSize, anilistData, permNoti) {
        const allSettled = "allSettled" in Promise;
        const promises = [];
        let aniToMal;
        try {
            aniToMal = await getBatchMalIds(URLs.map(elem => elem.id.toString()), URLs[0].type.toUpperCase());
        }
        catch (err) {
            console.log(err);
        }
        for (let i = 0; i < URLs.length; i++) {
            let shouldSkip = false;
            let rateLimited = false;
            try {
                const json = JSON.parse(anilistData[URLs[i].id]);
                if ("Sites" in json) {
                    shouldSkip = true;
                }
            }
            catch (err) {
            }
            if (shouldSkip && i != URLs.length - 1) {
                continue;
            }
            promises.push(AnilistHelper.malsyncApiPromise(URLs[i].type, URLs[i].id, aniToMal));
            permNoti.updateBody(`Getting link for anilist ID: ${URLs[i].id}`);
            if (promises.length >= batchSize || i == URLs.length - 1) {
                if (allSettled) {
                    const res = await Promise.allSettled(promises);
                    for (const promise of res) {
                        if (promise.status === "fulfilled") {
                            if (promise.value.result.status === 429) {
                                rateLimited = true;
                                i = Math.max(i - batchSize - 1, 0);
                            }
                            else {
                                try {
                                    anilistData[promise.value.id] = await promise.value.result.text();
                                }
                                catch (err) {
                                    console.warn(err);
                                }
                            }
                        }
                    }
                }
                else {
                    try {
                        const res = await Promise.all(promises);
                        for (const result of res) {
                            if (result.result.status === 429) {
                                rateLimited = true;
                                i = Math.max(i - batchSize - 1, 0);
                            }
                            else {
                                try {
                                    anilistData[result.id] = await result.result.text();
                                }
                                catch (err) {
                                    console.warn(err);
                                }
                            }
                        }
                    }
                    catch (err) {
                        console.warn(err);
                    }
                }
                promises.splice(0);
            }
            if (rateLimited) {
                permNoti.updateBody("Got rate limited. Waiting 10 seconds before trying again");
                await new Promise(r => setTimeout(r, 10000));
            }
        }
    }
    static async batchPromisesMalSync(URLs, batchSize, anilistData, permNoti) {
        const allSettled = "allSettled" in Promise;
        const promises = [];
        for (let i = 0; i < URLs.length; i++) {
            promises.push(AnilistHelper.malsyncPromise(URLs[i].url, URLs[i].id));
            permNoti.updateBody(`Getting link for anilist ID: ${URLs[i].id}`);
            if (promises.length >= batchSize || i == URLs.length - 1) {
                if (allSettled) {
                    const res = await Promise.allSettled(promises);
                    for (const promise of res) {
                        if (promise.status === "fulfilled") {
                            anilistData[promise.value.id] = promise.value.result;
                        }
                    }
                }
                else {
                    try {
                        const res = await Promise.all(promises);
                        for (const result of res) {
                            anilistData[result.id] = result.result;
                        }
                    }
                    catch (err) {
                        console.warn(err);
                    }
                }
                promises.splice(0);
            }
        }
    }
    static async getAllItems(auto = false) {
        const accessToken = localStorage.getItem("anilist-token");
        if (!accessToken) {
            return;
        }
        const permNoti = sendNoti([0, null, "Alert", "Importing your anilist library. This may take a few minutes"]);
        try {
            const userData = await AnilistHelper.getUserData();
            for (let typeIndex = 0; typeIndex <= 1; typeIndex++) {
                const type = typeIndex === 0 ? "manga" : "anime";
                let currentExtension;
                let pageKey;
                let numberKey;
                const supportedMangaValues = [8, 9];
                const supportedAnimeValues = [3, 5, 7];
                // (9anime is unstable, so it's highly recommended to not use 9anime)
                if (type === "manga") {
                    let selectedExtension = 9;
                    const defaultValue = parseInt(localStorage.getItem("manga-default"));
                    const selectedValue = supportedMangaValues.includes(defaultValue) ?
                        defaultValue.toString() :
                        await thisWindow.Dialogs.prompt("Select the main source", "9", "select", supportedMangaValues.map((extensionID) => {
                            return {
                                value: extensionList[extensionID].name,
                                realValue: extensionID.toString()
                            };
                        }));
                    alert(selectedValue);
                    selectedExtension = !supportedMangaValues.includes(parseInt(selectedValue)) ? 9 : parseInt(selectedValue);
                    localStorage.setItem("manga-default", selectedExtension.toString());
                    currentExtension = extensionList[selectedExtension];
                    pageKey = currentExtension.name;
                    numberKey = "number";
                }
                else {
                    let selectedExtension = 3;
                    const defaultValue = parseInt(localStorage.getItem("anime-default"));
                    const selectedValue = supportedAnimeValues.includes(defaultValue) ?
                        defaultValue.toString() :
                        await thisWindow.Dialogs.prompt("Select the main source", "3", "select", supportedAnimeValues.map((extensionID) => {
                            return {
                                value: extensionList[extensionID].name,
                                realValue: extensionID.toString()
                            };
                        }));
                    selectedExtension = !supportedAnimeValues.includes(parseInt(selectedValue)) ? 3 : parseInt(selectedValue);
                    localStorage.setItem("anime-default", selectedExtension.toString());
                    currentExtension = extensionList[selectedExtension];
                    pageKey = currentExtension.name;
                    numberKey = "id";
                }
                const userId = await AnilistHelper.getUserID();
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
                const data = JSON.parse(await AnilistHelper.makeAnilistReq(query, variables, accessToken)).data;
                const anilistIDs = [];
                const anilistProgress = [];
                const anilistCategory = [];
                const anilistAllCats = [];
                const categories = {};
                const lists = data.MediaListCollection.lists;
                const alreadyAdded = userData.data[0].map((elem) => {
                    try {
                        return parseInt((new URLSearchParams(elem[5])).get("aniID"));
                    }
                    catch (err) {
                        return null;
                    }
                });
                for (let i = 0; i < lists.length; i++) {
                    const entries = lists[i].entries;
                    for (let j = 0; j < entries.length; j++) {
                        if (alreadyAdded.includes(entries[j].media.id)) {
                            continue;
                        }
                        anilistIDs.push(entries[j].media.id);
                        anilistProgress.push(entries[j].progress);
                        if (!anilistCategory.includes(lists[i].name)) {
                            anilistCategory.push(lists[i].name);
                        }
                        anilistAllCats.push(lists[i].name);
                    }
                }
                let makeRooms = true;
                if (makeRooms) {
                    try {
                        const categoryNames = ["Watching"];
                        const categoryIDs = [-1];
                        for (let i = 0; i < userData.data[1].length; i++) {
                            if (i % 2 === 0) {
                                categoryNames.push(userData.data[1][i]);
                            }
                            else {
                                categoryIDs.push(userData.data[1][i]);
                            }
                        }
                        for (let i = 0; i < anilistCategory.length; i++) {
                            try {
                                const catName = anilistCategory[i];
                                const catIndex = categoryNames.indexOf(catName);
                                if (catIndex > -1) {
                                    categories[catName] = categoryIDs[catIndex];
                                }
                                else {
                                    const response = await AnilistHelper.addRoom(catName);
                                    const roomID = response.data.lastId;
                                    categories[catName] = roomID;
                                }
                            }
                            catch (err) {
                                console.warn(err);
                            }
                        }
                    }
                    catch (err) {
                        console.warn(err);
                    }
                }
                const links = [];
                const anilistData = {};
                const malsyncURLs = [];
                for (let i = 0; i < anilistIDs.length; i++) {
                    const id = anilistIDs[i];
                    malsyncURLs.push({
                        url: `https://raw.githubusercontent.com/bal-mackup/mal-backup/master/anilist/${type.toLowerCase()}/${id}.json`,
                        id: parseInt(id),
                        type: type.toLowerCase()
                    });
                }
                await AnilistHelper.batchPromisesMalSync(malsyncURLs, 5, anilistData, permNoti);
                await AnilistHelper.batchPromisesMalSyncApi(malsyncURLs, 5, anilistData, permNoti);
                for (let i = 0; i < anilistIDs.length; i++) {
                    const id = anilistIDs[i];
                    try {
                        const pageJSON = JSON.parse(anilistData[parseInt(id)]);
                        const pagesMainKey = "Sites" in pageJSON ? "Sites" : "Pages";
                        const page = pageJSON[pagesMainKey][pageKey];
                        links.push({
                            link: currentExtension.rawURLtoInfo(new URL(page[Object.keys(page)[0]].url)),
                            progress: anilistProgress[i],
                            aniID: id,
                            anilistCategory: anilistAllCats[i]
                        });
                    }
                    catch (err) {
                        console.warn(err);
                    }
                }
                const promiseInput = [];
                for (const link of links) {
                    promiseInput.push({
                        showURL: link.link,
                        engine: currentExtension,
                    });
                }
                await AnilistHelper.batchPromises(promiseInput, 5, links, permNoti);
                for (const link of links) {
                    try {
                        if (!link.result) {
                            continue;
                        }
                        permNoti.updateBody(`Trying to get the info for ${link.link}`);
                        const currentInfo = link.result;
                        let currentEp = currentInfo.episodes.find((ep) => {
                            return parseFloat(ep[numberKey]) >= link.progress;
                        });
                        if (!currentEp) {
                            currentEp = currentInfo.episodes[0];
                        }
                        if (currentInfo.episodes[currentInfo.episodes.length - 1][numberKey] < link.progress) {
                            currentEp = currentInfo.episodes[currentInfo.episodes.length - 1];
                        }
                        const timeout = new Promise(r => setTimeout(r, 20000));
                        await Promise.race([
                            timeout,
                            AnilistHelper.addShowToLib({
                                name: currentInfo.mainName,
                                img: currentInfo.image,
                                url: link.link + "&aniID=" + link.aniID,
                                currentURL: currentEp.link,
                                currentEp: parseFloat(currentEp[numberKey]) === 0 ? 0.1 : parseFloat(currentEp[numberKey]),
                                categoryID: (link.anilistCategory in categories && makeRooms) ? parseInt(categories[link.anilistCategory]) : NaN,
                            })
                        ]);
                    }
                    catch (err) {
                        console.warn(err);
                    }
                }
            }
            permNoti.updateBody("Your library has been successfully imported. You can now refresh your page.");
        }
        catch (err) {
            permNoti.remove();
            sendNoti([0, "Red", "Alert", "An unexpected error has occurred: " + err]);
            console.error(err);
        }
    }
}
AnilistHelper.anilistStatus = ["CURRENT", "PLANNING", "COMPLETED", "DROPPED", "PAUSED", "REPEATING"];
