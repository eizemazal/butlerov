import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { ChemicalElement, ChemicalElements } from "../lib/elements";
import { Stylesheet } from "./Stylesheet";
import { MoleculeEditor } from "../main";
import { int_to_subscript } from "../lib/indices";

type AtomicCoords = {
    x: number;
    y: number;
}

type ScreenCoords = {
    x: number;
    y: number;
}

type Neighbor = {
    vertex: Vertex;
    bond_order: number;
}

enum VertexTopology {
    Undefined = 0,
    Chain,
    Ring,
}

class Vertex {
    protected group: Konva.Group | null;
    protected controller: MoleculeEditor | null;
    protected _neighbors: Array<Neighbor>;
    protected is_active: boolean;
    protected _atomic_coords: AtomicCoords;
    protected _charge : number;
    protected _label : string;
    protected _element: ChemicalElement | null;
    protected _h_count: number;
    public topology: VertexTopology;
    public id: string;

    constructor() {
        this._atomic_coords = { x: 0, y: 0};
        this._label = "";
        this._charge = 0;
        this.controller = null;
        this._element = ChemicalElements["C"];
        this._h_count = 4;
        this.group = null;
        this.is_active = false;
        this._neighbors = [];
        this.id = "";
        this.topology = VertexTopology.Undefined;
    }

