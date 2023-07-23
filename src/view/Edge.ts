import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { MoleculeEditor } from "../main";
import { Coords, Vertex } from "./Vertex";

enum EdgeShape {
    Single,
    Double,
    Triple,
    SingleUp,
    SingleDown,
    SingleEither,
    DoubleEither,
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

/**
 * Class representing edges between Vertices. It is called Edge, not Bond, because there are multicenter bonds
 * that Edge does not represent. Edge always connects two Vertices, v1 and v2
 */
class Edge {
    /**
     * If Edge is drawn on the screen, this will refer to MoleculeEditor. Otherwise it can be detached from screen
     * @defaultValue null
     */
    protected controller: MoleculeEditor | null;
    /**
     * Contains all Konva elements that need to be drawn for this Edge. Or null when Edge is detached from controller.
     * @defaultValue null
     */
    protected group: Konva.Group | null;
    /**
     * First Vertex. There are Edges that are directed - they are directed from v1 to v2
     */
    public v1: Vertex;
    /**
     * Second Vertex. There are Edges that are directed - they are directed from v1 to v2
     */
    public v2: Vertex;
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
        if (this._shape == EdgeShape.Double || this._shape == EdgeShape.DoubleEither)
            return 2;
        if (this._shape == EdgeShape.Triple)
            return 3;
        return 1;
    }

