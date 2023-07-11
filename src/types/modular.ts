type ActionTypes = "network" | "createElement" | "querySelector" | "copy" | "set" | "callFunction" | "copyMember" | "setMember" | "createEmptyObject" | "JSON.parse" | "JSON.stringify" | "sanitize" | "loop" | "URL";

type DynamicKey = {
    type: "key"
    value: string
};

type StaticKey = {
    type: "string",
    value: any
};

type Key = DynamicKey | StaticKey ;

interface NetworkAction {
    key: StaticKey,
    method: Key,
    url: Key,
    headers: Key
}

interface SetAction {
    key: Key,
    value: Key
}

interface CopyAction {
    from: StaticKey,
    to: StaticKey
}

interface FunctionAction {
    key: Key,
    thisVar: DynamicKey | null,
    params: Key[],
    to: Key | null
}

interface CopyMemberAction {
    key: Key,
    memberName: Key
    to: Key
}

interface SetMemberAction {
    key: Key,
    memberName: Key
    value: Key
}

interface SelectorAction {
    key: Key,
    selector: Key,
    to: Key
}

interface sanitizeAction {
    // from:
}

interface URLAction {
    url: Key,
    to: Key
}

interface BaseAction {
    from: Key,
    to: Key
}

interface LoopAction {
    iterativeVariable: StaticKey,
    bounds: [Key, Key]
    actions: Action[]
}

type Action = ({
    type: "network",
    params: NetworkAction
} | {
    type: "createElement",
    params: StaticKey
} | {
    type: "querySelector",
    params: SelectorAction
} | {
    type: "copy",
    params: CopyAction
} | {
    type: "callFunction",
    params: FunctionAction
} | {
    type: "copyMember",
    params: CopyMemberAction
} | {
    type: "setMember",
    params: SetMemberAction
} | {
    type: "createEmptyObject",
    params: StaticKey
}| {
    type: "JSON.parse",
    params: BaseAction
}| {
    type: "JSON.stringify",
    params: BaseAction
} | {
    type: "sanitize",
    params: BaseAction
} | {
    type: "loop",
    params: LoopAction
} | {
    type: "URL",
    params: URLAction
} | {
    type: "set",
    params: SetAction
});