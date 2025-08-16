// Utils -----------------------------------------

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function choice(arr) {
    return arr[randomInt(0, arr.length - 1)]
}

function swapIndexes(array, i, j) {
    ;[array[i], array[j]] = [array[j], array[i]]
}

function shuffle(array) {
    const len = array.length
    for (let i = 0; i < len; i++) {
        swapIndexes(array, i, randomInt(0, len - 1))
    }
    return array
}

function q(sel, parent = document) {
    return parent.querySelector(sel)
}

function qa(sel, parent = document) {
    return parent.querySelectorAll(sel)
}

function applyStyles(el, styles) {
    for (let prop in styles) {
        el.style[prop] = styles[prop]
    }
}

function addEv(el, evt, fn) {
    return el.addEventListener(evt, fn)
}

function createElement(tag, cls) {
    let el = document.createElement(tag)
    el.className = cls
    return el
}

class SparseGrid {
    constructor() {
        this.occupiedCells = new Set()
    }

    worldToGrid(x, y) {
        return {
            gridX: Math.floor(x / EFFECTIVE_CELL_SIZE),
            gridY: Math.floor(y / EFFECTIVE_CELL_SIZE),
        }
    }

    gridToWorld(gridX, gridY) {
        return {
            x: gridX * EFFECTIVE_CELL_SIZE + CELL_MARGIN,
            y: gridY * EFFECTIVE_CELL_SIZE + CELL_MARGIN,
        }
    }

    // --------------------------------------------------

    getCellKey(gridX, gridY) {
        return `${gridX},${gridY}`
    }

    isAreaOccupied(gridX, gridY, widthCells, heightCells) {
        for (let y = gridY; y < gridY + heightCells; y++) {
            for (let x = gridX; x < gridX + widthCells; x++) {
                if (this.occupiedCells.has(this.getCellKey(x, y))) {
                    return true
                }
            }
        }
        return false
    }

    markAreaOccupied(gridX, gridY, widthCells, heightCells) {
        for (let y = gridY; y < gridY + heightCells; y++) {
            for (let x = gridX; x < gridX + widthCells; x++) {
                this.occupiedCells.add(this.getCellKey(x, y))
            }
        }
    }
    markAreaFree(gridX, gridY, widthCells, heightCells) {
        for (let y = gridY; y < gridY + heightCells; y++) {
            for (let x = gridX; x < gridX + widthCells; x++) {
                this.occupiedCells.delete(this.getCellKey(x, y))
            }
        }
    }
}

// Cosntants ------------------------------------

const CELL_SIZE = 80
const CELL_MARGIN = 4
const EFFECTIVE_CELL_SIZE = CELL_SIZE
const MAX_NEW_RECTS = 3

const DIRECTIONS = [
    { dx: 0, dy: 0 }, // Center (highest priority)
    { dx: 0, dy: -1 }, // North
    { dx: 1, dy: -1 }, // North-East
    { dx: 1, dy: 0 }, // East
    { dx: 1, dy: 1 }, // South-East
    { dx: 0, dy: 1 }, // South
    { dx: -1, dy: 1 }, // South-West
    { dx: -1, dy: 0 }, // West
    { dx: -1, dy: -1 }, // North-West
]

const aspectRatios = [
    [1, 1], // Square
    [1, 2], // Horizontal rectangle
    [1, 3], // Wide rectangle
    [2, 3], // Short wide rectangle
    [4, 3], // Almost square
    [3, 4], // Vertical rectangle
]

const MAX_RECTANGLES = 30

// Colors for rectangles
const colors = [
    "#B2FF59",
    "#EEFF41",
    "#FFFF00",
    "#FFD740",
    "#FFAB40",
    "#FF6E40",
]

// Sample content for rectangles
const textContent = ["Grid", "Tile", "Box", "Cell"]

// ----------------------------------------------

// View state
let viewX = 0
let viewY = 0
let isDragging = false
let lastX = 0
let lastY = 0
let totalMoveX = 0
let totalMoveY = 0
let lastRectangleTime = 0 // Time of last rectangle placement
let squareInterval = 250 // Configurable delay between rectangle batches (default 250ms)

// Occupied grid cells tracking
const imageUrls = []
const rectangles = []
const grid = new SparseGrid()

// -----------------------------------------------------

// Grid container setup
const gridContainer = q("#grid-container")
const countElement = q("#count")
const centerIndicator = q("#center-indicator")

// Controls
const delaySlider = q("#delay-slider")
const delayValue = q("#delay-value")

// Popup elements
const popup = q("#popup")
const overlay = q("#overlay")
const popupClose = q("#popup-close")
const popupText = q("#popup-text")
const popupDimensions = q("#popup-dimensions")

// -----------------------------------------------------

function showPopup(rectangle) {
    const isText = q(rectangle.element, "p")
    popupText.textContent = isText?.textContent
    popupDimensions.textContent = `Size: ${rectangle.gridWidth}x${rectangle.gridHeight}`

    popup.classList.add("visible")
    overlay.classList.add("visible")
}

function closePopup() {
    popup.classList.remove("visible")
    overlay.classList.remove("visible")
}

function updateCenterIndicator() {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2

    applyStyles(centerIndicator, {
        left: `${centerX}px`,
        top: `${centerY}px`,
    })
}

function startPan(e) {
    isDragging = true

    lastX = e.clientX
    lastY = e.clientY

    totalMoveX = 0
    totalMoveY = 0

    gridContainer.style.cursor = "grabbing"
}

