import Konva from "konva";
import { Controller } from "../controller/Controller";
import { DrawableEdge, EdgeTopology } from "./Edge";
import { DrawableVertex, VertexTopology } from "./Vertex";
import { LabelType, Graph, EdgeOrientation, EdgeShape } from "../types";
import { DrawableBase } from "./Base";
import { Coords } from "../types";

/**
 * DrawableGraph is a representation molecular structure. It is undirected, disconnected graph consisting of vertices and edges,
 * representing atoms (or superatoms), and chemical bonds.
 * DrawableGraph can be attached to controller (that is responsible for UI), or detached (just to represent data).
 * Operations on DrawableGraph, such as addition and removal of vertices and edges, are implemented as methods that return
 * detached DrawableGraphs internally referring to the same @see DrawableVertex and @see DrawableEdge objects that are present in original DrawableGraph.
 * This allows to implement operation history (Undo and Redo) easily.
 */
class DrawableGraph extends DrawableBase implements Graph {

    readonly type = "Graph";

    /**
     * List of @see DrawableVertex objects representing atoms
     */
    vertices: DrawableVertex[];
    /**
     * List of @see DrawableEdge objects representing bonds
     */
    edges: DrawableEdge[];
    /**
     * Array of subgraphs representing ringsystems in the graph. This value is populated when @see update_topology is called.
     * @default []
     * This property is used internally to compute edge orientation for double bonds (i.e. in benzene all double bonds must be inside)
     */
    ringsystems: DrawableGraph[];


    constructor(graph: Graph | undefined = undefined) {
        super();
        this.vertices = [];
        this.edges = [];
        this.ringsystems = [];
        if (graph !== undefined)
            this.write(graph);
    }

    read(): Graph {
        return {
            type: "Graph",
            vertices: this.vertices.map(e => e.read()),
            edges: this.edges.map(e => e.read())
        };
    }

    write(graph: Graph) {
        this.vertices = graph.vertices.map(e => new DrawableVertex(e));
        this.edges = graph.edges.map(e => {
            const edge = this.bind_vertices(this.vertices[e.vertices[1]], this.vertices[e.vertices[0]], e.shape);
            edge.shape = e.shape === undefined ? EdgeShape.Single : e.shape;
            if (e.orientation !== undefined)
                edge.orientation = e.orientation;
            return edge;
        });
        this.update_topology();
        this.edges.forEach(e => { this.update_edge_orientation(e); });
    }

    /**
     * Provide a detached copy of the graph, maintaining connectivity and order of vertices and edges in the @see vertices and @see edges.
     * @returns Copy constructed detached @see DrawableGraph
     */
    copy() {
        const r = new DrawableGraph();
        r.vertices = this.vertices.map(e => e.copy());
        r.edges = this.edges.map(e => {
            const v1 = r.vertices[this.vertices.findIndex(v => v == e.v1)];
            const v2 = r.vertices[this.vertices.findIndex(v => v == e.v2)];
            v1.set_neighbor(v2, e.bond_order);
            v2.set_neighbor(v1, e.bond_order);
            const new_edge = e.copy();
            new_edge.v1 = v1;
            new_edge.v2 = v2;
            return new_edge;
        });
        return r;
    }

    /**
    * Attach @see DrawableGraph to controller.
    * @param controller an object of @see Controller class
    * @returns an object of Konva.Group type depicting DrawableGraph
    */
    attach(controller: Controller): Konva.Group {
        this.controller = controller;
        if (!this.group)
            this.group = new Konva.Group();
        const scaling_factor = this.get_average_bond_distance() / controller.style.bond_length_px;
        this.vertices.forEach(e => {
            e.coords = { x: e.coords.x / scaling_factor, y: e.coords.y / scaling_factor };
        });
        this.vertices.forEach(e => this.group?.add(e.attach(controller)));
        this.edges.forEach(e => { this.group?.add(e.attach(controller)); e.z_index = 0; });
        return this.group;
    }

    /**
     * Detach @see DrawableGraph from the controller.
    */
    detach() {
        this.vertices.forEach(e => e.detach());
        this.edges.forEach(e => e.detach());
        this.group?.destroyChildren();
        this.controller = null;
    }

    /**
     * Compute average bond distance.
     * For empty @see DrawableGraph, returns 1.54 (this is average CC bond in Angstrøms)
     * @returns average distance between bound vertices in whatever units are used
     */
    get_average_bond_distance(): number {
        if (!this.edges.length)
            return 1.54; // average CC bond in Angstrøms
        const total_distance = this.edges.reduce((p, e) =>
            p + Math.sqrt((e.v1.coords.x - e.v2.coords.x) * (e.v1.coords.x - e.v2.coords.x) + (e.v1.coords.y - e.v2.coords.y) * (e.v1.coords.y - e.v2.coords.y)), 0);
        return total_distance / this.edges.length;
    }

    /**
     * Compute rectangular area that contains all vertices of the @see DrawableGraph.
     * If there are no vertices, arbitrary area {0,0,100,100} is returned.
     * @returns @see Rect
     */


