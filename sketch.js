let sliderManager;
let displayManager;
let grid;
let totalStepCount;
let aliveCount;
let predatorCount;
let fittest;
let fittestSize;
let fittestPredator;
let fittestPredatorSize;
let canvasContainerWidth;
let canvas;
let cellSize;
const gridSize = 42;

class SliderManager {
  constructor() {
    this.sliders = {};
    this.displays = {};
    this.divisors = {};
    this.sliderContainer = select('#sliders');
  }

  addSlider(name, minValue, maxValue, defaultValue, divisor) {
    let sliderDiv = createDiv().parent(this.sliderContainer);
    let label = createElement('label', name);
    label.parent(sliderDiv);
    this.displays[name] = label;
    let slider = createSlider(minValue, maxValue, defaultValue);
    slider.parent(sliderDiv);
    slider.style('width', '100%');
    this.sliders[name] = slider;
    this.divisors[name] = divisor;
  }

  getValue(name) {
    return this.sliders[name].value() / this.divisors[name];
  }

  updateDisplays() {
    for (const [key, value] of Object.entries(this.displays)) {
      value.html(key + ": " + this.sliders[key].value() / this.divisors[key]);
    }
  }
}

class DisplayManager {
  constructor() {
    this.displays = {};
    this.values = {};
    this.container = select('#displays');
  }

  addDisplay(name, value) {
    let div = createDiv().parent(this.container);
    let display = createSpan(name + ": " + value);
    display.parent(div);
    this.displays[name] = display;
    this.values[name] = value;
  }

  getValue(name) {
    return this.values[name];
  }

  setValue(name, value) {
    return this.values[name] = value;
  }

  updateDisplays() {
    for (const [key, value] of Object.entries(this.displays)) {
      value.html(key + ": " + this.values[key]);
    }
  }
}

function setup() {
  canvasContainerWidth = select('#canvas-container').width;
  cellSize = canvasContainerWidth / gridSize;
  canvas = createCanvas(canvasContainerWidth, canvasContainerWidth);
  canvas.parent('canvas-container');
  sliderManager = new SliderManager();
  sliderManager.addSlider("Simulation speed (FPS)", 1, 60, 60, 1);
  sliderManager.addSlider("Mutation rate", 1, 100, 5, 100);
  sliderManager.addSlider("Plant growth rate", 1, 100, 50, 100);
  displayManager = new DisplayManager();
  displayManager.addDisplay("Total steps", 0);
  displayManager.addDisplay("Alive count", 0);
  displayManager.addDisplay("Fittest size", 0);
  displayManager.addDisplay("Predator count", 0);
  displayManager.addDisplay("Fittest predator size", 0);
  grid = new Grid(gridSize, gridSize);
  grid.initialize();
}

function draw() {
  background(220);
  frameRate(sliderManager.getValue("Simulation speed (FPS)"));
  sliderManager.updateDisplays();
  displayManager.updateDisplays();
  grid.update();
  grid.display();
}

function windowResized() {
  canvasContainerWidth = select('#canvas-container').width;
  resizeCanvas(canvasContainerWidth, canvasContainerWidth);
  cellSize = canvasContainerWidth / gridSize;
}

