import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { DrawableVertex } from "./Vertex";
import { DrawableBase } from "./Base";
import { Controller } from "../controller/Controller";
import { Edge, EdgeOrientation, EdgeShape, Coords } from "../types";


enum EdgeTopology {
    Undefined = 0,
    Chain,
    Ring
}

/**
 * Class representing edges between Vertices. It is called Edge, not Bond, because there are multicenter bonds
 * that Edge does not represent. Edge always connects two Vertices, v1 and v2
 */
class DrawableEdge extends DrawableBase implements Edge {
    /**
     * First Vertex. There are Edges that are directed - they are directed from v1 to v2
     */
    public v1: DrawableVertex;
    /**
     * Second Vertex. There are Edges that are directed - they are directed from v1 to v2
     */
    public v2: DrawableVertex;
    /**
     * Internal use only - coordinates of the first point that the edge connects. It is updated by @function calculate_coordinates
     * and takes into account vertical and horizontal clearance of vertex label
     */
    protected point1: Coords;
    /**
     * Internal use only - coordinates of the second point that the edge connects. It is updated by @function calculate_coordinates
     * and takes into account vertical and horizontal clearance of vertex label
     */
    protected point2: Coords;
    protected _shape: EdgeShape;
    /**
     * Length of the edge in screen coordinates (between @var point1 and @var point2)
     */
    public screen_length: number;

    protected is_active: boolean;
    public topology: EdgeTopology;
    /**
     * angle between y axis and line directed from vertex1 to vertex2, clockwise
     */
    protected alfa: number;
    /**
     * Arbitrary identification string used by copy constructors to create copies of objects
     */
    public id = 0;
    public orientation: EdgeOrientation;

    constructor(v1: DrawableVertex, v2: DrawableVertex) {
        super();
        this.v1 = v1;
        this.v2 = v2;
        this._shape = EdgeShape.Single;
        this.controller = null;
        this.group = null;
        this.point1 = { x: 0, y: 0 };
        this.point2 = { x: 0, y: 0 };
        this.screen_length = 0;
        this.alfa = 0;
        this.is_active = false;
        this.topology = EdgeTopology.Undefined;
        this.id = 0;
        this.orientation = EdgeOrientation.Left;
    }

    public get vertices(): number[] {
        return [this.v1.id, this.v2.id];
    }

    public read(): Edge {
        const e: Edge = {
            vertices: this.vertices,
            shape: this.shape
        }
        return e;
    }

    copy() {
        const r = new DrawableEdge(this.v1, this.v2);
        r._shape = this._shape;
        r.topology = this.topology;
        r.id = this.id;
        return r;
    }

    attach_events(controller: Controller): void {
        const event_names = ["click", "mouseover", "mouseout", "contextmenu"];
        for (const event_name of event_names) {
            this.group?.on(event_name, (evt: KonvaEventObject<MouseEvent>) => controller.dispatch(this, evt));
        }
    }

    public get bond_order(): number {
        if (this._shape == EdgeShape.Double || this._shape == EdgeShape.DoubleEither)
            return 2;
        if (this._shape == EdgeShape.Triple)
            return 3;
        return 1;
    }



    public get shape() {
        return this._shape;
    }

    public set shape(shape: EdgeShape) {
        if (this._shape == shape && [
            EdgeShape.SingleDown,
            EdgeShape.SingleUp,
            EdgeShape.SingleEither
        ].indexOf(this._shape) != -1) {
            this.swap_vertices();
        }
        else {
            this._shape = shape;
        }
        if (this.controller)
            this.update();
    }

    // returns if the bond may have left or right orientations
    public get is_asymmetric(): boolean {
        return this._shape == EdgeShape.Double;
    }

    public get active() {
        return this.is_active;
    }

