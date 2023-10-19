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


function turnVector(vector, times) {
    if (times > 0) {
        return turnVector(createVector(vector.y, -vector.x), times - 1);
    } else {
        return vector;
    }
}
