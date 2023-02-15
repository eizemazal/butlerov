import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { MoleculeEditor } from "../main";
import { Coords, Vertex } from "./Vertex";
import { Stylesheet } from "./Stylesheet";

enum EdgeShape {
    Single,
    Double,
    Triple,
    SingleUp,
    SingleDown,
    SingleEither,
}

enum EdgeOrientation {
    Left,
    Right,
    Center
}

// this is taken from Mol file specifiction, and parsing mol files relies on this
enum BondType {
    Single = 1,
    Double,
    Triple,
    Aromatic,
    Single_or_Double,
    Single_or_Aromatic,
    Double_or_Aromatic,
    Any
}

enum StereoType {
    Default = 0,
    Up = 1,
    Either = 4,
    Down = 6,
}

enum EdgeTopology {
    Undefined = 0,
    Chain,
    Ring
}

class Edge {
    protected controller: MoleculeEditor | null;
    protected group: Konva.Group | null;
    public v1: Vertex;
    public v2: Vertex;
    protected point1: Coords;
    protected point2: Coords;
    protected _shape: EdgeShape;
    public screen_length: number;
    public center_length: number;
    protected is_active: boolean;
    public topology: EdgeTopology;
    // angle between y and line directed from vertex1 to vertex2
    protected alfa: number;
    public id: string;
    public orientation: EdgeOrientation;

    constructor (v1: Vertex, v2: Vertex) {
        this.v1 = v1;
        this.v2 = v2;
        this._shape = EdgeShape.Single;
        this.controller = null;
        this.group = null;
        this.point1 = {x: 0, y: 0};
        this.point2 = {x: 0, y: 0};
        this.screen_length = 0;
        this.center_length = 0;
        this.alfa = 0;
        this.is_active = false;
        this.topology = EdgeTopology.Undefined;
        this.id = "";
        this.orientation = EdgeOrientation.Left;
    }

    copy(v1: Vertex, v2: Vertex) {
        const r = new Edge(v1, v2);
        r._shape = this._shape;
        r.topology = this.topology;
        r.id = this.id;
        return r;
    }

    attach(controller: MoleculeEditor): Konva.Group {
        this.controller = controller;
        if (!this.group)
            this.group = new Konva.Group();
        this.on("click", (edge: Edge, evt: KonvaEventObject<MouseEvent>) => controller.on_edge_click(edge, evt));
        this.on("mouseover", (edge: Edge) => controller.on_edge_mouseover(edge));
        this.on("mouseout", () => controller.on_edge_mouseout());
        this.on("contextmenu", (edge: Edge, evt: KonvaEventObject<MouseEvent>) => { evt.evt.preventDefault(); controller.toggle_menu();} );
        // edges of bonds are below vertices of atoms, put them back
        this.update();
        return this.group;
    }

    detach() {
        this.group?.destroyChildren();
        this.controller = null;
    }

    on(event: string, f: (a: Edge, b: KonvaEventObject<MouseEvent>) => void) {
        this.group?.on(event, (evt: KonvaEventObject<MouseEvent>) => { f(this, evt); } );
    }

    public get bond_order(): number {
        if (this._shape == EdgeShape.Double)
            return 2;
        if (this._shape == EdgeShape.Triple)
            return 3;
        return 1;
    }

    public get bond_type(): BondType {
        switch( this._shape ) {
        case EdgeShape.Double:
            return BondType.Double;
        case EdgeShape.Triple:
            return BondType.Triple;
        }
        return BondType.Single;
    }

    public set bond_type(bond_type: BondType) {
        switch( bond_type ) {
        case BondType.Double:
            this._shape = EdgeShape.Double;
            this.v1.change_neighbor_bond(this.v2, 2);
            this.v2.change_neighbor_bond(this.v1, 2);
            return;
        case BondType.Triple:
            this.v1.change_neighbor_bond(this.v2, 3);
            this.v2.change_neighbor_bond(this.v1, 3);
            this._shape = EdgeShape.Triple;
            return;
        }
        this.v1.change_neighbor_bond(this.v2, 1);
        this.v2.change_neighbor_bond(this.v1, 1);
        this._shape = EdgeShape.Single;
    }

