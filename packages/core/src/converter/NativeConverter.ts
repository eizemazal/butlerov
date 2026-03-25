import { BUTLEROV_DOCUMENT_FORMAT, Converter, Document } from "../types";

export class NativeConverter implements Converter {

    document_to_string(document: Document): string {
        return JSON.stringify(document);
    }

    document_from_string(s: string): Document {
        const d = JSON.parse(s) as Record<string, unknown>;
        if (d.format !== BUTLEROV_DOCUMENT_FORMAT)
            throw new Error("Wrong file format");
        return { ...d, format: BUTLEROV_DOCUMENT_FORMAT } as Document;
    }
}
