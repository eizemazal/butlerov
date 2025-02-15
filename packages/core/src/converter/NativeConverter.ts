import { Converter, Document } from "../types";

export class NativeConverter implements Converter {

    document_to_string(document: Document): string {
        return JSON.stringify(document);
    }

    document_from_string(s: string): Document {
        const d = JSON.parse(s);
        if (d.mime != "application/butlerov")
            throw "Wrong file format";
        return d as Document;
    }
}