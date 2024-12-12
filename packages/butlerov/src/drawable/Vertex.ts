import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { ChemicalElement, ChemicalElements } from "../lib/elements";
import { Drawable } from "./Drawable";
import { Controller } from "../controller/Controller";
import { SegmentedText, TextSegment, TextDirection, TextAlignment } from "./SegmentedText";
import { Coords, format_charge } from "../lib/common";
import { CompositeLinearFormulaFragment } from "../lib/linear";


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

export enum LabelType {
    Atom,
    Linear,
    Custom
}

class Vertex extends Drawable {
    group: Konva.Group | null = null;
    protected text: SegmentedText = new SegmentedText();
    protected _neighbors: Map<Vertex, number> = new Map();
    protected is_active = false;
    protected _coords: Coords = { x: 0, y: 0 };
    protected _charge = 0;
    protected _isotope = 0;
    protected _element: ChemicalElement = ChemicalElements["C"];
    protected _linear: CompositeLinearFormulaFragment = new CompositeLinearFormulaFragment();
    protected _h_count = 4;
    protected _custom_label = "";
    protected _label_alignment: LabelAlignment = LabelAlignment.Left;
    protected _label_type: LabelType = LabelType.Atom;
    public topology: VertexTopology = VertexTopology.Undefined;
    public id = "";

    copy(): Vertex {
        const v = new Vertex();
        v._coords = { ...this._coords };
        v._element = this._element;
        v._charge = this._charge;
        v._isotope = this._isotope;
        v._h_count = this._h_count;
        v._custom_label = this._custom_label;
        v._label_type = this._label_type;
        v.id = this.id;
        v.topology = this.topology;
        return v;
    }

    attach(controller: Controller): Konva.Group {
        this.controller = controller;
        if (!this.group)
            this.group = new Konva.Group();
        this.group.x(this._coords.x);
        this.group.y(this._coords.y);
        this.group.add(this.text.attach(controller));
        this.attach_events(controller);
        this.compute_text();
        this.update();
        return this.group;
    }

    detach() {
        this.text.detach();
        this.group?.destroyChildren();
        this.controller = null;
    }

    attach_events(controller: Controller): void {
        const event_names = ["dragmove", "mouseover", "mouseout", "contextmenu", "click", "mousedown", "mouseup"];
        for (const event_name of event_names) {
            this.group?.on(event_name, (evt: KonvaEventObject<MouseEvent>) => controller.dispatch(this, evt));
        }
    }


    public get active() {
        return this.is_active;
    }

    public set active(active: boolean) {
        if (!this.controller || !this.group)
            return;
        this.is_active = active;
        this.text.color = this.is_active ? this.controller.stylesheet.atom_active_label_color : this.controller.stylesheet.atom_label_color;
        this.group.findOne("#active_box")?.setAttr("strokeWidth", this.is_active ? 1 : 0);
    }

    public hide() {
        this.group?.hide();
    }

    public show() {
        this.group?.show();
    }

    public get label_type(): LabelType {
        return this._label_type;
    }

    public get label(): string {
        if (this._label_type == LabelType.Atom && this._element.symbol == "C" && this.neighbors.size && this._isotope == 0)
            return "";
        if (this._label_type == LabelType.Atom)
            return this._element.symbol;
        if (this._label_type == LabelType.Linear)
            return this._linear.as_string;
        return this._custom_label;
    }

    public set label(label: string) {
        this._isotope = 0;
        if (label == "") {
            this._label_type = LabelType.Atom;
            this._element = ChemicalElements["C"];
            this.compute_h_count();
        }
        else if (label in ChemicalElements) {
            this._label_type = LabelType.Atom;
            this._element = ChemicalElements[label];
            this.compute_h_count();
        }
        else {
            try {
                const linear = new CompositeLinearFormulaFragment();
                linear.parse_string(label);
                if (linear && linear.components.length) {
                    this._label_type = LabelType.Linear;
                    this._linear = linear;
                }
            }
            catch {
                this._label_type = LabelType.Custom;
                this._custom_label = label;
            }
        }

        this.compute_text();
        this.update();
    }