    public get bond_stereo(): StereoType {
        switch( this._shape ) {
        case EdgeShape.SingleUp:
            return StereoType.Up;
        case EdgeShape.SingleDown:
            return StereoType.Down;
        case EdgeShape.SingleEither:
            return StereoType.Either;
        default:
            return StereoType.Default;
        }
    }

    public set bond_stereo(stereo: StereoType) {
        if (this.bond_type == BondType.Single) {
            switch (stereo) {
            case StereoType.Default:
                this._shape = EdgeShape.Single;
                return;
            case StereoType.Down:
                this._shape = EdgeShape.SingleDown;
                return;
            case StereoType.Up:
                this._shape = EdgeShape.SingleUp;
                return;
            case StereoType.Either:
                this._shape = EdgeShape.SingleEither;
                return;
            }
        }
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
        const stylesheet = this.controller.stylesheet;
        if (active) {
            this.group?.children?.forEach(e => e.setAttr("stroke", stylesheet.bond_active_color));
            this.group?.children?.forEach(e => e.setAttr("fill", stylesheet.bond_active_color));
        }
        else {
            this.group?.children?.forEach(e => e.setAttr("stroke", stylesheet.bond_stroke_color));
            this.group?.children?.forEach(e => e.setAttr("fill", stylesheet.bond_stroke_color));
        }
        this.group?.draw();
    }

    swap_vertices() {
        const v = this.v1;
        this.v1 = this.v2;
        this.v2 = v;
    }

    calculate_coordinates() {
        const stylesheet = this.controller?.stylesheet;
        this.point1 = { ...this.v1.coords };
        this.point2 = { ...this.v2.coords };
        this.screen_length = Math.sqrt((this.point2.x-this.point1.x)*(this.point2.x-this.point1.x)+(this.point2.y-this.point1.y)*(this.point2.y-this.point1.y));
        this.center_length = this.screen_length;
        if (!this.screen_length)
            return;
        this.alfa = Math.atan2(this.point2.y-this.point1.y, this.point2.x-this.point1.x) - Math.PI/2;
        this.point1 = this.v1.get_label_boundary(this.alfa+Math.PI, stylesheet?.atom_label_horizontal_clearance_px, stylesheet?.atom_label_vertical_clearance_px);
        this.point2 = this.v2.get_label_boundary(this.alfa, stylesheet?.atom_label_horizontal_clearance_px, stylesheet?.atom_label_vertical_clearance_px);
        this.screen_length = Math.sqrt((this.point2.x-this.point1.x)*(this.point2.x-this.point1.x)+(this.point2.y-this.point1.y)*(this.point2.y-this.point1.y));
    }

