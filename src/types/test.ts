async function networkCall(url: string, options = {}): Promise<string> {
    return new Promise(function (resolve, reject) {
        fetch(url, options).then(response => response.text()).then((response) => {
            resolve(response);
        }).catch(function (err) {
            reject(new Error(`${err.message}: ${url}`));
        });
    });
}

function getRealValue(key: Key, scopeObj: any) {
    if (key.type === "string") {
        return key.value;
    } else {
        return scopeObj[key.value];
    }
}

async function executeAction(actionObj: Action, scopeObj: any) {
    switch (actionObj.type) {
        case "network": {

            const params = actionObj.params as NetworkAction;
            const key = getRealValue(params.key, scopeObj);

            const options = {
                headers: getRealValue(params.headers, scopeObj),
                method: getRealValue(params.method, scopeObj),
            };

            scopeObj[key] = await networkCall(getRealValue(params.url, scopeObj), options);
            break;
        }

        case "createElement": {
            const key = actionObj.params.value;
            scopeObj[key] = document.createElement("div");
            break;
        }

        case "querySelector": {
            const params = actionObj.params as SelectorAction;
            const key = getRealValue(params.key, scopeObj);
            const selector = getRealValue(params.selector, scopeObj);
            const to = getRealValue(params.to, scopeObj);

            scopeObj[to] = scopeObj[key].querySelectorAll(selector);
            break;
        }

        case "copy": {
            const params = actionObj.params as CopyAction;
            const from = getRealValue(params.from, scopeObj);
            const to = getRealValue(params.to, scopeObj);

            scopeObj[from] = scopeObj[to];
            break;
        }

        case "set": {
            const params = actionObj.params;
            const key = getRealValue(params.key, scopeObj);
            const value = getRealValue(params.value, scopeObj);
            scopeObj[key] = value;
            break;
        }

        case "callFunction": {
            const params = actionObj.params as FunctionAction;
            const key = getRealValue(params.key, scopeObj);
            const to = getRealValue(params.to, scopeObj);

            const func = scopeObj[key] as Function;
            const funcParams = [];
            let thisVal = null;

            for (const key in params.params) {
                funcParams.push(getRealValue(params.params[key], scopeObj));
            }

            if (params.thisVar.value) {
                thisVal = scopeObj[params.thisVar.value];
            }

            console.log(func, thisVal, funcParams);

            if (to !== null) {
                scopeObj[to] = func.apply(thisVal, funcParams);
            } else{
                func.apply(thisVal, funcParams);
            }

            break;
        }

        case "copyMember": {
            const params = actionObj.params as CopyMemberAction;
            const key = getRealValue(params.key, scopeObj);
            const to = getRealValue(params.to, scopeObj);
            const memberName = getRealValue(params.memberName, scopeObj);

            scopeObj[to] = key[memberName];
            break;
        }

        case "setMember": {
            const params = actionObj.params as SetMemberAction;
            const key = getRealValue(params.key, scopeObj);
            const value = getRealValue(params.value, scopeObj);
            const memberName = getRealValue(params.memberName, scopeObj);

            scopeObj[key][memberName] = value;
            break;
        }

        case "createEmptyObject": {
            const key = getRealValue(actionObj.params, scopeObj);
            scopeObj[key] = {};
            break;
        }

        case "JSON.parse": {
            const params = actionObj.params as BaseAction;
            const from = getRealValue(params.from, scopeObj);
            const to = getRealValue(params.to, scopeObj);

            scopeObj[to] = JSON.parse(from);
            break;
        }

        case "JSON.stringify": {
            const params = actionObj.params as BaseAction;
            const from = getRealValue(params.from, scopeObj);

            scopeObj[params.to.value] = JSON.stringify(from);
            break;
        }

        case "sanitize": {
            const params = actionObj.params as BaseAction;
            const from = getRealValue(params.from, scopeObj);
            const to = getRealValue(params.to, scopeObj);
            // TODO
            scopeObj[to] = (from);
            break;
        }

        case "URL": {
            const params = actionObj.params as URLAction;
            const to = getRealValue(params.to, scopeObj);
            const url = getRealValue(params.url, scopeObj);

            scopeObj[to] = new URL(url);
            break;
        }

        case "loop": {
            const params = actionObj.params as LoopAction;
            const bounds = [];

            for (const key in params.bounds) {
                bounds[key] = getRealValue(params.bounds[key], scopeObj);
            }

            const ini = bounds[0];
            const final = bounds[1];
            const iterVar = params.iterativeVariable.value;

            scopeObj[iterVar] = ini;

            for (; scopeObj[iterVar] < final; scopeObj[iterVar]++) {
                await executeActions(params.actions, scopeObj);
            }

            break;
        }
    }
}