    /**
     * Perform update operations of vertices and edges in the graph, i.e. minimalistic actions
     * to redraw the renderings of atoms and bonds.
     */
    update(): void {
        for (const v of this.vertices) {
            v.update();
        }
        for (const e of this.edges) {
            e.update();
        }
    }
    /**
     * Add single vertex by screen coordinates. Used to add single atom to the drawing via UI.
     * @param coords Screen coordinates for the new @see DrawableVertex
     * @param label Vertex label, @default `C` (carbon atoms are only rendered by default if not connected to other atoms)
     * @returns @see DrawableGraph object containing added vertex
     */
    add_vertex(coords: Coords, label = "C"): DrawableGraph {
        const graph = new DrawableGraph();
        graph.vertices = [this._add_vertex(coords, label)];
        this.update();
        return graph;
    }

    /**
     * Internal function to add vertex to the graph. Attaches it to controller if the graph is attached.
     * @param coords Coordinates of the vertex
     * @param label Label of the vertex
     * @returns object of @see DrawableVertex class
     */
    _add_vertex(coords: Coords, label = "C"): DrawableVertex {
        const vertex = new DrawableVertex();
        this.vertices.push(vertex);
        vertex.coords = coords;
        vertex.label = label;
        if (this.controller)
            this.group?.add(vertex.attach(this.controller));
        return vertex;
    }

    /**
     * Find edges that are connected to the specified vertex
     * @param vertex an object of @see DrawableVertex class
     * @returns an array of @see DrawableEdge class objects that are connected to the vertex
     */
    find_edges_by_vertex(vertex: DrawableVertex): DrawableEdge[] {
        return this.edges.filter(e => e.v1 == vertex || e.v2 == vertex);
    }

    /**
     * Return array of edges that adjacent to given edge, i.e. edges of the edge.v1 and edge.v2 excluding given edge.
     * @param edge An edge in graph
     * @returns Array of @see DrawableEdge.
     */
    adjacent_edges(edge: DrawableEdge): DrawableEdge[] {
        return [...this.find_edges_by_vertex(edge.v1), ...this.find_edges_by_vertex(edge.v2)].filter(e => e != edge);
    }

    /**
     * Check if two vertices in the graph are connected.
     * @param v1 Object of @see DrawableVertex class
     * @param v2 Another object of @see DrawableVertex class
     * @returns true if there is a bond connecting vertices, or false otherwise
     */
    vertices_are_connected(v1: DrawableVertex, v2: DrawableVertex): boolean {
        return this.edges.findIndex(e => (e.v1 == v1 && e.v2 == v2) || (e.v1 == v2 && e.v2 == v1)) != -1;
    }


    /**
     * Merge another graph into current one. It will check for duplicates, and filter them out.
     * If the graph is attached, all the added vertices and edges will be attached.
     * @param graph object of @see DrawableGraph class to merge into the current graph.
     */
    add(graph: DrawableGraph): void {
        this.vertices.push(...graph.vertices.filter(e => this.vertices.indexOf(e) == -1));
        this.edges.push(...graph.edges.filter(e => this.edges.indexOf(e) == -1));
        this.edges.forEach(e => { e.v1.set_neighbor(e.v2, e.bond_order); e.v2.set_neighbor(e.v1, e.bond_order); });
        if (this.controller) {
            const controller = this.controller;
            graph.vertices.forEach(e => { this.group?.add(e.attach(controller)); });
            graph.edges.forEach(e => { this.group?.add(e.attach(controller)); e.z_index = 0; });
        }
        this.update();
    }


    /**
     * Combine and bind another graph with the existing one. An edge will be created between our_vertex and their_vertex.
     * Another graph is scaled, translated and rotated to adjust.
     * @param graph their graph
     * @param our_vertex vertex in our graph
     * @param their_vertex vertex in their graph
     */
    combind(graph: DrawableGraph, our_vertex: DrawableVertex, their_vertex: DrawableVertex): DrawableEdge {
        const our_added = this.add_bound_vertex_to(our_vertex);
        const their_added = graph.add_bound_vertex_to(their_vertex);
        const their_added_coords = their_added.vertices[0].coords;
        const our_added_coords = our_added.vertices[0].coords;
        const scale = this.get_average_bond_distance() / graph.get_average_bond_distance();
        graph.apply_scaling(scale);
        const alfa = Math.atan2(their_added_coords.y - their_vertex.coords.y, their_added_coords.x - their_vertex.coords.x) - Math.atan2(our_vertex.coords.y - our_added_coords.y, our_vertex.coords.x - our_added_coords.x);
        graph.apply_rotation(their_added_coords, alfa);
        const translation: Coords = { x: our_vertex.coords.x - their_added_coords.x, y: our_vertex.coords.y - their_added_coords.y };
        graph.apply_translation(translation);
        this.remove(our_added);
        graph.remove(their_added);
        this.add(graph);
        return this.bind_vertices(our_vertex, their_vertex);
    }

