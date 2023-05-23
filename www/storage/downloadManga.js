function fix_title(title) {
    try {
        let titleArray = title.split("-");
        let temp = "";
        for (var i = 0; i < titleArray.length; i++) {
            temp = temp + titleArray[i].substring(0, 1).toUpperCase() + titleArray[i].substring(1) + " ";
        }
        return temp;
    }
    catch (err) {
        return title;
    }
}
function normalise(url) {
    url = url.replace("?watch=", "");
    url = url.split("&engine=")[0];
    url = url.split("&isManga=")[0];
    return url;
}
class DownloadManga {
    constructor(vidData, data, success, error, episodes, pause) {
        this.success = success;
        this.episodes = episodes;
        this.error = error;
        this.engine = vidData.engine;
        this.notiId = ++notiCount;
        this.saved = false;
        this.check = 0;
        this.pause = (pause === true || pause === false) ? pause : false;
        this.vidData = vidData;
        this.mapping = [];
        this.sent = false;
        this.preferredSource = localStorage.getItem(`${this.engine}-downloadSource`);
        this.maxBufferLength = 10;
        this.name = data.mainName;
        this.downloaded = 0;
        this.total = 0;
        this.preferredResolution = localStorage.getItem("offlineQual") ? parseInt(localStorage.getItem("offlineQual")) : 720;
        this.metaData = data;
        this.infoFile = null;
        this.fileDir = null;
        function blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(blob);
            });
        }
        const self = this;
        this.base64Image = "";
        fetch(this.metaData.image).then(x => x.blob()).then(blob => blobToBase64(blob)).then((img) => {
            self.base64Image = img;
        }).catch(function (err) {
            self.base64Image = "../../assets/images/placeholder.jpg";
        }).finally(async function () {
            await actionSQLite[5]({
                "body": {
                    "img": self.base64Image,
                    "name": `${self.name}`,
                    "url": `?watch=/${self.name}&engine=${self.engine}&isManga=true`
                }
            }, true);
            let localQuery = encodeURIComponent(`/${self.name}/${btoa(self.vidData.ogURL)}`);
            await actionSQLite[2]({
                "body": {
                    "name": data.mainName,
                    "nameUm": data.mainName,
                    "ep": vidData.chapter,
                    "cur": `?watch=${localQuery}&isManga=true`
                }
            }, true);
            await actionSQLite[14]({
                "body": {
                    "name": `${data.mainName}&isManga=true`,
                    "url": `?watch=/${self.name}&engine=${self.engine}&isManga=true`,
                }
            }, true);
        });
        this.ini();
    }
    getBaseUrl(url) {
        let newUrl = url.substring(0, url.indexOf("?") == -1 ? url.length : url.indexOf("?"));
        newUrl = newUrl[newUrl.length - 1] == "/" ? newUrl.substring(0, newUrl.length - 1) : newUrl;
        newUrl = newUrl.substring(0, newUrl.lastIndexOf("/") == -1 ? newUrl.length : newUrl.lastIndexOf("/")) + "/";
        return newUrl;
    }
    updateNoti(x_name, self, type = 0) {
        // @ts-ignore
        if (cordova.plugins.backgroundMode.isActive() === false || localStorage.getItem("hideNotification") === "true") {
            return;
        }
        let progNumDeci = (self.downloaded / self.total);
        let progNum = Math.floor(progNumDeci * 100);
        progNumDeci = Math.floor(progNumDeci * 10000) / 100;
        if (type == 2) {
        }
        else if (progNum == 100) {
            x_name = "Storing the downloaded data...";
        }
        else {
            x_name = `${progNumDeci}% - ` + x_name;
        }
        let notiConfig = {
            id: self.id,
            title: x_name,
            progressBar: { value: progNum },
            vibrate: false,
            smallIcon: 'res://ic_launcher',
            color: "blue",
            lockscreen: true,
            wakeup: false,
            sound: false,
        };
        if (self.sent == true) {
            // @ts-ignore
            cordova.plugins.notification.local.update(notiConfig);
        }
        else {
            // @ts-ignore
            cordova.plugins.notification.local.schedule(notiConfig);
        }
        self.sent = true;
    }
    getDirectory(baseDir, targetDir, options = {}) {
        return new Promise((resolve, reject) => {
            baseDir.getDirectory(targetDir, options, function (targetDirEntry) {
                resolve(targetDirEntry);
            }, function (err) {
                reject(err);
            });
        });
    }
    getDataDirectory() {
        return new Promise((resolve, reject) => {
            // @ts-ignore
            window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function (fs) {
                resolve(fs);
            }, function (err) {
                reject(err);
            });
        });
    }
    getFile(targetDir, fileName, options = {}) {
        return new Promise((resolve, reject) => {
            targetDir.getFile(fileName, options, function (fileEntry) {
                resolve(fileEntry);
            }, function (err) {
                reject(err);
            });
        });
    }
    async ini() {
        const self = this;
        try {
            const dataDir = await self.getDataDirectory();
            const mangaDir = await self.getDirectory(dataDir, "manga", { create: true, exclusive: false });
            const nameDir = await self.getDirectory(mangaDir, self.name, { create: true, exclusive: false });
            const epDir = await self.getDirectory(nameDir, `${window.btoa(self.vidData.ogURL)}`, { create: true, exclusive: false });
            self.fileDir = epDir;
            self.nameDir = nameDir;
            let hasBeenDownloaded = false;
            try {
                await self.getFile(epDir, ".downloaded", { create: false, exclusive: false });
                hasBeenDownloaded = true;
            }
            catch (err) {
                // the video has been downloaded since create: false
            }
            if (!hasBeenDownloaded) {
                const infoFileEntry = await self.getFile(nameDir, "info.json", { create: true, exclusive: false });
                self.infoFile = infoFileEntry;
                self.iniInfo(self);
                self.updateMetaData(self);
                self.startDownload(self);
            }
            else {
                self.errorHandler(self, "The manga has already been downloaded");
            }
        }
        catch (err) {
            console.error(err);
            self.errorHandler(self, "File error 1000");
        }
    }
    updateMetaData(self) {
        let data = new Blob([JSON.stringify({
                "data": self.vidData,
            })], { "type": "text/plain" });
        self.fileDir.getFile("viddata.json", { create: true, exclusive: false }, function (file) {
            file.createWriter(function (fileWriter) {
                fileWriter.onwriteend = function (e) {
                };
                fileWriter.onerror = function (e) {
                    self.errorHandler(self, "File error 500");
                };
                fileWriter.write(data);
            }, function () {
                self.errorHandler(self, "File error 501");
            });
        }, function (x) {
            console.error(x);
        });
    }
    iniInfo(self) {
        let data = new Blob([JSON.stringify({
                "data": self.metaData,
                "episodes": self.episodes
            })], { "type": "text/plain" });
        self.infoFile.createWriter(function (fileWriter) {
            fileWriter.onwriteend = function (e) {
            };
            fileWriter.onerror = function (e) {
                self.errorHandler(self, "File error 502");
            };
            fileWriter.write(data);
        }, function () {
            self.errorHandler(self, "File error 503");
        });
    }
    updateDownloadStatus(self) {
        return new Promise(function (resolve, reject) {
            let data = new Blob([JSON.stringify({
                    "data": self.mapping,
                })], { "type": "text/plain" });
            self.fileDir.getFile("downloaded.json", { create: true, exclusive: false }, function (file) {
                file.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function (e) {
                        resolve("done");
                    };
                    fileWriter.onerror = function (e) {
                        reject("File error 504");
                        self.errorHandler(self, "File error 504");
                    };
                    fileWriter.write(data);
                }, function () {
                    reject("File error 505");
                    self.errorHandler(self, "File error 505");
                });
            }, function (x) {
                reject("File error 600");
                self.errorHandler(self, "File error 600");
            });
        });
    }
    downloadFileTransfer(filename, uri, self, headers = {}) {
        return new Promise(function (resolve, reject) {
            self.fileDir.getFile(filename, { create: true, exclusive: false }, function (fileEntry) {
                //todo
                // @ts-ignore
                var fileTransfer = new FileTransfer();
                var fileURL = fileEntry.toURL();
                headers.suppressProgress = true;
                let timeoutMS = parseInt(localStorage.getItem("downloadTimeout"));
                timeoutMS = isNaN(timeoutMS) ? 20000 : timeoutMS * 1000;
                let timeout = setTimeout(function () {
                    fileTransfer.abort();
                    reject(new Error("timeout"));
                }, timeoutMS);
                fileTransfer.download(uri, fileURL, function () {
                    clearTimeout(timeout);
                    resolve("done");
                }, function (error) {
                    clearTimeout(timeout);
                    reject(error);
                }, null, headers);
                fileTransfer.onprogress = function (progressEvent) { };
            }, function (x) {
                console.error(x);
                reject("err");
            });
        });
    }
    readFile(self) {
        return new Promise(function (resolve, reject) {
            self.fileDir.getFile("downloaded.json", { create: true, exclusive: false }, function (fileEntry) {
                fileEntry.file(function (file) {
                    var reader = new FileReader();
                    reader.onloadend = function () {
                        resolve(this.result);
                    };
                    reader.readAsText(file);
                }, (err) => {
                    reject(err);
                });
            }, function (err) {
                reject(err);
            });
        });
    }
    async startDownload(self) {
        const localMapping = {};
        try {
            const tempMappingString = await self.readFile(self);
            const tempMapping = (JSON.parse(tempMappingString)).data;
            for (let i = 0; i < tempMapping.length; i++) {
                let cur = tempMapping[i];
                localMapping[i] = {
                    "downloaded": cur.downloaded,
                    "uri": cur.uri,
                };
            }
        }
        catch (err) {
            console.error(err);
        }
        for (let i = 0; i < this.vidData.pages.length; i++) {
            const page = this.vidData.pages[i];
            const index = i.toString();
            this.mapping[i] = {
                fileName: `${i}.jpg`,
                downloaded: false,
                uri: page.img
            };
            if (index in localMapping) {
                this.mapping[i].downloaded = localMapping[index].downloaded;
            }
        }
        let totalTries = 5;
        let downloadedEverything = true;
        const parallel = isNaN(parseInt(localStorage.getItem("parallel"))) ? 5 : parseInt(localStorage.getItem("parallel"));
        const mapping = this.mapping;
        const iters = Math.ceil(mapping.length / parallel);
        self.total = mapping.length;
        while (totalTries >= 1) {
            const promises = [];
            downloadedEverything = true;
            self.downloaded = 0;
            for (let i = 0; i < iters; i++) {
                try {
                    const indexes = [];
                    for (let j = i * parallel; j < ((i + 1) * parallel) && j < mapping.length; j++) {
                        if (self.pause)
                            return;
                        if (mapping[j].downloaded === true) {
                            self.downloaded++;
                            continue;
                        }
                        downloadedEverything = false;
                        indexes.push(j);
                        promises.push(self.downloadFileTransfer(mapping[j].fileName, mapping[j].uri, self, {
                            "headers": {
                                "user-agent": navigator.userAgent,
                            }
                        }));
                    }
                    await Promise.all(promises);
                    // Since mangas are not that big, we might not want to
                    // implement a resume feature to avoid any bugs.
                    // await self.updateDownloadStatus(self);
                    for (const index of indexes) {
                        mapping[index].downloaded = true;
                        self.downloaded++;
                    }
                }
                catch (err) {
                    console.error(err);
                }
            }
            totalTries--;
            if (downloadedEverything) {
                break;
            }
        }
        if (downloadedEverything) {
            self.done(self);
        }
        else {
            self.errorHandler(self, "Could not download the whole video. Try Again");
        }
    }
    done(self) {
        if (self.pause) {
            return;
        }
        self.fileDir.getFile(`.downloaded`, { create: true, exclusive: false }, function (dir) {
            self.updateNoti(`Done - Chapter ${self.vidData.chapter} - ${fix_title(self.name)}`, self, 2);
            self.pause = true;
            self.message = "Done";
            self.success();
            self.error = () => { };
            self.success = () => { };
        }, function (x) {
            console.error(x);
        });
    }
    errorHandler(self, x) {
        if (self.controller) {
            self.controller.abort();
        }
        if (self.pause) {
            return;
        }
        self.updateNoti(`Error - Episode ${self.vidData.chapter} - ${fix_title(self.name)}`, self, 2);
        self.pause = true;
        self.message = (x);
        self.error();
        self.error = () => { };
        self.success = () => { };
    }
}