async function executeActions(actionObj: Action[], scope: any) {
    for (const action of actionObj) {
        await executeAction(action, scope);
    }
}


const scope = {
    input: "https://aniwatch.to/odd-taxi-17430?ref=search"
};

function networkConstructor(headers: Key, method: Key, url: Key, key): Action {
    return {
        type: "network",
        params: {
            headers,
            method,
            url,
            key: {
                type: "string",
                value: key
            }
        }
    }
}

function createElement(innerHTMLVar: string, domVar: string): Action[] {
    return [
        {
            type: "createElement",
            params: {
                type: "string",
                value: domVar
            }
        },
        {
            type: "sanitize",
            params: {
                from: {
                    type: "key",
                    value: innerHTMLVar
                },
                to: {
                    type: "string",
                    value: innerHTMLVar
                }
            }
        },
        {
            type: "setMember",
            params: {
                key: {
                    type: "string",
                    value: domVar
                },
                memberName: {
                    type: "string",
                    value: "innerHTML"
                },
                value: {
                    type: "key",
                    value: innerHTMLVar
                }
            }
        }]
}

function querySelector(domVar: string, selector: string, toVar: string): Action {
    return {
        type: "querySelector",
        params: {
            key: {
                type: "string",
                value: domVar
            },
            selector: {
                type: "string",
                value: selector
            },
            to: {
                type: "string",
                value: toVar
            }
        }
    }
}

function copyMember(targetVar: Key, targetName: Key, toVar: Key): Action {
    return {
        type: "copyMember",
        params: {
            key: targetVar,
            memberName: targetName,
            to: toVar
        }
    };
}

function setMember(targetVar: Key, targetName: Key, value: Key): Action {
    return {
        type: "setMember",
        params: {
            key: targetVar,
            memberName: targetName,
            value
        }
    };
}

function copy(from: StaticKey, to: StaticKey): Action{
    return {
        type: "copy",
        params: {
            from,
            to
        }
    }
}

function set(key: Key, value: Key): Action{
    return {
        type: "set",
        params: {
            key,
            value
        }
    }
}

function parse(from: Key, to: Key): Action{
    return {
        type: "JSON.parse",
        params: {
            from,
            to
        }
    }
}

function createEmptyArray(toVar: string): Action {
    return {
        type: "copyMember",
        params: {
            key: {
                type: "string",
                value: [[]]
            },
            memberName: {
                type: "string",
                value: "0"
            },
            to: {
                type: "string",
                value: toVar
            }
        }
    };
}

function createLoop(iterVar: string, endBoundVar: string, actions: Action[]): Action {
    return {
        type: "loop",
        params: {
            iterativeVariable: {
                type: "string",
                value: iterVar
            },
            bounds: [
                {
                    type: "string",
                    value: 0
                },
                {
                    type: "key",
                    value: endBoundVar
                }
            ],
            actions: actions
        }
    }
}

function callMemberFunction(targetVar: string, functionName: string, params: Key[], toVar: string | null): Action[] {

    return [
        copyMember(dynamicKey(targetVar), staticKey(functionName), staticKey("currentFunction")),
        {
            type: "callFunction",
            params: {
                key: {
                    type: "string",
                    value: "currentFunction",
                },
                params,
                to: {
                    type: "string",
                    value: toVar
                },
                thisVar: {
                    type: "key",
                    value: targetVar
                }
            }
        }
    ]

}

function createEmptyObject(targetName: string): Action {
    return {
        type: "createEmptyObject",
        params: staticKey(targetName)
    }
};

function url(url: Key, to: Key): Action {
    return {
        type: "URL",
        params: {
            to,
            url
        }
    }
};

function dynamicKey(value: string): DynamicKey {
    return {
        type: "key",
        value
    };
}

function staticKey(value: any): StaticKey {
    return {
        type: "string",
        value
    };
}

