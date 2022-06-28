import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Edge, EdgeShape, BondType } from "../view/Edge";
import { Graph } from "../view/Graph";
import { Stylesheet } from "../view/Stylesheet";
import { Vertex } from "../view/Vertex";
import { ChemicalElements } from "../lib/elements";
import { Menu } from "../view/Menu";
import { MenuButton } from "../view/MenuButton";
import { Action, AddBoundVertexAction, AddChainAction, AddDefaultFragmentAction, AttachRingAction, BindVerticesAction, ChangeAtomLabelAction, ClearGraphAction, DeleteEdgeAction, DeleteVertexAction, FuseRingAction, MoveVertexAction, UpdatableAction, UpdateEdgeShapeAction } from "./Action";

class MoleculeEditor {
    stage: Konva.Stage;
    drawing_layer: Konva.Layer;
    background_layer: Konva.Layer;
    top_layer: Konva.Layer;
    welcome_message: Konva.Group;
    graph: Graph;
    menu: Menu;
    stylesheet: Stylesheet;
    active_edge: Edge | null;
    active_vertex: Vertex | null;
    downed_vertex: Vertex | null;
    action_stack: Array<Action>;
    actions_rolled_back: number;
    _onchange: (() => void) | null;
    constructor(stage: Konva.Stage) {
        this.stage = stage;
        this.stylesheet = new Stylesheet();
        this.graph = new Graph();
        this.graph.attach(this);
        this.background_layer = new Konva.Layer();
        this.background_layer.add(new Konva.Rect({
            x: 0,
            y: 0,
            width: this.stage.getAttr("width"),
            height: this.stage.getAttr("height"),
            fill: this.stylesheet.background_fill_color,
        }));
        this.welcome_message = new Konva.Group();
        this.background_layer.add(this.welcome_message);
        this.background_layer.on("click", (evt:KonvaEventObject<MouseEvent>) => { this.on_background_click(evt); } );
        this.background_layer.on("contextmenu", (evt:KonvaEventObject<MouseEvent>) => { evt.evt.preventDefault(); this.toggle_menu(); } );
        this.drawing_layer = new Konva.Layer();
        this.drawing_layer.add(this.graph.as_group());
        this.drawing_layer.draw();
        this.menu = new Menu();
        this.menu.visible = false;
        this.top_layer = new Konva.Layer();
        this.top_layer.add(this.menu.as_group());
        this.active_edge = null;
        this.active_vertex = null;
        this.downed_vertex = null;
        const container = this.stage.container();
        container.addEventListener("keydown", (e) => { e.preventDefault(); this.on_keydown(e); });
        container.tabIndex = 1;
        container.focus();
        this.stage.add(this.background_layer);
        this.stage.add(this.drawing_layer);
        this.stage.add(this.top_layer);
        this.update_background();
        this._onchange = null;
        this.action_stack = [];
        this.actions_rolled_back = 0;
    }

    static from_html_element(el: HTMLDivElement) {
        const stage = new Konva.Stage({
            container: el,
            width: el.clientWidth,
            height: el.clientHeight
        });
        return new MoleculeEditor(stage);
    }

    commit_action(action: Action) {
        // find last action that has not been rolled back, and throw away history after it
        for (let i = 0; i < this.actions_rolled_back; i++) {
            this.action_stack.pop();
        }
        this.actions_rolled_back = 0;
        if (this.action_stack.length) {
            const last_action = this.action_stack[this.action_stack.length - 1];
            if (last_action instanceof UpdatableAction && action.constructor == last_action.constructor) {
                if (last_action.update(<UpdatableAction>action)) {
                    if (this._onchange)
                        this._onchange();
                    this.update_background();
                    return;
                }
            }
        }
        this.action_stack.push(action);
        action.commit();
        if (this._onchange)
            this._onchange();
        this.update_background();
    }
    rollback_actions(count: number) {
        for (let i = 0; i < count; i++) {
            if (this.actions_rolled_back >= this.action_stack.length)
                return;
            this.actions_rolled_back += 1;
            this.action_stack[this.action_stack.length - this.actions_rolled_back].rollback();
        }
        this.active_edge = null;
        this.active_vertex = null;
        if (this._onchange)
            this._onchange();
        this.update_background();
    }
    recommit_actions(count: number) {
        for (let i = 0; i < count; i++) {
            if (this.actions_rolled_back < 1 )
                return;
            this.action_stack[this.action_stack.length - this.actions_rolled_back].commit();
            this.actions_rolled_back -= 1;
        }
        this.active_edge = null;
        this.active_vertex = null;
        if (this._onchange)
            this._onchange();
        this.update_background();
    }

