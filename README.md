# TypeCodeBlock

This is a 100% frontend-only version of TypeCodeBlock. It operates without a backend and stores everything in memory, making it perfect for deployment on any static hosting service (GitHub Pages, Vercel, Netlify, etc.).

## Key Features
- **Zero Backend**: All file reading and temporary storage logic happens in the browser using the `FileReader API`.
- **Built-in Samples**: Standard code samples (JS, Python) and documentation are embedded directly in the source.
- **Drag-and-Drop**: Drag any local text or source file into the browser to start practicing instantly.
- **Real-time Analytics**: Track your WPM (Words Per Minute), Accuracy, and Progress as you type.
- **Developer-Focused UI**: Dark mode, glassmorphism aesthetics, and syntax-aware spacing.

## How to Run
Simply open `public/index.html` in any modern web browser.

## Deployment
You only need to host the contents of the `public/` directory. No Node.js server or database configuration is required.
