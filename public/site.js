const messages = {
  en: {
    moved: (name) => `${name} moved.`,
    reset: "Diagram reset to its starting layout.",
    theme: (dark) => `${dark ? "Dark" : "Light"} canvas enabled.`,
    themeAction: (dark) => `Switch to ${dark ? "light" : "dark"} canvas`,
    themeName: (dark) => (dark ? "Dark canvas" : "Light canvas"),
  },
  zh: {
    moved: (name) => `已移动${name}。`,
    reset: "图形已恢复初始布局。",
    theme: (dark) => `已切换至${dark ? "深色" : "浅色"}画布。`,
    themeAction: (dark) => `切换至${dark ? "浅色" : "深色"}画布`,
    themeName: (dark) => (dark ? "深色画布" : "浅色画布"),
  },
};

/** Keep a node's center inside the stage, including its actual dimensions. */
export function clampPosition(position, stage, node) {
  const constrain = (value, extent, nodeExtent) => {
    if (extent <= 0) return 50;
    const inset = Math.min(50, (nodeExtent / extent) * 50);
    return Math.max(inset, Math.min(100 - inset, value));
  };
  return {
    x: constrain(position.x, stage.width, node.width),
    y: constrain(position.y, stage.height, node.height),
  };
}

/** Project percentage centers and pixel widths into the SVG's coordinate space. */
export function connectionPath(from, to, stageWidth) {
  if (stageWidth <= 0) return "";
  const direction = to.x >= from.x ? 1 : -1;
  const startX = from.x * 10 + direction * (from.width / stageWidth) * 500;
  const endX = to.x * 10 - direction * (to.width / stageWidth) * 500;
  const startY = from.y * 4.4;
  const endY = to.y * 4.4;
  const bend = Math.max(36, Math.abs(endX - startX) * 0.45);
  const number = (value) => Number(value.toFixed(2));
  return `M ${number(startX)} ${number(startY)} C ${number(startX + direction * bend)} ${number(startY)}, ${number(endX - direction * bend)} ${number(endY)}, ${number(endX)} ${number(endY)}`;
}

function setupMenu(document) {
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("#site-menu");
  if (!toggle || !menu) return;

  // CSS only collapses this state at the mobile breakpoint. Without JS the
  // navigation stays visible, and desktop navigation never receives `hidden`.
  menu.removeAttribute("hidden");
  toggle.setAttribute("aria-controls", menu.id);
  const setOpen = (open) => {
    menu.dataset.open = String(open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  setOpen(false);
  document.documentElement.dataset.js = "true";

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || menu.dataset.open !== "true") return;
    if (!menu.contains(event.target) && event.target !== toggle) return;
    event.preventDefault();
    setOpen(false);
    toggle.focus();
  });
}

