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

function applyStyles(el, styles) {
    for (let prop in styles) {
        el.style[prop] = styles[prop]
    }
}

// Cosntants ------------------------------------

const CELL_SIZE = 80
const CELL_MARGIN = 4
const EFFECTIVE_CELL_SIZE = CELL_SIZE + CELL_MARGIN * 2 // Total space per cell
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
const occupiedCells = new Set()
const rectangles = []
const imageUrls = []

// -----------------------------------------------------

// Grid container setup
const gridContainer = document.getElementById("grid-container")
const countElement = document.getElementById("count")
const centerIndicator = document.getElementById("center-indicator")

// Controls
const delaySlider = document.getElementById("delay-slider")
const delayValue = document.getElementById("delay-value")

// Popup elements
const popup = document.getElementById("popup")
const overlay = document.getElementById("overlay")
const popupClose = document.getElementById("popup-close")
const popupText = document.getElementById("popup-text")
const popupDimensions = document.getElementById("popup-dimensions")

// -----------------------------------------------------

function showPopup(rectangle) {
    const isText = rectangle.element.querySelector("p")
    popupText.textContent = isText
        ? `Text Content: ${isText.textContent}`
        : "Image Content"
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

function pan(e) {
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

function worldToGrid(x, y) {
    return {
        gridX: Math.floor(x / EFFECTIVE_CELL_SIZE),
        gridY: Math.floor(y / EFFECTIVE_CELL_SIZE),
    }
}

// Convert grid coordinates to world coordinates (with margin)
function gridToWorld(gridX, gridY) {
    return {
        x: gridX * EFFECTIVE_CELL_SIZE + CELL_MARGIN,
        y: gridY * EFFECTIVE_CELL_SIZE + CELL_MARGIN,
    }
}

function getCellKey(gridX, gridY) {
    return `${gridX},${gridY}`
}
function isAreaOccupied(gridX, gridY, widthCells, heightCells) {
    for (let y = gridY; y < gridY + heightCells; y++) {
        for (let x = gridX; x < gridX + widthCells; x++) {
            if (occupiedCells.has(getCellKey(x, y))) {
                return true
            }
        }
    }
    return false
}

function markAreaOccupied(gridX, gridY, widthCells, heightCells) {
    for (let y = gridY; y < gridY + heightCells; y++) {
        for (let x = gridX; x < gridX + widthCells; x++) {
            occupiedCells.add(getCellKey(x, y))
        }
    }
}
function markAreaFree(gridX, gridY, widthCells, heightCells) {
    for (let y = gridY; y < gridY + heightCells; y++) {
        for (let x = gridX; x < gridX + widthCells; x++) {
            occupiedCells.delete(getCellKey(x, y))
        }
    }
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
    const gridCenter = worldToGrid(centerX, centerY)
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

        if (!isAreaOccupied(gridX, gridY, gridWidth, gridHeight)) {
            const worldPos = gridToWorld(gridX, gridY)
            const rectElement = document.createElement("div")

            rectElement.className = "grid-cell"
            applyStyles(rectElement, {
                left: `${worldPos.x - viewX}px`,
                top: `${worldPos.y - viewY}px`,
                width: `${gridWidth * CELL_SIZE}px`,
                height: `${gridHeight * CELL_SIZE}px`,
                backgroundColor: choice(colors),
            })
            const contentElement = document.createElement("div")
            contentElement.className = "rectangle-content"

            const p = document.createElement("p")
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
            markAreaOccupied(gridX, gridY, gridWidth, gridHeight)

            // Remove oldest rectangle if we exceed the limit
            if (rectangles.length > MAX_RECTANGLES) {
                const oldRect = rectangles.shift()
                markAreaFree(
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

window.addEventListener("DOMContentLoaded", () => {
    gridContainer.addEventListener("mousedown", startPan)
    gridContainer.addEventListener("mousemove", pan)
    gridContainer.addEventListener("mouseup", endPan)
    gridContainer.addEventListener("mouseleave", endPan)

    popupClose.addEventListener("click", closePopup)
    overlay.addEventListener("click", closePopup)

    delaySlider.addEventListener("input", function () {
        squareInterval = parseInt(this.value)
        delayValue.textContent = squareInterval
    })

    window.addEventListener("resize", updateCenterIndicator)

    // ------------------------------------------------------------------

    lastRectangleTime = Date.now() // Initialize last rectangle time
    updateCenterIndicator()
})
