import { Action, UpdatableAction } from "./Action";
import { DrawableEdge } from "../drawables/Edge";
import { DrawableGraph } from "../drawables/Graph";
import { DrawableVertex } from "../drawables/Vertex";
import { Coords, EdgeOrientation, EdgeShape } from "../types";

class UpdateEdgeShapeAction extends Action {
    graph: DrawableGraph;
    edge: DrawableEdge;
    old_shape: EdgeShape;
    new_shape: EdgeShape;
    old_orientation: EdgeOrientation;
    new_orientation: EdgeOrientation | null;
    constructor(graph: DrawableGraph, edge: DrawableEdge, edge_shape: EdgeShape, orientation: EdgeOrientation | null = null) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.old_shape = edge.shape;
        this.new_shape = edge_shape;
        this.old_orientation = edge.orientation;
        this.new_orientation = orientation;
    }
    commit() {
        this.edge.shape = this.new_shape;
        if (this.new_orientation === null) {
            this.graph.update_edge_orientation(this.edge);
            this.new_orientation = this.edge.orientation;
        }
        else
            this.edge.orientation = this.new_orientation;
        this.edge.v1.set_neighbor(this.edge.v2, this.edge.bond_order);
        this.edge.v2.set_neighbor(this.edge.v1, this.edge.bond_order);
        this.edge.update();
    }
    rollback() {
        this.edge.shape = this.old_shape;
        this.edge.orientation = this.old_orientation;
        this.edge.v1.set_neighbor(this.edge.v2, this.edge.bond_order);
        this.edge.v2.set_neighbor(this.edge.v1, this.edge.bond_order);
        this.edge.update();
    }
}

class ClearGraphAction extends Action {
    graph: DrawableGraph;
    vertices: DrawableVertex[] = [];
    edges: DrawableEdge[] = [];
    constructor(graph: DrawableGraph) {
        super();
        this.graph = graph;
    }
    commit() {
        // we have to store the same objects to retain history
        this.vertices = this.graph.vertices;
        this.edges = this.graph.edges;
        this.graph.clear();
    }
    rollback() {
        const copy = new DrawableGraph();
        copy.vertices = this.vertices;
        copy.edges = this.edges;
        // will re-attach everything
        this.graph.add(copy);
    }
}

class DeleteVertexAction extends Action {
    graph: DrawableGraph;
    vertex: DrawableVertex;
    removed: DrawableGraph;

    constructor(graph: DrawableGraph, vertex: DrawableVertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.removed = new DrawableGraph();
    }

    commit() {
        this.vertex.active = false;
        this.removed = this.graph.delete_vertex(this.vertex);
    }

    rollback() {
        this.graph.add(this.removed);
        this.graph.update();
    }

}

class DeleteEdgeAction extends Action {
    graph: DrawableGraph;
    edge: DrawableEdge;
    removed: DrawableGraph;

    constructor(graph: DrawableGraph, edge: DrawableEdge) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.removed = new DrawableGraph();
    }

    commit() {
        this.edge.active = false;
        this.removed = this.graph.delete_edge(this.edge, true, false);
    }

    rollback() {
        this.graph.add(this.removed);
        this.graph.update();
    }
}

class AddBoundVertexAction extends Action {
    graph: DrawableGraph;
    vertex: DrawableVertex;
    added: DrawableGraph | null;
    old_neighbor_coords: Coords[];
    new_neighbor_coords: Coords[];

    constructor(graph: DrawableGraph, vertex: DrawableVertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.added = null;
        // in this action, some neigboring vertices may change coordinates. We need to save and restore them.
        this.old_neighbor_coords = [];
        this.new_neighbor_coords = [];
    }

    commit() {
        if (this.added) {
            this.graph.add(this.added);
            Array.from(this.vertex.neighbors.keys()).forEach((e, idx) => e.coords = this.new_neighbor_coords[idx]);
            this.graph.update();
        }
        else {
            this.old_neighbor_coords = Array.from(this.vertex.neighbors.keys()).map(e => e.coords);
            this.added = this.graph.add_bound_vertex_to(this.vertex);
            this.new_neighbor_coords = Array.from(this.vertex.neighbors.keys()).map(e => e.coords);
        }
    }
    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
        Array.from(this.vertex.neighbors.keys()).forEach((e, idx) => e.coords = this.old_neighbor_coords[idx]);
        this.graph.update();
    }
}

class AddDefaultFragmentAction extends Action {
    graph: DrawableGraph;
    x: number;
    y: number;
    added: DrawableGraph | null;

    constructor(graph: DrawableGraph, x: number, y: number) {
        super();
        this.graph = graph;
        this.x = x;
        this.y = y;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.add_default_fragment({ x: this.x, y: this.y });
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }

}