    clear_actions() {
        this.actions_rolled_back = 0;
        this.action_stack = [];
    }

    update_background() {
        if (this.graph.vertices.length || this.graph.edges.length) {
            this.welcome_message.visible(false);
            return;
        }
        this.welcome_message.visible(true);
        const txt = this.welcome_message.findOne("#welcome_text") || new Konva.Text({
            id: "welcome_text",
            x: this.stage.width() / 2,
            y: this.stage.height() / 2,
            fontSize: 14,
            fill: "#bbb",
            align: "center",
            text: "Welcome to my new chemical editor!\n Use your mouse to draw, and Spacebar to open context menu.",
        });
        txt.setAttr("x", (this.stage.width() - txt.width()) / 2);
        txt.setAttr("y", (this.stage.height() - txt.height()) / 2);
        this.welcome_message.add(<Konva.Text>txt);
    }

    autoscale_view() {
        const rect = this.graph.get_molecule_rect();
        this.stylesheet.scale = this.stylesheet.bond_length_px / this.graph.get_average_bond_distance();
        this.stylesheet.offset_x = (this.stage.width() - this.stylesheet.scale*(rect.x2-rect.x1)) / 2 - this.stylesheet.scale*rect.x1;
        this.stylesheet.offset_y = (this.stage.height() - this.stylesheet.scale*(rect.y2-rect.y1)) / 2 - this.stylesheet.scale*rect.y1;
        this.graph.update();
    }

    load_mol_from_string(mol_string: string) {
        this.clear_actions();
        this.graph.load_mol_string(mol_string);
        this.autoscale_view();
        this.update_background();
    }

    get_mol_string() {
        return this.graph.get_mol_string();
    }

    clear() {
        this.commit_action(new ClearGraphAction(this.graph));
    }

    get_next_element_label(label: string, key: string): string {
        const element_labels = Object.keys(ChemicalElements).filter(e => e.toLowerCase()[0] == key.toLowerCase()).sort((a,b) => a < b ? -1 : 1);
        if (element_labels.length == 0)
            return "";
        const index = element_labels.indexOf(label);
        if (index == -1 || index == element_labels.length - 1)
            return element_labels[0];
        return element_labels[index + 1];
    }

    on_vertex_keydown(evt: KeyboardEvent) {
        if (!this.active_vertex)
            return;
        if (evt.key == "Backspace" || evt.key == "Delete") {
            this.commit_action(new DeleteVertexAction(this.graph, this.active_vertex));
            this.active_vertex = null;
            return;
        }
        if (evt.key.match(/[A-Za-z]/)) {
            const new_label = this.get_next_element_label(this.active_vertex.label, evt.key);
            if (new_label == "")
                return;
            this.commit_action(new ChangeAtomLabelAction(this.graph, this.active_vertex, new_label));
        }
    }

    toggle_menu() {
        if (this.menu.visible) {
            this.menu.visible = false;
            return;
        }
        this.menu.x = this.stage.pointerPos?.x || this.stage.width() / 2;
        this.menu.y = this.stage.pointerPos?.y || this.stage.height() / 2;

        if (this.active_edge) {
            this.menu.clear_buttons();
            const edge = this.active_edge;
            this.menu.add_button( new MenuButton("1", "Single", () => {
                this.commit_action(new UpdateEdgeShapeAction(edge, EdgeShape.Single));
            } ));
            edge.bond_type != BondType.Double && this.menu.add_button( new MenuButton("2", "Double", () => {
                this.commit_action(new UpdateEdgeShapeAction(edge, EdgeShape.Double));
            } ));
            edge.bond_type != BondType.Triple && this.menu.add_button( new MenuButton("3", "Triple", () => {
                this.commit_action(new UpdateEdgeShapeAction(edge, EdgeShape.Triple));
            } ));
            this.menu.add_button( new MenuButton("w", "Wedged up", () => {
                this.commit_action(new UpdateEdgeShapeAction(edge, EdgeShape.SingleUp));
            } ));
            this.menu.add_button( new MenuButton("q", "Wedged down", () => {
                this.commit_action(new UpdateEdgeShapeAction(edge, EdgeShape.SingleDown));
            } ));
            this.menu.add_button( new MenuButton("R", "Fuse ring", () => { this.menu_fuse_ring(edge); } ));
            this.menu.add_button( new MenuButton("x", "Delete", () =>  {
                this.commit_action(new DeleteEdgeAction(this.graph, edge));
            } ));
        }
        else if (this.active_vertex) {
            this.menu.clear_buttons();
            const vertex = this.active_vertex;
            this.menu.add_button( new MenuButton("R", "Attach ring here", () => { this.menu_attach_ring(vertex); } ));
            this.menu.add_button( new MenuButton("C", "Add normal chain", () => { this.menu_chain(vertex); } ));
            //this.menu.add_button( new MenuButton("S", "Symmetry", () => { this.menu_symmetry_vertex(vertex); } ));
            this.menu.add_button( new MenuButton("x", "Delete", () => {
                this.commit_action(new DeleteVertexAction(this.graph, vertex));
            } ));
        }
        else {
            this.menu.clear_buttons();
            this.menu.add_button( new MenuButton("x", "Clear drawing", () => { this.menu_confirm_clear(); } ));
        }
        this.menu.visible = true;
    }