    /**
     * Remove the specified subgraph from the Graph. All the vertices and edges will be detached.
     * @param graph subgraph to remove.
     */
    remove(graph: DrawableGraph): void {
        graph.vertices.forEach(e => e.detach());
        graph.edges.forEach(e => e.detach());
        this.vertices = this.vertices.filter(e => graph.vertices.indexOf(e) == -1);
        this.edges = this.edges.filter(e => graph.edges.indexOf(e) == -1);
        graph.edges.forEach(e => { e.v1.remove_neighbor(e.v2); e.v2.remove_neighbor(e.v1); });
        this.update();
    }

    /**
     * Create an edge between vertices. The method is responsible for the update of neighbor properties of vertices.
     * If the graph is attached, the edge is also attached to controller, and topology of the graph is updated to recompute edge orientations.
     * @param v1 first @see DrawableVertex
     * @param v2 second @see DrawableVertex
     * @param edge_shape Shape of the edge, @see EdgeShape, @default EdgeShape.Single
     * @returns newly created @see DrawableEdge
     */
    bind_vertices(v1: DrawableVertex, v2: DrawableVertex, edge_shape: EdgeShape = EdgeShape.Single): DrawableEdge {
        const edge = new DrawableEdge(v1, v2);
        edge.shape = edge_shape;
        v1.set_neighbor(v2, edge.bond_order);
        v2.set_neighbor(v1, edge.bond_order);
        this.edges.push(edge);
        if (this.controller) {
            this.group?.add(edge.attach(this.controller));
            // edges of bonds are below vertices of atoms, put them back
            edge.z_index = 0;
            this.update_topology();
        }
        return edge;
    }

    /**
     * Delete vertex from graph. Removes all edges that are connected to this vertex. This may cause other vertices
     * to be removed as well (single dangling vertices will be removed too)
     * @param vertex @see DrawableVertex to remove
     * @returns Graph with all removed vertices and edges.
     */
    delete_vertex(vertex: DrawableVertex): DrawableGraph {
        const r: DrawableGraph = new DrawableGraph();
        const edges = this.find_edges_by_vertex(vertex);
        edges.forEach(e => { const s = this.delete_edge(e); r.vertices.push(...s.vertices); r.edges.push(...s.edges); });
        vertex.detach();
        this.vertices = this.vertices.filter(e => e != vertex);
        return r;
    }

    /**
     * Removes edge from the graph. The method is responsible for updating neighbors properties of the vertices.
     * @param edge An @see DrawableEdge to remove.
     * @param drop_dangling_vertices whether it is needed to remove single dangling vertices after the removal of the edge. @default true
     * @returns DrawableGraph containing all removed edges and vertices.
     */
    delete_edge(edge: DrawableEdge, drop_dangling_vertices = true, skip_topology_update = true): DrawableGraph {
        const r: DrawableGraph = new DrawableGraph();
        r.edges.push(edge);
        edge.detach();
        this.edges = this.edges.filter(e => e != edge);
        edge.v1.remove_neighbor(edge.v2);
        edge.v2.remove_neighbor(edge.v1);
        // delete lone vertices
        if (drop_dangling_vertices && edge.v1.neighbors.size == 0) {
            edge.v1.detach();
            r.vertices.push(edge.v1);
            this.vertices = this.vertices.filter(e => e != edge.v1);
        }
        if (drop_dangling_vertices && edge.v2.neighbors.size == 0) {
            edge.v2.detach();
            r.vertices.push(edge.v2);
            this.vertices = this.vertices.filter(e => e != edge.v2);
        }
        if (!skip_topology_update)
            this.update_topology();
        return r;
    }

    /**
     * Get a list of all vertices so that edges exist between each of them and the given vertex.
     * @param vertex a @see DrawableVertex to probe
     * @returns an array of @see DrawableVertex objects, each of them has an edge connecting it with the given vertex
     */
    neighboring_vertices(vertex: DrawableVertex): DrawableVertex[] {
        const r: DrawableVertex[] = [];
        this.edges.filter(e => e.v1 == vertex).forEach(e => r.push(e.v2));
        this.edges.filter(e => e.v2 == vertex).forEach(e => r.push(e.v1));
        return r;
    }

    /**
     * For any point in space, calculate metric to measure "crowding" around this point. This is proportional to sum of
     * inversed squared distances to proximate vertices
     * @param point coordinates a point which we probe against the graph
     * @param filtering_factor vertices that are farther than filtering_factor * average bond distance will not be considered.
     * @default 3. A value of 0 means that all vertices are considered (computationally intense)
     * @param coalesence_factor vertices that are closer to point will not be considered. This is for cases
     * of algorithms that will cause coalescence of new vertices with existing ones. @default 0.1. A value of 0 disables coalescence filtering.
     * @returns "repulsion potential" which is a sum of square distances to neighboring vertices
     */
    crowding_potential(point: Coords, filtering_factor = 3, coalesence_factor = 0.1): number {
        const avg_bond_distance = this.get_average_bond_distance();
        // exclude distance calculation to remove vertices
        const proximate_vertices =
            this.vertices.filter(e =>
                filtering_factor == 0 || (
                    Math.abs(e.coords.x - point.x) < filtering_factor * avg_bond_distance
                    && Math.abs(e.coords.y - point.y) < filtering_factor * avg_bond_distance
                )
            );
        return proximate_vertices.reduce((acc, e) => {
            const distance = Math.sqrt((e.coords.x - point.x) * (e.coords.x - point.x) + (e.coords.y - point.y) * (e.coords.y - point.y));
            return distance > coalesence_factor * avg_bond_distance ? acc + 1 / Math.pow(distance, 2) : acc;
        },
            0);
    }

