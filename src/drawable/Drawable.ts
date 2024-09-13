import Konva from "konva";
import { Controller } from "../controller/Controller";


export class Drawable {
    /**
     * If is drawn on the screen, this will refer to Controller. Otherwise it can be detached from screen
     * @defaultValue null
     */
    controller: Controller | null = null;

    /**
     * Contains all Konva elements that need to be drawn for this Drawable. Or null when Drawable is detached from controller.
     * @defaultValue null
     */
    public group: Konva.Group | null = null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    attach_events(controller: Controller) {
        return;
    }

    /**
     * Attach this instance to Controller.
     * @param controller Controller to which attach the instance
     * @returns Konva group
     */
    attach(controller: Controller): Konva.Group {
        this.controller = controller;
        if (!this.group)
            this.group = new Konva.Group();
        this.attach_events(controller);
        this.update();
        return this.group;
    }

    /**
     * Detach the instance from the controller. Only data will be kept, rendering will be destroyed.
     */
    detach() {
        this.group?.destroyChildren();
        this.controller = null;
    }

    /**
     * Perform drawing. Should be overriden in derived classes. Should perform minimalistic drawing to avoid unnecessary re-rendering of elements already rendered.
     * @returns
     */
    update(): void {
        return;
    }

    /**
     * Force redraw
     */
    draw(): void {
        this.group?.draw();
    }
}