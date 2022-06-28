import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { ChemicalElement, ChemicalElements } from "../lib/elements";
import { MoleculeEditor } from "../main";

type AtomicCoords = {
    x: number;
    y: number;
}

type ScreenCoords = {
    x: number;
    y: number;
}

class Vertex {
    protected group: Konva.Group | null;
    protected controller: MoleculeEditor | null;
    protected _neighbors: Set<Vertex>;
    protected is_active: boolean;
    protected _atomic_coords: AtomicCoords;
    protected _charge : number;
    protected _label : string;
    protected element: ChemicalElement | null;

    constructor() {
        this._atomic_coords = { x: 0, y: 0};
        this._label = "";
        this._charge = 0;
        this.controller = null;
        this.element = null;
        this.group = null;
        this.is_active = false;
        this._neighbors = new Set();
    }

    copy(): Vertex {
        const v = new Vertex();
        v._atomic_coords = { ...this._atomic_coords };
        v._label = this.label;
        v.element = this.element;
        v._charge = this._charge;
        return v;
    }

    attach(controller: MoleculeEditor):Konva.Group {
        this.controller = controller;
        if (!this.group)
            this.group = new Konva.Group();
        const stylesheet = controller.stylesheet;
        this.group.setAttr("x", this._atomic_coords.x*stylesheet.scale + stylesheet.offset_x);
        this.group.setAttr("y", this._atomic_coords.y*stylesheet.scale + stylesheet.offset_y);
        this.on("dragmove", (vertex: Vertex, evt: KonvaEventObject<MouseEvent>) => controller.on_vertex_dragmove(vertex, evt));
        this.on("mouseover", (vertex: Vertex) => controller.on_vertex_mouseover(vertex));
        this.on("mouseout", (vertex: Vertex) => controller.on_vertex_mouseout(vertex));
        this.on("click", (vertex: Vertex, evt: KonvaEventObject<MouseEvent>) => controller.on_vertex_click(vertex, evt));
        this.on("contextmenu", (vertex: Vertex, evt: KonvaEventObject<MouseEvent>) => { evt.evt.preventDefault(); controller.toggle_menu();} );
        this.on("mousedown", (vertex: Vertex) => controller.on_vertex_mousedown(vertex));
        this.on("mouseup", (vertex: Vertex) => controller.on_vertex_mouseup(vertex));
        this.update();
        return this.group;
    }

    detach() {
        this.group?.destroyChildren();
        this.group = null;
        this.controller = null;
    }

    public get active() {
        return this.is_active;
    }

    public set active(active: boolean) {
        this.is_active = active;
        this.update();
    }

    public get label(): string {
        return this._label;
    }

    public set label(label: string) {
        if (label in ChemicalElements) {
            this.element = ChemicalElements[label];
            if (label == "C" && this.neighbors.size)
                this._label = "";
            else
                this._label = label;
        }
        else
            this._label = label;
        this.update();
    }

    public get charge(): number {
        return this._charge;
    }

    public set charge(charge: number) {
        this._charge = charge;
        this.update();
    }

    public get atomic_coords(): AtomicCoords {
        return this._atomic_coords;
    }

    public set atomic_coords(coords: AtomicCoords) {
        this._atomic_coords = coords;
        if (this.controller) {
            const stylesheet = this.controller.stylesheet;
            this.group?.setAttr("x", this._atomic_coords.x*stylesheet.scale + stylesheet.offset_x);
            this.group?.setAttr("y", this._atomic_coords.y*stylesheet.scale + stylesheet.offset_y);
        }
    }

