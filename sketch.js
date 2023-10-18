let sliderManager;
let checkboxManager;
let displayManager;
let grid;
let totalStepCount;
let aliveCount;
let plantCount;
let fittest;
let fittestScore;
let canvasContainerWidth;
let canvas;
let cellSize;
const gridSize = 29;
const MAX_SMELL = 30;

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

class CheckboxManager {
  constructor() {
    this.checkboxes = {};
    this.checkboxContainer = select('#checkboxes');
  }

  addCheckbox(name, defaultValue) {
    let checkboxDiv = createDiv().parent(this.checkboxContainer);
    let checkbox = createCheckbox(name, defaultValue);
    checkbox.parent(checkboxDiv);
    this.checkboxes[name] = checkbox;
  }

  getValue(name) {
    return this.checkboxes[name].checked();
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
      value.html("<strong>" + key + ":</strong><span style=\"float: right;\">" + this.values[key] + "</span>");
    }
  }
}

function setup() {
  canvasContainerWidth = select('#canvas-container').width;
  cellSize = canvasContainerWidth / gridSize;
  canvas = createCanvas(canvasContainerWidth, canvasContainerWidth);
  canvas.parent('canvas-container');
  sliderManager = new SliderManager();
  sliderManager.addSlider("Simulation speed (FPS)", 1, 60, 40, 1);
  sliderManager.addSlider("Organism speed", 1, 100, 45, 100);
  sliderManager.addSlider("Minotaur speed", 1, 100, 25, 100);
  sliderManager.addSlider("Plant growth rate", 0, 100, 15, 100);
  sliderManager.addSlider("Minimum plant count", 0, 10, 1, 1);
  sliderManager.addSlider("Mutation rate", 1, 100, 5, 100);
  checkboxManager = new CheckboxManager();
  //checkboxManager.addCheckbox("Allow earth placement", false);
  //checkboxManager.addCheckbox("Allow earth removal", false);
  checkboxManager.addCheckbox("Optimal behavior", false);
  displayManager = new DisplayManager();
  displayManager.addDisplay("Total steps", 0);
  displayManager.addDisplay("Plant count", 0);
  displayManager.addDisplay("Alive count", 0);
  displayManager.addDisplay("Best score", 0);
  displayManager.addDisplay("Generation", 0);
  displayManager.addDisplay("Params", 0);
  grid = new Grid(gridSize, gridSize);
  grid.initialize();
}

function draw() {
  background([220, 220, 240]);
  frameRate(sliderManager.getValue("Simulation speed (FPS)"));
  sliderManager.updateDisplays();
  displayManager.updateDisplays();
  grid.update();
  grid.display();
}

