export interface Coords {
    x: number;
    y: number;
}

export interface Rect {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export enum LabelType {
    Atom,
    Linear,
    Custom
}

export type Color = string

export interface TextSegment {
    text: string
    baseline?: "normal" | "super" | "sub"
    font_face?: string
    font_size?: number
    color: Color
}

export interface SegmentedText {
    segments: TextSegment[]
}

export interface Vertex {
    x: number
    y: number
    label_type: LabelType
    label: string
    charge: number
    isotope?: number
    h_count?: number
}

export enum EdgeShape {
    Single,
    Double,
    Triple,
    SingleUp,
    SingleDown,
    SingleEither,
    DoubleEither,
    Aromatic,
    //Single_or_Double,
    //Single_or_Aromatic,
    //Double_or_Aromatic,
    //Any
}

export enum EdgeOrientation {
    Left,
    Right,
    Center
}

export interface Edge {
    vertices: number[]
    shape: EdgeShape
    orientation?: EdgeOrientation
}

export interface Drawable {
    x?: number
    y?: number
    rotation?: number
    scale_x?: number
    scale_y?: number
    visible?: boolean
    stroke_color?: Color
    fill_color?: Color
}

export interface Graph extends Drawable {
    type: "Graph"
    vertices: Vertex[];
    edges: Edge[];
}

export interface Caption extends SegmentedText, Drawable {
    type: "Caption"
}

export interface Collection extends Drawable {
    objects: Drawable[];
    type?: "group" | "guide" | "grid"
    guide_alignment_x?: "left" | "mid" | "right"
    guide_alignment_y?: "top" | "mid" | "bottom"
    guide_spacing_x?: number | "equal"
    guide_spacing_y?: number | "equal"
    cols?: number
    rows?: number
}

export interface PolylinePoint extends Coords {
    type?: "plain" | "smooth"
}

export type ArrowShape = "plain" | "arrow"

export interface Polyline extends Drawable {
    type: "Polline"
    points: Coords[];
    closed?: boolean;
}

export type DrawableObject = Graph | Caption | Polyline;


export interface DocumentMetadata {
    title?: string
    author?: string
    date?: Date
    hash?: string
}

export interface Document {
    mime: "application/butlerov"
    metadata?: DocumentMetadata
    width?: number;
    height?: number;
    objects?: DrawableObject[];
    collections?: Collection[];
}

export interface Converter {
    document_from_string?(s: string): Document;
    document_to_string?(document: Document): string;
    graph_to_string?(graph: Graph): string;
    graph_from_string?(s: string): Graph;
}