    /**
     * For a given set of points, get the one that is farthest all the vertices of the graph.
     * This @see crowding_potential function to calculate
     * @param points an array of @see Coords, each one representing 2D point
     * @returns one point selected from points, that is the most remote from the vertices of the graph
     */
    least_crowded_point(points: Coords[]): Coords {
        // garbage in garbage out
        if (!points.length)
            return { x: 0, y: 0 };
        let best_potential: number | null = null;
        let best_point: Coords = points[0];
        for (const point of points) {
            const potential = this.crowding_potential(point);
            if (best_potential === null || potential < best_potential) {
                best_potential = potential;
                best_point = point;
            }
        }
        return best_point;
    }

    /**
     * Adds a bound vertex to existing vertex in the graph. The positioning of the vertex is selected to be visually appealing:
     * - edge length is taken from @see stylesheet.bond_length_px if controller is attached, otherwise from @see get_average_bond_distance
     * - least crowded, regular angles are selected
     * - other vertices around given vertex may be moved (only if they have no other neighbors other than the given vertex) to produce a good drawing
     * @param vertex A vertex to which attach a new edge and a vertex.
     * @returns A DrawableGraph containing newly created @see DrawableEdge and @see DrawableVertex.
     */
    add_bound_vertex_to(vertex: DrawableVertex): DrawableGraph {
        const r = new DrawableGraph();
        const neighbors = this.neighboring_vertices(vertex);
        const bond_len = this.controller ? this.controller.style.bond_length_px : this.get_average_bond_distance();
        if (neighbors.length == 0) {
            // make a new bond to 60 deg up and right
            const new_vertex = this._add_vertex({
                x: vertex.coords.x + bond_len * Math.cos(Math.PI / 6),
                y: vertex.coords.y - bond_len * Math.sin(Math.PI / 6)
            });
            r.edges = [this.bind_vertices(vertex, new_vertex)];
            r.vertices = [new_vertex];
            return r;
        }
        // for atoms with only one neighbor, add atom and bond at 120 deg to existing bond with the same distance
        if (neighbors.length == 1) {
            const delta_x = neighbors[0].coords.x - vertex.coords.x;
            const delta_y = neighbors[0].coords.y - vertex.coords.y;
            const alfa = Math.atan2(delta_y, delta_x);
            const bond_len = Math.sqrt(delta_x * delta_x + delta_y * delta_y);
            let coordinates: Coords;
            if (this.find_edges_by_vertex(vertex)[0].bond_order == 3) {
                coordinates = {
                    x: vertex.coords.x + bond_len * Math.cos(alfa + Math.PI),
                    y: vertex.coords.y + bond_len * Math.sin(+Math.PI)
                };
            }
            else {
                coordinates = this.least_crowded_point([
                    {
                        x: vertex.coords.x + bond_len * Math.cos(alfa + Math.PI / 1.5),
                        y: vertex.coords.y + bond_len * Math.sin(alfa + Math.PI / 1.5)
                    },
                    {
                        x: vertex.coords.x + bond_len * Math.cos(alfa - Math.PI / 1.5),
                        y: vertex.coords.y + bond_len * Math.sin(alfa - Math.PI / 1.5)
                    },
                ]);
            }
            const new_vertex = this._add_vertex(coordinates);
            r.edges = [this.bind_vertices(vertex, new_vertex)];
            r.vertices = [new_vertex];
            return r;
        }
        // help drawing polysubstituted atoms. We can move vertices which have no other neighbors
        let movable_neighbors = neighbors.filter(e => e.neighbors.size == 1 && e.label_type == LabelType.Atom);
        let fixed_neighbors = neighbors.filter(e => e.neighbors.size != 1 || e.label_type != LabelType.Atom);
        // list of positive angles between x axis and corresponding neighboring atom, written as [index, angle in radians]
        if (!fixed_neighbors.length)
            fixed_neighbors.push(...movable_neighbors.splice(0, 1));
        let angles: number[] = [];
        if (fixed_neighbors.length > 2 || (fixed_neighbors.length == 2 && movable_neighbors.length > 1)) {
            fixed_neighbors = neighbors;
            movable_neighbors = [];
        }
        angles = fixed_neighbors.map(e => Math.atan2(e.coords.y - vertex.coords.y, e.coords.x - vertex.coords.x));
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

        const new_vertex = this._add_vertex({
            x: vertex.coords.x + bond_len,
            y: vertex.coords.y
        });
        r.edges = [this.bind_vertices(vertex, new_vertex)];
        r.vertices = [new_vertex];
        movable_neighbors.push(new_vertex);

        for (let i = 0; i < movable_neighbors.length; i++) {
            const neighbor_to_move = movable_neighbors[i];
            // divide the largest angle by half, convert to degress, round the result to 15 deg, and convert back to radians
            const alfa = Math.PI * Math.round((angle1 + largest_diff * (i + 1) / (movable_neighbors.length + 1)) * 180 / (Math.PI * 15)) * 15 / 180;
            neighbor_to_move.coords = {
                x: vertex.coords.x + bond_len * Math.cos(alfa),
                y: vertex.coords.y + bond_len * Math.sin(alfa)
            };
            this.edges.find(e => e.v1 == neighbor_to_move || e.v2 == neighbor_to_move)?.update();
        }
        return r;
    }

