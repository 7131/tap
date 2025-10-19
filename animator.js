// Ball animator class
class BallAnimator {

    // constructor
    constructor(owner) {
        this.owner = owner;
        this.direction = "cross";
    }

    // setup the properties
    setup(value) {
        this.x = value.x;
        this.y = value.y;
        this.dx = value.dx;
        this.dy = value.dy;
        this.future = new Array(value.delay).fill(new DOMPoint(this.x, this.y));
    }

    // set the next state
    setNext() {
        if (0 < this.future.length) {
            // if the next position is fixed
            const point = this.future.shift();
            if (!isNaN(point.x) && !isNaN(point.y)) {
                this.x = point.x;
                this.y = point.y;

                // score calculation
                if (this.future.length == 0 && this.owner.events.has("score") && 0 < point.z) {
                    const base = Math.floor((point.y - this.owner.top) * this.owner.count / 100);
                    const score = (Math.max(0, base) + point.w) * point.z;
                    this.owner.events.get("score")({ "score": score });
                }
                return;
            }
        }

        // calculate  next position
        const next = this.getPosition(1);
        this.x = next.x;
        this.y = next.y;
        this.dy = next.dy;

        // determine if it has dropped
        if (this.dy < 0) {
            return;
        }
        if (this.owner.ground < this.owner.bottom && this.owner.bottom < this.y || this.future.length == 0 && this.owner.ground < this.y) {
            if (this.owner.events.has("drop")) {
                this.owner.events.get("drop")({});
            }
        }
    }

    // set the future state
    setFuture(points) {
        if (!Array.isArray(points)) {
            return;
        }
        this.future = points.concat();
    }

    // get the position
    getPosition(gap) {
        const result = { "x": this.x, "y": this.y, "dy": this.dy };
        if (isNaN(gap) || gap == 0) {
            return result;
        }

        // coordinate calculation
        result.x += this.dx * gap;
        result.y += this.dy * gap + this.owner.half * gap * (gap - 1);
        result.dy += this.owner.accel * gap;
        return result;
    }

}

// Ball collection class
class BallCollection {
    #top;
    #bottom;
    #stock = [];

    // constructor
    constructor(view) {
        this.#top = view.y;
        this.#bottom = view.y + view.height;
        this.top = this.#top + 20;
        this.bottom = this.#bottom;
        this.ground = this.#bottom + 40;

        // initial values
        this.events = new Map();
        this.count = 0;
        this.accel = 0;
        this.stage = 0;
        this.scale = 1;
    }

    // setup to start
    setupStart(count) {
        this.accel = 0.2;
        this.half = this.accel / 2;
        this.#setSize(1);
        this.count = count;
        while (this.#stock.length < this.count) {
            this.#stock.push(new BallAnimator(this));
        }
        this.#setBalls(0, this.count);
        this.#setDirections();
    }

    // setup to restart
    setupRestart() {
        this.#setBalls(0, this.count);
        this.#setDirections();
    }

    // setup for speed-up
    setupSpeed(count) {
        this.accel += 0.2;
        this.half = this.accel / 2;
        this.#setSize(this.stage + 1);
        this.count = count;

        // only waiting balls are reset
        const launcher = this.bottom + 20;
        const dy = this.getVelocity(launcher);
        for (let i = 0; i < this.count; i++) {
            const ball = this.#stock[i];
            if (0 < ball.future.length && this.ground < ball.y) {
                ball.y = launcher;
                ball.dy = dy;
            }
        }
        this.#setDirections();
    }

    // add a ball
    addBall() {
        this.#setSize(this.stage + 1);

        // add if missing
        const before = this.count;
        this.count++;
        if (this.#stock.length < this.count) {
            this.#stock.push(new BallAnimator(this));
        }
        this.#setBalls(before, 1);
        this.#setDirections();
    }

    // get initial velocity
    getVelocity(y) {
        const height = y - this.top;
        if (height < 0) {
            return 0;
        }
        const time = Math.sqrt(height / this.half);
        return this.half * (1 - 2 * time);
    }