class Grid {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.cells = [];
  }

  initialize() {
    totalStepCount = 0;
    for (let i = 0; i < this.rows; i++) {
      this.cells[i] = [];
      for (let j = 0; j < this.cols; j++) {
        if (i === 0 || j === 0 || i === this.rows - 1 || j === this.cols - 1) {
          this.cells[i][j] = new Wall(i, j);
        } else {
          let centerDist = Math.sqrt(Math.pow(i - this.rows / 2, 2) + Math.pow(j - this.cols / 2, 2));
          let centerFactor = centerDist / Math.sqrt(Math.pow(this.rows / 2, 2) + Math.pow(this.cols / 2, 2));
          let p = Math.abs(0.5 - centerFactor);
          // p = Math.pow(p, 1.5);
          if (random(1) < p) {
            this.cells[i][j] = new Wall(i, j);
          } else if (random(1) > 0.95) {
            this.cells[i][j] = new Organism(i, j);
          } else if (random(1) > 0.98) {
            this.cells[i][j] = new Predator(i, j);
          } else {
            this.cells[i][j] = null;
          }
        }
      }
    }
    for (let i = 1; i < this.rows - 1; i++) {
      for (let j = 1; j < this.cols - 1; j++) {
        if (this.cells[i][j] === null && random(1) > 0.7) {
          this.cells[i][j] = new Plant(i, j);
        }
      }
    }
  }

  update() {
    totalStepCount++;
    // Randomly add plants
    if (random() < sliderManager.getValue("Plant growth rate")) {
      const x = floor(random(this.rows));
      const y = floor(random(this.cols));
      if (this.cells[x][y] === null) {
        this.cells[x][y] = new Plant(x, y);
      }
    }
    // Organism activity
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j] instanceof Organism || this.cells[i][j] instanceof Predator) {
          this.cells[i][j].perceive(this);
        } else if (this.cells[i][j] instanceof Egg || this.cells[i][j] instanceof PredatorEgg) {
          this.cells[i][j].grow(this);
        }
      }
    }
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j] instanceof Organism && !this.cells[i][j].acted) {
          this.cells[i][j].act(this);
        } else if (this.cells[i][j] instanceof Predator && !this.cells[i][j].acted) {
          this.cells[i][j].act(this);
        }
      }
    }
  }

  display() {
    fittestSize = -Infinity;
    fittestPredatorSize = -Infinity;
    aliveCount = 0;
    predatorCount = 0;
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j]) {
          this.cells[i][j].display();
          if (this.cells[i][j] instanceof Organism) {
            aliveCount++;
            if (this.cells[i][j].size > fittestSize) {
              fittestSize = this.cells[i][j].size
              fittest = this.cells[i][j]
            }
          }
          if (this.cells[i][j] instanceof Predator) {
            predatorCount++;
            if (this.cells[i][j].size > fittestPredatorSize) {
              fittestPredatorSize = this.cells[i][j].size
              fittestPredator = this.cells[i][j]
            }
          }
        }
      }
    }
    if (aliveCount == 0) {
      this.initialize();
    }
    displayManager.setValue("Total steps", totalStepCount);
    displayManager.setValue("Alive count", aliveCount);
    displayManager.setValue("Fittest size", fittestSize + " (generation: " + fittest.generation + ", NN params: "+ fittest.brain.getParams() +")");
    displayManager.setValue("Predator count", predatorCount);
    displayManager.setValue("Fittest predator size", fittestPredatorSize + " (generation: " + fittestPredator.generation + ", NN params: "+ fittestPredator.brain.getParams() +")");
  }
}

function turnVector(vector, times) {
  if (times > 0) {
    return turnVector(createVector(vector.y, -vector.x), times - 1);
  } else {
    return vector;
  }
}

class CellEntity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    fill(this.getColor());
    noStroke();
    rect(this.x * cellSize, this.y * cellSize, cellSize, cellSize);
  }
  
  getColor() {
    return [255, 255, 0];
  }
}

class Organism extends CellEntity {
  constructor(x, y) {
    super(x, y);
    this.energy = 500;
    this.size = 500;
    this.heading = createVector(1, 0);
    this.acted = false;
    this.brain = new NN(17, 3, 1, 2);
    this.decisions = [];
    this.r = 0;
    this.g = 0;
    this.b = 255;
    this.generation = 0;
  }

  getColorAndDistance(grid, direction, maxDistance) {
    let dx = direction.x;
    let dy = direction.y;
    let posX = this.x;
    let posY = this.y;
    let distance = 1;
    let r, g, b, d;
    while (distance < maxDistance) {
      posX += dx;
      posY += dy;
      let cell = grid.cells[posX][posY];
      if (cell !== null) {
        [r, g, b] = cell.getColor();
        r = r / 255;
        g = g / 255;
        b = b / 255;
        d = 1 / distance;
        return {r, g, b, d};
      }
      distance++;
    }
    r = -1;
    g = -1;
    b = -1;
    d = -1;
    return {r, g, b, d};
  }

  perceive(grid) {
    this.acted = false;
    let vision = [];
    const directions = [
      this.heading,
      turnVector(this.heading, 1),
      turnVector(this.heading, 2),
      turnVector(this.heading, 3)
    ];
    for (let dir of directions) {
      let info = this.getColorAndDistance(grid, dir, 10);
      vision.push(info.r, info.g, info.b, info.d);
    }
    vision.push(Math.random());
    this.decisions = this.brain.predict(vision);
  }
  
