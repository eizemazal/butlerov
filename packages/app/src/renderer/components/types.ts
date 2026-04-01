import { Document } from "butlerov";

export interface DescriptorValues {
    mw?: number | string;
    formula?: string;
    formula_html?: string;
    exact_mass?: number | string;
}

export interface NotebookTab {
    document: Document;
    filepath: string;
    modified: boolean;
    descriptors: DescriptorValues;
}