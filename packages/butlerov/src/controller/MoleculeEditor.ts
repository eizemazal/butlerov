import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Edge, EdgeShape, BondType, EdgeOrientation } from "../drawable/Edge";
import { Graph } from "../drawable/Graph";
import { Stylesheet } from "./Stylesheet";
import { Coords } from "../lib/common";
import {Controller} from "./Controller";
import { LabelType, Vertex } from "../drawable/Vertex";
import { ChemicalElements } from "../lib/elements";
import { Menu } from "./Menu";
import { MenuButton } from "./MenuButton";
import {
    AddBoundVertexAction,
    AddChainAction,
    AddDefaultFragmentAction,
    AddSingleVertexAction,
    AttachRingAction,
    BindVerticesAction,
    ChangeVertexLabelAction,
    ChangeVertexIsotopeAction,
    ClearGraphAction,
    DeleteEdgeAction,
    DeleteVertexAction,
    FuseRingAction,
    IncrementAtomChargeAction,
    MoveVertexAction,
    StripHAction,
    SymmetrizeAlongEdgeAction,
    SymmetrizeAtVertexAction,
    UpdateEdgeShapeAction,
    ExpandLinearAction
} from "../action/GraphActions";
import { ActionDirection } from "../action/Action";
import { Converter } from "../converter/Converter";
import { MolConverter } from "../converter/MolConverter";
import { Drawable } from "../drawable/Drawable";
import { TextBox } from "./TextBox";