function movePan(e) {
    if (!isDragging) return

    const dx = e.clientX - lastX
    const dy = e.clientY - lastY

    viewX -= dx
    viewY -= dy

    totalMoveX += Math.abs(dx)
    totalMoveY += Math.abs(dy)

    lastX = e.clientX
    lastY = e.clientY

    updateRectanglePositions()

    const now = Date.now()
    if (now - lastRectangleTime >= squareInterval) {
        createRectanglesAroundCenter()
        lastRectangleTime = now
    }
}

function endPan() {
    isDragging = false
    gridContainer.style.cursor = "grab"
}

function updateRectanglePositions() {
    for (const rect of rectangles) {
        applyStyles(rect.element, {
            left: `${rect.x - viewX}px`,
            top: `${rect.y - viewY}px`,
        })
    }
}

function createRectanglesAroundCenter() {
    const centerX = viewX + window.innerWidth / 2
    const centerY = viewY + window.innerHeight / 2
    const gridCenter = grid.worldToGrid(centerX, centerY)
    const numRectangles = randomInt(1, MAX_NEW_RECTS)
    const shuffledDirections = [DIRECTIONS[0], ...shuffle(DIRECTIONS.slice(1))]

    // Try to place rectangles in different directions
    for (let i = 0; i < numRectangles; i++) {
        if (i >= shuffledDirections.length) break

        const dir = shuffledDirections[i]
        const [heightRatio, widthRatio] = choice(aspectRatios)
        const gridWidth = widthRatio
        const gridHeight = heightRatio

        let gridX, gridY

        if (dir.dx === 0 && dir.dy === 0) {
            // Center
            gridX = gridCenter.gridX - Math.floor(gridWidth / 2)
            gridY = gridCenter.gridY - Math.floor(gridHeight / 2)
        } else if (dir.dx === 0) {
            // North or South
            gridX = gridCenter.gridX - Math.floor(gridWidth / 2)
            gridY =
                dir.dy === -1
                    ? gridCenter.gridY - gridHeight
                    : gridCenter.gridY + 1
        } else if (dir.dy === 0) {
            // East or West
            gridX =
                dir.dx === 1
                    ? gridCenter.gridX + 1
                    : gridCenter.gridX - gridWidth
            gridY = gridCenter.gridY - Math.floor(gridHeight / 2)
        } else {
            // Diagonal directions
            gridX =
                dir.dx === 1
                    ? gridCenter.gridX + 1
                    : gridCenter.gridX - gridWidth
            gridY =
                dir.dy === 1
                    ? gridCenter.gridY + 1
                    : gridCenter.gridY - gridHeight
        }

        if (!grid.isAreaOccupied(gridX, gridY, gridWidth, gridHeight)) {
            const worldPos = grid.gridToWorld(gridX, gridY)

            const rectElement = createElement("div", "grid-cell")
            const contentElement = createElement("div", "rectangle-content")
            const p = createElement("p")

            applyStyles(rectElement, {
                left: `${worldPos.x - viewX + CELL_MARGIN}px`,
                top: `${worldPos.y - viewY + CELL_MARGIN}px`,
                width: `${gridWidth * CELL_SIZE - 2 * CELL_MARGIN}px`,
                height: `${gridHeight * CELL_SIZE - 2 * CELL_MARGIN}px`,
                backgroundColor: choice(colors),
            })

            p.textContent = choice(textContent)
            contentElement.appendChild(p)
            rectElement.appendChild(contentElement)
            gridContainer.appendChild(rectElement)

            rectElement.addEventListener("click", (e) => {
                // Prevent click during panning
                if (totalMoveX + totalMoveY > 20) return
                e.stopPropagation()

                // Find the rectangle object
                const rect = rectangles.find((r) => r.element === rectElement)
                if (rect) {
                    showPopup(rect)
                }
            })

            // Trigger fade-in animation
            setTimeout(() => {
                rectElement.classList.add("visible")
            }, 10)

            const newRectangle = {
                x: worldPos.x,
                y: worldPos.y,
                width: gridWidth * CELL_SIZE,
                height: gridHeight * CELL_SIZE,
                gridX: gridX,
                gridY: gridY,
                gridWidth: gridWidth,
                gridHeight: gridHeight,
                element: rectElement,
            }

            rectangles.push(newRectangle)
            grid.markAreaOccupied(gridX, gridY, gridWidth, gridHeight)

            // Remove oldest rectangle if we exceed the limit
            if (rectangles.length > MAX_RECTANGLES) {
                const oldRect = rectangles.shift()
                grid.markAreaFree(
                    oldRect.gridX,
                    oldRect.gridY,
                    oldRect.gridWidth,
                    oldRect.gridHeight,
                )

                // Trigger fade-out animation before removing
                oldRect.element.classList.remove("visible")
                setTimeout(() => {
                    oldRect.element.parentNode?.removeChild(oldRect.element)
                }, 300)
            }

            countElement.textContent = rectangles.length
        }
    }
}

// -------------------------------------------------------------------

function prepare() {
    // --- Init States
    lastRectangleTime = Date.now() // Initialize last rectangle time
    updateCenterIndicator()

    // --- Register Events
    addEv(gridContainer, "mousedown", startPan)
    addEv(gridContainer, "mousemove", movePan)
    addEv(gridContainer, "mouseup", endPan)
    addEv(gridContainer, "mouseleave", endPan)

    addEv(popupClose, "click", closePopup)
    addEv(overlay, "click", closePopup)

    addEv(delaySlider, "input", function () {
        squareInterval = parseInt(this.value)
        delayValue.textContent = squareInterval
    })

    addEv(window, "resize", updateCenterIndicator)
}

addEv(window, "DOMContentLoaded", prepare)
