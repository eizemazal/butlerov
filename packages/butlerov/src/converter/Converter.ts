import { Graph } from "../drawable/Graph";

/**
 * This is a base class for all converters of Graph from/to other formats
 */
export interface Converter {
    /**
     * Create or replace Graph with string data in given format
     * @param s string
     * @param graph optional graph that will be cleared and replaced
     * @returns graph. Will be created unless specified in parameters. Otherwise, a reference to it will be returned
     */
    from_string?(s: string, graph: Graph | null): Graph;
    /**
     * Convert Graph to string representation
     * @param graph Graph to convert
     */
    to_string?(graph: Graph): string;
}