    /**
     * Removes all vertices and edges, and clears the drawing if it exists.
     */
    clear(): void {
        this.vertices = [];
        this.edges = [];
        this.group?.destroyChildren();
    }

    /**
     * Add default fragment to the graph, i.e. two vertices bound by an edge. This is used when user clicks on empty space in drawing.
     * @param coords Coordinates of the first vertex
     * @returns DrawableGraph containing newly created vertices and edge
     */
    add_default_fragment(coords: Coords): DrawableGraph {
        const vertex1 = this._add_vertex(coords);
        const r = new DrawableGraph();
        r.vertices = [vertex1];
        const frag = this.add_bound_vertex_to(vertex1);
        r.vertices = [...r.vertices, ...frag.vertices];
        r.edges = [...r.edges, ...frag.edges];
        return r;
    }

    /**
     * Attach normal chain of vertices and edges to specified vertex. Orientation of the chain is selected to be visually appealing.
     * @param vertex an existing vertex pertaining to the DrawableGraph
     * @param nvertices number of vertices to add. Edges are added automatically.
     * @returns a DrawableGraph consisting of newly created @see DrawableEdge and @see DrawableVertex objects
     */
    add_chain(vertex: DrawableVertex, nvertices: number): DrawableGraph {
        const r = new DrawableGraph;
        r.vertices = [vertex];
        for (let i = 0; i < nvertices; i++) {
            const fragment = this.add_bound_vertex_to(r.vertices[r.vertices.length - 1]);
            r.edges.push(fragment.edges[0]);
            r.vertices.push(fragment.vertices[0]);
        }
        r.edges.forEach(e => e.update());
        r.vertices.forEach(e => e.update());
        // remove vertex that we added initially
        r.vertices = r.vertices.filter(e => e != vertex);
        return r;
    }

    /**
     * Fuse ring of given resulting size to the specified edge. The ring is drawn as a regular polygon of the given size.
     * Each of the edges has the same length as the specified edge.
     * There are two sides of edge, and the least crowded side is selected to fuse the ring.
     * @param edge an @see DrawableEdge pertaining to the DrawableGraph
     * @param nvertices number of vertices in the resulting ring
     * @returns a DrawableGraph containing newly created edges and vertices
     */
    fuse_ring(edge: DrawableEdge, nvertices: number, desaturate = false): DrawableGraph {
        const alfa = Math.atan2(edge.v2.coords.y - edge.v1.coords.y, edge.v2.coords.x - edge.v1.coords.x);
        const beta = (nvertices - 2) * Math.PI / nvertices;
        const edge_len = Math.sqrt(Math.pow(edge.v1.coords.x - edge.v2.coords.x, 2) + Math.pow(edge.v1.coords.y - edge.v2.coords.y, 2));
        const h = edge_len * Math.tan(beta / 2) / 2;
        const l = edge_len / (2 * Math.cos(beta / 2));
        interface Ring {
            center_x: number,
            center_y: number,
            coordinates: Coords[],
            crowding: number,
            first_vertex: DrawableVertex,
            last_vertex: DrawableVertex,
        }
        const ring1: Ring = {
            center_x: h * Math.sin(Math.PI - alfa) + (edge.v1.coords.x + edge.v2.coords.x) / 2,
            center_y: h * Math.cos(Math.PI - alfa) + (edge.v1.coords.y + edge.v2.coords.y) / 2,
            coordinates: [],
            crowding: 0,
            first_vertex: edge.v1,
            last_vertex: edge.v2,
        };
        const ring2: Ring = {
            center_x: -h * Math.sin(Math.PI - alfa) + (edge.v1.coords.x + edge.v2.coords.x) / 2,
            center_y: -h * Math.cos(Math.PI - alfa) + (edge.v1.coords.y + edge.v2.coords.y) / 2,
            coordinates: [],
            crowding: 0,
            first_vertex: edge.v2,
            last_vertex: edge.v1,
        };

        for (let i = 1; i <= nvertices - 2; i++) {
            const angle = Math.PI - beta / 2 + alfa + 2 * i * Math.PI / nvertices;
            const coords1: Coords = { x: ring1.center_x + l * Math.cos(angle), y: ring1.center_y + l * Math.sin(angle) };
            ring1.coordinates.push(coords1);
            ring1.crowding += this.crowding_potential(coords1);
            const coords2: Coords = { x: ring2.center_x - l * Math.cos(angle), y: ring2.center_y - l * Math.sin(angle) };
            ring2.coordinates.push(coords2);
            ring2.crowding += this.crowding_potential(coords2);
        }
        const r = new DrawableGraph();
        const selected_ring = ring1.crowding < ring2.crowding ? ring1 : ring2;
        let last_vertex = selected_ring.first_vertex;
        let saturated = true;
        if (desaturate && edge.shape == EdgeShape.Single && edge.v1.h_count > 1)
            saturated = false;
        for (const coordinate of selected_ring.coordinates) {
            const vertex = this._add_vertex(coordinate, "C");
            r.vertices.push(vertex);
            r.edges.push(this.bind_vertices(vertex, last_vertex, saturated ? EdgeShape.Single : EdgeShape.Double));
            if (desaturate)
                saturated = !saturated;
            last_vertex = vertex;
        }
        r.edges.push(this.bind_vertices(last_vertex, selected_ring.last_vertex, saturated ? EdgeShape.Single : EdgeShape.Double));
        r.vertices.forEach(e => e.update());
        r.edges.forEach(e => e.update());
        return r;
    }

