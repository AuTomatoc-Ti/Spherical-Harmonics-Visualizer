import "katex/dist/katex.min.css";
import "./styles.css";

import { clamp, sanityCheckY00 } from "./math/sphericalHarmonics.js";
import { createMap2DRenderer } from "./renderers/map2d.js";
import { create3DRenderer } from "./renderers/view3d.js";
import { createEquationPanel } from "./ui/equationPanel.js";

const sidebar = document.getElementById("leftSidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const equationDrawer = document.getElementById("equationDrawer");
const equationToggle = document.getElementById("equationToggle");

const lRange = document.getElementById("lRange");
const mRange = document.getElementById("mRange");
const lValue = document.getElementById("lValue");
const mValue = document.getElementById("mValue");
const exactValueToggle = document.getElementById("exactValueToggle");
const cameraSpeedRange = document.getElementById("cameraSpeedRange");
const cameraSpeedValue = document.getElementById("cameraSpeedValue");
const resetCameraBtn = document.getElementById("resetCameraBtn");

const view2dBtn = document.getElementById("view2dBtn");
const view3dBtn = document.getElementById("view3dBtn");
const viewOrbitalBtn = document.getElementById("viewOrbitalBtn");
const map2dWrap = document.getElementById("map2dWrap");
const sphere3dWrap = document.getElementById("sphere3dWrap");

const hoverPanel = document.getElementById("hoverPanel");
const hoverTheta = document.getElementById("hoverTheta");
const hoverPhi = document.getElementById("hoverPhi");
const hoverYValue = document.getElementById("hoverYValue");
const hoverPValue = document.getElementById("hoverPValue");

const harmonicCanvas = document.getElementById("harmonicCanvas");
const overlayCanvas = document.getElementById("overlayCanvas");

const equationPanel = createEquationPanel({
  generalY: document.getElementById("generalY"),
  generalP: document.getElementById("generalP"),
  generalN: document.getElementById("generalN"),
  specificY: document.getElementById("specificY"),
  specificN: document.getElementById("specificN"),
  specificP: document.getElementById("specificP"),
  hoverPosition: document.getElementById("hoverPosition"),
  hoverY: document.getElementById("hoverY"),
  hoverP: document.getElementById("hoverP")
});

const state = {
  l: Number(lRange.value),
  m: Number(mRange.value),
  view: "2d",
  showExactValues: false,
  cameraSpeed: Number(cameraSpeedRange.value)
};

const mapRenderer = createMap2DRenderer(harmonicCanvas, overlayCanvas);
let lastMouseX = 0;
let lastMouseY = 0;
const view3d = create3DRenderer(sphere3dWrap, (sample) => {
  equationPanel.renderHover(sample, state.l, state.m, state.showExactValues);
  if (state.showExactValues && sample) {
    updateHoverPanel(sample);
  }
});

function updateHoverPanel(sample) {
  if (!sample) {
    hoverPanel.classList.add("hidden");
    return;
  }

  function formatNum(val) {
    return Math.abs(val) < 1e-10 ? "0" : Number(val).toExponential(3);
  }

  hoverTheta.textContent = sample.theta.toFixed(3);
  hoverPhi.textContent = sample.phi.toFixed(3);
  hoverYValue.textContent = formatNum(sample.y);
  hoverPValue.textContent = formatNum(sample.p);

  hoverPanel.classList.remove("hidden");
  hoverPanel.style.left = lastMouseX + "px";
  hoverPanel.style.top = lastMouseY + "px";
}

function updateRanges() {
  state.l = Number(lRange.value);
  const nextM = clamp(Number(mRange.value), -state.l, state.l);

  mRange.min = String(-state.l);
  mRange.max = String(state.l);
  mRange.value = String(nextM);

  state.m = nextM;
  lValue.textContent = String(state.l);
  mValue.textContent = String(state.m);
}

function rerender() {
  mapRenderer.updateDataset(state.l, state.m);
  mapRenderer.render(state.l, state.m);
  view3d.setLm(state.l, state.m);
  view3d.setRadiusMode(state.view === "orbital" ? "magnitude" : "color");
  equationPanel.renderSpecific(state.l, state.m);
}

function switchView(nextView) {
  state.view = nextView;

  const is2d = nextView === "2d";
  const isOrbital = nextView === "orbital";
  map2dWrap.classList.toggle("hidden", !is2d);
  sphere3dWrap.classList.toggle("hidden", is2d);
  view3d.setActive(!is2d);
  view3d.setRadiusMode(isOrbital ? "magnitude" : "color");

  view2dBtn.classList.toggle("active", is2d);
  view3dBtn.classList.toggle("active", nextView === "3d");
  viewOrbitalBtn.classList.toggle("active", isOrbital);

  if (!is2d) {
    view3d.resize();
  }
}

function handle2DHover(event) {
  if (state.view !== "2d") return;

  const sample = mapRenderer.sampleFromMouse(event.clientX, event.clientY);
  equationPanel.renderHover(sample, state.l, state.m, state.showExactValues);
}

function bindEvents() {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  equationToggle.addEventListener("click", () => {
    equationDrawer.classList.toggle("open");
  });

  lRange.addEventListener("input", () => {
    updateRanges();
    rerender();
  });

  mRange.addEventListener("input", () => {
    updateRanges();
    rerender();
  });

  exactValueToggle.addEventListener("change", () => {
    state.showExactValues = exactValueToggle.checked;
    if (!state.showExactValues) {
      hoverPanel.classList.add("hidden");
    }
    equationPanel.resetHover();
  });

  cameraSpeedRange.addEventListener("input", () => {
    state.cameraSpeed = Number(cameraSpeedRange.value);
    cameraSpeedValue.textContent = state.cameraSpeed.toFixed(1);
    view3d.setMoveSpeed(state.cameraSpeed);
  });

  resetCameraBtn.addEventListener("click", () => {
    view3d.resetCamera();
  });

  view2dBtn.addEventListener("click", () => {
    switchView("2d");
  });

  view3dBtn.addEventListener("click", () => {
    switchView("3d");
  });

  viewOrbitalBtn.addEventListener("click", () => {
    switchView("orbital");
  });

  harmonicCanvas.addEventListener("mousemove", (event) => {
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    handle2DHover(event);
  });
  harmonicCanvas.addEventListener("mouseleave", () => {
    hoverPanel.classList.add("hidden");
    equationPanel.resetHover();
  });

  sphere3dWrap.addEventListener("mousemove", (event) => {
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  });

  window.addEventListener("resize", () => {
    view3d.resize();
    rerender();
  });
}

function init() {
  updateRanges();
  cameraSpeedValue.textContent = state.cameraSpeed.toFixed(1);
  view3d.setMoveSpeed(state.cameraSpeed);
  bindEvents();
  rerender();
  switchView("2d");

  if (!sanityCheckY00()) {
    console.warn("Sanity check failed: Y_0^0 normalization mismatch");
  }

  if (window.matchMedia("(max-width: 1200px)").matches) {
    sidebar.classList.remove("open");
  } else {
    sidebar.classList.add("open");
  }
}

init();
