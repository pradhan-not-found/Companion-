<div align="center">

<img src="landing-page/public/applogo.png" alt="Companion Logo" width="120" />

# Companion

**A beautifully crafted desktop pet that lives on your screen.**

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg?style=for-the-badge&logo=github)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-black.svg?style=for-the-badge&logo=github)](#-contributing)
[![Powered by Electron](https://img.shields.io/badge/Electron-191970.svg?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![Next.js](https://img.shields.io/badge/Next.js-000000.svg?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)

</div>

<br />

> **Companion** brings a subtle, interactive companion directly to your workspace. It sits quietly on your screen while you work—adding a touch of delight, keeping you hydrated, and ensuring you never work alone.

<br />

## ✨ Features

- 🐾 **Multiple Companions** — Choose from a growing roster of beautifully animated companions, from a sleepy capybara to a mischievous cat.
- 🪟 **True Transparency** — The app runs as a native, fully transparent overlay that floats seamlessly over your other windows.
- 🖱️ **Micro-interactions** — Deeply integrated hover states, subtle idle animations, and fluid transitions that feel native to macOS and Windows.
- 🌗 **Adaptive Design** — Full support for stunning Light and Dark modes, adapting flawlessly to your desktop aesthetic.

---

## 🚀 Getting Started

Companion is a monorepo consisting of two primary environments: the **Electron Desktop Application** and the **Next.js Landing Page**.

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` or `yarn`

<br />

### 1. Desktop Application

The core Electron app that powers your desktop companion.

```bash
# Clone the repository
git clone https://github.com/pradhan-not-found/Companion-.git
cd Companion-

# Install dependencies
npm install

# Start the dev server (spins up Vite + Electron)
npm start

# Package the app for production
npm run build
```

<br />

### 2. Landing Page

The official website and waitlist, built with Next.js 15.

```bash
# Navigate to the landing page directory
cd landing-page

# Install dependencies
npm install

# Boot up the development server
npm run dev
```
Navigate to `http://localhost:3000` to view the page.

---

## 🛠 Technology Stack

Companion is built on a modern, robust, and highly performant foundation:

| Domain | Technologies |
| :--- | :--- |
| **Desktop Engine** | Electron, Node.js |
| **App Client** | React 18, Vite, TypeScript |
| **Web / Landing** | Next.js 15 (App Router), Tailwind CSS |
| **Animation** | Framer Motion (Web), CSS Keyframes (App) |

---

## 🤝 Contributing

We welcome contributions of all sizes—whether it's adding new pets, optimizing rendering logic, or refining the UI. 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <p>Built with 🤍 by <a href="https://github.com/pradhan-not-found">pradhan-not-found</a></p>
</div>