    public get bond_type(): BondType {
        switch( this._shape ) {
        case EdgeShape.Double:
        case EdgeShape.DoubleEither:
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
        if (!this.screen_length)
            return;
        this.alfa = Math.atan2(this.point2.y-this.point1.y, this.point2.x-this.point1.x) - Math.PI/2;
        this.point1 = this.v1.get_label_boundary(this.alfa+Math.PI, stylesheet?.atom_label_horizontal_clearance_px, stylesheet?.atom_label_vertical_clearance_px);
        this.point2 = this.v2.get_label_boundary(this.alfa, stylesheet?.atom_label_horizontal_clearance_px, stylesheet?.atom_label_vertical_clearance_px);
        this.screen_length = Math.sqrt((this.point2.x-this.point1.x)*(this.point2.x-this.point1.x)+(this.point2.y-this.point1.y)*(this.point2.y-this.point1.y));
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
        const stylesheet = this.controller?.stylesheet;
        const result: Konva.Line[] = [];
        if (!stylesheet)
            return result;
        for (let i = 0; i < count; i++) {
            result.push(this.group?.findOne("#bond_line" + i) ||
            new Konva.Line({
                stroke: this.is_active ? stylesheet.bond_active_color : stylesheet.bond_stroke_color,
                fill: this.is_active ? stylesheet.bond_active_color : stylesheet.bond_stroke_color,
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
        line.setAttr("points", [ 0, 0, this.screen_length, 0 ]);
        line.setAttr("lineJoin", "miter");
        this.group?.add(<Konva.Line>line);
    }

    draw_single_up() {
        const stylesheet = this.controller?.stylesheet;
        if (!stylesheet)
            return;
        const line = this.create_lines(1)[0];
        line.setAttr("points", [
            0, 0,
            this.screen_length, -stylesheet.bond_wedge_px/2,
            this.screen_length, stylesheet.bond_wedge_px/2
        ]);
        line.setAttr("fillEnabled", true);
        line.setAttr("closed", true);
        line.setAttr("lineJoin", "round");
        this.group?.add(<Konva.Line>line);
    }

    draw_single_down() {
        const stylesheet = this.controller?.stylesheet;
        if (!stylesheet)
            return;
        const line = this.create_lines(1)[0];
        line.setAttr("points", [
            0, -stylesheet.bond_wedge_px/2,
            0, stylesheet.bond_wedge_px/2,
            this.screen_length, 0
        ]);
        line.setAttr("fillEnabled", false);
        line.setAttr("closed", true);
        line.setAttr("lineJoin", "round");
        this.group?.add(<Konva.Line>line);
    }

    draw_single_either() {
        const stylesheet = this.controller?.stylesheet;
        if (!stylesheet)
            return;
        const line = this.create_lines(1)[0];
        const pts : number[] = [];
        const npts = this.screen_length / stylesheet.bond_either_period_px;
        for (let i = 0; i <= npts; i++) {
            pts.push(i / npts*this.screen_length);
            pts.push(Math.sign(i%2-0.5)*stylesheet.bond_wedge_px*i/npts);
        }
        line.setAttr("points", pts);
        line.setAttr("fillEnabled", false);
        line.setAttr("closed", false);
        line.setAttr("lineJoin", "round");
        this.group?.add(<Konva.Line>line);
    }

    draw_double() {
        const stylesheet = this.controller?.stylesheet;
        if (!stylesheet)
            return;
        const lines = this.create_lines(2);
        if (this.orientation == EdgeOrientation.Center) {
            lines[0].setAttr("points", [ 0, -stylesheet.bond_spacing_px/2, this.screen_length, -stylesheet.bond_spacing_px/2 ]);
            lines[1].setAttr("points", [ 0, stylesheet.bond_spacing_px/2, this.screen_length, stylesheet.bond_spacing_px/2 ]);
        }
        else {
            const sign = this.orientation == EdgeOrientation.Right ? 1 : -1;
            lines[0].setAttr("points", [ 0, 0, this.screen_length, 0 ]);
            lines[1].setAttr("points", [
                this.screen_length*stylesheet.double_bond_shortening/2, sign*stylesheet.bond_spacing_px,
                this.screen_length*(1-stylesheet.double_bond_shortening/2), sign*stylesheet.bond_spacing_px,
            ]);
        }
        this.group?.add(<Konva.Line>lines[0]);
        this.group?.add(<Konva.Line>lines[1]);
    }

    draw_double_either() {
        const stylesheet = this.controller?.stylesheet;
        if (!stylesheet)
            return;
        const lines = this.create_lines(2);
        lines[0].setAttr("points", [ 0, -stylesheet.bond_spacing_px/2, this.screen_length, stylesheet.bond_spacing_px/2 ]);
        lines[1].setAttr("points", [ 0, stylesheet.bond_spacing_px/2, this.screen_length, -stylesheet.bond_spacing_px/2 ]);
        this.group?.add(<Konva.Line>lines[0]);
        this.group?.add(<Konva.Line>lines[1]);
    }

    draw_triple() {
        const stylesheet = this.controller?.stylesheet;
        if (!stylesheet)
            return;
        const lines = this.create_lines(3);
        lines[0].setAttr("points", [ 0, 0, this.screen_length, 0 ]);
        lines[1].setAttr("points", [
            this.screen_length*stylesheet.double_bond_shortening/2, -stylesheet.bond_spacing_px,
            this.screen_length*(1-stylesheet.double_bond_shortening/2), -stylesheet.bond_spacing_px,
        ]);
        lines[2].setAttr("points", [
            this.screen_length*stylesheet.double_bond_shortening/2, stylesheet.bond_spacing_px,
            this.screen_length*(1-stylesheet.double_bond_shortening/2), stylesheet.bond_spacing_px,
        ]);
        this.group?.add(<Konva.Line>lines[0]);
        this.group?.add(<Konva.Line>lines[1]);
        this.group?.add(<Konva.Line>lines[2]);
    }

    update() {
        if (!this.controller || !this.group)
            return;
        this.calculate_coordinates();
        switch(this._shape) {
        case EdgeShape.Single:
            this.draw_single();
            break;
        case EdgeShape.SingleUp:
            this.draw_single_up();
            break;
        case EdgeShape.SingleDown:
            this.draw_single_down();
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
        this.group.rotation(180*this.alfa/Math.PI + 90);
        if (this.group.getStage())
            this.group.draw();
    }
}

export { Edge, EdgeShape, BondType, EdgeTopology, EdgeOrientation };