const zoroSearch: Action[] = [
    networkConstructor(staticKey({}), staticKey("GET"), staticKey(scope.input), "searchHTML"),
    ...createElement("searchHTML", "searchDOM"),
    querySelector("searchDOM", ".flw-item", "searchItems"),
    copyMember(dynamicKey("searchItems"), staticKey("length"), staticKey("searchItemsLength")),
    createEmptyObject("response"),
    createEmptyArray("resultArray"),
    createLoop(
        "i",
        "searchItemsLength",
        [
            createEmptyObject("currentData"),
            copyMember(dynamicKey("searchItems"), dynamicKey("i"), staticKey("currentElement")),
            querySelector("currentElement", "a", "anchorTag"),
            copyMember(dynamicKey("anchorTag"), staticKey(0), staticKey("anchorTag")),

            ...callMemberFunction("anchorTag", "getAttribute", [staticKey("title")], "temp"),
            setMember(staticKey("currentData"), staticKey("name"), dynamicKey("temp")),

            ...callMemberFunction("anchorTag", "getAttribute", [staticKey("data-id")], "temp"),
            setMember(staticKey("currentData"), staticKey("id"), dynamicKey("temp")),

            ...callMemberFunction("anchorTag", "getAttribute", [staticKey("href")], "temp"),
            setMember(staticKey("currentData"), staticKey("link"), dynamicKey("temp")),
            
            ...callMemberFunction("resultArray", "push", [dynamicKey("currentData")], null)
        ]
    ),
    setMember(staticKey("response"), staticKey("result"), dynamicKey("resultArray"))
];


const zoroInfo: Action[] = [
    networkConstructor(staticKey({}), staticKey("GET"), staticKey(scope.input), "infoHTML"),
    ...createElement("infoHTML", "infoDOM"),
    createEmptyObject("response"),
    setMember(staticKey("response"), staticKey("mainName"), dynamicKey("input")),

    // Setting the ID
    copy(staticKey("id"), staticKey("input")),
    url(dynamicKey("id"), staticKey("id")),
    copyMember(dynamicKey("id"), staticKey("pathname"), staticKey("id")),
    ...callMemberFunction("id", "split", [staticKey("-")], "id"),
    ...callMemberFunction("id", "pop", [], "id"),


    // Getting the name
    querySelector("infoDOM", ".film-name.dynamic-name", "nameDOM"),
    copyMember(dynamicKey("nameDOM"), staticKey(0), staticKey("nameDOM")),
    copyMember(dynamicKey("nameDOM"), staticKey("innerText"), staticKey("temp")),
    setMember(staticKey("response"), staticKey("name"), dynamicKey("temp")),

    // Getting the image
    querySelector("infoDOM", ".layout-page.layout-page-detail", "tempDOM"),
    copyMember(dynamicKey("tempDOM"), staticKey(0), staticKey("tempDOM")),

    querySelector("tempDOM", "img", "imageDOM"),
    copyMember(dynamicKey("imageDOM"), staticKey(0), staticKey("imageDOM")),
    ...callMemberFunction("imageDOM", "getAttribute", [staticKey("src")], "temp"),
    setMember(staticKey("response"), staticKey("image"), dynamicKey("temp")),


    // Getting the description
    querySelector("infoDOM", ".film-description", "descDOM"),
    copyMember(dynamicKey("descDOM"), staticKey(0), staticKey("descDOM")),
    copyMember(dynamicKey("descDOM"), staticKey("innerText"), staticKey("temp")),
    setMember(staticKey("response"), staticKey("description"), dynamicKey("temp")),
    

    // Getting the episode list JSON
    set(staticKey("epAjax"), staticKey("https://aniwatch.to/ajax/v2/episode/list/")),
    ...callMemberFunction("epAjax", "concat", [dynamicKey("id")], "epAjax"),

    // parsing the JSON
    networkConstructor(staticKey({}), staticKey("GET"), dynamicKey("epAjax"), "epJSON"),
    parse(dynamicKey("epJSON"), staticKey("epJSON")),
    copyMember(dynamicKey("epJSON"), staticKey("html"), staticKey("epHTML")),


    // Parsing the ep list HTML
    ...createElement("epHTML", "eplistDOM"),
    querySelector("eplistDOM", ".ep-item", "epDOM"),
    copyMember(dynamicKey("epDOM"), staticKey("length"), staticKey("epLen")),

    // createLoop(
    //     "i",
    //     "epLen",
    //     [

    //     ]
    // )

    

    // let tempEp: extensionInfoEpisode = {
    //     "isFiller": episodeListDOM[i].getAttribute("class").includes("ssl-item-filler"),
    //     "link": episodeListDOM[i].getAttribute("href").replace("/watch/", "?watch=").replace("?ep=", "&ep=") + "&engine=3",
    //     "id": episodeListDOM[i].getAttribute("data-number"),
    //     "sourceID": episodeListDOM[i].getAttribute("data-id"),
    //     "title": "Episode " + episodeListDOM[i].getAttribute("data-number"),
    //     "altTitle": "Episode " + episodeListDOM[i].getAttribute("data-number"),
    // };


];



(async function () {
    await executeActions(zoroInfo, scope);
    console.log(scope);
})();