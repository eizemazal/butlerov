import { Document } from "butlerov";

export interface NotebookTab {
    document: Document;
    filename: string;
    modified: boolean;
}