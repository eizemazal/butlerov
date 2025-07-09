import { Graph, Rect } from "../types";

export function get_molecule_rect(graph: Graph): Rect | null {
    if (!graph.vertices.length)
        return null;
    const x_coords = graph.vertices.map(e => e.x);
    const y_coords = graph.vertices.map(e => e.y);
    return {
        x1: Math.min(...x_coords),
        y1: Math.min(...y_coords),
        x2: Math.max(...x_coords),
        y2: Math.max(...y_coords),
    };
}