    public set active(active: boolean) {
        this.is_active = active;
        if (!this.controller)
            return;
        const theme = this.controller.theme;
        if (active) {
            this.group?.children?.forEach(e => e.setAttr("stroke", theme.bond_active_color));
            this.group?.children?.forEach(e => e.setAttr("fill", theme.bond_active_color));
        }
        else {
            this.group?.children?.forEach(e => e.setAttr("stroke", theme.bond_stroke_color));
            this.group?.children?.forEach(e => e.setAttr("fill", theme.bond_stroke_color));
        }
        this.group?.draw();
    }

    swap_vertices() {
        const v = this.v1;
        this.v1 = this.v2;
        this.v2 = v;
    }

    calculate_coordinates() {
        this.point1 = { ...this.v1.coords };
        this.point2 = { ...this.v2.coords };
        this.screen_length = Math.sqrt((this.point2.x - this.point1.x) * (this.point2.x - this.point1.x) + (this.point2.y - this.point1.y) * (this.point2.y - this.point1.y));
        if (!this.screen_length)
            return;
        this.alfa = Math.atan2(this.point2.y - this.point1.y, this.point2.x - this.point1.x);
        const boundary_offset1 = this.v1.get_boundary_offset_at(this.alfa);
        const boundary_offset2 = this.v2.get_boundary_offset_at(Math.PI + this.alfa);

        this.alfa -= Math.PI / 2;

        this.point1.x += boundary_offset1.x;
        this.point1.y += boundary_offset1.y;
        this.point2.x += boundary_offset2.x;
        this.point2.y += boundary_offset2.y;
        this.screen_length = Math.sqrt((this.point2.x - this.point1.x) * (this.point2.x - this.point1.x) + (this.point2.y - this.point1.y) * (this.point2.y - this.point1.y));
    }

    public set z_index(index: number) {
        this.group?.setAttr("zIndex", index);
    }

    /**
     * Create sequentially numbered lines if they do not exist, removing extraneous ones, and return an array with them.
     * @param stylesheet
     * @param count number of lines to create
     * @returns array of lines
     */
    create_lines(count = 1): Konva.Line[] {
        const stylesheet = this.controller?.style;
        const result: Konva.Line[] = [];
        if (!stylesheet)
            return result;
        for (let i = 0; i < count; i++) {
            result.push(this.group?.findOne("#bond_line" + i) ||
                new Konva.Line({
                    stroke: this.is_active ? this.controller?.theme.bond_active_color : this.controller?.theme.bond_stroke_color,
                    fill: this.is_active ? this.controller?.theme.bond_active_color : this.controller?.theme.bond_stroke_color,
                    id: "bond_line" + i,
                    strokeWidth: stylesheet.bond_thickness_px,
                    hitStrokeWidth: Math.max(stylesheet.bond_thickness_px, stylesheet.bond_hit_stroke_width),
                }));
        }
        let i = count;
        let line;
        do {
            line = this.group?.findOne("#bond_line" + i++);
            line?.destroy();
        } while (line);
        return result;
    }

    draw_single() {
        const line = this.create_lines(1)[0];
        line.setAttr("points", [0, 0, this.screen_length, 0]);
        line.setAttr("lineJoin", "miter");
        this.group?.add(line as Konva.Line);
    }

    draw_single_up_down(fill: boolean) {
        const stylesheet = this.controller?.style;
        if (!stylesheet)
            return;
        const line = this.create_lines(1)[0];
        const startx = this.v1.label ? 0.05 * this.screen_length : 0;
        const endx = this.v2.label ? 0.92 * this.screen_length : this.screen_length;
        line.setAttr("points", [
            startx, 0,
            endx, -stylesheet.bond_wedge_px / 2,
            endx, stylesheet.bond_wedge_px / 2
        ]);
        line.setAttr("fillEnabled", fill);
        line.setAttr("closed", true);
        line.setAttr("lineJoin", "round");
        this.group?.add(line as Konva.Line);
    }

