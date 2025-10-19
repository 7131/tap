// Visual effector base class
class EffectorBase {
    #callback;
    #count = 30;
    #interval = 20;
    #index = 0;

    // constructor
    constructor(count) {
        if (!isNaN(count) && 0 <= count) {
            this.#count = count;
        }
    }

    // initialize the effector (template method)
    initialize(count) {
    }

    // terminate the effector (template method)
    terminate() {
    }

    // do next step (template method)
    doNext() {
    }

    // run the effector
    run(callback) {
        this.#callback = callback;
        this.#index = 0;
        this.initialize(this.#count);
        setTimeout(this.#step.bind(this), this.#interval);
    }

    // step execution
    #step() {
        if (this.#index < this.#count) {
            // in progress
            this.doNext();
            this.#index++;
            setTimeout(this.#step.bind(this), this.#interval);
        } else {
            // finished
            this.terminate();
            if (typeof this.#callback == "function") {
                this.#callback();
            }
        }
    }

}

// Empty effector class
class EmptyEffector extends EffectorBase {
    #method;

    // constructor
    constructor(method) {
        super(0);
        this.#method = method;
    }

    // terminate the effector
    terminate() {
        if (typeof this.#method == "function") {
            this.#method();
        }
    }

}

// Text effector base class
class TextEffectorBase extends EffectorBase {
    #width;
    #size;

    // constructor
    constructor (element, count) {
        super(count);
        this.element = element;
        this.live = this.element.viewportElement.viewBox.baseVal;
        this.#width = this.live.width;
        this.#size = parseFloat(this.element.getAttribute("font-size"));
    }

    // initialize the effector
    initialize(count) {
        this.element.setAttribute("font-size", this.#size * this.live.width / this.#width);
    }

    // terminate the effector
    terminate() {
        this.element.setAttribute("y", this.live.y - this.live.height);
        this.element.textContent = "";
    }

    // do next step
    doNext() {
        this.element.setAttribute("font-size", this.#size * this.live.width / this.#width);
    }

}

// Caption effector class
class CaptionEffector extends TextEffectorBase {
    #text;
    #color;

    // constructor
    constructor(element, text, color) {
        super(element, 50);
        this.#text = text;
        this.#color = color;
    }

    // initialize the effector
    initialize(count) {
        this.element.setAttribute("y", -this.live.height * 0.6);
        this.element.setAttribute("fill", this.#color);
        this.element.setAttribute("stroke", this.#color);
        this.element.textContent = this.#text;
        super.initialize(count);
    }

    // do next step
    doNext() {
        this.element.setAttribute("y", -this.live.height * 0.6);
        super.doNext();
    }

}

// Message effector class
class MessageEffector extends TextEffectorBase {

    // constructor
    constructor(element) {
        super(element, 150);
    }

    // initialize the effector
    initialize(count) {
        this.element.setAttribute("y", 0);
        super.initialize(count);
    }

}

// Curtain effector base class
class CurtainEffectorBase extends EffectorBase {
    #direction = 1;
    #current = 0;
    #increment = 1;

    // constructor
    constructor(curtain, direction, count) {
        super(count);
        this.curtain = curtain;
        this.#direction = direction;
    }

    // initialize the effector
    initialize(count) {
        const view = this.curtain.viewportElement.viewBox.baseVal;
        const stride = view.height * 1.2;
        const half = stride / 2;
        const center = view.y * 1.2 - half;
        this.#increment = -stride * this.#direction / count;
        this.#current = center + half * this.#direction + this.#increment;
        this.curtain.setAttribute("x", -half);
        this.curtain.setAttribute("y", this.#current);
        this.curtain.setAttribute("width", stride);
        this.curtain.setAttribute("height", stride);
        this.curtain.setAttribute("fill-opacity", 0.8);
    }

    // do next step
    doNext() {
        this.curtain.setAttribute("y", this.#current);
        this.#current += this.#increment;
    }

}

// Open curtain effector class
class OpenEffector extends CurtainEffectorBase {

    // constructor
    constructor(curtain) {
        super(curtain, 1, 40);
    }

    // terminate the effector
    terminate() {
        this.curtain.setAttribute("fill-opacity", 0);
    }

}

// Close curtain effector class
class CloseEffector extends CurtainEffectorBase {

    // constructor
    constructor(curtain) {
        super(curtain, -1, 10);
    }

}

// Zoom effector class
class ZoomEffector extends EffectorBase {
    #svg;
    #area;
    #scale = 1;
    #target = 1;
    #increment = 0;

    // constructor
    constructor(svg) {
        super();
        this.#svg = svg;
        const view = this.#svg.viewBox.baseVal;
        this.#area = new DOMRect(view.x, view.y, view.width, view.height);
    }

    // run the effector
    run(target) {
        if (!isNaN(target) && 0 < target) {
            this.#target = target;
        } else {
            this.#target = this.#scale;
        }
        super.run();
    }

    // initialize the effector
    initialize(count) {
        this.#increment = (this.#target - this.#scale) / count;
    }

    // do next step
    doNext() {
        this.#scale += this.#increment;
        const width = this.#area.width * this.#scale;
        this.#svg.setAttribute("viewBox", `${-width / 2} ${this.#area.y * this.#scale} ${width} ${width}`);
    }

}

// Effector collection class
class EffectorCollection {
    #items = [];
    #index = 0;

    // constructor
    constructor(...items) {
        this.add(items);
    }

    // add items
    add(items) {
        if (!Array.isArray(items)) {
            items = [ items ];
        }
        this.#items = this.#items.concat(items.filter(elem => elem instanceof EffectorBase));
    }

    // run effectors
    run() {
        this.#index = 0;
        this.#step();
    }

    // step execution
    #step() {
        if (this.#index < this.#items.length) {
            this.#items[this.#index].run(this.#step.bind(this));
            this.#index++;
        }
    }

}

// Decorator class
class Decorator {
    #svg;
    #curtain;
    #caption;
    #message;
    #antenna;
    #eye;
    #pupil;
    #effectors;

    // state
    #area;
    #ex = 0;
    #ey = 0;

    // constructor
    constructor(svg) {
        this.#svg = svg;
        this.#eye = document.getElementById("robot_eye");
        this.#pupil = document.getElementById("robot_pupil");
        this.#antenna = document.getElementById("robot_antenna");
        this.#message = this.#setShape("message");
        this.#curtain = this.#setShape("curtain");
        this.#caption = this.#setShape("caption");
        this.#effectors = this.#createEffectors();

        // initial value of each element
        const view = this.#svg.viewBox.baseVal;
        this.#area = new DOMRect(view.x, view.y, view.width, view.height);
        this.#curtain.setAttribute("x", view.x);
        this.#curtain.setAttribute("y", view.y);
        this.#curtain.setAttribute("width", view.width);
        this.#curtain.setAttribute("height", view.height);
        this.#curtain.setAttribute("fill-opacity", 0.8);
        const move = this.#eye.getAttribute("d").match(/m *(-?\d+)[ ,]*(-?\d+)/i);
        if (move && 2 < move.length) {
            this.#ex = parseFloat(move[1]);
            this.#ey = parseFloat(move[2]);
        }
    }

    // set events
    setEvents(start, restart) {
        const first = new EmptyEffector(start);
        const follow = new EmptyEffector(restart);
        this.#effectors.curtains[0].add(first);
        this.#effectors.curtains[1].add(follow);
        this.#effectors.curtains[2].add(follow);
    }

    // move the curtain
    moveCurtain(remain) {
        const index = 3 - remain;
        const angles = [ 0, 20, 50, 100 ];
        this.#antenna.setAttribute("transform", `rotate(${angles[index]} 15,-150)`);
        this.#effectors.curtains[index].run();
    }

    // show the message
    showMessage(message, color) {
        this.#message.textContent = message;
        this.#message.setAttribute("fill", color);
        this.#effectors.message.run();
    }

    // set the screen scale
    setScale(scale) {
        const ratio = parseFloat(scale);
        if (isNaN(ratio) || ratio <= 0) {
            return;
        }

        // shift the gaze
        const gaze = Math.min(ratio - 1, 1);
        const h = gaze * -8;
        this.#eye.setAttribute("d", `m ${this.#ex},${this.#ey} c 0,${h} 16,${h} 16,0`);
        this.#pupil.setAttribute("cy", this.#ey - gaze * 5);

        // gradually change the zoom
        this.#effectors.zoom.run(ratio);
    }

    // create effectors
    #createEffectors() {
        const first = new CaptionEffector(this.#caption, "1st try", "coral");
        const second = new CaptionEffector(this.#caption, "2nd try", "coral");
        const third = new CaptionEffector(this.#caption, "3rd try", "coral");
        const over = new CaptionEffector(this.#caption, "GAME OVER", "red");
        const open = new OpenEffector(this.#curtain);
        const close = new CloseEffector(this.#curtain);
        const curtains = [
            new EffectorCollection(first, open),
            new EffectorCollection(close, second, open),
            new EffectorCollection(close, third, open),
            new EffectorCollection(close, over),
        ];
        const effectors = {
            "curtains": curtains,
            "message": new MessageEffector(this.#message),
            "zoom": new ZoomEffector(this.#svg),
        }
        return effectors;
    }

    // set a shape
    #setShape(id) {
        const shape = document.getElementById(id);
        if (shape) {
            this.#svg.appendChild(shape);
        }
        return shape;
    }

}

