class DOMHandler extends DOMParser {
    constructor() {
        super();
    }
    set innerHTML(html) {
        this.document = super.parseFromString(html, "text/html");
    }
}
