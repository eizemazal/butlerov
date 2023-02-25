import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { ChemicalElement, ChemicalElements } from "../lib/elements";
import { Stylesheet } from "./Stylesheet";
import { MoleculeEditor } from "../main";
import { int_to_subscript } from "../lib/indices";

type Coords = {
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

enum LabelAlignment {
    Left,
    Right,
    Top,
    Bottom
}

class Vertex {
    group: Konva.Group | null;
    protected controller: MoleculeEditor | null;
    protected _neighbors: Array<Neighbor>;
    protected is_active: boolean;
    protected _coords: Coords;
    protected _charge : number;
    protected _label : string;
    protected _computed_label: string;
    protected _element: ChemicalElement | null;
    protected _h_count: number;
    protected _label_alignment: LabelAlignment;
    /**
     * Offset of label text element origin to atom center. For example, SO3H group is to have it in the middle of S letter,
     * and LiOOC in the middle of C
     */
    protected _label_offset: Coords;
    public topology: VertexTopology;
    public id: string;

    constructor() {
        this._coords = { x: 0, y: 0};
        this._label = "";
        this._computed_label = "";
        this._charge = 0;
        this.controller = null;
        this._element = ChemicalElements["C"];
        this._h_count = 4;
        this.group = null;
        this.is_active = false;
        this._neighbors = [];
        this.id = "";
        this._label_alignment = LabelAlignment.Left;
        this.topology = VertexTopology.Undefined;
        this._label_offset = { x: 0, y: 0 };
    }

    copy(): Vertex {
        const v = new Vertex();
        v._coords = { ...this._coords };
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
        this.on("dragmove", (vertex: Vertex, evt: KonvaEventObject<MouseEvent>) => controller.on_vertex_dragmove(vertex, evt));
        this.on("mouseover", (vertex: Vertex) => controller.on_vertex_mouseover(vertex));
        this.on("mouseout", () => controller.on_vertex_mouseout());
        this.on("click", (vertex: Vertex, evt: KonvaEventObject<MouseEvent>) => controller.on_vertex_click(vertex, evt));
        this.on("contextmenu", (vertex: Vertex, evt: KonvaEventObject<MouseEvent>) => { evt.evt.preventDefault(); controller.toggle_menu();} );
        this.on("mousedown", (vertex: Vertex) => controller.on_vertex_mousedown(vertex));
        this.on("mouseup", (vertex: Vertex) => controller.on_vertex_mouseup(vertex));
        this.update();
        return this.group;
    }

    detach() {
        this.group?.destroyChildren();
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
        this.compute_h_count();
        this.update();
    }

    private draw_label(stylesheet: Stylesheet) : void {
        const text = this.group?.findOne("#text");
        if (!text)
            return;
        text.setAttr("fill", this.active ? stylesheet.atom_active_label_color : stylesheet.atom_label_color);
        if (!this._h_count) {
            this._computed_label = this._label;
            this._label_alignment = LabelAlignment.Left;
            text.setAttr("text", this._label);
            this._label_offset = {x : -text.getAttr("width") / 2, y: -text.getAttr("height") / 2};
        }
        else {
            const alfa = this.least_crowded_angle();
            text.setAttr("text", this._label);
            const atom_label_w = text.width();
            const atom_label_h = text.height();
            //   \   /
            //     N
            //     H
            if (this.neighbors.length > 1 && alfa > Math.PI / 4 && alfa <= 3*Math.PI/4) {
                this._computed_label = this._label + "\nH" + (this._h_count > 1 ? int_to_subscript(this._h_count) : "");
                this._label_alignment = LabelAlignment.Top;
                text.setAttr("text", this._computed_label);
                this._label_offset = {x : -text.getAttr("width") / 2, y: -atom_label_h / 2};
            }
            //     H
            //     N
            //   /   \
            else if (this.neighbors.length > 1 && alfa > 5*Math.PI / 4 && alfa <= 7*Math.PI/4) {
                this._computed_label = "H" + (this._h_count > 1 ? int_to_subscript(this._h_count) : "") + "\n" + this._label;
                this._label_alignment = LabelAlignment.Bottom;
                text.setAttr("text", this._computed_label);
                this._label_offset = {x : -text.getAttr("width") / 2, y: -text.getAttr("height")  + atom_label_h / 2};
            }
            // -COOH
            else if (
                (this.neighbors.length > 1 && (alfa > 7*Math.PI/4 || alfa <= Math.PI / 4)) ||
                (this.neighbors.length == 1 && (alfa < Math.PI/2 || alfa > 3 * Math.PI / 2))
            ) {
                this._computed_label = this._label + "H" + (this._h_count > 1 ? int_to_subscript(this._h_count) : "");
                this._label_alignment = LabelAlignment.Left;
                text.setAttr("text", this._computed_label);
                this._label_offset = {x : -atom_label_w / 2, y: -atom_label_h / 2};
            }
            // HOOC-
            else if (
                (this.neighbors.length > 1 && alfa > 3*Math.PI/4 && alfa <= 5*Math.PI/4) ||
                (this.neighbors.length == 1 && (alfa >= Math.PI/2 && alfa <= 3 * Math.PI / 2))
            ) {
                this._computed_label = "H" + (this._h_count > 1 ? int_to_subscript(this._h_count) : "") + this._label;
                this._label_alignment = LabelAlignment.Right;
                text.setAttr("text", this._computed_label);
                this._label_offset = {x : -text.getAttr("width")+atom_label_w / 2, y: -atom_label_h / 2};
            }
        }

        text.x(this._label_offset.x);
        text.y(this._label_offset.y);

        if (stylesheet.debug_enable_label_rects) {
            const rect = <Konva.Rect>this.group?.findOne("#label_rect") || new Konva.Rect({
                strokeWidth: 1,
                stroke: "red",
                id: "label_rect",
            });
            rect.setAttr("x", text.x());
            rect.setAttr("y", text.y());
            rect.setAttr("width", text.width());
            rect.setAttr("height", text.height());
            this.group?.add(rect);
        }
    }

    public get charge(): number {
        return this._charge;
    }

    public set charge(charge: number) {
        this._charge = charge;
        this.compute_h_count();
        this.update();
    }

    public get coords(): Coords {
        if (this.group) {
            this._coords.x = this.group.x();
            this._coords.y = this.group.y();
        }
        return this._coords;
    }

    public set coords(coords: Coords) {
        this._coords = coords;
        this.group?.x(coords.x);
        this.group?.y(coords.y);
    }

    public get element(): ChemicalElement|null {
        return this._element;
    }

    /**
     * For the current vertex, return angle between x axis and the least crowded direction, i.e. finds two neighbors with
     * maximum angle between edges to them, and find a bisector. For vertex without neighbors, returns 0.
     * @returns angle in radians [0; 2*Math.PI), angles are counted clockwise
     */
    least_crowded_angle() {
        // list of positive angles between x axis and corresponding neighboring atom, written as [index, angle in radians]
        let angles: Array<number> = [];
        angles = this.neighbors.map(e => Math.atan2(e.vertex.coords.y-this.coords.y, e.vertex.coords.x-this.coords.x));
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

    public get_label_boundary(alfa: number, clearance_h = 0, clearance_v = 0): Coords {
        const text = this.group?.findOne("#text");
        if (!text)
            return this.coords;
        const label_width = text.width() + 2 * clearance_h;
        const label_height = text.height() + 2 * clearance_v;
        const offset_x = this._label_offset.x - clearance_h;
        const offset_y = this._label_offset.y - clearance_v;
        const x = this.group?.getAttr("x");
        const y = this.group?.getAttr("y");
        alfa = (alfa + 2*Math.PI) % (2*Math.PI);
        if (alfa == Math.PI/2) {
            return { x: x + label_width + offset_x, y: y };
        }
        if ( 2*Math.PI - alfa <= Math.atan(offset_x / offset_y) || alfa <= Math.atan((label_width+offset_x) / -offset_y) ) {
            return {x: x-offset_y*Math.tan(alfa) , y: y+offset_y };
        }
        if (alfa >= Math.atan((label_width+offset_x) / -offset_y)
        && alfa - Math.PI/2 <= Math.atan((label_height + offset_y) / (label_width + offset_x))
        )
        {
            return {x: x + label_width + offset_x, y: y + Math.tan(alfa - Math.PI/2)*(label_width + offset_x) };
        }
        if (alfa - Math.PI/2 >= Math.atan((label_height + offset_y) / (label_width + offset_x))
            && 3*Math.PI/2 - alfa >= Math.atan((label_height + offset_y) / -offset_x)
        ) {
            return { x: x + (label_height + offset_y)/Math.tan(alfa - Math.PI/2), y: y + label_height + offset_y};
        }
        if (3*Math.PI/2 - alfa <= Math.atan((label_height + offset_y) / -offset_x)
            && 2*Math.PI - alfa >= Math.atan(offset_x / offset_y)
        ) {
            return { x: x + offset_x, y: y + offset_x*Math.tan(alfa - 3*Math.PI/2) };
        }
        return {x: x, y: y};

    }

    private _reposition_charge_group(stylesheet: Stylesheet, charge_group: Konva.Group) {
        const frame = charge_group.findOne("#charge_frame");
        const charge_group_w = frame ? frame.width() : charge_group.findOne("#charge_text").width();
        const charge_group_h = frame ? frame.height() : charge_group.findOne("#charge_text").height();
        const alfa = this.neighbors.length ? this.least_crowded_angle() : 1.75*Math.PI;
        let x;
        let y;
        if (this.group?.findOne("#text")) {
            const coords = this.get_label_boundary(alfa + Math.PI / 2, charge_group_w/2 + stylesheet.atom_label_horizontal_clearance_px, charge_group_h/2 + stylesheet.atom_label_vertical_clearance_px);
            x = coords.x - this.group.x();
            y = coords.y - this.group.y();
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
            id: "charge_text",
            align: "center",
        });
        charge_text.setAttr("x", stylesheet.atom_charge_frame_enabled ? hpadding / 2 : 0);
        charge_text.setAttr("y", stylesheet.atom_charge_frame_enabled ? vpadding / 2 : 0);
        charge_text.setAttr("text", this.charge == -1 ? "－" : this.charge == 1 ? "+" : this.charge > 1 ? `${this._charge}+` : `${Math.abs(this._charge)}-`);
        charge_text.setAttr("fill", this.is_active ? stylesheet.atom_active_label_color : stylesheet.atom_label_color);
        charge_text.setAttr("fontFamily", stylesheet.atom_font_family);
        charge_text.setAttr("fontSize", stylesheet.atom_charge_font_size);
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
        this.group.x(this._coords.x);
        this.group.y(this._coords.y);
        if (stylesheet.debug_enable_atom_center_dots) {
            const debug_circle = <Konva.Circle>this.group.findOne("#debug_circle") || new Konva.Circle({
                radius: 2,
                fill: "red",
            });
            this.group.add(debug_circle);
        }
        if (this._label) {
            this.group.findOne("#circle")?.destroy();
            this.group.findOne("#active_box")?.destroy();
            const text = <Konva.Text>this.group.findOne("#text") || new Konva.Text({
                id: "text",
                align: "center",
                verticalAlign: "top",
            });
            text.setAttr("fontFamily", stylesheet.atom_font_family);
            text.setAttr("fontSize", stylesheet.atom_font_size_px);
            this.draw_label(stylesheet);
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
        this.group.getStage() && this.group.draw();
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
        let alfa = Math.atan2(this.coords.y - n_vertex.coords.y, this.coords.x - n_vertex.coords.x);
        if (snap_to_angle) {
            const alfa_rounded = Math.round((alfa * 180 / Math.PI) / stylesheet.bond_snap_degrees)*stylesheet.bond_snap_degrees * Math.PI/180;
            // if the pivot vertex has exactly two adjacents (one we are moving), allow to create 180 deg angle with the rest adjacent
            if (n_vertex._neighbors.length == 2) {
                const n2_vertex:Vertex = n_vertex._neighbors[0].vertex == this ? n_vertex._neighbors[1].vertex : n_vertex._neighbors[0].vertex;
                const beta = Math.atan2(n_vertex.coords.y - n2_vertex.coords.y, n_vertex.coords.x - n2_vertex.coords.x);
                if (Math.abs(alfa - beta)*180/Math.PI < stylesheet.bond_snap_degrees && Math.abs(alfa_rounded - alfa) > Math.abs(alfa - beta))
                    alfa = beta;
                else
                    alfa = alfa_rounded;
            }
            else
                alfa = alfa_rounded;
        }
        this.coords = {
            x : n_vertex.coords.x + Math.cos(alfa) * stylesheet.bond_length_px,
            y: n_vertex.coords.y + Math.sin(alfa) * stylesheet.bond_length_px
        };
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

    private compute_h_count() {
        if (this._element) {
            const n_valent_bonds = this.neighbors.reduce( (p, e) => p + e.bond_order, 0);
            this._h_count = this._element.get_h_count(n_valent_bonds, this._charge);
        }
        else
            this._h_count = 0;
    }

    public get neighbors() {
        return this._neighbors;
    }

    public add_neighbor(vertex: Vertex, bond_order: number) {
        if (this._neighbors.findIndex( e=> e.vertex == vertex) != -1)
            return;
        this._neighbors.push({vertex: vertex, bond_order: bond_order} );
        this.compute_h_count();
        this.update();
    }

    public remove_neighbor(vertex: Vertex) {
        this._neighbors = this._neighbors.filter(e => e.vertex != vertex);
        this.compute_h_count();
        this.update();
    }

    public change_neighbor_bond(vertex: Vertex, bond_order: number) {
        const neighbor = this.neighbors.find( e => e.vertex == vertex);
        if (!neighbor)
            return;
        neighbor.bond_order = bond_order;
        this.compute_h_count();
        this.update();
    }

    public get h_count() {
        return this._h_count;
    }
}

export { Vertex, Coords, VertexTopology };