    copy(): Vertex {
        const v = new Vertex();
        v._atomic_coords = { ...this._atomic_coords };
        v._label = this.label;
        v._element = this._element;
        v._charge = this._charge;
        v._h_count = this._h_count;
        v.id = this.id;
        v.topology = this.topology;
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
        if (label == "") {
            this._element = ChemicalElements["C"];
            if (this.neighbors.length)
                this._label = "";
            else
                this._label = "C";
        }
        else if (label in ChemicalElements) {
            this._element = ChemicalElements[label];
            if (label == "C" && this.neighbors.length)
                this._label = "";
            else
                this._label = label;
        }
        else
            this._label = label;
        this.calculate_h_count();
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

    public get element(): ChemicalElement|null {
        return this._element;
    }

    least_crowded_angle() {
        // list of positive angles between x axis and corresponding neighboring atom, written as [index, angle in radians]
        let angles: Array<number> = [];
        angles = this.neighbors.map(e => Math.atan2(e.vertex.screen_coords.y-this.screen_coords.y, e.vertex.screen_coords.x-this.screen_coords.x));
        angles.sort( (a,b) => a > b ? 1 : -1);
        let largest_diff = 0;
        let angle1 = 0;
        // find largest angle between adjacent neighbors
        for (let i = 0; i < angles.length; i++) {
            const prev_idx = i == 0 ? angles.length-1 : i-1;
            const diff = i == 0 ? angles[i] - angles[prev_idx] + 2*Math.PI: angles[i] - angles[prev_idx];
            if (diff > largest_diff) {
                largest_diff = diff;
                angle1 = angles[prev_idx];
            }
        }
        angle1 = angle1 + largest_diff/2;
        return (angle1 + 2*Math.PI) % (2*Math.PI);
    }

    private _reposition_charge_group(stylesheet: Stylesheet, charge_group: Konva.Group) {
        const charge_group_w = stylesheet.atom_charge_frame_enabled ? charge_group.findOne("#charge_frame").width() : charge_group.findOne("#charge_text").width();
        const charge_group_h = stylesheet.atom_charge_frame_enabled ?charge_group.findOne("#charge_frame").height() : charge_group.findOne("#charge_text").height();
        const alfa = this.neighbors.length ? this.least_crowded_angle() : 1.75*Math.PI;
        let x;
        let y;
        if (this.group?.findOne("#text")) {
            const w = this.width/2 + charge_group_w/2;
            const h = this.height/2 + charge_group_h/2;
            const beta = Math.atan(h/w);
            if (alfa == Math.PI) {
                x = -w;
                y = 0;
            }
            else if (alfa == 3*Math.PI * 4) {
                x = 0;
                y = -h;
            }
            else if (alfa > 2*Math.PI - beta || alfa <= beta) {
                x = w;
                y = w * Math.tan(alfa);
            }
            else if (alfa > beta && alfa <= Math.PI - beta ) {
                x = h / Math.tan(alfa);
                y = h;
            }
            else if (alfa > Math.PI - beta && alfa <= Math.PI + beta) {
                x = -w;
                y = -w*Math.tan(alfa);
            }
            else {
                x = -h / Math.tan(alfa);
                y = -h;
            }
        }
        else {
            x = stylesheet.atom_charge_distance * Math.cos(alfa);
            y = stylesheet.atom_charge_distance * Math.sin(alfa);
        }

        x += -charge_group_w/2;
        y += -charge_group_h/2;
        charge_group.setAttr("x", x);
        charge_group.setAttr("y", y);
    }

    private _draw_charge(stylesheet: Stylesheet) {
        if (!this._charge) {
            const charge_group = <Konva.Group>this.group?.findOne("#charge_group");
            if (charge_group) {
                charge_group.destroyChildren();
                charge_group.destroy();
            }
            return;
        }
        // add padding between frame and charge. This is not to be configured by stylesheet
        const hpadding = this._charge == -1 ? 2 : 4;
        const vpadding = Math.abs(this._charge) > 1 ? 2 : 0;

        const charge_group = <Konva.Group>this.group?.findOne("#charge_group") || new Konva.Group({
            id: "charge_group",
        });
        const charge_text = <Konva.Text>this.group?.findOne("#charge_text") || new Konva.Text({
            fontFamily: stylesheet.atom_font_family,
            fontSize: stylesheet.atom_charge_font_size,
            id: "charge_text",
            align: "center",
        });
        charge_text.setAttr("x", stylesheet.atom_charge_frame_enabled ? hpadding / 2 : 0);
        charge_text.setAttr("y", stylesheet.atom_charge_frame_enabled ? vpadding / 2 : 0);
        charge_text.setAttr("text", this.charge == -1 ? "－" : this.charge == 1 ? "+" : this.charge > 1 ? `${this._charge}+` : `${Math.abs(this._charge)}-`);
        charge_text.setAttr("fill", this.is_active ? stylesheet.atom_active_label_color : stylesheet.atom_label_color);
        charge_group.add(charge_text);
        if (stylesheet.atom_charge_frame_enabled) {
            const charge_frame = <Konva.Rect>this.group?.findOne("#charge_frame") || new Konva.Rect({
                id: "charge_frame",
                strokeWidth: 1,
            });
                // do not allow rect to become extended vertically
            const rect_w = Math.max(charge_text.getAttr("width") + hpadding, charge_text.getAttr("height") + vpadding );
            charge_frame.setAttr("width", rect_w);
            charge_frame.setAttr("height", charge_text.getAttr("height") + vpadding);
            charge_frame.setAttr("stroke", this.is_active ? stylesheet.atom_active_label_color : stylesheet.atom_label_color);
            charge_frame.setAttr("cornerRadius", Math.abs(this._charge) > 1 ? stylesheet.atom_charge_frame_corner_radius_multi : stylesheet.atom_charge_frame_corner_radius_single);
            charge_group.add(charge_frame);
        }
        else {
            this.group?.findOne("#charge_text")?.destroy();
            this.group?.findOne("#charge_frame")?.destroy();
        }
        this._reposition_charge_group(stylesheet, charge_group);
        this.group?.add(charge_group);
    }

    update() {
        if (this._neighbors.length && this._label == "C")
            this._label = "";
        if (!this.group || !this.controller)
            return;
        this.group.draggable(this._neighbors.length <= 1);
        const stylesheet = this.controller.stylesheet;
        this.group.setAttr("x", this._atomic_coords.x*stylesheet.scale + stylesheet.offset_x);
        this.group.setAttr("y", this._atomic_coords.y*stylesheet.scale + stylesheet.offset_y);
        /*const debug_circle = <Konva.Circle>this.group.findOne("#debug_circle") || new Konva.Circle({
            radius: 2,
            fill: "red",
        });
        this.group.add(debug_circle);*/
        if (this._label) {
            this.group.findOne("#circle")?.destroy();
            this.group.findOne("#active_box")?.destroy();
            const text = <Konva.Text>this.group.findOne("#text") || new Konva.Text({
                fontFamily: stylesheet.atom_font_family,
                fontSize: stylesheet.atom_font_size_px,
                id: "text",
            });
            let label_to_display = this.label;
            if (this._h_count) {
                label_to_display += "H";
                if (this._h_count > 1)
                    label_to_display += int_to_subscript(this._h_count);
            }
            text.setAttr("text", label_to_display);
            text.setAttr("fill", this.is_active ? stylesheet.atom_active_label_color : stylesheet.atom_label_color);
            text.setAttr("x", -text.width() / 2);
            text.setAttr("y", -text.height() / 2);
            this.group.add(text);
        }
        else {
            this.group.findOne("#text")?.destroy();
            // the circle is needed to mask intersections of edges when there is no label present
            const circle = <Konva.Circle>this.group.findOne("#circle") || new Konva.Circle({
                fill: stylesheet.bond_stroke_color,
                id: "circle",
            });
            circle.setAttr("radius", this._neighbors.length > 1 ? stylesheet.bond_thickness_px/2 : 0);
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
        this._draw_charge(stylesheet);
    }

    on(event: string, f: (a: Vertex, b: KonvaEventObject<MouseEvent>) => void) {
        this.group?.on(event, (evt: KonvaEventObject<MouseEvent>) => { f(this, evt); } );
    }

    // this is called back to set coordinates on drag
    on_drag(snap_to_angle: boolean) {
        if (!this.controller)
            throw Error("Vertex not attached to controller");
        const stylesheet = this.controller.stylesheet;
        if (this._neighbors.length != 1)
            return;
        const n_vertex = this._neighbors[0].vertex;
        let alfa = Math.atan2(this.screen_coords.y - n_vertex.screen_coords.y, this.screen_coords.x - n_vertex.screen_coords.x);
        if (snap_to_angle)
            alfa = Math.round((alfa * 180 / Math.PI) / stylesheet.bond_snap_degrees)*stylesheet.bond_snap_degrees * Math.PI/180;
        this.screen_coords = {
            x : n_vertex.screen_coords.x + Math.cos(alfa) * stylesheet.bond_length_px,
            y: n_vertex.screen_coords.y + Math.sin(alfa) * stylesheet.bond_length_px
        };
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

    private calculate_h_count() {
        if (this.element) {
            const n_valent_bonds = this.neighbors.reduce( (p, e) => p + e.bond_order, 0);
            for (const valency of this.element.valences) {
                if (valency >= n_valent_bonds) {
                    this._h_count = valency - n_valent_bonds;
                    return;
                }
            }
        }
        this._h_count = 0;
    }

    public get neighbors() {
        return this._neighbors;
    }

    public add_neighbor(vertex: Vertex, bond_order: number) {
        if (this._neighbors.findIndex( e=> e.vertex == vertex) != -1)
            return;
        this._neighbors.push({vertex: vertex, bond_order: bond_order} );
        this.calculate_h_count();
        this.update();
    }

    public remove_neighbor(vertex: Vertex) {
        this._neighbors = this._neighbors.filter(e => e.vertex != vertex);
        this.calculate_h_count();
        this.update();
    }

    public change_neighbor_bond(vertex: Vertex, bond_order: number) {
        const neighbor = this.neighbors.find( e => e.vertex == vertex);
        if (!neighbor)
            return;
        neighbor.bond_order = bond_order;
        this.calculate_h_count();
        this.update();
    }

    public get h_count() {
        return this._h_count;
    }
}

export { Vertex, AtomicCoords, ScreenCoords, VertexTopology };
