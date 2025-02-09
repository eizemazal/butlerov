import { Document } from "butlerov";

export interface NotebookTab {
    document: Document;
    filepath: string;
    modified: boolean;
}