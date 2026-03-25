import Konva from "konva";
import { DrawableVertex } from "./Vertex";
import { DrawableBase } from "./Base";
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
class DrawableEdge extends DrawableBase {
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

    /**
     * Return edge as model leaving vertices empty (indices must be computed for graph)
     * @returns Edge as model with empty vertices = []
     */
    public as_model(): Edge {
        const e: Edge = {
            vertices: [],
            shape: this.shape === EdgeShape.Single ? undefined : this.shape,
        };
        return e;
    }

    copy() {
        const r = new DrawableEdge(this.v1, this.v2);
        r._shape = this._shape;
        r.topology = this.topology;
        r.id = this.id;
        return r;
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
        if (!this.controller)
            return [];
        const stylesheet = this.controller.style;
        const result: Konva.Line[] = [];
        if (!stylesheet)
            return result;
        for (let i = 0; i < count; i++) {
            const line: Konva.Line = this.group?.findOne("#bond_line" + i) ||
                new Konva.Line({
                    id: "bond_line" + i
                });
            line.stroke(this.is_active ? this.controller.theme.bond_active_color : this.controller.theme.bond_stroke_color);
            line.fill(this.is_active ? this.controller?.theme.bond_active_color : this.controller?.theme.bond_stroke_color);
            line.strokeWidth(stylesheet.bond_thickness_px);
            line.hitStrokeWidth(Math.max(stylesheet.bond_thickness_px, stylesheet.bond_hit_stroke_width));
            result.push(line);
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

    /**
     * Bond axis (local +x) and perpendicular (local +y) in the edge group's coordinate system.
     *
     * - **d** — unit vector along the bond from `point1` toward `point2` (same direction as local +x after the group rotation).
     *   World coordinates of a local point `(lx, ly)` use `lx * d + ly * p` in the offset from `point1`.
     * - **p** — unit vector perpendicular to **d**, chosen so local +y matches Konva's bond group: `p = (-d.y, d.x)` (90° CCW
     *   from **d** in mathematical x–y coordinates; with screen y downward this aligns the group's local y with Konva).
     *
     * Local +x runs along the bond; +y is the “sideways” direction used for double-bond offsets and miter math.
     */
    private bondFrame(): { d: Coords; p: Coords; L: number } | null {
        const L = this.screen_length;
        if (L < 1e-9)
            return null;
        const dx = (this.point2.x - this.point1.x) / L;
        const dy = (this.point2.y - this.point1.y) / L;
        const d: Coords = { x: dx, y: dy };
        const p: Coords = { x: -dy, y: dx };
        return { d, p, L };
    }

    private worldToLocal(origin: Coords, d: Coords, p: Coords, world: Coords): Coords {
        const ox = world.x - origin.x;
        const oy = world.y - origin.y;
        return { x: ox * d.x + oy * d.y, y: ox * p.x + oy * p.y };
    }

    /**
     * For a horizontal line `y = y0` in local bond coordinates, intersect neighbor rays (from `vertex` toward each
     * neighbor except `otherEnd`) with that line. Folds those x-values into a single limit using `aggregate`.
     *
     * - **`aggregate === 'min'`** (bond start near local x = 0): start from `baseline` (typically `0`) and take the
     *   minimum x among valid intersections — extends the double-bond segment backward toward −x when needed.
     * - **`aggregate === 'max'`** (bond end near local x = L): start from `baseline` (typically `L`) and take the
     *   maximum x — extends forward toward +x when needed.
     *
     * @param d — @see bondFrame: unit vector along the bond (+local x).
     * @param p — @see bondFrame: unit vector along +local y, perpendicular to the bond.
     */
    private doubleBondMiterAlongAxis(
        vertex: DrawableVertex,
        otherEnd: DrawableVertex,
        y0: number,
        d: Coords,
        p: Coords,
        vertexLocal: Coords,
        baseline: number,
        aggregate: "min" | "max",
    ): number {
        let x = baseline;
        for (const [w,] of vertex.neighbors) {
            if (w === otherEnd)
                continue;
            const dwx = w.coords.x - vertex.coords.x;
            const dwy = w.coords.y - vertex.coords.y;
            const len = Math.hypot(dwx, dwy);
            if (len < 1e-9)
                continue;
            const ux = (dwx * d.x + dwy * d.y) / len;
            const uy = (dwx * p.x + dwy * p.y) / len;
            if (Math.abs(uy) < 1e-9)
                continue;
            const t = (y0 - vertexLocal.y) / uy;
            if (t < -1e-6)
                continue;
            const xInt = vertexLocal.x + t * ux;
            x = aggregate === "min" ? Math.min(x, xInt) : Math.max(x, xInt);
        }
        return x;
    }

    /**
     * Intersection of an infinite line with a closed axis-aligned rectangle (slab method).
     *
     * @param ox - Origin x of the line **P(t) = (ox, oy) + t · (dx, dy)** (world / same space as the AABB).
     * @param oy - Origin y of the line.
     * @param dx - X component of the line direction (need not be unit length; only sign and ratio matter).
     * @param dy - Y component of the line direction.
     * @param minX - Left edge of the AABB.
     * @param minY - Top edge of the AABB.
     * @param maxX - Right edge of the AABB.
     * @param maxY - Bottom edge of the AABB.
     * @returns `[tMin, tMax]` — inclusive interval of **t** for which **P(t)** lies inside the closed box, or `null` if the line misses the box (or is degenerate outside it).
     */
    private lineAABBIntersectInterval(
        ox: number,
        oy: number,
        dx: number,
        dy: number,
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
    ): [number, number] | null {
        const EPS = 1e-9;
        let t0 = -Infinity;
        let t1 = Infinity;
        if (Math.abs(dx) < EPS) {
            if (ox < minX || ox > maxX)
                return null;
        }
        else {
            const tx1 = (minX - ox) / dx;
            const tx2 = (maxX - ox) / dx;
            const txEnter = Math.min(tx1, tx2);
            const txExit = Math.max(tx1, tx2);
            t0 = Math.max(t0, txEnter);
            t1 = Math.min(t1, txExit);
        }
        if (Math.abs(dy) < EPS) {
            if (oy < minY || oy > maxY)
                return null;
        }
        else {
            const ty1 = (minY - oy) / dy;
            const ty2 = (maxY - oy) / dy;
            const tyEnter = Math.min(ty1, ty2);
            const tyExit = Math.max(ty1, ty2);
            t0 = Math.max(t0, tyEnter);
            t1 = Math.min(t1, tyExit);
        }
        if (t0 > t1)
            return null;
        return [t0, t1];
    }

    /**
     * Shortens the double-bond stroke along the bond so the **near-vertex** end (parameter **t ≤ 0** on the ray from
     * **p0World** along **d**) does not enter the padded atom label box.
     *
     * @param xMiter - Proposed ray parameter **t** (distance along **d** if **d** is unit length) for the miter corner on
     *   the side of **p0World** toward negative **t**; same convention as local bond-axis coordinates used in `draw_double`.
     * @param vertex - Vertex whose label bounds are tested (typically the endpoint of this bond segment).
     * @param p0World - World-space point on the offset double-bond line (origin of the ray **p0World + t · d**).
     * @param d - Bond direction in world space (same frame as `p0World` and `getLabelBoundsRelativeTo`).
     * @returns Possibly increased **t** so the segment does not overlap the label AABB on the **t ≤ 0** side; unchanged if
     *   there is no label or the line does not hit the box in that half.
     */
    private clampDoubleBondMiterBeforeLabel(
        xMiter: number,
        vertex: DrawableVertex,
        p0World: Coords,
        d: Coords,
    ): number {
        const parent = this.group?.getParent() ?? undefined;
        const bounds = vertex.getLabelBoundsRelativeTo(parent);
        if (!bounds)
            return xMiter;
        const pad = 1.5;
        const minX = bounds.x - pad;
        const minY = bounds.y - pad;
        const maxX = bounds.x + bounds.width + pad;
        const maxY = bounds.y + bounds.height + pad;
        const interval = this.lineAABBIntersectInterval(p0World.x, p0World.y, d.x, d.y, minX, minY, maxX, maxY);
        if (!interval)
            return xMiter;
        const [tmin, tmax] = interval;
        if (tmin > 0)
            return xMiter;
        const tEdge = Math.min(0, tmax);
        return Math.max(xMiter, tEdge);
    }

    /**
     * Shortens the double-bond stroke along the bond so the **far-vertex** end (parameter **t ≥ baseline** on the ray
     * **p0World + t · d**) does not enter the padded atom label box past the first intersection.
     *
     * @param xMiter - Proposed ray parameter **t** for the outer miter corner toward positive **t** (farther along **d**).
     * @param vertex - Vertex whose label bounds are tested (typically the other endpoint of the bond).
     * @param p0World - World-space origin of the ray **p0World + t · d** (same offset line as for the “before” clamp).
     * @param d - Bond direction in world space.
     * @param baseline - Minimum **t** that is already committed (e.g. inner shortened end **x0** or bond length **L**);
     *   the clamp only considers intersections with the label in **[baseline, +∞)**.
     * @returns Possibly reduced **t** so the segment from **baseline** to **t** stays outside the label; unchanged if there
     *   is no label or no overlap past **baseline**.
     */
    private clampDoubleBondMiterAfterLabel(
        xMiter: number,
        vertex: DrawableVertex,
        p0World: Coords,
        d: Coords,
        baseline: number,
    ): number {
        const parent = this.group?.getParent() ?? undefined;
        const bounds = vertex.getLabelBoundsRelativeTo(parent);
        if (!bounds)
            return xMiter;
        const pad = 1.5;
        const minX = bounds.x - pad;
        const minY = bounds.y - pad;
        const maxX = bounds.x + bounds.width + pad;
        const maxY = bounds.y + bounds.height + pad;
        const interval = this.lineAABBIntersectInterval(p0World.x, p0World.y, d.x, d.y, minX, minY, maxX, maxY);
        if (!interval)
            return xMiter;
        const [tmin, tmax] = interval;
        if (tmax < baseline)
            return xMiter;
        const lo = Math.max(baseline, tmin);
        if (lo > tmax)
            return xMiter;
        return Math.min(xMiter, lo);
    }

    draw_double() {
        const stylesheet = this.controller?.style;
        if (!stylesheet)
            return;
        const frame = this.bondFrame();
        if (!frame)
            return;
        const { d, p, L } = frame;
        const v1l = this.worldToLocal(this.point1, d, p, this.v1.coords);
        const v2l = this.worldToLocal(this.point1, d, p, this.v2.coords);

        const lines = this.create_lines(2);
        if (this.orientation == EdgeOrientation.Center) {
            const half = stylesheet.bond_spacing_px / 2;
            const y0a = -half;
            const y0b = half;
            let x0a = this.doubleBondMiterAlongAxis(this.v1, this.v2, y0a, d, p, v1l, 0, "min");
            let x0b = this.doubleBondMiterAlongAxis(this.v1, this.v2, y0b, d, p, v1l, 0, "min");
            let x1a = this.doubleBondMiterAlongAxis(this.v2, this.v1, y0a, d, p, v2l, L, "max");
            let x1b = this.doubleBondMiterAlongAxis(this.v2, this.v1, y0b, d, p, v2l, L, "max");
            const p0a = { x: this.point1.x + y0a * p.x, y: this.point1.y + y0a * p.y };
            const p0b = { x: this.point1.x + y0b * p.x, y: this.point1.y + y0b * p.y };
            x0a = this.clampDoubleBondMiterBeforeLabel(x0a, this.v1, p0a, d);
            x0b = this.clampDoubleBondMiterBeforeLabel(x0b, this.v1, p0b, d);
            x1a = this.clampDoubleBondMiterAfterLabel(x1a, this.v2, p0a, d, L);
            x1b = this.clampDoubleBondMiterAfterLabel(x1b, this.v2, p0b, d, L);
            lines[0].setAttr("points", [x0a, y0a, x1a, y0a]);
            lines[1].setAttr("points", [x0b, y0b, x1b, y0b]);
        }
        else {
            const sign = this.orientation == EdgeOrientation.Right ? 1 : -1;
            const yOff = sign * stylesheet.bond_spacing_px;
            const shortStart = L * stylesheet.double_bond_shortening / 2;
            let shortEnd = L * (1 - stylesheet.double_bond_shortening / 2);
            // Keep shortened ends toward v2; only adjust start at v1 so the offset line does not cross adjacent bonds.
            let x0m = this.doubleBondMiterAlongAxis(this.v1, this.v2, yOff, d, p, v1l, 0, "min");
            let x0 = Math.max(shortStart, x0m);
            const pOff = { x: this.point1.x + yOff * p.x, y: this.point1.y + yOff * p.y };
            x0 = this.clampDoubleBondMiterBeforeLabel(x0, this.v1, pOff, d);
            shortEnd = this.clampDoubleBondMiterAfterLabel(shortEnd, this.v2, pOff, d, x0);
            lines[0].setAttr("points", [0, 0, L, 0]);
            lines[1].setAttr("points", [x0, yOff, shortEnd, yOff]);
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