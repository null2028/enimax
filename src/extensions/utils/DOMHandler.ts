class DOMHandler extends DOMParser {
    document: Document;

    constructor() {
        super();
    }

    set innerHTML(html: string) {
        this.document = super.parseFromString(html, "text/html");
    }
}