function mouseClicked(){
  let i = Math.floor(mouseX / cellSize);
  let j = Math.floor(mouseY / cellSize);
  if (i > 0 && j > 0 && i < grid.rows - 1 && j < grid.cols - 1) {
    if (grid.cells[i][j] instanceof Wall) {
      grid.cells[i][j] = new Air(i, j);
    } else {
      grid.cells[i][j] = new Wall(i, j);
    }
  }
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

  getFrontierCells(i, j) {
    const offsets = [
      createVector(2, 0),
      createVector(-2, 0),
      createVector(0, 2),
      createVector(0, -2),
    ];
    let frontiers = []
    for (const offset of offsets) {
      let x = i + offset.x;
      let y = j + offset.y;
      if (x > 0 && y > 0 && x < this.rows - 1 && y < this.cols - 1) {
        if (this.cells[x][y] instanceof Wall) {
          frontiers.push(createVector(x, y));
        }
      }
    }
    return frontiers;
  }

  getBetweenCells(i, j) {
    const offsets = [
      createVector(1, 0),
      createVector(-1, 0),
      createVector(0, 1),
      createVector(0, -1),
    ];
    let betweens = []
    for (const offset of offsets) {
      let x = i + 2 * offset.x;
      let y = j + 2 * offset.y;
      if (x > 0 && y > 0 && x < this.rows - 1 && y < this.cols - 1) {
        if (this.cells[x][y] === null) {
          betweens.push(createVector(i + offset.x, j + offset.y));
        }
      }
    }
    return betweens;
  }

  initialize() {
    totalStepCount = 0;
    for (let i = 0; i < this.rows; i++) {
      this.cells[i] = [];
      for (let j = 0; j < this.cols; j++) {
        this.cells[i][j] = new Wall(i, j);
        /*if (i === 0 || j === 0 || i === this.rows - 1 || j === this.cols - 1) {
          this.cells[i][j] = new Wall(i, j);
        } else {
          this.cells[i][j] = null;
        } else {
          let centerDist = Math.sqrt(Math.pow(i - this.rows / 2, 2) + Math.pow(j - this.cols / 2, 2));
          let centerFactor = centerDist / Math.sqrt(Math.pow(this.rows / 2, 2) + Math.pow(this.cols / 2, 2));
          let p = Math.abs(0.5 - centerFactor);
          p = 0; // Math.pow(p, 2);
          if (random(1) < p) {
            this.cells[i][j] = new Wall(i, j);
          } else if (random(1) > 0.95) {
            this.cells[i][j] = new Organism(i, j);
          } else if (random(1) > 0.7) {
            this.cells[i][j] = new Plant(i, j);
          } else {
            this.cells[i][j] = new Air(i, j);
          }
        }*/
      }
    }
    const centerX = 1 + 2 * Math.floor(gridSize/4);
    const centerY = centerX;
    this.cells[centerX][centerY] = null;
    /*let frontiers = this.getFrontierCells(1, 1);
    
    const merge = (a, b, predicate = (a, b) => a === b) => {
      const c = [...a];
      b.forEach((bItem) => (c.some((cItem) => predicate(bItem, cItem)) ? null : c.push(bItem)))
      return c;
    }

    for (let i = 0; i < 31; i++) {
    //while (frontiers.length > 0) {
      let frontierIndex = Math.floor(Math.random() * frontiers.length);
      let frontier = frontiers[frontierIndex];
      this.cells[frontier.x][frontier.y] = null;
      let betweens = this.getBetweenCells(frontier.x, frontier.y);
      let between = betweens[Math.floor(Math.random() * betweens.length)];
      this.cells[between.x][between.y] = null;
      frontiers = frontiers.splice(frontierIndex, 1);
      frontiers = merge(frontiers, this.getFrontierCells(frontier.x, frontier.y));
      console.log(frontiers);
    }*/
    while (true) {
      let frontiers = [];
      for (let i = 1; i < this.rows - 1; i+=2) {
        for (let j = 1; j < this.cols - 1; j+=2) {
          if (this.cells[i][j] instanceof Wall) {
            let betweens = this.getBetweenCells(i, j);
            if (betweens.length > 0) {
              frontiers.push(createVector(i, j));
            }
          }
        }
      }
      if (frontiers.length == 0) {
        break;
      }
      let frontier = frontiers[Math.floor(Math.random() * frontiers.length)];
      this.cells[frontier.x][frontier.y] = null;
      let betweens = this.getBetweenCells(frontier.x, frontier.y);
      let between = betweens[Math.floor(Math.random() * betweens.length)];
      this.cells[between.x][between.y] = null;
      while (random(1) < 0.5) {
        let between = betweens[Math.floor(Math.random() * betweens.length)];
        this.cells[between.x][between.y] = null;
      }
    }

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j] === null) {
          if (random(1) > 0.9) {
            this.cells[i][j] = new Organism(i, j);
          } else if (random(1) > 0.5) {
            this.cells[i][j] = new Plant(i, j);
          } else {
            this.cells[i][j] = new Air(i, j);
          }
        }
      }
    }

    this.cells[centerX][centerY] = new Minotaur(centerX, centerY);
  }

  update() {
    totalStepCount++;
    // Randomly add plants
    if (random() < sliderManager.getValue("Plant growth rate") || plantCount < sliderManager.getValue("Minimum plant count")) {
      let x = floor(random(this.rows));
      let y = floor(random(this.cols));
      for (let i = 0; i < 42 && ! (this.cells[x][y] instanceof Air); i++) {
        x = floor(random(this.rows));
        y = floor(random(this.cols));
      }
      if (this.cells[x][y] instanceof Air) {
        this.cells[x][y] = new Plant(x, y);
      }
    }
    // Air activity
    const directions = [
      createVector(1, 0),
      createVector(-1, 0),
      createVector(0, 1),
      createVector(0, -1),
    ];
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j] instanceof Air) {
          this.cells[i][j].newPlantSmell = Math.max(this.cells[i][j].newPlantSmell - 1, 0);
          this.cells[i][j].newOrganismSmell = Math.max(this.cells[i][j].newOrganismSmell - 1, 0);
          this.cells[i][j].newMinotaurSmell = Math.max(this.cells[i][j].newMinotaurSmell - 1, 0);
        }
      }
    }
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j] instanceof Plant) {
          for (const direction of directions) {
            let neighbor = this.cells[i + direction.x][j + direction.y]
            if (neighbor instanceof Air) {
              neighbor.newPlantSmell = MAX_SMELL;
            }
          }
        } else if (this.cells[i][j] instanceof DeadOrganism) {
          for (const direction of directions) {
            let neighbor = this.cells[i + direction.x][j + direction.y]
            if (neighbor instanceof Air) {
              neighbor.newPlantSmell = Math.max(neighbor.newPlantSmell, MAX_SMELL / 2);
            }
          }
        } else if (this.cells[i][j] instanceof Organism) {
          for (const direction of directions) {
            let neighbor = this.cells[i + direction.x][j + direction.y]
            if (neighbor instanceof Air) {
              neighbor.newOrganismSmell = MAX_SMELL;
            }
          }
        } else if (this.cells[i][j] instanceof Egg) {
          for (const direction of directions) {
            let neighbor = this.cells[i + direction.x][j + direction.y]
            if (neighbor instanceof Air) {
              neighbor.newOrganismSmell = Math.max(neighbor.newOrganismSmell, MAX_SMELL / 2);
            }
          }
        } else if (this.cells[i][j] instanceof Minotaur) {
          for (const direction of directions) {
            let neighbor = this.cells[i + direction.x][j + direction.y]
            if (neighbor instanceof Air) {
              neighbor.newMinotaurSmell = MAX_SMELL;
            }
          }
        } else if (this.cells[i][j] instanceof Air) {
          for (const direction of directions) {
            let neighbor = this.cells[i + direction.x][j + direction.y]
            if (neighbor instanceof Air) {
              neighbor.newPlantSmell = Math.max(this.cells[i][j].plantSmell - 1, neighbor.newPlantSmell);
              neighbor.newOrganismSmell = Math.max(this.cells[i][j].organismSmell - 1, neighbor.newOrganismSmell);
            }
          }
        }
      }
    }
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j] instanceof Air) {
          this.cells[i][j].plantSmell = this.cells[i][j].newPlantSmell;
          this.cells[i][j].organismSmell = this.cells[i][j].newOrganismSmell;
          this.cells[i][j].minotaurSmell = this.cells[i][j].newMinotaurSmell;
        }
      }
    }
    // Organism activity
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j] instanceof Organism || this.cells[i][j] instanceof Minotaur) {
          this.cells[i][j].perceive(this);
        } else if (this.cells[i][j] instanceof Egg) {
          this.cells[i][j].grow(this);
        }
      }
    }
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if ((this.cells[i][j] instanceof Organism || this.cells[i][j] instanceof Minotaur) && !this.cells[i][j].acted) {
          this.cells[i][j].act(this);
        }
      }
    }
  }

  display() {
    fittestScore = -Infinity;
    aliveCount = 0;
    plantCount = 0;
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j]) {
          this.cells[i][j].display();
          if (this.cells[i][j] instanceof Organism) {
            aliveCount++;
            if (this.cells[i][j].score > fittestScore) {
              fittestScore = this.cells[i][j].score
              fittest = this.cells[i][j]
            }
          } else if (this.cells[i][j] instanceof Plant) {
            plantCount++;
          }
        }
      }
    }
    displayManager.setValue("Total steps", totalStepCount);
    displayManager.setValue("Plant count", plantCount);
    displayManager.setValue("Alive count", aliveCount);
    displayManager.setValue("Best score", fittestScore);
    displayManager.setValue("Generation", fittest.generation);
    displayManager.setValue("Params", fittest.brain.getParams());
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
    this.score = 0;
    this.heading = createVector(1, 0);
    this.acted = false;
    this.brain = new NN(9, 4, 0, 4);
    this.decisions = [];
    this.r = 255;
    this.g = 0;
    this.b = 0;
    this.generation = 0;
    this.moveOffset = createVector(0, 0);
    this.headstart = 0;
  }

  directionalPlantSmell(grid, direction) {
    const neighbor = grid.cells[this.x + direction.x][this.y + direction.y];
    if (neighbor instanceof Plant) {
      return 1;
    }
    if (neighbor instanceof DeadOrganism) {
      return 0.8;
    }
    if (neighbor instanceof Air) {
      return 0.8 * neighbor.plantSmell / MAX_SMELL;
    }
    return -1;
  }

  directionalMinotaurSmell(grid, direction) {
    const neighbor = grid.cells[this.x + direction.x][this.y + direction.y];
    if (neighbor instanceof Minotaur) {
      return 1;
    }
    if (neighbor instanceof Air) {
      return 0.8 * neighbor.minotaurSmell / MAX_SMELL;
    }
    return -1;
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
    for (const direction of directions) {
      vision.push(this.directionalPlantSmell(grid, direction));
    }
    for (const direction of directions) {
      vision.push(this.directionalMinotaurSmell(grid, direction));
    }
    //vision.push(this.energy / 1200);
    vision.push(Math.random());
    if (checkboxManager.getValue("Optimal behavior")) {
      this.decisions = [0, 0, 0, 0];
      let maxIndex = 0;
      for (let i = 1; i <= 3; i++) {
        if (vision[i] > vision[maxIndex]) {
          maxIndex = i;
        }
      }
      let maxMinotaurIndex = 4;
      let minMinotaurIndex = 4;
      for (let i = 5; i <= 7; i++) {
        if (vision[i] > vision[maxMinotaurIndex]) {
          maxMinotaurIndex = i;
        }
        if ((vision[i] < vision[minMinotaurIndex] && vision[i] >= 0) || vision[minMinotaurIndex] < 0) {
          minMinotaurIndex = i;
        }
      }
      if (vision[maxMinotaurIndex] > vision[maxIndex]) {
        this.decisions[minMinotaurIndex - 4] = 1;
      } else {
        this.decisions[maxIndex] = 1;
      }
    } else {
      this.decisions = this.brain.predict(vision);
    }
  }
  
  act(grid) {
    this.acted = true;
    let moveOffsetLength = Math.sqrt(this.moveOffset.x * this.moveOffset.x + this.moveOffset.y * this.moveOffset.y);
    let speed = sliderManager.getValue("Organism speed");
    if (moveOffsetLength > speed) {
      this.moveOffset.x += this.heading.x * speed;
      this.moveOffset.y += this.heading.y * speed;
      this.energy--;
      return;
    }
    if (moveOffsetLength > 0) {
      this.headstart = speed - moveOffsetLength;
    } else {
      this.headstart = 0;
    }
    this.moveOffset = createVector(0, 0);
    // Earth placement
    /*let targetX = this.x + this.heading.x;
    let targetY = this.y + this.heading.y;
    if (this.decisions[3] > 0.5 && checkboxManager.getValue('Allow earth placement')) {
      if (grid.cells[targetX][targetY] instanceof Air) {
        grid.cells[targetX][targetY] = new Earth(targetX, targetY);
        this.energy -= 3;
      }
    } else if (this.decisions[4] > 0.5 && checkboxManager.getValue('Allow earth removal')) {
      if (grid.cells[targetX][targetY] instanceof Earth) {
        grid.cells[targetX][targetY] = new Air(targetX, targetY);
        this.energy -= 3;
      }
    }*/
    // Turn
    let maxIndex = 0;
    for (let i = 1; i <= 3; i++) {
      if (this.decisions[i] > this.decisions[maxIndex]) {
        maxIndex = i;
      }
    }
    this.heading = turnVector(this.heading, maxIndex);
    // Further actions
    let newX = this.x;
    let newY = this.y;
    let oldX = this.x;
    let oldY = this.y;
    if (this.decisions[maxIndex] > 0.5) {
      newX += this.heading.x;
      newY += this.heading.y;
      // this.energy -= speed;
    }
    if (newX >= 0 && newX < grid.rows && newY >= 0 && newY < grid.cols) {
      if (grid.cells[newX][newY] instanceof Air) {
        grid.cells[this.x][this.y] = new Air(this.x, this.y);
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
        this.moveOffset = turnVector(this.heading, 2);
        this.moveOffset.x += this.headstart * this.heading.x;
        this.moveOffset.y += this.headstart * this.heading.y;
      } else if (grid.cells[newX][newY] instanceof Plant) {
        this.energy += 300;
        this.score += 300;
        grid.cells[this.x][this.y] = new Air(this.x, this.y);
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
        this.moveOffset = turnVector(this.heading, 2);
        this.moveOffset.x += this.headstart * this.heading.x;
        this.moveOffset.y += this.headstart * this.heading.y;
      } else if (grid.cells[newX][newY] instanceof DeadOrganism) {
        this.energy += 100;
        this.score += 100;
        grid.cells[this.x][this.y] = new Air(this.x, this.y);
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
        this.moveOffset = turnVector(this.heading, 2);
        this.moveOffset.x += this.headstart * this.heading.x;
        this.moveOffset.y += this.headstart * this.heading.y;
      }
      if (this.energy > 1200) {
        this.energy = this.energy - 500;
        let newR = Math.min(Math.max((this.r + fittest.r) / 2 + randomGaussian(0, 20), 150), 255);
        let newG = Math.min(Math.max((this.g + fittest.g) / 2 + randomGaussian(0, 20), 0), 100);
        let newB = Math.min(Math.max((this.b + fittest.b) / 2 + randomGaussian(0, 20), 0), 150);
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
    rect((this.x + this.moveOffset.x) * cellSize, (this.y + this.moveOffset.y) * cellSize, cellSize, cellSize);
    fill([255, 255, 255]);
    noStroke();
    circle(((this.x + this.moveOffset.x) + this.heading.x * 0.2 + 0.5) * cellSize, ((this.y + this.moveOffset.y) + this.heading.y * 0.25 + 0.5) * cellSize, cellSize * 0.6);
    fill([0, 0, 0]);
    noStroke();
    circle(((this.x + this.moveOffset.x) + this.heading.x * 0.25 + 0.5) * cellSize, ((this.y + this.moveOffset.y) + this.heading.y * 0.3 + 0.5) * cellSize, cellSize * 0.4);
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

class Minotaur extends CellEntity {
  constructor(x, y) {
    super(x, y);
    this.heading = createVector(1, 0);
    this.acted = false;
    this.decisions = [];
    this.moveOffset = createVector(0, 0);
    this.headstart = 0;
  }

  directionalSmell(grid, direction) {
    const neighbor = grid.cells[this.x + direction.x][this.y + direction.y];
    if (neighbor instanceof Organism) {
      return 1;
    }
    if (neighbor instanceof DeadOrganism || neighbor instanceof Egg) {
      return 0.8;
    }
    if (neighbor instanceof Air) {
      return 0.8 * neighbor.organismSmell / MAX_SMELL;
    }
    if (neighbor instanceof Wall) {
      return -1;
    }
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
    for (const direction of directions) {
      let smell = this.directionalSmell(grid, direction);
      vision.push(smell);
    }
    this.decisions = [0, 0, 0, 0];
    let maxIndex = 0;
    for (let i = 1; i <= 3; i++) {
      if (vision[i] > vision[maxIndex]) {
        maxIndex = i;
      }
    }
    this.decisions[maxIndex] = 1;
  }
  
  act(grid) {
    this.acted = true;
    let moveOffsetLength = Math.sqrt(this.moveOffset.x * this.moveOffset.x + this.moveOffset.y * this.moveOffset.y);
    let speed = sliderManager.getValue("Minotaur speed");
    if (moveOffsetLength > speed) {
      this.moveOffset.x += this.heading.x * speed;
      this.moveOffset.y += this.heading.y * speed;
      this.energy--;
      return;
    }
    if (moveOffsetLength > 0) {
      this.headstart = speed - moveOffsetLength;
    } else {
      this.headstart = 0;
    }
    this.moveOffset = createVector(0, 0);
    // Turn
    let maxIndex = 0;
    for (let i = 1; i <= 3; i++) {
      if (this.decisions[i] > this.decisions[maxIndex]) {
        maxIndex = i;
      }
    }
    this.heading = turnVector(this.heading, maxIndex);
    // Further actions
    let newX = this.x;
    let newY = this.y;
    let oldX = this.x;
    let oldY = this.y;
    if (this.decisions[maxIndex] > 0.5) {
      newX += this.heading.x;
      newY += this.heading.y;
    }
    if (newX >= 0 && newX < grid.rows && newY >= 0 && newY < grid.cols) {
      if (!(grid.cells[newX][newY] instanceof Wall)) {
        grid.cells[this.x][this.y] = new Air(this.x, this.y);
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
        this.moveOffset = turnVector(this.heading, 2);
        this.moveOffset.x += this.headstart * this.heading.x;
        this.moveOffset.y += this.headstart * this.heading.y;
      }
    }
  }
  
  getColor() {
    return [0, 0, 225];
  }

  display() {
    fill(this.getColor());
    noStroke();
    rect((this.x + this.moveOffset.x) * cellSize, (this.y + this.moveOffset.y) * cellSize, cellSize, cellSize);
    fill([200, 180, 10]);
    let right = turnVector(this.heading, 1);
    let x1 = (this.x + this.moveOffset.x + this.heading.x * 0.1 + right.x * 0.1 + 0.5) * cellSize;
    let y1 = (this.y + this.moveOffset.y + this.heading.y * 0.1 + right.y * 0.1 + 0.5) * cellSize;
    let x2 = (this.x + this.moveOffset.x + this.heading.x * 0.1 + right.x * 0.5 + 0.5) * cellSize;
    let y2 = (this.y + this.moveOffset.y + this.heading.y * 0.1 + right.y * 0.5 + 0.5) * cellSize;
    let x3 = (this.x + this.moveOffset.x + this.heading.x * 0.65 + right.x * 0.45 + 0.5) * cellSize;
    let y3 = (this.y + this.moveOffset.y + this.heading.y * 0.65 + right.y * 0.45 + 0.5) * cellSize;
    triangle(x1, y1, x2, y2, x3, y3);
    let left = turnVector(this.heading, 3);
    x1 = (this.x + this.moveOffset.x + this.heading.x * 0.1 + left.x * 0.1 + 0.5) * cellSize;
    y1 = (this.y + this.moveOffset.y + this.heading.y * 0.1 + left.y * 0.1 + 0.5) * cellSize;
    x2 = (this.x + this.moveOffset.x + this.heading.x * 0.1 + left.x * 0.5 + 0.5) * cellSize;
    y2 = (this.y + this.moveOffset.y + this.heading.y * 0.1 + left.y * 0.5 + 0.5) * cellSize;
    x3 = (this.x + this.moveOffset.x + this.heading.x * 0.65 + left.x * 0.45 + 0.5) * cellSize;
    y3 = (this.y + this.moveOffset.y + this.heading.y * 0.65 + left.y * 0.45 + 0.5) * cellSize;
    triangle(x1, y1, x2, y2, x3, y3);
    fill([255, 255, 255]);
    noStroke();
    circle(((this.x + this.moveOffset.x) + this.heading.x * 0.25 + 0.5) * cellSize, ((this.y + this.moveOffset.y) + this.heading.y * 0.3 + 0.5) * cellSize, cellSize * 0.4);
    fill([0, 0, 0]);
    noStroke();
    circle(((this.x + this.moveOffset.x) + this.heading.x * 0.3 + 0.5) * cellSize, ((this.y + this.moveOffset.y) + this.heading.y * 0.35 + 0.5) * cellSize, cellSize * 0.25);
  }
}

class Wall extends CellEntity {
  getColor() {
    return [0, 0, 20];
  }
}

class Earth extends CellEntity {
  getColor() {
    return [100, 80, 65];
  }
}

class Plant extends CellEntity {
  getColor() {
    return [10, 245, 5];
  }
}

class DeadOrganism extends CellEntity {
  getColor() {
    return [60, 130, 120];
  }
}

class Air extends CellEntity {
  constructor(x, y) {
    super(x, y);
    this.plantSmell = 0;
    this.newPlantSmell = 0;
    this.organismSmell = 0;
    this.newOrganismSmell = 0;
    this.minotaurSmell = 0;
    this.newMinotaurSmell = 0;
  }

  display() {
  }
}
