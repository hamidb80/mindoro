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

// Grid cell size (40x40 pixels) with 2px margin
const CELL_SIZE = 80
const CELL_MARGIN = 4 // Constant 2px margin around each cell
const EFFECTIVE_CELL_SIZE = CELL_SIZE + CELL_MARGIN * 2 // Total space per cell

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

// Rectangle aspect ratios (height:width in grid cells)
const aspectRatios = [
    [1, 1], // Square
    [1, 2], // Horizontal rectangle
    [1, 3], // Wide rectangle
    [2, 3], // Short wide rectangle
    [4, 3], // Almost square
    [3, 4], // Vertical rectangle
]

// Occupied grid cells tracking
const occupiedCells = new Set()

// Rectangle storage (max 30)
const rectangles = []
const MAX_RECTANGLES = 30

// Colors for rectangles
const colors = [
    "#FF5252",
    "#FF4081",
    "#E040FB",
    "#7C4DFF",
    "#536DFE",
    "#448AFF",
    "#40C4FF",
    "#18FFFF",
    "#64FFDA",
    "#69F0AE",
    "#B2FF59",
    "#EEFF41",
    "#FFFF00",
    "#FFD740",
    "#FFAB40",
    "#FF6E40",
]

// Sample content for rectangles
const textContent = [
    "Grid",
    "Tile",
    "Box",
    "Cell",
    "Unit",
    "Block",
    "Piece",
    "Element",
    "Item",
    "Part",
]

const imageUrls = []

// Event listeners for panning
gridContainer.addEventListener("mousedown", startPan)
gridContainer.addEventListener("mousemove", pan)
gridContainer.addEventListener("mouseup", endPan)
gridContainer.addEventListener("mouseleave", endPan)

// Popup event listeners
popupClose.addEventListener("click", closePopup)
overlay.addEventListener("click", closePopup)

// Delay slider event listener
delaySlider.addEventListener("input", function () {
    squareInterval = parseInt(this.value)
    delayValue.textContent = squareInterval
})

// Update center indicator position
function updateCenterIndicator() {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    centerIndicator.style.left = `${centerX}px`
    centerIndicator.style.top = `${centerY}px`
}

// Initialize center indicator
updateCenterIndicator()
window.addEventListener("resize", updateCenterIndicator)

// Show popup with rectangle details
function showPopup(rectangle) {
    // Set popup content
    const isText = rectangle.element.querySelector("p")
    popupText.textContent = isText
        ? `Text Content: ${isText.textContent}`
        : "Image Content"
    popupDimensions.textContent = `Size: ${rectangle.gridWidth}x${rectangle.gridHeight}`

    // Show popup and overlay
    popup.classList.add("visible")
    overlay.classList.add("visible")
}

// Close popup
function closePopup() {
    popup.classList.remove("visible")
    overlay.classList.remove("visible")
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

    // Update positions of all rectangles
    updateRectanglePositions()

    // Create rectangles continuously while panning
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

// Convert world coordinates to grid coordinates
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

// Get cell key for Set storage
function getCellKey(gridX, gridY) {
    return `${gridX},${gridY}`
}

// Check if a grid area is occupied
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

// Mark grid area as occupied
function markAreaOccupied(gridX, gridY, widthCells, heightCells) {
    for (let y = gridY; y < gridY + heightCells; y++) {
        for (let x = gridX; x < gridX + widthCells; x++) {
            occupiedCells.add(getCellKey(x, y))
        }
    }
}

// Mark grid area as free
function markAreaFree(gridX, gridY, widthCells, heightCells) {
    for (let y = gridY; y < gridY + heightCells; y++) {
        for (let x = gridX; x < gridX + widthCells; x++) {
            occupiedCells.delete(getCellKey(x, y))
        }
    }
}

// Update positions of all rectangles based on view
function updateRectanglePositions() {
    for (const rect of rectangles) {
        rect.element.style.left = `${rect.x - viewX}px`
        rect.element.style.top = `${rect.y - viewY}px`
    }
}

// Create 1-4 rectangles in random directions around the center
function createRectanglesAroundCenter() {
    const centerX = viewX + window.innerWidth / 2
    const centerY = viewY + window.innerHeight / 2

    // Convert center to grid coordinates
    const gridCenter = worldToGrid(centerX, centerY)

    // Number of rectangles to create (1-4)
    const numRectangles = Math.floor(Math.random() * 4) + 1

    // Possible directions (9 directions around center) - prioritizing center
    const directions = [
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

    // Shuffle directions (but keep center first)
    const centerDir = directions[0]
    const otherDirs = directions.slice(1)
    for (let i = otherDirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[otherDirs[i], otherDirs[j]] = [otherDirs[j], otherDirs[i]]
    }
    const shuffledDirections = [centerDir, ...otherDirs]

    // Try to place rectangles in different directions
    for (let i = 0; i < numRectangles; i++) {
        if (i >= shuffledDirections.length) break

        const dir = shuffledDirections[i]

        // Select a random aspect ratio
        const [heightRatio, widthRatio] =
            aspectRatios[Math.floor(Math.random() * aspectRatios.length)]

        // Calculate grid dimensions
        const gridWidth = widthRatio
        const gridHeight = heightRatio

        // Calculate grid position based on direction
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

        // Check if area is available
        if (!isAreaOccupied(gridX, gridY, gridWidth, gridHeight)) {
            // Convert grid position to world coordinates
            const worldPos = gridToWorld(gridX, gridY)

            // Create rectangle element
            const rectElement = document.createElement("div")
            rectElement.className = "grid-cell"
            rectElement.style.left = `${worldPos.x - viewX}px`
            rectElement.style.top = `${worldPos.y - viewY}px`
            rectElement.style.width = `${gridWidth * CELL_SIZE}px`
            rectElement.style.height = `${gridHeight * CELL_SIZE}px`
            rectElement.style.backgroundColor =
                colors[Math.floor(Math.random() * colors.length)]

            // Create content (either text or image)
            const contentElement = document.createElement("div")
            contentElement.className = "rectangle-content"

            // Randomly choose between text and image (70% text, 30% image)
            if (Math.random() < 0.7) {
                // Text content
                const p = document.createElement("p")
                p.textContent =
                    textContent[Math.floor(Math.random() * textContent.length)]
                contentElement.appendChild(p)
            } else {
                // Image content
                const img = document.createElement("img")
                img.src =
                    imageUrls[Math.floor(Math.random() * imageUrls.length)]
                img.alt = "Grid item"
                contentElement.appendChild(img)
            }

            rectElement.appendChild(contentElement)
            gridContainer.appendChild(rectElement)

            // Add click event to show popup
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

            // Create rectangle object
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
                    if (oldRect.element?.parentNode) {
                        oldRect.element.parentNode.removeChild(oldRect.element)
                    }
                }, 300) // Match CSS transition duration
            }

            countElement.textContent = rectangles.length
        }
    }
}

// Initial setup
lastRectangleTime = Date.now() // Initialize last rectangle time
updateCenterIndicator()
