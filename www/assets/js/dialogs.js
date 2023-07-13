class DialogsClass {
    static confirm(message = "", isAlert = false) {
        return new Promise(function (resolve, reject) {
            const dialogCon = document.querySelector("#dialogs");
            const dialog = document.createElement("dialog");
            dialogCon.append(dialog);
            dialog.append(createElement({
                element: "form",
                style: {
                    textAlign: "center"
                },
                children: [
                    {
                        element: "div",
                        innerText: message,
                        style: {
                            marginBottom: "10px"
                        }
                    },
                    {
                        element: "div",
                        children: [
                            {
                                element: "button",
                                attributes: {
                                    value: "false",
                                    formmethod: "dialog"
                                },
                                innerText: "Cancel",
                                style: {
                                    marginRight: "10px",
                                    backgroundColor: "transparent",
                                    color: "white"
                                },
                                shouldAdd: !isAlert
                            },
                            {
                                element: "button",
                                attributes: {
                                    value: "default"
                                },
                                innerText: isAlert ? "Okay" : "Confirm",
                                listeners: {
                                    click: function (event) {
                                        event.preventDefault();
                                        dialog.close("true");
                                    }
                                },
                                style: {
                                    marginLeft: isAlert ? "0" : "10px",
                                    marginBottom: isAlert ? "0" : "auto"
                                }
                            }
                        ]
                    }
                ]
            }));
            dialog.onclose = function () {
                resolve(dialog.returnValue === "true");
                dialog.remove();
            };
            dialog.onclick = function (event) {
                if (event.target === dialog) {
                    dialog.close();
                }
            };
            dialog.showModal();
        });
    }
    static alert(message) {
        return DialogsClass.confirm(message, true);
    }
}
window["Dialogs"] = {
    confirm: DialogsClass.confirm,
    alert: DialogsClass.alert
};