class MoleculeEditor extends Controller {
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
    downed_vertex_coords: Coords | null;
    _readonly: boolean;
    panning: boolean;
    _viewport_offset: Coords;
    graph_group: Konva.Group;
    text_box: TextBox;
    constructor(stage: Konva.Stage, autofocus = true) {
        super(stage, autofocus);
        this.stage = stage;
        this.stylesheet = new Stylesheet();
        this.graph = new Graph();
        this.background_layer = new Konva.Layer();
        this.background_layer.add(new Konva.Rect({
            id: "background_rect",
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
        this.background_layer.on("mousemove", (evt:KonvaEventObject<MouseEvent>) => { this.on_background_mousemove(evt); } );
        this.background_layer.on("mouseover", () => { this.on_background_mouseover(); } );
        this.stage.on("mouseleave", () => { this.on_stage_mouseleave(); } );
        this.drawing_layer = new Konva.Layer();
        this.graph_group = this.graph.attach(this);
        this.drawing_layer.add(this.graph_group);
        this.menu = new Menu();
        this.menu.visible = false;
        this.top_layer = new Konva.Layer();
        this.top_layer.add(this.menu.as_group());
        this.active_edge = null;
        this.active_vertex = null;
        this.downed_vertex = null;
        this.downed_vertex_coords = null;
        const container = this.stage.container();
        container.addEventListener("keydown", (e) => { this.on_keydown(e); });
        container.addEventListener("keyup", (e) => { this.on_keyup(e); });
        this.stage.add(this.background_layer);
        this.stage.add(this.drawing_layer);
        this.stage.add(this.top_layer);
        this.update_background();
        this.action_stack = [];
        this.actions_rolled_back = 0;
        this._readonly = false;
        this.panning = false;
        this._viewport_offset = {x: 0, y: 0};
        this.text_box = new TextBox(this);
    }

    protected on_action(direction: ActionDirection): void {
        if (direction == ActionDirection.UNDO || direction == ActionDirection.REDO)
            this.deactivate_edges_vertices();
        this.update_background();
    }

    public dispatch(entity: Drawable, evt: Konva.KonvaEventObject<MouseEvent>): void {
        if (entity instanceof Vertex) {
            switch (evt.type) {
            case "dragmove": this.on_vertex_dragmove(entity, evt); break;
            case "mouseover": this.on_vertex_mouseover(entity); break;
            case "mouseout": this.on_vertex_mouseout(); break;
            case "click": this.on_vertex_click(entity, evt); break;
            case "contextmenu":
                evt.evt.preventDefault();
                this.toggle_menu();
                break;
            case "mousedown": this.on_vertex_mousedown(entity); break;
            case "mouseup": this.on_vertex_mouseup(entity);
            }
        }
        else if (entity instanceof Edge) {
            switch (evt.type) {
            case "mouseover": this.on_edge_mouseover(entity); break;
            case "mouseout": this.on_edge_mouseout(); break;
            case "click": this.on_edge_click(entity, evt); break;
            case "contextmenu":
                evt.evt.preventDefault();
                this.toggle_menu();
                break;
            }
        }
    }


    update_background() {
        const rect = this.background_layer.findOne("#background_rect");
        rect.setAttr("width", this.stage.getAttr("width") / this.zoom);
        rect.setAttr("height", this.stage.getAttr("height") / this.zoom);
        if (this.graph.vertices.length || this.graph.edges.length) {
            this.welcome_message.visible(false);
            this.graph.draw();
            return;
        }
        this.welcome_message.visible(true);
        const txt = this.welcome_message.findOne("#welcome_text") || new Konva.Text({
            id: "welcome_text",
            fill: "#bbb",
            align: "center",
            text: `Butlerov - draw chemical structures in your browser. \n
            Use 1) your mouse to draw, 2) Spacebar to open context menu.\n
            The hotkeys are shown in the menu.
            `,
        });
        txt.setAttr("fontSize", 14/this.zoom);
        txt.setAttr("x", this.stage.width() / (2*this.zoom) - txt.width()/2 );
        txt.setAttr("y", this.stage.height() / (2*this.zoom) - txt.height()/2 );
        this.welcome_message.add(<Konva.Text>txt);
    }

    center_view() {
        const rect = this.graph.get_molecule_rect();
        this.viewport_offset = {
            x : this.stage.width() / (2*this.zoom) - (rect.x1 + rect.x2) / 2,
            y : this.stage.height() / (2*this.zoom) - (rect.y1 + rect.y2) / 2,
        };
    }

    /**
     * Zooms and centers the molecule in editor.
     * @param overzoom Whether use zoom greater than 1. @default false
     * @param margins Minimal size of margins at the edges of the control.
     * The margins will remain blank. Specified as a proportion to width and height of the control. @default 0.05
     */

    zoom_to_fit(overzoom = false, margins=0.05) {
        const rect = this.graph.get_molecule_rect();
        const screen_w = (1+margins)*(rect.x2 - rect.x1);
        const screen_h = (1+margins)*(rect.y2 - rect.y1);
        let zoom = Math.min(this.stage.width() / screen_w, this.stage.height() / screen_h);
        if (zoom > 1 && !overzoom )
            zoom = 1;
        this.zoom = zoom;
    }

    /**
     * @deprecated will be removed in favor of @see load
     * @param mol_string
     */
    load_mol_from_string(mol_string: string) {
        this.load(mol_string, new MolConverter());
    }

    /**
     * @deprecated will be removed in favor of @see save
     * @param mol_string
     */
    get_mol_string() {
        return this.save(new MolConverter());
    }

    load(s: string, converter: Converter) {
        this.clear_actions();
        if (converter.from_string)
            converter.from_string(s, this.graph);
        this.center_view();
        this.graph.update();
        this.update_background();
        if (this._on_change)
            this._on_change();
    }

    save(converter: Converter): string {
        if (converter.to_string)
            return converter.to_string(this.graph);
        return "";
    }

    /**
     * Clears the control.
     * @param from_userspace Specify whether the action is invoked from userspace. In this case, add clear event to history.
     * If false, revert the control to default state. @default false.
     */

    clear(from_userspace = false) {
        if (from_userspace)
            this.commit_action(new ClearGraphAction(this.graph));
        else {
            this.clear_actions();
            this.graph.clear();
        }
        this.viewport_offset = {x: 0, y: 0};
        this.graph_group.x(0);
        this.graph_group.y(0);
        this.active_edge = null;
        this.active_vertex = null;
    }

    get_next_element_label(label: string, key: string, reverse = false): string {
        const element_labels = Object.keys(ChemicalElements)
            .filter(e => e.toLowerCase()[0] == key.toLowerCase())
            .sort((a,b) => {
                if (ChemicalElements[a].abundance != ChemicalElements[b].abundance)
                    return ChemicalElements[a].abundance < ChemicalElements[b].abundance ? -1 : 1;
                return a < b ? -1 : 1;
            });
        if (element_labels.length == 0)
            return "";
        if (label == "")
            label = "C";
        const index = element_labels.indexOf(label);
        if (index == -1)
            return reverse ? element_labels[element_labels.length - 1] : element_labels[0];
        if (!reverse && index == element_labels.length - 1 )
            return element_labels[0];
        if ( reverse && index == 0 )
            return  element_labels[element_labels.length - 1];
        return reverse ? element_labels[index - 1] : element_labels[index + 1];
    }

    on_vertex_keydown(evt: KeyboardEvent) {
        if (!this.active_vertex)
            return;
        if (evt.key == "Backspace" || evt.key == "Delete") {
            this.commit_action(new DeleteVertexAction(this.graph, this.active_vertex));
            this.active_vertex = null;
            return;
        }
        if (evt.key == "Enter") {
            this.edit_vertex_label(this.active_vertex);
            return;
        }
        const translated_key = this.translate_key_event(evt);
        if (translated_key.match(/[A-Za-z]/)) {
            const new_label = this.get_next_element_label(this.active_vertex.label, translated_key, evt.shiftKey);
            if (new_label == "")
                return;
            this.commit_action(new ChangeVertexLabelAction(this.graph, this.active_vertex, new_label));
        }
        if (evt.key == "+") {
            this.commit_action(new IncrementAtomChargeAction(this.active_vertex, 1));
            return;
        }
        if (evt.key == "-") {
            this.commit_action(new IncrementAtomChargeAction(this.active_vertex, -1));
            return;
        }
    }

    on_edge_keydown(evt: KeyboardEvent) {
        if (!this.active_edge)
            return;
        const translated_key = this.translate_key_event(evt);
        switch (translated_key) {
        case "1":
            this.commit_action(new UpdateEdgeShapeAction(this.graph, this.active_edge, EdgeShape.Single));
            break;
        case "2":
            if (this.active_edge.shape != EdgeShape.Double) {
                this.commit_action(new UpdateEdgeShapeAction(this.graph, this.active_edge, EdgeShape.Double));
            }
            else if (this.active_edge.orientation == EdgeOrientation.Right)
                this.commit_action(new UpdateEdgeShapeAction(this.graph, this.active_edge, EdgeShape.Double, EdgeOrientation.Left));
            else if (this.active_edge.orientation == EdgeOrientation.Left)
                this.commit_action(new UpdateEdgeShapeAction(this.graph, this.active_edge, EdgeShape.Double, EdgeOrientation.Center));
            else
                this.commit_action(new UpdateEdgeShapeAction(this.graph, this.active_edge, EdgeShape.Double, EdgeOrientation.Right));
            break;
        case "3":
            this.commit_action(new UpdateEdgeShapeAction(this.graph, this.active_edge, EdgeShape.Triple));
            break;
        case "w":
            this.commit_action(new UpdateEdgeShapeAction(this.graph, this.active_edge, EdgeShape.SingleUp));
            break;
        case "q":
            this.commit_action(new UpdateEdgeShapeAction(this.graph, this.active_edge, EdgeShape.SingleDown));
            break;
        case "e":
            this.commit_action(new UpdateEdgeShapeAction(this.graph, this.active_edge, EdgeShape.SingleEither));
            break;
        case "Backspace":
        case "Delete":
            this.commit_action(new DeleteEdgeAction(this.graph, this.active_edge));
            this.deactivate_edges_vertices();
        }
    }

    toggle_menu() {
        if (this.menu.visible) {
            this.menu.visible = false;
            return;
        }

        if (this.active_edge) {
            this.menu.clear_buttons();
            const edge = this.active_edge;
            this.menu.add_button( new MenuButton("1", "Single", () => {
                this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.Single));
            } ));
            this.menu.add_button( new MenuButton("2", "Double", () => {
                if (edge.shape != EdgeShape.Double) {
                    this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.Double));
                }
                else if (edge.orientation == EdgeOrientation.Right)
                    this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.Double, EdgeOrientation.Left));
                else if (edge.orientation == EdgeOrientation.Left)
                    this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.Double, EdgeOrientation.Center));
                else
                    this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.Double, EdgeOrientation.Right));
            } ));
            edge.bond_type != BondType.Triple && this.menu.add_button( new MenuButton("3", "Triple", () => {
                this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.Triple));
            } ));
            this.menu.add_button( new MenuButton("w", "Wedged up", () => {
                this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.SingleUp));
            } ));
            this.menu.add_button( new MenuButton("q", "Wedged down", () => {
                this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.SingleDown));
            } ));
            this.menu.add_button( new MenuButton("e", "Single either", () => {
                this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.SingleEither));
            } ));
            this.menu.add_button( new MenuButton("a", "Double either", () => {
                this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.DoubleEither));
            } ));
            this.menu.add_button( new MenuButton("R", "Fuse ring", () => { this.menu_fuse_ring(edge); } ));
            if ( (edge.v1.neighbors.size == 1) != (edge.v2.neighbors.size == 1) )
                this.menu.add_button( new MenuButton("S", "Symmetrize along", () => { this.commit_action(new SymmetrizeAlongEdgeAction(this.graph, edge)); } ));
            this.menu.add_button( new MenuButton("x", "Delete", () =>  {
                this.commit_action(new DeleteEdgeAction(this.graph, edge));
            } ));
        }
        else if (this.active_vertex) {
            this.menu.clear_buttons();
            const vertex = this.active_vertex;
            this.menu.add_button( new MenuButton("R", "Attach ring here", () => { this.menu_attach_ring(vertex); } ));
            this.menu.add_button( new MenuButton("C", "Add normal chain", () => { this.menu_chain(vertex); } ));
            this.menu.add_button( new MenuButton("E", "Edit", () => { this.edit_vertex_label(vertex); } ) );
            if (vertex.label_type == LabelType.Atom && vertex.element?.isotopes.length != 0) {
                this.menu.add_button( new MenuButton("I", "Isotopes", () => { this.menu_isotopes(vertex); } ));
            }
            if (vertex.label_type == LabelType.Linear && vertex.neighbors.size == 1) {
                this.menu.add_button( new MenuButton("P", "Expand", () => { this.commit_action(new ExpandLinearAction(this.graph, vertex)); } ));
            }
            if (vertex.neighbors.size == 1)
                this.menu.add_button( new MenuButton("S", "Symmetry", () => { this.menu_symmetry_vertex(vertex); } ));
            this.menu.add_button( new MenuButton("x", "Delete", () => {
                this.commit_action(new DeleteVertexAction(this.graph, vertex));
            } ));
        }
        else {
            this.menu.clear_buttons();
            this.menu.add_button( new MenuButton("c", "Center view", () => { this.center_view(); } ));
            this.menu.add_button( new MenuButton("z", "Zoom", () => { this.menu_zoom(); } ));
            this.menu.add_button( new MenuButton("f", "Zoom to fit", () => { this.zoom_to_fit(); } ));
            this.menu.add_button( new MenuButton("h", "Strip hydrogens", () => { this.commit_action(new StripHAction(this.graph)); } ));
            this.menu.add_button( new MenuButton("x", "Clear drawing", () => { this.menu_confirm_clear(); } ));
        }

        if (this.stage.pointerPos) {
            this.menu.x = (this.stage.pointerPos.x + this.menu.width < this.stage.width()) ? this.stage.pointerPos.x : this.stage.width() - this.menu.width;
            this.menu.y = (this.stage.pointerPos.y + this.menu.height < this.stage.height()) ? this.stage.pointerPos.y : this.stage.height() - this.menu.height;
        }
        else {
            this.menu.x = (this.stage.width() - this.menu.width) / 2;
            this.menu.y = (this.stage.height() - this.menu.height) / 2;
        }

        this.menu.visible = true;
    }

    public get zoom(): number {
        return this.stage.scaleX();
    }

    public set zoom(zoom: number) {
        this.stage.scaleX(zoom);
        this.stage.scaleY(zoom);
        this.center_view();
        this.update_background();
    }

    menu_zoom() {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("a", "50%", () => { this.zoom = 0.5;  } ));
        this.menu.add_button( new MenuButton("q", "75%", () => { this.zoom = 0.75;  } ));
        this.menu.add_button( new MenuButton("1", "100%", () => { this.zoom = 1; } ));
        this.menu.add_button( new MenuButton("2", "200%", () => { this.zoom = 2;  } ));
        this.menu.visible = true;
    }

    menu_symmetry_vertex(vertex: Vertex) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("2", "C2v / D2h", () => { this.commit_action(new SymmetrizeAtVertexAction(this.graph, vertex, 2)); } ));
        this.menu.add_button( new MenuButton("3", "C3v / D3h", () => { this.commit_action(new SymmetrizeAtVertexAction(this.graph, vertex, 3)); } ));
        this.menu.add_button( new MenuButton("4", "C4v / D4h", () => { this.commit_action(new SymmetrizeAtVertexAction(this.graph, vertex, 4)); } ));
        this.menu.visible = true;
    }

    menu_attach_ring(vertex: Vertex) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("p", "Phenyl", () => { this.commit_action(new AttachRingAction(this.graph, vertex, 6, true)); } ));
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
        this.menu.add_button( new MenuButton("p", "Phenyl", () => { this.commit_action(new FuseRingAction(this.graph, edge, 6, true)); } ));
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

    menu_isotopes(vertex: Vertex) {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("x", "x", () => { this.commit_action(new ChangeVertexIsotopeAction(this.graph, vertex, 0)); } ));
        if (vertex.element?.isotopes) {
            for (const [index, is] of vertex.element.isotopes.entries()) {
                this.menu.add_button( new MenuButton(`${index + 1}`, `${is}${vertex.element.symbol}`, () => { this.commit_action(new ChangeVertexIsotopeAction(this.graph, vertex, is)); } ));
            }
        }
        this.menu.visible = true;
    }

    menu_confirm_clear() {
        this.menu.clear_buttons();
        this.menu.add_button( new MenuButton("Y", "Really clear?", () => { this.clear(true); } ));
        //eslint-disable-next-line
        this.menu.add_button( new MenuButton("N", "Cancel", () => {} ));
        this.menu.visible = true;
    }

    on_keyup(evt: KeyboardEvent) {
        if (this.text_box.visible)
            return;
        evt.preventDefault();
        if (evt.key == "Shift")
            this.stage.container().style.cursor = "default";
    }

    public get viewport_offset(): Coords {
        return this._viewport_offset;
    }

    public set viewport_offset(offset: Coords) {
        this._viewport_offset = offset;
        this.graph_group.x(offset.x);
        this.graph_group.y(offset.y);
    }

    on_keydown(evt: KeyboardEvent): void {
        if (this.text_box.visible) {
            this.text_box.handle_keydown(evt);
            return;
        }
        evt.preventDefault();
        if (evt.key == "Shift") {
            this.stage.container().style.cursor = "move";
            return;
        }
        if (evt.key == "ArrowUp") {
            this.viewport_offset = { x: this.viewport_offset.x, y: this.viewport_offset.y + this.stage.height() / 20 };
            return;
        }
        if (evt.key == "ArrowDown") {
            this.viewport_offset = { x: this.viewport_offset.x, y: this.viewport_offset.y - this.stage.height() / 20 };
            return;
        }
        if (evt.key == "ArrowLeft") {
            this.viewport_offset = { x: this.viewport_offset.x + this.stage.width() / 20, y: this.viewport_offset.y };
            return;
        }
        if (evt.key == "ArrowRight") {
            this.viewport_offset = { x: this.viewport_offset.x - this.stage.width() / 20, y: this.viewport_offset.y };
            return;
        }
        if (this._readonly)
            return;
        if (evt.key == " ") {
            this.toggle_menu();
            return;
        }
        if (this.menu.visible) {
            this.menu.handle_key(this.translate_key_event(evt));
            return;
        }
        const translated_key = this.translate_key_event(evt);
        if (translated_key == "z" && (evt.metaKey || evt.ctrlKey) && !evt.shiftKey) {
            this.rollback_actions(1);
            return;
        }
        if (translated_key == "y" && (evt.metaKey || evt.ctrlKey) || (translated_key == "z" && (evt.metaKey || evt.ctrlKey) && evt.shiftKey) ) {
            this.recommit_actions(1);
            return;
        }
        if (this.active_vertex) {
            this.on_vertex_keydown(evt);
            return;
        }
        if (this.active_edge) {
            this.on_edge_keydown(evt);
            return;
        }
    }

    on_edge_click(edge: Edge, evt: KonvaEventObject<MouseEvent>) {
        // disable right click processing
        if (evt.evt.button == 2)
            return;
        switch (edge.bond_type) {
        case BondType.Single:
            this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.Double));
            break;
        case BondType.Double:
            this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.Triple));
            break;
        case BondType.Triple:
            this.commit_action(new UpdateEdgeShapeAction(this.graph, edge, EdgeShape.Single));
            break;
        }
        edge.update();
    }

    on_edge_mouseover(edge: Edge) {
        this.stage.container().focus();
        this.deactivate_edges_vertices();
        this.active_edge = edge;
        edge.active = true;
    }
    on_edge_mouseout() {
        this.deactivate_edges_vertices();
    }

    on_vertex_dragmove(vertex: Vertex, evt: KonvaEventObject<MouseEvent>) {
        vertex.on_drag(!evt.evt.altKey);
        this.commit_action(new MoveVertexAction(this.graph, vertex, this.downed_vertex_coords));
    }

    on_vertex_mouseover(vertex: Vertex) {
        this.stage.container().focus();
        this.deactivate_edges_vertices();
        vertex.active = true;
        this.active_vertex = vertex;
    }

    on_vertex_mouseout() {
        this.deactivate_edges_vertices();
    }

    on_vertex_click(vertex: Vertex, evt: KonvaEventObject<MouseEvent>) {
        // disable right click processing
        if (evt.evt.button == 2)
            return;
        this.commit_action(new AddBoundVertexAction(this.graph, vertex));
    }

    on_vertex_mousedown(vertex: Vertex) {
        this.downed_vertex = vertex;
        this.downed_vertex_coords = JSON.parse(JSON.stringify(vertex.coords));
    }

    on_vertex_mouseup(vertex: Vertex) {
        if (!this.downed_vertex)
            return;
        if (vertex != this.downed_vertex && !this.graph.vertices_are_connected(vertex, this.downed_vertex)) {
            this.commit_action(new BindVerticesAction(this.graph, this.downed_vertex, vertex));
        }
        this.downed_vertex = null;
    }

    on_background_click(evt: KonvaEventObject<MouseEvent>) {
        // disable right click processing
        if (evt.evt.button == 2 || evt.evt.shiftKey)
            return;
        // when user was panning, a click event is generated in the end
        if (this.panning) {
            this.panning = false;
            return;
        }
        if (this.menu.visible) {
            this.menu.visible = false;
            return;
        }
        if (this.text_box.visible) {
            this.text_box.cancel();
            return;
        }
        const pos = this.background_layer.getRelativePointerPosition();
        pos.x -= this.viewport_offset.x;
        pos.y -= this.viewport_offset.y;
        if (evt.evt.ctrlKey || evt.evt.metaKey)
            this.commit_action(new AddSingleVertexAction(this.graph, pos.x, pos.y));
        else
            this.commit_action(new AddDefaultFragmentAction(this.graph, pos.x, pos.y));
    }

    on_background_mouseup() {
        this.downed_vertex = null;
    }

    on_background_mousemove(evt: KonvaEventObject<MouseEvent>) {
        if (!evt.evt.shiftKey || evt.evt.button != 0 || evt.evt.buttons != 1)
            return;
        this.panning = true;
        this.viewport_offset = {
            x: this.viewport_offset.x + evt.evt.movementX / this.zoom,
            y: this.viewport_offset.y + evt.evt.movementY / this.zoom,
        } ;
    }

    on_background_mouseover() {
        this.deactivate_edges_vertices();
    }

    on_stage_mouseleave() {
        this.panning = false;
        this.deactivate_edges_vertices();
        this.stage.container().style.cursor = "default";
    }

    public get readonly(): boolean {
        return this._readonly;
    }

    public set readonly(value: boolean) {
        this._readonly = value;
        if (!value)
            this.stage.container().blur();
        this.stage.listening(!value);
    }

    public get empty(): boolean {
        return this.graph.vertices.length == 0 && this.graph.edges.length == 0;
    }

    deactivate_edges_vertices() {
        if (this.active_edge) {
            this.active_edge.active = false;
            this.active_edge = null;
        }
        if (this.active_vertex) {
            this.active_vertex.active = false;
            this.active_vertex = null;
        }
    }

    private translate_key_event(evt: KeyboardEvent): string {
        if (evt.code.match(/Key(.+)/))
            return evt.code.substring(3).toLowerCase();
        if (evt.code.match(/Digit(\d+)/))
            return evt.code.substring(5);
        return evt.key;
    }

    edit_vertex_label(vertex: Vertex) {
        if (this.text_box.visible)
            this.text_box.close();
        this.text_box.x = (vertex.coords.x - this._viewport_offset.x) / this.zoom;
        this.text_box.y = (vertex.coords.y - this._viewport_offset.y) / this.zoom;
        this.text_box.value = vertex.label;
        vertex.hide();
        this.text_box.onchange = (value) => {
            this.commit_action(new ChangeVertexLabelAction(this.graph, vertex, value));
        };
        this.text_box.onclose = () => {
            vertex.show();
            this.stage.container().focus();
        };
        this.text_box.open();
    }
}

export { MoleculeEditor };