    // draw central line for single, double, triple and triangle shaped wedged bond
    _draw_centerline(stylesheet: Stylesheet) {
        const line = this.group?.findOne("#bond_line") ||
            new Konva.Line({
                stroke: this.is_active ? stylesheet.bond_active_color : stylesheet.bond_stroke_color,
                fill: this.is_active ? stylesheet.bond_active_color : stylesheet.bond_stroke_color,
                id: "bond_line",
                closed: true,
            });
        line.setAttr("x", this.point1.x);
        line.setAttr("y", this.point1.y);
        line.setAttr("strokeWidth", stylesheet.bond_thickness_px);
        line.setAttr("hitStrokeWidth", Math.max(stylesheet.bond_thickness_px, stylesheet.bond_hit_stroke_width));
        if ([EdgeShape.Single, EdgeShape.Double, EdgeShape.Triple].indexOf(this._shape) != -1) {
            line.setAttr("points", [ 0, 0, -this.screen_length*Math.sin(this.alfa), this.screen_length*Math.cos(this.alfa) ]);
            line.setAttr("lineJoin", "miter");
        }
        else if (this._shape == EdgeShape.SingleUp) {
            line.setAttr("points", [
                0, 0,
                -this.screen_length*Math.sin(this.alfa) + stylesheet.bond_wedge_px*Math.cos(this.alfa)/2,
                this.screen_length*Math.cos(this.alfa) + stylesheet.bond_wedge_px*Math.sin( this.alfa)/2,
                -this.screen_length*Math.sin(this.alfa) - stylesheet.bond_wedge_px*Math.cos(this.alfa)/2,
                this.screen_length*Math.cos(this.alfa) - stylesheet.bond_wedge_px*Math.sin( this.alfa)/2,
            ]);
            line.setAttr("fillEnabled", true);
            line.setAttr("lineJoin", "round");
            line.setAttr("closed", true);
        }
        else if (this._shape == EdgeShape.SingleDown) {
            line.setAttr("points", [
                0, 0,
                -this.screen_length*Math.sin(this.alfa) + stylesheet.bond_wedge_px*Math.cos(this.alfa)/2,
                this.screen_length*Math.cos(this.alfa) + stylesheet.bond_wedge_px*Math.sin( this.alfa)/2,
                -this.screen_length*Math.sin(this.alfa) - stylesheet.bond_wedge_px*Math.cos(this.alfa)/2,
                this.screen_length*Math.cos(this.alfa) - stylesheet.bond_wedge_px*Math.sin( this.alfa)/2,
            ]);
            line.setAttr("fillEnabled", false);
            line.setAttr("lineJoin", "round");
            line.setAttr("closed", true);
        }
        else if (this._shape == EdgeShape.SingleEither) {
            const pts : number[] = [];
            const npts = this.screen_length / stylesheet.bond_either_period_px;
            for (let i = 0; i <= npts; i++) {
                if (i % 2) {
                    pts.push((-this.screen_length*Math.sin(this.alfa) + stylesheet.bond_wedge_px*Math.cos(this.alfa)/2)*i/npts);
                    pts.push((this.screen_length*Math.cos(this.alfa) + stylesheet.bond_wedge_px*Math.sin( this.alfa)/2)*i/npts);
                }
                else {
                    pts.push((-this.screen_length*Math.sin(this.alfa) - stylesheet.bond_wedge_px*Math.cos(this.alfa)/2)*i/npts);
                    pts.push((this.screen_length*Math.cos(this.alfa) - stylesheet.bond_wedge_px*Math.sin( this.alfa)/2)*i/npts);
                }
            }
            pts.push(-this.screen_length*Math.sin(this.alfa));
            pts.push(this.screen_length*Math.cos(this.alfa));
            line.setAttr("points", pts);
            line.setAttr("fillEnabled", false);
            line.setAttr("closed", false);
            line.setAttr("lineJoin", "round");
        }
        this.group?.add(<Konva.Line>line);
    }

    _draw_single(stylesheet: Stylesheet) {
        this.group?.findOne("#bond_line2")?.destroy();
        this.group?.findOne("#bond_line3")?.destroy();
        this._draw_centerline(stylesheet);
    }

    _draw_double(stylesheet: Stylesheet) {
        this.group?.findOne("#bond_line3")?.destroy();
        this._draw_centerline(stylesheet);
        const line2 = this.group?.findOne("#bond_line2") ||
        new Konva.Line({
            stroke: this.is_active ? stylesheet.bond_active_color : stylesheet.bond_stroke_color,
            id: "bond_line2",
        });
        line2.setAttr("strokeWidth", stylesheet.bond_thickness_px);
        line2.setAttr("hitStrokeWidth", Math.max(stylesheet.bond_thickness_px, stylesheet.bond_hit_stroke_width));
        if (this.orientation == EdgeOrientation.Center) {
            line2.setAttr("x", this.point1.x + stylesheet.bond_spacing_px*Math.cos(this.alfa)/2);
            line2.setAttr("y", this.point1.y + stylesheet.bond_spacing_px*Math.sin(this.alfa)/2);
            const centerline = this.group?.findOne("#bond_line");
            centerline?.setAttr("x", this.point1.x - stylesheet.bond_spacing_px*Math.cos(this.alfa)/2);
            centerline?.setAttr("y", this.point1.y - stylesheet.bond_spacing_px*Math.sin(this.alfa)/2);
            line2.setAttr("points", [ 0, 0, -this.screen_length*Math.sin(this.alfa), this.screen_length*Math.cos(this.alfa) ]);
        }
        else if (this.orientation == EdgeOrientation.Left) {
            line2.setAttr("x", this.point1.x + stylesheet.bond_spacing_px*Math.cos(this.alfa) - stylesheet.double_bond_shortening*this.screen_length*Math.sin(this.alfa)/2);
            line2.setAttr("y", this.point1.y + stylesheet.bond_spacing_px*Math.sin(this.alfa) + stylesheet.double_bond_shortening*this.screen_length*Math.cos(this.alfa)/2);
            line2.setAttr("points", [ 0, 0, -this.screen_length*(1-stylesheet.double_bond_shortening)*Math.sin(this.alfa), this.screen_length*(1-stylesheet.double_bond_shortening)*Math.cos(this.alfa) ]);
        }
        else {
            line2.setAttr("x", this.point1.x - stylesheet.bond_spacing_px*Math.cos(this.alfa) - stylesheet.double_bond_shortening*this.screen_length*Math.sin(this.alfa)/2);
            line2.setAttr("y", this.point1.y - stylesheet.bond_spacing_px*Math.sin(this.alfa) + stylesheet.double_bond_shortening*this.screen_length*Math.cos(this.alfa)/2);
            line2.setAttr("points", [ 0, 0, -this.screen_length*(1-stylesheet.double_bond_shortening)*Math.sin(this.alfa), this.screen_length*(1-stylesheet.double_bond_shortening)*Math.cos(this.alfa) ]);
        }
        this.group?.add(<Konva.Line>line2);
    }