    // draw the current state
    drawCurrent(core) {
        core.drawProps(this.#stock.slice(0, this.count));
    }

    // draw the next state
    drawNext(core) {
        this.#stock.slice(0, this.count).forEach(elem => elem.setNext());
        this.drawCurrent(core);
    }

    // get the first ball
    getFirstBall() {
        const balls = this.#stock.slice(0, this.count).filter(elem => elem.future.length == 0);
        const first = balls.sort((a, b) => a.dy - b.dy).pop();
        return first;
    }

    // set the drawing size
    #setSize(stage) {
        this.stage = stage;
        this.scale = (Math.ceil(this.stage / 3) + 2) / 4;
        this.top = this.#top * this.scale + 20;
        this.bottom = this.#bottom * Math.max(1, this.scale);
    }

    // set the balls
    #setBalls(start, count) {
        const launcher = this.bottom + 20;
        const dx = -1 / this.scale;
        const dy = this.getVelocity(launcher);
        let dir = 1;
        for (let i = 0; i < count; i++) {
            this.#stock[start + i].setup({ "x": 30 * dir, "y": launcher, "dx": dx * dir, "dy": dy, "delay": 48 * i });
            dir = -dir;
        }
    }

    // set the direction of throw
    #setDirections() {
        const balls = this.#stock.slice(0, this.count);
        if (this.count % 2 == 1) {
            // odd number
            balls.forEach(elem => elem.direction = "cross");
            return;
        }

        // even number
        const right = balls.filter(elem => elem.dx < 0);
        const left = balls.filter(elem => 0 <= elem.dx);
        right.forEach(elem => elem.direction = "right");
        left.forEach(elem => elem.direction = "left");
        const diff = (right.length - left.length) / 2;
        if (0 < diff) {
            right.slice(0, diff).forEach(elem => elem.direction = "left");
        } else if (diff < 0) {
            left.slice(0, -diff).forEach(elem => elem.direction = "right");
        }
    }

}

// Arm animator class
class ArmAnimator {
    #ellipse;
    #offset = new DOMPoint(0, 10);

    // constructor
    constructor(ellipse, hand, elbow) {
        this.#ellipse = ellipse;
        this.home = [ hand, elbow ];

        // initialize data
        this.direction = "";
        this.current = this.home;
        this.future = [];
        this.another = null;
        this.lock = null;
    }

    // setup the properties
    setup() {
        this.current = this.home;
        this.future = [];
        this.lock = null;
    }

    // set the next state
    setNext() {
        if (this.future.length == 0) {
            return;
        }

        // if there are future settings
        const point = this.future.shift();
        const hand = new DOMPoint(point.x + this.#offset.x, point.y + this.#offset.y);
        this.current = [ hand, this.#getElbow(hand) ];
        if (0 < this.future.length) {
            return;
        }

        // change the orbit of the ball
        const ball = this.lock;
        let home = this.another.home;
        if (ball.direction == this.direction) {
            home = this.home;
        }
        ball.dx = (home[0].x - ball.x) * Math.max(1, ball.owner.scale / 2) / 100;
        ball.dy = ball.owner.getVelocity(ball.y);
        this.lock = null;
    }

    // set the future state
    setFuture(points) {
        if (!Array.isArray(points)) {
            return;
        }
        this.future = points.concat();
    }

    // get elbow coordinates
    #getElbow(hand) {
        const point = this.#ellipse.ownerSVGElement.createSVGPoint();
        point.x = hand.x;
        point.y = hand.y;
        if (this.#ellipse.isPointInFill(point)) {
            // if within the ellipse
            return point;
        }

        // ellipse (x - cx)^2 / rx^2 + (y - cy)^2 / ry^2 = 1
        const cx = this.#ellipse.cx.baseVal.value;
        const cy = this.#ellipse.cy.baseVal.value;
        const rx = this.#ellipse.rx.baseVal.value;
        const ry = this.#ellipse.ry.baseVal.value;

        // translate the center of the ellipse to the origin ... x^2 / rx^2 + y^2 / ry^2 = 1
        const hx = hand.x - cx;
        const hy = hand.y - cy;
        const elbow = new DOMPoint(0, 0);
        if (hx == 0) {
            // hx = 0, the intersection is (0, +-ry)
            elbow.x = 0;
            elbow.y = Math.sign(hy) * ry;
        } else {
            // hx != 0, then x^2 = hx^2 rx^2 ry^2 / (hx^2 ry^2 + hy^2 rx^2), y = hy/hx x
            elbow.x = hx * rx * ry / Math.sqrt(hx * hx * ry * ry + hy * hy * rx * rx);
            elbow.y = hy / hx * elbow.x;
        }

        // move back to the original
        elbow.x += cx;
        elbow.y += cy;
        return elbow;
    }

}

// Arm collection class
class ArmCollection {
    #right;
    #left;
    #prev = null;
    #orbits = [];