    draw_single_either() {
        const stylesheet = this.controller?.style;
        if (!stylesheet)
            return;
        const line = this.create_lines(1)[0];
        const pts: number[] = [];
        const npts = this.screen_length / stylesheet.bond_either_period_px;
        for (let i = 0; i <= npts; i++) {
            pts.push(i / npts * this.screen_length);
            pts.push(Math.sign(i % 2 - 0.5) * stylesheet.bond_wedge_px * i / npts);
        }
        line.setAttr("points", pts);
        line.setAttr("fillEnabled", false);
        line.setAttr("closed", false);
        line.setAttr("lineJoin", "round");
        this.group?.add(line as Konva.Line);
    }

    draw_double() {
        const stylesheet = this.controller?.style;
        if (!stylesheet)
            return;
        const lines = this.create_lines(2);
        if (this.orientation == EdgeOrientation.Center) {
            lines[0].setAttr("points", [0, -stylesheet.bond_spacing_px / 2, this.screen_length, -stylesheet.bond_spacing_px / 2]);
            lines[1].setAttr("points", [0, stylesheet.bond_spacing_px / 2, this.screen_length, stylesheet.bond_spacing_px / 2]);
        }
        else {
            const sign = this.orientation == EdgeOrientation.Right ? 1 : -1;
            lines[0].setAttr("points", [0, 0, this.screen_length, 0]);
            lines[1].setAttr("points", [
                this.screen_length * stylesheet.double_bond_shortening / 2, sign * stylesheet.bond_spacing_px,
                this.screen_length * (1 - stylesheet.double_bond_shortening / 2), sign * stylesheet.bond_spacing_px,
            ]);
        }
        this.group?.add(lines[0] as Konva.Line);
        this.group?.add(lines[1] as Konva.Line);
    }

    draw_double_either() {
        const stylesheet = this.controller?.style;
        if (!stylesheet)
            return;
        const lines = this.create_lines(2);
        lines[0].setAttr("points", [0, -stylesheet.bond_spacing_px / 2, this.screen_length, stylesheet.bond_spacing_px / 2]);
        lines[1].setAttr("points", [0, stylesheet.bond_spacing_px / 2, this.screen_length, -stylesheet.bond_spacing_px / 2]);
        this.group?.add(lines[0] as Konva.Line);
        this.group?.add(lines[1] as Konva.Line);
    }

    draw_triple() {
        const stylesheet = this.controller?.style;
        if (!stylesheet)
            return;
        const lines = this.create_lines(3);
        lines[0].setAttr("points", [0, 0, this.screen_length, 0]);
        lines[1].setAttr("points", [
            this.screen_length * stylesheet.double_bond_shortening / 2, -stylesheet.bond_spacing_px,
            this.screen_length * (1 - stylesheet.double_bond_shortening / 2), -stylesheet.bond_spacing_px,
        ]);
        lines[2].setAttr("points", [
            this.screen_length * stylesheet.double_bond_shortening / 2, stylesheet.bond_spacing_px,
            this.screen_length * (1 - stylesheet.double_bond_shortening / 2), stylesheet.bond_spacing_px,
        ]);
        this.group?.add(lines[0] as Konva.Line);
        this.group?.add(lines[1] as Konva.Line);
        this.group?.add(lines[2] as Konva.Line);
    }

    update() {
        if (!this.controller || !this.group)
            return;
        this.calculate_coordinates();
        switch (this._shape) {
            case EdgeShape.Single:
                this.draw_single();
                break;
            case EdgeShape.SingleUp:
                this.draw_single_up_down(true);
                break;
            case EdgeShape.SingleDown:
                this.draw_single_up_down(false);
                break;
            case EdgeShape.SingleEither:
                this.draw_single_either();
                break;
            case EdgeShape.Double:
                this.draw_double();
                break;
            case EdgeShape.DoubleEither:
                this.draw_double_either();
                break;
            case EdgeShape.Triple:
                this.draw_triple();
                break;
            default:
                this.draw_single();
        }
        this.group.setAttr("x", this.point1.x);
        this.group.setAttr("y", this.point1.y);
        this.group.rotation(180 * this.alfa / Math.PI + 90);
        if (this.group.getStage())
            this.group.draw();
    }
}

export { DrawableEdge, EdgeTopology };