    public get linear_formula(): CompositeLinearFormulaFragment | null {
        if (this.label_type == LabelType.Linear)
            return this._linear;
        return null;
    }

    private compute_text(): void {

        if (!this.controller)
            return;

        if (this._label_type == LabelType.Atom && this._element.symbol == "C" && this.neighbors.size && this._isotope == 0) {
            if (this.charge) {
                this.text.update_with_segments([new TextSegment("", "", format_charge(this._charge))]);
            }
            else
                this.text.clear();
            return;
        }

        if (this._label_type == LabelType.Linear) {
            this.text.format_linear_formula(this._linear);
            return;
        }

        if (this._label_type == LabelType.Custom) {
            this.text.format_text(this._custom_label);
            return;
        }

        const segments: TextSegment[] = [];
        const atom_segment = new TextSegment(this._element.symbol);
        if (this._isotope)
            atom_segment.index_lt = this._isotope.toString();
        segments.push(atom_segment);
        if (this.h_count)
            segments.push(new TextSegment("H", this.h_count > 1 ? this.h_count.toString() : ""));
        if (this.charge) {
            const last_segment = segments[segments.length - 1];
            last_segment.index_rt = format_charge(this._charge);
        }
        this.text.update_with_segments(segments);
    }


    public get charge(): number {
        return this._charge;
    }

    public set charge(charge: number) {
        this._charge = charge;
        this.compute_h_count();
        this.compute_text();
        this.update();
    }

    public get isotope(): number {
        return this._isotope;
    }