    // constructor
    constructor(right, left) {
        this.#right = right;
        this.#left = left;
        this.#right.direction = "right";
        this.#left.direction = "left";
        this.#right.another = left;
        this.#left.another = right;

        // calculate coordinates of the ellipse
        for (let i = 0; i < 5; i++) {
            const div = (5 - i) * 4;
            const delta = Math.PI / div;
            const orbit = [];
            for (let j = 0; j <= div; j++) {
                const x = 0.5 * Math.cos(delta * j);
                const y = 0.35 * Math.sin(delta * j);
                orbit.push(new DOMPoint(0.5 - x, y));
            }
            this.#orbits.push(orbit);
        }
    }

    // setup the properties
    setup() {
        this.#right.setup();
        this.#left.setup();
    }

    // draw the current state
    drawCurrent(core) {
        core.drawArms([ this.#right.current, this.#left.current ]);
    }

    // draw the next state
    drawNext(core) {
        this.#right.setNext();
        this.#left.setNext();
        this.drawCurrent(core);
    }

    // set the arm state
    setArm(ball, count) {
        // choose the arm
        let factor = 1;
        let arm;
        if (ball.x < 0) {
            arm = this.#right;
        } else {
            arm = this.#left;
        }
        if (0 < arm.future.length) {
            factor = 2;
            arm = arm.another;
            if (0 < arm.future.length) {
                return;
            }
        }
        let alter = 0;
        if (arm != this.#prev) {
            alter = 1;
            this.#prev = arm;
        }
        arm.lock = ball;
        const delay = Math.max(1, 6 - count);

        // move to the ball position
        const point = ball.getPosition(delay);
        const hand = arm.current[0];
        const dx = (point.x - hand.x) / delay;
        const dy = (point.y - hand.y) / delay;
        const first = [];
        let x = hand.x;
        let y = hand.y;
        for (let i = 0; i < delay; i++) {
            x += dx;
            y += dy;
            first.push(new DOMPoint(x, y));
        }

        // move with the ball
        const home = arm.another.home[0];
        const mx = (home.x - point.x) / 3;
        const my = Math.abs(mx);
        const orbit = this.#orbits[5 - delay];
        const follow = orbit.map(elem => new DOMPoint(x + mx * elem.x, y + my * elem.y, factor, alter));

        // set the future state
        arm.setFuture(first.concat(follow));
        ball.setFuture(new Array(first.length).fill({}).concat(follow));
    }

}

// Motion creator class
class MotionCreator {

    // constructor
    constructor(view, right, left) {
        this.balls = new BallCollection(view);
        this.arms = new ArmCollection(right, left);
    }

    // setup the properties
    setup(count, follow) {
        if (isNaN(count)) {
            this.balls.setupRestart();
        } else {
            if (follow) {
                this.balls.setupSpeed(count);
            } else {
                this.balls.setupStart(count);
            }
        }
        this.arms.setup();
    }

    // add a ball
    addBall() {
        this.balls.addBall();
    }

    // get screen scale
    getScale() {
        return Math.max(1, Math.min(this.balls.scale, 8.5));
    }

    // draw the current state
    drawCurrent(core) {
        this.balls.drawCurrent(core);
        this.arms.drawCurrent(core);
    }

    // draw the next state
    drawNext(core) {
        this.balls.drawNext(core);
        this.arms.drawNext(core);
    }

    // move the arm
    moveArm() {
        const ball = this.balls.getFirstBall();
        if (ball == null) {
            return;
        }
        this.arms.setArm(ball, this.balls.count);
    }

    // set an event
    setEvent(name, callback) {
        if (0 < name.length && typeof callback == "function") {
            this.balls.events.set(name, callback);
        }
    }

}