class AddSingleVertexAction extends Action {
    graph: DrawableGraph;
    x: number;
    y: number;
    added: DrawableGraph | null;

    constructor(graph: DrawableGraph, x: number, y: number) {
        super();
        this.graph = graph;
        this.x = x;
        this.y = y;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.add_vertex({ x: this.x, y: this.y });
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }

}


class BindVerticesAction extends Action {
    graph: DrawableGraph;
    v1: DrawableVertex;
    v2: DrawableVertex;
    edge: DrawableEdge | null;

    constructor(graph: DrawableGraph, v1: DrawableVertex, v2: DrawableVertex) {
        super();
        this.graph = graph;
        this.v1 = v1;
        this.v2 = v2;
        this.edge = null;
    }

    commit() {
        this.edge = this.graph.bind_vertices(this.v1, this.v2);
        this.edge.update();
        this.v1.update();
        this.v2.update();
    }

    rollback() {
        if (!this.edge)
            return;
        this.graph.delete_edge(this.edge, false, false);
        this.edge = null;
    }
}

class AddChainAction extends Action {
    graph: DrawableGraph;
    vertex: DrawableVertex;
    added: DrawableGraph | null;
    natoms: number;

    constructor(graph: DrawableGraph, vertex: DrawableVertex, natoms: number) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.natoms = natoms;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.add_chain(this.vertex, this.natoms);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class AttachRingAction extends Action {
    graph: DrawableGraph;
    vertex: DrawableVertex;
    added: DrawableGraph | null;
    natoms: number;
    desaturate: boolean;

    constructor(graph: DrawableGraph, vertex: DrawableVertex, natoms: number, desaturate = false) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.natoms = natoms;
        this.desaturate = desaturate;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.attach_ring(this.vertex, this.natoms, this.desaturate);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class FuseRingAction extends Action {
    graph: DrawableGraph;
    edge: DrawableEdge;
    added: DrawableGraph | null;
    natoms: number;
    desaturate: boolean;

    constructor(graph: DrawableGraph, edge: DrawableEdge, natoms: number, desaturate = false) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.natoms = natoms;
        this.desaturate = desaturate;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.fuse_ring(this.edge, this.natoms, this.desaturate);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class StripHAction extends Action {
    graph: DrawableGraph;
    removed: DrawableGraph | null;

    constructor(graph: DrawableGraph) {
        super();
        this.graph = graph;
        this.removed = null;
    }

    commit() {
        if (this.removed)
            this.graph.remove(this.removed);
        else
            this.removed = this.graph.strip_hydrogens();
    }

    rollback() {
        if (!this.removed)
            return;
        this.graph.add(this.removed);
    }
}

class ChangeVertexLabelAction extends UpdatableAction {
    graph: DrawableGraph;
    vertex: DrawableVertex;
    old_label: string;
    new_label: string;
    constructor(graph: DrawableGraph, vertex: DrawableVertex, label: string) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.old_label = vertex.label;
        this.new_label = label;
    }
    _set_label(label: string) {
        this.vertex.label = label;
        this.vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => { this.graph.update_edge_orientation(e, false); e.update(); });
    }
    commit() {
        this._set_label(this.new_label);
    }
    rollback() {
        this._set_label(this.old_label);
    }
    update(action: this): boolean {
        if (this.vertex != action.vertex)
            return false;
        this.new_label = action.new_label;
        this._set_label(this.new_label);
        return true;
    }
}

class ChangeVertexIsotopeAction extends UpdatableAction {
    graph: DrawableGraph;
    vertex: DrawableVertex;
    old_isotope: number;
    new_isotope: number;
    constructor(graph: DrawableGraph, vertex: DrawableVertex, isotope: number) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.old_isotope = vertex.isotope;
        this.new_isotope = isotope;
    }
    _set_isotope(isotope: number) {
        this.vertex.isotope = isotope;
        this.vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => { this.graph.update_edge_orientation(e, false); e.update(); });
    }
    commit() {
        this._set_isotope(this.new_isotope);
    }
    rollback() {
        this._set_isotope(this.old_isotope);
    }
    update(action: this): boolean {
        if (this.vertex != action.vertex)
            return false;
        this.new_isotope = action.new_isotope;
        this._set_isotope(this.new_isotope);
        return true;
    }
}

class MoveVertexAction extends UpdatableAction {
    graph: DrawableGraph;
    vertex: DrawableVertex;
    old_coords: Coords;
    new_coords: Coords;