function setupDemo(document) {
  const stage = document.querySelector(".demo-stage");
  if (!stage) return;
  const board = document.querySelector(".demo-board");
  const themeToggle = document.querySelector("[data-demo-theme]");
  const resetButton = document.querySelector("[data-demo-reset]");
  const status = document.querySelector("[data-demo-status]");
  const nodes = Array.from(stage.querySelectorAll(".demo-node[data-node]"));
  const edges = Array.from(stage.querySelectorAll("[data-edge]"));
  const copy = messages[document.body.dataset.locale] || messages.en;
  const initialPositions = new Map();
  const positions = new Map();
  let activeDrag = null;
  let announcementFrame = 0;

  const announce = (message) => {
    if (!status) return;
    // Clear first so moving the same node twice is still announced.
    cancelAnimationFrame(announcementFrame);
    status.textContent = "";
    announcementFrame = requestAnimationFrame(() => {
      status.textContent = message;
    });
  };
  const readNumber = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 50;
  };
  const nameFor = (node) =>
    node.dataset.demoLabel || node.textContent.trim().replace(/\s+/g, " ");

  for (const node of nodes) {
    const position = { x: readNumber(node.dataset.x), y: readNumber(node.dataset.y) };
    initialPositions.set(node, position);
    positions.set(node, { ...position });
    node.style.touchAction = "none";
  }

  const render = () => {
    const dimensions = { width: stage.clientWidth, height: stage.clientHeight };
    if (!dimensions.width || !dimensions.height) return;
    const endpoints = new Map();
    for (const node of nodes) {
      const size = { width: node.offsetWidth, height: node.offsetHeight };
      const position = clampPosition(positions.get(node), dimensions, size);
      positions.set(node, position);
      node.style.left = `${position.x}%`;
      node.style.top = `${position.y}%`;
      endpoints.set(node.dataset.node, { ...position, width: size.width });
    }
    for (const edge of edges) {
      const [fromID, toID] = edge.dataset.edge.split(":");
      const from = endpoints.get(fromID);
      const to = endpoints.get(toID);
      if (from && to) edge.setAttribute("d", connectionPath(from, to, dimensions.width));
    }
  };

  const finishDrag = (event, cancelled = false) => {
    if (!activeDrag || activeDrag.pointerID !== event.pointerId) return;
    const { node, original, moved } = activeDrag;
    activeDrag = null;
    node.removeAttribute("data-dragging");
    if (cancelled) {
      positions.set(node, original);
      render();
    } else if (moved) {
      announce(copy.moved(nameFor(node)));
    }
    if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
  };

  for (const node of nodes) {
    node.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0 || activeDrag) return;
      event.preventDefault();
      node.focus({ preventScroll: true });
      const rect = stage.getBoundingClientRect();
      const position = positions.get(node);
      activeDrag = {
        node,
        pointerID: event.pointerId,
        original: { ...position },
        offsetX: event.clientX - rect.left - stage.clientLeft - (position.x / 100) * stage.clientWidth,
        offsetY: event.clientY - rect.top - stage.clientTop - (position.y / 100) * stage.clientHeight,
        moved: false,
      };
      node.dataset.dragging = "true";
      node.setPointerCapture(event.pointerId);
    });
    node.addEventListener("pointermove", (event) => {
      if (!activeDrag || activeDrag.node !== node || activeDrag.pointerID !== event.pointerId) return;
      if (!stage.clientWidth || !stage.clientHeight) return;
      const rect = stage.getBoundingClientRect();
      positions.set(node, {
        x: ((event.clientX - rect.left - stage.clientLeft - activeDrag.offsetX) / stage.clientWidth) * 100,
        y: ((event.clientY - rect.top - stage.clientTop - activeDrag.offsetY) / stage.clientHeight) * 100,
      });
      render();
      const current = positions.get(node);
      activeDrag.moved = current.x !== activeDrag.original.x || current.y !== activeDrag.original.y;
    });
    node.addEventListener("pointerup", (event) => finishDrag(event));
    node.addEventListener("pointercancel", (event) => finishDrag(event, true));
    node.addEventListener("lostpointercapture", (event) => finishDrag(event, true));
    node.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const direction = directions[event.key];
      if (!direction || !stage.clientWidth || !stage.clientHeight || activeDrag) return;
      event.preventDefault();
      const step = event.shiftKey ? 24 : 8;
      const position = positions.get(node);
      positions.set(node, {
        x: position.x + (direction[0] * step * 100) / stage.clientWidth,
        y: position.y + (direction[1] * step * 100) / stage.clientHeight,
      });
      render();
      announce(copy.moved(nameFor(node)));
    });
  }

  resetButton?.addEventListener("click", () => {
    if (activeDrag) finishDrag({ pointerId: activeDrag.pointerID }, true);
    for (const node of nodes) positions.set(node, { ...initialPositions.get(node) });
    render();
    announce(copy.reset);
  });

  if (themeToggle && board) {
    const setTheme = (dark) => {
      board.dataset.theme = dark ? "dark" : "light";
      themeToggle.setAttribute("aria-pressed", String(dark));
      // Keep a toggle's accessible name stable; aria-pressed carries its state.
      themeToggle.setAttribute("aria-label", copy.themeName(true));
      themeToggle.setAttribute("title", copy.themeAction(dark));
      const label = themeToggle.querySelector("[data-demo-theme-label]");
      if (label) label.textContent = copy.themeName(dark);
    };
    setTheme(board.dataset.theme === "dark");
    themeToggle.addEventListener("click", () => {
      const dark = board.dataset.theme !== "dark";
      setTheme(dark);
      announce(copy.theme(dark));
    });
  }

  render();
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(render);
    observer.observe(stage);
    for (const node of nodes) observer.observe(node);
  } else {
    window.addEventListener("resize", render);
  }
}

if (typeof document !== "undefined") {
  setupMenu(document);
  setupDemo(document);
}