  act(grid) {
    this.acted = true;
    if (this.decisions[0] > 0.5) {
      this.heading = turnVector(this.heading, 1);
    }
    if (this.decisions[1] > 0.5) {
      this.heading = turnVector(this.heading, 3);
    }
    let newX = this.x;
    let newY = this.y;
    let oldX = this.x;
    let oldY = this.y;
    if (this.decisions[2] > 0.5) {
      newX += this.heading.x;
      newY += this.heading.y;
      this.energy -= 1;
    }
    
    if (newX >= 0 && newX < grid.rows && newY >= 0 && newY < grid.cols) {
      if (grid.cells[newX][newY] === null) {
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      } else if (grid.cells[newX][newY] instanceof Plant) {
        this.energy += 400;
        this.size += 400;
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      } else if (grid.cells[newX][newY] instanceof DeadOrganism) {
        this.energy += 200;
        this.size += 200;
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      }
      if (this.energy > 1000) {
        this.energy = this.energy - 500;
        let newR = Math.min(Math.max((this.r + fittest.r) / 2 + randomGaussian(0, 20), 0), 150);
        let newG = Math.min(Math.max((this.g + fittest.g) / 2 + randomGaussian(0, 20), 0), 100);
        let newB = Math.min(Math.max((this.b + fittest.b) / 2 + randomGaussian(0, 20), 150), 255);
        let mutationRate = sliderManager.getValue("Mutation rate");
        let newGeneration = Math.max(this.generation, fittest.generation) + 1;
        let egg = new Egg(oldX, oldY, this.heading, this.brain.getMutation(mutationRate, fittest.brain), newR, newG, newB, newGeneration);
        grid.cells[oldX][oldY] = egg;
      }
    }

    this.energy--;

    if (this.energy < 0) {
      grid.cells[this.x][this.y] = new DeadOrganism(this.x, this.y);
    }
  }
  
  getColor() {
    return [this.r, this.g, this.b];
  }

  display() {
    fill(this.getColor());
    noStroke();
    circle((this.x + 0.5) * cellSize, (this.y + 0.5) * cellSize, cellSize);
    fill([255, 255, 255]);
    noStroke();
    circle((this.x + this.heading.x * 0.2 + 0.5) * cellSize, (this.y + this.heading.y * 0.25 + 0.5) * cellSize, cellSize * 0.6);
    fill([0, 0, 0]);
    noStroke();
    circle((this.x + this.heading.x * 0.25 + 0.5) * cellSize, (this.y + this.heading.y * 0.3 + 0.5) * cellSize, cellSize * 0.4);
  }
}

class Egg extends CellEntity {
  constructor(x, y, heading, brain, r, g, b, generation) {
    super(x, y);
    this.heading = heading;
    this.brain = brain;
    this.r = r;
    this.g = g;
    this.b = b;
    this.generation = generation;
    this.age = 0;
  }

  grow(grid) {
    this.age++;
    if (this.age > 150) {
      let organism = new Organism(this.x, this.y);
      organism.heading = this.heading;
      organism.brain = this.brain;
      organism.r = this.r;
      organism.g = this.g;
      organism.b = this.b;
      organism.generation = this.generation;
      grid.cells[this.x][this.y] = organism;
    }
  }

  getColor() {
    return [Math.floor(0.5 * this.r + 127.5), Math.floor(0.5 * this.g + 127.5), Math.floor(0.5 * this.b + 127.5)];
  }

  display() {
    fill(this.getColor());
    noStroke();
    circle((this.x + 0.5) * cellSize, (this.y + 0.5) * cellSize, cellSize);
  }
}

class Predator extends CellEntity {
  constructor(x, y) {
    super(x, y);
    this.energy = 1000;
    this.size = 1000;
    this.heading = createVector(1, 0);
    this.acted = false;
    this.brain = new NN(17, 3, 1, 2);
    this.decisions = [];
    this.r = 255;
    this.g = 0;
    this.b = 0;
    this.generation = 0;
  }
  
  getColorAndDistance(grid, direction, maxDistance) {
    let dx = direction.x;
    let dy = direction.y;
    let posX = this.x;
    let posY = this.y;
    let distance = 1;
    let r, g, b, d;
    while (distance < maxDistance) {
      posX += dx;
      posY += dy;
      let cell = grid.cells[posX][posY];
      if (cell !== null) {
        [r, g, b] = cell.getColor();
        r = r / 255;
        g = g / 255;
        b = b / 255;
        d = 1 / distance;
        return {r, g, b, d};
      }
      distance++;
    }
    r = -1;
    g = -1;
    b = -1;
    d = -1;
    return {r, g, b, d};
  }