    public set isotope(isotope: number) {
        this._isotope = isotope;
        this.compute_text();
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

    public get element(): ChemicalElement | null {
        return this._label_type == LabelType.Atom ? this._element : null;
    }

    update() {
        if (!this.group || !this.controller)
            return;
        this.group.draggable(this._neighbors.size <= 1);
        const stylesheet = this.controller.stylesheet;
        this.group.x(this._coords.x);
        this.group.y(this._coords.y);
        if (this.text.empty) {
            // the circle is needed to mask intersections of edges when there is no label present
            const circle = <Konva.Circle>this.group.findOne("#circle") || new Konva.Circle({
                fill: stylesheet.bond_stroke_color,
                id: "circle",
            });
            circle.setAttr("radius", this._neighbors.size > 1 ? stylesheet.bond_thickness_px / 2 : 0);
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
        else {
            if (this.label_type == LabelType.Custom)
                this.text.direction = TextDirection.LEFT_TO_RIGHT;
            else {
                const alfa = this.least_crowded_angle();
                //   \   /
                //     N
                //     H
                if (this.neighbors.size > 1 && alfa > Math.PI / 4 && alfa <= 3 * Math.PI / 4) {
                    this.text.direction = TextDirection.TOP_TO_BOTTOM;
                }
                //     H
                //     N
                //   /   \
                else if (this.neighbors.size > 1 && alfa > 5 * Math.PI / 4 && alfa <= 7 * Math.PI / 4) {
                    this.text.direction = TextDirection.BOTTOM_TO_TOP;
                }
                // -COOH
                else if (
                    (this.neighbors.size > 1 && (alfa > 7 * Math.PI / 4 || alfa <= Math.PI / 4)) ||
                    (this.neighbors.size == 1 && (alfa < Math.PI / 2 || alfa > 3 * Math.PI / 2))
                ) {
                    this.text.direction = TextDirection.LEFT_TO_RIGHT;
                }
                // HOOC-
                else if (
                    (this.neighbors.size > 1 && alfa > 3 * Math.PI / 4 && alfa <= 5 * Math.PI / 4) ||
                    (this.neighbors.size == 1 && (alfa >= Math.PI / 2 && alfa <= 3 * Math.PI / 2))
                ) {
                    this.text.direction = TextDirection.RIGHT_TO_LEFT;
                }
            }
            this.group.findOne("#circle")?.destroy();
            this.group.findOne("#active_box")?.destroy();
            this.text.color = this.active ? stylesheet.atom_active_label_color : stylesheet.atom_label_color;
            this.text.alignment = this.topology == VertexTopology.Ring ? TextAlignment.FIRST_SEGMENT_FIRST_LETTER : TextAlignment.FIRST_SEGMENT_CENTER;
        }
        this.text.update();
        this.group.getStage() && this.group.draw();
    }

    /**
     * For the current vertex, return angle between x axis and the least crowded direction, i.e. finds two neighbors with
     * maximum angle between edges to them, and find a bisector. For vertex without neighbors, returns 0.
     * @returns angle in radians [0; 2*Math.PI), angles are counted clockwise
     */
    least_crowded_angle() {
        // list of positive angles between x axis and corresponding neighboring atom, written as [index, angle in radians]
        let angles: Array<number> = [];
        angles = Array.from(this.neighbors.keys()).map(e => Math.atan2(e.coords.y - this.coords.y, e.coords.x - this.coords.x));
        angles.sort((a, b) => a > b ? 1 : -1);
        let largest_diff = 0;
        let angle1 = 0;
        // find largest angle between adjacent neighbors
        for (let i = 0; i < angles.length; i++) {
            const prev_idx = i == 0 ? angles.length - 1 : i - 1;
            const diff = i == 0 ? angles[i] - angles[prev_idx] + 2 * Math.PI : angles[i] - angles[prev_idx];
            if (diff > largest_diff) {
                largest_diff = diff;
                angle1 = angles[prev_idx];
            }
        }
        angle1 = angle1 + largest_diff / 2;
        return (angle1 + 2 * Math.PI) % (2 * Math.PI);
    }


    // this is called back to set coordinates on drag
    on_drag(snap_to_angle: boolean) {
        if (!this.controller)
            throw Error("Vertex not attached to controller");
        const stylesheet = this.controller.stylesheet;
        if (this._neighbors.size != 1)
            return;
        const n_vertex = this._neighbors.keys().next().value;
        if (n_vertex === undefined)
            return;
        let alfa = Math.atan2(this.coords.y - n_vertex.coords.y, this.coords.x - n_vertex.coords.x);
        if (snap_to_angle) {
            const alfa_rounded = Math.round((alfa * 180 / Math.PI) / stylesheet.bond_snap_degrees) * stylesheet.bond_snap_degrees * Math.PI / 180;
            // if the pivot vertex has exactly two adjacents (one we are moving), allow to create 180 deg angle with the rest adjacent
            if (n_vertex._neighbors.size == 2) {
                const iter = n_vertex._neighbors.keys();
                let n2_vertex: Vertex | undefined = iter.next().value;
                if (n2_vertex === this)
                    n2_vertex = iter.next().value;
                if (n2_vertex === undefined)
                    throw "this should not be";
                const beta = Math.atan2(n_vertex.coords.y - n2_vertex.coords.y, n_vertex.coords.x - n2_vertex.coords.x);
                if (Math.abs(alfa - beta) * 180 / Math.PI < stylesheet.bond_snap_degrees && Math.abs(alfa_rounded - alfa) > Math.abs(alfa - beta))
                    alfa = beta;
                else
                    alfa = alfa_rounded;
            }
            else
                alfa = alfa_rounded;
        }
        this.coords = {
            x: n_vertex.coords.x + Math.cos(alfa) * stylesheet.bond_length_px,
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
            let n_valent_bonds = 0;
            for (const [, bond_order] of this.neighbors)
                n_valent_bonds += bond_order;
            this._h_count = this._element.get_h_count(n_valent_bonds, this._charge);
        }
        else
            this._h_count = 0;
    }

    public get neighbors() {
        return this._neighbors;
    }

    public set_neighbor(vertex: Vertex, bond_order: number) {
        this._neighbors.set(vertex, bond_order);
        this.compute_h_count();
        this.compute_text();
        this.update();
    }

    public remove_neighbor(vertex: Vertex) {
        this._neighbors.delete(vertex);
        this.compute_h_count();
        this.compute_text();
        this.update();
    }

    public get h_count() {
        return this._h_count;
    }

    public get_boundary_offset_at(alfa: number): Coords {
        if (this.text.empty)
            return { x: 0, y: 0 };
        return this.text.get_boundary_offset_at(alfa);
    }
}

export { Vertex, VertexTopology };