    /**
     * Attach a ring to the specified vertex. The vertex becomes one of the vertices of the ring.
     * @param vertex an exising vertex in the DrawableGraph
     * @param nvertices number of vertices in the resulting ring
     * @returns a DrawableGraph containing newly created edges and vertices
     */
    attach_ring(vertex: DrawableVertex, nvertices: number, desaturate = false): DrawableGraph {
        if (vertex.neighbors.size < 2) {
            const r: DrawableGraph = this.add_bound_vertex_to(vertex);
            const frag = this.fuse_ring(r.edges[0], nvertices, desaturate);
            r.vertices = [...r.vertices, ...frag.vertices];
            r.edges = [...r.edges, ...frag.edges];
            return r;
        }
        const bond_len = this.controller ? this.controller.style.bond_length_px : this.get_average_bond_distance();
        const least_crowded_angle = vertex.least_crowded_angle();
        const internal_angle = Math.PI * (nvertices - 2) / nvertices;
        const alfa = least_crowded_angle + internal_angle / 2;
        const vertex2 = this._add_vertex({ x: vertex.coords.x + bond_len * Math.cos(alfa), y: vertex.coords.y + bond_len * Math.sin(alfa) });
        const edge = this.bind_vertices(vertex, vertex2);
        const frag = this.fuse_ring(edge, nvertices, desaturate);
        const r = new DrawableGraph();
        r.vertices = [vertex2, ...frag.vertices];
        r.edges = [edge, ...frag.edges];
        return r;
    }

    /**
     * Add numbering to the graph edges and vertices to make correlations between the vertices and edges in copy constructed graphs.
     */
    add_numbering(): void {
        this.vertices.forEach((e, idx) => e.id = idx);
        this.edges.forEach((e, idx) => e.id = idx);
    }

    /**
     * Return an array of subgraphs of the graph, i.e. parts of graphs do not have connected paths between each other.
     * @returns An array of DrawableGraphs, each containing subgraph of the current Graph
     */
    subgraphs(): DrawableGraph[] {
        const res: DrawableGraph[] = [];
        const rest_vertices = new Set<DrawableVertex>(this.vertices);
        while (rest_vertices.size) {
            const subgraph_vertices = new Set<DrawableVertex>();
            const next_value = rest_vertices.values().next().value;
            if (!next_value)
                throw "this should not happen";
            const to_visit = new Set<DrawableVertex>([next_value]);
            while (to_visit.size) {
                const vertex = to_visit.values().next().value;
                if (!vertex)
                    throw "this should not happen";
                rest_vertices.delete(vertex);
                to_visit.delete(vertex);
                subgraph_vertices.add(vertex);
                for (const [neighboring_vertex,] of vertex.neighbors) {
                    if (subgraph_vertices.has(neighboring_vertex))
                        continue;
                    to_visit.add(neighboring_vertex);
                }
            }
            const subgraph = new DrawableGraph();
            subgraph.vertices = [...subgraph_vertices];
            subgraph.edges = this.edges.filter(e => subgraph_vertices.has(e.v1));
            res.push(subgraph);
        }
        return res;
    }

    subgraph_with(vertex: DrawableVertex): DrawableGraph {
        const subgraphs = this.subgraphs();
        return subgraphs.find(g => g.vertices.find(v => v == vertex)) || new DrawableGraph();
    }

    /**
     * For the given edge, obtain its topology - does it pertain to a ring or not.
     * @param edge an @see DrawableEdge to probe
     * @returns @see EdgeTopology, either EdgeTopology.Chain, or EdgeTopology.Ring
     */
    edge_topology(edge: DrawableEdge): EdgeTopology {
        if (edge.v1.neighbors.size == 1 || edge.v2.neighbors.size == 1)
            return EdgeTopology.Chain;
        const edge_index = this.edges.findIndex(e => e == edge);
        const graph_copy = this.copy();
        const edge_copy = graph_copy.edges[edge_index];
        const nsubgraphs = graph_copy.subgraphs().length;
        graph_copy.delete_edge(edge_copy, false);
        const nsubgraphs2 = graph_copy.subgraphs().length;
        return nsubgraphs == nsubgraphs2 ? EdgeTopology.Ring : EdgeTopology.Chain;
    }