    constructor(graph: DrawableGraph, vertex: DrawableVertex, original_coords: Coords | null) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.old_coords = original_coords || this.vertex.coords;
        this.new_coords = this.vertex.coords;
    }

    commit(): void {
        this.vertex.coords = this.new_coords;
        this.vertex.update();
        for (const [vertex,] of this.vertex.neighbors)
            vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
    }

    rollback(): void {
        this.vertex.coords = this.old_coords;
        this.vertex.update();
        for (const [vertex,] of this.vertex.neighbors)
            vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
    }

    update(action: this): boolean {
        if (action.vertex != this.vertex)
            return false;
        this.new_coords = action.vertex.coords;
        this.vertex.update();
        for (const [vertex,] of this.vertex.neighbors)
            vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
        return true;
    }
}

class IncrementAtomChargeAction extends UpdatableAction {
    vertex: DrawableVertex;
    old_charge: number;
    increment: number;

    constructor(vertex: DrawableVertex, increment: number) {
        super();
        this.vertex = vertex;
        this.old_charge = vertex.charge;
        this.increment = increment;
    }

    commit(): void {
        this.vertex.charge = this.old_charge + this.increment;
        this.vertex.update();
    }

    rollback(): void {
        this.vertex.charge = this.old_charge;
        this.vertex.update();
    }

    update(action: this): boolean {
        if (action.vertex != this.vertex)
            return false;
        this.increment += action.increment;
        this.vertex.charge = this.old_charge + this.increment;
        this.vertex.update();
        return true;
    }
}

class SymmetrizeAlongEdgeAction extends Action {
    graph: DrawableGraph;
    edge: DrawableEdge;
    added: DrawableGraph | null;

    constructor(graph: DrawableGraph, edge: DrawableEdge) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.symmetrize_along_edge(this.edge);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}


class SymmetrizeAtVertexAction extends Action {
    graph: DrawableGraph;
    vertex: DrawableVertex;
    added: DrawableGraph | null;
    order: number;

    constructor(graph: DrawableGraph, vertex: DrawableVertex, order: number) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.order = order;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.symmetrize_at_vertex(this.vertex, this.order);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class ExpandLinearAction extends Action {
    graph: DrawableGraph;
    vertex: DrawableVertex;
    vertex_idx = 0;
    expansion: DrawableGraph;
    edge_added: DrawableEdge | null = null;
    edges_removed: Map<number, DrawableEdge>;

    constructor(graph: DrawableGraph, vertex: DrawableVertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.vertex_idx = this.graph.vertices.findIndex(e => e === vertex);
        this.edges_removed = new Map();
        if (!this.vertex.linear_formula)
            this.expansion = new DrawableGraph();
        else
            this.expansion = this.vertex.linear_formula.to_graph();
    }
    commit() {
        this.vertex.active = false;
        const neighbor_vertex = this.vertex.neighbors.keys().next().value;
        this.graph.edges.forEach((e, idx) => {
            if (e.v1 == this.vertex || e.v2 == this.vertex)
                this.edges_removed.set(idx, e);
        });
        this.graph.edges = this.graph.edges.filter((_, idx) => idx in this.edges_removed);
        this.edges_removed.forEach(e => e.detach());
        this.graph.vertices = this.graph.vertices.filter(e => e != this.vertex);
        this.vertex.detach();
        if (neighbor_vertex) {
            this.edge_added = this.graph.combind(this.expansion, neighbor_vertex, this.expansion.vertices[0]);
        }
        else {
            this.graph.add(this.expansion);
        }
        this.graph.update();
    }
    rollback() {
        this.graph.remove(this.expansion);
        if (this.edge_added)
            this.graph.delete_edge(this.edge_added, false, true);
        this.graph.vertices.splice(this.vertex_idx, 0, this.vertex);
        if (this.graph.controller)
            this.vertex.attach(this.graph.controller);
        for (const [idx, edge] of this.edges_removed) {
            this.graph.edges.splice(idx, 0, edge);
            if (this.graph.controller)
                edge.attach(this.graph.controller);
        }
        this.graph.update();
    }
}




export {
    AddBoundVertexAction,
    AddSingleVertexAction,
    AddChainAction,
    AddDefaultFragmentAction,
    AttachRingAction,
    BindVerticesAction,
    ChangeVertexLabelAction,
    ChangeVertexIsotopeAction,
    ClearGraphAction,
    DeleteEdgeAction,
    DeleteVertexAction,
    IncrementAtomChargeAction,
    FuseRingAction,
    StripHAction,
    MoveVertexAction,
    UpdateEdgeShapeAction,
    SymmetrizeAlongEdgeAction,
    SymmetrizeAtVertexAction,
    ExpandLinearAction
};