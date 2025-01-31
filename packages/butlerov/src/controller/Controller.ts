import Konva from "konva";
import { Style, Theme, defaultStyle, darkTheme } from "./Theme";
import { Action, UpdatableAction, ActionDirection } from "../action/Action";
import { DrawableBase } from "../drawables/Base";
import { Coords } from "../types";
import { Document } from "../types";

export interface DocumentSize {
    width: number;
    height: number;
}

export type ControllerMode = "structure" | "scheme";

export interface ControllerSettings {
    stage: Konva.Stage | HTMLDivElement;
    mode: ControllerMode;
    autofocus?: boolean;
    style?: Style;
    theme?: string | Theme;
    document_size?: DocumentSize;
}


/**
 * This is a base class for controller. It performs basic actions like keeping track of the stage,
 * undo and redo
 */
export class Controller {
    stage: Konva.Stage;
    protected _document: Document;
    protected _theme: Theme;
    protected _theme_name: string;
    protected _style: Style;
    protected _zoom: number;
    protected _document_size?: DocumentSize;
    protected background_layer: Konva.Layer;
    protected drawing_layer: Konva.Layer;
    protected top_layer: Konva.Layer;
    protected mode: ControllerMode;
    action_stack: Action[] = [];
    actions_rolled_back = 0;
    _on_change: (() => void) | null = null;

    constructor(settings: ControllerSettings) {

        this._document = {
            mime: "application/butlerov",
            objects: []
        };

        this.mode = settings.mode;

        this.stage = settings.stage instanceof HTMLDivElement ? new Konva.Stage({
            container: settings.stage,
            width: settings.stage.clientWidth,
            height: settings.stage.clientHeight
        }) : settings.stage;

        this._style = settings.style || defaultStyle;

        if (settings.theme === undefined) {
            this._theme = this._style.themes.length ? this._style.themes[0] : darkTheme;
        }
        else if (settings.theme instanceof String) {
            this._theme_name = settings.theme as string;
            let theme = this._style.themes.find(e => e.name == this._theme_name);
            if (theme === undefined)
                theme = this._style.themes.length ? this._style.themes[0] : darkTheme;
            this._theme = theme;
        }
        else
            this._theme = settings.theme as Theme;
        this._theme_name = this._theme.name;

        if (settings.document_size !== undefined) {
            if (settings.document_size.width <= 0 || settings.document_size.height <= 0)
                throw "Document width and height are expected to be positive numbers";
            this._document_size = settings.document_size;
        }

        this._zoom = 1;

        const container = this.stage.container();
        container.tabIndex = 1;
        if (settings.autofocus !== false)
            container.focus();

        this.background_layer = new Konva.Layer();
        this.stage.add(this.background_layer);
        this.drawing_layer = new Konva.Layer();
        this.stage.add(this.drawing_layer);
        this.top_layer = new Konva.Layer();
        this.stage.add(this.top_layer);
        if (typeof ResizeObserver !== "undefined") {
            const ro = new ResizeObserver((e) => {
                this.stage.width(e[0].contentRect.width);
                this.stage.height(e[0].contentRect.height);
                this.draw_background();
            });
            ro.observe(container);
        }
        this.draw_background();
    }

    draw_background() {
        const background_rect: Konva.Rect = this.background_layer.findOne("#background_rect") || new Konva.Rect({
            id: "background_rect"
        });
        background_rect.size(this.stage.size());
        background_rect.setAttr("fill", this._theme.background_fill_color);

        this.background_layer.add(background_rect);

        if (this.empty) {
            const txt: Konva.Text = this.background_layer.findOne("#welcome_text") || new Konva.Text({
                id: "welcome_text",
                fill: this._theme.atom_label_color,
                align: "center",
                text: `Butlerov - draw chemical structures in your browser. \n
                Use 1) your mouse to draw, 2) Spacebar to open context menu.\n
                The hotkeys are shown in the menu.
                `,
            });
            txt.setAttr("fontSize", 14 / this.zoom);
            txt.setAttr("x", (this.stage.width() - txt.width()) / 2);
            txt.setAttr("y", (this.stage.height() - txt.height()) / 2);
            txt.visible(true);
            this.background_layer.add(txt);
        }
        else
            this.background_layer.findOne("#welcome_text")?.visible(false);
    }

    public get document(): Document {
        return this._document;
    }

    public set document(document: Document) {
        this._document = document;
    }

    public set document_size(size: DocumentSize) {
        if (size.width <= 0 || size.height <= 0)
            throw "Document width and height are expected to be positive numbers";
        this._document_size = size;
    }