    /**
     * Tell if a point is located to left of the line collinear with the given edge (looking from edge.v1 to edge.v2 as usual)
     * @param edge An edge
     * @param point A point to probe
     * @returns Boolean value
     */
    is_to_left(edge: DrawableEdge, point: Coords): boolean {
        return ((edge.v2.coords.x - edge.v1.coords.x) * (point.y - edge.v1.coords.y) -
            (edge.v2.coords.y - edge.v1.coords.y) * (point.x - edge.v1.coords.x) < 0);
    }

    /**
     * Re-calculate orientation of bond (left, right, symmetrical) for the specified edge in the graph.
     * This function is dependent on @see ringsystems property that is calculated in @see update_topology method.
     * @param edge Edge whose orientation to be updated.
     * @param update_view Whether to call edge.update() to update view. @default true
     * @returns void
     */
    update_edge_orientation(edge: DrawableEdge, update_view = true): void {
        if (!edge.is_asymmetric)
            return;
        for (const ringsystem of this.ringsystems) {
            if (ringsystem.edges.findIndex(e => e == edge) == -1)
                continue;
            let v1_neighbors = ringsystem.neighboring_vertices(edge.v1).filter(e => e != edge.v2);
            let v2_neighbors = ringsystem.neighboring_vertices(edge.v2).filter(e => e != edge.v1);
            const left_count = v1_neighbors.filter(e => this.is_to_left(edge, e.coords)).length + v2_neighbors.filter(e => this.is_to_left(edge, e.coords)).length;
            const neighbor_count = v1_neighbors.length + v2_neighbors.length;
            if (left_count > neighbor_count - left_count) {
                edge.orientation = EdgeOrientation.Left;
            }
            else if (neighbor_count - left_count > left_count) {
                edge.orientation = EdgeOrientation.Right;
            }
            else {
                // consider neighbors bound having double bonds
                v1_neighbors = v1_neighbors.filter(vertex => this.find_edges_by_vertex(vertex).filter(e => e != edge && [EdgeShape.Double, EdgeShape.Aromatic].includes(e.shape)).length);
                v2_neighbors = v2_neighbors.filter(vertex => this.find_edges_by_vertex(vertex).filter(e => e != edge && [EdgeShape.Double, EdgeShape.Aromatic].includes(e.shape)).length);
                const left_count = v1_neighbors.filter(e => this.is_to_left(edge, e.coords)).length + v2_neighbors.filter(e => this.is_to_left(edge, e.coords)).length;
                const neighbor_count = v1_neighbors.length + v2_neighbors.length;
                if (left_count > neighbor_count - left_count) {
                    edge.orientation = EdgeOrientation.Left;
                }
                else {
                    edge.orientation = EdgeOrientation.Right;
                }
            }
            if (update_view)
                edge.update();
            return;
        }
        // non-cyclic bond with heteroatoms - symmetrical
        if (edge.v1.visible_text != "" || edge.v2.visible_text != "") {
            edge.orientation = EdgeOrientation.Center;
            if (update_view)
                edge.update();
            return;
        }
        // exocyclic double bond - draw symmetrical
        if (edge.v1.topology == VertexTopology.Ring || edge.v2.topology == VertexTopology.Ring) {
            edge.orientation = EdgeOrientation.Center;
            if (update_view)
                edge.update();
            return;
        }
        edge.orientation = EdgeOrientation.Left;
        if (update_view)
            edge.update();
    }

    update_topology(): void {
        this.vertices.forEach(e => e.topology = VertexTopology.Chain);
        for (const edge of this.edges) {
            edge.topology = this.edge_topology(edge);
            if (edge.topology == EdgeTopology.Ring) {
                edge.v1.topology = VertexTopology.Ring;
                edge.v2.topology = VertexTopology.Ring;
            }
        }
        this.add_numbering();
        const graph_copy = this.copy();
        const chain_edges = graph_copy.edges.filter(e => e.topology == EdgeTopology.Chain);
        chain_edges.forEach(e => graph_copy.delete_edge(e));
        // remove lone vertices; they might have been present originally
        graph_copy.vertices = graph_copy.vertices.filter(e => e.neighbors.size);
        this.ringsystems = [];
        for (const ringsystem_copy of graph_copy.subgraphs()) {
            const ringsystem = new DrawableGraph();
            ringsystem.vertices = ringsystem_copy.vertices.map(ce => this.vertices.find(e => e.id == ce.id)).filter(e => !!e);
            ringsystem.edges = ringsystem_copy.edges.map(ce => this.edges.find(e => e.id == ce.id)).filter(e => !!e);
            // for attached graph instance, recalculate bond orientations
            this.ringsystems.push(ringsystem);
        }
        if (this.controller) {
            this.ringsystems.forEach(ringsystem =>
                ringsystem.edges.forEach(edge => this.update_edge_orientation(edge)));
        }
    }