    _draw_triple(stylesheet: Stylesheet) {
        this._draw_centerline(stylesheet);
        const line2 = this.group?.findOne("#bond_line2") ||
        new Konva.Line({
            stroke: this.is_active ? stylesheet.bond_active_color : stylesheet.bond_stroke_color,
            id: "bond_line2",
        });
        line2.setAttr("strokeWidth", stylesheet.bond_thickness_px);
        line2.setAttr("hitStrokeWidth", Math.max(stylesheet.bond_thickness_px, stylesheet.bond_hit_stroke_width));
        line2.setAttr("x", this.point1.x + stylesheet.bond_spacing_px*Math.cos(this.alfa) - stylesheet.double_bond_shortening*this.screen_length*Math.sin(this.alfa)/2);
        line2.setAttr("y", this.point1.y + stylesheet.bond_spacing_px*Math.sin(this.alfa) + stylesheet.double_bond_shortening*this.screen_length*Math.cos(this.alfa)/2);
        line2.setAttr("points", [ 0, 0, -this.screen_length*(1-stylesheet.double_bond_shortening)*Math.sin(this.alfa), this.screen_length*(1-stylesheet.double_bond_shortening)*Math.cos(this.alfa) ]);
        this.group?.add(<Konva.Line>line2);

        const line3 = this.group?.findOne("#bond_line3") ||
        new Konva.Line({
            stroke: this.is_active ? stylesheet.bond_active_color : stylesheet.bond_stroke_color,
            id: "bond_line3",
        });
        line3.setAttr("strokeWidth", stylesheet.bond_thickness_px);
        line3.setAttr("hitStrokeWidth", Math.max(stylesheet.bond_thickness_px, stylesheet.bond_hit_stroke_width));
        line3.setAttr("x", this.point1.x - stylesheet.bond_spacing_px*Math.cos(this.alfa) - stylesheet.double_bond_shortening*this.screen_length*Math.sin(this.alfa)/2);
        line3.setAttr("y", this.point1.y - stylesheet.bond_spacing_px*Math.sin(this.alfa) + stylesheet.double_bond_shortening*this.screen_length*Math.cos(this.alfa)/2);
        line3.setAttr("points", [ 0, 0, -this.screen_length*(1-stylesheet.double_bond_shortening)*Math.sin(this.alfa), this.screen_length*(1-stylesheet.double_bond_shortening)*Math.cos(this.alfa) ]);
        this.group?.add(<Konva.Line>line3);
    }

    public set z_index(index: number) {
        this.group?.setAttr("zIndex", index);
    }

    update() {
        if (!this.controller)
            return;
        const stylesheet = this.controller.stylesheet;
        this.calculate_coordinates();
        switch(this._shape) {
        case EdgeShape.Single:
        case EdgeShape.SingleUp:
        case EdgeShape.SingleDown:
        case EdgeShape.SingleEither:
            this._draw_single(stylesheet);
            break;
        case EdgeShape.Double:
            this._draw_double(stylesheet);
            break;
        case EdgeShape.Triple:
            this._draw_triple(stylesheet);
            break;
        }
        if (this.group?.getStage())
            this.group.draw();
    }
}

export { Edge, EdgeShape, BondType, EdgeTopology, EdgeOrientation };