  perceive(grid) {
    this.acted = false;
    let vision = [];
    const directions = [
      this.heading,
      turnVector(this.heading, 1),
      turnVector(this.heading, 2),
      turnVector(this.heading, 3)
    ];
    for (let dir of directions) {
      let info = this.getColorAndDistance(grid, dir, 10);
      vision.push(info.r, info.g, info.b, info.d);
    }
    vision.push(Math.random());
    this.decisions = this.brain.predict(vision);
  }
  
  act(grid) {
    this.acted = true;
    if (this.decisions[0] > 0.5) {
      this.heading = turnVector(this.heading, 1);
    }
    if (this.decisions[1] > 0.5) {
      this.heading = turnVector(this.heading, 3);
    }
    let newX = this.x;
    let newY = this.y;
    let oldX = this.x;
    let oldY = this.y;
    if (this.decisions[2] > 0.5) {
      newX += this.heading.x;
      newY += this.heading.y;
      this.energy -= 1;
    }
    
    if (newX >= 0 && newX < grid.rows && newY >= 0 && newY < grid.cols) {
      if (grid.cells[newX][newY] === null) {
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      } else if (grid.cells[newX][newY] instanceof Organism) {
        this.energy += 450;
        this.size += 450;
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      } else if (grid.cells[newX][newY] instanceof Egg) {
        this.energy += 250;
        this.size += 250;
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      } else if (grid.cells[newX][newY] instanceof DeadOrganism) {
        this.energy += 100;
        this.size += 100;
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      } else if (grid.cells[newX][newY] instanceof Plant) {
        this.energy -= 10;
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      }
      if (this.energy > 2000) {
        this.energy = this.energy - 1000;
        let newR = Math.min(Math.max((this.r + fittestPredator.r) / 2 + randomGaussian(0, 20), 150), 255);
        let newG = Math.min(Math.max((this.g + fittestPredator.g) / 2 + randomGaussian(0, 20), 0), 100);
        let newB = Math.min(Math.max((this.b + fittestPredator.b) / 2 + randomGaussian(0, 20), 0), 150);
        let mutationRate = sliderManager.getValue("Mutation rate");
        let newGeneration = Math.max(this.generation, fittestPredator.generation) + 1;
        let egg = new PredatorEgg(oldX, oldY, this.heading, this.brain.getMutation(mutationRate, fittestPredator.brain), newR, newG, newB, newGeneration);
        grid.cells[oldX][oldY] = egg;
      }
    }

    this.energy--;

    if (this.energy < 0) {
      grid.cells[this.x][this.y] = new DeadOrganism(this.x, this.y);
    }
  }
  
  getColor() {
    return [this.r, this.g, this.b];
  }

  display() {
    fill(this.getColor());
    noStroke();
    rect(this.x * cellSize, this.y * cellSize, cellSize, cellSize);
    fill([255, 255, 255]);
    noStroke();
    circle((this.x + this.heading.x * 0.2 + 0.5) * cellSize, (this.y + this.heading.y * 0.25 + 0.5) * cellSize, cellSize * 0.6);
    fill([0, 0, 0]);
    noStroke();
    circle((this.x + this.heading.x * 0.25 + 0.5) * cellSize, (this.y + this.heading.y * 0.3 + 0.5) * cellSize, cellSize * 0.4);
  }
}

class PredatorEgg extends CellEntity {
  constructor(x, y, heading, brain, r, g, b, generation) {
    super(x, y);
    this.heading = heading;
    this.brain = brain;
    this.r = r;
    this.g = g;
    this.b = b;
    this.generation = generation;
    this.age = 0;
  }

  grow(grid) {
    this.age++;
    if (this.age > 300) {
      let organism = new Predator(this.x, this.y);
      organism.heading = this.heading;
      organism.brain = this.brain;
      organism.r = this.r;
      organism.g = this.g;
      organism.b = this.b;
      organism.generation = this.generation;
      grid.cells[this.x][this.y] = organism;
    }
  }

  getColor() {
    return [Math.floor(0.5 * this.r + 127.5), Math.floor(0.5 * this.g + 127.5), Math.floor(0.5 * this.b + 127.5)];
  }

  display() {
    fill(this.getColor());
    noStroke();
    circle((this.x + 0.5) * cellSize, (this.y + 0.5) * cellSize, cellSize);
  }
}

class Wall extends CellEntity {
  getColor() {
    return [0, 0, 0];
  }
}

class Plant extends CellEntity {
  getColor() {
    return [0, 255, 0];
  }
}

class DeadOrganism extends CellEntity {
  getColor() {
    return [50, 150, 80];
  }
}