    update() {
        if (this._neighbors.size && this._label == "C")
            this._label = "";
        if (!this.group || !this.controller)
            return;
        this.group.draggable(this._neighbors.size <= 1);
        const stylesheet = this.controller.stylesheet;
        this.group.setAttr("x", this._atomic_coords.x*stylesheet.scale + stylesheet.offset_x);
        this.group.setAttr("y", this._atomic_coords.y*stylesheet.scale + stylesheet.offset_y);
        if (this._label) {
            this.group.findOne("#circle")?.destroy();
            this.group.findOne("#active_box")?.destroy();
            const text = <Konva.Text>this.group.findOne("#text") || new Konva.Text({
                x: 0,
                y: 0,
                fontFamily: stylesheet.atom_font_family,
                fontSize: stylesheet.atom_font_size_px,
                id: "text",
            });
            text.setAttr("text", this.label);
            text.setAttr("fill", this.is_active ? stylesheet.atom_active_label_color : stylesheet.atom_label_color);
            this.group.add(text);
            this._center_text();
        }
        else {
            this.group.findOne("#text")?.destroy();
            const circle = <Konva.Circle>this.group.findOne("#circle") || new Konva.Circle({
                x: 0,
                y: 0,
                fill: stylesheet.bond_stroke_color,
                id: "circle",
            });
            circle.setAttr("radius", this._neighbors.size > 1 ? stylesheet.bond_thickness_px/2 : 0);
            this.group.add(circle);
            const active_box = <Konva.Rect>this.group.findOne("#active_box") || new Konva.Rect({
                x: -5,
                y: -5,
                width: 10,
                height: 10,
                stroke: stylesheet.atom_active_box_color,
                strokeWidth: 1,
                id: "active_box",
            });
            active_box.setAttr("strokeWidth", this.is_active ? 1 : 0);
            this.group.add(active_box);
        }
    }

    on(event: string, f: (a: Vertex, b: KonvaEventObject<MouseEvent>) => void) {
        this.group?.on(event, (evt: KonvaEventObject<MouseEvent>) => { f(this, evt); } );
    }

    // this is called back to set coordinates on drag
    on_drag(snap_to_angle: boolean) {
        if (!this.controller)
            throw Error("Vertex not attached to controller");
        const stylesheet = this.controller.stylesheet;
        if (this._neighbors.size != 1)
            return;
        const neighbor = this._neighbors.values().next().value;
        let alfa = Math.atan2(this.screen_coords.y - neighbor.screen_coords.y, this.screen_coords.x - neighbor.screen_coords.x);
        if (snap_to_angle)
            alfa = Math.round((alfa * 180 / Math.PI) / stylesheet.bond_snap_degrees)*stylesheet.bond_snap_degrees * Math.PI/180;
        this.screen_coords = {
            x : neighbor.screen_coords.x + Math.cos(alfa) * stylesheet.bond_length_px,
            y: neighbor.screen_coords.y + Math.sin(alfa) * stylesheet.bond_length_px
        };
    }

    _center_text() {
        if (!this.controller)
            throw Error("Vertex not attached to controller");
        const text = this.group?.findOne("#text");
        if (!text)
            return;
        text.setAttr("x", -text.width() / 2);
        text.setAttr("y", -text.height() / 2);
    }

    public get screen_coords(): ScreenCoords {
        if (!this.controller)
            throw Error("Vertex not attached to controller");
        return { x: this.group?.getAttr("x"), y: this.group?.getAttr("y") };
    }

    public set screen_coords(coords: ScreenCoords) {
        if (!this.controller)
            throw Error("Vertex not attached to controller");
        this.group?.setAttr("x", coords.x);
        this.group?.setAttr("y", coords.y);
        this._atomic_coords.x = (coords.x - this.controller.stylesheet.offset_x) / this.controller.stylesheet.scale;
        this._atomic_coords.y = (coords.y - this.controller.stylesheet.offset_y) / this.controller.stylesheet.scale;
    }

    public get width() {
        if (!this.controller)
            throw Error("Vertex not attached to controller");
        const text = this.group?.findOne("#text");
        return text ? text.width() + this.controller.stylesheet.atom_label_horizontal_clearance_px : 0;
    }

    public get height() {
        if (!this.controller)
            throw Error("Vertex not attached to controller");
        const text = this.group?.findOne("#text");
        return text ? text.height() + this.controller.stylesheet.atom_label_vertical_clearance_px : 0;
    }

    public get neighbors() {
        return this._neighbors;
    }

    public add_neighbor(vertex: Vertex) {
        if (this._neighbors.has(vertex))
            return;
        this._neighbors.add(vertex);
        this.update();
    }

    public remove_neighbor(vertex: Vertex) {
        this._neighbors.delete(vertex);
        this.update();
    }
}

export { Vertex, AtomicCoords, ScreenCoords };
