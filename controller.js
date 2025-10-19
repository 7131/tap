// Controller class
class Controller {
    #button;
    #level;
    #score;
    #highest;

    // operation
    #core;
    #deco;
    #creator;

    // state
    #remain = 3;
    #now = 0;
    #max = 0;
    #id = 0;
    #begin = 0;
    #lap = 0;
    #count = 0;

    // constructor
    constructor() {
        window.addEventListener("load", this.#initialize.bind(this));
    }

    // initialize the page
    #initialize(e) {
        this.#level = document.getElementById("level");
        this.#score = document.getElementById("score");
        this.#highest = document.getElementById("highest");
        this.#button = document.getElementById("play");
        this.#core = new jmotion.Core("#board");
        this.#deco = new Decorator(this.#core.svg);
        this.#creator = this.#getCreator(this.#core.svg.viewBox.baseVal);
        this.#setShapes();
        this.#creator.drawCurrent(this.#core);

        // events
        document.addEventListener("click", this.#tap.bind(this));
        document.addEventListener("contextmenu", this.#tap.bind(this));
        this.#button.addEventListener("click", this.#play.bind(this));
        this.#deco.setEvents(this.#start.bind(this), this.#restart.bind(this));
        this.#creator.setEvent("drop", this.#drop.bind(this));
        this.#creator.setEvent("score", this.#show.bind(this));

        // get the high score
        try {
            const data = JSON.parse(window.localStorage.getItem("tap"));
            this.#max = parseInt(data.highest, 10);
        } catch {
        }
        if (isNaN(this.#max)) {
            this.#max = 0;
        }
        this.#highest.textContent = this.#max.toLocaleString();
    }

    // "Play" button process
    #play(e) {
        document.body.classList.add("running");
        this.#button.disabled = true;
        this.#remain = 3;
        this.#now = 0;
        this.#score.textContent = this.#now.toLocaleString();
        this.#creator.setup(1);
        this.#creator.drawCurrent(this.#core);
        this.#deco.setScale(this.#creator.getScale());
        this.#deco.moveCurtain(this.#remain);
    }

    // tap process
    #tap(e) {
        if (this.#id == 0 || e.target == this.#button) {
            return;
        }
        e.preventDefault();
        this.#creator.moveArm();
    }

    // drop process
    #drop(e) {
        clearInterval(this.#id);
        this.#id = 0;
        this.#remain--;
        if (0 < this.#remain) {
            this.#lap = window.performance.now() - this.#begin;
            this.#creator.setup();
            this.#creator.drawCurrent(this.#core);
            this.#deco.moveCurtain(this.#remain);
            return;
        }

        // game over
        this.#deco.moveCurtain(0);
        try {
            const data = { "highest": this.#max };
            window.localStorage.setItem("tap", JSON.stringify(data));
        } catch {
        }
        this.#button.disabled = false;
        document.body.classList.remove("running");
    }

    // show score
    #show(e) {
        this.#now += e.score;
        this.#score.textContent = this.#now.toLocaleString();
        if (this.#max < this.#now) {
            this.#max = this.#now;
            this.#highest.textContent = this.#max.toLocaleString();
        }
    }

    // start the game
    #start() {
        this.#setLevel(1);
        this.#id = setInterval(this.#run.bind(this), 20);
    }

    // restart the game
    #restart() {
        this.#begin = window.performance.now() - this.#lap;
        this.#id = setInterval(this.#run.bind(this), 20);
    }

    // run the game
    #run() {
        this.#creator.drawNext(this.#core);

        // get elapsed time
        const span = window.performance.now() - this.#begin;
        const seconds = Math.min(this.#count, 5) * 5 + 5;
        if (seconds * 1000 < span) {
            const level = this.#count + 1;
            if (5 < level && level % 10 == 5) {
                this.#creator.setup(5, true);
                this.#setLevel(level, "SPEED UP !");
            } else {
                this.#creator.addBall();
                this.#setLevel(level);
            }
        }
    }

    // set the level
    #setLevel(level, message) {
        this.#count = level;
        this.#level.textContent = level.toLocaleString();
        this.#deco.setScale(this.#creator.getScale());
        if (message) {
            this.#deco.showMessage(message, "fuchsia");
        } else {
            this.#deco.showMessage(`LEVEL ${level}`, "green");
        }
        this.#begin = window.performance.now();
    }

    // get a MotionCreator
    #getCreator(view) {
        // arms
        const right = document.getElementById("robot_right_0");
        const left = document.getElementById("robot_left_0");
        const rHand = new DOMPoint(right.x1.baseVal.value, right.y1.baseVal.value);
        const rElbow = new DOMPoint(right.x2.baseVal.value, right.y2.baseVal.value);
        const lHand = new DOMPoint(left.x1.baseVal.value, left.y1.baseVal.value);
        const lElbow = new DOMPoint(left.x2.baseVal.value, left.y2.baseVal.value);

        // orbits
        const rOrbit = document.getElementById("orbit_right_elbow");
        const lOrbit = document.getElementById("orbit_left_elbow");
        const rArm = new ArmAnimator(rOrbit, rHand, rElbow);
        const lArm = new ArmAnimator(lOrbit, lHand, lElbow);
        return new MotionCreator(view, rArm, lArm);
    }

    // set the shapes
    #setShapes() {
        // graphic elements
        const body = document.getElementById("robot_body");
        const ground = document.getElementById("ground");
        const arms = [
            [
                document.getElementById("robot_right_0"),
                document.getElementById("robot_right_1"),
            ],
            [
                document.getElementById("robot_left_0"),
                document.getElementById("robot_left_1"),
            ],
        ];
        const right = document.getElementById("robot_right_hand");
        const left = document.getElementById("robot_left_hand");

        // setting
        this.#core.setBody([ body, ground ]);
        this.#core.setArms(arms);
        this.#core.setHands([ right, left ]);
    }

}

// start the controller
new Controller();