    public get document_size(): DocumentSize {
        return this._document_size === undefined ? { width: -1, height: -1 } : this._document_size;
    }

    public get viewport_offset(): Coords {
        return this.drawing_layer.offset();
    }

    public set viewport_offset(offset: Coords) {
        this.drawing_layer.offset(offset);
    }

    public get zoom(): number {
        return this._zoom;
    }

    public set zoom(value: number) {
        const dx = this.stage.width() / 2 * (1 / this._zoom - 1 / value);
        const dy = this.stage.height() / 2 * (1 / this._zoom - 1 / value);
        const offset = this.viewport_offset;
        this.drawing_layer.scale({ x: value, y: value });
        this.viewport_offset = { x: offset.x + dx, y: offset.y + dy };
        this._zoom = value;
    }


    /**
     * Return if control is emtpy. Override in derived class
     */
    //eslint-disable-next-line
    public get empty(): boolean {
        return true;
    }

    public get theme(): Theme {
        return this._theme;
    }

    public set theme(theme: Theme | string) {
        if (theme === this._theme || theme === this._theme_name)
            return;
        if (typeof theme == "string") {
            const t = this._style.themes.find(e => e.name == theme);
            if (t == undefined)
                return;
            this._theme_name = theme;
            this._theme = t;
        }
        else {
            this._theme = theme;
            this._theme_name = theme.name;
        }
        this.draw_background();
        this.update();
    }

    public get style(): Style {
        return this._style;
    }

    public set style(style: Style) {
        if (style === this._style)
            return;
        this._style = style;
        const t = this._style.themes.find(e => e.name == this._theme_name);
        if (t === undefined) {
            if (this.style.themes.length) {
                this._theme = this.style.themes[0];
            }
            else {
                this._theme = darkTheme;
            }
            this._theme_name = this._theme.name;
        }
        this.draw_background();
        this.update();
    }


    /**
     * Commit action to history and execute changes
     * @param action @see Action to commit
     */
    commit_action(action: Action): void {
        // find last action that has not been rolled back, and throw away history after it
        for (let i = 0; i < this.actions_rolled_back; i++) {
            this.action_stack.pop();
        }
        this.actions_rolled_back = 0;
        const was_empty = this.empty;
        if (this.action_stack.length) {
            const last_action = this.action_stack[this.action_stack.length - 1];
            if (last_action instanceof UpdatableAction && action.constructor == last_action.constructor) {
                if (last_action.update(action as UpdatableAction)) {
                    this.on_action(ActionDirection.UPDATE);
                    if (this._on_change)
                        this._on_change();
                    if (this.empty != was_empty)
                        this.draw_background();
                    return;
                }
            }
        }
        this.action_stack.push(action);
        action.commit();
        this.on_action(ActionDirection.DO);
        if (this._on_change)
            this._on_change();
        if (this.empty != was_empty)
            this.draw_background();
    }

    /**
     * Rollback actions from history
     * @param count number of actions to rollback
     */
    rollback_actions(count: number): void {
        const was_empty = this.empty;
        for (let i = 0; i < count; i++) {
            if (this.actions_rolled_back >= this.action_stack.length)
                break;
            this.actions_rolled_back += 1;
            this.action_stack[this.action_stack.length - this.actions_rolled_back].rollback();
        }
        this.on_action(ActionDirection.UNDO);
        if (this._on_change)
            this._on_change();
        if (this.empty != was_empty)
            this.draw_background();
    }

    /**
     * Recommit (Redo) as many actions in history as possible up to count.
     * @param count number of actions to recommit
     */
    recommit_actions(count: number): void {
        const was_empty = this.empty;
        for (let i = 0; i < count; i++) {
            if (this.actions_rolled_back < 1)
                return;
            this.action_stack[this.action_stack.length - this.actions_rolled_back].commit();
            this.actions_rolled_back -= 1;
        }
        this.on_action(ActionDirection.UNDO);
        if (this._on_change)
            this._on_change();
        if (this.empty != was_empty)
            this.draw_background();
    }

    /**
     * Clear action history.
     */
    clear_actions(): void {
        this.actions_rolled_back = 0;
        this.action_stack = [];
    }

    /**
     * Set callback function for change event
     */
    public set onchange(handler: () => void) {
        this._on_change = handler;
    }


    /**
     * For the use in derived classes: callback method for actions.
     * @param direction whether action is performed for the first time (DO), updated (UPDATE), rolled back, or recommitted.
     * @returns
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected on_action(direction: ActionDirection): void {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public dispatch(entity: DrawableBase, evt: Konva.KonvaEventObject<MouseEvent>) {
        return;
    }

    public update() { return; }
}