    /*menu_symmetry_vertex(vertex: Vertex) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("m", "Mirror at atom", () => { this.graph.attach_ring(vertex, 3); } ));
        this.menu.add_button( new MenuButton("2", "C2v / D2h", () => { this.graph.attach_ring(vertex, 4); } ));
        this.menu.add_button( new MenuButton("3", "C3v / D3h", () => { this.graph.attach_ring(vertex, 5); } ));
        this.menu.add_button( new MenuButton("4", "C4v / D4h / Td", () => { this.graph.attach_ring(vertex, 6); } ));
        this.menu.visible = true;
    }*/

    menu_attach_ring(vertex: Vertex) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("3", "Cyclopropane", () => { this.commit_action(new AttachRingAction(this.graph, vertex, 3)); } ));
        this.menu.add_button( new MenuButton("4", "Cyclobutane", () => { this.commit_action(new AttachRingAction(this.graph, vertex, 4)); } ));
        this.menu.add_button( new MenuButton("5", "Cyclopentane", () => { this.commit_action(new AttachRingAction(this.graph, vertex, 5)); } ));
        this.menu.add_button( new MenuButton("6", "Cyclohexane", () => { this.commit_action(new AttachRingAction(this.graph, vertex, 6)); } ));
        this.menu.add_button( new MenuButton("7", "Cycloheptane", () => { this.commit_action(new AttachRingAction(this.graph, vertex, 7)); } ));
        this.menu.add_button( new MenuButton("8", "Cyclooctane", () => { this.commit_action(new AttachRingAction(this.graph, vertex, 8)); } ));
        this.menu.visible = true;
    }

    menu_fuse_ring(edge: Edge) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("3", "Cyclopropane", () => { this.commit_action(new FuseRingAction(this.graph, edge, 3)); } ));
        this.menu.add_button( new MenuButton("4", "Cyclobutane", () => { this.commit_action(new FuseRingAction(this.graph, edge, 4)); } ));
        this.menu.add_button( new MenuButton("5", "Cyclopentane", () => { this.commit_action(new FuseRingAction(this.graph, edge, 5)); } ));
        this.menu.add_button( new MenuButton("6", "Cyclohexane", () => { this.commit_action(new FuseRingAction(this.graph, edge, 6)); } ));
        this.menu.add_button( new MenuButton("7", "Cycloheptane", () => { this.commit_action(new FuseRingAction(this.graph, edge, 7)); } ));
        this.menu.add_button( new MenuButton("8", "Cyclooctane", () => { this.commit_action(new FuseRingAction(this.graph, edge, 8)); } ));
        this.menu.visible = true;
    }

    menu_chain(vertex: Vertex) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("1", "Methyl", () => { this.commit_action(new AddChainAction(this.graph, vertex, 1)); } ));
        this.menu.add_button( new MenuButton("2", "Ethyl", () => { this.commit_action(new AddChainAction(this.graph, vertex, 2)); } ));
        this.menu.add_button( new MenuButton("3", "Propyl", () => { this.commit_action(new AddChainAction(this.graph, vertex, 3)); } ));
        this.menu.add_button( new MenuButton("4", "Butyl", () => { this.commit_action(new AddChainAction(this.graph, vertex, 4)); } ));
        this.menu.add_button( new MenuButton("5", "Amyl", () => { this.commit_action(new AddChainAction(this.graph, vertex, 5)); } ));
        this.menu.add_button( new MenuButton("6", "Hexyl", () => { this.commit_action(new AddChainAction(this.graph, vertex, 6)); } ));
        this.menu.add_button( new MenuButton("7", "Heptyl", () => { this.commit_action(new AddChainAction(this.graph, vertex, 7)); } ));
        this.menu.add_button( new MenuButton("8", "Octyl", () => { this.commit_action(new AddChainAction(this.graph, vertex, 8)); } ));
        this.menu.visible = true;
    }

    menu_confirm_clear() {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("Y", "Really clear?", () => { this.clear(); } ));
        //eslint-disable-next-line
        this.menu.add_button( new MenuButton("N", "Cancel", () => {} ));
        this.menu.visible = true;
    }

    on_keydown(evt: KeyboardEvent) {
        if (evt.key == " ") {
            this.toggle_menu();
            return;
        }
        if (this.menu.visible) {
            this.menu.handle_key(evt.key);
            return;
        }
        if (evt.key == "z" && (evt.metaKey || evt.ctrlKey) && !evt.shiftKey) {
            this.rollback_actions(1);
            return;
        }
        if (evt.key == "y" && (evt.metaKey || evt.ctrlKey) || (evt.key == "z" && (evt.metaKey || evt.ctrlKey) && evt.shiftKey) ) {
            this.recommit_actions(1);
            return;
        }
        if (this.active_vertex) {
            this.on_vertex_keydown(evt);
            return;
        }
        if (this.active_edge) {
            switch (evt.key) {
            case "1":
                this.commit_action(new UpdateEdgeShapeAction(this.active_edge, EdgeShape.Single));
                break;
            case "2":
                this.commit_action(new UpdateEdgeShapeAction(this.active_edge, EdgeShape.Double));
                break;
            case "3":
                this.commit_action(new UpdateEdgeShapeAction(this.active_edge, EdgeShape.Triple));
                break;
            case "w":
                this.commit_action(new UpdateEdgeShapeAction(this.active_edge, EdgeShape.SingleUp));
                break;
            case "q":
                this.commit_action(new UpdateEdgeShapeAction(this.active_edge, EdgeShape.SingleDown));
                break;
            case "Backspace":
            case "Delete":
                this.commit_action(new DeleteEdgeAction(this.graph, this.active_edge));
                this.active_edge = null;
            }
        }
    }

    on_edge_click(edge: Edge, evt: KonvaEventObject<MouseEvent>) {
        // disable right click processing
        if (evt.evt.button == 2)
            return;
        switch (edge.bond_type) {
        case BondType.Single:
            this.commit_action(new UpdateEdgeShapeAction(edge, EdgeShape.Double));
            break;
        case BondType.Double:
            this.commit_action(new UpdateEdgeShapeAction(edge, EdgeShape.Triple));
            break;
        case BondType.Triple:
            this.commit_action(new UpdateEdgeShapeAction(edge, EdgeShape.Single));
            break;
        }
        edge.update();
    }

    on_edge_mouseover(edge: Edge) {
        this.stage.container().focus();
        this.active_edge = edge;
        edge.active = true;
    }
    on_edge_mouseout(edge: Edge) {
        this.active_edge = null;
        edge.active = false;
    }

    on_vertex_dragmove(vertex: Vertex, evt: KonvaEventObject<MouseEvent>) {
        vertex.on_drag(!evt.evt.altKey);
        this.commit_action(new MoveVertexAction(this.graph, vertex));
    }

    on_vertex_mouseover(vertex: Vertex) {
        this.stage.container().focus();
        vertex.active = true;
        this.active_vertex = vertex;
    }

    on_vertex_mouseout(vertex: Vertex) {
        vertex.active = false;
        this.active_vertex = null;
    }

    on_vertex_click(vertex: Vertex, evt: KonvaEventObject<MouseEvent>) {
        // disable right click processing
        if (evt.evt.button == 2)
            return;
        this.commit_action(new AddBoundVertexAction(this.graph, vertex));
    }

    on_vertex_mousedown(vertex: Vertex) {
        this.downed_vertex = vertex;
    }

    on_vertex_mouseup(vertex: Vertex) {
        if (!this.downed_vertex)
            return;
        if (vertex != this.downed_vertex && !this.graph.vertices_are_bound(vertex, this.downed_vertex)) {
            this.commit_action(new BindVerticesAction(this.graph, this.downed_vertex, vertex));
        }
        this.downed_vertex = null;
    }

    on_background_click(evt: KonvaEventObject<MouseEvent>) {
        // disable right click processing
        if (evt.evt.button == 2)
            return;
        if (this.menu.visible) {
            this.menu.visible = false;
            return;
        }
        const pos = this.background_layer.getRelativePointerPosition();
        this.commit_action(new AddDefaultFragmentAction(this.graph, pos.x, pos.y));
    }

    on_background_mouseup() {
        this.downed_vertex = null;
    }

    public set onchange(handler: () => void) {
        this._onchange = handler;
    }
}

export { MoleculeEditor };