    /**
     * Removes explicit hydrogens from the graph by removing vertices labeled as `H`, and their edges.
     * @returns a DrawableGraph containing removed vertices and edges.
     */
    strip_hydrogens(): DrawableGraph {
        const hs = new DrawableGraph();
        hs.vertices = this.vertices.filter(e => e.element?.symbol == "H");
        hs.vertices.forEach(e => hs.edges.push(...this.find_edges_by_vertex(e)));
        this.remove(hs);
        return hs;
    }

    /**
     * Add vertices and edges to make DrawableGraph symmetrical around center of symmetry coincident with the center of edge.
     * For instance, this transfrormation applied to double bond of styrene will produce trans-stilbene from it.
     * @param edge Edge whose center will be coincident with center of symmetry
     * @returns Added vertices and edges
     */

    symmetrize_along_edge(edge: DrawableEdge): DrawableGraph {
        if ((edge.v1.neighbors.size == 1) == (edge.v2.neighbors.size == 1))
            return new DrawableGraph();
        const center: Coords = {
            x: (edge.v1.coords.x + edge.v2.coords.x) / 2,
            y: (edge.v1.coords.y + edge.v2.coords.y) / 2,
        };
        this.add_numbering();
        const free_vertex = edge.v1.neighbors.size == 1 ? edge.v1 : edge.v2;
        const bound_vertex = free_vertex == edge.v1 ? edge.v2 : edge.v1;
        const r = this.subgraph_with(edge.v1).copy();
        r.edges = r.edges.filter(e => e.id != edge.id);
        r.edges.forEach(e => {
            if (e.v1.id == bound_vertex.id) {
                e.v2.remove_neighbor(e.v1);
                e.v1 = free_vertex;
                e.v2.set_neighbor(e.v1, e.bond_order);
            }
            if (e.v2.id == bound_vertex.id) {
                e.v1.remove_neighbor(e.v2);
                e.v2 = free_vertex;
                e.v1.set_neighbor(e.v2, e.bond_order);
            }
        });
        r.vertices = r.vertices.filter(e => e.id != edge.v1.id && e.id != edge.v2.id);
        // invert coords around center
        r.vertices.forEach(e => {
            e.coords.x = 2 * center.x - e.coords.x;
            e.coords.y = 2 * center.y - e.coords.y;
        });
        this.add(r);
        this.update_topology();
        return r;
    }

    /**
     * Apply rotation transformation to the graph vertices themselves in local coordinate system.
     * @param origin coordinates of rotation origin
     * @param angle angle of rotation in radians, clockwise. Angle 0 is a vector collinear with positive x branch.
     */
    apply_rotation(origin: Coords, angle: number) {
        this.vertices.forEach(e => {
            const dx = e.coords.x - origin.x;
            const dy = e.coords.y - origin.y;
            e.coords = {
                x: origin.x + dx * Math.cos(angle) + dy * Math.sin(angle),
                y: origin.y - dx * Math.sin(angle) + dy * Math.cos(angle)
            };
        });
    }

    /**
     * Apply translation to the graph vertices themselves in local coordinate system.
     * @param coords vector to add to all coordinates
     */
    apply_translation(coords: Coords) {
        this.vertices.forEach(e => {
            e.coords.x += coords.x;
            e.coords.y += coords.y;
        });
    }

    /**
     * Apply scaling to the graph vertices themselves in local coordinate system.
     * @param factor Scaling factor
     */
    apply_scaling(factor: number) {
        this.vertices.forEach(e => {
            e.coords.x *= factor;
            e.coords.y *= factor;
        });
    }

    /**
     * Add vertices and edges to make graph rotationally symmetrical around specified Vertex.
     * For example, this transformation being applied to aliphatic carbon of toluene, will produce triphenylmethane for order 3
     * or tetraphenylmethane for order 4.
     * @param vertex Vertex which will be coincident with the center of rotational symmetry
     * @param order order of symmetry
     * @returns DrawableGraph with all added elements
     */
    symmetrize_at_vertex(vertex: DrawableVertex, order: number): DrawableGraph {
        if ((vertex.neighbors.size != 1))
            return new DrawableGraph();
        this.add_numbering();
        const angle_increment = order == 2 ? 2 * Math.PI / 3 : 2 * Math.PI / order;
        const r = new DrawableGraph();
        const subgraph = this.subgraph_with(vertex).copy();
        subgraph.vertices = subgraph.vertices.filter(e => e.id != vertex.id);
        subgraph.edges = subgraph.edges.filter(e => e.v1.id != vertex.id && e.v2.id != vertex.id);
        const neighboring_vertex_id = vertex.neighbors.keys().next().value?.id;
        subgraph.vertices.find(e => e.id === neighboring_vertex_id)?.remove_neighbor(vertex);
        for (let i = 1; i < order; i++) {
            const subgraph_copy = subgraph.copy();
            subgraph_copy.apply_rotation(vertex.coords, angle_increment * i);
            const vertex_to_bind = subgraph_copy.vertices.find(e => e.id == neighboring_vertex_id);
            if (!vertex_to_bind)
                throw "This should never happen";
            subgraph_copy.bind_vertices(vertex_to_bind, vertex);
            r.add(subgraph_copy);
        }
        this.add(r);
        this.update_topology();
        return r;
    }
}

export { DrawableGraph };